// Best-month-to-fly widget. Reads build-time JSON from /best-month/{ORIGIN}.json (scripts/fetch_best_month.py).
// RULES: never estimate or invent a price. No file / no data for a route -> the widget stays hidden.
(()=>{const secs=document.querySelectorAll('.bestmonth');if(!secs.length)return;
const HI=document.documentElement.lang==='hi',T=(a,b)=>HI?b:a;
const base=new URL('../best-month/',document.currentScript.src);
const PL=window.VG_PLACES||[],nm=c=>(PL.find(p=>p.c===c&&p.t==='city')||{}).n||c;
const valid=j=>j&&j.source==='travelpayouts-month-matrix'&&j.routes&&typeof j.routes==='object'&&(!j._fixture||window.VG_ALLOW_FIXTURE===true);
const months=()=>{const d=new Date(),o=[];for(let i=0;i<12;i++){const x=new Date(d.getFullYear(),d.getMonth()+i,1);o.push(x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0'))}return o};
const clean=r=>{const o={};for(const[k,v]of Object.entries(r||{}))if(/^\d{4}-\d{2}$/.test(k)&&v&&Number.isFinite(v.price)&&v.price>0&&v.found_at)o[k]=v;return o};
const cache={};const load=o=>cache[o]||(cache[o]=fetch(new URL(o+'.json',base)).then(r=>r.ok?r.json():null).then(j=>valid(j)?j:null).catch(()=>null));
function draw(sec,j,d){const ch=sec.querySelector('.bm-chart'),r=clean(j&&j.routes[d]),ms=months(),have=ms.filter(m=>r[m]);
 if(!have.length){sec.hidden=true;ch.innerHTML='';return false}
 const cur=(j.currency||'').toUpperCase(),f=v=>{try{return new Intl.NumberFormat(HI?'hi-IN':'en-GB',{style:'currency',currency:cur,maximumFractionDigits:0}).format(v)}catch(_){return cur+' '+Math.round(v)}};
 const mx=Math.max(...have.map(m=>r[m].price)),mn=Math.min(...have.map(m=>r[m].price));
 const ml=m=>new Date(m+'-15T12:00:00').toLocaleDateString(HI?'hi-IN':'en-GB',{month:'short'});
 ch.innerHTML=ms.map(m=>{const v=r[m];if(!v)return `<div class="bm-bar na" role="listitem" title="${T('Not enough data','पर्याप्त डेटा नहीं')}"><i style="height:0"></i><span>–</span><span>${ml(m)}</span></div>`;
  return `<div class="bm-bar${v.price===mn?' min':''}" role="listitem" title="${T('from','से')} ${f(v.price)} · ${T('found','मिला')} ${String(v.found_at).slice(0,10)}"><span>${f(v.price)}</span><i style="height:${Math.max(8,Math.round(v.price/mx*100))}%"></i><span>${ml(m)}</span></div>`}).join('');
 const best=have.find(m=>r[m].price===mn);let s=sec.querySelector('.bm-sum');if(!s){s=document.createElement('p');s.className='bm-sum';ch.after(s)}
 s.textContent='';const strong=document.createElement('b');strong.textContent=T('Lowest month in this saved list','इस सहेजी सूची का सबसे कम महीना')+': '+ml(best);s.append(strong,document.createTextNode(' · '+T('from','से')+' '+f(mn)+' ('+T('found','मिला')+' '+String(r[best].found_at).slice(0,10)+') '));const go=document.createElement('a');go.className='btn ghost bm-go';go.href='#search';go.textContent=T('Search this month','इस महीने खोजें');s.append(go);
 s.querySelector('.bm-go').onclick=()=>{const sf=document.getElementById('sf');if(sf){sf.d.value=nm(d)+' ('+d+')';sf.a.value=best+'-01';sf.a.dispatchEvent(new Event('change'))}};
 sec.hidden=false;return true}
secs.forEach(sec=>{const os=sec.querySelector('.bm-o'),ds=sec.querySelector('.bm-d'),fixed=sec.dataset.dest;
 try{const s=localStorage.getItem('vg_bm_origin');if(s&&[...os.options].some(o=>o.value===s))os.value=s}catch(_){}
 const go=async()=>{const j=await load(os.value);if(!j){sec.hidden=true;return}
  if(fixed)return draw(sec,j,fixed);
  const keys=Object.keys(j.routes).filter(k=>Object.keys(clean(j.routes[k])).length);if(!keys.length){sec.hidden=true;return}
  const prev=ds.value;ds.innerHTML=keys.map(k=>`<option value="${k}">${nm(k)}</option>`).join('');if(keys.includes(prev))ds.value=prev;draw(sec,j,ds.value)};
 os.addEventListener('change',()=>{try{localStorage.setItem('vg_bm_origin',os.value)}catch(_){}go()});ds&&ds.addEventListener('change',go);go()});
})();
