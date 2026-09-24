import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { emailLoginEnabled, staffEmailLoginEnabled, productionOwnerAllowed } from "./auth.ts";

function restore(name: string, value: string | undefined) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

describe("staffEmailLoginEnabled", () => {
  it("is available for local development by default", () => {
    const prevEnv = process.env.NODE_ENV;
    const prevFlag = process.env.ALLOW_EMAIL_LOGIN;
    process.env.NODE_ENV = "development";
    delete process.env.ALLOW_EMAIL_LOGIN;
    try { assert.equal(staffEmailLoginEnabled(), true); }
    finally { restore("NODE_ENV", prevEnv); restore("ALLOW_EMAIL_LOGIN", prevFlag); }
  });

  it("can be disabled explicitly in development", () => {
    const prevEnv = process.env.NODE_ENV;
    const prevFlag = process.env.ALLOW_EMAIL_LOGIN;
    process.env.NODE_ENV = "development";
    process.env.ALLOW_EMAIL_LOGIN = "false";
    try { assert.equal(staffEmailLoginEnabled(), false); }
    finally { restore("NODE_ENV", prevEnv); restore("ALLOW_EMAIL_LOGIN", prevFlag); }
  });

  it("is always disabled in production even when ALLOW_EMAIL_LOGIN=true", () => {
    const prevEnv = process.env.NODE_ENV;
    const prevFlag = process.env.ALLOW_EMAIL_LOGIN;
    process.env.NODE_ENV = "production";
    process.env.ALLOW_EMAIL_LOGIN = "true";
    try { assert.equal(staffEmailLoginEnabled(), false); }
    finally { restore("NODE_ENV", prevEnv); restore("ALLOW_EMAIL_LOGIN", prevFlag); }
  });
});

describe("emailLoginEnabled guest portal flag", () => {
  it("is enabled by default, including production", () => {
    const prev = process.env.GUEST_PORTAL_ENABLED;
    delete process.env.GUEST_PORTAL_ENABLED;
    try { assert.equal(emailLoginEnabled(), true); }
    finally { restore("GUEST_PORTAL_ENABLED", prev); }
  });

  it("can disable guest registration and access-code sign-in independently", () => {
    const prev = process.env.GUEST_PORTAL_ENABLED;
    process.env.GUEST_PORTAL_ENABLED = "false";
    try { assert.equal(emailLoginEnabled(), false); }
    finally { restore("GUEST_PORTAL_ENABLED", prev); }
  });
});

describe("productionOwnerAllowed", () => {
  it("allows local development owners without an allowlist", () => {
    const prevEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";
    try { assert.equal(productionOwnerAllowed("owner@example.com"), true); }
    finally { restore("NODE_ENV", prevEnv); }
  });

  it("rejects a production system owner not explicitly configured", () => {
    const prevEnv = process.env.NODE_ENV;
    const prevOwner = process.env.BOOTSTRAP_OWNER_EMAIL;
    const prevAdmins = process.env.BOOTSTRAP_ADMIN_EMAILS;
    const prevAllow = process.env.SYSTEM_OWNER_ALLOWLIST;
    process.env.NODE_ENV = "production";
    delete process.env.BOOTSTRAP_OWNER_EMAIL;
    delete process.env.BOOTSTRAP_ADMIN_EMAILS;
    delete process.env.SYSTEM_OWNER_ALLOWLIST;
    try { assert.equal(productionOwnerAllowed("owner@example.com"), false); }
    finally {
      restore("NODE_ENV", prevEnv);
      restore("BOOTSTRAP_OWNER_EMAIL", prevOwner);
      restore("BOOTSTRAP_ADMIN_EMAILS", prevAdmins);
      restore("SYSTEM_OWNER_ALLOWLIST", prevAllow);
    }
  });

  it("allows production owners explicitly configured by deployment secret", () => {
    const prevEnv = process.env.NODE_ENV;
    const prevOwner = process.env.BOOTSTRAP_OWNER_EMAIL;
    process.env.NODE_ENV = "production";
    process.env.BOOTSTRAP_OWNER_EMAIL = "Owner@Example.com";
    try { assert.equal(productionOwnerAllowed("owner@example.com"), true); }
    finally { restore("NODE_ENV", prevEnv); restore("BOOTSTRAP_OWNER_EMAIL", prevOwner); }
  });
});
