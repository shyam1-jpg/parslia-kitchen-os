import Fastify from "fastify";
import { pool } from "./db.ts";
import { problem } from "./auth.ts";
import authRoutes from "./auth.ts";
import microsoft from "./microsoft.ts";
import groups from "./groups.ts";
import occupancy from "./occupancy.ts";
import users from "./users.ts";
import guests from "./guests.ts";
import housekeeping from "./housekeeping.ts";
import reports from "./reports.ts";
import packages from "./packages.ts";
import forms from "./forms.ts";
import integrations from "./integrations.ts";
import email from "./email.ts";
import maintenance from "./maintenance.ts";
import autoplace from "./autoplace.ts";
import estate from "./estate.ts";
import workforce from "./workforce.ts";
import guestPortal from "./guestPortal.ts";
import ops from "./ops.ts";
import service from "./service.ts";
import manuals from "./manuals.ts";
import tasks from "./tasks.ts";
import quality from "./quality.ts";

const app = Fastify({ logger: process.env.NODE_ENV !== "test" });
const isProd = process.env.NODE_ENV === "production";

function truthy(v: string | undefined): boolean {
  if (v == null) return false;
  return ["1", "true", "yes", "on"].includes(v.trim().toLowerCase());
}

function configuredOrigins(): Set<string> {
  const values = [
    process.env.WEB_URL,
    process.env.GUEST_WEB_URL,
    process.env.STAFF_WEB_URL,
    ...(process.env.CORS_ORIGINS ?? "").split(","),
  ].map(x => x?.trim()).filter(Boolean) as string[];
  return new Set(values.map(x => {
    try { return new URL(x).origin; } catch { return x.replace(/\/$/, ""); }
  }));
}

const allowedOrigins = configuredOrigins();

app.addHook("onRequest", async (req, reply) => {
  const origin = req.headers.origin;
  const originAllowed = !origin || !isProd || allowedOrigins.has(origin);

  if (origin && originAllowed) {
    reply.header("access-control-allow-origin", origin);
    reply.header("vary", "Origin");
  }
  reply.header("access-control-allow-headers", "authorization, content-type, if-match");
  reply.header("access-control-allow-methods", "GET,POST,PATCH,DELETE,OPTIONS");
  reply.header("access-control-expose-headers", "etag");
  reply.header("x-content-type-options", "nosniff");
  reply.header("x-frame-options", "DENY");
  reply.header("referrer-policy", "strict-origin-when-cross-origin");
  reply.header("permissions-policy", "camera=(), microphone=(), geolocation=()");
  if (isProd) reply.header("strict-transport-security", "max-age=31536000; includeSubDomains");

  if (req.method === "OPTIONS") {
    if (!originAllowed) return reply.code(403).send(problem(403, "origin_not_allowed", "This web origin is not allowed"));
    return reply.code(204).send();
  }
});

/**
 * Guest identity safety gate.
 * Local/Cloudflare development can still bootstrap a new My Stay so the product can
 * be tested. Production must not grant a private portal session merely because a
 * browser typed an email address. Keep ALLOW_UNVERIFIED_GUEST_BOOTSTRAP=false until
 * email OTP/magic-link verification is implemented and tested.
 */
app.addHook("preHandler", async (req: any, reply) => {
  const path = String(req.url ?? "").split("?")[0];
  if (path !== "/guest/register" && path !== "/guest/enquiries") return;

  const auth = req.headers.authorization as string | undefined;
  if (isProd && !auth?.startsWith("Bearer ") && !truthy(process.env.ALLOW_UNVERIFIED_GUEST_BOOTSTRAP)) {
    return reply.code(503).send(problem(
      503,
      "guest_email_verification_required",
      "Online booking identity verification is being configured. You can still browse programmes and availability; contact the house to save a place.",
    ));
  }

  const email = String(req.body?.email ?? "").trim().toLowerCase();
  if (!email || !email.includes("@")) return;

  const existing = (await pool.query(
    `select id from guest_account where lower(email)=$1 and status='ACTIVE' limit 1`,
    [email],
  )).rows[0];
  if (!existing) return;

  if (path === "/guest/enquiries" && auth?.startsWith("Bearer ")) {
    const token = auth.slice(7);
    const owned = (await pool.query(
      `select 1 from guest_session where token=$1 and guest_id=$2 and expires_at > now() limit 1`,
      [token, existing.id],
    )).rowCount;
    if (owned) return;
  }

  return reply.code(409).send(problem(
    409,
    "guest_identity_verification_required",
    "For your privacy, this email must sign in to My Stay before it can be used again.",
  ));
});

app.setErrorHandler((err: any, req, reply) => {
  const status = err.status ?? err.statusCode ?? 500;
  if (status >= 500) app.log.error(err);
  reply.code(status).send(problem(status, err.code ?? (status >= 500 ? "internal" : "error"), status >= 500 ? "Something went wrong on our side" : err.message, { trace_id: req.id }));
});

app.get("/health", async () => { await pool.query("select 1"); return { ok: true }; });
await app.register(authRoutes); await app.register(microsoft); await app.register(groups, { prefix: "/v1" }); await app.register(occupancy, { prefix: "/v1" }); await app.register(users, { prefix: "/v1" }); await app.register(guests, { prefix: "/v1" }); await app.register(housekeeping, { prefix: "/v1" }); await app.register(reports, { prefix: "/v1" }); await app.register(packages, { prefix: "/v1" }); await app.register(forms); await app.register(integrations); await app.register(email); await app.register(maintenance, { prefix: "/v1" }); await app.register(autoplace, { prefix: "/v1" }); await app.register(estate, { prefix: "/v1" }); await app.register(workforce); await app.register(guestPortal); await app.register(ops); await app.register(service); await app.register(manuals); await app.register(tasks); await app.register(quality, { prefix: "/v1" });
app.listen({ port: Number(process.env.PORT ?? 4000), host: "0.0.0.0" }).catch(e => { console.error(e); process.exit(1); });
