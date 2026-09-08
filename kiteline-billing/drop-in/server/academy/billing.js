'use strict';

/**
 * Kiteline Academy payments — one-time course checkout + monthly Starter/Pro subscriptions.
 * Drop-in replacement for kitline1/server/academy/billing.js
 */

function loadBilling() {
  try { return require('../billing'); } catch {}
  return require('./billing');
}

const billing = loadBilling();

const ACADEMY_PLANS = {
  academy_starter: {
    id: 'academy_starter',
    name: 'Kiteline Academy Starter',
    description: 'Beginner courses, progress tracking, email support',
    amount: 999,
    currency: 'gbp',
    interval: 'month',
  },
  academy_pro: {
    id: 'academy_pro',
    name: 'Kiteline Academy Pro Student',
    description: 'All courses, Code Lab, certificates, priority support',
    amount: 1999,
    currency: 'gbp',
    interval: 'month',
  },
};

const PLAN_ALIASES = {
  starter: 'academy_starter',
  'starter — £9.99/month': 'academy_starter',
  pro: 'academy_pro',
  'pro student': 'academy_pro',
  'pro student — £19.99/month': 'academy_pro',
};

function stripeKey() {
  return process.env.STRIPE_SECRET_KEY || '';
}

function isConfigured() {
  return billing.isConfigured();
}

function resolveAcademyPlan(titleOrId) {
  const raw = String(titleOrId || '').trim();
  const key = PLAN_ALIASES[raw.toLowerCase()] || raw;
  return ACADEMY_PLANS[key] || null;
}

async function stripeRequest(path, params) {
  return billing.stripeRequest(path, params);
}

async function createCourseCheckout({ email, courseTitle, amountPence, baseUrl }) {
  if (!isConfigured()) {
    throw new Error('Online payment not configured — email contact@kiteline.uk');
  }
  const plan = resolveAcademyPlan(courseTitle);
  if (plan) {
    return createPlanCheckout({ email, planId: plan.id, baseUrl });
  }
  const amount = Math.max(100, Number(amountPence) || 0);
  const base = (baseUrl || billing.appBaseUrl()).replace(/\/$/, '');
  const session = await stripeRequest('/checkout/sessions', {
    mode: 'payment',
    'line_items[0][price_data][currency]': 'gbp',
    'line_items[0][price_data][product_data][name]': courseTitle,
    'line_items[0][price_data][unit_amount]': String(amount),
    'line_items[0][quantity]': '1',
    customer_email: email,
    client_reference_id: email,
    'metadata[type]': 'academy_course',
    'metadata[product]': 'academy',
    'metadata[email]': email,
    'metadata[courseTitle]': courseTitle,
    'metadata[amountPence]': String(amount),
    success_url: base + '/academy/?checkout=success&session_id={CHECKOUT_SESSION_ID}',
    cancel_url: base + '/academy/?checkout=cancel',
  });
  return { url: session.url, sessionId: session.id, mode: 'payment' };
}

async function createPlanCheckout({ email, planId, baseUrl }) {
  if (!isConfigured()) {
    throw new Error('Online payment not configured — email contact@kiteline.uk');
  }
  const plan = ACADEMY_PLANS[planId] || resolveAcademyPlan(planId);
  if (!plan) throw new Error('Unknown Academy plan');
  const em = (email || '').toLowerCase().trim();
  const base = (baseUrl || billing.appBaseUrl()).replace(/\/$/, '');
  const envPrice = plan.id === 'academy_starter'
    ? process.env.STRIPE_PRICE_ACADEMY_STARTER
    : process.env.STRIPE_PRICE_ACADEMY_PRO;
  const params = {
    mode: 'subscription',
    customer_email: em,
    client_reference_id: em,
    allow_promotion_codes: 'true',
    'metadata[type]': 'academy_plan',
    'metadata[product]': 'academy',
    'metadata[email]': em,
    'metadata[plan]': plan.id,
    'subscription_data[metadata][type]': 'academy_plan',
    'subscription_data[metadata][product]': 'academy',
    'subscription_data[metadata][email]': em,
    'subscription_data[metadata][plan]': plan.id,
    success_url: base + '/academy/?checkout=success&session_id={CHECKOUT_SESSION_ID}',
    cancel_url: base + '/academy/?checkout=cancel',
  };
  if (envPrice) {
    params['line_items[0][price]'] = envPrice;
    params['line_items[0][quantity]'] = '1';
  } else {
    params['line_items[0][quantity]'] = '1';
    params['line_items[0][price_data][currency]'] = plan.currency;
    params['line_items[0][price_data][unit_amount]'] = String(plan.amount);
    params['line_items[0][price_data][recurring][interval]'] = plan.interval;
    params['line_items[0][price_data][product_data][name]'] = plan.name;
    params['line_items[0][price_data][product_data][description]'] = plan.description;
  }
  const session = await stripeRequest('/checkout/sessions', params);
  return { url: session.url, sessionId: session.id, mode: 'subscription', plan: plan.id };
}

function ensureAcademySubs(db) {
  if (!db.academySubscriptions) db.academySubscriptions = {};
}

async function handleCheckoutCompleted(session, db, writeDb, addEnrollment) {
  const meta = session.metadata || {};
  const email = (meta.email || session.customer_email || session.client_reference_id || '').toLowerCase();
  if (!email) return false;

  if (meta.type === 'academy_plan' || meta.product === 'academy' && ACADEMY_PLANS[meta.plan]) {
    ensureAcademySubs(db);
    db.academySubscriptions[email] = {
      email,
      plan: meta.plan,
      status: 'active',
      stripeCustomerId: session.customer,
      stripeSubscriptionId: session.subscription || null,
      updatedAt: new Date().toISOString(),
    };
    writeDb(db);
    console.log('[academy-billing] Subscribed:', email, meta.plan);
    return true;
  }

  if (meta.type !== 'academy_course') return false;
  const courseTitle = meta.courseTitle || 'Kiteline Academy course';
  const amountPence = Number(meta.amountPence || session.amount_total || 0);
  if (typeof addEnrollment === 'function') {
    await addEnrollment(db, {
      email,
      courseTitle,
      amountPence,
      paid: true,
      stripeSessionId: session.id,
    });
  } else {
    db.academyEnrollments = db.academyEnrollments || [];
    db.academyEnrollments.push({
      email,
      courseTitle,
      amountPence,
      paid: true,
      stripeSessionId: session.id,
      at: new Date().toISOString(),
    });
  }
  writeDb(db);
  console.log('[academy-billing] Enrolled:', email, courseTitle);
  return true;
}

function getAcademySubscription(db, email) {
  ensureAcademySubs(db);
  return db.academySubscriptions[(email || '').toLowerCase().trim()] || null;
}

module.exports = {
  ACADEMY_PLANS,
  isConfigured,
  createCourseCheckout,
  createPlanCheckout,
  handleCheckoutCompleted,
  getAcademySubscription,
  resolveAcademyPlan,
  stripeKey,
};
