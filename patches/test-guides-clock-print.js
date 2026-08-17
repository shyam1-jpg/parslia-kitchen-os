#!/usr/bin/env node
/* Lightweight checks for clock PIN restore + help guides + print helpers. */
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const root = path.join(__dirname, '..');

function loadBrowserish(rel) {
  const src = fs.readFileSync(path.join(root, rel), 'utf8');
  const sandbox = {
    window: {},
    console,
    location: { origin: 'http://localhost', hash: '#clock' },
  };
  sandbox.window = sandbox;
  // eslint-disable-next-line no-new-func
  const fn = new Function('window', 'console', 'location', src + '\n;return window;');
  return fn(sandbox, console, sandbox.location);
}

// help-guides is an IIFE attaching to window.HelpGuides
const hgWin = { UI: { escapeHtml: (x) => String(x), icon: () => '' } };
{
  const src = fs.readFileSync(path.join(root, 'js/help-guides.js'), 'utf8');
  // eslint-disable-next-line no-new-func
  new Function('window', src)(hgWin);
}
assert.ok(hgWin.HelpGuides, 'HelpGuides loaded');
assert.ok(hgWin.HelpGuides.guideById('clock-pin'));
assert.ok(hgWin.HelpGuides.guideById('equipment-maintenance'));
assert.ok(hgWin.HelpGuides.howToPanelHtml(['clock-pin']).includes('How to use this page'));
assert.ok(hgWin.HelpGuides.searchGuides('freezer').length >= 1);
assert.ok(hgWin.HelpGuides.searchGuides('coloration').length >= 1);

// Store / Rota — extract and eval Rota helpers by running store with stubs
const storeSrc = fs.readFileSync(path.join(root, 'js/store.js'), 'utf8');
const storeWin = {
  localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
  Api: null,
};
// Minimal: only evaluate the Rota section by constructing db and calling exported API after load
// store.js expects window and may call seed — wrap carefully
global.window = storeWin;
global.document = undefined;
try {
  // eslint-disable-next-line no-eval
  eval(storeSrc);
} catch (e) {
  // store may reference document during seed; continue if Rota attached
}
assert.ok(storeWin.Rota, 'Rota attached');
const db = {
  currentSite: 'site_grove',
  team: [
    { id: 'u_sarah', name: 'Sarah Mitchell', siteId: 'site_grove', access: 'Admin' },
    { id: 'u_james', name: 'James Okafor', siteId: 'site_grove', access: 'Staff' },
    { id: 'u_shyam', name: 'Shyam', siteId: 'site_vedanta', access: 'Admin', clockPin: '9999' },
  ],
  rotaShifts: [{ site: 'site_grove', staffId: 'u_sarah', date: '2099-01-01', status: 'scheduled' }],
  clockSessions: [],
  attendanceLog: [],
};
storeWin.Rota.ensureDemo(db);
assert.strictEqual(db.team[0].clockPin, '1234', 'Sarah demo PIN restored');
assert.strictEqual(db.team[1].clockPin, '2345', 'James demo PIN restored');
assert.strictEqual(db.team[2].clockPin, '1001', 'Owner PIN restored even if stale');

const bad = storeWin.Rota.toggleByPin(db, 'site_grove', 'demo1234', 'test');
assert.strictEqual(bad.ok, false, 'login password must fail');
assert.ok(/Wrong PIN|kitchen PIN/i.test(bad.reason), 'clear wrong-PIN message');

const ok = storeWin.Rota.toggleByPin(db, 'site_grove', '1234', 'test');
assert.strictEqual(ok.ok, true, 'Sarah 1234 clocks in');
assert.strictEqual(ok.action, 'in');
assert.ok(storeWin.Rota.isClockedIn(db, 'site_grove', 'u_sarah'));

const out = storeWin.Rota.toggleByPin(db, 'site_grove', '1234', 'test');
assert.strictEqual(out.ok, true);
assert.strictEqual(out.action, 'out');

// NAV includes clock/rota
const appSrc = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
assert.ok(appSrc.includes("id:'clock'"), 'NAV has clock');
assert.ok(appSrc.includes("id:'rota'"), 'NAV has rota');

// index wires help-guides
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
assert.ok(index.includes('help-guides.js'), 'index loads help-guides');

// print helpers present
const views = fs.readFileSync(path.join(root, 'js/views.js'), 'utf8');
assert.ok(views.includes('printWorkflowStatusReport'), 'detailed workflow print');
assert.ok(views.includes('Print detailed report'), 'cleaning/haccp print button');
const cv = fs.readFileSync(path.join(root, 'js/compliance-views.js'), 'utf8');
assert.ok(cv.includes('FIELD_LABELS'), 'human field labels');
assert.ok(cv.includes('Print detailed record'), 'detailed record print');

console.log('test-guides-clock-print: OK');
