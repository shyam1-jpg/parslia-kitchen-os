import type { Request, Response, NextFunction } from "express";
import { findUserById } from "../services/users.js";

declare module "express-session" {
  interface SessionData {
    userId?: string;
    adminId?: string;
    oauthState?: string;
    admin2faVerified?: boolean;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "UNAUTHENTICATED" });
  }

  const row = findUserById(req.session.userId);
  if (!row) {
    req.session.destroy(() => {
      res.clearCookie("connect.sid");
    });
    return res.status(401).json({ error: "UNAUTHENTICATED" });
  }

  if (row.suspended) {
    return res.status(403).json({ error: "ACCOUNT_SUSPENDED" });
  }

  next();
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  next();
}
