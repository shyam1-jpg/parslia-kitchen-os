/* Trip help. FAQ only unless CHAT_API is configured. It cannot book or see live prices. */
(()=>{const C=window.VOYAGIRO_CONFIG||{},hi=document.documentElement.lang==='hi';
const M=C.CONTACT_EMAIL||'voyagiro@mail.grokbot.com';
const MAX=500,TURNS=12;
const FAQ=[
[/flight|fare|airfare|उड़ान|फ्लाइट|किराय/i,'Enter a route and dates, then open a partner site. Voyagiro does not rank live fares and cannot see the price the partner will charge.','रूट और तारीखें डालें, फिर पार्टनर साइट खोलें। Voyagiro लाइव किराए क्रमबद्ध नहीं करता और पार्टनर की अंतिम कीमत नहीं देखता।'],
[/hotel|stay|room|hostel|होटल|कमरा|ठहर/i,'Choose Hotels, enter a city and dates, and open a stay site. A nightly rate and the full stay are confirmed there, not here.','Hotels चुनें, शहर और तारीखें डालें, और ठहराव साइट खोलें। रात का रेट और पूरे ठहराव की कीमत वहीं पुष्टि होती है।'],
[/refund|cancel|change|reschedul|रिफ़ंड|रिफंड|रद्द|बदल/i,'Voyagiro does not take bookings. Changes and refunds belong to the company you paid.','Voyagiro बुकिंग नहीं लेता। बदलाव और रिफ़ंड उसी कंपनी से होते हैं जिसे आपने भुगतान किया।'],
[/book|pay|how.*work|बुक|भुगतान|कैसे/i,'This assistant cannot book or take payment. A partner site does that after you choose it.','यह सहायक बुकिंग या भुगतान नहीं कर सकता। पार्टनर साइट वह काम करती है।'],
[/baggage|luggage|bag|सामान|बैग/i,'Baggage depends on the airline and the fare. This assistant does not know the allowance.','सामान एयरलाइन और किराए पर निर्भर करता है। यह सहायक सीमा नहीं जानता।'],
[/visa|passport|entry|वीज़ा|वीजा|पासपोर्ट/i,'Check the destination government and your own government\'s travel advice. This assistant does not state entry rules.','गंतव्य सरकार और अपनी सरकार की यात्रा सलाह देखें। यह सहायक प्रवेश नियम नहीं बताता।'],
[/commission|affiliate|free|disclos|sponsor|कमीशन|मुफ़्त|मुफ्त/i,'Using Voyagiro is free. Only links with an active programme can earn a commission, and a click is not a booking.','Voyagiro मुफ़्त है। कमीशन सिर्फ़ सक्रिय प्रोग्राम वाले लिंक पर हो सकता है, और क्लिक बुकिंग नहीं है।'],
[/contact|email|help|support|human|संपर्क|ईमेल|मदद/i,'Email '+M+'. Do not send passport or card numbers. The homepage form is not a booking.','ईमेल '+M+'। पासपोर्ट या कार्ड नंबर न भेजें। होमपेज फ़ॉर्म बुकिंग नहीं है।'],
[/^(hi|hello|hey|namaste)|नमस्ते|हेलो/i,'Hello. I can explain how search works. I cannot book, pay, or see live prices.','नमस्ते। मैं खोज समझा सकता हूँ। मैं बुकिंग, भुगतान या लाइव कीमत नहीं देख सकता।']];
const def=hi?'नमस्ते। मैं यात्रा सहायता हूँ, बुकिंग एजेंट नहीं। उड़ान, होटल या वीज़ा पूछें। अधिक मदद: '+M:'Hello. I am trip help, not a booking agent. Ask about flights, hotels or visas. For anything else: '+M;
const answer=q=>{const f=FAQ.find(([re])=>re.test(q));return f?(hi?f[2]:f[1]):def};
const w=document.createElement('div');w.innerHTML=`<button id="vgc-b" type="button" aria-expanded="false" aria-controls="vgc"></button><div id="vgc" role="dialog" aria-modal="false" hidden><div id="vgc-h"></div><div id="vgc-m" aria-live="polite"></div><form id="vgc-f"><input id="vgc-i" maxlength="${MAX}" autocomplete="off"><button type="submit"></button></form></div>`;
document.body.append(w);
document.getElementById('vgc-b').textContent='?';
document.getElementById('vgc-b').setAttribute('aria-label',hi?'यात्रा सहायता':'Trip help');
document.getElementById('vgc-h').textContent=hi?'यात्रा सहायता':'Trip help';
document.getElementById('vgc-i').setAttribute('aria-label',hi?'प्रश्न':'Question');
document.getElementById('vgc-i').placeholder=hi?'उड़ान या होटल पूछें…':'Ask about flights or hotels…';
document.querySelector('#vgc-f button').textContent=hi?'भेजें':'Send';
document.querySelector('#vgc-f button').setAttribute('aria-label',hi?'भेजें':'Send');
const st=document.createElement('style');st.textContent=`#vgc-b{position:fixed;left:22px;bottom:22px;width:48px;height:48px;border-radius:50%;border:0;font-size:22px;cursor:pointer;background:#0b1026;color:#fff;z-index:15}#vgc{position:fixed;left:22px;bottom:80px;width:min(360px,92vw);height:min(460px,70vh);background:#fff;border-radius:20px;box-shadow:0 30px 80px rgba(0,0,0,.25);display:flex;flex-direction:column;overflow:hidden;z-index:25}#vgc[hidden]{display:none}#vgc-h{padding:14px 18px;color:#fff;font-weight:700;background:#0b1026}#vgc-m{flex:1;overflow:auto;padding:14px;display:flex;flex-direction:column;gap:8px}#vgc-m p{margin:0;padding:10px 14px;border-radius:14px;max-width:85%;background:#f2eefc}#vgc-m p.u{align-self:flex-end;background:#0b1026;color:#fff}#vgc-f{display:flex;border-top:1px solid #eee}#vgc-f input{border:0;border-radius:0;font-size:16px}#vgc-f button{border:0;background:none;font-size:16px;padding:0 14px;cursor:pointer;min-height:44px}@media(max-width:640px){#vgc-b{left:12px;bottom:12px}#vgc{left:12px;bottom:68px}}`;
document.head.append(st);
const m=document.getElementById('vgc-m'),say=(t,c)=>{const p=document.createElement('p');p.className=c||'';p.textContent=t;m.append(p);m.scrollTop=m.scrollHeight};
let turns=0,pending=false,lastFocus=null;
const panel=document.getElementById('vgc'),btn=document.getElementById('vgc-b');
function close(){panel.hidden=true;btn.setAttribute('aria-expanded','false');if(lastFocus)lastFocus.focus()}
btn.onclick=()=>{const open=panel.hidden;if(open){lastFocus=document.activeElement;panel.hidden=false;btn.setAttribute('aria-expanded','true');if(!m.children.length)say(def);document.getElementById('vgc-i').focus()}else close()};
panel.addEventListener('keydown',ev=>{if(ev.key==='Escape'){ev.preventDefault();close()}});
document.getElementById('vgc-f').onsubmit=async e=>{e.preventDefault();if(pending)return;const i=document.getElementById('vgc-i'),q=i.value.trim().slice(0,MAX);if(!q)return;
 if(turns>=TURNS){say(hi?'यह बातचीत अपनी सीमा पर है। नई मदद के लिए पेज फिर खोलें या '+M+' पर लिखें।':'This conversation has reached its limit. Reload the page or email '+M+'.');return}
 i.value='';turns++;say(q,'u');
 if(!C.CHAT_API){say(answer(q));window.VGOps&&window.VGOps.record('assistant',{status:'faq'});return}
 pending=true;const ac=new AbortController();const timer=setTimeout(()=>ac.abort(),20000);
 try{const r=await fetch(C.CHAT_API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:q,lang:hi?'hi':'en'}),signal:ac.signal});
  if(!r.ok)throw new Error('status');const data=await r.json();say(typeof data.reply==='string'&&data.reply?data.reply.slice(0,2000):answer(q));window.VGOps&&window.VGOps.record('assistant',{status:'api'})}
 catch(_){say(answer(q));window.VGOps&&window.VGOps.record('assistant',{status:'fallback'})}
 finally{clearTimeout(timer);pending=false}}})();
