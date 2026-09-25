'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const billing = require('../lib/billing');

function emptyDb() {
  return { users: {}, tenants: {}, subscriptions: {}, invoices: [], billingEvents: {} };
}

function seedUser(db, email, opts) {
  const em = email.toLowerCase();
  const tenantId = (opts && opts.tenantId) || 'tenant_a';
  db.users[em] = {
    email: em,
    createdAt: (opts && opts.createdAt) || new Date(Date.now() - 2 * 86400000).toISOString(),
    tenantId,
  };
  db.tenants[tenantId] = db.tenants[tenantId] || {
    org: { name: 'Test Kitchen', plan: 'Free trial' },
    team: [{ email: em, role: 'admin' }],
    sites: [{ id: 'site_1' }],
  };
  return db.users[em];
}

function restoreEnv(prev) {
  Object.keys(prev).forEach((key) => {
    if (prev[key] === undefined) delete process.env[key];
    else process.env[key] = prev[key];
  });
}

test('plan catalog includes site allowances and annual prices', () => {
  const plans = billing.planCatalog();
  const byId = Object.fromEntries(plans.map((p) => [p.id, p]));
  assert.equal(byId.users_1.maxSites, 1);
  assert.equal(byId.users_5.maxSites, 1);
  assert.equal(byId.users_10.maxSites, 2);
  assert.equal(byId.users_20.maxSites, 5);
  assert.equal(byId.users_50.maxSites, 10);
  assert.equal(byId.users_5.amount, 4000);
  assert.equal(byId.users_5.annualAmount, 40000);
  assert.equal(byId.users_5.popular, true);
});

test('checkout is disabled until Stripe or dev mode is set', () => {
  const prev = {
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    BILLING_DEV_MODE: process.env.BILLING_DEV_MODE,
  };
  delete process.env.STRIPE_SECRET_KEY;
  delete process.env.BILLING_DEV_MODE;
  assert.equal(billing.isConfigured(), false);
  restoreEnv(prev);
});

test('dev checkout + simulated payment activates a company subscription', async () => {
  const prev = { STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY, BILLING_DEV_MODE: process.env.BILLING_DEV_MODE, APP_URL: process.env.APP_URL };
  process.env.STRIPE_SECRET_KEY = billing.DEV_KEY;
  process.env.APP_URL = 'http://localhost:4011';
  const db = emptyDb();
  const writes = [];
  const writeDb = (next) => { writes.push(JSON.parse(JSON.stringify(next))); };
  seedUser(db, 'chef@example.com');
  const checkout = await billing.createCheckout({ plan: 'users_5', email: 'chef@example.com', user: db.users['chef@example.com'] });
  assert.match(checkout.url, /\/api\/billing\/dev\/pay/);
  assert.ok(checkout.sessionId);
  const paid = await billing.completeDevCheckout(db, writeDb, checkout.sessionId);
  assert.equal(paid.ok, true);
  assert.equal(paid.email, 'chef@example.com');
  assert.equal(db.subscriptions['chef@example.com'].status, 'active');
  assert.equal(db.subscriptions['chef@example.com'].plan, 'users_5');
  assert.equal(db.subscriptions['chef@example.com'].maxSites, 1);
  assert.equal(billing.canAccess(db, 'chef@example.com'), true);
  restoreEnv(prev);
});

test('org teammates inherit the payer subscription', async () => {
  const prev = { STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY };
  process.env.STRIPE_SECRET_KEY = billing.DEV_KEY;
  const db = emptyDb();
  seedUser(db, 'owner@kitchen.test', { tenantId: 't1' });
  seedUser(db, 'cook@kitchen.test', { tenantId: 't1' });
  billing.grantPlan(db, { email: 'owner@kitchen.test', plan: 'users_10', months: 1, source: 'invoice' });
  assert.equal(billing.canAccess(db, 'cook@kitchen.test'), true);
  assert.equal(billing.getUserLimit(db, 'cook@kitchen.test'), 10);
  assert.equal(billing.getSiteLimit(db, 'cook@kitchen.test'), 2);
  restoreEnv(prev);
});

test('owner invoice grant and revoke', () => {
  const db = emptyDb();
  seedUser(db, 'invoice@site.test');
  const sub = billing.grantPlan(db, { email: 'invoice@site.test', plan: 'users_20', months: 3, note: 'PO-44' });
  assert.equal(sub.status, 'active');
  assert.equal(sub.source, 'invoice');
  assert.equal(db.invoices.length, 1);
  assert.equal(db.invoices[0].amountPence, 13000 * 3);
  billing.revokePlan(db, { email: 'invoice@site.test', reason: 'ended' });
  assert.equal(db.subscriptions['invoice@site.test'].status, 'canceled');
  const user = db.users['invoice@site.test'];
  user.trialEndsAt = new Date(Date.now() - 86400000).toISOString();
  assert.equal(billing.canAccess(db, 'invoice@site.test'), false);
});

test('webhook signature rejection and invoice.payment_failed', async () => {
  const prev = { STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET, STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY };
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_123';
  process.env.STRIPE_SECRET_KEY = billing.DEV_KEY;
  const db = emptyDb();
  seedUser(db, 'late@pay.test');
  billing.grantPlan(db, { email: 'late@pay.test', plan: 'users_1', months: 1, source: 'stripe' });
  db.subscriptions['late@pay.test'].stripeCustomerId = 'cus_late';
  const raw = JSON.stringify({
    id: 'evt_fail_1',
    type: 'invoice.payment_failed',
    data: {
      object: {
        id: 'in_fail_1',
        customer: 'cus_late',
        customer_email: 'late@pay.test',
        amount_due: 1900,
        currency: 'gbp',
        hosted_invoice_url: 'https://stripe.test/in_fail_1',
      },
    },
  });
  const bad = await billing.handleWebhook(raw, 't=1,v1=nope', db, () => {});
  assert.equal(bad.ok, false);
  const sig = billing.signWebhook(raw, 'whsec_test_123');
  const ok = await billing.handleWebhook(raw, sig, db, () => {});
  assert.equal(ok.ok, true);
  assert.equal(db.subscriptions['late@pay.test'].status, 'past_due');
  assert.equal(db.invoices[0].status, 'open');
  const dup = await billing.handleWebhook(raw, sig, db, () => {});
  assert.equal(dup.duplicate, true);
  restoreEnv(prev);
});

test('trial blocks login after expiry without a paid plan', () => {
  const prev = { DEMO_MODE: process.env.DEMO_MODE, OWNER_EMAIL: process.env.OWNER_EMAIL };
  process.env.DEMO_MODE = 'false';
  process.env.OWNER_EMAIL = 'owner@kiteline.uk';
  const db = emptyDb();
  const user = seedUser(db, 'trial@site.test');
  user.trialEndsAt = new Date(Date.now() + 3 * 86400000).toISOString();
  assert.equal(billing.canAccess(db, 'trial@site.test'), true);
  user.trialEndsAt = new Date(Date.now() - 86400000).toISOString();
  assert.equal(billing.canAccess(db, 'trial@site.test'), false);
  restoreEnv(prev);
});

test('HTTP public + owner admin handlers', async () => {
  const prev = { STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY, OWNER_EMAIL: process.env.OWNER_EMAIL };
  process.env.STRIPE_SECRET_KEY = billing.DEV_KEY;
  process.env.OWNER_EMAIL = 'boss@kiteline.uk';
  const db = emptyDb();
  seedUser(db, 'new@site.test');
  const cfg = await billing.tryHandlePublic({ route: '/billing/config', method: 'GET', db, writeDb() {} });
  assert.equal(cfg.status, 200);
  assert.equal(cfg.body.enabled, true);
  assert.equal(cfg.body.plans.length, 5);
  const checkout = await billing.tryHandlePublic({
    route: '/billing/checkout',
    method: 'POST',
    body: { plan: 'users_1', email: 'new@site.test' },
    db,
    writeDb() {},
  });
  assert.equal(checkout.status, 200);
  assert.ok(checkout.body.url);
  const denied = await billing.tryHandleAuth({
    route: '/billing/admin/grant',
    method: 'POST',
    body: { email: 'new@site.test', plan: 'users_5' },
    me: { email: 'new@site.test' },
    db,
    writeDb() {},
  });
  assert.equal(denied.status, 403);
  const grant = await billing.tryHandleAuth({
    route: '/billing/admin/grant',
    method: 'POST',
    body: { email: 'new@site.test', plan: 'users_5', months: 1 },
    me: { email: 'boss@kiteline.uk' },
    db,
    writeDb() {},
  });
  assert.equal(grant.status, 200);
  assert.equal(grant.body.subscription.plan, 'users_5');
  restoreEnv(prev);
});

test('Academy Starter checkout uses subscription mode', async () => {
  const prev = { STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY };
  process.env.STRIPE_SECRET_KEY = billing.DEV_KEY;
  const academy = require('../lib/academy-billing');
  const result = await academy.createCourseCheckout({
    email: 'student@test.com',
    courseTitle: 'Starter — £9.99/month',
    amountPence: 999,
    baseUrl: 'http://localhost:4011',
  });
  assert.equal(result.mode, 'subscription');
  assert.equal(result.plan, 'academy_starter');
  restoreEnv(prev);
});
