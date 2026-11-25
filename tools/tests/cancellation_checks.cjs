// Both matching entry paths preserve the original trip and carry full dates through booking.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=__dirname+'/../../src/';
function setup(lang,storage=new Map()){
 const handlers={},toast={textContent:'',classList:{add(){},remove(){}}};
 const ctx={HTMLFormElement:class{},FormData:class{constructor(form){return Object.entries(form.values);}},URLSearchParams,Event:class{},sessionStorage:{getItem:()=> 'yes'},location:{hash:'#results',search:''},document:{documentElement:{lang},body:{dataset:{},classList:{add(){}}},querySelector:s=>s==='#toast'?toast:s==='#dialog'?{close(){}}:s==='#app'?{innerHTML:''}:null,querySelectorAll:()=>[],addEventListener:(n,fn)=>handlers[n]=fn},window:{ReelBookingTools:{widget:()=>''},ReelGoogleMap:{mount(){},valid:p=>Number.isFinite(p.lat)&&Number.isFinite(p.lng)},addEventListener(){},dispatchEvent(){}},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},setTimeout:()=>0,clearTimeout(){}};
 vm.createContext(ctx);
 for(const file of ['assets/nickname-bases.js','assets/signup-copy.js','assets/access.js',`assets/catalog${lang==='en'?'.en':''}.js`,'assets/revenue.js'])vm.runInContext(fs.readFileSync(root+file,'utf8'),ctx);
 const code=fs.readFileSync(root+`assets/app${lang==='en'?'.en':''}.js`,'utf8').split('window.ReelBookingTools.init(')[0];
 vm.runInContext(code+'globalThis.api={results,requestItineraryMap,getMapPlaces:()=>mapPlaces,setQuoteMapDay:n=>quoteMapDay=n,publicTravelRequests,publicRequestMatch,expireMateFee,reopenMatching,guideActivity,guideFee,requestAvailable,layout,board,saveSelectedPlaces,saveRecommendation,loadRecommendations,getRecommendations:()=>({rows:recommendationRows,status:recommendationStatus}),saveAPIPlace,setPendingPlace:p=>pendingAPIPlace=p,pinEligible,tripRangeDays,chooseTripDate,setTripDraft:v=>tripDraft=v,getTripDraft:()=>tripDraft,moveTripPlace,removeTripPlace,updateTripDay,updateTripInfo,addTripPlace,createTrip,selectTrip,trips,tripDetailRoute,state,conversationOpen,stashDay,submitTravelRequest,request,makeQuote,proposals,requestBooking,confirmMateFee,quote,requested,guideDesk,guideQuote,booking,save,ensureConversation};})();',ctx);
 ctx.window.ReelRevenue.init({state:()=>ctx.api.state,save:ctx.api.save});
 return {...ctx,handlers,storage};
}

for(const lang of ['ko','en'])for(const mode of ['customer','guide']){
 const c=setup(lang),a=c.api;c.window.ReelAccess.mode=()=>mode;
 const submit=()=>{const form=new c.HTMLFormElement();Object.assign(form,{id:mode==='guide'?'mate-cancel-form':'cancel-form',values:{terms:'on',reason:'Changed plans'}});c.handlers.submit({target:form,preventDefault(){}});};
 for(const status of ['confirmed','awaiting_mate_fee']){
  a.state.request={id:'cancel-request',status:'booked'};
  a.state.booking={id:'cancel-booking',requestId:'cancel-request',guideId:'mina',guide:'Mina',customer:'Traveler',date:'2099-01-01',endDate:'2099-01-01',status,feeStatus:status==='confirmed'?'paid':'pending',feeAmount:21000,policyVersion:'CASH-MATCH-10-V1'};
  const room=a.ensureConversation(a.state.booking);room.mutualConsent=true;room.messages=[{sender:'guide',text:'Hello'}];
  if(status==='confirmed')assert(a.conversationOpen(room));
  submit();assert.equal(a.state.booking.status,'cancelled');assert.equal(a.state.request.status,status==='confirmed'?'cancelled':'withdrawn');
  assert.equal(a.state.booking.feeStatus,status==='confirmed'?'paid':'void');
  if(status==='confirmed')assert.equal(a.state.booking.refundStatus,mode==='guide'?'not_eligible':'completed');
  assert(!a.conversationOpen(room),'Cancellation closes chat immediately');
  const snapshot=JSON.stringify(a.state.booking);submit();assert.equal(JSON.stringify(a.state.booking),snapshot);
  assert.equal(setup(lang,c.storage).api.state.booking.status,'cancelled');
 }
 // Existing browser data and history migrate, while paid fees remain separate.
 a.state.booking.status='cancellation_requested';a.state.booking.feeStatus='paid';a.state.request.status='booked';
 const previousRefund=a.state.booking.refundStatus;
 a.state.bookingHistory=[{...a.state.booking,id:'old-cancel',refundStatus:'none'}];a.save();
 const migrated=setup(lang,c.storage).api;
 assert.equal(migrated.state.booking.status,'cancelled');assert.equal(migrated.state.request.status,'cancelled');
 assert.equal(migrated.state.bookingHistory[0].status,'cancelled');assert.equal(migrated.state.booking.refundStatus,(!previousRefund||previousRefund==='none')?'review':previousRefund);assert.equal(migrated.state.bookingHistory[0].refundStatus,'review');assert.equal(migrated.state.booking.feeStatus,'paid');
 console.log(`PASS: ${lang} ${mode} immediate cancellation, chat closure, fee separation, repeat submission and legacy migration.`);
}
