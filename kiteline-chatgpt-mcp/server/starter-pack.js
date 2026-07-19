'use strict';

/**
 * Full one-site starter pack — cloned from The Grove Hotel demo (site_grove)
 * so new registrations see the same templates as the owner demo kitchen.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const STARTER_PACK_VERSION = 2;
const SOURCE_SITE = 'site_grove';

function uid(prefix) {
  return `${prefix}_${crypto.randomBytes(4).toString('hex')}`;
}

function loadDemo() {
  const file = path.join(__dirname, 'demo-state.json');
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function replaceAll(str, from, to) {
  return str.split(from).join(to);
}

function remapJson(obj, map) {
  let json = JSON.stringify(obj);
  Object.entries(map).forEach(([from, to]) => {
    json = replaceAll(json, from, to);
  });
  return JSON.parse(json);
}

function pickSite(arr, siteId, siteKey) {
  if (!Array.isArray(arr)) return [];
  return arr.filter((row) => {
    if (!row) return false;
    if (row[siteKey] === siteId) return true;
    if (siteKey === 'site' && row.siteId === siteId) return true;
    if (siteKey === 'siteId' && row.site === siteId) return true;
    return false;
  });
}

function hoursAgo(h) {
  return new Date(Date.now() - h * 3600000).toISOString();
}

function daysAgo(d) {
  return new Date(Date.now() - d * 86400000).toISOString();
}

/** Full compliance templates (mirrors js/compliance.js seedCompliance for one site). */
function sampleCompliance(siteId, teamId) {
  const u = teamId;
  const sfx = String(siteId || 'site').replace('site_', '');
  const ref = (code, n) => `${code}-${String(n).padStart(4, '0')}`;
  const ago = (d) => new Date(Date.now() - d * 86400000).toISOString();
  const rid = (p) => `${p}_${sfx}_${Math.random().toString(36).slice(2, 7)}`;
  const HACCP_STEPS = [
    { step: 1, hazard: 'Biological — raw poultry', ccp: 'Cook to 75°C core', limit: '≥75°C', monitoring: 'Probe every batch', corrective: 'Continue cooking' },
    { step: 2, hazard: 'Biological — chilled display', ccp: 'Display ≤5°C', limit: '0–5°C', monitoring: '2-hourly temp log', corrective: 'Discard if >5°C for 4h' },
    { step: 3, hazard: 'Allergen cross-contact', ccp: 'Separate prep & utensils', limit: 'No visible contamination', monitoring: 'Visual + colour boards', corrective: 'Re-prep if doubt' },
  ];
  const FSMS_TITLES = [
    'Food Safety Policy', 'Personal Hygiene Policy', 'Cleaning & Disinfection Schedule',
    'Allergen Management Procedure', 'Supplier Approval Procedure', 'Traceability Procedure',
    'Waste Management Procedure', 'Pest Control Procedure', 'Training Matrix',
    'Management Review Record', 'Internal Audit Schedule', 'Corrective Action Procedure',
  ];
  return {
    hsChecks: [
      { id: rid('khs'), ref: ref('KHS', 1), site: siteId, type: 'Daily H&S walkthrough', areas: 'Kitchen, store, dry goods', findings: 'Floor wet near dishwasher — wet-floor sign placed', action: 'Signage checked; mop schedule confirmed', status: 'Closed', by: u, at: ago(1), code: 'KHS', _sample: true },
      { id: rid('khs'), ref: ref('KHS', 2), site: siteId, type: 'Weekly H&S inspection', areas: 'All zones including yard', findings: 'No major issues — PPE stock OK', action: '', status: 'Closed', by: u, at: ago(7), code: 'KHS', _sample: true },
      { id: rid('khs'), ref: ref('KHS', 3), site: siteId, type: 'Opening H&S check', areas: 'Hot line, prep, stores', findings: 'Extractor running; anti-slip mats in place', action: 'Log signed by duty manager', status: 'Closed', by: u, at: ago(0.5), code: 'KHS', _sample: true },
    ],
    riskAssessments: [
      { id: rid('kra'), ref: ref('KRA', 1), site: siteId, area: 'Main kitchen — hot line', hazards: 'Burns, scalds, slips on wet floor', persons: 'Chefs, KP', existing: 'PPE, non-slip boots, splash guards', further: 'Review quarterly', likelihood: 2, severity: 3, risk: 6, residual: 3, reviewDate: ago(-90).slice(0, 10), by: u, at: ago(30), code: 'KRA', status: 'Active', _sample: true },
      { id: rid('kra'), ref: ref('KRA', 2), site: siteId, area: 'Goods-in / stores', hazards: 'Manual handling — heavy crates', persons: 'Stores team', existing: 'Trollies, team lift policy', further: 'Weight labels on delivery notes', likelihood: 2, severity: 3, risk: 6, residual: 2, reviewDate: ago(-60).slice(0, 10), by: u, at: ago(45), code: 'KRA', status: 'Active', _sample: true },
      { id: rid('kra'), ref: ref('KRA', 3), site: siteId, area: 'Knife & mandolin prep', hazards: 'Cuts and lacerations', persons: 'Prep staff', existing: 'Cut gloves, colour-coded boards', further: 'Annual knife skills refresher', likelihood: 3, severity: 2, risk: 6, residual: 3, reviewDate: ago(-120).slice(0, 10), by: u, at: ago(60), code: 'KRA', status: 'Active', _sample: true },
    ],
    coshh: [
      { id: rid('kc'), ref: ref('KCOSHH', 1), site: siteId, product: 'Kitchen degreaser', supplier: 'Evans Vanodine', hazard: 'Irritant — skin/eye', storage: 'Locked COSHH cupboard', ppe: 'Gloves, goggles', exposure: 'Dilute 1:40', emergency: 'Rinse eyes 15 min', sdsDate: '2024-03-01', reviewDate: ago(-180).slice(0, 10), by: u, at: ago(20), code: 'KCOSHH', _sample: true },
      { id: rid('kc'), ref: ref('KCOSHH', 2), site: siteId, product: 'Food-safe sanitiser (QAC)', supplier: 'Selden', hazard: 'Low toxicity when diluted', storage: 'Locked under prep sink', ppe: 'Gloves', exposure: 'Food contact surfaces', emergency: 'Wash affected skin', sdsDate: '2023-11-15', reviewDate: ago(-90).slice(0, 10), by: u, at: ago(20), code: 'KCOSHH', _sample: true },
    ],
    accidents: [
      { id: rid('kacc'), ref: ref('KACC', 1), site: siteId, injured: 'Sample — KP', role: 'Kitchen Porter', date: ago(4).slice(0, 10), time: '14:30', location: 'Hot line', type: 'Burn — minor', description: 'Steam burn — first aid applied', firstAid: 'Cold water 10 min, dressing', riddor: false, witness: 'Duty manager', action: 'Steam safety refresher', status: 'Closed', by: u, at: ago(4), code: 'KACC', _sample: true },
    ],
    inductions: [
      { id: rid('ind'), ref: ref('KHS', 101), site: siteId, staff: 'Sample new starter', topics: 'Hand washing, allergens, fire exits, COSHH, knife safety', trainer: 'Manager on duty', signed: true, at: ago(14), reviewDate: ago(-350).slice(0, 10), code: 'KHS', _sample: true },
      { id: rid('ind'), ref: ref('KHS', 102), site: siteId, staff: 'Seasonal hire checklist', topics: 'Emergency procedures, guest allergy protocol', trainer: 'Compliance lead', signed: false, at: ago(0), reviewDate: ago(-365).slice(0, 10), code: 'KHS', _sample: true },
    ],
    manualHandling: [
      { id: rid('kssw'), ref: ref('KSSW', 1), site: siteId, task: 'Moving 25 kg flour sacks', load: '25 kg', method: 'Sack truck only — no manual carry over 15 kg', teamLift: false, training: true, lastReview: ago(60).slice(0, 10), by: u, at: ago(60), code: 'KSSW', _sample: true },
      { id: rid('kssw'), ref: ref('KSSW', 2), site: siteId, task: 'Walk-in fridge stock rotation', load: 'Crates up to 20 kg', method: 'Two-person lift over 15 kg', teamLift: true, training: true, lastReview: ago(30).slice(0, 10), by: u, at: ago(30), code: 'KSSW', _sample: true },
    ],
    safetyChecks: [
      { id: rid('sc'), ref: ref('KHS', 201), site: siteId, checkType: 'Fire', items: 'Exits clear, extinguishers in date, alarm tested', result: 'Pass', action: '', by: u, at: ago(1), code: 'KHS', _sample: true },
      { id: rid('sc'), ref: ref('KHS', 202), site: siteId, checkType: 'PPE', items: 'Cut gloves, heat gloves, aprons stocked', result: 'Pass', action: 'Order medium cut gloves', by: u, at: ago(3), code: 'KHS', _sample: true },
      { id: rid('sc'), ref: ref('KHS', 203), site: siteId, checkType: 'First Aid', items: 'Kit complete, 2 trained first aiders on rota', result: 'Pass', action: 'Reorder blue plasters', by: u, at: ago(7), code: 'KHS', _sample: true },
    ],
    foodComplaints: [
      { id: rid('kfs'), ref: ref('KFS', 501), site: siteId, type: 'Food complaint', customer: 'Guest — table 12', date: ago(2).slice(0, 10), product: 'Caesar salad', issue: 'Sample complaint — batch traced', illness: false, notified: 'Manager', action: 'Batch withdrawn; apology issued', status: 'Closed', by: u, at: ago(2), code: 'KFS', _sample: true },
    ],
    probeCalibration: [
      { id: rid('pc'), ref: ref('KFS', 701), site: siteId, probe: 'Thermapen #1 — hot line', method: 'Ice bath 0°C / boiling 100°C', iceReading: 0.1, boilReading: 99.8, adjustment: 'Within ±1°C', nextDue: ago(-30).slice(0, 10), by: u, at: ago(2), code: 'KFS', _sample: true },
      { id: rid('pc'), ref: ref('KFS', 702), site: siteId, probe: 'Pen probe #2 — goods-in', method: 'Ice / boiling verification', iceReading: -0.5, boilReading: 100.2, adjustment: 'Within tolerance', nextDue: ago(-28).slice(0, 10), by: u, at: ago(2), code: 'KFS', _sample: true },
    ],
    thirdPartyEvents: [
      { id: rid('tp'), ref: ref('KFS', 801), site: siteId, event: 'Sample corporate dinner — 80 covers', caterer: 'In-house brigade', date: ago(-14).slice(0, 10), menuApproved: true, allergenBrief: true, tempChecks: true, signedOff: 'Head Chef', notes: 'Separate allergen prep area', by: u, at: ago(15), code: 'KFS', _sample: true },
    ],
    haccpPlans: [
      { id: rid('hp'), ref: ref('KHACCP', 1), site: siteId, title: 'Main kitchen HACCP plan', version: '3.2', owner: 'Head Chef', scope: 'Hot & cold kitchen', steps: HACCP_STEPS.map((s) => Object.assign({}, s)), reviewDate: ago(-90).slice(0, 10), approvedBy: 'Head Chef', at: ago(10), code: 'KHACCP', status: 'Active', _sample: true },
      { id: rid('hp'), ref: ref('KHACCP', 2), site: siteId, title: 'Pastry HACCP addendum', version: '1.1', owner: 'Pastry chef', scope: 'Dessert section', steps: HACCP_STEPS.slice(0, 2).map((s, i) => Object.assign({}, s, { step: i + 1 })), reviewDate: ago(-60).slice(0, 10), approvedBy: 'Head Chef', at: ago(20), code: 'KHACCP', status: 'Active', _sample: true },
    ],
    fsmsDocuments: FSMS_TITLES.map((title, i) => ({
      id: rid('fsms'), ref: ref('KFS', 900 + i + 1), site: siteId, title, section: 'FSMS',
      version: '1.' + (i + 1), status: i < 8 ? 'Approved' : 'Draft',
      reviewDate: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
      owner: 'Compliance Lead', at: ago(20 + i), code: 'KFS', _sample: true,
    })),
    equipmentMaintenance: [
      { id: rid('em'), ref: ref('KHS', 301), site: siteId, equipment: 'Dishwasher — main pot wash', type: 'PPM service', due: ago(-7).slice(0, 10), completed: ago(5).slice(0, 10), provider: 'Facilities Team', result: 'Pass — wash temps 82°C verified', nextDue: ago(-180).slice(0, 10), by: u, at: ago(5), code: 'KHS', _sample: true },
      { id: rid('em'), ref: ref('KHS', 302), site: siteId, equipment: 'Extraction hood & filters', type: 'Deep clean', due: ago(0).slice(0, 10), completed: '', provider: 'Grease-tek Ltd', result: 'Scheduled', nextDue: ago(-90).slice(0, 10), by: u, at: ago(1), code: 'KHS', _sample: true },
      { id: rid('em'), ref: ref('KHS', 303), site: siteId, equipment: 'Walk-in fridge compressor', type: 'Annual service', due: ago(-14).slice(0, 10), completed: ago(12).slice(0, 10), provider: 'CoolFix Refrigeration', result: 'Pass — gas levels OK', nextDue: ago(-350).slice(0, 10), by: u, at: ago(12), code: 'KHS', _sample: true },
    ],
  };
}

/**
 * Build full starter workspace from Grove Hotel demo for one new site.
 */
function buildStarterPack(user, email, profile) {
  profile = profile || user.profile || {};
  const demo = loadDemo();
  const src = SOURCE_SITE;
  const siteId = uid('site');
  const ownerId = uid('u');
  const managerId = uid('u');
  const staffId = uid('u');

  const srcSite = (demo.sites || []).find((s) => s.id === src) || {};
  const biz = String(profile.businessName || user.name || email.split('@')[0]).trim();
  const initials = ((profile.firstName || user.name || '')[0] || '') + ((profile.lastName || '')[0] || '');

  const site = Object.assign({}, srcSite, {
    id: siteId,
    name: biz,
    legalName: (profile.legalName || '').trim() || biz,
    city: (profile.city || '').trim() || srcSite.city || '—',
    postcode: (profile.postcode || '').trim() || srcSite.postcode || '',
    address: (profile.address || '').trim() || srcSite.address || '',
    country: profile.country || srcSite.country || 'United Kingdom',
    type: profile.businessType || srcSite.type || 'Restaurant',
    manager: user.name || biz,
    phone: (profile.phone || '').trim() || srcSite.phone || '',
    email: email.toLowerCase(),
    _sample: true,
  });

  const idMap = {
    [src]: siteId,
    u_sarah: managerId,
    u_james: staffId,
    u_shyam: ownerId,
  };

  const pick = (key, siteField) => pickSite(demo[key], src, siteField || 'site');
  const clone = (key, siteField) => remapJson(pick(key, siteField), idMap).map((row) => Object.assign({}, row, { _sample: true }));

  const products = { fss: true, allerq: true, labels: true, waste: true };
  (profile.modules || []).forEach((m) => {
    if (m !== 'sensors' && products[m] !== undefined) products[m] = true;
  });

  const team = [
    {
      id: ownerId,
      name: user.name || biz,
      email: email.toLowerCase(),
      phone: (profile.phone || '').trim(),
      role: profile.jobRole || 'Owner / Director',
      access: 'Admin',
      siteId,
      initials: (initials.toUpperCase() || 'OW').slice(0, 2),
    },
    {
      id: managerId,
      name: 'Sarah Mitchell (sample)',
      role: 'Head Chef',
      email: 'sample.manager@kiteline.uk',
      phone: '+44 7700 900001',
      siteId,
      initials: 'SM',
      access: 'Admin',
      _sample: true,
    },
    {
      id: staffId,
      name: 'James Okafor (sample)',
      role: 'Sous Chef',
      email: 'sample.staff@kiteline.uk',
      siteId,
      initials: 'JO',
      access: 'Staff',
      _sample: true,
    },
  ];

  return {
    org: {
      name: biz,
      legalName: (profile.legalName || '').trim() || biz,
      plan: 'Free trial',
      currency: 'GBP',
      products,
      channels: { sms: true, email: true, push: true },
      maxUsers: 5,
      // Dietary rules are optional and per-company — never forced platform-wide
      dietary: {
        enabledRules: Array.isArray(profile.dietaryRules) ? profile.dietaryRules : [],
        notes: profile.dietaryNotes || '',
      },
    },
    sites: [site],
    team,
    currentSite: siteId,
    sensors: clone('sensors', 'siteId'),
    checklists: clone('checklists'),
    records: clone('records'),
    alerts: clone('alerts'),
    menus: clone('menus'),
    labels: clone('labels'),
    waste: clone('waste'),
    recipes: clone('recipes'),
    workflows: clone('workflows'),
    deliveries: clone('deliveries'),
    maintenance: clone('maintenance'),
    assets: clone('assets'),
    batches: clone('batches'),
    cooling: clone('cooling'),
    phlogs: clone('phlogs'),
    holding: clone('holding'),
    incidents: clone('incidents'),
    suppliers: remapJson((demo.suppliers || []).slice(0, 5), idMap).map((r) => Object.assign({}, r, { _sample: true })),
    training: remapJson((demo.training || []).slice(0, 8), idMap).map((r) => Object.assign({}, r, { _sample: true })),
    activity: remapJson((demo.activity || []).slice(0, 20), idMap).map((r) => Object.assign({}, r, { _sample: true })),
    allergens: demo.allergens || [],
    compliance: sampleCompliance(siteId, managerId),
    _samplePackVersion: STARTER_PACK_VERSION,
    _starterNote: 'Full sample templates from The Grove Hotel demo — edit or replace with your own data.',
    _tenantPrivate: true,
    _isPrivate: true,
    _isDemo: false,
    _createdAt: new Date().toISOString(),
  };
}

function applyStarterPack(tenant, user, email, profile) {
  if (!tenant || tenant._isDemo) return tenant;
  const pack = buildStarterPack(user || { name: tenant.org && tenant.org.name }, email || 'user@kiteline.uk', profile || {});
  const keep = {
    _tenantId: tenant._tenantId,
    _createdAt: tenant._createdAt || pack._createdAt,
  };
  Object.assign(tenant, pack, keep);
  return tenant;
}

function ensureStarterPack(tenant, user, email) {
  if (!tenant || tenant._isDemo || tenant._tenantPrivate === false) return false;
  if ((tenant._samplePackVersion || 0) >= STARTER_PACK_VERSION) return false;
  applyStarterPack(tenant, user, email, user && user.profile);
  return true;
}

module.exports = {
  STARTER_PACK_VERSION,
  buildStarterPack,
  applyStarterPack,
  ensureStarterPack,
  sampleCompliance,
};
