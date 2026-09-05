#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const dropIn = path.join(root, 'drop-in');
const dest = path.resolve(process.argv[2] || process.env.KITLINE1_DIR || '');

if (!dest) {
  console.error('Usage: node scripts/apply-to-kitline1.js /path/to/kitline1');
  process.exit(1);
}
if (!fs.existsSync(path.join(dest, 'server', 'server.js'))) {
  console.error('Not a kitline1 checkout:', dest);
  process.exit(1);
}

function copyFile(rel) {
  const from = path.join(dropIn, rel);
  const to = path.join(dest, rel);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
  console.log('copied', rel);
}

[
  'server/billing.js',
  'server/academy/billing.js',
  'server/academy/SETUP.md',
  'server/server.js',
  'server/.env.example',
  'js/api.js',
  'js/views.js',
  'site/index.html',
  'site/pricing.html',
  'site/billing-success.html',
  'render.yaml',
].forEach(copyFile);

console.log('\nApplied Kiteline payment system to', dest);
console.log('Next: set STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET on Render, then restart.');
