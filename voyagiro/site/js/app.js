(()=>{const C=window.VOYAGIRO_CONFIG,I=C.ids,Core=window.VGCore,e=encodeURIComponent,HI=document.documentElement.lang==='hi',T=(a,b)=>HI?b:a;
const ops=(ev,d)=>window.VGOps&&window.VGOps.record(ev,d);
const TPP=C.TP_PROGRAMS||{},tpw=(u,k)=>TPP[k]&&C.TP_MARKER&&C.TP_TRS?`https://tp.media/r?marker=${e(C.TP_MARKER)}&trs=${e(C.TP_TRS)}&p=${e(TPP[k])}&u=${e(u)}`:u;
const tag=(u,k,p)=>{if(TPP[k])return tpw(u,k);if(!I[k]||/^YOUR_/i.test(I[k]))return u;
const s=new URL(u);s.searchParams.set(p||'affid',I[k]);return s.toString()};
const nd=s=>s.replace(/-/g,''),yy=s=>nd(s).slice(2);
const P={
 kayak:{n:'Kayak',ty:'meta',bf:['Flexible-date fare grids','लचीली तारीखों के किराए'],u:(o,d,a,b,x)=>tag(`https://www.kayak.com/flights/${o}-${d}/${a}${b?'/'+b:''}/${x.pax}adults`,'kayak','a'),h:(d,a,b,x)=>tag(`https://www.kayak.com/hotels/${e(d)}/${a}/${b}/${x.pax}adults`,'kayak','a')},
 skyscanner:{n:'Skyscanner',ty:'meta',bf:['Budget airlines and month grids','बजट एयरलाइंस'],u:(o,d,a,b,x)=>tag(`https://www.skyscanner.net/transport/flights/${o.toLowerCase()}/${d.toLowerCase()}/${yy(a)}/${b?yy(b)+'/':''}?adultsv2=${x.pax}`,'skyscanner','associateid')},
 google:{n:'Google Flights',ty:'meta',bf:['Price calendar. No commission.','प्राइस कैलेंडर'],u:(o,d,a,b)=>`https://www.google.com/travel/flights?q=${e(`flights from ${o} to ${d} on ${a}${b?' through '+b:' one way'}`)}`,h:(d,a,b)=>`https://www.google.com/travel/search?q=${e('hotels in '+d)}&checkin=${a}&checkout=${b}`},
 momondo:{n:'Momondo',ty:'meta',bf:['Wide OTA coverage','कई OTA'],u:(o,d,a,b,x)=>tag(`https://www.momondo.com/flight-search/${o}-${d}/${a}${b?'/'+b:''}/${x.pax}adults`,'momondo','a')},
 cheapflights:{n:'Cheapflights',ty:'meta',bf:['Deal finder','जल्दी डील'],u:(o,d,a,b,x)=>tag(`https://www.cheapflights.com/flight-search/${o}-${d}/${a}${b?'/'+b:''}/${x.pax}adults`,'cheapflights','a')},
 kiwi:{n:'Kiwi.com',ty:'ota',bf:['Can combine airlines, including self-transfer','मल्टी-एयरलाइन संयोजन'],u:(o,d,a,b,x)=>tag(`https://www.kiwi.com/en/search/results/${o}/${d}/${a}/${b||'no-return'}?adults=${x.pax}`,'kiwi','affilid')},
 expedia:{n:'Expedia',ty:'ota',bf:['Flight and hotel packages','फ़्लाइट और होटल'],u:(o,d,a,b,x)=>tag(`https://www.expedia.com/Flights-Search?trip=${b?'roundtrip':'oneway'}&leg1=from:${o},to:${d},departure:${a}TANYT${b?`&leg2=from:${d},to:${o},departure:${b}TANYT`:''}&passengers=adults:${x.pax}`,'expedia','affcid'),h:(d,a,b,x)=>tag(`https://www.expedia.com/Hotel-Search?destination=${e(d)}&startDate=${a}&endDate=${b}&adults=${x.pax}&rooms=${x.rooms}`,'expedia','affcid')},
 trip:{n:'Trip.com',ty:'ota',bf:['Asia routes','एशिया रूट'],u:(o,d,a,b,x)=>tag(`https://www.trip.com/flights/showfarefirst?dcity=${o.toLowerCase()}&acity=${d.toLowerCase()}&ddate=${a}${b?'&rdate='+b+'&triptype=rt':'&triptype=ow'}&class=y&quantity=${x.pax}`,'trip','Allianceid'),h:(d,a,b,x)=>tag(`https://www.trip.com/hotels/list?keyword=${e(d)}&checkin=${a}&checkout=${b}&adult=${x.pax}&crn=${x.rooms}`,'trip','Allianceid')},
 priceline:{n:'Priceline',ty:'ota',bf:['US deals','US डील'],u:(o,d,a,b,x)=>tag(`https://www.priceline.com/m/fly/search/${o}-${d}-${nd(a)}/${b?`${d}-${o}-${nd(b)}/`:''}?num-adults=${x.pax}`,'priceline','refid'),h:(d,a,b,x)=>tag(`https://www.priceline.com/relax/in/${e(d)}/from/${nd(a)}/to/${nd(b)}/rooms/${x.rooms}`,'priceline','refid')},
 makemytrip:{n:'MakeMyTrip',ty:'ota',in:1,bf:['India departures','भारत से उड़ानें'],u:(o,d,a,b,x)=>{const f=s=>s.split('-').reverse().join('/');return tag(`https://www.makemytrip.com/flight/search?itinerary=${o}-${d}-${f(a)}${b?`_${d}-${o}-${f(b)}`:''}&tripType=${b?'R':'O'}&paxType=A-${x.pax}_C-0_I-0&cabinClass=E`,'makemytrip','cmp')}},
 yatra:{n:'Yatra',ty:'ota',in:1,bf:['Indian carriers','भारतीय एयरलाइंस'],home:'https://www.yatra.com/'},
 booking:{n:'Booking.com',ty:'ota',bf:['Large hotel inventory. Cancellation rules vary by rate.','बड़ा होटल संग्रह। रद्दीकरण दर पर निर्भर करता है।'],h:(d,a,b,x)=>tag(`https://www.booking.com/searchresults.html?ss=${e(d)}&checkin=${a}&checkout=${b}&group_adults=${x.pax}&no_rooms=${x.rooms}`,'booking','aid')},
 agoda:{n:'Agoda',ty:'ota',bf:['Asia hotel inventory','एशिया के होटल'],home:'https://www.agoda.com/'},
 hotelscom:{n:'Hotels.com',ty:'ota',bf:['Loyalty programme on eligible stays','रिवॉर्ड्स'],h:(d,a,b,x)=>tag(`https://www.hotels.com/Hotel-Search?destination=${e(d)}&startDate=${a}&endDate=${b}&adults=${x.pax}&rooms=${x.rooms}`,'hotelscom','affcid')},
 vrbo:{n:'Vrbo',ty:'ota',bf:['Whole homes','पूरे घर'],h:(d,a,b,x)=>tag(`https://www.vrbo.com/search?destination=${e(d)}&startDate=${a}&endDate=${b}&adults=${x.pax}`,'vrbo','affcid')},
 airbnb:{n:'Airbnb',ty:'ota',bf:['Homes and apartments','अनोखे ठहराव'],h:(d,a,b,x)=>`https://www.airbnb.com/s/${e(d)}/homes?checkin=${a}&checkout=${b}&adults=${x.pax}`},
 hostelworld:{n:'Hostelworld',ty:'ota',bf:['Hostels','हॉस्टल'],home:'https://www.hostelworld.com/'},
 makemytriph:{n:'MakeMyTrip Hotels',ty:'ota',in:1,bf:['Indian hotels','भारतीय होटल'],h:(d,a,b,x)=>{const f=s=>{const[y,m,dd]=s.split('-');return m+dd+y};return tag(`https://www.makemytrip.com/hotels/hotel-listing/?checkin=${f(a)}&checkout=${f(b)}&searchText=${e(d)}&roomStayQualifier=${x.pax}e0e`,'makemytrip','cmp')}},
 hotwire:{n:'Hotwire',ty:'ota',bf:['Discounted hotel rates','हॉट रेट'],home:'https://www.hotwire.com/'},
 orbitz:{n:'Orbitz',ty:'ota',bf:['Rewards on eligible bookings','रिवॉर्ड्स'],home:'https://www.orbitz.com/'},
 travelocity:{n:'Travelocity',ty:'ota',bf:['Packages','पैकेज'],home:'https://www.travelocity.com/'},
 cheapoair:{n:'CheapOair',ty:'ota',bf:['Phone booking support','फ़ोन सहायता'],home:'https://www.cheapoair.com/'},
 edreams:{n:'eDreams',ty:'ota',bf:['European flights','यूरोप की उड़ानें'],home:'https://www.edreams.com/'},
 opodo:{n:'Opodo',ty:'ota',bf:['European packages','यूरोप पैकेज'],home:'https://www.opodo.co.uk/'},
 lastminute:{n:'lastminute.com',ty:'ota',bf:['Late bookings','आख़िरी समय'],home:'https://www.lastminute.com/'},
 traveloka:{n:'Traveloka',ty:'ota',bf:['Southeast Asia','दक्षिण-पूर्व एशिया'],home:'https://www.traveloka.com/'},
 rakuten:{n:'Rakuten Travel',ty:'ota',bf:['Japan stays','जापान'],home:'https://travel.rakuten.com/'},
 ctrip:{n:'Ctrip',ty:'ota',bf:['China domestic travel','चीन यात्रा'],home:'https://www.ctrip.com/'}
};
(window.VG_PARTNERS||[]).forEach(q=>{if(P[q.id]&&P[q.id].home)P[q.id].home=q.u});
const ORDER_F=['kayak','skyscanner','google','kiwi','expedia','trip','makemytrip','momondo','cheapflights','priceline'],ORDER_H=['booking','expedia','hotelscom','trip','google','kayak','airbnb','vrbo','makemytriph','priceline'];
function relFor(url){return Core.trackedLink(url)?'sponsored noopener':'noopener'}
function track(p,tracked){try{const l=JSON.parse(localStorage.getItem('vg_clicks')||'[]');l.push({p,tracked:!!tracked,page:location.pathname,ts:new Date().toISOString()});localStorage.setItem('vg_clicks',JSON.stringify(l.slice(-200)))}catch(_){}
 ops('provider_click',{provider:p,status:tracked?'tracked':'plain'});
 if(window.gtag)gtag('event','provider_click',{partner:p,tracked:tracked?'1':'0',transport_type:'beacon'})}
document.addEventListener('click',ev=>{const a=ev.target.closest('a[data-partner]');if(a)track(a.dataset.partner,a.dataset.tracked==='1')},{passive:true});
const PL=window.VG_PLACES||[];
function ac(inp){const box=document.createElement('ul');box.className='acl';box.id=inp.name+'-list';box.setAttribute('role','listbox');inp.parentNode.append(box);inp.setAttribute('role','combobox');inp.setAttribute('aria-autocomplete','list');inp.setAttribute('aria-expanded','false');inp.setAttribute('aria-controls',box.id);let i=-1,items=[];
 const close=()=>{box.replaceChildren();i=-1;items=[];inp.setAttribute('aria-expanded','false');inp.removeAttribute('aria-activedescendant')};
 const pick=p=>{inp.value=`${p.n} (${p.c})`;if(inp.nextElementSibling)inp.nextElementSibling.value=p.c;close();inp.dispatchEvent(new Event('change'))};
 inp.addEventListener('input',()=>{const q=Core.norm(inp.value);if(!q)return close();items=PL.filter(p=>Core.norm(p.n).includes(q)||p.c.toLowerCase()===q||Core.norm(p.k).includes(q)).slice(0,8);
  box.replaceChildren();items.forEach((p,j)=>{const li=document.createElement('li');li.id=box.id+'-'+j;li.setAttribute('role','option');li.dataset.j=String(j);const name=document.createElement('span');name.textContent=(p.t==='airport'?'Airport: ':'City: ')+p.n;const meta=document.createElement('small');meta.textContent=p.k+' · '+p.c+(p.t==='city'?' · all airports':'');li.append(name,meta);box.append(li)});
  inp.setAttribute('aria-expanded',items.length?'true':'false')});
 inp.addEventListener('keydown',ev=>{if(!items.length)return;if(ev.key==='ArrowDown'){i=(i+1)%items.length}else if(ev.key==='ArrowUp'){i=(i-1+items.length)%items.length}else if(ev.key==='Enter'&&i>=0){ev.preventDefault();pick(items[i]);return}else if(ev.key==='Escape'){close();return}else return;ev.preventDefault();[...box.children].forEach((li,j)=>{const on=j===i;li.classList.toggle('on',on);li.setAttribute('aria-selected',on?'true':'false');if(on)inp.setAttribute('aria-activedescendant',li.id)})});
 box.addEventListener('mousedown',ev=>{const li=ev.target.closest('li');if(li){ev.preventDefault();pick(items[+li.dataset.j])}});
 inp.addEventListener('blur',()=>setTimeout(close,120))}
const sf=document.getElementById('sf');
function msg(t,field){const m=document.querySelector('#search .formmsg');if(!m)return;m.id='formmsg';m.textContent=t||'';m.hidden=!t;if(!sf)return;['o','d','a','b','pax','rooms'].forEach(n=>{if(sf[n])sf[n].removeAttribute('aria-invalid')});if(field&&sf[field]){sf[field].setAttribute('aria-invalid','true');sf[field].setAttribute('aria-describedby','formmsg');sf[field].focus()}}
function setMode(m){if(!sf)return;sf.dataset.mode=m;sf.classList.toggle('hotel',m==='h');document.getElementById('search').classList.toggle('hotelmode',m==='h');document.querySelectorAll('.tab[data-m]').forEach(x=>{const on=x.dataset.m===m;x.classList.toggle('on',on);x.setAttribute('aria-selected',on?'true':'false')});const ow=document.querySelector('[name=ow]');sf.classList.toggle('oneway',m==='f'&&ow&&ow.checked);msg('')}
if(sf){const today=Core.localISO(new Date());sf.a.min=today;sf.b.min=Core.addDays(today,1);if(!sf.a.value)sf.a.value=Core.addDays(today,7);if(!sf.b.value)sf.b.value=Core.addDays(today,14);
 sf.querySelectorAll('.ac input:not([type=hidden])').forEach(ac);
 document.querySelectorAll('.tab[data-m]').forEach(t=>{t.setAttribute('role','tab');t.setAttribute('aria-selected',t.classList.contains('on')?'true':'false');t.addEventListener('click',ev=>{ev.preventDefault();setMode(t.dataset.m)})});
 const ow=document.querySelector('[name=ow]');ow&&ow.addEventListener('change',()=>sf.classList.toggle('oneway',ow.checked));
 sf.querySelector('.swap').addEventListener('click',()=>{const a=sf.o.value,b=sf.d.value;sf.o.value=b;sf.d.value=a;const ho=sf.oc,hd=sf.dc;if(ho&&hd){const c=ho.value;ho.value=hd.value;hd.value=c}});
 sf.a.addEventListener('change',()=>{const day=Core.localISO(new Date());if(!sf.a.value||sf.a.value<day)sf.a.value=day;sf.b.min=Core.addDays(sf.a.value,sf.dataset.mode==='h'?1:0);if(!sf.b.value||sf.b.value<sf.b.min)sf.b.value=Core.addDays(sf.a.value,7)});
 sf.b.addEventListener('change',()=>{if(sf.b.value&&sf.b.min&&sf.b.value<sf.b.min)sf.b.value=sf.b.min});
 sf.addEventListener('submit',ev=>{ev.preventDefault();run()})}
let last=null,seq=0,busy=false;
function placeLabel(p){if(!p)return '';return p.t==='city'?`${p.n} · all airports (${p.c})`:`${p.n} · airport (${p.c})`}
function writeSearch(state,replace){const q=new URLSearchParams();Object.entries(state).forEach(([k,v])=>{if(v!==''&&v!=null)q.set(k,v)});const url=location.pathname+'?'+q.toString();
 try{sessionStorage.setItem('vg_search',JSON.stringify(state))}catch(_){}
 if(replace)history.replaceState(state,'',url);else history.pushState(state,'',url)}
function run(opts){if(!sf||busy)return;busy=true;try{runSearch(opts)}finally{busy=false}}
function runSearch(opts){const my=++seq;const m=sf.dataset.mode||'f',today=Core.localISO(new Date());
 const ow=m==='f'&&!!document.querySelector('[name=ow]')?.checked;
 const dates=Core.coerceDates(m,today,sf.a.value,sf.b.value,ow);
 sf.a.value=dates.depart;if(dates.ret)sf.b.value=dates.ret;
 const group=Core.party(m,sf.pax.value,sf.rooms?sf.rooms.value:1);
 if(group.errors.length){msg(T('Adults must be 1 to 9. Hotel rooms must be 1 to 5, and not more than the number of adults. Children are not counted here.','वयस्क 1 से 9 होने चाहिए। होटल के कमरे 1 से 5, और वयस्कों से अधिक नहीं। बच्चों की गिनती यहाँ नहीं होती।'),group.errors[0]==='rooms'?'rooms':'pax');ops('search_error',{mode:m,status:'party'});return}
 if(group.notes.includes('rooms')&&sf.rooms)sf.rooms.value=String(group.rooms);
 if(!sf.d.value.trim()){msg(T('Enter a destination city or airport.','गंतव्य शहर या एयरपोर्ट दर्ज करें।'),'d');ops('search_error',{mode:m,status:'destination'});return}
 let origin=null,dest=null;
 if(m==='f'){origin=Core.findPlace(PL,sf.o.value);dest=Core.findPlace(PL,sf.d.value);
  if(!origin){msg(T('Choose a departure from the list, or type its 3-letter code.','प्रस्थान सूची से चुनें, या 3-अक्षर कोड लिखें।'),'o');ops('search_error',{mode:m,status:'origin'});return}
  if(!dest){msg(T('Choose a destination from the list, or type its 3-letter code.','गंतव्य सूची से चुनें, या 3-अक्षर कोड लिखें।'),'d');ops('search_error',{mode:m,status:'destination'});return}
  if(origin.c===dest.c){msg(T('Departure and destination are the same. Change one of them.','प्रस्थान और गंतव्य एक ही हैं। एक को बदलें।'),'d');ops('search_error',{mode:m,status:'same-place'});return}}
 else dest={n:sf.d.value.replace(/\s*\([A-Z]{3}\)\s*$/,'').trim(),c:'',t:'text',k:''};
 const note=[];
 if(dates.notes.length)note.push(T('Dates were adjusted so the trip stays on or after today.','तारीखें आज या उसके बाद रखने के लिए सुधारी गईं।'));
 if(group.notes.includes('rooms'))note.push(T('Rooms were reduced so there is at least one adult per room.','कमरे घटाए गए ताकि हर कमरे में कम से कम एक वयस्क हो।'));
 msg(note.join(' '));
 const x={pax:group.adults,rooms:group.rooms};
 last={m,o:origin,d:dest,a:dates.depart,b:dates.ret,x,filter:'all',sort:'order',token:my};
 writeSearch({m,from:sf.o.value,to:sf.d.value,depart:dates.depart,ret:dates.ret,adults:String(group.adults),rooms:String(group.rooms),ow:ow?'1':'0',filter:'all',sort:'order'},!!(opts&&opts.replace));
 render();
 ops('search_submit',{mode:m,status:'ok'});
 if(m==='f'){const u=Core.aviaSearch(origin.c,dest.c,dates.depart,dates.ret,group.adults,C.TP_MARKER);window.VG_LAST_REDIRECT=u;if(u)flightPanel(origin.c,dest.c,u,my);else ops('search_error',{provider:'aviasales',status:'link-unavailable'})}}
function flightPanel(o,d,u,token){const R=document.getElementById('results');if(!R)return;const old=R.parentNode.querySelector(':scope > .fpanel')||document.querySelector('#results .fpanel');document.querySelectorAll('.fpanel').forEach(n=>n.remove());
 const safe=Core.safeHttps(u);if(!safe){ops('search_error',{provider:'aviasales',status:'unsafe-url'});return}
 const base=`https://tp.media/content?trs=${e(C.TP_TRS)}&shmarker=${e(C.TP_MARKER)}&locale=en&currency=gbp&powered_by=false&campaign_id=100&origin=${e(o)}&destination=${e(d)}`;
 const W=document.createElement('section');W.className='fpanel glass';W.dataset.token=String(token);
 const h=document.createElement('h3');h.append(T('Flight options on Aviasales','Aviasales पर उड़ान विकल्प')+' ');const ad=document.createElement('small');ad.textContent='#ad';h.append(ad);
 const p=document.createElement('p');const a=document.createElement('a');a.className='btn';a.target='_blank';a.rel=relFor(safe);a.dataset.partner='aviasales';a.dataset.tracked=Core.trackedLink(safe)?'1':'0';a.href=safe;a.textContent=T('See live prices for these dates on Aviasales','इन तारीखों के लाइव किराए Aviasales पर देखें');p.append(a);
 const note=document.createElement('p');note.className='small';note.textContent=T('Aviasales confirms the final price, taxes shown there, baggage, and whether a connection is one ticket. A click is not a booking.','अंतिम कीमत, कर, सामान और कनेक्शन एक टिकट है या नहीं, यह Aviasales पुष्टि करता है। क्लिक बुकिंग नहीं है।');
 W.append(h,p,note);const fareBox=document.createElement('div');fareBox.className='fares';W.append(fareBox);
 const layout=R.querySelector('.rlayout');(layout?layout.parentNode:R).insertBefore(W,layout||null);
 if(C.TP_TRS&&C.TP_MARKER){[['tpw-sform','7879','&target_host=www.aviasales.com%2Fsearch&show_hotels=false&depart_date='+e(last.a)+'&return_date='+e(last.b||'')],['tpw-sched','2811','&target_host=www.aviasales.com%2Fsearch']].forEach(([cls,id,ex])=>{const hold=document.createElement('div');hold.className='tpw '+cls;W.insertBefore(hold,fareBox);const sc=document.createElement('script');sc.async=true;sc.charset='utf-8';sc.src=base+'&promo_id='+id+ex;sc.onerror=()=>{ops('provider_widget_error',{provider:'travelpayouts',status:id});hold.textContent=T('This Aviasales widget did not load. The links on this page are unchanged.','यह Aviasales विजेट नहीं खुला। इस पेज के लिंक वैसे ही हैं।')};hold.append(sc)})}
 fares(o,d,fareBox,safe,last.a,token)}
document.addEventListener('click',ev=>{const a=ev.composedPath().find(n=>n.tagName==='A'&&/tp\.media\/r\?/.test(n.href||'')&&/[?&]p=2811\b/.test(n.href));const u=window.VG_LAST_REDIRECT;if(!a||!u)return;
 try{const t=new URL(a.href);const safe=Core.safeHttps(u);if(!safe)return;t.searchParams.set('u',safe);a.href=t.toString()}catch(_){}},true);
let PJ=null;function getP(){if(PJ)return PJ;const c=new AbortController();const timer=setTimeout(()=>c.abort(),8000);
 PJ=fetch('/data/prices.json',{cache:'no-cache',signal:c.signal}).then(r=>{if(!r.ok)throw new Error('prices '+r.status);return r.json()}).finally(()=>clearTimeout(timer));
 PJ.catch(()=>{PJ=null;ops('provider_data_error',{provider:'aviasales',status:'prices'})});return PJ}
function money(amount,currency){try{return new Intl.NumberFormat(HI?'hi-IN':'en-GB',{style:'currency',currency:currency||'GBP',maximumFractionDigits:0}).format(amount)}catch(_){return (currency||'')+' '+amount}}
function fares(o,d,box,mine,a,token){if(!box)return;getP().then(j=>{if(token!==seq||!j)return;let L=j.routes&&j.routes[o+'-'+d];if(!L||!L.length){box.textContent=T('No saved fare sample for this route. Partner links above are unchanged.','इस रूट का सहेजा किराया नमूना नहीं है। ऊपर के लिंक वैसे ही हैं।');return}
 const ym=(a||'').slice(0,7);if(ym)L=[...L.filter(x=>String(x.dep).slice(0,7)===ym),...L.filter(x=>String(x.dep).slice(0,7)!==ym)];
 const described=L.map(x=>describeRow(x,j)).filter(Boolean);if(!described.length)return;
 const lowest=Math.min(...described.map(x=>x.fare.amount));
 const h=document.createElement('h4');h.textContent=T('Saved Aviasales samples. Lowest in this list: '+money(lowest,described[0].fare.currency)+' per adult. Not a live price and not a comparison of every site.','Aviasales के सहेजे नमूने। इस सूची में सबसे कम: '+money(lowest,described[0].fare.currency)+' प्रति वयस्क। यह लाइव कीमत नहीं और हर साइट की तुलना नहीं।');
 const intro=document.createElement('p');intro.className='small';intro.textContent=T('Fetched '+described[0].fare.fetched+' from '+described[0].fare.source+'. The partner confirms the final price. Taxes in the sample are not itemised. The stop count does not say whether the itinerary is one ticket.','नमूना '+described[0].fare.fetched+' को '+described[0].fare.source+' से लिया गया। अंतिम कीमत पार्टनर पुष्टि करता है। कर अलग नहीं दिखे हैं। स्टॉप की संख्या यह नहीं बताती कि यात्रा एक टिकट है।');
 const list=document.createElement('div');list.className='rlist';
 described.forEach(item=>{const art=document.createElement('article');art.className='rcard fare';const body=document.createElement('div');body.className='rbody';const title=document.createElement('h4');title.textContent=money(item.fare.amount,item.fare.currency)+' per adult';const copy=document.createElement('p');const stops=item.fare.stops===0?T('nonstop','बिना स्टॉप'):item.fare.stops+' '+T('stops','स्टॉप');copy.textContent=item.when+' · '+item.airline+' · '+stops;body.append(title,copy);
 const live=document.createElement('a');live.className='btn sm';live.target='_blank';live.rel=relFor(mine);live.dataset.partner='aviasales';live.dataset.tracked='1';live.href=mine;live.textContent=T('Check these dates','ये तारीखें देखें');
 art.append(body,live);if(item.sample){const sample=document.createElement('a');sample.className='small fdates';sample.target='_blank';sample.rel=relFor(item.sample);sample.dataset.partner='aviasales';sample.dataset.tracked='1';sample.href=item.sample;sample.textContent=T('Open the sample dates','नमूने की तारीखें खोलें');art.append(sample)}list.append(art)});
 box.replaceChildren(h,intro,list)}).catch(()=>{if(token!==seq)return;box.textContent=T('Saved fares could not be loaded. Partner links on this page are unchanged.','सहेजे किराए नहीं खुले। इस पेज के पार्टनर लिंक वैसे ही हैं।')})}
function describeRow(row,meta){const fare=Core.describeFare(row,meta);if(!fare)return null;const fm=s=>s?new Date(s+'T12:00:00').toLocaleDateString(HI?'hi-IN':'en-GB',{day:'numeric',month:'short',year:'numeric'}):'';
 const sample=Core.safeHttps('https://www.aviasales.com'+row.link+(String(row.link).includes('?')?'&':'?')+'marker='+e(C.TP_MARKER));
 return {fare,when:fm(row.dep)+(row.ret?' – '+fm(row.ret):''),airline:String(row.air||''),sample}}
function render(){const {m,o,d,a,b,x}=last,R=document.getElementById('results');if(!R)return;
 const ids=Object.keys(P),order=m==='f'?ORDER_F:ORDER_H,live=order.filter(k=>m==='f'?P[k].u:P[k].h),more=ids.filter(k=>!live.includes(k)&&P[k].home&&(m==='h'?!['kiwi','momondo','cheapflights','skyscanner','yatra'].includes(k):!['hostelworld','agoda'].includes(k)));
 const fmt=s=>s?new Date(s+'T12:00:00').toLocaleDateString(HI?'hi-IN':'en-GB',{day:'numeric',month:'short'}):'';
 const adults=x.pax===1?T('adult','वयस्क'):T('adults','वयस्क'),rooms=x.rooms===1?T('room','कमरा'):T('rooms','कमरे');
 const sum=m==='f'?`${placeLabel(o)} → ${placeLabel(d)} · ${fmt(a)}${b?' – '+fmt(b):' · '+T('one-way','एक तरफ़ा')} · ${x.pax} ${adults}`:`${d.n} · ${fmt(a)} – ${fmt(b)} · ${x.pax} ${adults}, ${x.rooms} ${rooms}`;
 R.hidden=false;R.replaceChildren();
 const bar=document.createElement('div');bar.className='rbar glass';const sumEl=document.createElement('div');sumEl.textContent=sum;const edit=document.createElement('button');edit.type='button';edit.className='btn ghost edit';edit.textContent=T('Edit search','खोज बदलें');bar.append(sumEl,edit);
 const layout=document.createElement('div');layout.className='rlayout';const side=document.createElement('aside');side.className='rside glass';
 const fh=document.createElement('h4');fh.textContent=T('Filter','फ़िल्टर');const chips=document.createElement('div');chips.className='chips v';
 [['all',T('All','सभी')],['meta',T('Metasearch','मेटासर्च')],['ota',T('Travel agencies','ट्रैवल एजेंसियाँ')],['in',T('India-focused','भारत-केंद्रित')]].forEach(([f,label])=>{const b=document.createElement('button');b.type='button';b.className='chip'+(f===last.filter?' on':'');b.dataset.f=f;b.textContent=label;chips.append(b)});
 const sortLab=document.createElement('label');sortLab.append(T('Sort','क्रम'));const sel=document.createElement('select');sel.className='rsort';[['order',T('Default partner order','डिफ़ॉल्ट पार्टनर क्रम')],['az','A–Z'],['meta',T('Metasearch first','मेटासर्च पहले')]].forEach(([v,label])=>{const oEl=document.createElement('option');oEl.value=v;oEl.textContent=label;if(v===last.sort)oEl.selected=true;sel.append(oEl)});sortLab.append(sel);
 const mark=document.createElement('button');mark.type='button';mark.className='btn top3';mark.textContent=T('Highlight first 3','पहले 3 चिह्नित करें');
 const sideNote=document.createElement('p');sideNote.className='small';sideNote.textContent=T('Prices, taxes and baggage are confirmed on the partner site. This list is not sorted by price. Highlighting does not open extra windows.','कीमत, कर और सामान पार्टनर साइट पर पुष्टि होते हैं। यह सूची कीमत के अनुसार नहीं है। चिह्नित करने से अतिरिक्त विंडो नहीं खुलती।');
 side.append(fh,chips,sortLab,mark,sideNote);
 const mainWrap=document.createElement('div');const h3=document.createElement('h3');h3.textContent=(m==='f'?T('Sites with your route and dates','आपके रूट और तारीख वाली साइटें'):T('Sites with your stay','आपके ठहराव वाली साइटें'))+' ('+live.length+')';
 const main=document.createElement('div');main.className='rlist main';live.forEach(k=>{try{main.append(card(k,m==='f'?P[k].u(o.c,d.c,a,b,x):P[k].h(d.n,a,b,x),true))}catch(err){ops('search_error',{provider:k,status:'link'})}});
 const details=document.createElement('details');details.className='moresites';const summary=document.createElement('summary');summary.textContent=T('Sites that open their home page','होमपेज खोलने वाली साइटें')+' ('+more.length+')';const other=document.createElement('div');other.className='rlist';more.forEach(k=>other.append(card(k,P[k].home,false)));details.append(summary,other);
 mainWrap.append(h3,main,details);layout.append(side,mainWrap);R.append(bar,layout);
 edit.onclick=()=>{document.getElementById('search').scrollIntoView({behavior:'smooth',block:'center'});sf.d.focus({preventScroll:true})};
 chips.querySelectorAll('[data-f]').forEach(c=>c.onclick=()=>{last.filter=c.dataset.f;chips.querySelectorAll('[data-f]').forEach(z=>z.classList.toggle('on',z===c));applyFilter()});
 sel.onchange=()=>{last.sort=sel.value;sortList()};
 mark.onclick=()=>{const links=[...main.querySelectorAll('.rcard:not([hidden]) a')].slice(0,3);main.querySelectorAll('.rcard').forEach(r=>r.classList.remove('marked'));links.forEach(a=>a.closest('.rcard').classList.add('marked'));if(links[0])links[0].focus();ops('search_highlight',{mode:m,status:'top3'})};
 applyFilter();R.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'})}
function card(k,url,deep){const p=P[k],safe=Core.safeHttps(url)||'https://voyagiro.com/';const art=document.createElement('article');art.className='rcard';art.dataset.k=k;art.dataset.ty=p.ty;art.dataset.in=p.in?'1':'0';art.dataset.n=p.n;
 const logo=document.createElement('div');logo.className='rlogo';logo.setAttribute('aria-hidden','true');logo.textContent=p.n[0];
 const body=document.createElement('div');body.className='rbody';const h=document.createElement('h4');h.textContent=p.n+' ';const badge=document.createElement('span');badge.className='badge '+p.ty;badge.textContent=p.ty==='meta'?T('Compares sites','तुलना साइट'):T('Books directly','सीधी बुकिंग');h.append(badge);
 if(p.in){const ind=document.createElement('span');ind.className='badge in';ind.textContent=T('India','भारत');h.append(ind)}
 const best=document.createElement('p');best.textContent=T('Listed for: ','यहाँ इसलिए: ')+(HI?p.bf[1]:p.bf[0]);body.append(h,best);
 if(!deep){const n=document.createElement('p');n.className='note';n.textContent=T('Opens the site home page. Enter the trip again there.','साइट का होमपेज खुलेगा। यात्रा वहाँ फिर दर्ज करें।');body.append(n)}
 const a=document.createElement('a');a.className='btn sm';a.target='_blank';a.rel=relFor(safe);a.dataset.partner=k;a.dataset.tracked=Core.trackedLink(safe)?'1':'0';a.href=safe;a.textContent=deep?T('Open this search','यह खोज खोलें'):T('Visit site','साइट देखें');
 art.append(logo,body,a);return art}
function applyFilter(){const R=document.getElementById('results');if(!R||!last)return;const f=last.filter||'all';R.querySelectorAll('.rcard').forEach(r=>{r.hidden=!(f==='all'||(f==='in'?r.dataset.in==='1':r.dataset.ty===f))});sortList()}
function sortList(){const R=document.getElementById('results');if(!R||!last)return;const L=R.querySelector('.rlist.main');if(!L)return;const live=last.m==='f'?ORDER_F:ORDER_H;const v=last.sort||'order';
 [...L.children].sort((p,q)=>v==='az'?p.dataset.n.localeCompare(q.dataset.n):v==='meta'?(p.dataset.ty==='meta'?0:1)-(q.dataset.ty==='meta'?0:1):live.indexOf(p.dataset.k)-live.indexOf(q.dataset.k)).forEach(c=>L.append(c))}
function restore(state){if(!sf||!state)return;if(state.m)setMode(state.m);if(state.from!=null)sf.o.value=state.from;if(state.to!=null)sf.d.value=state.to;if(state.depart)sf.a.value=state.depart;if(state.ret)sf.b.value=state.ret;if(state.adults)sf.pax.value=state.adults;if(state.rooms&&sf.rooms)sf.rooms.value=state.rooms;const ow=document.querySelector('[name=ow]');if(ow)ow.checked=state.ow==='1';sf.classList.toggle('oneway',state.m==='f'&&state.ow==='1');run({replace:true});if(last){last.filter=state.filter||'all';last.sort=state.sort||'order';applyFilter();const sel=document.querySelector('.rsort');if(sel)sel.value=last.sort}}
window.addEventListener('popstate',ev=>{if(ev.state&&ev.state.m)restore(ev.state)});
const q=new URLSearchParams(location.search);if(sf&&(q.get('to')||q.get('from')))restore({m:q.get('m')||'f',from:q.get('from')||sf.o.value,to:q.get('to')||'',depart:q.get('depart')||'',ret:q.get('ret')||'',adults:q.get('adults')||'1',rooms:q.get('rooms')||'1',ow:q.get('ow')||'0',filter:q.get('filter')||'all',sort:q.get('sort')||'order'});
document.querySelectorAll('#destinations').forEach(s=>{const cs=s.querySelectorAll('.ccard'),inp=s.querySelector('.cfilter');let c='All';const ap=()=>{const query=Core.norm(inp?.value||'');cs.forEach(x=>x.hidden=!((c==='All'||x.dataset.c===c)&&(!query||x.dataset.n.includes(query))))};
 s.querySelectorAll('.chip').forEach(b=>b.onclick=()=>{s.querySelectorAll('.chip').forEach(z=>z.classList.toggle('on',z===b));c=b.dataset.c;ap()});inp&&inp.addEventListener('input',ap)});
const inq=document.getElementById('inq');if(inq)inq.addEventListener('submit',ev=>{ev.preventDefault();const s=inq.querySelector('.inqmsg');const endpoint=C.INQUIRY_ENDPOINT||'';const val=n=>{const el=inq.elements[n];return el?String(el.value||''):''};
 if(!inq.checkValidity()){const bad=[...inq.elements].find(el=>el.willValidate&&!el.checkValidity());if(bad){bad.setAttribute('aria-invalid','true');bad.focus();bad.reportValidity()}ops('inquiry',{status:'invalid'});return}
 if(!endpoint||/YOUR_/i.test(endpoint)){s.hidden=false;s.textContent=T('Nothing was stored and no email was sent. The inquiry form is not connected yet. Write to '+C.CONTACT_EMAIL+' and do not include passport or card numbers. Tick the ideas box only if you want messages beyond a reply.','कुछ सहेजा नहीं गया और कोई ईमेल नहीं भेजा गया। फ़ॉर्म अभी जुड़ा नहीं है। '+C.CONTACT_EMAIL+' पर लिखें। पासपोर्ट या कार्ड नंबर न भेजें। सुझाव तभी चुनें जब आप उत्तर के अलावा संदेश चाहते हों।');ops('inquiry',{status:'not-configured'});return}
 const id=inq.dataset.sent||'';if(id&&sessionStorage.getItem('vg_inq_'+id)==='1'){s.hidden=false;s.textContent=T('This inquiry was already accepted in this tab. It was not sent again.','यह पूछताछ इस टैब में पहले ही स्वीकार हो चुकी है। दोबारा नहीं भेजी गई।');return}
 const body={name:val('name').slice(0,120),email:val('email').slice(0,160),trip:val('trip').slice(0,500),marketing:!!(inq.elements.marketing&&inq.elements.marketing.checked),inquiryId:crypto.randomUUID?crypto.randomUUID():String(Date.now())};
 fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify(body)}).then(r=>{if(!r.ok)throw new Error('status');sessionStorage.setItem('vg_inq_'+body.inquiryId,'1');inq.dataset.sent=body.inquiryId;s.hidden=false;s.textContent=T('Inquiry accepted. A personal reply depends on the mailbox being monitored. This is not a booking.','पूछताछ स्वीकार हुई। व्यक्तिगत उत्तर तभी मिलेगा जब मेलबॉक्स देखा जाए। यह बुकिंग नहीं है।');ops('inquiry',{status:'accepted'})}).catch(()=>{s.hidden=false;s.textContent=T('The form could not be delivered. Nothing on screen was discarded: copy your message and email '+C.CONTACT_EMAIL+'.','फ़ॉर्म नहीं पहुँचा। संदेश यहीं है: उसे कॉपी करके '+C.CONTACT_EMAIL+' पर भेजें।');ops('inquiry',{status:'delivery-failed'})})});
if(C.GA4_ID&&!/X/.test(C.GA4_ID)){const s=document.createElement('script');s.async=1;s.src='https://www.googletagmanager.com/gtag/js?id='+encodeURIComponent(C.GA4_ID);document.head.append(s);window.dataLayer=window.dataLayer||[];window.gtag=function(){dataLayer.push(arguments)};gtag('js',new Date());gtag('config',C.GA4_ID)}
const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;const io=!reduce&&'IntersectionObserver' in window?new IntersectionObserver(es=>es.forEach(x=>x.isIntersecting&&x.target.classList.add('in')),{threshold:.08}):null;document.querySelectorAll('.reveal').forEach(x=>io?io.observe(x):x.classList.add('in'));
window.VG={P,resolve:v=>{const p=Core.findPlace(PL,v);return p?p.c:null},render:()=>render()};})();
