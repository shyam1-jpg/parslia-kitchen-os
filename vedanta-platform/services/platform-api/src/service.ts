/**
 * Department boards, Front-desk recipes, kitchen orders from FOH.
 * Photos are small data URLs stored on the house — not a public CDN.
 */
import type { FastifyInstance } from "fastify";
import { pool } from "./db.ts";
import { requireActor, problem } from "./auth.ts";
import { parseDepartment } from "../../../domains/ops/board.ts";
import { FOH_SUPPLIERS, nextDayIso, recipeForDate, WATER_WEEK } from "../../../domains/ops/service.ts";

const PHOTO_MAX = 700_000;

async function requireHouse(req: any, reply: any) {
  const a = await requireActor(req, reply, ["ADMIN", "STAFF"]);
  if (!a) return null;
  if (a.perms.has("group.read") || a.perms.has("cover.read") || a.perms.has("covers.read")) return a;
  reply.code(403).send(problem(403, "forbidden", "You cannot open the department boards"));
  return null;
}

async function londonDate(): Promise<string> {
  const r = await pool.query(`select (timezone('Europe/London', now()))::date::text t`);
  return r.rows[0].t;
}

export default async function service(f: FastifyInstance) {
  f.get("/v1/service/boards", async (req, reply) => {
    const a = await requireHouse(req, reply); if (!a) return;
    const boards = (await pool.query(
      `select department, about, updated_at from dept_board where property_id=$1 order by department`,
      [a.propertyId],
    )).rows;
    const photos = (await pool.query(
      `select id, department, caption, image_data, sort_order, created_at
       from dept_photo where property_id=$1 order by department, sort_order, created_at`,
      [a.propertyId],
    )).rows;
    const byDept = new Map<string, typeof photos>();
    for (const p of photos) {
      const list = byDept.get(p.department) ?? [];
      list.push(p);
      byDept.set(p.department, list);
    }
    const depts = ["FRONT", "HK", "RESTAURANT", "KITCHEN", "MAINT", "GROUNDS"];
    return {
      items: depts.map(department => {
        const row = boards.find((b: { department: string }) => b.department === department);
        return {
          department,
          about: row?.about ?? "",
          photos: (byDept.get(department) ?? []).map(p => ({
            id: p.id,
            caption: p.caption,
            image_data: p.image_data,
          })),
        };
      }),
    };
  });

  f.patch("/v1/service/boards/:dept", async (req: any, reply) => {
    const a = await requireHouse(req, reply); if (!a) return;
    const department = parseDepartment(req.params.dept, "FRONT");
    const about = String(req.body?.about ?? "");
    await pool.query(
      `insert into dept_board (tenant_id, property_id, department, about, updated_by, updated_at)
       values ($1,$2,$3,$4,$5, now())
       on conflict (property_id, department) do update
         set about = excluded.about, updated_by = excluded.updated_by, updated_at = now()`,
      [a.tenantId, a.propertyId, department, about, a.userId],
    );
    return { ok: true };
  });

  f.post("/v1/service/boards/:dept/photos", async (req: any, reply) => {
    const a = await requireHouse(req, reply); if (!a) return;
    const department = parseDepartment(req.params.dept, "FRONT");
    const image = String(req.body?.image_data ?? "");
    const caption = String(req.body?.caption ?? "").trim();
    if (!image.startsWith("data:image/")) return reply.code(422).send(problem(422, "validation", "Choose a picture"));
    if (image.length > PHOTO_MAX) return reply.code(422).send(problem(422, "validation", "Picture is too large — use a smaller photo"));
    const r = await pool.query(
      `insert into dept_photo (tenant_id, property_id, department, caption, image_data, created_by)
       values ($1,$2,$3,$4,$5,$6) returning id`,
      [a.tenantId, a.propertyId, department, caption, image, a.userId],
    );
    return { id: r.rows[0].id };
  });

  f.delete("/v1/service/photos/:id", async (req: any, reply) => {
    const a = await requireHouse(req, reply); if (!a) return;
    await pool.query(`delete from dept_photo where property_id=$1 and id=$2`, [a.propertyId, req.params.id]);
    return { ok: true };
  });

  f.get("/v1/service/front-desk", async (req: any, reply) => {
    const a = await requireHouse(req, reply); if (!a) return;
    const today = String(req.query?.date ?? await londonDate());
    const tomorrow = nextDayIso(today);
    const stored = (await pool.query(
      `select weekday, title, method, ingredients from foh_recipe where property_id=$1`,
      [a.propertyId],
    )).rows;
    const recipes = stored.length ? stored.map((r: any) => ({
      weekday: r.weekday,
      title: r.title,
      method: r.method,
      ingredients: r.ingredients,
    })) : WATER_WEEK;
    const suppliers = (await pool.query(
      `select code, name, supplies, note from foh_supplier where property_id=$1 order by name`,
      [a.propertyId],
    )).rows;
    const stock = (await pool.query(
      `select id, name, category, supplier_code, par_note from foh_stock where property_id=$1 order by category, name`,
      [a.propertyId],
    )).rows;
    const orders = (await pool.query(
      `select id, for_date::text, needed_for, items, notes, status, raised_by_name, created_at
       from foh_order where property_id=$1 and for_date >= $2::date - 1
       order by created_at desc limit 30`,
      [a.propertyId, today],
    )).rows;
    return {
      date: today,
      today: recipeForDate(today, recipes),
      tomorrow: recipeForDate(tomorrow, recipes),
      week: recipes,
      suppliers: suppliers.length ? suppliers : FOH_SUPPLIERS,
      stock,
      orders: orders.map((o: any) => ({
        id: o.id,
        for_date: o.for_date,
        needed_for: o.needed_for,
        items: o.items,
        notes: o.notes,
        status: o.status,
        raised_by_name: o.raised_by_name,
      })),
    };
  });

  f.post("/v1/service/orders", async (req: any, reply) => {
    const a = await requireHouse(req, reply); if (!a) return;
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    const cleaned = items.map((i: any) => ({
      name: String(i.name ?? "").trim(),
      qty: String(i.qty ?? "").trim() || "1",
    })).filter((i: { name: string }) => i.name);
    if (!cleaned.length) return reply.code(422).send(problem(422, "validation", "Add at least one thing to order"));
    const forDate = String(req.body?.for_date ?? await londonDate());
    const r = await pool.query(
      `insert into foh_order (tenant_id, property_id, for_date, needed_for, items, notes, raised_by, raised_by_name)
       values ($1,$2,$3,$4,$5,$6,$7,$8) returning id`,
      [
        a.tenantId,
        a.propertyId,
        forDate,
        String(req.body?.needed_for ?? "Front of house").trim() || "Front of house",
        JSON.stringify(cleaned),
        String(req.body?.notes ?? "").trim() || null,
        a.userId,
        a.name,
      ],
    );
    return { id: r.rows[0].id };
  });

  f.patch("/v1/service/orders/:id", async (req: any, reply) => {
    const a = await requireHouse(req, reply); if (!a) return;
    const status = ["open", "seen", "done"].includes(String(req.body?.status)) ? String(req.body.status) : "seen";
    const r = await pool.query(
      `update foh_order set status=$3, updated_at=now() where property_id=$1 and id=$2 returning id`,
      [a.propertyId, req.params.id, status],
    );
    if (!r.rowCount) return reply.code(404).send(problem(404, "not_found", "No such order"));
    return { ok: true, status };
  });
}
