import "dotenv/config";
import bcrypt from "bcryptjs";
import { initDb } from "../src/db/schema.js";
import { createOwnerAccount } from "../src/services/users.js";
import { logAdminAction } from "../src/services/auditLog.js";
import crypto from "node:crypto";

initDb();

const email = process.env.OWNER_EMAIL ?? "shyam_1@hotmail.co.uk";
const password =
  process.env.OWNER_INITIAL_PASSWORD ?? crypto.randomBytes(12).toString("base64url").slice(0, 16);

async function main() {
  const owner = await createOwnerAccount(email, password, "Libraix Owner");
  logAdminAction(owner.id, "owner.seed", email, { note: "Super Admin account created via seed script" });

  console.log("\n=== Libraix Super Admin Created ===\n");
  console.log("Email:       ", email);
  console.log("Role:        ", owner.role);
  console.log("Admin login: ", `${process.env.FRONTEND_URL ?? "https://libraix.ai"}/admin/login`);
  console.log("\nTemporary password (change after first login):");
  console.log(password);
  console.log("\nStore this password securely. It will not be shown again.\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
