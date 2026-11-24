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
// Every customer entry must expose its actual signed-out UI in the IA.
for(const screen of screens.filter(s=>s.role==='customer')){
 assert(registry[screen.route].some(v=>v.fixture.guest),screen.route+' missing guest preview');
}
let cases=0;
for(const lang of ['ko','en'])for(const [route,variants] of Object.entries(registry))for(const variant of variants){
 if(process.env.REEL_SCREEN && route!==process.env.REEL_SCREEN)continue;
 const app={innerHTML:''},handlers={},sessionHandlers={};
 const admin=screens.find(s=>s.route===route).role==='admin';
 const description=`${lang}/${route}/${variant.id}`;
 const fixture=variant.fixture||{};
 let realStorageTouches=0;
 const forbidden={getItem(){realStorageTouches++;throw new Error('Real storage read');},setItem(){realStorageTouches++;throw new Error('Real storage write');}};
 const ctx={console,URL,URLSearchParams,location:{hash:'#'+(fixture.hash||route),search:'?lang='+lang+'&state='+variant.id},localStorage:forbidden,sessionStorage:forbidden,
  setTimeout:()=>0,clearTimeout(){},scrollTo(){},addEventListener:(name,fn)=>sessionHandlers[name]=fn,dispatchEvent(){},
  document:{documentElement:{lang},body:{dataset:admin?{surface:'admin'}:{},classList:{add(){}}},querySelector:s=>s==='#app'?app:null,querySelectorAll:()=>[],addEventListener:(name,fn)=>handlers[name]=fn}};
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
 if(route==='guide-activity'&&fixture.activityMany){
  if(fixture.hash.includes('tab=bookings')){
   const links=[...app.innerHTML.matchAll(/href="#guide-activity\?record=([^"]+)"/g)].map(x=>x[1]);
   assert.deepEqual(links,['RT-MANY-2','RT-MANY-4','RT-MANY-1','RT-MANY-0','RT-MANY-3','RT-MANY-5'],description+' urgency and date order');
   assert.equal((app.innerHTML.match(/<section class="card pad quote-section rt-booking-card">/g)||[]).length,7,description+' booking cards');
  }
  if(fixture.hash.includes('tab=sent')){
   assert.equal((app.innerHTML.match(/<article class="card pad quote-section rt-booking-card">/g)||[]).length,6,description+' individual proposal cards');
   const links=[...app.innerHTML.matchAll(/href="#guide-activity\?proposal=([^"]+)"/g)].map(x=>x[1]);
   assert.deepEqual(links,['QP-MANY-3','QP-MANY-2','QP-MANY-1','QP-MANY-0','QP-MANY-4','QP-MANY-5'],description+' proposal order');
  }

 }
 if(route==='requested')assert(!app.innerHTML.includes('data-action="demo-proposals"')&&!app.innerHTML.includes('demo-next'),description+' must not offer proposal generation');
 if(route==='requested'&&fixture.flow==='fee'){
  const cards=[...app.innerHTML.matchAll(/<article class="card pad proposal-card[^]*?<\/article>/g)].map(m=>m[0]);
  assert.equal(cards.length,2,description+' both proposals visible');
  assert(cards[0].includes(lang==='ko'?'선택한 메이트':'Selected mate'),description+' selected mate first');
  assert(cards[0].includes('href="#booking"'),description+' selected proposal links to booking');
  assert(cards[1].includes(lang==='ko'?'미선택':'Not selected'),description+' other proposal not selected');
  assert(!cards[1].includes('href="#booking"'),description+' other proposal does not link to booking');
 }
 if(route==='guide-quote'&&fixture.flow==='fee')assert(!app.innerHTML.includes('id="quote-form"'),description+' must lock selected proposal');
 if(route==='home')assert(!app.innerHTML.includes('resume-action'),description+' must not show resume cards');

 if(fixture.viewedProposals&&lang==='ko')assert(!app.innerHTML.includes('새 제안 2'),description+' read offers must not be new');
 if(fixture.guest)assert.notEqual(ctx.sessionStorage.getItem('reeltrip-signup-preview-member'),'yes');
 if(route==='guide'&&fixture.guest){assert(app.innerHTML.includes('guest-invite'),description+' requires membership');assert(!app.innerHTML.includes('rt-profile-card'),description+' must hide mate profile');}
 if(fixture.emailStep)assert(app.innerHTML.includes('id="signup-code-form"'),description);
 if(route==='chat'&&fixture.chat)assert.equal(app.innerHTML.includes('id="chat-form"'),fixture.flow!=='cancelled'&&!fixture.ended,description+' composer gating');
 if(route==='messages'&&fixture.chat==='mixed'){
  const cards=[...app.innerHTML.matchAll(/<a class="conversation-item[^]*?<\/a>/g)].map(m=>m[0]);
  assert.equal(cards.length,2,description+' mixed conversations');
  assert(!cards[0].includes('is-closed'),description+' active first');
  assert(cards[0].includes('chat-unread'),description+' active unread badge');
  assert(cards[1].includes('is-closed'),description+' closed last');
  assert(!cards[1].includes('chat-unread'),description+' no closed unread badge');
  assert(cards[1].includes('href="#chat?thread='),description+' closed history accessible');
 }
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
 cases++;
}
console.log(`PASS: ${cases} KO/EN fixtures across ${process.env.REEL_SCREEN || `all ${screens.length} screens`}: isolated storage, correct surface/permissions, render markers, chat and payment gating.`);
