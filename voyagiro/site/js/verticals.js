// Phase 2: Trains / Buses / Transfers / Cars tabs on the homepage (partner lists by region; no prices).
(()=>{const HI=document.documentElement.lang==='hi';
const partners=Object.fromEntries((window.VG_PARTNERS||[]).map(p=>[p.id,p]));
document.querySelectorAll('.vcard').forEach(a=>{const p=partners[a.dataset.partner];const s=a.querySelector('small');if(!p||!s)return;const tracked=!!p.aff;a.rel=tracked?'sponsored noopener':'noopener';s.textContent=tracked?(HI?'एफिलिएट लिंक':'Affiliate link'):(HI?'सामान्य लिंक · ट्रैकिंग नहीं':'Plain link · not tracked')});
document.querySelectorAll('.adlabel').forEach(n=>{if(/affiliate|एफिलिएट/i.test(n.textContent)&&![...n.parentNode.querySelectorAll('.vcard')].some(a=>partners[a.dataset.partner]&&partners[a.dataset.partner].aff))n.textContent=HI?'पार्टनर लिंक अभी ट्रैक नहीं हो रहे। कमीशन तभी जुड़ता है जब प्रोग्राम जुड़ा हो।':'These partner links are not tracked yet. A commission is recorded only after that programme is connected.'});
const box=document.getElementById('search');if(!box||!box.querySelector('.vtab'))return;
const sf=document.getElementById('sf'),ow=box.querySelector('.ow'),panels=box.querySelectorAll('.vpanel');
const show=v=>{box.querySelectorAll('.tab').forEach(t=>t.classList.toggle('on',v?t.dataset.v===v:t.dataset.m===sf.dataset.mode));sf.hidden=!!v;if(ow)ow.hidden=!!v;panels.forEach(p=>p.hidden=p.dataset.v!==v)};
box.querySelectorAll('.vtab').forEach(t=>t.addEventListener('click',()=>show(t.dataset.v)));
box.querySelectorAll('.tab[data-m]').forEach(t=>t.addEventListener('click',()=>show(null)));
panels.forEach(p=>p.querySelectorAll('[data-vr]').forEach(c=>c.addEventListener('click',()=>{p.querySelectorAll('[data-vr]').forEach(z=>z.classList.toggle('on',z===c));const r=c.dataset.vr;
 p.querySelectorAll('.vcard').forEach(a=>{const rs=a.dataset.r.split(' ');a.hidden=!(r==='all'||rs.includes(r)||rs.includes('worldwide'))})})));
// Search details -> partner deep links. Only formats verified by a live click-through are listed here.
const T=(a,b)=>HI?b:a,slug=x=>(x||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const F={ // full = place + date ; route = place only (pick the date on the partner site)
 // 12Go: only routes verified live on 1 Nov 2026 (others e.g. london/manchester, delhi/agra return error 500)
 '12go':(q)=>q.f&&q.t&&['london/paris','bangkok/chiang-mai'].includes(slug(q.f)+'/'+slug(q.t))?{u:`https://12go.asia/en/travel/${slug(q.f)}/${slug(q.t)}?${q.d?'date='+q.d+'&':''}people=1`,full:!!q.d}:null,
 '12gobus':(q)=>F['12go'](q),
 trainline:(q)=>q.f&&q.t?{u:`https://www.thetrainline.com/train-times/${slug(q.f)}-to-${slug(q.t)}`,full:false}:null,
 flixbus:(q)=>q.f&&q.t?{u:`https://www.flixbus.co.uk/bus-routes/${slug(q.f)}-${slug(q.t)}`,full:false}:null};
box.querySelectorAll('.vform').forEach(fm=>{const pn=fm.closest('.vpanel');pn.querySelectorAll('.vcard').forEach(a=>a.dataset.home=a.href);
 fm.addEventListener('submit',ev=>{ev.preventDefault();const g=n=>fm.elements[n]?fm.elements[n].value:'';const q={f:g('from'),t:g('to'),d:g('date'),d2:g('date2')};let n=0;
  pn.querySelectorAll('.vcard').forEach(a=>{const r=F[a.dataset.partner]&&F[a.dataset.partner](q);let s=a.querySelector('.vs');if(!s){s=document.createElement('small');s.className='vs';a.append(s)}
   if(r){a.href=r.u;n++;s.textContent=r.full?T('Opens with your route and date','आपके रूट और तारीख़ के साथ खुलेगा'):T('Opens your route — pick the date there','आपका रूट खुलेगा — तारीख़ वहाँ चुनें')}
   else{a.href=a.dataset.home;s.textContent=T('Home page — enter your details there','होमपेज — विवरण वहाँ दर्ज करें')}});
  const m=fm.querySelector('.vnote');m.hidden=false;m.textContent=T(`${n} site(s) open with your search; others open their home page.`,`${n} साइट(ें) आपकी खोज के साथ खुलेंगी; बाकी होमपेज पर।`)})});
})();