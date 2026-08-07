/* ============================================================
   Kiteline Compliance Phase 1 — engine
   Schedule → Complete → Validate → Defect → CA → Verify → Report
   Original Kiteline system (not a competitor clone).
   ============================================================ */
(function () {
  const STORE_KEY = 'complianceV1';
  const ENGINE_VERSION = 1;

  const ANSWER_TYPES = [
    'pass_fail_na', 'yes_no_na', 'text', 'textarea', 'radio', 'checkbox',
    'dropdown', 'date', 'time', 'datetime', 'number', 'temperature',
    'weight', 'volume', 'length', 'duration', 'currency', 'percentage',
    'photo', 'signature', 'staff_name', 'manager_verification',
  ];

  const FREQUENCIES = [
    'once', 'every_shift', 'daily', 'weekdays', 'weekly', 'fortnightly',
    'four_weekly', 'monthly', 'quarterly', 'six_monthly', 'annually', 'custom',
  ];

  function uid(prefix) {
    return (prefix || 'id') + '_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function emptyState() {
    return {
      _version: ENGINE_VERSION,
      templates: [],
      assignments: [],
      schedules: [],
      runs: [],
      defects: [],
      correctiveActions: [],
      auditEvents: [],
      notifications: [],
      counters: { defect: 0, ca: 0, run: 0 },
    };
  }

  function db() {
    return window.Store && window.Store.db ? window.Store.db : null;
  }

  function ensure(stateDb) {
    const d = stateDb || db();
    if (!d) return emptyState();
    if (!d[STORE_KEY] || typeof d[STORE_KEY] !== 'object') d[STORE_KEY] = emptyState();
    const s = d[STORE_KEY];
    Object.keys(emptyState()).forEach((k) => {
      if (s[k] === undefined) s[k] = emptyState()[k];
    });
    if (!s.counters) s.counters = { defect: 0, ca: 0, run: 0 };
    return s;
  }

  function persist() {
    if (window.Store && window.Store.persist) window.Store.persist();
  }

  function currentUser() {
    if (window.App && window.App.currentUser) return window.App.currentUser();
    const team = (db() && db().team) || [];
    return team[0] || { id: 'u_unknown', name: 'User', role: 'Staff', rank: 1, access: 'Staff' };
  }

  function currentSite() {
    const d = db();
    return (d && d.currentSite) || (d && d.sites && d.sites[0] && d.sites[0].id) || 'site_default';
  }

  function rankOf(user) {
    if (user && typeof user.rank === 'number') return user.rank;
    const access = (user && user.access) || 'Staff';
    if (access === 'Admin') return 3;
    if (access === 'Manager') return 2;
    const title = String((user && user.role) || '').toLowerCase();
    if (/owner|director|admin|gm/.test(title)) return 3;
    if (/manager|compliance|supervisor|lead|head chef/.test(title)) return 2;
    return 1;
  }

  /** Phase 1 permission matrix (mapped to existing Admin/Manager/Staff ranks). */
  function permissionsFor(user) {
    const r = rankOf(user);
    return {
      create_templates: r >= 3,
      edit_templates: r >= 3,
      publish_templates: r >= 3,
      assign_checklists: r >= 2,
      complete_checks: r >= 1,
      reopen_checks: r >= 2,
      raise_corrective_actions: r >= 1,
      close_corrective_actions: r >= 2,
      verify_actions: r >= 2,
      view_reports: r >= 2,
      export_information: r >= 2,
      archive_records: r >= 3,
      change_limits: r >= 3,
      manage_users_locations: r >= 3,
      view_audit_trail: r >= 2,
    };
  }

  function can(perm, user) {
    const p = permissionsFor(user || currentUser());
    return !!p[perm];
  }

  function audit(action, entityType, entityId, opts) {
    const s = ensure();
    const u = currentUser();
    s.auditEvents.unshift({
      id: uid('aud'),
      at: nowIso(),
      userId: u.id,
      userName: u.name,
      role: u.role || u.access,
      locationId: currentSite(),
      action,
      entityType,
      entityId: entityId || null,
      originalValue: opts && opts.original != null ? opts.original : null,
      newValue: opts && opts.next != null ? opts.next : null,
      reason: (opts && opts.reason) || '',
      device: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 120) : '',
    });
    if (s.auditEvents.length > 2000) s.auditEvents.length = 2000;
  }

  function notify(eventType, title, body, entity) {
    const s = ensure();
    s.notifications.unshift({
      id: uid('ntf'),
      at: nowIso(),
      channel: 'in_app',
      eventType,
      title,
      body: body || '',
      locationId: currentSite(),
      entityType: entity && entity.type,
      entityId: entity && entity.id,
      readAt: null,
    });
    if (s.notifications.length > 500) s.notifications.length = 500;
    // Also surface in legacy alerts list when available
    const d = db();
    if (d && Array.isArray(d.alerts)) {
      d.alerts.unshift({
        id: uid('al'),
        site: currentSite(),
        type: eventType,
        title,
        message: body || title,
        status: 'open',
        at: nowIso(),
        source: 'complianceV1',
      });
    }
  }

  function nextRef(kind) {
    const s = ensure();
    if (kind === 'defect') {
      s.counters.defect = (s.counters.defect || 0) + 1;
      return 'KDEF-' + String(s.counters.defect).padStart(5, '0');
    }
    if (kind === 'ca') {
      s.counters.ca = (s.counters.ca || 0) + 1;
      return 'KCA-' + String(s.counters.ca).padStart(5, '0');
    }
    s.counters.run = (s.counters.run || 0) + 1;
    return 'KRUN-' + String(s.counters.run).padStart(5, '0');
  }

  function question(partial) {
    return Object.assign({
      id: uid('q'),
      label: 'New question',
      type: 'pass_fail_na',
      helpText: '',
      instructions: '',
      mandatory: true,
      allowNa: true,
      expectedAnswer: '',
      min: null,
      max: null,
      target: null,
      unit: '',
      options: [],
      evidenceRequired: false,
      commentRequiredOnFail: true,
      defectOnFail: true,
      riskLevel: 'medium',
      immediateActionHint: '',
      requireIndependentVerification: false,
    }, partial || {});
  }

  function section(partial) {
    return Object.assign({
      id: uid('sec'),
      title: 'New section',
      instructions: '',
      questions: [],
    }, partial || {});
  }

  function createTemplate(partial, opts) {
    if (!(opts && opts.systemSeed) && !can('create_templates')) {
      throw new Error('Not allowed to create templates');
    }
    const s = ensure();
    const t = Object.assign({
      id: uid('tpl'),
      name: 'Untitled checklist',
      description: '',
      category: 'Food safety',
      department: 'Kitchen',
      instructions: '',
      responsibleRole: 'Staff',
      frequency: 'daily',
      daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
      windowStart: '06:00',
      windowEnd: '11:00',
      graceMinutes: 30,
      requireManagerVerification: false,
      evidenceRequired: false,
      version: 1,
      status: 'draft',
      sections: [],
      locationIds: [currentSite()],
      createdAt: nowIso(),
      updatedAt: nowIso(),
      publishedAt: null,
      createdBy: currentUser().id,
    }, partial || {});
    s.templates.unshift(t);
    audit('create', 'template', t.id, { next: { name: t.name, status: t.status } });
    persist();
    return t;
  }

  function duplicateTemplate(templateId) {
    const s = ensure();
    const src = s.templates.find((t) => t.id === templateId);
    if (!src) throw new Error('Template not found');
    if (!can('create_templates')) throw new Error('Not allowed');
    const copy = JSON.parse(JSON.stringify(src));
    copy.id = uid('tpl');
    copy.name = src.name + ' (copy)';
    copy.status = 'draft';
    copy.version = 1;
    copy.publishedAt = null;
    copy.createdAt = nowIso();
    copy.updatedAt = nowIso();
    copy.sections = (copy.sections || []).map((sec) => {
      sec.id = uid('sec');
      sec.questions = (sec.questions || []).map((q) => Object.assign({}, q, { id: uid('q') }));
      return sec;
    });
    s.templates.unshift(copy);
    audit('duplicate', 'template', copy.id, { original: src.id });
    persist();
    return copy;
  }

  function saveTemplate(template) {
    if (!can('edit_templates')) throw new Error('Not allowed to edit templates');
    const s = ensure();
    const idx = s.templates.findIndex((t) => t.id === template.id);
    if (idx < 0) throw new Error('Template not found');
    const prev = s.templates[idx];
    if (prev.status === 'active') {
      // Versioning: editing a published template creates a new draft version
      const draft = JSON.parse(JSON.stringify(template));
      draft.id = uid('tpl');
      draft.status = 'draft';
      draft.version = (prev.version || 1) + 1;
      draft.parentTemplateId = prev.id;
      draft.publishedAt = null;
      draft.createdAt = nowIso();
      draft.updatedAt = nowIso();
      s.templates.unshift(draft);
      audit('version', 'template', draft.id, {
        original: { id: prev.id, version: prev.version },
        next: { version: draft.version },
        reason: 'Published template edited — new draft version created',
      });
      persist();
      return draft;
    }
    template.updatedAt = nowIso();
    s.templates[idx] = template;
    audit('update', 'template', template.id, { original: { version: prev.version }, next: { version: template.version } });
    persist();
    return template;
  }

  function publishTemplate(templateId, opts) {
    if (!(opts && opts.systemSeed) && !can('publish_templates')) {
      throw new Error('Not allowed to publish');
    }
    const s = ensure();
    const t = s.templates.find((x) => x.id === templateId);
    if (!t) throw new Error('Template not found');
    if (!t.sections || !t.sections.length) throw new Error('Add at least one section before publishing');
    const qCount = t.sections.reduce((n, sec) => n + (sec.questions || []).length, 0);
    if (!qCount) throw new Error('Add at least one question before publishing');
    t.status = 'active';
    t.publishedAt = nowIso();
    t.updatedAt = nowIso();
    // Ensure schedule for each assigned location
    (t.locationIds || [currentSite()]).forEach((loc) => ensureSchedule(t.id, loc));
    audit('publish', 'template', t.id, { next: { version: t.version, status: 'active' } });
    persist();
    return t;
  }

  function archiveTemplate(templateId) {
    if (!can('archive_records')) throw new Error('Not allowed');
    const s = ensure();
    const t = s.templates.find((x) => x.id === templateId);
    if (!t) throw new Error('Template not found');
    t.status = 'archived';
    t.updatedAt = nowIso();
    audit('archive', 'template', t.id, {});
    persist();
    return t;
  }

  function ensureSchedule(templateId, locationId) {
    const s = ensure();
    const t = s.templates.find((x) => x.id === templateId);
    if (!t) return null;
    let sch = s.schedules.find((x) => x.templateId === templateId && x.locationId === locationId && x.active);
    if (!sch) {
      sch = {
        id: uid('sch'),
        templateId,
        locationId,
        frequency: t.frequency || 'daily',
        windowStart: t.windowStart || '06:00',
        windowEnd: t.windowEnd || '23:59',
        graceMinutes: t.graceMinutes || 30,
        allowLate: true,
        autoMiss: true,
        paused: false,
        active: true,
        nextDueAt: computeNextDue(t.frequency || 'daily'),
        createdAt: nowIso(),
      };
      s.schedules.push(sch);
    }
    return sch;
  }

  function computeNextDue(frequency) {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    if (frequency === 'weekly') d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7));
    else if (frequency === 'monthly') d.setMonth(d.getMonth() + 1, 1);
    else d.setHours(6, 0, 0, 0);
    if (d.getTime() < Date.now()) d.setDate(d.getDate() + 1);
    return d.toISOString();
  }

  function evaluateAnswer(q, raw) {
    const result = {
      ok: true,
      defect: false,
      na: false,
      message: '',
      normalised: raw,
    };
    if (raw == null || raw === '') {
      if (q.mandatory) {
        result.ok = false;
        result.message = 'This question is mandatory';
      }
      return result;
    }
    if (String(raw).toLowerCase() === 'na' || String(raw).toLowerCase() === 'n/a') {
      result.na = true;
      if (!q.allowNa && q.mandatory) {
        result.ok = false;
        result.message = 'Not applicable is not allowed for this question';
      }
      return result;
    }

    const type = q.type;
    if (type === 'pass_fail_na') {
      if (String(raw).toLowerCase() === 'fail' && q.defectOnFail !== false) {
        result.defect = true;
        result.message = 'Fail recorded';
      }
    } else if (type === 'yes_no_na') {
      const expected = (q.expectedAnswer || 'yes').toLowerCase();
      if (String(raw).toLowerCase() !== expected && q.defectOnFail !== false) {
        result.defect = true;
        result.message = 'Answer does not match expected (' + expected + ')';
      }
    } else if (['number', 'temperature', 'weight', 'volume', 'length', 'percentage', 'currency'].indexOf(type) >= 0) {
      const n = Number(raw);
      if (Number.isNaN(n)) {
        result.ok = false;
        result.message = 'Enter a valid number';
        return result;
      }
      result.normalised = n;
      if (q.min != null && n < Number(q.min)) {
        result.defect = true;
        result.message = 'Below minimum (' + q.min + (q.unit ? ' ' + q.unit : '') + ')';
      }
      if (q.max != null && n > Number(q.max)) {
        result.defect = true;
        result.message = 'Above maximum (' + q.max + (q.unit ? ' ' + q.unit : '') + ')';
      }
    }
    return result;
  }

  function startRun(templateId, opts) {
    if (!can('complete_checks')) throw new Error('Not allowed to complete checks');
    const s = ensure();
    const t = s.templates.find((x) => x.id === templateId && x.status === 'active');
    if (!t) throw new Error('Published template not found');
    const loc = (opts && opts.locationId) || currentSite();
    const sch = ensureSchedule(t.id, loc);
    const run = {
      id: uid('run'),
      ref: nextRef('run'),
      templateId: t.id,
      templateName: t.name,
      templateVersion: t.version,
      templateSnapshot: JSON.parse(JSON.stringify(t)),
      scheduleId: sch && sch.id,
      locationId: loc,
      status: 'in_progress',
      draft: true,
      scheduledFor: (sch && sch.nextDueAt) || nowIso(),
      startedAt: nowIso(),
      completedAt: null,
      completedBy: null,
      completedByName: null,
      verifiedBy: null,
      verifiedByName: null,
      verifiedAt: null,
      lateReason: '',
      answers: {},
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    s.runs.unshift(run);
    audit('start', 'run', run.id, { next: { templateId: t.id, ref: run.ref } });
    persist();
    return run;
  }

  function saveDraft(runId, answers) {
    const s = ensure();
    const run = s.runs.find((r) => r.id === runId);
    if (!run) throw new Error('Run not found');
    if (run.status === 'completed') throw new Error('Completed records cannot be silently edited');
    run.answers = Object.assign({}, run.answers || {}, answers || {});
    run.draft = true;
    run.status = 'in_progress';
    run.updatedAt = nowIso();
    persist();
    return run;
  }

  function raiseDefect(run, q, answer, evalResult) {
    const s = ensure();
    const u = currentUser();
    const defect = {
      id: uid('def'),
      ref: nextRef('defect'),
      runId: run.id,
      templateId: run.templateId,
      templateName: run.templateName,
      locationId: run.locationId,
      questionId: q.id,
      questionLabel: q.label,
      recordedAnswer: String(answer),
      expectedAnswer: q.expectedAnswer || (q.min != null || q.max != null
        ? ((q.min != null ? q.min : '…') + '–' + (q.max != null ? q.max : '…') + (q.unit ? ' ' + q.unit : ''))
        : 'Pass / expected'),
      riskLevel: q.riskLevel || 'medium',
      status: 'open',
      recordedBy: u.id,
      recordedByName: u.name,
      recordedAt: nowIso(),
      comment: '',
      evidence: [],
      immediateAction: q.immediateActionHint || '',
      areaOrEquipment: '',
      message: evalResult.message || '',
    };
    s.defects.unshift(defect);

    const critical = defect.riskLevel === 'high' || defect.riskLevel === 'critical';
    const ca = {
      id: uid('ca'),
      ref: nextRef('ca'),
      defectId: defect.id,
      defectRef: defect.ref,
      runId: run.id,
      locationId: run.locationId,
      title: 'Correct: ' + q.label,
      description: evalResult.message || ('Defect on ' + q.label),
      riskLevel: defect.riskLevel,
      status: 'open',
      assignedTo: null,
      assignedToName: '',
      dueAt: new Date(Date.now() + (critical ? 4 : 24) * 3600e3).toISOString(),
      escalateAt: new Date(Date.now() + (critical ? 2 : 12) * 3600e3).toISOString(),
      requireIndependentVerification: !!(q.requireIndependentVerification || critical || (run.templateSnapshot && run.templateSnapshot.requireManagerVerification)),
      recordedBy: u.id,
      recordedByName: u.name,
      closureComment: '',
      closureEvidence: [],
      closedBy: null,
      closedAt: null,
      verifiedBy: null,
      verifiedByName: null,
      verifiedAt: null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    s.correctiveActions.unshift(ca);
    audit('raise_defect', 'defect', defect.id, { next: { ref: defect.ref, ca: ca.ref } });
    notify(
      critical ? 'critical_defect' : 'defect_raised',
      critical ? 'Critical defect: ' + defect.ref : 'Defect raised: ' + defect.ref,
      q.label + ' — ' + (evalResult.message || answer),
      { type: 'defect', id: defect.id }
    );
    return { defect, ca };
  }

  function submitRun(runId, opts) {
    if (!can('complete_checks')) throw new Error('Not allowed');
    const s = ensure();
    const run = s.runs.find((r) => r.id === runId);
    if (!run) throw new Error('Run not found');
    if (run.status === 'completed') throw new Error('Already completed');
    const snap = run.templateSnapshot || {};
    const sections = snap.sections || [];
    const answers = run.answers || {};
    const raised = [];

    for (let si = 0; si < sections.length; si++) {
      const sec = sections[si];
      for (let qi = 0; qi < (sec.questions || []).length; qi++) {
        const q = sec.questions[qi];
        const raw = answers[q.id];
        const ev = evaluateAnswer(q, raw);
        if (!ev.ok) throw new Error((q.label || 'Question') + ': ' + ev.message);
        if (ev.defect) {
          if (q.commentRequiredOnFail && !(answers[q.id + '__comment'])) {
            throw new Error((q.label || 'Question') + ': comment required for failed result');
          }
          raised.push(raiseDefect(run, q, raw, ev));
        }
      }
    }

    const u = currentUser();
    run.draft = false;
    run.status = 'completed';
    run.completedAt = nowIso();
    run.completedBy = u.id;
    run.completedByName = u.name;
    run.lateReason = (opts && opts.lateReason) || run.lateReason || '';
    run.updatedAt = nowIso();

    // Advance schedule
    const sch = s.schedules.find((x) => x.id === run.scheduleId);
    if (sch) sch.nextDueAt = computeNextDue(sch.frequency || 'daily');

    audit('submit', 'run', run.id, { next: { ref: run.ref, defects: raised.length } });
    notify('checklist_completed', 'Checklist completed', run.templateName + ' · ' + run.ref, { type: 'run', id: run.id });
    persist();
    return { run, defects: raised.map((x) => x.defect), correctiveActions: raised.map((x) => x.ca) };
  }

  function updateCorrectiveAction(caId, patch) {
    const s = ensure();
    const ca = s.correctiveActions.find((x) => x.id === caId);
    if (!ca) throw new Error('Corrective action not found');
    const prev = { status: ca.status };
    Object.assign(ca, patch || {}, { updatedAt: nowIso() });
    audit('update', 'corrective_action', ca.id, { original: prev, next: { status: ca.status }, reason: patch && patch.reason });
    persist();
    return ca;
  }

  function closeCorrectiveAction(caId, closure) {
    if (!can('close_corrective_actions')) throw new Error('Not allowed to close corrective actions');
    const s = ensure();
    const ca = s.correctiveActions.find((x) => x.id === caId);
    if (!ca) throw new Error('Corrective action not found');
    const u = currentUser();
    ca.closureComment = (closure && closure.comment) || '';
    ca.closureEvidence = (closure && closure.evidence) || [];
    ca.closedBy = u.id;
    ca.closedByName = u.name;
    ca.closedAt = nowIso();
    if (ca.requireIndependentVerification) {
      ca.status = 'awaiting_verification';
      notify('action_awaiting_verification', 'Verification required', ca.ref + ' — ' + ca.title, { type: 'corrective_action', id: ca.id });
    } else {
      ca.status = 'closed';
    }
    ca.updatedAt = nowIso();
    const def = s.defects.find((d) => d.id === ca.defectId);
    if (def) def.status = ca.status === 'closed' ? 'closed' : 'awaiting_verification';
    audit('close', 'corrective_action', ca.id, { next: { status: ca.status } });
    persist();
    return ca;
  }

  function verifyCorrectiveAction(caId, decision) {
    if (!can('verify_actions')) throw new Error('Not allowed to verify');
    const s = ensure();
    const ca = s.correctiveActions.find((x) => x.id === caId);
    if (!ca) throw new Error('Corrective action not found');
    const u = currentUser();
    if (ca.requireIndependentVerification && (u.id === ca.recordedBy || u.id === ca.closedBy)) {
      throw new Error('Independent verification required — the same person cannot complete and verify this critical action');
    }
    if (decision && decision.reject) {
      ca.status = 'in_progress';
      ca.verifiedBy = u.id;
      ca.verifiedByName = u.name;
      ca.verifiedAt = nowIso();
      audit('verify_reject', 'corrective_action', ca.id, { reason: decision.comment || '' });
      persist();
      return ca;
    }
    ca.status = 'closed';
    ca.verifiedBy = u.id;
    ca.verifiedByName = u.name;
    ca.verifiedAt = nowIso();
    ca.updatedAt = nowIso();
    const def = s.defects.find((d) => d.id === ca.defectId);
    if (def) def.status = 'closed';
    audit('verify', 'corrective_action', ca.id, { next: { status: 'closed' } });
    persist();
    return ca;
  }

  function markOverdue() {
    const s = ensure();
    const now = Date.now();
    s.correctiveActions.forEach((ca) => {
      if (ca.status !== 'closed' && ca.dueAt && new Date(ca.dueAt).getTime() < now) {
        if (ca.status !== 'overdue') {
          ca.status = 'overdue';
          notify('corrective_action_overdue', 'Overdue action', ca.ref + ' — ' + ca.title, { type: 'corrective_action', id: ca.id });
        }
      }
    });
    s.schedules.forEach((sch) => {
      if (!sch.active || sch.paused || !sch.autoMiss) return;
      if (!sch.nextDueAt) return;
      const grace = (sch.graceMinutes || 30) * 60e3;
      if (new Date(sch.nextDueAt).getTime() + grace < now) {
        const exists = s.runs.some((r) => r.scheduleId === sch.id && r.status === 'missed'
          && r.scheduledFor === sch.nextDueAt);
        if (!exists) {
          const t = s.templates.find((x) => x.id === sch.templateId);
          s.runs.unshift({
            id: uid('run'),
            ref: nextRef('run'),
            templateId: sch.templateId,
            templateName: (t && t.name) || 'Checklist',
            templateVersion: (t && t.version) || 1,
            templateSnapshot: t ? JSON.parse(JSON.stringify(t)) : {},
            scheduleId: sch.id,
            locationId: sch.locationId,
            status: 'missed',
            draft: false,
            scheduledFor: sch.nextDueAt,
            startedAt: null,
            completedAt: null,
            answers: {},
            createdAt: nowIso(),
            updatedAt: nowIso(),
          });
          notify('checklist_missed', 'Missed checklist', (t && t.name) || 'Checklist', { type: 'schedule', id: sch.id });
          sch.nextDueAt = computeNextDue(sch.frequency || 'daily');
        }
      }
    });
    persist();
  }

  function dashboard(locationId) {
    markOverdue();
    const s = ensure();
    const loc = locationId || currentSite();
    const today = new Date().toISOString().slice(0, 10);
    const runs = s.runs.filter((r) => r.locationId === loc);
    const defects = s.defects.filter((d) => d.locationId === loc);
    const cas = s.correctiveActions.filter((c) => c.locationId === loc);
    const dueSchedules = s.schedules.filter((sch) => sch.locationId === loc && sch.active && !sch.paused);
    return {
      dueToday: dueSchedules.filter((sch) => (sch.nextDueAt || '').slice(0, 10) <= today).length,
      inProgress: runs.filter((r) => r.status === 'in_progress').length,
      completedToday: runs.filter((r) => r.status === 'completed' && (r.completedAt || '').slice(0, 10) === today).length,
      missed: runs.filter((r) => r.status === 'missed').length,
      openDefects: defects.filter((d) => d.status === 'open' || d.status === 'in_progress').length,
      criticalDefects: defects.filter((d) => (d.riskLevel === 'high' || d.riskLevel === 'critical') && d.status !== 'closed').length,
      overdueActions: cas.filter((c) => c.status === 'overdue' || (c.status !== 'closed' && c.dueAt && new Date(c.dueAt) < new Date())).length,
      awaitingVerification: cas.filter((c) => c.status === 'awaiting_verification').length,
      unreadNotifications: s.notifications.filter((n) => !n.readAt && n.locationId === loc).length,
    };
  }

  function exportRunsCsv(locationId) {
    const s = ensure();
    const loc = locationId || currentSite();
    const rows = [[
      'Company', 'Location', 'Checklist', 'Template version', 'Run ref', 'Scheduled', 'Status',
      'Completed at', 'Completed by', 'Section', 'Question', 'Answer', 'Defect ref',
      'CA ref', 'CA status', 'CA due', 'Closed by', 'Verified by',
    ]];
    const d = db();
    const site = (d.sites || []).find((x) => x.id === loc);
    const company = (d.org && d.org.name) || 'Kiteline customer';
    s.runs.filter((r) => r.locationId === loc).forEach((run) => {
      const sections = (run.templateSnapshot && run.templateSnapshot.sections) || [];
      sections.forEach((sec) => {
        (sec.questions || []).forEach((q) => {
          const def = s.defects.find((x) => x.runId === run.id && x.questionId === q.id);
          const ca = def ? s.correctiveActions.find((x) => x.defectId === def.id) : null;
          rows.push([
            company,
            (site && site.name) || loc,
            run.templateName,
            run.templateVersion,
            run.ref,
            run.scheduledFor || '',
            run.status,
            run.completedAt || '',
            run.completedByName || '',
            sec.title,
            q.label,
            run.answers && run.answers[q.id] != null ? String(run.answers[q.id]) : '',
            def ? def.ref : '',
            ca ? ca.ref : '',
            ca ? ca.status : '',
            ca ? (ca.dueAt || '') : '',
            ca ? (ca.closedByName || '') : '',
            ca ? (ca.verifiedByName || '') : '',
          ]);
        });
      });
      if (!sections.length) {
        rows.push([company, (site && site.name) || loc, run.templateName, run.templateVersion, run.ref, run.scheduledFor || '', run.status, run.completedAt || '', run.completedByName || '', '', '', '', '', '', '', '', '', '']);
      }
    });
    return rows;
  }

  function seedKitelineTemplates(force) {
    const s = ensure();
    if (!force && s.templates.some((t) => t.kitelineSeed)) return s.templates.filter((t) => t.kitelineSeed);
    if (force && s.templates.some((t) => t.kitelineSeed)) {
      // Re-publish / return existing seeds rather than duplicating
      s.templates.filter((t) => t.kitelineSeed && t.status === 'draft').forEach((t) => {
        try { publishTemplate(t.id, { systemSeed: true }); } catch (e) { /* ignore */ }
      });
      persist();
      return s.templates.filter((t) => t.kitelineSeed);
    }

    function tempQ(label, min, max, risk) {
      return question({
        label,
        type: 'temperature',
        min,
        max,
        unit: '°C',
        riskLevel: risk || 'high',
        defectOnFail: true,
        commentRequiredOnFail: true,
        evidenceRequired: false,
        immediateActionHint: 'Recheck with calibrated probe. Move food if needed. Inform manager.',
        requireIndependentVerification: risk === 'critical' || risk === 'high',
        helpText: 'Use a clean calibrated probe. Record the reading in °C.',
      });
    }

    function pf(label, risk) {
      return question({
        label,
        type: 'pass_fail_na',
        riskLevel: risk || 'medium',
        defectOnFail: true,
        commentRequiredOnFail: true,
        immediateActionHint: 'Correct the issue before service continues where safe to do so.',
      });
    }

    const seeds = [
      {
        name: 'Kitchen opening checks',
        category: 'Food safety',
        frequency: 'daily',
        windowStart: '06:00',
        windowEnd: '11:00',
        description: 'Original Kiteline opening checklist for professional kitchens.',
        sections: [
          section({
            title: 'Hygiene & readiness',
            questions: [
              pf('Hands, PPE and jewellery policy followed'),
              pf('Sinks stocked with soap and paper towels'),
              pf('Work surfaces clean and sanitised before prep'),
              pf('Pest signs checked (no activity observed)'),
            ],
          }),
          section({
            title: 'Cold storage',
            questions: [
              tempQ('Walk-in / main fridge temperature', 0, 5, 'high'),
              tempQ('Main freezer temperature', -25, -18, 'high'),
              pf('Date codes and stock rotation acceptable'),
            ],
          }),
        ],
      },
      {
        name: 'Kitchen closing checks',
        category: 'Food safety',
        frequency: 'daily',
        windowStart: '20:00',
        windowEnd: '23:59',
        description: 'Original Kiteline closing checklist.',
        sections: [
          section({
            title: 'Close-down',
            questions: [
              pf('Hot equipment switched off / safe'),
              pf('Food covered, labelled and stored correctly'),
              pf('Floors cleaned; waste removed'),
              pf('Fire exits clear; lights/alarms as required'),
              tempQ('Fridge temperature at close', 0, 5, 'high'),
            ],
          }),
        ],
      },
      {
        name: 'Fridge temperature record',
        category: 'Temperature',
        frequency: 'daily',
        windowStart: '06:00',
        windowEnd: '22:00',
        requireManagerVerification: true,
        description: 'Dedicated fridge temperature checks with fail follow-up.',
        sections: [
          section({
            title: 'Reading',
            questions: [
              tempQ('Fridge temperature (°C)', 0, 5, 'high'),
              question({
                label: 'Was the temperature checked again after a fail?',
                type: 'yes_no_na',
                expectedAnswer: 'yes',
                mandatory: false,
                allowNa: true,
                defectOnFail: false,
                helpText: 'Complete if the first reading was out of range.',
              }),
              question({
                label: 'Second reading (°C)',
                type: 'temperature',
                min: 0,
                max: 5,
                unit: '°C',
                mandatory: false,
                allowNa: true,
                riskLevel: 'high',
                defectOnFail: true,
              }),
              question({
                label: 'Was affected food moved or discarded?',
                type: 'yes_no_na',
                expectedAnswer: 'yes',
                mandatory: false,
                allowNa: true,
                defectOnFail: true,
                riskLevel: 'high',
              }),
              question({
                label: 'Was maintenance / manager informed?',
                type: 'yes_no_na',
                expectedAnswer: 'yes',
                mandatory: false,
                allowNa: true,
                defectOnFail: true,
                riskLevel: 'medium',
              }),
            ],
          }),
        ],
      },
      {
        name: 'Freezer temperature record',
        category: 'Temperature',
        frequency: 'daily',
        sections: [section({ title: 'Reading', questions: [tempQ('Freezer temperature (°C)', -25, -18, 'high')] })],
      },
      {
        name: 'Delivery acceptance',
        category: 'Food safety',
        frequency: 'every_shift',
        sections: [
          section({
            title: 'Goods in',
            questions: [
              pf('Vehicle and packaging clean and undamaged'),
              tempQ('Chilled delivery temperature (°C)', 0, 5, 'high'),
              pf('Use-by / best-before dates acceptable'),
              pf('Allergen / specification info available where required'),
              question({ label: 'Delivery accepted or rejected', type: 'dropdown', options: ['Accepted', 'Part accepted', 'Rejected'], mandatory: true, defectOnFail: false }),
            ],
          }),
        ],
      },
      {
        name: 'Hot holding record',
        category: 'Temperature',
        frequency: 'every_shift',
        sections: [section({ title: 'Hot hold', questions: [tempQ('Hot-hold temperature (°C)', 63, 90, 'high'), pf('Food labelled and within hold time')] })],
      },
      {
        name: 'Cooking temperature record',
        category: 'Temperature',
        frequency: 'every_shift',
        sections: [section({ title: 'Cook', questions: [
          question({ label: 'Product / batch', type: 'text', mandatory: true, defectOnFail: false }),
          tempQ('Core cooking temperature (°C)', 75, 100, 'critical'),
        ] })],
      },
      {
        name: 'Probe calibration',
        category: 'Temperature',
        frequency: 'weekly',
        sections: [section({ title: 'Calibration', questions: [
          question({ label: 'Probe identity', type: 'text', mandatory: true, defectOnFail: false }),
          question({ label: 'Ice-point reading (°C)', type: 'temperature', min: -1, max: 1, unit: '°C', riskLevel: 'medium' }),
          question({ label: 'Boiling-point reading (°C)', type: 'temperature', min: 99, max: 101, unit: '°C', riskLevel: 'medium' }),
          pf('Probe within ±1°C tolerance'),
        ] })],
      },
    ];

    const created = [];
    const seedOpts = { systemSeed: true };
    seeds.forEach((seed) => {
      const t = createTemplate({
        name: seed.name,
        description: seed.description || '',
        category: seed.category,
        frequency: seed.frequency,
        windowStart: seed.windowStart || '06:00',
        windowEnd: seed.windowEnd || '22:00',
        requireManagerVerification: !!seed.requireManagerVerification,
        sections: seed.sections,
        kitelineSeed: true,
        status: 'draft',
      }, seedOpts);
      const stored = ensure().templates.find((x) => x.id === t.id);
      if (stored) {
        stored.sections = seed.sections;
        stored.kitelineSeed = true;
        try { publishTemplate(stored.id, seedOpts); } catch (e) { /* keep draft if publish rules fail */ }
      }
      created.push(stored || t);
    });
    persist();
    return created;
  }

  function ensureSeeded() {
    const s = ensure();
    if (!s.templates.some((t) => t.kitelineSeed)) {
      try { seedKitelineTemplates(false); } catch (e) { console.warn('[complianceV1] seed', e.message); }
    }
    return s;
  }

  window.CompliancePhase1 = {
    STORE_KEY,
    ANSWER_TYPES,
    FREQUENCIES,
    ensure,
    ensureSeeded,
    can,
    permissionsFor,
    currentUser,
    currentSite,
    question,
    section,
    createTemplate,
    duplicateTemplate,
    saveTemplate,
    publishTemplate,
    archiveTemplate,
    ensureSchedule,
    evaluateAnswer,
    startRun,
    saveDraft,
    submitRun,
    updateCorrectiveAction,
    closeCorrectiveAction,
    verifyCorrectiveAction,
    markOverdue,
    dashboard,
    exportRunsCsv,
    seedKitelineTemplates,
    audit,
    notify,
    nextRef,
  };
})();
