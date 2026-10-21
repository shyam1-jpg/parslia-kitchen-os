import assert from "node:assert/strict";
import { test } from "node:test";
import { ConnectorError } from "../src/errors.ts";
import { requestJson } from "../src/http.ts";
import { ConnectedSystems } from "../src/runtime.ts";
import type { Actor, Connector } from "../src/types.ts";
import { assertPublicUrl, isRecord } from "../src/validate.ts";
import { json, startMock } from "./mock.ts";

const owner: Actor = { companyId: "co_a", userId: "owner_a", role: "owner" };
const staff: Actor = { companyId: "co_a", userId: "staff_a", role: "staff" };
const now = () => new Date("2026-10-21T12:00:00.000Z");

test("a read retries 503 and a machine command does not", async () => {
  let reads = 0;
  let machines = 0;
  const mock = await startMock((req, res) => {
    if ((req.url ?? "").includes("/machine")) {
      machines += 1;
      res.statusCode = 503;
      res.end("down");
      return;
    }
    reads += 1;
    if (reads === 1) {
      res.statusCode = 503;
      res.end("busy");
      return;
    }
    json(res, 200, { ok: true });
  });
  try {
    const read = await requestJson(
      {
        url: `${mock.url}/read`,
        method: "GET",
        timeoutMs: 1000,
        retry: { maxAttempts: 3, baseDelayMs: 1 },
        safety: "read",
      },
      { fetchImpl: fetch, sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)), random: () => 0, safety: "read" },
    );
    assert.equal(read.attempts, 2);
    assert.equal(reads, 2);
    await assert.rejects(
      () =>
        requestJson(
          {
            url: `${mock.url}/machine`,
            method: "POST",
            body: "{}",
            timeoutMs: 1000,
            retry: { maxAttempts: 5, baseDelayMs: 1 },
            safety: "read",
          },
          { fetchImpl: fetch, sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)), random: () => 0, safety: "machine" },
        ),
      (error: unknown) => error instanceof ConnectorError && error.code === "upstream" && error.retryable === false,
    );
    assert.equal(machines, 1);
  } finally {
    await mock.close();
  }
});

test("a read times out and stops after the configured attempts", async () => {
  const mock = await startMock(async (_req, res) => {
    await new Promise((resolve) => setTimeout(resolve, 250));
    if (!res.writableEnded) json(res, 200, { ok: true });
  });
  try {
    const started = Date.now();
    await assert.rejects(
      () =>
        requestJson(
          { url: `${mock.url}/slow`, method: "GET", timeoutMs: 40, retry: { maxAttempts: 2, baseDelayMs: 1 }, safety: "read" },
          { fetchImpl: fetch, sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)), random: () => 0, safety: "read" },
        ),
      (error: unknown) => error instanceof ConnectorError && error.code === "timeout" && error.retryable === false,
    );
    assert.ok(Date.now() - started < 2000);
    assert.equal(mock.hits.length, 2);
  } finally {
    await mock.close();
  }
});

test("manual temperature is recorded once and never calls the network", async () => {
  let fetched = 0;
  const systems = new ConnectedSystems({
    allowLoopback: true,
    now,
    fetchImpl: async () => {
      fetched += 1;
      throw new Error("network used");
    },
  });
  const connection = await systems.activate(owner, { displayName: "Probe book", systemId: "manual-temperature" });
  assert.equal(connection.status, "connected");
  await assert.rejects(
    () => systems.recordReading(staff, connection.id, { deviceId: "probe_1", celsius: 4, idempotencyKey: "temp-key-0001" }),
    (error: unknown) => error instanceof ConnectorError && error.code === "forbidden",
  );
  const reading = await systems.recordReading(owner, connection.id, {
    deviceId: "probe_1",
    celsius: 4.04,
    idempotencyKey: "temp-key-0001",
  });
  assert.equal(reading.celsius, 4);
  const duplicate = await systems.recordReading(owner, connection.id, {
    deviceId: "probe_1",
    celsius: 4.04,
    idempotencyKey: "temp-key-0001",
  });
  assert.equal(duplicate.duplicate, true);
  assert.equal(duplicate.id, reading.id);
  assert.equal(systems.listReadings(staff, connection.id).length, 1);
  await assert.rejects(
    () => systems.recordReading(owner, connection.id, { deviceId: "probe_1", celsius: 80, idempotencyKey: "temp-key-0001" }),
    (error: unknown) => error instanceof ConnectorError && error.code === "conflict",
  );
  assert.equal(fetched, 0);
});

test("the runtime does not retry a machine command even if the connector asks for read retries", async () => {
  let calls = 0;
  const mock = await startMock((_req, res) => {
    calls += 1;
    res.statusCode = 503;
    res.end("down");
  });
  const probe: Connector = {
    id: "probe-test",
    label: "Probe",
    description: "Test-only machine command.",
    actions: { pulse: { permission: "temperatures.edit", safety: "machine" } },
    parseSettings(input, env) {
      if (!isRecord(input) || typeof input.url !== "string") throw new ConnectorError("validation", "url required");
      return { url: assertPublicUrl(input.url, env.allowLoopback) };
    },
    parseSecret() {
      return null;
    },
    secretMatches(_settings, secret) {
      return secret === null;
    },
    checkStatus() {
      return Promise.resolve({ status: "connected", error: null });
    },
    async run(_action, ctx) {
      const settings = ctx.settings as { url: string };
      await ctx.request({
        url: settings.url,
        method: "POST",
        body: JSON.stringify({ on: true }),
        timeoutMs: 1000,
        retry: { maxAttempts: 5, baseDelayMs: 1 },
        safety: "read",
      });
      return { kind: "status", status: "connected", error: null };
    },
  };
  const systems = new ConnectedSystems({ allowLoopback: true, now, extraConnectors: [probe], random: () => 0 });
  try {
    const connection = await systems.activate(owner, {
      displayName: "Pulse",
      connectorId: "probe-test",
      settings: { url: `${mock.url}/pulse` },
    });
    assert.equal(calls, 0);
    await assert.rejects(
      () => systems.execute(owner, connection.id, "pulse", { idempotencyKey: "pulse-key-0001" }),
      (error: unknown) => error instanceof ConnectorError && error.retryable === false,
    );
    assert.equal(calls, 1);
    await assert.rejects(() => systems.execute(owner, connection.id, "pulse", { idempotencyKey: "pulse-key-0001" }));
    assert.equal(calls, 2);
  } finally {
    await mock.close();
  }
});
