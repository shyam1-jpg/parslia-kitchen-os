import { db } from "../db/schema.js";
import type { PlanTier } from "../config/models.js";
import { getPlanLimits } from "./siteConfig.js";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export interface UsageSummary {
  plan: PlanTier;
  messagesUsed: number;
  messagesLimit: number;
  premiumUsed: number;
  premiumLimit: number;
  imagesUsed: number;
  imagesLimit: number;
  remainingMessages: number;
  limitReached: boolean;
  /** Seconds of Live Voice used today */
  voiceSecondsUsed: number;
  /** Daily Live Voice allowance in seconds; -1 means unlimited */
  voiceSecondsLimit: number;
  remainingVoiceSeconds: number;
  voiceUnlimited: boolean;
  voiceLimitReached: boolean;
}

function getLimits(plan: PlanTier) {
  return getPlanLimits(plan);
}

function voiceLimitSeconds(plan: PlanTier): number {
  const mins = getLimits(plan).liveVoiceMinutes ?? 0;
  if (mins < 0) return -1;
  return Math.max(0, mins) * 60;
}

export function getUsage(userId: string, plan: PlanTier): UsageSummary {
  const date = today();
  const row = db
    .prepare("SELECT * FROM usage_daily WHERE user_id = ? AND date = ?")
    .get(userId, date) as
    | {
        messages_used: number;
        premium_used: number;
        images_used: number;
        voice_seconds_used?: number;
      }
    | undefined;

  const limits = getLimits(plan);
  const messagesUsed = row?.messages_used ?? 0;
  const premiumUsed = row?.premium_used ?? 0;
  const imagesUsed = row?.images_used ?? 0;
  const voiceSecondsUsed = row?.voice_seconds_used ?? 0;
  const remainingMessages = Math.max(0, limits.dailyMessages - messagesUsed);
  const voiceSecondsLimit = voiceLimitSeconds(plan);
  const voiceUnlimited = voiceSecondsLimit < 0;
  const remainingVoiceSeconds = voiceUnlimited
    ? Number.MAX_SAFE_INTEGER
    : Math.max(0, voiceSecondsLimit - voiceSecondsUsed);

  return {
    plan,
    messagesUsed,
    messagesLimit: limits.dailyMessages,
    premiumUsed,
    premiumLimit: limits.premiumModelMessages,
    imagesUsed,
    imagesLimit: limits.images,
    remainingMessages,
    limitReached: remainingMessages <= 0,
    voiceSecondsUsed,
    voiceSecondsLimit,
    remainingVoiceSeconds: voiceUnlimited ? -1 : remainingVoiceSeconds,
    voiceUnlimited,
    voiceLimitReached: !voiceUnlimited && remainingVoiceSeconds <= 0,
  };
}

export function recordMessageUsage(userId: string, isPremium: boolean, tokens = 0, costCents = 0) {
  const date = today();
  db.prepare(`
    INSERT INTO usage_daily (user_id, date, messages_used, premium_used, tokens_used, estimated_cost_cents)
    VALUES (?, ?, 1, ?, ?, ?)
    ON CONFLICT(user_id, date) DO UPDATE SET
      messages_used = messages_used + 1,
      premium_used = premium_used + excluded.premium_used,
      tokens_used = tokens_used + excluded.tokens_used,
      estimated_cost_cents = estimated_cost_cents + excluded.estimated_cost_cents
  `).run(userId, date, isPremium ? 1 : 0, tokens, costCents);
}

export function canSendMessage(userId: string, plan: PlanTier, isPremium: boolean): boolean {
  const usage = getUsage(userId, plan);
  if (usage.limitReached) return false;
  if (isPremium && usage.premiumUsed >= usage.premiumLimit) return false;
  return true;
}

export function canGenerateImage(userId: string, plan: PlanTier): boolean {
  const usage = getUsage(userId, plan);
  return usage.imagesLimit > 0 && usage.imagesUsed < usage.imagesLimit;
}

export function recordImageUsage(userId: string) {
  const date = today();
  db.prepare(`
    INSERT INTO usage_daily (user_id, date, images_used)
    VALUES (?, ?, 1)
    ON CONFLICT(user_id, date) DO UPDATE SET
      images_used = images_used + 1
  `).run(userId, date);
}

export function canUseLiveVoice(userId: string, plan: PlanTier): boolean {
  const usage = getUsage(userId, plan);
  // Also require at least one chat message remaining so free accounts stay capped overall
  if (usage.limitReached) return false;
  return !usage.voiceLimitReached;
}

export function getLiveVoiceAllowance(userId: string, plan: PlanTier): {
  maxSessionSeconds: number;
  remainingVoiceSeconds: number;
  voiceUnlimited: boolean;
} {
  const usage = getUsage(userId, plan);
  if (usage.voiceUnlimited) {
    return { maxSessionSeconds: 60 * 60, remainingVoiceSeconds: -1, voiceUnlimited: true }; // 1h soft cap per session
  }
  const remaining = Math.max(0, usage.remainingVoiceSeconds);
  return {
    maxSessionSeconds: remaining,
    remainingVoiceSeconds: remaining,
    voiceUnlimited: false,
  };
}

/** Record Live Voice seconds after a session ends (or periodically). */
export function recordVoiceUsage(userId: string, seconds: number) {
  const add = Math.max(0, Math.min(Math.floor(seconds), 60 * 60));
  if (add <= 0) return;
  const date = today();
  db.prepare(`
    INSERT INTO usage_daily (user_id, date, voice_seconds_used)
    VALUES (?, ?, ?)
    ON CONFLICT(user_id, date) DO UPDATE SET
      voice_seconds_used = voice_seconds_used + excluded.voice_seconds_used
  `).run(userId, date, add);
}
