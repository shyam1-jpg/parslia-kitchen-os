import assert from "node:assert/strict";
import { test } from "node:test";
import { ConnectorError } from "../src/errors.ts";
import { ConnectedSystems } from "../src/runtime.ts";
import { MemoryStore } from "../src/store.ts";
import type { Actor } from "../src/types.ts";
import { json, startMock } from "./mock.ts";

const now = () => new Date("2026-10-21T12:00:00.000Z");
const ownerA: Actor = { companyId: "co_a", userId: "owner_a", role: "owner" };
const chefA: Actor = { companyId: "co_a", userId: "chef_a", role: "chef" };
const staffA: Actor = { companyId: "co_a", userId: "staff_a", role: "staff" };
const ownerB: Actor = { companyId: "co_b", userId: "owner_b", role: "owner" };
const KEY_A = "vk_company_a_key_9f3a";
const KEY_B = "vk_company_b_key_77c1";

function service(store = new MemoryStore()) {
  return new ConnectedSystems({ store, allowLoopback: true, now, random: () => 0 });
}

const vedantaBody = {
  items: [
    {
      id: "grp_1",
      date: "2026-10-22",
      name: "Morning sitting",
      service: "lunch",
      expected_guests: 18,
      dietary_notes: "2 vegan, 1 gluten-free",
    },
    {
      id: "grp_2",
      date: "2026-10-22",
      name: "Evening sitting",
      service: "dinner",
      expected_guests: 12,
      dietary_notes: "nut allergy",
    },
    { id: "grp_bad", date: "2026-10-22", name: "Bad", service: "lunch", expected_guests: -3, dietary_notes: "" },
    { id: "other_day", date: "2026-10-23", name: "Tomorrow", service: "lunch", expected_guests: 4, dietary_notes: "" },
  ],
};

test("settings section lists Vedanta without a key, and a manager can sync covers for one company", async () => {
  const store = new MemoryStore();
  const systems = service(store);
  const section = systems.settingsSection(ownerA);
  const vedanta = section.systems.find((system) => system.systemId === "vedanta-os");
  assert.ok(vedanta);
  assert.equal(section.title, "Connected systems");
  assert.equal(section.canManage, true);
  const keyField = vedanta.fields.find((field) => field.key === "secret.apiKey");
  assert.equal(keyField?.value, null);
  assert.equal(keyField?.secret, true);
  assert.match(vedanta.setupHelp, /kitchen\.read/);
  assert.equal(JSON.stringify(section).includes(KEY_A), false);

  const mock = await startMock((req, res) => {
    if (req.headers.authorization !== `Bearer ${KEY_A}`) {
      json(res, 401, { detail: "Sign in to continue" });
      return;
    }
    json(res, 200, vedantaBody);
  });
  try {
    await assert.rejects(
      () => systems.activate(staffA, { displayName: "House", systemId: "vedanta-os", secret: { apiKey: KEY_A } }),
      (error: unknown) => error instanceof ConnectorError && error.code === "forbidden",
    );
    const bad = await systems.activate(ownerA, {
      displayName: "Wrong key",
      systemId: "vedanta-os",
      settings: { baseUrl: mock.url, retry: { maxAttempts: 2, baseDelayMs: 1 }, timeoutMs: 1000 },
      secret: { apiKey: "not-the-real-key" },
    });
    assert.equal(bad.status, "auth_expired");
    const connected = await systems.reconnect(ownerA, bad.id, { apiKey: KEY_A });
    assert.equal(connected.status, "connected");
    assert.equal(JSON.stringify(systems.list(ownerA)).includes(KEY_A), false);
    assert.equal(store.getSecret("co_b", connected.id), null);
    assert.equal(store.getSecret("co_a", connected.id)?.kind, "api_key");

    await assert.rejects(
      () => systems.syncCovers(staffA, connected.id, { date: "2026-10-22" }),
      (error: unknown) => error instanceof ConnectorError && error.code === "forbidden",
    );
    const synced = await systems.syncCovers(chefA, connected.id, { date: "2026-10-22" });
    assert.equal(synced.created, 2);
    assert.equal(synced.issues.length, 2);
    const lunch = synced.rows.find((row) => row.externalId === "grp_1");
    assert.equal(lunch?.covers, 18);
    assert.deepEqual(lunch?.dietaryNeeds, [
      { label: "vegan", count: 2 },
      { label: "gluten-free", count: 1 },
    ]);
    assert.equal(synced.rows.find((row) => row.externalId === "grp_2")?.dietaryNeeds[0]?.label, "nut allergy");

    const again = await systems.syncCovers(chefA, connected.id, { date: "2026-10-22" });
    assert.equal(again.created, 0);
    assert.equal(again.unchanged, 2);
    assert.equal(systems.listCovers(staffA, connected.id, "2026-10-22").length, 2);

    assert.throws(
      () => systems.listCovers(ownerB, connected.id),
      (error: unknown) => error instanceof ConnectorError && error.code === "not_found",
    );
    assert.equal(JSON.stringify(systems.listAudit(ownerA)).includes(KEY_A), false);
    assert.equal(systems.settingsSection(chefA).canManage, false);
    assert.throws(
      () => systems.settingsSection(staffA),
      (error: unknown) => error instanceof ConnectorError && error.code === "forbidden",
    );
  } finally {
    await mock.close();
  }
});

test("a second company uses the same connector with its own URL, header, and field mapping", async () => {
  const systems = service();
  const mock = await startMock((req, res) => {
    if (req.headers["x-api-key"] !== KEY_B) {
      json(res, 401, { detail: "Sign in to continue" });
      return;
    }
    json(res, 200, {
      data: {
        bookings: [
          {
            ref: "B-9",
            on: "2026-10-22",
            meal: "breakfast",
            party: "Workshop",
            headcount: 7,
            diets: [{ name: "vegan", count: 3 }],
          },
        ],
      },
    });
  });
  try {
    const connection = await systems.activate(ownerB, {
      displayName: "Other PMS",
      connectorId: "booking-pms",
      locationId: "site_2",
      settings: {
        baseUrl: mock.url,
        endpointPath: "/bookings",
        timeoutMs: 1000,
        retry: { maxAttempts: 2, baseDelayMs: 1 },
        auth: { mode: "api_key", headerName: "X-Api-Key", scheme: "raw" },
        fieldMapping: {
          items: "data.bookings",
          externalId: "ref",
          date: "on",
          covers: "headcount",
          dietary: "diets",
          service: "meal",
          label: "party",
          dietaryLabel: "name",
          dietaryCount: "count",
        },
      },
      secret: { apiKey: KEY_B },
    });
    assert.equal(connection.status, "connected");
    const synced = await systems.syncCovers(ownerB, connection.id, { date: "2026-10-22", idempotencyKey: "sync-b-2026-10-22" });
    assert.equal(synced.rows[0]?.covers, 7);
    assert.equal(synced.rows[0]?.label, "Workshop");
    assert.deepEqual(synced.rows[0]?.dietaryNeeds, [{ label: "vegan", count: 3 }]);
    assert.equal(synced.rows[0]?.locationId, "site_2");
    const hits = mock.hits.length;
    const replay = await systems.syncCovers(ownerB, connection.id, { date: "2026-10-22", idempotencyKey: "sync-b-2026-10-22" });
    assert.equal(replay.duplicate, true);
    assert.equal(mock.hits.length, hits);
    await assert.rejects(
      () => systems.syncCovers(ownerB, connection.id, { date: "2026-10-23", idempotencyKey: "sync-b-2026-10-22" }),
      (error: unknown) => error instanceof ConnectorError && error.code === "conflict",
    );
    await systems.disconnect(ownerB, connection.id);
    assert.throws(
      () => systems.get(ownerB, connection.id),
      (error: unknown) => error instanceof ConnectorError && error.code === "not_found",
    );
  } finally {
    await mock.close();
  }
});

test("reads retry a 503 once and do not import a bad date or a secret pasted into settings", async () => {
  const store = new MemoryStore();
  const systems = service(store);
  let failures = 0;
  const mock = await startMock(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    if (url.searchParams.get("date") === "2026-10-22" && failures === 0) {
      failures += 1;
      res.statusCode = 503;
      res.end("busy");
      return;
    }
    json(res, 200, { items: [{ id: "g", date: "2026-10-22", expected_guests: 4, dietary_notes: "", name: "Day", service: "lunch" }] });
  });
  try {
    await assert.rejects(
      () =>
        systems.activate(ownerA, {
          displayName: "Leaky",
          systemId: "vedanta-os",
          settings: { baseUrl: mock.url, apiKey: "pasted-into-settings" },
          secret: { apiKey: KEY_A },
        }),
      (error: unknown) => error instanceof ConnectorError && error.code === "validation",
    );
    assert.equal(store.connectionCount(), 0);
    const connection = await systems.activate(ownerA, {
      displayName: "Retry",
      systemId: "vedanta-os",
      settings: { baseUrl: mock.url, retry: { maxAttempts: 3, baseDelayMs: 1 }, timeoutMs: 1000 },
      secret: { apiKey: KEY_A },
    });
    const synced = await systems.syncCovers(ownerA, connection.id, { date: "2026-10-22" });
    assert.equal(synced.upstreamAttempts, 2);
    assert.equal(synced.created, 1);
    await assert.rejects(
      () => systems.syncCovers(ownerA, connection.id, { date: "2026-02-31" }),
      (error: unknown) => error instanceof ConnectorError && error.code === "validation",
    );
  } finally {
    await mock.close();
  }
});

test("oauth refresh replaces an expired access token and a viewer status check does not", async () => {
  const store = new MemoryStore();
  const systems = service(store);
  const mock = await startMock((req, res, body) => {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    if (url.pathname === "/token") {
      const params = new URLSearchParams(body);
      if (params.get("refresh_token") !== "refresh-token-old") {
        json(res, 401, { detail: "rejected" });
        return;
      }
      json(res, 200, { access_token: "access-token-new", refresh_token: "refresh-token-new", expires_in: 3600 });
      return;
    }
    if (req.headers.authorization !== "Bearer access-token-new") {
      json(res, 401, { detail: "Sign in to continue" });
      return;
    }
    json(res, 200, { items: [] });
  });
  try {
    const connection = await systems.activate(ownerA, {
      displayName: "OAuth bookings",
      systemId: "booking-oauth",
      settings: {
        baseUrl: mock.url,
        endpointPath: "/covers",
        auth: { mode: "oauth_refresh", tokenUrl: `${mock.url}/token` },
        timeoutMs: 1000,
        retry: { maxAttempts: 1, baseDelayMs: 0 },
      },
      secret: { accessToken: "access-token-old", refreshToken: "refresh-token-old", expiresAt: "2020-01-01T00:00:00.000Z" },
    });
    assert.equal(connection.status, "connected");
    const saved = store.getSecret("co_a", connection.id);
    assert.equal(saved?.kind, "oauth");
    if (saved?.kind === "oauth") assert.equal(saved.accessToken, "access-token-new");
    assert.equal(JSON.stringify(systems.get(ownerA, connection.id)).includes("access-token-new"), false);

    const viewer = service(store);
    store.createConnection(
      {
        id: "con_stale",
        companyId: "co_a",
        connectorId: "booking-pms",
        systemId: null,
        displayName: "Stale token",
        locationId: null,
        status: "connected",
        settings: {
          baseUrl: mock.url,
          endpointPath: "/covers",
          dateQueryParam: "date",
          timeoutMs: 1000,
          retry: { maxAttempts: 1, baseDelayMs: 0 },
          auth: { mode: "oauth_refresh", tokenUrl: `${mock.url}/token` },
          fieldMapping: {
            items: "items",
            externalId: "id",
            date: "date",
            covers: "covers",
            dietary: "dietary",
            dietaryLabel: "label",
            dietaryCount: "count",
          },
        },
        lastCheckedAt: null,
        lastSyncAt: null,
        lastError: null,
        createdAt: "2026-10-21T12:00:00.000Z",
        updatedAt: "2026-10-21T12:00:00.000Z",
      },
      { kind: "oauth", accessToken: "access-token-old", refreshToken: "refresh-token-old", expiresAt: "2027-01-01T00:00:00.000Z" },
    );
    const tokenCallsBefore = mock.hits.filter((hit) => hit.path.startsWith("/token")).length;
    const checked = await viewer.status(chefA, "con_stale");
    assert.equal(checked.status, "auth_expired");
    assert.equal(mock.hits.filter((hit) => hit.path.startsWith("/token")).length, tokenCallsBefore);
  } finally {
    await mock.close();
  }
});

test("parallel syncs with one idempotency key call the booking system once", async () => {
  const systems = service();
  let syncs = 0;
  const mock = await startMock(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    if (url.searchParams.get("date") === "2026-10-22") {
      syncs += 1;
      await new Promise((resolve) => setTimeout(resolve, 40));
    }
    json(res, 200, vedantaBody);
  });
  try {
    const connection = await systems.activate(ownerA, {
      displayName: "Parallel",
      systemId: "vedanta-os",
      settings: { baseUrl: mock.url, timeoutMs: 1000, retry: { maxAttempts: 1, baseDelayMs: 0 } },
      secret: { apiKey: KEY_A },
    });
    const [first, second] = await Promise.all([
      systems.syncCovers(ownerA, connection.id, { date: "2026-10-22", idempotencyKey: "sync-once-key" }),
      systems.syncCovers(ownerA, connection.id, { date: "2026-10-22", idempotencyKey: "sync-once-key" }),
    ]);
    assert.equal(syncs, 1);
    assert.equal([first.duplicate, second.duplicate].filter(Boolean).length, 1);
    assert.equal(systems.listCovers(ownerA, connection.id).length, 2);
  } finally {
    await mock.close();
  }
});

test("rejects public URL tricks and a credential with a line break", async () => {
  const systems = new ConnectedSystems({ allowLoopback: false, now });
  await assert.rejects(
    () =>
      systems.activate(ownerA, {
        displayName: "Metadata",
        connectorId: "booking-pms",
        settings: {
          baseUrl: "https://169.254.169.254",
          endpointPath: "/covers",
          fieldMapping: { items: "items", externalId: "id", date: "date", covers: "covers", dietary: "dietary" },
        },
        secret: { apiKey: KEY_A },
      }),
    (error: unknown) => error instanceof ConnectorError && error.code === "validation",
  );
  await assert.rejects(
    () =>
      systems.activate(ownerA, {
        displayName: "Loopback",
        systemId: "vedanta-os",
        settings: { baseUrl: "http://127.0.0.1:9" },
        secret: { apiKey: KEY_A },
      }),
    (error: unknown) => error instanceof ConnectorError && error.code === "validation",
  );
  await assert.rejects(
    () =>
      systems.activate(ownerA, {
        displayName: "Broken key",
        systemId: "vedanta-os",
        secret: { apiKey: "line-one\nline-two" },
      }),
    (error: unknown) => error instanceof ConnectorError && error.code === "validation",
  );
});
