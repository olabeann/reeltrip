const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'../..'),screens=JSON.parse(fs.readFileSync(path.join(root,'docs/screen-spec.json'))),registry=JSON.parse(fs.readFileSync(path.join(root,'resources/review/screen-states.json')));
const transitions=JSON.parse(fs.readFileSync(path.join(root,'resources/review/screen-transitions.json')));
const node=()=>({value:'',textContent:'',children:[],attrs:{},style:{},dataset:{},classList:{values:new Set(),toggle(k,on){if(on)this.values.add(k);else this.values.delete(k);},contains(k){return this.values.has(k);}},setAttribute(k,v){this.attrs[k]=v;},getAttribute(k){return this.attrs[k];},append(...items){this.children.push(...items);},replaceChildren(){this.children=[];},scrollIntoView(){},addEventListener(){}});
const structure=JSON.parse(fs.readFileSync(path.join(root,'resources/review/ia-structure.json')));
const nodes=structure.flatMap(section=>section.groups.flatMap(group=>group.routes.map(route=>{
 const s=screens.find(s=>s.route===route),role=section.role,key=s.role===role?route:role+'-'+route;
 return {...node(),dataset:{route,role},textContent:s.id+' '+s.name,attrs:{href:'#ia-'+key}};
})));
const journeyHtml=fs.readFileSync(path.join(root,'src/frontend/index.html'),'utf8');
const journeys=[...journeyHtml.matchAll(/<a href="#ia-([^" ]+)" data-state="([^" ]+)">/g)].map(([,route,state])=>({...node(),dataset:{state},attrs:{href:'#ia-'+route}}));
assert.equal(journeys.length,12,'MVP journeys expose matching, confirmation and cancellation states');
function openState(route,state){
 url=new URL('#ia-'+route+'?state='+state+'&lang='+ (els['#ia-language'].value||'ko'),url);events.popstate();
}
const roles=['customer','guide','admin'].map(role=>({...node(),dataset:{role}})),filters=['all','customer','guide','admin'].map(roleFilter=>({...node(),dataset:{roleFilter}}));
const els=Object.fromEntries(['ia-overview-button','ia-journey-button','ia-overview','ia-journeys','ia-details','ia-connections','ia-flow-title','ia-flow-count','ia-flow-context','ia-flow-rows','ia-flow-common','ia-search','ia-preview','ia-language','ia-preview-status','ia-reset','inspector-id','inspector-title','inspector-route','inspector-rule','inspector-action','open-spec','inspector-locate','inspector-count','inspector-states','ia-condition','ia-state-note','copy-status','copy-node','search-status','clear-search'].map(id=>['#'+id,node()]));els['.ia-inspector']=node();els['#ia-preview'].contentWindow={};
let url=new URL('http://localhost/src/frontend/index.html#ia-requested'),events={},click;
const location={get href(){return url.href;},get hash(){return url.hash;},get origin(){return url.origin;}};
const ctx={URL,URLSearchParams,location,matchMedia:()=>({matches:false}),navigator:{clipboard:{writeText:async()=>{}}},document:{querySelector:s=>els[s],querySelectorAll:s=>s==='.ia-node'?nodes:s==='.ia-role'?roles:s==='#ia-journeys a'?journeys:filters,createElement:node,addEventListener:(name,fn)=>{if(name==='click')click=fn;}},window:{REEL_SCREEN_TRANSITIONS:transitions,REEL_REVIEW_SCREENS:screens,REEL_SCREEN_STATES:registry,history:{pushState(a,b,h){url=new URL(h,url);},replaceState(a,b,h){url=new URL(h,url);}},addEventListener:(name,fn)=>events[name]=fn}};
vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(root,'src/frontend/ia.js'),'utf8'),ctx);
let cases=0;
for(const lang of ['ko','en'])for(const s of screens){
 click({target:{closest:()=>nodes.find(n=>n.dataset.route===s.route)},preventDefault(){}});
 els['#ia-language'].value=lang;els['#ia-language'].onchange();
 for(const v of registry[s.route]){
  openState(s.route,v.id);
  const expectedRole=v.fixture.mode||s.role;
  assert.equal(els['#inspector-states'].children.length,registry[s.route].filter(v=>(v.fixture.mode||s.role)===expectedRole).length);
  assert.equal(nodes.find(n=>n.attrs['aria-current']==='true').dataset.role,expectedRole);
  els['#inspector-states'].children.find(n=>n.textContent===v.label).onclick();
  const frame=els['#ia-preview'],preview=new URL(frame.src);
  assert.equal(preview.searchParams.get('screen'),s.route);assert.equal(preview.searchParams.get('state'),v.id);assert.equal(preview.searchParams.get('lang'),lang);assert.equal(preview.hash,'#'+(v.fixture.hash||s.route));assert.equal(preview.pathname.includes('-admin'),s.role==='admin');
  assert.equal(els['#ia-condition'].textContent,v.condition);assert.equal(els['#inspector-states'].children.filter(n=>n.attrs['aria-pressed']==='true').length,1);
  assert(!els['#inspector-states'].children.some(n=>n.target||n.href),'State choices must not open another tab');
  const previous=frame.src;els['#ia-reset'].onclick();assert.notEqual(frame.src,previous);
  events.popstate();assert.equal(new URL(frame.src).searchParams.get('state'),v.id);
  const actual=new URL(frame.src);events.message({source:frame.contentWindow,origin:url.origin,data:{type:'reeltrip-preview-status',ready:true,url:actual.href,changed:false}});assert.equal(frame.style.visibility,'visible');
  actual.hash=actual.hash==='#account'?'#home':'#account';events.message({source:frame.contentWindow,origin:url.origin,data:{type:'reeltrip-preview-status',ready:true,url:actual.href,changed:true}});assert(els['#ia-preview-status'].textContent.includes('다른 화면'));
  cases++;
 }
}
console.log(`PASS: ${cases} inline IA choices, locale, reset, history, role surface and navigation status; no state popup links.`);

let jumps=0;
for(const screen of screens){
 for(const rule of transitions[screen.route]){
  const state=rule.sourceStates[0];
  click({target:{closest:()=>nodes.find(n=>n.dataset.route===screen.route)},preventDefault(){}});
  openState(screen.route,state);
  const visible=transitions[screen.route].filter(r=>!r.common&&r.sourceStates.includes(state));
  assert.equal(els['#ia-flow-rows'].children.length,visible.length);
  let button;
  if(rule.common){const common=transitions[screen.route].filter(r=>r.common&&r.sourceStates.includes(state));button=els['#ia-flow-common'].children[common.indexOf(rule)];}
  else{
   const row=els['#ia-flow-rows'].children[visible.indexOf(rule)];assert.equal(row.children[2].textContent,rule.effect);
   assert.equal(row.children[0].children[1].textContent,(rule.labels.en[state]||[rule.trigger]).join(' / '));
   if(rule.target)button=row.children[1].children[0];
  }
  if(!rule.target)continue;
  button.onclick();const target=new URL(els['#ia-preview'].src);
  assert.equal(target.searchParams.get('screen'),rule.target);assert.equal(target.searchParams.get('state'),rule.previewStates?.[state]||rule.state);
  assert.equal(target.searchParams.get('lang'),'en');jumps++;
 }
}
console.log(`PASS: all ${screens.length} state-filtered transition panels, exact English labels, ${jumps} destination-state jumps and locale preservation.`);

// The compact overview keeps details closed until selection and switches views independently.
els['#ia-journey-button'].onclick();
assert.equal(els['#ia-overview'].hidden,true);assert.equal(els['#ia-journeys'].hidden,false);
assert.equal(els['#ia-details'].open,false);
click({target:{closest:()=>nodes.find(n=>n.dataset.route==='settings')},preventDefault(){}});
assert.equal(els['#ia-details'].open,true);
const incomingMy=els['#ia-connections'].children.find(n=>n.textContent==='마이 →');
assert(incomingMy,'Settings must expose My as its actual entry');
incomingMy.onclick();assert.equal(new URL(els['#ia-preview'].src).searchParams.get('screen'),'account');
els['#ia-overview-button'].onclick();assert.equal(els['#ia-overview'].hidden,false);assert.equal(els['#ia-journeys'].hidden,true);
console.log('PASS: compact overview, separate journey view, selected details and incoming navigation.');

// Every role entry must agree with the inspector, fixture, details and selected node.
for(const entry of nodes){
 click({target:{closest:()=>entry},preventDefault(){}});
 const current=new URL(els['#ia-preview'].src),route=entry.dataset.route,id=current.searchParams.get('state');
 const variant=registry[route].find(v=>v.id===id);
 assert.equal(variant.fixture.mode||screens.find(s=>s.route===route).role,entry.dataset.role);
 assert.equal(nodes.filter(n=>n.attrs['aria-current']==='true').length,1);
 assert.equal(entry.attrs['aria-current'],'true');
 assert.equal(els['#ia-flow-title'].textContent, screens.find(s=>s.route===route).id+' · '+screens.find(s=>s.route===route).name);
 assert(els['#ia-flow-context'].textContent.includes(variant.label));
}
for(const link of journeys){
 els['#ia-journey-button'].onclick();
 click({target:{closest:()=>link},preventDefault(){}});
 const route=link.attrs.href.slice(4),state=link.dataset.state,current=new URL(els['#ia-preview'].src);
 assert.equal(current.searchParams.get('screen'),route);assert.equal(current.searchParams.get('state'),state);
 assert.equal(link.attrs['aria-current'],'true');
 assert.equal(els['#inspector-states'].children.find(n=>n.attrs['aria-pressed']==='true').textContent,registry[route].find(v=>v.id===state).label);
 els['#ia-overview-button'].onclick();assert.equal(els['#ia-preview'].src,current.href);
 els['#ia-journey-button'].onclick();assert.equal(els['#ia-preview'].src,current.href);
}
// Shared My links to the corresponding chat entry, not both role copies.
openState('booking','confirmed');
assert.equal(nodes.find(n=>n.dataset.route==='chat'&&n.dataset.role==='customer').classList.contains('is-destination'),true);
assert.equal(nodes.find(n=>n.dataset.route==='chat'&&n.dataset.role==='guide').classList.contains('is-destination'),false);
openState('messages','mate-active');
assert.equal(nodes.find(n=>n.dataset.route==='chat'&&n.dataset.role==='guide').classList.contains('is-destination'),true);
assert.equal(nodes.find(n=>n.dataset.route==='chat'&&n.dataset.role==='customer').classList.contains('is-destination'),false);
openState('chat','mate-active');
assert.equal(nodes.find(n=>n.dataset.route==='booking').classList.contains('is-source'),false);
assert.equal(nodes.find(n=>n.dataset.route==='messages'&&n.dataset.role==='guide').classList.contains('is-source'),true);
assert.equal(nodes.find(n=>n.dataset.route==='messages'&&n.dataset.role==='customer').classList.contains('is-source'),false);
console.log(`PASS: ${nodes.length} role entries, ${journeys.length} journey selections and role-specific highlights.`);

// Live navigation updates the review shell without resetting the isolated application.
openState('quote','proposals');
const liveSrc=els['#ia-preview'].src,liveUrl=new URL(liveSrc);liveUrl.hash='checkout';
events.message({source:els['#ia-preview'].contentWindow,origin:url.origin,data:{type:'reeltrip-preview-status',url:liveUrl.href,ready:true,changed:true,live:{route:'checkout',role:'customer',summary:'예약 정보 입력',controls:[{source:'form:checkout-form',label:'메이트 선택하고 예약 요청',common:false,disabled:false}]}}});
assert.equal(els['#ia-preview'].src,liveSrc,'Live navigation must not reload the iframe');
assert.equal(els['#inspector-route'].textContent,'checkout');assert.equal(els['#ia-condition'].textContent,'예약 정보 입력');
assert.equal(els['#inspector-states'].children.filter(n=>n.attrs['aria-pressed']==='true')[0].textContent,'실시간 · 현재 앱 상태');
assert.equal(nodes.find(n=>n.dataset.route==='checkout').attrs['aria-current'],'true');
assert.equal(els['#ia-flow-rows'].children.length,1,'Only currently rendered controls are listed');
assert.equal(els['#ia-flow-rows'].children[0].children[0].children[1].textContent,'메이트 선택하고 예약 요청');
const priorRoute=els['#inspector-route'].textContent;
const stale=new URL(liveUrl);stale.searchParams.set('previewRun','stale');
events.message({source:els['#ia-preview'].contentWindow,origin:url.origin,data:{type:'reeltrip-preview-status',url:stale.href,ready:true,changed:true,live:{route:'account',role:'customer',controls:[]}}});
assert.equal(els['#inspector-route'].textContent,priorRoute);
els['#ia-reset'].onclick();assert.notEqual(els['#ia-preview'].src,liveSrc);assert.equal(new URL(els['#ia-preview'].src).searchParams.get('screen'),'checkout');
console.log('PASS: live navigation, live controls, stale message rejection and explicit fixture reset.');
openState('settings','preferences');
const modeSrc=els['#ia-preview'].src,modeUrl=new URL(modeSrc);modeUrl.hash='account';
events.message({source:els['#ia-preview'].contentWindow,origin:url.origin,data:{type:'reeltrip-preview-status',url:modeUrl.href,ready:true,changed:true,live:{route:'account',role:'guide',summary:'메이트 마이',controls:[]}}});
assert.equal(els['#ia-preview'].src,modeSrc);
assert.equal(nodes.find(n=>n.dataset.route==='account'&&n.dataset.role==='guide').attrs['aria-current'],'true');
assert.equal(nodes.find(n=>n.dataset.route==='account'&&n.dataset.role==='customer').attrs['aria-current'],'false');
assert(els['#inspector-id'].textContent.endsWith('메이트'));
console.log('PASS: live role switches select the mate copy of shared screens without reloading.');

els['#ia-reset'].onclick();assert.equal(nodes.find(n=>n.dataset.route==='account'&&n.dataset.role==='guide').attrs['aria-current'],'true');

url=new URL('file:///project/src/frontend/index.html#ia-home?state=guest&lang=ko');
events.popstate();
assert(els['#ia-preview-status'].textContent.includes('파일로 직접 열면'));
assert.equal(els['#ia-preview-status'].children.at(-1).href,'http://localhost:8765/src/frontend/index.html#ia-home?state=guest&lang=ko');
console.log('PASS: file preview explains local-server recovery and preserves the selected state.');
