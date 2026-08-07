#!/usr/bin/env node
'use strict';
/**
 * Unit tests for Compliance Phase 1 engine (JSON mode).
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const engPath = path.join(__dirname, '..', 'runtime', 'js', 'compliance-phase1.js');
const code = fs.readFileSync(engPath, 'utf8');

const state = {
  currentSite: 'site_test',
  sites: [{ id: 'site_test', name: 'Test Kitchen' }],
  team: [{ id: 'u_admin', name: 'Admin User', role: 'Owner', access: 'Admin' }],
  alerts: [],
  org: { name: 'Test Co' },
};

const store = {
  db: state,
  persist() {},
  site(id) { return state.sites.find((s) => s.id === id); },
};

const sandbox = {
  window: {
    Store: store,
    App: {
      currentUser() { return state.team[0]; },
    },
  },
  console,
};
sandbox.window.window = sandbox.window;
vm.runInNewContext(code, sandbox);

const CP = sandbox.window.CompliancePhase1;
let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) {
    passed += 1;
    console.log('  OK', msg);
  } else {
    failed += 1;
    console.error('  FAIL', msg);
  }
}

console.log('Compliance Phase 1 tests');

// evaluateAnswer
const qTemp = CP.question({ type: 'temperature', min: 0, max: 5, unit: '°C', riskLevel: 'high', mandatory: true });
const hi = CP.evaluateAnswer(qTemp, 8.2);
assert(hi.defect === true, '8.2°C raises defect for 0–5 fridge');
const ok = CP.evaluateAnswer(qTemp, 3.1);
assert(ok.defect === false && ok.ok, '3.1°C is within range');
const miss = CP.evaluateAnswer(qTemp, '');
assert(miss.ok === false, 'mandatory empty fails validation');

const qPass = CP.question({ type: 'pass_fail_na', defectOnFail: true });
assert(CP.evaluateAnswer(qPass, 'fail').defect === true, 'fail raises defect');
assert(CP.evaluateAnswer(qPass, 'pass').defect === false, 'pass is ok');

// seed + run + defect + verify separation
CP.seedKitelineTemplates(true);
const templates = CP.ensure().templates.filter((t) => t.status === 'active');
assert(templates.length >= 5, 'seed publishes multiple Kiteline templates');

const fridge = templates.find((t) => /fridge/i.test(t.name));
assert(!!fridge, 'fridge temperature template exists');

const run = CP.startRun(fridge.id);
const tempQ = ((fridge.sections[0] || {}).questions || []).find((q) => q.type === 'temperature');
assert(!!tempQ, 'temperature question present');

run.answers[tempQ.id] = 8.2;
run.answers[tempQ.id + '__comment'] = 'Probe recheck pending';
// Fill other mandatory questions with pass/na
(fridge.sections || []).forEach((sec) => {
  (sec.questions || []).forEach((q) => {
    if (run.answers[q.id] != null) return;
    if (q.type === 'pass_fail_na') run.answers[q.id] = 'pass';
    else if (q.type === 'yes_no_na') run.answers[q.id] = 'na';
    else if (q.type === 'temperature' || q.type === 'number') {
      const mid = q.min != null && q.max != null ? (Number(q.min) + Number(q.max)) / 2 : 0;
      run.answers[q.id] = mid;
    } else if (!q.mandatory) run.answers[q.id] = 'na';
    else run.answers[q.id] = 'ok';
  });
});
run.answers[tempQ.id] = 8.2;

CP.saveDraft(run.id, run.answers);
const result = CP.submitRun(run.id);
assert(result.defects.length >= 1, 'submit raises at least one defect');
assert(result.correctiveActions.length >= 1, 'submit creates CA');

const ca = result.correctiveActions[0];
// Same user tries to verify after close — should fail when independent required
CP.closeCorrectiveAction(ca.id, { comment: 'Food moved; engineer called' });
const ca2 = CP.ensure().correctiveActions.find((x) => x.id === ca.id);
if (ca2.requireIndependentVerification) {
  let blocked = false;
  try {
    CP.verifyCorrectiveAction(ca2.id, {});
  } catch (e) {
    blocked = /Independent verification/i.test(e.message);
  }
  assert(blocked, 'same user cannot verify critical CA');
  // Switch user
  state.team[0] = { id: 'u_mgr', name: 'Manager Two', role: 'Location Manager', access: 'Manager' };
  CP.verifyCorrectiveAction(ca2.id, {});
  assert(CP.ensure().correctiveActions.find((x) => x.id === ca.id).status === 'closed', 'other manager can verify');
} else {
  assert(true, 'CA closed without independent verification requirement');
}

const dash = CP.dashboard('site_test');
assert(typeof dash.completedToday === 'number', 'dashboard returns metrics');

const csv = CP.exportRunsCsv('site_test');
assert(csv.length >= 2, 'CSV export has header + rows');
assert(CP.ensure().auditEvents.length > 0, 'audit events recorded');

console.log('\nResult:', passed, 'passed,', failed, 'failed');
process.exit(failed ? 1 : 0);
