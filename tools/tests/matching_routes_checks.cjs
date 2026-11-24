// Both matching entry paths preserve the original trip and carry full dates through booking.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=__dirname+'/../../src/';
function setup(lang,storage=new Map()){
 const handlers={},toast={textContent:'',classList:{add(){},remove(){}}};
 const ctx={HTMLFormElement:class{},FormData:class{constructor(form){return Object.entries(form.values);}},URLSearchParams,Event:class{},sessionStorage:{getItem:()=> 'yes'},location:{hash:'#results',search:''},document:{documentElement:{lang},body:{dataset:{},classList:{add(){}}},querySelector:s=>s==='#toast'?toast:s==='#dialog'?{close(){}}:s==='#app'?{innerHTML:''}:null,querySelectorAll:()=>[],addEventListener:(n,fn)=>handlers[n]=fn},window:{ReelBookingTools:{widget:()=>''},ReelGoogleMap:{mount(){},valid:p=>Number.isFinite(p.lat)&&Number.isFinite(p.lng)},addEventListener(){},dispatchEvent(){}},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},setTimeout:()=>0,clearTimeout(){}};
 vm.createContext(ctx);
 for(const file of ['assets/nickname-bases.js','assets/signup-copy.js','assets/access.js',`assets/catalog${lang==='en'?'.en':''}.js`,'assets/revenue.js'])vm.runInContext(fs.readFileSync(root+file,'utf8'),ctx);
 const code=fs.readFileSync(root+`assets/app${lang==='en'?'.en':''}.js`,'utf8').split('window.ReelBookingTools.init(')[0];
 vm.runInContext(code+'globalThis.api={mateBookingList,restoreSampleBookingContexts,mateBookingCard,activateMatching,results,requestItineraryMap,getMapPlaces:()=>mapPlaces,setQuoteMapDay:n=>quoteMapDay=n,publicTravelRequests,publicRequestMatch,expireMateFee,reopenMatching,guideActivity,guideFee,requestAvailable,layout,board,saveSelectedPlaces,saveRecommendation,loadRecommendations,getRecommendations:()=>({rows:recommendationRows,status:recommendationStatus}),saveAPIPlace,setPendingPlace:p=>pendingAPIPlace=p,pinEligible,tripRangeDays,chooseTripDate,setTripDraft:v=>tripDraft=v,getTripDraft:()=>tripDraft,moveTripPlace,removeTripPlace,updateTripDay,updateTripInfo,addTripPlace,createTrip,selectTrip,trips,tripDetailRoute,state,stashDay,submitTravelRequest,request,makeQuote,proposals,requestBooking,confirmMateFee,quote,requested,guideDesk,guideQuote,booking,save,ensureConversation};})();',ctx);
 ctx.window.ReelRevenue.init({state:()=>ctx.api.state,save:ctx.api.save});
 return {...ctx,handlers,storage};
}
const plain=v=>JSON.parse(JSON.stringify(v));
for(const lang of ['ko','en']){
 const inline=setup(lang),edit=inline.api;
 edit.state.board=['forest','cafe','shop'];edit.save();
 const libraryBefore=[...edit.state.library];
 assert(!edit.moveTripPlace('missing',1));assert(!edit.moveTripPlace('forest',-1));
 assert(edit.moveTripPlace('cafe',-1));assert.deepEqual([...edit.state.board],['cafe','forest','shop']);
 assert(edit.removeTripPlace('forest'));assert.deepEqual([...edit.state.library],libraryBefore);
 assert(!edit.updateTripDay('date','2028-02-30'));assert(!edit.updateTripDay('time','25:00'));
 assert(edit.updateTripDay('date','2028-02-29'));assert(edit.updateTripDay('time','09:30'));
 const restored=setup(lang,inline.storage).api;
 assert.deepEqual([...restored.state.board],['cafe','shop']);assert.equal(restored.state.date,'2028-02-29');assert.equal(restored.state.time,'09:30');

 const mapCheck=setup(lang),mapApi=mapCheck.api;
 const requestSnapshot={id:'MAP-REQUEST',requestType:'itinerary',days:[{date:'2099-01-01',time:'10:00',stops:[{id:'snapshot-only',name:'Original request stop',address:'Seoul',lat:37.544625,lng:127.0398444,duration:45}]},{date:'2099-01-02',time:'11:00',stops:[{id:'second-day',name:'Second day stop',lat:37.547097,lng:127.040925,duration:30}]}]};
 const snapshotBefore=JSON.stringify(requestSnapshot),tripBefore=JSON.stringify(mapApi.state.days);
 let requestMap=mapApi.requestItineraryMap(requestSnapshot);
 assert(requestMap.includes('Original request stop'));assert(requestMap.includes('quote-map-day'));assert(requestMap.includes('quote-map-focus'));assert(!requestMap.includes('data-action="add-day"'));
 assert.equal(mapApi.getMapPlaces()[0].id,'snapshot-only');
 mapApi.setQuoteMapDay(1);requestMap=mapApi.requestItineraryMap(requestSnapshot);
 assert(requestMap.includes('Second day stop'));assert.equal(mapApi.getMapPlaces()[0].id,'second-day');
 assert.equal(JSON.stringify(requestSnapshot),snapshotBefore);assert.equal(JSON.stringify(mapApi.state.days),tripBefore);
 assert(!mapApi.requestItineraryMap({requestType:'free',plan:'Custom course'}).includes('map-workspace'));
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
 for(const invalid of [{...card,source:'tourism'},{...card,placeId:''},{...card,placeId:undefined},{...card,lat:NaN},{...card,demoCoordinates:true},{...card,demoPreview:true}]){
  assert.equal(cards.pinEligible(invalid),false);
  assert.equal(cards.saveRecommendation(invalid),false);
  const before=plain(cards.state.library);cards.setPendingPlace(invalid);cards.saveAPIPlace();assert.deepEqual(plain(cards.state.library),before);
 }
 assert(cards.saveRecommendation(card));assert(cards.saveRecommendation(card));
 assert.equal(cards.state.library.filter(id=>id==='google-card').length,1);
 assert.deepEqual(plain(cards.state.board),originalBoard);
 const collection=cards.board();assert(collection.includes('Live place'));assert(!collection.includes('data-action="resolve-place"'));for(const id of cards.state.library)assert(collection.includes('data-id="'+id+'"'),'Existing saved places remain visible alongside new live results');
 const savedCard=cards.state.places.find(p=>p.id==='google-card');delete savedCard.lat;delete savedCard.lng;assert(cards.board().includes('Live place'),'Saved Google IDs remain visible while details reload');
 assert(!cards.saveRecommendation({...card,lat:null}));
 const calendar=setup(lang).api;
 assert(!calendar.pinEligible({source:'google',lat:35.1,lng:129.1}));assert(calendar.pinEligible({source:'google',placeId:'valid-id',lat:35.1,lng:129.1}));
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
 // Missing API configuration must never enable saving unconnected candidates.
 assert.equal(a.saveSelectedPlaces(['food']),false);
 assert(!a.state.library.includes('food'));
 assert(c.location.hash.includes('manual?resolve=food'));
 const food=a.state.places.find(p=>p.id==='food');
 Object.assign(food,{source:'google',placeId:'google-food',demoCoordinates:false,lat:37.5,lng:127});
 const button={dataset:{action:'save-places'}};
 c.handlers.click({target:{closest:s=>s==='[data-action]'?button:null},preventDefault(){}});
 assert(a.state.library.includes('food'));assert.deepEqual([...a.state.board],board);assert.deepEqual(plain(a.state.days),before);assert.equal(c.location.hash,'board');
 c.handlers.click({target:{closest:s=>s==='[data-action]'?button:null},preventDefault(){}});
 assert.equal(a.state.library.filter(id=>id==='food').length,1);
 // A result row saves only its own place and keeps the list open.
 a.state.library=a.state.library.filter(id=>id!=='food');c.location.hash='#results';
 const individual={setAttribute(){},dataset:{action:'save-result-place',id:'food'}};
 assert(a.results().includes('data-action="save-result-place"'));
 assert(!a.results().includes('bottomaction'));assert(a.results().includes('map-workspace'));assert(!a.results().includes('class="map-selected"'));assert.deepEqual(plain(a.getMapPlaces()).map(p=>p.id),plain(a.state.places).filter(p=>!p.recommended).map(p=>p.id));
 c.handlers.click({target:{closest:s=>s==='[data-action]'?individual:null},preventDefault(){}});
 assert(a.state.library.includes('food'));assert.equal(c.location.hash,'#results');
 assert.deepEqual([...a.state.board],board);assert.deepEqual(plain(a.state.days),before);
 c.handlers.click({target:{closest:s=>s==='[data-action]'?individual:null},preventDefault(){}});
 assert.equal(a.state.library.filter(id=>id==='food').length,1);
 assert(setup(lang,c.storage).api.state.library.includes('food'));
 const date=new Date(Date.now()+10*86400000).toISOString().slice(0,10);
 const fields={region:'Busan',date,time:'10:00',dayCount:'2',party:'2',notes:'Food and walks',language:'English',guideAck:'on',ack:'on'};
 c.location.hash='#request?mode=free';assert(a.request().includes('name="region"'));assert(a.request().includes('name="dayCount"'));
 for(const bad of [{region:''},{dayCount:'0'},{dayCount:'8'},{dayCount:'2.5'},{date:'invalid'},{date:'2020-01-01'},{time:'29:00'},{party:'100'},{party:'0'},{party:''},{guideAck:''},{ack:''}]){
  assert(a.submitTravelRequest({...fields,...bad},{free:true}).error,JSON.stringify(bad));assert.equal(a.state.request,null);
 }
 assert.equal(a.submitTravelRequest({...fields,party:'99'},{free:true}).route,'requested');assert.equal(a.state.request.party,99);
 const r=a.state.request;assert.equal(r.visibility,'approved_mates');assert.equal(r.requestType,'free');assert.equal(r.dayCount,2);assert.equal(r.stops.length,0);assert.equal(r.days.length,2);assert.notEqual(r.date,r.endDate);assert.deepEqual(plain(a.state.days),before);assert.deepEqual([...a.state.board],board);
 assert(a.requested().includes(r.endDate));assert(a.guideDesk().includes('Busan'));
 c.storage.set('reeltrip-mate-application-v1',JSON.stringify({status:'approved',fields:{regions:[{city:1,district:'all'}]}}));
 const unrelated={...plain(r),id:'other',region:'Tokyo',createdAt:r.createdAt+1};
 assert.equal(a.publicTravelRequests([unrelated,r])[0].id,r.id);
 assert.equal(a.publicTravelRequests([unrelated,r]).length,2);
 for(const status of ['draft','booked','cancelled','withdrawn'])assert.equal(a.publicTravelRequests([{...r,status}]).length,0);
 assert.equal(a.publicTravelRequests([{...r,visibility:'private'}]).length,0);
 assert.equal(a.publicTravelRequests([{...r,visibility:undefined}]).length,1);
 assert(!a.guideDesk().includes(fields.notes));

 const form=a.guideQuote();assert(form.includes('name="plan"'));assert(form.includes('name="amount"'));for(const field of ['hourlyRate','guideHours','extraGuestRate','reason','sender'])assert(!form.includes('name="'+field+'"'));
 for(const amount of [NaN,Infinity,-1,1.5])assert(!a.makeQuote(amount,'Day 1: Walk and cafe'));
 for(const amount of [0,1,99999,100001,14000500]){
  const sample=setup(lang).api;
  assert.equal(sample.submitTravelRequest(fields,{free:true}).route,'requested');
  assert(sample.makeQuote(amount,'Day 1: Walk and cafe'));
  assert.equal(sample.state.quote.amount,amount);
 }
 assert(!a.makeQuote(240000,' '));
 assert.equal(c.window.ReelRevenue.quoteAmount(2),480000);assert(c.window.ReelRevenue.calculator(2).includes('max="8"'));
 const id=r.id;assert(a.submitTravelRequest({...fields,party:'99'},{free:true}).error);assert.equal(a.state.request.party,99);assert.equal(a.state.request.id,id);
 assert(a.makeQuote(480000,'Day 1: Walk\nDay 2: Food','Custom route',{rate:60000,hours:8,extra:10000},'mina'));
 assert(a.makeQuote(420000,'Day 1: Food\nDay 2: Walk','Alternative route',{rate:60000,hours:7,extra:10000},'jun'));
 assert.equal(a.proposals().length,2);assert.equal(a.state.quote.pricing.hours,8);assert(!a.guideQuote().includes('id="quote-form"'));assert(!a.makeQuote(480000,'Changed itinerary',undefined,undefined,'mina'));assert.equal(a.state.quote.endDate,r.endDate);assert.equal(a.state.quote.dayCount,2);
 const room=a.ensureConversation(a.state.quote);assert.equal(room.endDate,r.endDate);
 assert(a.requestBooking('Traveler','guest@example.com'));assert.equal(a.state.booking.endDate,r.endDate);assert.equal(a.state.booking.requestType,'free');assert.equal(a.state.booking.feeAmount,42000);assert(a.booking().includes(r.endDate));
 // Reopening a selected proposal leads directly to its booking, never another mate's fee.
 assert(a.guideQuote().includes('href="#guide-desk"'));assert(!a.guideQuote().includes('href="#guide-fee"'));
 const selectedGuide=a.state.booking.guideId;a.state.booking.guideId='mina';
 assert(a.guideQuote().includes('href="#guide-fee"'));assert(a.guideQuote().includes(lang==='ko'?'예약 확정':'Confirm booking'));
 a.state.booking.status='confirmed';assert(a.guideQuote().includes('href="#guide-fee"'));assert(a.guideQuote().includes(lang==='ko'?'예약 보기':'View booking'));
 a.state.booking.status='awaiting_mate_fee';a.state.booking.guideId=selectedGuide;
 // Exercise real submit handlers without re-seeding between matching stages.
 const submit=(id,values)=>{const form=new c.HTMLFormElement();Object.assign(form,{id,values});c.handlers.submit({target:form,preventDefault(){}});};
 const chosen=a.state.quote;a.state.quote=a.state.proposals.find(q=>q.guideId!==chosen.guideId);assert(a.quote().includes('href="#booking"'));assert(!a.quote().includes('href="#checkout"'));a.state.quote=chosen;
 const agreed=plain(a.state.booking);c.window.ReelAccess.mode=()=> 'guide';
 assert(!a.confirmMateFee('failure'));assert.equal(a.state.booking.status,'awaiting_mate_fee');assert.equal(a.state.booking.feeStatus,'failed');
 submit('mate-fee-form',{terms:'on',outcome:'success'});assert.equal(c.location.hash,'guide-fee');assert.equal(a.state.booking.status,'confirmed');assert.equal(a.state.request.status,'booked');assert.equal(a.state.booking.feeAmount,agreed.feeAmount);
 assert(!a.confirmMateFee('success'),'must not charge confirmed booking twice');
 c.window.ReelAccess.mode=()=> 'customer';
 submit('cancel-form',{terms:'on',reason:'Change of travel plans'});assert.equal(c.location.hash,'booking');assert.equal(a.state.booking.status,'cancelled');assert.equal(a.state.request.status,'cancelled');assert.equal(a.state.booking.cancelReason,'Change of travel plans');
 // Pending requests cancel immediately without recording a paid fee.
 a.state.booking={...agreed};a.state.request.status='matching';submit('cancel-form',{terms:'on',reason:'Changed plans'});assert.equal(a.state.booking.status,'cancelled');assert.equal(a.state.booking.feeStatus,'void');assert.equal(a.state.request.status,'withdrawn');
 // Completed bookings keep chat and details but no review UI or submission.
 a.state.booking={...agreed,status:'completed'};
 const beforeReview=a.state.review;submit('review-form',{body:'Not supported'});
 assert.equal(a.state.review,beforeReview);assert(!a.booking().includes('href="#review"'));
 a.save();const reload=setup(lang,c.storage);assert.equal(reload.api.state.booking.dayCount,2);assert.equal(reload.api.state.request.region,'Busan');
 // A separate itinerary request includes both days and keeps each day's duration snapshot.
 const own=setup(lang),b=own.api;b.state.date=date;b.state.time='10:00';b.state.board=['forest'];b.stashDay();
 const end=new Date(Date.parse(date+'T12:00:00Z')+86400000).toISOString().slice(0,10);
 b.state.days.push({date:end,time:'11:00',ids:['cafe'],durations:{cafe:90}});
 assert.equal(b.submitTravelRequest({party:'2',guideAck:'on',ack:'on'}).route,'requested');
 assert.equal(b.state.request.dayCount,2);assert.equal(b.state.request.requestType,'itinerary');assert.equal(b.state.request.stops.length,2);assert.equal(b.state.request.days[1].stops[0].duration,90);
 b.state.places.find(p=>p.id==='cafe').duration=15;assert.equal(b.state.request.days[1].stops[0].duration,90);
 assert(!b.guideQuote().includes('name="plan"'));assert(b.makeQuote(undefined,'Do not replace the requested itinerary'));assert(!b.state.quote.plan.includes('Do not replace'));assert.equal(b.state.quote.amount,480000);assert(b.state.quote.plan.includes(end));

 // Creating and reopening trips preserves independent dates, stops and durations.
 const multi=setup(lang),m=multi.api;m.stashDay();m.state.places.find(p=>p.id==='forest').duration=90;m.save();const legacy=m.state.activeTripId;
 const firstTitle=m.state.title,firstDays=plain(m.state.days);
 assert(!m.createTrip({title:'',date,dayCount:'2',party:'2'}));assert.equal(m.state.trips.length,1);
 assert(m.createTrip({title:'Second trip',date,dayCount:'2'}));const second=m.state.activeTripId;
 assert.notEqual(legacy,second);assert.equal(m.state.board.length,0);assert.equal(m.state.days.length,2);assert.equal(m.state.party,2);
 m.state.board=['cafe'];m.state.places.find(p=>p.id==='cafe').duration=120;m.save();
 assert(m.selectTrip(legacy));assert.equal(m.state.title,firstTitle);assert.deepEqual(plain(m.state.days),firstDays);assert.equal(m.state.places.find(p=>p.id==='forest').duration,90);
 assert(m.selectTrip(second));assert.equal(m.state.title,'Second trip');assert.deepEqual([...m.state.board],['cafe']);assert.equal(m.state.places.find(p=>p.id==='cafe').duration,120);
 multi.location.hash='#trips';const list=m.trips();assert.equal((list.match(/data-action="open-trip"/g)||[]).length,2);assert(!list.includes('class="day-tabs"'));
 multi.location.hash='#request';const picker=m.request();assert.equal((picker.match(/data-action="request-trip"/g)||[]).length,2);assert(!picker.includes('id="request-form"'));
 multi.location.hash='#request?trip='+encodeURIComponent(legacy);assert(m.request().includes('id="request-form"'));assert.equal(m.state.activeTripId,legacy);
 assert(m.request().includes('name="tripId" value="'+legacy+'"'));
 multi.location.hash='#request?trip=missing';assert(!m.request().includes('id="request-form"'));
 multi.location.hash='#request?trip='+encodeURIComponent(second);assert(m.request().includes('Second trip'));assert.equal(m.state.activeTripId,second);
 m.save();const reopened=setup(lang,multi.storage).api;assert.equal(reopened.state.trips.length,2);assert(reopened.selectTrip(legacy));assert.equal(reopened.state.title,firstTitle);

 // Date changes preserve notes and stops.
 assert(m.selectTrip(second));m.state.days[0].notes=['Bring the booking reference'];
 const newDate=new Date(Date.parse(date+'T12:00:00Z')+3*86400000).toISOString().slice(0,10);
 assert(m.updateTripInfo({title:'Renamed trip',date:newDate}));assert.equal(m.state.days[0].date,newDate);assert.equal(m.state.days[0].notes[0],'Bring the booking reference');assert.deepEqual([...m.state.board],['cafe']);
 assert(m.addTripPlace('forest'),'Saved places add directly without a Google reconnect step');assert(!m.addTripPlace('forest'));assert(!m.addTripPlace('unknown'));assert(m.addTripPlace('n-seoul-tower'));assert(!m.addTripPlace('n-seoul-tower'));assert(m.state.days[m.state.day].ids.includes('n-seoul-tower'));assert(!m.pinEligible(m.state.places.find(p=>p.id==='n-seoul-tower')),'Adding a prototype stop must not claim verified Google coordinates');
 assert(m.selectTrip(legacy));assert(!(m.state.days[0].notes||[]).length);assert(m.selectTrip(second));assert.equal(m.state.days[0].notes[0],'Bring the booking reference');
 const persisted=setup(lang,multi.storage).api;assert.equal(persisted.state.days[0].notes[0],'Bring the booking reference');
 console.log(`PASS: ${lang} save-only collection, free/itinerary requests, validation, two-day pricing, proposal comparison, booking snapshots, fee retry/confirmation, cancellation, no review UI and reload.`);
}

(async()=>{const c=setup('ko');const waiting=[];c.window.ReelPlaceAPI={search:()=>new Promise((resolve,reject)=>waiting.push({resolve,reject}))};
 const first=c.api.loadRecommendations('Seoul',true),second=c.api.loadRecommendations('Busan',true);
 waiting[1].resolve([{id:'busan',source:'google',placeId:'busan',lat:35,lng:129}]);await second;
 waiting[0].resolve([{id:'seoul',source:'google',placeId:'seoul',lat:37,lng:127}]);await first;
 assert.equal(c.api.getRecommendations().rows[0].id,'busan');
 const fail=c.api.loadRecommendations('Failure',true);waiting[2].reject(Error('network'));await fail;assert.equal(c.api.getRecommendations().status,'error');
 console.log('PASS: discovery latest-query wins, failed requests are retryable, save deduplicates without changing itinerary.');
})().catch(e=>{console.error(e);process.exitCode=1;});

// Recovery must preserve alternatives and never accept a late payment.
for(const lang of ['ko','en']){
 const c=setup(lang),a=c.api;
 const date=new Date(Date.now()+5*86400000).toISOString().slice(0,10);
 const fields={region:'Busan',date,time:'10:00',dayCount:'2',party:'2',guideAck:'on',ack:'on'};
 a.submitTravelRequest(fields,{free:true});
 a.state.unavailableDates=[a.state.request.endDate];
 assert(a.requestAvailable(),'Legacy blackout settings no longer block proposals');
 a.state.bookingHistory=[{status:'confirmed',date:a.state.request.endDate,endDate:a.state.request.endDate}];
 assert(!a.requestAvailable());assert(!a.makeQuote(240000,'Day 1: Walk and cafe'));
 a.state.bookingHistory=[];
 a.state.unavailableDates=[];
 assert(a.makeQuote(240000,'Day 1: Walk and cafe',undefined,undefined,'mina'));
 assert(a.makeQuote(260000,'Day 1: Walk and food',undefined,undefined,'jun'));
 assert(a.requestBooking('Traveler','guest@example.com'));
 const deadline=a.state.booking.feeDeadline;assert(deadline>Date.now());
 const selected=a.state.booking.guideId;
 a.state.booking.feeDeadline=Date.now()-1;
 c.window.ReelAccess.mode=()=> 'guide';assert(!a.confirmMateFee('success'));
 assert.equal(a.state.bookingHistory.at(-1).status,'cancelled');assert.equal(a.state.bookingHistory.at(-1).feeStatus,'void');
 assert(!a.reopenMatching(),'Already automatically reopened');
 c.window.ReelAccess.mode=()=> 'customer';
 assert.equal(a.state.booking,null);assert.equal(a.state.bookingHistory.length,1);
 assert.equal(a.state.request.status,'quoted');
 const alternative=a.proposals().find(q=>q.guideId!==selected);
 assert(alternative.expires>Date.now());a.state.quote=alternative;assert(a.requestBooking('Traveler','guest@example.com'));
 c.window.ReelAccess.mode=()=> 'guide';assert(a.confirmMateFee('success'));
 assert(!a.guideFee().includes('data-action="mate-cash"'));
 assert(a.guideFee().includes('href="#guide-activity?cancel=1"'));
 {const originalHash=c.location.hash,originalStatus=a.state.booking.status;
 for(const [status,param] of [['awaiting_mate_fee','decline'],['confirmed','cancel']]){
  a.state.booking.status=status;c.location.hash='#guide-activity?'+param+'=1';
  const html=a.guideActivity();assert(html.includes('id="mate-cancel-form"'));
  assert(!html.includes('rt-segmented-tabs'));assert(!html.includes('rt-filter-chips'));
  assert(html.includes('href="#guide-fee"'));assert(html.includes('name="reason"'));
 }
 a.state.booking.status=originalStatus;c.location.hash=originalHash;
 assert(!a.guideActivity().includes('id="mate-cancel-form"'));
 }
 assert(a.guideActivity().includes('href="#guide-fee?request='));
 {const activityHash=c.location.hash;
 c.location.hash='#guide-activity?tab=sent';
 assert(a.guideActivity().includes('aria-current="page">'+(lang==='en'?'Sent proposal':'보낸 제안')));
 assert(!a.guideActivity().includes('href="#guide-fee?request='));
 c.location.hash='#guide-activity?tab=bookings';
 assert(a.guideActivity().includes('href="#guide-fee?request='));
 c.location.hash=activityHash;}

 assert(a.guideActivity().includes('href="#guide-fee?request='));
 {const activityHash=c.location.hash;
 c.location.hash='#guide-activity?tab=sent';
 assert(a.guideActivity().includes('aria-current="page">'+(lang==='en'?'Sent proposal':'보낸 제안')));
 assert(!a.guideActivity().includes('href="#guide-fee?request='));
 c.location.hash='#guide-activity?tab=bookings';
 assert(a.guideActivity().includes('href="#guide-fee?request='));
 c.location.hash=activityHash;}

 c.location.hash='#guide-activity';const nav=a.layout('content');assert(nav.includes('href="#guide-activity" class="active"'));assert(!nav.match(/<nav class="mobiletabs"[^]*href="#guide-earnings"/));
 const submit=(id,values)=>{const form=new c.HTMLFormElement();Object.assign(form,{id,values});c.handlers.submit({target:form,preventDefault(){}});};
 submit('mate-progress-form',{kind:'mate-complete',ack:'on'});assert.equal(a.state.booking.status,'confirmed','Cannot complete a future trip');
 const cashStatus=a.state.booking.cashStatus;
 submit('mate-progress-form',{kind:'mate-cash',ack:'on'});assert.equal(a.state.booking.cashStatus,cashStatus);assert.equal(a.state.booking.status,'confirmed');
 submit('mate-cancel-form',{reason:'Cannot attend'});assert.equal(a.state.booking.status,'cancelled');assert.equal(a.state.request.status,'cancelled');assert.equal(a.state.booking.refundStatus,'not_eligible');assert.equal(a.state.booking.feeStatus,'paid');
 assert.equal(a.state.booking.status,'cancelled');assert.equal(a.state.booking.refundStatus,'not_eligible');assert.equal(a.state.booking.feeStatus,'paid');
 const reload=setup(lang,c.storage);assert.equal(reload.api.state.bookingHistory.length,1);assert.equal(reload.api.state.booking.refundStatus,'not_eligible');
 console.log('PASS '+lang+': expiry, alternative selection, date availability, activity navigation, no cash confirmation and refund separation.');
}

for(const lang of ['ko','en']){
 const c=setup(lang),a=c.api;
 c.window.ReelAccess.mode=()=> 'guide';
 const b={id:'RT-MANY-2',requestId:'RQ-MANY-2',guideId:'mina',status:'awaiting_mate_fee',feeStatus:'pending',date:'2099-01-01',endDate:'2099-01-01',time:'13:00',feeDeadline:Date.now()+3600000,amount:220000,feeAmount:22000,plan:[]};
 a.state.bookingHistory=[b];a.restoreSampleBookingContexts();a.restoreSampleBookingContexts();
 assert.equal(a.state.matchingContexts.length,1);assert.equal(a.state.bookingHistory.length,0);
 const card=a.mateBookingCard(b);
 assert(card.includes('href="#guide-fee?request=RQ-MANY-2"'));
 assert(card.includes(lang==='ko'?'예약 확정':'Confirm booking'));
 assert(!card.includes(' disabled'));assert(!card.includes('rt-booking-actions'));
 assert(a.activateMatching(b.requestId));assert(a.confirmMateFee('success'));
 assert.equal(a.state.booking.status,'confirmed');assert.equal(a.state.request.status,'booked');
 console.log(`PASS: ${lang} pending sample shares booking actions and fee confirmation flow.`);
}

for(const lang of ['ko','en']){
 const a=setup(lang).api;
 for(const filter of ['upcoming','pending','history','invalid']){
  const html=a.mateBookingList([],new URLSearchParams({filter}));
  const selected=filter==='invalid'?'upcoming':filter;
  assert(html.includes('filter='+selected+'" aria-current="page"'));
  assert(html.includes('rt-empty-card'));
  assert(!html.includes(lang==='ko'?'여행을 함께해요!':'Let’s travel together!'));
 }
 assert(a.mateBookingList([],new URLSearchParams()).includes('filter=upcoming" aria-current="page"'));
 console.log(`PASS: ${lang} booking filters default, fallback and empty states.`);
}
