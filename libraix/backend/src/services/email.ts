import nodemailer from "nodemailer";

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

function emailFrom(): string {
  return process.env.EMAIL_FROM ?? "Libraix <noreply@libraix.ai>";
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY || process.env.SMTP_HOST);
}

async function sendViaResend(options: SendEmailOptions): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: emailFrom(),
      to: [options.to],
      subject: options.subject,
      html: options.html,
      text: options.text,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("Resend email failed:", err.slice(0, 300));
    return false;
  }
  return true;
}

async function sendViaSmtp(options: SendEmailOptions): Promise<boolean> {
  const host = process.env.SMTP_HOST;
  if (!host) return false;

  const port = Number(process.env.SMTP_PORT ?? 587);
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS ?? "" }
      : undefined,
  });

  await transporter.sendMail({
    from: emailFrom(),
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
  });
  return true;
}

export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  if (await sendViaResend(options)) return true;
  if (await sendViaSmtp(options)) return true;
  return false;
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<boolean> {
  const subject = "Reset your Libraix password";
  const text = `Reset your Libraix password\n\nOpen this link (expires in 1 hour):\n${resetUrl}\n\nIf you did not request this, ignore this email.`;
  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <h2 style="color:#6366f1">Libraix</h2>
      <p>We received a request to reset your password.</p>
      <p><a href="${resetUrl}" style="display:inline-block;padding:12px 20px;background:#6366f1;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">Reset password</a></p>
      <p style="color:#64748b;font-size:13px">This link expires in 1 hour. If you did not request a reset, you can ignore this email.</p>
    </div>
  `;

  return sendEmail({ to, subject, html, text });
}
