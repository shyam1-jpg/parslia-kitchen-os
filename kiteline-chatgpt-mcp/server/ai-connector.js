'use strict';

/**
 * Kiteline AI / ChatGPT connector
 * — Company-scoped tokens & OAuth
 * — REST GPT Actions (/api/ai/*) + MCP (/mcp)
 * — Multipurpose hospitality (not locked to one diet or business type)
 */

const crypto = require('crypto');
const tenants = require('./tenants');
const security = require('./security');
const aiAuth = require('./ai-auth');
const { buildOpenApi } = require('./ai-openapi');
const aiOauth = require('./ai-oauth');

const AI_VERSION = '1.1.0';

const DIET_CATALOG = [
  { id: 'vegetarian', label: 'Vegetarian' },
  { id: 'vegan', label: 'Vegan' },
  { id: 'jain', label: 'Jain' },
  { id: 'ekadashi', label: 'Ekadashi' },
  { id: 'halal', label: 'Halal' },
  { id: 'kosher', label: 'Kosher' },
  { id: 'gluten-free', label: 'Gluten-free' },
  { id: 'dairy-free', label: 'Dairy-free' },
  { id: 'nut-free', label: 'Nut-free' },
  { id: 'other', label: 'Other (see notes)' },
];

function uid(prefix) {
  return `${prefix}_${crypto.randomBytes(4).toString('hex')}`;
}

function appUrl(req) {
  const env = (process.env.APP_URL || '').replace(/\/$/, '');
  if (env) return env;
  const host = req.headers.host || 'kiteline.uk';
  if (host.includes('localhost') || host.includes('127.0.0.1')) {
    return `${req.headers['x-forwarded-proto'] || 'http'}://${host}`;
  }
  return `https://${host}`;
}

function inSite(row, siteId) {
  if (!row) return false;
  if (!siteId) return true;
  return row.site === siteId || row.siteId === siteId;
}

function filterSite(arr, siteId) {
  if (!Array.isArray(arr)) return [];
  return arr.filter((r) => inSite(r, siteId));
}

function norm(s) {
  return String(s || '').toLowerCase().trim();
}

function matchesQuery(row, q) {
  if (!q) return true;
  const needle = norm(q);
  const hay = [
    row.name, row.title, row.label, row.sku, row.code, row.ref, row.category,
    row.type, row.supplier, row.role, row.email, row.notes, row.description,
    ...(row.tags || []), ...(row.allergens || []), ...(row.diet || []), ...(row.diets || []),
  ].map(norm).join(' ');
  return hay.includes(needle);
}

function dietTags(row) {
  const raw = [].concat(row.diet || [], row.diets || [], row.dietary || [], row.tags || []);
  return raw.map((d) => norm(d).replace(/\s+/g, '-'));
}

function matchesDiet(row, diet, enabledRules) {
  if (!diet) return true;
  const want = norm(diet).replace(/\s+/g, '-');
  if (Array.isArray(enabledRules) && enabledRules.length && !enabledRules.map(norm).includes(want)) {
    return false; // company has not enabled this rule
  }
  return dietTags(row).some((d) => d === want || d.includes(want));
}

function resolveDietary(state) {
  const org = state.org || {};
  const dietary = org.dietary && typeof org.dietary === 'object' ? org.dietary : {};
  const enabled = Array.isArray(dietary.enabledRules)
    ? dietary.enabledRules.map(norm).filter(Boolean)
    : [];
  return {
    catalog: DIET_CATALOG,
    enabledRules: enabled,
    notes: dietary.notes || '',
    message: enabled.length
      ? 'Dietary filters apply only for rules this company has enabled.'
      : 'No dietary rules enabled for this company — menus are not filtered by diet. Admins can enable rules in business settings.',
  };
}

function resolveSiteId(ctx, query, body) {
  const requested = (query.site || (body && body.site) || '').trim();
  const allowed = ctx.siteIds;
  if (requested) {
    if (!allowed.includes(requested)) return { error: 'Site not allowed for this AI token' };
    return { siteId: requested };
  }
  if (allowed.length === 1) return { siteId: allowed[0] };
  if (ctx.state.currentSite && allowed.includes(ctx.state.currentSite)) {
    return { siteId: ctx.state.currentSite };
  }
  return { siteId: allowed[0] || null, warning: 'Multiple sites — pass ?site=site_id' };
}

function auditAi(db, ip, ctx, action, detail) {
  security.audit(db, 'ai_action', {
    ip,
    email: ctx.user.email,
    detail: JSON.stringify({
      actionType: action,
      endpoint: detail && detail.resource,
      method: detail && detail.method,
      tenantId: ctx.user.tenantId,
      orgName: ctx.state.org && ctx.state.org.name,
      site: detail && detail.site,
      at: new Date().toISOString(),
    }),
  });
}

function buildContext(db, auth) {
  const state = tenants.getStateForUser(db, auth.user.email);
  if (!state) return { error: 'No workspace for this account', status: 409 };
  if (auth.entry.tenantId && auth.user.tenantId !== auth.entry.tenantId) {
    return { error: 'AI token is not valid for this company', status: 403 };
  }
  const siteIds = aiAuth.accessibleSiteIds(state, auth.user.email, auth.entry.siteIds);
  return {
    entry: auth.entry,
    user: auth.user,
    state,
    siteIds,
    permissions: auth.entry.permissions,
  };
}

function saveState(db, ctx, nextState) {
  nextState._updatedAt = new Date().toISOString();
  nextState._updatedBy = `ai:${ctx.user.email}`;
  if (!tenants.setStateForUser(db, ctx.user.email, nextState)) {
    throw new Error('Could not save workspace');
  }
}

function temperatureLogs(state, siteId) {
  const records = filterSite(state.records || [], siteId).filter((r) =>
    !r.type || /temp|fridge|freezer|probe/i.test(r.type || r.equipment || ''));
  const sensors = filterSite(state.sensors || [], siteId).map((s) => ({
    id: s.id,
    name: s.name,
    type: s.type || 'fridge',
    temp: s.temp,
    min: s.min,
    max: s.max,
    unit: s.unit || '°C',
    lastReading: s.lastReading || s.updatedAt,
    site: s.site || s.siteId,
  }));
  return { records, sensors, missingToday: missingFridgeLogs(state, siteId) };
}

function missingFridgeLogs(state, siteId) {
  const today = new Date().toISOString().slice(0, 10);
  const sensors = filterSite(state.sensors || [], siteId);
  const records = filterSite(state.records || [], siteId);
  return sensors.filter((s) => {
    const logged = records.some((r) => {
      const d = (r.at || r.date || '').slice(0, 10);
      return d === today && (r.sensor === s.id || (r.equipment || '').toLowerCase().includes((s.name || '').toLowerCase()));
    });
    return !logged;
  }).map((s) => ({ id: s.id, name: s.name, site: s.site || s.siteId }));
}

function haccpLogs(state, siteId) {
  const comp = state.compliance || {};
  const checklists = filterSite(state.checklists || [], siteId);
  return {
    complianceChecks: filterSite(comp.hsChecks || [], siteId),
    haccpPlans: filterSite(comp.haccpPlans || [], siteId),
    checklists: checklists.filter((c) => /haccp|food safety|opening|closing/i.test(c.name || c.title || '')),
    records: filterSite(state.records || [], siteId),
  };
}

function cleaningChecks(state, siteId) {
  return filterSite(state.checklists || [], siteId).filter((c) =>
    /clean|hygiene|sanit/i.test(c.name || c.title || ''));
}

function allergenReport(state, siteId, q) {
  const recipes = filterSite(state.recipes || [], siteId).filter((r) => matchesQuery(r, q));
  const statutory = state.allergens || [];
  const dishes = recipes.map((r) => ({
    id: r.id,
    name: r.name,
    allergens: r.allergens || [],
    status: r.status || 'draft',
    site: r.site,
    diet: dietTags(r),
  }));
  return { statutory, dishes, companyDietary: resolveDietary(state) };
}

function estimateNutrition(recipe) {
  if (recipe.nutrition && typeof recipe.nutrition === 'object') {
    return { source: 'stored', perServing: recipe.nutrition };
  }
  const ingredients = recipe.ingredients || [];
  if (!ingredients.length) return { source: 'unavailable', perServing: null };
  // Lightweight aggregate when recipes store kcal/protein on ingredients
  const totals = { kcal: 0, protein: 0, carbs: 0, fat: 0, fibre: 0, salt: 0 };
  let any = false;
  ingredients.forEach((ing) => {
    const n = ing.nutrition || ing.per100g;
    if (!n) return;
    any = true;
    Object.keys(totals).forEach((k) => {
      if (typeof n[k] === 'number') totals[k] += n[k];
    });
  });
  if (!any) {
    return {
      source: 'estimate_unavailable',
      note: 'No nutrition figures on this recipe yet — open Kiteline Recipe AI / nutrition tools to calculate.',
      perServing: null,
    };
  }
  const portions = Number(recipe.portions || recipe.serves || 1) || 1;
  const perServing = {};
  Object.keys(totals).forEach((k) => {
    perServing[k] = Math.round((totals[k] / portions) * 10) / 10;
  });
  return { source: 'ingredient_aggregate', perServing, portions };
}

function nutritionReport(state, siteId, q) {
  const recipes = filterSite(state.recipes || [], siteId).filter((r) => matchesQuery(r, q));
  return {
    dishes: recipes.map((r) => ({
      id: r.id,
      name: r.name,
      allergens: r.allergens || [],
      diet: dietTags(r),
      nutrition: estimateNutrition(r),
    })),
    companyDietary: resolveDietary(state),
  };
}

function costSignals(state, siteId) {
  const waste = filterSite(state.waste || [], siteId);
  const deliveries = filterSite(state.deliveries || [], siteId);
  const wasteCost = waste.reduce((sum, w) => sum + (Number(w.cost || w.value || 0) || 0), 0);
  const orderCost = deliveries.reduce((sum, d) => sum + (Number(d.total || d.cost || d.value || 0) || 0), 0);
  return {
    wasteEntries: waste.length,
    wasteCostApprox: Math.round(wasteCost * 100) / 100,
    deliveries: deliveries.length,
    orderCostApprox: Math.round(orderCost * 100) / 100,
    currency: (state.org && state.org.currency) || 'GBP',
  };
}

function buildReport(state, siteId, type) {
  const temps = temperatureLogs(state, siteId);
  const haccp = haccpLogs(state, siteId);
  const waste = filterSite(state.waste || [], siteId);
  const labels = filterSite(state.labels || [], siteId);
  const cost = costSignals(state, siteId);
  const base = {
    generatedAt: new Date().toISOString(),
    site: siteId,
    company: state.org && state.org.name,
    businessType: (state.sites || []).find((s) => s.id === siteId)?.type || null,
    dietary: resolveDietary(state),
    summary: {
      recipes: filterSite(state.recipes || [], siteId).length,
      menus: filterSite(state.menus || [], siteId).length,
      suppliers: filterSite(state.suppliers || [], siteId).length,
      temperatureCompliance: temps.sensors.length
        ? Math.round((temps.sensors.filter((s) => s.temp >= s.min && s.temp <= s.max).length / temps.sensors.length) * 100)
        : 100,
      missingFridgeLogsToday: temps.missingToday.length,
      openAlerts: filterSite(state.alerts || [], siteId).filter((a) => a.status === 'open').length,
      wasteEntries7d: waste.length,
      labelsActive: labels.filter((l) => !l.used).length,
      haccpChecks: haccp.complianceChecks.length,
      cost,
    },
  };
  if (type === 'cost') return Object.assign(base, { cost, waste, orders: filterSite(state.deliveries || [], siteId) });
  if (type === 'compliance') return Object.assign(base, { temperature: temps, haccp, waste, labels });
  return Object.assign(base, { temperature: temps, haccp, waste, labels, cost });
}

function parseIngredientLine(ing) {
  if (ing == null) return null;
  if (typeof ing === 'string') {
    const raw = ing.trim();
    if (!raw) return null;
    const m = raw.match(/^([\d./]+)\s*([a-zA-Z]+)?\s+(.+)$/);
    if (m) {
      const qty = Number(m[1].includes('/') ? (Number(m[1].split('/')[0]) / Number(m[1].split('/')[1] || 1)) : m[1]);
      return {
        name: m[3].replace(/,.*$/, '').trim(),
        qty: Number.isFinite(qty) ? qty : 0,
        unit: (m[2] || '').trim(),
        raw,
      };
    }
    return { name: raw.replace(/,.*$/, '').trim(), qty: 0, unit: '', raw };
  }
  const name = String(ing.name || ing.item || '').trim();
  if (!name) return null;
  return {
    name,
    qty: Number(ing.qty || ing.quantity || 0) || 0,
    unit: ing.unit || '',
    raw: name,
    nutrition: ing.nutrition || ing.per100g,
  };
}

function collectIngredients(recipes) {
  const map = new Map();
  recipes.forEach((r) => {
    (r.ingredients || []).forEach((ing) => {
      const parsed = parseIngredientLine(ing);
      if (!parsed) return;
      const key = norm(parsed.name);
      const prev = map.get(key) || {
        name: parsed.name,
        qty: 0,
        unit: parsed.unit || '',
        recipes: [],
        notes: [],
      };
      if (parsed.qty) prev.qty += parsed.qty;
      if (parsed.unit && !prev.unit) prev.unit = parsed.unit;
      prev.recipes.push(r.name);
      map.set(key, prev);
    });
  });
  return Array.from(map.values());
}

function generateShoppingList(state, siteId, query) {
  let recipes = filterSite(state.recipes || [], siteId);
  const menuId = (query.menuId || '').trim();
  const recipeIds = String(query.recipeIds || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (menuId) {
    const menu = filterSite(state.menus || [], siteId).find((m) => m.id === menuId);
    if (menu) {
      const itemIds = new Set((menu.items || []).map((i) => i.recipeId || i.id || i.recipe).filter(Boolean));
      const names = new Set((menu.items || []).map((i) => norm(i.name || i.title)).filter(Boolean));
      recipes = recipes.filter((r) => itemIds.has(r.id) || names.has(norm(r.name)));
      if (!recipes.length && (menu.items || []).length) {
        // Menu items without linked recipes — still list dish names for ordering notes
        return {
          source: 'menu_items_only',
          menu: { id: menu.id, name: menu.name },
          lines: (menu.items || []).map((i) => ({
            name: i.name || i.title,
            note: 'No linked recipe ingredients — check supplier catalogue manually',
          })),
          stockGaps: [],
        };
      }
    }
  }
  if (recipeIds.length) {
    recipes = recipes.filter((r) => recipeIds.includes(r.id));
  } else if (query.q) {
    recipes = recipes.filter((r) => matchesQuery(r, query.q));
  }

  const lines = collectIngredients(recipes);
  const batches = filterSite(state.batches || [], siteId);
  const assets = filterSite(state.assets || [], siteId);
  const stockHay = batches.concat(assets);

  const stockGaps = lines.filter((line) => {
    const key = norm(line.name);
    return !stockHay.some((s) => norm(s.name || s.product || s.sku).includes(key) || key.includes(norm(s.name || s.product || '')));
  });

  return {
    source: 'recipes',
    recipeCount: recipes.length,
    recipes: recipes.map((r) => ({ id: r.id, name: r.name })),
    lines,
    stockGaps,
    suppliers: filterSite(state.suppliers || [], siteId).map((s) => ({
      id: s.id,
      name: s.name,
      category: s.category,
    })),
  };
}

function businessPayload(ctx, siteId) {
  const state = ctx.state;
  const sites = (state.sites || []).filter((s) => ctx.siteIds.includes(s.id));
  const site = sites.find((s) => s.id === siteId) || sites[0] || null;
  return {
    tenant: {
      id: ctx.user.tenantId,
      orgName: state.org && state.org.name,
      isPrivate: true,
    },
    company: {
      id: ctx.user.tenantId,
      name: state.org && state.org.name,
      legalName: state.org && state.org.legalName,
      plan: state.org && state.org.plan,
      currency: (state.org && state.org.currency) || 'GBP',
      businessType: site && site.type,
    },
    site,
    sites,
    dietary: resolveDietary(state),
    note: 'Kiteline is multipurpose hospitality software. Dietary rules are per-company settings, not global platform defaults.',
  };
}

async function handleResource(method, name, ctx, db, ip, query, body, apiSend, writeDb) {
  const siteRes = resolveSiteId(ctx, query, body);
  if (siteRes.error) return apiSend(403, { error: siteRes.error });

  const siteId = siteRes.siteId;
  const meta = { site: siteId, resource: name, method };
  const dietary = resolveDietary(ctx.state);

  if (name === 'me') {
    auditAi(db, ip, ctx, 'me', meta);
    return apiSend(200, {
      email: ctx.user.email,
      name: ctx.user.name,
      tenant: tenants.tenantInfo(db, ctx.user.email),
      role: aiAuth.resolveRole(ctx.state, ctx.user.email),
      permissions: ctx.permissions,
      sites: (ctx.state.sites || []).filter((s) => ctx.siteIds.includes(s.id)),
      dietary,
      platform: {
        name: 'Kiteline',
        scope: 'company_workspace',
        multipurpose: true,
        version: AI_VERSION,
      },
      token: { id: ctx.entry.id, label: ctx.entry.label },
    });
  }

  if (name === 'business' || name === 'settings') {
    if (method === 'GET') {
      const perm = aiAuth.requirePermission(ctx, 'read_recipes');
      if (!perm.ok) return apiSend(403, { error: perm.error });
      auditAi(db, ip, ctx, 'business_read', meta);
      return apiSend(200, businessPayload(ctx, siteId));
    }
    if (method === 'PUT' || method === 'POST') {
      const role = aiAuth.resolveRole(ctx.state, ctx.user.email);
      if (!aiAuth.roleAtLeast(role, 'Admin')) {
        return apiSend(403, { error: 'Only Admins can update business / dietary settings' });
      }
      const conf = aiAuth.requireConfirm(method === 'PUT' ? 'PUT' : 'POST', body);
      if (!conf.ok) return apiSend(409, conf);
      const data = body.data || body;
      const next = JSON.parse(JSON.stringify(ctx.state));
      next.org = next.org || {};
      if (data.name) next.org.name = String(data.name).slice(0, 120);
      if (data.legalName) next.org.legalName = String(data.legalName).slice(0, 160);
      if (data.currency) next.org.currency = String(data.currency).slice(0, 8);
      if (data.businessType && siteId) {
        next.sites = (next.sites || []).map((s) => (
          s.id === siteId ? Object.assign({}, s, { type: String(data.businessType).slice(0, 80) }) : s
        ));
      }
      if (data.dietary && typeof data.dietary === 'object') {
        const allowed = new Set(DIET_CATALOG.map((d) => d.id));
        const enabled = Array.isArray(data.dietary.enabledRules)
          ? data.dietary.enabledRules.map(norm).filter((id) => allowed.has(id) || id === 'other')
          : (next.org.dietary && next.org.dietary.enabledRules) || [];
        next.org.dietary = {
          enabledRules: enabled,
          notes: String(data.dietary.notes || '').slice(0, 2000),
          updatedAt: new Date().toISOString(),
          updatedBy: ctx.user.email,
        };
      }
      saveState(db, ctx, next);
      writeDb(db);
      auditAi(db, ip, ctx, 'business_update', meta);
      ctx.state = next;
      return apiSend(200, { ok: true, business: businessPayload(ctx, siteId) });
    }
  }

  if (name === 'sites') {
    const perm = aiAuth.requirePermission(ctx, 'read_recipes');
    if (!perm.ok) return apiSend(403, { error: perm.error });
    auditAi(db, ip, ctx, 'sites', meta);
    return apiSend(200, {
      sites: (ctx.state.sites || []).filter((s) => ctx.siteIds.includes(s.id)),
      warning: siteRes.warning,
    });
  }

  if (name === 'recipes' || name === 'products' || name === 'dishes') {
    if (method === 'GET') {
      const perm = aiAuth.requirePermission(ctx, 'read_recipes');
      if (!perm.ok) return apiSend(403, { error: perm.error });
      let recipes = filterSite(ctx.state.recipes || [], siteId)
        .filter((r) => matchesQuery(r, query.q))
        .filter((r) => matchesDiet(r, query.diet, dietary.enabledRules));
      auditAi(db, ip, ctx, 'recipes_search', meta);
      return apiSend(200, {
        recipes,
        count: recipes.length,
        dietary,
        warning: siteRes.warning,
      });
    }
    if (method === 'POST' && name === 'recipes') {
      const perm = aiAuth.requirePermission(ctx, 'create_draft_recipes', 'Staff');
      if (!perm.ok) return apiSend(403, { error: perm.error });
      const conf = aiAuth.requireConfirm(method, body);
      if (!conf.ok) return apiSend(409, conf);
      const data = body.data || body;
      const recipe = Object.assign({
        id: uid('rcp'),
        site: siteId,
        status: 'draft',
        createdAt: new Date().toISOString(),
        createdBy: ctx.user.email,
        allergens: [],
        ingredients: [],
        steps: [],
        diet: [],
      }, data);
      recipe.status = 'draft';
      const next = JSON.parse(JSON.stringify(ctx.state));
      next.recipes = next.recipes || [];
      next.recipes.push(recipe);
      saveState(db, ctx, next);
      writeDb(db);
      auditAi(db, ip, ctx, 'recipes_create', meta);
      return apiSend(201, { ok: true, recipe });
    }
  }

  if (name === 'menus') {
    if (method === 'GET') {
      const perm = aiAuth.requirePermission(ctx, 'read_recipes');
      if (!perm.ok) return apiSend(403, { error: perm.error });
      const menus = filterSite(ctx.state.menus || [], siteId).filter((m) => matchesQuery(m, query.q));
      auditAi(db, ip, ctx, 'menus_read', meta);
      return apiSend(200, { menus, count: menus.length });
    }
    if (method === 'POST') {
      const permKey = body.publish ? 'publish_menus' : 'create_menu_drafts';
      const perm = aiAuth.requirePermission(ctx, permKey, body.publish ? 'Manager' : 'Staff');
      if (!perm.ok) return apiSend(403, { error: perm.error });
      const conf = aiAuth.requireConfirm(method, body);
      if (!conf.ok) return apiSend(409, conf);
      const data = body.data || body;
      const menu = Object.assign({
        id: uid('menu'),
        site: siteId,
        status: body.publish ? 'published' : 'draft',
        createdAt: new Date().toISOString(),
        createdBy: ctx.user.email,
        items: [],
      }, data);
      if (!body.publish) menu.status = 'draft';
      const next = JSON.parse(JSON.stringify(ctx.state));
      next.menus = next.menus || [];
      next.menus.push(menu);
      saveState(db, ctx, next);
      writeDb(db);
      auditAi(db, ip, ctx, 'menus_create', meta);
      return apiSend(201, { ok: true, menu });
    }
  }

  if (name === 'allergens') {
    const perm = aiAuth.requirePermission(ctx, 'read_allergen_data');
    if (!perm.ok) return apiSend(403, { error: perm.error });
    auditAi(db, ip, ctx, 'allergens_read', meta);
    return apiSend(200, allergenReport(ctx.state, siteId, query.q));
  }

  if (name === 'nutrition') {
    const perm = aiAuth.requirePermission(ctx, 'read_allergen_data');
    if (!perm.ok) return apiSend(403, { error: perm.error });
    auditAi(db, ip, ctx, 'nutrition_read', meta);
    return apiSend(200, nutritionReport(ctx.state, siteId, query.q));
  }

  if (name === 'temperature-logs') {
    if (method === 'GET') {
      const perm = aiAuth.requirePermission(ctx, 'read_temperature_logs');
      if (!perm.ok) return apiSend(403, { error: perm.error });
      auditAi(db, ip, ctx, 'temperature_read', meta);
      return apiSend(200, temperatureLogs(ctx.state, siteId));
    }
    if (method === 'POST') {
      const perm = aiAuth.requirePermission(ctx, 'add_temperature_logs', 'Staff');
      if (!perm.ok) return apiSend(403, { error: perm.error });
      const conf = aiAuth.requireConfirm(method, body);
      if (!conf.ok) return apiSend(409, conf);
      const data = body.data || body;
      const record = Object.assign({
        id: uid('rec'),
        site: siteId,
        at: new Date().toISOString(),
        by: ctx.user.email,
        type: 'temperature',
      }, data);
      const next = JSON.parse(JSON.stringify(ctx.state));
      next.records = next.records || [];
      next.records.push(record);
      saveState(db, ctx, next);
      writeDb(db);
      auditAi(db, ip, ctx, 'temperature_add', meta);
      return apiSend(201, { ok: true, record });
    }
  }

  if (name === 'haccp-logs') {
    if (method === 'GET') {
      const perm = aiAuth.requirePermission(ctx, 'read_haccp_records');
      if (!perm.ok) return apiSend(403, { error: perm.error });
      auditAi(db, ip, ctx, 'haccp_read', meta);
      return apiSend(200, haccpLogs(ctx.state, siteId));
    }
    if (method === 'POST') {
      const perm = aiAuth.requirePermission(ctx, 'add_haccp_records', 'Staff');
      if (!perm.ok) return apiSend(403, { error: perm.error });
      const conf = aiAuth.requireConfirm(method, body);
      if (!conf.ok) return apiSend(409, conf);
      const data = body.data || body;
      const next = JSON.parse(JSON.stringify(ctx.state));
      next.compliance = next.compliance || { hsChecks: [] };
      next.compliance.hsChecks = next.compliance.hsChecks || [];
      const entry = Object.assign({
        id: uid('khs'),
        site: siteId,
        at: new Date().toISOString(),
        by: ctx.user.email,
        status: 'Open',
        code: 'KHS',
      }, data);
      next.compliance.hsChecks.push(entry);
      saveState(db, ctx, next);
      writeDb(db);
      auditAi(db, ip, ctx, 'haccp_add', meta);
      return apiSend(201, { ok: true, entry });
    }
  }

  if (name === 'cleaning-checks') {
    const perm = aiAuth.requirePermission(ctx, 'read_haccp_records');
    if (!perm.ok) return apiSend(403, { error: perm.error });
    auditAi(db, ip, ctx, 'cleaning_read', meta);
    return apiSend(200, { checks: cleaningChecks(ctx.state, siteId) });
  }

  if (name === 'fridge-freezer-units') {
    const perm = aiAuth.requirePermission(ctx, 'read_temperature_logs');
    if (!perm.ok) return apiSend(403, { error: perm.error });
    auditAi(db, ip, ctx, 'units_read', meta);
    return apiSend(200, {
      units: filterSite(ctx.state.sensors || [], siteId).map((s) => ({
        id: s.id,
        name: s.name,
        type: s.type,
        min: s.min,
        max: s.max,
        temp: s.temp,
        site: s.site || s.siteId,
      })),
    });
  }

  if (name === 'labels') {
    if (method === 'GET') {
      if (!aiAuth.hasPermission(ctx, 'read_recipes') && !aiAuth.hasPermission(ctx, 'manage_labels')) {
        return apiSend(403, { error: 'AI permission denied: read_recipes or manage_labels' });
      }
      auditAi(db, ip, ctx, 'labels_read', meta);
      return apiSend(200, { labels: filterSite(ctx.state.labels || [], siteId).filter((l) => matchesQuery(l, query.q)) });
    }
    if (method === 'POST') {
      const perm = aiAuth.requirePermission(ctx, 'manage_labels', 'Staff');
      if (!perm.ok) return apiSend(403, { error: perm.error });
      const conf = aiAuth.requireConfirm(method, body);
      if (!conf.ok) return apiSend(409, conf);
      const data = body.data || body;
      const label = Object.assign({
        id: uid('lbl'),
        site: siteId,
        createdAt: new Date().toISOString(),
        createdBy: ctx.user.email,
      }, data);
      const next = JSON.parse(JSON.stringify(ctx.state));
      next.labels = next.labels || [];
      next.labels.push(label);
      saveState(db, ctx, next);
      writeDb(db);
      auditAi(db, ip, ctx, 'labels_create', meta);
      return apiSend(201, { ok: true, label });
    }
  }

  if (name === 'stock') {
    if (method === 'GET') {
      if (!aiAuth.hasPermission(ctx, 'read_recipes') && !aiAuth.hasPermission(ctx, 'manage_stock')) {
        return apiSend(403, { error: 'AI permission denied: read_recipes or manage_stock' });
      }
      const batches = filterSite(ctx.state.batches || [], siteId).filter((r) => matchesQuery(r, query.q));
      const assets = filterSite(ctx.state.assets || [], siteId).filter((r) => matchesQuery(r, query.q));
      auditAi(db, ip, ctx, 'stock_search', meta);
      return apiSend(200, { batches, assets, count: batches.length + assets.length });
    }
  }

  if (name === 'suppliers') {
    if (!aiAuth.hasPermission(ctx, 'read_recipes') && !aiAuth.hasPermission(ctx, 'manage_suppliers')) {
      return apiSend(403, { error: 'AI permission denied: read_recipes or manage_suppliers' });
    }
    const suppliers = filterSite(ctx.state.suppliers || [], siteId).filter((r) => matchesQuery(r, query.q));
    auditAi(db, ip, ctx, 'suppliers_search', meta);
    return apiSend(200, { suppliers, count: suppliers.length });
  }

  if (name === 'orders') {
    if (!aiAuth.hasPermission(ctx, 'read_recipes') && !aiAuth.hasPermission(ctx, 'manage_suppliers')) {
      return apiSend(403, { error: 'AI permission denied: read_recipes or manage_suppliers' });
    }
    const orders = filterSite(ctx.state.deliveries || [], siteId).filter((r) => matchesQuery(r, query.q));
    auditAi(db, ip, ctx, 'orders_read', meta);
    return apiSend(200, { orders, count: orders.length });
  }

  if (name === 'shopping-list' || name === 'ordering-list') {
    if (method === 'GET') {
      if (!aiAuth.hasPermission(ctx, 'read_recipes') && !aiAuth.hasPermission(ctx, 'manage_stock')) {
        return apiSend(403, { error: 'AI permission denied: read_recipes or manage_stock' });
      }
      auditAi(db, ip, ctx, 'shopping_list_generate', meta);
      return apiSend(200, generateShoppingList(ctx.state, siteId, query));
    }
    if (method === 'POST') {
      const perm = aiAuth.requirePermission(ctx, 'manage_stock', 'Staff');
      if (!perm.ok) return apiSend(403, { error: perm.error });
      const conf = aiAuth.requireConfirm(method, body);
      if (!conf.ok) return apiSend(409, conf);
      const generated = generateShoppingList(ctx.state, siteId, Object.assign({}, query, body.data || body));
      const list = Object.assign({
        id: uid('shop'),
        site: siteId,
        createdAt: new Date().toISOString(),
        createdBy: ctx.user.email,
        type: 'shopping-list',
      }, generated, body.data || {});
      const next = JSON.parse(JSON.stringify(ctx.state));
      next.workflows = next.workflows || [];
      next.workflows.push({
        id: list.id,
        label: 'Shopping / ordering list',
        site: siteId,
        at: list.createdAt,
        by: ctx.user.email,
        payload: list,
      });
      saveState(db, ctx, next);
      writeDb(db);
      auditAi(db, ip, ctx, 'shopping_list_save', meta);
      return apiSend(201, { ok: true, list });
    }
  }

  if (name === 'waste') {
    const perm = aiAuth.requirePermission(ctx, 'read_haccp_records');
    if (!perm.ok) return apiSend(403, { error: perm.error });
    auditAi(db, ip, ctx, 'waste_read', meta);
    return apiSend(200, {
      waste: filterSite(ctx.state.waste || [], siteId).filter((r) => matchesQuery(r, query.q)),
      cost: costSignals(ctx.state, siteId),
    });
  }

  if (name === 'rota') {
    if (!aiAuth.hasPermission(ctx, 'read_recipes') && !aiAuth.hasPermission(ctx, 'manage_rota')) {
      return apiSend(403, { error: 'AI permission denied: read_recipes or manage_rota' });
    }
    const team = filterSite(ctx.state.team || [], siteId).filter((r) => matchesQuery(r, query.q));
    const workflows = filterSite(ctx.state.workflows || [], siteId).filter((w) =>
      /rota|shift|schedule|ops|operational/i.test(w.label || w.type || '') || matchesQuery(w, query.q));
    const records = filterSite(ctx.state.records || [], siteId)
      .filter((r) => /rota|shift|ops|incident|training/i.test(r.type || r.category || '') || matchesQuery(r, query.q))
      .slice(0, 100);
    auditAi(db, ip, ctx, 'rota_search', meta);
    return apiSend(200, {
      team,
      workflows,
      operationalRecords: records,
      note: 'Staff rota detail may also live in the Kiteline rota module when enabled for your organisation.',
    });
  }

  if (name === 'reports') {
    const type = norm(query.type || 'full') || 'full';
    const perm = aiAuth.requirePermission(ctx, 'export_reports', 'Manager');
    if (!perm.ok) {
      const readPerm = aiAuth.requirePermission(ctx, 'read_haccp_records');
      if (!readPerm.ok) return apiSend(403, { error: perm.error });
      auditAi(db, ip, ctx, 'reports_summary', meta);
      return apiSend(200, {
        summaryOnly: true,
        message: 'Enable export_reports permission on the AI token for full inspection export.',
        report: buildReport(ctx.state, siteId, type === 'full' ? 'summary' : type),
      });
    }
    auditAi(db, ip, ctx, 'reports_export', meta);
    return apiSend(200, { export: true, report: buildReport(ctx.state, siteId, type) });
  }

  return apiSend(404, { error: 'Unknown AI resource' });
}

const MCP_TOOLS = [
  { name: 'search_recipes', description: 'Search recipes, products and dishes for the logged-in company', path: 'recipes', method: 'GET' },
  { name: 'manage_menus', description: 'List or create menus for the company', path: 'menus', method: 'GET' },
  { name: 'search_stock', description: 'Search stock batches and assets', path: 'stock', method: 'GET' },
  { name: 'search_suppliers', description: 'Search suppliers', path: 'suppliers', method: 'GET' },
  { name: 'generate_shopping_list', description: 'Generate shopping / ordering lists from menus or recipes', path: 'shopping-list', method: 'GET' },
  { name: 'temperature_logs', description: 'Read temperature records and sensors', path: 'temperature-logs', method: 'GET' },
  { name: 'add_temperature_log', description: 'Add a temperature record (requires confirm:true)', path: 'temperature-logs', method: 'POST' },
  { name: 'allergen_report', description: 'Allergen report for dishes', path: 'allergens', method: 'GET' },
  { name: 'nutrition_report', description: 'Nutrition report for dishes', path: 'nutrition', method: 'GET' },
  { name: 'search_rota', description: 'Search staff rotas and operational records', path: 'rota', method: 'GET' },
  { name: 'business_reports', description: 'Business, cost and compliance reports', path: 'reports', method: 'GET' },
  { name: 'business_settings', description: 'Read company settings and configurable dietary rules', path: 'business', method: 'GET' },
];

function mcpInfo() {
  return {
    name: 'kiteline',
    version: AI_VERSION,
    status: 'ready',
    description:
      'Kiteline MCP / AI connector for multipurpose hospitality businesses. '
      + 'Company-scoped only. Use POST /mcp (JSON-RPC) or REST /api/ai with a kl_ai_ token / OAuth.',
    openapi: '/api/ai/openapi.json',
    health: '/api/ai/health',
    docs: 'https://kiteline.uk/chatgpt.html',
    tools: MCP_TOOLS.map((t) => t.name),
    multipurpose: true,
  };
}

async function handleMcp(opts) {
  const { db, req, body, ip, writeDb } = opts;
  const msg = body || {};
  const id = msg.id != null ? msg.id : null;

  function ok(result) {
    return { status: 200, body: { jsonrpc: '2.0', id, result } };
  }
  function err(code, message) {
    return { status: 200, body: { jsonrpc: '2.0', id, error: { code, message } } };
  }

  if (msg.method === 'initialize' || msg.method === 'notifications/initialized') {
    return ok({
      protocolVersion: '2024-11-05',
      serverInfo: { name: 'kiteline', version: AI_VERSION },
      capabilities: { tools: {} },
      instructions:
        'Kiteline is a multipurpose hospitality platform. All tools are scoped to the company that authorised this connection. '
        + 'Dietary rules are per-company settings — never assume vegetarian or any other diet unless business_settings says so.',
    });
  }

  if (msg.method === 'tools/list') {
    return ok({
      tools: MCP_TOOLS.map((t) => ({
        name: t.name,
        description: t.description,
        inputSchema: {
          type: 'object',
          properties: {
            site: { type: 'string' },
            q: { type: 'string' },
            diet: { type: 'string' },
            menuId: { type: 'string' },
            recipeIds: { type: 'string' },
            type: { type: 'string' },
            confirm: { type: 'boolean' },
            data: { type: 'object' },
          },
        },
      })),
    });
  }

  if (msg.method === 'tools/call') {
    const auth = aiAuth.resolveAiAuth(db, req);
    if (!auth) return err(-32001, 'Invalid or missing Kiteline AI token');
    const ctx = buildContext(db, auth);
    if (ctx.error) return err(-32003, ctx.error);

    const toolName = msg.params && msg.params.name;
    const args = (msg.params && msg.params.arguments) || {};
    const tool = MCP_TOOLS.find((t) => t.name === toolName);
    if (!tool) return err(-32601, 'Unknown tool: ' + toolName);

    let statusCode = 200;
    let payload = null;
    const apiSend = async (code, obj) => {
      statusCode = code;
      payload = obj;
    };
    await handleResource(
      tool.method,
      tool.path,
      ctx,
      db,
      ip,
      args,
      Object.assign({ confirm: args.confirm, data: args.data, site: args.site }, args),
      apiSend,
      writeDb
    );
    if (statusCode >= 400) {
      return err(-32000, (payload && payload.error) || 'Tool failed');
    }
    return ok({
      content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    });
  }

  if (!msg.method) {
    return { status: 200, body: mcpInfo() };
  }
  return err(-32601, 'Method not found: ' + msg.method);
}

async function handleApi(opts) {
  const {
    db, req, route, method, body, ip, apiSend, userFromReq, writeDb, query,
  } = opts;

  if (!route.startsWith('/ai')) return false;

  const sub = route.replace(/^\/ai\/?/, '') || '';
  const parts = sub.split('/').filter(Boolean);
  const resource = parts[0] || '';

  if (resource === 'health' && method === 'GET') {
    await apiSend(200, {
      ok: true,
      service: 'kiteline-ai',
      version: AI_VERSION,
      multipurpose: true,
      auth: 'AI token (kl_ai_…) via Bearer or x-api-key, or OAuth — not user passwords',
      scope: 'Each token is bound to one company workspace only',
    });
    return true;
  }

  if (resource === 'openapi.json' && method === 'GET') {
    await apiSend(200, buildOpenApi(appUrl(req)));
    return true;
  }

  if (resource === 'oauth') {
    await aiOauth.handleRoute({
      db, req, parts, method, body, ip, apiSend, userFromReq, writeDb, query, security,
    });
    return true;
  }

  if (resource === 'tokens') {
    const sessionUser = userFromReq(db, req);
    if (!sessionUser) {
      await apiSend(401, { error: 'Sign in to manage AI tokens', code: 'session_required' });
      return true;
    }
    if (method === 'GET') {
      await apiSend(200, {
        tokens: aiAuth.listTokensForUser(db, sessionUser.email),
        permissionKeys: aiAuth.PERMISSION_KEYS,
        defaults: aiAuth.defaultPermissions(),
        dietCatalog: DIET_CATALOG,
        howToConnect: {
          step1: 'Create a token here (POST) while signed in as a company Admin',
          step2: 'In ChatGPT → Create a GPT → Actions, import https://kiteline.uk/api/ai/openapi.json',
          step3: 'Authenticate with Bearer / API key (kl_ai_…) or OAuth',
          step4: 'ChatGPT only accesses this company’s workspace data',
          docs: '/chatgpt.html',
        },
      });
      return true;
    }
    if (method === 'POST') {
      try {
        const state = tenants.getStateForUser(db, sessionUser.email);
        const role = state ? aiAuth.resolveRole(state, sessionUser.email) : 'Staff';
        if (!aiAuth.roleAtLeast(role, 'Admin')) {
          await apiSend(403, { error: 'Only Admins can create AI tokens for this company' });
          return true;
        }
        const created = aiAuth.createToken(db, sessionUser.email, body || {});
        security.audit(db, 'ai_token_create', { ip, email: sessionUser.email, detail: created.id });
        writeDb(db);
        await apiSend(201, {
          ok: true,
          token: created.token,
          warning: 'Copy this token now — it will not be shown again.',
          entry: created.entry,
        });
      } catch (e) {
        await apiSend(400, { error: e.message || 'Could not create token' });
      }
      return true;
    }
    if (method === 'DELETE' && parts[1]) {
      try {
        aiAuth.revokeToken(db, sessionUser.email, parts[1]);
        security.audit(db, 'ai_token_revoke', { ip, email: sessionUser.email, detail: parts[1] });
        writeDb(db);
        await apiSend(200, { ok: true });
      } catch (e) {
        await apiSend(404, { error: e.message || 'Token not found' });
      }
      return true;
    }
    await apiSend(405, { error: 'Method not allowed' });
    return true;
  }

  const auth = aiAuth.resolveAiAuth(db, req);
  if (!auth) {
    await apiSend(401, {
      error: 'Invalid or missing Kiteline AI token',
      code: 'ai_token_required',
      hint: 'Use Bearer or x-api-key with a kl_ai_… token from POST /api/ai/tokens',
    });
    return true;
  }

  const ctx = buildContext(db, auth);
  if (ctx.error) {
    await apiSend(ctx.status || 403, { error: ctx.error });
    return true;
  }

  if (!resource) {
    await apiSend(200, {
      service: 'kiteline-ai',
      version: AI_VERSION,
      multipurpose: true,
      company: tenants.tenantInfo(db, ctx.user.email),
      endpoints: [
        'me', 'business', 'sites', 'recipes', 'menus', 'allergens', 'nutrition',
        'temperature-logs', 'haccp-logs', 'cleaning-checks', 'fridge-freezer-units',
        'labels', 'stock', 'suppliers', 'orders', 'shopping-list', 'waste', 'rota', 'reports',
      ],
    });
    return true;
  }

  await handleResource(method, resource, ctx, db, ip, query || {}, body, apiSend, writeDb);
  return true;
}

module.exports = { handleApi, mcpInfo, handleMcp, DIET_CATALOG };
