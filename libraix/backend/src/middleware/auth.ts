import type { Request, Response, NextFunction } from "express";

declare module "express-session" {
  interface SessionData {
    userId?: string;
    adminId?: string;
    oauthState?: string;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "UNAUTHENTICATED" });
  }
  next();
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  next();
}
