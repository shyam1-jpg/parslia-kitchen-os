/* ============================================================
   Kiteline — Stock & Orders views (Phase D)
   Matches existing card / table / teal brand styling.
   ============================================================ */
(function () {
  const S = () => window.Store;
  const UI = () => window.UI || {};
  const escapeHtml = (x) => (UI().escapeHtml ? UI().escapeHtml(x) : String(x ?? ''));
  const icon = (n, c) => (UI().icon ? UI().icon(n, c) : '');
  const toast = (m, t) => (UI().toast ? UI().toast(m, t) : console.log(m));
  const modal = (...a) => (UI().modal ? UI().modal(...a) : null);
  const closeModal = () => (UI().closeModal ? UI().closeModal() : null);

  function sectionHeader(title, subtitle, actions) {
    return `<div class="flex flex-wrap items-start justify-between gap-3 mb-5">
      <div><h2 class="text-xl font-extrabold text-ink-900">${title}</h2>
      <p class="text-sm text-ink-500 mt-0.5">${subtitle}</p></div>
      <div class="flex flex-wrap gap-2">${actions || ''}</div>
    </div>`;
  }

  function kpi(label, val, tone) {
    const cls = tone === 'amber' ? 'text-amber-600' : tone === 'red' ? 'text-red-600' : 'text-brand-600';
    return `<div class="kpi"><div class="text-xs text-ink-500">${label}</div><div class="v ${cls}">${val}</div></div>`;
  }

  function canManage() {
    const saas = window.KitelineSaas && (window.KitelineSaas.context || window.KitelineSaas.fromState());
    if (saas && saas.permissions) return !!saas.permissions.manage_stock;
    const me = window.App && window.App.currentUser && window.App.currentUser();
    return !!(me && (me.rank || 0) >= 2);
  }

  function authHeaders() {
    const h = { 'Content-Type': 'application/json' };
    if (window.Api && window.Api.token()) h.Authorization = 'Bearer ' + window.Api.token();
    return h;
  }

  async function api(method, route, body) {
    const res = await fetch('/api/saas' + route, {
      method,
      headers: authHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(data.error || res.statusText), { status: res.status, data });
    return data;
  }

  function supplierName(id) {
    const s = (S().db.suppliers || []).find((x) => x.id === id);
    return s ? s.name : '—';
  }

  function stock() {
    const site = S().db.currentSite;
    const siteName = S().site(site).name;
    const manage = canManage();
    const html = `
      ${sectionHeader('Stock', escapeHtml(siteName) + ' — live inventory for this kitchen', `
        <a href="#orders" class="btn btn-ghost btn-sm">${icon('truck', 'ico')} Orders</a>
        ${manage ? `<button class="btn btn-primary btn-sm" id="stkAdd">${icon('plus', 'ico')} Add item</button>` : ''}
      `)}
      <div id="stkKpis" class="grid sm:grid-cols-3 gap-4 mb-5">
        ${kpi('SKUs', '…')} ${kpi('Low stock', '…', 'amber')} ${kpi('Stock value', '…')}
      </div>
      <div class="card overflow-hidden mb-5">
        <table class="table">
          <thead><tr><th>Item</th><th>SKU</th><th>On hand</th><th>Reorder</th><th>Unit cost</th><th>Supplier</th><th></th></tr></thead>
          <tbody id="stkBody"><tr><td colspan="7" class="text-ink-400 text-sm p-4">Loading stock…</td></tr></tbody>
        </table>
      </div>
      <div class="card card-pad">
        <h3 class="font-bold mb-3">Recent movements</h3>
        <div id="stkMoves" class="text-sm text-ink-500">—</div>
      </div>`;

    return {
      title: 'Stock',
      html,
      async mount() {
        let data;
        try {
          data = await api('GET', '/stock?siteId=' + encodeURIComponent(site));
        } catch (e) {
          // Offline / demo fallback from local state
          const items = (S().db.stockItems || []).filter((i) => i.siteId === site);
          data = {
            items,
            movements: (S().db.stockMovements || []).filter((m) => m.siteId === site).slice(0, 40),
            summary: {
              skuCount: items.length,
              lowStock: items.filter((i) => Number(i.qtyOnHand) <= Number(i.reorderLevel || 0)).length,
              stockValue: items.reduce((n, i) => n + (Number(i.qtyOnHand) || 0) * (Number(i.unitCost) || 0), 0),
            },
          };
          if (!items.length) toast(e.message || 'Could not load stock from server', 'warn');
        }

        const k = document.getElementById('stkKpis');
        if (k) {
          k.innerHTML = [
            kpi('SKUs', data.summary.skuCount),
            kpi('Low stock', data.summary.lowStock, data.summary.lowStock ? 'amber' : ''),
            kpi('Stock value', '£' + (Number(data.summary.stockValue) || 0).toFixed(2)),
          ].join('');
        }

        const body = document.getElementById('stkBody');
        if (!data.items.length) {
          body.innerHTML = `<tr><td colspan="7" class="text-ink-400 text-sm p-4">No stock items yet.${manage ? ' Add your first item.' : ''}</td></tr>`;
        } else {
          body.innerHTML = data.items.map((i) => {
            const low = Number(i.qtyOnHand) <= Number(i.reorderLevel || 0);
            return `<tr>
              <td class="font-semibold">${escapeHtml(i.name)}${low ? ' <span class="badge badge-amber">Low</span>' : ''}</td>
              <td class="text-xs text-ink-400 font-mono">${escapeHtml(i.sku || '—')}</td>
              <td>${i.qtyOnHand} <span class="text-ink-400 text-xs">${escapeHtml(i.unit || '')}</span></td>
              <td>${i.reorderLevel}</td>
              <td>£${(Number(i.unitCost) || 0).toFixed(2)}</td>
              <td class="text-xs">${escapeHtml(supplierName(i.supplierId))}</td>
              <td class="text-right whitespace-nowrap">
                ${manage ? `<button class="btn btn-ghost btn-sm" data-move="${i.id}">Adjust</button>
                <button class="btn btn-ghost btn-sm" data-edit="${i.id}">Edit</button>` : ''}
              </td>
            </tr>`;
          }).join('');
        }

        const moves = document.getElementById('stkMoves');
        if (moves) {
          moves.innerHTML = (data.movements || []).length
            ? `<div class="space-y-2">${data.movements.slice(0, 12).map((m) => {
              const item = data.items.find((i) => i.id === m.stockItemId) || {};
              return `<div class="flex justify-between gap-3 border-b border-ink-50 pb-2">
                <div><span class="font-semibold">${escapeHtml(item.name || m.stockItemId)}</span>
                <span class="text-ink-400"> · ${escapeHtml(m.type)} ${m.qty}</span>
                ${m.reason ? `<div class="text-xs text-ink-400">${escapeHtml(m.reason)}</div>` : ''}</div>
                <div class="text-xs text-ink-400">${new Date(m.at).toLocaleString('en-GB')}</div>
              </div>`;
            }).join('')}</div>`
            : 'No movements yet.';
        }

        function openItem(item) {
          const e = item || { name: '', sku: '', unit: 'kg', qtyOnHand: 0, reorderLevel: 0, unitCost: 0, supplierId: '' };
          const supOpts = (S().db.suppliers || []).map((s) =>
            `<option value="${s.id}" ${s.id === e.supplierId ? 'selected' : ''}>${escapeHtml(s.name)}</option>`
          ).join('');
          modal(item ? 'Edit stock item' : 'Add stock item', `<div class="space-y-3">
            <input id="st_n" class="input" placeholder="Item name" value="${escapeHtml(e.name || '')}">
            <div class="grid grid-cols-2 gap-2">
              <input id="st_sku" class="input" placeholder="SKU" value="${escapeHtml(e.sku || '')}">
              <input id="st_u" class="input" placeholder="Unit" value="${escapeHtml(e.unit || 'kg')}">
            </div>
            <div class="grid grid-cols-3 gap-2">
              <div><label class="label">On hand</label><input id="st_q" type="number" step="0.001" class="input" value="${e.qtyOnHand ?? 0}"></div>
              <div><label class="label">Reorder at</label><input id="st_r" type="number" step="0.001" class="input" value="${e.reorderLevel ?? 0}"></div>
              <div><label class="label">Unit cost £</label><input id="st_c" type="number" step="0.01" class="input" value="${e.unitCost ?? 0}"></div>
            </div>
            <div><label class="label">Supplier</label><select id="st_s" class="select"><option value="">—</option>${supOpts}</select></div>
            <button class="btn btn-primary w-full" id="st_save">Save</button>
          </div>`);
          document.getElementById('st_save').onclick = async () => {
            const payload = {
              id: e.id,
              siteId: site,
              name: document.getElementById('st_n').value.trim(),
              sku: document.getElementById('st_sku').value.trim(),
              unit: document.getElementById('st_u').value.trim(),
              qtyOnHand: +document.getElementById('st_q').value,
              reorderLevel: +document.getElementById('st_r').value,
              unitCost: +document.getElementById('st_c').value,
              supplierId: document.getElementById('st_s').value || null,
            };
            try {
              await api('POST', '/stock/item', payload);
              // keep local mirror
              S().db.stockItems = S().db.stockItems || [];
              toast('Stock item saved');
              closeModal();
              window.App.render();
            } catch (err) {
              toast(err.message || 'Save failed', 'error');
            }
          };
        }

        const addBtn = document.getElementById('stkAdd');
        if (addBtn) addBtn.onclick = () => openItem(null);
        document.querySelectorAll('[data-edit]').forEach((b) => {
          b.onclick = () => openItem(data.items.find((i) => i.id === b.dataset.edit));
        });
        document.querySelectorAll('[data-move]').forEach((b) => {
          b.onclick = () => {
            const item = data.items.find((i) => i.id === b.dataset.move);
            if (!item) return;
            modal('Adjust stock — ' + escapeHtml(item.name), `<div class="space-y-3">
              <select id="mv_t" class="select">
                <option value="in">Stock in</option>
                <option value="out">Stock out</option>
                <option value="waste">Waste</option>
                <option value="adjust">Adjust (+/-)</option>
              </select>
              <input id="mv_q" type="number" step="0.001" class="input" placeholder="Quantity">
              <input id="mv_r" class="input" placeholder="Reason (optional)">
              <button class="btn btn-primary w-full" id="mv_ok">Apply</button>
            </div>`);
            document.getElementById('mv_ok').onclick = async () => {
              try {
                await api('POST', '/stock/move', {
                  siteId: site,
                  stockItemId: item.id,
                  type: document.getElementById('mv_t').value,
                  qty: +document.getElementById('mv_q').value,
                  reason: document.getElementById('mv_r').value.trim(),
                });
                toast('Stock updated');
                closeModal();
                window.App.render();
              } catch (err) {
                toast(err.message || 'Update failed', 'error');
              }
            };
          };
        });
      },
    };
  }

  function orders() {
    const site = S().db.currentSite;
    const siteName = S().site(site).name;
    const manage = canManage();
    const html = `
      ${sectionHeader('Orders', escapeHtml(siteName) + ' — purchase orders by location', `
        <a href="#stock" class="btn btn-ghost btn-sm">${icon('box', 'ico')} Stock</a>
        ${manage ? `<button class="btn btn-ghost btn-sm" id="poSuggest">From low stock</button>
        <button class="btn btn-primary btn-sm" id="poAdd">${icon('plus', 'ico')} New order</button>` : ''}
      `)}
      <div id="poKpis" class="grid sm:grid-cols-3 gap-4 mb-5">
        ${kpi('Draft', '…')} ${kpi('Sent', '…')} ${kpi('Received', '…')}
      </div>
      <div class="card overflow-hidden">
        <table class="table">
          <thead><tr><th>Order</th><th>Supplier</th><th>Lines</th><th>Status</th><th>Created</th><th></th></tr></thead>
          <tbody id="poBody"><tr><td colspan="6" class="text-ink-400 text-sm p-4">Loading orders…</td></tr></tbody>
        </table>
      </div>`;

    return {
      title: 'Orders',
      html,
      async mount() {
        let data;
        try {
          data = await api('GET', '/orders?siteId=' + encodeURIComponent(site));
        } catch (e) {
          data = {
            orders: (S().db.purchaseOrders || []).filter((o) => o.siteId === site),
            summary: { draft: 0, sent: 0, received: 0 },
            suggestions: [],
          };
          toast(e.message || 'Could not load orders', 'warn');
        }

        const k = document.getElementById('poKpis');
        if (k) {
          k.innerHTML = [
            kpi('Draft', data.summary.draft),
            kpi('Sent', data.summary.sent),
            kpi('Received', data.summary.received, 'brand'),
          ].join('');
        }

        const statusBadge = (st) => {
          const map = { draft: 'badge-gray', sent: 'badge-blue', received: 'badge-green', cancelled: 'badge-red' };
          return `<span class="badge ${map[st] || 'badge-gray'}">${escapeHtml(st)}</span>`;
        };

        const body = document.getElementById('poBody');
        if (!data.orders.length) {
          body.innerHTML = `<tr><td colspan="6" class="text-ink-400 text-sm p-4">No purchase orders yet.</td></tr>`;
        } else {
          body.innerHTML = data.orders.map((o) => {
            const total = (o.lines || []).reduce((n, l) => n + (Number(l.qty) || 0) * (Number(l.unitCost) || 0), 0);
            return `<tr>
              <td class="font-mono text-xs">${escapeHtml(o.id)}</td>
              <td>${escapeHtml(supplierName(o.supplierId))}</td>
              <td>${(o.lines || []).length} · £${total.toFixed(2)}</td>
              <td>${statusBadge(o.status)}</td>
              <td class="text-xs text-ink-400">${new Date(o.createdAt).toLocaleDateString('en-GB')}</td>
              <td class="text-right whitespace-nowrap">
                ${manage && o.status === 'draft' ? `<button class="btn btn-ghost btn-sm" data-send="${o.id}">Mark sent</button>` : ''}
                ${manage && o.status === 'sent' ? `<button class="btn btn-primary btn-sm" data-recv="${o.id}">Receive</button>` : ''}
              </td>
            </tr>`;
          }).join('');
        }

        async function createWithLines(lines, supplierId) {
          try {
            await api('POST', '/orders', {
              siteId: site,
              supplierId: supplierId || null,
              status: 'draft',
              lines,
            });
            toast('Draft order created');
            window.App.render();
          } catch (err) {
            toast(err.message || 'Could not create order', 'error');
          }
        }

        const add = document.getElementById('poAdd');
        if (add) add.onclick = () => {
          const supOpts = (S().db.suppliers || []).map((s) =>
            `<option value="${s.id}">${escapeHtml(s.name)}</option>`
          ).join('');
          modal('New purchase order', `<div class="space-y-3">
            <select id="po_sup" class="select"><option value="">Supplier (optional)</option>${supOpts}</select>
            <textarea id="po_lines" class="input" rows="5" placeholder="One line per item: name, qty, unit&#10;e.g. Whole milk, 20, L"></textarea>
            <button class="btn btn-primary w-full" id="po_ok">Create draft</button>
          </div>`);
          document.getElementById('po_ok').onclick = () => {
            const lines = document.getElementById('po_lines').value.split('\n').map((line) => {
              const parts = line.split(',').map((x) => x.trim());
              if (!parts[0]) return null;
              return { name: parts[0], qty: +parts[1] || 1, unit: parts[2] || 'each', unitCost: +parts[3] || 0 };
            }).filter(Boolean);
            createWithLines(lines, document.getElementById('po_sup').value || null);
            closeModal();
          };
        };

        const sug = document.getElementById('poSuggest');
        if (sug) sug.onclick = () => {
          const lines = data.suggestions || [];
          if (!lines.length) return toast('No low-stock items to order', 'warn');
          const supplierId = lines.find((l) => l.supplierId)?.supplierId || null;
          createWithLines(lines, supplierId);
        };

        document.querySelectorAll('[data-send]').forEach((b) => {
          b.onclick = async () => {
            try {
              await api('PATCH', '/orders', { id: b.dataset.send, siteId: site, status: 'sent' });
              toast('Order marked sent');
              window.App.render();
            } catch (err) { toast(err.message || 'Failed', 'error'); }
          };
        });
        document.querySelectorAll('[data-recv]').forEach((b) => {
          b.onclick = async () => {
            try {
              await api('PATCH', '/orders', { id: b.dataset.recv, siteId: site, status: 'received' });
              toast('Order received — stock updated');
              window.App.render();
            } catch (err) { toast(err.message || 'Failed', 'error'); }
          };
        });
      },
    };
  }

  function register() {
    if (!window.Views) return false;
    window.Views.stock = stock;
    window.Views.orders = orders;
    return true;
  }

  if (!register()) {
    document.addEventListener('DOMContentLoaded', register);
    setTimeout(register, 0);
    setTimeout(register, 100);
  }
})();
