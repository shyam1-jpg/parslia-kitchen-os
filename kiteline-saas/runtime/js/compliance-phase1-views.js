/* ============================================================
   Kiteline Compliance Phase 1 — screens
   Dashboard · My checks · Run · Builder · CA board · Exports
   ============================================================ */
(function () {
  const { icon, toast, modal, closeModal, escapeHtml, openPrintDocument } = window.UI || {};
  const CP = () => window.CompliancePhase1;

  function esc(s) { return escapeHtml ? escapeHtml(String(s == null ? '' : s)) : String(s == null ? '' : s); }

  function siteLabel(id) {
    const s = window.Store && window.Store.site ? window.Store.site(id) : null;
    return (s && s.name) || id || 'Kitchen';
  }

  function header(title, subtitle, actions) {
    return `<div class="flex flex-wrap items-end justify-between gap-3 mb-5">
      <div><h1 class="text-2xl font-extrabold tracking-tight">${title}</h1>
      ${subtitle ? `<p class="text-ink-500 text-sm mt-1">${subtitle}</p>` : ''}</div>
      <div class="flex gap-2 flex-wrap">${actions || ''}</div></div>`;
  }

  function tab() {
    const h = (location.hash || '').replace(/^#/, '');
    const m = h.match(/^compliance-p1(?:-(\w+))?$/);
    return (m && m[1]) || 'dashboard';
  }

  function nav(active) {
    const items = [
      { id: 'dashboard', label: 'Dashboard' },
      { id: 'checks', label: 'My checks' },
      { id: 'actions', label: 'Corrective actions' },
      { id: 'templates', label: 'Templates' },
      { id: 'builder', label: 'Builder' },
      { id: 'exports', label: 'Exports' },
      { id: 'audit', label: 'Audit trail' },
    ];
    return `<div class="flex flex-wrap gap-1 mb-5 border-b border-ink-100 pb-2">
      ${items.map((it) => {
        const on = active === it.id || (active === 'run' && it.id === 'checks') || (active.startsWith('edit') && it.id === 'builder');
        return `<a href="#compliance-p1-${it.id}" class="btn btn-sm ${on ? 'btn-primary' : 'btn-ghost'}">${esc(it.label)}</a>`;
      }).join('')}
      <a href="#compliance" class="btn btn-sm btn-ghost ml-auto text-ink-400">Classic compliance →</a>
    </div>`;
  }

  function rag(n, warn, bad) {
    if (n >= bad) return 'text-red-600';
    if (n >= warn) return 'text-amber-600';
    return 'text-brand-700';
  }

  function renderDashboard() {
    const E = CP();
    E.ensureSeeded();
    const d = E.dashboard();
    const s = E.ensure();
    const loc = E.currentSite();
    const due = s.schedules.filter((x) => x.locationId === loc && x.active && !x.paused);
    return {
      title: 'Compliance dashboard',
      html: header('Compliance dashboard', 'Schedule → Complete → Validate → Defect → Corrective action → Verify → Report',
        `<button class="btn btn-primary btn-sm" id="p1SeedBtn">Load Kiteline templates</button>`)
        + nav('dashboard')
        + `<div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          ${kpi('Due today', d.dueToday, rag(d.dueToday, 1, 3))}
          ${kpi('In progress', d.inProgress, 'text-ink-800')}
          ${kpi('Completed today', d.completedToday, 'text-brand-700')}
          ${kpi('Missed', d.missed, rag(d.missed, 1, 1))}
          ${kpi('Open defects', d.openDefects, rag(d.openDefects, 1, 3))}
          ${kpi('Critical defects', d.criticalDefects, rag(d.criticalDefects, 1, 1))}
          ${kpi('Overdue actions', d.overdueActions, rag(d.overdueActions, 1, 1))}
          ${kpi('Awaiting verification', d.awaitingVerification, rag(d.awaitingVerification, 1, 2))}
        </div>
        <div class="grid lg:grid-cols-2 gap-4">
          <div class="card card-pad">
            <h3 class="font-bold mb-3">Scheduled checks — ${esc(siteLabel(loc))}</h3>
            <div class="space-y-2">${due.length ? due.map((sch) => {
              const t = s.templates.find((x) => x.id === sch.templateId);
              return `<div class="flex items-center justify-between gap-2 p-3 rounded-xl border border-ink-100">
                <div><div class="font-semibold text-sm">${esc(t ? t.name : 'Checklist')}</div>
                <div class="text-xs text-ink-400">Next due ${esc((sch.nextDueAt || '').replace('T', ' ').slice(0, 16))}</div></div>
                <a class="btn btn-primary btn-sm" href="#compliance-p1-run-${esc(sch.templateId)}">Start</a>
              </div>`;
            }).join('') : '<p class="text-sm text-ink-400">No active schedules. Publish a template or load Kiteline seeds.</p>'}
            </div>
          </div>
          <div class="card card-pad">
            <h3 class="font-bold mb-3">Recent notifications</h3>
            <div class="space-y-2 max-h-80 overflow-auto">${(s.notifications || []).slice(0, 12).map((n) =>
              `<div class="p-3 rounded-xl border border-ink-100 text-sm"><div class="font-semibold">${esc(n.title)}</div>
              <div class="text-ink-500 text-xs mt-1">${esc(n.body || '')}</div>
              <div class="text-[10px] text-ink-400 mt-1">${esc((n.at || '').replace('T', ' ').slice(0, 16))} · ${esc(n.eventType)}</div></div>`
            ).join('') || '<p class="text-sm text-ink-400">No notifications yet.</p>'}
            </div>
          </div>
        </div>
        <p class="text-xs text-ink-400 mt-6">Kiteline helps teams organise food-safety records. It does not guarantee legal compliance.</p>`,
      mount() {
        const btn = document.getElementById('p1SeedBtn');
        if (btn) btn.onclick = () => {
          try {
            CP().seedKitelineTemplates(true);
            toast && toast('Kiteline templates loaded and published where possible', 'ok');
            window.App && window.App.render && window.App.render();
          } catch (e) { toast && toast(e.message, 'err'); }
        };
      },
    };
  }

  function kpi(label, value, cls) {
    return `<div class="card card-pad"><div class="text-xs text-ink-500">${esc(label)}</div>
      <div class="text-3xl font-extrabold mt-1 ${cls || ''}">${esc(value)}</div></div>`;
  }

  function renderChecks() {
    const E = CP();
    E.ensureSeeded();
    const s = E.ensure();
    const loc = E.currentSite();
    const drafts = s.runs.filter((r) => r.locationId === loc && r.status === 'in_progress');
    const recent = s.runs.filter((r) => r.locationId === loc && r.status !== 'in_progress').slice(0, 20);
    const active = s.templates.filter((t) => t.status === 'active' && (!t.locationIds || t.locationIds.includes(loc)));
    return {
      title: 'My checks',
      html: header('My checks', 'Large kitchen-friendly controls. Drafts autosave as you go.')
        + nav('checks')
        + `<div class="grid lg:grid-cols-2 gap-4 mb-6">
          <div class="card card-pad">
            <h3 class="font-bold mb-3">Start a check</h3>
            <div class="space-y-2">${active.map((t) =>
              `<a href="#compliance-p1-run-${esc(t.id)}" class="flex items-center justify-between p-4 rounded-xl border border-ink-100 hover:border-brand-300">
                <div><div class="font-semibold">${esc(t.name)}</div><div class="text-xs text-ink-400">${esc(t.category)} · v${esc(t.version)} · ${esc(t.frequency)}</div></div>
                <span class="btn btn-primary btn-sm">Open</span></a>`
            ).join('') || '<p class="text-sm text-ink-400">No published templates for this location.</p>'}
            </div>
          </div>
          <div class="card card-pad">
            <h3 class="font-bold mb-3">Drafts in progress</h3>
            <div class="space-y-2">${drafts.map((r) =>
              `<a href="#compliance-p1-resume-${esc(r.id)}" class="block p-3 rounded-xl border border-amber-200 bg-amber-50/40">
                <div class="font-semibold text-sm">${esc(r.templateName)}</div>
                <div class="text-xs text-ink-400">${esc(r.ref)} · started ${(r.startedAt || '').replace('T', ' ').slice(0, 16)}</div></a>`
            ).join('') || '<p class="text-sm text-ink-400">No drafts.</p>'}
            </div>
          </div>
        </div>
        <div class="card card-pad">
          <h3 class="font-bold mb-3">Recent runs</h3>
          <div class="overflow-x-auto"><table class="w-full text-sm"><thead><tr class="text-left text-ink-400 border-b">
            <th class="py-2">Ref</th><th>Checklist</th><th>Status</th><th>Completed</th><th>By</th></tr></thead><tbody>
            ${recent.map((r) => `<tr class="border-b border-ink-50"><td class="py-2 font-mono text-xs">${esc(r.ref)}</td>
              <td>${esc(r.templateName)}</td><td><span class="badge ${r.status === 'completed' ? 'badge-green' : r.status === 'missed' ? 'badge-red' : 'badge-gray'}">${esc(r.status)}</span></td>
              <td class="text-xs text-ink-500">${esc((r.completedAt || '').replace('T', ' ').slice(0, 16))}</td>
              <td>${esc(r.completedByName || '—')}</td></tr>`).join('') || '<tr><td colspan="5" class="py-4 text-ink-400">No runs yet</td></tr>'}
          </tbody></table></div>
        </div>`,
      mount() {},
    };
  }

  function renderRun(templateId, resumeId) {
    const E = CP();
    E.ensureSeeded();
    let run;
    try {
      if (resumeId) {
        run = E.ensure().runs.find((r) => r.id === resumeId);
        if (!run) throw new Error('Draft not found');
      } else {
        run = E.startRun(templateId);
      }
    } catch (e) {
      return { title: 'Check', html: header('Unable to start', e.message) + nav('checks'), mount() {} };
    }
    const snap = run.templateSnapshot || {};
    const sections = snap.sections || [];

    function fieldHtml(q, val) {
      const id = 'q_' + q.id;
      const common = `data-qid="${esc(q.id)}" class="p1-answer w-full mt-2"`;
      if (q.type === 'pass_fail_na') {
        return `<div class="flex flex-wrap gap-2 mt-2">${['Pass', 'Fail', 'N/A'].map((o) =>
          `<label class="btn btn-sm ${String(val).toLowerCase() === o.toLowerCase() || (o === 'N/A' && String(val).toLowerCase() === 'na') ? 'btn-primary' : 'btn-ghost'} cursor-pointer">
            <input type="radio" name="${id}" value="${o === 'N/A' ? 'na' : o.toLowerCase()}" class="sr-only p1-answer" data-qid="${esc(q.id)}" ${String(val).toLowerCase() === (o === 'N/A' ? 'na' : o.toLowerCase()) ? 'checked' : ''}/> ${o}</label>`
        ).join('')}</div>`;
      }
      if (q.type === 'yes_no_na') {
        return `<div class="flex flex-wrap gap-2 mt-2">${['Yes', 'No', 'N/A'].map((o) =>
          `<label class="btn btn-sm btn-ghost cursor-pointer"><input type="radio" name="${id}" value="${o === 'N/A' ? 'na' : o.toLowerCase()}" class="sr-only p1-answer" data-qid="${esc(q.id)}" ${String(val).toLowerCase() === (o === 'N/A' ? 'na' : o.toLowerCase()) ? 'checked' : ''}/> ${o}</label>`
        ).join('')}</div>`;
      }
      if (q.type === 'textarea') return `<textarea ${common} rows="3">${esc(val || '')}</textarea>`;
      if (q.type === 'dropdown') {
        return `<select ${common}><option value="">Select…</option>${(q.options || []).map((o) =>
          `<option value="${esc(o)}" ${val === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
      }
      if (['number', 'temperature', 'weight', 'volume', 'percentage', 'currency'].indexOf(q.type) >= 0) {
        return `<input type="number" step="0.1" inputmode="decimal" ${common} value="${esc(val == null ? '' : val)}" style="font-size:1.5rem;padding:0.75rem" />`;
      }
      if (q.type === 'date') return `<input type="date" ${common} value="${esc(val || '')}" />`;
      if (q.type === 'time') return `<input type="time" ${common} value="${esc(val || '')}" />`;
      return `<input type="text" ${common} value="${esc(val || '')}" />`;
    }

    return {
      title: snap.name || 'Checklist',
      html: header(esc(snap.name || 'Checklist'), `${esc(run.ref)} · v${esc(run.templateVersion)} · autosave on · ${esc(siteLabel(run.locationId))}`,
        `<button class="btn btn-ghost btn-sm" id="p1Pause">Pause</button>
         <button class="btn btn-primary btn-sm" id="p1Submit">Submit</button>`)
        + nav('run')
        + `<div id="p1RunRoot" data-run="${esc(run.id)}" class="space-y-4">
          ${(snap.instructions ? `<div class="card card-pad text-sm text-ink-600">${esc(snap.instructions)}</div>` : '')}
          ${sections.map((sec, si) => `<div class="card card-pad" data-sec="${esc(sec.id)}">
            <h3 class="font-bold text-lg mb-1">${esc(si + 1)}. ${esc(sec.title)}</h3>
            ${sec.instructions ? `<p class="text-sm text-ink-500 mb-4">${esc(sec.instructions)}</p>` : ''}
            <div class="space-y-5">${(sec.questions || []).map((q) => {
              const val = run.answers[q.id];
              const ev = E.evaluateAnswer(q, val);
              return `<div class="p-4 rounded-xl border ${ev.defect ? 'border-red-300 bg-red-50/40' : 'border-ink-100'}" data-qwrap="${esc(q.id)}">
                <div class="font-semibold">${esc(q.label)}${q.mandatory ? ' <span class="text-red-500">*</span>' : ''}</div>
                ${q.helpText ? `<p class="text-xs text-ink-500 mt-1">${esc(q.helpText)}</p>` : ''}
                ${q.min != null || q.max != null ? `<p class="text-xs text-brand-700 mt-1">Safe range: ${q.min != null ? q.min : '…'}–${q.max != null ? q.max : '…'}${q.unit ? ' ' + esc(q.unit) : ''}</p>` : ''}
                ${fieldHtml(q, val)}
                <div class="p1-live text-xs mt-2 ${ev.defect ? 'text-red-600 font-semibold' : 'text-ink-400'}">${ev.defect ? ('⚠ ' + esc(ev.message)) : (ev.message || '')}</div>
                <label class="block text-xs text-ink-500 mt-3">Comment ${q.commentRequiredOnFail ? '(required on fail)' : ''}</label>
                <input type="text" class="p1-answer w-full mt-1" data-qid="${esc(q.id)}__comment" value="${esc(run.answers[q.id + '__comment'] || '')}" />
              </div>`;
            }).join('')}</div>
          </div>`).join('')}
        </div>`,
      mount() {
        const root = document.getElementById('p1RunRoot');
        if (!root) return;
        const runId = root.getAttribute('data-run');
        const collect = () => {
          const answers = {};
          root.querySelectorAll('.p1-answer').forEach((el) => {
            const qid = el.getAttribute('data-qid');
            if (!qid) return;
            if (el.type === 'radio') {
              if (el.checked) answers[qid] = el.value;
            } else {
              answers[qid] = el.value;
            }
          });
          return answers;
        };
        const autosave = () => {
          try { CP().saveDraft(runId, collect()); } catch (e) { /* ignore */ }
        };
        root.addEventListener('change', autosave);
        root.addEventListener('input', () => {
          clearTimeout(root._t);
          root._t = setTimeout(autosave, 400);
        });
        document.getElementById('p1Pause').onclick = () => {
          autosave();
          toast && toast('Draft saved — resume anytime from My checks', 'ok');
          location.hash = '#compliance-p1-checks';
        };
        document.getElementById('p1Submit').onclick = () => {
          try {
            CP().saveDraft(runId, collect());
            const result = CP().submitRun(runId);
            toast && toast('Submitted' + (result.defects.length ? ` — ${result.defects.length} defect(s) raised` : ''), result.defects.length ? 'warn' : 'ok');
            location.hash = result.defects.length ? '#compliance-p1-actions' : '#compliance-p1-dashboard';
          } catch (e) {
            toast && toast(e.message, 'err');
          }
        };
      },
    };
  }

  function renderActions() {
    const E = CP();
    const s = E.ensure();
    const loc = E.currentSite();
    const list = s.correctiveActions.filter((c) => c.locationId === loc);
    return {
      title: 'Corrective actions',
      html: header('Corrective actions', 'Separate permanent records. Critical items need independent verification.')
        + nav('actions')
        + `<div class="card card-pad overflow-x-auto"><table class="w-full text-sm"><thead><tr class="text-left text-ink-400 border-b">
          <th class="py-2">Ref</th><th>Title</th><th>Risk</th><th>Status</th><th>Due</th><th>Recorded by</th><th></th></tr></thead><tbody>
          ${list.map((ca) => `<tr class="border-b border-ink-50 align-top">
            <td class="py-3 font-mono text-xs">${esc(ca.ref)}</td>
            <td><div class="font-semibold">${esc(ca.title)}</div><div class="text-xs text-ink-400">${esc(ca.description || '')}</div></td>
            <td><span class="badge ${ca.riskLevel === 'high' || ca.riskLevel === 'critical' ? 'badge-red' : 'badge-amber'}">${esc(ca.riskLevel)}</span></td>
            <td>${esc(ca.status)}</td>
            <td class="text-xs">${esc((ca.dueAt || '').replace('T', ' ').slice(0, 16))}</td>
            <td class="text-xs">${esc(ca.recordedByName || '')}</td>
            <td class="space-x-1 whitespace-nowrap">
              ${ca.status !== 'closed' && ca.status !== 'awaiting_verification' ? `<button class="btn btn-sm btn-ghost p1-close-ca" data-id="${esc(ca.id)}">Close</button>` : ''}
              ${ca.status === 'awaiting_verification' ? `<button class="btn btn-sm btn-primary p1-verify-ca" data-id="${esc(ca.id)}">Verify</button>` : ''}
            </td>
          </tr>`).join('') || '<tr><td colspan="7" class="py-6 text-ink-400">No corrective actions yet</td></tr>'}
        </tbody></table></div>`,
      mount() {
        document.querySelectorAll('.p1-close-ca').forEach((btn) => {
          btn.onclick = () => {
            const comment = prompt('Closure comment / action taken:') || '';
            try {
              CP().closeCorrectiveAction(btn.getAttribute('data-id'), { comment });
              toast && toast('Corrective action updated', 'ok');
              window.App && window.App.render && window.App.render();
            } catch (e) { toast && toast(e.message, 'err'); }
          };
        });
        document.querySelectorAll('.p1-verify-ca').forEach((btn) => {
          btn.onclick = () => {
            try {
              CP().verifyCorrectiveAction(btn.getAttribute('data-id'), {});
              toast && toast('Verified and closed', 'ok');
              window.App && window.App.render && window.App.render();
            } catch (e) { toast && toast(e.message, 'err'); }
          };
        });
      },
    };
  }

  function renderTemplates() {
    const E = CP();
    E.ensureSeeded();
    const s = E.ensure();
    const canEdit = E.can('edit_templates');
    return {
      title: 'Templates',
      html: header('Checklist templates', 'Draft → publish → assign. Editing a published template creates a new version.',
        canEdit ? `<a href="#compliance-p1-builder" class="btn btn-primary btn-sm">New template</a>
        <button class="btn btn-ghost btn-sm" id="p1Seed2">Seed Kiteline library</button>` : '')
        + nav('templates')
        + `<div class="space-y-2">${s.templates.map((t) => `<div class="card card-pad flex flex-wrap items-center justify-between gap-3">
          <div><div class="font-bold">${esc(t.name)} <span class="badge badge-gray">v${esc(t.version)}</span>
            <span class="badge ${t.status === 'active' ? 'badge-green' : t.status === 'archived' ? 'badge-gray' : 'badge-amber'}">${esc(t.status)}</span></div>
            <div class="text-xs text-ink-400 mt-1">${esc(t.category)} · ${esc(t.frequency)} · ${(t.sections || []).length} sections</div></div>
          <div class="flex gap-2 flex-wrap">
            ${canEdit ? `<a class="btn btn-sm btn-ghost" href="#compliance-p1-edit-${esc(t.id)}">Edit</a>` : ''}
            ${canEdit && t.status === 'draft' ? `<button class="btn btn-sm btn-primary p1-pub" data-id="${esc(t.id)}">Publish</button>` : ''}
            ${canEdit ? `<button class="btn btn-sm btn-ghost p1-dup" data-id="${esc(t.id)}">Duplicate</button>` : ''}
            ${t.status === 'active' ? `<a class="btn btn-sm btn-primary" href="#compliance-p1-run-${esc(t.id)}">Run</a>` : ''}
          </div></div>`).join('') || '<p class="text-ink-400">No templates</p>'}
        </div>`,
      mount() {
        const seed = document.getElementById('p1Seed2');
        if (seed) seed.onclick = () => { CP().seedKitelineTemplates(true); toast && toast('Seeded', 'ok'); window.App.render(); };
        document.querySelectorAll('.p1-pub').forEach((b) => {
          b.onclick = () => { try { CP().publishTemplate(b.dataset.id); toast && toast('Published', 'ok'); window.App.render(); } catch (e) { toast && toast(e.message, 'err'); } };
        });
        document.querySelectorAll('.p1-dup').forEach((b) => {
          b.onclick = () => { try { CP().duplicateTemplate(b.dataset.id); toast && toast('Duplicated', 'ok'); window.App.render(); } catch (e) { toast && toast(e.message, 'err'); } };
        });
      },
    };
  }

  function renderBuilder(editId) {
    const E = CP();
    if (!E.can('edit_templates') && !E.can('create_templates')) {
      return { title: 'Builder', html: header('Builder', 'Admin access required') + nav('builder'), mount() {} };
    }
    E.ensureSeeded();
    let tpl;
    if (editId) {
      tpl = JSON.parse(JSON.stringify(E.ensure().templates.find((t) => t.id === editId) || null));
      if (!tpl) return { title: 'Builder', html: header('Not found', '') + nav('builder'), mount() {} };
    } else {
      tpl = {
        id: null,
        name: 'New checklist',
        description: '',
        category: 'Food safety',
        department: 'Kitchen',
        instructions: '',
        frequency: 'daily',
        windowStart: '06:00',
        windowEnd: '11:00',
        graceMinutes: 30,
        requireManagerVerification: false,
        status: 'draft',
        version: 1,
        sections: [E.section({ title: 'Section 1', questions: [E.question({ label: 'Example pass/fail check' })] })],
        locationIds: [E.currentSite()],
      };
    }

    function renderEditor() {
      return header('Checklist builder', tpl.id ? `Editing ${esc(tpl.name)} (status: ${esc(tpl.status)})` : 'Create a draft template',
        `<button class="btn btn-ghost btn-sm" id="p1Preview">Preview staff view</button>
         <button class="btn btn-primary btn-sm" id="p1SaveTpl">Save draft</button>`)
        + nav('builder')
        + `<div class="grid lg:grid-cols-3 gap-4">
          <div class="lg:col-span-1 card card-pad space-y-3">
            <label class="text-xs font-bold text-ink-500">Name</label>
            <input id="p1Name" class="w-full" value="${esc(tpl.name)}" />
            <label class="text-xs font-bold text-ink-500">Category</label>
            <input id="p1Cat" class="w-full" value="${esc(tpl.category)}" />
            <label class="text-xs font-bold text-ink-500">Frequency</label>
            <select id="p1Freq" class="w-full">${E.FREQUENCIES.map((f) => `<option value="${f}" ${tpl.frequency === f ? 'selected' : ''}>${f}</option>`).join('')}</select>
            <div class="grid grid-cols-2 gap-2">
              <div><label class="text-xs font-bold text-ink-500">Window start</label><input id="p1Ws" type="time" class="w-full" value="${esc(tpl.windowStart || '06:00')}" /></div>
              <div><label class="text-xs font-bold text-ink-500">Window end</label><input id="p1We" type="time" class="w-full" value="${esc(tpl.windowEnd || '11:00')}" /></div>
            </div>
            <label class="flex items-center gap-2 text-sm"><input type="checkbox" id="p1Ver" ${tpl.requireManagerVerification ? 'checked' : ''}/> Manager verification</label>
            <label class="text-xs font-bold text-ink-500">Instructions</label>
            <textarea id="p1Instr" class="w-full" rows="3">${esc(tpl.instructions || '')}</textarea>
            <button class="btn btn-ghost btn-sm w-full" id="p1AddSec">+ Add section</button>
          </div>
          <div class="lg:col-span-2 space-y-3" id="p1Sections">
            ${tpl.sections.map((sec, si) => sectionEditor(sec, si)).join('')}
          </div>
        </div>`;
    }

    function sectionEditor(sec, si) {
      return `<div class="card card-pad p1-sec" draggable="true" data-si="${si}">
        <div class="flex items-center gap-2 mb-3">
          <span class="text-ink-300 cursor-grab" title="Drag to reorder">⋮⋮</span>
          <input class="font-bold flex-1 p1-sec-title" data-si="${si}" value="${esc(sec.title)}" />
          <button class="btn btn-ghost btn-sm p1-add-q" data-si="${si}">+ Question</button>
          <button class="btn btn-ghost btn-sm p1-del-sec" data-si="${si}">Remove</button>
        </div>
        <div class="space-y-3">${(sec.questions || []).map((q, qi) => questionEditor(q, si, qi)).join('')}</div>
      </div>`;
    }

    function questionEditor(q, si, qi) {
      return `<div class="p-3 rounded-xl border border-ink-100 bg-ink-50/40" draggable="true" data-si="${si}" data-qi="${qi}">
        <div class="grid md:grid-cols-2 gap-2">
          <input class="p1-q-label" data-si="${si}" data-qi="${qi}" value="${esc(q.label)}" placeholder="Question label" />
          <select class="p1-q-type" data-si="${si}" data-qi="${qi}">${E.ANSWER_TYPES.map((t) => `<option value="${t}" ${q.type === t ? 'selected' : ''}>${t}</option>`).join('')}</select>
          <input class="p1-q-min" data-si="${si}" data-qi="${qi}" placeholder="Min" value="${q.min != null ? esc(q.min) : ''}" />
          <input class="p1-q-max" data-si="${si}" data-qi="${qi}" placeholder="Max" value="${q.max != null ? esc(q.max) : ''}" />
          <select class="p1-q-risk" data-si="${si}" data-qi="${qi}">${['low', 'medium', 'high', 'critical'].map((r) => `<option value="${r}" ${q.riskLevel === r ? 'selected' : ''}>${r}</option>`).join('')}</select>
          <input class="p1-q-unit" data-si="${si}" data-qi="${qi}" placeholder="Unit" value="${esc(q.unit || '')}" />
        </div>
        <div class="flex flex-wrap gap-3 mt-2 text-xs">
          <label><input type="checkbox" class="p1-q-mand" data-si="${si}" data-qi="${qi}" ${q.mandatory ? 'checked' : ''}/> Mandatory</label>
          <label><input type="checkbox" class="p1-q-def" data-si="${si}" data-qi="${qi}" ${q.defectOnFail !== false ? 'checked' : ''}/> Defect on fail</label>
          <button class="text-red-600 p1-del-q" data-si="${si}" data-qi="${qi}">Delete</button>
        </div>
      </div>`;
    }

    return {
      title: 'Builder',
      html: renderEditor(),
      mount() {
        const readForm = () => {
          tpl.name = document.getElementById('p1Name').value.trim() || 'Untitled';
          tpl.category = document.getElementById('p1Cat').value.trim();
          tpl.frequency = document.getElementById('p1Freq').value;
          tpl.windowStart = document.getElementById('p1Ws').value;
          tpl.windowEnd = document.getElementById('p1We').value;
          tpl.requireManagerVerification = document.getElementById('p1Ver').checked;
          tpl.instructions = document.getElementById('p1Instr').value;
          document.querySelectorAll('.p1-sec-title').forEach((el) => {
            const si = +el.dataset.si;
            if (tpl.sections[si]) tpl.sections[si].title = el.value;
          });
          document.querySelectorAll('.p1-q-label').forEach((el) => {
            const si = +el.dataset.si, qi = +el.dataset.qi;
            if (tpl.sections[si] && tpl.sections[si].questions[qi]) tpl.sections[si].questions[qi].label = el.value;
          });
          document.querySelectorAll('.p1-q-type').forEach((el) => {
            const si = +el.dataset.si, qi = +el.dataset.qi;
            if (tpl.sections[si] && tpl.sections[si].questions[qi]) tpl.sections[si].questions[qi].type = el.value;
          });
          document.querySelectorAll('.p1-q-min').forEach((el) => {
            const si = +el.dataset.si, qi = +el.dataset.qi;
            if (tpl.sections[si] && tpl.sections[si].questions[qi]) tpl.sections[si].questions[qi].min = el.value === '' ? null : Number(el.value);
          });
          document.querySelectorAll('.p1-q-max').forEach((el) => {
            const si = +el.dataset.si, qi = +el.dataset.qi;
            if (tpl.sections[si] && tpl.sections[si].questions[qi]) tpl.sections[si].questions[qi].max = el.value === '' ? null : Number(el.value);
          });
          document.querySelectorAll('.p1-q-risk').forEach((el) => {
            const si = +el.dataset.si, qi = +el.dataset.qi;
            if (tpl.sections[si] && tpl.sections[si].questions[qi]) tpl.sections[si].questions[qi].riskLevel = el.value;
          });
          document.querySelectorAll('.p1-q-unit').forEach((el) => {
            const si = +el.dataset.si, qi = +el.dataset.qi;
            if (tpl.sections[si] && tpl.sections[si].questions[qi]) tpl.sections[si].questions[qi].unit = el.value;
          });
          document.querySelectorAll('.p1-q-mand').forEach((el) => {
            const si = +el.dataset.si, qi = +el.dataset.qi;
            if (tpl.sections[si] && tpl.sections[si].questions[qi]) tpl.sections[si].questions[qi].mandatory = el.checked;
          });
          document.querySelectorAll('.p1-q-def').forEach((el) => {
            const si = +el.dataset.si, qi = +el.dataset.qi;
            if (tpl.sections[si] && tpl.sections[si].questions[qi]) tpl.sections[si].questions[qi].defectOnFail = el.checked;
          });
        };

        document.getElementById('p1AddSec').onclick = () => {
          readForm();
          tpl.sections.push(E.section({ title: 'New section', questions: [E.question()] }));
          window.App.render();
        };
        document.querySelectorAll('.p1-add-q').forEach((b) => {
          b.onclick = () => { readForm(); tpl.sections[+b.dataset.si].questions.push(E.question()); window.App.render(); };
        });
        document.querySelectorAll('.p1-del-sec').forEach((b) => {
          b.onclick = () => { readForm(); tpl.sections.splice(+b.dataset.si, 1); window.App.render(); };
        });
        document.querySelectorAll('.p1-del-q').forEach((b) => {
          b.onclick = () => { readForm(); tpl.sections[+b.dataset.si].questions.splice(+b.dataset.qi, 1); window.App.render(); };
        });
        document.getElementById('p1SaveTpl').onclick = () => {
          try {
            readForm();
            let saved;
            if (!tpl.id) {
              saved = E.createTemplate(tpl);
              saved.sections = tpl.sections;
              E.saveTemplate(saved);
            } else {
              saved = E.saveTemplate(tpl);
            }
            toast && toast(saved.status === 'draft' && saved.parentTemplateId ? 'New version draft created' : 'Saved', 'ok');
            location.hash = '#compliance-p1-templates';
          } catch (e) { toast && toast(e.message, 'err'); }
        };
        document.getElementById('p1Preview').onclick = () => {
          readForm();
          const html = `<div class="p-4"><h2 class="text-xl font-bold mb-2">${esc(tpl.name)}</h2>
            ${(tpl.sections || []).map((sec) => `<h3 class="font-bold mt-4">${esc(sec.title)}</h3>
              <ul class="list-disc ml-5 text-sm">${(sec.questions || []).map((q) => `<li>${esc(q.label)} <span class="text-ink-400">(${esc(q.type)})</span></li>`).join('')}</ul>`).join('')}</div>`;
          if (modal) modal({ title: 'Staff preview', body: html, wide: true });
          else alert('Preview: ' + tpl.name);
        };

        // Simple HTML5 section reorder
        let dragSi = null;
        document.querySelectorAll('.p1-sec').forEach((el) => {
          el.addEventListener('dragstart', () => { dragSi = +el.dataset.si; });
          el.addEventListener('dragover', (e) => e.preventDefault());
          el.addEventListener('drop', () => {
            if (dragSi == null) return;
            readForm();
            const to = +el.dataset.si;
            const moved = tpl.sections.splice(dragSi, 1)[0];
            tpl.sections.splice(to, 0, moved);
            dragSi = null;
            window.App.render();
          });
        });
      },
    };
  }

  function renderExports() {
    const E = CP();
    if (!E.can('export_information')) {
      return { title: 'Exports', html: header('Exports', 'Manager access required') + nav('exports'), mount() {} };
    }
    return {
      title: 'Exports',
      html: header('Exports', 'CSV for spreadsheet analysis. PDF via print for inspection packs (Phase 1).')
        + nav('exports')
        + `<div class="card card-pad space-y-3 max-w-xl">
          <button class="btn btn-primary" id="p1Csv">Download checklist CSV</button>
          <button class="btn btn-ghost" id="p1Pdf">Print / PDF summary</button>
          <p class="text-xs text-ink-400">Exports include company, location, template version, answers, defect and corrective-action fields.</p>
        </div>`,
      mount() {
        document.getElementById('p1Csv').onclick = () => {
          const rows = CP().exportRunsCsv();
          const csv = rows.map((r) => r.map((c) => '"' + String(c).replace(/"/g, '""') + '"').join(',')).join('\n');
          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = 'kiteline-compliance-runs.csv';
          a.click();
          CP().audit('export', 'runs', 'csv', {});
        };
        document.getElementById('p1Pdf').onclick = () => {
          const d = CP().dashboard();
          const s = CP().ensure();
          const loc = CP().currentSite();
          const body = `<div class="compliance-print-brand">Kiteline</div>
            <h1>Compliance summary</h1>
            <p class="meta">${esc(siteLabel(loc))} · ${new Date().toLocaleString()} · Phase 1</p>
            <table><tr><th>Metric</th><th>Value</th></tr>
              <tr><td>Due today</td><td>${d.dueToday}</td></tr>
              <tr><td>Completed today</td><td>${d.completedToday}</td></tr>
              <tr><td>Missed</td><td>${d.missed}</td></tr>
              <tr><td>Open defects</td><td>${d.openDefects}</td></tr>
              <tr><td>Overdue actions</td><td>${d.overdueActions}</td></tr>
            </table>
            <h2 style="margin-top:20px;font-size:16px">Open corrective actions</h2>
            <table><tr><th>Ref</th><th>Title</th><th>Status</th><th>Risk</th></tr>
              ${s.correctiveActions.filter((c) => c.locationId === loc && c.status !== 'closed').slice(0, 40).map((c) =>
                `<tr><td>${esc(c.ref)}</td><td>${esc(c.title)}</td><td>${esc(c.status)}</td><td>${esc(c.riskLevel)}</td></tr>`).join('') || '<tr><td colspan="4">None</td></tr>'}
            </table>
            <p class="meta" style="margin-top:24px">Kiteline helps organise records for inspections. It does not guarantee legal compliance.</p>`;
          if (openPrintDocument) {
            openPrintDocument('Kiteline compliance summary', body,
              'body{font-family:system-ui,sans-serif;color:#0f172a;font-size:13px}h1{color:#0f766e}table{width:100%;border-collapse:collapse}td,th{border:1px solid #e2e8f0;padding:8px;text-align:left}th{background:#ecfdf5}');
          } else {
            const w = window.open('', '_blank');
            w.document.write(body);
            w.print();
          }
          CP().audit('export', 'runs', 'pdf_print', {});
        };
      },
    };
  }

  function renderAudit() {
    const E = CP();
    if (!E.can('view_audit_trail')) {
      return { title: 'Audit trail', html: header('Audit trail', 'Manager access required') + nav('audit'), mount() {} };
    }
    const events = E.ensure().auditEvents.slice(0, 100);
    return {
      title: 'Audit trail',
      html: header('Audit trail', 'Completed records are not silently edited. Corrections and key actions are logged.')
        + nav('audit')
        + `<div class="card card-pad overflow-x-auto"><table class="w-full text-sm"><thead><tr class="text-left text-ink-400 border-b">
          <th class="py-2">When</th><th>User</th><th>Action</th><th>Entity</th><th>Reason</th></tr></thead><tbody>
          ${events.map((e) => `<tr class="border-b border-ink-50"><td class="py-2 text-xs">${esc((e.at || '').replace('T', ' ').slice(0, 19))}</td>
            <td>${esc(e.userName)} <span class="text-ink-400 text-xs">${esc(e.role || '')}</span></td>
            <td>${esc(e.action)}</td><td class="text-xs">${esc(e.entityType)} ${esc(e.entityId || '')}</td>
            <td class="text-xs text-ink-500">${esc(e.reason || '')}</td></tr>`).join('') || '<tr><td colspan="5" class="py-4 text-ink-400">No events</td></tr>'}
        </tbody></table></div>`,
      mount() {},
    };
  }

  function complianceP1() {
    const h = (location.hash || '').replace(/^#/, '');
    let m;
    if ((m = h.match(/^compliance-p1-run-([\w-]+)$/))) return renderRun(m[1]);
    if ((m = h.match(/^compliance-p1-resume-([\w-]+)$/))) return renderRun(null, m[1]);
    if ((m = h.match(/^compliance-p1-edit-([\w-]+)$/))) return renderBuilder(m[1]);
    const t = tab();
    if (t === 'checks') return renderChecks();
    if (t === 'actions') return renderActions();
    if (t === 'templates') return renderTemplates();
    if (t === 'builder') return renderBuilder();
    if (t === 'exports') return renderExports();
    if (t === 'audit') return renderAudit();
    return renderDashboard();
  }

  // Expose under Views — also wrap classic compliance overview with entry card via patch helper
  window.CompliancePhase1Views = { 'compliance-p1': complianceP1 };
  if (window.Views) {
    Object.keys(window.CompliancePhase1Views).forEach((k) => { window.Views[k] = window.CompliancePhase1Views[k]; });
    // Hash router uses route without considering dynamic suffixes — app.js maps compliance-* specially.
  }

  // Enhance classic compliance overview with Phase 1 banner when present
  const prev = window.ComplianceViews && window.ComplianceViews.compliance;
  if (prev) {
    window.Views.compliance = function () {
      const base = prev();
      const banner = `<div class="card card-pad mb-4 border-l-4 border-brand-600 bg-gradient-to-r from-brand-50 to-white">
        <div class="font-bold text-brand-900">Compliance Phase 1 (Available now)</div>
        <p class="text-sm text-ink-600 mt-1">Checklist builder, scheduling, staff completion, defects, corrective actions, verification, dashboard and exports.</p>
        <a href="#compliance-p1-dashboard" class="btn btn-primary btn-sm mt-3">Open Compliance Phase 1</a>
      </div>`;
      return {
        title: base.title,
        html: banner + (base.html || ''),
        mount: base.mount,
      };
    };
  }
})();
