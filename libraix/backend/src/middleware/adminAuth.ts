import type { Request, Response, NextFunction } from "express";
import { findUserById } from "../services/users.js";

declare module "express-session" {
  interface SessionData {
    adminId?: string;
    admin2faVerified?: boolean;
  }
}

export type AdminRole = "super_admin" | "admin" | "support";

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session.adminId) {
    return res.status(401).json({ error: "ADMIN_UNAUTHENTICATED" });
  }
  const row = findUserById(req.session.adminId);
  if (!row || !row.role || row.role === "user") {
    return res.status(403).json({ error: "ADMIN_FORBIDDEN" });
  }
  if (row.suspended) {
    return res.status(403).json({ error: "ADMIN_SUSPENDED" });
  }
  if (row.totp_enabled && !req.session.admin2faVerified) {
    return res.status(403).json({ error: "ADMIN_2FA_REQUIRED" });
  }
  next();
}

export function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session.adminId) {
    return res.status(401).json({ error: "ADMIN_UNAUTHENTICATED" });
  }
  const row = findUserById(req.session.adminId);
  if (!row || row.role !== "super_admin") {
    return res.status(403).json({ error: "SUPER_ADMIN_REQUIRED" });
  }
  next();
}
