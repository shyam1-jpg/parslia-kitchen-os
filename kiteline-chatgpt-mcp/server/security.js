'use strict';

const crypto = require('crypto');

const COMMON_PASSWORDS = new Set([
  'password', 'password1', 'password123', '12345678', '123456789', 'qwerty123',
  'kiteline', 'shyam', 'admin123', 'letmein', 'welcome1', 'changeme', 'demo1234',
]);

const RATE_WINDOWS = {
  login: { limit: 8, windowMs: 15 * 60 * 1000 },
  register: { limit: 5, windowMs: 60 * 60 * 1000 },
  forgot: { limit: 5, windowMs: 60 * 60 * 1000 },
  resend: { limit: 5, windowMs: 60 * 60 * 1000 },
  verify: { limit: 10, windowMs: 60 * 60 * 1000 },
  'recipe-ai': { limit: 30, windowMs: 60 * 60 * 1000 },
};

const rateBuckets = new Map();

function clientIp(req) {
  const xf = req.headers['x-forwarded-for'];
  if (xf) return String(xf).split(',')[0].trim();
  return req.socket.remoteAddress || 'unknown';
}

function checkRateLimit(req, bucket) {
  const cfg = RATE_WINDOWS[bucket] || { limit: 30, windowMs: 60000 };
  const ip = clientIp(req);
  const key = bucket + ':' + ip;
  const now = Date.now();
  let hits = rateBuckets.get(key) || [];
  hits = hits.filter((t) => now - t < cfg.windowMs);
  if (hits.length >= cfg.limit) {
    const retrySec = Math.ceil((hits[0] + cfg.windowMs - now) / 1000);
    return { ok: false, retryAfter: retrySec };
  }
  hits.push(now);
  rateBuckets.set(key, hits);
  return { ok: true };
}

function validatePassword(password, email) {
  const pw = String(password || '');
  if (pw.length < 10) return { ok: false, error: 'Password must be at least 10 characters' };
  if (pw.length > 128) return { ok: false, error: 'Password is too long' };
  if (!/[a-zA-Z]/.test(pw)) return { ok: false, error: 'Password must include at least one letter' };
  if (!/[0-9]/.test(pw)) return { ok: false, error: 'Password must include at least one number' };
  const lower = pw.toLowerCase();
  if (COMMON_PASSWORDS.has(lower)) return { ok: false, error: 'That password is too common — choose a stronger one' };
  const em = (email || '').toLowerCase().split('@')[0];
  if (em && em.length > 2 && lower.includes(em)) return { ok: false, error: 'Password must not contain your email name' };
  return { ok: true };
}

function passwordScore(password) {
  const pw = String(password || '');
  let score = 0;
  if (pw.length >= 10) score += 1;
  if (pw.length >= 14) score += 1;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score += 1;
  if (/[0-9]/.test(pw)) score += 1;
  if (/[^a-zA-Z0-9]/.test(pw)) score += 1;
  return score; // 0-5
}

const MAX_FAILED = Number(process.env.MAX_LOGIN_ATTEMPTS || 5);
const LOCKOUT_MS = Number(process.env.LOCKOUT_MINUTES || 15) * 60 * 1000;

function isLocked(user) {
  if (!user || !user.lockUntil) return false;
  if (Date.now() < user.lockUntil) return true;
  delete user.lockUntil;
  user.failedAttempts = 0;
  return false;
}

function recordFailedLogin(user) {
  if (!user) return;
  user.failedAttempts = (user.failedAttempts || 0) + 1;
  if (user.failedAttempts >= MAX_FAILED) {
    user.lockUntil = Date.now() + LOCKOUT_MS;
  }
}

function clearLoginFailures(user) {
  if (!user) return;
  user.failedAttempts = 0;
  delete user.lockUntil;
}

function sessionDays() {
  return Number(process.env.SESSION_DAYS || 14);
}

function issueToken(db, email) {
  const token = crypto.randomBytes(32).toString('hex');
  const days = sessionDays();
  db.tokens[token] = {
    email: email.toLowerCase(),
    createdAt: Date.now(),
    expiresAt: Date.now() + days * 86400000,
    lastUsed: Date.now(),
  };
  return token;
}

function tokenEmail(entry) {
  if (!entry) return null;
  if (typeof entry === 'string') return entry.toLowerCase();
  return (entry.email || '').toLowerCase();
}

function isTokenExpired(entry) {
  if (!entry || typeof entry !== 'object') return false;
  return entry.expiresAt && Date.now() > entry.expiresAt;
}

function touchToken(entry) {
  if (entry && typeof entry === 'object') entry.lastUsed = Date.now();
}

function revokeAllTokens(db, email) {
  const em = email.toLowerCase();
  Object.keys(db.tokens || {}).forEach((tok) => {
    if (tokenEmail(db.tokens[tok]) === em) delete db.tokens[tok];
  });
}

function audit(db, event, meta) {
  if (!db.auditLog) db.auditLog = [];
  db.auditLog.unshift({
    at: new Date().toISOString(),
    event,
    ip: meta && meta.ip,
    email: meta && meta.email,
    detail: meta && meta.detail,
  });
  if (db.auditLog.length > 500) db.auditLog.length = 500;
}

function securityHeaders(extra) {
  return Object.assign({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'X-Robots-Tag': 'noindex, nofollow',
  }, extra || {});
}

function corsOrigin(req, isProd) {
  const chatGptDefault = 'https://chatgpt.com,https://chat.openai.com,https://www.chatgpt.com';
  const raw = process.env.ALLOWED_ORIGINS
    || (isProd ? `https://kiteline.uk,https://www.kiteline.uk,${chatGptDefault}` : '*');
  if (raw === '*') return '*';
  const origin = req.headers.origin || '';
  const allowed = raw.split(',').map((s) => s.trim()).filter(Boolean);
  if (origin && allowed.includes(origin)) return origin;
  // Always allow ChatGPT / OpenAI browser clients for AI + MCP even if env list is outdated
  if (/^https:\/\/([a-z0-9-]+\.)?(chatgpt\.com|openai\.com|oaistatic\.com)$/i.test(origin)) {
    return origin;
  }
  if (!isProd) return origin || '*';
  return allowed[0] || 'https://kiteline.uk';
}

function maskSecret(value, visible) {
  const v = String(value || '');
  if (!v) return '—';
  if (v.length <= visible) return '*'.repeat(v.length);
  return v.slice(0, visible) + '…' + '*'.repeat(4);
}

module.exports = {
  checkRateLimit,
  validatePassword,
  passwordScore,
  isLocked,
  recordFailedLogin,
  clearLoginFailures,
  issueToken,
  tokenEmail,
  isTokenExpired,
  touchToken,
  revokeAllTokens,
  audit,
  securityHeaders,
  corsOrigin,
  maskSecret,
  clientIp,
  MAX_FAILED,
  LOCKOUT_MS,
  sessionDays,
};
