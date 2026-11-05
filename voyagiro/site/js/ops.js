/* Privacy-conscious operational events. No names, emails, message text, or routes. */
(function () {
  const KEY = 'vg_ops';
  function clean(detail) {
    const src = detail || {};
    const out = {};
    ['event', 'provider', 'status', 'mode'].forEach(function (k) {
      if (src[k] == null) return;
      out[k] = String(src[k]).replace(/[\r\n@]/g, '').slice(0, 80);
    });
    out.ts = new Date().toISOString();
    return out;
  }
  function read() {
    try { return JSON.parse(sessionStorage.getItem(KEY) || '[]'); } catch (err) { return []; }
  }
  function record(event, detail) {
    const row = clean(Object.assign({ event: event }, detail || {}));
    try {
      const rows = read();
      rows.push(row);
      sessionStorage.setItem(KEY, JSON.stringify(rows.slice(-100)));
    } catch (err) { /* storage unavailable */ }
    const endpoint = (window.VOYAGIRO_CONFIG && window.VOYAGIRO_CONFIG.OPS_ENDPOINT) || '';
    if (!endpoint || !/^https:\/\//.test(endpoint)) return row;
    try {
      const body = JSON.stringify(row);
      if (navigator.sendBeacon) navigator.sendBeacon(endpoint, new Blob([body], { type: 'application/json' }));
      else fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body, keepalive: true }).catch(function () {});
    } catch (err) { /* monitoring must not break the page */ }
    return row;
  }
  window.VGOps = { record: record, read: read };
})();
