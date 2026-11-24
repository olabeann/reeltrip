// Run real preview boot scripts; fixtures must not read or write normal demo storage.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
// A stale copy file paired with newer app code must never reuse the same URL.
for(const entry of ['index.html','states.html','preview.html','preview-en.html','preview-admin.html','preview-admin-en.html']){
 const file=path.join(root,'src/frontend',entry),html=fs.readFileSync(file,'utf8');
 for(const match of html.matchAll(/(?:src|href)="([^":?]+\.(?:js|css))(?:\?([^" ]*))?"/g)){
  const digest=require('node:crypto').createHash('sha256').update(fs.readFileSync(path.resolve(path.dirname(file),match[1]))).digest('hex').slice(0,12);
  assert.equal(new URLSearchParams(match[2]).get('v'),digest,entry+': stale asset '+match[1]);
 }
}
const registry=JSON.parse(fs.readFileSync(path.join(root,'resources/review/screen-states.json')));
const screens=JSON.parse(fs.readFileSync(path.join(root,'docs/screen-spec.json')));
assert.deepEqual(Object.keys(registry).sort(),screens.map(s=>s.route).sort(),'Every screen must register its implemented states');
for(const [route,variants] of Object.entries(registry)){
 assert(variants.length>0,route+' has no states');
 assert.equal(new Set(variants.map(v=>v.id)).size,variants.length,route+' duplicate state IDs');
 for(const v of variants)assert(v.condition&&v.transition&&v.fixture,route+'/'+v.id+' missing specification');
}
let cases=0,links=0,actions=0;
for(const lang of ['ko','en'])for(const [route,variants] of Object.entries(registry))for(const variant of variants){
 const dialog={innerHTML:'',dataset:{},classList:{toggle(){}},setAttribute(){},removeAttribute(){},showModal(){this.open=true},close(){this.open=false}},app={innerHTML:''},handlers={},sessionHandlers={},timers=[];const toast={textContent:'',classList:{add(){},remove(){}}};
 const admin=screens.find(s=>s.route===route).role==='admin';
 const description=`${lang}/${route}/${variant.id}`;
 const fixture=variant.fixture||{};
 let realStorageTouches=0;
 const forbidden={getItem(){realStorageTouches++;throw new Error('Real storage read');},setItem(){realStorageTouches++;throw new Error('Real storage write');}};
 const ctx={console,URL,URLSearchParams,Event:class{constructor(type){this.type=type;}},location:{hash:'#'+(fixture.hash||route),search:'?lang='+lang+'&state='+variant.id},localStorage:forbidden,sessionStorage:forbidden,
  setTimeout:(fn,ms)=>{timers.push({fn,ms});return timers.length;},clearTimeout(){},scrollTo(){},addEventListener:(name,fn)=>sessionHandlers[name]=fn,dispatchEvent(){},
  document:{documentElement:{lang},body:{dataset:admin?{surface:'admin'}:{},classList:{add(){}}},querySelector:s=>s==='#dialog'?dialog:s==='#app'?app:s==='#main'?{focus(){}}:s==='#toast'?toast:null,querySelectorAll:()=>[],addEventListener:(name,fn)=>{const previous=handlers[name];handlers[name]=previous?e=>{previous(e);fn(e);}:fn;}}};
 ctx.window=ctx;vm.createContext(ctx);
 const file=`preview${admin?'-admin':''}${lang==='en'?'-en':''}.html`;
 const html=fs.readFileSync(path.join(root,'src/frontend',file),'utf8');
 for(const match of html.matchAll(/<script src="([^"?]+)[^"]*"/g)){
  const script=path.resolve(root,'src/frontend',match[1]);vm.runInContext(fs.readFileSync(script,'utf8'),ctx,{filename:script});
 }
 assert(app.innerHTML.includes('<main'),`${lang}/${route}/${variant.id} blank`);
 assert.equal(ctx.ReelStatePreview.state,variant.id);
 assert.equal(ctx.ReelAccess.isAdmin,admin,description+' surface');
 assert(ctx.ReelAccess.allowed(screens.find(s=>s.route===route).role,route),description+' permission');
 if(lang==='ko'&&variant.expect)assert(app.innerHTML.includes(variant.expect),description+' missing '+variant.expect);
 if(lang==='ko'&&variant.absent)assert(!app.innerHTML.includes(variant.absent),description+' unexpected '+variant.absent);
 if(route==='requested'&&variant.id==='closed')assert(!app.innerHTML.includes('data-action="demo-proposals"'),description+' must not offer proposal generation');
 if(route==='guide-quote'&&fixture.flow==='fee')assert(!app.innerHTML.includes('id="quote-form"'),description+' must lock selected proposal');
 if(route==='home'&&['ready','saved'].includes(fixture.recommendation)){
  assert.equal((app.innerHTML.match(/class="recommendation-card"/g)||[]).length,3,description+' result cards');
  assert.equal((app.innerHTML.match(/data-action="save-recommendation"[^>]* disabled/g)||[]).length,fixture.recommendation==='saved'?3:0,description+' saved controls');
 }
 if(fixture.viewedProposals&&lang==='ko')assert(!app.innerHTML.includes('새 제안 2'),description+' read offers must not be new');
 if(fixture.guest)assert.notEqual(ctx.sessionStorage.getItem('reeltrip-signup-preview-member'),'yes');
 if(fixture.emailStep)assert(app.innerHTML.includes('id="signup-code-form"'),description);
 if(route==='chat'&&fixture.chat)assert.equal(app.innerHTML.includes('id="chat-form"'),fixture.flow!=='cancelled'&&!fixture.ended,description+' composer gating');
 if(route==='guide-fee'&&fixture.flow)assert.equal(app.innerHTML.includes('id="mate-fee-form"'),['fee','failed'].includes(fixture.flow),description+' payment gating');
 assert.notEqual(ctx.localStorage,forbidden);assert.notEqual(ctx.sessionStorage,forbidden);
 assert(!ctx.location.search.includes('tools=1'));
 if(lang==='ko'&&route==='guides'){
  const required={none:'먼저 지역과 여행 기간',waiting:'제안 기다리는 중',proposals:'제안 도착',closed:'요청 마감',fee:'메이트 선택 완료'};
  if(required[variant.id])assert(app.innerHTML.includes(required[variant.id]),variant.id);
 }
 if(route==='quote'&&variant.id==='expired')assert(!app.innerHTML.includes('href="#checkout"'));
 if(route==='booking'&&variant.id==='fee')assert(app.innerHTML.includes(lang==='ko'?'수수료':'fee'));
 assert.equal(realStorageTouches,0,'Preview must never access normal browser storage');

 const original=app.innerHTML,originalMode=ctx.ReelAccess.mode();
 const switchMode=mode=>handlers.click({target:{closest:selector=>selector==='[data-access-mode]'?{dataset:{accessMode:mode}}:null},preventDefault(){}});
 for(const link of new Set([...original.matchAll(/href="#([^"]+)"/g)].map(m=>m[1]))){
  switchMode(originalMode);
  const tag=[...original.matchAll(/<a\b[^>]*>/g)].map(m=>m[0]).find(tag=>tag.includes('href="#'+link+'"')&&tag.includes('data-access-mode='));
  if(tag)switchMode(tag.match(/data-access-mode="([^"]+)"/)[1]);
  const destination=link.split('?')[0];if(destination==='main')continue;
  const target=screens.find(s=>s.route===destination);
  assert(target||destination==='member-required',description+' unknown target '+link);
  if(target)assert(ctx.ReelAccess.allowed(target.role,target.route),description+' inaccessible link '+link);
  ctx.location.hash='#'+link;sessionHandlers.hashchange();
  assert(app.innerHTML.includes('<main'),description+' blank destination '+link);
  links++;
 }
 switchMode(originalMode);ctx.location.hash='#'+(fixture.hash||route);sessionHandlers.hashchange();
 const click=(action,id)=>handlers.click({preventDefault(){},target:{closest:selector=>selector==='[data-action]'?{dataset:{action,id}}:null}});
 if(route==='requested'&&['waiting','proposals'].includes(variant.id)){
  click('withdraw');assert(dialog.open);const requestId=dialog.innerHTML.match(/data-id="([^"]+)"/)[1];click('confirm-withdraw',requestId);assert(app.innerHTML.includes(lang==='ko'?'철회':'Withdrawn'),description+' must close request');
  assert(!app.innerHTML.includes('data-action="withdraw"'));assert(!app.innerHTML.includes('data-action="demo-proposals"'));actions++;
 }
 if(route==='admin-bookings'&&fixture.flow==='cancel'){click('confirm-cash-cancel');assert(app.innerHTML.includes(lang==='ko'?'취소 완료':'Cancelled'));assert(!app.innerHTML.includes('data-action="confirm-cash-cancel"'));actions++;}
 if(route==='home'&&!fixture.guest){
  click('sample');ctx.location.hash='#'+ctx.location.hash.replace(/^#/,'');sessionHandlers.hashchange();
  const transition=timers.filter(t=>t.ms===1400).at(-1);assert(transition,description+' preview analysis must advance after user action');transition.fn();
  assert.equal(ctx.location.hash,'results');actions++;
 }
 cases++;
}
console.log(`PASS: ${cases} KO/EN states, ${links} internal destination renders and ${actions} request closure, analysis and admin cancellation transitions.`);
