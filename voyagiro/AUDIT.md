# Voyagiro audit

Checked 5 November 2026, 11:30–12:25 UK time. Production https://voyagiro.com was inspected and was not overwritten. This branch is a recoverable copy plus fixes. The site is not ready to launch: inquiries are not delivered, affiliate programmes are not approved in a dashboard this audit could open, and the owner still has to deploy and retest production.

## How the site works

| Piece | What the source shows |
| --- | --- |
| Frontend | Hand-written HTML, CSS, and browser JavaScript. No framework and no package manifest. English and Hindi are separate files. |
| Search | `site/js/app.js` builds outbound URLs. It does not receive fares from Kayak, Skyscanner, Booking.com, or the other directory brands. |
| Saved fares | `site/data/prices.json`, fetched 1 Nov 2026 from the Travelpayouts Aviasales `prices_for_dates` API. 88 routes, 411 fares, currency GBP, £25–£1,674. |
| Widgets | After a flight search, Travelpayouts scripts from `tp.media` can load. They are not on first paint. |
| Backend | No application server, webhook, or Cloud Function is in this site. `CHAT_API` is empty. |
| Hosting | Firebase Hosting. `voyagiro.com`, `voyagiro.web.app`, and `voyagiro.firebaseapp.com` share one etag. `the-vedanta.web.app` returns 404, so it is not this site. DNS is GoDaddy (`ns13/ns14.domaincontrol.com`) to `199.36.158.100`. |
| Firebase project | `the-vedanta`, web config from `/__/firebase/init.json`. `databaseURL` is empty. Pages do not call the Firebase SDK. |
| Deploy | Files share `Last-Modified: Mon, 02 Nov 2026 09:08:49 GMT` (09:08 UK). The generator (`build.py`) was not in git. This directory is the recovered source. |
| Accounts | No Voyagiro login. Firebase email signup on the project returns `ADMIN_ONLY_OPERATION`. |

## Where a search goes

1. The visitor types a place. Autocomplete labels `City:` or `Airport:` and the code.
2. Dates are read as `YYYY-MM-DD` from `<input type="date">`, using a local calendar date rather than a UTC instant.
3. Flights require two different codes from the place list, or a typed 3-letter code. Adults are 1–9. Children are not sent.
4. Hotels send the destination text, dates, adults, and rooms. Rooms are capped at the adult count.
5. Each deep-linked brand gets that route and those dates in its own URL shape. Brands without a deep link open their home page and say so.
6. Aviasales, when the marker is set, gets `https://www.aviasales.com/search/{origin}{DDMM}{dest}{DDMM}{adults}?marker=...`.
7. Sort is partner order, A–Z, or metasearch first. It is not a price sort.
8. The search is written to the query string so Back can restore it, including the filter.

## Providers

| Kind | Brands | What is live |
| --- | --- | --- |
| Deep link, no affiliate id | Kayak, Skyscanner, Momondo, Cheapflights, Kiwi.com, Expedia, Trip.com, Priceline, MakeMyTrip, Booking.com, Hotels.com, Vrbo | URL only. `ids` are still `YOUR_*`, and `TP_PROGRAMS` is `{}`, so `tag()` returns the plain URL. |
| Ordinary link | Google Flights and Hotels, Airbnb | No affiliate programme is configured. |
| Home page only | Agoda, Hostelworld, Yatra, Hotwire, Orbitz, Travelocity, CheapOair, eDreams, Opodo, lastminute.com, Traveloka, Rakuten Travel, Ctrip | The card says the home page opens. |
| Travelpayouts marker | Aviasales | Public marker `799010`, project `594268`, in the client because the link needs them. |
| Trains, buses, transfers, cars | Directory of 26 more brands | `aff: false` on every partner. Only 12Go London–Paris and Bangkok–Chiang Mai, Trainline, and FlixBus have a route URL. Others stay on the home page. |
| Widgets | Travelpayouts promo ids 7879 and 2811 | Loaded only after a flight search. |

The 27 flight and hotel brands in `places.js` match the old “27 sites” count. That count is a directory size, not 27 live prices.

## Feature status

| Feature | Status |
| --- | --- |
| Flight and hotel partner links | Working in code. Kayak and Aviasales URLs returned HTTP 200 from this network on 5 Nov 2026. That is not a completed search on every brand. |
| City versus airport labels | Working for the list. Kyoto is Kansai (KIX), not a Kyoto city code. |
| Saved Aviasales samples | Partially implemented. Real cached numbers, GBP, per adult in this branch. Not live. Stop count does not prove one ticket. |
| Month chart | Unavailable. `/best-month/LON.json` is 404, and the widget stays hidden. |
| Trains, buses, transfers, cars | Partially implemented. Lists and a few route URLs. No prices. Not tracked. |
| Affiliate attribution | Awaiting programme approval and dashboard proof. A click is stored locally as a click, not as revenue. |
| Inquiry form | Unavailable until `INQUIRY_ENDPOINT` is set. Nothing is stored. |
| Mailbox `voyagiro@mail.grokbot.com` | Awaiting the owner. The previous source comment says it is not claimed. SPF, DKIM, and DMARC were not checked. |
| Chat | Working as FAQ. It cannot book or see live prices. `CHAT_API` is empty. |
| Accounts and payments | Not implemented. |
| Hindi guides | Working as separate pages. Place names stay in English. |
| Analytics | Unavailable. GA4 id is `G-XXXXXXXXXX` and the script is not injected. |
| Monitoring alerts | Partially implemented. Events stay in the tab unless `OPS_ENDPOINT` is set. Nobody is emailed. |
| Production deploy of these fixes | Not done. |

## Price integrity

Saved fares are cached samples in GBP for one adult. The file date is 1 Nov 2026. The UI says the partner confirms the final price. Taxes are not itemised. The stop count is not a single-ticket flag. Forty samples are Ryanair, easyJet, or Wizz with two or more stops, which may be separate tickets; the file does not say. Hotel nightly and stay totals are not shown here. No currency is converted. “Lowest in this saved list” is only the minimum of that route’s samples.

## Affiliate attribution

This audit could not open a Travelpayouts, Impact, Kayak, Skyscanner, or Booking dashboard. No booking was made.

| Event | Where it is recorded |
| --- | --- |
| Search submitted | `vg_ops` event `search_submit`. Not revenue. |
| Provider link clicked | `vg_clicks` and `provider_click`, with partner and tracked/plain. The route and the URL are not stored. |
| Booking reported by the network | Not visible here. |
| Commission pending, approved, or paid | Not visible here. |

Programme notes from the config comments, not from a current contract: Kayak’s comment mentions a $500 minimum and a 30-day cookie; Skyscanner’s comment mentions an Impact visitor threshold; Booking.com programme id 2076 was left out because the comment says it was not joined on 1 Nov 2026; Airbnb is link-out only.

## Firebase and security

Public checks on 5 Nov 2026:

- Identity Toolkit `signUp` with the web API key returns `ADMIN_ONLY_OPERATION`. The same call works without a Referer, so the key is not locked to voyagiro.com.
- Realtime Database `the-vedanta-default-rtdb.firebaseio.com` returns 404.
- Storage list on `the-vedanta.firebasestorage.app` returns 404.
- Firestore document list returns an HTML 404, which fits an API that is not enabled. The Firebase CLI was not logged in, so rules were not read from the console.
- No `api/chat.js`, `functions/index.js`, `.env`, or source map is on the host.
- Response headers on production include HSTS and omit `X-Frame-Options`, `X-Content-Type-Options`, and `Referrer-Policy`. `firebase.json` in this branch adds those for a future deploy.
- The web API key is a Firebase web key. It is not a service-account private key. No private key was found in the downloaded site.

Customer inquiries are not in a database. There is no server-side URL fetch, no webhook, and no cookie session. The inquiry form does not ask for a passport or a card number.

## Content

English guides: 59 files, 59 distinct texts, shortest about 4,300 characters. Hindi guides: 59 files, none empty. The guides index says 59. Sitemap destination URLs are 118, which is 59 English plus 59 Hindi. Visa and safety lines that stated entry or safety rules were replaced with a pointer to official advice in this branch. Transport sentences inside the guides were not re-checked against a timetable.

## Performance, measured

From this VM to Fastly (`cache-cmh`), 5 Nov 2026 about 11:33 UK time:

| Request | Time to first byte | Size |
| --- | --- | --- |
| Homepage | 88 ms | 29 KB HTML |
| `js/app.js?v=4` (production) | 38 ms | 25 KB |
| `css/style.css?v=4` | 80 ms | 13 KB |
| `data/prices.json` | 78 ms | 189 KB |
| `img/ai-hero.jpg` | not timed separately | 357 KB |
| `img/london.jpg` | not timed separately | 353 KB |
| `img/dubai.jpg` | not timed separately | 235 KB |

Production caches HTML, CSS, JS, and the fare file for 3600 seconds. A new script query `v=5` is the cache-buster in this branch. No Lighthouse score was run. Google Fonts is an `@import` in CSS. Images use fixed card heights, so the cards reserve space.

## Findings

### P0

None confirmed. No private key, no public inquiry collection, and no readable customer database was found. Firebase console rules still need the owner’s login before anyone adds a database to project `the-vedanta`.

### P1

| Finding | Evidence | Impact | Fix in this branch | Verification |
| --- | --- | --- | --- | --- |
| Inquiry copy claimed an acknowledgement while the action was `formspree.io/f/YOUR_FORMSPREE_ID`. | `index.html` before the patch. Config comment says the mailbox is not claimed. | A visitor thinks the trip request was sent. Without JavaScript the browser posted to that placeholder. | Form action is `#`. The page says nothing is stored. Endpoint stays empty. | `search-core.test.js` asserts the placeholder is gone. |
| Partner cards said “Affiliate partner” while `aff` is false for all 53 partners. | `places.js` and the static HTML. | Clicks can be described as tracked when they are not. | Labels say “Plain link · not tracked”. `rel` is `noopener` unless the URL has a real affiliate parameter. | HTML replace counts: 523 English and 523 Hindi labels. |
| Saved fares were headed as cheapest, in pounds, without “per adult”, and a stop count could be read as one ticket. | `app.js` production and `prices.json` sample LON–DXB Ryanair, 2 stops, £227, 29–30 Nov 2026. | A party of two can think £227 is the total, and a self-transfer can look protected. | Copy says per adult, saved sample, list minimum only, and that the file does not say one ticket. | Unit test on `describeFare`. |
| A second search stacked another Aviasales panel, and a slow fare response could paint an older route. | Production `flightPanel` always inserted. | Stale prices sit next to a newer search. | One panel, token checked before paint, failed fetch does not swap in other offers. | Code review and browser search twice. |
| Dates in the past were changed with no message. | Production comment “never block on dates”. | The partner can be opened for a week the visitor did not choose. | The adjustment is written into the form message. | `coerceDates` test. |
| “Compare top 3” called `window.open` three times. | Production `app.js`. | Extra windows, often blocked, without a clear per-site action. | The control highlights three links and does not open them. | Test asserts `window.open` is absent. |

### P2

| Finding | Evidence | Impact | Fix | Verification |
| --- | --- | --- | --- | --- |
| Hotel destination was inserted with `innerHTML`. | Production results template. | A shared search URL could have become HTML. Search is now in the query string, so this had to be closed. | Results are built with `textContent`. | `esc` test. Browser: a destination of `<img src=x onerror=alert(1)>` stayed plain text and raised no alert. |
| Kyoto used city type and code KIX. The Kyoto page said “Arriving at Kyoto (KIX)”. | `places.js`, `destinations/kyoto.html`. | A Kyoto search is an Osaka-prefecture airport. | Name is “Kyoto via Kansai”, type airport. Page no longer says the airport is in Kyoto. | Place test. |
| Booking.com “best for” said “free cancellation”. | Production `app.js`. | Invented fare condition. | “Cancellation rules vary by rate.” | Source test. |
| Titles and FAQs said cheap flights and best hotels. | Production `<title>` and FAQ. | Unsupported cheapest claim. | Titles and FAQ answers no longer say that. Guide prose about cheap meals was left. | HTML patch. |
| Visa and safety lines stated entry and safety rules. | 51 English visa lines, 34 English safety lines. | Rules go stale. | Replaced with “check official advice”. | Patch counts. |
| Privacy said Formspree stores inquiries for 24 months. | `privacy.html`. | Describes a processor that is not connected. | Privacy now says the form stores nothing. | File read. |
| Disclosure said those brands are affiliate links. | `affiliate-disclosure.html`. | Overstates tracking. | Says directory buttons are ordinary until configured, and Aviasales may carry the public marker. | File read. |
| Mobile CSS hid nav links and the swap control. | `@media (max-width: 640px)` and `980px`. | Disclosure and language links disappeared. Swap was `display:none`. | Links wrap. Swap stays. Touch targets are at least 44px. | Browser widths below. |
| Chat was labelled “Voyagiro AI”, had no length cap, and could cover the search. | `chat.js`. | Implies a booking assistant. | “Trip help”, 500 characters, 12 turns, 20s abort if an API is later set, Escape restores focus, button sits under form controls. | Browser. |
| Firebase web key is unrestricted and the hosting project is shared with Vedanta. | Identity Toolkit call; `projectId` `the-vedanta`. | A future open database would be callable from any site. | Not changed in the cloud. Documented. Separate the project before adding data. | Probe on 5 Nov 2026. |
| Legal pages say they are templates. | Privacy, terms, cookies, disclosure, 31 Oct 2026. | Not a reviewed policy. | Left for a lawyer. | Read. |
| Production cache is one hour and has no nosniff or frame denial. | Response headers. | Old JS can linger. | `firebase.json` for the next deploy only. | Not deployed. |

### P3

| Finding | Evidence | Impact | Fix |
| --- | --- | --- | --- |
| Hero and city JPEGs are 235–357 KB. Fonts load through CSS `@import`. | Image headers. | Extra bytes on first visit. | Not recompressed in this pass. |
| Fare file is cached an hour on production. | `prices.json` header. | Samples look newer than they are. | Proposed `max-age=300` after deploy. The JSON is already dated 1 Nov 2026. |
| Reduced motion was not in CSS. | No `prefers-reduced-motion` rule. | Entrance animation always runs. | CSS now disables animation when the user asks. |
| No dependency audit. | No `package.json` on the site. | Nothing to scan with npm audit. | Runtime third parties are Google Fonts and, after search, Travelpayouts. |

## Monitoring

`site/js/ops.js` records `search_submit`, `search_error`, `provider_click`, `provider_widget_error`, `provider_data_error`, `inquiry`, and `assistant`. Fields are event, provider, status, mode, and time. No name, email, message, or route.

Until `OPS_ENDPOINT` is set, the owner sees them only by typing `sessionStorage.vg_ops` in the browser. Expected action: for `provider_data_error` or `provider_widget_error`, check Aviasales and Travelpayouts; for `inquiry` `delivery-failed`, the visitor still has the text on screen and should use email; for `search_error`, the form already names the field. Do not treat `provider_click` as a booking.

## Release

Source for this snapshot is this directory. Production was left on the 2 Nov 2026 release. Preview with the local server. Deploy only with `firebase hosting:channel:deploy` first, then production, then `firebase hosting:rollback` if needed. Domain, Firebase, affiliate, email, and any future model key stay on the owner’s accounts. There is no database to back up. `prices.json` is the fare snapshot to keep.

## Still blocked

- Travelpayouts and other programme dashboards: account status, test-link proof, and commission reports.
- Affiliate ids for every brand except the public Aviasales marker.
- A claimed mailbox, SPF/DKIM/DMARC, and a real inquiry endpoint with staff access and a 24-month retention job.
- Firebase console login before any database or function is added. Restrict the web API key. Prefer a Voyagiro-only project.
- Lawyer review of the template policies.
- Owner deploy. These fixes are not on https://voyagiro.com.
- AI provider, if one is wanted. The assistant must stay unable to book until a human confirms, and that flow does not exist.
- Re-check of guide transport sentences against current timetables.

## Browser verification

Local server: `python3 -m http.server 8765` in `voyagiro/site`, desktop Chrome on this machine, 5 Nov 2026, 12:18–12:34 UK time. Six unit tests in `tests/search-core.test.js` passed.

- London (LON) to Dubai (DXB), 12–19 Nov 2026, one adult. The saved-sample heading read “Lowest in this list: £227 per adult. Not a live price and not a comparison of every site.” Cards said “£227 per adult” and “2 stops”. The Aviasales link in the status bar was `https://www.aviasales.com/search/LON1211DXB191111?marker=799010`.
- “Highlight first 3” outlined Kayak, Skyscanner, and Google Flights and did not open another window.
- Hotel destination `<img src=x onerror=alert(1)>` stayed plain text. The summary read “1 adult, 1 room”. No alert. Airbnb was listed. Console showed the expected `best-month/LON.json` 404 and Travelpayouts CORS failures, and did not show `x is not defined`.
- An earlier hotel search threw `x is not defined` because the Airbnb URL builder omitted the party argument. It now takes `(d, a, b, x)`. A bad partner URL is logged as `search_error` and the other cards still render.
- Trip help opened with “I am trip help, not a booking agent.” Asked “Can you book a flight for me?”, it answered that Voyagiro does not rank live fares and cannot see the partner price. Escape closed the panel. The open panel sits over the lower part of the filter column on this desktop width.
