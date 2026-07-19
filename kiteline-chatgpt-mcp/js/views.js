/* ============================================================
   Kitchen OS ? Views (one render fn per route)
   Each view returns { title, html, mount? }
   ============================================================ */
(function () {
  const S = window.Store;
  const { icon, toast, modal, recipePreviewModal, closeModal, fmt, escapeHtml, downloadCsv, printWithBodyClass, openPrintDocument } = window.UI;

  const sensorStatus = (s) => (s.temp < s.min || s.temp > s.max) ? 'breach' : (s.temp > s.max - 0.5 || s.temp < s.min + 0.5) ? 'warn' : 'ok';
  const statusBadge = (st) => st==='breach' ? '<span class="badge badge-red">Breach</span>'
    : st==='warn' ? '<span class="badge badge-amber">Near limit</span>'
    : '<span class="badge badge-green">In range</span>';

  function employeeAppUrl(siteId, mode = 'register') {
    const q = siteId ? '?site=' + encodeURIComponent(siteId) : '';
    const hash = mode === 'login' ? '' : '#register';
    return S.siteUrl('/app' + q + hash);
  }

  function mountQrIn(el, url, size = 200) {
    if (!el || typeof QRCode === 'undefined') return;
    el.innerHTML = '';
    new QRCode(el, { text: url, width: size, height: size, colorDark: '#0f766e', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.M });
  }

  function showEmployeeQrModal(siteId, siteName) {
    const url = employeeAppUrl(siteId, 'register');
    const name = siteName || S.site(siteId || S.db.currentSite).name;
    modal('Staff QR ? add Kiteline to phone', `
      <div class="text-center space-y-4">
        <p class="text-sm text-ink-500">Scan with a phone camera. Staff can create an account or sign in, then add Kiteline to their home screen.</p>
        <div class="inline-block p-4 bg-white rounded-2xl border border-ink-200 shadow-sm" id="staffQrBox"></div>
        <div class="text-sm font-semibold">${escapeHtml(name)}</div>
        <div class="rounded-xl bg-ink-50 p-3 text-xs text-ink-600 text-left space-y-2">
          <p><b>iPhone:</b> open link ? Share ? <b>Add to Home Screen</b></p>
          <p><b>Android:</b> open link ? menu ? <b>Install app</b> or <b>Add to Home screen</b></p>
        </div>
        <div class="flex flex-wrap gap-2 justify-center">
          <button class="btn btn-ghost btn-sm" id="staffQrCopy">Copy invite link</button>
          <button class="btn btn-ghost btn-sm" id="staffQrPrint">${icon('print','ico')} Print poster</button>
        </div>
        <p class="text-xs text-ink-400 break-all">${escapeHtml(url)}</p>
      </div>`, { wide: true });
    mountQrIn(document.getElementById('staffQrBox'), url, 220);
    document.getElementById('staffQrCopy').onclick = () => { navigator.clipboard.writeText(url); toast('Invite link copied'); };
    document.getElementById('staffQrPrint').onclick = () => printStaffQrPoster(name, url);
  }

  function printStaffQrPoster(siteName, url) {
    const w = window.open('', '_blank', 'width=520,height=720');
    if (!w) return toast('Allow pop-ups to print', 'warn');
    const safeUrl = url.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    w.document.write(`<!DOCTYPE html><html><head><title>Kiteline staff QR</title>
      <style>body{font-family:system-ui;text-align:center;padding:24px}h1{font-size:22px;margin:0}.sub{color:#666;margin:8px 0 20px}
      .box{display:inline-block;padding:16px;border:2px solid #0f766e;border-radius:16px}
      ol{text-align:left;font-size:13px;color:#444;line-height:1.6;max-width:280px;margin:16px auto}</style></head><body>
      <h1>Kiteline ? staff app</h1>
      <p class="sub">${escapeHtml(siteName)}</p>
      <div class="box" id="q"></div>
      <ol><li>Scan QR with your phone</li><li>Create account or sign in</li><li>Add Kiteline to your home screen</li></ol>
      <p style="font-size:11px;color:#999">${escapeHtml(url)}</p>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"><\/script>
      <script>new QRCode(document.getElementById('q'),{text:'${safeUrl}',width:200,height:200,colorDark:'#0f766e'});setTimeout(function(){print();},500);<\/script>
      </body></html>`);
    w.document.close();
  }

  const SENSOR_TYPES = [
    { v: 'fridge', label: 'Fridge / chilled', target: 4, min: 1, max: 5, standard: '0?5?C chilled (EC 852/2004)' },
    { v: 'freezer', label: 'Freezer', target: -18, min: -22, max: -16, standard: '?-18?C frozen storage' },
    { v: 'hot', label: 'Hot hold', target: 70, min: 63, max: 90, standard: '?63?C hot hold (UK)' },
  ];
  function sensorTypeDefaults(type) { return SENSOR_TYPES.find(t => t.v === type) || SENSOR_TYPES[0]; }

  function openSensorForm(existing, onSaved) {
    const s = existing || {};
    const isEdit = !!existing;
    const id = s.id || S.uid('s');
    modal(isEdit ? 'Edit sensor' : 'Add temperature sensor', `
      <div class="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
        ${isEdit ? `<div class="rounded-lg bg-brand-50 border border-brand-100 px-3 py-2 text-sm"><span class="text-ink-500">Device ID (for hardware):</span> <code class="font-bold text-brand-800" id="sensorDeviceId">${escapeHtml(id)}</code>
          <button type="button" class="btn btn-ghost btn-sm ml-1" id="cpSensorId">Copy</button>
          <p class="text-xs text-ink-500 mt-1">Use this as <code>sensorId</code> in your ESP32 sketch or LoRaWAN webhook.</p></div>` : ''}
        <div><label class="label">Equipment name *</label><input id="sn" class="input" placeholder="e.g. Walk-in Fridge 2" value="${escapeHtml(s.name || '')}"></div>
        <div class="grid grid-cols-2 gap-3">
          <div><label class="label">Type</label><select id="st" class="select">${SENSOR_TYPES.map(t => `<option value="${t.v}" ${s.type === t.v ? 'selected' : ''}>${t.label}</option>`).join('')}</select></div>
          <div><label class="label">Location</label><input id="sloc" class="input" placeholder="e.g. Basement cold store" value="${escapeHtml(s.location || 'Main kitchen')}"></div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div><label class="label">Zone / area</label><input id="szone" class="input" placeholder="e.g. Protein store" value="${escapeHtml(s.zone || 'Cold store')}"></div>
          <div><label class="label">Probe serial / label</label><input id="sserial" class="input" placeholder="e.g. KL-SN011-2025" value="${escapeHtml(s.serial || '')}"></div>
        </div>
        <div class="grid grid-cols-3 gap-3">
          <div><label class="label">Target ?C</label><input id="sg" type="number" step="0.1" class="input" value="${s.target != null ? s.target : 4}"></div>
          <div><label class="label">Min ?C</label><input id="smin" type="number" step="0.1" class="input" value="${s.min != null ? s.min : 1}"></div>
          <div><label class="label">Max ?C</label><input id="smax" type="number" step="0.1" class="input" value="${s.max != null ? s.max : 5}"></div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div><label class="label">Gateway ID</label><input id="sgw" class="input" placeholder="e.g. GW-GROVE" value="${escapeHtml(s.gateway || '')}"></div>
          <div><label class="label">Probe type</label><input id="sprobe" class="input" placeholder="e.g. DS18B20 waterproof" value="${escapeHtml(s.probe || 'LoRaWAN PT100 probe')}"></div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div><label class="label">Reading interval</label><select id="sint" class="select">
            ${['1 min', '5 min', '10 min', '15 min'].map(x => `<option ${(s.interval || '5 min') === x ? 'selected' : ''}>${x}</option>`).join('')}
          </select></div>
          <div><label class="label">Last calibrated</label><input id="scal" type="date" class="input" value="${escapeHtml(s.calibrated || new Date().toISOString().slice(0, 10))}"></div>
        </div>
        <div><label class="label">Compliance note</label><input id="sstd" class="input" value="${escapeHtml(s.standard || sensorTypeDefaults(s.type || 'fridge').standard)}"></div>
        <div><label class="label">Notes</label><textarea id="snotes" class="input" rows="2" placeholder="Optional ? door seal checks, linked equipment?">${escapeHtml(s.notes || '')}</textarea></div>
        <div class="flex gap-2 pt-1">
          ${isEdit ? `<button type="button" class="btn btn-danger btn-sm" id="sdel">Remove</button>` : ''}
          <button type="button" class="btn btn-primary flex-1" id="ssave">${isEdit ? 'Save changes' : 'Add sensor'}</button>
        </div>
      </div>`);
    const applyTypeDefaults = () => {
      const d = sensorTypeDefaults(document.getElementById('st').value);
      if (!isEdit || !existing.type) {
        document.getElementById('sg').value = d.target;
        document.getElementById('smin').value = d.min;
        document.getElementById('smax').value = d.max;
        document.getElementById('sstd').value = d.standard;
      }
    };
    document.getElementById('st').onchange = applyTypeDefaults;
    const cpBtn = document.getElementById('cpSensorId');
    if (cpBtn) cpBtn.onclick = () => { navigator.clipboard.writeText(id); toast('Device ID copied'); };
    const delBtn = document.getElementById('sdel');
    if (delBtn) delBtn.onclick = () => {
      window.Security.confirmDangerous('Remove sensor?', 'Enter your PIN or use biometrics to delete this sensor.', () => {
        S.db.sensors = S.db.sensors.filter(x => x.id !== id);
        S.persist(); closeModal(); toast('Sensor removed'); if (onSaved) onSaved();
      });
    };
    document.getElementById('ssave').onclick = () => {
      const name = document.getElementById('sn').value.trim();
      if (!name) return toast('Enter an equipment name', 'warn');
      const type = document.getElementById('st').value;
      const target = +document.getElementById('sg').value;
      const min = +document.getElementById('smin').value;
      const max = +document.getElementById('smax').value;
      if (min >= max) return toast('Min must be below max', 'warn');
      const payload = {
        id, name, type, target, min, max,
        siteId: s.siteId || S.db.currentSite,
        location: document.getElementById('sloc').value.trim() || 'Main kitchen',
        zone: document.getElementById('szone').value.trim() || 'Cold store',
        serial: document.getElementById('sserial').value.trim() || ('KL-' + id.replace('s', 'SN') + '-' + new Date().getFullYear()),
        gateway: document.getElementById('sgw').value.trim() || ('GW-' + (S.db.currentSite || 'site').replace('site_', '').toUpperCase()),
        probe: document.getElementById('sprobe').value.trim() || 'LoRaWAN PT100 probe',
        interval: document.getElementById('sint').value,
        calibrated: document.getElementById('scal').value,
        standard: document.getElementById('sstd').value.trim(),
        notes: document.getElementById('snotes').value.trim(),
        temp: isEdit ? s.temp : target,
        battery: isEdit ? s.battery : 100,
        signal: isEdit ? s.signal : 95,
        updated: isEdit ? s.updated : S.now(),
        history: isEdit ? (s.history || []) : Array.from({ length: 24 }, () => +(target + (Math.random() * 1 - 0.5)).toFixed(1)),
      };
      if (isEdit) {
        const i = S.db.sensors.findIndex(x => x.id === id);
        if (i >= 0) S.db.sensors[i] = payload;
      } else {
        S.db.sensors.push(payload);
      }
      S.persist(); closeModal();
      toast(isEdit ? 'Sensor updated' : ('Sensor added ? device ID: ' + id));
      if (onSaved) onSaved();
    };
  }

  function spark(history) {
    const max = Math.max(...history.map(Math.abs), 1);
    return `<div class="spark">${history.slice(-14).map(v=>{
      const h = Math.max(4, Math.round(Math.abs(v)/max*34));
      return `<span style="height:${h}px"></span>`;
    }).join('')}</div>`;
  }

  function sectionHeader(title, subtitle, actions) {
    return `<div class="flex flex-wrap items-end justify-between gap-3 mb-5">
      <div><h1 class="text-2xl font-extrabold tracking-tight">${title}</h1>
      ${subtitle?`<p class="text-ink-500 text-sm mt-1">${subtitle}</p>`:''}</div>
      <div class="flex gap-2">${actions||''}</div></div>`;
  }

  /* ---------------- DASHBOARD ---------------- */
  function dashboard() {
    const site = S.db.currentSite;
    const sensors = S.sensorsForSite(site);
    const breaches = sensors.filter(s => sensorStatus(s)==='breach').length;
    const openAlerts = S.db.alerts.filter(a => a.status==='open' && a.site===site).length;
    const checklists = S.db.checklists.filter(c => c.site===site);
    const totalItems = checklists.reduce((n,c)=>n+c.items.length,0) || 1;
    const doneItems = checklists.reduce((n,c)=>n+c.items.filter(i=>i.done).length,0);
    const compliance = Math.round((sensors.length - breaches)/(sensors.length||1)*100);
    const wasteKg = S.db.waste.filter(w=>w.site===site).reduce((n,w)=>n+w.kg,0);

    // --- AI Insights (rule-based predictive engine over live data) ---
    const insights = (function () {
      const out = [];
      sensors.forEach(s => {
        const st = sensorStatus(s);
        if (st === 'breach') out.push({ icon:'alert', tone:'red', text:`<b>${escapeHtml(s.name)}</b> is out of safe range at ${s.temp.toFixed(1)}?C ? act now to prevent stock loss.` });
        else if (st === 'warn') out.push({ icon:'temp', tone:'amber', text:`<b>${escapeHtml(s.name)}</b> is drifting toward its limit. Check the door seal and load.` });
        const trend = s.history.slice(-6);
        if (trend.length >= 6 && trend[5] - trend[0] > 1.2 && st !== 'breach') out.push({ icon:'temp', tone:'amber', text:`Predicted risk: <b>${escapeHtml(s.name)}</b> is warming ${(trend[5]-trend[0]).toFixed(1)}?C/30min ? likely to breach within the hour.` });
        if (s.battery < 25) out.push({ icon:'battery', tone:'amber', text:`<b>${escapeHtml(s.name)}</b> sensor battery low (${s.battery}%) ? schedule a replacement.` });
      });
      const wk = S.db.waste.filter(w=>w.site===site);
      if (wk.length) {
        const byReason = {}; wk.forEach(w=>byReason[w.reason]=(byReason[w.reason]||0)+w.kg);
        const top = Object.entries(byReason).sort((a,b)=>b[1]-a[1])[0];
        if (top) out.push({ icon:'waste', tone:'blue', text:`Biggest waste driver is <b>${escapeHtml(top[0])}</b> (${top[1].toFixed(1)}kg). Reducing it 50% could save ~${fmt.money(top[1]*1.5,S.db.org.currency)}/wk.` });
      }
      const overdue = checklists.filter(c=>c.items.some(i=>!i.done));
      if (overdue.length) out.push({ icon:'check', tone:'amber', text:`${overdue.length} checklist(s) still open today ? assign now to stay audit-ready.` });
      const exp = S.db.labels.filter(l=>l.site===site).filter(l=>{ const e=new Date(new Date(l.prepped).getTime()+l.shelfDays*864e5); return e - Date.now() < 864e5; });
      if (exp.length) out.push({ icon:'labels', tone:'amber', text:`${exp.length} labelled item(s) expire within 24h ? use or rotate first (FIFO).` });
      const trExp = (S.db.training||[]).filter(tt=>(new Date(tt.expires)-Date.now())/864e5 < 0);
      if (trExp.length) out.push({ icon:'cap', tone:'red', text:`${trExp.length} staff training certificate(s) have <b>expired</b> ? book refresher courses to stay compliant.` });
      const supExp = (S.db.suppliers||[]).filter(s=>(new Date(s.certExpiry)-Date.now())/864e5 < 30);
      if (supExp.length) out.push({ icon:'truck', tone:'amber', text:`${supExp.length} supplier certificate(s) due to expire ? request renewals from your approved suppliers.` });
      const openInc = (S.db.incidents||[]).filter(i=>i.status!=='Closed');
      if (openInc.length) out.push({ icon:'shield', tone:'amber', text:`${openInc.length} open incident(s) need a corrective action recorded and closed off.` });
      const coolFail = (S.db.cooling||[]).filter(c=>c.site===site && c.result==='Fail');
      if (coolFail.length) out.push({ icon:'snow', tone:'red', text:`${coolFail.length} cooling check(s) <b>failed</b> the 2h/4h rule ? review the cooling process.` });
      const holdFail = (S.db.holding||[]).filter(h=>h.site===site && h.result==='Fail');
      if (holdFail.length) out.push({ icon:'temp', tone:'amber', text:`${holdFail.length} hot/cold holding check(s) were out of range at service.` });
      const delRej = (S.db.deliveries||[]).filter(d=>d.site===site && !d.accepted);
      if (delRej.length) out.push({ icon:'truck', tone:'amber', text:`${delRej.length} delivery(ies) were <b>rejected</b> on goods-in ? follow up with the supplier.` });
      const phFail = (S.db.phlogs||[]).filter(p=>p.site===site && p.result==='Fail');
      if (phFail.length) out.push({ icon:'droplet', tone:'amber', text:`${phFail.length} pH reading(s) out of spec ? recheck acidified products.` });
      const svcDue = (S.db.assets||[]).filter(a=>a.site===site && (new Date(a.nextService)-Date.now())/864e5 < 0);
      if (svcDue.length) out.push({ icon:'box', tone:'amber', text:`${svcDue.length} asset(s) overdue a service ? book maintenance.` });
      const mtOpen = (S.db.maintenance||[]).filter(t=>t.status!=='Resolved');
      if (mtOpen.length) out.push({ icon:'wrench', tone:'amber', text:`${mtOpen.length} maintenance ticket(s) still awaiting repair.` });
      if (!out.length) out.push({ icon:'check', tone:'green', text:`All systems healthy. No risks detected ? you're inspection-ready.` });
      return out.slice(0, 6);
    })();
    const toneCol = { red:'#dc2626', amber:'#d97706', blue:'#2563eb', green:'#10b981' };

    const kpi = (label, val, sub, color) => `
      <div class="kpi fade-in">
        <div class="text-ink-500 text-xs font-semibold uppercase tracking-wide">${label}</div>
        <div class="v ${color||''}">${val}</div>
        <div class="text-ink-400 text-xs mt-1">${sub}</div>
      </div>`;

    const html = `
      ${sectionHeader('Dashboard', 'Live overview of '+S.site(site).name, `
        <button class="btn btn-ghost btn-sm" data-act="export-dash">${icon('download','ico')} Export</button>`)}
      <div class="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        ${kpi('Compliance', compliance+'%', breaches?breaches+' breach(es) now':'All systems healthy', breaches?'text-red-600':'text-brand-600')}
        ${kpi('Active Sensors', sensors.length, 'LoRaWAN, live')}
        ${kpi('Open Alerts', openAlerts, openAlerts?'Needs attention':'No open alerts', openAlerts?'text-amber-600':'')}
        ${kpi('Tasks Today', doneItems+'/'+totalItems, Math.round(doneItems/totalItems*100)+'% complete')}
        ${kpi('Waste (7d)', wasteKg.toFixed(1)+'kg', 'Tracked across stages')}
      </div>

      <div class="card card-pad mb-5 fade-in" style="background:linear-gradient(135deg,#ecfdf5,#fff)">
        <div class="flex items-center gap-2 mb-3">
          <span class="w-7 h-7 rounded-lg bg-brand-600 text-white flex items-center justify-center">${icon('leaf','w-4 h-4')}</span>
          <h3 class="font-bold">AI Insights</h3>
          <span class="badge badge-green">live</span>
          <span class="text-xs text-ink-400 ml-auto">Predictive analysis of your kitchen data</span>
        </div>
        <div class="grid md:grid-cols-2 gap-2">
          ${insights.map(i=>`<div class="flex gap-2.5 items-start p-2.5 rounded-xl bg-white border border-ink-100">
            <span class="w-7 h-7 rounded-lg flex items-center justify-center flex-none" style="background:${toneCol[i.tone]}1a;color:${toneCol[i.tone]}">${icon(i.icon,'w-4 h-4')}</span>
            <p class="text-sm text-ink-700">${i.text}</p>
          </div>`).join('')}
        </div>
      </div>

      <div class="grid lg:grid-cols-3 gap-5">
        <div class="card card-pad lg:col-span-2 fade-in">
          <div class="flex items-center justify-between mb-3">
            <h3 class="font-bold">Live Temperatures <span class="pulse-dot pulse-live ml-1"></span></h3>
            <a class="text-brand-600 text-sm font-semibold cursor-pointer" data-nav="temps">View all</a>
          </div>
          <div class="space-y-2">
            ${sensors.map(s=>{
              const st=sensorStatus(s);
              return `<div class="flex items-center justify-between p-2.5 rounded-xl border border-ink-100">
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 rounded-lg bg-ink-100 flex items-center justify-center text-ink-500">${icon('temp','w-4 h-4')}</div>
                  <div><div class="font-semibold text-sm">${s.name}</div>
                  <div class="text-xs text-ink-400 capitalize">${s.type} ? target ${s.target}?C</div></div>
                </div>
                <div class="flex items-center gap-4">
                  ${spark(s.history)}
                  <div class="text-right w-16"><div class="font-bold ${st==='breach'?'text-red-600':st==='warn'?'text-amber-600':''}">${fmt.temp(s.temp)}</div></div>
                  ${statusBadge(st)}
                </div></div>`;
            }).join('')}
          </div>
        </div>

        <div class="space-y-5">
          <div class="card card-pad fade-in">
            <h3 class="font-bold mb-3">Recent Alerts</h3>
            <div class="space-y-2">
              ${S.db.alerts.filter(a=>a.site===site).slice(0,4).map(a=>`
                <div class="flex gap-2.5 items-start">
                  <span class="pulse-dot mt-1.5" style="background:${a.severity==='critical'?'#dc2626':a.severity==='warning'?'#d97706':'#3b82f6'}"></span>
                  <div><div class="text-sm font-semibold">${a.title}</div>
                  <div class="text-xs text-ink-400">${fmt.ago(a.at)} ? ${a.status}</div></div>
                </div>`).join('') || '<p class="text-sm text-ink-400">No alerts.</p>'}
            </div>
          </div>
          <div class="card card-pad fade-in">
            <h3 class="font-bold mb-3">Today's Checklists</h3>
            ${checklists.map(c=>{
              const done=c.items.filter(i=>i.done).length, pct=Math.round(done/c.items.length*100);
              return `<div class="mb-3">
                <div class="flex justify-between text-sm mb-1"><span class="font-semibold">${c.title}</span><span class="text-ink-400">${done}/${c.items.length}</span></div>
                <div class="h-2 rounded-full bg-ink-100 overflow-hidden"><div class="h-full bg-brand-500" style="width:${pct}%"></div></div>
              </div>`;
            }).join('') || '<p class="text-sm text-ink-400">No checklists.</p>'}
          </div>
        </div>
      </div>`;

    return { title:'Dashboard', html, mount() {
      document.querySelector('[data-act="export-dash"]').onclick = () => {
        downloadCsv('dashboard_summary.csv', [['Metric','Value'],['Compliance',compliance+'%'],['Sensors',sensors.length],['Open Alerts',openAlerts],['Tasks',doneItems+'/'+totalItems],['Waste 7d kg',wasteKg.toFixed(1)]]);
        toast('Dashboard exported');
      };
    }};
  }

  /* ---------------- TEMPERATURE MONITORING ---------------- */
  function temps() {
    const sensors = S.sensorsForSite();
    const counts = { ok:0, warn:0, breach:0 };
    sensors.forEach(s => { counts[sensorStatus(s)]++; });
    const types = [...new Set(sensors.map(s => s.type))];
    const card = (s) => {
      const st = sensorStatus(s);
      const meta = [
        s.location && `<span>${icon('sites','w-3.5 h-3.5')} ${escapeHtml(s.location)}</span>`,
        s.zone && `<span class="badge badge-gray">${escapeHtml(s.zone)}</span>`,
        s.doorOpen ? '<span class="badge badge-red">Door open</span>' : '',
        s.humidity != null ? `<span>${s.humidity}% RH</span>` : '',
      ].filter(Boolean).join('');
      return `<div class="card card-pad fade-in" data-sensor="${s.id}" data-type="${s.type}">
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0">
            <div class="font-bold truncate">${escapeHtml(s.name)}</div>
            <div class="text-xs text-ink-400 capitalize">${s.type} ? target ${s.target}?C (${s.min}?${s.max})</div>
            ${meta ? `<div class="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-ink-500">${meta}</div>` : ''}
          </div>
          ${statusBadge(st)}
        </div>
        <div class="flex items-end gap-3 my-3">
          <div class="text-4xl font-extrabold ${st==='breach'?'text-red-600':st==='warn'?'text-amber-600':'text-ink-900'}">${fmt.temp(s.temp)}</div>
          <div class="mb-1 flex-1">${spark(s.history)}</div>
        </div>
        <div class="text-xs text-ink-500 bg-ink-50 rounded-lg px-3 py-2 mb-3">${escapeHtml(s.standard || '')}${s.notes ? ` ? <span class="text-ink-400">${escapeHtml(s.notes)}</span>` : ''}</div>
        <div class="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-ink-500 mb-3">
          <span>Device ID: <b class="text-ink-700 font-mono">${escapeHtml(s.id)}</b></span>
          <span>Serial: <b class="text-ink-700">${escapeHtml(s.serial || '?')}</b></span>
          <span>Gateway: <b class="text-ink-700">${escapeHtml(s.gateway || '?')}</b></span>
          <span>Probe: ${escapeHtml(s.probe || '?')}</span>
          <span>Interval: ${escapeHtml(s.interval || '5 min')}</span>
          <span>Calibrated: ${s.calibrated || '?'}</span>
          <span class="col-span-2 flex items-center gap-2">${icon('battery','w-3.5 h-3.5')} ${s.battery}% ? ${icon('signal','w-3.5 h-3.5')} ${s.signal}% ? ${fmt.ago(s.updated)}</span>
        </div>
        <div class="flex gap-2 mb-2"><button type="button" class="btn btn-ghost btn-sm" data-edit-sensor="${s.id}">${icon('settings','ico')} Edit / device ID</button></div>
        <div><canvas id="chart_${s.id}" height="90"></canvas></div>
      </div>`;
    };
    const tableRows = sensors.map(s => {
      const st = sensorStatus(s);
      return `<tr data-type="${s.type}">
        <td><div class="font-semibold">${escapeHtml(s.name)}</div><div class="text-xs text-ink-400">${escapeHtml(s.location || '')}</div></td>
        <td class="capitalize text-ink-500">${s.type}</td>
        <td class="font-bold ${st==='breach'?'text-red-600':st==='warn'?'text-amber-600':''}">${fmt.temp(s.temp)}</td>
        <td class="text-xs text-ink-400">${s.min}?${s.max}?C</td>
        <td>${statusBadge(st)}</td>
        <td class="text-xs text-ink-400">${escapeHtml(s.serial || '?')}</td>
        <td class="text-xs text-ink-400">${fmt.ago(s.updated)}</td>
      </tr>`;
    }).join('');
    const html = `
      ${sectionHeader('Temperature Monitoring','10 live LoRaWAN probes per site ? 24/7 auto-logging ? EC 852/2004 compliant audit trail', `
        <button class="btn btn-ghost btn-sm" data-act="manual">${icon('plus','ico')} Manual reading</button>
        <button class="btn btn-primary btn-sm" data-act="add">${icon('plus','ico')} Add sensor</button>`)}
      <div class="grid sm:grid-cols-4 gap-4 mb-5">
        <div class="kpi"><div class="text-xs text-ink-500">Sensors (this site)</div><div class="v">${sensors.length}</div></div>
        <div class="kpi"><div class="text-xs text-ink-500">In range</div><div class="v text-brand-600">${counts.ok}</div></div>
        <div class="kpi"><div class="text-xs text-ink-500">Near limit</div><div class="v text-amber-600">${counts.warn}</div></div>
        <div class="kpi"><div class="text-xs text-ink-500">Breaches</div><div class="v ${counts.breach?'text-red-600':''}">${counts.breach}</div></div>
      </div>
      <div class="flex flex-wrap gap-2 mb-4">
        <button class="btn btn-ghost btn-sm ring-2 ring-brand-500" data-filter="all">All (${sensors.length})</button>
        ${types.map(t=>`<button class="btn btn-ghost btn-sm" data-filter="${t}">${t} (${sensors.filter(s=>s.type===t).length})</button>`).join('')}
      </div>
      <div class="flex gap-2 mb-4">
        <button class="btn btn-ghost btn-sm ring-2 ring-brand-500" data-view="cards">${icon('grid','ico')} Cards</button>
        <button class="btn btn-ghost btn-sm" data-view="table">${icon('records','ico')} Table</button>
      </div>
      <div id="temp-cards" class="grid md:grid-cols-2 xl:grid-cols-3 gap-5">${sensors.map(card).join('')}</div>
      <div id="temp-table" class="card overflow-hidden hidden">
        <table class="table"><thead><tr><th>Equipment</th><th>Type</th><th>Reading</th><th>Range</th><th>Status</th><th>Serial</th><th>Updated</th></tr></thead>
        <tbody>${tableRows}</tbody></table>
      </div>`;

    return { title:'Temperatures', html, mount() {
      let filter = 'all';
      const applyFilter = () => {
        document.querySelectorAll('[data-sensor]').forEach(el => {
          el.classList.toggle('hidden', filter !== 'all' && el.dataset.type !== filter);
        });
        document.querySelectorAll('#temp-table tbody tr').forEach(tr => {
          tr.classList.toggle('hidden', filter !== 'all' && tr.dataset.type !== filter);
        });
      };
      document.querySelectorAll('[data-filter]').forEach(b => b.onclick = () => {
        filter = b.dataset.filter;
        document.querySelectorAll('[data-filter]').forEach(x => {
          x.classList.toggle('ring-2', x.dataset.filter === filter);
          x.classList.toggle('ring-brand-500', x.dataset.filter === filter);
        });
        applyFilter();
      });
      document.querySelectorAll('[data-view]').forEach(b => b.onclick = () => {
        const cards = b.dataset.view === 'cards';
        document.getElementById('temp-cards').classList.toggle('hidden', !cards);
        document.getElementById('temp-table').classList.toggle('hidden', cards);
        document.querySelectorAll('[data-view]').forEach(x => x.classList.toggle('ring-2', x.dataset.view === b.dataset.view));
        document.querySelectorAll('[data-view]').forEach(x => x.classList.toggle('ring-brand-500', x.dataset.view === b.dataset.view));
      });
      sensors.forEach(s=>{
        const ctx = document.getElementById('chart_'+s.id);
        if (!ctx) return;
        const col = sensorStatus(s)==='breach'?'#dc2626':sensorStatus(s)==='warn'?'#d97706':'#14b8a6';
        new Chart(ctx, { type:'line',
          data:{ labels:s.history.map((_,i)=>i), datasets:[
            { data:s.history, borderColor:col, backgroundColor:col+'1f', fill:true, tension:.4, pointRadius:0, borderWidth:2 },
            { data:s.history.map(()=>s.max), borderColor:'rgba(220,38,38,.4)', borderDash:[4,4], pointRadius:0, borderWidth:1 },
            { data:s.history.map(()=>s.min), borderColor:'rgba(59,130,246,.4)', borderDash:[4,4], pointRadius:0, borderWidth:1 },
          ]},
          options:{ plugins:{legend:{display:false}}, scales:{x:{display:false}, y:{ticks:{font:{size:9}}}}, maintainAspectRatio:false, animation:false }});
      });
      document.querySelector('[data-act="add"]').onclick = () => openSensorForm(null, () => window.App.render());
      document.querySelectorAll('[data-edit-sensor]').forEach(btn => {
        btn.onclick = () => {
          const sensor = S.db.sensors.find(x => x.id === btn.dataset.editSensor);
          if (sensor) openSensorForm(sensor, () => window.App.render());
        };
      });
      document.querySelector('[data-act="manual"]').onclick = () => {
        const opts = sensors.map(s=>`<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('');
        modal('Manual Temperature Reading', `
          <div class="space-y-3">
            <div><label class="label">Sensor / equipment</label><select id="ms" class="select">${opts}</select></div>
            <div><label class="label">Temperature ?C</label><input id="mt" type="number" step="0.1" class="input" placeholder="4.0"></div>
            <button class="btn btn-primary w-full" id="msave">Log reading</button>
          </div>`);
        document.getElementById('msave').onclick = () => {
          const s = S.db.sensors.find(x=>x.id===document.getElementById('ms').value);
          const t = parseFloat(document.getElementById('mt').value);
          if (isNaN(t)) return toast('Enter a temperature','warn');
          s.temp=t; s.updated=S.now(); s.history.push(t); s.history=s.history.slice(-24);
          S.persist(); closeModal(); toast('Reading logged'); window.App.render();
        };
      };
    }};
  }

  /* ---------------- ALERTS ---------------- */
  function alerts() {
    const list = S.db.alerts.filter(a=>a.site===S.db.currentSite);
    const sev = (s)=> s==='critical'?'badge-red':s==='warning'?'badge-amber':'badge-blue';
    const rows = list.map(a=>`
      <tr>
        <td><span class="badge ${sev(a.severity)}">${a.severity}</span></td>
        <td><div class="font-semibold">${escapeHtml(a.title)}</div><div class="text-xs text-ink-400">${escapeHtml(a.detail)}</div></td>
        <td class="text-ink-500">${fmt.ago(a.at)}</td>
        <td><span class="badge ${a.status==='open'?'badge-red':a.status==='acknowledged'?'badge-amber':'badge-green'}">${a.status}</span></td>
        <td class="text-right">
          ${a.status!=='resolved'?`<button class="btn btn-ghost btn-sm" data-ack="${a.id}">Acknowledge</button>
          <button class="btn btn-primary btn-sm" data-res="${a.id}">Resolve</button>`:'<span class="text-ink-300 text-xs">?</span>'}
        </td>
      </tr>`).join('');
    const ch = S.db.org.channels;
    const html = `
      ${sectionHeader('Alerts & Notifications','Real-time SMS, email & push alerts for breaches and overdue tasks')}
      <div class="grid lg:grid-cols-4 gap-5">
        <div class="card lg:col-span-3 overflow-hidden">
          <table class="table"><thead><tr><th>Severity</th><th>Alert</th><th>When</th><th>Status</th><th></th></tr></thead>
          <tbody>${rows || '<tr><td colspan="5" class="text-center text-ink-400 py-6">No alerts for this site.</td></tr>'}</tbody></table>
        </div>
        <div class="card card-pad h-max">
          <h3 class="font-bold mb-3">Notification Channels</h3>
          ${[['sms','SMS'],['email','Email'],['push','Push']].map(([k,l])=>`
            <label class="flex items-center justify-between py-2 cursor-pointer">
              <span class="text-sm font-medium">${l}</span>
              <input type="checkbox" data-ch="${k}" ${ch[k]?'checked':''} class="w-5 h-5 accent-brand-600">
            </label>`).join('')}
          <p class="text-xs text-ink-400 mt-2">Channels apply to all sites in your organisation.</p>
        </div>
      </div>`;
    return { title:'Alerts', html, mount() {
      document.querySelectorAll('[data-ack]').forEach(b=>b.onclick=()=>{ const a=S.db.alerts.find(x=>x.id===b.dataset.ack); a.status='acknowledged'; S.persist(); toast('Alert acknowledged'); window.App.render(); });
      document.querySelectorAll('[data-res]').forEach(b=>b.onclick=()=>{ const a=S.db.alerts.find(x=>x.id===b.dataset.res); a.status='resolved'; S.persist(); toast('Alert resolved'); window.App.render(); });
      document.querySelectorAll('[data-ch]').forEach(c=>c.onchange=()=>{ S.db.org.channels[c.dataset.ch]=c.checked; S.persist(); toast('Channel '+(c.checked?'enabled':'disabled')); });
    }};
  }

  /* ---------------- HACCP CHECKLISTS ---------------- */
  function haccp() {
    const lists = S.db.checklists.filter(c=>c.site===S.db.currentSite);
    const totalTasks = lists.reduce((n,c)=>n+c.items.length,0);
    const doneTasks = lists.reduce((n,c)=>n+c.items.filter(i=>i.done).length,0);
    const ccpLists = lists.filter(c=>c.ccp);
    const catBadge = (c) => {
      const col = c==='CCP'?'badge-red':c==='Opening'?'badge-blue':c==='Closing'?'badge-amber':'badge-gray';
      return `<span class="badge ${col}">${escapeHtml(c)}</span>`;
    };
    const card = (c)=>{
      const done=c.items.filter(i=>i.done).length, pct=Math.round(done/c.items.length*100);
      const ccpN = c.items.filter(i=>i.ccp).length;
      return `<div class="card card-pad fade-in" data-hcat="${c.category||'Other'}">
        <div class="flex items-start justify-between mb-1 gap-2">
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2 mb-1">
              ${c.category?catBadge(c.category):''}
              ${c.ccp?'<span class="badge badge-red">CCP</span>':''}
              ${c.priority==='High'?'<span class="badge badge-amber">High priority</span>':''}
            </div>
            <div class="font-bold">${escapeHtml(c.title)}</div>
            <div class="text-xs text-ink-400">${c.recurrence} ? due <b>${escapeHtml(c.due)}</b> ? ${escapeHtml(S.member(c.assignee).name)}</div>
            ${c.lastCompleted?`<div class="text-xs text-ink-400 mt-0.5">Last completed ${fmt.ago(c.lastCompleted)}</div>`:''}
            ${c.ccpRef?`<div class="text-xs text-ink-500 mt-1">Ref: <b>${escapeHtml(c.ccpRef)}</b>${ccpN?` ? ${ccpN} CCP task(s)`:''}</div>`:''}
          </div>
          <span class="badge ${pct===100?'badge-green':'badge-amber'} flex-none">${pct}%</span>
        </div>
        <div class="h-1.5 rounded-full bg-ink-100 overflow-hidden mb-3"><div class="h-full bg-brand-500" style="width:${pct}%"></div></div>
        <div class="space-y-1.5">
          ${c.items.map(i=>`<label class="flex items-start gap-2.5 text-sm cursor-pointer py-0.5">
            <input type="checkbox" data-item="${c.id}:${i.id}" ${i.done?'checked':''} class="w-4 h-4 accent-brand-600 mt-0.5 flex-none">
            <span class="${i.done?'line-through text-ink-400':''}">${i.ccp?'<span class="text-red-600 font-semibold text-xs mr-1">CCP</span>':''}${escapeHtml(i.text)}</span></label>`).join('')}
        </div>
        ${c.signOffRequired?`<div class="text-xs text-ink-400 mt-2 flex items-center gap-1">${icon('shield','w-3.5 h-3.5')} Manager sign-off required on completion</div>`:''}
        <button class="btn btn-ghost btn-sm w-full mt-3" data-additem="${c.id}">${icon('plus','ico')} Add task</button>
      </div>`;
    };
    const cats = [...new Set(lists.map(c=>c.category||'Other'))];
    const html = `
      ${sectionHeader('SafeServe ? HACCP & Checklists','Digital HACCP plans ? CCP monitoring ? opening/closing checks ? full EHO audit trail', `
        <button class="btn btn-primary btn-sm" data-act="newlist">${icon('plus','ico')} New checklist</button>`)}
      <div class="card card-pad mb-5 bg-gradient-to-r from-brand-50 to-white border-brand-100">
        <div class="flex flex-wrap items-start gap-6">
          <div class="flex-1 min-w-[200px]">
            <div class="font-bold text-brand-800 mb-1">What SafeServe covers</div>
            <p class="text-sm text-ink-600">Automated temperature logs, Critical Control Point (CCP) checklists, corrective actions, and timestamped sign-offs ? replacing paper diaries and spreadsheet trackers. Every tick is audit-ready for your Environmental Health Officer.</p>
          </div>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center flex-none">
            <div class="bg-white rounded-xl px-4 py-3 border border-ink-100"><div class="text-xl font-extrabold">${lists.length}</div><div class="text-xs text-ink-400">Checklists</div></div>
            <div class="bg-white rounded-xl px-4 py-3 border border-ink-100"><div class="text-xl font-extrabold text-brand-600">${totalTasks?Math.round(doneTasks/totalTasks*100):0}%</div><div class="text-xs text-ink-400">Tasks done</div></div>
            <div class="bg-white rounded-xl px-4 py-3 border border-ink-100"><div class="text-xl font-extrabold text-red-600">${ccpLists.length}</div><div class="text-xs text-ink-400">CCP plans</div></div>
            <div class="bg-white rounded-xl px-4 py-3 border border-ink-100"><div class="text-xl font-extrabold">${ccpLists.reduce((n,c)=>n+c.items.filter(i=>i.ccp&&!i.done).length,0)}</div><div class="text-xs text-ink-400">Open CCP tasks</div></div>
          </div>
        </div>
      </div>
      <div class="flex flex-wrap gap-2 mb-4">
        <button class="btn btn-ghost btn-sm ring-2 ring-brand-500" data-hfilter="all">All (${lists.length})</button>
        ${cats.map(cat=>`<button class="btn btn-ghost btn-sm" data-hfilter="${cat}">${cat} (${lists.filter(c=>(c.category||'Other')===cat).length})</button>`).join('')}
      </div>
      <div id="haccp-grid" class="grid md:grid-cols-2 xl:grid-cols-3 gap-5">${lists.map(card).join('') || '<p class="text-ink-400">No checklists yet.</p>'}</div>`;
    return { title:'HACCP', html, mount() {
      let hfilter = 'all';
      document.querySelectorAll('[data-hfilter]').forEach(b => b.onclick = () => {
        hfilter = b.dataset.hfilter;
        document.querySelectorAll('[data-hfilter]').forEach(x => {
          x.classList.toggle('ring-2', x.dataset.hfilter === hfilter);
          x.classList.toggle('ring-brand-500', x.dataset.hfilter === hfilter);
        });
        document.querySelectorAll('[data-hcat]').forEach(card => {
          card.classList.toggle('hidden', hfilter !== 'all' && card.dataset.hcat !== hfilter);
        });
      });
      document.querySelectorAll('[data-item]').forEach(cb=>cb.onchange=()=>{
        const [cid,iid]=cb.dataset.item.split(':');
        const c=S.db.checklists.find(x=>x.id===cid); const it=c.items.find(x=>x.id===iid);
        it.done=cb.checked; S.persist(); S.logActivity('u_sarah',(cb.checked?'Completed':'Reopened')+' task: '+it.text);
        window.App.render();
      });
      document.querySelectorAll('[data-additem]').forEach(b=>b.onclick=()=>{
        modal('Add Task',`<div class="space-y-3"><input id="t" class="input" placeholder="Task description"><button class="btn btn-primary w-full" id="s">Add</button></div>`);
        document.getElementById('s').onclick=()=>{ const t=document.getElementById('t').value.trim(); if(!t)return; const c=S.db.checklists.find(x=>x.id===b.dataset.additem); c.items.push({id:S.uid(),text:t,done:false}); S.persist(); closeModal(); window.App.render(); toast('Task added'); };
      });
      const nl=document.querySelector('[data-act="newlist"]'); if(nl) nl.onclick=()=>{
        const opts=S.db.team.map(m=>`<option value="${m.id}">${escapeHtml(m.name)}</option>`).join('');
        modal('New Checklist',`<div class="space-y-3">
          <div><label class="label">Title</label><input id="ct" class="input" placeholder="e.g. Opening Checks"></div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="label">Recurrence</label><select id="cr" class="select"><option>Daily</option><option>Weekly</option><option>Monthly</option></select></div>
            <div><label class="label">Due</label><input id="cd" class="input" value="08:00"></div>
          </div>
          <div><label class="label">Assignee</label><select id="ca" class="select">${opts}</select></div>
          <button class="btn btn-primary w-full" id="cs">Create</button></div>`);
        document.getElementById('cs').onclick=()=>{ const t=document.getElementById('ct').value.trim(); if(!t)return toast('Enter a title','warn');
          S.db.checklists.push({id:S.uid('cl'),title:t,site:S.db.currentSite,recurrence:document.getElementById('cr').value,due:document.getElementById('cd').value,assignee:document.getElementById('ca').value,items:[{id:S.uid(),text:'New task',done:false}]});
          S.persist(); closeModal(); window.App.render(); toast('Checklist created'); };
      };
    }};
  }

  /* ---------------- DIGITAL RECORDS ---------------- */
  function records() {
    const list = S.db.records.filter(r=>r.site===S.db.currentSite).sort((a,b)=>new Date(b.at)-new Date(a.at));
    const detailStr = (r)=> Object.entries(r.detail).map(([k,v])=>`${k}: <b>${escapeHtml(v)}</b>`).join(' ? ');
    const types = ['Delivery','Cooking','Cooling','Reheating','Sanitization'];
    const rows = list.map(r=>`<tr>
      <td><span class="badge badge-blue">${r.type}</span></td>
      <td class="text-sm">${detailStr(r)}</td>
      <td>${S.member(r.by).name}</td>
      <td class="text-ink-500">${fmt.datetime(r.at)}</td></tr>`).join('');
    const html = `
      ${sectionHeader('Digital Records','Auto-logged: delivery, cooking, cooling, reheating & sanitization', `
        <button class="btn btn-ghost btn-sm" data-act="csv">${icon('download','ico')} Export CSV</button>
        <button class="btn btn-primary btn-sm" data-act="new">${icon('plus','ico')} New record</button>`)}
      <div class="flex gap-2 mb-4 flex-wrap">${types.map(t=>`<button class="btn btn-ghost btn-sm" data-quick="${t}">+ ${t}</button>`).join('')}</div>
      <div class="card overflow-hidden">
        <table class="table"><thead><tr><th>Type</th><th>Details</th><th>By</th><th>When</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="4" class="text-center text-ink-400 py-6">No records yet.</td></tr>'}</tbody></table>
      </div>`;

    function form(type) {
      const fields = {
        Delivery:`<input id="f1" class="input" placeholder="Supplier"><input id="f2" class="input" placeholder="Item"><input id="f3" type="number" step="0.1" class="input" placeholder="Temp ?C">`,
        Cooking:`<input id="f1" class="input" placeholder="Item"><input id="f2" type="number" step="0.1" class="input" placeholder="Core temp ?C"><input id="f3" type="number" class="input" placeholder="Target ?C" value="75">`,
        Cooling:`<input id="f1" class="input" placeholder="Item"><input id="f2" type="number" step="0.1" class="input" placeholder="Start ?C"><input id="f3" type="number" step="0.1" class="input" placeholder="End ?C">`,
        Reheating:`<input id="f1" class="input" placeholder="Item"><input id="f2" type="number" step="0.1" class="input" placeholder="Core temp ?C"><input id="f3" type="number" class="input" placeholder="Target ?C" value="75">`,
        Sanitization:`<input id="f1" class="input" placeholder="Area"><input id="f2" class="input" placeholder="Chemical"><input id="f3" type="number" class="input" placeholder="Contact mins" value="5">`,
      }[type];
      modal('New '+type+' Record', `<div class="space-y-3">${fields}<button class="btn btn-primary w-full" id="rsave">Save record</button></div>`);
      document.getElementById('rsave').onclick=()=>{
        const v1=document.getElementById('f1').value, v2=document.getElementById('f2').value, v3=document.getElementById('f3').value;
        const map = {
          Delivery:{supplier:v1,item:v2,temp:+v2&&+v3,accepted:true,temp:+v3},
          Cooking:{item:v1,temp:+v2,target:+v3}, Cooling:{item:v1,start:+v2,end:+v3},
          Reheating:{item:v1,temp:+v2,target:+v3}, Sanitization:{area:v1,chemical:v2,contactMins:+v3},
        };
        S.db.records.unshift({ id:S.uid(), type, site:S.db.currentSite, by:'u_sarah', at:S.now(), detail:map[type] });
        S.persist(); S.logActivity('u_sarah','Logged '+type.toLowerCase()+' record');
        closeModal(); toast(type+' record saved'); window.App.render();
      };
    }

    return { title:'Records', html, mount() {
      document.querySelector('[data-act="new"]').onclick=()=>form('Delivery');
      document.querySelectorAll('[data-quick]').forEach(b=>b.onclick=()=>form(b.dataset.quick));
      document.querySelector('[data-act="csv"]').onclick=()=>{
        downloadCsv('records.csv', [['Type','Details','By','When'], ...list.map(r=>[r.type, JSON.stringify(r.detail), S.member(r.by).name, fmt.datetime(r.at)])]);
        toast('Records exported');
      };
    }};
  }

  /* ---------------- SITES ---------------- */
  function sites() {
    const allSites = S.db.sites;
    const orgSensors = S.db.sensors;
    const orgBreaches = orgSensors.filter(x=>sensorStatus(x)==='breach').length;
    const orgTeam = S.db.team.length;
    const typeIcon = (t) => ({ Hotel:'H', Restaurant:'R', Pub:'P', Cafe:'C', Kitchen:'K', 'Ghost Kitchen':'G', Education:'E', Seafood:'S', 'Food Court':'F', Steakhouse:'T' }[t] || 'S');
    const cards = allSites.map(s=>{
      const sens=S.db.sensors.filter(x=>x.siteId===s.id);
      const breaches=sens.filter(x=>sensorStatus(x)==='breach').length;
      const team=S.db.team.filter(m=>m.siteId===s.id).length;
      const cls=S.db.checklists.filter(c=>c.site===s.id).length;
      const stars = s.rating ? '?'.repeat(s.rating) + '?'.repeat(5-s.rating) : '';
      return `<div class="card card-pad fade-in ${s.id===S.db.currentSite?'ring-2 ring-brand-500':''}" data-stype="${s.type||'Other'}">
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <span class="text-xl">${typeIcon(s.type)}</span>
              <span class="badge badge-gray">${escapeHtml(s.type||'Kitchen')}</span>
              ${s.pilot?'<span class="badge badge-green">Pilot</span>':''}
              ${s.status==='Seasonal'?'<span class="badge badge-amber">Seasonal</span>':''}
            </div>
            <div class="font-bold text-lg">${escapeHtml(s.name)}</div>
            ${s.legalName ? `<div class="text-xs text-brand-600 font-semibold">${escapeHtml(s.legalName)}</div>` : ''}
            <div class="text-sm text-ink-400">${escapeHtml(s.address||'')}, ${escapeHtml(s.city)} ${escapeHtml(s.postcode||'')}</div>
            ${stars?`<div class="text-amber-500 text-sm mt-1">${stars} <span class="text-ink-400 text-xs">FHRS</span></div>`:''}
          </div>
          ${s.id===S.db.currentSite?'<span class="badge badge-green flex-none">Active</span>':''}
        </div>
        <div class="grid grid-cols-4 gap-2 my-4 text-center text-xs">
          <div class="bg-ink-50 rounded-lg py-2"><div class="text-lg font-extrabold">${sens.length}</div><div class="text-ink-400">Sensors</div></div>
          <div class="bg-ink-50 rounded-lg py-2"><div class="text-lg font-extrabold ${breaches?'text-red-600':''}">${breaches}</div><div class="text-ink-400">Breaches</div></div>
          <div class="bg-ink-50 rounded-lg py-2"><div class="text-lg font-extrabold">${team}</div><div class="text-ink-400">Team</div></div>
          <div class="bg-ink-50 rounded-lg py-2"><div class="text-lg font-extrabold">${cls}</div><div class="text-ink-400">Checklists</div></div>
        </div>
        <div class="text-xs text-ink-500 space-y-1 mb-4">
          <div><b>Manager:</b> ${escapeHtml(s.manager||'?')} ? ${escapeHtml(s.phone||'')}</div>
          <div><b>Covers:</b> ${s.covers||'?'} ? <b>Opened:</b> ${s.opened||'?'} ? <b>Last EHO visit:</b> ${s.lastInspection||'?'}</div>
          <div><b>Email:</b> ${escapeHtml(s.email||'?')}</div>
        </div>
        <button class="btn btn-ghost w-full btn-sm mb-2" data-staffqr="${s.id}">${icon('qr','ico')} Staff QR (scan to install)</button>
        <button class="btn ${s.id===S.db.currentSite?'btn-ghost':'btn-primary'} w-full btn-sm" data-switch="${s.id}">${s.id===S.db.currentSite?'Currently viewing':'Switch to site'}</button>
      </div>`;
    }).join('');
    const tableRows = allSites.map(s => {
      const sens = S.db.sensors.filter(x=>x.siteId===s.id).length;
      const breaches = S.db.sensors.filter(x=>x.siteId===s.id && sensorStatus(x)==='breach').length;
      return `<tr data-stype="${s.type||'Other'}">
        <td><div class="font-semibold">${escapeHtml(s.name)}</div><div class="text-xs text-ink-400">${escapeHtml(s.city)}</div></td>
        <td><span class="badge badge-gray">${escapeHtml(s.type||'?')}</span></td>
        <td>${s.covers||'?'}</td>
        <td>${s.rating?('?'.repeat(s.rating)): '?'}</td>
        <td>${sens}</td>
        <td class="${breaches?'text-red-600 font-bold':''}">${breaches}</td>
        <td>${escapeHtml(s.manager||'?')}</td>
        <td class="text-xs text-ink-400">${s.lastInspection||'?'}</td>
        <td>${s.id===S.db.currentSite?'<span class="badge badge-green">Active</span>':`<button class="btn btn-ghost btn-sm" data-switch="${s.id}">Switch</button>`}</td>
      </tr>`;
    }).join('');
    const types = [...new Set(allSites.map(s=>s.type||'Other'))];
    const html = `
      ${sectionHeader('Multi-Site Management','All kitchens ? one command centre ? switch site from the top bar or here', `
        <button class="btn btn-primary btn-sm" data-act="addsite">${icon('plus','ico')} Add site</button>`)}
      <div class="grid sm:grid-cols-4 gap-4 mb-5">
        <div class="kpi"><div class="text-xs text-ink-500">Total sites</div><div class="v">${allSites.length}</div></div>
        <div class="kpi"><div class="text-xs text-ink-500">Live sensors</div><div class="v">${orgSensors.length}</div></div>
        <div class="kpi"><div class="text-xs text-ink-500">Org breaches</div><div class="v ${orgBreaches?'text-red-600':''}">${orgBreaches}</div></div>
        <div class="kpi"><div class="text-xs text-ink-500">Team members</div><div class="v">${orgTeam}</div></div>
      </div>
      <div class="flex flex-wrap gap-2 mb-4">
        <button class="btn btn-ghost btn-sm ring-2 ring-brand-500" data-sfilter="all">All (${allSites.length})</button>
        ${types.map(t=>`<button class="btn btn-ghost btn-sm" data-sfilter="${t}">${t} (${allSites.filter(s=>(s.type||'Other')===t).length})</button>`).join('')}
        <button class="btn btn-ghost btn-sm ml-auto" data-sview="cards">${icon('grid','ico')} Cards</button>
        <button class="btn btn-ghost btn-sm" data-sview="table">${icon('records','ico')} Table</button>
      </div>
      <div id="site-cards" class="grid md:grid-cols-2 xl:grid-cols-3 gap-5">${cards}</div>
      <div id="site-table" class="card overflow-hidden hidden">
        <table class="table"><thead><tr><th>Site</th><th>Type</th><th>Covers</th><th>FHRS</th><th>Sensors</th><th>Breaches</th><th>Manager</th><th>Last EHO</th><th></th></tr></thead>
        <tbody>${tableRows}</tbody></table>
      </div>`;
    return { title:'Sites', html, mount() {
      let sfilter = 'all';
      document.querySelectorAll('[data-sfilter]').forEach(b => b.onclick = () => {
        sfilter = b.dataset.sfilter;
        document.querySelectorAll('[data-sfilter]').forEach(x => {
          x.classList.toggle('ring-2', x.dataset.sfilter === sfilter);
          x.classList.toggle('ring-brand-500', x.dataset.sfilter === sfilter);
        });
        document.querySelectorAll('[data-stype]').forEach(el => {
          el.classList.toggle('hidden', sfilter !== 'all' && el.dataset.stype !== sfilter);
        });
      });
      document.querySelectorAll('[data-sview]').forEach(b => b.onclick = () => {
        const cards = b.dataset.sview === 'cards';
        document.getElementById('site-cards').classList.toggle('hidden', !cards);
        document.getElementById('site-table').classList.toggle('hidden', cards);
        document.querySelectorAll('[data-sview]').forEach(x => {
          x.classList.toggle('ring-2', x.dataset.sview === b.dataset.sview);
          x.classList.toggle('ring-brand-500', x.dataset.sview === b.dataset.sview);
        });
      });
      document.querySelectorAll('[data-switch]').forEach(b=>b.onclick=()=>{ S.setSite(b.dataset.switch); toast('Switched site'); window.App.render(); });
      document.querySelectorAll('[data-staffqr]').forEach(b => b.onclick = () => showEmployeeQrModal(b.dataset.staffqr, S.site(b.dataset.staffqr).name));
      document.querySelector('[data-act="addsite"]').onclick=()=>{
        modal('Add Site',`<div class="space-y-3"><input id="n" class="input" placeholder="Site name"><input id="c" class="input" placeholder="City"><button class="btn btn-primary w-full" id="s">Add site</button></div>`);
        document.getElementById('s').onclick=()=>{ const n=document.getElementById('n').value.trim(); if(!n)return toast('Enter a name','warn');
          S.db.sites.push({id:S.uid('site'),name:n,city:document.getElementById('c').value||'?',timezone:'Europe/London'}); S.persist(); closeModal(); window.App.render(); toast('Site added'); };
      };
    }};
  }

  /* ---------------- REPORTS ---------------- */
  function reports() {
    const site=S.db.currentSite, sName=S.site(site).name;
    const sens=S.sensorsForSite(site);
    const recs=S.db.records.filter(r=>r.site===site);
    const als=S.db.alerts.filter(a=>a.site===site);
    const compliance = Math.round((sens.length - sens.filter(s=>sensorStatus(s)==='breach').length)/(sens.length||1)*100);
    const html = `
      ${sectionHeader('Audit-Ready Reports','Generate compliance reports instantly for EHO inspections', `
        <button class="btn btn-ghost btn-sm" data-act="print">${icon('print','ico')} Print</button>
        <button class="btn btn-primary btn-sm" data-act="csv">${icon('download','ico')} Export</button>`)}
      <div class="card card-pad fade-in" id="report">
        <div class="flex items-center justify-between border-b border-ink-100 pb-4 mb-4">
          <div><div class="font-extrabold text-xl">Food Safety Compliance Report</div>
          <div class="text-sm text-ink-400">${sName} ? Generated ${fmt.date(S.now())}</div></div>
          <span class="badge ${compliance===100?'badge-green':'badge-amber'} text-sm">${compliance}% compliant</span>
        </div>
        <div class="grid sm:grid-cols-4 gap-4 mb-5">
          <div class="kpi"><div class="text-xs text-ink-500">Sensors monitored</div><div class="v">${sens.length}</div></div>
          <div class="kpi"><div class="text-xs text-ink-500">Records logged</div><div class="v">${recs.length}</div></div>
          <div class="kpi"><div class="text-xs text-ink-500">Alerts (period)</div><div class="v">${als.length}</div></div>
          <div class="kpi"><div class="text-xs text-ink-500">Resolved</div><div class="v">${als.filter(a=>a.status==='resolved').length}</div></div>
        </div>
        <h4 class="font-bold mb-2">Critical Control Points</h4>
        <table class="table mb-5"><thead><tr><th>Equipment</th><th>Target</th><th>Current</th><th>Status</th></tr></thead><tbody>
          ${sens.map(s=>`<tr><td>${escapeHtml(s.name)}</td><td>${s.target}?C</td><td>${fmt.temp(s.temp)}</td><td>${statusBadge(sensorStatus(s))}</td></tr>`).join('')}
        </tbody></table>
        <h4 class="font-bold mb-2">Record Summary</h4>
        <table class="table"><thead><tr><th>Type</th><th>Count</th></tr></thead><tbody>
          ${['Delivery','Cooking','Cooling','Reheating','Sanitization'].map(t=>`<tr><td>${t}</td><td>${recs.filter(r=>r.type===t).length}</td></tr>`).join('')}
        </tbody></table>
        <p class="text-xs text-ink-400 mt-5">This report is automatically generated by Kiteline and reflects live data. Twice-weekly hygiene & compliance summaries are emailed to managers.</p>
      </div>`;
    return { title:'Reports', html, mount() {
      document.querySelector('[data-act="print"]').onclick=()=>window.print();
      document.querySelector('[data-act="csv"]').onclick=()=>{
        downloadCsv('compliance_report.csv', [['Equipment','Target','Current','Status'], ...sens.map(s=>[s.name,s.target,s.temp,sensorStatus(s)])]);
        toast('Report exported');
      };
    }};
  }

  /* ---------------- TEAM ---------------- */
  function team() {
    const members = S.db.team;
    const accessOf = (m)=>{ if(m.access) return m.access; const t=(m.role||'').toLowerCase(); if(/head chef|owner|director|admin|gm|general manager/.test(t)) return 'Admin'; if(/manager|compliance|supervisor|lead|head/.test(t)) return 'Manager'; return 'Staff'; };
    const accBadge = (a)=>`<span class="badge ${a==='Admin'?'badge-green':a==='Manager'?'badge-blue':'badge-gray'}">${a}</span>`;
    const rows = members.map(m=>`<tr>
      <td><div class="flex items-center gap-3"><div class="w-9 h-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-sm">${m.initials}</div>
      <div><div class="font-semibold">${escapeHtml(m.name)}</div><div class="text-xs text-ink-400">${escapeHtml(m.email)}</div></div></div></td>
      <td>${escapeHtml(m.role)}</td>
      <td><select class="select !w-auto !py-1 text-xs" data-acc="${m.id}">${['Admin','Manager','Staff'].map(a=>`<option ${accessOf(m)===a?'selected':''}>${a}</option>`).join('')}</select></td>
      <td class="text-xs text-ink-500">${escapeHtml(m.phone || '?')}</td>
      <td><input class="input !w-20 !py-1 text-xs font-mono text-center" data-clockpin="${m.id}" maxlength="4" inputmode="numeric" placeholder="????" value="${m.clockPin || m.pin || ''}" title="4-digit kitchen clock PIN"></td>
      <td>${escapeHtml(S.site(m.siteId).name)}</td></tr>`).join('');
    const curSite = S.site(S.db.currentSite);
    const staffUrl = employeeAppUrl(S.db.currentSite, 'register');
    const maxUsers = S.db.org.maxUsers;
    const teamCount = S.db.team.length;
    const limitNote = maxUsers
      ? `<span class="badge ${teamCount >= maxUsers ? 'badge-amber' : 'badge-gray'}">${teamCount}/${maxUsers} users on plan</span>`
      : '';
    const html = `
      ${sectionHeader('Team & Accountability','Track who did what and when ? full audit trail', `
        ${limitNote}
        <button class="btn btn-ghost btn-sm" data-act="staffqr">${icon('qr','ico')} Staff QR</button>
        <button class="btn btn-primary btn-sm" data-act="add">${icon('plus','ico')} Add member</button>
        <a href="#clock" class="btn btn-ghost btn-sm">${icon('clock','ico')} Clock</a>
        <a href="#rota" class="btn btn-ghost btn-sm">${icon('team','ico')} Rota</a>`)}
      <div class="card card-pad mb-5 fade-in">
        <div class="flex flex-wrap items-center gap-5">
          <div id="teamQrInline" class="p-2 bg-white rounded-xl border border-ink-100 flex-none"></div>
          <div class="flex-1 min-w-[200px]">
            <h3 class="font-bold mb-1">Add Kiteline on staff phones</h3>
            <p class="text-sm text-ink-500 mb-2">Staff scan this QR to open Kiteline, create an account, and add the app to their device. Post it in the kitchen or share at handover.</p>
            <p class="text-xs text-ink-400 mb-3"><b>${escapeHtml(curSite.name)}</b> ? <span class="break-all">${escapeHtml(staffUrl)}</span></p>
            <div class="flex flex-wrap gap-2">
              <button class="btn btn-primary btn-sm" data-act="staffqr">${icon('qr','ico')} Full screen / print</button>
              <button class="btn btn-ghost btn-sm" data-act="copystaffurl">Copy link</button>
            </div>
          </div>
        </div>
      </div>
      <div class="grid lg:grid-cols-3 gap-5">
        <div class="card overflow-hidden lg:col-span-2">
          <table class="table"><thead><tr><th>Member</th><th>Job title</th><th>Access</th><th>Mobile (SMS)</th><th>Clock PIN</th><th>Site</th></tr></thead><tbody>${rows}</tbody></table>
        </div>
        <div class="card card-pad">
          <h3 class="font-bold mb-3">Activity Log</h3>
          <div class="space-y-3">
            ${S.db.activity.slice(0,12).map(a=>`<div class="flex gap-2.5">
              <div class="w-7 h-7 rounded-full bg-ink-100 text-ink-500 flex items-center justify-center text-xs font-bold flex-none">${S.member(a.user).initials}</div>
              <div><div class="text-sm">${escapeHtml(a.action)}</div><div class="text-xs text-ink-400">${S.member(a.user).name} ? ${fmt.ago(a.at)}</div></div>
            </div>`).join('')}
          </div>
        </div>
      </div>`;
    return { title:'Team', html, mount() {
      mountQrIn(document.getElementById('teamQrInline'), staffUrl, 120);
      document.querySelectorAll('[data-act="staffqr"]').forEach(b => b.onclick = () => showEmployeeQrModal(S.db.currentSite, curSite.name));
      const copyBtn = document.querySelector('[data-act="copystaffurl"]');
      if (copyBtn) copyBtn.onclick = () => { navigator.clipboard.writeText(staffUrl); toast('Invite link copied'); };
      document.querySelectorAll('[data-acc]').forEach(sel=>sel.onchange=()=>{
        const m=S.db.team.find(x=>x.id===sel.dataset.acc); if(!m)return;
        m.access=sel.value; S.persist(); toast(m.name+' is now '+sel.value); window.App.render();
      });
      document.querySelectorAll('[data-clockpin]').forEach(inp => {
        inp.onchange = () => {
          const m = S.db.team.find(x => x.id === inp.dataset.clockpin);
          if (!m) return;
          const v = inp.value.trim();
          if (v && !/^\d{4}$/.test(v)) return toast('PIN must be 4 digits', 'warn');
          m.clockPin = v || undefined;
          S.persist();
          toast('Clock PIN updated for ' + m.name);
        };
      });
      document.querySelector('[data-act="add"]').onclick=()=>{
        const max = S.db.org.maxUsers;
        if (max && S.db.team.length >= max) {
          toast(`Your plan allows ${max} users. Upgrade in Settings or email shyam_1@hotmail.co.uk for a larger plan.`, 'warn');
          return;
        }
        modal('Add Team Member',`<div class="space-y-3">
          <input id="n" class="input" placeholder="Full name">
          <input id="e" class="input" placeholder="Email (their login)">
          <input id="ph" class="input" placeholder="Mobile for SMS e.g. +447700900123">
          <input id="r" class="input" placeholder="Job title (e.g. Sous Chef)">
          <div><label class="label">Access level</label><select id="a" class="select"><option>Staff</option><option>Manager</option><option>Admin</option></select></div>
          <p class="text-xs text-ink-400">Admins get SMS alerts on all sites. Managers get SMS for their site only.</p>
          <button class="btn btn-primary w-full" id="s">Add member</button></div>`);
        document.getElementById('s').onclick=()=>{ const n=document.getElementById('n').value.trim(); if(!n)return toast('Enter a name','warn');
          const max = S.db.org.maxUsers;
          if (max && S.db.team.length >= max) { toast(`Plan limit: ${max} users`, 'warn'); return; }
          const initials=n.split(' ').map(x=>x[0]).join('').slice(0,2).toUpperCase();
          S.db.team.push({id:S.uid('u'),name:n,email:document.getElementById('e').value,phone:document.getElementById('ph').value.trim(),role:document.getElementById('r').value||'Staff',access:document.getElementById('a').value,siteId:S.db.currentSite,initials});
          S.persist(); closeModal(); window.App.render(); toast('Member added ? they can now sign in'); };
      };
    }};
  }

  /* ---------------- ALLERQ ---------------- */
  function allerq() {
    const menus = S.db.menus;
    const mod = window.RecipeNutrition;
    function dishAllergens(d) {
      if (d.recipeId && mod) {
        const r = (S.db.recipes || []).find(x => x.id === d.recipeId);
        if (r) {
          const auto = mod.analyzeRecipe(r, r.servings || 1).allergens;
          const extra = (d.allergens || []).filter(a => !auto.includes(a));
          return [...new Set([...auto, ...extra])];
        }
      }
      return d.allergens || [];
    }
    const cards = menus.map(m=>`<div class="card card-pad fade-in">
      <div class="flex items-start justify-between mb-3">
        <div><div class="font-bold">${escapeHtml(m.name)}</div><div class="text-xs text-ink-400">${escapeHtml(S.site(m.site).name)} ? ${m.languages.length} languages</div></div>
        <button class="btn btn-ghost btn-sm" data-qr="${m.id}">${icon('qr','ico')} QR</button>
      </div>
      <div class="flex flex-wrap gap-1 mb-3">${m.languages.map(l=>`<span class="badge badge-gray">${l}</span>`).join('')}</div>
      <div class="space-y-2">
        ${m.dishes.map(d=>{ const al = dishAllergens(d); return `<div class="p-2.5 rounded-xl border border-ink-100">
          <div class="font-semibold text-sm">${escapeHtml(d.name)}${d.recipeId ? ' <span class="text-[10px] text-brand-600 font-normal">? linked recipe</span>' : ''}</div>
          <div class="text-xs text-ink-400 mb-1">${escapeHtml(d.desc)}</div>
          <div class="flex flex-wrap gap-1">${al.map(a=>`<span class="badge badge-amber">${a}</span>`).join('')||'<span class="badge badge-green">No allergens</span>'}</div>
        </div>`; }).join('')}
      </div>
      <button class="btn btn-ghost btn-sm w-full mt-3" data-adddish="${m.id}">${icon('plus','ico')} Add dish</button>
    </div>`).join('');
    const html = `
      ${sectionHeader('MenuGuard ? Allergen Menus','Digital allergen menus with QR codes, 14 statutory allergens, multi-language', `
        <a class="btn btn-ghost btn-sm" href="/menu-creator/" target="_blank" rel="noopener">${icon('recipe','ico')} Menu Creator</a>
        <button class="btn btn-primary btn-sm" data-act="newmenu">${icon('plus','ico')} New menu</button>`)}
      <div class="grid md:grid-cols-2 xl:grid-cols-3 gap-5">${cards}</div>`;
    return { title:'MenuGuard', html, mount() {
      document.querySelectorAll('[data-qr]').forEach(b=>b.onclick=()=>{
        const m=S.db.menus.find(x=>x.id===b.dataset.qr);
        modal('QR Code ? '+m.name, `<div class="text-center"><div id="qrbox" class="inline-block p-3 bg-white rounded-xl border border-ink-200"></div>
          <p class="text-sm text-ink-400 mt-3">Customers scan to view allergens in ${m.languages.length} languages.</p></div>`);
        new QRCode(document.getElementById('qrbox'), { text: S.siteUrl('/menu/' + m.id), width:200, height:200, colorDark:'#0f172a' });
      });
      document.querySelectorAll('[data-adddish]').forEach(b=>b.onclick=()=>openDish(b.dataset.adddish));
      document.querySelector('[data-act="newmenu"]').onclick=()=>{
        modal('New Menu',`<div class="space-y-3"><input id="n" class="input" placeholder="Menu name"><button class="btn btn-primary w-full" id="s">Create</button></div>`);
        document.getElementById('s').onclick=()=>{ const n=document.getElementById('n').value.trim(); if(!n)return toast('Enter a name','warn');
          S.db.menus.push({id:S.uid('m'),name:n,site:S.db.currentSite,languages:['English'],dishes:[]}); S.persist(); closeModal(); window.App.render(); toast('Menu created'); };
      };
      function openDish(menuId){
        const menu = S.db.menus.find(x=>x.id===menuId);
        const mod = window.RecipeNutrition;
        const recipes = (S.db.recipes || [])
          .filter(r => !r.site || r.site === menu.site || r.site === S.db.currentSite)
          .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        const recipeOpts = ['<option value="">? Pick a recipe (allergens auto-fill) ?</option>']
          .concat(recipes.map(r => `<option value="${escapeHtml(r.id)}">${escapeHtml(r.name)}</option>`)).join('');
        const allCb = S.ALLERGENS.map(a=>`<label class="flex items-center gap-2 text-xs manual-al-row"><input type="checkbox" value="${a}" class="al accent-brand-600">${a}</label>`).join('');
        modal('Add Dish',`<div class="space-y-3">
          <div><label class="label">Link to recipe</label>
          <select id="drecipe" class="input">${recipeOpts}</select>
          <p class="text-xs text-ink-400 mt-1">Pick a recipe and allergens fill in automatically from its ingredients.</p></div>
          <input id="dn" class="input" placeholder="Dish name (editable)">
          <input id="dd" class="input" placeholder="Description (optional)">
          <div id="autoAlSection" class="hidden">
            <label class="label">Allergens from recipe</label>
            <div id="autoAlBox" class="flex flex-wrap gap-1 p-2 border border-ink-100 rounded-lg min-h-[2.5rem]"></div>
            <p class="text-xs text-ink-400 mt-1">Detected from linked recipe ? updates if you change the recipe in Recipes.</p>
          </div>
          <div id="manualAlSection">
            <label class="label">Allergens (manual)</label>
            <div class="grid grid-cols-2 gap-1 max-h-48 overflow-auto p-2 border border-ink-100 rounded-lg">${allCb}</div>
            <p class="text-xs text-ink-400 mt-1">Or tick manually if this dish is not linked to a recipe.</p>
          </div>
          <div id="extraAlSection" class="hidden">
            <label class="label">Extra allergens (optional)</label>
            <div id="extraAlBox" class="grid grid-cols-2 gap-1 max-h-32 overflow-auto p-2 border border-ink-100 rounded-lg"></div>
          </div>
          <button class="btn btn-primary w-full" id="ds">Add dish</button></div>`,{wide:true});
        let linkedRecipeId = '';
        let autoAllergens = [];
        function renderExtraAllergens() {
          const box = document.getElementById('extraAlBox');
          if (!box) return;
          const extras = S.ALLERGENS.filter(a => !autoAllergens.includes(a));
          box.innerHTML = extras.length
            ? extras.map(a => `<label class="flex items-center gap-2 text-xs"><input type="checkbox" value="${a}" class="al-extra accent-brand-600">${a}</label>`).join('')
            : '<p class="text-xs text-ink-400 col-span-2">All statutory allergens already covered by the recipe.</p>';
        }
        function applyRecipe(recipeId) {
          linkedRecipeId = recipeId || '';
          const r = recipes.find(x => x.id === recipeId);
          const autoSec = document.getElementById('autoAlSection');
          const manualSec = document.getElementById('manualAlSection');
          const extraSec = document.getElementById('extraAlSection');
          if (!r) {
            autoAllergens = [];
            autoSec.classList.add('hidden');
            extraSec.classList.add('hidden');
            manualSec.classList.remove('hidden');
            document.getElementById('autoAlBox').innerHTML = '';
            return;
          }
          document.getElementById('dn').value = r.name;
          const desc = [r.category, r.servings ? r.servings + ' servings' : ''].filter(Boolean).join(' ? ');
          document.getElementById('dd').value = desc;
          autoAllergens = mod ? mod.analyzeRecipe(r, r.servings || 1).allergens : (r.allergens || []);
          document.getElementById('autoAlBox').innerHTML = autoAllergens.length
            ? autoAllergens.map(a => `<span class="badge badge-amber">${escapeHtml(a)}</span>`).join('')
            : '<span class="badge badge-green">No allergens detected</span>';
          autoSec.classList.remove('hidden');
          extraSec.classList.remove('hidden');
          manualSec.classList.add('hidden');
          renderExtraAllergens();
        }
        document.getElementById('drecipe').onchange = () => applyRecipe(document.getElementById('drecipe').value);
        document.getElementById('ds').onclick=()=>{ const n=document.getElementById('dn').value.trim(); if(!n)return toast('Enter a name','warn');
          const manualAl = linkedRecipeId ? [] : [...document.querySelectorAll('.al:checked')].map(c=>c.value);
          const extraAl = linkedRecipeId ? [...document.querySelectorAll('.al-extra:checked')].map(c=>c.value) : [];
          const al = [...new Set([...autoAllergens, ...manualAl, ...extraAl])];
          S.db.menus.find(x=>x.id===menuId).dishes.push({
            id:S.uid(), name:n, desc:document.getElementById('dd').value, allergens:al,
            recipeId: linkedRecipeId || null,
          });
          S.persist(); closeModal(); window.App.render(); toast(linkedRecipeId ? 'Dish added ? allergens from recipe' : 'Dish added'); };
      }
    }};
  }

  /* ---------------- FOOD LABELS ---------------- */
  function labels() {
    const list = S.db.labels.filter(l=>l.site===S.db.currentSite);
    const expiry = (l)=> new Date(new Date(l.prepped).getTime()+l.shelfDays*864e5);
    const rows = list.map(l=>`<tr>
      <td class="font-semibold">${escapeHtml(l.product)}</td>
      <td>${fmt.date(l.prepped)}</td>
      <td>${fmt.date(expiry(l).toISOString())}</td>
      <td>${l.allergens.length?l.allergens.map(a=>`<span class="badge badge-amber">${a}</span>`).join(' '):'<span class="text-ink-300">?</span>'}</td>
      <td class="text-right"><button class="btn btn-ghost btn-sm" data-print="${l.id}">${icon('print','ico')} Print</button></td></tr>`).join('');
    const html = `
      ${sectionHeader('LabelSmart ? Food Labels','Prep labels for Brother QL 62 mm, 50?30 mm, or A4 ? set size before printing', `
        <button class="btn btn-primary btn-sm" data-act="new">${icon('plus','ico')} Create label</button>`)}
      <div class="card overflow-hidden">
        <table class="table"><thead><tr><th>Product</th><th>Prepped</th><th>Use by</th><th>Allergens</th><th></th></tr></thead>
        <tbody>${rows || '<tr><td colspan="5" class="text-center text-ink-400 py-6">No labels yet.</td></tr>'}</tbody></table>
      </div>`;
    return { title:'Labels', html, mount() {
      document.querySelector('[data-act="new"]').onclick=()=>{
        const allCb=S.ALLERGENS.map(a=>`<label class="flex items-center gap-2 text-xs"><input type="checkbox" value="${a}" class="al accent-brand-600">${a}</label>`).join('');
        modal('Create Label',`<div class="space-y-3"><input id="p" class="input" placeholder="Product name">
          <div class="grid grid-cols-2 gap-3"><div><label class="label">Prep date</label><input id="pd" type="date" class="input" value="${new Date().toISOString().slice(0,10)}"></div>
          <div><label class="label">Shelf life (days)</label><input id="sl" type="number" class="input" value="2"></div></div>
          <div><label class="label">Allergens</label><div class="grid grid-cols-2 gap-1 max-h-40 overflow-auto p-2 border border-ink-100 rounded-lg">${allCb}</div></div>
          <button class="btn btn-primary w-full" id="s">Create & preview</button></div>`,{wide:true});
        document.getElementById('s').onclick=()=>{ const p=document.getElementById('p').value.trim(); if(!p)return toast('Enter a product','warn');
          const al=[...document.querySelectorAll('.al:checked')].map(c=>c.value);
          const l={id:S.uid('lbl'),product:p,site:S.db.currentSite,prepped:new Date(document.getElementById('pd').value).toISOString(),shelfDays:+document.getElementById('sl').value,by:'u_sarah',allergens:al};
          S.db.labels.unshift(l); S.persist(); closeModal(); window.App.render(); printLabel(l.id); toast('Label created'); };
      };
      document.querySelectorAll('[data-print]').forEach(b=>b.onclick=()=>printLabel(b.dataset.print));
      function labelSizeClass() {
        const s = localStorage.getItem('kiteline.labelSize') || '62';
        return s === '5030' ? 'label-print--5030' : s === 'a4' ? 'label-print--a4' : 'label-print--62';
      }
      function printLabel(id){
        const l=S.db.labels.find(x=>x.id===id); if(!l) return;
        const exp=new Date(new Date(l.prepped).getTime()+l.shelfDays*864e5);
        const cur = localStorage.getItem('kiteline.labelSize') || '62';
        modal('Label Preview',`<div class="flex flex-col items-center gap-4">
          <div class="w-full max-w-xs text-left">
            <label class="label">Label size (match your printer roll)</label>
            <select id="labelSize" class="select">
              <option value="62" ${cur==='62'?'selected':''}>62 mm roll ? Brother QL-800 / QL-810W</option>
              <option value="5030" ${cur==='5030'?'selected':''}>50 ? 30 mm die-cut</option>
              <option value="a4" ${cur==='a4'?'selected':''}>A4 sheet (office printer)</option>
            </select>
            <p class="text-xs text-ink-400 mt-2">Install Brother QL drivers, then choose your QL printer in the print dialog. Paper: 62 mm continuous.</p>
          </div>
          <div class="label-print ${labelSizeClass()}" id="lp">
            <div class="label-product" style="font-weight:800;font-size:20px;line-height:1.1">${escapeHtml(l.product)}</div>
            <div style="font-size:12px;color:#475569;margin-top:4px">${escapeHtml(S.site(l.site).name)}</div>
            <hr style="margin:8px 0;border-color:#e2e8f0">
            <div style="font-size:13px"><b>Prepped:</b> ${fmt.date(l.prepped)}</div>
            <div style="font-size:13px;color:#b91c1c"><b>Use by:</b> ${fmt.date(exp.toISOString())}</div>
            <div style="font-size:12px;margin-top:6px"><b>Allergens:</b> ${l.allergens.join(', ')||'None declared'}</div>
            <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:10px">
              <div id="lqr"></div>
            </div>
          </div>
          <button class="btn btn-primary no-print" id="doPrint">${icon('print','ico')} Print label</button>
        </div>`);
        new QRCode(document.getElementById('lqr'),{text:S.siteUrl('/label/'+l.id),width:48,height:48,colorDark:'#0f172a'});
        const sz = document.getElementById('labelSize');
        const lp = document.getElementById('lp');
        sz.onchange = () => {
          localStorage.setItem('kiteline.labelSize', sz.value);
          lp.className = 'label-print ' + (sz.value === '5030' ? 'label-print--5030' : sz.value === 'a4' ? 'label-print--a4' : 'label-print--62');
        };
        document.getElementById('doPrint').onclick = () => {
          localStorage.setItem('kiteline.labelSize', sz.value);
          document.body.dataset.labelSize = sz.value;
          printWithBodyClass('print-label');
        };
      }
    }};
  }

  /* ---------------- F*** WASTE ---------------- */
  function waste() {
    const list = S.db.waste.filter(w=>w.site===S.db.currentSite);
    const totalKg = list.reduce((n,w)=>n+w.kg,0);
    const totalCost = list.reduce((n,w)=>n+w.cost,0);
    const byReason = {}; list.forEach(w=>byReason[w.reason]=(byReason[w.reason]||0)+w.kg);
    const byStage = {}; list.forEach(w=>byStage[w.stage]=(byStage[w.stage]||0)+w.kg);
    const rows = list.sort((a,b)=>new Date(b.at)-new Date(a.at)).map(w=>`<tr>
      <td class="font-semibold">${escapeHtml(w.item)}</td><td>${w.kg.toFixed(1)} kg</td>
      <td><span class="badge badge-gray">${escapeHtml(w.reason)}</span></td><td>${escapeHtml(w.stage)}</td>
      <td>${fmt.money(w.cost,S.db.org.currency)}</td><td class="text-ink-500">${fmt.date(w.at)}</td></tr>`).join('');
    const html = `
      ${sectionHeader('WasteWise ? Waste Tracking','Log waste by item, reason and stage. Charts stay fixed until you add a new entry.', `
        <button class="btn btn-primary btn-sm" data-act="log">${icon('plus','ico')} Log waste</button>`)}
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <div class="kpi"><div class="text-xs text-ink-500">Total waste</div><div class="v">${totalKg.toFixed(1)}kg</div></div>
        <div class="kpi"><div class="text-xs text-ink-500">Cost</div><div class="v text-red-600">${fmt.money(totalCost,S.db.org.currency)}</div></div>
        <div class="kpi"><div class="text-xs text-ink-500">Entries</div><div class="v">${list.length}</div></div>
        <div class="kpi"><div class="text-xs text-ink-500">Projected ROI</div><div class="v text-brand-600">14:1</div></div>
      </div>
      <div class="grid lg:grid-cols-2 gap-5 mb-5">
        <div class="card card-pad"><h3 class="font-bold mb-3">Waste by reason</h3><div class="waste-chart-box"><canvas id="wReason"></canvas></div></div>
        <div class="card card-pad"><h3 class="font-bold mb-3">Waste by stage</h3><div class="waste-chart-box"><canvas id="wStage"></canvas></div></div>
      </div>
      <div class="card overflow-hidden">
        <table class="table"><thead><tr><th>Item</th><th>Weight</th><th>Reason</th><th>Stage</th><th>Cost</th><th>Date</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="6" class="text-center text-ink-400 py-6">No waste logged.</td></tr>'}</tbody></table>
      </div>`;
    return { title:'Waste', html, mount() {
      const wasteChartOpts = {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        transitions: { active: { animation: { duration: 0 } } },
      };
      const kill = (el) => { const old = el && window.Chart && Chart.getChart(el); if (old) old.destroy(); };
      const c1 = document.getElementById('wReason');
      if (c1) {
        kill(c1);
        new Chart(c1, {
          type: 'doughnut',
          data: {
            labels: Object.keys(byReason),
            datasets: [{ data: Object.values(byReason), backgroundColor: ['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899'] }],
          },
          options: Object.assign({}, wasteChartOpts, {
            plugins: { legend: { position: 'right', labels: { font: { size: 11 } } } },
          }),
        });
      }
      const c2 = document.getElementById('wStage');
      if (c2) {
        kill(c2);
        new Chart(c2, {
          type: 'bar',
          data: {
            labels: Object.keys(byStage),
            datasets: [{ data: Object.values(byStage), backgroundColor: '#10b981', borderRadius: 6 }],
          },
          options: Object.assign({}, wasteChartOpts, {
            plugins: { legend: { display: false } },
            scales: { y: { ticks: { font: { size: 10 } } }, x: { ticks: { font: { size: 10 } } } },
          }),
        });
      }
      document.querySelector('[data-act="log"]').onclick=()=>{
        modal('Log Waste',`<div class="space-y-3"><input id="i" class="input" placeholder="Item">
          <div class="grid grid-cols-2 gap-3"><input id="k" type="number" step="0.1" class="input" placeholder="Weight (kg)"><input id="c" type="number" step="0.1" class="input" placeholder="Cost (?)"></div>
          <div class="grid grid-cols-2 gap-3"><select id="r" class="select"><option>Overproduction</option><option>Spoilage</option><option>Trimming</option><option>Customer return</option><option>Expired</option></select>
          <select id="st" class="select"><option>Prep</option><option>Storage</option><option>Service</option></select></div>
          <button class="btn btn-primary w-full" id="s">Log waste</button></div>`);
        document.getElementById('s').onclick=()=>{ const i=document.getElementById('i').value.trim(); if(!i)return toast('Enter an item','warn');
          S.db.waste.unshift({id:S.uid('w'),site:S.db.currentSite,item:i,kg:+document.getElementById('k').value||0,cost:+document.getElementById('c').value||0,reason:document.getElementById('r').value,stage:document.getElementById('st').value,at:S.now()});
          S.persist(); closeModal(); window.App.render(); toast('Waste logged'); };
      };
    }};
  }

  /* ---------------- RECIPES ---------------- */
  function RM() { return window.RecipeMedia; }
  function recipeHeroSrc(r) {
    const m = RM();
    return m ? m.heroSrc(r) : (r && r.image);
  }
  function recipeImage(r, big) {
    const src = recipeHeroSrc(r);
    if (src) return `<img src="${src}" alt="${escapeHtml(r.name)}" class="w-full ${big ? 'h-44' : 'h-36'} object-cover">`;
    const hue = (r.name.charCodeAt(0) * 7) % 360;
    return `<div class="w-full ${big?'h-44':'h-36'} flex items-center justify-center text-white font-black text-3xl" style="background:linear-gradient(135deg,hsl(${hue},60%,45%),hsl(${(hue+40)%360},55%,30%))">${escapeHtml(r.name[0]||'?')}</div>`;
  }
  function recipeMethodBlock(r) {
    if (r.stepByStep && (r.steps || []).length) {
      const m = RM();
      const stepsHtml = m ? m.renderStepCards(r.steps, escapeHtml) : '';
      const proMethod = (r.proMethod || []).length
        ? `<h2 class="recipe-card__section-title">Pro method</h2><ol class="recipe-card__pro-method">${(r.proMethod || []).map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ol>`
        : '';
      return stepsHtml + proMethod;
    }
    const method = (r.method || []).length
      ? `<ol class="recipe-card__method">${(r.method || []).map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ol>`
      : '<p class="text-ink-400">No method steps yet.</p>';
    const proMethod = (r.proMethod || []).length
      ? `<h2 class="recipe-card__section-title">Pro method</h2><ol class="recipe-card__pro-method">${(r.proMethod || []).map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ol>`
      : '';
    return method + proMethod;
  }
  function stepRowHtml(step, idx) {
    const imgPrev = step.image ? `<img src="${step.image}" class="step-row__thumb">` : '';
    const vidPrev = step.video ? `<video src="${step.video}" class="step-row__vid" controls playsinline></video>` : '';
    return `<div class="step-row" data-idx="${idx}">
      <div class="step-row__head">
        <strong>Step ${idx + 1}</strong>
        <button type="button" class="btn btn-ghost btn-sm step-rm" title="Remove">?</button>
      </div>
      <textarea class="textarea step-text" rows="2" placeholder="Describe this step?">${escapeHtml(step.text || '')}</textarea>
      <div class="step-row__media grid sm:grid-cols-2 gap-2">
        <div>
          <label class="text-xs text-ink-500">Step photo</label>
          <input type="file" accept="image/*" class="step-img-in text-xs w-full">
          <div class="step-img-prev mt-1">${imgPrev}</div>
        </div>
        <div>
          <label class="text-xs text-ink-500">Short video (max ${RM() ? RM().VIDEO_MAX_MB : 12} MB)</label>
          <input type="file" accept="video/mp4,video/webm,video/quicktime" class="step-vid-in text-xs w-full">
          <div class="step-vid-prev mt-1">${vidPrev}</div>
        </div>
      </div>
    </div>`;
  }
  function mountStepBuilder(container, initialSteps) {
    let rows = (initialSteps && initialSteps.length ? initialSteps : [{ text: '', image: null, video: null }])
      .map((s) => ({ text: s.text || '', image: s.image || null, video: s.video || null }));
    const media = RM();
    const render = () => {
      container.innerHTML = rows.map(stepRowHtml).join('');
      container.querySelectorAll('.step-rm').forEach((btn) => {
        btn.onclick = () => {
          const i = +btn.closest('.step-row').dataset.idx;
          rows.splice(i, 1);
          if (!rows.length) rows.push({ text: '', image: null, video: null });
          render();
        };
      });
      container.querySelectorAll('.step-row').forEach((el, i) => {
        const imgIn = el.querySelector('.step-img-in');
        const vidIn = el.querySelector('.step-vid-in');
        imgIn.onchange = (e) => {
          const f = e.target.files[0]; if (!f) return;
          resizeImage(f, (data) => {
            rows[i].image = data;
            el.querySelector('.step-img-prev').innerHTML = `<img src="${data}" class="step-row__thumb">`;
          });
        };
        vidIn.onchange = (e) => {
          const f = e.target.files[0]; if (!f) return;
          if (!media) return;
          media.readVideoFile(f, (data) => {
            rows[i].video = data;
            el.querySelector('.step-vid-prev').innerHTML = `<video src="${data}" class="step-row__vid" controls playsinline></video>`;
          }, (msg) => toast(msg, 'warn'));
        };
      });
    };
    render();
    return {
      getRows: () => [...container.querySelectorAll('.step-row')].map((el) => {
        const img = el.querySelector('.step-img-prev img');
        const vid = el.querySelector('.step-vid-prev video');
        return {
          text: el.querySelector('.step-text').value.trim(),
          image: img ? img.getAttribute('src') : null,
          video: vid ? vid.getAttribute('src') : null,
        };
      }).filter((s) => s.text || s.image || s.video),
      addRow: () => { rows.push({ text: '', image: null, video: null }); render(); },
      syncFromTextarea: (lines) => {
        rows = lines.map((text) => ({ text, image: null, video: null }));
        if (!rows.length) rows.push({ text: '', image: null, video: null });
        render();
      },
    };
  }
  function parseFraction(s) {
    s = String(s).trim();
    if (s.includes('/')) {
      const [a, b] = s.split('/').map(Number);
      return b ? a / b : Number(a) || 0;
    }
    return parseFloat(s) || 0;
  }
  function parseIngredientLine(line) {
    line = (line || '').trim();
    if (!line) return null;
    if (line.includes('|')) {
      const p = line.split('|').map(s => s.trim());
      if (p.length >= 3) return { name: p[0], baseQty: p[1] || '?', notes: p[2] || p[1] || '?' };
      if (p.length === 2) return { name: p[0], baseQty: p[1], notes: p[1] };
    }
    const m = line.match(/^([\d./]+\s*(?:g|kg|ml|l|cl|tsp|tbsp|oz|lb|cup|cups|each|pinch|bunch|mm)?)\s+(.+)$/i)
      || line.match(/^([\d./]+)\s*(g|kg|ml|l|tsp|tbsp|oz|lb|each|cups?)\s+(.+)$/i);
    if (m) {
      const baseQty = m[3] ? `${m[1]} ${m[2]}`.trim() : m[1].trim();
      const name = (m[3] || m[2] || '').trim();
      return { name, baseQty, notes: baseQty };
    }
    if (/^to taste$/i.test(line) || /^-$/.test(line)) return { name: line, baseQty: '-', notes: 'To taste' };
    return { name: line, baseQty: '?', notes: '?' };
  }
  function scaleQtyString(qty, factor) {
    if (!qty || qty === '?' || /^to taste$/i.test(qty)) return qty;
    const m = String(qty).match(/^([\d./]+)\s*(.*)$/i);
    if (!m) return qty;
    const n = Math.round(parseFraction(m[1]) * factor * 1000) / 1000;
    const shown = Number.isInteger(n) ? String(n) : String(+n.toFixed(2));
    return m[2] ? `${shown} ${m[2]}`.trim() : shown;
  }
  function recipeIngredientRows(r) {
    return (r.ingredients || []).map(parseIngredientLine).filter(Boolean);
  }
  function RN() { return window.RecipeNutrition; }
  function recipeAnalysis(r, targetServings) {
    const mod = RN();
    if (mod) return mod.analyzeRecipe(r, targetServings);
    const base = r.servings || 1;
    const target = Math.max(1, Number(targetServings) || base);
    const factor = target / base;
    const items = recipeIngredientRows(r).map(row => ({
      name: row.name,
      baseQty: row.baseQty,
      scaledQty: scaleQtyString(row.baseQty, factor),
      notes: row.notes,
      allergens: [],
      nutrition: { kcal: 0, protein: 0, carbs: 0, fat: 0 },
    }));
    return { items, total: { kcal: 0 }, perServing: { kcal: 0 }, servings: target, allergens: r.allergens || [] };
  }
  function analyzedIngRowHtml(it) {
    const mod = RN();
    const al = mod ? mod.renderAllergenIcons(it.allergens, '?') : '?';
    const nut = mod ? mod.formatNutShort(it.nutrition) : '?';
    const kitchen = it.notes && it.notes !== it.baseQty ? it.notes : (it.scaledQty || it.baseQty);
    return `<tr>
      <td>${escapeHtml(it.name)}</td>
      <td>${escapeHtml(it.baseQty)}</td>
      <td><strong>${escapeHtml(it.scaledQty || it.baseQty)}</strong></td>
      <td class="recipe-card__al-col"><span class="al-icon-row">${al}</span></td>
      <td class="recipe-card__nut-col">${escapeHtml(nut)}</td>
      <td>${escapeHtml(kitchen)}</td>
    </tr>`;
  }
  function itemToFormRow(it) {
    const base = it.baseQty || (it.qty ? `${it.qty}${it.unit ? ' ' + it.unit : ''}` : '');
    const m = String(base).match(/^([\d./]+)\s*(\S+)?$/);
    return {
      name: it.name || '',
      qty: m ? m[1] : (it.qty || ''),
      unit: m && m[2] ? m[2] : (it.unit || 'g'),
      notes: (it.notes && it.notes !== it.baseQty) ? it.notes : '',
      manualAllergens: it.manualAllergens || [],
    };
  }
  const ING_UNITS = ['g', 'kg', 'ml', 'l', 'tsp', 'tbsp', 'cup', 'each', 'pinch', 'bunch', '?'];
  function ingBuilderRowHtml(row, idx) {
    const mod = RN();
    const preview = mod ? mod.normalizeItem(Object.assign({}, row, {
      baseQty: row.qty ? `${row.qty}${row.unit && row.unit !== '?' ? ' ' + row.unit : ''}`.trim() : '?',
      grams: mod.parseQtyToGrams(row.qty, row.unit),
    })) : null;
    const al = preview ? mod.renderAllergenIcons(preview.allergens) : '';
    const nut = preview ? mod.formatNutShort(preview.nutrition) : '';
    const unitOpts = ING_UNITS.map(u => `<option ${u === row.unit ? 'selected' : ''}>${u}</option>`).join('');
    return `<div class="ing-row" data-idx="${idx}">
      <div class="ing-row__main">
        <input class="input ing-name" placeholder="Ingredient name" value="${escapeHtml(row.name)}">
        <input class="input ing-qty" placeholder="Qty" value="${escapeHtml(row.qty)}">
        <select class="select ing-unit">${unitOpts}</select>
        <input class="input ing-notes" placeholder="Kitchen notes" value="${escapeHtml(row.notes)}">
        <button type="button" class="btn btn-ghost btn-sm ing-rm" title="Remove">?</button>
      </div>
      <div class="ing-row__live text-xs text-ink-500">${al ? `<span class="al-icon-row">${al}</span> ` : ''}${escapeHtml(nut)}${preview && !preview._estimated ? ' <span class="text-ink-400">(no guide data)</span>' : ''}</div>
    </div>`;
  }
  function mountIngredientBuilder(container, initialItems, servingsInput, summaryEl) {
    const mod = RN();
    let rows = (initialItems && initialItems.length ? initialItems : [{ name: '', qty: '', unit: 'g', notes: '', manualAllergens: [] }])
      .map(itemToFormRow);
    const render = () => {
      container.innerHTML = rows.map(ingBuilderRowHtml).join('');
      container.querySelectorAll('.ing-rm').forEach(btn => {
        btn.onclick = () => {
          const i = +btn.closest('.ing-row').dataset.idx;
          rows.splice(i, 1);
          if (!rows.length) rows.push({ name: '', qty: '', unit: 'g', notes: '', manualAllergens: [] });
          render();
        };
      });
      container.querySelectorAll('.ing-name, .ing-qty, .ing-unit, .ing-notes').forEach(el => {
        el.oninput = () => { syncRows(); refreshIngSummary(summaryEl, servingsInput); };
      });
      refreshIngSummary(summaryEl, servingsInput);
    };
    const syncRows = () => {
      rows = [...container.querySelectorAll('.ing-row')].map(el => ({
        name: el.querySelector('.ing-name').value,
        qty: el.querySelector('.ing-qty').value,
        unit: el.querySelector('.ing-unit').value,
        notes: el.querySelector('.ing-notes').value,
        manualAllergens: [],
      }));
    };
    render();
    return {
      getRows: () => { syncRows(); return rows; },
      refresh: () => refreshIngSummary(summaryEl, servingsInput),
      addRow: (row) => { rows.push(row || { name: '', qty: '', unit: 'g', notes: '', manualAllergens: [] }); render(); },
      setRows: (newRows) => {
        rows = (newRows && newRows.length ? newRows : [{ name: '', qty: '', unit: 'g', notes: '', manualAllergens: [] }])
          .map((row) => ({
            name: row.name || '',
            qty: String(row.qty || ''),
            unit: row.unit || 'g',
            notes: row.notes || '',
            manualAllergens: row.manualAllergens || [],
          }));
        render();
      },
    };
  }
  function refreshIngSummary(summaryEl, servingsInput) {
    const mod = RN();
    if (!mod || !summaryEl) return;
    const builder = document.getElementById('ringBuilder');
    if (!builder) return;
    const rows = [...builder.querySelectorAll('.ing-row')].map(el => ({
      name: el.querySelector('.ing-name').value,
      qty: el.querySelector('.ing-qty').value,
      unit: el.querySelector('.ing-unit').value,
      notes: el.querySelector('.ing-notes').value,
      manualAllergens: [],
    }));
    const servings = servingsInput ? Math.max(1, +servingsInput.value || 1) : 1;
    const items = mod.serializeItemsFromForm(rows);
    const analysis = mod.analyzeRecipe({ servings, ingredientItems: items, allergens: [] }, servings);
    const flags = mod.renderRecipeTopFlags(analysis);
    summaryEl.innerHTML = `${flags}<div class="ing-summary__grid">
      <div class="ing-summary__block"><strong>Diet & allergens</strong><span>${mod.renderDietaryBadges(mod.deriveDietaryFlags(null, analysis)) || 'Add ingredients to detect flags'}</span></div>
      <div class="ing-summary__block"><strong>Energy</strong><span>${escapeHtml(mod.formatNutPanel(analysis.total, analysis.perServing, servings))}</span></div>
    </div>`;
  }
  function recipeYieldUnit(r) {
    return r.yieldUnit || 'portions';
  }
  function recipeCardPrintHtml(r, targetServings) {
    const base = r.servings || 1;
    const target = Math.max(1, Number(targetServings) || base);
    const unit = recipeYieldUnit(r);
    const site = escapeHtml(S.site(r.site).name);
    const analysis = recipeAnalysis(r, target);
    const mod = RN();
    const topFlags = mod ? mod.renderRecipeTopFlags(analysis, r) : '';
    const subtitle = escapeHtml(r.subtitle || r.category || '');
    const chefNotes = escapeHtml(r.chefNotes || 'Adjust seasoning to taste. Scale whole items with practical kitchen rounding.');
    const tableRows = analysis.items.map(analyzedIngRowHtml).join('')
      || '<tr><td colspan="6" class="text-ink-400">No ingredients listed</td></tr>';
    const photoSrc = recipeHeroSrc(r);
    const photo = photoSrc ? `<img src="${photoSrc}" alt="" class="recipe-card__photo">` : '';
    const methodBlock = recipeMethodBlock(r);
    const prepInfo = `Prep ${r.prepMins || 0} min ? Cook ${r.cookMins || 0} min ? Food cost ${fmt.money(r.cost || 0, S.db.org.currency)}`;
    return `<div class="recipe-print" id="recipePrintCard" data-base-yield="${base}" data-yield-unit="${escapeHtml(unit)}">
      <div class="recipe-card__topbar">
        <div class="recipe-card__brand">
          <img src="/kiteline-logo.png?v=mark3" alt="">
          <span>Kit<em style="font-style:italic;color:#5eead4">eline</em></span>
        </div>
        <span class="recipe-card__topbar-link no-print text-sm text-ink-500">${site}</span>
      </div>
      <div class="recipe-card__shell">
        ${photo}
        <div class="recipe-card__hero">
          <div class="recipe-card__tags">
            <span class="recipe-card__tag recipe-card__tag--cat">${escapeHtml(r.category || 'Recipe')}</span>
            <span class="recipe-card__tag recipe-card__tag--yield" id="rcTargetBadge">${target} ${escapeHtml(unit)}</span>
          </div>
          <div id="rcHeroFlags" class="recipe-card__hero-flags">${topFlags}</div>
          <h1 class="recipe-card__title">${escapeHtml(r.name)}</h1>
          ${subtitle ? `<p class="recipe-card__subtitle">${subtitle}</p>` : ''}
          <p class="recipe-card__yield-line" id="rcYieldLine">Base yield: ${base} ${escapeHtml(unit)} | Current target: ${target} ${escapeHtml(unit)}</p>
        </div>
        <div class="recipe-card__body">
          <div class="recipe-card__info">
            <div class="recipe-card__info-box"><strong>Kitchen notes</strong><span>${prepInfo}</span></div>
          </div>
          <div class="recipe-card__scale recipe-card__controls no-print">
            <div class="recipe-card__scale-row">
              <div>
                <p><strong>Base recipe makes:</strong> <span id="rcBaseText">${base} ${escapeHtml(unit)}</span></p>
                <p><strong>Current target:</strong> <span id="rcTargetText">${target} ${escapeHtml(unit)}</span></p>
              </div>
              <div>
                <label class="recipe-card__scale-label" for="rcScaleInput">Target quantity</label>
                <input id="rcScaleInput" class="recipe-card__scale-input" type="number" min="1" max="300" step="1" value="${target}">
              </div>
              <p class="recipe-card__scale-note" id="rcScaleNote">Ingredient quantities below are scaled for ${target} ${escapeHtml(unit)}.</p>
            </div>
          </div>
          <h2 class="recipe-card__section-title">Ingredients</h2>
          <div class="recipe-card__table-wrap">
            <table class="recipe-card__table">
              <thead><tr><th>Ingredient</th><th>Base Qty</th><th>Scaled Qty</th><th>Allergens</th><th>kcal</th><th>Kitchen Qty / Notes</th></tr></thead>
              <tbody id="rcIngBody">${tableRows}</tbody>
            </table>
          </div>
          <h2 class="recipe-card__section-title">${r.stepByStep ? 'Step-by-step method' : 'Method'}</h2>
          ${methodBlock}
          <div class="recipe-card__chef-notes"><strong>Chef notes</strong>${chefNotes}</div>
          <div class="recipe-card__foot"><span>Kiteline recipe card</span><span>${site} ? ${fmt.date(S.now())}</span></div>
        </div>
      </div>
    </div>`;
  }
  function wireRecipeCardScaling(r) {
    const card = document.getElementById('recipePrintCard');
    const input = document.getElementById('rcScaleInput');
    const tbody = document.getElementById('rcIngBody');
    if (!card || !input || !tbody) return;
    const base = r.servings || 1;
    const unit = recipeYieldUnit(r);
    const mod = RN();
    const refresh = () => {
      const target = Math.max(1, parseInt(input.value, 10) || base);
      input.value = target;
      const analysis = recipeAnalysis(r, target);
      document.getElementById('rcTargetBadge').textContent = target + ' ' + unit;
      document.getElementById('rcYieldLine').textContent = `Base yield: ${base} ${unit} | Current target: ${target} ${unit}`;
      document.getElementById('rcTargetText').textContent = target + ' ' + unit;
      document.getElementById('rcScaleNote').textContent = `Ingredient quantities below are scaled for ${target} ${unit}.`;
      tbody.innerHTML = analysis.items.map(analyzedIngRowHtml).join('') || '<tr><td colspan="6">No ingredients</td></tr>';
      const flagsEl = document.getElementById('rcHeroFlags');
      if (flagsEl && mod) flagsEl.innerHTML = mod.renderRecipeTopFlags(analysis, r);
    };
    input.oninput = () => { refresh(); if (window._rcRefreshLabel) window._rcRefreshLabel(); };
    refresh();
  }
  function recipeLabelSizeClass(size) {
    return size === '5030' ? 'label-print--5030' : size === 'a4' ? 'label-print--a4' : 'label-print--62';
  }
  function recipePrepLabelHtml(r, target, sizeKey) {
    const unit = recipeYieldUnit(r);
    const mod = RN();
    const analysis = recipeAnalysis(r, target);
    const allergens = mod ? mod.allergenShortCodes(analysis.allergens) : ((r.allergens || []).join(', ') || 'None');
    const flags = mod ? mod.deriveDietaryFlags(r, analysis) : {};
    const dietLine = mod ? [
      flags.vegan ? 'Vegan' : '',
      flags.glutenFree ? 'GF' : '',
      flags.dairy ? 'Dairy' : '',
      flags.lowSalt ? 'Low salt' : '',
    ].filter(Boolean).join(' ? ') : '';
    const kcalLine = analysis.perServing && analysis.perServing.kcal
      ? `<div style="font-size:11px"><b>Per portion:</b> ${analysis.perServing.kcal} kcal</div>` : '';
    const cls = recipeLabelSizeClass(sizeKey || '62');
    const titleSize = sizeKey === '5030' ? '11px' : '16px';
    return `<div class="label-print ${cls}" id="recipeLabelPrint">
      <div class="label-product" style="font-weight:800;font-size:${titleSize};line-height:1.1">${escapeHtml(r.name)}</div>
      <div style="font-size:11px;color:#475569;margin-top:3px">${escapeHtml(S.site(r.site).name)}</div>
      <hr style="margin:6px 0;border-color:#e2e8f0">
      <div style="font-size:11px"><b>Yield:</b> ${target} ${escapeHtml(unit)}</div>
      ${dietLine ? `<div style="font-size:11px"><b>Diet:</b> ${escapeHtml(dietLine)}</div>` : ''}
      <div style="font-size:11px"><b>Allergens:</b> ${escapeHtml(allergens)}</div>
      ${kcalLine}
      <div style="font-size:10px;margin-top:5px;color:#64748b">Kiteline ? ${fmt.date(S.now())}</div>
    </div>`;
  }
  function absolutizePrintImages(root) {
    root.querySelectorAll('img').forEach(img => {
      const src = img.getAttribute('src');
      if (src && src.startsWith('/')) img.setAttribute('src', location.origin + src);
    });
  }

  function printRecipeCardPopup() {
    const card = document.getElementById('recipePrintCard');
    if (!card) return toast('Open a recipe preview first', 'warn');
    const clone = card.cloneNode(true);
    clone.querySelectorAll('.no-print, .recipe-card__controls, .recipe-card__scale').forEach(el => el.remove());
    clone.removeAttribute('id');
    absolutizePrintImages(clone);
    const title = (clone.querySelector('.recipe-card__title') && clone.querySelector('.recipe-card__title').textContent.trim()) || 'Kiteline recipe';
    const opened = openPrintDocument(title, clone.outerHTML, {
      light: true,
      extraStyle: '.recipe-print{max-width:100%;box-shadow:none;border-radius:0;padding:0;background:#fff}.recipe-card__shell{box-shadow:none;border-radius:0}.recipe-card__table tr{page-break-inside:avoid;break-inside:avoid}.recipe-card__title{font-size:22pt;font-weight:700}',
    });
    if (!opened) printWithBodyClass('print-recipe');
  }

  function printRecipeLabelPopup() {
    const label = document.getElementById('recipeLabelPrint');
    if (!label) return toast('Label not ready', 'warn');
    const sz = (document.getElementById('recipeLabelSize') && document.getElementById('recipeLabelSize').value) || localStorage.getItem('kiteline.labelSize') || '62';
    const clone = label.cloneNode(true);
    clone.removeAttribute('id');
    const pageSize = sz === '5030' ? '50mm 30mm' : sz === '62' ? '62mm auto' : 'A4 portrait';
    const opened = openPrintDocument('Kiteline label', '<div style="display:flex;justify-content:center;padding:6mm 0">' + clone.outerHTML + '</div>', {
      pageSize,
      margin: '4mm',
      padding: '0',
      extraStyle: 'body{display:flex;justify-content:center}',
    });
    if (!opened) {
      document.body.dataset.labelSize = sz;
      printWithBodyClass('print-label');
    }
  }

  function printRecipeCard(r) {
    const curLabel = localStorage.getItem('kiteline.labelSize') || '62';
    const body = `${recipeCardPrintHtml(r, r.servings || 1)}
      <div id="recipeLabelWrap" class="recipe-label-wrap" aria-hidden="true">${recipePrepLabelHtml(r, r.servings || 1, curLabel)}</div>
      <div class="recipe-card__actions no-print">
        <div class="w-full max-w-sm text-left mx-auto mb-2">
          <label class="label">Label printer roll</label>
          <select id="recipeLabelSize" class="select">
            <option value="62" ${curLabel==='62'?'selected':''}>62 mm ? Brother QL-800 / QL-810W</option>
            <option value="5030" ${curLabel==='5030'?'selected':''}>50?30 mm die-cut</option>
            <option value="a4" ${curLabel==='a4'?'selected':''}>A4 sheet</option>
          </select>
        </div>
        <div class="flex flex-wrap gap-2 justify-center w-full">
          <button class="btn btn-primary" id="doRecipePrint">${icon('print','ico')} Print recipe (A4)</button>
          <button class="btn btn-ghost" id="doRecipeLabelPrint">${icon('labels','ico')} Print label</button>
        </div>
        <p class="text-xs text-ink-500 text-center max-w-lg">Recipe card opens in a print window (allow pop-ups). Scale quantity first if needed.</p>
      </div>`;
    recipePreviewModal(r.name, body);
    const refreshLabel = () => {
      const input = document.getElementById('rcScaleInput');
      const target = input ? Math.max(1, parseInt(input.value, 10) || r.servings || 1) : (r.servings || 1);
      const sz = document.getElementById('recipeLabelSize');
      const wrap = document.getElementById('recipeLabelWrap');
      if (wrap) wrap.innerHTML = recipePrepLabelHtml(r, target, sz ? sz.value : curLabel);
    };
    window._rcRefreshLabel = refreshLabel;
    wireRecipeCardScaling(r);
    const szEl = document.getElementById('recipeLabelSize');
    if (szEl) szEl.onchange = () => { localStorage.setItem('kiteline.labelSize', szEl.value); refreshLabel(); };
    refreshLabel();
    document.getElementById('doRecipePrint').onclick = () => printRecipeCardPopup();
    document.getElementById('doRecipeLabelPrint').onclick = () => {
      const sz = document.getElementById('recipeLabelSize').value;
      localStorage.setItem('kiteline.labelSize', sz);
      refreshLabel();
      printRecipeLabelPopup();
    };
  }
  function resizeImage(file, cb) {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const max = 700; let w = img.width, h = img.height;
        if (w > max) { h = Math.round(h * max / w); w = max; }
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        cb(c.toDataURL('image/jpeg', 0.75));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }
  function resizeDataUrl(dataUrl, cb) {
    const img = new Image();
    img.onload = () => {
      const max = 700; let w = img.width, h = img.height;
      if (w > max) { h = Math.round(h * max / w); w = max; }
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      c.getContext('2d').drawImage(img, 0, 0, w, h);
      cb(c.toDataURL('image/jpeg', 0.75));
    };
    img.onerror = () => cb(dataUrl);
    img.src = dataUrl;
  }

  function recipes() {
    const list = (S.db.recipes || []).filter(r => r.site === S.db.currentSite);
    const card = (r) => {
      const mod = RN();
      const analysis = mod ? mod.analyzeRecipe(r, r.servings || 1) : null;
      const topFlags = mod && analysis ? mod.renderRecipeTopFlags(analysis, r) : '';
      const ingCount = (r.ingredientItems && r.ingredientItems.length) || (r.ingredients || []).length;
      return `<div class="card overflow-hidden fade-in flex flex-col">
      ${recipeImage(r)}
      <div class="p-4 flex flex-col flex-1">
        ${topFlags ? `<div class="recipe-grid-flags mb-2">${topFlags}</div>` : ''}
        <div class="flex items-start justify-between gap-2">
          <div><div class="font-bold leading-tight">${escapeHtml(r.name)}</div>
          <div class="text-xs text-ink-400 mt-0.5"><span class="badge badge-blue">${escapeHtml(r.category)}</span></div></div>
          <div class="text-right text-xs text-ink-400">Serves ${r.servings}<br>${(r.prepMins||0)+(r.cookMins||0)} min</div>
        </div>
        <div class="text-xs text-ink-500 mb-2 mt-2"><b>${ingCount}</b> ingredients ? <b>${r.stepByStep && (r.steps||[]).length ? r.steps.length : (r.method||[]).length}</b> steps ? food cost ${fmt.money(r.cost||0,S.db.org.currency)}</div>
        <div class="mt-auto flex flex-wrap gap-2 pt-2">
          <button class="btn btn-ghost btn-sm flex-1" data-view="${r.id}">View</button>
          <button class="btn btn-ghost btn-sm" data-print="${r.id}">${icon('print','ico')}</button>
          <button class="btn btn-ghost btn-sm" data-edit="${r.id}">Edit</button>
          <button class="btn btn-primary btn-sm" data-label="${r.id}">${icon('labels','ico')} Label</button>
        </div>
      </div>
    </div>`;
    };
    const html = `
      ${sectionHeader('Recipes','Standardised recipe cards with photos, allergens, costing & one-click labels', `
        <button class="btn btn-primary btn-sm" data-act="add">${icon('plus','ico')} Add recipe</button>`)}
      <div class="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">${list.map(card).join('') || '<p class="text-ink-400">No recipes yet ? add one.</p>'}</div>`;

    function form(existing) {
      const r = existing || { name:'', category:'Main', servings:4, prepMins:10, cookMins:20, allergens:[], ingredients:[], ingredientItems:[], method:[], proMethod:[], steps:[], stepByStep:false, image:null, proImage:null, cost:0 };
      const initialSteps = (r.stepByStep && r.steps && r.steps.length) ? r.steps : (r.method || []).map((t) => ({ text: t, image: null, video: null }));
      const mod = RN();
      const initialItems = mod ? mod.getItems(r) : [];
      const allCb = S.ALLERGENS.map(a=>`<label class="flex items-center gap-2 text-xs"><input type="checkbox" value="${a}" class="al accent-brand-600" ${r.allergens.includes(a)?'checked':''}>${a}</label>`).join('');
      const cats = ['Starter','Main','Dessert','Lunch','Side','Sauce','Breakfast'];
      modal((existing?'Edit':'Add')+' Recipe', `
        <div class="space-y-3">
          <div class="flex gap-3 items-center">
            <div id="imgPrev" class="w-24 h-24 rounded-xl overflow-hidden flex-none border border-ink-100">${recipeImage(r,false).replace('h-36','h-24')}</div>
            <div class="flex-1">
              <label class="label">Hero photo</label>
              <input id="rimg" type="file" accept="image/*" class="text-sm">
              <div class="flex flex-wrap gap-2 mt-2">
                <button type="button" class="btn btn-ghost btn-sm" id="rproimg">Create pro image</button>
                <button type="button" class="btn btn-ghost btn-sm" id="raiImage">${icon('image','ico')} AI photo</button>
                <button type="button" class="btn btn-ghost btn-sm" id="rclearimg">Remove photo</button>
              </div>
              <p class="text-xs text-ink-400 mt-1">Upload a photo, generate a Kiteline style image, or create an AI food photo.</p>
            </div>
          </div>
          <div><label class="label">Name</label><input id="rn" class="input" value="${escapeHtml(r.name)}" placeholder="Recipe name"></div>
          <div class="grid grid-cols-2 gap-2">
            <div><label class="label">Subtitle (optional)</label><input id="rsub" class="input" value="${escapeHtml(r.subtitle||'')}" placeholder="e.g. Vegan sandwiches"></div>
            <div><label class="label">Yield unit</label><input id="ryu" class="input" value="${escapeHtml(r.yieldUnit||'portions')}" placeholder="portions, sandwiches, litres?"></div>
          </div>
          <div class="grid grid-cols-4 gap-2">
            <div><label class="label">Category</label><select id="rc" class="select">${cats.map(c=>`<option ${c===r.category?'selected':''}>${c}</option>`).join('')}</select></div>
            <div><label class="label">Serves</label><input id="rs" type="number" class="input" value="${r.servings}"></div>
            <div><label class="label">Prep min</label><input id="rp" type="number" class="input" value="${r.prepMins}"></div>
            <div><label class="label">Cook min</label><input id="rk" type="number" class="input" value="${r.cookMins}"></div>
          </div>
          <div class="rounded-xl border border-brand-200 bg-brand-50/60 p-3 space-y-2">
            <div class="flex items-center justify-between gap-2">
              <span class="text-sm font-bold text-brand-800">${icon('rocket','ico')} AI recipe assistant</span>
              <span id="raiStatus" class="text-xs text-ink-400"></span>
            </div>
            <input id="raiHint" class="input text-sm" placeholder="Optional hint: e.g. vegan Thai curry, nut-free, mild spice">
            <div class="flex flex-wrap gap-2">
              <button type="button" class="btn btn-ghost btn-sm" id="raiIngredients">Suggest ingredients</button>
              <button type="button" class="btn btn-ghost btn-sm" id="raiParseToggle">Paste &amp; parse text</button>
              <button type="button" class="btn btn-ghost btn-sm" id="raiMethod">Write method</button>
            </div>
            <div id="raiParseWrap" class="hidden space-y-2">
              <textarea id="raiParseText" class="textarea text-sm" rows="2" placeholder="200g flour, 2 eggs, 100ml milk, pinch salt?"></textarea>
              <button type="button" class="btn btn-primary btn-sm" id="raiParse">Parse into ingredient lines</button>
            </div>
            <p class="text-xs text-ink-500">AI fills ingredients, method &amp; photos. Each company subscribes or uses their own OpenAI key ? see <b>Settings ? Recipe AI</b>.</p>
          </div>
          <div><label class="label">Food cost (${S.db.org.currency})</label><input id="rcost" type="number" step="0.1" class="input" value="${r.cost||0}"></div>
          <div>
            <div class="flex items-center justify-between gap-2 mb-2">
              <label class="label mb-0">Ingredients</label>
              <button type="button" class="btn btn-ghost btn-sm" id="ringAdd">${icon('plus','ico')} Add line</button>
            </div>
            <div id="ringBuilder" class="ing-builder"></div>
            <div id="ringSummary" class="ing-summary"></div>
            <p class="text-xs text-ink-400 mt-1">Enter name + quantity (g, kg, ml, tsp?). Allergens and nutrition are calculated automatically from each line.</p>
          </div>
          <div><label class="label">Method (one step per line)</label><textarea id="rmethod" class="textarea" rows="4">${escapeHtml((r.method||[]).join('\n'))}</textarea></div>
          <div class="border border-ink-100 rounded-xl p-3 space-y-2">
            <label class="flex items-center gap-2 text-sm font-semibold cursor-pointer">
              <input type="checkbox" id="rstepmode" class="accent-brand-600" ${r.stepByStep ? 'checked' : ''}>
              Step-by-step mode <span class="text-xs font-normal text-ink-400">(photo + short video per step)</span>
            </label>
            <div id="stepBuilderWrap" class="${r.stepByStep ? '' : 'hidden'}">
              <div class="flex justify-between items-center mb-2">
                <span class="text-xs text-ink-500">Build each step with optional photo and short video clip.</span>
                <button type="button" class="btn btn-ghost btn-sm" id="stepAdd">${icon('plus','ico')} Add step</button>
              </div>
              <div id="stepBuilder" class="step-builder"></div>
            </div>
          </div>
          <div id="plainProWrap" class="${r.stepByStep ? 'hidden' : ''}">
          <div><label class="label">Pro method (one step per line)</label><textarea id="rpro" class="textarea" rows="4" placeholder="Professional kitchen steps ? temps, CCP, holding, plating?">${escapeHtml((r.proMethod||[]).join('\n'))}</textarea>
          <p class="text-xs text-ink-400 mt-1">Chef-level instructions: probe temps, batch prep, hot hold, allergen checks.</p></div>
          </div>
          <div><label class="label">Chef notes (optional)</label><textarea id="rchef" class="textarea" rows="2" placeholder="Scaling tips, seasoning, service notes?">${escapeHtml(r.chefNotes||'')}</textarea></div>
          <div><label class="label">Extra allergens (manual)</label><p class="text-xs text-ink-400 mb-1">Tick any not already detected from ingredients.</p><div class="grid grid-cols-2 gap-1 max-h-40 overflow-auto p-2 border border-ink-100 rounded-lg">${allCb}</div></div>
          <button class="btn btn-primary w-full" id="rsave">${existing?'Save changes':'Add recipe'}</button>
        </div>`, { wide:true });

      let imgData = r.image;
      let proImgData = r.proImage;
      const servingsInput = document.getElementById('rs');
      const stepBuilderEl = document.getElementById('stepBuilder');
      const stepBuilder = mountStepBuilder(stepBuilderEl, initialSteps);
      const toggleStepMode = () => {
        const on = document.getElementById('rstepmode').checked;
        document.getElementById('stepBuilderWrap').classList.toggle('hidden', !on);
        document.getElementById('plainProWrap').classList.toggle('hidden', on);
        if (on) {
          const lines = document.getElementById('rmethod').value.split('\n').map((s) => s.trim()).filter(Boolean);
          if (lines.length) stepBuilder.syncFromTextarea(lines);
        }
      };
      document.getElementById('rstepmode').onchange = toggleStepMode;
      document.getElementById('stepAdd').onclick = () => stepBuilder.addRow();
      document.getElementById('rproimg').onclick = () => {
        const name = document.getElementById('rn').value.trim() || 'Recipe';
        const cat = document.getElementById('rc').value;
        const media = RM();
        if (!media) return;
        media.generateProImage(name, cat, (data) => {
          proImgData = data;
          imgData = null;
          document.getElementById('imgPrev').innerHTML = `<img src="${data}" class="w-full h-24 object-cover">`;
          toast('Pro hero image created');
        });
      };
      document.getElementById('rclearimg').onclick = () => {
        imgData = null;
        proImgData = null;
        document.getElementById('imgPrev').innerHTML = recipeImage({ name: document.getElementById('rn').value || '?' }, false).replace('h-36', 'h-24');
      };
      const builder = mountIngredientBuilder(
        document.getElementById('ringBuilder'),
        initialItems.length ? initialItems : null,
        servingsInput,
        document.getElementById('ringSummary')
      );
      document.getElementById('ringAdd').onclick = () => builder.addRow();
      if (servingsInput) servingsInput.oninput = () => builder.refresh();

      const aiPayload = () => ({
        name: document.getElementById('rn').value.trim(),
        category: document.getElementById('rc').value,
        servings: Math.max(1, +document.getElementById('rs').value || 4),
        description: document.getElementById('raiHint').value.trim(),
      });
      const withAi = async (btn, fn) => {
        const ai = window.RecipeAi;
        if (!ai) return toast('AI module not loaded', 'warn');
        const st = await ai.getStatus();
        if (!st.enabled) {
          return toast(st.message || 'Recipe AI not enabled ? open Settings to subscribe or add your OpenAI key', 'warn');
        }
        const label = btn.innerHTML;
        btn.disabled = true;
        btn.textContent = 'Working?';
        try { await fn(); } catch (e) { toast(e.message || 'AI failed', 'error'); }
        finally { btn.disabled = false; btn.innerHTML = label; }
      };
      window.RecipeAi && window.RecipeAi.getStatus().then((st) => {
        const el = document.getElementById('raiStatus');
        if (!el) return;
        if (st.enabled) {
          const mode = st.mode === 'byok' ? 'Your OpenAI key' : st.mode === 'kiteline' ? 'Kiteline plan' : st.mode === 'granted' ? 'Enabled by Kiteline' : 'Ready';
          el.textContent = mode;
          el.className = 'text-xs text-brand-700 font-semibold';
        } else {
          el.textContent = 'Not enabled ? Settings';
          el.className = 'text-xs text-amber-700 font-semibold';
        }
      });
      document.getElementById('raiParseToggle').onclick = () => {
        document.getElementById('raiParseWrap').classList.toggle('hidden');
      };
      document.getElementById('raiIngredients').onclick = () => withAi(document.getElementById('raiIngredients'), async () => {
        const payload = aiPayload();
        if (!payload.name) return toast('Enter a recipe name first', 'warn');
        toast('AI suggesting ingredients?');
        const res = await window.RecipeAi.suggestIngredients(payload);
        if (!res.ingredients || !res.ingredients.length) return toast('No ingredients returned', 'warn');
        builder.setRows(res.ingredients);
        toast('Ingredients added ? review quantities');
      });
      document.getElementById('raiParse').onclick = () => withAi(document.getElementById('raiParse'), async () => {
        const text = document.getElementById('raiParseText').value.trim();
        if (!text) return toast('Paste ingredient text first', 'warn');
        toast('AI parsing ingredients?');
        const res = await window.RecipeAi.parseIngredients(Object.assign({ text }, aiPayload()));
        if (!res.ingredients || !res.ingredients.length) return toast('Could not parse ingredients', 'warn');
        builder.setRows(res.ingredients);
        document.getElementById('raiParseWrap').classList.add('hidden');
        toast('Ingredients parsed ? check each line');
      });
      document.getElementById('raiMethod').onclick = () => withAi(document.getElementById('raiMethod'), async () => {
        const payload = aiPayload();
        if (!payload.name) return toast('Enter a recipe name first', 'warn');
        const rows = builder.getRows().filter((row) => row.name.trim());
        if (!rows.length) return toast('Add ingredients first (or use AI suggest)', 'warn');
        toast('AI writing method?');
        const res = await window.RecipeAi.generateMethod(Object.assign({ ingredients: rows }, payload));
        if (res.subtitle) document.getElementById('rsub').value = res.subtitle;
        if (res.prepMins) document.getElementById('rp').value = res.prepMins;
        if (res.cookMins) document.getElementById('rk').value = res.cookMins;
        if (res.method && res.method.length) {
          document.getElementById('rmethod').value = res.method.join('\n');
          if (document.getElementById('rstepmode').checked) stepBuilder.syncFromTextarea(res.method);
        }
        if (res.proMethod && res.proMethod.length) document.getElementById('rpro').value = res.proMethod.join('\n');
        if (res.chefNotes) document.getElementById('rchef').value = res.chefNotes;
        toast('Method written ? review before saving');
      });
      document.getElementById('raiImage').onclick = () => withAi(document.getElementById('raiImage'), async () => {
        const payload = aiPayload();
        if (!payload.name) return toast('Enter a recipe name first', 'warn');
        toast('AI creating photo ? may take 20 seconds?');
        const res = await window.RecipeAi.generateImage(payload);
        if (!res.image) return toast('No image returned', 'warn');
        resizeDataUrl(res.image, (data) => {
          imgData = data;
          proImgData = null;
          document.getElementById('imgPrev').innerHTML = `<img src="${data}" class="w-full h-24 object-cover">`;
          toast('AI photo ready');
        });
      });

      document.getElementById('rimg').onchange = (e) => {
        const f = e.target.files[0]; if (!f) return;
        resizeImage(f, (data) => { imgData = data; document.getElementById('imgPrev').innerHTML = `<img src="${data}" class="w-full h-24 object-cover">`; });
      };
      document.getElementById('rsave').onclick = () => {
        const name = document.getElementById('rn').value.trim(); if (!name) return toast('Enter a name','warn');
        const modSave = RN();
        const formRows = builder.getRows();
        const ingredientItems = modSave ? modSave.serializeItemsFromForm(formRows) : [];
        const manualAllergens = [...document.querySelectorAll('.al:checked')].map(c=>c.value);
        const detectedAllergens = modSave ? modSave.mergeAllergens(ingredientItems, []) : [];
        const allergens = [...new Set([...detectedAllergens, ...manualAllergens])];
        const stepByStep = document.getElementById('rstepmode').checked;
        const steps = stepByStep ? stepBuilder.getRows() : [];
        const methodLines = stepByStep
          ? steps.map((s) => s.text).filter(Boolean)
          : document.getElementById('rmethod').value.split('\n').map(s=>s.trim()).filter(Boolean);
        const obj = {
          name, category:document.getElementById('rc').value,
          subtitle:document.getElementById('rsub').value.trim(),
          yieldUnit:document.getElementById('ryu').value.trim()||'portions',
          servings:+document.getElementById('rs').value||1, prepMins:+document.getElementById('rp').value||0, cookMins:+document.getElementById('rk').value||0,
          cost:+document.getElementById('rcost').value||0,
          chefNotes:document.getElementById('rchef').value.trim(),
          ingredientItems,
          ingredients: modSave ? modSave.itemsToLegacyLines(ingredientItems) : formRows.map(row => row.name).filter(Boolean),
          method: methodLines,
          proMethod: document.getElementById('rpro').value.split('\n').map(s=>s.trim()).filter(Boolean),
          stepByStep,
          steps: stepByStep ? steps : [],
          allergens,
          image: imgData,
          proImage: proImgData,
        };
        if (existing) { Object.assign(existing, obj); }
        else { S.db.recipes.unshift(Object.assign({ id:S.uid('r'), site:S.db.currentSite }, obj)); }
        S.persist(); closeModal(); window.App.render(); toast('Recipe saved');
      };
    }

    function view(r) {
      printRecipeCard(r);
    }

    function makeLabel(r) {
      const mod = RN();
      const allergens = mod ? mod.analyzeRecipe(r, r.servings || 1).allergens : (r.allergens || []);
      S.db.labels.unshift({ id:S.uid('lbl'), product:r.name, site:S.db.currentSite, prepped:S.now(), shelfDays:2, by:'u_sarah', allergens });
      S.persist(); closeModal(); toast('Label created from recipe'); location.hash = 'labels';
    }

    return { title:'Recipes', html, mount() {
      document.querySelector('[data-act="add"]').onclick = () => form(null);
      document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>form(S.db.recipes.find(x=>x.id===b.dataset.edit)));
      document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>view(S.db.recipes.find(x=>x.id===b.dataset.view)));
      document.querySelectorAll('[data-print]').forEach(b=>b.onclick=()=>printRecipeCard(S.db.recipes.find(x=>x.id===b.dataset.print)));
      document.querySelectorAll('[data-label]').forEach(b=>b.onclick=()=>makeLabel(S.db.recipes.find(x=>x.id===b.dataset.label)));
    }};
  }

  /* ---------------- SUPPLIERS (approved register) ---------------- */
  const kpiCard = (label, val, ic) => `
    <div class="kpi fade-in flex items-center gap-3">
      <span class="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center flex-none">${icon(ic,'w-5 h-5')}</span>
      <div><div class="v">${val}</div><div class="text-ink-500 text-xs font-semibold uppercase tracking-wide">${label}</div></div>
    </div>`;
  function daysUntil(iso) { return Math.round((new Date(iso).getTime() - Date.now()) / 864e5); }
  function expiryBadge(iso) {
    const d = daysUntil(iso);
    if (d < 0) return `<span class="badge badge-red">Expired ${Math.abs(d)}d ago</span>`;
    if (d <= 30) return `<span class="badge badge-amber">Expires in ${d}d</span>`;
    return `<span class="badge badge-green">Valid ? ${fmt.date(iso)}</span>`;
  }
  function stars(n) { return '<span class="text-amber-500">'+'?'.repeat(n)+'<span class="text-ink-200">'+'?'.repeat(5-n)+'</span></span>'; }

  function suppliers() {
    const list = S.db.suppliers;
    const statusBadge = (s)=> s==='Approved'?'<span class="badge badge-green">Approved</span>':s==='Pending'?'<span class="badge badge-amber">Pending</span>':'<span class="badge badge-red">Suspended</span>';
    const rows = list.map(s=>`<tr>
      <td><div class="font-semibold">${escapeHtml(s.name)}</div><div class="text-xs text-ink-400">${escapeHtml(s.contact)} ? ${escapeHtml(s.phone||'')}</div></td>
      <td>${escapeHtml(s.category)}</td>
      <td>${statusBadge(s.status)}</td>
      <td>${stars(s.rating)}</td>
      <td>${fmt.date(s.lastAudit)}</td>
      <td>${expiryBadge(s.certExpiry)}</td>
      <td class="text-right"><button class="btn btn-ghost btn-sm" data-edit="${s.id}">Edit</button></td>
    </tr>`).join('');
    const approved = list.filter(s=>s.status==='Approved').length;
    const expiring = list.filter(s=>daysUntil(s.certExpiry)<=30).length;
    const html = `
      ${sectionHeader('Approved Suppliers','Due-diligence register ? approval status, audits and certificate tracking', `<button class="btn btn-primary btn-sm" data-act="add">${icon('plus','ico')} Add supplier</button>`)}
      <div class="grid sm:grid-cols-3 gap-4 mb-5">
        ${kpiCard('Total suppliers', list.length, 'truck')}
        ${kpiCard('Approved', approved, 'check')}
        ${kpiCard('Certs expiring ?30d', expiring, 'alert')}
      </div>
      <div class="card overflow-hidden">
        <table class="table"><thead><tr><th>Supplier</th><th>Category</th><th>Status</th><th>Rating</th><th>Last audit</th><th>Certificate</th><th></th></tr></thead><tbody>${rows}</tbody></table>
      </div>`;
    return { title:'Suppliers', html, mount() {
      const open = (sup) => {
        const e = sup || { name:'', category:'', status:'Pending', contact:'', phone:'', rating:3, lastAudit:new Date().toISOString(), certExpiry:new Date(Date.now()+365*864e5).toISOString() };
        modal(sup?'Edit Supplier':'Add Supplier', `<div class="space-y-3">
          <input id="sn" class="input" placeholder="Supplier name" value="${escapeHtml(e.name)}">
          <input id="sc" class="input" placeholder="Category (e.g. Meat & Poultry)" value="${escapeHtml(e.category)}">
          <div class="grid grid-cols-2 gap-3">
            <select id="ss" class="select">${['Approved','Pending','Suspended'].map(x=>`<option ${x===e.status?'selected':''}>${x}</option>`).join('')}</select>
            <select id="sr" class="select">${[1,2,3,4,5].map(x=>`<option value="${x}" ${x===e.rating?'selected':''}>${x} star${x>1?'s':''}</option>`).join('')}</select>
          </div>
          <input id="se" class="input" placeholder="Email" value="${escapeHtml(e.contact)}">
          <input id="sp" class="input" placeholder="Phone" value="${escapeHtml(e.phone||'')}">
          <label class="label">Certificate expiry</label>
          <input id="sx" type="date" class="input" value="${e.certExpiry.slice(0,10)}">
          <button class="btn btn-primary w-full" id="sv">${sup?'Save':'Add supplier'}</button></div>`);
        document.getElementById('sv').onclick=()=>{
          const name=document.getElementById('sn').value.trim(); if(!name)return toast('Enter a name','warn');
          const data={ name, category:document.getElementById('sc').value||'General', status:document.getElementById('ss').value,
            rating:+document.getElementById('sr').value, contact:document.getElementById('se').value, phone:document.getElementById('sp').value,
            certExpiry:new Date(document.getElementById('sx').value).toISOString() };
          if(sup){ Object.assign(sup,data); } else { S.db.suppliers.push(Object.assign({id:S.uid('sup'),lastAudit:new Date().toISOString()},data)); }
          S.persist(); closeModal(); window.App.render(); toast(sup?'Supplier updated':'Supplier added');
        };
      };
      document.querySelector('[data-act="add"]').onclick=()=>open(null);
      document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>open(S.db.suppliers.find(x=>x.id===b.dataset.edit)));
    }};
  }

  /* ---------------- TRAINING & CERTIFICATES ---------------- */
  function training() {
    const list = S.db.training;
    const trStatus = (iso)=>{ const d=daysUntil(iso); return d<0?'Expired':d<=30?'Expiring':'Valid'; };
    const rows = list.map(t=>{
      const m=S.member(t.person)||{name:t.person,initials:'?'};
      return `<tr>
        <td><div class="flex items-center gap-2"><div class="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-xs">${m.initials}</div>${escapeHtml(m.name)}</div></td>
        <td class="font-medium">${escapeHtml(t.course)}</td>
        <td>${fmt.date(t.completed)}</td>
        <td>${expiryBadge(t.expires)}</td>
      </tr>`;
    }).join('');
    const expired = list.filter(t=>daysUntil(t.expires)<0).length;
    const expiring = list.filter(t=>{const d=daysUntil(t.expires);return d>=0&&d<=30;}).length;
    const valid = list.length-expired-expiring;
    const html = `
      ${sectionHeader('Training & Certificates','Staff qualifications with automatic renewal tracking', `<button class="btn btn-primary btn-sm" data-act="add">${icon('plus','ico')} Add record</button>`)}
      <div class="grid sm:grid-cols-3 gap-4 mb-5">
        ${kpiCard('Valid', valid, 'check')}
        ${kpiCard('Expiring ?30d', expiring, 'alert')}
        ${kpiCard('Expired', expired, 'alert')}
      </div>
      <div class="card overflow-hidden">
        <table class="table"><thead><tr><th>Staff member</th><th>Course</th><th>Completed</th><th>Certificate</th></tr></thead><tbody>${rows}</tbody></table>
      </div>`;
    return { title:'Training', html, mount() {
      document.querySelector('[data-act="add"]').onclick=()=>{
        const courses=['Level 2 Food Hygiene','Level 3 Food Safety','Allergen Awareness','HACCP Principles','Personal Licence','First Aid at Work','Fire Safety'];
        modal('Add Training Record', `<div class="space-y-3">
          <select id="tp" class="select">${S.db.team.map(m=>`<option value="${m.id}">${escapeHtml(m.name)}</option>`).join('')}</select>
          <select id="tc" class="select">${courses.map(c=>`<option>${c}</option>`).join('')}</select>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="label">Completed</label><input id="td" type="date" class="input" value="${new Date().toISOString().slice(0,10)}"></div>
            <div><label class="label">Expires</label><input id="tx" type="date" class="input" value="${new Date(Date.now()+730*864e5).toISOString().slice(0,10)}"></div>
          </div>
          <button class="btn btn-primary w-full" id="ts">Add record</button></div>`);
        document.getElementById('ts').onclick=()=>{
          S.db.training.push({ id:S.uid('tr'), person:document.getElementById('tp').value, course:document.getElementById('tc').value,
            completed:new Date(document.getElementById('td').value).toISOString(), expires:new Date(document.getElementById('tx').value).toISOString() });
          S.persist(); closeModal(); window.App.render(); toast('Training record added');
        };
      };
    }};
  }

  /* ---------------- INCIDENTS & CORRECTIVE ACTIONS ---------------- */
  function incidents() {
    const list = S.db.incidents.slice().sort((a,b)=>new Date(b.at)-new Date(a.at));
    const sevBadge=(s)=> s==='High'?'<span class="badge badge-red">High</span>':s==='Medium'?'<span class="badge badge-amber">Medium</span>':'<span class="badge badge-gray">Low</span>';
    const stBadge=(s)=> s==='Closed'?'<span class="badge badge-green">Closed</span>':s==='In progress'?'<span class="badge badge-amber">In progress</span>':'<span class="badge badge-red">Open</span>';
    const cards = list.map(i=>{
      const m=S.member(i.reportedBy)||{name:i.reportedBy};
      return `<div class="card card-pad fade-in">
        <div class="flex items-start justify-between gap-3 mb-2">
          <div><div class="font-bold">${escapeHtml(i.title)}</div>
          <div class="text-xs text-ink-400">${escapeHtml(i.type)} ? ${escapeHtml(S.site(i.site).name)} ? ${fmt.ago(i.at)} ? by ${escapeHtml(m.name)}</div></div>
          <div class="flex flex-col items-end gap-1">${sevBadge(i.severity)}${stBadge(i.status)}</div>
        </div>
        <div class="text-sm text-ink-600 mt-2"><span class="font-semibold text-ink-700">Corrective action:</span> ${i.action?escapeHtml(i.action):'<span class="text-ink-400">None recorded yet</span>'}</div>
        <div class="flex gap-2 mt-3">
          <button class="btn btn-ghost btn-sm" data-action="${i.id}">${icon('edit','ico')} Action</button>
          ${i.status!=='Closed'?`<button class="btn btn-ghost btn-sm" data-close="${i.id}">${icon('check','ico')} Mark closed</button>`:''}
        </div>
      </div>`;
    }).join('');
    const open = list.filter(i=>i.status!=='Closed').length;
    const html = `
      ${sectionHeader('Incidents & Corrective Actions','Accidents, complaints, pests and equipment faults ? logged with actions taken', `<button class="btn btn-primary btn-sm" data-act="add">${icon('plus','ico')} Report incident</button>`)}
      <div class="grid sm:grid-cols-3 gap-4 mb-5">
        ${kpiCard('Total logged', list.length, 'shield')}
        ${kpiCard('Open / in progress', open, 'alert')}
        ${kpiCard('Closed', list.length-open, 'check')}
      </div>
      <div class="grid md:grid-cols-2 gap-5">${cards}</div>`;
    return { title:'Incidents', html, mount() {
      document.querySelector('[data-act="add"]').onclick=()=>{
        const types=['Accident','Complaint','Pest','Equipment','Food safety','Other'];
        modal('Report Incident', `<div class="space-y-3">
          <input id="it" class="input" placeholder="Short title">
          <div class="grid grid-cols-2 gap-3">
            <select id="iy" class="select">${types.map(x=>`<option>${x}</option>`).join('')}</select>
            <select id="is" class="select">${['Low','Medium','High'].map(x=>`<option ${x==='Medium'?'selected':''}>${x}</option>`).join('')}</select>
          </div>
          <textarea id="ia" class="input" rows="3" placeholder="Corrective action taken (optional)"></textarea>
          <button class="btn btn-primary w-full" id="iv">Log incident</button></div>`);
        document.getElementById('iv').onclick=()=>{
          const title=document.getElementById('it').value.trim(); if(!title)return toast('Enter a title','warn');
          const action=document.getElementById('ia').value.trim();
          S.db.incidents.push({ id:S.uid('inc'), title, type:document.getElementById('iy').value, site:S.db.currentSite,
            severity:document.getElementById('is').value, reportedBy:(S.member&&S.db.team[0]?S.db.team[0].id:'u_sarah'), at:new Date().toISOString(),
            status: action?'In progress':'Open', action });
          S.persist(); closeModal(); window.App.render(); toast('Incident logged');
        };
      };
      document.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>{
        const inc=S.db.incidents.find(x=>x.id===b.dataset.action);
        modal('Corrective Action', `<div class="space-y-3">
          <textarea id="ca" class="input" rows="4" placeholder="Describe the action taken?">${escapeHtml(inc.action||'')}</textarea>
          <select id="cs" class="select">${['Open','In progress','Closed'].map(x=>`<option ${x===inc.status?'selected':''}>${x}</option>`).join('')}</select>
          <button class="btn btn-primary w-full" id="cv">Save</button></div>`);
        document.getElementById('cv').onclick=()=>{ inc.action=document.getElementById('ca').value.trim(); inc.status=document.getElementById('cs').value; S.persist(); closeModal(); window.App.render(); toast('Action saved'); };
      });
      document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>{ const inc=S.db.incidents.find(x=>x.id===b.dataset.close); inc.status='Closed'; S.persist(); window.App.render(); toast('Incident closed'); });
    }};
  }

  /* ---------------- HOME / LIVE WORKFLOW DASHBOARD ---------------- */
  const WF_META = {
    completed: { dot:'??', badge:'badge-green', row:'', label:'Completed' },
    in_progress: { dot:'??', badge:'badge-amber', row:'wf-live-row', label:'In Progress' },
    overdue: { dot:'??', badge:'badge-red', row:'wf-overdue-row', label:'Overdue' },
    scheduled: { dot:'??', badge:'badge-blue', row:'', label:'Scheduled' },
  };
  const isToday = (iso) => iso && new Date(iso).toDateString() === new Date().toDateString();
  function wfItemHtml(w) {
    const m = WF_META[w.status] || WF_META.scheduled;
    const who = S.member(w.assignee);
    const go = w.route ? ` data-go="${w.route}" role="button" tabindex="0"` : '';
    return `<div class="wf-item ${m.row} fade-in"${go}>
      <span class="wf-dot">${m.dot}</span>
      <div class="flex-1 min-w-0">
        <div class="text-sm font-semibold">${escapeHtml(w.label)}</div>
        <div class="text-xs text-ink-400">${escapeHtml(w.category)} ? ${escapeHtml(who.name)} ? ${fmt.ago(w.updatedAt || w.completedAt || w.startedAt || w.dueAt)}</div>
      </div>
      <span class="badge ${m.badge} flex-none text-[10px]">${m.label}</span>
    </div>`;
  }

  const WF_PAGE_SIZE = 10;
  window.WfPage = window.WfPage || {};
  function wfPaginate(routeId, items) {
    const total = Math.max(1, Math.ceil(items.length / WF_PAGE_SIZE));
    const pg = Math.min(Math.max(0, window.WfPage[routeId] || 0), total - 1);
    window.WfPage[routeId] = pg;
    const slice = items.slice(pg * WF_PAGE_SIZE, (pg + 1) * WF_PAGE_SIZE);
    const pages = Array.from({ length: total }, (_, i) =>
      `<button class="btn btn-sm ${i === pg ? 'btn-primary' : 'btn-ghost'}" data-wfpg="${routeId}:${i}">${i + 1}</button>`
    ).join('');
    return { slice, pg, total, pages, start: pg * WF_PAGE_SIZE + 1, end: Math.min((pg + 1) * WF_PAGE_SIZE, items.length) };
  }
  function wfTableRow(w) {
    const m = WF_META[w.status] || WF_META.scheduled;
    const who = S.member(w.assignee);
    return `<tr class="fade-in">
      <td>${m.dot}</td>
      <td><div class="font-semibold text-sm">${escapeHtml(w.label)}</div></td>
      <td class="text-xs text-ink-500">${escapeHtml(w.category)}</td>
      <td>${escapeHtml(who.name)}</td>
      <td><span class="badge ${m.badge}">${m.label}</span></td>
      <td class="text-xs text-ink-400">${fmt.ago(w.updatedAt || w.completedAt || w.dueAt)}</td>
      <td>${w.route ? `<a href="#${w.route}" class="text-brand-600 text-xs font-semibold">Open</a>` : '?'}</td>
    </tr>`;
  }
  function workflowListPage(routeId, title, subtitle, iconName, items, extraHtml) {
    const pag = wfPaginate(routeId, items);
    const html = `
      ${sectionHeader(title, subtitle + ` ? ${items.length} total ? 10 per page`, `<a href="#home" class="btn btn-ghost btn-sm">${icon('chevron','ico')} Back to Home</a>`)}
      <div class="flex flex-wrap gap-2 mb-4 text-xs">
        <span class="badge badge-green">?? Completed</span>
        <span class="badge badge-amber">?? In Progress</span>
        <span class="badge badge-red">?? Overdue</span>
        <span class="badge badge-blue">?? Scheduled</span>
      </div>
      ${extraHtml || ''}
      <div class="card overflow-hidden mb-4">
        <table class="table">
          <thead><tr><th></th><th>Activity</th><th>Category</th><th>Staff</th><th>Status</th><th>Updated</th><th></th></tr></thead>
          <tbody>${pag.slice.length ? pag.slice.map(wfTableRow).join('') : `<tr><td colspan="7" class="text-center text-ink-400 py-8">No items on this page.</td></tr>`}</tbody>
        </table>
      </div>
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="text-sm text-ink-500">Showing ${items.length ? pag.start : 0}?${pag.end} of ${items.length} ? Page ${pag.pg + 1} of ${pag.total}</div>
        <div class="flex flex-wrap gap-1">${pag.pages}</div>
      </div>`;
    return { title, html, mount() {
      document.querySelectorAll('[data-wfpg]').forEach(b => b.onclick = () => {
        const [rid, p] = b.dataset.wfpg.split(':');
        window.WfPage[rid] = parseInt(p, 10);
        window.App.render();
      });
      document.querySelectorAll('.wf-item[data-go]').forEach(el => {
        el.style.cursor = 'pointer';
        el.onclick = () => { location.hash = el.dataset.go; };
      });
    }};
  }

  function wfStats() {
    const site = S.db.currentSite;
    const workflows = S.workflowsForSite(site);
    const siteSensors = S.sensorsForSite(site);
    const breaches = siteSensors.filter(s => s.temp > s.max || s.temp < s.min).length;
    const tempCompliance = Math.round((siteSensors.length - breaches) / (siteSensors.length || 1) * 100);
    const deliveriesToday = (S.db.deliveries || []).filter(d => d.site === site && isToday(d.at));
    const prepLive = workflows.filter(w => w.category === 'Food Preparation');
    const prepPct = Math.round(prepLive.filter(w => w.status === 'completed').length / (prepLive.length || 1) * 100);
    const cleaningTasks = workflows.filter(w => /clean|Cleaning|log signed/i.test(w.label));
    const cleaningPct = Math.round(cleaningTasks.filter(w => w.status === 'completed').length / (cleaningTasks.length || 1) * 100);
    const haccpTasks = workflows.filter(w => w.category === 'HACCP & Compliance' || w.category === 'Fridge & Freezer Logs');
    const haccpPct = Math.round(haccpTasks.filter(w => w.status === 'completed').length / (haccpTasks.length || 1) * 100);
    const wfDone = workflows.filter(w => w.status === 'completed').length;
    const kitchenScore = Math.min(100, Math.round(wfDone / (workflows.length || 1) * 55 + tempCompliance * 0.25 + haccpPct * 0.2));
    return { workflows, site, tempCompliance, deliveriesToday, prepLive, prepPct, cleaningTasks, cleaningPct, haccpTasks, haccpPct, kitchenScore, breaches };
  }

  function wflive() {
    const { workflows } = wfStats();
    const items = workflows.filter(w => w.status === 'in_progress').sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    return workflowListPage('wflive', 'Happening Now', 'Live activities in progress across the kitchen', 'temp', items);
  }
  function wfdone() {
    const { workflows } = wfStats();
    const items = workflows.filter(w => w.status === 'completed' && isToday(w.completedAt)).sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
    return workflowListPage('wfdone', 'Completed Today', 'Tasks finished today with timestamps', 'check', items);
  }
  function wfout() {
    const { workflows } = wfStats();
    const items = workflows.filter(w => w.status === 'scheduled' || w.status === 'in_progress');
    return workflowListPage('wfout', 'Outstanding Tasks', 'Scheduled and in-progress work still to finish', 'layers', items);
  }
  function wfod() {
    const { workflows } = wfStats();
    const items = workflows.filter(w => w.status === 'overdue');
    return workflowListPage('wfod', 'Overdue Tasks', 'Past-due items needing immediate action', 'alert', items);
  }
  function wfstaff() {
    const site = S.db.currentSite;
    const staff = staffActiveList(site);
    const rows = staff.flatMap(s => {
      if (!s.tasks.length) {
        return [{ staffName: s.name, staffInitials: s.initials, staffRole: s.role, label: s.onClock ? 'On shift (clocked in)' : 'Active', category: '?', status: s.onClock ? 'clock' : 'task', updatedAt: new Date().toISOString(), isFirst: true }];
      }
      return s.tasks.map((t, i) => ({
        ...t, staffName: s.name, staffInitials: s.initials, staffRole: s.role,
        onClock: s.onClock, isFirst: i === 0,
      }));
    });
    const pag = wfPaginate('wfstaff', rows);
    const tbody = pag.slice.map(r => `<tr>
      <td>${r.isFirst ? `<div class="flex items-center gap-2"><div class="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-xs">${escapeHtml(r.staffInitials)}</div><div><div class="font-semibold text-sm">${escapeHtml(r.staffName)}</div><div class="text-xs text-ink-400">${escapeHtml(r.staffRole)}</div></div></div>` : ''}</td>
      <td class="font-semibold text-sm">${escapeHtml(r.label)}</td>
      <td class="text-xs text-ink-500">${escapeHtml(r.category)}</td>
      <td><span class="badge ${r.onClock ? 'badge-green' : 'badge-amber'}">${r.onClock ? 'Clocked in' : 'In progress'}</span></td>
      <td class="text-xs text-ink-400">${fmt.ago(r.updatedAt)}</td>
    </tr>`).join('');
    const html = `
      ${sectionHeader('Staff Currently Working', `${staff.length} on shift (clock + active tasks) ? 10 per page`, `<a href="#clock" class="btn btn-primary btn-sm">${icon('clock','ico')} Clock</a><a href="#rota" class="btn btn-ghost btn-sm">${icon('team','ico')} Rota</a><a href="#home" class="btn btn-ghost btn-sm">Home</a>`)}
      <div class="card overflow-hidden mb-4">
        <table class="table"><thead><tr><th>Staff</th><th>Active task</th><th>Category</th><th>Status</th><th>Updated</th></tr></thead>
        <tbody>${tbody || '<tr><td colspan="5" class="text-center py-8 text-ink-400">No staff on active tasks.</td></tr>'}</tbody></table>
      </div>
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="text-sm text-ink-500">Page ${pag.pg + 1} of ${pag.total}</div>
        <div class="flex flex-wrap gap-1">${pag.pages}</div>
      </div>`;
    return { title:'Staff Working', html, mount() {
      document.querySelectorAll('[data-wfpg]').forEach(b => b.onclick = () => {
        const [, p] = b.dataset.wfpg.split(':');
        window.WfPage.wfstaff = parseInt(p, 10);
        window.App.render();
      });
    }};
  }
  function wfdel() {
    const { workflows, deliveriesToday } = wfStats();
    const items = workflows.filter(w => w.category === 'Supplier Management');
    const extra = `<div class="grid sm:grid-cols-3 gap-4 mb-4">
      <div class="kpi"><div class="text-xs text-ink-500">Received today</div><div class="v text-brand-600">${deliveriesToday.length}</div></div>
      <div class="kpi"><div class="text-xs text-ink-500">In pipeline</div><div class="v">${items.filter(w => w.status === 'in_progress' || w.status === 'scheduled').length}</div></div>
      <div class="kpi"><div class="text-xs text-ink-500">Overdue</div><div class="v ${items.filter(w=>w.status==='overdue').length?'text-red-600':''}">${items.filter(w => w.status === 'overdue').length}</div></div>
    </div>`;
    return workflowListPage('wfdel', 'Deliveries Expected Today', 'Supplier orders, goods-in and delivery checks', 'truck', items, extra);
  }
  function wfprod() {
    const { prepLive, prepPct } = wfStats();
    const extra = `<div class="kpi mb-4 max-w-xs"><div class="text-xs text-ink-500">Production complete</div><div class="v text-brand-600">${prepPct}%</div></div>`;
    return workflowListPage('wfprod', 'Food Production Status', 'Prep, batch cooking, labelling and service readiness', 'recipe', prepLive, extra);
  }
  function wfclean() {
    const { cleaningTasks, cleaningPct } = wfStats();
    const extra = `<div class="kpi mb-4 max-w-xs"><div class="text-xs text-ink-500">Cleaning complete</div><div class="v text-brand-600">${cleaningPct}%</div></div>`;
    return workflowListPage('wfclean', 'Cleaning Status', 'Deep cleans, daily logs and hygiene tasks', 'check', cleaningTasks, extra);
  }
  function wfhaccp() {
    const { haccpTasks, haccpPct, tempCompliance } = wfStats();
    const extra = `<div class="grid sm:grid-cols-2 gap-4 mb-4">
      <div class="kpi"><div class="text-xs text-ink-500">HACCP checks done</div><div class="v text-brand-600">${haccpPct}%</div></div>
      <div class="kpi"><div class="text-xs text-ink-500">Temperature compliance</div><div class="v">${tempCompliance}%</div></div>
    </div>`;
    return workflowListPage('wfhaccp', 'HACCP Compliance Status', 'Temperature logs, CCP checks and audit trail', 'shield', haccpTasks, extra);
  }
  function wfperf() {
    const st = wfStats();
    const items = st.workflows.slice().sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    const extra = `<div class="card card-pad mb-4" style="background:linear-gradient(135deg,#0f766e08,#fff)">
      <div class="grid sm:grid-cols-4 gap-4 text-center">
        <div><div class="text-3xl font-extrabold text-brand-700">${st.kitchenScore}</div><div class="text-xs text-ink-400">Kitchen score</div></div>
        <div><div class="text-3xl font-extrabold">${st.workflows.filter(w=>w.status==='completed').length}</div><div class="text-xs text-ink-400">Tasks completed</div></div>
        <div><div class="text-3xl font-extrabold">${st.tempCompliance}%</div><div class="text-xs text-ink-400">Temp compliance</div></div>
        <div><div class="text-3xl font-extrabold">${st.deliveriesToday.length}</div><div class="text-xs text-ink-400">Deliveries today</div></div>
      </div>
    </div>`;
    return workflowListPage('wfperf', 'Kitchen Performance Summary', 'Full activity log for retreat centre operations', 'dashboard', items, extra);
  }

  function hub() {
    const db = S.db;
    const site = db.currentSite;
    const siteName = S.site(site).name;
    const loginEmail = (window.Api && window.Api.email) ? (window.Api.email()||'') : '';
    const me = loginEmail ? db.team.find(t=>(t.email||'').toLowerCase()===loginEmail.toLowerCase()) : null;
    const user = me || ((S.session && S.session()) ? S.session() : { name: (db.team[0]&&db.team[0].name) || 'there' });
    const firstName = (user.name||'there').split(' ')[0];
    const hour = new Date().getHours();
    const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

    const workflows = S.workflowsForSite(site);
    const live = workflows.filter(w => w.status === 'in_progress').sort((a,b) => new Date(b.updatedAt)-new Date(a.updatedAt));
    const completedToday = workflows.filter(w => w.status === 'completed' && isToday(w.completedAt)).sort((a,b) => new Date(b.completedAt)-new Date(a.completedAt));
    const outstanding = workflows.filter(w => w.status === 'scheduled' || w.status === 'in_progress');
    const overdue = workflows.filter(w => w.status === 'overdue');
    const staffActive = staffActiveList(site);

    const siteSensors = S.sensorsForSite(site);
    const breaches = siteSensors.filter(s => s.temp > s.max || s.temp < s.min).length;
    const tempCompliance = Math.round((siteSensors.length - breaches) / (siteSensors.length || 1) * 100);
    const openAlerts = db.alerts.filter(a => a.status === 'open' && a.site === site).length;

    const deliveriesToday = (db.deliveries || []).filter(d => d.site === site && isToday(d.at));
    const deliveriesExpected = workflows.filter(w => w.category === 'Supplier Management' && (w.status === 'scheduled' || w.status === 'in_progress'));
    const prepLive = workflows.filter(w => w.category === 'Food Preparation');
    const prepDone = prepLive.filter(w => w.status === 'completed').length;
    const prepPct = Math.round(prepDone / (prepLive.length || 1) * 100);
    const cleaningTasks = workflows.filter(w => /clean|Cleaning|log signed/i.test(w.label));
    const cleaningDone = cleaningTasks.filter(w => w.status === 'completed').length;
    const cleaningPct = Math.round(cleaningDone / (cleaningTasks.length || 1) * 100);
    const haccpTasks = workflows.filter(w => w.category === 'HACCP & Compliance' || w.category === 'Fridge & Freezer Logs');
    const haccpDone = haccpTasks.filter(w => w.status === 'completed').length;
    const haccpPct = Math.round(haccpDone / (haccpTasks.length || 1) * 100);
    const wfDone = workflows.filter(w => w.status === 'completed').length;
    const serviceReady = workflows.find(w => w.label === 'Ready for service');
    const kitchenScore = Math.min(100, Math.round(wfDone / (workflows.length || 1) * 55 + tempCompliance * 0.25 + haccpPct * 0.2));

    const statusPanel = (title, pct, detail, tone) => `
      <div class="card card-pad wf-status-panel ${tone}">
        <div class="text-xs font-bold uppercase tracking-wide text-ink-400 mb-1">${title}</div>
        <div class="flex items-end justify-between gap-2">
          <div class="text-2xl font-extrabold ${tone==='bad'?'text-red-600':tone==='warn'?'text-amber-600':'text-brand-700'}">${pct}%</div>
          <div class="text-xs text-ink-500 text-right">${detail}</div>
        </div>
        <div class="h-1.5 rounded-full bg-ink-100 overflow-hidden mt-2"><div class="h-full ${tone==='bad'?'bg-red-500':tone==='warn'?'bg-amber-500':'bg-brand-500'}" style="width:${pct}%"></div></div>
      </div>`;

    // product tiles
    const wasteKg = db.waste.filter(w=>w.site===site).reduce((n,w)=>n+w.kg,0);
    const products = [
      { name:'SafeServe', tag:'HACCP, checklists & live temperatures', icon:'check', route:'haccp', color:'#0d9488',
        stat: tempCompliance+'% compliant', sub: breaches?(breaches+' breach(es) now'):'all in range' },
      { name:'MenuGuard', tag:'Allergen menus with QR codes', icon:'allerq', route:'allerq', color:'#2563eb',
        stat: db.menus.length+' menus', sub:'14 statutory allergens' },
      { name:'LabelSmart', tag:'Food labels with auto use-by dates', icon:'labels', route:'labels', color:'#d97706',
        stat: db.labels.length+' labels', sub:'QR + barcode ready' },
      { name:'WasteWise', tag:'Track & cut food waste', icon:'waste', route:'waste', color:'#dc2626',
        stat: wasteKg.toFixed(1)+' kg', sub:'logged this period' },
    ];
    const tiles = products.map(p=>`<button class="card text-left overflow-hidden hover:shadow-xl transition-all hover:-translate-y-0.5 fade-in group" data-go="${p.route}">
      <div class="px-5 pt-5 pb-4" style="background:linear-gradient(135deg,${p.color}14,#ffffff)">
        <div class="flex items-center justify-between mb-4">
          <span class="w-14 h-14 rounded-2xl flex items-center justify-center flex-none shadow-sm" style="background:${p.color};color:#fff">${icon(p.icon,'w-7 h-7')}</span>
          <span class="badge" style="background:${p.color}1a;color:${p.color};border:none">${p.stat}</span>
        </div>
        <div class="font-extrabold text-lg">${p.name}</div>
        <div class="text-sm text-ink-400">${p.tag}</div>
      </div>
      <div class="px-5 py-3 flex items-center justify-between border-t border-ink-50">
        <span class="text-xs text-ink-400">${p.sub}</span>
        <span class="btn btn-sm text-white group-hover:brightness-110" style="background:${p.color}">Launch ${icon('chevron','w-4 h-4')}</span>
      </div>
    </button>`).join('');

    // launchpad ? every tool as an app-drawer tile
    const apps = [
      {l:'Compliance',route:'compliance',i:'shield',c:'#115e59'},
      {l:'Dashboard',route:'dashboard',i:'dashboard',c:'#0f766e'},
      {l:'Tasks',route:'taskoverview',i:'check',c:'#0d9488'},
      {l:'Temperatures',route:'temps',i:'temp',c:'#0ea5e9'},
      {l:'Alerts',route:'alerts',i:'alert',c:'#dc2626'},
      {l:'HACCP',route:'haccp',i:'check',c:'#059669'},
      {l:'Deliveries',route:'deliveries',i:'truck',c:'#0284c7'},
      {l:'Records',route:'records',i:'reports',c:'#6366f1'},
      {l:'Cooling',route:'cooling',i:'snow',c:'#0891b2'},
      {l:'Holding',route:'holding',i:'temp',c:'#ea580c'},
      {l:'pH Monitor',route:'phlogs',i:'droplet',c:'#7c3aed'},
      {l:'Batches',route:'batches',i:'layers',c:'#b45309'},
      {l:'Suppliers',route:'suppliers',i:'truck',c:'#2563eb'},
      {l:'Incidents',route:'incidents',i:'shield',c:'#e11d48'},
      {l:'Maintenance',route:'maintenance',i:'wrench',c:'#475569'},
      {l:'Assets',route:'assets',i:'box',c:'#9333ea'},
      {l:'Training',route:'training',i:'cap',c:'#0d9488'},
      {l:'Sites',route:'sites',i:'sites',c:'#16a34a'},
      {l:'Team',route:'team',i:'team',c:'#db2777'},
      {l:'Recipes',route:'recipes',i:'recipe',c:'#ca8a04'},
      {l:'Clock In/Out',route:'clock',i:'team',c:'#0d9488'},
      {l:'Rota',route:'rota',i:'team',c:'#2563eb'},
      {l:'Menu Creator',href:'/menu-creator/',i:'recipe',c:'#2f6b4f'},
      {l:'Vedanta Rota',href:'/vedanta-rota/',i:'team',c:'#7c3aed',pilot:'site_vedanta'},
      {l:'Vedanta Ordering',href:'/vedanta-ordering/',i:'truck',c:'#ea580c',pilot:'site_vedanta'},
      {l:'Food Cost',route:'foodcost',i:'coin',c:'#16a34a'},
      {l:'Reports',route:'reports',i:'reports',c:'#4f46e5'},
      {l:'Manual',route:'manual',i:'help',c:'#0891b2'},
      {l:'Settings',route:'settings',i:'settings',c:'#64748b'},
    ];
    const quick = apps.filter(q => !q.pilot || q.pilot === site).map(q=> q.href
      ? `<a class="flex flex-col items-center gap-2 p-3 rounded-2xl hover:bg-ink-50 transition-colors" href="${q.href}" target="_blank" rel="noopener">
      <span class="w-12 h-12 rounded-2xl flex items-center justify-center flex-none" style="background:${q.c}14;color:${q.c}">${icon(q.i,'w-6 h-6')}</span>
      <span class="text-xs font-medium text-center text-ink-600 leading-tight">${q.l}</span>
    </a>`
      : `<button class="flex flex-col items-center gap-2 p-3 rounded-2xl hover:bg-ink-50 transition-colors" data-go="${q.route}">
      <span class="w-12 h-12 rounded-2xl flex items-center justify-center flex-none" style="background:${q.c}14;color:${q.c}">${icon(q.i,'w-6 h-6')}</span>
      <span class="text-xs font-medium text-center text-ink-600 leading-tight">${q.l}</span>
    </button>`).join('');

    const siteObj = S.site(site);
    const recipeCount = (db.recipes || []).filter(r => r.site === site).length;
    const hasChecklistDone = (db.checklists || []).some(c => c.site === site && (c.items || []).some(it => it.done));
    const siteTeam = (db.team || []).filter(t => t.siteId === site).length;
    const milestones = [
      { label: 'Sign in to Kiteline', done: true, route: '' },
      { label: 'Select kitchen ? ' + (siteObj.legalName ? siteObj.legalName + ' ? ' + siteObj.name : siteObj.name), done: !!site, route: 'sites' },
      { label: 'Open recipes library', done: recipeCount >= 10, route: 'recipes' },
      { label: 'Complete opening / HACCP checks', done: hasChecklistDone, route: 'haccp' },
      { label: 'Set PIN in Settings (security)', done: window.Security && window.Security.hasPin(), route: 'settings' },
      { label: 'Add a team member', done: siteTeam > 1, route: 'team' },
    ];
    const msDone = milestones.filter(m => m.done).length;
    const milestonesHtml = `
      <div class="card card-pad mb-5">
        <div class="flex items-center justify-between mb-3">
          <h2 class="font-bold flex items-center gap-2">${icon('check','w-5 h-5 text-brand-600')} Setup milestones</h2>
          <span class="badge badge-green">${msDone}/${milestones.length} complete</span>
        </div>
        <div class="h-2 rounded-full bg-ink-100 overflow-hidden mb-4"><div class="h-full bg-brand-500 transition-all" style="width:${Math.round(msDone / milestones.length * 100)}%"></div></div>
        <div class="space-y-2">
          ${milestones.map(m => `<div class="flex items-center gap-3 text-sm py-1">
            <span class="w-5 text-center ${m.done ? 'text-brand-600 font-bold' : 'text-ink-300'}">${m.done ? '?' : '?'}</span>
            <span class="flex-1 ${m.done ? 'text-ink-500' : 'font-medium text-ink-800'}">${escapeHtml(m.label)}</span>
            ${!m.done && m.route ? `<button class="btn btn-ghost btn-sm" data-go="${m.route}">Go ?</button>` : ''}
          </div>`).join('')}
        </div>
      </div>`;

    const sessionTrial = window.App && window.App.trial;
    const showTrialBanner = sessionTrial && sessionTrial.active && !sessionTrial.exempt;
    const trialEnds = (sessionTrial && sessionTrial.endsAt) || db.org.trialEndsAt;
    let trialBannerHtml = '';
    if (showTrialBanner && trialEnds) {
      const daysLeft = sessionTrial.daysLeft != null
        ? sessionTrial.daysLeft
        : Math.max(0, Math.ceil((new Date(trialEnds) - Date.now()) / 86400000));
      const urgent = daysLeft <= 3;
      trialBannerHtml = `<div class="card card-pad mb-5 flex flex-wrap items-center gap-3 border ${urgent ? 'border-amber-300 bg-amber-50' : 'border-brand-200 bg-brand-50'}">
        ${icon('shield','w-5 h-5 text-brand-700')}
        <div class="text-sm flex-1 min-w-[200px]"><b>Free trial</b> ? ${daysLeft} day${daysLeft === 1 ? '' : 's'} left ? up to ${db.org.maxUsers || 5} users.</div>
        <a href="#settings" class="btn btn-primary btn-sm">Choose a plan</a>
      </div>`;
    }

    const html = `
      <div class="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <span class="wf-live-pulse"></span>
            <span class="text-xs font-bold uppercase tracking-wider text-brand-600">Live kitchen operations</span>
          </div>
          <h1 class="text-2xl font-extrabold">${greet}, ${escapeHtml(firstName)}</h1>
          <p class="text-ink-500 text-sm">${escapeHtml(siteName)} ? Retreat centre kitchen ? ${fmt.date(S.now())}</p>
        </div>
        <div class="flex flex-wrap gap-2 text-xs">
          <span class="badge badge-green">?? Completed</span>
          <span class="badge badge-amber">?? In Progress</span>
          <span class="badge badge-red">?? Overdue</span>
          <span class="badge badge-blue">?? Scheduled</span>
        </div>
      </div>
      ${openAlerts?`<div class="card card-pad mb-5 flex items-center gap-3 border-l-4 border-red-500 bg-red-50">
        ${icon('alert','w-5 h-5 text-red-600')}<div class="text-sm"><b>${openAlerts} open alert(s)</b> at this site.</div>
        <button class="btn btn-ghost btn-sm ml-auto" data-go="alerts">View alerts</button></div>`:''}
      ${(window.PilotSites && window.PilotSites.pilotBannerHtml) ? window.PilotSites.pilotBannerHtml(site) : ''}
      ${trialBannerHtml}
      ${milestonesHtml}

      <div class="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
        <a href="#wflive" class="kpi hover:ring-2 hover:ring-brand-300 transition-shadow cursor-pointer"><div class="text-xs text-ink-500">Happening now</div><div class="v text-amber-600">${live.length}</div><div class="text-[10px] text-brand-600 mt-1 font-semibold">View all pages ?</div></a>
        <a href="#wfdone" class="kpi hover:ring-2 hover:ring-brand-300 transition-shadow cursor-pointer"><div class="text-xs text-ink-500">Completed today</div><div class="v text-brand-600">${completedToday.length}</div><div class="text-[10px] text-brand-600 mt-1 font-semibold">10 per page ?</div></a>
        <a href="#wfout" class="kpi hover:ring-2 hover:ring-brand-300 transition-shadow cursor-pointer"><div class="text-xs text-ink-500">Outstanding</div><div class="v">${outstanding.length}</div><div class="text-[10px] text-brand-600 mt-1 font-semibold">10 per page ?</div></a>
        <a href="#wfod" class="kpi hover:ring-2 hover:ring-brand-300 transition-shadow cursor-pointer"><div class="text-xs text-ink-500">Overdue</div><div class="v ${overdue.length?'text-red-600':''}">${overdue.length}</div><div class="text-[10px] text-brand-600 mt-1 font-semibold">10 per page ?</div></a>
        <a href="#wfperf" class="kpi hover:ring-2 hover:ring-brand-300 transition-shadow cursor-pointer"><div class="text-xs text-ink-500">Kitchen score</div><div class="v">${kitchenScore}</div><div class="text-[10px] text-brand-600 mt-1 font-semibold">Full report ?</div></a>
      </div>

      <div class="grid xl:grid-cols-3 gap-5 mb-5">
        <div class="xl:col-span-2 card card-pad">
          <div class="flex items-center justify-between mb-3">
            <h2 class="font-bold flex items-center gap-2">${icon('temp','w-5 h-5 text-amber-500')} Happening Now</h2>
            <a href="#wflive" class="text-xs text-brand-600 font-semibold">All pages (10 each) ?</a>
          </div>
          <div class="wf-feed space-y-2" id="wf-live">${live.length ? live.map(wfItemHtml).join('') : '<p class="text-ink-400 text-sm py-4 text-center">No active tasks ? kitchen is between service periods.</p>'}</div>
        </div>
        <div class="space-y-5">
          <div class="card card-pad">
            <div class="flex items-center justify-between mb-3"><h2 class="font-bold flex items-center gap-2">${icon('team','w-5 h-5 text-brand-600')} Staff Currently Working</h2><a href="#wfstaff" class="text-xs text-brand-600 font-semibold">View all ?</a></div>
            ${staffActive.length ? staffActive.map(s=>`<div class="flex items-center gap-3 py-2 border-b border-ink-50 last:border-0">
              <div class="w-9 h-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-sm">${s.initials}</div>
              <div class="flex-1 min-w-0"><div class="font-semibold text-sm">${escapeHtml(s.name)}</div><div class="text-xs text-ink-400">${s.tasks.length ? s.tasks.length + ' active task' + (s.tasks.length>1?'s':'') : (s.onClock ? 'Clocked in' : 'On shift')}</div></div>
              <span class="badge ${s.onClock ? 'badge-green' : 'badge-amber'}">${s.onClock ? 'Clocked in' : 'Active'}</span>
            </div>`).join('') : '<p class="text-ink-400 text-sm">No one clocked in ? use <a href="#clock" class="text-brand-600 font-semibold">Clock In / Out</a>.</p>'}
          </div>
          <div class="card card-pad">
            <div class="flex items-center justify-between mb-3"><h2 class="font-bold flex items-center gap-2">${icon('alert','w-5 h-5 text-red-500')} Overdue <span class="badge badge-red">${overdue.length}</span></h2><a href="#wfod" class="text-xs text-brand-600 font-semibold">10/page ?</a></div>
            <div class="space-y-2 max-h-48 overflow-y-auto">${overdue.length ? overdue.map(wfItemHtml).join('') : '<p class="text-ink-400 text-sm">No overdue tasks ? great work.</p>'}</div>
          </div>
        </div>
      </div>

      <div class="grid lg:grid-cols-2 gap-5 mb-5">
        <div class="card card-pad">
          <div class="flex items-center justify-between mb-3"><h2 class="font-bold flex items-center gap-2">${icon('check','w-5 h-5 text-brand-600')} Completed Today <span class="badge badge-green">${completedToday.length}</span></h2><a href="#wfdone" class="text-xs text-brand-600 font-semibold">10/page ?</a></div>
          <div class="wf-feed space-y-2">${completedToday.length ? completedToday.slice(0,12).map(wfItemHtml).join('') : '<p class="text-ink-400 text-sm">Nothing completed yet today.</p>'}</div>
        </div>
        <div class="card card-pad">
          <div class="flex items-center justify-between mb-3"><h2 class="font-bold flex items-center gap-2">${icon('layers','w-5 h-5 text-blue-500')} Outstanding <span class="badge badge-blue">${outstanding.length}</span></h2><a href="#wfout" class="text-xs text-brand-600 font-semibold">10/page ?</a></div>
          <div class="wf-feed space-y-2">${outstanding.length ? outstanding.slice(0,12).map(wfItemHtml).join('') : '<p class="text-ink-400 text-sm">All clear.</p>'}</div>
        </div>
      </div>

      <h2 class="font-bold text-sm uppercase tracking-wide text-ink-400 mb-3">Operations status ? 10 pages each</h2>
      <div class="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
        <a href="#wfdel" class="block hover:opacity-90">${statusPanel('Deliveries today', deliveriesToday.length ? 100 : 60, `${deliveriesToday.length} received ? ${deliveriesExpected.length} in pipeline`, deliveriesToday.length ? 'ok' : 'warn')}</a>
        <a href="#wfprod" class="block hover:opacity-90">${statusPanel('Food production', prepPct, `${prepLive.filter(w=>w.status==='in_progress').length} in progress ? ${serviceReady ? (serviceReady.status==='scheduled'?'service pending':'ready') : 'on track'}`, prepPct>=70?'ok':prepPct>=40?'warn':'bad')}</a>
        <a href="#wfclean" class="block hover:opacity-90">${statusPanel('Cleaning status', cleaningPct, `${cleaningDone}/${cleaningTasks.length} tasks done`, cleaningPct>=80?'ok':'warn')}</a>
        <a href="#wfhaccp" class="block hover:opacity-90">${statusPanel('HACCP compliance', haccpPct, `${haccpDone}/${haccpTasks.length} checks ? ${tempCompliance}% temps OK`, haccpPct>=85?'ok':haccpPct>=60?'warn':'bad')}</a>
      </div>

      <div class="card card-pad mb-6" style="background:linear-gradient(135deg,#0f766e08,#fff)">
        <div class="flex items-center justify-between mb-4"><h2 class="font-bold flex items-center gap-2">${icon('dashboard','w-5 h-5 text-brand-600')} Kitchen Performance Summary</h2><a href="#wfperf" class="btn btn-ghost btn-sm">Full report (10/page) ?</a></div>
        <div class="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 text-center">
          <div><div class="text-3xl font-extrabold text-brand-700">${kitchenScore}</div><div class="text-xs text-ink-400 mt-1">Overall score</div></div>
          <div><div class="text-3xl font-extrabold">${completedToday.length}/${workflows.length}</div><div class="text-xs text-ink-400 mt-1">Tasks done today</div></div>
          <div><div class="text-3xl font-extrabold ${breaches?'text-red-600':'text-brand-600'}">${tempCompliance}%</div><div class="text-xs text-ink-400 mt-1">Temperature compliance</div></div>
          <div><div class="text-3xl font-extrabold">${staffActive.length}</div><div class="text-xs text-ink-400 mt-1">Staff on shift</div></div>
          <div><div class="text-3xl font-extrabold">${deliveriesToday.length}</div><div class="text-xs text-ink-400 mt-1">Deliveries received</div></div>
        </div>
        <div class="grid sm:grid-cols-5 gap-2 mt-5 text-center text-[10px] font-semibold uppercase tracking-wide text-ink-400">
          <div>Supplier</div><div>Prep</div><div>Fridge/Freezer</div><div>H&S</div><div>HACCP</div>
        </div>
        <div class="grid sm:grid-cols-5 gap-2 mt-1">
          ${['Supplier Management','Food Preparation','Fridge & Freezer Logs','Health & Safety','HACCP & Compliance'].map(cat=>{
            const c=workflows.filter(w=>w.category===cat);
            const d=c.filter(w=>w.status==='completed').length;
            const p=Math.round(d/(c.length||1)*100);
            return `<div class="h-2 rounded-full bg-ink-100 overflow-hidden"><div class="h-full bg-brand-500" style="width:${p}%"></div></div>`;
          }).join('')}
        </div>
      </div>

      <details class="mb-4" open>
        <summary class="font-bold text-sm uppercase tracking-wide text-ink-400 cursor-pointer py-2">Quick launch ? apps & tools</summary>
        <div class="grid sm:grid-cols-2 gap-4 mt-3">${tiles}</div>
        <div class="card card-pad mt-4"><div class="grid grid-cols-4 sm:grid-cols-6 gap-1">${quick}</div></div>
      </details>`;
    return { title:'Home', html, mount() {
      document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>{ location.hash = b.dataset.go; });
      document.querySelectorAll('.wf-item[data-go]').forEach(el=>{ el.style.cursor='pointer'; el.onclick=()=>{ location.hash=el.dataset.go; }; });
    }};
  }

  /* ---------------- FOOD COST / MENU ENGINEERING ---------------- */
  function foodcost() {
    const db = S.db;
    const cur = db.org.currency;
    const money = (n)=>fmt.money(n, cur);
    const TARGET_GP = 65; // house target gross profit %

    // deterministic hash so derived prices/sales are stable per dish
    const hash = (s)=>{ let h=2166136261; for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619); } return (h>>>0); };
    // realistic menu price bands per course (independent of cost ? varied GP)
    const band = { Starter:[5.5,8.5], Soup:[5,7], Main:[11,17], Dessert:[6,9], Lunch:[7.5,11.5], Side:[3,5], Breakfast:[6,10] };
    const derivePrice = (r,portionCost)=>{ const [lo,hi]=band[r.category]||[8,14]; const span=Math.round((hi-lo)*20); const p=lo+(hash(r.name)%(span+1))/20; return Math.max(+(portionCost*1.8).toFixed(2), +p.toFixed(2)); };
    const deriveSold = (r)=>{ const base = (r.category==='Soup'||r.category==='Lunch'||r.category==='Starter')?90:60; return base + (hash('s'+r.name)%80); };

    const dishes = db.recipes.map(r=>{
      const portionCost = (r.cost||0)/(r.servings||1);
      const price = (r.price!=null && r.price>0) ? r.price : derivePrice(r, portionCost);
      const sold = (r.sold!=null) ? r.sold : deriveSold(r);
      const gp = price>0 ? (price-portionCost)/price*100 : 0;
      const fcPct = price>0 ? portionCost/price*100 : 0;
      const profit = (price-portionCost)*sold;
      const revenue = price*sold;
      return { r, name:r.name, category:r.category||'?', portionCost, price, sold, gp, fcPct, profit, revenue };
    });

    const totalRev = dishes.reduce((n,d)=>n+d.revenue,0);
    const totalCost = dishes.reduce((n,d)=>n+d.portionCost*d.sold,0);
    const totalProfit = totalRev - totalCost;
    const avgGP = totalRev ? totalProfit/totalRev*100 : 0;
    const avgFC = totalRev ? totalCost/totalRev*100 : 0;
    const belowTarget = dishes.filter(d=>d.gp<TARGET_GP).length;

    const avgSold = dishes.reduce((n,d)=>n+d.sold,0)/(dishes.length||1);
    const avgDishGP = dishes.reduce((n,d)=>n+d.gp,0)/(dishes.length||1);
    const classify = (d)=>{
      const pop = d.sold>=avgSold, pro = d.gp>=avgDishGP;
      return pop&&pro?'Star':pop&&!pro?'Plowhorse':!pop&&pro?'Puzzle':'Dog';
    };
    const gpBadge = (gp)=> gp>=TARGET_GP?`<span class="badge badge-green">${gp.toFixed(0)}%</span>`
      : gp>=TARGET_GP-10?`<span class="badge badge-amber">${gp.toFixed(0)}%</span>`
      : `<span class="badge badge-red">${gp.toFixed(0)}%</span>`;

    const rows = dishes.slice().sort((a,b)=>b.profit-a.profit).map(d=>{
      const cls = classify(d);
      const clsColor = {Star:'badge-green',Plowhorse:'badge-amber',Puzzle:'badge-blue',Dog:'badge-red'}[cls]||'badge-gray';
      return `<tr>
        <td><div class="font-semibold">${escapeHtml(d.name)}</div><div class="text-xs text-ink-400">${escapeHtml(d.category)} ? ${d.sold} sold</div></td>
        <td>${money(d.portionCost)}</td>
        <td>${money(d.price)}</td>
        <td>${d.fcPct.toFixed(0)}%</td>
        <td>${gpBadge(d.gp)}</td>
        <td class="font-semibold">${money(d.profit)}</td>
        <td><span class="badge ${clsColor}">${cls}</span></td>
        <td class="text-right"><button class="btn btn-ghost btn-sm" data-edit="${d.r.id}">Edit</button></td>
      </tr>`;
    }).join('');

    // menu engineering quadrants
    const quad = (key,title,desc,color)=>{
      const items = dishes.filter(d=>classify(d)===key);
      const list = items.length ? items.map(d=>`<div class="flex justify-between text-sm py-0.5"><span>${escapeHtml(d.name)}</span><span class="text-ink-400">${d.gp.toFixed(0)}% ? ${d.sold}</span></div>`).join('') : '<div class="text-sm text-ink-300">None</div>';
      return `<div class="card card-pad" style="border-top:3px solid ${color}">
        <div class="flex items-center justify-between mb-1"><h4 class="font-bold">${title}</h4><span class="badge" style="background:${color}1a;color:${color};border:none">${items.length}</span></div>
        <p class="text-xs text-ink-400 mb-2">${desc}</p>${list}</div>`;
    };

    const html = `
      ${sectionHeader('Food Cost & Menu Engineering','Track recipe margins, gross profit and menu performance', `<button class="btn btn-ghost btn-sm" data-act="export">${icon('reports','ico')} Export CSV</button>`)}
      <div class="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-5">
        ${kpiCard('Avg gross profit', avgGP.toFixed(1)+'%', 'reports')}
        ${kpiCard('Avg food cost', avgFC.toFixed(1)+'%', 'waste')}
        ${kpiCard('Weekly revenue', money(totalRev), 'labels')}
        ${kpiCard('Weekly profit', money(totalProfit), 'check')}
        ${kpiCard('Below '+TARGET_GP+'% GP', belowTarget, 'alert')}
      </div>

      <h3 class="font-bold mb-3 text-ink-500 text-sm uppercase tracking-wide">Menu engineering matrix</h3>
      <div class="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        ${quad('Star','? Stars','High profit ? high popularity ? promote & protect','#059669')}
        ${quad('Plowhorse','?? Plowhorses','Popular but low margin ? re-engineer cost','#d97706')}
        ${quad('Puzzle','?? Puzzles','High margin but low sales ? reposition/upsell','#2563eb')}
        ${quad('Dog','?? Dogs','Low profit ? low sales ? consider removing','#dc2626')}
      </div>

      <h3 class="font-bold mb-3 text-ink-500 text-sm uppercase tracking-wide">Dish profitability</h3>
      <div class="card overflow-hidden"><table class="table">
        <thead><tr><th>Dish</th><th>Portion cost</th><th>Menu price</th><th>Food cost</th><th>GP%</th><th>Weekly profit</th><th>Class</th><th></th></tr></thead>
        <tbody>${rows}</tbody></table></div>`;

    return { title:'Food Cost', html, mount() {
      const exportBtn = document.querySelector('[data-act="export"]');
      if (exportBtn) exportBtn.onclick = ()=> downloadCsv('food-cost.csv', dishes.map(d=>({
        Dish:d.name, Category:d.category, PortionCost:d.portionCost.toFixed(2), MenuPrice:d.price.toFixed(2),
        FoodCostPct:d.fcPct.toFixed(1), GrossProfitPct:d.gp.toFixed(1), Sold:d.sold, WeeklyProfit:d.profit.toFixed(2), Class:classify(d)
      })));
      document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>{
        const r = db.recipes.find(x=>x.id===b.dataset.edit); if(!r) return;
        const portionCost = (r.cost||0)/(r.servings||1);
        modal('Edit pricing ? '+escapeHtml(r.name), `<div class="space-y-3">
          <div class="text-sm text-ink-500">Portion cost: <b>${money(portionCost)}</b> (batch ${money(r.cost||0)} ? ${r.servings||1} servings)</div>
          <div><label class="label">Menu price (${cur})</label><input id="fc_p" type="number" step="0.05" class="input" value="${(r.price!=null&&r.price>0?r.price:derivePrice(r,portionCost)).toFixed(2)}"></div>
          <div><label class="label">Units sold / week</label><input id="fc_s" type="number" class="input" value="${r.sold!=null?r.sold:deriveSold(r)}"></div>
          <div id="fc_prev" class="text-sm font-semibold"></div>
          <button class="btn btn-primary w-full" id="fc_save">Save pricing</button></div>`);
        const prev = ()=>{ const p=parseFloat(document.getElementById('fc_p').value)||0; const gp=p>0?((p-portionCost)/p*100):0; document.getElementById('fc_prev').innerHTML = `Gross profit: <span class="${gp>=TARGET_GP?'text-brand-700':'text-red-600'}">${gp.toFixed(1)}%</span> ? Food cost ${(p>0?portionCost/p*100:0).toFixed(1)}%`; };
        document.getElementById('fc_p').oninput = prev; prev();
        document.getElementById('fc_save').onclick = ()=>{
          r.price = parseFloat(document.getElementById('fc_p').value)||0;
          r.sold = parseInt(document.getElementById('fc_s').value)||0;
          S.persist(); closeModal(); window.App.render(); toast('Pricing updated');
        };
      });
    }};
  }

  /* ---------------- DELIVERIES (GOODS IN) ---------------- */
  function deliveries() {
    const all = S.db.deliveries.filter(d=>d.site===S.db.currentSite)
      .slice().sort((a,b)=>new Date(b.at)-new Date(a.at));
    const accepted = all.filter(d=>d.accepted).length;
    const rejected = all.length - accepted;
    const acceptRate = all.length ? Math.round(accepted/all.length*100) : 100;
    const catBadge=(c)=>{ const m={Chilled:'badge-blue',Frozen:'badge-blue',Produce:'badge-green',Dairy:'badge-gray',Ambient:'badge-gray',Bakery:'badge-amber'}; return `<span class="badge ${m[c]||'badge-gray'}">${escapeHtml(c)}</span>`; };
    const okBadge=(v)=> v==='Pass'?'<span class="badge badge-green">Pass</span>':v==='Fail'?'<span class="badge badge-red">Fail</span>':'<span class="text-ink-300">?</span>';
    const tempCell=(d)=>{ if(d.temp==null) return '<span class="text-ink-300">n/a</span>'; const bad=d.target!=null && d.temp>d.target; return `<span class="font-semibold ${bad?'text-red-600':''}">${d.temp}?C</span>`; };
    const rows = all.map(d=>`<tr data-status="${d.accepted?'Accepted':'Rejected'}">
      <td><div class="font-semibold">${escapeHtml(d.supplier)}</div><div class="text-xs text-ink-400">${escapeHtml(d.items||'')}</div></td>
      <td>${catBadge(d.category)}</td>
      <td>${tempCell(d)}</td>
      <td class="text-ink-400">${d.target!=null?(d.category==='Frozen'?'? '+d.target:'? '+d.target)+'?C':'?'}</td>
      <td>${d.packaging==='Good'?'<span class="badge badge-green">Good</span>':'<span class="badge badge-red">Damaged</span>'}</td>
      <td>${okBadge(d.dateCheck)}</td>
      <td>${d.accepted?'<span class="badge badge-green">Accepted</span>':'<span class="badge badge-red">Rejected</span>'}</td>
      <td class="text-xs ${d.accepted?'text-ink-300':'text-ink-700'}">${d.reason?escapeHtml(d.reason):''}</td>
      <td>${escapeHtml(S.member(d.by).name)}</td><td>${fmt.ago(d.at)}</td></tr>`).join('');
    const html = `
      ${sectionHeader('Deliveries ? Goods In','Temperature & quality checks on every delivery (chilled ?5?C, frozen ?-18?C)', `<button class="btn btn-primary btn-sm" data-act="add">${icon('plus','ico')} Log delivery</button>`)}
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        ${kpiCard('Deliveries (site)', all.length, 'truck')}
        ${kpiCard('Accepted', accepted, 'check')}
        ${kpiCard('Rejected', rejected, 'alert')}
        ${kpiCard('Acceptance rate', acceptRate+'%', 'reports')}
      </div>
      <div class="flex flex-wrap gap-2 mb-3" id="del-filters">
        <button class="btn btn-sm btn-primary" data-df="all">All (${all.length})</button>
        <button class="btn btn-sm btn-ghost" data-df="Accepted">Accepted (${accepted})</button>
        <button class="btn btn-sm btn-ghost" data-df="Rejected">Rejected (${rejected})</button>
      </div>
      <div class="card overflow-hidden"><table class="table"><thead><tr><th>Supplier</th><th>Category</th><th>Temp</th><th>Target</th><th>Packaging</th><th>Date check</th><th>Status</th><th>Reason</th><th>By</th><th>When</th></tr></thead><tbody id="del-rows">${rows||'<tr><td colspan=10 class="text-ink-400 p-4">No deliveries logged for this site.</td></tr>'}</tbody></table></div>`;
    return { title:'Deliveries', html, mount() {
      const chips=document.querySelectorAll('[data-df]');
      chips.forEach(c=>c.onclick=()=>{ const f=c.dataset.df; chips.forEach(x=>{ x.classList.toggle('btn-primary',x===c); x.classList.toggle('btn-ghost',x!==c); }); document.querySelectorAll('#del-rows tr').forEach(tr=>{ tr.style.display=(f==='all'||tr.dataset.status===f)?'':'none'; }); });
      document.querySelector('[data-act="add"]').onclick=()=>{
        const sup = [...new Set(S.db.deliveries.map(d=>d.supplier))];
        modal('Log Delivery',`<div class="space-y-3">
          <input id="d_s" class="input" list="d_sl" placeholder="Supplier"><datalist id="d_sl">${sup.map(s=>`<option>${escapeHtml(s)}</option>`).join('')}</datalist>
          <input id="d_i" class="input" placeholder="Items (e.g. chilled chicken, dairy)">
          <div class="grid grid-cols-2 gap-3">
            <select id="d_c" class="select">${['Chilled','Frozen','Produce','Dairy','Ambient','Bakery'].map(x=>`<option>${x}</option>`).join('')}</select>
            <div><label class="label">Delivery temp ?C</label><input id="d_t" type="number" step="0.1" class="input" value="3"></div>
          </div>
          <div class="grid grid-cols-3 gap-3">
            <select id="d_p" class="select"><option>Good</option><option>Damaged</option></select>
            <select id="d_v" class="select"><option>Clean</option><option>Dirty</option></select>
            <select id="d_d" class="select"><option>Pass</option><option>Fail</option></select>
          </div>
          <div id="d_grade" class="text-sm font-semibold"></div>
          <div id="d_rwrap" class="hidden"><label class="label">Rejection reason</label><textarea id="d_r" class="input" rows="2" placeholder="Why was it rejected / partially rejected?"></textarea></div>
          <button class="btn btn-primary w-full" id="d_save">Save delivery</button></div>`);
        const targetFor=(c)=> c==='Frozen'?-18 : (c==='Ambient'||c==='Bakery')?null : (c==='Produce'?8:5);
        const grade=()=>{ const c=document.getElementById('d_c').value, t=+document.getElementById('d_t').value, tg=targetFor(c); const pk=document.getElementById('d_p').value, dc=document.getElementById('d_d').value; const tempOk = tg==null?true:(t<=tg); const ok = tempOk && pk==='Good' && dc==='Pass'; document.getElementById('d_grade').innerHTML = `Recommendation: <span class="${ok?'text-brand-700':'text-red-600'}">${ok?'Accept':'Reject / check'}</span>${tg!=null?` ? target ?${tg}?C`:' ? ambient (no temp)'}`; document.getElementById('d_rwrap').classList.toggle('hidden', ok); return ok; };
        ['d_c','d_t','d_p','d_v','d_d'].forEach(id=>{ const el=document.getElementById(id); el.oninput=grade; el.onchange=grade; }); grade();
        document.getElementById('d_save').onclick=()=>{
          const supplier=document.getElementById('d_s').value.trim(); if(!supplier)return toast('Enter a supplier','warn');
          const category=document.getElementById('d_c').value; const ambient=(category==='Ambient'||category==='Bakery');
          const temp=ambient?null:+document.getElementById('d_t').value; const target=ambient?null:( category==='Frozen'?-18:(category==='Produce'?8:5) );
          const packaging=document.getElementById('d_p').value, vehicle=document.getElementById('d_v').value, dateCheck=document.getElementById('d_d').value;
          const accepted=grade(); const reason=accepted?'':(document.getElementById('d_r')?document.getElementById('d_r').value.trim():'');
          if(!accepted && !reason) return toast('Add a rejection reason','warn');
          S.db.deliveries.unshift({id:S.uid('dl'),supplier,items:document.getElementById('d_i').value.trim(),category,site:S.db.currentSite,temp,target,packaging,vehicle,dateCheck,by:(S.db.team[0]?S.db.team[0].id:'u_sarah'),at:new Date().toISOString(),accepted,reason});
          S.persist();closeModal();window.App.render();toast('Delivery logged: '+(accepted?'Accepted':'Rejected'), accepted?'success':'error');
        };
      };
    }};
  }

  /* ---------------- TASK OVERVIEW ---------------- */
  function taskoverview() {
    const db = S.db;
    const member = (id)=>db.team.find(t=>t.id===id);
    const siteName = (id)=>{ try { return S.site(id).name; } catch(e){ const s=db.sites.find(x=>x.id===id); return s?s.name:'?'; } };
    const now = new Date();
    const minsNow = now.getHours()*60 + now.getMinutes();
    const parseDue = (due)=>{ const m=/(\d{1,2}):(\d{2})\s*$/.exec(due||''); return m ? (+m[1]*60 + +m[2]) : null; };
    const isTimedToday = (due)=> !/mon|tue|wed|thu|fri|sat|sun/i.test(due||'');

    // 1) checklist-derived tasks
    const tasks = db.checklists.map(c=>{
      const total=c.items.length, done=c.items.filter(i=>i.done).length;
      const dm=parseDue(c.due); const timed=isTimedToday(c.due);
      let status;
      if (done>=total && total>0) status='Completed';
      else if (timed && dm!=null && minsNow>dm) status='Overdue';
      else if (done>0) status='In progress';
      else status='Pending';
      return { id:c.id, title:c.title, type:c.recurrence+' check', site:c.site, assignee:c.assignee, due:c.due, done, total, status, route:'haccp' };
    });

    // 2) compliance-derived tasks (ties the whole system together)
    db.assets.filter(a=>daysUntil(a.nextService)<0).forEach(a=>tasks.push({
      id:'as_'+a.id, title:'Service overdue: '+a.name, type:'Equipment service', site:a.site, assignee:null,
      due:fmt.date(a.nextService), done:0, total:0, status:'Overdue', route:'assets' }));
    db.training.filter(t=>daysUntil(t.expires)<0).forEach(t=>{ const m=member(t.person); tasks.push({
      id:'tr_'+t.id, title:'Renew training: '+(m?m.name:'Staff')+' ? '+t.course, type:'Staff training', site:(m?m.siteId:db.currentSite), assignee:t.person,
      due:fmt.date(t.expires), done:0, total:0, status:'Overdue', route:'training' }); });
    db.maintenance.filter(m=>m.status!=='Closed'&&m.status!=='Resolved').forEach(m=>tasks.push({
      id:'mt_'+m.id, title:'Maintenance: '+m.title, type:'Repair ticket', site:m.site, assignee:null,
      due:m.priority||'?', done:0, total:0, status:'In progress', route:'maintenance' }));
    (db.cooling||[]).filter(c=>c.result==='Fail').forEach(c=>tasks.push({
      id:'co_'+c.id, title:'Investigate failed cooling: '+(c.item||'batch'), type:'Cooling verification', site:c.site, assignee:null,
      due:'ASAP', done:0, total:0, status:'Overdue', route:'cooling' }));

    const order={Overdue:0,'In progress':1,Pending:2,Completed:3};
    tasks.sort((a,b)=> (order[a.status]-order[b.status]) || ((parseDue(a.due)??9999)-(parseDue(b.due)??9999)));

    const counts={ total:tasks.length, completed:0, overdue:0, active:0 };
    tasks.forEach(t=>{ if(t.status==='Completed')counts.completed++; else if(t.status==='Overdue')counts.overdue++; else counts.active++; });
    const pct = counts.total ? Math.round(counts.completed/counts.total*100) : 0;

    const statusBadge=(s)=>({Completed:'badge-green','In progress':'badge-blue',Pending:'badge-gray',Overdue:'badge-red'}[s]||'badge-gray');
    const rows = tasks.map(t=>{
      const m = t.assignee?member(t.assignee):null;
      const who = m ? `<span class="inline-flex items-center gap-1.5"><span class="w-6 h-6 rounded-full bg-ink-100 text-ink-600 text-[10px] font-bold flex items-center justify-center">${m.initials}</span>${escapeHtml(m.name)}</span>` : '<span class="text-ink-300">Unassigned</span>';
      const prog = t.total ? `<div class="flex items-center gap-2"><div class="h-1.5 w-16 bg-ink-100 rounded-full overflow-hidden"><div class="h-full bg-brand-600" style="width:${Math.round(t.done/t.total*100)}%"></div></div><span class="text-xs text-ink-400">${t.done}/${t.total}</span></div>` : '<span class="text-xs text-ink-300">?</span>';
      return `<tr data-status="${t.status}">
        <td><div class="font-semibold">${escapeHtml(t.title)}</div><div class="text-xs text-ink-400">${escapeHtml(t.type)}</div></td>
        <td>${escapeHtml(siteName(t.site))}</td>
        <td>${who}</td>
        <td>${escapeHtml(String(t.due))}</td>
        <td>${prog}</td>
        <td><span class="badge ${statusBadge(t.status)}">${t.status}</span></td>
        <td class="text-right"><button class="btn btn-ghost btn-sm" data-go="${t.route}">Open</button></td>
      </tr>`;
    }).join('');

    const chip=(id,label,n)=>`<button class="btn btn-sm ${id==='all'?'btn-primary':'btn-ghost'}" data-filter="${id}">${label}${n!=null?` <span class="opacity-70">(${n})</span>`:''}</button>`;
    const html = `
      ${sectionHeader('Task Overview','Every scheduled check and corrective action across your sites, in one place')}
      <div class="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-5">
        ${kpiCard('Tasks today', counts.total, 'check')}
        ${kpiCard('Completed', counts.completed, 'check')}
        ${kpiCard('Active', counts.active, 'records')}
        ${kpiCard('Overdue', counts.overdue, 'alert')}
        ${kpiCard('Completion', pct+'%', 'reports')}
      </div>
      <div class="card card-pad mb-4">
        <div class="flex items-center justify-between mb-1"><span class="text-sm font-semibold">Daily completion</span><span class="text-sm text-ink-400">${counts.completed}/${counts.total}</span></div>
        <div class="h-2 bg-ink-100 rounded-full overflow-hidden"><div class="h-full ${pct>=80?'bg-brand-600':pct>=50?'bg-amber-500':'bg-red-500'}" style="width:${pct}%"></div></div>
      </div>
      <div class="flex flex-wrap gap-2 mb-3" id="task-filters">
        ${chip('all','All',counts.total)} ${chip('Overdue','Overdue',counts.overdue)} ${chip('In progress','In progress',null)} ${chip('Pending','Pending',null)} ${chip('Completed','Completed',counts.completed)}
      </div>
      <div class="card overflow-hidden"><table class="table">
        <thead><tr><th>Task</th><th>Site</th><th>Assigned to</th><th>Due</th><th>Progress</th><th>Status</th><th></th></tr></thead>
        <tbody id="task-rows">${rows}</tbody></table></div>`;

    return { title:'Task Overview', html, mount() {
      document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>{ location.hash = b.dataset.go; });
      const chips=document.querySelectorAll('[data-filter]');
      chips.forEach(c=>c.onclick=()=>{
        const f=c.dataset.filter;
        chips.forEach(x=>{ x.classList.toggle('btn-primary', x===c); x.classList.toggle('btn-ghost', x!==c); });
        document.querySelectorAll('#task-rows tr').forEach(tr=>{ tr.style.display = (f==='all'||tr.dataset.status===f)?'':'none'; });
      });
    }};
  }

  /* ---------------- ASSETS & EQUIPMENT ---------------- */
  const passBadge = (r) => r === 'Pass' ? '<span class="badge badge-green">Pass</span>' : '<span class="badge badge-red">Fail</span>';
  function serviceBadge(iso) {
    const d = daysUntil(iso);
    if (d < 0) return `<span class="badge badge-red">Overdue ${Math.abs(d)}d</span>`;
    if (d <= 30) return `<span class="badge badge-amber">Due in ${d}d</span>`;
    return `<span class="badge badge-green">${fmt.date(iso)}</span>`;
  }
  function assets() {
    const list = S.db.assets;
    const stBadge = (s)=> s==='Operational'?'<span class="badge badge-green">Operational</span>':s==='Needs attention'?'<span class="badge badge-amber">Needs attention</span>':'<span class="badge badge-red">Out of service</span>';
    const rows = list.map(a=>`<tr>
      <td><div class="font-semibold">${escapeHtml(a.name)}</div><div class="text-xs text-ink-400">${escapeHtml(a.serial)} ? ${escapeHtml(a.supplier||'')}</div></td>
      <td>${escapeHtml(a.type)}</td><td>${escapeHtml(S.site(a.site).name)}</td>
      <td>${fmt.date(a.lastService)}</td><td>${serviceBadge(a.nextService)}</td><td>${stBadge(a.status)}</td>
      <td class="text-right"><button class="btn btn-ghost btn-sm" data-edit="${a.id}">Edit</button></td>
    </tr>`).join('');
    const overdue = list.filter(a=>daysUntil(a.nextService)<0).length;
    const down = list.filter(a=>a.status==='Out of service').length;
    const html = `
      ${sectionHeader('Assets & Equipment','Equipment register with service schedules and status', `<button class="btn btn-primary btn-sm" data-act="add">${icon('plus','ico')} Add asset</button>`)}
      <div class="grid sm:grid-cols-3 gap-4 mb-5">
        ${kpiCard('Total assets', list.length, 'box')}
        ${kpiCard('Service overdue', overdue, 'alert')}
        ${kpiCard('Out of service', down, 'wrench')}
      </div>
      <div class="card overflow-hidden"><table class="table"><thead><tr><th>Asset</th><th>Type</th><th>Site</th><th>Last service</th><th>Next service</th><th>Status</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`;
    return { title:'Assets', html, mount() {
      const open=(a)=>{
        const e=a||{name:'',type:'Refrigeration',serial:'',supplier:'',status:'Operational',lastService:new Date().toISOString(),nextService:new Date(Date.now()+180*864e5).toISOString()};
        modal(a?'Edit Asset':'Add Asset',`<div class="space-y-3">
          <input id="a_n" class="input" placeholder="Asset name" value="${escapeHtml(e.name)}">
          <div class="grid grid-cols-2 gap-3">
            <select id="a_t" class="select">${['Refrigeration','Cooking','Warewashing','Ventilation','Preparation','Other'].map(x=>`<option ${x===e.type?'selected':''}>${x}</option>`).join('')}</select>
            <select id="a_s" class="select">${['Operational','Needs attention','Out of service'].map(x=>`<option ${x===e.status?'selected':''}>${x}</option>`).join('')}</select>
          </div>
          <input id="a_sn" class="input" placeholder="Serial number" value="${escapeHtml(e.serial)}">
          <input id="a_sup" class="input" placeholder="Supplier / service provider" value="${escapeHtml(e.supplier||'')}">
          <div class="grid grid-cols-2 gap-3">
            <div><label class="label">Last service</label><input id="a_ls" type="date" class="input" value="${e.lastService.slice(0,10)}"></div>
            <div><label class="label">Next service</label><input id="a_ns" type="date" class="input" value="${e.nextService.slice(0,10)}"></div>
          </div>
          <button class="btn btn-primary w-full" id="a_save">${a?'Save':'Add asset'}</button></div>`);
        document.getElementById('a_save').onclick=()=>{
          const name=document.getElementById('a_n').value.trim(); if(!name)return toast('Enter a name','warn');
          const data={name,type:document.getElementById('a_t').value,status:document.getElementById('a_s').value,serial:document.getElementById('a_sn').value,supplier:document.getElementById('a_sup').value,lastService:new Date(document.getElementById('a_ls').value).toISOString(),nextService:new Date(document.getElementById('a_ns').value).toISOString()};
          if(a){Object.assign(a,data);}else{S.db.assets.push(Object.assign({id:S.uid('as'),site:S.db.currentSite,installed:new Date().toISOString()},data));}
          S.persist();closeModal();window.App.render();toast(a?'Asset updated':'Asset added');
        };
      };
      document.querySelector('[data-act="add"]').onclick=()=>open(null);
      document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>open(S.db.assets.find(x=>x.id===b.dataset.edit)));
    }};
  }

  /* ---------------- BATCH PRODUCTION ---------------- */
  function batches() {
    const list = S.db.batches.filter(b=>b.site===S.db.currentSite);
    const rows = list.map(b=>`<tr>
      <td><div class="font-semibold">${escapeHtml(b.product)}</div><div class="text-xs text-ink-400">${escapeHtml(b.batchNo)}</div></td>
      <td>${escapeHtml(b.qty)}</td><td>${fmt.date(b.made)}</td>
      <td>${b.cookTemp}?C</td><td>${passBadge(b.coolResult)}</td><td>${fmt.date(b.useBy)}</td>
      <td>${escapeHtml(S.member(b.by).name)}</td></tr>`).join('');
    const html = `
      ${sectionHeader('Batch Production','Cook ? cool ? use-by traceability for prepared batches', `<button class="btn btn-primary btn-sm" data-act="add">${icon('plus','ico')} New batch</button>`)}
      <div class="grid sm:grid-cols-3 gap-4 mb-5">
        ${kpiCard('Batches (site)', list.length, 'layers')}
        ${kpiCard('Cooling fails', list.filter(b=>b.coolResult==='Fail').length, 'alert')}
        ${kpiCard('Made today', list.filter(b=>fmt.date(b.made)===fmt.date(new Date().toISOString())).length, 'check')}
      </div>
      <div class="card overflow-hidden"><table class="table"><thead><tr><th>Product</th><th>Qty</th><th>Made</th><th>Cook temp</th><th>Cooling</th><th>Use-by</th><th>By</th></tr></thead><tbody>${rows||'<tr><td colspan=7 class="text-ink-400 p-4">No batches for this site.</td></tr>'}</tbody></table></div>`;
    return { title:'Batches', html, mount() {
      document.querySelector('[data-act="add"]').onclick=()=>{
        modal('New Batch',`<div class="space-y-3">
          <input id="b_p" class="input" placeholder="Product">
          <div class="grid grid-cols-2 gap-3"><input id="b_no" class="input" placeholder="Batch no"><input id="b_q" class="input" placeholder="Quantity (e.g. 8 trays)"></div>
          <div class="grid grid-cols-2 gap-3"><div><label class="label">Cook core temp (?C)</label><input id="b_ct" type="number" step="0.1" class="input" value="75"></div><select id="b_cr" class="select"><option>Pass</option><option>Fail</option></select></div>
          <div><label class="label">Use-by date</label><input id="b_ub" type="date" class="input" value="${new Date(Date.now()+2*864e5).toISOString().slice(0,10)}"></div>
          <button class="btn btn-primary w-full" id="b_save">Add batch</button></div>`);
        document.getElementById('b_save').onclick=()=>{
          const p=document.getElementById('b_p').value.trim(); if(!p)return toast('Enter a product','warn');
          S.db.batches.unshift({id:S.uid('bt'),product:p,batchNo:document.getElementById('b_no').value||('B-'+Date.now().toString().slice(-6)),site:S.db.currentSite,qty:document.getElementById('b_q').value,made:new Date().toISOString(),cookTemp:+document.getElementById('b_ct').value,coolResult:document.getElementById('b_cr').value,useBy:new Date(document.getElementById('b_ub').value).toISOString(),by:(S.db.team[0]?S.db.team[0].id:'u_sarah')});
          S.persist();closeModal();window.App.render();toast('Batch added');
        };
      };
    }};
  }

  /* ---------------- COOLING VERIFICATION ---------------- */
  function cooling() {
    const list = S.db.cooling.filter(c=>c.site===S.db.currentSite);
    const rows = list.map(c=>`<tr>
      <td class="font-semibold">${escapeHtml(c.item)}</td>
      <td>${c.startTemp}?C<div class="text-xs text-ink-400">${fmt.ago(c.startAt)}</div></td>
      <td>${c.s1Temp}?C <span class="text-xs text-ink-400">/ ${c.s1Mins}min</span></td>
      <td>${c.s2Temp}?C <span class="text-xs text-ink-400">/ ${c.s2Mins}min</span></td>
      <td>${passBadge(c.result)}</td><td>${escapeHtml(S.member(c.by).name)}</td></tr>`).join('');
    const html = `
      ${sectionHeader('Cooling Verification','Two-stage cooling: 60?21?C within 2h, then ?5?C within 4h', `<button class="btn btn-primary btn-sm" data-act="add">${icon('plus','ico')} Log cooling</button>`)}
      <div class="grid sm:grid-cols-3 gap-4 mb-5">
        ${kpiCard('Logs (site)', list.length, 'snow')}
        ${kpiCard('Passes', list.filter(c=>c.result==='Pass').length, 'check')}
        ${kpiCard('Fails', list.filter(c=>c.result==='Fail').length, 'alert')}
      </div>
      <div class="card overflow-hidden"><table class="table"><thead><tr><th>Item</th><th>Start</th><th>Stage 1 (?21?C/2h)</th><th>Stage 2 (?5?C/4h)</th><th>Result</th><th>By</th></tr></thead><tbody>${rows||'<tr><td colspan=6 class="text-ink-400 p-4">No cooling logs for this site.</td></tr>'}</tbody></table></div>`;
    return { title:'Cooling', html, mount() {
      document.querySelector('[data-act="add"]').onclick=()=>{
        modal('Log Cooling',`<div class="space-y-3">
          <input id="c_i" class="input" placeholder="Item">
          <div class="grid grid-cols-2 gap-3"><div><label class="label">Start temp ?C</label><input id="c_st" type="number" step="0.1" class="input" value="60"></div></div>
          <div class="grid grid-cols-2 gap-3"><div><label class="label">Stage 1 temp ?C</label><input id="c_s1t" type="number" step="0.1" class="input" value="21"></div><div><label class="label">Stage 1 mins</label><input id="c_s1m" type="number" class="input" value="120"></div></div>
          <div class="grid grid-cols-2 gap-3"><div><label class="label">Stage 2 temp ?C</label><input id="c_s2t" type="number" step="0.1" class="input" value="5"></div><div><label class="label">Stage 2 mins</label><input id="c_s2m" type="number" class="input" value="240"></div></div>
          <button class="btn btn-primary w-full" id="c_save">Save (auto-graded)</button></div>`);
        document.getElementById('c_save').onclick=()=>{
          const item=document.getElementById('c_i').value.trim(); if(!item)return toast('Enter an item','warn');
          const s1t=+document.getElementById('c_s1t').value,s1m=+document.getElementById('c_s1m').value,s2t=+document.getElementById('c_s2t').value,s2m=+document.getElementById('c_s2m').value;
          const result=(s1t<=21&&s1m<=120&&s2t<=5&&s2m<=360)?'Pass':'Fail';
          S.db.cooling.unshift({id:S.uid('co'),item,site:S.db.currentSite,startTemp:+document.getElementById('c_st').value,startAt:new Date().toISOString(),s1Temp:s1t,s1Mins:s1m,s2Temp:s2t,s2Mins:s2m,by:(S.db.team[0]?S.db.team[0].id:'u_sarah'),result});
          S.persist();closeModal();window.App.render();toast('Cooling logged: '+result, result==='Pass'?'success':'error');
        };
      };
    }};
  }

  /* ---------------- pH MONITORING ---------------- */
  function phlogs() {
    const list = S.db.phlogs.filter(p=>p.site===S.db.currentSite);
    const rows = list.map(p=>`<tr>
      <td class="font-semibold">${escapeHtml(p.item)}</td>
      <td><span class="font-mono">${p.ph}</span></td><td>${escapeHtml(p.target)}</td>
      <td>${passBadge(p.result)}</td><td>${escapeHtml(S.member(p.by).name)}</td><td>${fmt.ago(p.at)}</td></tr>`).join('');
    const html = `
      ${sectionHeader('pH Monitoring','Acidified foods & sanitiser solutions ? pH checks against targets', `<button class="btn btn-primary btn-sm" data-act="add">${icon('plus','ico')} Log pH</button>`)}
      <div class="grid sm:grid-cols-3 gap-4 mb-5">
        ${kpiCard('Readings (site)', list.length, 'droplet')}
        ${kpiCard('In spec', list.filter(p=>p.result==='Pass').length, 'check')}
        ${kpiCard('Out of spec', list.filter(p=>p.result==='Fail').length, 'alert')}
      </div>
      <div class="card overflow-hidden"><table class="table"><thead><tr><th>Item</th><th>pH</th><th>Target</th><th>Result</th><th>By</th><th>When</th></tr></thead><tbody>${rows||'<tr><td colspan=6 class="text-ink-400 p-4">No pH readings for this site.</td></tr>'}</tbody></table></div>`;
    return { title:'pH Monitor', html, mount() {
      document.querySelector('[data-act="add"]').onclick=()=>{
        modal('Log pH Reading',`<div class="space-y-3">
          <input id="p_i" class="input" placeholder="Item / solution">
          <div class="grid grid-cols-2 gap-3"><div><label class="label">pH value</label><input id="p_v" type="number" step="0.1" class="input" value="4.2"></div><div><label class="label">Target</label><input id="p_t" class="input" value="? 4.6"></div></div>
          <select id="p_r" class="select"><option>Pass</option><option>Fail</option></select>
          <button class="btn btn-primary w-full" id="p_save">Add reading</button></div>`);
        document.getElementById('p_save').onclick=()=>{
          const item=document.getElementById('p_i').value.trim(); if(!item)return toast('Enter an item','warn');
          S.db.phlogs.unshift({id:S.uid('ph'),item,site:S.db.currentSite,ph:+document.getElementById('p_v').value,target:document.getElementById('p_t').value,by:(S.db.team[0]?S.db.team[0].id:'u_sarah'),at:new Date().toISOString(),result:document.getElementById('p_r').value});
          S.persist();closeModal();window.App.render();toast('pH logged');
        };
      };
    }};
  }

  /* ---------------- HOT & COLD HOLDING ---------------- */
  function holding() {
    const all = S.db.holding.filter(h=>h.site===S.db.currentSite);
    const hot = all.filter(h=>h.kind==='Hot'), cold = all.filter(h=>h.kind==='Cold');
    const pass = all.filter(h=>h.result==='Pass').length;
    const compliance = all.length ? Math.round(pass/all.length*100) : 100;
    const periodBadge=(p)=> p?`<span class="badge badge-gray">${escapeHtml(p)}</span>`:'';
    const row = (h)=>`<tr data-kind="${h.kind}">
      <td class="font-semibold">${escapeHtml(h.unit)}</td>
      <td>${h.kind==='Hot'?'<span class="badge badge-red">Hot</span>':'<span class="badge badge-blue">Cold</span>'}</td>
      <td>${periodBadge(h.period)}</td>
      <td class="font-semibold ${h.result==='Fail'?'text-red-600':''}">${h.temp}?C</td>
      <td class="text-ink-400">${h.kind==='Hot'?'? '+h.target:'? '+h.target}?C</td>
      <td>${passBadge(h.result)}</td>
      <td class="text-xs ${h.result==='Fail'?'text-ink-700':'text-ink-300'}">${h.action?escapeHtml(h.action):(h.result==='Fail'?'?':'')}</td>
      <td>${escapeHtml(S.member(h.by).name)}</td><td>${fmt.ago(h.at)}</td></tr>`;
    const rows = all.map(row).join('');
    const html = `
      ${sectionHeader('Hot & Cold Holding','Service temperature checks ? hot held ?63?C, cold held ?8?C', `<button class="btn btn-primary btn-sm" data-act="add">${icon('plus','ico')} Log holding</button>`)}
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        ${kpiCard('Compliance', compliance+'%', 'check')}
        ${kpiCard('Hot checks', hot.length+' ? '+hot.filter(h=>h.result==='Pass').length+' ok', 'temp')}
        ${kpiCard('Cold checks', cold.length+' ? '+cold.filter(h=>h.result==='Pass').length+' ok', 'snow')}
        ${kpiCard('Out of range', all.filter(h=>h.result==='Fail').length, 'alert')}
      </div>
      <div class="flex flex-wrap gap-2 mb-3" id="hold-filters">
        <button class="btn btn-sm btn-primary" data-hf="all">All (${all.length})</button>
        <button class="btn btn-sm btn-ghost" data-hf="Hot">Hot (${hot.length})</button>
        <button class="btn btn-sm btn-ghost" data-hf="Cold">Cold (${cold.length})</button>
      </div>
      <div class="card overflow-hidden"><table class="table"><thead><tr><th>Unit</th><th>Type</th><th>Service</th><th>Temp</th><th>Target</th><th>Result</th><th>Corrective action</th><th>By</th><th>When</th></tr></thead><tbody id="hold-rows">${rows||'<tr><td colspan=9 class="text-ink-400 p-4">No holding checks for this site.</td></tr>'}</tbody></table></div>`;
    return { title:'Holding', html, mount() {
      const chips=document.querySelectorAll('[data-hf]');
      chips.forEach(c=>c.onclick=()=>{
        const f=c.dataset.hf;
        chips.forEach(x=>{ x.classList.toggle('btn-primary',x===c); x.classList.toggle('btn-ghost',x!==c); });
        document.querySelectorAll('#hold-rows tr').forEach(tr=>{ tr.style.display=(f==='all'||tr.dataset.kind===f)?'':'none'; });
      });
      document.querySelector('[data-act="add"]').onclick=()=>{
        modal('Log Holding Check',`<div class="space-y-3">
          <input id="h_u" class="input" placeholder="Unit (e.g. Hot Hold Counter)">
          <div class="grid grid-cols-3 gap-3">
            <select id="h_k" class="select"><option>Hot</option><option>Cold</option></select>
            <select id="h_p" class="select"><option>Breakfast</option><option selected>Lunch</option><option>Dinner</option></select>
            <div><label class="label">Temp ?C</label><input id="h_t" type="number" step="0.1" class="input" value="70"></div>
          </div>
          <div id="h_grade" class="text-sm font-semibold"></div>
          <div id="h_actwrap" class="hidden"><label class="label">Corrective action (required on fail)</label><textarea id="h_act" class="input" rows="2" placeholder="What did you do to correct it?"></textarea></div>
          <button class="btn btn-primary w-full" id="h_save">Save (auto-graded)</button></div>`);
        const grade=()=>{ const kind=document.getElementById('h_k').value, temp=+document.getElementById('h_t').value; const result=kind==='Hot'?(temp>=63?'Pass':'Fail'):(temp<=8?'Pass':'Fail'); document.getElementById('h_grade').innerHTML=`Auto-grade: <span class="${result==='Pass'?'text-brand-700':'text-red-600'}">${result}</span> (${kind} target ${kind==='Hot'?'?63':'?8'}?C)`; document.getElementById('h_actwrap').classList.toggle('hidden', result!=='Fail'); return result; };
        document.getElementById('h_k').onchange=grade; document.getElementById('h_t').oninput=grade; grade();
        document.getElementById('h_save').onclick=()=>{
          const unit=document.getElementById('h_u').value.trim(); if(!unit)return toast('Enter a unit','warn');
          const kind=document.getElementById('h_k').value,temp=+document.getElementById('h_t').value,period=document.getElementById('h_p').value;
          const target=kind==='Hot'?63:8; const result=kind==='Hot'?(temp>=63?'Pass':'Fail'):(temp<=8?'Pass':'Fail');
          const action=document.getElementById('h_act')?document.getElementById('h_act').value.trim():'';
          if(result==='Fail'&&!action)return toast('Record the corrective action taken','warn');
          S.db.holding.unshift({id:S.uid('hd'),unit,kind,site:S.db.currentSite,temp,target,period,by:(S.db.team[0]?S.db.team[0].id:'u_sarah'),at:new Date().toISOString(),result,action});
          S.persist();closeModal();window.App.render();toast('Holding logged: '+result, result==='Pass'?'success':'error');
        };
      };
    }};
  }

  /* ---------------- MAINTENANCE / REPAIR TICKETS ---------------- */
  function sendEmail(to, subject, body) {
    const url = 'mailto:' + encodeURIComponent(to) + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
    const a = document.createElement('a'); a.href = url; a.style.display = 'none';
    document.body.appendChild(a); a.click(); setTimeout(() => a.remove(), 0);
  }
  function maintenance() {
    const list = S.db.maintenance.slice().sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
    const priBadge=(p)=> p==='High'?'<span class="badge badge-red">High</span>':p==='Medium'?'<span class="badge badge-amber">Medium</span>':'<span class="badge badge-gray">Low</span>';
    const stBadge=(s)=> s==='Resolved'?'<span class="badge badge-green">Resolved</span>':s==='In progress'?'<span class="badge badge-amber">In progress</span>':s==='Acknowledged'?'<span class="badge badge-amber">Acknowledged</span>':'<span class="badge badge-red">Open</span>';
    const cards = list.map(t=>{
      const last=t.thread[t.thread.length-1];
      return `<div class="card card-pad fade-in">
        <div class="flex items-start justify-between gap-3 mb-1">
          <div><div class="font-bold">${escapeHtml(t.title)}</div>
          <div class="text-xs text-ink-400">${escapeHtml(t.asset)} ? ${escapeHtml(S.site(t.site).name)} ? ${fmt.ago(t.createdAt)}${t.ref?' ? ref '+escapeHtml(t.ref):''}</div></div>
          <div class="flex flex-col items-end gap-1">${priBadge(t.priority)}${stBadge(t.status)}</div>
        </div>
        <div class="text-xs text-ink-500 mb-2">${icon('mail','inline w-3.5 h-3.5')} ${escapeHtml(t.dept)} ? ${escapeHtml(t.email)}</div>
        <div class="p-2.5 rounded-xl bg-ink-50 border border-ink-100 text-sm">
          <span class="font-semibold ${last.type==='dept'?'text-brand-700':'text-ink-700'}">${escapeHtml(last.by)}${last.type==='dept'?' (dept)':''}:</span>
          ${escapeHtml((last.body||'').slice(0,140))}${(last.body||'').length>140?'?':''}
          <div class="text-[11px] text-ink-400 mt-1">${fmt.ago(last.at)} ? ${t.thread.length} message(s)</div>
        </div>
        <div class="flex gap-2 mt-3">
          <button class="btn btn-ghost btn-sm" data-open="${t.id}">${icon('records','ico')} Open thread</button>
          <button class="btn btn-ghost btn-sm" data-reply="${t.id}">${icon('mail','ico')} Email update</button>
        </div>
      </div>`;
    }).join('');
    const open = list.filter(t=>t.status!=='Resolved').length;
    const html = `
      ${sectionHeader('Maintenance & Repairs','Raise repair tickets, email the maintenance department, and get live updates back', `<button class="btn btn-primary btn-sm" data-act="new">${icon('plus','ico')} New ticket</button>`)}
      <div class="grid sm:grid-cols-3 gap-4 mb-5">
        ${kpiCard('Total tickets', list.length, 'wrench')}
        ${kpiCard('Open / in progress', open, 'alert')}
        ${kpiCard('Resolved', list.length-open, 'check')}
      </div>
      <div class="grid md:grid-cols-2 gap-5">${cards||'<div class="text-ink-400">No tickets yet.</div>'}</div>`;
    return { title:'Maintenance', html, mount() {
      const assets = [...new Set(S.db.sensors.map(s=>s.name).concat(['Dishwasher','Oven','Extraction Hood','Walk-in Fridge','Freezer','Ice Machine','Coffee Machine','Plumbing','Electrical','Other']))];
      const me = (S.session && S.session()) ? (S.session().name||'Kitchen') : (S.db.team[0]?S.db.team[0].name:'Kitchen');

      const newTicket = () => {
        modal('New Maintenance Ticket', `<div class="space-y-3">
          <input id="mt_title" class="input" placeholder="What's the problem? (title)">
          <div class="grid grid-cols-2 gap-3">
            <input id="mt_asset" class="input" list="assetList" placeholder="Equipment / asset">
            <datalist id="assetList">${assets.map(a=>`<option value="${escapeHtml(a)}">`).join('')}</datalist>
            <select id="mt_pri" class="select">${['Low','Medium','High'].map(x=>`<option ${x==='Medium'?'selected':''}>${x}</option>`).join('')}</select>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <input id="mt_dept" class="input" placeholder="Department / company" value="Facilities Team">
            <input id="mt_email" class="input" placeholder="Email to send to" value="maintenance@kiteline.uk">
          </div>
          <input id="mt_subj" class="input" placeholder="Email subject">
          <textarea id="mt_body" class="input" rows="4" placeholder="Describe the fault?"></textarea>
          <label class="flex items-center gap-2 text-sm"><input type="checkbox" id="mt_send" class="accent-brand-600" checked> Open email to send now</label>
          <button class="btn btn-primary w-full" id="mt_save">${icon('mail','ico')} Create ticket &amp; email</button>
        </div>`, {wide:true});
        const titleEl=document.getElementById('mt_title'), subjEl=document.getElementById('mt_subj');
        titleEl.oninput=()=>{ if(!subjEl.dataset.touched) subjEl.value='Maintenance request: '+titleEl.value; };
        subjEl.oninput=()=>{ subjEl.dataset.touched='1'; };
        document.getElementById('mt_save').onclick=()=>{
          const title=titleEl.value.trim(); if(!title)return toast('Enter a title','warn');
          const email=document.getElementById('mt_email').value.trim();
          const subject=subjEl.value.trim()||('Maintenance request: '+title);
          const body=document.getElementById('mt_body').value.trim()||title;
          const t={ id:S.uid('mt'), title, asset:document.getElementById('mt_asset').value||'General', site:S.db.currentSite,
            priority:document.getElementById('mt_pri').value, status:'Open', dept:document.getElementById('mt_dept').value||'Facilities Team',
            email, createdBy:(S.db.team[0]?S.db.team[0].id:'u_sarah'), createdAt:new Date().toISOString(), ref:'',
            thread:[{ at:new Date().toISOString(), by:me, type:'app', subject, body }] };
          S.db.maintenance.unshift(t); S.persist(); S._pushRemote(true);
          if(document.getElementById('mt_send').checked) sendEmail(email, subject, body);
          closeModal(); window.App.render(); toast('Ticket created'+(document.getElementById('mt_send')&&document.getElementById('mt_send').checked?' ? opening email?':''));
        };
      };

      const viewTicket = (id) => {
        const t=S.db.maintenance.find(x=>x.id===id);
        const thread=t.thread.map(m=>`<div class="flex ${m.type==='dept'?'justify-start':'justify-end'}">
          <div class="max-w-[80%] p-2.5 rounded-xl text-sm ${m.type==='dept'?'bg-brand-50 border border-brand-100':'bg-ink-100'}">
            <div class="text-[11px] font-semibold ${m.type==='dept'?'text-brand-700':'text-ink-600'}">${escapeHtml(m.by)}${m.type==='dept'?' ? maintenance':''}</div>
            ${m.subject?`<div class="text-xs font-semibold">${escapeHtml(m.subject)}</div>`:''}
            <div>${escapeHtml(m.body)}</div>
            <div class="text-[10px] text-ink-400 mt-1">${fmt.ago(m.at)}</div>
          </div></div>`).join('');
        modal(t.title, `<div class="space-y-3">
          <div class="text-xs text-ink-400">${escapeHtml(t.asset)} ? ${escapeHtml(S.site(t.site).name)} ? to ${escapeHtml(t.email)}${t.ref?' ? ref '+escapeHtml(t.ref):''}</div>
          <div class="space-y-2 max-h-72 overflow-auto p-1">${thread}</div>
          <div class="border-t border-ink-100 pt-3 space-y-2">
            <select id="v_status" class="select">${['Open','Acknowledged','In progress','Resolved'].map(x=>`<option ${x===t.status?'selected':''}>${x}</option>`).join('')}</select>
            <textarea id="v_msg" class="input" rows="2" placeholder="Write an update / email to the department?"></textarea>
            <div class="flex gap-2">
              <button class="btn btn-ghost btn-sm flex-1" id="v_status_save">Update status</button>
              <button class="btn btn-primary btn-sm flex-1" id="v_send">${icon('mail','ico')} Send email update</button>
            </div>
          </div>
        </div>`, {wide:true});
        document.getElementById('v_status_save').onclick=()=>{ t.status=document.getElementById('v_status').value; S.persist(); S._pushRemote(true); closeModal(); window.App.render(); toast('Status updated'); };
        document.getElementById('v_send').onclick=()=>{
          const body=document.getElementById('v_msg').value.trim(); if(!body)return toast('Write a message','warn');
          const subject='Re: '+t.title+(t.ref?' (ref '+t.ref+')':'');
          t.thread.push({ at:new Date().toISOString(), by:me, type:'app', subject, body });
          t.status=document.getElementById('v_status').value; S.persist(); S._pushRemote(true);
          sendEmail(t.email, subject, body); closeModal(); window.App.render(); toast('Email opened & logged');
        };
      };

      document.querySelector('[data-act="new"]').onclick=newTicket;
      document.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>viewTicket(b.dataset.open));
      document.querySelectorAll('[data-reply]').forEach(b=>b.onclick=()=>viewTicket(b.dataset.reply));
    }};
  }

  /* ---------------- USER MANUAL (multilingual) ---------------- */
  function manual() {
    const I = window.I18n;
    const m = I.manual();
    const langBtns = I.langs.map(l=>`<button class="btn ${l===I.lang?'btn-primary':'btn-ghost'} btn-sm" data-lang="${l}">${I.langName(l)}</button>`).join('');
    const html = `
      ${sectionHeader('User Manual', 'How to use every part of Kiteline ? available in multiple languages', `<button class="btn btn-ghost btn-sm" data-act="print">${icon('print','ico')} Print</button>`)}
      <div class="flex flex-wrap gap-2 mb-5">${langBtns}</div>
      <div class="card card-pad fade-in" id="manualDoc">
        <p class="text-ink-600 mb-5 text-lg">${escapeHtml(m.intro)}</p>
        <div class="grid lg:grid-cols-2 gap-5">
          ${m.sections.map((s,i)=>`<div class="rounded-xl border border-ink-100 p-4">
            <h3 class="font-bold mb-2 flex items-center gap-2"><span class="w-6 h-6 rounded-full bg-brand-100 text-brand-700 text-xs font-bold flex items-center justify-center flex-none">${i+1}</span>${escapeHtml(s.t)}</h3>
            <ul class="list-disc pl-5 text-sm text-ink-600 space-y-1">${s.b.map(x=>`<li>${escapeHtml(x)}</li>`).join('')}</ul>
          </div>`).join('')}
        </div>
      </div>`;
    return { title:'Manual', html, mount() {
      document.querySelectorAll('[data-lang]').forEach(b=>b.onclick=()=>{ window.I18n.setLang(b.dataset.lang); toast('Language: '+window.I18n.langName(b.dataset.lang)); window.App.render(); });
      const p=document.querySelector('[data-act="print"]'); if(p) p.onclick=()=>window.print();
    }};
  }

  /* ---------------- SETTINGS ---------------- */
  function settings() {
    const o=S.db.org;
    const prod=[['fss','SafeServe (HACCP)'],['allerq','MenuGuard'],['labels','LabelSmart'],['waste','WasteWise']];
    const html = `
      ${sectionHeader('Settings','Organisation, products, notifications & billing')}
      <div class="grid lg:grid-cols-2 gap-5">
        <div class="card card-pad">
          <h3 class="font-bold mb-3">Organisation</h3>
          <label class="label">Name</label><input id="orgname" class="input mb-3" value="${escapeHtml(o.name)}">
          <label class="label">Plan</label><input class="input mb-3" value="${escapeHtml(o.plan)}" disabled>
          <label class="label">Currency</label>
          <select id="cur" class="select"><option ${o.currency==='GBP'?'selected':''}>GBP</option><option ${o.currency==='USD'?'selected':''}>USD</option><option ${o.currency==='EUR'?'selected':''}>EUR</option></select>
          <button class="btn btn-primary w-full mt-4" id="saveorg">Save changes</button>
        </div>
        <div class="card card-pad" id="billingCard">
          <h3 class="font-bold mb-1">Billing</h3>
          <p class="text-sm text-ink-500 mb-2" id="billingLine">Checking subscription?</p>
          <p class="text-xs text-ink-400 mb-3 hidden" id="billingTeamLine"></p>
          <div class="flex flex-wrap gap-2" id="billingPlanBtns"></div>
          <button class="btn btn-ghost btn-sm hidden mt-2" id="billPortal">Manage subscription</button>
          <p class="text-xs text-ink-400 mt-3" id="billingHint"></p>
        </div>
        <div class="card card-pad">
          <h3 class="font-bold mb-3">Active Products</h3>
          ${prod.map(([k,l])=>`<label class="flex items-center justify-between py-2 cursor-pointer"><span class="text-sm font-medium">${l}</span><input type="checkbox" data-prod="${k}" ${o.products[k]?'checked':''} class="w-5 h-5 accent-brand-600"></label>`).join('')}
          <h3 class="font-bold mt-5 mb-3">Notification Channels</h3>
          ${[['sms','SMS'],['email','Email'],['push','Push']].map(([k,l])=>`<label class="flex items-center justify-between py-2 cursor-pointer"><span class="text-sm font-medium">${l}</span><input type="checkbox" data-ch="${k}" ${o.channels[k]?'checked':''} class="w-5 h-5 accent-brand-600"></label>`).join('')}
          <p class="text-xs text-ink-400 mt-2">Email ? Admins. SMS ? Admins + site Managers with a mobile on Team (or NOTIFY_PHONE in server/.env).</p>
          <button class="btn btn-ghost btn-sm w-full mt-3" id="testemail">${icon('mail','ico')} Send test email</button>
          <button class="btn btn-ghost btn-sm w-full mt-2" id="testsms">${icon('mail','ico')} Send test SMS</button>
          <p class="text-xs text-ink-400 mt-3" id="notifyStatus">Checking notification setup?</p>
        </div>
        <div class="card card-pad lg:col-span-2" id="recipeAiCard">
          <h3 class="font-bold mb-1">Recipe AI assistant ? 3 ways to enable</h3>
          <p class="text-sm text-ink-500 mb-2" id="recipeAiLine">Checking?</p>
          <p class="text-xs text-ink-400 mb-3" id="recipeAiUsage"></p>
          <div id="recipeAiServerBits" class="flex flex-wrap gap-2 mb-4 text-[10px] font-semibold uppercase tracking-wide"></div>
          <div class="grid md:grid-cols-3 gap-4">
            <div class="rounded-xl border border-brand-200 bg-brand-50/50 p-4">
              <p class="text-xs font-bold text-brand-800 mb-1">Option A</p>
              <p class="text-sm font-bold text-brand-900 mb-1">Kiteline subscription</p>
              <p class="text-xs text-ink-600 mb-3">Your company pays Kiteline monthly. AI runs on our server ? <b>not charged to other customers</b>.</p>
              <button class="btn btn-primary btn-sm w-full" id="recipeAiSubscribe">Subscribe to Recipe AI</button>
              <a href="mailto:contact@kiteline.uk?subject=Recipe%20AI%20subscription" class="btn btn-ghost btn-sm w-full mt-2 hidden" id="recipeAiSubscribeEmail">Email to subscribe</a>
              <p class="text-xs text-ink-400 mt-2" id="recipeAiPrice">?</p>
            </div>
            <div class="rounded-xl border border-ink-200 bg-ink-50 p-4">
              <p class="text-xs font-bold text-ink-500 mb-1">Option B</p>
              <p class="text-sm font-bold mb-1">Your own OpenAI key</p>
              <p class="text-xs text-ink-600 mb-2">OpenAI bills <b>your company</b> directly at <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener" class="text-brand-700 font-semibold">platform.openai.com</a></p>
              <input id="recipeAiKey" type="password" class="input text-sm mb-2" placeholder="sk-?" autocomplete="off">
              <div class="flex gap-2">
                <button class="btn btn-primary btn-sm flex-1" id="recipeAiSaveKey">Save key</button>
                <button class="btn btn-ghost btn-sm" id="recipeAiRemoveKey">Remove</button>
              </div>
            </div>
            <div class="rounded-xl border border-amber-200 bg-amber-50/80 p-4" id="recipeAiOptionC">
              <p class="text-xs font-bold text-amber-800 mb-1">Option C</p>
              <p class="text-sm font-bold mb-1">Kiteline sets up for you</p>
              <p class="text-xs text-ink-600 mb-3">Email <a href="mailto:contact@kiteline.uk?subject=Enable%20Recipe%20AI%20for%20my%20company" class="text-brand-700 font-semibold">contact@kiteline.uk</a> ? we enable AI on your account (invoice separately).</p>
              <p class="text-xs text-ink-500 hidden" id="recipeAiGrantHint">Owner: use the panel below to enable a customer instantly.</p>
            </div>
          </div>
        </div>
        <div class="card card-pad lg:col-span-2" id="dietarySettingsCard">
          <h3 class="font-bold mb-1">Dietary rules (this company only)</h3>
          <p class="text-sm text-ink-500 mb-3">Optional filters for <b>your</b> menus and ChatGPT tools — vegetarian, vegan, Jain, Ekadashi, halal, kosher, gluten-free, and more. Nothing is forced on other Kiteline customers.</p>
          <div class="grid sm:grid-cols-2 gap-2 mb-3 text-sm" id="dietaryRulesGrid"></div>
          <label class="label">Notes for your team / ChatGPT</label>
          <textarea id="dietaryNotes" class="input mb-3 min-h-[72px]" placeholder="e.g. Friday fish specials; no cross-contamination notes for nut-free room"></textarea>
          <button type="button" class="btn btn-primary btn-sm" id="dietarySaveBtn">Save dietary settings</button>
          <p class="text-xs text-ink-400 mt-2" id="dietarySaveStatus"></p>
        </div>
        <div class="card card-pad lg:col-span-2" id="chatgptAiCard">
          <h3 class="font-bold mb-1">Connect ChatGPT</h3>
          <p class="text-sm text-ink-500 mb-3">Link <b>this company’s</b> Kiteline workspace to a Custom GPT (GPT Actions) or MCP. Hotels, restaurants, catering, schools, care homes, cafés and other hospitality sites each keep their own secure data. Never share your Kiteline password — use an AI token or OAuth.</p>
          <div class="rounded-xl border border-brand-200 bg-brand-50/40 p-4 mb-4">
            <p class="text-xs font-bold text-brand-800 uppercase tracking-wide mb-2">Schema URL (paste in ChatGPT Actions)</p>
            <code class="text-xs break-all block mb-2" id="chatgptSchemaUrl">https://kiteline.uk/api/ai/openapi.json</code>
            <button type="button" class="btn btn-ghost btn-sm" id="chatgptCopySchema">Copy schema URL</button>
            <p class="text-xs text-ink-500 mt-2">MCP discovery: <code>https://kiteline.uk/mcp</code> · Setup guide: <a href="/chatgpt.html" class="text-brand-700 font-semibold" target="_blank" rel="noopener">kiteline.uk/chatgpt</a></p>
          </div>
          <div id="chatgptOAuthBox" class="rounded-xl border border-ink-200 bg-ink-50 p-4 mb-4 text-sm hidden">
            <p class="font-semibold mb-2">OAuth (recommended for customers)</p>
            <p class="text-xs text-ink-500 mb-2" id="chatgptOAuthStatus">Checking?</p>
            <div class="space-y-1 text-xs"><div><span class="text-ink-400">Client ID:</span> <code id="chatgptClientId">?</code></div>
            <div><span class="text-ink-400">Authorization URL:</span> <code class="break-all" id="chatgptAuthUrl">?</code></div>
            <div><span class="text-ink-400">Token URL:</span> <code class="break-all" id="chatgptTokenUrl">?</code></div></div>
          </div>
          <div id="chatgptAdminOnly">
            <p class="text-xs font-bold text-ink-500 uppercase tracking-wide mb-2">AI permissions for this token</p>
            <div class="grid sm:grid-cols-2 gap-2 mb-4 text-sm" id="chatgptPermGrid"></div>
            <label class="label">Token label</label>
            <input id="chatgptTokenLabel" class="input mb-3 max-w-md" value="ChatGPT" placeholder="ChatGPT">
            <div class="flex flex-wrap gap-2 mb-4">
              <button type="button" class="btn btn-primary btn-sm" id="chatgptCreateToken">Create AI token</button>
            </div>
            <div id="chatgptNewTokenBox" class="hidden rounded-xl border-2 border-amber-300 bg-amber-50 p-4 mb-4">
              <p class="text-sm font-bold text-amber-900 mb-1">Copy this token now ? shown once only</p>
              <code class="text-xs break-all block mb-2" id="chatgptNewToken"></code>
              <button type="button" class="btn btn-primary btn-sm" id="chatgptCopyToken">Copy token</button>
              <p class="text-xs text-ink-500 mt-2">Paste into ChatGPT ? GPT Actions ? Authentication (API Key / Bearer). Do not paste in chat.</p>
            </div>
            <p class="text-xs font-bold text-ink-500 uppercase tracking-wide mb-2">Active tokens</p>
            <div id="chatgptTokenList" class="text-sm text-ink-500">Loading?</div>
          </div>
          <p class="text-xs text-ink-400 mt-2 hidden" id="chatgptStaffNote">Only <b>Admins</b> can create ChatGPT tokens. Ask your manager to enable access in Settings.</p>
        </div>
        <div class="card card-pad lg:col-span-2 hidden" id="recipeAiGrantCard">
          <h3 class="font-bold mb-1">Owner ? enable Recipe AI for a customer</h3>
          <p class="text-sm text-ink-500 mb-3">Turn on Kiteline-hosted AI for a registered company without Stripe (uses your platform OpenAI key).</p>
          <div class="flex flex-wrap gap-2 max-w-xl">
            <input id="recipeAiGrantEmail" class="input flex-1 min-w-[200px]" placeholder="customer@company.com">
            <button class="btn btn-primary btn-sm" id="recipeAiGrantOn">Enable</button>
            <button class="btn btn-ghost btn-sm" id="recipeAiGrantOff">Disable</button>
          </div>
        </div>
        <div class="card card-pad lg:col-span-2" id="staffQrCard">
          <h3 class="font-bold mb-1">Staff QR ? scan to install app</h3>
          <p class="text-sm text-ink-500 mb-4">Print or display this QR so employees can open Kiteline on their phone and add it to their home screen. Links to <b>${escapeHtml(S.site(S.db.currentSite).name)}</b>.</p>
          <div class="flex flex-wrap items-center gap-6">
            <div id="settingsStaffQr" class="p-3 bg-white rounded-xl border border-ink-100"></div>
            <div class="flex-1 min-w-[200px] space-y-2">
              <p class="text-xs text-ink-500 break-all">${escapeHtml(employeeAppUrl(S.db.currentSite, 'register'))}</p>
              <div class="flex flex-wrap gap-2">
                <button class="btn btn-primary btn-sm" id="settingsStaffQrModal">${icon('qr','ico')} Full screen / print</button>
                <button class="btn btn-ghost btn-sm" id="settingsStaffQrCopy">Copy link</button>
              </div>
              <p class="text-xs text-ink-400">Also on <b>Team</b> and each site card under <b>Sites</b>. Per-site QR codes use that kitchen?s link.</p>
            </div>
          </div>
        </div>
        <div class="card card-pad lg:col-span-2" id="iotCard">
          <h3 class="font-bold mb-1">Temperature sensors (IoT setup)</h3>
          <p class="text-sm text-ink-500 mb-3">Register each probe in <b>Temperatures ? Add sensor</b>, then point your hardware at the ingest URL below using the <b>device ID</b> shown on each sensor card.</p>
          <div id="iotStatus" class="text-sm text-ink-500 mb-3">Checking server?</div>
          <div class="grid md:grid-cols-2 gap-4 text-sm">
            <div class="rounded-lg bg-ink-50 p-3">
              <div class="text-xs font-semibold text-ink-500 uppercase tracking-wide mb-1">Ingest URL</div>
              <code id="iotUrl" class="text-xs break-all">?</code>
              <button type="button" class="btn btn-ghost btn-sm mt-2" id="cpIotUrl">Copy URL</button>
            </div>
            <div class="rounded-lg bg-ink-50 p-3">
              <div class="text-xs font-semibold text-ink-500 uppercase tracking-wide mb-1">API key (x-api-key header)</div>
              <code id="iotKey" class="text-xs break-all">?</code>
              <button type="button" class="btn btn-ghost btn-sm mt-2" id="cpIotKey">Copy key</button>
              <p class="text-xs text-ink-400 mt-2" id="iotKeyHint"></p>
            </div>
          </div>
          <div class="mt-4">
            <div class="text-xs font-semibold text-ink-500 uppercase tracking-wide mb-2">Example JSON body</div>
            <pre id="iotExample" class="text-xs bg-ink-900 text-ink-100 rounded-lg p-3 overflow-x-auto">{"sensorId":"s1","temp":3.4,"battery":92}</pre>
          </div>
          <div class="mt-4">
            <div class="text-xs font-semibold text-ink-500 uppercase tracking-wide mb-2">Sensors at this site</div>
            <div id="iotSensorList" class="text-sm text-ink-500">?</div>
          </div>
          <p class="text-xs text-ink-400 mt-3">ESP32 sketch: <code>server/hardware/esp32-ingest.ino</code> ? Full guide: <code>IOT.md</code></p>
        </div>
        <div class="card card-pad lg:col-span-2">
          <h3 class="font-bold mb-1">Security &amp; account</h3>
          <p class="text-sm text-ink-500 mb-3" id="secServerLine">Checking server security?</p>
          <div class="grid md:grid-cols-2 gap-4 mb-4">
            <div class="rounded-xl border border-ink-100 p-3 bg-ink-50">
              <p class="text-sm font-semibold mb-2">Change password</p>
              <p class="text-xs text-ink-500 mb-2">Min 10 characters with letters and numbers. Signs out other devices.</p>
              <input id="secCurPw" type="password" class="input mb-2" placeholder="Current password" autocomplete="current-password">
              <input id="secNewPw" type="password" class="input mb-2" placeholder="New password" autocomplete="new-password">
              <button class="btn btn-primary btn-sm w-full" id="secChangePw">Update password</button>
            </div>
            <div>
              <p class="text-sm font-medium mb-2">Device PIN (local)</p>
              <label class="label">New PIN (4?6 digits)</label>
              <input id="secNewPin" type="password" inputmode="numeric" maxlength="6" class="input mb-2" placeholder="????" autocomplete="off">
              <label class="label">Confirm PIN</label>
              <input id="secConfPin" type="password" inputmode="numeric" maxlength="6" class="input mb-3" placeholder="????" autocomplete="off">
              <button class="btn btn-primary btn-sm w-full" id="secSavePin">Save PIN</button>
              <p class="text-xs text-ink-400 mt-2" id="secPinStatus">No PIN set ? required before any delete or reset.</p>
            </div>
          </div>
          <div class="grid md:grid-cols-2 gap-4">
            <div>
              <p class="text-sm font-medium mb-2">Biometric unlock</p>
              <p class="text-xs text-ink-500 mb-3">Face ID / fingerprint on <b>kiteline.uk</b> (phone).</p>
              <button class="btn btn-ghost btn-sm w-full mb-2" id="secBioOn">${icon('shield','w-4 h-4')} Enable Face ID / Fingerprint</button>
              <button class="btn btn-ghost btn-sm w-full mb-3 hidden" id="secBioOff">Remove biometric</button>
              <p class="text-xs text-ink-400 mb-4" id="secBioStatus"></p>
            </div>
            <div>
              <p class="text-sm font-medium mb-2">Session</p>
              <p class="text-xs text-ink-500 mb-3" id="secSessionLine">?</p>
              <button class="btn btn-ghost btn-sm w-full" id="settingsLogout">${icon('logout','w-4 h-4')} Sign out this device</button>
            </div>
          </div>
        </div>
        <div class="card card-pad lg:col-span-2" id="workspaceExportCard">
          <h3 class="font-bold mb-1">Your data (GDPR export)</h3>
          <p class="text-sm text-ink-500 mb-3">Download a JSON copy of your organisation?s workspace ? recipes, sites, team, logs, and settings.</p>
          <button class="btn btn-ghost btn-sm" id="workspaceExportBtn">${icon('download','ico')} Download my workspace</button>
        </div>
        <div class="card card-pad lg:col-span-2">
          <h3 class="font-bold mb-2">Legal</h3>
          <p class="text-sm text-ink-500 mb-3">? 2026 Kiteline ? All rights reserved.</p>
          <div class="flex flex-wrap gap-3 text-sm">
            <a href="/contact.html" target="_blank" rel="noopener" class="text-brand-700 font-semibold">Contact</a>
            <a href="mailto:contact@kiteline.uk" class="text-brand-700 font-semibold">contact@kiteline.uk</a>
            <a href="/terms.html" target="_blank" rel="noopener" class="text-brand-700 font-semibold">Terms &amp; Conditions</a>
            <a href="/privacy.html" target="_blank" rel="noopener" class="text-brand-700 font-semibold">Privacy Policy</a>
          </div>
        </div>
        <div class="card card-pad lg:col-span-2">
          <h3 class="font-bold mb-2">Danger Zone</h3>
          <p class="text-sm text-ink-500 mb-3">Reset all demo data back to the seeded state. <b>PIN or biometric required.</b></p>
          <button class="btn btn-danger btn-sm" id="reset">Reset demo data</button>
        </div>
        <div class="card card-pad lg:col-span-2 hidden" id="ownerBackupCard">
          <h3 class="font-bold mb-1">Owner ? download all data</h3>
          <p class="text-sm text-ink-500 mb-3">Save users, registrations, and full kitchen state from the live server (JSON file).</p>
          <button class="btn btn-primary btn-sm" id="ownerBackupBtn">${icon('download','ico')} Download backup JSON</button>
          <p class="text-xs text-ink-400 mt-2">Keep this file safe ? it is your cloud database copy. Local code backup: run SAVE-ALL-DATA.bat on your Desktop.</p>
        </div>
        <div class="card card-pad lg:col-span-2 hidden" id="waitlistCard">
          <h3 class="font-bold mb-1">Hardware waitlist</h3>
          <p class="text-sm text-ink-500 mb-3">People who registered on <a href="/hardware.html" class="text-brand-700 font-semibold">kiteline.uk/hardware</a> ? who wants sensors, printers, or labels. No payment taken yet.</p>
          <div id="waitlistSummary" class="flex flex-wrap gap-2 mb-4 text-xs"></div>
          <div class="overflow-x-auto">
            <table class="table text-sm" id="waitlistTable"><thead><tr><th>When</th><th>Product</th><th>Name</th><th>Email</th><th>Mobile</th><th>Sites</th><th>Notes</th></tr></thead><tbody id="waitlistBody"></tbody></table>
          </div>
          <p class="text-xs text-ink-400 mt-3" id="waitlistEmpty">Loading?</p>
        </div>
      </div>`;
    return { title:'Settings', html, mount() {
      const staffInviteUrl = employeeAppUrl(S.db.currentSite, 'register');
      mountQrIn(document.getElementById('settingsStaffQr'), staffInviteUrl, 160);
      const sqm = document.getElementById('settingsStaffQrModal');
      if (sqm) sqm.onclick = () => showEmployeeQrModal(S.db.currentSite, S.site(S.db.currentSite).name);
      const sqc = document.getElementById('settingsStaffQrCopy');
      if (sqc) sqc.onclick = () => { navigator.clipboard.writeText(staffInviteUrl); toast('Invite link copied'); };
      document.getElementById('saveorg').onclick=()=>{ o.name=document.getElementById('orgname').value; o.currency=document.getElementById('cur').value; S.persist(); toast('Settings saved'); window.App.render(); };
      document.querySelectorAll('[data-prod]').forEach(c=>c.onchange=()=>{ o.products[c.dataset.prod]=c.checked; S.persist(); window.App.render(); });
      document.querySelectorAll('[data-ch]').forEach(c=>c.onchange=()=>{ o.channels[c.dataset.ch]=c.checked; S.persist(); });
      const te = document.getElementById('testemail');
      if (te) te.onclick = async () => {
        if (!o.channels.email) return toast('Turn on Email channel first','warn');
        if (!window.Api || !S.remote) return toast('Server required ? run npm start','warn');
        te.disabled = true; te.textContent = 'Sending?';
        try {
          const r = await window.Api.testNotify('email');
          const m = r.result || {};
          if (m.mode === 'smtp') toast('Test email sent to ' + (m.to || []).join(', '));
          else if (m.mode === 'outbox') toast('Saved to server outbox ? add SMTP in server/.env');
          else if (m.skipped) toast('Email channel is off','warn');
          else toast('Test email sent');
        } catch (e) { toast(e.message || 'Send failed', 'error'); }
        te.disabled = false; te.innerHTML = `${icon('mail','ico')} Send test email`;
      };
      const ts = document.getElementById('testsms');
      if (ts) ts.onclick = async () => {
        if (!o.channels.sms) return toast('Turn on SMS channel first','warn');
        if (!window.Api || !S.remote) return toast('Server required ? run npm start','warn');
        ts.disabled = true; ts.textContent = 'Sending?';
        try {
          const r = await window.Api.testNotify('sms');
          const m = r.result || {};
          if (m.mode === 'twilio') toast('Test SMS sent to ' + (m.to || []).join(', '));
          else if (m.mode === 'sms-outbox') toast('Saved to server outbox ? add Twilio keys in server/.env');
          else if (m.skipped) toast(m.reason || 'SMS skipped','warn');
          else toast('Test SMS sent');
        } catch (e) { toast(e.message || 'SMS failed', 'error'); }
        ts.disabled = false; ts.innerHTML = `${icon('mail','ico')} Send test SMS`;
      };
      const ns = document.getElementById('notifyStatus');
      if (ns && window.Api && S.remote) {
        window.Api.notifyStatus().then(st => {
          const bits = [];
          bits.push(st.email && st.email.configured ? 'Email: SMTP ready' : 'Email: add SMTP to server/.env');
          bits.push(st.sms && st.sms.configured ? 'SMS: Twilio ready (' + st.sms.from + ')' : 'SMS: add Twilio to server/.env');
          ns.textContent = bits.join(' ? ');
        }).catch(() => { ns.textContent = 'Run npm start for live notifications.'; });
      } else if (ns) ns.textContent = 'Run npm start for live notifications.';
      const iotStatus = document.getElementById('iotStatus');
      const iotUrl = document.getElementById('iotUrl');
      const iotKey = document.getElementById('iotKey');
      const iotKeyHint = document.getElementById('iotKeyHint');
      const iotExample = document.getElementById('iotExample');
      const iotSensorList = document.getElementById('iotSensorList');
      const siteSensors = S.sensorsForSite();
      if (iotSensorList) {
        iotSensorList.innerHTML = siteSensors.length
          ? siteSensors.map(s => `<div class="flex flex-wrap items-center gap-2 py-1 border-b border-ink-100 last:border-0"><span class="font-semibold">${escapeHtml(s.name)}</span><code class="text-xs bg-ink-100 px-1.5 py-0.5 rounded">${escapeHtml(s.id)}</code><button type="button" class="btn btn-ghost btn-sm" data-copy-id="${escapeHtml(s.id)}">Copy ID</button></div>`).join('')
          : '<span class="text-ink-400">No sensors yet ? add one on the Temperatures page.</span>';
        iotSensorList.querySelectorAll('[data-copy-id]').forEach(b => b.onclick = () => { navigator.clipboard.writeText(b.dataset.copyId); toast('Device ID copied'); });
      }
      async function loadIngestInfo() {
        const fallbackUrl = (S.siteOrigin || window.location.origin).replace(/\/$/, '') + '/api/ingest';
        if (window.Api && S.remote) {
          try {
            const info = await window.Api.ingestInfo();
            if (iotUrl) iotUrl.textContent = info.ingestUrl || fallbackUrl;
            if (iotKey) iotKey.textContent = info.apiKey || '?';
            if (iotKeyHint) {
              if (info.keyWarning) iotKeyHint.textContent = info.keyWarning;
              else if (info.demoKey) iotKeyHint.textContent = 'Using default sensor key ? add INGEST_KEY on Render for production.';
              else iotKeyHint.textContent = 'Custom sensor key configured on server.';
            }
            if (iotStatus) iotStatus.textContent = 'Server ready ? devices POST readings here every 1?5 minutes.';
            if (iotExample && siteSensors[0]) {
              iotExample.textContent = JSON.stringify({ sensorId: siteSensors[0].id, temp: 3.4, battery: 92 }, null, 2);
            }
            return;
          } catch (e) { /* fall through */ }
        }
        if (iotUrl) iotUrl.textContent = fallbackUrl;
        if (iotKey) iotKey.textContent = 'kiteline-demo-key';
        if (iotKeyHint) iotKeyHint.textContent = 'Local demo key ? run npm start and sign in for live settings.';
        if (iotStatus) iotStatus.textContent = S.remote ? 'Could not load ingest settings.' : 'Offline mode ? run npm start to connect real sensors.';
        if (iotExample && siteSensors[0]) {
          iotExample.textContent = JSON.stringify({ sensorId: siteSensors[0].id, temp: 3.4, battery: 92 }, null, 2);
        }
      }
      loadIngestInfo();
      const cpIotUrl = document.getElementById('cpIotUrl');
      const cpIotKey = document.getElementById('cpIotKey');
      if (cpIotUrl) cpIotUrl.onclick = () => { if (iotUrl && iotUrl.textContent !== '?') { navigator.clipboard.writeText(iotUrl.textContent); toast('Ingest URL copied'); } };
      if (cpIotKey) cpIotKey.onclick = () => { if (iotKey && iotKey.textContent !== '?') { navigator.clipboard.writeText(iotKey.textContent); toast('API key copied'); } };
      const billLine = document.getElementById('billingLine');
      const billTeamLine = document.getElementById('billingTeamLine');
      const billHint = document.getElementById('billingHint');
      const billPlanBtns = document.getElementById('billingPlanBtns');
      const billPortal = document.getElementById('billPortal');
      async function startCheckout(plan) {
        const email = (window.Api && window.Api.email()) || prompt('Your Kiteline email:', '') || '';
        if (!email) return;
        try {
          const r = await window.Api.billingCheckout(plan, email);
          if (r.url) window.location.href = r.url;
          else toast(r.error || 'Checkout failed', 'error');
        } catch (e) { toast(e.message || 'Checkout failed', 'error'); }
      }
      function renderPlanButtons(plans, active) {
        if (!billPlanBtns || !plans || !plans.length) return;
        billPlanBtns.innerHTML = plans.map(p => `
          <button type="button" class="btn btn-primary btn-sm billing-plan-btn" data-plan="${escapeHtml(p.id)}">${escapeHtml(p.maxUsers)} users ? ${escapeHtml(p.display)}</button>
        `).join('');
        billPlanBtns.querySelectorAll('.billing-plan-btn').forEach(btn => {
          btn.onclick = () => startCheckout(btn.dataset.plan);
        });
        if (active) billPlanBtns.classList.add('hidden');
      }
      if (billPortal) billPortal.onclick = async () => {
        billPortal.disabled = true;
        try {
          const r = await window.Api.billingPortal();
          if (r.url) window.location.href = r.url;
          else toast('Portal unavailable', 'error');
        } catch (e) { toast(e.message || 'Portal failed', 'error'); }
        billPortal.disabled = false;
      };
      if (window.Api && S.remote && billLine) {
        window.Api.billingStatus().then(st => {
          const sub = st.subscription || {};
          const trial = st.trial || {};
          const plans = st.plans || [];
          if (!st.enabled) {
            billLine.textContent = 'Online checkout not configured ? contact support for an invoice.';
            billHint.textContent = 'Add STRIPE_SECRET_KEY on the server to enable Subscribe buttons.';
            renderPlanButtons(plans, false);
            return;
          }
          if (trial.active && !trial.exempt) {
            billLine.textContent = 'Free trial ? ' + trial.daysLeft + ' day' + (trial.daysLeft === 1 ? '' : 's') + ' left (up to ' + (trial.maxUsers || st.maxUsers || 5) + ' users)';
            if (billTeamLine) {
              billTeamLine.textContent = 'Team seats: ' + (st.teamCount || S.db.team.length) + ' / ' + (st.maxUsers || trial.maxUsers || 5) + ' during trial.';
              billTeamLine.classList.remove('hidden');
            }
            billHint.textContent = 'Subscribe before trial ends to keep access. Pick a plan below.';
            renderPlanButtons(plans, false);
            return;
          }
          if (sub.status === 'active') {
            billLine.textContent = 'Plan: ' + (sub.orgPlan || sub.plan || 'Active') + (sub.currentPeriodEnd ? ' ? renews ' + fmt.date(sub.currentPeriodEnd) : '');
            if (billTeamLine && st.maxUsers) {
              billTeamLine.textContent = 'Team seats: ' + (st.teamCount || S.db.team.length) + ' / ' + st.maxUsers + ' users on this plan.';
              billTeamLine.classList.remove('hidden');
            }
            billPortal.classList.remove('hidden');
            billHint.textContent = 'Need more users? Upgrade via Stripe portal or pick a larger plan below.';
            renderPlanButtons(plans, false);
          } else {
            billLine.textContent = 'No active subscription ? choose a plan by team size.';
            renderPlanButtons(plans, false);
            billHint.textContent = 'Price scales with users ? larger teams get a lower per-user rate. Secure payment via Stripe.';
          }
        }).catch(() => { billLine.textContent = 'Sign in on the server to view billing.'; });
      } else if (billLine) billLine.textContent = 'Run npm start for billing.';
      const paintRecipeAi = (st) => {
        const line = document.getElementById('recipeAiLine');
        const usage = document.getElementById('recipeAiUsage');
        const price = document.getElementById('recipeAiPrice');
        const subBtn = document.getElementById('recipeAiSubscribe');
        const subEmail = document.getElementById('recipeAiSubscribeEmail');
        if (!line) return;
        if (st.enabled) {
          const modeLabel = { byok: 'Active ? Option B (your OpenAI key)', kiteline: 'Active ? Option A (Kiteline subscription)', granted: 'Active ? Option C (enabled by Kiteline)', owner: 'Active ? owner platform key' }[st.mode] || 'Active';
          line.innerHTML = '<span class="text-brand-700 font-semibold">' + modeLabel + '</span>';
        } else {
          line.textContent = st.message || 'Pick Option A, B, or C below.';
        }
        if (usage && st.usage && st.limits && st.limits.text) {
          usage.textContent = 'This month: ' + (st.usage.text || 0) + ' / ' + st.limits.text + ' text ? ' + (st.usage.image || 0) + ' / ' + st.limits.image + ' photos';
        } else if (usage && st.mode === 'byok') {
          usage.textContent = st.keyHint ? 'Key on file: ' + st.keyHint : '';
        } else if (usage) usage.textContent = '';
        if (price && st.addon) price.textContent = st.addon.display + ' per company ? includes monthly AI limits';
        if (subBtn) {
          const kitelineOn = st.enabled && (st.kitelineAddon || st.mode === 'granted' || st.mode === 'kiteline');
          subBtn.disabled = !!kitelineOn;
          subBtn.textContent = kitelineOn ? 'Recipe AI active (Option A/C)' : 'Subscribe to Recipe AI';
        }
      };
      const paintRecipeAiSetup = (cfg) => {
        const bits = document.getElementById('recipeAiServerBits');
        const subBtn = document.getElementById('recipeAiSubscribe');
        const subEmail = document.getElementById('recipeAiSubscribeEmail');
        const setup = (cfg && cfg.recipeAiSetup) || {};
        const addon = (cfg && cfg.recipeAiAddon) || {};
        if (bits) {
          bits.innerHTML = [
            setup.platformKey ? '<span class="badge badge-green">Platform AI ready</span>' : '<span class="badge badge-amber">Platform AI off</span>',
            setup.stripe ? '<span class="badge badge-green">Stripe checkout</span>' : '<span class="badge badge-gray">Stripe off ? email to subscribe</span>',
            setup.byokStorage ? '<span class="badge badge-green">BYOK storage OK</span>' : '<span class="badge badge-amber">BYOK needs INGEST_KEY</span>',
          ].join('');
        }
        if (subBtn && subEmail && !setup.stripe) {
          subBtn.classList.add('hidden');
          subEmail.classList.remove('hidden');
        }
        const price = document.getElementById('recipeAiPrice');
        if (price && addon.display) price.textContent = addon.display + ' per company ? Option A';
      };
      if (window.Api && S.remote) {
        fetch('/api/config').then(r => r.json()).then(paintRecipeAiSetup).catch(() => {});
        window.Api.recipeAiStatus().then(paintRecipeAi).catch(() => {
          const line = document.getElementById('recipeAiLine');
          if (line) line.textContent = 'Sign in on kiteline.uk to manage Recipe AI.';
        });
        const subBtn = document.getElementById('recipeAiSubscribe');
        if (subBtn) subBtn.onclick = async () => {
          subBtn.disabled = true;
          try {
            const r = await window.Api.recipeAiCheckout();
            if (r.url) location.href = r.url;
            else toast('Checkout not available ? email contact@kiteline.uk', 'warn');
          } catch (e) {
            toast(e.message || 'Checkout failed', 'error');
          }
          subBtn.disabled = false;
        };
        const saveKey = document.getElementById('recipeAiSaveKey');
        if (saveKey) saveKey.onclick = async () => {
          const key = document.getElementById('recipeAiKey').value.trim();
          if (!key) return toast('Paste your OpenAI API key', 'warn');
          saveKey.disabled = true;
          try {
            const r = await window.Api.recipeAiSaveKey(key);
            document.getElementById('recipeAiKey').value = '';
            paintRecipeAi(r.status);
            toast(r.message || 'Key saved');
          } catch (e) { toast(e.message || 'Could not save key', 'error'); }
          saveKey.disabled = false;
        };
        const rmKey = document.getElementById('recipeAiRemoveKey');
        if (rmKey) rmKey.onclick = async () => {
          try {
            const r = await window.Api.recipeAiRemoveKey();
            paintRecipeAi(r.status);
            toast('OpenAI key removed');
          } catch (e) { toast(e.message || 'Could not remove key', 'error'); }
        };
      }
      const AI_PERM_LABELS = {
        read_recipes: 'Read recipes',
        create_draft_recipes: 'Create draft recipes',
        edit_approved_recipes: 'Edit approved recipes',
        read_allergen_data: 'Read allergen data',
        create_menu_drafts: 'Create menu drafts',
        publish_menus: 'Publish menus',
        read_temperature_logs: 'Read temperature logs',
        add_temperature_logs: 'Add temperature logs',
        read_haccp_records: 'Read HACCP records',
        add_haccp_records: 'Add HACCP records',
        export_reports: 'Export reports',
        manage_labels: 'Manage labels',
        manage_stock: 'Manage stock',
        manage_suppliers: 'Manage suppliers',
        manage_rota: 'Manage rota',
        delete_records: 'Delete records (Admin only)',
      };
      const paintChatgptPerms = (defaults) => {
        const grid = document.getElementById('chatgptPermGrid');
        if (!grid) return;
        grid.innerHTML = Object.entries(AI_PERM_LABELS).map(([k, label]) =>
          `<label class="flex items-start gap-2 cursor-pointer"><input type="checkbox" data-ai-perm="${k}" ${defaults[k] ? 'checked' : ''} class="mt-1 accent-brand-600"><span>${escapeHtml(label)}</span></label>`
        ).join('');
      };
      const gatherChatgptPerms = () => {
        const perms = {};
        document.querySelectorAll('[data-ai-perm]').forEach((c) => { perms[c.dataset.aiPerm] = c.checked; });
        return perms;
      };
      const paintChatgptTokens = (tokens) => {
        const list = document.getElementById('chatgptTokenList');
        if (!list) return;
        if (!tokens || !tokens.length) {
          list.innerHTML = '<span class="text-ink-400">No active tokens ? create one for ChatGPT.</span>';
          return;
        }
        list.innerHTML = tokens.map((t) => `<div class="flex flex-wrap items-center justify-between gap-2 py-2 border-b border-ink-100">
          <div><span class="font-medium">${escapeHtml(t.label || 'Token')}</span> <span class="text-xs text-ink-400">${escapeHtml(t.hint || '')}</span><br><span class="text-xs text-ink-400">Created ${escapeHtml((t.createdAt || '').slice(0, 10))}</span></div>
          <button type="button" class="btn btn-ghost btn-sm text-red-600" data-revoke-ai="${escapeHtml(t.id)}">Revoke</button>
        </div>`).join('');
        list.querySelectorAll('[data-revoke-ai]').forEach((btn) => {
          btn.onclick = async () => {
            if (!confirm('Revoke this ChatGPT token?')) return;
            try {
              await window.Api.aiRevokeToken(btn.dataset.revokeAi);
              toast('Token revoked');
              const data = await window.Api.aiTokens();
              paintChatgptTokens(data.tokens || []);
            } catch (e) { toast(e.message || 'Could not revoke', 'error'); }
          };
        });
      };
      const DIET_OPTIONS = [
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
      const dietCard = document.getElementById('dietarySettingsCard');
      if (dietCard) {
        S.db.org = S.db.org || {};
        S.db.org.dietary = S.db.org.dietary || { enabledRules: [], notes: '' };
        const enabled = new Set((S.db.org.dietary.enabledRules || []).map((x) => String(x).toLowerCase()));
        const grid = document.getElementById('dietaryRulesGrid');
        if (grid) {
          grid.innerHTML = DIET_OPTIONS.map((d) =>
            `<label class="flex items-start gap-2 cursor-pointer"><input type="checkbox" data-diet-rule="${d.id}" ${enabled.has(d.id) ? 'checked' : ''} class="mt-1 accent-brand-600"><span>${escapeHtml(d.label)}</span></label>`
          ).join('');
        }
        const notesEl = document.getElementById('dietaryNotes');
        if (notesEl) notesEl.value = S.db.org.dietary.notes || '';
        const saveDiet = document.getElementById('dietarySaveBtn');
        if (saveDiet) saveDiet.onclick = async () => {
          const rules = [];
          document.querySelectorAll('[data-diet-rule]').forEach((c) => { if (c.checked) rules.push(c.dataset.dietRule); });
          S.db.org.dietary = {
            enabledRules: rules,
            notes: (document.getElementById('dietaryNotes')?.value || '').trim(),
            updatedAt: new Date().toISOString(),
          };
          try {
            if (S.persist) S.persist();
            if (window.Api && S.remote && window.Api.putState) await window.Api.putState(S.db);
            const st = document.getElementById('dietarySaveStatus');
            if (st) st.textContent = rules.length
              ? `Saved — ${rules.length} rule(s) enabled for this company only.`
              : 'Saved — no dietary rules enabled (open menus; ChatGPT will not assume a diet).';
            toast('Dietary settings saved for this company');
          } catch (e) {
            toast(e.message || 'Could not save dietary settings', 'error');
          }
        };
      }
      const chatgptCard = document.getElementById('chatgptAiCard');
      if (chatgptCard && window.Api && S.remote) {
        const me = window.App.currentUser ? window.App.currentUser() : { role: 'Staff', rank: 1 };
        const isAdmin = (me.rank || 0) >= 3 || me.role === 'Admin';
        const adminBox = document.getElementById('chatgptAdminOnly');
        const staffNote = document.getElementById('chatgptStaffNote');
        if (!isAdmin) {
          if (adminBox) adminBox.classList.add('hidden');
          if (staffNote) staffNote.classList.remove('hidden');
        } else {
          window.Api.aiTokens().then((data) => {
            paintChatgptPerms(data.defaults || {});
            paintChatgptTokens(data.tokens || []);
          }).catch(() => {
            paintChatgptPerms({});
            const list = document.getElementById('chatgptTokenList');
            if (list) list.textContent = 'Could not load tokens ? sign in on kiteline.uk';
          });
          const createBtn = document.getElementById('chatgptCreateToken');
          if (createBtn) createBtn.onclick = async () => {
            createBtn.disabled = true;
            try {
              const r = await window.Api.aiCreateToken({
                label: (document.getElementById('chatgptTokenLabel').value || 'ChatGPT').trim(),
                permissions: gatherChatgptPerms(),
              });
              const box = document.getElementById('chatgptNewTokenBox');
              const tok = document.getElementById('chatgptNewToken');
              if (box && tok && r.token) {
                tok.textContent = r.token;
                box.classList.remove('hidden');
              }
              toast('AI token created ? copy it now');
              const data = await window.Api.aiTokens();
              paintChatgptTokens(data.tokens || []);
            } catch (e) { toast(e.message || 'Could not create token', 'error'); }
            createBtn.disabled = false;
          };
        }
        const copySchema = document.getElementById('chatgptCopySchema');
        if (copySchema) copySchema.onclick = () => {
          const url = document.getElementById('chatgptSchemaUrl').textContent.trim();
          navigator.clipboard.writeText(url);
          toast('Schema URL copied');
        };
        const copyTok = document.getElementById('chatgptCopyToken');
        if (copyTok) copyTok.onclick = () => {
          const t = document.getElementById('chatgptNewToken').textContent.trim();
          if (t) { navigator.clipboard.writeText(t); toast('Token copied'); }
        };
        window.Api.aiOAuthConfig().then((cfg) => {
          const box = document.getElementById('chatgptOAuthBox');
          if (!box) return;
          box.classList.remove('hidden');
          const st = document.getElementById('chatgptOAuthStatus');
          if (st) st.textContent = cfg.enabled ? 'OAuth is enabled on this server.' : (cfg.note || 'OAuth not configured yet.');
          const cid = document.getElementById('chatgptClientId');
          const au = document.getElementById('chatgptAuthUrl');
          const tu = document.getElementById('chatgptTokenUrl');
          if (cid) cid.textContent = cfg.clientId || '?';
          if (au) au.textContent = cfg.authorizationUrl || '?';
          if (tu) tu.textContent = cfg.tokenUrl || '?';
        }).catch(() => {});
      }
      const wlLabels = { 'sensor-kit':'Sensor kit', 'printer-bundle':'Printer bundle', 'label-rolls':'Label rolls', 'full-bundle':'Full bundle' };
      const wlCard = document.getElementById('waitlistCard');
      const wlBody = document.getElementById('waitlistBody');
      const wlSum = document.getElementById('waitlistSummary');
      const wlEmpty = document.getElementById('waitlistEmpty');
      if (wlCard && window.Api && S.remote) {
        window.Api.getWaitlist().then(data => {
          wlCard.classList.remove('hidden');
          const counts = (data.summary && data.summary.counts) || {};
          wlSum.innerHTML = Object.keys(counts).map(k => `<span class="badge badge-blue">${escapeHtml(wlLabels[k] || k)}: ${counts[k] || 0}</span>`).join('');
          const rows = (data.entries || []).slice().reverse();
          if (!rows.length) {
            wlBody.innerHTML = '';
            wlEmpty.textContent = 'No sign-ups yet ? share the hardware page with pilot kitchens.';
            return;
          }
          wlEmpty.textContent = rows.length + ' sign-up' + (rows.length === 1 ? '' : 's') + ' total';
          wlBody.innerHTML = rows.map(e => `<tr>
            <td class="text-xs whitespace-nowrap">${fmt.date(e.at)}</td>
            <td>${escapeHtml(wlLabels[e.product] || e.product)}</td>
            <td>${escapeHtml(e.name)}</td>
            <td><a href="mailto:${escapeHtml(e.email)}" class="text-brand-700">${escapeHtml(e.email)}</a></td>
            <td class="text-xs">${escapeHtml(e.phone || '?')}</td>
            <td>${escapeHtml(e.sites || '?')}</td>
            <td class="text-xs max-w-[12rem] truncate" title="${escapeHtml(e.note || '')}">${escapeHtml(e.note || '?')}</td>
          </tr>`).join('');
        }).catch(() => { /* not owner or server offline */ });
      }
      const dangerCard = document.getElementById('reset') && document.getElementById('reset').closest('.card');
      if (dangerCard && (S.db._tenantPrivate || S.db._isPrivate)) dangerCard.classList.add('hidden');
      document.getElementById('reset').onclick = () => {
        window.Security.confirmDangerous('Reset demo data?', 'This wipes all kitchen data and restores the demo. PIN or biometric required.', () => {
          S.reset(); toast('Data reset'); window.App.render();
        });
      };
      const secLine = document.getElementById('secServerLine');
      const secSession = document.getElementById('secSessionLine');
      if (window.Api && S.remote && secLine) {
        window.Api.securityStatus().then(st => {
          if (st.isOwner) {
            secLine.textContent = 'Your owner account ? full access. Security: login lockout, rate limits, and session expiry are active for all users.';
            const grantCard = document.getElementById('recipeAiGrantCard');
            const grantHint = document.getElementById('recipeAiGrantHint');
            if (grantCard) grantCard.classList.remove('hidden');
            if (grantHint) grantHint.classList.remove('hidden');
            const backupCard = document.getElementById('ownerBackupCard');
            if (backupCard) backupCard.classList.remove('hidden');
          } else {
            const bits = ['Password rules enforced', 'Login lockout after ' + st.maxLoginAttempts + ' tries'];
            if (!st.ingestKeySecure) bits.push('Add INGEST_KEY on Render (sensor security)');
            secLine.textContent = bits.join(' ? ');
          }
          if (secSession && st.sessionExpiresAt) secSession.textContent = 'This device session expires ' + fmt.date(st.sessionExpiresAt);
        }).catch(() => { secLine.textContent = 'Sign in on the server for account security options.'; });
      }
      const grantOn = document.getElementById('recipeAiGrantOn');
      const grantOff = document.getElementById('recipeAiGrantOff');
      const runGrant = async (enable) => {
        const em = document.getElementById('recipeAiGrantEmail') && document.getElementById('recipeAiGrantEmail').value.trim();
        if (!em) return toast('Enter customer email', 'warn');
        try {
          await window.Api.recipeAiGrant(em, enable);
          toast(enable ? 'Recipe AI enabled for ' + em : 'Recipe AI disabled for ' + em);
        } catch (e) { toast(e.message || 'Grant failed', 'error'); }
      };
      if (grantOn) grantOn.onclick = () => runGrant(true);
      if (grantOff) grantOff.onclick = () => runGrant(false);
      const exportBtn = document.getElementById('workspaceExportBtn');
      if (exportBtn) exportBtn.onclick = async () => {
        if (!window.Api || !S.remote) return toast('Server required ? sign in on kiteline.uk', 'warn');
        exportBtn.disabled = true;
        exportBtn.textContent = 'Preparing?';
        try {
          const data = await window.Api.exportWorkspace();
          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = 'kiteline-workspace-' + new Date().toISOString().slice(0, 10) + '.json';
          a.click();
          URL.revokeObjectURL(a.href);
          toast('Workspace export downloaded');
        } catch (e) { toast(e.message || 'Export failed', 'error'); }
        exportBtn.disabled = false;
        exportBtn.innerHTML = `${icon('download','ico')} Download my workspace`;
      };
      const backupBtn = document.getElementById('ownerBackupBtn');
      if (backupBtn) backupBtn.onclick = async () => {
        backupBtn.disabled = true;
        backupBtn.textContent = 'Preparing?';
        try {
          const data = await window.Api.downloadBackup();
          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = 'kiteline-backup-' + new Date().toISOString().slice(0, 10) + '.json';
          a.click();
          URL.revokeObjectURL(a.href);
          toast('Backup downloaded');
        } catch (e) { toast(e.message || 'Backup failed', 'error'); }
        backupBtn.disabled = false;
        backupBtn.innerHTML = `${icon('download','ico')} Download backup JSON`;
      };
      const chPw = document.getElementById('secChangePw');
      if (chPw) chPw.onclick = async () => {
        const cur = document.getElementById('secCurPw').value;
        const neu = document.getElementById('secNewPw').value;
        if (!cur || !neu) return toast('Enter current and new password', 'warn');
        chPw.disabled = true;
        try {
          const r = await window.Api.changePassword(cur, neu);
          document.getElementById('secCurPw').value = '';
          document.getElementById('secNewPw').value = '';
          toast(r.message || 'Password updated');
        } catch (e) { toast(e.message || 'Could not update password', 'error'); }
        chPw.disabled = false;
      };
      const pinStatus = document.getElementById('secPinStatus');
      const bioStatus = document.getElementById('secBioStatus');
      const bioOff = document.getElementById('secBioOff');
      const refreshSec = () => {
        if (pinStatus) pinStatus.textContent = window.Security.hasPin() ? 'PIN is set ? deletes and reset are protected.' : 'No PIN set ? required before any delete or reset.';
        if (bioStatus) {
          if (!window.Security.biometricAvailable()) bioStatus.textContent = 'Biometric not available on this address ? use kiteline.uk or the tunnel link.';
          else if (window.Security.hasBiometric()) bioStatus.textContent = 'Face ID / fingerprint enabled.';
          else bioStatus.textContent = 'Biometric not set up yet.';
        }
        if (bioOff) bioOff.classList.toggle('hidden', !window.Security.hasBiometric());
      };
      refreshSec();
      const savePin = document.getElementById('secSavePin');
      if (savePin) savePin.onclick = async () => {
        try {
          await window.Security.setPin(document.getElementById('secNewPin').value, document.getElementById('secConfPin').value);
          document.getElementById('secNewPin').value = '';
          document.getElementById('secConfPin').value = '';
          toast('PIN saved');
          refreshSec();
        } catch (e) { toast(e.message || 'Could not save PIN', 'error'); }
      };
      const bioOn = document.getElementById('secBioOn');
      if (bioOn) bioOn.onclick = async () => {
        if (!window.Security.hasPin()) { toast('Save a PIN first', 'warn'); return; }
        bioOn.disabled = true;
        try {
          await window.Security.registerBiometric();
          toast('Biometric enabled');
          refreshSec();
        } catch (e) { toast(e.message || 'Biometric setup failed', 'error'); }
        bioOn.disabled = false;
      };
      if (bioOff) bioOff.onclick = () => { window.Security.clearBiometric(); toast('Biometric removed'); refreshSec(); };
      const settingsLogout = document.getElementById('settingsLogout');
      if (settingsLogout) settingsLogout.onclick = () => window.App.signOut();
    }};
  }

  function staffActiveList(site) {
    const R = window.Rota;
    if (R) R.ensureDemo(S.db);
    const live = S.workflowsForSite(site).filter(w => w.status === 'in_progress');
    const clocked = R ? R.clockedInStaff(S.db, site) : [];
    const seen = new Set();
    const out = [];
    clocked.forEach(m => {
      if (seen.has(m.id)) return;
      seen.add(m.id);
      out.push(Object.assign({}, m, { onClock: true, tasks: live.filter(w => w.assignee === m.id) }));
    });
    [...new Set(live.map(w => w.assignee))].forEach(id => {
      if (seen.has(id)) return;
      seen.add(id);
      const m = S.member(id);
      out.push(Object.assign({}, m, { onClock: false, tasks: live.filter(w => w.assignee === id) }));
    });
    return out;
  }

  function clockPinModal(member, onOk) {
    modal('Enter PIN ? ' + escapeHtml(member.name), `<div class="space-y-3 text-center">
      <p class="text-sm text-ink-500">4-digit kitchen PIN</p>
      <input id="clockPinIn" class="input text-center text-2xl tracking-[0.4em]" maxlength="4" inputmode="numeric" autocomplete="off" placeholder="????">
      <button type="button" class="btn btn-primary w-full" id="clockPinOk">Confirm</button></div>`, { wide: false });
    const inp = document.getElementById('clockPinIn');
    if (inp) inp.focus();
    document.getElementById('clockPinOk').onclick = () => {
      const pin = (inp && inp.value) || '';
      if (!window.Rota.verifyPin(member, pin)) return toast('Wrong PIN', 'warn');
      closeModal();
      onOk();
    };
  }

  function clock() {
    const R = window.Rota;
    const site = S.db.currentSite;
    const siteName = S.site(site).name;
    if (R) R.ensureDemo(S.db);
    const team = R.teamForSite(S.db, site);
    const today = R.dateKey();
    const clocked = R.clockedInStaff(S.db, site);
    const scheduled = R.scheduledToday(S.db, site);

    const cards = team.map(m => {
      const on = R.isClockedIn(S.db, site, m.id);
      const shift = R.getShift(S.db, site, m.id, today);
      const sess = R.getClock(S.db, site, m.id, today);
      const last = sess && sess.sessions && sess.sessions.length ? sess.sessions[sess.sessions.length - 1] : null;
      const shiftTxt = shift && shift.status === 'scheduled' ? shift.startTime + '?' + shift.endTime : (shift ? R.ROTA_STATUS[shift.status].label : 'No shift');
      return `<div class="clock-staff-card ${on ? 'clock-staff-card--in' : ''}" data-clock-staff="${escapeHtml(m.id)}">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold">${escapeHtml(m.initials)}</div>
          <div class="flex-1 min-w-0">
            <div class="font-bold">${escapeHtml(m.name)}</div>
            <div class="text-xs text-ink-400">${escapeHtml(m.role)} ? ${escapeHtml(shiftTxt)}</div>
            ${last ? `<div class="text-xs text-ink-500 mt-1">${on ? 'In since ' + escapeHtml(last.clockIn) : 'Last out ' + escapeHtml(last.clockOut || '?')}</div>` : ''}
          </div>
          <span class="badge ${on ? 'badge-green' : 'badge-gray'}">${on ? 'Clocked in' : 'Out'}</span>
        </div>
        <button type="button" class="btn ${on ? 'btn-ghost' : 'btn-primary'} btn-sm w-full mt-3 clock-toggle-btn">${on ? 'Clock out' : 'Clock in'}</button>
      </div>`;
    }).join('');

    const html = `${sectionHeader('Clock In / Out', escapeHtml(siteName) + ' ? ' + today, `<a href="#rota" class="btn btn-ghost btn-sm">${icon('team', 'ico')} Rota</a><a href="#wfstaff" class="btn btn-ghost btn-sm">${icon('team', 'ico')} On shift</a>`)}
      <div class="grid sm:grid-cols-3 gap-4 mb-5">
        <div class="kpi"><div class="text-xs text-ink-500">Clocked in now</div><div class="v text-brand-600">${clocked.length}</div></div>
        <div class="kpi"><div class="text-xs text-ink-500">Scheduled today</div><div class="v">${scheduled.length}</div></div>
        <div class="kpi"><div class="text-xs text-ink-500">Team on site</div><div class="v">${team.length}</div></div>
      </div>
      <div class="card card-pad mb-4 text-center">
        <div class="clock-live-time" id="clockLiveTime">--:--</div>
        <p class="text-sm text-ink-500 mt-1">Tap your name to clock in or out ? PIN required if set on Team</p>
      </div>
      <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">${cards || '<p class="text-ink-400">No team at this site.</p>'}</div>`;

    return { title: 'Clock In / Out', html, mount() {
      const tick = () => {
        const el = document.getElementById('clockLiveTime');
        if (el) el.textContent = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      };
      tick();
      const iv = setInterval(tick, 1000);
      const me = window.App && window.App.currentUser ? window.App.currentUser() : null;
      document.querySelectorAll('[data-clock-staff]').forEach(card => {
        const btn = card.querySelector('.clock-toggle-btn');
        if (!btn) return;
        btn.onclick = (e) => {
          e.stopPropagation();
          const id = card.dataset.clockStaff;
          const member = S.db.team.find(x => x.id === id);
          if (!member) return;
          const doToggle = () => {
            const on = R.isClockedIn(S.db, site, id);
            const res = on ? R.clockOut(S.db, site, id, me && me.email) : R.clockIn(S.db, site, id, me && me.email);
            if (!res.ok) return toast(res.reason, 'warn');
            S.persist();
            if (S.logActivity) S.logActivity(id, on ? 'Clocked out' : 'Clocked in');
            toast(member.name + (on ? ' clocked out' : ' clocked in'));
            window.App.render();
          };
          if (member.clockPin || member.pin) clockPinModal(member, doToggle);
          else doToggle();
        };
      });
      window._clockIv = iv;
    }};
  }

  function rota() {
    const R = window.Rota;
    const site = S.db.currentSite;
    if (R) R.ensureDemo(S.db);
    window.RotaWeekOff = window.RotaWeekOff || 0;
    const base = new Date();
    base.setDate(base.getDate() + window.RotaWeekOff * 7);
    const dates = R.weekDates(base);
    const team = R.teamForSite(S.db, site);
    const weekLabel = R.dayLabel(dates[0]) + ' ? ' + R.dayLabel(dates[6]);

    const head = dates.map(d => `<th class="text-xs">${R.dayLabel(d)}</th>`).join('');
    const rows = team.map(m => {
      const cells = dates.map(date => {
        const sh = R.getShift(S.db, site, m.id, date);
        const st = sh ? sh.status : '';
        const meta = R.ROTA_STATUS[st];
        const txt = !sh ? '?' : st === 'scheduled' ? sh.startTime + '<br>' + sh.endTime : (meta ? meta.label : st);
        return `<td class="rota-cell" data-rota-edit="${escapeHtml(m.id)}" data-rota-date="${date}"><span class="rota-pill rota-pill--${st || 'empty'}">${txt}</span></td>`;
      }).join('');
      return `<tr><td class="font-semibold text-sm whitespace-nowrap">${escapeHtml(m.name)}<div class="text-xs text-ink-400 font-normal">${escapeHtml(m.role)}</div></td>${cells}</tr>`;
    }).join('');

    const today = R.dateKey();
    const schedToday = R.scheduledToday(S.db, site).length;
    const clocked = R.clockedInStaff(S.db, site).length;
    const missing = R.scheduledToday(S.db, site).filter(x => !R.isClockedIn(S.db, site, x.member.id)).length;

    const html = `${sectionHeader('Rota & Shifts', weekLabel + ' ? ' + escapeHtml(S.site(site).name), `
      <a href="#clock" class="btn btn-primary btn-sm">${icon('clock', 'ico')} Clock terminal</a>
      <button type="button" class="btn btn-ghost btn-sm" id="rotaSeedBtn">${icon('plus', 'ico')} Fill week</button>`)}
      <div class="grid sm:grid-cols-3 gap-4 mb-4">
        <div class="kpi"><div class="text-xs text-ink-500">Scheduled today</div><div class="v">${schedToday}</div></div>
        <div class="kpi"><div class="text-xs text-ink-500">Clocked in</div><div class="v text-brand-600">${clocked}</div></div>
        <div class="kpi"><div class="text-xs text-ink-500">Not clocked in</div><div class="v ${missing ? 'text-amber-600' : ''}">${missing}</div></div>
      </div>
      <div class="flex gap-2 mb-3">
        <button type="button" class="btn btn-ghost btn-sm" id="rotaPrev">? Prev week</button>
        <button type="button" class="btn btn-ghost btn-sm" id="rotaToday">This week</button>
        <button type="button" class="btn btn-ghost btn-sm" id="rotaNext">Next week ?</button>
      </div>
      <div class="card overflow-x-auto"><table class="table rota-grid"><thead><tr><th>Staff</th>${head}</tr></thead><tbody>${rows}</tbody></table></div>
      <p class="text-xs text-ink-400 mt-3">Tap a cell to set shift times or mark off / sick / leave. Staff clock in at <a href="#clock" class="text-brand-600 font-semibold">Clock In / Out</a>.</p>`;

    return { title: 'Rota', html, mount() {
      const prev = document.getElementById('rotaPrev');
      const next = document.getElementById('rotaNext');
      const todayBtn = document.getElementById('rotaToday');
      if (prev) prev.onclick = () => { window.RotaWeekOff--; window.App.render(); };
      if (next) next.onclick = () => { window.RotaWeekOff++; window.App.render(); };
      if (todayBtn) todayBtn.onclick = () => { window.RotaWeekOff = 0; window.App.render(); };
      const seed = document.getElementById('rotaSeedBtn');
      if (seed) seed.onclick = () => { R.seedRotaForSite(S.db, site); S.persist(); toast('Week rota filled'); window.App.render(); };
      document.querySelectorAll('[data-rota-edit]').forEach(cell => {
        cell.onclick = () => {
          const staffId = cell.dataset.rotaEdit;
          const date = cell.dataset.rotaDate;
          const member = S.db.team.find(x => x.id === staffId);
          const cur = R.getShift(S.db, site, staffId, date);
          modal('Shift ? ' + (member ? member.name : staffId) + ' ? ' + date, `<div class="space-y-3">
            <div><label class="label">Status</label><select id="rs_st" class="select">${['scheduled','off','sick','leave'].map(k => `<option value="${k}" ${cur && cur.status===k?'selected':''}>${R.ROTA_STATUS[k].label}</option>`).join('')}</select></div>
            <div class="grid grid-cols-2 gap-2"><div><label class="label">Start</label><input id="rs_a" class="input" type="time" value="${cur && cur.startTime || '09:00'}"></div>
            <div><label class="label">End</label><input id="rs_b" class="input" type="time" value="${cur && cur.endTime || '17:00'}"></div></div>
            <input id="rs_n" class="input" placeholder="Note" value="${cur && cur.note ? escapeHtml(cur.note) : ''}">
            <button type="button" class="btn btn-primary w-full" id="rs_save">Save shift</button></div>`);
          document.getElementById('rs_save').onclick = () => {
            R.setShift(S.db, site, staffId, date, {
              status: document.getElementById('rs_st').value,
              startTime: document.getElementById('rs_a').value,
              endTime: document.getElementById('rs_b').value,
              note: document.getElementById('rs_n').value.trim(),
            }, (window.App.currentUser && window.App.currentUser().email) || 'manager');
            S.persist();
            closeModal();
            toast('Shift saved');
            window.App.render();
          };
        };
      });
    }};
  }

  window.Views = { home: hub, hub, wflive, wfdone, wfout, wfod, wfstaff, wfdel, wfprod, wfclean, wfhaccp, wfperf, foodcost, taskoverview, deliveries, dashboard, temps, alerts, haccp, records, sites, reports, team, recipes, suppliers, training, incidents, maintenance, assets, batches, cooling, phlogs, holding, allerq, labels, waste, manual, settings, clock, rota };
})();
