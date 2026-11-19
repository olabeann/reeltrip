// Both matching entry paths preserve the original trip and carry full dates through booking.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=__dirname+'/../';
function setup(lang,storage=new Map()){
 const handlers={},toast={textContent:'',classList:{add(){},remove(){}}};
 const ctx={URLSearchParams,Event:class{},sessionStorage:{getItem:()=> 'yes'},location:{hash:'#results',search:''},document:{documentElement:{lang},body:{dataset:{},classList:{add(){}}},querySelector:s=>s==='#toast'?toast:s==='#dialog'?{close(){}}:null,querySelectorAll:()=>[],addEventListener:(n,fn)=>handlers[n]=fn},window:{ReelGoogleMap:{valid:p=>Number.isFinite(p.lat)&&Number.isFinite(p.lng)},addEventListener(){},dispatchEvent(){}},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},setTimeout:()=>0,clearTimeout(){}};
 vm.createContext(ctx);
 for(const file of ['assets/nickname-bases.js','assets/signup-copy.js','assets/access.js',`assets/catalog${lang==='en'?'.en':''}.js`,'assets/revenue.js'])vm.runInContext(fs.readFileSync(root+file,'utf8'),ctx);
 const code=fs.readFileSync(root+`assets/app${lang==='en'?'.en':''}.js`,'utf8').split('window.ReelBookingTools.init(')[0];
 vm.runInContext(code+'globalThis.api={saveRecommendation,loadRecommendations,getRecommendations:()=>({rows:recommendationRows,status:recommendationStatus}),saveAPIPlace,setPendingPlace:p=>pendingAPIPlace=p,pinEligible,tripRangeDays,chooseTripDate,setTripDraft:v=>tripDraft=v,getTripDraft:()=>tripDraft,tripText,saveTripNote,updateTripInfo,addTripPlace,createTrip,selectTrip,trips,tripDetailRoute,state,stashDay,submitTravelRequest,request,makeQuote,proposals,requestBooking,requested,guideDesk,guideQuote,booking,save,ensureConversation};})();',ctx);
 ctx.window.ReelRevenue.init({state:()=>ctx.api.state,save:ctx.api.save});
 return {...ctx,handlers,storage};
}
const plain=v=>JSON.parse(JSON.stringify(v));
for(const lang of ['ko','en']){
 const live=setup(lang);live.window.REEL_MAPS_CONFIG={apiKey:'test'};
 live.location.hash='#manual?resolve=forest';
 live.api.state.places.find(p=>p.id==='forest').demoCoordinates=true;
 live.api.setPendingPlace({id:'google-real',source:'google',placeId:'real',name:'Real park',address:'Actual address',lat:37.54,lng:127.04,duration:45});
 live.api.saveAPIPlace();
 const connected=live.api.state.places.find(p=>p.id==='forest');
 assert.equal(connected.placeId,'real');assert(!connected.demoCoordinates);assert(live.api.pinEligible(connected));
 assert(live.api.state.board.includes('forest'));assert(!live.api.state.library.includes('google-real'));
 const cards=setup(lang).api,originalBoard=plain(cards.state.board);
 const card={id:'google-card',source:'google',placeId:'card',name:'Live place',lat:37.5,lng:127,duration:45};
 assert(cards.saveRecommendation(card));assert(cards.saveRecommendation(card));
 assert.equal(cards.state.library.filter(id=>id==='google-card').length,1);
 assert.deepEqual(plain(cards.state.board),originalBoard);
 assert(!cards.saveRecommendation({...card,lat:null}));
 const calendar=setup(lang).api;
 assert(calendar.pinEligible({source:'google',lat:35.1,lng:129.1}));
 assert(!calendar.pinEligible({source:'google',lat:35.1,lng:129.1,demoCoordinates:true}));
 assert(!calendar.pinEligible({manual:true,lat:35.1,lng:129.1}));
 assert(!calendar.pinEligible({source:'google',placeId:'unresolved'}));
 assert.equal(calendar.tripRangeDays('2028-02-28','2028-03-01'),3);
 assert.equal(calendar.tripRangeDays('2027-12-31','2028-01-02'),3);
 assert.equal(calendar.tripRangeDays('2027-02-29','2027-03-01'),0);
 assert.equal(calendar.tripRangeDays('2028-01-08','2028-01-01'),0);
 assert.equal(calendar.tripRangeDays('2028-01-01','2028-01-08'),0);
 calendar.setTripDraft({start:'',end:'',error:''});
 assert.equal(calendar.chooseTripDate('2020-01-01'),false);
 assert(calendar.chooseTripDate('2028-02-28'));assert.equal(calendar.getTripDraft().end,'');
 assert.equal(calendar.chooseTripDate('2028-03-06'),false);assert.equal(calendar.getTripDraft().start,'2028-02-28');
 assert(calendar.chooseTripDate('2028-03-01'));assert.equal(calendar.getTripDraft().end,'2028-03-01');
 assert(calendar.chooseTripDate('2028-02-29'));assert.equal(calendar.getTripDraft().end,'');
 assert(calendar.chooseTripDate('2028-02-28'));assert.equal(calendar.getTripDraft().start,'2028-02-28');
 assert(calendar.chooseTripDate('2028-02-28'));assert.equal(calendar.tripRangeDays(calendar.getTripDraft().start,calendar.getTripDraft().end),1);
 assert(calendar.createTrip({title:'Leap year trip',date:'2028-02-28',dayCount:calendar.tripRangeDays('2028-02-28','2028-03-01'),party:2}));
 assert.deepEqual(plain(calendar.state.days.map(d=>d.date)),['2028-02-28','2028-02-29','2028-03-01']);
 const c=setup(lang),a=c.api;a.stashDay();const before=plain(a.state.days),board=[...a.state.board];
 a.state.selected=['food'];
 const button={dataset:{action:'save-places'}};
 c.handlers.click({target:{closest:s=>s==='[data-action]'?button:null},preventDefault(){}});
 assert(a.state.library.includes('food'));assert.deepEqual([...a.state.board],board);assert.deepEqual(plain(a.state.days),before);assert.equal(c.location.hash,'board');
 c.handlers.click({target:{closest:s=>s==='[data-action]'?button:null},preventDefault(){}});
 assert.equal(a.state.library.filter(id=>id==='food').length,1);
 const date=new Date(Date.now()+10*86400000).toISOString().slice(0,10);
 const fields={region:'Busan',date,time:'10:00',dayCount:'2',party:'2',notes:'Food and walks',language:'English',guideAck:'on',ack:'on'};
 c.location.hash='#request?mode=free';assert(a.request().includes('name="region"'));assert(a.request().includes('name="dayCount"'));
 for(const bad of [{region:''},{dayCount:'0'},{dayCount:'8'},{dayCount:'2.5'},{date:'invalid'},{date:'2020-01-01'},{time:'29:00'},{party:'5'},{guideAck:''},{ack:''}]){
  assert(a.submitTravelRequest({...fields,...bad},{free:true}).error,JSON.stringify(bad));assert.equal(a.state.request,null);
 }
 assert.equal(a.submitTravelRequest(fields,{free:true}).route,'requested');
 const r=a.state.request;assert.equal(r.requestType,'free');assert.equal(r.dayCount,2);assert.equal(r.stops.length,0);assert.equal(r.days.length,2);assert.notEqual(r.date,r.endDate);assert.deepEqual(plain(a.state.days),before);assert.deepEqual([...a.state.board],board);
 assert(a.requested().includes(r.endDate));assert(a.guideDesk().includes('Busan'));
 assert.equal(c.window.ReelRevenue.quoteAmount(2),480000);assert(c.window.ReelRevenue.calculator(2).includes('max="8"'));
 const id=r.id;assert.equal(a.submitTravelRequest(fields,{free:true}).route,'requested');assert.equal(a.state.request.id,id);
 assert(a.makeQuote(480000,'Day 1: Walk\nDay 2: Food','Custom route',{rate:60000,hours:8,extra:10000},'mina'));
 assert(a.makeQuote(420000,'Day 1: Food\nDay 2: Walk','Alternative route',{rate:60000,hours:7,extra:10000},'jun'));
 assert.equal(a.proposals().length,2);assert.equal(a.state.quote.endDate,r.endDate);assert.equal(a.state.quote.dayCount,2);
 const room=a.ensureConversation(a.state.quote);assert.equal(room.endDate,r.endDate);
 assert(a.requestBooking('Traveler','guest@example.com'));assert.equal(a.state.booking.endDate,r.endDate);assert.equal(a.state.booking.requestType,'free');assert.equal(a.state.booking.feeAmount,42000);assert(a.booking().includes(r.endDate));
 a.save();const reload=setup(lang,c.storage);assert.equal(reload.api.state.booking.dayCount,2);assert.equal(reload.api.state.request.region,'Busan');
 // A separate itinerary request includes both days and keeps each day's duration snapshot.
 const own=setup(lang),b=own.api;b.state.date=date;b.state.time='10:00';b.state.board=['forest'];b.stashDay();
 const end=new Date(Date.parse(date+'T12:00:00Z')+86400000).toISOString().slice(0,10);
 b.state.days.push({date:end,time:'11:00',ids:['cafe'],durations:{cafe:90}});
 assert.equal(b.submitTravelRequest({party:'2',guideAck:'on',ack:'on'}).route,'requested');
 assert.equal(b.state.request.dayCount,2);assert.equal(b.state.request.requestType,'itinerary');assert.equal(b.state.request.stops.length,2);assert.equal(b.state.request.days[1].stops[0].duration,90);
 b.state.places.find(p=>p.id==='cafe').duration=15;assert.equal(b.state.request.days[1].stops[0].duration,90);
 assert(b.makeQuote());assert.equal(b.state.quote.amount,480000);assert(b.state.quote.plan.includes(end));

 // Creating and reopening trips preserves independent dates, stops and durations.
 const multi=setup(lang),m=multi.api;m.stashDay();m.state.places.find(p=>p.id==='forest').duration=90;m.save();const legacy=m.state.activeTripId;
 const firstTitle=m.state.title,firstDays=plain(m.state.days);
 assert(!m.createTrip({title:'',date,dayCount:'2',party:'2'}));assert.equal(m.state.trips.length,1);
 assert(m.createTrip({title:'Second trip',date,dayCount:'2',party:'3'}));const second=m.state.activeTripId;
 assert.notEqual(legacy,second);assert.equal(m.state.board.length,0);assert.equal(m.state.days.length,2);assert.equal(m.state.party,3);
 m.state.board=['cafe'];m.state.places.find(p=>p.id==='cafe').duration=120;m.save();
 assert(m.selectTrip(legacy));assert.equal(m.state.title,firstTitle);assert.deepEqual(plain(m.state.days),firstDays);assert.equal(m.state.places.find(p=>p.id==='forest').duration,90);
 assert(m.selectTrip(second));assert.equal(m.state.title,'Second trip');assert.deepEqual([...m.state.board],['cafe']);assert.equal(m.state.places.find(p=>p.id==='cafe').duration,120);
 multi.location.hash='#trips';const list=m.trips();assert.equal((list.match(/data-action="open-trip"/g)||[]).length,2);assert(!list.includes('class="day-tabs"'));
 m.save();const reopened=setup(lang,multi.storage).api;assert.equal(reopened.state.trips.length,2);assert(reopened.selectTrip(legacy));assert.equal(reopened.state.title,firstTitle);

 // Date changes preserve notes and stops; shared text includes all days.
 assert(m.selectTrip(second));assert(m.saveTripNote('Meet at the station'));assert(!m.saveTripNote('   '));assert(!m.saveTripNote('x'.repeat(501)));
 assert(m.saveTripNote('Bring the booking reference',0));assert.equal(m.state.days[0].notes.length,1);
 const newDate=new Date(Date.parse(date+'T12:00:00Z')+3*86400000).toISOString().slice(0,10);
 assert(m.updateTripInfo({title:'Renamed trip',date:newDate,party:'4'}));assert.equal(m.state.days[0].date,newDate);assert.equal(m.state.days[0].notes[0],'Bring the booking reference');assert.deepEqual([...m.state.board],['cafe']);
 assert(m.addTripPlace('forest'));assert(!m.addTripPlace('forest'));assert(!m.addTripPlace('unknown'));
 multi.location.hash='#share?scope=trip';const shared=m.tripText();assert(shared.includes('Bring the booking reference'));assert(shared.includes(m.state.days[1].date));assert(!shared.includes('guest@example.com'));
 assert(m.selectTrip(legacy));assert(!(m.state.days[0].notes||[]).length);assert(m.selectTrip(second));assert.equal(m.state.days[0].notes[0],'Bring the booking reference');
 const persisted=setup(lang,multi.storage).api;assert.equal(persisted.state.days[0].notes[0],'Bring the booking reference');
 console.log(`PASS: ${lang} save-only collection, free/itinerary requests, validation, two-day pricing, proposal comparison, booking snapshots and reload.`);
}

(async()=>{const c=setup('ko');const waiting=[];c.window.ReelPlaceAPI={search:()=>new Promise((resolve,reject)=>waiting.push({resolve,reject}))};
 const first=c.api.loadRecommendations('Seoul',true),second=c.api.loadRecommendations('Busan',true);
 waiting[1].resolve([{id:'busan',source:'google',placeId:'busan',lat:35,lng:129}]);await second;
 waiting[0].resolve([{id:'seoul',source:'google',placeId:'seoul',lat:37,lng:127}]);await first;
 assert.equal(c.api.getRecommendations().rows[0].id,'busan');
 const fail=c.api.loadRecommendations('Failure',true);waiting[2].reject(Error('network'));await fail;assert.equal(c.api.getRecommendations().status,'error');
 console.log('PASS: discovery latest-query wins, failed requests are retryable, save deduplicates without changing itinerary.');
})().catch(e=>{console.error(e);process.exitCode=1;});
