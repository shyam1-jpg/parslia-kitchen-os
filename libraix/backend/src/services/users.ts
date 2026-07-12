import bcrypt from "bcryptjs";
import { v4 as uuid } from "uuid";
import { db } from "../db/schema.js";
import type { PlanTier } from "../config/models.js";

export interface UserRow {
  id: string;
  email: string;
  password_hash: string | null;
  display_name: string | null;
  plan: PlanTier;
  email_verified: number;
}

export interface SafeUser {
  id: string;
  email: string;
  displayName: string | null;
  plan: PlanTier;
  emailVerified: boolean;
}

function toSafeUser(row: UserRow): SafeUser {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    plan: row.plan,
    emailVerified: row.email_verified === 1,
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

export { toSafeUser };
