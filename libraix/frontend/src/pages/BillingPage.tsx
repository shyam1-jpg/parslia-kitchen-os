import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { PublicNav, Footer } from "../components/Layout";
import { useAuth } from "../lib/auth";
import { billingApi } from "../lib/api";
import { friendlyError } from "../lib/errors";

export function BillingPage() {
  const { user, usage, refresh } = useAuth();
  const [searchParams] = useSearchParams();
  const [billingLoading, setBillingLoading] = useState(false);
  const [canManage, setCanManage] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (searchParams.get("upgraded") === "1") {
      setNotice("Welcome to Pro! Your plan will update shortly after payment confirms.");
      refresh().catch(() => {});
    }
    if (searchParams.get("cancelled") === "1") {
      setNotice("Checkout was cancelled. You can upgrade anytime.");
    }
  }, [searchParams, refresh]);

  useEffect(() => {
    billingApi.status().then((s) => setCanManage(s.canManageBilling)).catch(() => {});
  }, [user?.plan]);

  const startCheckout = async () => {
    setBillingLoading(true);
    try {
      const result = await billingApi.checkout("pro");
      if (result.url) window.location.href = result.url;
      else setNotice(result.message ?? "Checkout not configured.");
    } catch (e) {
      setNotice(friendlyError(e instanceof Error ? e.message : "FAILED", "Checkout failed"));
    } finally {
      setBillingLoading(false);
    }
  };

  const openPortal = async () => {
    setBillingLoading(true);
    try {
      const result = await billingApi.portal();
      if (result.url) window.location.href = result.url;
    } catch (e) {
      setNotice(friendlyError(e instanceof Error ? e.message : "FAILED", "Could not open billing portal"));
    } finally {
      setBillingLoading(false);
    }
  };

  return (
    <div className="page-container">
      <PublicNav />
      <section className="section" style={{ maxWidth: 640 }}>
        <div className="section-label">Billing</div>
        <h1 className="section-title">Subscription & invoices</h1>

        {notice && <div className="info-banner" style={{ marginBottom: 16 }}>{notice}</div>}

        <div className="account-grid">
          <div className="account-card">
            <h3>Current plan</h3>
            <div className="value" style={{ textTransform: "capitalize" }}>{user?.plan}</div>
          </div>
          <div className="account-card">
            <h3>Usage today</h3>
            <div className="value">{usage?.messagesUsed ?? 0} / {usage?.messagesLimit ?? 0} messages</div>
          </div>
        </div>

        <div style={{ marginTop: 32, display: "flex", gap: 12, flexWrap: "wrap" }}>
          {user?.plan === "free" ? (
            <button className="btn btn-primary" disabled={billingLoading} onClick={startCheckout}>
              {billingLoading ? "Please wait…" : "Upgrade to Pro — £9/mo"}
            </button>
          ) : canManage ? (
            <button className="btn btn-primary" disabled={billingLoading} onClick={openPortal}>
              {billingLoading ? "Please wait…" : "Manage subscription & invoices"}
            </button>
          ) : null}
          <Link to="/app" className="btn btn-ghost">Back to workspace</Link>
          <Link to="/app/settings" className="btn btn-ghost">Settings</Link>
        </div>

        <p style={{ fontSize: 13, color: "var(--dim)", marginTop: 24 }}>
          Invoices and payment history are managed through Stripe Customer Portal when configured.
        </p>
      </section>
      <Footer />
    </div>
  );
}
