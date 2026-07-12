import { Router } from "express";
import { z } from "zod";
import { generateSecret, verify, generateURI } from "otplib";
import QRCode from "qrcode";
import {
  findUserByEmail,
  findUserById,
  verifyPassword,
  toAdminUser,
  toSafeUser,
  setUserSuspended,
  setUserRole,
  updateUserPlan,
  deleteUserAccount,
  setTotpSecret,
  isAdminRole,
  type UserRole,
} from "../services/users.js";
import { requireAdmin, requireSuperAdmin } from "../middleware/adminAuth.js";
import { getAdminDashboardStats } from "../services/adminStats.js";
import { logAdminAction, listAuditLogs } from "../services/auditLog.js";
import {
  getAdminConfigSnapshot,
  setConfigRaw,
  getMaintenance,
  getAnnouncement,
} from "../services/siteConfig.js";
import { db } from "../db/schema.js";

const router = Router();

function paramId(req: import("express").Request): string {
  const id = req.params.id;
  return Array.isArray(id) ? id[0] : id;
}

function clientIp(req: import("express").Request) {
  return (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ?? req.ip;
}

router.post("/login", async (req, res) => {
  const parsed = z.object({ email: z.string().email(), password: z.string().min(1), totpCode: z.string().optional() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "INVALID_INPUT" });

  const row = findUserByEmail(parsed.data.email);
  if (!row || !isAdminRole(row.role) || !(await verifyPassword(row, parsed.data.password))) {
    return res.status(401).json({ error: "INVALID_ADMIN_CREDENTIALS" });
  }
  if (row.suspended) return res.status(403).json({ error: "ADMIN_SUSPENDED" });

  if (row.totp_enabled === 1) {
    if (!parsed.data.totpCode) {
      return res.status(403).json({ error: "ADMIN_2FA_REQUIRED", totpRequired: true });
    }
    const valid = await verify({ token: parsed.data.totpCode, secret: row.totp_secret! });
    if (!valid) return res.status(401).json({ error: "INVALID_2FA_CODE" });
    req.session.admin2faVerified = true;
  } else {
    req.session.admin2faVerified = true;
  }

  req.session.adminId = row.id;
  logAdminAction(row.id, "admin.login", row.email, {}, clientIp(req));
  res.json({ admin: toAdminUser(row) });
});

router.post("/logout", requireAdmin, (req, res) => {
  const id = req.session.adminId!;
  logAdminAction(id, "admin.logout", id, {}, clientIp(req));
  req.session.adminId = undefined;
  req.session.admin2faVerified = undefined;
  res.json({ ok: true });
});

router.get("/me", requireAdmin, (req, res) => {
  const row = findUserById(req.session.adminId!)!;
  res.json({ admin: toAdminUser(row) });
});

router.get("/dashboard", requireAdmin, async (_req, res) => {
  res.json(await getAdminDashboardStats());
});

router.get("/users", requireAdmin, (req, res) => {
  const limit = Math.min(Number(req.query.limit ?? 100), 500);
  const offset = Number(req.query.offset ?? 0);
  const rows = db
    .prepare("SELECT id, email, display_name, plan, role, suspended, email_verified, created_at FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?")
    .all(limit, offset) as Array<Record<string, unknown>>;
  const users = rows.map((u) => ({
    id: u.id as string,
    email: u.email as string,
    displayName: u.display_name as string | null,
    plan: u.plan as string,
    role: u.role as string,
    suspended: u.suspended === 1,
    emailVerified: u.email_verified === 1,
    createdAt: u.created_at as string,
  }));
  res.json({ users });
});

router.patch("/users/:id", requireAdmin, (req, res) => {
  const userId = paramId(req);
  const target = findUserById(userId);
  if (!target) return res.status(404).json({ error: "NOT_FOUND" });

  const body = req.body as { suspended?: boolean; plan?: string; role?: UserRole };
  const adminId = req.session.adminId!;

  if (body.suspended !== undefined) {
    if (target.role === "super_admin") return res.status(403).json({ error: "CANNOT_SUSPEND_SUPER_ADMIN" });
    setUserSuspended(userId, body.suspended);
    logAdminAction(adminId, body.suspended ? "user.suspend" : "user.unsuspend", userId, {}, clientIp(req));
  }
  if (body.plan && ["free", "pro", "enterprise"].includes(body.plan)) {
    updateUserPlan(userId, body.plan as "free" | "pro" | "enterprise");
    logAdminAction(adminId, "user.plan_change", userId, { plan: body.plan }, clientIp(req));
  }
  if (body.role && req.session.adminId) {
    const actor = findUserById(adminId)!;
    if (actor.role !== "super_admin") return res.status(403).json({ error: "SUPER_ADMIN_REQUIRED" });
    if (body.role === "super_admin") return res.status(403).json({ error: "USE_SEED_SCRIPT_FOR_SUPER_ADMIN" });
    setUserRole(userId, body.role);
    logAdminAction(adminId, "user.role_change", userId, { role: body.role }, clientIp(req));
  }

  res.json({ user: toSafeUser(findUserById(userId)!) });
});

router.delete("/users/:id", requireSuperAdmin, (req, res) => {
  try {
    const ok = deleteUserAccount(paramId(req));
    if (!ok) return res.status(404).json({ error: "NOT_FOUND" });
    logAdminAction(req.session.adminId!, "user.delete", paramId(req), {}, clientIp(req));
    res.json({ ok: true });
  } catch (e) {
    res.status(403).json({ error: e instanceof Error ? e.message : "FORBIDDEN" });
  }
});

router.get("/config", requireAdmin, (_req, res) => {
  res.json(getAdminConfigSnapshot());
});

router.patch("/config", requireSuperAdmin, (req, res) => {
  const adminId = req.session.adminId!;
  const body = req.body as Record<string, unknown>;

  if (body.plans) {
    for (const [plan, limits] of Object.entries(body.plans as Record<string, unknown>)) {
      setConfigRaw(`plans.${plan}`, limits, adminId);
    }
  }
  if (body.models) setConfigRaw("models", body.models, adminId);
  if (body.feature_flags) setConfigRaw("feature_flags", body.feature_flags, adminId);
  if (body.pricing) setConfigRaw("pricing", body.pricing, adminId);
  if (body.maintenance) setConfigRaw("maintenance", body.maintenance, adminId);
  if (body.announcement) setConfigRaw("announcement", body.announcement, adminId);

  logAdminAction(adminId, "config.update", "site_config", body, clientIp(req));
  res.json(getAdminConfigSnapshot());
});

router.get("/audit-logs", requireSuperAdmin, (req, res) => {
  res.json({ logs: listAuditLogs(Number(req.query.limit ?? 100)) });
});

router.post("/2fa/setup", requireAdmin, async (req, res) => {
  const row = findUserById(req.session.adminId!)!;
  const secret = generateSecret();
  setTotpSecret(row.id, secret, false);
  const otpauth = generateURI({ issuer: "Libraix Admin", label: row.email, secret });
  const qr = await QRCode.toDataURL(otpauth);
  res.json({ secret, qrDataUrl: qr });
});

router.post("/2fa/enable", requireAdmin, async (req, res) => {
  const code = (req.body as { code?: string }).code;
  if (!code) return res.status(400).json({ error: "CODE_REQUIRED" });
  const row = findUserById(req.session.adminId!)!;
  if (!row.totp_secret) return res.status(400).json({ error: "SETUP_REQUIRED" });
  const result = await verify({ token: code, secret: row.totp_secret });
  if (!result.valid) {
    return res.status(400).json({ error: "INVALID_2FA_CODE" });
  }
  setTotpSecret(row.id, row.totp_secret, true);
  logAdminAction(row.id, "admin.2fa_enable", row.id, {}, clientIp(req));
  res.json({ ok: true });
});

router.get("/support-requests", requireAdmin, (_req, res) => {
  const rows = db.prepare("SELECT * FROM support_requests ORDER BY created_at DESC LIMIT 100").all();
  res.json({ requests: rows });
});

router.get("/privacy-requests", requireAdmin, (_req, res) => {
  const rows = db.prepare("SELECT * FROM privacy_requests ORDER BY created_at DESC LIMIT 100").all();
  res.json({ requests: rows });
});

router.patch("/support-requests/:id", requireAdmin, (req, res) => {
  const status = (req.body as { status?: string }).status ?? "closed";
  const id = paramId(req);
  db.prepare("UPDATE support_requests SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, id);
  logAdminAction(req.session.adminId!, "support.update", id, { status }, clientIp(req));
  res.json({ ok: true });
});

router.patch("/privacy-requests/:id", requireAdmin, (req, res) => {
  const status = (req.body as { status?: string }).status ?? "completed";
  const id = paramId(req);
  db.prepare("UPDATE privacy_requests SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, id);
  logAdminAction(req.session.adminId!, "privacy.update", id, { status }, clientIp(req));
  res.json({ ok: true });
});

router.get("/system-status", requireAdmin, (_req, res) => {
  res.json({
    maintenance: getMaintenance(),
    announcement: getAnnouncement(),
    environment: process.env.NODE_ENV ?? "development",
    frontendUrl: process.env.FRONTEND_URL,
  });
});

export default router;
