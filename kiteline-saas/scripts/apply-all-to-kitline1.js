#!/usr/bin/env node
'use strict';
/**
 * Apply ALL Kiteline SaaS phases (A prep + B/C/D + E hardening) into kitline1.
 *
 * Usage:
 *   node scripts/apply-all-to-kitline1.js /path/to/kitline1
 *
 * Order:
 *   1) Security hardening patch (E)
 *   2) Tenancy API + screens + Stock/Orders (B/C/D)
 *   3) Copy schema + docs into kitline1/saas/ (A artifacts for Neon apply)
 */
const fs = require('fs');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const root = path.join(__dirname, '..');
const target = process.argv[2];
if (!target || !fs.existsSync(path.join(target, 'server', 'server.js'))) {
  console.error('Usage: node scripts/apply-all-to-kitline1.js /path/to/kitline1');
  process.exit(1);
}

const absTarget = path.resolve(target);
const secPatch = path.join(root, 'deploy', 'kitline1-security-hardening.patch');

function alreadyHardened() {
  const server = fs.readFileSync(path.join(absTarget, 'server', 'server.js'), 'utf8');
  return server.includes('Demo mode ONLY when explicitly enabled')
    || server.includes('VEDANTA_API_KEY')
    || fs.existsSync(path.join(absTarget, 'scripts', 'security-smoke-test.js'));
}

console.log('== Phase E: security hardening ==');
if (alreadyHardened()) {
  console.log('Skip: already looks hardened');
} else {
  const r = spawnSync('git', ['apply', secPatch], { cwd: absTarget, encoding: 'utf8' });
  if (r.status !== 0) {
    console.error(r.stdout || '');
    console.error(r.stderr || '');
    console.error('ERROR: security patch failed. Resolve conflicts then re-run.');
    process.exit(r.status || 1);
  }
  // Also drop smoke test helper into kitline1 if patch didn't
  const smokeSrc = path.join(root, 'deploy', 'security-smoke-test.js');
  const smokeDst = path.join(absTarget, 'scripts', 'security-smoke-test.js');
  if (fs.existsSync(smokeSrc) && !fs.existsSync(smokeDst)) {
    fs.mkdirSync(path.dirname(smokeDst), { recursive: true });
    fs.copyFileSync(smokeSrc, smokeDst);
  }
  console.log('Applied security hardening patch');
}

console.log('== Phase B/C/D: tenancy + screens + stock/orders ==');
execFileSync(process.execPath, [path.join(root, 'scripts', 'apply-bc-to-kitline1.js'), absTarget], {
  stdio: 'inherit',
});

console.log('== Phase A: copy schema package into kitline1/saas ==');
function cpDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const name of fs.readdirSync(src)) {
    const s = path.join(src, name);
    const d = path.join(dest, name);
    if (fs.statSync(s).isDirectory()) cpDir(s, d);
    else fs.copyFileSync(s, d);
  }
}
const saasDir = path.join(absTarget, 'saas');
cpDir(path.join(root, 'schema'), path.join(saasDir, 'schema'));
cpDir(path.join(root, 'docs'), path.join(saasDir, 'docs'));
fs.copyFileSync(path.join(root, 'scripts', 'apply-schema.sh'), path.join(saasDir, 'apply-schema.sh'));
fs.copyFileSync(path.join(root, 'scripts', 'verify-schema.sh'), path.join(saasDir, 'verify-schema.sh'));
fs.copyFileSync(path.join(root, 'tests', 'isolation_test.sql'), path.join(saasDir, 'isolation_test.sql'));
fs.copyFileSync(path.join(root, 'deploy', 'PRODUCTION_CHECKLIST.md'), path.join(saasDir, 'PRODUCTION_CHECKLIST.md'));
fs.chmodSync(path.join(saasDir, 'apply-schema.sh'), 0o755);
fs.chmodSync(path.join(saasDir, 'verify-schema.sh'), 0o755);

console.log(`
OK: All phases applied to ${absTarget}

Next (you must do — this agent cannot push kitline1 / Render):
  1) Commit on kitline1 and push
  2) Neon:  DATABASE_URL=... ./saas/apply-schema.sh
  3) Render env from saas/PRODUCTION_CHECKLIST.md  (DEMO_MODE=false, rotate secrets)
  4) Deploy Render → kiteline.uk
  5) Smoke: curl https://kiteline.uk/api/health   # build should include saas-bcd
`);
