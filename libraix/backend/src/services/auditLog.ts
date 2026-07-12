import { v4 as uuid } from "uuid";
import { db } from "../db/schema.js";

export function logAdminAction(
  adminUserId: string,
  action: string,
  target: string,
  details?: Record<string, unknown>,
  ip?: string
) {
  db.prepare(
    `INSERT INTO admin_audit_logs (id, admin_user_id, action, target, details, ip_address)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(uuid(), adminUserId, action, target, JSON.stringify(details ?? {}), ip ?? null);
}

export function listAuditLogs(limit = 100) {
  const rows = db
    .prepare(
      `SELECT l.*, u.email as admin_email FROM admin_audit_logs l
       LEFT JOIN users u ON u.id = l.admin_user_id
       ORDER BY l.created_at DESC LIMIT ?`
    )
    .all(limit) as Array<Record<string, unknown>>;
  return rows.map((r) => ({
    id: r.id as string,
    adminEmail: r.admin_email as string,
    action: r.action as string,
    target: r.target as string,
    details: JSON.parse((r.details as string) ?? "{}"),
    ipAddress: r.ip_address as string | null,
    createdAt: r.created_at as string,
  }));
}
