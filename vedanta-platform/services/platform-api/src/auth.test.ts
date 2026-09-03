import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { emailLoginEnabled, staffEmailLoginEnabled } from "./auth.ts";

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
