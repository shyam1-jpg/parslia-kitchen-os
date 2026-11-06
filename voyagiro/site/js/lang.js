/* Voyagiro language detection: runs once on first visit; a manual choice (localStorage vg_lang) is never overridden. */
(function(){try{
 var K='vg_lang',D='vg_lang_detected',ls=window.localStorage,cur=window.VG_LANG,av=window.VG_LANGS||[];
 function alt(c){var l=document.querySelector('link[rel=alternate][hreflang="'+c+'"]');return l&&l.href}
 document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a.lang-opt');if(a){ls.setItem(K,a.dataset.lang);ls.setItem(D,'1')}},true);
 if(ls.getItem(K)||ls.getItem(D))return;
 ls.setItem(D,'1');
 var pref=(navigator.languages&&navigator.languages.length?navigator.languages:[navigator.language||'']),m=null;
 for(var i=0;i<pref.length&&!m;i++){var b=String(pref[i]).toLowerCase().split('-')[0];if(av.indexOf(b)>=0)m=b}
 if(m&&m!==cur){var u=alt(m);if(u){var x=new URL(u);location.replace(x.pathname+location.search+location.hash)}}
}catch(e){}})();
