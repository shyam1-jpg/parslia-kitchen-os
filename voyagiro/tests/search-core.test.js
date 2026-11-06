const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const core = require('../site/js/search-core.js');

const places = [
  { n: 'London', c: 'LON', k: 'United Kingdom', t: 'city' },
  { n: 'London Heathrow', c: 'LHR', k: 'London', t: 'airport' },
  { n: 'Kyoto via Kansai', c: 'KIX', k: 'Osaka airport serving Kyoto', t: 'airport' },
  { n: 'São Paulo', c: 'SAO', k: 'Brazil', t: 'city' }
];

test('city and airport codes stay distinct', () => {
  assert.equal(core.findPlace(places, 'London').c, 'LON');
  assert.equal(core.findPlace(places, 'London').t, 'city');
  assert.equal(core.findPlace(places, 'London Heathrow').c, 'LHR');
  assert.equal(core.findPlace(places, 'LHR').t, 'airport');
  assert.equal(core.findPlace(places, 'LON').t, 'city');
  assert.equal(core.findPlace(places, 'Kyoto via Kansai (KIX)').c, 'KIX');
  assert.equal(core.findPlace(places, 'Kyoto').t, 'airport');
});

test('dates are calendar dates, not UTC-shifted instants', () => {
  assert.equal(core.addDays('2026-11-05', 1), '2026-11-06');
  assert.equal(core.addDays('2026-12-31', 1), '2027-01-01');
  const noon = new Date('2026-11-05T12:00:00');
  assert.equal(core.localISO(noon), '2026-11-05');
  const adjusted = core.coerceDates('f', '2026-11-05', '2020-01-01', '2020-01-02', false);
  assert.equal(adjusted.depart, '2026-11-12');
  assert.ok(adjusted.notes.includes('depart'));
  const hotel = core.coerceDates('h', '2026-11-05', '2026-12-01', '2026-12-01', false);
  assert.equal(hotel.ret, '2026-12-08');
  assert.ok(hotel.notes.includes('checkout'));
});

test('party limits and encoding', () => {
  assert.deepEqual(core.party('f', '2', '9').errors, []);
  assert.deepEqual(core.party('f', '0', '1').errors, ['adults']);
  assert.deepEqual(core.party('h', '10', '1').errors, ['adults']);
  const rooms = core.party('h', '1', '4');
  assert.equal(rooms.rooms, 1);
  assert.ok(rooms.notes.includes('rooms'));
  assert.equal(core.encodeQuery('São Paulo'), 'S%C3%A3o%20Paulo');
  assert.equal(core.encodeQuery('दिल्ली'), '%E0%A4%A6%E0%A4%BF%E0%A4%B2%E0%A5%8D%E0%A4%B2%E0%A5%80');
  assert.equal(core.encodeQuery('New York'), 'New%20York');
  assert.equal(core.esc('<img src=x onerror=alert(1)>'), '&lt;img src=x onerror=alert(1)&gt;');
});

test('provider links keep the route and reject unsafe URLs', () => {
  const url = core.aviaSearch('LON', 'DXB', '2026-12-05', '2026-12-12', 2, '799010');
  assert.equal(url, 'https://www.aviasales.com/search/LON0512DXB12122?marker=799010');
  assert.equal(core.aviaSearch('LON', 'LON', '2026-12-05', '', 1, '799010'), null);
  assert.equal(core.aviaSearch('LON', 'DXB', '2026-12-05', '', 10, '799010'), null);
  assert.equal(core.safeHttps('javascript:alert(1)'), null);
  assert.equal(core.safeHttps('http://127.0.0.1/'), null);
  assert.match(core.safeHttps('https://www.kayak.com/flights/LON-DXB/2026-12-05/1adults'), /^https:\/\/www\.kayak\.com\//);
});

test('cached fares are per adult and not a site-wide cheapest claim', () => {
  const fare = core.describeFare({ p: 227, tr: 2, dep: '2026-11-29' }, { currency: 'gbp', fetched: '2026-11-01', source: 'Travelpayouts Data API' });
  assert.equal(fare.unit, 'adult');
  assert.equal(fare.basis, 'cached-sample');
  assert.equal(fare.currency, 'GBP');
  assert.equal(fare.singleTicketKnown, false);
  assert.equal(fare.comparison, 'lowest-in-this-saved-list-only');
  assert.equal(core.describeFare({ p: 0 }, {}), null);
  assert.equal(core.trackedLink('https://www.aviasales.com/search/LON0512DXB12121?marker=799010'), true);
  assert.equal(core.trackedLink('https://www.kayak.com/flights/LON-DXB/2026-12-05/1adults'), false);
});

test('shipped pages do not pretend the inquiry form or pop-ups work', () => {
  const app = fs.readFileSync(path.join(__dirname, '../site/js/app.js'), 'utf8');
  const home = fs.readFileSync(path.join(__dirname, '../site/index.html'), 'utf8');
  assert.equal(app.includes('window.open'), false);
  assert.equal(app.includes('Cheapest fares'), false);
  assert.equal(app.includes('free cancellation'), false);
  assert.equal(home.includes('YOUR_FORMSPREE'), false);
  assert.match(home, /js\/search-core\.js\?v=5/);
  assert.match(home, /name="marketing"/);
  assert.match(app, /airbnb:\{n:'Airbnb'[^}]*h:\(d,a,b,x\)/);
});
