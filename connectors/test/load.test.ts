import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { test } from "node:test";
import { ConnectedSystems } from "../src/runtime.ts";
import { MemoryStore } from "../src/store.ts";
import type { Actor, ConnectionRecord } from "../src/types.ts";
import { json, startMock } from "./mock.ts";

test("10,000 stored connections stay company-scoped, and 40 concurrent reads stay bounded", { timeout: 30_000 }, async () => {
  const store = new MemoryStore();
  const now = new Date("2026-10-21T12:00:00.000Z").toISOString();
  const beforeHeap = process.memoryUsage().heapUsed;
  for (let company = 0; company < 500; company += 1) {
    for (let index = 0; index < 20; index += 1) {
      const record: ConnectionRecord = {
        id: `seed_${company}_${index}`,
        companyId: `co_${company}`,
        connectorId: "booking-pms",
        systemId: "vedanta-os",
        displayName: `Seed ${index}`,
        locationId: null,
        status: "connected",
        settings: { endpointPath: "/v1/covers" },
        lastCheckedAt: now,
        lastSyncAt: null,
        lastError: null,
        createdAt: now,
        updatedAt: now,
      };
      store.createConnection(record, { kind: "api_key", apiKey: `seed-key-${company}-${index}-value` });
    }
  }
  assert.equal(store.connectionCount(), 10_000);
  const systems = new ConnectedSystems({ store, allowLoopback: true, now: () => new Date("2026-10-21T12:00:00.000Z"), random: () => 0 });
  const owner: Actor = { companyId: "co_0", userId: "owner_0", role: "owner" };
  const listedAt = performance.now();
  const listed = systems.list(owner);
  const listMs = performance.now() - listedAt;
  assert.equal(listed.length, 20);
  assert.equal(JSON.stringify(listed).includes("seed-key-"), false);
  assert.equal(store.getConnection("co_1", "seed_0_0"), null);
  assert.equal(store.getSecret("co_1", "seed_0_0"), null);

  let inFlight = 0;
  let maxInFlight = 0;
  const mock = await startMock(async (_req, res) => {
    inFlight += 1;
    maxInFlight = Math.max(maxInFlight, inFlight);
    await new Promise((resolve) => setTimeout(resolve, 20));
    inFlight -= 1;
    json(res, 200, {
      items: [{ id: "g", date: "2026-10-22", expected_guests: 5, dietary_notes: "1 vegan", name: "Service", service: "lunch" }],
    });
  });
  const bench: Actor = { companyId: "bench_co", userId: "owner_bench", role: "owner" };
  try {
    const ids: string[] = [];
    for (let index = 0; index < 40; index += 1) {
      const connection = await systems.activate(bench, {
        displayName: `Bench ${index}`,
        systemId: "vedanta-os",
        settings: { baseUrl: mock.url, timeoutMs: 2000, retry: { maxAttempts: 1, baseDelayMs: 0 } },
        secret: { apiKey: "bench-key-123456" },
      });
      ids.push(connection.id);
    }
    const hitsAfterActivate = mock.hits.length;
    const samples: number[] = [];
    await Promise.all(
      ids.map(async (id) => {
        const started = performance.now();
        const synced = await systems.syncCovers(bench, id, { date: "2026-10-22" });
        samples.push(performance.now() - started);
        assert.equal(synced.created, 1);
        assert.equal(synced.rows[0]?.dietaryNeeds[0]?.label, "vegan");
      }),
    );
    samples.sort((a, b) => a - b);
    const p50 = samples[Math.floor(samples.length * 0.5)] ?? 0;
    const p95 = samples[Math.ceil(samples.length * 0.95) - 1] ?? 0;
    assert.equal(mock.hits.length - hitsAfterActivate, 40);
    assert.ok(maxInFlight >= 2, `expected overlapping reads, max in flight was ${maxInFlight}`);
    assert.ok(listMs < 100, `company list took ${listMs}ms`);
    assert.ok(p95 < 5000, `p95 sync was ${p95}ms`);
    const heapAfter = process.memoryUsage().heapUsed;
    const report = {
      storedConnections: 10_000,
      companies: 500,
      connectionsPerCompany: 20,
      listOneCompanyMs: Number(listMs.toFixed(2)),
      concurrentSyncs: 40,
      maxInFlight,
      syncP50Ms: Number(p50.toFixed(2)),
      syncP95Ms: Number(p95.toFixed(2)),
      heapGrowthMb: Number(((heapAfter - beforeHeap) / 1_048_576).toFixed(1)),
      note: "This measures one Node process and a local mock. It is not a capacity claim for Vedanta, Render, or the Hercules deployment.",
    };
    try {
      mkdirSync("/opt/cursor/artifacts", { recursive: true });
      writeFileSync("/opt/cursor/artifacts/connector-load.json", `${JSON.stringify(report, null, 2)}\n`);
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "EACCES" && code !== "EPERM" && code !== "EROFS") throw error;
    }
    assert.ok(report.heapGrowthMb < 200);
  } finally {
    await mock.close();
  }
});
