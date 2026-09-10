import { useState, type FormEvent, type ReactNode } from "react";
import { COMPANY } from "../lib/company";

export type ReportReason = "harmful" | "offensive" | "wrong" | "other";

const REASON_LABELS: Record<ReportReason, string> = {
  harmful: "Harmful",
  offensive: "Offensive",
  wrong: "Wrong or misleading",
  other: "Other",
};

const CONFIRMATION =
  "Thank you. Your report has been submitted. We will review the AI-generated content.";

function buildMailto(feature: string, reason: ReportReason, details: string, email: string, excerpt: string) {
  const subject = `Report an Issue — AI-generated content (${REASON_LABELS[reason]})`;
  const body =
    `I am reporting inappropriate AI-generated content in Libraix.\n\n` +
    `Feature: ${feature}\n` +
    `Reason: ${REASON_LABELS[reason]}\n` +
    `Reporter email: ${email || "not provided"}\n` +
    `Page: ${typeof window !== "undefined" ? window.location.href : ""}\n\n` +
    `Description:\n${details}\n` +
    (excerpt ? `\nReported output (excerpt):\n${excerpt}\n` : "");
  return `mailto:${COMPANY.supportEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

async function submitReport(payload: {
  feature: string;
  reason: ReportReason;
  details: string;
  email: string;
  excerpt: string;
}) {
  const subject = `Report an Issue — AI-generated content (${REASON_LABELS[payload.reason]})`;
  const body =
    `${payload.details}\n\nFeature: ${payload.feature}\n` +
    (payload.excerpt ? `Output excerpt:\n${payload.excerpt}` : "");
  try {
    const res = await fetch("/api/support", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: payload.email || COMPANY.supportEmail,
        subject,
        body,
      }),
    });
    if (res.ok) return "api";
  } catch {
    /* fall through to mailto */
  }
  window.location.href = buildMailto(
    payload.feature,
    payload.reason,
    payload.details,
    payload.email,
    payload.excerpt
  );
  return "mailto";
}

export function ReportAiContentDialog({
  open,
  onClose,
  feature = "Chat",
  excerpt = "",
  defaultEmail = "",
}: {
  open: boolean;
  onClose: () => void;
  feature?: string;
  excerpt?: string;
  defaultEmail?: string;
}) {
  const [reason, setReason] = useState<ReportReason | "">("");
  const [details, setDetails] = useState("");
  const [email, setEmail] = useState(defaultEmail);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setMsg("");
    if (!reason) {
      setError("Please choose a reason for this report.");
      return;
    }
    if (!details.trim()) {
      setError("Please describe the AI-generated content you are reporting.");
      return;
    }
    setLoading(true);
    try {
      await submitReport({
        feature,
        reason,
        details: details.trim(),
        email: email.trim(),
        excerpt: excerpt.slice(0, 1500),
      });
      setMsg(CONFIRMATION);
      setDetails("");
      setReason("");
    } catch {
      setError(`Could not send your report. Email ${COMPANY.supportEmail} directly.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="report-ai-modal" role="dialog" aria-modal="true" aria-labelledby="report-ai-title">
      <button type="button" className="report-ai-backdrop" aria-label="Close report form" onClick={onClose} />
      <div className="report-ai-card">
        <button type="button" className="report-ai-close" onClick={onClose} aria-label="Close">&times;</button>
        <h2 id="report-ai-title">Report an Issue</h2>
        <p className="report-ai-lead">
          Report inappropriate AI-generated content so we can review it.
        </p>
        {msg && <div className="info-banner">{msg}</div>}
        {error && <div className="error-banner">{error}</div>}
        <form onSubmit={onSubmit} className="report-ai-form">
          <label>
            Which AI feature?
            <input className="input" value={feature} readOnly />
          </label>
          <label>
            Why are you reporting this?
            <select
              className="input"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value as ReportReason | "")}
            >
              <option value="">Select a reason</option>
              <option value="harmful">Harmful</option>
              <option value="offensive">Offensive</option>
              <option value="wrong">Wrong or misleading</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label>
            Describe the AI-generated content
            <textarea
              className="input"
              rows={5}
              required
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="What did the AI produce, and why is it inappropriate?"
            />
          </label>
          <label>
            Your email (optional)
            <input
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Sending…" : "Submit report"}
          </button>
        </form>
      </div>
    </div>
  );
}

export function ReportAiContentButton({
  feature = "Chat",
  excerpt = "",
  className = "msg-action",
  children = "Report an Issue",
}: {
  feature?: string;
  excerpt?: string;
  className?: string;
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        {children}
      </button>
      <ReportAiContentDialog
        open={open}
        onClose={() => setOpen(false)}
        feature={feature}
        excerpt={excerpt}
      />
    </>
  );
}

export function ReportAiContentFab({ feature = "Other AI output" }: { feature?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className="report-ai-fab"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
      >
        Report an Issue
      </button>
      <ReportAiContentDialog open={open} onClose={() => setOpen(false)} feature={feature} />
    </>
  );
}
