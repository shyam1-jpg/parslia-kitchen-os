import "dotenv/config";
import express from "express";
import session from "express-session";
import connectSqlite3 from "connect-sqlite3";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "node:path";
import { initDb } from "./db/schema.js";
import authRoutes from "./routes/auth.js";
import apiRoutes from "./routes/api.js";
import conversationRoutes from "./routes/conversations.js";
import memoryRoutes from "./routes/memory.js";
import projectRoutes from "./routes/projects.js";
import billingRoutes, { stripeWebhookHandler } from "./routes/billing.js";

initDb();

const app = express();
const port = Number(process.env.PORT ?? 3001);
const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:5173";
const isProd = process.env.NODE_ENV === "production";

const SQLiteStore = connectSqlite3(session);

app.set("trust proxy", 1);

app.use(
  helmet({
    contentSecurityPolicy: isProd
      ? {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", frontendUrl, "https://libraix.ai"],
          },
        }
      : false,
  })
);

app.use(
  cors({
    origin: [frontendUrl, "https://libraix.ai", "http://localhost:5173"],
    credentials: true,
  })
);

// Stripe webhook needs raw body before JSON parser
app.post("/api/billing/stripe/webhook", express.raw({ type: "application/json" }), stripeWebhookHandler);

app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());

app.use(
  session({
    store: new SQLiteStore({ db: "sessions.db", dir: path.dirname(process.env.DATABASE_PATH ?? "./data/libraix.db") }),
    secret: process.env.SESSION_SECRET ?? "dev-secret-change-me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "strict" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  })
);

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30 });
const aiLimiter = rateLimit({ windowMs: 60 * 1000, max: 20 });

app.get("/health", (_req, res) => res.json({ ok: true }));
app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api", aiLimiter, apiRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/memory", memoryRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/billing", billingRoutes);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "INTERNAL_ERROR" });
});

app.listen(port, () => {
  console.log(`Libraix API listening on http://localhost:${port}`);
});
