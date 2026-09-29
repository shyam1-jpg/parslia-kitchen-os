/* ============================================================
   Kiteline SaaS client — Phase B/C
   Keeps current teal/ink UI; adds company·location context,
   role clarity, clock location binding, reports scope toggle.
   ============================================================ */
(function () {
  const Saas = {
    context: null,
    reportScope: localStorage.getItem('kiteline.reportScope') || 'location',

    async refresh() {
      if (!window.Api || !window.Api.token()) return null;
      try {
        const res = await fetch('/api/saas/context', {
          headers: Object.assign(
            { 'Content-Type': 'application/json' },
            { Authorization: 'Bearer ' + window.Api.token() }
          ),
        });
        if (!res.ok) return null;
        this.context = await res.json();
        return this.context;
      } catch {
        return null;
      }
    },

    fromState() {
      const S = window.Store;
      const meta = S && S.db && S.db._saas;
      if (!meta) return null;
      this.context = Object.assign({}, this.context || {}, meta);
      return this.context;
    },

    allowedSites() {
      const S = window.Store;
      const sites = (S && S.db && S.db.sites) || [];
      const ctx = this.context || this.fromState();
      if (!ctx || !ctx.allowedSiteIds || ctx.canViewAllLocations) return sites;
      const allow = new Set(ctx.allowedSiteIds);
      return sites.filter((s) => allow.has(s.id));
    },

    companyLabel() {
      const ctx = this.context || this.fromState();
      const S = window.Store;
      return (ctx && ctx.companyName) || (S && S.db && S.db.org && S.db.org.name) || 'Kiteline';
    },

    setReportScope(scope) {
      this.reportScope = scope === 'company' ? 'company' : 'location';
      localStorage.setItem('kiteline.reportScope', this.reportScope);
    },

    canCompanyReports() {
      const ctx = this.context || this.fromState();
      if (!ctx) {
        const me = window.App && window.App.currentUser && window.App.currentUser();
        return !!(me && (me.role === 'Admin' || me.rank >= 3));
      }
      return !!(ctx.canViewAllLocations || (ctx.permissions && ctx.permissions.view_reports_company));
    },
  };

  function patchSiteSwitcher() {
    const sel = document.getElementById('siteSwitch');
    if (!sel || !window.Store) return;
    const S = window.Store;
    const sites = Saas.allowedSites();
    const company = Saas.companyLabel();
    if (sites.length && !sites.some((s) => s.id === S.db.currentSite)) {
      S.setSite(sites[0].id);
    }
    sel.innerHTML = sites.map((s) =>
      `<option value="${s.id}" ${s.id === S.db.currentSite ? 'selected' : ''}>${company} · ${s.name}</option>`
    ).join('');
    sel.onchange = async (e) => {
      const id = e.target.value;
      if (!Saas.allowedSites().some((s) => s.id === id)) return;
      S.setSite(id);
      try {
        if (window.Api && window.Api.token()) {
          await fetch('/api/saas/location', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: 'Bearer ' + window.Api.token(),
            },
            body: JSON.stringify({ siteId: id }),
          });
        }
      } catch (err) { /* offline ok */ }
      window.App.render();
    };
  }

  function enhanceHeader() {
    if (document.getElementById('saasCompanyChip') || !document.getElementById('siteSwitch')) return;
    const sel = document.getElementById('siteSwitch');
    const chip = document.createElement('span');
    chip.id = 'saasCompanyChip';
    chip.className = 'hidden lg:inline text-xs font-semibold text-brand-700 mr-1';
    chip.textContent = Saas.companyLabel();
    sel.parentNode.insertBefore(chip, sel);
  }

  function sensorBreach(s) {
    if (typeof s.temp !== 'number') return false;
    if (typeof s.min === 'number' && s.temp < s.min) return true;
    if (typeof s.max === 'number' && s.temp > s.max) return true;
    return false;
  }

  function wrapViews() {
    const V = window.Views;
    if (!V || V._saasWrapped) return;
    V._saasWrapped = true;
    const UI = window.UI || {};
    const escapeHtml = UI.escapeHtml || ((x) => String(x ?? ''));
    const icon = UI.icon || (() => '');
    const toast = UI.toast || (() => {});

    const origTeam = V.team.bind(V);
    V.team = function () {
      const view = origTeam();
      const html = view.html
        .replace('Team & Accountability', 'Team & roles')
        .replace(
          /Track who did what and when[^<]*/,
          'Assign location access and clock PINs — scoped to your kitchens'
        )
        .replace('<th>Access</th>', '<th>Role</th>');
      const origMount = view.mount;
      return {
        title: 'Team',
        html,
        mount() {
          if (origMount) origMount();
          document.querySelectorAll('[data-acc]').forEach((sel) => {
            [...sel.options].forEach((opt) => {
              if (opt.text === 'Admin' || opt.value === 'Admin') opt.textContent = 'Admin / Owner';
              if (opt.text === 'Manager' || opt.value === 'Manager') opt.textContent = 'Location Manager';
            });
          });
        },
      };
    };

    const origReports = V.reports.bind(V);
    V.reports = function () {
      const S = window.Store;
      const canAll = Saas.canCompanyReports();
      const scopeMode = (Saas.reportScope === 'company' && canAll) ? 'company' : 'location';
      if (scopeMode !== 'company') {
        const base = origReports();
        const toggle = canAll
          ? `<div class="flex gap-2 mb-4" id="saasReportScope">
              <button type="button" class="btn btn-sm btn-primary" data-scope="location">This location</button>
              <button type="button" class="btn btn-sm btn-ghost" data-scope="company">All locations</button>
            </div>`
          : '';
        const origMount = base.mount;
        return {
          title: base.title,
          html: toggle + base.html,
          mount() {
            if (origMount) origMount();
            document.querySelectorAll('#saasReportScope [data-scope]').forEach((btn) => {
              btn.onclick = () => { Saas.setReportScope(btn.dataset.scope); window.App.render(); };
            });
          },
        };
      }

      const siteIds = Saas.allowedSites().map((s) => s.id);
      const siteSet = new Set(siteIds);
      const sName = Saas.companyLabel() + ' — all locations';
      const sens = (S.db.sensors || []).filter((s) => siteSet.has(s.siteId));
      const recs = (S.db.records || []).filter((r) => siteSet.has(r.site));
      const als = (S.db.alerts || []).filter((a) => siteSet.has(a.site));
      const breach = sens.filter(sensorBreach).length;
      const compliance = Math.round(((sens.length - breach) / (sens.length || 1)) * 100);
      const fmt = S.fmt || { date: (d) => d, temp: (t) => t + '°C' };
      const toggle = `<div class="flex gap-2 mb-4" id="saasReportScope">
        <button type="button" class="btn btn-sm btn-ghost" data-scope="location">This location</button>
        <button type="button" class="btn btn-sm btn-primary" data-scope="company">All locations</button>
      </div>`;
      const html = `
      ${toggle}
      <div class="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h2 class="text-xl font-extrabold text-ink-900">Audit-Ready Reports</h2>
          <p class="text-sm text-ink-500">Company-wide compliance snapshot</p>
        </div>
        <div class="flex gap-2">
          <button class="btn btn-ghost btn-sm" data-act="print">${icon('print', 'ico')} Print</button>
          <button class="btn btn-primary btn-sm" data-act="csv">${icon('download', 'ico')} Export</button>
        </div>
      </div>
      <div class="card card-pad fade-in" id="report">
        <div class="flex items-center justify-between border-b border-ink-100 pb-4 mb-4">
          <div><div class="font-extrabold text-xl">Food Safety Compliance Report</div>
          <div class="text-sm text-ink-400">${escapeHtml(sName)} — Generated ${fmt.date(S.now())}</div></div>
          <span class="badge ${compliance === 100 ? 'badge-green' : 'badge-amber'} text-sm">${compliance}% compliant</span>
        </div>
        <div class="grid sm:grid-cols-4 gap-4 mb-5">
          <div class="kpi"><div class="text-xs text-ink-500">Sensors monitored</div><div class="v">${sens.length}</div></div>
          <div class="kpi"><div class="text-xs text-ink-500">Records logged</div><div class="v">${recs.length}</div></div>
          <div class="kpi"><div class="text-xs text-ink-500">Alerts (period)</div><div class="v">${als.length}</div></div>
          <div class="kpi"><div class="text-xs text-ink-500">Resolved</div><div class="v">${als.filter((a) => a.status === 'resolved').length}</div></div>
        </div>
        <h4 class="font-bold mb-2">Critical Control Points</h4>
        <table class="table mb-5"><thead><tr><th>Equipment</th><th>Location</th><th>Current</th><th>Status</th></tr></thead><tbody>
          ${sens.map((s) => `<tr><td>${escapeHtml(s.name)}</td><td>${escapeHtml((S.site(s.siteId) || {}).name || s.siteId)}</td><td>${s.temp != null ? s.temp + '°C' : '—'}</td><td><span class="badge ${sensorBreach(s) ? 'badge-red' : 'badge-green'}">${sensorBreach(s) ? 'Breach' : 'OK'}</span></td></tr>`).join('')}
        </tbody></table>
        <p class="text-xs text-ink-400 mt-5">Aggregated across ${siteIds.length} location(s). Individual location detail remains available via “This location”.</p>
      </div>`;
      return {
        title: 'Reports',
        html,
        mount() {
          const printBtn = document.querySelector('[data-act="print"]');
          if (printBtn) printBtn.onclick = () => window.print();
          const csvBtn = document.querySelector('[data-act="csv"]');
          if (csvBtn) csvBtn.onclick = () => {
            const rows = [['Equipment', 'Location', 'Temp', 'Status'], ...sens.map((s) => [
              s.name, (S.site(s.siteId) || {}).name || s.siteId, s.temp, sensorBreach(s) ? 'Breach' : 'OK',
            ])];
            const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
            const a = document.createElement('a');
            a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
            a.download = 'compliance_report_all_locations.csv';
            a.click();
            toast('Report exported');
          };
          document.querySelectorAll('#saasReportScope [data-scope]').forEach((btn) => {
            btn.onclick = () => { Saas.setReportScope(btn.dataset.scope); window.App.render(); };
          });
        },
      };
    };

    const origClock = V.clock.bind(V);
    V.clock = function () {
      const view = origClock();
      const siteName = window.Store.site().name;
      const html = String(view.html).replace(
        /Tap your name to clock in or out[^<]*/,
        `Location: ${siteName} — PIN checks apply to this kitchen only`
      );
      return { title: view.title, html, mount: view.mount };
    };
  }

  function patchAppRender() {
    if (!window.App || window.App._saasRenderPatched) return;
    const orig = window.App.render.bind(window.App);
    window.App._saasRenderPatched = true;
    window.App.render = function () {
      Saas.fromState();
      const result = orig();
      try {
        wrapViews();
        patchSiteSwitcher();
        enhanceHeader();
      } catch (e) {
        console.warn('saas ui enhance', e);
      }
      return result;
    };
  }

  function boot() {
    wrapViews();
    patchAppRender();
    if (window.Api && window.Api.token()) Saas.refresh();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else {
    boot();
    setTimeout(boot, 0);
    setTimeout(boot, 100);
  }

  window.KitelineSaas = Saas;
})();
