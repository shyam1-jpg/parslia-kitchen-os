import { v4 as uuid } from "uuid";
import { db } from "../db/schema.js";
import { getAllProviderHealth } from "../providers/gateway.js";

export async function getAdminDashboardStats() {
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

  const totalUsers = (db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'user' OR role IS NULL OR role = ''").get() as { c: number }).c;
  const newToday = (
    db.prepare("SELECT COUNT(*) as c FROM users WHERE date(created_at) = date('now')").get() as { c: number }
  ).c;
  const newWeek = (
    db.prepare("SELECT COUNT(*) as c FROM users WHERE date(created_at) >= ?").get(weekAgo) as { c: number }
  ).c;

  const byPlan = db
    .prepare("SELECT plan, COUNT(*) as c FROM users GROUP BY plan")
    .all() as { plan: string; c: number }[];

  const suspended = (db.prepare("SELECT COUNT(*) as c FROM users WHERE suspended = 1").get() as { c: number }).c;

  const usageToday = db
    .prepare(
      "SELECT COALESCE(SUM(messages_used),0) as messages, COALESCE(SUM(tokens_used),0) as tokens, COALESCE(SUM(estimated_cost_cents),0) as cost_cents FROM usage_daily WHERE date = ?"
    )
    .get(today) as { messages: number; tokens: number; cost_cents: number };

  const usageMonth = db
    .prepare(
      "SELECT COALESCE(SUM(messages_used),0) as messages, COALESCE(SUM(tokens_used),0) as tokens, COALESCE(SUM(estimated_cost_cents),0) as cost_cents FROM usage_daily WHERE date >= ?"
    )
    .get(monthAgo) as { messages: number; tokens: number; cost_cents: number };

  const activeToday = (
    db.prepare("SELECT COUNT(DISTINCT user_id) as c FROM usage_daily WHERE date = ? AND messages_used > 0").get(today) as {
      c: number;
    }
  ).c;

  const activeWeek = (
    db.prepare("SELECT COUNT(DISTINCT user_id) as c FROM usage_daily WHERE date >= ? AND messages_used > 0").get(weekAgo) as {
      c: number;
    }
  ).c;

  const providers = await getAllProviderHealth();

  const recentErrors = db
    .prepare("SELECT * FROM system_errors ORDER BY created_at DESC LIMIT 20")
    .all() as Array<Record<string, unknown>>;

  const proCount = byPlan.find((p) => p.plan === "pro")?.c ?? 0;
  const enterpriseCount = byPlan.find((p) => p.plan === "enterprise")?.c ?? 0;
  const freeCount = byPlan.find((p) => p.plan === "free")?.c ?? 0;

  const estimatedRevenueCents = proCount * 900 + enterpriseCount * 2900;

  return {
    users: { total: totalUsers, newToday, newWeek, suspended, activeToday, activeWeek, byPlan: Object.fromEntries(byPlan.map((p) => [p.plan, p.c])) },
    usage: {
      today: usageToday,
      month: usageMonth,
    },
    finance: {
      estimatedMonthlyRevenueCents: estimatedRevenueCents,
      estimatedMonthlyAiCostCents: usageMonth.cost_cents,
      estimatedProfitCents: estimatedRevenueCents - usageMonth.cost_cents,
    },
    providers,
    recentErrors: recentErrors.map((e) => ({
      id: e.id,
      source: e.source,
      message: e.message,
      createdAt: e.created_at,
    })),
  };
}

export function logSystemError(source: string, message: string, details?: Record<string, unknown>) {
  db.prepare("INSERT INTO system_errors (id, source, message, details) VALUES (?, ?, ?, ?)").run(
    uuid(),
    source,
    message.slice(0, 500),
    JSON.stringify(details ?? {})
  );
}
