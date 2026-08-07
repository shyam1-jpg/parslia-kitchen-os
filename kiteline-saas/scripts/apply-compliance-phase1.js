#!/usr/bin/env node
'use strict';
/**
 * Apply Kiteline Compliance Phase 1 into a kitline1 checkout.
 * Usage: node scripts/apply-compliance-phase1.js /path/to/kitline1
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const target = process.argv[2];
if (!target || !fs.existsSync(path.join(target, 'index.html'))) {
  console.error('Usage: node scripts/apply-compliance-phase1.js /path/to/kitline1');
  process.exit(1);
}
const abs = path.resolve(target);
const BUILD = '2026-08-07-compliance-p1';

function cp(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

cp(
  path.join(root, 'runtime', 'js', 'compliance-phase1.js'),
  path.join(abs, 'js', 'compliance-phase1.js')
);
cp(
  path.join(root, 'runtime', 'js', 'compliance-phase1-views.js'),
  path.join(abs, 'js', 'compliance-phase1-views.js')
);

// Schema into saas/
const schemaSrc = path.join(root, 'schema', '005_compliance_phase1.sql');
const schemaDest = path.join(abs, 'saas', 'schema', '005_compliance_phase1.sql');
if (fs.existsSync(path.dirname(path.join(abs, 'saas', 'schema')))) {
  cp(schemaSrc, schemaDest);
} else {
  fs.mkdirSync(path.join(abs, 'saas', 'schema'), { recursive: true });
  cp(schemaSrc, schemaDest);
}
cp(
  path.join(root, 'docs', 'PHASE_1_COMPLIANCE.md'),
  path.join(abs, 'saas', 'docs', 'PHASE_1_COMPLIANCE.md')
);

// index.html — script tags
const indexPath = path.join(abs, 'index.html');
let index = fs.readFileSync(indexPath, 'utf8');
if (!index.includes('compliance-phase1.js')) {
  index = index.replace(
    '<script src="/js/compliance-views.js',
    '<script src="/js/compliance-phase1.js?v=1"></script>\n  <script src="/js/compliance-phase1-views.js?v=1"></script>\n  <script src="/js/compliance-views.js'
  );
}
index = index.replace(/var build = '[^']+';/, `var build = '${BUILD}';`);
fs.writeFileSync(indexPath, index);

// app.js — nav + route mapping for compliance-p1*
const appPath = path.join(abs, 'js', 'app.js');
let app = fs.readFileSync(appPath, 'utf8');
if (!app.includes("id:'compliance-p1'")) {
  app = app.replace(
    "{ id:'compliance', label:'Kitchen Compliance', icon:'shield' },",
    "{ id:'compliance', label:'Kitchen Compliance', icon:'shield' },\n    { id:'compliance-p1', label:'Compliance checks', icon:'check' },"
  );
}
if (!app.includes("compliance-p1:'Staff'")) {
  app = app.replace(
    "compliance:'Staff',",
    "compliance:'Staff',\n    'compliance-p1':'Staff',"
  );
}
// Route id normalisation for compliance-p1-* hashes
if (!app.includes("route.startsWith('compliance-p1')")) {
  app = app.replace(
    "if (route === 'compliance' || route.startsWith('compliance-')) return 'compliance';",
    "if (route === 'compliance-p1' || route.startsWith('compliance-p1')) return 'compliance-p1';\n    if (route === 'compliance' || route.startsWith('compliance-')) return 'compliance';"
  );
}
// View lookup: Views['compliance-p1'] handles all via Views registry — ensure render uses dynamic handler
if (!app.includes('CompliancePhase1Views') && app.includes('this.route')) {
  // Patch render view resolution if it uses Views[this.route] only
  if (app.includes('Views[this.route]') && !app.includes("startsWith('compliance-p1') && Views['compliance-p1']")) {
    app = app.replace(
      /Views\[this\.route\]/g,
      "(String(this.route).startsWith('compliance-p1') && Views['compliance-p1'] ? Views['compliance-p1'] : Views[this.route])"
    );
  }
}
fs.writeFileSync(appPath, app);

// server build id if present
const serverPath = path.join(abs, 'server', 'server.js');
if (fs.existsSync(serverPath)) {
  let server = fs.readFileSync(serverPath, 'utf8');
  if (/const APP_BUILD = '[^']+';/.test(server)) {
    server = server.replace(/const APP_BUILD = '[^']+';/, `const APP_BUILD = '${BUILD}';`);
    fs.writeFileSync(serverPath, server);
  }
}

console.log('Applied Compliance Phase 1 to', abs);
console.log('Open app → Compliance checks (#compliance-p1-dashboard)');
console.log('Postgres: apply saas/schema/005_compliance_phase1.sql when ready');
