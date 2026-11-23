/* Loaded only by generated preview entries, before any application scripts. */
(() => {
 'use strict';
 const params=new URLSearchParams(location.search);
 const route=params.get('screen')||location.hash.slice(1).split('?')[0];
 const fixture=(window.REEL_SCREEN_STATES[route]||[]).find(s=>s.id===params.get('state'));
 const memory=()=>{const values=new Map();return {getItem:key=>values.get(String(key))??null,setItem:(key,value)=>values.set(String(key),String(value)),removeItem:key=>values.delete(String(key)),clear:()=>values.clear(),key:index=>[...values.keys()][index]??null,get length(){return values.size;}};};
 // Fail closed: never run the app with real storage if isolation is unavailable.
 try{
  Object.defineProperty(window,'localStorage',{value:memory()});
  Object.defineProperty(window,'sessionStorage',{value:memory()});
 }catch{window.stop();throw new Error('Preview storage isolation unavailable');}
 localStorage.setItem('reeltrip-prototype-access-v1',JSON.stringify({profile:'guide',mode:fixture?.fixture?.mode||(route.startsWith('guide-')?'guide':'customer')}));
 if(!fixture?.fixture?.guest)sessionStorage.setItem('reeltrip-signup-preview-member','yes');
 window.ReelStatePreview=Object.freeze({state:fixture?.id||'default',fixture:fixture?.fixture||{}});
 let changed=false,lastAnnouncement='',pending=false;
 function liveSnapshot(){
  const screen=document.body.dataset.route||location.hash.slice(1).split('?')[0];
  const role=window.ReelAccess?.isAdmin?'admin':window.ReelAccess?.mode?.()||'customer';
  const controls=[];
  for(const el of document.querySelectorAll('#app a[href],#app button,#app select,#app summary,#app input[data-select]')){
   if(el.closest('.reviewtools,.developer-only'))continue;
   const action=el.getAttribute('data-action')||el.getAttribute('data-booking');
   const href=el.getAttribute('href'),form=el.closest('form');let source='';
   if(action){source='action:'+action;if(['guides-tab','place-picker-tab','notification-filter'].includes(action))source+=':'+el.getAttribute('data-id');}
   else if(el.hasAttribute('data-access-mode'))source='mode:'+el.getAttribute('data-access-mode');
   else if(href){if(href==='#main')continue;source=el.lang?'locale:'+el.lang:'link:'+href.replace(/lang=(ko|en)/,'lang={current}');}
   else if(el.tagName==='BUTTON'&&form&&(el.getAttribute('type')||'submit')==='submit')source='form:'+form.id;
   else if(el.tagName==='SUMMARY')source='disclosure:live';
   else if(el.tagName==='SELECT'||el.hasAttribute('data-select'))source='field:'+(el.hasAttribute('data-select')?'selected':el.hasAttribute('data-duration')?'duration':el.id||el.name||'');
   if(!source)continue;
   controls.push({source,label:(el.getAttribute('aria-label')||el.textContent||el.name||'').replace(/\s+/g,' ').trim().slice(0,300),href,disabled:!!el.disabled,common:!!el.closest('nav')});
  }
  const summary=[...document.querySelectorAll('#main h1,#main h2,#main .badge,#main [aria-pressed="true"]')].map(el=>el.textContent.replace(/\s+/g,' ').trim()).filter(Boolean).slice(0,4).join(' · ');
  return {route:screen,role,controls,summary};
 }
 const announce=()=>{
  pending=false;const main=document.querySelector('#main');const ready=!!main?.textContent.trim();
  const payload={type:'reeltrip-preview-status',url:location.href,changed,ready};
  if(ready&&changed)payload.live=liveSnapshot();
  const serialized=JSON.stringify(payload);if(serialized===lastAnnouncement)return;lastAnnouncement=serialized;
  window.parent?.postMessage(payload,location.origin==='null'?'*':location.origin);
 };
 const schedule=()=>{if(!pending){pending=true;setTimeout(announce,0);}};
 window.addEventListener('load',()=>{announce();if(typeof MutationObserver!=='undefined'){const app=document.querySelector('#app');if(app)new MutationObserver(schedule).observe(app,{childList:true,subtree:true,attributes:true,characterData:true});}});
 window.addEventListener('hashchange',()=>{changed=true;schedule();});
 for(const name of ['click','input','change','submit'])document.addEventListener(name,()=>{changed=true;schedule();});
 // Language switches stay inside the isolated preview entry.
 document.addEventListener('click',event=>{
  const link=event.target.closest('a[href]');if(!link)return;
  const url=new URL(link.href,location.href);
  if(url.origin===location.origin&&url.pathname.slice(0,url.pathname.lastIndexOf('/'))===location.pathname.slice(0,location.pathname.lastIndexOf('/'))&&/\/(index|english)\.html$/.test(url.pathname)){
   event.preventDefault();const en=url.searchParams.get('lang')==='en'||(!url.searchParams.has('lang')&&url.pathname.endsWith('/english.html'));url.searchParams.set('lang',en?'en':'ko');url.pathname=location.pathname.replace(/(?:-en)?\.html$/,(en?'-en':'')+'.html');url.searchParams.set('state',fixture?.id||'default');url.searchParams.set('screen',route);location.href=url.href;
  }
 },true);
})();
