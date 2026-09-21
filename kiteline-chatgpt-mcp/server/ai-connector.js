'use strict';

const crypto = require('crypto');
const tenants = require('./tenants');
const security = require('./security');
const aiAuth = require('./ai-auth');
const { buildOpenApi } = require('./ai-openapi');
const aiOauth = require('./ai-oauth');
const aiMcp = require('./ai-mcp');

function uid(prefix) {
  return `${prefix}_${crypto.randomBytes(4).toString('hex')}`;
}

function menuDishList(menu) {
  return aiMcp.menuDishList(menu);
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

/** Optional dietary profiles a business may enable — never forced globally. */
const DIETARY_OPTIONS = [
  'vegetarian', 'vegan', 'jain', 'ekadashi', 'halal', 'kosher',
  'gluten-free', 'dairy-free', 'nut-free', 'none',
];

const BUSINESS_TYPES = [
  'hotel', 'restaurant', 'catering', 'commercial_kitchen', 'school',
  'college', 'care_home', 'retreat_centre', 'cafe', 'bakery',
  'event_venue', 'other_hospitality',
];

function textMatch(q, ...parts) {
  const needle = String(q || '').trim().toLowerCase();
  if (!needle) return true;
  const hay = parts
    .flatMap((p) => {
      if (p == null) return [];
      if (Array.isArray(p)) return p.map(String);
      if (typeof p === 'object') return [JSON.stringify(p)];
      return [String(p)];
    })
    .join(' ')
    .toLowerCase();
  return hay.includes(needle);
}

function ensureOrgDietary(org) {
  const o = org || {};
  const dietary = o.dietary && typeof o.dietary === 'object' ? o.dietary : {};
  const enabled = Array.isArray(dietary.enabled)
    ? dietary.enabled.map((x) => String(x).toLowerCase()).filter((x) => DIETARY_OPTIONS.includes(x))
    : [];
  return {
    enabled,
    defaultProfile: dietary.defaultProfile && DIETARY_OPTIONS.includes(String(dietary.defaultProfile).toLowerCase())
      ? String(dietary.defaultProfile).toLowerCase()
      : null,
    notes: String(dietary.notes || '').slice(0, 500),
    options: DIETARY_OPTIONS,
    note: 'Dietary rules are configured per company. They are not applied to every Kiteline customer.',
  };
}

function workspacePayload(state, ctx) {
  const org = (state && state.org) || {};
  const siteType = ((state.sites || []).find((s) => s.id === (ctx && ctx.state && ctx.state.currentSite)) || {}).type;
  return {
    name: org.name || null,
    plan: org.plan || null,
    currency: org.currency || 'GBP',
    businessTypes: BUSINESS_TYPES,
    businessType: org.businessType || siteType || 'other_hospitality',
    products: org.products || {},
    channels: org.channels || {},
    dietary: ensureOrgDietary(org),
    sites: (state.sites || []).filter((s) => !ctx || ctx.siteIds.includes(s.id)).map((s) => ({
      id: s.id,
      name: s.name,
      type: s.type || null,
      city: s.city || null,
    })),
    scope: 'This AI token only sees data for the logged-in company workspace.',
  };
}

function searchCatalog(state, siteId, q) {
  const recipes = filterSite(state.recipes || [], siteId).filter((r) =>
    textMatch(q, r.name, r.category, r.allergens, r.ingredients));
  const menus = filterSite(state.menus || [], siteId).filter((m) =>
    textMatch(q, m.name, m.title, m.status, menuDishList(m)));
  const dishes = [];
  filterSite(state.menus || [], siteId).forEach((m) => {
    menuDishList(m).forEach((item) => {
      if (textMatch(q, item.name, item.title, item.category, item.allergens)) {
        dishes.push({
          id: item.id || null,
          name: item.name || item.title,
          menuId: m.id,
          menuName: m.name || m.title,
          allergens: item.allergens || [],
          site: m.site,
        });
      }
    });
  });
  const stock = filterSite(state.batches || [], siteId).filter((b) =>
    textMatch(q, b.name, b.product, b.sku, b.lot, b.supplier));
  const assets = filterSite(state.assets || [], siteId).filter((a) =>
    textMatch(q, a.name, a.type, a.sku));
  const suppliers = filterSite(state.suppliers || [], siteId).filter((s) =>
    textMatch(q, s.name, s.contact, s.email, s.phone, s.categories, s.notes));
  return {
    q: q || '',
    counts: {
      recipes: recipes.length,
      menus: menus.length,
      dishes: dishes.length,
      stock: stock.length + assets.length,
      suppliers: suppliers.length,
    },
    recipes: recipes.slice(0, 50),
    menus: menus.slice(0, 30),
    dishes: dishes.slice(0, 50),
    stock: { batches: stock.slice(0, 50), assets: assets.slice(0, 50) },
    suppliers: suppliers.slice(0, 50),
  };
}

function nutritionReport(state, siteId) {
  const recipes = filterSite(state.recipes || [], siteId);
  const dishes = recipes.map((r) => {
    const n = r.nutrition || r.nutritionals || null;
    return {
      id: r.id,
      name: r.name,
      servings: r.servings || null,
      allergens: r.allergens || [],
      nutrition: n,
      hasNutritionData: !!(n && typeof n === 'object' && Object.keys(n).length),
      site: r.site,
    };
  });
  return {
    generatedAt: new Date().toISOString(),
    site: siteId,
    dishesWithNutrition: dishes.filter((d) => d.hasNutritionData).length,
    dishesTotal: dishes.length,
    dishes,
    note: 'Nutrition fields are optional per recipe. Allergen data remains available via /api/ai/allergens.',
  };
}

function buildShoppingList(state, siteId, opts) {
  const optsSafe = opts || {};
  const items = [];
  const seen = new Set();

  function addItem(name, qty, unit, source, supplier) {
    const key = String(name || '').trim().toLowerCase();
    if (!key) return;
    if (seen.has(key)) {
      const existing = items.find((i) => i.key === key);
      if (existing && qty != null) existing.qty = (Number(existing.qty) || 0) + (Number(qty) || 0);
      return;
    }
    seen.add(key);
    items.push({
      key,
      name: String(name).trim(),
      qty: qty != null ? qty : null,
      unit: unit || null,
      source: source || null,
      supplier: supplier || null,
    });
  }

  filterSite(state.batches || [], siteId).forEach((b) => {
    const qty = Number(b.qty != null ? b.qty : b.quantity);
    const min = Number(b.minQty != null ? b.minQty : b.reorderLevel);
    const low = Number.isFinite(min) ? qty <= min : (Number.isFinite(qty) && qty <= 2);
    if (low || optsSafe.includeAllStock) {
      addItem(b.name || b.product, Math.max(1, (min || 5) - (qty || 0)), b.unit, 'stock', b.supplier);
    }
  });

  if (optsSafe.menuId || optsSafe.fromMenus) {
    const menus = filterSite(state.menus || [], siteId).filter((m) =>
      !optsSafe.menuId || m.id === optsSafe.menuId);
    menus.forEach((m) => {
      menuDishList(m).forEach((item) => {
        const recipe = (state.recipes || []).find((r) =>
          r.id === item.recipeId
          || (r.name || '').toLowerCase() === String(item.name || item.recipeName || '').toLowerCase());
        ((recipe && recipe.ingredients) || item.ingredients || []).forEach((ing) => {
          if (typeof ing === 'string') addItem(ing, null, null, `menu:${m.name || m.id}`, null);
          else addItem(ing.name || ing.item, ing.qty || ing.quantity, ing.unit, `menu:${m.name || m.id}`, ing.supplier);
        });
      });
    });
  }

  if (optsSafe.recipeId) {
    const recipe = filterSite(state.recipes || [], siteId).find((r) => r.id === optsSafe.recipeId);
    ((recipe && recipe.ingredients) || []).forEach((ing) => {
      if (typeof ing === 'string') addItem(ing, null, null, `recipe:${recipe.name}`, null);
      else addItem(ing.name || ing.item, ing.qty || ing.quantity, ing.unit, `recipe:${recipe.name}`, ing.supplier);
    });
  }

  const suppliers = filterSite(state.suppliers || [], siteId);
  return {
    generatedAt: new Date().toISOString(),
    site: siteId,
    itemCount: items.length,
    items,
    suggestedSuppliers: suppliers.slice(0, 20).map((s) => ({ id: s.id, name: s.name })),
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
  const records = filterSite(state.records || [], siteId);
  const sensors = filterSite(state.sensors || [], siteId).map((s) => ({
    id: s.id,
    name: s.name,
    type: s.type || 'fridge',
    temp: s.temp,
    min: s.min,
    max: s.max,
    unit: s.unit || '°C',
    lastReading: s.lastReading || s.updatedAt,
    site: s.site,
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
  }).map((s) => ({ id: s.id, name: s.name, site: s.site }));
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

function allergenReport(state, siteId) {
  const recipes = filterSite(state.recipes || [], siteId);
  const statutory = state.allergens || [];
  const dishes = recipes.map((r) => ({
    id: r.id,
    name: r.name,
    allergens: r.allergens || [],
    status: r.status || 'draft',
    site: r.site,
  }));
  return { statutory, dishes };
}

function buildReport(state, siteId) {
  const temps = temperatureLogs(state, siteId);
  const haccp = haccpLogs(state, siteId);
  const waste = filterSite(state.waste || [], siteId);
  const labels = filterSite(state.labels || [], siteId);
  const recipes = filterSite(state.recipes || [], siteId);
  const recipeFoodCost = recipes.reduce((n, r) => n + (Number(r.cost) || 0), 0);
  const wasteCost = waste.reduce((n, w) => n + (Number(w.cost) || 0), 0);
  return {
    generatedAt: new Date().toISOString(),
    site: siteId,
    summary: {
      recipes: recipes.length,
      menus: filterSite(state.menus || [], siteId).length,
      temperatureCompliance: temps.sensors.length
        ? Math.round((temps.sensors.filter((s) => s.temp >= s.min && s.temp <= s.max).length / temps.sensors.length) * 100)
        : 100,
      missingFridgeLogsToday: temps.missingToday.length,
      openAlerts: filterSite(state.alerts || [], siteId).filter((a) => a.status === 'open').length,
      wasteEntries7d: waste.length,
      labelsActive: labels.filter((l) => !l.used).length,
      haccpChecks: haccp.complianceChecks.length,
      recipeFoodCostTotal: Math.round(recipeFoodCost * 100) / 100,
      wasteCostTotal: Math.round(wasteCost * 100) / 100,
      currency: (state.org && state.org.currency) || 'GBP',
    },
    cost: {
      currency: (state.org && state.org.currency) || 'GBP',
      recipeFoodCostTotal: Math.round(recipeFoodCost * 100) / 100,
      wasteCostTotal: Math.round(wasteCost * 100) / 100,
      topCostRecipes: recipes
        .slice()
        .sort((a, b) => (Number(b.cost) || 0) - (Number(a.cost) || 0))
        .slice(0, 10)
        .map((r) => ({ id: r.id, name: r.name, cost: Number(r.cost) || 0, servings: r.servings || 1 })),
    },
    compliance: {
      temperature: temps,
      haccp,
      openAlerts: filterSite(state.alerts || [], siteId).filter((a) => a.status === 'open').length,
    },
    temperature: temps,
    haccp,
    waste,
    labels,
  };
}

async function handleResource(method, name, ctx, db, ip, query, body, apiSend, writeDb) {
  const siteRes = resolveSiteId(ctx, query, body);
  if (siteRes.error) return apiSend(403, { error: siteRes.error });

  const siteId = siteRes.siteId;
  const meta = { site: siteId, resource: name, method };

  const mcpToolNames = new Set(aiMcp.TOOL_DEFS.map((t) => t.name));
  if (mcpToolNames.has(name)) {
    const args = Object.assign({}, query, body.data || {}, body, { site: body.site || query.site || siteId });
    if (name === 'search_recipes' || name === 'get_menus' || name === 'get_missing_temperature_logs') {
      // read-only — no confirm
    } else if (args.confirm !== true && args.confirm !== 'true') {
      return apiSend(409, {
        error: 'Confirmation required — resend with "confirm": true after the user approves',
        code: 'confirmation_required',
      });
    } else {
      args.confirm = true;
    }
    const tool = await aiMcp.runTool(name, args, ctx, db, writeDb, ip);
    if (!tool.ok) return apiSend(tool.status || 400, { error: tool.error, code: tool.code });
    return apiSend(200, tool.data);
  }

  if (name === 'me') {
    auditAi(db, ip, ctx, 'me', meta);
    const info = tenants.tenantInfo(db, ctx.user.email);
    return apiSend(200, aiMcp.sanitizePublic({
      email: ctx.user.email,
      name: ctx.user.name,
      company: (info && info.name) || (ctx.state.org && ctx.state.org.name) || null,
      role: aiAuth.resolveRole(ctx.state, ctx.user.email),
      permissions: ctx.permissions,
      sites: (ctx.state.sites || []).filter((s) => ctx.siteIds.includes(s.id)).map((s) => ({
        name: s.name,
        type: s.type || null,
        city: s.city || null,
      })),
      workspace: workspacePayload(ctx.state, ctx),
      token: { label: ctx.entry.label },
      platform: {
        product: 'Kiteline',
        description: 'Multipurpose business and hospitality-management platform — not limited to one cuisine, diet, or business type.',
      },
    }));
  }

  if (name === 'workspace') {
    if (method === 'GET') {
      auditAi(db, ip, ctx, 'workspace_read', meta);
      return apiSend(200, { workspace: workspacePayload(ctx.state, ctx) });
    }
    if (method === 'PATCH' || method === 'POST') {
      const role = aiAuth.resolveRole(ctx.state, ctx.user.email);
      if (!aiAuth.roleAtLeast(role, 'Admin')) {
        return apiSend(403, { error: 'Only Admins can update company workspace settings' });
      }
      const conf = aiAuth.requireConfirm(method, body);
      if (!conf.ok) return apiSend(409, conf);
      const data = body.data || body;
      const next = JSON.parse(JSON.stringify(ctx.state));
      next.org = next.org || {};
      if (data.businessType && BUSINESS_TYPES.includes(String(data.businessType))) {
        next.org.businessType = String(data.businessType);
      }
      if (data.name) next.org.name = String(data.name).slice(0, 120);
      if (data.dietary && typeof data.dietary === 'object') {
        const enabled = Array.isArray(data.dietary.enabled)
          ? data.dietary.enabled.map((x) => String(x).toLowerCase()).filter((x) => DIETARY_OPTIONS.includes(x))
          : ensureOrgDietary(next.org).enabled;
        next.org.dietary = {
          enabled,
          defaultProfile: data.dietary.defaultProfile
            ? String(data.dietary.defaultProfile).toLowerCase()
            : null,
          notes: String(data.dietary.notes || '').slice(0, 500),
        };
        if (next.org.dietary.defaultProfile && !DIETARY_OPTIONS.includes(next.org.dietary.defaultProfile)) {
          next.org.dietary.defaultProfile = null;
        }
      }
      saveState(db, ctx, next);
      writeDb(db);
      auditAi(db, ip, ctx, 'workspace_update', meta);
      return apiSend(200, { ok: true, workspace: workspacePayload(next, ctx) });
    }
  }

  if (name === 'search') {
    if (!aiAuth.hasPermission(ctx, 'read_recipes')
      && !aiAuth.hasPermission(ctx, 'manage_stock')
      && !aiAuth.hasPermission(ctx, 'manage_suppliers')) {
      return apiSend(403, { error: 'AI permission denied: read_recipes, manage_stock, or manage_suppliers' });
    }
    const q = (query.q || query.query || (body && (body.q || body.query)) || '').trim();
    auditAi(db, ip, ctx, 'search', meta);
    return apiSend(200, searchCatalog(ctx.state, siteId, q));
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

  if (name === 'recipes') {
    if (method === 'GET') {
      const perm = aiAuth.requirePermission(ctx, 'read_recipes');
      if (!perm.ok) return apiSend(403, { error: perm.error });
      const q = (query.q || query.query || '').trim();
      let recipes = filterSite(ctx.state.recipes || [], siteId);
      if (q) {
        recipes = recipes.filter((r) => textMatch(q, r.name, r.category, r.allergens, r.ingredients));
      }
      auditAi(db, ip, ctx, 'recipes_read', meta);
      return apiSend(200, { recipes, q: q || undefined, warning: siteRes.warning });
    }
    if (method === 'POST') {
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
      const q = (query.q || query.query || '').trim();
      let menus = filterSite(ctx.state.menus || [], siteId);
      if (q) menus = menus.filter((m) => textMatch(q, m.name, m.title, m.status, menuDishList(m)));
      auditAi(db, ip, ctx, 'menus_read', meta);
      return apiSend(200, {
        menus: menus.map((m) => aiMcp.sanitizePublic({
          name: m.name || m.title,
          status: m.status,
          dishCount: menuDishList(m).length,
          dishes: menuDishList(m).map((d) => ({ name: d.name || d.title, allergens: d.allergens || [] })),
        })),
        q: q || undefined,
      });
    }
    if (method === 'POST') {
      const tool = await aiMcp.runTool('create_menu', Object.assign({}, body.data || {}, body, {
        confirm: body.confirm === true,
        name: (body.data && body.data.name) || body.name,
        publish: !!body.publish,
        site: siteId,
      }), ctx, db, writeDb, ip);
      if (!tool.ok) return apiSend(tool.status || 400, { error: tool.error, code: tool.code });
      return apiSend(201, tool.data);
    }
  }

  if (name === 'allergens' || name === 'generate_allergen_report') {
    const perm = aiAuth.requirePermission(ctx, 'read_allergen_data');
    if (!perm.ok) return apiSend(403, { error: perm.error });
    if (name === 'generate_allergen_report' || query.export === '1' || body.confirm === true) {
      if (body.confirm !== true && query.confirm !== 'true') {
        return apiSend(409, {
          error: 'Confirmation required — resend with "confirm": true after the user approves this export',
          code: 'confirmation_required',
        });
      }
    }
    auditAi(db, ip, ctx, 'allergens_read', meta);
    return apiSend(200, aiMcp.sanitizePublic(allergenReport(ctx.state, siteId)));
  }

  if (name === 'nutrition') {
    const perm = aiAuth.requirePermission(ctx, 'read_allergen_data');
    if (!perm.ok) return apiSend(403, { error: perm.error });
    auditAi(db, ip, ctx, 'nutrition_read', meta);
    return apiSend(200, nutritionReport(ctx.state, siteId));
  }

  if (name === 'shopping-list' || name === 'ordering-list' || name === 'generate_shopping_list') {
    if (method === 'GET' || method === 'POST') {
      const opts = Object.assign({}, query, (body && (body.data || body)) || {}, { site: siteId });
      if (method === 'GET' && opts.confirm !== true && opts.confirm !== 'true') {
        return apiSend(409, {
          error: 'Confirmation required — resend with "confirm": true after the user approves this export',
          code: 'confirmation_required',
        });
      }
      if (method === 'POST') {
        const conf = aiAuth.requireConfirm(method, body);
        if (!conf.ok) return apiSend(409, conf);
      }
      const tool = await aiMcp.runTool('generate_shopping_list', Object.assign({}, opts, { confirm: true }), ctx, db, writeDb, ip);
      if (!tool.ok) return apiSend(tool.status || 400, { error: tool.error, code: tool.code });
      return apiSend(200, tool.data);
    }
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
        site: s.site,
      })),
    });
  }

  if (name === 'labels') {
    if (method === 'GET') {
      if (!aiAuth.hasPermission(ctx, 'read_recipes') && !aiAuth.hasPermission(ctx, 'manage_labels')) {
        return apiSend(403, { error: 'AI permission denied: read_recipes or manage_labels' });
      }
      auditAi(db, ip, ctx, 'labels_read', meta);
      return apiSend(200, { labels: filterSite(ctx.state.labels || [], siteId) });
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
      const q = (query.q || query.query || '').trim();
      let batches = filterSite(ctx.state.batches || [], siteId);
      let assets = filterSite(ctx.state.assets || [], siteId);
      if (q) {
        batches = batches.filter((b) => textMatch(q, b.name, b.product, b.sku, b.lot, b.supplier));
        assets = assets.filter((a) => textMatch(q, a.name, a.type, a.sku));
      }
      auditAi(db, ip, ctx, 'stock_read', meta);
      return apiSend(200, { batches, assets, q: q || undefined });
    }
  }

  if (name === 'suppliers') {
    if (!aiAuth.hasPermission(ctx, 'read_recipes') && !aiAuth.hasPermission(ctx, 'manage_suppliers')) {
      return apiSend(403, { error: 'AI permission denied: read_recipes or manage_suppliers' });
    }
    const q = (query.q || query.query || '').trim();
    let suppliers = filterSite(ctx.state.suppliers || [], siteId);
    if (q) suppliers = suppliers.filter((s) => textMatch(q, s.name, s.contact, s.email, s.phone, s.categories, s.notes));
    auditAi(db, ip, ctx, 'suppliers_read', meta);
    return apiSend(200, { suppliers, q: q || undefined });
  }

  if (name === 'orders') {
    if (!aiAuth.hasPermission(ctx, 'read_recipes') && !aiAuth.hasPermission(ctx, 'manage_suppliers')) {
      return apiSend(403, { error: 'AI permission denied: read_recipes or manage_suppliers' });
    }
    auditAi(db, ip, ctx, 'orders_read', meta);
    return apiSend(200, { orders: filterSite(ctx.state.deliveries || [], siteId) });
  }

  if (name === 'waste') {
    const perm = aiAuth.requirePermission(ctx, 'read_haccp_records');
    if (!perm.ok) return apiSend(403, { error: perm.error });
    auditAi(db, ip, ctx, 'waste_read', meta);
    return apiSend(200, { waste: filterSite(ctx.state.waste || [], siteId) });
  }

  if (name === 'rota') {
    if (!aiAuth.hasPermission(ctx, 'read_recipes') && !aiAuth.hasPermission(ctx, 'manage_rota')) {
      return apiSend(403, { error: 'AI permission denied: read_recipes or manage_rota' });
    }
    auditAi(db, ip, ctx, 'rota_read', meta);
    const team = filterSite(ctx.state.team || [], siteId).map((t) => aiMcp.sanitizePublic({
      name: t.name,
      role: t.role || t.access || null,
      email: t.email || null,
      site: ((ctx.state.sites || []).find((s) => s.id === (t.siteId || t.site)) || {}).name || null,
    }));
    return apiSend(200, {
      team,
      workflows: filterSite(ctx.state.workflows || [], siteId)
        .filter((w) => /rota|shift|schedule/i.test(w.label || ''))
        .map((w) => aiMcp.sanitizePublic({ label: w.label, status: w.status })),
      note: 'Full staff rota may be on a separate Kiteline rota module if enabled for your organisation. PINs and secrets are never returned.',
    });
  }

  if (name === 'reports') {
    const perm = aiAuth.requirePermission(ctx, 'export_reports', 'Manager');
    if (!perm.ok) {
      const readPerm = aiAuth.requirePermission(ctx, 'read_haccp_records');
      if (!readPerm.ok) return apiSend(403, { error: perm.error });
      auditAi(db, ip, ctx, 'reports_summary', meta);
      return apiSend(200, aiMcp.sanitizePublic({
        summaryOnly: true,
        message: 'Enable export_reports permission on the AI token for full inspection export. Full export also requires confirm: true.',
        report: {
          summary: buildReport(ctx.state, siteId).summary,
          workspace: workspacePayload(ctx.state, ctx),
        },
      }));
    }
    if (body.confirm !== true && query.confirm !== 'true') {
      return apiSend(409, {
        error: 'Confirmation required — resend with "confirm": true after the user approves this export',
        code: 'confirmation_required',
      });
    }
    auditAi(db, ip, ctx, 'reports_export', meta);
    return apiSend(200, aiMcp.sanitizePublic({
      export: true,
      report: Object.assign(buildReport(ctx.state, siteId), {
        allergens: allergenReport(ctx.state, siteId),
        nutrition: nutritionReport(ctx.state, siteId),
        shoppingList: buildShoppingList(ctx.state, siteId, { includeAllStock: false }),
        workspace: workspacePayload(ctx.state, ctx),
      }),
    }));
  }

  return apiSend(404, { error: 'Unknown AI resource' });
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
      version: '1.2.2',
      product: 'Kiteline multipurpose hospitality platform',
      mcp: 'https://kiteline.uk/mcp',
      auth: 'AI token (kl_ai_…) via Bearer or x-api-key — not user passwords',
      tenantScoped: true,
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
        howToConnect: {
          step1: 'Create a token here (POST) while signed in with your normal Kiteline session',
          step2: 'In ChatGPT → GPT Actions, import schema from https://kiteline.uk/api/ai/openapi.json',
          step3: 'Set Authentication to API key or Bearer with your kl_ai_… token',
          step4: 'Each token is locked to your company workspace — ChatGPT cannot see other customers',
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
    await apiSend(200, mcpInfo());
    return true;
  }

  await handleResource(method, resource, ctx, db, ip, query || {}, body, apiSend, writeDb);
  return true;
}

function mcpInfo() {
  return aiMcp.discovery();
}

module.exports = { handleApi, mcpInfo, DIETARY_OPTIONS, BUSINESS_TYPES };
