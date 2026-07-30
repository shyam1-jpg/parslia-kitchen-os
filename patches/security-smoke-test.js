#!/usr/bin/env node
/* Kiteline security smoke tests — run against a local or staging server.
 * Usage: BASE_URL=http://127.0.0.1:4011 node scripts/security-smoke-test.js
 */
'use strict';

const BASE = (process.env.BASE_URL || 'http://127.0.0.1:4011').replace(/\/$/, '');
const KEY = process.env.VEDANTA_API_KEY || '';

async function req(method, path, { body, headers, expect } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: Object.assign({ 'Content-Type': 'application/json' }, headers || {}),
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try { data = JSON.parse(text); } catch { data = text; }
  if (expect != null && res.status !== expect) {
    throw new Error(`${method} ${path} expected ${expect} got ${res.status}: ${text.slice(0, 200)}`);
  }
  return { status: res.status, data, headers: res.headers };
}

async function main() {
  const results = [];
  const ok = (name, pass, detail) => {
    results.push({ name, pass, detail });
    console.log((pass ? 'PASS' : 'FAIL') + '  ' + name + (detail ? ' — ' + detail : ''));
  };

  // 1) Unauthenticated Vedanta store must not be public
  {
    const r = await req('GET', '/api/vedanta/store');
    ok('Vedanta store requires API key', r.status === 401 || r.status === 503, 'status=' + r.status);
  }

  // 2) Unauthenticated reports send blocked
  {
    const r = await req('POST', '/api/vedanta/reports/send', { body: { type: 'weekly' } });
    ok('Vedanta reports require API key', r.status === 401 || r.status === 503, 'status=' + r.status);
  }

  // 3) Demo auto-login disabled in production-like config
  {
    const cfg = await req('GET', '/api/config', { expect: 200 });
    ok('DEMO_MODE is false (or flagged)', cfg.data.demo === false, 'demo=' + cfg.data.demo);
  }

  // 4) Owner one-click login disabled when demo off
  {
    const r = await fetch(BASE + '/app/owner-login', { redirect: 'manual' });
    ok('Owner one-click login blocked', r.status === 302 || r.status === 401 || r.status === 403, 'status=' + r.status);
  }

  // 5) Security headers present
  {
    const r = await fetch(BASE + '/app');
    ok('CSP header', !!r.headers.get('content-security-policy'));
    ok('X-Content-Type-Options', r.headers.get('x-content-type-options') === 'nosniff');
    ok('X-Frame-Options', (r.headers.get('x-frame-options') || '').toUpperCase() === 'DENY');
    ok('Referrer-Policy', !!r.headers.get('referrer-policy'));
  }

  // 6) Source maps not public
  {
    const r = await req('GET', '/js/app.js.map');
    ok('Source map blocked', r.status === 404, 'status=' + r.status);
  }

  // 7) Protected APIs require session
  for (const path of ['/api/state', '/api/backup', '/api/registrations', '/api/workspace/export']) {
    const r = await req('GET', path);
    ok(path + ' unauth blocked', r.status === 401, 'status=' + r.status);
  }

  // 8) Cross-tenant isolation
  const suffix = Date.now().toString(36);
  const regA = await req('POST', '/api/register', {
    body: {
      email: `sec-a-${suffix}@example.com`, password: 'SecureTest99a', name: 'Sec A',
      profile: { firstName: 'A', lastName: 'A', businessName: 'Sec Alpha', city: 'London', postcode: 'E1 1AA', termsAccepted: true },
    },
  });
  const regB = await req('POST', '/api/register', {
    body: {
      email: `sec-b-${suffix}@example.com`, password: 'SecureTest99b', name: 'Sec B',
      profile: { firstName: 'B', lastName: 'B', businessName: 'Sec Beta', city: 'Leeds', postcode: 'LS1 1AA', termsAccepted: true },
    },
  });
  if (!regA.data.token || !regB.data.token) {
    ok('Register two businesses', false, JSON.stringify(regA.data).slice(0, 120));
  } else {
    const stA = await req('GET', '/api/state', { headers: { Authorization: 'Bearer ' + regA.data.token }, expect: 200 });
    const stB = await req('GET', '/api/state', { headers: { Authorization: 'Bearer ' + regB.data.token }, expect: 200 });
    const idA = stA.data.state && stA.data.state._tenantId;
    const idB = stB.data.state && stB.data.state._tenantId;
    ok('Separate tenant IDs', !!(idA && idB && idA !== idB), idA + ' vs ' + idB);

    const hijack = Object.assign({}, stA.data.state, { _tenantId: idB, org: Object.assign({}, stA.data.state.org, { name: 'HIJACK' }) });
    await req('PUT', '/api/state', { headers: { Authorization: 'Bearer ' + regA.data.token }, body: { state: hijack }, expect: 200 });
    const stA2 = await req('GET', '/api/state', { headers: { Authorization: 'Bearer ' + regA.data.token }, expect: 200 });
    const stB2 = await req('GET', '/api/state', { headers: { Authorization: 'Bearer ' + regB.data.token }, expect: 200 });
    ok('Tenant ID spoof ignored', stA2.data.state._tenantId === idA, stA2.data.state._tenantId);
    ok('Other business unchanged', stB2.data.state.org.name !== 'HIJACK', stB2.data.state.org.name);

    const bak = await req('GET', '/api/backup', { headers: { Authorization: 'Bearer ' + regA.data.token } });
    ok('Non-owner backup blocked', bak.status === 403, 'status=' + bak.status);
  }

  // 9) Optional: authenticated Vedanta with key
  if (KEY) {
    const r = await req('GET', '/api/vedanta/store', { headers: { 'x-api-key': KEY }, expect: 200 });
    ok('Vedanta store with key', r.status === 200);
  }

  const failed = results.filter((r) => !r.pass);
  console.log('\n' + (results.length - failed.length) + '/' + results.length + ' passed');
  if (failed.length) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
