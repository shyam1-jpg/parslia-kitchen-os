import bcrypt from "bcryptjs";
import { v4 as uuid } from "uuid";
import { db } from "../db/schema.js";
import type { PlanTier } from "../config/models.js";

export type UserRole = "user" | "admin" | "super_admin" | "support";

export type BillingStatus = "active" | "past_due";

export interface UserRow {
  id: string;
  email: string;
  password_hash: string | null;
  display_name: string | null;
  plan: PlanTier;
  email_verified: number;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  billing_status: BillingStatus;
  role: UserRole;
  suspended: number;
  totp_secret: string | null;
  totp_enabled: number;
}

export interface SafeUser {
  id: string;
  email: string;
  displayName: string | null;
  plan: PlanTier;
  emailVerified: boolean;
  billingStatus?: BillingStatus;
  role?: UserRole;
  suspended?: boolean;
}

export interface AdminUser {
  id: string;
  email: string;
  displayName: string | null;
  role: UserRole;
  totpEnabled: boolean;
}

function toSafeUser(row: UserRow): SafeUser {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    plan: row.plan,
    emailVerified: row.email_verified === 1,
    billingStatus: (row.billing_status as BillingStatus) ?? "active",
    role: row.role ?? "user",
    suspended: row.suspended === 1,
  };
}

export function toAdminUser(row: UserRow): AdminUser {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    role: row.role ?? "user",
    totpEnabled: row.totp_enabled === 1,
  };
}

export function findUserByEmail(email: string): UserRow | undefined {
  return db.prepare("SELECT * FROM users WHERE email = ?").get(email.toLowerCase()) as UserRow | undefined;
}

export function findUserById(id: string): UserRow | undefined {
  return db.prepare("SELECT * FROM users WHERE id = ?").get(id) as UserRow | undefined;
}

export async function createUser(email: string, password: string, displayName?: string): Promise<SafeUser> {
  const existing = findUserByEmail(email);
  if (existing) throw new Error("EMAIL_EXISTS");

  const id = uuid();
  const passwordHash = await bcrypt.hash(password, 12);
  db.prepare(
    "INSERT INTO users (id, email, password_hash, display_name) VALUES (?, ?, ?, ?)"
  ).run(id, email.toLowerCase(), passwordHash, displayName ?? null);

  db.prepare(
    "INSERT INTO auth_identities (id, user_id, provider, provider_user_id) VALUES (?, ?, ?, ?)"
  ).run(uuid(), id, "email", email.toLowerCase());

  return toSafeUser(findUserById(id)!);
}

export async function verifyPassword(user: UserRow, password: string): Promise<boolean> {
  if (!user.password_hash) return false;
  return bcrypt.compare(password, user.password_hash);
}

export function linkOAuthIdentity(userId: string, provider: string, providerUserId: string) {
  const existing = db
    .prepare("SELECT user_id FROM auth_identities WHERE provider = ? AND provider_user_id = ?")
    .get(provider, providerUserId) as { user_id: string } | undefined;

  if (existing && existing.user_id !== userId) {
    throw new Error("IDENTITY_LINKED_TO_OTHER_USER");
  }

  if (!existing) {
    db.prepare(
      "INSERT INTO auth_identities (id, user_id, provider, provider_user_id) VALUES (?, ?, ?, ?)"
    ).run(uuid(), userId, provider, providerUserId);
  }
}

export function findOrCreateOAuthUser(
  provider: string,
  providerUserId: string,
  email: string,
  displayName?: string
): SafeUser {
  const identity = db
    .prepare("SELECT user_id FROM auth_identities WHERE provider = ? AND provider_user_id = ?")
    .get(provider, providerUserId) as { user_id: string } | undefined;

  if (identity) {
    return toSafeUser(findUserById(identity.user_id)!);
  }

  const existingByEmail = findUserByEmail(email);
  if (existingByEmail) {
    linkOAuthIdentity(existingByEmail.id, provider, providerUserId);
    return toSafeUser(existingByEmail);
  }

  const id = uuid();
  db.prepare(
    "INSERT INTO users (id, email, display_name, email_verified) VALUES (?, ?, ?, 1)"
  ).run(id, email.toLowerCase(), displayName ?? null);

  linkOAuthIdentity(id, provider, providerUserId);
  return toSafeUser(findUserById(id)!);
}

export function createPasswordResetToken(email: string): string | null {
  const user = findUserByEmail(email);
  if (!user) return null;
  const token = uuid();
  const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  db.prepare("DELETE FROM password_reset_tokens WHERE user_id = ?").run(user.id);
  db.prepare("INSERT INTO password_reset_tokens (token, user_id, expires_at) VALUES (?, ?, ?)").run(
    token,
    user.id,
    expires
  );
  return token;
}

export function createEmailVerificationToken(userId: string): string {
  const token = uuid();
  const expires = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
  db.prepare("DELETE FROM email_verification_tokens WHERE user_id = ?").run(userId);
  db.prepare("INSERT INTO email_verification_tokens (token, user_id, expires_at) VALUES (?, ?, ?)").run(
    token,
    userId,
    expires
  );
  return token;
}

export function verifyEmailWithToken(token: string): boolean {
  const row = db
    .prepare("SELECT user_id, expires_at FROM email_verification_tokens WHERE token = ?")
    .get(token) as { user_id: string; expires_at: string } | undefined;
  if (!row || new Date(row.expires_at) < new Date()) return false;
  db.prepare("UPDATE users SET email_verified = 1, updated_at = datetime('now') WHERE id = ?").run(row.user_id);
  db.prepare("DELETE FROM email_verification_tokens WHERE token = ?").run(token);
  return true;
}

export function resetPasswordWithToken(token: string, newPassword: string): boolean {
  const row = db
    .prepare("SELECT user_id, expires_at FROM password_reset_tokens WHERE token = ?")
    .get(token) as { user_id: string; expires_at: string } | undefined;
  if (!row || new Date(row.expires_at) < new Date()) return false;
  const passwordHash = bcrypt.hashSync(newPassword, 12);
  db.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?").run(
    passwordHash,
    row.user_id
  );
  db.prepare("DELETE FROM password_reset_tokens WHERE token = ?").run(token);
  return true;
}

export function setStripeCustomer(userId: string, customerId: string, subscriptionId?: string) {
  if (subscriptionId) {
    db.prepare(
      "UPDATE users SET stripe_customer_id = ?, stripe_subscription_id = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(customerId, subscriptionId, userId);
  } else {
    db.prepare(
      "UPDATE users SET stripe_customer_id = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(customerId, userId);
  }
}

export function getStripeCustomerId(userId: string): string | null {
  const row = db.prepare("SELECT stripe_customer_id FROM users WHERE id = ?").get(userId) as
    | { stripe_customer_id: string | null }
    | undefined;
  return row?.stripe_customer_id ?? null;
}

export function updateUserPlan(userId: string, plan: PlanTier) {
  db.prepare("UPDATE users SET plan = ?, updated_at = datetime('now') WHERE id = ?").run(plan, userId);
}

export function setUserBillingStatus(userId: string, status: BillingStatus) {
  db.prepare("UPDATE users SET billing_status = ?, updated_at = datetime('now') WHERE id = ?").run(status, userId);
}

export function findUserByStripeCustomerId(customerId: string): UserRow | undefined {
  return db.prepare("SELECT * FROM users WHERE stripe_customer_id = ?").get(customerId) as UserRow | undefined;
}

export function deleteUserAccount(userId: string): boolean {
  const row = findUserById(userId);
  if (row?.role === "super_admin") throw new Error("CANNOT_DELETE_SUPER_ADMIN");
  const result = db.prepare("DELETE FROM users WHERE id = ?").run(userId);
  return result.changes > 0;
}

export function listUsers(limit = 100, offset = 0) {
  return db
    .prepare("SELECT * FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?")
    .all(limit, offset) as UserRow[];
}

export function setUserSuspended(userId: string, suspended: boolean) {
  db.prepare("UPDATE users SET suspended = ?, updated_at = datetime('now') WHERE id = ?").run(
    suspended ? 1 : 0,
    userId
  );
}

export function setUserRole(userId: string, role: UserRole) {
  if (role === "super_admin" && process.env.ALLOW_SUPER_ADMIN_PROMOTION !== "true") {
    throw new Error("SUPER_ADMIN_PROMOTION_BLOCKED");
  }
  db.prepare("UPDATE users SET role = ?, updated_at = datetime('now') WHERE id = ?").run(role, userId);
}

export function setTotpSecret(userId: string, secret: string | null, enabled: boolean) {
  db.prepare(
    "UPDATE users SET totp_secret = ?, totp_enabled = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(secret, enabled ? 1 : 0, userId);
}

export async function createOwnerAccount(
  email: string,
  password: string,
  displayName = "Owner"
): Promise<AdminUser> {
  const existing = findUserByEmail(email);
  if (existing) {
    const forceReset = process.env.OWNER_FORCE_PASSWORD_RESET === "true";
    if (forceReset) {
      const passwordHash = await bcrypt.hash(password, 12);
      db.prepare(
        "UPDATE users SET role = 'super_admin', password_hash = ?, display_name = ?, updated_at = datetime('now') WHERE id = ?"
      ).run(passwordHash, displayName, existing.id);
    } else if (existing.role !== "super_admin") {
      db.prepare(
        "UPDATE users SET role = 'super_admin', display_name = ?, updated_at = datetime('now') WHERE id = ?"
      ).run(displayName, existing.id);
    }
    return toAdminUser(findUserById(existing.id)!);
  }
  const id = uuid();
  const passwordHash = await bcrypt.hash(password, 12);
  db.prepare(
    "INSERT INTO users (id, email, password_hash, display_name, role, email_verified, plan) VALUES (?, ?, ?, ?, 'super_admin', 1, 'enterprise')"
  ).run(id, email.toLowerCase(), passwordHash, displayName);
  db.prepare(
    "INSERT INTO auth_identities (id, user_id, provider, provider_user_id) VALUES (?, ?, ?, ?)"
  ).run(uuid(), id, "email", email.toLowerCase());
  return toAdminUser(findUserById(id)!);
}

export function isAdminRole(role?: UserRole | string): boolean {
  return role === "super_admin" || role === "admin" || role === "support";
}

export { toSafeUser };
