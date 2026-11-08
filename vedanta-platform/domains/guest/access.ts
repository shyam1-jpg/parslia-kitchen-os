/** Guest access-code rules. Codes stay private; login must not enumerate accounts. */

export const ACCESS_CODE_TTL_DAYS = 14;
export const ACCESS_LOCK_AFTER = 5;
export const ACCESS_LOCK_MINUTES = 15;

export const GENERIC_FAIL = "That email or access code is not recognised.";
export const EXPIRED = "That access code has expired. Request a new one, or write to the house.";
export const LOCKED = "Too many attempts. Wait a few minutes, or write to the house.";
export const RECOVERY_OK = "If that email has a guest book, the house will help. You can also write to reception.";

export type AccessFailCode = "unknown" | "wrong" | "expired" | "locked";
export type AccessCheck = { ok: true } | { ok: false; code: AccessFailCode; detail: string };

export function accessOutcome(input: {
  found: boolean;
  hashMatches: boolean;
  expiresAt?: Date | string | null;
  lockedUntil?: Date | string | null;
  now?: Date;
}): AccessCheck {
  const now = input.now ?? new Date();
  if (input.found && input.lockedUntil && new Date(input.lockedUntil).getTime() > now.getTime()) {
    return { ok: false, code: "locked", detail: LOCKED };
  }
  if (!input.found || !input.hashMatches) {
    return { ok: false, code: input.found ? "wrong" : "unknown", detail: GENERIC_FAIL };
  }
  if (input.expiresAt && new Date(input.expiresAt).getTime() < now.getTime()) {
    return { ok: false, code: "expired", detail: EXPIRED };
  }
  return { ok: true };
}

export function nextFailedAttempts(current: number, now: Date = new Date()): { attempts: number; lockedUntil: Date | null } {
  const attempts = current + 1;
  if (attempts >= ACCESS_LOCK_AFTER) {
    return { attempts, lockedUntil: new Date(now.getTime() + ACCESS_LOCK_MINUTES * 60_000) };
  }
  return { attempts, lockedUntil: null };
}

export function issueExpiry(now: Date = new Date()): Date {
  return new Date(now.getTime() + ACCESS_CODE_TTL_DAYS * 86_400_000);
}

export function publicLoginDetail(check: AccessCheck): string {
  if (check.ok) return "";
  if (check.code === "expired") return EXPIRED;
  if (check.code === "locked") return LOCKED;
  return GENERIC_FAIL;
}
