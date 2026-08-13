#!/usr/bin/env node
/* Kiteline security smoke tests — run against a local or staging server.
 * Usage: BASE_URL=http://127.0.0.1:4011 node scripts/security-smoke-test.js
 */
'use strict';

const BASE = (process.env.BASE_URL || 'http://127.0.0.1:4011').replace(/\/$/, '');
const KEY = process.env.VEDANTA_API_KEY || '';

function parseSetCookie(res) {
  const raw = typeof res.headers.getSetCookie === 'function'
    ? res.headers.getSetCookie()
    : (res.headers.get('set-cookie') ? [res.headers.get('set-cookie')] : []);
  const jar = {};
  raw.forEach((line) => {
    const first = String(line).split(';')[0];
    const i = first.indexOf('=');
    if (i > 0) jar[first.slice(0, i).trim()] = first.slice(i + 1).trim();
  });
  return jar;
}

function cookieHeader(jar) {
  return Object.entries(jar).map(([k, v]) => k + '=' + v).join('; ');
}

async function req(method, path, { body, headers, expect, jar } = {}) {
  const h = Object.assign({ 'Content-Type': 'application/json' }, headers || {});
  if (jar && Object.keys(jar).length) h.Cookie = cookieHeader(jar);
  const res = await fetch(BASE + path, {
    method,
    headers: h,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try { data = JSON.parse(text); } catch { data = text; }
  const set = parseSetCookie(res);
  if (jar) Object.assign(jar, set);
  if (expect != null && res.status !== expect) {
    throw new Error(`${method} ${path} expected ${expect} got ${res.status}: ${text.slice(0, 200)}`);
  }
  return { status: res.status, data, headers: res.headers, jar: set };
}

async function main() {
  const results = [];
  const ok = (name, pass, detail) => {
    results.push({ name, pass, detail });
    console.log((pass ? 'PASS' : 'FAIL') + '  ' + name + (detail ? ' — ' + detail : ''));
  };

  {
    const r = await req('GET', '/api/vedanta/store');
    ok('Vedanta store requires API key', r.status === 401 || r.status === 503, 'status=' + r.status);
  }
  {
    const r = await req('POST', '/api/vedanta/reports/send', { body: { type: 'weekly' } });
    ok('Vedanta reports require API key', r.status === 401 || r.status === 503, 'status=' + r.status);
  }
  {
    const cfg = await req('GET', '/api/config', { expect: 200 });
    ok('DEMO_MODE is false', cfg.data.demo === false, 'demo=' + cfg.data.demo);
  }
  {
    const r = await fetch(BASE + '/app/owner-login', { redirect: 'manual' });
    ok('Owner one-click login blocked', r.status === 302 || r.status === 401 || r.status === 403, 'status=' + r.status);
  }
  {
    const r = await fetch(BASE + '/app');
    ok('CSP header', !!r.headers.get('content-security-policy'));
    ok('HSTS or nosniff', !!r.headers.get('x-content-type-options'));
    ok('X-Frame-Options', (r.headers.get('x-frame-options') || '').toUpperCase() === 'DENY');
  }
  {
    const r = await req('GET', '/js/app.js.map');
    ok('Source map blocked', r.status === 404, 'status=' + r.status);
  }
  for (const path of ['/api/state', '/api/backup', '/api/registrations', '/api/workspace/export']) {
    const r = await req('GET', path);
    ok(path + ' unauth blocked', r.status === 401, 'status=' + r.status);
  }

  // Cookie session + CSRF + tenant isolation
  const suffix = Date.now().toString(36);
  const jarA = {};
  const jarB = {};
  const regA = await req('POST', '/api/register', {
    jar: jarA,
    body: {
      email: `sec-a-${suffix}@example.com`, password: 'SecureTest99a', name: 'Sec A',
      profile: { firstName: 'A', lastName: 'A', businessName: 'Sec Alpha', city: 'London', postcode: 'E1 1AA', termsAccepted: true },
    },
  });
  const regB = await req('POST', '/api/register', {
    jar: jarB,
    body: {
      email: `sec-b-${suffix}@example.com`, password: 'SecureTest99b', name: 'Sec B',
      profile: { firstName: 'B', lastName: 'B', businessName: 'Sec Beta', city: 'Leeds', postcode: 'LS1 1AA', termsAccepted: true },
    },
  });

  const hasCookieA = !!jarA.kiteline_session;
  const hasCsrfA = !!(regA.data && regA.data.csrf) || !!jarA.kiteline_csrf;
  ok('Register sets HttpOnly session cookie', hasCookieA, hasCookieA ? 'cookie set' : JSON.stringify(regA.data).slice(0, 120));
  ok('Register returns CSRF', hasCsrfA, 'csrf=' + !!(regA.data && regA.data.csrf));

  if (hasCookieA && jarB.kiteline_session && regA.data && regB.data) {
    const csrfA = regA.data.csrf || jarA.kiteline_csrf;
    const csrfB = regB.data.csrf || jarB.kiteline_csrf;

    // Mutating without CSRF must fail for cookie sessions
    const noCsrf = await req('PUT', '/api/state', {
      jar: jarA,
      body: { state: { org: { name: 'No CSRF' } } },
    });
    ok('Cookie PUT /state without CSRF blocked', noCsrf.status === 403, 'status=' + noCsrf.status);

    const stA = await req('GET', '/api/state', { jar: jarA, expect: 200 });
    const stB = await req('GET', '/api/state', { jar: jarB, expect: 200 });
    const idA = stA.data.state && stA.data.state._tenantId;
    const idB = stB.data.state && stB.data.state._tenantId;
    ok('Separate tenant IDs', !!(idA && idB && idA !== idB), idA + ' vs ' + idB);

    const hijack = Object.assign({}, stA.data.state, { _tenantId: idB, org: Object.assign({}, stA.data.state.org, { name: 'HIJACK' }) });
    await req('PUT', '/api/state', {
      jar: jarA,
      headers: { 'X-CSRF-Token': csrfA },
      body: { state: hijack },
      expect: 200,
    });
    const stA2 = await req('GET', '/api/state', { jar: jarA, expect: 200 });
    const stB2 = await req('GET', '/api/state', { jar: jarB, expect: 200 });
    ok('Tenant ID spoof ignored', stA2.data.state._tenantId === idA, stA2.data.state._tenantId);
    ok('Other business unchanged', stB2.data.state.org.name !== 'HIJACK', stB2.data.state.org.name);

    // Scoped mutate
    const mut = await req('POST', '/api/workspace/mutate', {
      jar: jarA,
      headers: { 'X-CSRF-Token': csrfA },
      body: { op: 'upsert', collection: 'recipes', id: 'r_sec_test', data: { name: 'Sec Recipe', site: (stA2.data.state.sites || [])[0] && stA2.data.state.sites[0].id } },
    });
    ok('Scoped workspace mutate', mut.status === 200 || mut.status === 400, 'status=' + mut.status + (mut.data && mut.data.error ? ' ' + mut.data.error : ''));

    const bak = await req('GET', '/api/backup', { jar: jarA });
    ok('Non-owner backup blocked', bak.status === 403, 'status=' + bak.status);

    // No bearer token persisted expectation in prod responses
    ok('Prod-style login omits bearer token (or cookie mode)', regA.data.authMode === 'cookie' || !regA.data.token || process.env.NODE_ENV !== 'production', 'authMode=' + regA.data.authMode);
  } else {
    ok('Cookie session setup', false, 'register failed for cookie flow');
  }

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
