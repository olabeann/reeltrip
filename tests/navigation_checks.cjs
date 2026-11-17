// Render-template checks; does not replace browser layout/accessibility verification.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=__dirname+'/../';
function setup(lang,mode='customer',admin=false){
 const ctx={URLSearchParams,Event:class{},location:{search:'?tools=1',hash:'#home'},document:{documentElement:{lang},body:{dataset:{surface:admin?'admin':''},classList:{add(){}}},addEventListener(){}},window:{addEventListener(){},dispatchEvent(){}},localStorage:{getItem(k){return k==='reeltrip-prototype-access-v1'?JSON.stringify({profile:'guide',mode}):null},setItem(){}},setTimeout,clearTimeout};
 vm.createContext(ctx);
 for(const file of ['assets/access.js',`assets/catalog${lang==='en'?'.en':''}.js`])vm.runInContext(fs.readFileSync(root+file,'utf8'),ctx);
 const code=fs.readFileSync(root+`assets/app${lang==='en'?'.en':''}.js`,'utf8').split('window.ReelBookingTools.init(')[0];
 vm.runInContext(code+'globalThis.nav={layout,account,settingsPage,normalizeNickname,nicknameProblem,home,trips,guideDesk,state,libraryIds,proposals,makeQuote,quoteValid,requestBooking,confirmMateFee,guides,setGuidesTab(value){guidesTab=value},notificationItems,notificationBell,notifications,markNotificationsRead};})();',ctx);return ctx;
}
for(const lang of ['ko','en']){
 const c=setup(lang);
 assert.equal(c.nav.normalizeNickname(' A b C '),'abc');
 assert.equal(c.nav.normalizeNickname('ＡＢＣ'),'abc');
 assert(c.nav.nicknameProblem(' Jamie ',{jamie:'someone-else'}));
 assert.equal(c.nav.nicknameProblem('Jamie',{jamie:'traveler-demo'}),'');
 assert(c.nav.nicknameProblem('릴트립 운영팀',{}));
 assert(c.nav.nicknameProblem('a',{}));

 c.window.ReelBookingTools={saved(){return '<div data-saved-bookings></div>'}};
 assert.equal(c.nav.notificationItems().length,0);
 assert(c.nav.notifications().includes('notification-empty'));
 assert(!c.nav.notificationBell().includes('notification-dot'));
 c.nav.state.request={id:'RQ-1',status:'requested',guide:'Mina',date:'2026-12-01',createdAt:1794900000000};
 assert(c.nav.notificationBell().includes('notification-dot'));
 assert(c.nav.notifications().includes('class="notification-read-all"'));
 assert(!c.nav.notifications().includes('class="btn textbtn"'));
 assert.equal(c.nav.notificationItems()[0].route,'requested');
 c.nav.markNotificationsRead(c.nav.notificationItems().map(n=>n.id));
 assert(!c.nav.notificationBell().includes('notification-dot'));
 c.nav.state.request.status='quoted';
 assert(c.nav.notificationBell().includes('notification-dot'));
 assert.equal(c.nav.notificationItems()[0].route,'quote');
 c.nav.state.booking={id:'BK-1',status:'confirmed',guide:'Mina',date:'2026-12-01'};
 assert.equal(c.nav.notificationItems()[0].route,'booking');
 c.nav.state.booking=null;c.nav.state.request=null;
 const market=setup(lang);
 market.nav.state.board=['forest'];assert(market.nav.libraryIds().includes('forest'));
 market.nav.state.board=[];assert(market.nav.libraryIds().includes('forest'),'Removing an itinerary stop must preserve the library');
 market.nav.state.request={id:'RQ-MARKET',status:'requested',guide:'Pending',date:'2026-12-01',time:'10:00',party:2,stops:[{name:'Seoul Forest',duration:45}],must:[]};
 assert(market.nav.makeQuote(240000,'Walk and cafe','Relaxed walk',undefined,'mina'));
 assert(market.nav.makeQuote(210000,'Local shops','Less walking',undefined,'jun'));
 assert.equal(market.nav.proposals().length,2);
 assert.equal(market.nav.state.booking,null,'Receiving quotes must not book a guide');
 assert(market.nav.makeQuote(250000,'Updated walk','More time',undefined,'mina'));
 assert.equal(market.nav.proposals().length,2,'Guide updates must preserve competing proposals');
 assert.equal(market.nav.proposals().find(q=>q.guideId==='jun').amount,210000);
 assert.equal(market.nav.proposals().find(q=>q.guideId==='mina').version,2);
 market.nav.state.request.status='withdrawn';assert(!market.nav.quoteValid());
 assert(!market.nav.makeQuote(250000,'Walk','Closed',undefined,'jun'));
 assert(!c.nav.account().includes('my-quick-links'));
 assert(!c.nav.account().includes('class="my-current"'));
 assert(c.nav.account().includes('data-action="edit-profile"'));
 c.nav.state.profile={nickname:'<Jamie>',photo:''};
 assert(c.nav.account().includes('&lt;Jamie&gt;'));
 c.nav.state.request={status:'requested',tripTitle:'Weekend',date:'2026-12-01'};
 assert(c.nav.account().includes('class="my-current"'));
 c.nav.state.request.status='withdrawn';
 assert(!c.nav.account().includes('class="my-current"'));
 c.nav.state.request=null;
 const match=setup(lang),payingMate=setup(lang,'guide');
 match.nav.state.request={id:'RQ-CASH',status:'quoted',stops:[],guide:'Pending',date:'2026-12-01'};
 match.nav.state.quote={id:'QT-CASH',version:1,guide:'Mina',guideId:'mina',amount:240000,expires:Date.now()+3600000,date:'2026-12-01',party:2};
 assert(match.nav.requestBooking('Traveler','guest@example.com'));
 const cashBooking=match.nav.state.booking;
 assert.equal(cashBooking.status,'awaiting_mate_fee');assert.equal(cashBooking.feeAmount,24000);assert.equal(cashBooking.cashStatus,'uncollected');
 assert.equal(cashBooking.paymentMethod,'cash');assert.equal(match.nav.state.request.status,'matching');
 assert(!match.nav.requestBooking('Duplicate','guest@example.com'));
 assert(!match.nav.confirmMateFee('success'),'Traveler cannot pay the mate fee');
 match.nav.state.quote.amount=999999;assert.equal(cashBooking.amount,240000,'Selected price must be a snapshot');
 payingMate.nav.state.booking=cashBooking;payingMate.nav.state.request=match.nav.state.request;
 assert(!payingMate.nav.confirmMateFee('failure'));assert.equal(cashBooking.status,'awaiting_mate_fee');
 assert(payingMate.nav.confirmMateFee('success'));assert.equal(cashBooking.status,'confirmed');assert.equal(cashBooking.feeStatus,'paid');
 const paidAt=cashBooking.feePaidAt;assert(!payingMate.nav.confirmMateFee('success'));assert.equal(cashBooking.feePaidAt,paidAt);
 cashBooking.status='cancelled';cashBooking.feeStatus='void';assert(!payingMate.nav.confirmMateFee('success'));
 const entry=c.nav.home();
 assert(entry.includes('import-subtext'));

 assert(entry.includes('id="extract-form"')&&entry.includes('id="video-url"'));
 for(const target of ['manual','guides'])assert(entry.includes(`href="#${target}"`));
 assert(entry.includes('data-action="sample"')&&!entry.includes('extract-demo-note'));
 c.nav.state.saved=true;assert(c.nav.home().includes('class="resume-action" href="#planner"'));
 c.nav.state.request={status:'requested',guide:'Mina',date:'2026-12-01',party:2};
 assert(c.nav.home().includes('class="resume-action" href="#requested"'));
 c.nav.state.request.status='quoted';assert(c.nav.home().includes('class="resume-action" href="#quote"'));
 c.nav.state.booking={status:'confirmed',guide:'Mina',date:'2026-12-01',party:2};
 assert(c.nav.home().includes('class="resume-action" href="#booking"'));
 const trips=c.nav.trips();assert(trips.includes('href="#planner"'));assert(!trips.includes('href="#booking"'));assert(trips.includes('data-saved-bookings'));c.nav.setGuidesTab('requests');assert(c.nav.guides().includes('href="#requested"'));assert(c.nav.guides().includes('request-inbox-card'));assert(!c.nav.guides().includes('href="#planner"'));c.nav.setGuidesTab('discover');
 c.nav.state.request=null;c.nav.state.booking=null;

 for(const route of ['home','board','guides','trips','account']){
  c.location.hash='#'+route;const h=c.nav.layout(route==='account'?c.nav.account():'content');
  assert(!h.includes('<header'),`${lang}/${route}: unexpected top bar`);
  assert.equal(h.includes('class="home-brand"'),route==='home');
  if(route!=='account')assert(!h.includes('data-access-mode='));
  else {assert(h.includes('href="#settings"'));assert(!h.includes('data-access-mode='));assert(!h.includes('data-action="reset"'));}
 }
 for(const [route,parent] of [['request','planner'],['quote','requested'],['booking','guides'],['support','settings'],['settings','account']]){
  c.location.hash='#'+route;const h=c.nav.layout('content');assert(h.includes('class="topbar detail-topbar"'));assert(h.includes(`class="app-back" href="#${parent}"`));assert(!h.includes('class="language-switch"'));
 }
 const g=setup(lang,'guide');
 assert(g.window.ReelAccess.allowed('customer','notifications'));
 g.nav.state.request={id:'RQ-G',status:'requested',date:'2026-12-01'};
 assert.equal(g.nav.notificationItems()[0].route,'guide-desk');
 g.location.hash='#notifications';assert(g.nav.layout(g.nav.notifications()).includes('class="app-back" href="#guide-desk"'));

 for(const route of ['account','support','policies','settings'])assert(g.window.ReelAccess.allowed('customer',route));
 assert(!g.window.ReelAccess.allowed('customer','checkout'));
 g.location.hash='#guide-desk';assert(g.nav.layout('content').includes('href="#account"'));assert(!g.nav.layout('content').includes('<header'));
 g.location.hash='#account';const my=g.nav.layout(g.nav.account());assert(my.includes('href="#settings"'));assert(my.includes('aria-current="page"'));g.location.hash='#settings';const settings=g.nav.layout(g.nav.settingsPage());assert(settings.includes('data-access-mode="customer"'));assert(settings.includes((lang==='en'?'index':'english')+'.html?tools=1#settings'));assert(settings.includes('data-action="reset"'));assert(settings.includes('href="#support"'));assert(settings.includes('class="app-back" href="#account"'));
 const a=setup(lang,'customer',true);a.location.hash='#admin';const h=a.nav.layout('admin');assert(h.includes('class="topbar"'));assert(h.includes('brand-lockup'));assert(!h.includes('class="mobiletabs"'));assert(!a.window.ReelAccess.allowed('customer','account'));
}
console.log('PASS: KO/EN main tabs without top bars; home logo; shared My preferences; guide mode escape path; detail back links; separate admin header.');
