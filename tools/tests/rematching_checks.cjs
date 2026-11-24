// Both matching entry paths preserve the original trip and carry full dates through booking.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=__dirname+'/../../src/';
function setup(lang,storage=new Map()){
 const handlers={},toast={textContent:'',classList:{add(){},remove(){}}};
 const ctx={HTMLFormElement:class{},FormData:class{constructor(form){return Object.entries(form.values);}},URLSearchParams,Event:class{},sessionStorage:{getItem:()=> 'yes'},location:{hash:'#results',search:''},document:{documentElement:{lang},body:{dataset:{},classList:{add(){}}},querySelector:s=>s==='#toast'?toast:s==='#dialog'?{close(){}}:s==='#app'?{innerHTML:''}:null,querySelectorAll:()=>[],addEventListener:(n,fn)=>handlers[n]=fn},window:{ReelBookingTools:{widget:()=>''},ReelGoogleMap:{mount(){},valid:p=>Number.isFinite(p.lat)&&Number.isFinite(p.lng)},addEventListener(){},dispatchEvent(){}},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},setTimeout:()=>0,clearTimeout(){}};
 vm.createContext(ctx);
 for(const file of ['assets/nickname-bases.js','assets/signup-copy.js','assets/access.js',`assets/catalog${lang==='en'?'.en':''}.js`,'assets/revenue.js'])vm.runInContext(fs.readFileSync(root+file,'utf8'),ctx);
 const code=fs.readFileSync(root+`assets/app${lang==='en'?'.en':''}.js`,'utf8').split('window.ReelBookingTools.init(')[0];
 vm.runInContext(code+'globalThis.api={results,requestItineraryMap,getMapPlaces:()=>mapPlaces,setQuoteMapDay:n=>quoteMapDay=n,publicTravelRequests,publicRequestMatch,expireMateFee,reopenMatching,guideActivity,guideFee,requestAvailable,layout,board,saveSelectedPlaces,saveRecommendation,loadRecommendations,getRecommendations:()=>({rows:recommendationRows,status:recommendationStatus}),saveAPIPlace,setPendingPlace:p=>pendingAPIPlace=p,pinEligible,tripRangeDays,chooseTripDate,setTripDraft:v=>tripDraft=v,getTripDraft:()=>tripDraft,moveTripPlace,removeTripPlace,updateTripDay,updateTripInfo,addTripPlace,createTrip,selectTrip,trips,tripDetailRoute,state,stashDay,submitTravelRequest,request,makeQuote,proposals,requestBooking,confirmMateFee,quote,requested,guideDesk,guideQuote,booking,save,ensureConversation};})();',ctx);
 ctx.window.ReelRevenue.init({state:()=>ctx.api.state,save:ctx.api.save});
 return {...ctx,handlers,storage};
}
// Manual decline and timeout reopen the same request without traveler action.
for(const lang of ['ko','en'])for(const reason of ['declined','expired'])for(const past of [false,true]){
 const c=setup(lang),a=c.api,date=new Date(Date.now()+5*86400000).toISOString().slice(0,10);
 a.submitTravelRequest({region:'Busan',date,time:'10:00',dayCount:'2',party:'2',guideAck:'on',ack:'on'},{free:true});
 a.makeQuote(240000,'Day 1: Walk and cafe',undefined,undefined,'jun');
 a.makeQuote(260000,'Day 1: Walk and food',undefined,undefined,'mina');
 assert(a.requestBooking('Traveler','guest@example.com'));
 c.location.hash='#guide-activity?tab=bookings&filter=pending';
 for(const html of [a.guideActivity(),a.guideQuote(),a.guideFee()]){
  assert(html.includes('href="#guide-activity?decline=1"'),'Pending mate screen exposes decline');
  assert(html.includes(lang==='ko'?'진행 불가':'Unable to proceed'));
 }
 assert(a.guideFee().includes(lang==='ko'?'결제하고 예약 확정':'Pay & confirm booking'));
 const requestId=a.state.request.id,alternative=a.proposals().find(q=>q.guideId==='jun'),expires=alternative.expires;
 if(past){a.state.request.date='2000-01-01';a.state.booking.date='2000-01-01';}
 c.window.ReelAccess.mode=()=> 'guide';
 if(reason==='expired'){a.state.booking.feeDeadline=Date.now()-1;assert(a.expireMateFee());assert(!a.expireMateFee());}
 else if(past){a.state.booking.feeDeadline=Date.now()-1; a.expireMateFee();}
 else {const form=new c.HTMLFormElement();Object.assign(form,{id:'mate-cancel-form',values:{reason:'Cannot attend'}});c.handlers.submit({target:form,preventDefault(){}});}
 assert.equal(a.state.request.id,requestId);assert.equal(a.state.request.rematchReason,past?'expired':reason);
 assert.equal(a.proposals().find(q=>q.guideId==='jun').expires,expires);
 assert(!a.confirmMateFee('success'),'Cancelled selection cannot be paid');
 if(past){assert.equal(a.state.request.status,'withdrawn');assert.equal(a.state.booking.status,'cancelled');assert(a.booking().includes(lang==='ko'?'일정을 변경해':'Change your dates'));}
 else{
  assert.equal(a.state.booking,null);assert.equal(a.state.request.status,'quoted');assert.equal(a.state.bookingHistory.length,1);
  assert(a.proposals().find(q=>q.guideId==='mina').expires<=Date.now());
  assert(a.requested().includes(lang==='ko'?'다른 메이트의 제안을 선택':'select another mate'));
  assert(a.booking().includes(lang==='ko'?'다른 메이트의 제안을 선택':'select another mate'));
  const restored=setup(lang,c.storage).api;assert.equal(restored.state.booking,null);assert.equal(restored.state.request.status,'quoted');
  c.window.ReelAccess.mode=()=> 'customer';a.state.quote=alternative;assert(a.requestBooking('Traveler','guest@example.com'));assert(!a.state.request.rematchReason);
 }
}
console.log('PASS: automatic rematching after decline/expiry, alternative selection, persistence and past-trip guard in both languages.');
for(const lang of ['ko','en']){
 const c=setup(lang),a=c.api,date=new Date(Date.now()+5*86400000).toISOString().slice(0,10);
 a.submitTravelRequest({region:'Busan',date,time:'10:00',dayCount:'2',party:'2',guideAck:'on',ack:'on'},{free:true});
 a.makeQuote(240000,'Day 1: Walk and cafe',undefined,undefined,'mina');assert(a.requestBooking('Traveler','guest@example.com'));
 a.state.booking.feeDeadline=Date.now()-1;a.expireMateFee();assert.equal(a.state.request.status,'requested');
 assert(a.makeQuote(250000,'Day 1: New walk and cafe',undefined,undefined,'jun'),'Fresh proposals accepted after reopening');
 assert.equal(a.state.request.status,'quoted');
}
console.log('PASS: no remaining offers returns to requested and accepts new proposals.');
