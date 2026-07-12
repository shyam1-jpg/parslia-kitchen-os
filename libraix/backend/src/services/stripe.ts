import Stripe from "stripe";
import { db } from "../db/schema.js";
import { findUserById, getStripeCustomerId, setStripeCustomer, updateUserPlan } from "./users.js";
import type { PlanTier } from "../config/models.js";

const stripeKey = process.env.STRIPE_SECRET_KEY;

export function getStripe(): Stripe | null {
  if (!stripeKey) return null;
  return new Stripe(stripeKey);
}

export function isStripeCheckoutConfigured(): boolean {
  return Boolean(stripeKey && process.env.STRIPE_PRO_PRICE_ID);
}

export async function createCheckoutSession(userId: string, email: string, plan: "pro" | "enterprise") {
  const stripe = getStripe();
  if (!stripe) {
    return { url: null, devMode: true, message: "Stripe not configured — set STRIPE_SECRET_KEY on server" };
  }

  const priceMap = { pro: process.env.STRIPE_PRO_PRICE_ID, enterprise: process.env.STRIPE_ENTERPRISE_PRICE_ID };
  const priceId = priceMap[plan];
  if (!priceId) {
    return {
      url: null,
      devMode: true,
      message: `Stripe price not configured — set STRIPE_${plan.toUpperCase()}_PRICE_ID on server`,
    };
  }

  const existingCustomerId = getStripeCustomerId(userId);

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: existingCustomerId ?? undefined,
    customer_email: existingCustomerId ? undefined : email,
    client_reference_id: userId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.FRONTEND_URL}/account?upgraded=1`,
    cancel_url: `${process.env.FRONTEND_URL}/pricing?cancelled=1`,
    metadata: { userId, plan },
    subscription_data: { metadata: { userId, plan } },
  });

  return { url: session.url, devMode: false };
}

export async function createBillingPortalSession(userId: string) {
  const stripe = getStripe();
  if (!stripe) throw new Error("STRIPE_NOT_CONFIGURED");

  let customerId = getStripeCustomerId(userId);
  if (!customerId) {
    const row = findUserById(userId);
    if (!row) throw new Error("USER_NOT_FOUND");
    const customer = await stripe.customers.create({ email: row.email, metadata: { userId } });
    customerId = customer.id;
    setStripeCustomer(userId, customerId);
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${process.env.FRONTEND_URL}/account`,
  });

  return { url: session.url };
}

function planFromMetadata(metadata: Stripe.Metadata | null | undefined): PlanTier {
  const plan = metadata?.plan;
  if (plan === "enterprise") return "enterprise";
  if (plan === "pro") return "pro";
  return "free";
}

export function handleWebhookEvent(payload: Buffer, signature: string) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) throw new Error("STRIPE_NOT_CONFIGURED");

  const event = stripe.webhooks.constructEvent(payload, signature, secret);

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId ?? session.client_reference_id;
    const plan = planFromMetadata(session.metadata);
    const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
    const subscriptionId =
      typeof session.subscription === "string" ? session.subscription : session.subscription?.id;

    if (userId && customerId) {
      setStripeCustomer(userId, customerId, subscriptionId ?? undefined);
      if (plan !== "free") updateUserPlan(userId, plan);
    }
  }

  if (event.type === "customer.subscription.updated") {
    const sub = event.data.object as Stripe.Subscription;
    const userId = sub.metadata?.userId;
    if (userId) {
      if (sub.status === "active" || sub.status === "trialing") {
        updateUserPlan(userId, planFromMetadata(sub.metadata));
      } else if (sub.status === "canceled" || sub.status === "unpaid") {
        updateUserPlan(userId, "free");
      }
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;
    const userId = sub.metadata?.userId;
    if (userId) {
      updateUserPlan(userId, "free");
      db.prepare("UPDATE users SET stripe_subscription_id = NULL, updated_at = datetime('now') WHERE id = ?").run(
        userId
      );
    }
  }

  return event.type;
}

export function getBillingStatus(userId: string) {
  const row = findUserById(userId);
  if (!row) return null;
  return {
    plan: row.plan,
    stripeConfigured: isStripeCheckoutConfigured(),
    hasStripeCustomer: Boolean(row.stripe_customer_id),
    canManageBilling: Boolean(getStripe() && row.stripe_customer_id),
  };
}
