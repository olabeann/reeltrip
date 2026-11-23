(() => {
 'use strict';
 const screens=window.REEL_REVIEW_SCREENS,registry=window.REEL_SCREEN_STATES;
 const nodes=[...document.querySelectorAll('.ia-node')],roles=[...document.querySelectorAll('.ia-role')],filters=[...document.querySelectorAll('[data-role-filter]')];
 const $=s=>document.querySelector(s),search=$('#ia-search');let activeRole='all',selected='home',selectedState='',previewRun=0,expectedPreview='';
 const frame=$('#ia-preview'),language=$('#ia-language');
 let liveSnapshot=null;
 const stateRole=(route,id)=>id==='__live'&&liveSnapshot?liveSnapshot.role:registry[route].find(v=>v.id===id)?.fixture?.mode||screens.find(s=>s.route===route).role;
 const entryKey=(route,id)=>route+':'+stateRole(route,id);
 function matches(node){const screen=screens.find(s=>s.route===node.dataset.route),query=search.value.trim().toLowerCase();return !query||[screen.id,screen.name,screen.route,node.textContent].join(' ').toLowerCase().includes(query);}
 function filter(){
  let count=0;
  roles.forEach(el=>{el.hidden=activeRole!=='all'&&el.dataset.role!==activeRole;});
  filters.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.roleFilter===activeRole)));
  nodes.forEach(node=>{const match=matches(node);node.classList.toggle('is-dimmed',!match);if(match&&(activeRole==='all'||node.dataset.role===activeRole))count++;});
  $('#search-status').textContent=search.value.trim()?`${count}개 일치 · 나머지는 흐리게 표시`:`${activeRole==='all'?'전체':'선택 범위'} ${count}개 화면`;
 }
 function showTransitions(screen,variant){
  let allRows=window.REEL_SCREEN_TRANSITIONS[screen.route];
  if(variant.id==='__live'&&liveSnapshot){
   const grouped=new Map();
   for(const control of liveSnapshot.controls){
    const key=control.source+'|'+control.common;
    if(grouped.has(key)){const row=grouped.get(key);row.labels[language.value].__live.push(control.label);continue;}
    const known=allRows.find(r=>r.source===control.source&&!!r.common===control.common);
    const hrefTarget=control.href?.startsWith('#')?control.href.slice(1).split('?')[0]:null;
    const target=control.source.startsWith('link:')||control.source==='action:notification-open'?hrefTarget:known?.target;
    const targetScreen=screens.find(s=>s.route===target);
    const state=targetScreen?(registry[target].find(v=>v.id===known?.state&&stateRole(target,v.id)===liveSnapshot.role)||registry[target].find(v=>stateRole(target,v.id)===liveSnapshot.role)||registry[target][0]).id:null;
    const row={...known,source:control.source,trigger:control.label,common:control.common,target:targetScreen?target:null,state,
     kind:known?.kind||(targetScreen?'이동':'화면 내 동작'),effect:known?.effect||(targetScreen?'현재 앱 데이터를 유지하고 해당 화면으로 이동':'현재 앱에서 실행되는 동작'),
     condition:control.disabled?'현재 앱에서 비활성':'현재 앱 화면에 표시된 버튼·입력',sourceStates:['__live'],disabledStates:control.disabled?['__live']:[],
     labels:{[language.value]:{__live:[control.label]}},previewStates:{__live:state},destinations:{[language.value]:{__live:control.href||''}}};
    grouped.set(key,row);
   }
   allRows=[...grouped.values()];
  }
  const rows=allRows.filter(r=>!r.common&&r.sourceStates.includes(variant.id));
  $('#ia-flow-title').textContent=`${screen.id} · ${screen.name}`;
  $('#ia-flow-count').textContent=`${rows.length}개 동작 · 화면 전체 ${allRows.length}개`;
  $('#ia-flow-context').textContent=`현재 미리보기: ${variant.label} · 이 상태에서 노출되는 동작만 표시합니다.`;
  const body=$('#ia-flow-rows');body.replaceChildren();
  for(const rule of rows){
   const row=document.createElement('tr'),trigger=document.createElement('td'),destination=document.createElement('td'),effect=document.createElement('td');
   const badge=document.createElement('span');badge.className='flow-kind';badge.textContent=rule.kind;
   if(rule.kind==='구현 제한')row.className='flow-limitation';
   const label=document.createElement('strong');const labels=rule.labels?.[language.value]?.[variant.id]||[rule.trigger];label.textContent=labels.join(' / ');label.title=labels.join(' / ');
   const condition=document.createElement('small');condition.textContent=(rule.reviewedSource?'후속 모달 · 한국어 명세 · ':'')+(rule.disabledStates?.includes(variant.id)?'일부 또는 전체 버튼 비활성 · ':'')+rule.condition;
   trigger.append(badge,label,condition);
   if(rule.target){
    const target=screens.find(s=>s.route===rule.target),state=registry[rule.target].find(v=>v.id===(rule.previewStates?.[variant.id]||rule.state));
    const button=document.createElement('button');button.type='button';button.className='flow-target';
    button.textContent=`${target.id} ${target.name} →`;
    button.setAttribute('aria-label',`${rule.trigger} · ${target.name} · ${state.label} 예시 보기`);
    button.onclick=()=>select(rule.target,{state:state.id});
    const hint=document.createElement('small');hint.textContent=`예시: ${state.label}`;
    destination.append(button,hint);
   }else destination.textContent=rule.kind==='외부'?'외부 페이지·브라우저':rule.kind==='구현 제한'?'연결 보완 필요':'현재 화면 / 모달';
   const address=rule.destinations?.[language.value]?.[variant.id]||rule.destination;
   if(address){const code=document.createElement('code');code.className='flow-address';code.textContent=address;destination.append(code);}
   effect.textContent=rule.effect;row.append(trigger,destination,effect);body.append(row);
  }
  const connections=$('#ia-connections');
  if(connections){
   connections.replaceChildren();
   const sourceRoutes=new Set();
   const heading=document.createElement('strong');heading.textContent='들어오는 경로 · 선택한 역할 기준, 출발 상태에 따라 노출';connections.append(heading);
   const role=stateRole(screen.route,variant.id);
   for(const source of screens){
    const groups=new Map();
    for(const rule of window.REEL_SCREEN_TRANSITIONS[source.route]){
     if(rule.target!==screen.route||source.route===screen.route||rule.common||rule.trigger==='이전 화면으로'||rule.trigger==='운영 홈')continue;
     for(const state of rule.sourceStates){
      if(stateRole(rule.target,rule.previewStates?.[state]||rule.state)!==role)continue;
      const key=entryKey(source.route,state);
      if(!groups.has(key))groups.set(key,[]);groups.get(key).push({rule,state});
     }
    }
    for(const [key,entries] of groups){
     sourceRoutes.add(key);
     const sourceRole=stateRole(source.route,entries[0].state);
     const button=document.createElement('button');button.type='button';
     button.textContent=source.name+(sourceRole!==source.role?' · 메이트':'')+' →';
     button.title=[...new Set(entries.map(({rule})=>rule.trigger+' · '+rule.condition))].join('\n');
     button.onclick=()=>select(source.route,{state:entries[0].state});connections.append(button);
    }
   }
   if(!sourceRoutes.size){const text=document.createElement('span');text.textContent='직접 진입 또는 공통 메뉴';connections.append(text);}
   const next=document.createElement('strong');next.textContent='나가는 경로 · 현재 선택 상태';connections.append(next);
   const targets=new Set();
   for(const rule of rows){
    if(!rule.target||rule.target===screen.route||targets.has(rule.target+':'+(rule.previewStates?.[variant.id]||rule.state)))continue;targets.add(rule.target+':'+(rule.previewStates?.[variant.id]||rule.state));
    const button=document.createElement('button');button.type='button';button.textContent='→ '+screens.find(s=>s.route===rule.target).name;
    button.title=rule.trigger+' · '+registry[rule.target].find(v=>v.id===(rule.previewStates?.[variant.id]||rule.state)).label;button.onclick=()=>select(rule.target,{state:rule.previewStates?.[variant.id]||rule.state});connections.append(button);
   }
   if(!targets.size){const text=document.createElement('span');text.textContent='현재 화면 내 동작만 있음';connections.append(text);}
   nodes.forEach(n=>n.classList.toggle('is-source',sourceRoutes.has(n.dataset.route+':'+n.dataset.role)));
  }
  const destinations=new Set(rows.filter(r=>r.target).map(r=>entryKey(r.target,r.previewStates?.[variant.id]||r.state)));
  nodes.forEach(n=>{n.classList.toggle('is-destination',n.dataset.route!==screen.route&&destinations.has(n.dataset.route+':'+n.dataset.role));n.setAttribute('title',`${window.REEL_SCREEN_TRANSITIONS[n.dataset.route].length}개 전환 규칙 · 선택해서 확인`);});
  const common=$('#ia-flow-common');common.replaceChildren();
  for(const rule of allRows.filter(r=>r.common&&r.sourceStates.includes(variant.id))){
   const button=document.createElement('button');button.type='button';button.textContent=(rule.labels[language.value]?.[variant.id]||[rule.trigger]).join(' / ');
   button.onclick=()=>select(rule.target,{state:rule.previewStates?.[variant.id]||rule.state});common.append(button);
  }
  const note=document.createElement('p');note.textContent='공통 메뉴는 저장 데이터를 유지하며 이동합니다. 비회원의 회원 전용 작업은 가입 안내로 연결됩니다. 구조도 버튼은 독립된 예시를 엽니다.';common.append(note);
 }
 function select(route,{history=true,locate=false,state=null,lang=language.value||'ko',live=null}={}){
  const entry=nodes.find(n=>n.getAttribute('href')==='#ia-'+route);
  const screen=screens.find(s=>s.route===(entry?.dataset.route||route))||screens.find(s=>s.route==='home');selected=screen.route;
  liveSnapshot=live;
  const requested=registry[selected].find(v=>v.id===state);
  const role=live?live.role:requested?(requested.fixture?.mode||screen.role):(entry?.dataset.role||screen.role);
  const variants=registry[selected].filter(v=>(v.fixture?.mode||screen.role)===role);
  const variant=live?{id:'__live',label:'실시간 · 현재 앱 상태',condition:live.summary||'앱에서 이동·조작한 상태',fixture:{mode:role}}:variants.find(v=>v.id===state)||variants[0];selectedState=variant.id;
  const node=nodes.find(n=>n.dataset.route===selected&&n.dataset.role===role);
  if(activeRole!=='all'&&activeRole!==role)activeRole='all';
  if(!matches(node))search.value='';filter();
  nodes.forEach(n=>n.setAttribute('aria-current',String(n===node)));
  $('#inspector-id').textContent=`${screen.id} · ${{customer:'고객',guide:'메이트',admin:'운영'}[role]}`;
  $('#inspector-title').textContent=screen.name;$('#inspector-route').textContent=screen.route;
  language.value=lang==='en'?'en':'ko';
  $('#open-spec').href=`../../docs/specification.html#spec-${screen.id}`;
  $('#inspector-locate').href=node.getAttribute('href');$('#inspector-count').textContent=variants.length;
  showTransitions(screen,variant);
  if($('#ia-journeys')){
   let liveMarked=false;
   document.querySelectorAll('#ia-journeys a').forEach(a=>{
    const sameRoute=a.getAttribute('href')==='#ia-'+screen.route;
    const current=sameRoute&&(live?!liveMarked:a.dataset.state===variant.id);
    if(current&&live)liveMarked=true;
    a.setAttribute('aria-current',String(current));
    const caption=a.querySelector?.('small');
    if(caption){if(!a.dataset.exampleLabel)a.dataset.exampleLabel=caption.textContent;caption.textContent=current&&live?'실시간 · 현재 앱 상태':a.dataset.exampleLabel;}
   });
  }
  const list=$('#inspector-states');list.replaceChildren();
  if(live){const badge=document.createElement('button');badge.type='button';badge.disabled=true;badge.textContent=variant.label;badge.setAttribute('aria-pressed','true');list.append(badge);}
  $('#ia-reset').textContent=live?'기본 예시로 되돌리기':'선택 상태로 되돌리기';
  for(const item of variants){const button=document.createElement('button');button.type='button';button.textContent=item.label;button.title=item.condition;button.setAttribute('aria-pressed',String(item===variant));button.onclick=()=>select(selected,{state:item.id});list.append(button);}
  $('#ia-condition').textContent=variant.condition;
  $('#copy-status').textContent='';
  const hash=node.getAttribute('href')+'?'+new URLSearchParams({state:live?'':selectedState,lang:language.value});
  if(location.hash!==hash&&(history||location.hash))window.history[history&&!live?'pushState':'replaceState'](null,'',hash);
  if(live){$('#ia-preview-status').textContent='앱 이동·조작에 맞춰 동기화 중 · 예시 상태를 누르면 해당 예시로 초기화됩니다.';return;}
  const url=new URL(`preview${screen.role==='admin'?'-admin':''}${language.value==='en'?'-en':''}.html`,location.href);
  url.search=new URLSearchParams({lang:language.value,screen:selected,state:selectedState,previewRun:String(++previewRun)}).toString();url.hash=variant.fixture?.hash||selected;
  expectedPreview=url.href;frame.style.visibility='hidden';frame.classList.toggle('is-admin',screen.role==='admin');frame.src=expectedPreview;
  $('#ia-preview-status').textContent='선택한 상태를 불러오는 중…';
  if(new URL(location.href).protocol==='file:'){
   const status=$('#ia-preview-status'),link=document.createElement('a');
   status.textContent='파일로 직접 열면 브라우저 제한으로 앱 미리보기가 표시되지 않을 수 있어요. 로컬 서버를 실행한 뒤 열어 주세요: ';
   link.href='http://localhost:8765/src/frontend/index.html'+hash;link.textContent='로컬 서버에서 미리보기 열기 ↗';status.append(link);
  }
  if(locate)node.scrollIntoView({behavior:'smooth',block:'center'});
 }
 document.addEventListener('click',event=>{
  const anchor=event.target.closest('a[href^="#ia-"]');if(!anchor)return;
  event.preventDefault();if(anchor.id==='inspector-locate'){if(overviewButton)overviewButton.onclick();activeRole='all';search.value='';filter();nodes.find(n=>n.getAttribute('aria-current')==='true').scrollIntoView({behavior:'smooth',block:'center'});return;}
  select(anchor.getAttribute('href').slice(4),{state:anchor.dataset.state||null});
  const detail=$('#ia-details');if(detail){detail.open=true;if(!matchMedia('(max-width:800px)').matches)detail.scrollIntoView({behavior:'smooth',block:'nearest'});}
  if(anchor.id!=='inspector-locate'&&matchMedia('(max-width:800px)').matches)$('.ia-inspector').scrollIntoView({behavior:'smooth',block:'start'});
 });
 const overviewButton=$('#ia-overview-button'),journeyButton=$('#ia-journey-button');
 if(overviewButton&&journeyButton){
  const setView=flow=>{
   $('#ia-overview').hidden=flow;$('#ia-journeys').hidden=!flow;
   overviewButton.setAttribute('aria-pressed',String(!flow));journeyButton.setAttribute('aria-pressed',String(flow));
   $('#ia-details').open=false;
  };
  overviewButton.onclick=()=>setView(false);journeyButton.onclick=()=>setView(true);
 }
 filters.forEach(button=>button.onclick=()=>{if(overviewButton)overviewButton.onclick();activeRole=button.dataset.roleFilter;filter();});
 search.addEventListener('input',filter);$('#clear-search').onclick=()=>{search.value='';activeRole='all';filter();};
 $('#copy-node').onclick=async()=>{try{await navigator.clipboard.writeText(location.href);$('#copy-status').textContent='구조도 링크를 복사했어요.';}catch{$('#copy-status').textContent='주소 표시줄의 URL을 복사해 주세요.';}};
 const selectedEntry=()=>nodes.find(n=>n.getAttribute('aria-current')==='true')?.getAttribute('href').slice(4)||selected;
 language.onchange=()=>select(selectedEntry(),{state:selectedState});
 $('#ia-reset').onclick=()=>select(selectedEntry(),{state:selectedState,history:false});
 window.addEventListener('message',event=>{
  if(event.source!==frame.contentWindow||event.origin!==location.origin||event.data?.type!=='reeltrip-preview-status')return;
  let current;try{current=new URL(event.data.url);}catch{return;}
  const expected=new URL(expectedPreview);
  const currentQuery=new URLSearchParams(current.search),expectedQuery=new URLSearchParams(expected.search);currentQuery.delete('lang');expectedQuery.delete('lang');
  if(current.origin!==expected.origin||current.pathname.replace(/-en(?=\.html$)/,'')!==expected.pathname.replace(/-en(?=\.html$)/,'')||currentQuery.toString()!==expectedQuery.toString())return;
  if(event.data.ready!==true){frame.style.visibility='hidden';document.querySelector('#ia-preview-status').textContent='화면을 불러오지 못했어요. 선택 상태로 되돌리기를 눌러 다시 불러와 주세요.';return;}
  frame.style.visibility='visible';
  const live=event.data.live;
  if(live&&Array.isArray(live.controls)&&['customer','guide','admin'].includes(live.role)&&nodes.some(n=>n.dataset.route===live.route&&n.dataset.role===live.role)&&current.hash.slice(1).split('?')[0]===live.route){
   select(live.route,{history:false,live,lang:current.searchParams.get('lang')||language.value});return;
  }
  $('#ia-preview-status').textContent=current.hash!==expected.hash?'다른 화면으로 이동했습니다. 선택 상태로 되돌릴 수 있어요.':event.data.changed?'미리보기에서 조작한 상태입니다. 되돌리면 처음 상태를 다시 확인해요.':'선택한 상태 표시 중 · 기존 체험 데이터와 분리된 미리보기';
 });
 // Only the review shell scales; the embedded app always lays out at 390 × 700.
 if(typeof ResizeObserver!=='undefined'){
  const inspector=$('.ia-inspector'),layout=$('.ia-layout'),viewport=$('.device-viewport'),stage=$('.device-stage');
  let scheduled=false;
  const fit=()=>{
   scheduled=false;
   const top=window.innerWidth>800?Math.max(12,layout.getBoundingClientRect().top):8;
   const available=window.innerWidth>800?Math.min(window.innerHeight-top-12,layout.getBoundingClientRect().bottom-top):window.innerHeight-16;
   inspector.style.setProperty('--inspector-height',Math.max(240,available)+'px');
   const scale=Math.max(0.01,Math.min(1,viewport.clientWidth/390,viewport.clientHeight/700));
   stage.style.width=(390*scale)+'px';stage.style.height=(700*scale)+'px';
   frame.style.transform='scale('+scale+')';
   $('#device-scale').textContent='390 × 700 · '+Math.round(scale*100)+'%';
  };
  const expand=$('#preview-expand');
  const backgrounds=[...document.querySelectorAll('.ia-header,.ia-toolbar,.ia-map,main>footer')];
  const toggle=()=>{
   const open=inspector.classList.toggle('is-expanded');
   document.body.classList.toggle('preview-expanded',open);
   expand.textContent=open?'닫기 ✕':'전체화면 ↗';expand.setAttribute('aria-expanded',String(open));
   if(open){inspector.setAttribute('role','dialog');inspector.setAttribute('aria-modal','true');}
   else{inspector.removeAttribute('role');inspector.removeAttribute('aria-modal');}
   backgrounds.forEach(el=>el.inert=open);schedule();expand.focus();
  };
  expand.onclick=toggle;
  const onKey=event=>{
   if(!inspector.classList.contains('is-expanded'))return;
   if(event.key==='Escape'){event.preventDefault();toggle();}
   if(event.key==='Tab'){
    const nodes=[...inspector.querySelectorAll('button,select,a[href],iframe')].filter(el=>el.getClientRects().length);
    const first=nodes[0],last=nodes[nodes.length-1];
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
   }
  };
  document.addEventListener('keydown',onKey);
  frame.addEventListener('load',()=>{try{frame.contentDocument.addEventListener('keydown',event=>{if(event.key==='Escape')onKey(event);});}catch{}});
  const schedule=()=>{if(!scheduled){scheduled=true;requestAnimationFrame(fit);}};
  new ResizeObserver(schedule).observe(viewport);
  window.addEventListener('resize',schedule);window.addEventListener('scroll',schedule,{passive:true});schedule();
 }
 const restore=()=>{const [route,query='']=location.hash.startsWith('#ia-')?location.hash.slice(4).split('?'):['home',''];const p=new URLSearchParams(query);select(route,{state:p.get('state'),lang:p.get('lang')||'ko',history:false});};
 window.addEventListener('popstate',restore);window.addEventListener('hashchange',restore);restore();
})();
