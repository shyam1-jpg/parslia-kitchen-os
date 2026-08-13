#!/usr/bin/env node
'use strict';

const assert = require('assert');
const inv = require('../runtime/server/saas/inventory');

let passed = 0;
function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log('PASS', name);
  } catch (e) {
    console.error('FAIL', name, e.message);
    process.exitCode = 1;
  }
}

function blank() {
  return { stockItems: [], stockMovements: [], purchaseOrders: [], suppliers: [{ id: 'sup1', name: 'Brakes' }] };
}

test('seeds starter stock once per site', () => {
  const state = blank();
  assert.strictEqual(inv.seedSiteIfEmpty(state, 'site_a'), true);
  assert.ok(state.stockItems.length >= 5);
  assert.strictEqual(inv.seedSiteIfEmpty(state, 'site_a'), false);
  assert.strictEqual(inv.seedSiteIfEmpty(state, 'site_b'), true);
});

test('stock move in/out and reject negative', () => {
  const state = blank();
  inv.seedSiteIfEmpty(state, 'site_a');
  const item = state.stockItems[0];
  const start = item.qtyOnHand;
  const out = inv.moveStock(state, 'site_a', { stockItemId: item.id, type: 'out', qty: 1, reason: 'use' }, 'mgr@a.com');
  assert.ok(out.ok);
  assert.strictEqual(item.qtyOnHand, start - 1);
  const bad = inv.moveStock(state, 'site_a', { stockItemId: item.id, type: 'out', qty: 99999 }, 'mgr@a.com');
  assert.strictEqual(bad.ok, false);
});

test('purchase order receive updates stock', () => {
  const state = blank();
  const up = inv.upsertItem(state, 'site_a', { name: 'Rice', unit: 'kg', qtyOnHand: 1, reorderLevel: 5, unitCost: 1.2 }, 'a');
  assert.ok(up.ok);
  const po = inv.createOrder(state, 'site_a', {
    supplierId: 'sup1',
    status: 'sent',
    lines: [{ stockItemId: up.item.id, name: 'Rice', qty: 10, unit: 'kg', unitCost: 1.2 }],
  }, 'a');
  assert.ok(po.ok);
  const recv = inv.updateOrder(state, 'site_a', { id: po.order.id, status: 'received' }, 'a');
  assert.ok(recv.ok);
  assert.strictEqual(up.item.qtyOnHand, 11);
});

test('low stock suggestions', () => {
  const state = blank();
  inv.upsertItem(state, 'site_a', { name: 'Oil', unit: 'L', qtyOnHand: 1, reorderLevel: 5, unitCost: 2 }, 'a');
  const sug = inv.suggestOrderFromLowStock(state, 'site_a');
  assert.strictEqual(sug.length, 1);
  assert.ok(sug[0].qty >= 1);
});

test('listStock summary', () => {
  const state = blank();
  inv.seedSiteIfEmpty(state, 'site_a');
  const list = inv.listStock(state, 'site_a');
  assert.ok(list.summary.skuCount > 0);
  assert.ok(list.summary.stockValue > 0);
});

console.log(`\n${passed} inventory tests passed`);
if (process.exitCode) process.exit(process.exitCode);
