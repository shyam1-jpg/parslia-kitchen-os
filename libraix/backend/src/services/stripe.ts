import Stripe from "stripe";
import { db } from "../db/schema.js";

const stripeKey = process.env.STRIPE_SECRET_KEY;

export function getStripe(): Stripe | null {
  if (!stripeKey) return null;
  return new Stripe(stripeKey);
}

export async function createCheckoutSession(userId: string, email: string, plan: "pro" | "enterprise") {
  const stripe = getStripe();
  if (!stripe) {
    return { url: null, devMode: true, message: "Stripe not configured — set STRIPE_SECRET_KEY on server" };
  }

  const priceMap = { pro: process.env.STRIPE_PRO_PRICE_ID, enterprise: process.env.STRIPE_ENTERPRISE_PRICE_ID };
  const priceId = priceMap[plan];
  if (!priceId) throw new Error("STRIPE_PRICE_NOT_CONFIGURED");

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: email,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.FRONTEND_URL}/account?upgraded=1`,
    cancel_url: `${process.env.FRONTEND_URL}/pricing?cancelled=1`,
    metadata: { userId, plan },
  });

  return { url: session.url, devMode: false };
}

export function handleWebhookEvent(payload: Buffer, signature: string) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) throw new Error("STRIPE_NOT_CONFIGURED");

  const event = stripe.webhooks.constructEvent(payload, signature, secret);

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;
    const plan = session.metadata?.plan ?? "pro";
    if (userId) {
      db.prepare("UPDATE users SET plan = ?, updated_at = datetime('now') WHERE id = ?").run(plan, userId);
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;
    const userId = sub.metadata?.userId;
    if (userId) {
      db.prepare("UPDATE users SET plan = 'free', updated_at = datetime('now') WHERE id = ?").run(userId);
    }
  }

  return event.type;
}
