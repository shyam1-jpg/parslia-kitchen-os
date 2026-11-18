/* Pure search helpers. No network, no DOM. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.VGCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) { return ESC[ch]; });
  }

  function localISO(date) {
    const d = date instanceof Date ? date : new Date(date);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  }

  function addDays(iso, days) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || '')) return '';
    const d = new Date(iso + 'T12:00:00');
    d.setDate(d.getDate() + days);
    return localISO(d);
  }

  function coerceDates(mode, today, depart, ret, oneWay) {
    const notes = [];
    let a = depart || '';
    let b = oneWay && mode === 'f' ? '' : (ret || '');
    if (!a || a < today) {
      a = addDays(today, 7);
      notes.push('depart');
    }
    if (mode === 'h') {
      if (!b || b <= a) {
        b = addDays(a, 7);
        notes.push('checkout');
      }
    } else if (!oneWay && (!b || b < a)) {
      b = addDays(a, 7);
      notes.push('return');
    }
    if (oneWay && mode === 'f') b = '';
    return { depart: a, ret: b, notes: notes };
  }

  function norm(value) {
    return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }

  function findPlace(list, value) {
    const v = String(value || '').trim();
    if (!v) return null;
    const coded = v.match(/^(.*)\(([A-Z]{3})\)\s*$/);
    if (coded) {
      const code = coded[2];
      const name = norm(coded[1]);
      return list.find(function (p) { return p.c === code && norm(p.n) === name; })
        || list.find(function (p) { return p.c === code; })
        || null;
    }
    if (/^[a-z]{3}$/i.test(v)) {
      const code = v.toUpperCase();
      return list.find(function (p) { return p.c === code && p.t === 'city'; })
        || list.find(function (p) { return p.c === code; })
        || null;
    }
    const n = norm(v);
    return list.find(function (p) { return norm(p.n) === n; })
      || list.find(function (p) { return norm(p.n).startsWith(n); })
      || null;
  }

  function party(mode, adults, rooms) {
    const pax = Number(adults);
    let roomCount = Number(rooms);
    if (!Number.isFinite(roomCount)) roomCount = 1;
    const errors = [];
    if (!Number.isInteger(pax) || pax < 1 || pax > 9) errors.push('adults');
    if (mode === 'h' && (!Number.isInteger(roomCount) || roomCount < 1 || roomCount > 5)) errors.push('rooms');
    const notes = [];
    if (mode === 'h' && errors.indexOf('rooms') === -1 && errors.indexOf('adults') === -1 && roomCount > pax) {
      roomCount = pax;
      notes.push('rooms');
    }
    return { adults: pax, rooms: mode === 'h' ? roomCount : 1, errors: errors, notes: notes };
  }

  function ddmmyy(iso) {
    return /^\d{4}-\d{2}-\d{2}$/.test(iso || '') ? iso.slice(8, 10) + iso.slice(5, 7) : '';
  }

  function aviaSearch(origin, dest, depart, ret, adults, marker) {
    if (!marker || !/^[A-Z]{3}$/.test(origin) || !/^[A-Z]{3}$/.test(dest)) return null;
    if (origin === dest) return null;
    const dd = ddmmyy(depart);
    const rd = ret ? ddmmyy(ret) : '';
    if (!dd || (ret && !rd)) return null;
    if (!Number.isInteger(adults) || adults < 1 || adults > 9) return null;
    return 'https://www.aviasales.com/search/' + origin + dd + dest + (rd || '') + adults + '?marker=' + encodeURIComponent(marker);
  }

  function safeHttps(url) {
    try {
      const u = new URL(url);
      if (u.protocol !== 'https:') return null;
      return u.toString();
    } catch (err) {
      return null;
    }
  }

  function encodeQuery(value) {
    return encodeURIComponent(String(value == null ? '' : value));
  }

  function describeFare(row, meta) {
    const amount = Number(row && row.p);
    if (!Number.isFinite(amount) || amount <= 0) return null;
    return {
      amount: amount,
      currency: String((meta && meta.currency) || '').toUpperCase(),
      unit: 'adult',
      basis: 'cached-sample',
      fetched: (meta && meta.fetched) || '',
      source: (meta && meta.source) || '',
      stops: Number(row.tr),
      singleTicketKnown: false,
      comparison: 'lowest-in-this-saved-list-only'
    };
  }

  function trackedLink(url) {
    return /[?&](marker|aid|affcid|associateid|affilid|allianceid|refid|cmp)=/i.test(String(url || ''))
      && !/YOUR_/i.test(String(url || ''));
  }

  return {
    esc: esc,
    localISO: localISO,
    addDays: addDays,
    coerceDates: coerceDates,
    norm: norm,
    findPlace: findPlace,
    party: party,
    aviaSearch: aviaSearch,
    safeHttps: safeHttps,
    encodeQuery: encodeQuery,
    describeFare: describeFare,
    trackedLink: trackedLink
  };
});
