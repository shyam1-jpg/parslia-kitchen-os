/* ============================================================
   Kitchen OS — Zero-dependency Node backend
   - Real auth (scrypt password hashing + bearer tokens)
   - Server-side persistence to data/db.json
   - REST API + static hosting for the app and marketing site
   Run:  node server/server.js   (from the kitchen-os folder)
   ============================================================ */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');          // kitchen-os/
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const PORT = process.env.PORT || 4000;
const isProd = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';
// Shared secret that physical devices / gateways use to push readings.
const INGEST_KEY = process.env.INGEST_KEY || 'kiteline-demo-key';
if (isProd && INGEST_KEY === 'kiteline-demo-key') {
  console.warn('  SECURITY WARNING: Set a strong INGEST_KEY in production (not kiteline-demo-key).');
}
// Demo on Render by default (Owner quick login). Set DEMO_MODE=false on Render for strict auth.
const DEMO_MODE = process.env.DEMO_MODE === 'true'
  || (process.env.RENDER === 'true' && process.env.DEMO_MODE !== 'false')
  || (!isProd && process.env.DEMO_MODE !== 'false');
// Early access: registration open unless explicitly disabled.
const ALLOW_REGISTER = process.env.ALLOW_REGISTER !== 'false';
const APP_BUILD = '2026-07-02-pilot-sites';
const APP_URL = (process.env.APP_URL || (process.env.RENDER === 'true' ? 'https://kiteline.uk' : '')).replace(/\/$/, '');
const notify = require('./notify');
const vedantaReports = require('./vedanta-reports');
const vedantaStore = require('./vedanta-store');
const waitlist = require('./waitlist');
const billing = require('./billing');
const security = require('./security');
const recipeAi = require('./recipe-ai');
const recipeAiAccess = require('./recipe-ai-access');
const tenants = require('./tenants');
const aiConnector = require('./ai-connector');
const academyStore = require('./academy/store');
const academyHandlers = require('./academy/handlers');
const vedantaOrdering = require('./vedanta-ordering');

function ensureBreachAlerts(state) {
  if (!state || !Array.isArray(state.sensors)) return [];
  state.alerts = state.alerts || [];
  const created = [];
  state.sensors.forEach((s) => {
    if (s.temp > s.max || s.temp < s.min) {
      const open = state.alerts.find((a) => a.sensor === s.id && a.status === 'open');
      if (!open) {
        const a = {
          id: 'al_' + crypto.randomBytes(4).toString('hex'),
          severity: 'critical', site: s.siteId, sensor: s.id,
          title: s.name + ' out of safe range',
          detail: s.temp + '°C (limit ' + s.min + '–' + s.max + '°C)',
          at: new Date().toISOString(), status: 'open',
        };
        state.alerts.unshift(a);
        created.push(a);
      }
    }
  });
  return created;
}

/* ---------------- tiny JSON "database" ---------------- */
function ensureDb() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) {
    const db = { users: {}, tokens: {}, state: null };
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  }
}
function readDb() {
  ensureDb();
  const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  const verBefore = db._tenantVersion || 0;
  tenants.prepareDb(db);
  if ((db._tenantVersion || 0) !== verBefore) writeDb(db);
  return db;
}
function writeDb(db) {
  // Synchronous write so newly issued tokens / state are durable before we respond
  // (avoids a read-after-write race on the very next request).
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

/* ---------------- auth helpers ---------------- */
function hashPassword(password, salt) {
  salt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return salt + ':' + hash;
}
function verifyPassword(password, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [salt, hash] = stored.split(':');
  const test = crypto.scryptSync(password, salt, 64).toString('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(test, 'hex'));
  } catch { return false; }
}

function bootstrapProductionDb() {
  if (DEMO_MODE) return;
  const db = readDb();
  bootstrapEmailVerification(db);
  const ownerEmail = (process.env.OWNER_EMAIL || 'shyam_1@hotmail.co.uk').toLowerCase().trim();
  const ownerPass = (process.env.OWNER_PASSWORD || '').trim();
  db.passwordResets = db.passwordResets || {};
  if (!ownerPass) {
    if (!db.users[ownerEmail]) {
      console.warn('  WARNING: Set OWNER_PASSWORD in env to create the owner account.');
    }
    return;
  }
  db.users[ownerEmail] = {
    email: ownerEmail,
    name: process.env.OWNER_NAME || (db.users[ownerEmail] && db.users[ownerEmail].name) || 'Owner',
    pass: hashPassword(ownerPass),
    emailVerified: true,
    createdAt: (db.users[ownerEmail] && db.users[ownerEmail].createdAt) || new Date().toISOString(),
  };
  ensureOwnerWorkspace(db, ownerEmail);
  security.clearLoginFailures(db.users[ownerEmail]);
  writeDb(db);
  console.log('  Owner login ready: ' + ownerEmail + ' (password from OWNER_PASSWORD env)');
}

// Load demo kitchen into owner-only tenant (separate from customer workspaces).
function bootstrapDemoKitchen() {
  const db = readDb();
  tenants.bootstrapDemoKitchen(db);
  writeDb(db);
  const demo = tenants.getDemoState(db);
  const n = demo && Array.isArray(demo.recipes) ? demo.recipes.length : 0;
  if (n >= 100) console.log('  Demo tenant ready — ' + n + ' recipes (owner login only)');
}

function ensureOwnerWorkspace(db, email) {
  tenants.prepareDb(db);
  const em = (email || '').toLowerCase().trim();
  const user = db.users[em];
  if (!user) return false;
  if (tenants.isOwner(em)) {
    if (!user.tenantId) user.tenantId = tenants.DEMO_TENANT_ID;
    tenants.bootstrapDemoKitchen(db);
  }
  return !!tenants.getStateForUser(db, em);
}
function newToken() { return crypto.randomBytes(32).toString('hex'); }

// Early access: email verification OFF unless explicitly enabled AND SMTP works.
const REQUIRE_EMAIL_VERIFY = process.env.REQUIRE_EMAIL_VERIFY === 'true' && !DEMO_MODE;

function emailVerificationRequired() {
  return REQUIRE_EMAIL_VERIFY && notify.smtpConfigured();
}

function bootstrapEmailVerification(db) {
  if (emailVerificationRequired()) return;
  let changed = false;
  Object.keys(db.users || {}).forEach((email) => {
    const u = db.users[email];
    if (u && u.emailVerified === false) {
      u.emailVerified = true;
      changed = true;
    }
  });
  if (changed) {
    writeDb(db);
    console.log('  Email verification off — all accounts activated.');
  }
}

function ensureUserEmailVerified(db, user) {
  if (!user || user.emailVerified !== false) return false;
  if (emailVerificationRequired()) return false;
  user.emailVerified = true;
  writeDb(db);
  return true;
}

function publicUser(user) {
  return { email: user.email, name: user.name, emailVerified: user.emailVerified !== false, lang: user.lang || 'en' };
}

async function sendVerificationEmail(db, email, baseUrl) {
  const verifyToken = crypto.randomBytes(24).toString('hex');
  db.emailVerifications = db.emailVerifications || {};
  db.emailVerifications[verifyToken] = { email, expires: Date.now() + 48 * 3600000 };
  writeDb(db);
  const verifyUrl = `${baseUrl}/activate?token=${verifyToken}`;
  const msg = {
    subject: 'Verify your Kiteline email',
    text: `Welcome to Kiteline!\n\nVerify your email to activate your account:\n\n${verifyUrl}\n\nThis link expires in 48 hours.`,
    html: `<div style="font-family:Inter,system-ui,sans-serif;max-width:520px">
      <h2 style="color:#0d9488">Verify your Kiteline email</h2>
      <p>Thanks for registering. Confirm your email to sign in and use your kitchen workspace.</p>
      <p><a href="${verifyUrl}" style="display:inline-block;padding:12px 20px;background:#0d9488;color:#fff;font-weight:bold;border-radius:8px;text-decoration:none">Verify email address</a></p>
      <p style="color:#64748b;font-size:13px">Or copy this link: ${verifyUrl}</p>
      <p style="color:#64748b;font-size:13px">Link expires in 48 hours.</p>
    </div>`,
  };
  const sendResult = await notify.sendRawEmail(email, msg);
  return {
    verifyUrl: notify.shouldShowEmailLink(sendResult) ? verifyUrl : undefined,
    emailSent: notify.emailActuallySent(sendResult),
  };
}

function completeEmailVerification(db, verifyToken, emailHint, ip) {
  db.emailVerifications = db.emailVerifications || {};
  const entry = db.emailVerifications[verifyToken];
  if (!entry || entry.expires < Date.now()) {
    const fallbackEmail = (emailHint || (entry && entry.email) || '').toLowerCase().trim();
    const existing = fallbackEmail && db.users[fallbackEmail];
    if (existing && existing.emailVerified !== false) {
      billing.ensureTrial(existing);
      billing.syncOrgAccess(db, fallbackEmail);
      const token = security.issueToken(db, fallbackEmail);
      writeDb(db);
      return {
        ok: true,
        token,
        user: publicUser(existing),
        trial: billing.getTrialInfo(existing),
        alreadyVerified: true,
        message: 'Your email is already verified — signing you in.',
      };
    }
    return { ok: false, error: 'Verification link expired or invalid — use Forgot password to sign in.' };
  }
  const email = entry.email;
  const user = db.users[email];
  if (!user) return { ok: false, error: 'Account not found' };
  user.emailVerified = true;
  delete db.emailVerifications[verifyToken];
  billing.ensureTrial(user);
  billing.syncOrgAccess(db, email);
  const token = security.issueToken(db, email);
  security.audit(db, 'email_verified', { ip, email });
  writeDb(db);
  return {
    ok: true,
    token,
    user: publicUser(user),
    trial: billing.getTrialInfo(user),
    message: 'Email verified — welcome to Kiteline!',
  };
}

function activateHtml(result, redirectHash) {
  if (!result.ok) {
    const msg = String(result.error || 'Activation failed').replace(/&/g, '&amp;').replace(/</g, '&lt;');
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Kiteline activation</title></head><body style="font-family:system-ui,sans-serif;padding:2rem;max-width:480px;margin:auto"><h1 style="color:#0f766e">Could not activate</h1><p>${msg}</p><p><a href="/app" style="color:#0d9488;font-weight:bold">Sign in</a> · <a href="/app#forgot-password" style="color:#0d9488">Forgot password</a></p></body></html>`;
  }
  const tokenJson = JSON.stringify(result.token);
  const emailJson = JSON.stringify((result.user && result.user.email) || '');
  const hash = String(redirectHash || 'home').replace(/^#/, '').replace(/["'<>\\]/g, '') || 'home';
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Signing in…</title></head><body style="font-family:system-ui,sans-serif;padding:3rem;text-align:center"><p>Signing you in to Kiteline…</p><script>localStorage.setItem('kiteline.token',${tokenJson});localStorage.setItem('kiteline.email',${emailJson});location.replace('/app#' + ${JSON.stringify(hash)});</script></body></html>`;
}

function userFromReq(db, req) {
  const auth = req.headers['authorization'] || '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  if (!token || token.length < 32) return null;
  const entry = db.tokens[token];
  const email = security.tokenEmail(entry);
  if (!email || !db.users[email]) {
    if (entry) delete db.tokens[token];
    return null;
  }
  if (security.isTokenExpired(entry)) {
    delete db.tokens[token];
    return null;
  }
  security.touchToken(entry);
  return db.users[email];
}

function applyRegistrationProfile(db, email, profile) {
  if (!profile || !profile.businessName) return;
  const user = db.users[email];
  if (!user) return;
  user.lang = profile.lang || 'en';
  const fullName = `${(profile.firstName || '').trim()} ${(profile.lastName || '').trim()}`.trim();
  if (fullName) user.name = fullName;

  db.registrations = db.registrations || [];
  db.registrations.unshift({
    at: new Date().toISOString(),
    email,
    ...profile,
  });

  tenants.createTenantForRegistration(db, user, email, profile);
}

function publicAcademyUser(u) {
  if (!u) return null;
  return {
    email: u.email,
    name: u.name,
    firstName: u.firstName,
    lastName: u.lastName,
    phone: u.phone || '',
    country: u.country || '',
    city: u.city || '',
    postcode: u.postcode || '',
    addressLine1: u.addressLine1 || '',
    addressLine2: u.addressLine2 || '',
    dateOfBirth: u.dateOfBirth || '',
    ageGroup: u.ageGroup || '',
    gender: u.gender || '',
    certifications: u.certifications || '',
    lang: u.lang || 'en',
    timezone: u.timezone || '',
    emailVerified: u.emailVerified !== false,
    totpEnabled: !!(u.totpEnabled && u.totpSecret),
  };
}

function academyEmailVerificationRequired() {
  // Opt-in only: students sign in immediately unless you set ACADEMY_REQUIRE_EMAIL_VERIFY=true on Render.
  return process.env.ACADEMY_REQUIRE_EMAIL_VERIFY === 'true' && notify.smtpConfigured();
}

function bootstrapAcademyEmailVerification(db) {
  if (academyEmailVerificationRequired()) return;
  let changed = false;
  Object.keys(db.academyUsers || {}).forEach((email) => {
    const u = db.academyUsers[email];
    if (u && u.emailVerified === false) {
      u.emailVerified = true;
      changed = true;
    }
  });
  if (changed) {
    writeDb(db);
    console.log('  Kiteline Academy: email verification off — all student accounts activated.');
  }
}

function computeAgeFromDob(dob) {
  const birth = new Date(dob + 'T00:00:00');
  if (Number.isNaN(birth.getTime())) return null;
  return Math.floor((Date.now() - birth.getTime()) / (365.25 * 86400000));
}

function computeAgeGroup(age) {
  if (age == null || age < 0) return '';
  if (age < 18) return 'under-18';
  if (age < 25) return '18-24';
  if (age < 35) return '25-34';
  if (age < 45) return '35-44';
  if (age < 55) return '45-54';
  return '55+';
}

function validateAcademyProfile(body) {
  let firstName = (body.firstName || '').trim();
  let lastName = (body.lastName || '').trim();
  const fullName = (body.name || '').trim();
  if (fullName && !firstName) {
    const parts = fullName.split(/\s+/);
    firstName = parts[0];
    lastName = parts.slice(1).join(' ') || '';
  }
  const email = (body.email || '').toLowerCase().trim();
  const country = (body.country || '').trim();
  const lang = (body.lang || 'en').trim().slice(0, 8);
  const phone = (body.phone || '').trim();
  const city = (body.city || '').trim();
  const postcode = (body.postcode || '').trim();
  const addressLine1 = (body.addressLine1 || '').trim();
  const dateOfBirth = (body.dateOfBirth || '').trim();
  const gender = (body.gender || '').trim().toLowerCase() || '';
  if (!firstName) return { ok: false, error: 'Name is required' };
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: 'Enter a valid email address' };
  if (!country) return { ok: false, error: 'Country is required' };
  if (!lang) return { ok: false, error: 'Preferred language is required' };
  if (!body.termsAccepted) return { ok: false, error: 'Please accept the terms to register' };
  let ageGroup = '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) {
    const age = computeAgeFromDob(dateOfBirth);
    if (age == null || age < 13) return { ok: false, error: 'You must be at least 13 years old to register' };
    if (age > 120) return { ok: false, error: 'Enter a valid date of birth' };
    ageGroup = computeAgeGroup(age);
  }
  return {
    ok: true,
    profile: {
      firstName, lastName, email, phone: phone || undefined, country,
      city: city || undefined, postcode: postcode || undefined,
      addressLine1: addressLine1 || undefined,
      addressLine2: (body.addressLine2 || '').trim() || undefined,
      dateOfBirth: dateOfBirth || undefined,
      gender: gender || undefined,
      ageGroup: ageGroup || undefined,
      certifications: (body.certifications || '').trim().slice(0, 500) || undefined,
      lang,
      timezone: (body.timezone || '').trim() || undefined,
    },
  };
}

function issueAcademyToken(db, email) {
  db.academyTokens = db.academyTokens || {};
  const days = Number(process.env.ACADEMY_SESSION_DAYS || 7);
  const token = 'acad_' + crypto.randomBytes(32).toString('hex');
  db.academyTokens[token] = {
    email: email.toLowerCase(),
    issued: Date.now(),
    expiresAt: Date.now() + days * 86400000,
    lastUsed: Date.now(),
  };
  return token;
}

function academyUserFromToken(db, token) {
  if (!token || !token.startsWith('acad_') || !db.academyTokens) return null;
  const entry = db.academyTokens[token];
  if (!entry) return null;
  if (entry.expiresAt && Date.now() > entry.expiresAt) {
    delete db.academyTokens[token];
    return null;
  }
  entry.lastUsed = Date.now();
  const user = db.academyUsers && db.academyUsers[entry.email];
  if (!user) return null;
  if (academyEmailVerificationRequired() && user.emailVerified === false) return null;
  return user;
}

function revokeAcademyToken(db, token) {
  if (token && db.academyTokens && db.academyTokens[token]) delete db.academyTokens[token];
}

function revokeAllAcademyTokens(db, email) {
  const em = (email || '').toLowerCase();
  Object.keys(db.academyTokens || {}).forEach((tok) => {
    if (db.academyTokens[tok].email === em) delete db.academyTokens[tok];
  });
}

async function sendAcademyVerificationEmail(db, email, baseUrl) {
  const verifyToken = crypto.randomBytes(24).toString('hex');
  await academyStore.saveEmailVerification(db, verifyToken, email, Date.now() + 48 * 3600000);
  writeDb(db);
  const verifyUrl = `${baseUrl}/academy/?verify=${verifyToken}`;
  const msg = {
    subject: 'Kiteline Academy — verify your email',
    text: `Welcome to Kiteline Academy!\n\nVerify your email to activate your student account:\n\n${verifyUrl}\n\nExpires in 48 hours.\n\nIf you did not receive this email, check spam/junk or use Resend verification on the sign-in page — a link will appear on screen.`,
    html: `<div style="font-family:Inter,sans-serif;max-width:520px"><h2 style="color:#36e6ff">Verify Kiteline Academy</h2><p>Confirm your email to sign in and access your free courses.</p><p><a href="${verifyUrl}" style="display:inline-block;padding:12px 20px;background:#36e6ff;color:#061020;font-weight:bold;border-radius:8px;text-decoration:none">Verify my email</a></p><p style="color:#64748b;font-size:13px">Or copy this link: ${verifyUrl}</p><p style="color:#64748b;font-size:13px">Check spam/junk if you do not see this message. Need help? contact@kiteline.uk</p></div>`,
    replyTo: process.env.ACADEMY_REPLY_TO || 'contact@kiteline.uk',
  };
  const sendResult = await notify.sendRawEmail(email, msg);
  const emailSent = notify.emailActuallySent(sendResult);
  return {
    verifyUrl,
    emailSent,
    smtpError: sendResult.smtpError || null,
  };
}

async function completeAcademyEmailVerification(db, verifyToken, ip) {
  const entry = await academyStore.getEmailVerification(db, verifyToken);
  if (!entry || entry.expires < Date.now()) return { ok: false, error: 'Verification link expired or invalid' };
  const user = await academyStore.getUser(db, entry.email);
  if (!user) return { ok: false, error: 'Account not found' };
  user.emailVerified = true;
  await academyStore.saveUser(db, entry.email, user);
  await academyStore.deleteEmailVerification(db, verifyToken);
  const token = await academyHandlers.issueAcademySession(db, entry.email);
  security.audit(db, 'academy_email_verified', { ip, email: entry.email });
  writeDb(db);
  return { ok: true, token, user: publicAcademyUser(user), message: 'Email verified — you are signed in.' };
}

/* ---------------- http helpers ---------------- */
function send(res, code, obj, headers, req) {
  const body = typeof obj === 'string' ? obj : JSON.stringify(obj);
  const cors = security.corsOrigin(req || { headers: {} }, isProd);
  res.writeHead(code, Object.assign(security.securityHeaders({
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': cors,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  }), headers || {}));
  res.end(body);
}
function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', c => { data += c; if (data.length > 30e6) req.destroy(); });
    req.on('end', () => { try { resolve(data ? JSON.parse(data) : {}); } catch { resolve({}); } });
  });
}
function readRawBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', c => { data += c; if (data.length > 30e6) req.destroy(); });
    req.on('end', () => resolve(data));
  });
}

const MIME = { '.html':'text/html', '.css':'text/css', '.js':'text/javascript',
  '.json':'application/json', '.svg':'image/svg+xml', '.png':'image/png',
  '.ico':'image/x-icon', '.map':'application/json',
  '.webmanifest':'application/manifest+json' };

function serveFile(res, filePath, opts) {
  try {
    const ext = path.extname(filePath).toLowerCase();
    const headers = { 'Content-Type': MIME[ext] || 'application/octet-stream' };
    if (opts && opts.noStore) {
      headers['Cache-Control'] = 'no-store, no-cache, must-revalidate';
    } else if (ext === '.png' || ext === '.jpg' || ext === '.jpeg' || ext === '.webp' || ext === '.svg') {
      headers['Cache-Control'] = 'public, max-age=86400';
    } else if ((filePath.includes('vedanta-rota') || filePath.includes('vedanta-ordering') || filePath.includes('academy') || filePath.includes('menu-creator')) && (ext === '.html' || ext === '.js')) {
      headers['Cache-Control'] = 'no-store, no-cache, must-revalidate';
    } else if (ext === '.html' || ext === '.js' || ext === '.css') {
      headers['Cache-Control'] = 'no-store, no-cache, must-revalidate';
    }
    const buf = fs.readFileSync(filePath);
    res.writeHead(200, security.securityHeaders(headers));
    res.end(buf);
  } catch {
    send(res, 404, { error: 'Not found' }, null, null);
  }
}

function serveAppIndex(res) {
  try {
    let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    const build = String(APP_BUILD).replace(/[^a-zA-Z0-9._-]/g, '');
    html = html.replace(/\?v=[^"'&]+/g, '?v=' + build);
    res.writeHead(200, security.securityHeaders({
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    }));
    res.end(html);
  } catch {
    send(res, 404, { error: 'Not found' }, null, null);
  }
}

function demoOwnerLoginHtml(db, redirectHash) {
  const email = (process.env.OWNER_EMAIL || 'shyam_1@hotmail.co.uk').toLowerCase().trim();
  if (!db.users[email]) {
    db.users[email] = {
      email,
      name: process.env.OWNER_NAME || 'Owner',
      pass: hashPassword('demo'),
      emailVerified: true,
      createdAt: new Date().toISOString(),
    };
  }
  ensureOwnerWorkspace(db, email);
  billing.ensureTrial(db.users[email]);
  billing.syncOrgAccess(db, email);
  const token = security.issueToken(db, email);
  writeDb(db);
  return activateHtml({ ok: true, token, user: { email } }, redirectHash);
}
function isExistingFile(filePath) {
  try {
    return filePath && fs.existsSync(filePath) && fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}
// Prevent path traversal
function safeJoin(base, target) {
  const p = path.normalize(path.join(base, target));
  return p.startsWith(base) ? p : null;
}

/* ---------------- API routes ---------------- */
async function handleApi(req, res, url) {
  const db = readDb();
  const apiSend = (code, obj, extra) => send(res, code, obj, extra, req);
  const ip = security.clientIp(req);
  const route = url.pathname.replace(/^\/api/, '');

  if (url.pathname.startsWith('/api/vedanta-ordering')) {
    vedantaOrdering.handleApi(req, res, url);
    return;
  }

  const body = (req.method === 'POST' || req.method === 'PUT') ? await readBody(req) : {};

  // GET /api/vedanta/reports/status — where data is stored + email schedule
  if (route === '/vedanta/reports/status' && req.method === 'GET') {
    return apiSend(200, {
      appUrl: 'https://kiteline.uk/vedanta-rota/',
      dataStore: 'Kiteline server + Firebase Firestore (project: the-vedanta)',
      kitelineStore: true,
      collections: ['staff', 'rota', 'clock', 'leave_requests', 'audit_log', 'config'],
      localBackup: 'Browser localStorage on each device (syncs to cloud when online)',
      emailTo: vedantaReports.reportRecipients(),
      autoEmailsEnabled: vedantaReports.autoEmailsEnabled(),
      testingMode: !vedantaReports.autoEmailsEnabled(),
      schedule: {
        weekly: 'Every Monday ~7:00 UK time (when auto emails enabled)',
        monthly: '27th of each month ~7:00 UK time (when auto emails enabled)',
      },
      smtpConfigured: notify.smtpConfigured(),
    }, null, req);
  }

  // POST /api/vedanta/reports/send — manual test (type: weekly|monthly)
  if (route === '/vedanta/reports/send' && req.method === 'POST') {
    const type = (body.type || 'weekly') === 'monthly' ? 'monthly' : 'weekly';
    try {
      const result = await vedantaReports.sendReport(type);
      return apiSend(200, result, null, req);
    } catch (e) {
      return apiSend(500, { error: e.message || String(e) }, null, req);
    }
  }

  // GET /api/vedanta/store — full rota data on Kiteline server
  if (route === '/vedanta/store' && req.method === 'GET') {
    return apiSend(200, vedantaStore.getSnapshot(), null, req);
  }

  // PUT /api/vedanta/store — bulk merge (first sync / backup upload)
  if (route === '/vedanta/store' && req.method === 'PUT') {
    try {
      const merged = vedantaStore.mergeBulk(body);
      return apiSend(200, { ok: true, updatedAt: merged.updatedAt }, null, req);
    } catch (e) {
      return apiSend(500, { error: e.message || String(e) }, null, req);
    }
  }

  // POST /api/vedanta/patch — incremental updates { ops: [{ c, id, data, delete? }] }
  if (route === '/vedanta/patch' && req.method === 'POST') {
    try {
      const merged = vedantaStore.applyPatch(body.ops || body);
      return apiSend(200, { ok: true, updatedAt: merged.updatedAt }, null, req);
    } catch (e) {
      return apiSend(500, { error: e.message || String(e) }, null, req);
    }
  }

  // GET /api/config — public app flags (demo UI, registration)
  if (route === '/config' && req.method === 'GET') {
    return apiSend( 200, {
      demo: DEMO_MODE,
      register: ALLOW_REGISTER,
      emailVerification: emailVerificationRequired(),
      emailConfigured: notify.smtpConfigured(),
      billing: billing.isConfigured(),
      plans: billing.planCatalog(),
      trialDays: billing.TRIAL_DAYS,
      trialMaxUsers: billing.TRIAL_MAX_USERS,
      recipeAi: recipeAiAccess.platformAvailable(),
      recipeAiAddon: recipeAiAccess.addonCatalog(),
      recipeAiSetup: {
        platformKey: recipeAiAccess.platformAvailable(),
        stripe: billing.isConfigured(),
        byokStorage: !!(process.env.INGEST_KEY || process.env.DATA_ENCRYPTION_KEY),
      },
      build: APP_BUILD,
    });
  }

  // GET /api/billing/config — public plan list + Stripe enabled flag
  if (route === '/billing/config' && req.method === 'GET') {
    return apiSend( 200, { enabled: billing.isConfigured(), plans: billing.planCatalog() });
  }

  // POST /api/billing/checkout — Stripe Checkout (email required)
  if (route === '/billing/checkout' && req.method === 'POST') {
    if (!billing.isConfigured()) {
      return apiSend( 503, { error: 'Online checkout not configured yet — email contact@kiteline.uk for an invoice.' });
    }
    try {
      const result = await billing.createCheckout({ plan: body.plan, email: body.email });
      return apiSend( 200, result);
    } catch (e) {
      return apiSend( 400, { error: e.message || 'Checkout failed' });
    }
  }

  // POST /api/waitlist — hardware interest (no payment, no stock)
  if (route === '/waitlist' && req.method === 'POST') {
    const result = waitlist.add(body);
    if (result.error) return apiSend( 409, result);
    notify.notifyWaitlistSignup(result.entry || body).catch((e) => {
      console.error('[waitlist] owner email failed:', e.message);
    });
    return apiSend( 200, result);
  }

  // GET /api/waitlist/summary — public counts only (no personal data)
  if (route === '/waitlist/summary' && req.method === 'GET') {
    return apiSend( 200, waitlist.summary(waitlist.read()));
  }

  // Kitline Academy API (auth, 2FA, CAPTCHA, Stripe, admin, Postgres)
  if (route.startsWith('/academy')) {
    const handled = await academyHandlers.handleAcademyRoute({
      route, req, res, body, ip, db, writeDb, send, isProd, APP_URL, url,
      security, notify, hashPassword, verifyPassword,
      validateAcademyProfile, publicAcademyUser, academyEmailVerificationRequired,
      sendAcademyVerificationEmail, completeAcademyEmailVerification,
    });
    if (handled) return;
  }

  // POST /api/register
  if (route === '/register' && req.method === 'POST') {
    if (!ALLOW_REGISTER) return apiSend( 403, { error: 'Registration disabled' });
    const rlReg = security.checkRateLimit(req, 'register');
    if (!rlReg.ok) return apiSend(429, { error: 'Too many registration attempts. Try again later.', code: 'rate_limited', retryAfter: rlReg.retryAfter });
    const email = (body.email || '').toLowerCase().trim();
    if (!email || !body.password) return apiSend( 400, { error: 'Email and password required' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return apiSend( 400, { error: 'Enter a valid email address' });
    const pwCheckReg = security.validatePassword(body.password, email);
    if (!pwCheckReg.ok) return apiSend(400, { error: pwCheckReg.error });
    const profile = body.profile || null;
    if (profile) {
      if (!profile.termsAccepted) return apiSend( 400, { error: 'Please accept the terms to register' });
      if (!profile.firstName || !profile.lastName) return apiSend( 400, { error: 'First and last name are required' });
      if (!profile.businessName) return apiSend( 400, { error: 'Business or kitchen name is required' });
      if (!profile.city || !profile.postcode) return apiSend( 400, { error: 'City and postcode are required' });
    }
    if (db.users[email]) {
      const existing = db.users[email];
      if (emailVerificationRequired() && existing.emailVerified === false) {
        return apiSend( 409, { error: 'Account exists but email not verified — check your inbox or resend the link.', code: 'email_not_verified' });
      }
      if (existing.emailVerified === false) {
        ensureUserEmailVerified(db, existing);
      }
      return apiSend( 409, { error: 'Account already exists — sign in or reset your password' });
    }
    const name = profile
      ? `${profile.firstName} ${profile.lastName}`.trim()
      : (body.name || email.split('@')[0]).trim();
    const skipVerify = DEMO_MODE || !emailVerificationRequired();
    const now = Date.now();
    db.users[email] = {
      email,
      name,
      pass: hashPassword(body.password),
      emailVerified: skipVerify,
      createdAt: new Date(now).toISOString(),
      trialStartedAt: new Date(now).toISOString(),
      trialEndsAt: new Date(now + billing.TRIAL_DAYS * 86400000).toISOString(),
      lang: (profile && profile.lang) || 'en',
    };
    if (profile) applyRegistrationProfile(db, email, profile);
    security.audit(db, 'register', { ip, email });
    if (skipVerify) {
      const token = security.issueToken(db, email);
      billing.syncOrgAccess(db, email);
      writeDb(db);
      return apiSend( 200, {
        token,
        user: publicUser(db.users[email]),
        needsVerification: false,
        trialDays: billing.TRIAL_DAYS,
        message: billing.TRIAL_DAYS + '-day free trial started — full access to all modules.',
      });
    }
    writeDb(db);
    const base = APP_URL || `${url.protocol}//${req.headers.host || 'localhost'}`;
    const mail = await sendVerificationEmail(db, email, base);
    return apiSend( 200, {
      ok: true,
      needsVerification: true,
      trialDays: billing.TRIAL_DAYS,
      emailSent: !!mail.emailSent,
      message: mail.emailSent
        ? 'Account created — check your email and click Verify to activate your ' + billing.TRIAL_DAYS + '-day free trial.'
        : 'Account created — email could not be delivered. Use the verification link on screen. Your ' + billing.TRIAL_DAYS + '-day free trial starts when you verify.',
      verifyUrl: mail.verifyUrl,
    });
  }

  // POST /api/verify-email
  if (route === '/verify-email' && req.method === 'POST') {
    const rl = security.checkRateLimit(req, 'verify');
    if (!rl.ok) return apiSend(429, { error: 'Too many attempts. Try again later.', code: 'rate_limited', retryAfter: rl.retryAfter });
    const verifyToken = body.token || '';
    const emailHint = (body.email || '').toLowerCase().trim();
    if (!verifyToken && emailHint && !emailVerificationRequired()) {
      const user = db.users[emailHint];
      if (user) {
        ensureUserEmailVerified(db, user);
        billing.ensureTrial(user);
        billing.syncOrgAccess(db, emailHint);
        const token = security.issueToken(db, emailHint);
        writeDb(db);
        return apiSend(200, {
          ok: true,
          token,
          user: publicUser(user),
          trial: billing.getTrialInfo(user),
          alreadyVerified: true,
          message: 'Account ready — signing you in.',
        });
      }
      return apiSend(404, { error: 'Account not found — register first' });
    }
    if (!verifyToken) return apiSend( 400, { error: 'Verification token required' });
    const result = completeEmailVerification(db, verifyToken, emailHint, ip);
    if (!result.ok) {
      return apiSend(400, { error: result.error, code: 'token_invalid' });
    }
    return apiSend(200, {
      ok: true,
      token: result.token,
      user: result.user,
      trial: result.trial,
      alreadyVerified: result.alreadyVerified,
      message: result.message,
    });
  }

  // POST /api/resend-verification — placeholder removed duplicate verify block below
  if (route === '/resend-verification' && req.method === 'POST') {
    const rl = security.checkRateLimit(req, 'resend');
    if (!rl.ok) return apiSend(429, { error: 'Too many requests. Try again later.', code: 'rate_limited', retryAfter: rl.retryAfter });
    const email = (body.email || '').toLowerCase().trim();
    if (!email) return apiSend( 400, { error: 'Email required' });
    const user = db.users[email];
    if (!user) {
      return apiSend( 200, { ok: true, message: 'If that email is registered, we sent a new verification link.' });
    }
    if (user.emailVerified !== false) {
      return apiSend( 200, { ok: true, message: 'This email is already verified — you can sign in.' });
    }
    const base = APP_URL || `${url.protocol}//${req.headers.host || 'localhost'}`;
    const mail = await sendVerificationEmail(db, email, base);
    return apiSend( 200, {
      ok: true,
      emailSent: !!mail.emailSent,
      message: mail.emailSent
        ? 'Verification email sent — check your inbox (and spam folder).'
        : 'Email could not be delivered — use the verification link below.',
      verifyUrl: mail.verifyUrl,
    });
  }

  // POST /api/forgot-password
  if (route === '/forgot-password' && req.method === 'POST') {
    const rl = security.checkRateLimit(req, 'forgot');
    if (!rl.ok) return apiSend(429, { error: 'Too many requests. Try again later.', code: 'rate_limited', retryAfter: rl.retryAfter });
    const email = (body.email || '').toLowerCase().trim();
    if (!email) return apiSend( 400, { error: 'Email required' });
    const user = db.users[email];
    if (!user) {
      const ownerEm = (process.env.OWNER_EMAIL || 'shyam_1@hotmail.co.uk').toLowerCase().trim();
      const smtpOn = notify.smtpConfigured();
      let message = smtpOn
        ? 'If that email is registered, we sent a reset link — check inbox and spam.'
        : 'No email is sent from Kiteline yet. If that address is registered, a reset link would appear on this page. If nothing appeared, check the spelling or create an account.';
      if (email === ownerEm && !process.env.OWNER_PASSWORD) {
        message = 'Owner account not created yet. In Render → kitline1 → Environment, set OWNER_PASSWORD, save, wait 3 minutes, then sign in with that password. Or create a new account at Register.';
      }
      return apiSend( 200, {
        ok: true,
        message,
        emailSent: false,
        emailConfigured: smtpOn,
        ownerSetupRequired: email === ownerEm && !process.env.OWNER_PASSWORD,
      });
    }
    security.audit(db, 'forgot_password', { ip, email });
    const resetToken = crypto.randomBytes(24).toString('hex');
    db.passwordResets = db.passwordResets || {};
    db.passwordResets[resetToken] = { email, expires: Date.now() + 3600000 };
    writeDb(db);
    const base = APP_URL || `${url.protocol}//${req.headers.host || 'localhost'}`;
    const resetUrl = `${base}/app#reset-password?token=${resetToken}`;
    const msg = {
      subject: 'Reset your Kiteline password',
      text: `Reset your Kiteline password:\n\n${resetUrl}\n\nThis link expires in 1 hour. If you did not ask for this, ignore this email.`,
      html: `<div style="font-family:Inter,system-ui,sans-serif;max-width:520px">
        <h2 style="color:#0d9488">Reset your Kiteline password</h2>
        <p><a href="${resetUrl}" style="color:#0d9488;font-weight:bold">Click here to choose a new password</a></p>
        <p style="color:#64748b;font-size:13px">Link expires in 1 hour. If you did not ask for this, ignore this email.</p>
      </div>`,
    };
    const sendResult = await notify.sendRawEmail(email, msg);
    const emailSent = notify.emailActuallySent(sendResult);
    return apiSend( 200, {
      ok: true,
      emailSent,
      message: emailSent
        ? 'Reset link sent — also use the link on screen below (check spam if no email).'
        : 'Email could not be delivered — use the reset link on screen (copy and open it).',
      resetUrl,
    });
  }

  // POST /api/reset-password
  if (route === '/reset-password' && req.method === 'POST') {
    const resetToken = body.token || '';
    const password = body.password || '';
    if (!resetToken || !password) return apiSend( 400, { error: 'Token and new password required' });
    db.passwordResets = db.passwordResets || {};
    const entry = db.passwordResets[resetToken];
    if (!entry || entry.expires < Date.now()) {
      return apiSend( 400, { error: 'Reset link expired or invalid — request a new one' });
    }
    const email = entry.email;
    if (!db.users[email]) return apiSend( 404, { error: 'Account not found' });
    const pwCheckReset = security.validatePassword(password, email);
    if (!pwCheckReset.ok) return apiSend(400, { error: pwCheckReset.error });
    db.users[email].pass = hashPassword(password);
    security.clearLoginFailures(db.users[email]);
    security.revokeAllTokens(db, email);
    delete db.passwordResets[resetToken];
    security.audit(db, 'password_reset', { ip, email });
    writeDb(db);
    return apiSend( 200, { ok: true, message: 'Password updated — sign in with your new password' });
  }

  // POST /api/change-password — sign-in user updates password (revokes other sessions)
  if (route === '/change-password' && req.method === 'POST') {
    const meEarly = userFromReq(db, req);
    if (!meEarly) return apiSend(401, { error: 'Session expired — sign in again', code: 'session_expired' });
    const current = body.currentPassword || '';
    const newPw = body.newPassword || '';
    if (!current || !newPw) return apiSend(400, { error: 'Current and new password required' });
    if (!verifyPassword(current, meEarly.pass)) return apiSend(401, { error: 'Current password is incorrect' });
    const pwCheckChg = security.validatePassword(newPw, meEarly.email);
    if (!pwCheckChg.ok) return apiSend(400, { error: pwCheckChg.error });
    meEarly.pass = hashPassword(newPw);
    security.clearLoginFailures(meEarly);
    security.revokeAllTokens(db, meEarly.email);
    const token = security.issueToken(db, meEarly.email);
    security.audit(db, 'password_change', { ip, email: meEarly.email });
    writeDb(db);
    return apiSend(200, { ok: true, token, message: 'Password updated — other devices signed out' });
  }

  // POST /api/login
  if (route === '/login' && req.method === 'POST') {
    const rlLogin = security.checkRateLimit(req, 'login');
    if (!rlLogin.ok) return apiSend(429, { error: 'Too many login attempts. Try again later.', code: 'rate_limited', retryAfter: rlLogin.retryAfter });
    const email = (body.email || '').toLowerCase().trim();
    const password = body.password || '';
    if (!email) return apiSend( 400, { error: 'Email required' });
    if (!password) return apiSend( 400, { error: 'Password required' });
    let user = db.users[email];
    if (DEMO_MODE) {
      if (!user) {
        user = db.users[email] = { email, name: email.split('@')[0], pass: hashPassword(password), createdAt: new Date().toISOString(), emailVerified: true };
        writeDb(db);
      }
    } else {
      if (!user || !verifyPassword(password, user.pass)) {
        if (user) {
          security.recordFailedLogin(user);
          security.audit(db, 'login_failed', { ip, email, detail: 'bad_password' });
          writeDb(db);
        }
        return apiSend(401, { error: 'Invalid email or password', code: 'invalid_credentials' });
      }
      if (security.isLocked(user)) {
        const mins = Math.ceil((user.lockUntil - Date.now()) / 60000);
        return apiSend(423, { error: 'Account temporarily locked. Try again in ' + mins + ' minute(s).', code: 'account_locked', retryAfter: Math.ceil((user.lockUntil - Date.now()) / 1000) });
      }
      ensureUserEmailVerified(db, user);
      if (emailVerificationRequired() && user.emailVerified === false) {
        return apiSend( 403, {
          error: 'Verify your email before signing in — check your inbox or resend the verification link.',
          code: 'email_not_verified',
        });
      }
      if (!billing.canAccess(db, email)) {
        return apiSend( 403, {
          error: 'Your ' + billing.TRIAL_DAYS + '-day free trial has ended. Subscribe at kiteline.uk/pricing.html to continue.',
          code: 'trial_expired',
        });
      }
    }
    security.clearLoginFailures(user);
    billing.ensureTrial(user);
    billing.syncOrgAccess(db, email);
    if (DEMO_MODE && tenants.isOwner(email)) ensureOwnerWorkspace(db, email);
    const token = security.issueToken(db, email);
    security.audit(db, 'login_success', { ip, email });
    writeDb(db);
    const trial = billing.getTrialInfo(user);
    return apiSend( 200, { token, user: publicUser(user), trial, sessionDays: security.sessionDays() });
  }

  // POST /api/ingest — physical sensors / LoRaWAN gateways push live readings here.
  // Auth via the x-api-key header (not a user token). Accepts one reading or a batch.
  //   { "sensorId":"s1", "temp":3.4, "battery":92, "signal":88, "ts":"2026-01-01T00:00:00Z" }
  //   { "readings":[ {sensorId,temp}, ... ] }
  if (route === '/ingest' && req.method === 'POST') {
    const key = req.headers['x-api-key'] || '';
    if (key !== INGEST_KEY) return apiSend( 401, { error: 'Invalid or missing x-api-key' });
    const kitchen = tenants.getDemoState(db);
    if (!kitchen || !Array.isArray(kitchen.sensors)) {
      return apiSend( 409, { error: 'No demo kitchen sensors yet — owner demo tenant not seeded.' });
    }
    const readings = Array.isArray(body.readings) ? body.readings : [body];
    kitchen.alerts = kitchen.alerts || [];
    let updated = 0; const unknown = [];
    readings.forEach(r => {
      const id = r.sensorId || r.id;
      const s = kitchen.sensors.find(x => x.id === id);
      if (!s) { unknown.push(id); return; }
      if (typeof r.temp === 'number') { s.temp = +r.temp.toFixed(1); s.history = (s.history || []).concat(s.temp).slice(-24); }
      if (typeof r.battery === 'number') s.battery = r.battery;
      if (typeof r.signal === 'number') s.signal = r.signal;
      s.updated = r.ts || new Date().toISOString();
      updated++;
    });
    const prevState = JSON.parse(JSON.stringify(kitchen));
    ensureBreachAlerts(kitchen);
    const mail = await notify.processNewAlerts(prevState, kitchen);
    kitchen._updatedAt = new Date().toISOString();
    kitchen._updatedBy = 'device';
    db.state = kitchen;
    writeDb(db);
    return apiSend( 200, { ok: true, updated, unknown, notified: mail.length });
  }

  // POST /api/maintenance/update — the repair/maintenance department (or an email-reply
  // webhook) pushes live updates back into a ticket. Auth via x-api-key.
  //   { "ticketId":"mt2", "status":"In progress", "message":"Engineer en route", "by":"CoolFix", "ref":"CF-99" }
  if (route === '/maintenance/update' && req.method === 'POST') {
    const key = req.headers['x-api-key'] || '';
    if (key !== INGEST_KEY) return apiSend( 401, { error: 'Invalid or missing x-api-key' });
    const kitchen = tenants.getDemoState(db);
    if (!kitchen || !Array.isArray(kitchen.maintenance)) return apiSend( 409, { error: 'No tickets yet.' });
    const t = kitchen.maintenance.find(x => x.id === body.ticketId || (body.ref && x.ref === body.ref));
    if (!t) return apiSend( 404, { error: 'Ticket not found' });
    if (body.status) t.status = body.status;
    if (body.ref) t.ref = body.ref;
    if (body.message) t.thread.push({ at: new Date().toISOString(), by: body.by || t.dept || 'Maintenance', type: 'dept', body: String(body.message) });
    kitchen._updatedAt = new Date().toISOString();
    kitchen._updatedBy = 'dept';
    db.state = kitchen;
    writeDb(db);
    return apiSend( 200, { ok: true, ticket: { id: t.id, status: t.status, messages: t.thread.length } });
  }

  // ChatGPT / AI connector (separate kl_ai_ tokens — not user passwords)
  if (route.startsWith('/ai')) {
    const query = Object.fromEntries(url.searchParams.entries());
    const handled = await aiConnector.handleApi({
      db, req, route, method: req.method, body, ip, apiSend, userFromReq, writeDb, query,
    });
    if (handled) return;
  }

  // everything below requires auth
  const me = userFromReq(db, req);
  if (!me) return apiSend(401, { error: 'Session expired — sign in again', code: 'session_expired' });

  if (route === '/me' && req.method === 'GET') {
    billing.ensureTrial(me);
    billing.syncOrgAccess(db, me.email);
    writeDb(db);
    return apiSend( 200, {
      user: publicUser(me),
      trial: billing.getTrialStatus(db, me.email),
      access: billing.canAccess(db, me.email),
    });
  }

  if (route === '/logout' && req.method === 'POST') {
    const token = (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '');
    delete db.tokens[token]; writeDb(db);
    return apiSend( 200, { ok: true });
  }

  // Per-company workspace (tenant-scoped; demo tenant is owner-only)
  if (route === '/state' && req.method === 'GET') {
    if (!tenants.getStateForUser(db, me.email) && tenants.isOwner(me.email)) {
      ensureOwnerWorkspace(db, me.email);
    }
    const state = tenants.getStateForUser(db, me.email);
    if (!state) return apiSend(409, { error: 'No workspace for this account — contact support.' });
    if (tenants.ensureStarterPack(state, db.users[me.email], me.email)) writeDb(db);
    if (tenants.tenantInfo(db, me.email).isDemo) {
      const { mergeExtraSites } = require('./extra-sites');
      if (mergeExtraSites(state)) writeDb(db);
    }
    if (state.org && state.org.name === 'Brigade') {
      state.org.name = 'Kiteline';
      state.org.plan = 'Complete Kiteline';
      writeDb(db);
    }
    if (Array.isArray(state.recipes)) {
      const site = state.currentSite || (state.sites && state.sites[0] && state.sites[0].id);
      if (site && !state.recipes.some((r) => r.site === site) && state.sites && state.sites[0]) {
        state.currentSite = state.sites[0].id;
        writeDb(db);
      }
    }
    return apiSend(200, { state, tenant: tenants.tenantInfo(db, me.email) });
  }
  if (route === '/state' && req.method === 'PUT') {
    const prevState = tenants.getStateForUser(db, me.email);
    if (!prevState) return apiSend(409, { error: 'No workspace for this account' });
    const next = body.state || prevState;
    const prevCopy = JSON.parse(JSON.stringify(prevState));
    ensureBreachAlerts(next);
    const mail = await notify.processNewAlerts(prevCopy, next);
    next._updatedAt = new Date().toISOString();
    next._updatedBy = me.email;
    if (!tenants.setStateForUser(db, me.email, next)) {
      return apiSend(403, { error: 'Cannot save this workspace' });
    }
    writeDb(db);
    return apiSend(200, { ok: true, _updatedAt: next._updatedAt, notified: mail });
  }

  // GET /api/workspace/export — GDPR data export for the signed-in organisation
  if (route === '/workspace/export' && req.method === 'GET') {
    const state = tenants.getStateForUser(db, me.email);
    if (!state) return apiSend(409, { error: 'No workspace to export' });
    const user = db.users[me.email];
    return apiSend(200, {
      exportedAt: new Date().toISOString(),
      service: 'kiteline',
      build: APP_BUILD,
      email: me.email,
      tenant: tenants.tenantInfo(db, me.email),
      profile: user && user.profile ? user.profile : null,
      workspace: state,
    });
  }

  // POST /api/notify/test — send test email and/or SMS
  if (route === '/notify/test' && req.method === 'POST') {
    const kitchen = tenants.getStateForUser(db, me.email);
    if (!kitchen) return apiSend( 409, { error: 'No kitchen state yet' });
    const channel = (body.channel || 'email').toLowerCase();
    if (channel === 'sms') {
      const result = await notify.sendTestSms(kitchen);
      return apiSend( 200, { ok: true, result });
    }
    if (channel === 'both') {
      const email = await notify.sendTestEmail(kitchen);
      const sms = await notify.sendTestSms(kitchen);
      return apiSend( 200, { ok: true, result: { email, sms } });
    }
    const result = await notify.sendTestEmail(kitchen);
    return apiSend( 200, { ok: true, result });
  }

  // GET /api/notify/status — which channels are configured (SMTP / Twilio)
  if (route === '/notify/status' && req.method === 'GET') {
    return apiSend( 200, notify.channelStatus());
  }

  // GET /api/ingest/info — ingest URL + API key for sensor hardware setup (auth required)
  if (route === '/ingest/info' && req.method === 'GET') {
    const host = (process.env.APP_URL || '').replace(/\/$/, '')
      || `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers.host || 'localhost:4001'}`;
    const ownerEmail = (process.env.OWNER_EMAIL || 'shyam_1@hotmail.co.uk').toLowerCase().trim();
    const isOwner = me.email.toLowerCase() === ownerEmail;
    const demoKey = INGEST_KEY === 'kiteline-demo-key';
    return apiSend(200, {
      ingestUrl: `${host}/api/ingest`,
      apiKey: isOwner ? INGEST_KEY : security.maskSecret(INGEST_KEY, 4),
      demoKey,
      keyWarning: demoKey ? 'Set INGEST_KEY on the server — default key is not safe for production.' : null,
    });
  }

  // GET /api/security/status — session and password policy for signed-in users
  if (route === '/security/status' && req.method === 'GET') {
    const token = (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '').trim();
    const entry = db.tokens[token];
    const ownerEmail = (process.env.OWNER_EMAIL || 'shyam_1@hotmail.co.uk').toLowerCase().trim();
    const isOwner = me.email.toLowerCase() === ownerEmail;
    return apiSend(200, {
      sessionExpiresAt: entry && entry.expiresAt ? new Date(entry.expiresAt).toISOString() : null,
      sessionDays: security.sessionDays(),
      passwordMinLength: 10,
      passwordRequiresNumber: true,
      maxLoginAttempts: security.MAX_FAILED,
      lockoutMinutes: Math.round(security.LOCKOUT_MS / 60000),
      accountLocked: security.isLocked(me),
      ingestKeySecure: INGEST_KEY !== 'kiteline-demo-key',
      demoKey: INGEST_KEY === 'kiteline-demo-key',
      rateLimitEnabled: true,
      emailVerification: emailVerificationRequired(),
      emailConfigured: notify.smtpConfigured(),
      isOwner,
    });
  }

  // GET /api/backup — owner-only full database export (users, kitchen state, registrations)
  if (route === '/backup' && req.method === 'GET') {
    const ownerEmail = (process.env.OWNER_EMAIL || 'shyam_1@hotmail.co.uk').toLowerCase().trim();
    if (me.email.toLowerCase() !== ownerEmail) return apiSend(403, { error: 'Owner only' });
    return apiSend(200, {
      exportedAt: new Date().toISOString(),
      service: 'kiteline',
      build: APP_BUILD,
      db: {
        users: db.users,
        subscriptions: db.subscriptions || {},
        registrations: db.registrations || [],
        tenants: db.tenants || {},
        state: tenants.getDemoState(db),
        waitlist: waitlist.read(),
        auditLog: (db.auditLog || []).slice(0, 200),
      },
    });
  }

  // GET /api/security/audit — owner-only recent auth events
  if (route === '/security/audit' && req.method === 'GET') {
    const ownerEmail = (process.env.OWNER_EMAIL || 'shyam_1@hotmail.co.uk').toLowerCase().trim();
    if (me.email.toLowerCase() !== ownerEmail) return apiSend(403, { error: 'Owner only' });
    return apiSend(200, { entries: (db.auditLog || []).slice(0, 50) });
  }

  // GET /api/registrations — owner-only new signups
  if (route === '/registrations' && req.method === 'GET') {
    const ownerEmail = (process.env.OWNER_EMAIL || 'shyam_1@hotmail.co.uk').toLowerCase().trim();
    if (me.email.toLowerCase() !== ownerEmail) return apiSend(403, { error: 'Owner only' });
    return apiSend(200, { entries: (db.registrations || []).slice(0, 50) });
  }

  // GET /api/waitlist — owner-only full list (see who wants to buy what)
  if (route === '/waitlist' && req.method === 'GET') {
    const ownerEmail = (process.env.OWNER_EMAIL || 'shyam_1@hotmail.co.uk').toLowerCase().trim();
    if (me.email.toLowerCase() !== ownerEmail) return apiSend( 403, { error: 'Owner only' });
    const list = waitlist.read();
    return apiSend( 200, { entries: list, summary: waitlist.summary(list) });
  }

  // GET /api/billing/status — current user's subscription
  if (route === '/billing/status' && req.method === 'GET') {
    billing.ensureTrial(me);
    billing.syncOrgAccess(db, me.email);
    writeDb(db);
    const sub = billing.getSubscription(db, me.email);
    const kitchen = tenants.getStateForUser(db, me.email);
    const teamCount = (kitchen && kitchen.team && kitchen.team.length) || 0;
    const maxUsers = billing.getUserLimit(db, me.email);
    const trial = billing.getTrialStatus(db, me.email);
    return apiSend( 200, {
      enabled: billing.isConfigured(),
      plans: billing.planCatalog(),
      teamCount,
      maxUsers,
      trial,
      trialDays: billing.TRIAL_DAYS,
      subscription: sub || { status: 'none', plan: null },
    });
  }

  // POST /api/billing/portal — Stripe customer portal (manage/cancel)
  if (route === '/billing/portal' && req.method === 'POST') {
    if (!billing.isConfigured()) return apiSend( 503, { error: 'Billing not configured' });
    try {
      const result = await billing.createPortalSession(me.email, db);
      return apiSend( 200, result);
    } catch (e) {
      return apiSend( 400, { error: e.message || 'Portal failed' });
    }
  }

  // --- Recipe AI (per-company: Kiteline subscription, BYOK, or owner grant) ---
  if (route === '/recipe-ai/status' && req.method === 'GET') {
    return apiSend(200, recipeAiAccess.getStatus(db, me.email));
  }
  if (route === '/recipe-ai/settings' && req.method === 'PUT') {
    try {
      if (body.removeKey) {
        const st = recipeAiAccess.removeOwnKey(db, me.email);
        writeDb(db);
        return apiSend(200, { ok: true, status: st });
      }
      if (body.openaiApiKey) {
        const st = recipeAiAccess.saveOwnKey(db, me.email, body.openaiApiKey);
        writeDb(db);
        security.audit(db, 'recipe_ai_byok', { ip, email: me.email });
        return apiSend(200, { ok: true, status: st, message: 'Your OpenAI key saved — OpenAI will bill your company directly.' });
      }
      return apiSend(400, { error: 'Send openaiApiKey or removeKey: true' });
    } catch (e) {
      return apiSend(400, { error: e.message || 'Could not save key' });
    }
  }
  if (route === '/recipe-ai/checkout' && req.method === 'POST') {
    try {
      const result = await billing.createRecipeAiCheckout({ email: me.email });
      return apiSend(200, result);
    } catch (e) {
      return apiSend(400, { error: e.message || 'Checkout failed' });
    }
  }
  if (route === '/recipe-ai/grant' && req.method === 'POST') {
    const ownerEmail = (process.env.OWNER_EMAIL || 'shyam_1@hotmail.co.uk').toLowerCase().trim();
    if (me.email.toLowerCase() !== ownerEmail) return apiSend(403, { error: 'Owner only' });
    const target = (body.email || '').toLowerCase().trim();
    if (!target) return apiSend(400, { error: 'Customer email required' });
    try {
      const st = recipeAiAccess.grantAccess(db, target, body.enable !== false);
      security.audit(db, 'recipe_ai_grant', { ip, email: me.email, target, enable: body.enable !== false });
      writeDb(db);
      return apiSend(200, { ok: true, status: st });
    } catch (e) {
      return apiSend(400, { error: e.message || 'Grant failed' });
    }
  }
  if (route.startsWith('/recipe-ai/') && req.method === 'POST') {
    const rlAi = security.checkRateLimit(req, 'recipe-ai');
    if (!rlAi.ok) return apiSend(429, { error: 'Too many AI requests. Try again later.', code: 'rate_limited', retryAfter: rlAi.retryAfter });
    const action = route.replace(/^\/recipe-ai\//, '');
    const access = recipeAiAccess.resolveAccess(db, me.email, action);
    if (!access.ok) return apiSend(403, { error: access.error, status: access.status });
    try {
      let result;
      if (action === 'ingredients') result = await recipeAi.suggestIngredients(body, access.apiKey);
      else if (action === 'parse-ingredients') result = await recipeAi.parseIngredients(body, access.apiKey);
      else if (action === 'method') result = await recipeAi.generateMethod(body, access.apiKey);
      else if (action === 'image') result = await recipeAi.generateImage(body, access.apiKey);
      else return apiSend(404, { error: 'Unknown recipe AI action' });
      recipeAiAccess.recordUsage(db, me.email, action);
      security.audit(db, 'recipe_ai_use', { ip, email: me.email, action, billTo: access.billTo });
      writeDb(db);
      return apiSend(200, result);
    } catch (e) {
      console.error('[recipe-ai]', action, e.message);
      return apiSend(400, { error: e.message || 'AI request failed' });
    }
  }

  return apiSend( 404, { error: 'Unknown API route' });
}

/* ---------------- static + routing ---------------- */
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (req.method === 'OPTIONS') {
    res.writeHead(204, security.securityHeaders({
      'Access-Control-Allow-Origin': security.corsOrigin(req, isProd),
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    }));
    return res.end();
  }

  try {
    // Health check (for uptime monitors / load balancers)
    if (url.pathname === '/health' || url.pathname === '/api/health') {
      return send(res, 200, { ok: true, service: 'kiteline', build: APP_BUILD, uptime: Math.round(process.uptime()), now: new Date().toISOString() }, null, req);
    }

    // One-click email activation (no JavaScript router needed)
    if (url.pathname === '/activate' && req.method === 'GET') {
      const db = readDb();
      const token = url.searchParams.get('token') || '';
      const emailHint = url.searchParams.get('email') || '';
      const ip = security.clientIp(req);
      const result = completeEmailVerification(db, token, emailHint, ip);
      res.writeHead(200, security.securityHeaders({ 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }));
      return res.end(activateHtml(result));
    }

    // Stripe webhook needs raw body (before JSON parser in handleApi)
    if (url.pathname === '/api/billing/webhook' && req.method === 'POST') {
      const raw = await readRawBody(req);
      const sig = req.headers['stripe-signature'] || '';
      const db = readDb();
      const result = await billing.handleWebhook(raw, sig, db, writeDb);
      return send(res, result.ok ? 200 : 400, result, null, req);
    }

    if (url.pathname.startsWith('/api/')) return await handleApi(req, res, url);

    if (url.pathname === '/mcp') {
      if (req.method === 'GET' || req.method === 'HEAD') {
        return send(res, 200, aiConnector.mcpInfo(), null, req);
      }
      if (req.method === 'POST') {
        const body = await readBody(req);
        const db = readDb();
        const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').toString().split(',')[0].trim();
        const result = await aiConnector.handleMcp({
          db, req, body, ip, writeDb,
          userFromReq,
        });
        return send(res, result.status || 200, result.body, null, req);
      }
      return send(res, 405, { error: 'Method not allowed' }, null, req);
    }

    // Kiteline marketing site at "/"
    if (url.pathname === '/' || url.pathname === '') return serveFile(res, path.join(ROOT, 'site', 'index.html'));

    // One-click owner sign-in (demo mode only — bypasses cached login UI)
    if (url.pathname === '/app/owner-login' && req.method === 'GET') {
      if (!DEMO_MODE) {
        res.writeHead(302, security.securityHeaders({ Location: '/app', 'Cache-Control': 'no-store' }));
        return res.end();
      }
      const db = readDb();
      const next = (url.searchParams.get('next') || url.searchParams.get('hash') || '').replace(/^#/, '');
      const html = demoOwnerLoginHtml(db, next || 'home');
      res.writeHead(200, security.securityHeaders({ 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }));
      return res.end(html);
    }

    // App at "/app" — serve SPA for all /app/* paths (hash router + deep links)
    if (url.pathname === '/app' || url.pathname.startsWith('/app/')) {
      return serveAppIndex(res);
    }

    // Vedanta Staff Rota (static site under site/vedanta-rota/)
    if (url.pathname === '/vedanta-rota' || url.pathname === '/vedanta-rota/') {
      return serveFile(res, path.join(ROOT, 'site', 'vedanta-rota', 'index.html'));
    }

    // Vedanta Ordering System (PWA under site/vedanta-ordering/)
    if (url.pathname === '/vedanta-ordering' || url.pathname === '/vedanta-ordering/') {
      return serveFile(res, path.join(ROOT, 'site', 'vedanta-ordering', 'index.html'));
    }

    // Menu Creator (printable menus PWA under site/menu-creator/)
    if (url.pathname === '/menu-creator' || url.pathname === '/menu-creator/') {
      return serveFile(res, path.join(ROOT, 'site', 'menu-creator', 'index.html'));
    }
    if (url.pathname === '/menu-creator/service-worker.js') {
      res.writeHead(200, security.securityHeaders({
        'Content-Type': 'text/javascript',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Service-Worker-Allowed': '/menu-creator/',
      }));
      try {
        return res.end(fs.readFileSync(path.join(ROOT, 'site', 'menu-creator', 'service-worker.js')));
      } catch {
        return send(res, 404, { error: 'Not found' }, null, req);
      }
    }

    // Kitline Academy (static site under site/academy/)
    if (url.pathname === '/academy' || url.pathname === '/academy/') {
      return serveFile(res, path.join(ROOT, 'site', 'academy', 'index.html'));
    }
    if (url.pathname === '/academy/learn' || url.pathname.startsWith('/academy/learn/')) {
      return serveFile(res, path.join(ROOT, 'site', 'academy', 'learn.html'));
    }
    if (url.pathname === '/academy/staff' || url.pathname === '/academy/staff/') {
      return serveFile(res, path.join(ROOT, 'site', 'academy', 'staff.html'));
    }
    if (url.pathname === '/academy/staff.html') {
      return serveFile(res, path.join(ROOT, 'site', 'academy', 'staff.html'));
    }
    if (url.pathname === '/academy/admin' || url.pathname === '/academy/admin/') {
      return serveFile(res, path.join(ROOT, 'site', 'academy', 'admin.html'));
    }

    // Static files (css, js, marketing pages). Try root first.
    let target = safeJoin(ROOT, url.pathname);
    if (isExistingFile(target)) return serveFile(res, target);

    let siteTarget = safeJoin(path.join(ROOT, 'site'), url.pathname);
    if (isExistingFile(siteTarget)) return serveFile(res, siteTarget);

    return send(res, 404, { error: 'Not found' }, null, req);
  } catch (e) {
    return send(res, 500, { error: String(e && e.message || e) }, null, req);
  }
});

bootstrapDemoKitchen();
bootstrapProductionDb();
vedantaReports.startScheduler();

academyStore.init().then(async (ok) => {
  const db = readDb();
  if (ok) {
    await academyStore.migrateFromJson(db);
  }
  bootstrapAcademyEmailVerification(db);
  writeDb(db);
}).catch((e) => console.warn('[academy] init failed:', e.message));

// Listen on several ports locally; single PORT in production (Render, Railway, etc.)
const envPorts = isProd ? [] : (process.env.PORTS || '').split(',').map(s => parseInt(s.trim(), 10)).filter(Boolean);
const PORTS = isProd
  ? [Number(process.env.PORT) || 4000]
  : Array.from(new Set([Number(PORT), ...envPorts, 4000, 4001, 4002]));
const HOST = process.env.HOST || '0.0.0.0';

function lanIp() {
  const os = require('os');
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return null;
}

console.log('\n  Kiteline — Kitchen Operations Platform');
console.log('  ----------------------------------');
const mobileIp = lanIp();
PORTS.forEach((p, i) => {
  const srv = (i === 0) ? server : http.createServer(server.listeners('request')[0]);
  srv.on('error', (e) => {
    if (e.code === 'EADDRINUSE') console.log('  (port ' + p + ' already in use — skipped)');
    else console.error(e);
  });
  srv.listen(p, HOST, () => {
    if (isProd) {
      console.log('  Live: ' + (process.env.APP_URL || 'https://kiteline.uk').replace(/\/$/, '') + '/app');
    } else {
      console.log('  PC:     http://localhost:' + p + '/app');
      if (mobileIp) console.log('  Phone:  http://' + mobileIp + ':' + p + '/app  (same Wi‑Fi)');
    }
    if (i === PORTS.length - 1) {
      if (DEMO_MODE) console.log('\n  Demo mode — any login creates/updates an account.');
      else console.log('\n  Production auth — use your owner credentials (OWNER_EMAIL / OWNER_PASSWORD).');
      if (!isProd) console.log('  Press Ctrl+C to stop.');
      console.log('');
    }
  });
});

// Keep the process alive and log fatal errors instead of crashing silently.
process.on('uncaughtException', (e) => console.error('Uncaught exception:', e));
process.on('unhandledRejection', (e) => console.error('Unhandled rejection:', e));
