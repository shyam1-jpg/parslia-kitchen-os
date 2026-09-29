'use strict';

const crypto = require('crypto');

function uid(prefix) {
  return `${prefix}_${crypto.randomBytes(4).toString('hex')}`;
}

function ensureCollections(state) {
  if (!Array.isArray(state.stockItems)) state.stockItems = [];
  if (!Array.isArray(state.stockMovements)) state.stockMovements = [];
  if (!Array.isArray(state.purchaseOrders)) state.purchaseOrders = [];
}

const STARTER = [
  { name: 'Whole milk', unit: 'L', qty: 20, reorder: 8, cost: 0.95 },
  { name: 'Butter unsalted', unit: 'kg', qty: 4, reorder: 2, cost: 7.5 },
  { name: 'Chicken breast', unit: 'kg', qty: 8, reorder: 4, cost: 6.2 },
  { name: 'Rapeseed oil', unit: 'L', qty: 10, reorder: 3, cost: 2.4 },
  { name: 'Plain flour', unit: 'kg', qty: 12, reorder: 5, cost: 0.8 },
  { name: 'Sanitiser (food-safe)', unit: 'L', qty: 6, reorder: 2, cost: 3.1 },
  { name: 'Disposable gloves (M)', unit: 'box', qty: 5, reorder: 2, cost: 4.5 },
  { name: 'Cling film', unit: 'roll', qty: 8, reorder: 3, cost: 2.2 },
];

function seedSiteIfEmpty(state, siteId) {
  ensureCollections(state);
  const existing = state.stockItems.filter((i) => i.siteId === siteId);
  if (existing.length) return false;
  const supplierId = (state.suppliers && state.suppliers[0] && state.suppliers[0].id) || null;
  STARTER.forEach((row, idx) => {
    state.stockItems.push({
      id: uid('stk'),
      siteId,
      name: row.name,
      sku: `SKU-${String(idx + 1).padStart(3, '0')}`,
      unit: row.unit,
      qtyOnHand: row.qty,
      reorderLevel: row.reorder,
      unitCost: row.cost,
      supplierId,
      active: true,
      createdAt: new Date().toISOString(),
    });
  });
  return true;
}

function itemsForSite(state, siteId) {
  ensureCollections(state);
  return state.stockItems.filter((i) => i.siteId === siteId && i.active !== false);
}

function lowStock(items) {
  return items.filter((i) => Number(i.qtyOnHand) <= Number(i.reorderLevel || 0));
}

function listStock(state, siteId) {
  const items = itemsForSite(state, siteId);
  const movements = (state.stockMovements || [])
    .filter((m) => m.siteId === siteId)
    .sort((a, b) => new Date(b.at) - new Date(a.at))
    .slice(0, 40);
  const value = items.reduce((n, i) => n + (Number(i.qtyOnHand) || 0) * (Number(i.unitCost) || 0), 0);
  return {
    items,
    movements,
    summary: {
      skuCount: items.length,
      lowStock: lowStock(items).length,
      stockValue: Math.round(value * 100) / 100,
    },
  };
}

function upsertItem(state, siteId, body, email) {
  ensureCollections(state);
  const name = String(body.name || '').trim();
  if (!name) return { ok: false, error: 'Name required' };
  let item = body.id ? state.stockItems.find((i) => i.id === body.id && i.siteId === siteId) : null;
  if (body.id && !item) return { ok: false, error: 'Item not found' };
  if (!item) {
    item = {
      id: uid('stk'),
      siteId,
      createdAt: new Date().toISOString(),
      active: true,
    };
    state.stockItems.push(item);
  }
  item.name = name;
  item.sku = String(body.sku || item.sku || '').trim();
  item.unit = String(body.unit || item.unit || 'each').trim();
  if (body.qtyOnHand != null) item.qtyOnHand = Number(body.qtyOnHand) || 0;
  if (item.qtyOnHand == null) item.qtyOnHand = 0;
  item.reorderLevel = Number(body.reorderLevel != null ? body.reorderLevel : item.reorderLevel) || 0;
  item.unitCost = Number(body.unitCost != null ? body.unitCost : item.unitCost) || 0;
  item.supplierId = body.supplierId || item.supplierId || null;
  if (typeof body.active === 'boolean') item.active = body.active;
  item.updatedAt = new Date().toISOString();
  item.updatedBy = email || null;
  return { ok: true, item };
}

function moveStock(state, siteId, body, email) {
  ensureCollections(state);
  const item = state.stockItems.find((i) => i.id === body.stockItemId && i.siteId === siteId);
  if (!item) return { ok: false, error: 'Stock item not found' };
  const type = String(body.type || 'adjust');
  if (!['in', 'out', 'adjust', 'waste'].includes(type)) return { ok: false, error: 'Invalid movement type' };
  let qty = Number(body.qty);
  if (!Number.isFinite(qty) || qty === 0) return { ok: false, error: 'Quantity required' };
  if (type === 'out' || type === 'waste') qty = -Math.abs(qty);
  if (type === 'in') qty = Math.abs(qty);
  // adjust uses signed qty as provided
  const next = (Number(item.qtyOnHand) || 0) + qty;
  if (next < 0) return { ok: false, error: 'Insufficient stock' };
  item.qtyOnHand = Math.round(next * 1000) / 1000;
  item.updatedAt = new Date().toISOString();
  const movement = {
    id: uid('sm'),
    siteId,
    stockItemId: item.id,
    type,
    qty,
    reason: String(body.reason || '').trim(),
    at: new Date().toISOString(),
    by: email || null,
  };
  state.stockMovements.unshift(movement);
  return { ok: true, item, movement };
}

function listOrders(state, siteId) {
  ensureCollections(state);
  const orders = state.purchaseOrders
    .filter((o) => o.siteId === siteId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return {
    orders,
    summary: {
      draft: orders.filter((o) => o.status === 'draft').length,
      sent: orders.filter((o) => o.status === 'sent').length,
      received: orders.filter((o) => o.status === 'received').length,
    },
  };
}

function createOrder(state, siteId, body, email) {
  ensureCollections(state);
  const lines = Array.isArray(body.lines) ? body.lines : [];
  const clean = lines
    .map((l) => ({
      stockItemId: l.stockItemId || null,
      name: String(l.name || '').trim(),
      qty: Number(l.qty) || 0,
      unit: String(l.unit || 'each'),
      unitCost: Number(l.unitCost) || 0,
    }))
    .filter((l) => l.name && l.qty > 0);
  if (!clean.length) return { ok: false, error: 'Add at least one line' };
  const order = {
    id: uid('po'),
    siteId,
    supplierId: body.supplierId || null,
    status: body.status === 'sent' ? 'sent' : 'draft',
    lines: clean,
    expectedAt: body.expectedAt || null,
    orderedAt: body.status === 'sent' ? new Date().toISOString() : null,
    notes: String(body.notes || '').trim(),
    createdBy: email || null,
    createdAt: new Date().toISOString(),
  };
  state.purchaseOrders.unshift(order);
  return { ok: true, order };
}

function updateOrder(state, siteId, body, email) {
  ensureCollections(state);
  const order = state.purchaseOrders.find((o) => o.id === body.id && o.siteId === siteId);
  if (!order) return { ok: false, error: 'Order not found' };
  if (body.status) {
    const st = String(body.status);
    if (!['draft', 'sent', 'received', 'cancelled'].includes(st)) {
      return { ok: false, error: 'Invalid status' };
    }
    // Receiving stock applies inbound movements once
    if (st === 'received' && order.status !== 'received') {
      (order.lines || []).forEach((line) => {
        if (line.stockItemId) {
          moveStock(state, siteId, {
            stockItemId: line.stockItemId,
            type: 'in',
            qty: line.qty,
            reason: `PO ${order.id}`,
          }, email);
        } else if (line.name) {
          const upsert = upsertItem(state, siteId, {
            name: line.name,
            unit: line.unit,
            qtyOnHand: 0,
            unitCost: line.unitCost,
            supplierId: order.supplierId,
          }, email);
          if (upsert.ok) {
            line.stockItemId = upsert.item.id;
            moveStock(state, siteId, {
              stockItemId: upsert.item.id,
              type: 'in',
              qty: line.qty,
              reason: `PO ${order.id}`,
            }, email);
          }
        }
      });
      order.receivedAt = new Date().toISOString();
    }
    if (st === 'sent' && !order.orderedAt) order.orderedAt = new Date().toISOString();
    order.status = st;
  }
  if (body.notes != null) order.notes = String(body.notes);
  if (body.expectedAt != null) order.expectedAt = body.expectedAt;
  if (body.supplierId != null) order.supplierId = body.supplierId;
  order.updatedAt = new Date().toISOString();
  order.updatedBy = email || null;
  return { ok: true, order };
}

/** Build draft PO lines from low-stock items */
function suggestOrderFromLowStock(state, siteId) {
  const items = lowStock(itemsForSite(state, siteId));
  return items.map((i) => ({
    stockItemId: i.id,
    name: i.name,
    qty: Math.max(1, (Number(i.reorderLevel) || 1) * 2 - (Number(i.qtyOnHand) || 0)),
    unit: i.unit || 'each',
    unitCost: i.unitCost || 0,
    supplierId: i.supplierId || null,
  }));
}

module.exports = {
  ensureCollections,
  seedSiteIfEmpty,
  listStock,
  upsertItem,
  moveStock,
  listOrders,
  createOrder,
  updateOrder,
  suggestOrderFromLowStock,
  lowStock,
};
