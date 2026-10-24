import assert from "node:assert/strict";
import { test } from "node:test";
import { ConnectedSystems } from "../src/runtime.ts";
import { MemoryStore } from "../src/store.ts";
import { requestJson } from "../src/http.ts";
import { assertPublicBaseUrl } from "../src/validate.ts";
import { json, startMock } from "./mock.ts";

test("memory storage requires deliberate opt-in", () => {
  assert.throws(() => new ConnectedSystems(), /durable storage/);
  assert.throws(() => new ConnectedSystems({ store: new MemoryStore() }), /durable storage/);
});

test("private and mapped literal targets are rejected", () => {
  for (const host of ["10.0.0.1", "172.16.0.1", "192.168.1.1", "100.64.0.1", "[::ffff:127.0.0.1]", "[fc00::1]", "[fe80::1]"]) {
    assert.throws(() => assertPublicBaseUrl(`https://${host}`, false));
  }
  assert.equal(assertPublicBaseUrl("https://example.com", false), "https://example.com");
});

test("redirect cannot forward a mock credential to another origin", async () => {
  const target = await startMock((_req, res) => json(res, 200, {}));
  const source = await startMock((_req, res) => {
    res.writeHead(302, { location: target.url }); res.end();
  });
  try {
    await assert.rejects(() => requestJson({ url: source.url, method: "GET", headers: { "X-Api-Key": "mock-key-only" }, timeoutMs: 1000, retry: { maxAttempts: 1, baseDelayMs: 0 } }, { fetchImpl: fetch, sleep: async () => {}, random: () => 0, safety: "read" }));
    assert.equal(target.hits.length, 0);
  } finally { await source.close(); await target.close(); }
});

test("upstream error bodies never become persisted error messages", async () => {
  const mock = await startMock((_req, res) => json(res, 400, { key: "shortsecret", patient: "Mock Guest" }));
  try {
    await assert.rejects(() => requestJson({ url: mock.url, method: "GET", timeoutMs: 1000, retry: { maxAttempts: 1, baseDelayMs: 0 } }, { fetchImpl: fetch, sleep: async () => {}, random: () => 0, safety: "read" }), (e: Error) => !e.message.includes("shortsecret") && !e.message.includes("Mock Guest"));
  } finally { await mock.close(); }
});

test("streamed body limit applies to bytes before buffering entire response", async () => {
  let cancelled = false;
  const fetchImpl = (async () => new Response(new ReadableStream({
    pull(controller) { controller.enqueue(new Uint8Array(600_000)); },
    cancel() { cancelled = true; },
  }))) as typeof fetch;
  await assert.rejects(() => requestJson({ url: "https://example.com", method: "GET", timeoutMs: 1000, retry: { maxAttempts: 1, baseDelayMs: 0 } }, { fetchImpl, sleep: async () => {}, random: () => 0, safety: "read" }), /1 MB/);
  assert.equal(cancelled, true);
});

test("changing destination removes the old key without making an outbound request", async () => {
  const store = new MemoryStore();
  const first = await startMock((_req, res) => json(res, 200, { items: [] }));
  const second = await startMock((_req, res) => json(res, 200, { items: [] }));
  const systems = new ConnectedSystems({ store, allowInMemoryStore: true, allowLoopback: true });
  const actor = { companyId: "mock-company", userId: "mock-user", role: "owner" as const };
  try {
    const connection = await systems.activate(actor, { displayName: "Mock", systemId: "vedanta-os", settings: { baseUrl: first.url }, secret: { apiKey: "mock-credential-only" } });
    const changed = await systems.updateSettings(actor, connection.id, { baseUrl: second.url });
    assert.equal(changed.status, "auth_expired");
    assert.equal(store.getSecret(actor.companyId, connection.id), null);
    assert.equal(second.hits.length, 0);
    await systems.reconnect(actor, connection.id, { apiKey: "mock-replacement-only" });
    assert.equal(second.hits.length, 1);
  } finally { await first.close(); await second.close(); }
});
