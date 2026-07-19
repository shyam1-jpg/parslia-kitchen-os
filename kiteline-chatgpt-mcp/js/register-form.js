/* Kiteline — multi-step registration wizard (i18n-friendly) */
(function () {
  const STORAGE_KEY = 'kiteline.regdraft';

  const BUSINESS_TYPES = [
    'Restaurant', 'Hotel', 'Café', 'Bakery', 'Pub', 'Care Home', 'Catering',
    'Commercial Kitchen', 'School / College', 'Retreat Centre', 'Event Venue',
    'Takeaway', 'Ghost Kitchen', 'Food Court', 'Education', 'Other',
  ];

  const JOB_ROLES = [
    'Owner / Director', 'Head Chef', 'Kitchen Manager', 'Compliance / QA',
    'Operations Manager', 'General Manager', 'Staff', 'Other',
  ];

  const SITE_COUNTS = ['1', '2-5', '6-10', '11+'];
  const TEAM_SIZES = ['1-5', '6-15', '16-30', '31-50', '50+'];
  const HACCP_METHODS = ['Paper checklists', 'Spreadsheets', 'Another software', 'New to digital HACCP'];

  const COUNTRIES = [
    'United Kingdom', 'Ireland', 'France', 'Germany', 'Spain', 'Poland', 'Portugal',
    'Netherlands', 'Italy', 'Other',
  ];

  const MODULES = [
    { id: 'fss', labelKey: 'reg.mod.fss' },
    { id: 'allerq', labelKey: 'reg.mod.allerq' },
    { id: 'labels', labelKey: 'reg.mod.labels' },
    { id: 'waste', labelKey: 'reg.mod.waste' },
    { id: 'sensors', labelKey: 'reg.mod.sensors' },
  ];

  function t(k, fb) {
    if (window.I18n) return window.I18n.t(k, fb);
    return fb || k;
  }

  function loadDraft() {
    try { return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
  }

  function saveDraft(data, step) {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, step }));
  }

  function clearDraft() {
    sessionStorage.removeItem(STORAGE_KEY);
  }

  function esc(s) {
    return (window.UI && window.UI.escapeHtml) ? window.UI.escapeHtml(s) : String(s || '');
  }

  function regLegalFooter() {
    return `<p class="text-xs text-ink-400 text-center mt-6 leading-relaxed">
      © 2026 Kiteline<br>
      <a href="/contact.html" class="text-brand-600 font-semibold" target="_blank" rel="noopener">Contact</a> ·
      <a href="/terms.html" class="text-brand-600 font-semibold" target="_blank" rel="noopener">Terms</a> ·
      <a href="/privacy.html" class="text-brand-600 font-semibold" target="_blank" rel="noopener">Privacy</a>
    </p>`;
  }

  function optList(items, key, selected) {
    return items.map(v => `<option value="${esc(v)}" ${selected === v ? 'selected' : ''}>${esc(v)}</option>`).join('');
  }

  function langPicker() {
    const langs = (window.I18n && window.I18n.langs) || ['en'];
    const cur = (window.I18n && window.I18n.lang) || 'en';
    return `<div class="flex items-center justify-between gap-3 mb-4">
      <span class="text-xs font-semibold text-ink-500">${t('reg.language', 'Language')}</span>
      <select id="regLang" class="select !w-auto !py-1.5 text-sm">${langs.map(l =>
        `<option value="${l}" ${l === cur ? 'selected' : ''}>${window.I18n ? window.I18n.langName(l) : l}</option>`
      ).join('')}</select>
    </div>`;
  }

  function progressBar(step) {
    const steps = [
      t('reg.step1.short', 'You'),
      t('reg.step2.short', 'Business'),
      t('reg.step3.short', 'Kitchen'),
      t('reg.step4.short', 'Account'),
    ];
    return `<div class="mb-6">
      <div class="flex justify-between text-[10px] font-bold uppercase tracking-wide text-ink-400 mb-2">
        ${steps.map((s, i) => `<span class="${i + 1 <= step ? 'text-brand-600' : ''}">${i + 1}. ${s}</span>`).join('')}
      </div>
      <div class="h-1.5 rounded-full bg-ink-100 overflow-hidden">
        <div class="h-full bg-brand-500 transition-all" style="width:${(step / 4) * 100}%"></div>
      </div>
    </div>`;
  }

  function step1Html(d) {
    return `
      <h3 class="font-bold text-lg mb-1">${t('reg.step1.title', 'Your details')}</h3>
      <p class="text-sm text-ink-500 mb-4">${t('reg.step1.hint', 'We use this to set up your login and contact you about your kitchen.')}</p>
      <div class="grid sm:grid-cols-2 gap-3 mb-3">
        <div><label class="label">${t('reg.firstName', 'First name')} *</label>
          <input id="regFirst" class="input" autocomplete="given-name" value="${esc(d.firstName)}"></div>
        <div><label class="label">${t('reg.lastName', 'Last name')} *</label>
          <input id="regLast" class="input" autocomplete="family-name" value="${esc(d.lastName)}"></div>
      </div>
      <label class="label">${t('reg.email', 'Work email')} *</label>
      <input id="regEmail" class="input mb-3" type="email" autocomplete="username" placeholder="you@restaurant.com" value="${esc(d.email)}">
      <label class="label">${t('reg.phone', 'Mobile number')}</label>
      <input id="regPhone" class="input mb-3" type="tel" autocomplete="tel" placeholder="+44 7700 900123" value="${esc(d.phone)}">
      <p class="text-xs text-ink-400 mb-2">${t('reg.phoneHint', 'For SMS alerts and support — recommended')}</p>
      <label class="label">${t('reg.jobRole', 'Your role')}</label>
      <select id="regRole" class="select mb-3">${optList(JOB_ROLES, 'jobRole', d.jobRole || 'Owner / Director')}</select>`;
  }

  function step2Html(d) {
    return `
      <h3 class="font-bold text-lg mb-1">${t('reg.step2.title', 'Business information')}</h3>
      <p class="text-sm text-ink-500 mb-4">${t('reg.step2.hint', 'Tell us about your organisation — like other food-safety platforms, this helps us configure your workspace.')}</p>
      <label class="label">${t('reg.businessName', 'Business / kitchen name')} *</label>
      <input id="regBiz" class="input mb-3" value="${esc(d.businessName)}" placeholder="e.g. Riverside Kitchen">
      <label class="label">${t('reg.legalName', 'Legal company name')}</label>
      <input id="regLegal" class="input mb-3" value="${esc(d.legalName)}" placeholder="e.g. Your Company Ltd">
      <label class="label">${t('reg.businessType', 'Business type')} *</label>
      <select id="regBizType" class="select mb-3">${optList(BUSINESS_TYPES, 'businessType', d.businessType || 'Restaurant')}</select>
      <label class="label">${t('reg.country', 'Country')} *</label>
      <select id="regCountry" class="select mb-3">${optList(COUNTRIES, 'country', d.country || 'United Kingdom')}</select>
      <div class="grid sm:grid-cols-2 gap-3 mb-3">
        <div><label class="label">${t('reg.city', 'City / town')} *</label>
          <input id="regCity" class="input" value="${esc(d.city)}"></div>
        <div><label class="label">${t('reg.postcode', 'Postcode')} *</label>
          <input id="regPostcode" class="input" value="${esc(d.postcode)}"></div>
      </div>
      <label class="label">${t('reg.address', 'Street address')}</label>
      <input id="regAddress" class="input mb-3" value="${esc(d.address)}">`;
  }

  function step3Html(d) {
    const mods = d.modules || ['fss', 'allerq', 'labels'];
    return `
      <h3 class="font-bold text-lg mb-1">${t('reg.step3.title', 'Your kitchen needs')}</h3>
      <p class="text-sm text-ink-500 mb-4">${t('reg.step3.hint', 'Help us tailor Kiteline — similar to demo requests on Operandio and CompliChef.')}</p>
      <div class="grid sm:grid-cols-2 gap-3 mb-3">
        <div><label class="label">${t('reg.siteCount', 'Number of sites')}</label>
          <select id="regSites" class="select">${optList(SITE_COUNTS, 'siteCount', d.siteCount || '1')}</select></div>
        <div><label class="label">${t('reg.teamSize', 'Team size (staff)')}</label>
          <select id="regTeamSize" class="select">${optList(TEAM_SIZES, 'teamSize', d.teamSize || '1-5')}</select></div>
      </div>
      <label class="label">${t('reg.modules', 'What do you need?')}</label>
      <div class="space-y-2 mb-4 rounded-xl border border-ink-100 p-3 bg-ink-50">
        ${MODULES.map(m => `<label class="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" class="w-4 h-4 accent-brand-600" data-reg-mod="${m.id}" ${mods.includes(m.id) ? 'checked' : ''}>
          <span>${t(m.labelKey, m.id)}</span></label>`).join('')}
      </div>
      <label class="label">${t('reg.haccpMethod', 'How do you manage HACCP today?')}</label>
      <select id="regHaccp" class="select mb-3">${optList(HACCP_METHODS, 'haccpMethod', d.haccpMethod || 'Paper checklists')}</select>
      <label class="label">${t('reg.sensors', 'Interested in temperature sensors?')}</label>
      <select id="regSensors" class="select mb-3">
        <option value="yes" ${d.sensorsInterest === 'yes' ? 'selected' : ''}>${t('reg.sensorsYes', 'Yes — tell me more')}</option>
        <option value="later" ${d.sensorsInterest === 'later' ? 'selected' : ''}>${t('reg.sensorsLater', 'Maybe later')}</option>
        <option value="no" ${d.sensorsInterest === 'no' ? 'selected' : ''}>${t('reg.sensorsNo', 'No — manual logs only')}</option>
      </select>
      <label class="label">${t('reg.notes', 'Anything else? (optional)')}</label>
      <textarea id="regNotes" class="input min-h-[72px]" rows="2" placeholder="${esc(t('reg.notesPh', 'EHO visit soon, multi-site rollout…'))}">${esc(d.notes)}</textarea>`;
  }

  function step4Html(d, trialDays, trialUsers) {
    return `
      <h3 class="font-bold text-lg mb-1">${t('reg.step4.title', 'Create your login')}</h3>
      <p class="text-sm text-ink-500 mb-4">${t('reg.step4.hint', 'Choose a secure password. We will email a verification link before first sign-in.')}</p>
      <div class="rounded-xl bg-brand-50 border border-brand-100 p-3 mb-4 text-sm text-brand-900">
        <b>${trialDays} ${t('reg.trialDays', 'days free')}</b> — ${t('reg.trialHint', 'Full access for up to')} <b>${trialUsers}</b> ${t('reg.trialUsers', 'users')}. ${t('reg.trialNoCard', 'No card required.')}
      </div>
      <div class="rounded-xl border border-ink-100 p-3 mb-4 text-xs text-ink-600 space-y-1 bg-ink-50">
        <div><b>${esc(d.businessName || '—')}</b> · ${esc(d.businessType || '')}</div>
        <div>${esc(d.city || '')} ${esc(d.postcode || '')} · ${esc(d.country || '')}</div>
        <div>${esc(d.firstName || '')} ${esc(d.lastName || '')} · ${esc(d.email || '')}</div>
      </div>
      <label class="label">${t('reg.password', 'Password')} *</label>
      <div class="pw-field relative mb-2">
        <input id="regPw" type="password" class="input pr-16" autocomplete="new-password" placeholder="••••••••">
        <button type="button" class="pw-toggle absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-brand-600" data-pw="regPw">${t('reg.show', 'Show')}</button>
      </div>
      <p class="text-xs text-ink-400 mb-3">${t('reg.passwordHint', 'At least 10 characters, with letters and numbers')}</p>
      <label class="label">${t('reg.passwordConfirm', 'Confirm password')} *</label>
      <div class="pw-field relative mb-4">
        <input id="regPw2" type="password" class="input pr-16" autocomplete="new-password">
        <button type="button" class="pw-toggle absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-brand-600" data-pw="regPw2">${t('reg.show', 'Show')}</button>
      </div>
      <label class="flex items-start gap-2 text-sm cursor-pointer mb-4">
        <input type="checkbox" id="regTerms" class="w-4 h-4 mt-0.5 accent-brand-600" ${d.termsAccepted ? 'checked' : ''}>
        <span>I agree to the <a href="/terms.html" target="_blank" rel="noopener" class="text-brand-600 font-semibold">Terms &amp; Conditions</a> and <a href="/privacy.html" target="_blank" rel="noopener" class="text-brand-600 font-semibold">Privacy Policy</a>. I understand food-safety data is stored securely for my organisation.</span>
      </label>`;
  }

  function collectStep(step) {
    const d = loadDraft();
    if (document.getElementById('regFirst')) {
      d.firstName = document.getElementById('regFirst').value.trim() || d.firstName;
      d.lastName = document.getElementById('regLast').value.trim() || d.lastName;
      d.email = document.getElementById('regEmail').value.trim() || d.email;
      d.phone = document.getElementById('regPhone').value.trim() || d.phone;
      d.jobRole = document.getElementById('regRole').value || d.jobRole;
    }
    if (document.getElementById('regBiz')) {
      d.businessName = document.getElementById('regBiz').value.trim() || d.businessName;
      d.legalName = document.getElementById('regLegal').value.trim() || d.legalName;
      d.businessType = document.getElementById('regBizType').value || d.businessType;
      d.country = document.getElementById('regCountry').value || d.country;
      d.city = document.getElementById('regCity').value.trim() || d.city;
      d.postcode = document.getElementById('regPostcode').value.trim() || d.postcode;
      d.address = document.getElementById('regAddress').value.trim() || d.address;
    }
    if (document.getElementById('regSites')) {
      d.siteCount = document.getElementById('regSites').value || d.siteCount;
      d.teamSize = document.getElementById('regTeamSize').value || d.teamSize;
      d.haccpMethod = document.getElementById('regHaccp').value || d.haccpMethod;
      d.sensorsInterest = document.getElementById('regSensors').value || d.sensorsInterest;
      d.notes = document.getElementById('regNotes').value.trim() || d.notes;
      d.modules = [];
      document.querySelectorAll('[data-reg-mod]').forEach(c => { if (c.checked) d.modules.push(c.dataset.regMod); });
    }
    if (document.getElementById('regTerms')) {
      d.termsAccepted = document.getElementById('regTerms').checked;
    }
    return d;
  }

  function validateStep(step, d) {
    const toast = window.UI && window.UI.toast;
    const warn = (m) => { if (toast) toast(m, 'warn'); };
    if (step === 1) {
      if (!d.firstName) { warn(t('reg.err.firstName', 'Enter your first name')); return false; }
      if (!d.lastName) { warn(t('reg.err.lastName', 'Enter your last name')); return false; }
      if (!d.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) { warn(t('reg.err.email', 'Enter a valid email')); return false; }
      return true;
    }
    if (step === 2) {
      if (!d.businessName) { warn(t('reg.err.business', 'Enter your business or kitchen name')); return false; }
      if (!d.city) { warn(t('reg.err.city', 'Enter city or town')); return false; }
      if (!d.postcode) { warn(t('reg.err.postcode', 'Enter postcode')); return false; }
      return true;
    }
    if (step === 3) return true;
    if (step === 4) {
      const pw = document.getElementById('regPw') && document.getElementById('regPw').value;
      const pw2 = document.getElementById('regPw2') && document.getElementById('regPw2').value;
      const em = d.email || '';
      if (!pw || pw.length < 10) { warn(t('reg.err.password', 'Password must be at least 10 characters')); return false; }
      if (!/[a-zA-Z]/.test(pw) || !/[0-9]/.test(pw)) { warn(t('reg.err.password', 'Password must include letters and numbers')); return false; }
      if (pw !== pw2) { warn(t('reg.err.passwordMatch', 'Passwords do not match')); return false; }
      if (!d.termsAccepted) { warn(t('reg.err.terms', 'Please accept the terms to continue')); return false; }
      return true;
    }
    return true;
  }

  function buildHtml(step, trialDays, trialUsers) {
    const d = loadDraft();
    if (!d.step) d.step = step;
    let body = '';
    if (step === 1) body = step1Html(d);
    else if (step === 2) body = step2Html(d);
    else if (step === 3) body = step3Html(d);
    else body = step4Html(d, trialDays, trialUsers);

    const back = step > 1 ? `<button type="button" class="btn btn-ghost btn-sm" id="regBack">${t('reg.back', 'Back')}</button>` : '';
    const nextLabel = step < 4 ? t('reg.next', 'Continue') : t('reg.submit', 'Create account & start trial');
    const next = `<button type="button" class="btn btn-primary btn-sm flex-1" id="regNext">${nextLabel}</button>`;

    return `
      <div class="w-full max-w-lg">
        ${langPicker()}
        <h2 class="text-2xl font-extrabold">${t('reg.title', 'Create your Kiteline account')}</h2>
        <p class="text-ink-500 text-sm mb-4">${t('reg.subtitle', 'Full registration — set up your kitchen workspace in a few steps.')}</p>
        ${progressBar(step)}
        <div class="reg-step-body">${body}</div>
        <div class="flex gap-2 mt-6">${back}${next}</div>
        <p class="text-sm text-center mt-4"><a href="#" class="text-brand-600 font-semibold" id="regToLogin">${t('reg.haveAccount', 'Already have an account? Sign in')}</a></p>
        ${regLegalFooter()}
      </div>`;
  }

  window.RegisterForm = {
    clearDraft,
    buildHtml,
    collectStep,
    validateStep,
    saveDraft,
    loadDraft,
    getPassword() {
      const el = document.getElementById('regPw');
      return el ? el.value : '';
    },
    profilePayload(d) {
      return {
        firstName: d.firstName,
        lastName: d.lastName,
        phone: d.phone,
        jobRole: d.jobRole,
        businessName: d.businessName,
        legalName: d.legalName,
        businessType: d.businessType,
        country: d.country,
        city: d.city,
        postcode: d.postcode,
        address: d.address,
        siteCount: d.siteCount,
        teamSize: d.teamSize,
        modules: d.modules || [],
        haccpMethod: d.haccpMethod,
        sensorsInterest: d.sensorsInterest,
        notes: d.notes,
        lang: (window.I18n && window.I18n.lang) || 'en',
        termsAccepted: d.termsAccepted,
      };
    },
    mount(app, trialDays, trialUsers) {
      const step = Math.min(4, Math.max(1, loadDraft().step || 1));

      const langSel = document.getElementById('regLang');
      if (langSel) langSel.onchange = (e) => {
        collectStep(step);
        saveDraft(collectStep(step), step);
        if (window.I18n) window.I18n.setLang(e.target.value);
        app.renderRegister();
      };

      document.querySelectorAll('.pw-toggle').forEach(btn => {
        btn.onclick = () => {
          const inp = document.getElementById(btn.dataset.pw);
          if (!inp) return;
          const show = inp.type === 'password';
          inp.type = show ? 'text' : 'password';
          btn.textContent = show ? t('reg.hide', 'Hide') : t('reg.show', 'Show');
        };
      });

      const toLogin = document.getElementById('regToLogin');
      if (toLogin) toLogin.onclick = (e) => { e.preventDefault(); clearDraft(); location.hash = ''; app.renderLogin(); };

      const back = document.getElementById('regBack');
      if (back) back.onclick = () => {
        const d = collectStep(step);
        saveDraft(d, step - 1);
        app.renderRegister();
      };

      const next = document.getElementById('regNext');
      if (next) next.onclick = async () => {
        const d = collectStep(step);
        if (!validateStep(step, d)) return;
        saveDraft(d, step);
        if (step < 4) {
          saveDraft(d, step + 1);
          app.renderRegister();
          return;
        }
        next.disabled = true;
        next.textContent = t('reg.creating', 'Creating…');
        const pw = RegisterForm.getPassword();
        const profile = RegisterForm.profilePayload(d);
        try {
          const r = await window.Api.register(d.email, pw, `${d.firstName} ${d.lastName}`.trim(), profile);
          clearDraft();
          if (r.needsVerification) {
            sessionStorage.setItem('kiteline.pendingEmail', d.email);
            if (r.message) sessionStorage.setItem('kiteline.pendingVerifyMsg', r.message);
            if (r.verifyUrl) {
              sessionStorage.setItem('kiteline.pendingVerifyUrl', app.normalizeVerifyUrl ? app.normalizeVerifyUrl(r.verifyUrl) : r.verifyUrl);
            } else {
              sessionStorage.removeItem('kiteline.pendingVerifyUrl');
            }
            location.hash = 'verify-pending';
            if (app.renderVerifyPending) app.renderVerifyPending();
            return;
          }
          await window.Store.hydrateFromServer();
          app.applyInviteSite();
          location.hash = 'home';
          if (window.UI) window.UI.toast(t('reg.welcome', 'Welcome to Kiteline!'));
          app.render();
        } catch (e) {
          if (window.UI) window.UI.toast(e.message || t('reg.failed', 'Registration failed'), 'error');
          next.disabled = false;
          next.textContent = t('reg.submit', 'Create account & start trial');
        }
      };
    },
  };
})();
