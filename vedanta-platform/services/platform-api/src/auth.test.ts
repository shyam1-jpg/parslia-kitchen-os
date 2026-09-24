import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { emailLoginEnabled } from "./auth.ts";

describe("emailLoginEnabled", () => {
  it("is on outside production even without the flag", () => {
    const prevEnv = process.env.NODE_ENV;
    const prevFlag = process.env.ALLOW_EMAIL_LOGIN;
    process.env.NODE_ENV = "development";
    delete process.env.ALLOW_EMAIL_LOGIN;
    try { assert.equal(emailLoginEnabled(), true); }
    finally { process.env.NODE_ENV = prevEnv; process.env.ALLOW_EMAIL_LOGIN = prevFlag; }
  });

  it("is off in production unless ALLOW_EMAIL_LOGIN is set", () => {
    const prevEnv = process.env.NODE_ENV;
    const prevFlag = process.env.ALLOW_EMAIL_LOGIN;
    process.env.NODE_ENV = "production";
    delete process.env.ALLOW_EMAIL_LOGIN;
    try { assert.equal(emailLoginEnabled(), false); }
    finally { process.env.NODE_ENV = prevEnv; process.env.ALLOW_EMAIL_LOGIN = prevFlag; }
  });

  it("is on in production when ALLOW_EMAIL_LOGIN=true", () => {
    const prevEnv = process.env.NODE_ENV;
    const prevFlag = process.env.ALLOW_EMAIL_LOGIN;
    process.env.NODE_ENV = "production";
    process.env.ALLOW_EMAIL_LOGIN = "true";
    try { assert.equal(emailLoginEnabled(), true); }
    finally { process.env.NODE_ENV = prevEnv; process.env.ALLOW_EMAIL_LOGIN = prevFlag; }
  });
});
