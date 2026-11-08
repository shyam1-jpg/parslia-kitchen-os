'use strict';

/**
 * Kiteline payment system — subscriptions, invoices, Stripe Checkout, webhooks.
 * Drop-in replacement for kitline1/server/billing.js (copy this file there).
 */

const crypto = require('crypto');

function tenantsApi() {
  if (module.exports._tenants) return module.exports._tenants;
  try {
    return require('./tenants');
  } catch {
    return {
      getStateForUser(db, email) {
        const user = db.users && db.users[(email || '').toLowerCase().trim()];
        if (!user || !user.tenantId) return null;
        return (db.tenants && db.tenants[user.tenantId]) || null;
      },
    };
  }
}

function recipeAiAccess() {
  if (module.exports._recipeAi) return module.exports._recipeAi;
  try {
    return require('./recipe-ai-access');
  } catch {
    return {
      ADDON_ID: 'recipe_ai',
      addonCatalog() {
        return {
          id: 'recipe_ai',
          name: 'Recipe AI Assistant',
          description: 'AI ingredients, method steps & food photos',
          amount: Number(process.env.RECIPE_AI_ADDON_GBP || 12) * 100,
          currency: 'gbp',
        };
      },
      activateKitelineAddon() {},
      deactivateKitelineAddon() {},
    };
  }
}

/** Monthly plans — amounts in pence (GBP). Site allowances match kiteline.uk commercial spec. */
const PLANS = {
  users_1: {
    id: 'users_1',
    name: 'Kiteline Starter',
    description: '1 user · 1 site · HACCP, logs, reports',
    amount: 1900,
    currency: 'gbp',
    maxUsers: 1,
    maxSites: 1,
    orgPlan: 'Kiteline Starter (1 user)',
  },
  users_5: {
    id: 'users_5',
    name: 'Kiteline Team 5',
    description: 'Up to 5 users · 1 site · all modules',
    amount: 4000,
    currency: 'gbp',
    maxUsers: 5,
    maxSites: 1,
    orgPlan: 'Kiteline Team (5 users)',
    popular: true,
  },
  users_10: {
    id: 'users_10',
    name: 'Kiteline Team 10',
    description: 'Up to 10 users · 2 sites · all modules',
    amount: 7200,
    currency: 'gbp',
    maxUsers: 10,
    maxSites: 2,
    orgPlan: 'Kiteline Team (10 users)',
  },
  users_20: {
    id: 'users_20',
    name: 'Kiteline Team 20',
    description: 'Up to 20 users · 5 sites · all modules',
    amount: 13000,
    currency: 'gbp',
    maxUsers: 20,
    maxSites: 5,
    orgPlan: 'Kiteline Team (20 users)',
  },
  users_50: {
    id: 'users_50',
    name: 'Kiteline Team 50',
    description: 'Up to 50 users · 10 sites · volume discount',
    amount: 27500,
    currency: 'gbp',
    maxUsers: 50,
    maxSites: 10,
    orgPlan: 'Kiteline Team (50 users)',
    volumeDiscount: true,
  },
};

const PLAN_ALIASES = {
  solo: 'users_1',
  starter: 'users_1',
  team: 'users_5',
  team5: 'users_5',
  team10: 'users_10',
  team20: 'users_20',
  team50: 'users_50',
};

const PAID_STATUSES = new Set(['active', 'trialing', 'past_due']);
const TRIAL_DAYS = Number(process.env.TRIAL_DAYS || 14);
const TRIAL_MAX_USERS = Number(process.env.TRIAL_MAX_USERS || 5);
const PAST_DUE_GRACE_DAYS = Number(process.env.BILLING_PAST_DUE_GRACE_DAYS || 7);
const DEV_KEY = 'sk_test_kiteline_dev';

const envPriceKeys = {
  users_1: 'STRIPE_PRICE_USERS_1',
  users_5: 'STRIPE_PRICE_USERS_5',
  users_10: 'STRIPE_PRICE_USERS_10',
  users_20: 'STRIPE_PRICE_USERS_20',
  users_50: 'STRIPE_PRICE_USERS_50',
  recipe_ai: 'STRIPE_PRICE_RECIPE_AI',
};

function ownerEmail() {
  return (process.env.OWNER_EMAIL || 'shyam_1@hotmail.co.uk').toLowerCase().trim();
}

function isOwner(email) {
  return (email || '').toLowerCase().trim() === ownerEmail();
}

function secretKey() {
  return (process.env.STRIPE_SECRET_KEY || '').trim();
}

function webhookSecret() {
  return (process.env.STRIPE_WEBHOOK_SECRET || '').trim();
}

function isDevMode() {
  const key = secretKey();
  return process.env.BILLING_DEV_MODE === 'true' || key === DEV_KEY;
}

function isConfigured() {
  return !!secretKey() || isDevMode();
}

function appBaseUrl() {
  return (process.env.APP_URL || 'http://localhost:4001').replace(/\/$/, '');
}

function resolvePlanId(plan) {
  const id = (plan || '').trim();
  return PLAN_ALIASES[id] || id;
}

function planById(id) {
  return PLANS[resolvePlanId(id)] || null;
}

function annualAmount(plan) {
  return plan.amount * 10;
}

function stripePriceId(planId) {
  const envKey = envPriceKeys[planId];
  return (envKey && process.env[envKey]) || '';
}

function planCatalog() {
  return Object.values(PLANS).map((p) => {
    const perUser = Math.round(p.amount / p.maxUsers);
    return {
      id: p.id,
      name: p.name,
      description: p.description,
      amount: p.amount,
      annualAmount: annualAmount(p),
      annualDisplay: '£' + (annualAmount(p) / 100) + '/yr',
      currency: p.currency,
      maxUsers: p.maxUsers,
      maxSites: p.maxSites,
      display: '£' + (p.amount / 100) + '/mo',
      perUserDisplay: '£' + (perUser / 100).toFixed(perUser % 100 === 0 ? 0 : 2) + '/user',
      popular: !!p.popular,
      volumeDiscount: !!p.volumeDiscount,
      stripePriceId: stripePriceId(p.id) || null,
    };
  });
}

function ensureTrial(user) {
  if (!user) return user;
  if (!user.trialEndsAt) {
    const startMs = user.createdAt ? new Date(user.createdAt).getTime() : Date.now();
    user.trialStartedAt = user.trialStartedAt || user.createdAt || new Date(startMs).toISOString();
    user.trialEndsAt = new Date(startMs + TRIAL_DAYS * 86400000).toISOString();
  }
  return user;
}

function startTrial(user) {
  if (!user) return user;
  const now = Date.now();
  user.trialStartedAt = new Date(now).toISOString();
  user.trialEndsAt = new Date(now + TRIAL_DAYS * 86400000).toISOString();
  return user;
}

function getTrialInfo(user) {
  if (!user) return { active: false, expired: false, daysLeft: 0, endsAt: null, maxUsers: TRIAL_MAX_USERS };
  ensureTrial(user);
  const endsAt = user.trialEndsAt;
  const endsMs = new Date(endsAt).getTime();
  const daysLeft = Math.max(0, Math.ceil((endsMs - Date.now()) / 86400000));
  const active = endsMs > Date.now();
  return {
    active,
    expired: !active,
    daysLeft,
    endsAt,
    startedAt: user.trialStartedAt,
    maxUsers: TRIAL_MAX_USERS,
    days: TRIAL_DAYS,
  };
}

function ensureStore(db) {
  if (!db.subscriptions) db.subscriptions = {};
  if (!db.invoices) db.invoices = [];
  if (!db.billingEvents) db.billingEvents = {};
  if (!db.billingDevSessions) db.billingDevSessions = {};
}

function orgForUser(db, email) {
  const state = tenantsApi().getStateForUser(db, email);
  return state && state.org;
}

function tenantIdForUser(db, email) {
  const user = db.users && db.users[(email || '').toLowerCase().trim()];
  return (user && user.tenantId) || null;
}

function getSubscription(db, email) {
  if (!email) return null;
  ensureStore(db);
  const em = email.toLowerCase().trim();
  const direct = db.subscriptions[em];
  if (direct) return direct;
  const tid = tenantIdForUser(db, em);
  if (!tid) return null;
  for (const sub of Object.values(db.subscriptions)) {
    if (sub && sub.tenantId === tid && PAID_STATUSES.has(sub.status)) return sub;
  }
  return null;
}

function isPaidStatus(status, sub) {
  if (status === 'active' || status === 'trialing') return true;
  if (status === 'past_due') {
    if (!sub || !sub.pastDueSince) return true;
    const since = new Date(sub.pastDueSince).getTime();
    return Date.now() - since < PAST_DUE_GRACE_DAYS * 86400000;
  }
  return false;
}

function hasActiveSubscription(db, email) {
  const sub = getSubscription(db, email);
  return !!(sub && isPaidStatus(sub.status, sub));
}

function canAccess(db, email) {
  const em = (email || '').toLowerCase().trim();
  if (!em) return false;
  if (process.env.DEMO_MODE === 'true') return true;
  if (isOwner(em)) return true;
  if (hasActiveSubscription(db, em)) return true;
  const user = db.users && db.users[em];
  if (!user) return false;
  return getTrialInfo(user).active;
}

function syncOrgAccess(db, email) {
  const org = orgForUser(db, email);
  if (!org) return;
  const em = (email || '').toLowerCase().trim();
  const sub = getSubscription(db, em);
  if (isOwner(em) && !(sub && isPaidStatus(sub.status, sub))) {
    if (/free trial/i.test(org.plan || '')) org.plan = 'Complete Kiteline';
    delete org.trialEndsAt;
    return;
  }
  if (sub && isPaidStatus(sub.status, sub)) {
    if (sub.orgPlan) org.plan = sub.orgPlan;
    if (sub.maxUsers) org.maxUsers = sub.maxUsers;
    if (sub.maxSites) org.maxSites = sub.maxSites;
    delete org.trialEndsAt;
    return;
  }
  const user = db.users && db.users[em];
  if (!user) return;
  const trial = getTrialInfo(user);
  if (trial.active) {
    org.maxUsers = TRIAL_MAX_USERS;
    org.maxSites = 1;
    org.trialEndsAt = trial.endsAt;
    if (!org.plan || /demo/i.test(org.plan)) org.plan = 'Free trial';
  }
}

function getTrialStatus(db, email) {
  const em = (email || '').toLowerCase().trim();
  if (isOwner(em)) return { exempt: true, reason: 'owner' };
  if (hasActiveSubscription(db, em)) return { exempt: true, reason: 'subscription' };
  const user = db.users && db.users[em];
  if (!user) return { active: false, expired: true, daysLeft: 0 };
  const trial = getTrialInfo(user);
  return { exempt: false, ...trial };
}

function getUserLimit(db, email) {
  const sub = getSubscription(db, email);
  if (sub && isPaidStatus(sub.status, sub) && sub.maxUsers) return sub.maxUsers;
  const user = db.users && db.users[(email || '').toLowerCase().trim()];
  if (user && getTrialInfo(user).active) return TRIAL_MAX_USERS;
  const org = orgForUser(db, email);
  if (org && org.maxUsers) return org.maxUsers;
  return null;
}

function getSiteLimit(db, email) {
  const sub = getSubscription(db, email);
  if (sub && isPaidStatus(sub.status, sub) && sub.maxSites) return sub.maxSites;
  const user = db.users && db.users[(email || '').toLowerCase().trim()];
  if (user && getTrialInfo(user).active) return 1;
  const org = orgForUser(db, email);
  if (org && org.maxSites) return org.maxSites;
  return 1;
}

function remainingTrialDays(user) {
  if (!user) return TRIAL_DAYS;
  const info = getTrialInfo(user);
  if (!info.active) return 0;
  return info.daysLeft;
}

function applySubscription(db, email, patch) {
  ensureStore(db);
  const key = email.toLowerCase().trim();
  const tenantId = tenantIdForUser(db, key);
  db.subscriptions[key] = Object.assign({}, db.subscriptions[key] || {}, patch, {
    email: key,
    tenantId: patch.tenantId || tenantId || (db.subscriptions[key] && db.subscriptions[key].tenantId) || null,
    updatedAt: new Date().toISOString(),
  });
  syncOrgAccess(db, key);
  return db.subscriptions[key];
}

function recordInvoice(db, invoice) {
  ensureStore(db);
  const id = invoice.id || invoice.stripeInvoiceId || ('inv_' + crypto.randomBytes(6).toString('hex'));
  const existing = db.invoices.findIndex((row) => row.id === id || (invoice.stripeInvoiceId && row.stripeInvoiceId === invoice.stripeInvoiceId));
  const row = Object.assign({ id, createdAt: new Date().toISOString() }, invoice, { id });
  if (existing >= 0) db.invoices[existing] = Object.assign({}, db.invoices[existing], row);
  else db.invoices.unshift(row);
  return row;
}

function invoicesForEmail(db, email) {
  ensureStore(db);
  const em = (email || '').toLowerCase().trim();
  const tid = tenantIdForUser(db, em);
  return db.invoices.filter((inv) => inv.email === em || (tid && inv.tenantId === tid));
}

function findEmailByCustomer(db, customerId) {
  if (!customerId) return null;
  ensureStore(db);
  for (const [email, sub] of Object.entries(db.subscriptions)) {
    if (sub.stripeCustomerId === customerId) return email;
  }
  return null;
}

function listCustomers(db) {
  ensureStore(db);
  return Object.values(db.subscriptions).sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
}

const devStore = {
  customers: {},
  subscriptions: {},
  sessions: {},
  invoices: {},
  portal: {},
};

function devId(prefix) {
  return prefix + '_' + crypto.randomBytes(8).toString('hex');
}

async function stripeRequest(path, params) {
  if (isDevMode()) return devStripeRequest(path, params);
  const key = secretKey();
  if (!key) throw new Error('Stripe is not configured — add STRIPE_SECRET_KEY to server/.env');
  const body = new URLSearchParams(params).toString();
  const res = await fetch('https://api.stripe.com/v1' + path, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + key,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data.error && data.error.message) || 'Stripe HTTP ' + res.status);
  return data;
}

async function stripeGet(path) {
  if (isDevMode()) return devStripeGet(path);
  const key = secretKey();
  const res = await fetch('https://api.stripe.com/v1' + path, {
    headers: { Authorization: 'Bearer ' + key },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data.error && data.error.message) || 'Stripe HTTP ' + res.status);
  return data;
}

function devStripeRequest(path, params) {
  const p = params || {};
  if (path === '/checkout/sessions') {
    const id = devId('cs_test');
    const customer = p.customer_email ? (devStore.customers[p.customer_email] || devId('cus_test')) : devId('cus_test');
    if (p.customer_email) devStore.customers[p.customer_email] = customer;
    const subscription = p.mode === 'subscription' ? devId('sub_test') : null;
    const session = {
      id,
      object: 'checkout.session',
      mode: p.mode || 'subscription',
      status: 'open',
      payment_status: 'unpaid',
      customer,
      customer_email: p.customer_email || null,
      client_reference_id: p.client_reference_id || null,
      subscription,
      url: appBaseUrl() + '/api/billing/dev/pay?session_id=' + id,
      success_url: p.success_url,
      cancel_url: p.cancel_url,
      metadata: {
        plan: p['metadata[plan]'] || '',
        email: p['metadata[email]'] || p.customer_email || '',
        maxUsers: p['metadata[maxUsers]'] || '',
        maxSites: p['metadata[maxSites]'] || '',
        product: p['metadata[product]'] || '',
        type: p['metadata[type]'] || '',
        interval: p['metadata[interval]'] || 'month',
        courseTitle: p['metadata[courseTitle]'] || '',
        amountPence: p['metadata[amountPence]'] || '',
      },
      amount_total: Number(p['line_items[0][price_data][unit_amount]'] || 0),
    };
    if (subscription) {
      devStore.subscriptions[subscription] = {
        id: subscription,
        object: 'subscription',
        status: 'active',
        customer,
        current_period_end: Math.floor(Date.now() / 1000) + 30 * 86400,
        metadata: session.metadata,
      };
    }
    devStore.sessions[id] = session;
    return session;
  }
  if (path === '/billing_portal/sessions') {
    const id = devId('bps_test');
    const session = {
      id,
      url: appBaseUrl() + '/api/billing/dev/portal?customer=' + encodeURIComponent(p.customer || ''),
      customer: p.customer,
    };
    devStore.portal[id] = session;
    return session;
  }
  throw new Error('Unsupported Stripe path in dev mode: ' + path);
}

function devStripeGet(path) {
  const subMatch = path.match(/^\/subscriptions\/([^/?]+)/);
  if (subMatch) {
    const sub = devStore.subscriptions[subMatch[1]];
    if (!sub) throw new Error('No such subscription');
    return sub;
  }
  const sessMatch = path.match(/^\/checkout\/sessions\/([^/?]+)/);
  if (sessMatch) {
    const session = devStore.sessions[sessMatch[1]];
    if (!session) throw new Error('No such checkout session');
    return session;
  }
  throw new Error('Unsupported Stripe GET in dev mode: ' + path);
}

function checkoutLineItems(plan, interval) {
  const yearly = interval === 'year';
  const amount = yearly ? annualAmount(plan) : plan.amount;
  const priceId = yearly ? '' : stripePriceId(plan.id);
  if (priceId) {
    return {
      'line_items[0][price]': priceId,
      'line_items[0][quantity]': '1',
    };
  }
  return {
    'line_items[0][quantity]': '1',
    'line_items[0][price_data][currency]': plan.currency,
    'line_items[0][price_data][unit_amount]': String(amount),
    'line_items[0][price_data][recurring][interval]': yearly ? 'year' : 'month',
    'line_items[0][price_data][product_data][name]': plan.name + (yearly ? ' (annual)' : ''),
    'line_items[0][price_data][product_data][description]': plan.description,
  };
}

async function createCheckout({ plan, email, interval, user }) {
  if (!isConfigured()) {
    throw new Error('Online checkout not configured — email contact@kiteline.uk for an invoice.');
  }
  const planId = resolvePlanId(plan);
  const p = PLANS[planId];
  if (!p) throw new Error('Unknown plan — pick a tier from the pricing page');
  const em = (email || '').toLowerCase().trim();
  if (!em || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) throw new Error('Valid email required');
  const billingInterval = interval === 'year' ? 'year' : 'month';
  const base = appBaseUrl();
  const trialDays = remainingTrialDays(user);
  const params = Object.assign(
    {
      mode: 'subscription',
      customer_email: em,
      client_reference_id: em,
      allow_promotion_codes: 'true',
      billing_address_collection: 'auto',
      'metadata[plan]': p.id,
      'metadata[email]': em,
      'metadata[maxUsers]': String(p.maxUsers),
      'metadata[maxSites]': String(p.maxSites),
      'metadata[interval]': billingInterval,
      'subscription_data[metadata][plan]': p.id,
      'subscription_data[metadata][email]': em,
      'subscription_data[metadata][maxUsers]': String(p.maxUsers),
      'subscription_data[metadata][maxSites]': String(p.maxSites),
      'subscription_data[metadata][interval]': billingInterval,
      success_url: base + '/billing-success.html?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: base + '/pricing.html?checkout=cancel',
    },
    checkoutLineItems(p, billingInterval)
  );
  if (trialDays > 0) params['subscription_data[trial_period_days]'] = String(trialDays);
  const session = await stripeRequest('/checkout/sessions', params);
  return { url: session.url, sessionId: session.id, plan: p.id, interval: billingInterval, devMode: isDevMode() };
}

async function createRecipeAiCheckout({ email }) {
  const addon = recipeAiAccess().addonCatalog();
  if (!isConfigured()) {
    throw new Error('Online checkout not configured — email contact@kiteline.uk to enable Recipe AI for your company.');
  }
  const em = (email || '').toLowerCase().trim();
  if (!em || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) throw new Error('Valid email required');
  const base = appBaseUrl();
  const priceId = stripePriceId('recipe_ai');
  const params = {
    mode: 'subscription',
    customer_email: em,
    client_reference_id: em,
    allow_promotion_codes: 'true',
    'metadata[plan]': recipeAiAccess().ADDON_ID,
    'metadata[email]': em,
    'metadata[product]': 'recipe_ai',
    'subscription_data[metadata][plan]': recipeAiAccess().ADDON_ID,
    'subscription_data[metadata][email]': em,
    'subscription_data[metadata][product]': 'recipe_ai',
    success_url: base + '/billing-success.html?session_id={CHECKOUT_SESSION_ID}&addon=recipe_ai',
    cancel_url: base + '/app#settings',
  };
  if (priceId) {
    params['line_items[0][price]'] = priceId;
    params['line_items[0][quantity]'] = '1';
  } else {
    params['line_items[0][quantity]'] = '1';
    params['line_items[0][price_data][currency]'] = addon.currency || 'gbp';
    params['line_items[0][price_data][unit_amount]'] = String(addon.amount);
    params['line_items[0][price_data][recurring][interval]'] = 'month';
    params['line_items[0][price_data][product_data][name]'] = addon.name;
    params['line_items[0][price_data][product_data][description]'] = addon.description;
  }
  const session = await stripeRequest('/checkout/sessions', params);
  return { url: session.url, sessionId: session.id, plan: recipeAiAccess().ADDON_ID, devMode: isDevMode() };
}

async function createPortalSession(email, db) {
  const sub = getSubscription(db, email);
  if (!sub || !sub.stripeCustomerId) throw new Error('No active Stripe customer — subscribe first');
  const base = appBaseUrl();
  const session = await stripeRequest('/billing_portal/sessions', {
    customer: sub.stripeCustomerId,
    return_url: base + '/app#settings',
  });
  return { url: session.url, devMode: isDevMode() };
}

function signWebhook(rawBody, secret, timestamp) {
  const t = String(timestamp || Math.floor(Date.now() / 1000));
  const expected = crypto.createHmac('sha256', secret).update(t + '.' + rawBody, 'utf8').digest('hex');
  return 't=' + t + ',v1=' + expected;
}

function verifyWebhookSignature(rawBody, sigHeader) {
  const secret = webhookSecret();
  if (isDevMode() && !secret) return true;
  if (!secret) return false;
  if (!sigHeader) return false;
  const parts = {};
  String(sigHeader).split(',').forEach((bit) => {
    const i = bit.indexOf('=');
    if (i > 0) parts[bit.slice(0, i).trim()] = bit.slice(i + 1).trim();
  });
  const timestamp = parts.t;
  const v1 = parts.v1;
  if (!timestamp || !v1) return false;
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (age > 300) return false;
  const signed = timestamp + '.' + rawBody;
  const expected = crypto.createHmac('sha256', secret).update(signed, 'utf8').digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(v1, 'utf8'), Buffer.from(expected, 'utf8'));
  } catch {
    return v1 === expected;
  }
}

async function fetchStripeSubscription(subscriptionId) {
  return stripeGet('/subscriptions/' + subscriptionId);
}

function subscriptionFromStripe(sub, planHint) {
  const plan = resolvePlanId(planHint || (sub.metadata && sub.metadata.plan) || 'users_5');
  const p = PLANS[plan] || PLANS.users_5;
  const maxUsers = Number(sub.metadata && sub.metadata.maxUsers) || p.maxUsers;
  const maxSites = Number(sub.metadata && sub.metadata.maxSites) || p.maxSites;
  return {
    plan: p.id,
    orgPlan: p.orgPlan,
    maxUsers,
    maxSites,
    status: sub.status,
    source: 'stripe',
    interval: (sub.metadata && sub.metadata.interval) || 'month',
    stripeCustomerId: sub.customer,
    stripeSubscriptionId: sub.id,
    currentPeriodEnd: sub.current_period_end
      ? new Date(sub.current_period_end * 1000).toISOString()
      : null,
    pastDueSince: sub.status === 'past_due' ? new Date().toISOString() : null,
  };
}

function seenEvent(db, eventId) {
  ensureStore(db);
  if (!eventId) return false;
  if (db.billingEvents[eventId]) return true;
  db.billingEvents[eventId] = { id: eventId, at: new Date().toISOString() };
  const keys = Object.keys(db.billingEvents);
  if (keys.length > 500) {
    keys.slice(0, keys.length - 400).forEach((k) => { delete db.billingEvents[k]; });
  }
  return false;
}

async function activateFromCheckoutSession(session, db, writeDb) {
  if (session.metadata && (session.metadata.type === 'academy_course' || session.metadata.product === 'academy')) {
    if (module.exports._academyCheckout) {
      await module.exports._academyCheckout(session, db, writeDb);
      return { academy: true };
    }
    let academyBilling = null;
    try { academyBilling = require('./academy-billing'); } catch {}
    if (!academyBilling) {
      try { academyBilling = require('./academy/billing'); } catch {}
    }
    if (academyBilling && academyBilling.handleCheckoutCompleted) {
      try {
        let addEnrollment = module.exports._addEnrollment;
        if (!addEnrollment) {
          try { addEnrollment = require('./academy/store').addEnrollment; } catch {}
        }
        const handled = await academyBilling.handleCheckoutCompleted(session, db, writeDb, addEnrollment);
        if (handled) return { academy: true };
      } catch (e) {
        console.error('[billing] academy checkout:', e.message);
      }
    }
  }
  const email = ((session.metadata && session.metadata.email) || session.customer_email || session.client_reference_id || '').toLowerCase();
  const plan = resolvePlanId((session.metadata && session.metadata.plan) || 'users_5');
  if (!email) return { skipped: true };
  if (session.subscription && plan === recipeAiAccess().ADDON_ID) {
    recipeAiAccess().activateKitelineAddon(db, email, { subscriptionId: session.subscription });
    ensureStore(db);
    db.subscriptions[email] = Object.assign({}, db.subscriptions[email] || {}, {
      email,
      recipeAiActive: true,
      stripeCustomerId: session.customer,
      recipeAiStripeSubscriptionId: session.subscription,
      updatedAt: new Date().toISOString(),
    });
    writeDb(db);
    return { recipeAi: true, email };
  }
  if (email && session.subscription) {
    let subObj = {
      plan,
      orgPlan: (PLANS[plan] || PLANS.users_5).orgPlan,
      maxUsers: (PLANS[plan] || PLANS.users_5).maxUsers,
      maxSites: (PLANS[plan] || PLANS.users_5).maxSites,
      status: 'active',
      source: 'stripe',
      stripeCustomerId: session.customer,
      stripeSubscriptionId: session.subscription,
    };
    try {
      const sub = await fetchStripeSubscription(session.subscription);
      subObj = subscriptionFromStripe(sub, plan);
    } catch (e) {
      console.error('[billing] subscription fetch:', e.message);
    }
    applySubscription(db, email, subObj);
    writeDb(db);
    console.log('[billing] Subscribed:', email, subObj.plan, subObj.maxUsers + ' users');
    return { email, plan: subObj.plan };
  }
  return { skipped: true };
}

async function handleWebhook(rawBody, sigHeader, db, writeDb) {
  if (!verifyWebhookSignature(rawBody, sigHeader)) {
    return { ok: false, error: 'Invalid webhook signature' };
  }
  let event;
  try { event = JSON.parse(rawBody); } catch { return { ok: false, error: 'Invalid JSON' }; }
  if (seenEvent(db, event.id)) return { ok: true, type: event.type, duplicate: true };

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const extra = await activateFromCheckoutSession(session, db, writeDb);
    return Object.assign({ ok: true, type: event.type }, extra);
  }

  if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
    const sub = event.data.object;
    let email = ((sub.metadata && sub.metadata.email) || '').toLowerCase();
    if (!email) email = findEmailByCustomer(db, sub.customer) || '';
    const metaPlan = sub.metadata && sub.metadata.plan;
    if (email && metaPlan === recipeAiAccess().ADDON_ID) {
      if (sub.status === 'active' || sub.status === 'trialing') {
        recipeAiAccess().activateKitelineAddon(db, email, { subscriptionId: sub.id });
      } else {
        recipeAiAccess().deactivateKitelineAddon(db, email);
      }
      writeDb(db);
      return { ok: true, type: event.type, recipeAi: true };
    }
    const plan = resolvePlanId(
      (sub.metadata && sub.metadata.plan) ||
      (email && getSubscription(db, email) && getSubscription(db, email).plan) ||
      'users_5'
    );
    if (email) {
      applySubscription(db, email, subscriptionFromStripe(sub, plan));
      writeDb(db);
    }
    return { ok: true, type: event.type, email: email || null };
  }

  if (event.type === 'invoice.paid' || event.type === 'invoice.payment_failed' || event.type === 'invoice.payment_action_required') {
    const inv = event.data.object;
    const email = findEmailByCustomer(db, inv.customer) || ((inv.customer_email || '') + '').toLowerCase();
    const status = event.type === 'invoice.paid' ? 'paid' : event.type === 'invoice.payment_failed' ? 'open' : 'action_required';
    recordInvoice(db, {
      stripeInvoiceId: inv.id,
      email: email || null,
      tenantId: email ? tenantIdForUser(db, email) : null,
      amountPence: inv.amount_paid || inv.amount_due || 0,
      currency: inv.currency || 'gbp',
      status,
      hostedInvoiceUrl: inv.hosted_invoice_url || null,
      periodStart: inv.period_start ? new Date(inv.period_start * 1000).toISOString() : null,
      periodEnd: inv.period_end ? new Date(inv.period_end * 1000).toISOString() : null,
      source: 'stripe',
    });
    if (email && event.type === 'invoice.payment_failed') {
      const existing = getSubscription(db, email) || {};
      applySubscription(db, email, {
        status: 'past_due',
        pastDueSince: existing.pastDueSince || new Date().toISOString(),
        stripeCustomerId: existing.stripeCustomerId || inv.customer,
      });
    }
    if (email && event.type === 'invoice.paid') {
      const existing = getSubscription(db, email) || {};
      applySubscription(db, email, {
        status: existing.status === 'canceled' ? 'active' : (existing.status || 'active'),
        pastDueSince: null,
        stripeCustomerId: existing.stripeCustomerId || inv.customer,
      });
    }
    writeDb(db);
    return { ok: true, type: event.type, email: email || null };
  }

  return { ok: true, type: event.type, ignored: true };
}

function grantPlan(db, { email, plan, months, source, note }) {
  const em = (email || '').toLowerCase().trim();
  if (!em) throw new Error('Email required');
  const p = planById(plan) || PLANS.users_5;
  const periodMonths = Math.max(1, Number(months) || 1);
  const periodEnd = new Date(Date.now() + periodMonths * 30 * 86400000).toISOString();
  const sub = applySubscription(db, em, {
    plan: p.id,
    orgPlan: p.orgPlan,
    maxUsers: p.maxUsers,
    maxSites: p.maxSites,
    status: 'active',
    source: source || 'invoice',
    currentPeriodEnd: periodEnd,
    note: note || null,
  });
  recordInvoice(db, {
    email: em,
    tenantId: tenantIdForUser(db, em),
    amountPence: p.amount * periodMonths,
    currency: 'gbp',
    status: 'paid',
    periodStart: new Date().toISOString(),
    periodEnd,
    source: source || 'invoice',
    note: note || 'Manual grant',
  });
  return sub;
}

function revokePlan(db, { email, reason }) {
  const em = (email || '').toLowerCase().trim();
  if (!em) throw new Error('Email required');
  const existing = db.subscriptions && db.subscriptions[em];
  if (!existing) throw new Error('No subscription for that email');
  applySubscription(db, em, {
    status: 'canceled',
    canceledAt: new Date().toISOString(),
    cancelReason: reason || 'revoked',
  });
  const org = orgForUser(db, em);
  if (org) {
    org.plan = 'Demo / trial';
    delete org.maxUsers;
    delete org.maxSites;
  }
  return db.subscriptions[em];
}

async function retrieveCheckoutSession(sessionId) {
  if (!sessionId) throw new Error('session_id required');
  return stripeGet('/checkout/sessions/' + sessionId);
}

function completeDevCheckout(db, writeDb, sessionId) {
  if (!isDevMode()) throw new Error('Dev checkout is disabled');
  const session = devStore.sessions[sessionId];
  if (!session) throw new Error('Unknown checkout session');
  session.status = 'complete';
  session.payment_status = 'paid';
  const event = {
    id: 'evt_dev_' + sessionId,
    type: 'checkout.session.completed',
    data: { object: session },
  };
  const raw = JSON.stringify(event);
  const sig = webhookSecret() ? signWebhook(raw, webhookSecret()) : 'dev';
  return handleWebhook(raw, sig, db, writeDb);
}

function publicConfig() {
  return {
    enabled: isConfigured(),
    devMode: isDevMode(),
    trialDays: TRIAL_DAYS,
    trialMaxUsers: TRIAL_MAX_USERS,
    vatCharged: false,
    currency: 'gbp',
    plans: planCatalog(),
  };
}

function statusPayload(db, email, extras) {
  const sub = getSubscription(db, email);
  const kitchen = tenantsApi().getStateForUser(db, email);
  const teamCount = (kitchen && kitchen.team && kitchen.team.length) || 0;
  const siteCount = (kitchen && kitchen.sites && kitchen.sites.length) || 0;
  return Object.assign({
    enabled: isConfigured(),
    devMode: isDevMode(),
    plans: planCatalog(),
    teamCount,
    siteCount,
    maxUsers: getUserLimit(db, email),
    maxSites: getSiteLimit(db, email),
    trial: getTrialStatus(db, email),
    trialDays: TRIAL_DAYS,
    subscription: sub || { status: 'none', plan: null },
    invoices: invoicesForEmail(db, email).slice(0, 24),
    access: canAccess(db, email),
  }, extras || {});
}

async function tryHandlePublic({ route, method, body, query, db, writeDb }) {
  if (route === '/billing/config' && method === 'GET') {
    return { status: 200, body: publicConfig() };
  }
  if (route === '/billing/checkout' && method === 'POST') {
    if (!isConfigured()) {
      return { status: 503, body: { error: 'Online checkout not configured yet — email contact@kiteline.uk for an invoice.' } };
    }
    try {
      const email = (body.email || '').toLowerCase().trim();
      const user = db.users && db.users[email];
      const result = await createCheckout({ plan: body.plan, email, interval: body.interval, user });
      return { status: 200, body: result };
    } catch (e) {
      return { status: 400, body: { error: e.message || 'Checkout failed' } };
    }
  }
  if (route === '/billing/session' && method === 'GET') {
    try {
      const session = await retrieveCheckoutSession((query && query.session_id) || (body && body.session_id));
      return { status: 200, body: { id: session.id, status: session.status, payment_status: session.payment_status, plan: session.metadata && session.metadata.plan } };
    } catch (e) {
      return { status: 400, body: { error: e.message || 'Session lookup failed' } };
    }
  }
  if (route === '/billing/dev/pay' && method === 'GET' && isDevMode()) {
    try {
      const sessionId = (query && query.session_id) || '';
      const result = await completeDevCheckout(db, writeDb, sessionId);
      const session = devStore.sessions[sessionId];
      const dest = (session && session.success_url || appBaseUrl() + '/billing-success.html').replace('{CHECKOUT_SESSION_ID}', sessionId);
      return { status: 302, body: result, redirect: dest };
    } catch (e) {
      return { status: 400, body: { error: e.message || 'Dev pay failed' } };
    }
  }
  if (route === '/billing/dev/complete' && method === 'POST' && isDevMode()) {
    try {
      const result = await completeDevCheckout(db, writeDb, body.session_id);
      return { status: 200, body: result };
    } catch (e) {
      return { status: 400, body: { error: e.message || 'Dev complete failed' } };
    }
  }
  return null;
}

async function tryHandleAuth({ route, method, body, me, db, writeDb }) {
  if (route === '/billing/status' && method === 'GET') {
    ensureTrial(me);
    syncOrgAccess(db, me.email);
    writeDb(db);
    return { status: 200, body: statusPayload(db, me.email, { owner: isOwner(me.email) }) };
  }
  if (route === '/billing/portal' && method === 'POST') {
    if (!isConfigured()) return { status: 503, body: { error: 'Billing not configured' } };
    try {
      const result = await createPortalSession(me.email, db);
      return { status: 200, body: result };
    } catch (e) {
      return { status: 400, body: { error: e.message || 'Portal failed' } };
    }
  }
  if (route === '/billing/invoices' && method === 'GET') {
    return { status: 200, body: { invoices: invoicesForEmail(db, me.email) } };
  }
  if (route === '/billing/admin/customers' && method === 'GET') {
    if (!isOwner(me.email)) return { status: 403, body: { error: 'Owner only' } };
    return { status: 200, body: { customers: listCustomers(db), invoices: (db.invoices || []).slice(0, 100) } };
  }
  if (route === '/billing/admin/grant' && method === 'POST') {
    if (!isOwner(me.email)) return { status: 403, body: { error: 'Owner only' } };
    try {
      const sub = grantPlan(db, body);
      writeDb(db);
      return { status: 200, body: { ok: true, subscription: sub } };
    } catch (e) {
      return { status: 400, body: { error: e.message || 'Grant failed' } };
    }
  }
  if (route === '/billing/admin/revoke' && method === 'POST') {
    if (!isOwner(me.email)) return { status: 403, body: { error: 'Owner only' } };
    try {
      const sub = revokePlan(db, body);
      writeDb(db);
      return { status: 200, body: { ok: true, subscription: sub } };
    } catch (e) {
      return { status: 400, body: { error: e.message || 'Revoke failed' } };
    }
  }
  return null;
}

module.exports = {
  PLANS,
  PLAN_ALIASES,
  TRIAL_DAYS,
  TRIAL_MAX_USERS,
  PAST_DUE_GRACE_DAYS,
  DEV_KEY,
  resolvePlanId,
  isConfigured,
  isDevMode,
  isOwner,
  planCatalog,
  planById,
  publicConfig,
  createCheckout,
  createRecipeAiCheckout,
  createPortalSession,
  getSubscription,
  getUserLimit,
  getSiteLimit,
  ensureTrial,
  startTrial,
  getTrialInfo,
  getTrialStatus,
  canAccess,
  syncOrgAccess,
  hasActiveSubscription,
  handleWebhook,
  verifyWebhookSignature,
  signWebhook,
  grantPlan,
  revokePlan,
  recordInvoice,
  invoicesForEmail,
  listCustomers,
  retrieveCheckoutSession,
  completeDevCheckout,
  tryHandlePublic,
  tryHandleAuth,
  statusPayload,
  appBaseUrl,
  stripeRequest,
  _devStore: devStore,
};
