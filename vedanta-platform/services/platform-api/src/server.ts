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

const app = Fastify({ logger: process.env.NODE_ENV !== "test" });

// CORS for the admin app in development.
app.addHook("onRequest", async (req, reply) => {
  reply.header("access-control-allow-origin", req.headers.origin ?? "*");
  reply.header("access-control-allow-headers", "authorization, content-type, if-match, x-user");
  reply.header("access-control-allow-methods", "GET,POST,PATCH,DELETE,OPTIONS");
  reply.header("access-control-expose-headers", "etag");
  if (req.method === "OPTIONS") return reply.code(204).send();
});
app.setErrorHandler((err: any, req, reply) => {
  const status = err.status ?? err.statusCode ?? 500;
  if (status >= 500) app.log.error(err);
  reply.code(status).send(problem(status, err.code ?? (status >= 500 ? "internal" : "error"), status >= 500 ? "Something went wrong on our side" : err.message, { trace_id: req.id }));
});

app.get("/health", async () => { await pool.query("select 1"); return { ok: true }; });
await app.register(authRoutes); await app.register(microsoft); await app.register(groups, { prefix: "/v1" }); await app.register(occupancy, { prefix: "/v1" }); await app.register(users, { prefix: "/v1" }); await app.register(guests, { prefix: "/v1" }); await app.register(housekeeping, { prefix: "/v1" }); await app.register(reports, { prefix: "/v1" }); await app.register(packages, { prefix: "/v1" }); await app.register(forms); await app.register(integrations); await app.register(email); await app.register(maintenance, { prefix: "/v1" }); await app.register(autoplace, { prefix: "/v1" }); await app.register(estate, { prefix: "/v1" });
app.listen({ port: Number(process.env.PORT ?? 4000), host: "0.0.0.0" }).catch(e => { console.error(e); process.exit(1); });
