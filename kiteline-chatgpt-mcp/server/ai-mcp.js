'use strict';

/**
 * Kiteline MCP (Model Context Protocol) over HTTPS JSON-RPC.
 * Public URL: https://kiteline.uk/mcp
 *
 * Auth: Bearer or x-api-key with a kl_ai_… token from Settings → Connect ChatGPT.
 * Every tools/call is locked to that token's company workspace.
 */

const crypto = require('crypto');
const tenants = require('./tenants');
const security = require('./security');
const aiAuth = require('./ai-auth');

const PROTOCOL_VERSION = '2025-03-26';
const SERVER_INFO = {
  name: 'kiteline',
  version: '1.2.2',
  title: 'Kiteline',
};

const SENSITIVE_KEY = /^(password|passwd|pwd|pin|clockpin|adminpin|hash|secret|token|apikey|api_key|openai|openaiKeyEnc|credential|privatekey|authorization|ingest)$/i;

function uid(prefix) {
  return `${prefix}_${crypto.randomBytes(4).toString('hex')}`;
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

function menuDishList(menu) {
  if (!menu) return [];
  if (Array.isArray(menu.dishes) && menu.dishes.length) return menu.dishes;
  if (Array.isArray(menu.items) && menu.items.length) return menu.items;
  return Array.isArray(menu.dishes) ? menu.dishes : (menu.items || []);
}

/** Strip secrets / PINs / hashes. Replace internal ids with public refs. */
function sanitizePublic(value, depth) {
  const d = depth || 0;
  if (d > 12) return null;
  if (value == null) return value;
  if (Array.isArray(value)) return value.map((v) => sanitizePublic(v, d + 1));
  if (typeof value !== 'object') return value;
  const out = {};
  Object.keys(value).forEach((key) => {
    if (SENSITIVE_KEY.test(key)) return;
    if (/Enc$|Hash$|_hash$/i.test(key)) return;
    const v = value[key];
    if (key === 'id' || key === 'tenantId' || key === '_tenantId' || key === 'siteId') {
      // Prefer name-based refs; keep short public refs only when needed for ops
      if (typeof v === 'string' && /^(site_|rcp_|menu_|ait_|tenant_)/.test(v)) {
        out.ref = v.replace(/^.*_/, '').slice(0, 12);
      }
      return;
    }
    if (key === 'site' && typeof v === 'string' && v.startsWith('site_')) {
      out.siteRef = v.replace(/^site_/, '').slice(0, 16);
      return;
    }
    out[key] = sanitizePublic(v, d + 1);
  });
  return out;
}

function publicRecipe(r) {
  if (!r) return null;
  return sanitizePublic({
    name: r.name,
    category: r.category || null,
    status: r.status || 'draft',
    servings: r.servings || null,
    allergens: r.allergens || [],
    prepMins: r.prepMins || null,
    cookMins: r.cookMins || null,
    cost: r.cost != null ? Number(r.cost) : null,
  });
}

function publicMenu(m) {
  if (!m) return null;
  const dishes = menuDishList(m).map((d) => sanitizePublic({
    name: d.name || d.title,
    category: d.category || null,
    allergens: d.allergens || [],
    recipeName: d.recipeName || d.name || null,
  }));
  return sanitizePublic({
    name: m.name || m.title,
    status: m.status || 'draft',
    languages: m.languages || ['English'],
    dishCount: dishes.length,
    dishes,
  });
}

function publicSensor(s) {
  if (!s) return null;
  return sanitizePublic({
    name: s.name,
    type: s.type || 'fridge',
    temp: s.temp,
    min: s.min,
    max: s.max,
    unit: s.unit || '°C',
  });
}

function resolveSiteId(ctx, args) {
  const requested = String((args && (args.site || args.site_name)) || '').trim();
  const allowed = ctx.siteIds;
  const sites = (ctx.state.sites || []).filter((s) => allowed.includes(s.id));
  if (requested) {
    const byId = sites.find((s) => s.id === requested);
    if (byId) return { siteId: byId.id };
    const byName = sites.find((s) => (s.name || '').toLowerCase() === requested.toLowerCase());
    if (byName) return { siteId: byName.id };
    return { error: 'Site not allowed for this company workspace' };
  }
  if (allowed.length === 1) return { siteId: allowed[0] };
  if (ctx.state.currentSite && allowed.includes(ctx.state.currentSite)) {
    return { siteId: ctx.state.currentSite };
  }
  return { siteId: allowed[0] || null, warning: 'Multiple sites — pass site name if needed' };
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

function requireConfirm(args, actionLabel) {
  if (args && args.confirm === true) return { ok: true };
  return {
    ok: false,
    error: `Confirmation required for ${actionLabel}. Ask the user to approve, then call again with confirm: true.`,
    code: 'confirmation_required',
  };
}

function missingFridgeLogs(state, siteId) {
  const today = new Date().toISOString().slice(0, 10);
  const sensors = filterSite(state.sensors || [], siteId);
  const records = filterSite(state.records || [], siteId);
  return sensors.filter((s) => {
    const logged = records.some((r) => {
      const d = (r.at || r.date || '').slice(0, 10);
      return d === today && (
        r.sensor === s.id
        || (r.equipment || '').toLowerCase() === (s.name || '').toLowerCase()
        || (r.equipment || '').toLowerCase().includes((s.name || '').toLowerCase())
      );
    });
    return !logged;
  }).map(publicSensor);
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

  if (optsSafe.menuName || optsSafe.menuId || optsSafe.fromMenus) {
    const menus = filterSite(state.menus || [], siteId).filter((m) => {
      if (optsSafe.menuId && m.id === optsSafe.menuId) return true;
      if (optsSafe.menuName) {
        return (m.name || m.title || '').toLowerCase() === String(optsSafe.menuName).toLowerCase();
      }
      return !!optsSafe.fromMenus;
    });
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

  if (optsSafe.recipeName || optsSafe.recipeId) {
    const recipe = filterSite(state.recipes || [], siteId).find((r) =>
      r.id === optsSafe.recipeId
      || (r.name || '').toLowerCase() === String(optsSafe.recipeName || '').toLowerCase());
    ((recipe && recipe.ingredients) || []).forEach((ing) => {
      if (typeof ing === 'string') addItem(ing, null, null, `recipe:${recipe.name}`, null);
      else addItem(ing.name || ing.item, ing.qty || ing.quantity, ing.unit, `recipe:${recipe.name}`, ing.supplier);
    });
  }

  // Default: include low stock + ingredients from all site menus' dishes
  if (!optsSafe.menuName && !optsSafe.menuId && !optsSafe.recipeName && !optsSafe.recipeId && !optsSafe.fromMenus) {
    filterSite(state.menus || [], siteId).forEach((m) => {
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

  const suppliers = filterSite(state.suppliers || [], siteId);
  return sanitizePublic({
    generatedAt: new Date().toISOString(),
    itemCount: items.length,
    items: items.map(({ key, ...rest }) => rest),
    suggestedSuppliers: suppliers.slice(0, 20).map((s) => ({ name: s.name })),
  });
}

function allergenReport(state, siteId) {
  const recipes = filterSite(state.recipes || [], siteId);
  return sanitizePublic({
    generatedAt: new Date().toISOString(),
    statutory: state.allergens || [],
    dishCount: recipes.length,
    dishes: recipes.map((r) => ({
      name: r.name,
      allergens: r.allergens || [],
      status: r.status || 'draft',
    })),
  });
}

const TOOL_DEFS = [
  {
    name: 'search_recipes',
    description: 'Search recipes, products and dishes saved in this Kiteline company workspace only. Use this when the user asks about dishes, recipes or products.',
    inputSchema: {
      type: 'object',
      properties: {
        q: { type: 'string', description: 'Search query' },
        site: { type: 'string', description: 'Optional kitchen / site name' },
      },
    },
    mutating: false,
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: 'create_menu',
    description:
      'Create a menu in this Kiteline company workspace using all dishes (recipes) already saved for the site. Requires user confirmation.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Menu name' },
        site: { type: 'string', description: 'Optional kitchen / site name' },
        publish: { type: 'boolean', description: 'Publish immediately (needs publish permission)' },
        confirm: { type: 'boolean', description: 'Must be true after user approval' },
      },
      required: ['name'],
    },
    mutating: true,
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  },
  {
    name: 'get_menus',
    description: 'List menus for this Kiteline company workspace, including all linked dishes. Use this when the user asks what menus exist.',
    inputSchema: {
      type: 'object',
      properties: {
        q: { type: 'string' },
        site: { type: 'string' },
      },
    },
    mutating: false,
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: 'get_missing_temperature_logs',
    description: 'List fridge/freezer units that have no temperature log for today in this Kiteline company workspace.',
    inputSchema: {
      type: 'object',
      properties: { site: { type: 'string' } },
    },
    mutating: false,
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: 'add_temperature_log',
    description: 'Add a temperature record for a unit in this Kiteline company workspace. Requires user confirmation.',
    inputSchema: {
      type: 'object',
      properties: {
        equipment: { type: 'string', description: 'Sensor / equipment name' },
        temp: { type: 'number', description: 'Temperature reading' },
        unit: { type: 'string', description: 'e.g. °C' },
        notes: { type: 'string' },
        site: { type: 'string' },
        confirm: { type: 'boolean' },
      },
      required: ['equipment', 'temp'],
    },
    mutating: true,
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  },
  {
    name: 'generate_allergen_report',
    description: 'Generate an allergen report from dishes in this Kiteline company workspace. Export requires user confirmation.',
    inputSchema: {
      type: 'object',
      properties: {
        site: { type: 'string' },
        confirm: { type: 'boolean' },
      },
    },
    mutating: true,
    annotations: { readOnlyHint: false, openWorldHint: false },
  },
  {
    name: 'generate_shopping_list',
    description: 'Generate a shopping / ordering list from stock and menu dishes in this Kiteline company workspace. Export requires user confirmation.',
    inputSchema: {
      type: 'object',
      properties: {
        site: { type: 'string' },
        menuName: { type: 'string' },
        recipeName: { type: 'string' },
        fromMenus: { type: 'boolean' },
        includeAllStock: { type: 'boolean' },
        confirm: { type: 'boolean' },
      },
    },
    mutating: true,
    annotations: { readOnlyHint: false, openWorldHint: false },
  },
];

function audit(db, ip, ctx, action, detail) {
  security.audit(db, 'ai_mcp', {
    ip,
    email: ctx.user.email,
    detail: JSON.stringify({
      actionType: action,
      tenantId: ctx.user.tenantId,
      orgName: ctx.state.org && ctx.state.org.name,
      at: new Date().toISOString(),
      detail: detail || null,
    }),
  });
}

async function runTool(name, args, ctx, db, writeDb, ip) {
  const siteRes = resolveSiteId(ctx, args || {});
  if (siteRes.error) return { ok: false, error: siteRes.error, status: 403 };
  const siteId = siteRes.siteId;
  const siteName = ((ctx.state.sites || []).find((s) => s.id === siteId) || {}).name || null;

  if (name === 'search_recipes') {
    const perm = aiAuth.requirePermission(ctx, 'read_recipes');
    if (!perm.ok) return { ok: false, error: perm.error, status: 403 };
    const q = String((args && (args.q || args.query)) || '').trim();
    const recipes = filterSite(ctx.state.recipes || [], siteId)
      .filter((r) => textMatch(q, r.name, r.category, r.allergens, r.ingredients))
      .map(publicRecipe);
    audit(db, ip, ctx, 'search_recipes', { q, site: siteName });
    return {
      ok: true,
      data: sanitizePublic({
        q,
        site: siteName,
        count: recipes.length,
        recipes: recipes.slice(0, 100),
        note: 'Results are limited to this company workspace only.',
      }),
    };
  }

  if (name === 'get_menus') {
    const perm = aiAuth.requirePermission(ctx, 'read_recipes');
    if (!perm.ok) return { ok: false, error: perm.error, status: 403 };
    const q = String((args && (args.q || args.query)) || '').trim();
    let menus = filterSite(ctx.state.menus || [], siteId);
    if (q) {
      menus = menus.filter((m) => textMatch(q, m.name, m.title, m.status, menuDishList(m)));
    }
    audit(db, ip, ctx, 'get_menus', { q, site: siteName });
    return {
      ok: true,
      data: sanitizePublic({
        site: siteName,
        count: menus.length,
        menus: menus.map(publicMenu),
      }),
    };
  }

  if (name === 'create_menu') {
    const publish = !!(args && args.publish);
    const permKey = publish ? 'publish_menus' : 'create_menu_drafts';
    const perm = aiAuth.requirePermission(ctx, permKey, publish ? 'Manager' : 'Staff');
    if (!perm.ok) return { ok: false, error: perm.error, status: 403 };
    const conf = requireConfirm(args, 'create_menu');
    if (!conf.ok) return { ok: false, error: conf.error, code: conf.code, status: 409 };
    const menuName = String((args && args.name) || '').trim();
    if (!menuName) return { ok: false, error: 'Menu name is required', status: 400 };

    const allDishes = filterSite(ctx.state.recipes || [], siteId).map((r) => ({
      name: r.name,
      recipeId: r.id,
      recipeName: r.name,
      allergens: r.allergens || [],
      category: r.category || null,
      cost: r.cost || 0,
      servings: r.servings || 1,
    }));

    const menu = {
      id: uid('menu'),
      name: menuName,
      site: siteId,
      status: publish ? 'published' : 'draft',
      languages: ['English'],
      dishes: allDishes,
      items: allDishes,
      createdAt: new Date().toISOString(),
      createdBy: ctx.user.email,
      source: 'mcp_create_menu',
    };

    const next = JSON.parse(JSON.stringify(ctx.state));
    next.menus = next.menus || [];
    next.menus.push(menu);
    saveState(db, ctx, next);
    writeDb(db);
    audit(db, ip, ctx, 'create_menu', { name: menuName, dishes: allDishes.length, site: siteName });
    return {
      ok: true,
      data: sanitizePublic({
        ok: true,
        site: siteName,
        menu: publicMenu(menu),
        message: `Menu "${menuName}" created with ${allDishes.length} dishes from this company account.`,
      }),
    };
  }

  if (name === 'get_missing_temperature_logs') {
    const perm = aiAuth.requirePermission(ctx, 'read_temperature_logs');
    if (!perm.ok) return { ok: false, error: perm.error, status: 403 };
    const missing = missingFridgeLogs(ctx.state, siteId);
    audit(db, ip, ctx, 'get_missing_temperature_logs', { site: siteName, count: missing.length });
    return {
      ok: true,
      data: sanitizePublic({
        site: siteName,
        date: new Date().toISOString().slice(0, 10),
        missingCount: missing.length,
        missing,
      }),
    };
  }

  if (name === 'add_temperature_log') {
    const perm = aiAuth.requirePermission(ctx, 'add_temperature_logs', 'Staff');
    if (!perm.ok) return { ok: false, error: perm.error, status: 403 };
    const conf = requireConfirm(args, 'add_temperature_log');
    if (!conf.ok) return { ok: false, error: conf.error, code: conf.code, status: 409 };
    const equipment = String((args && (args.equipment || args.sensor || args.name)) || '').trim();
    const temp = Number(args && args.temp);
    if (!equipment) return { ok: false, error: 'equipment name is required', status: 400 };
    if (!Number.isFinite(temp)) return { ok: false, error: 'temp must be a number', status: 400 };

    const sensors = filterSite(ctx.state.sensors || [], siteId);
    const sensor = sensors.find((s) => (s.name || '').toLowerCase() === equipment.toLowerCase())
      || sensors.find((s) => (s.name || '').toLowerCase().includes(equipment.toLowerCase()));

    const record = {
      id: uid('rec'),
      site: siteId,
      at: new Date().toISOString(),
      by: ctx.user.email,
      type: 'temperature',
      equipment: (sensor && sensor.name) || equipment,
      sensor: sensor ? sensor.id : undefined,
      temp,
      unit: (args && args.unit) || (sensor && sensor.unit) || '°C',
      notes: args && args.notes ? String(args.notes).slice(0, 500) : '',
    };

    const next = JSON.parse(JSON.stringify(ctx.state));
    next.records = next.records || [];
    next.records.push(record);
    if (sensor) {
      next.sensors = (next.sensors || []).map((s) => {
        if (s.id !== sensor.id) return s;
        return Object.assign({}, s, { temp, lastReading: record.at, updatedAt: record.at });
      });
    }
    saveState(db, ctx, next);
    writeDb(db);
    audit(db, ip, ctx, 'add_temperature_log', { equipment: record.equipment, temp, site: siteName });
    return {
      ok: true,
      data: sanitizePublic({
        ok: true,
        site: siteName,
        log: {
          equipment: record.equipment,
          temp: record.temp,
          unit: record.unit,
          at: record.at,
          notes: record.notes || null,
        },
      }),
    };
  }

  if (name === 'generate_allergen_report') {
    const perm = aiAuth.requirePermission(ctx, 'read_allergen_data');
    if (!perm.ok) return { ok: false, error: perm.error, status: 403 };
    const conf = requireConfirm(args, 'generate_allergen_report');
    if (!conf.ok) return { ok: false, error: conf.error, code: conf.code, status: 409 };
    audit(db, ip, ctx, 'generate_allergen_report', { site: siteName });
    return {
      ok: true,
      data: Object.assign(allergenReport(ctx.state, siteId), { site: siteName }),
    };
  }

  if (name === 'generate_shopping_list') {
    if (!aiAuth.hasPermission(ctx, 'manage_stock')
      && !aiAuth.hasPermission(ctx, 'manage_suppliers')
      && !aiAuth.hasPermission(ctx, 'read_recipes')) {
      return { ok: false, error: 'AI permission denied for shopping list', status: 403 };
    }
    const conf = requireConfirm(args, 'generate_shopping_list');
    if (!conf.ok) return { ok: false, error: conf.error, code: conf.code, status: 409 };
    const list = buildShoppingList(ctx.state, siteId, args || {});
    audit(db, ip, ctx, 'generate_shopping_list', { site: siteName, items: list.itemCount });
    return { ok: true, data: Object.assign(list, { site: siteName }) };
  }

  return { ok: false, error: `Unknown tool: ${name}`, status: 404 };
}

function discovery() {
  return {
    name: SERVER_INFO.name,
    title: SERVER_INFO.title,
    version: SERVER_INFO.version,
    status: 'ready',
    protocol: 'mcp',
    protocolVersion: PROTOCOL_VERSION,
    transport: 'streamable-http',
    endpoint: 'https://kiteline.uk/mcp',
    description:
      'Secure Kiteline MCP for ChatGPT. Each AI token is locked to one company workspace. '
      + 'Hotels, restaurants, catering, schools, care homes, cafés and other hospitality businesses '
      + 'each keep private recipes, menus, stock, staff and compliance data.',
    authentication: {
      type: 'mixed',
      note: 'initialize and tools/list need no auth. tools/call needs Bearer kl_ai_… or OAuth.',
      header_bearer: 'Authorization: Bearer kl_ai_…',
      header_api_key: 'x-api-key: kl_ai_…',
      how_to_create_token: 'Sign in to Kiteline → Settings → Connect ChatGPT → Create AI token',
      oauth: 'https://kiteline.uk/api/ai/oauth',
    },
    chatgpt_setup: {
      important: 'Kiteline will NOT appear in ChatGPT Apps until you CREATE it once.',
      steps: [
        'Open ChatGPT on the web (Plus/Pro/Business/Enterprise).',
        'Settings → Security and login → turn ON Developer mode.',
        'Go to https://chatgpt.com/plugins (or Settings → Apps/Plugins).',
        'Click + / Create developer-mode app.',
        'Name: Kiteline',
        'MCP server URL: https://kiteline.uk/mcp (no trailing slash)',
        'Auth: Mixed or No authentication for scan; for tools use your kl_ai_ token / OAuth.',
        'Click Create / Scan tools — you should see 7 Kiteline tools.',
        'In a new chat: + → Developer mode → enable Kiteline (not Kitchen OS).',
        'Send: @Kiteline List all available Kiteline tools and show my business profile.',
      ],
    },
    methods: ['initialize', 'tools/list', 'tools/call', 'ping'],
    tools: TOOL_DEFS.map((t) => ({
      name: t.name,
      description: t.description,
      mutating: t.mutating,
      confirmationRequired: t.mutating,
      annotations: t.annotations || null,
    })),
    openapi: 'https://kiteline.uk/api/ai/openapi.json',
    health: 'https://kiteline.uk/api/ai/health',
    logo: 'https://kiteline.uk/chatgpt-gpt-logo.png',
    chatgpt_gpt_editor: 'https://chatgpt.com/gpts/editor',
    docs: 'https://kiteline.uk/chatgpt.html',
  };
}

function jsonRpcResult(id, result) {
  return { jsonrpc: '2.0', id: id == null ? null : id, result };
}

function jsonRpcError(id, code, message, data) {
  return {
    jsonrpc: '2.0',
    id: id == null ? null : id,
    error: { code, message, data: data || undefined },
  };
}

function toolContent(obj) {
  return {
    content: [{ type: 'text', text: JSON.stringify(obj, null, 2) }],
    structuredContent: obj,
  };
}

async function handleJsonRpc(body, opts) {
  const { db, req, ip, writeDb } = opts;
  const msg = body && typeof body === 'object' ? body : null;
  if (!msg || msg.jsonrpc !== '2.0' || !msg.method) {
    return { status: 400, payload: jsonRpcError(null, -32600, 'Invalid Request') };
  }

  const id = msg.id;
  const method = String(msg.method);
  const params = msg.params || {};

  if (method === 'initialize') {
    return {
      status: 200,
      payload: jsonRpcResult(id, {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
        instructions:
          'Authenticate with a Kiteline AI token (Bearer kl_ai_…). '
          + 'All tools are scoped to the logged-in company workspace only. '
          + 'Mutating/export tools require confirm: true after user approval.',
      }),
    };
  }

  if (method === 'notifications/initialized' || method === 'initialized' || method.startsWith('notifications/')) {
    // Streamable HTTP: notifications get 202 Accepted with empty body
    return { status: 202, payload: null, empty: true };
  }

  if (method === 'ping') {
    return { status: 200, payload: jsonRpcResult(id, {}) };
  }

  if (method === 'tools/list') {
    return {
      status: 200,
      payload: jsonRpcResult(id, {
        tools: TOOL_DEFS.map((t) => ({
          name: t.name,
          description: t.description,
          inputSchema: t.inputSchema,
          annotations: t.annotations || undefined,
        })),
      }),
    };
  }

  if (method === 'tools/call') {
    const auth = aiAuth.resolveAiAuth(db, req);
    if (!auth) {
      return {
        status: 401,
        payload: jsonRpcError(id, -32001, 'Unauthorized', {
          hint: 'Send Authorization: Bearer kl_ai_… or x-api-key. Create tokens in Settings → Connect ChatGPT.',
        }),
      };
    }
    const ctx = buildContext(db, auth);
    if (ctx.error) {
      return { status: ctx.status || 403, payload: jsonRpcError(id, -32003, ctx.error) };
    }

    const toolName = String((params && params.name) || '');
    let args = (params && params.arguments) || {};
    if (typeof args === 'string') {
      try { args = JSON.parse(args); } catch { args = {}; }
    }

    const def = TOOL_DEFS.find((t) => t.name === toolName);
    if (!def) {
      return { status: 200, payload: jsonRpcResult(id, toolContent({ error: `Unknown tool: ${toolName}` })) };
    }

    try {
      const result = await runTool(toolName, args, ctx, db, writeDb, ip);
      if (!result.ok) {
        return {
          status: 200,
          payload: jsonRpcResult(id, {
            ...toolContent({
              error: result.error,
              code: result.code || undefined,
              confirmation_required: result.code === 'confirmation_required' || undefined,
            }),
            isError: true,
          }),
        };
      }
      return { status: 200, payload: jsonRpcResult(id, toolContent(result.data)) };
    } catch (err) {
      return {
        status: 200,
        payload: jsonRpcResult(id, {
          ...toolContent({ error: err.message || 'Tool failed' }),
          isError: true,
        }),
      };
    }
  }

  return { status: 404, payload: jsonRpcError(id, -32601, `Method not found: ${method}`) };
}

function wantsEventStream(req) {
  const accept = String((req.headers && req.headers.accept) || '').toLowerCase();
  return accept.includes('text/event-stream');
}

function mcpCorsOrigin(req) {
  const origin = (req && req.headers && req.headers.origin) || '';
  if (!origin) return '*';
  if (/^https:\/\/([a-z0-9-]+\.)?(chatgpt\.com|openai\.com|oaistatic\.com)$/i.test(origin)) return origin;
  return security.corsOrigin(req, process.env.NODE_ENV === 'production' || !!process.env.RENDER);
}

function writeRaw(res, req, status, payload, extraHeaders) {
  const cors = mcpCorsOrigin(req);
  const headers = Object.assign({
    'Access-Control-Allow-Origin': cors,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key, Accept, Mcp-Session-Id',
    'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
    'Access-Control-Expose-Headers': 'Mcp-Session-Id',
    'Vary': 'Origin',
    'Cache-Control': 'no-store',
  }, extraHeaders || {});
  if (payload == null) {
    res.writeHead(status, security.securityHeaders(headers));
    return res.end();
  }
  headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  const body = typeof payload === 'string' ? payload : JSON.stringify(payload);
  res.writeHead(status, security.securityHeaders(headers));
  return res.end(body);
}

async function handleHttp(opts) {
  const {
    req, res, method, body, db, writeDb, ip, send,
  } = opts;

  // CORS preflight for ChatGPT browser clients
  if (method === 'OPTIONS') {
    return writeRaw(res, req, 204, null);
  }

  // Streamable HTTP GET: clients asking for SSE — we don't keep long-lived server push streams
  if ((method === 'GET' || method === 'HEAD') && wantsEventStream(req)) {
    return writeRaw(res, req, 405, { error: 'SSE listen not required; use POST JSON-RPC (streamable HTTP).' });
  }

  // Human / browser discovery document
  if (method === 'GET' || method === 'HEAD') {
    return send(res, 200, discovery(), null, req);
  }

  if (method === 'DELETE') {
    // Session terminate (optional) — acknowledge
    return writeRaw(res, req, 200, { ok: true });
  }

  if (method === 'POST') {
    const rpc = await handleJsonRpc(body, { db, req, ip, writeDb });
    if (rpc.empty) {
      return writeRaw(res, req, rpc.status || 202, null);
    }
    const extra = {};
    if (body && body.method === 'initialize') {
      extra['Mcp-Session-Id'] = crypto.randomBytes(16).toString('hex');
    }
    return writeRaw(res, req, rpc.status, rpc.payload, extra);
  }

  return send(res, 405, { error: 'Method not allowed. Use GET (discovery) or POST (JSON-RPC).' }, null, req);
}

module.exports = {
  handleHttp,
  handleJsonRpc,
  discovery,
  runTool,
  TOOL_DEFS,
  sanitizePublic,
  buildContext,
  menuDishList,
  PROTOCOL_VERSION,
};
