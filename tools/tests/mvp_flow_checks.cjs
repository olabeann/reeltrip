// Both matching entry paths preserve the original trip and carry full dates through booking.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=__dirname+'/../../src/';
function setup(lang,storage=new Map()){
 const handlers={},toast={textContent:'',classList:{add(){},remove(){}}};
 const ctx={HTMLFormElement:class{},FormData:class{constructor(form){return Object.entries(form.values);}},URLSearchParams,Event:class{},sessionStorage:{getItem:()=> 'yes'},location:{hash:'#results',search:''},document:{documentElement:{lang},body:{dataset:{},classList:{add(){}}},querySelector:s=>s==='#toast'?toast:s==='#dialog'?{close(){}}:s==='#app'?{innerHTML:''}:null,querySelectorAll:()=>[],addEventListener:(n,fn)=>handlers[n]=fn},window:{ReelBookingTools:{widget:()=>''},ReelGoogleMap:{mount(){},valid:p=>Number.isFinite(p.lat)&&Number.isFinite(p.lng)},addEventListener(){},dispatchEvent(){}},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},setTimeout:()=>0,clearTimeout(){}};
 vm.createContext(ctx);
 for(const file of ['assets/nickname-bases.js','assets/signup-copy.js','assets/access.js',`assets/catalog${lang==='en'?'.en':''}.js`,'assets/revenue.js'])vm.runInContext(fs.readFileSync(root+file,'utf8'),ctx);
 const code=fs.readFileSync(root+`assets/app${lang==='en'?'.en':''}.js`,'utf8').split('window.ReelBookingTools.init(')[0];
 vm.runInContext(code+'globalThis.api={mateProposalStatus,mateBookingCard,checkout,chatContext,syncConversations,messages,chat,sendChatMessage,mateFeeActions,displayedBooking,mateEmailAction,mateApplication,saveMate,storeSupport,matchingContexts,activateMatching,allBookings,mateConflict,proposalSelectable,canCancelBooking,cancelBooking,withdrawProposal,saveOperationsBooking,withdrawalBlocked,conversationOpen,expireAllMateFees,mateEmailVerified,validEmail,matchingPicker,results,requestItineraryMap,getMapPlaces:()=>mapPlaces,setQuoteMapDay:n=>quoteMapDay=n,publicTravelRequests,publicRequestMatch,expireMateFee,reopenMatching,guideActivity,guideFee,requestAvailable,layout,board,saveSelectedPlaces,saveRecommendation,loadRecommendations,getRecommendations:()=>({rows:recommendationRows,status:recommendationStatus}),saveAPIPlace,setPendingPlace:p=>pendingAPIPlace=p,pinEligible,tripRangeDays,chooseTripDate,setTripDraft:v=>tripDraft=v,getTripDraft:()=>tripDraft,moveTripPlace,removeTripPlace,updateTripDay,updateTripInfo,addTripPlace,createTrip,selectTrip,trips,tripDetailRoute,state,quiet:()=>{render=()=>{};toast=()=>{};},stashDay,submitTravelRequest,request,makeQuote,proposals,requestBooking,confirmMateFee,quote,requested,guideDesk,guideQuote,booking,save,ensureConversation};})();',ctx);
 ctx.window.ReelRevenue.init({state:()=>ctx.api.state,save:ctx.api.save});
 return {...ctx,handlers,storage};
}


for(const lang of ['ko','en']){
 const c=setup(lang),a=c.api;a.quiet();
 const request=offset=>a.submitTravelRequest({region:'Busan',date:new Date(Date.now()+offset*86400000).toISOString().slice(0,10),time:'10:00',dayCount:'1',party:'2',guideAck:'on',ack:'on'},{free:true});
 const book=()=>{assert(a.makeQuote(120000,'A walk and a cafe',undefined,undefined,'mina'));assert(a.requestBooking('Traveler','t@example.com'));return a.state.booking;};
 request(10);const first=book();c.window.ReelAccess.mode=()=> 'guide';assert(a.confirmMateFee('success'));c.window.ReelAccess.mode=()=> 'customer';
 c.location.hash='#messages';assert(a.messages().includes('chat?thread='),'Confirmed empty chat is visible to traveler');
 c.location.hash='#chat';assert.equal(a.chatContext().booking.id,first.id);assert(a.sendChatMessage('Only first booking'));
 request(20);const second=book();const secondRequest=a.state.request.id;
 a.activateMatching(first.requestId);assert(!a.mateFeeActions(second).includes('disabled'),'Another real pending booking must remain actionable');assert(a.mateFeeActions(second).includes(encodeURIComponent(secondRequest)));
 a.activateMatching(secondRequest);c.window.ReelAccess.mode=()=> 'guide';assert(a.confirmMateFee('success'));c.window.ReelAccess.mode=()=> 'customer';c.location.hash='#chat';
 assert.equal(a.chatContext().booking.id,second.id);assert.equal(a.chatContext().messages.length,0);assert(a.sendChatMessage('Only second booking'));
 const rooms=a.syncConversations(),firstRoom=rooms.find(r=>r.bookingId===first.id);assert.equal(firstRoom.messages.length,1);assert.equal(firstRoom.messages[0].text,'Only first booking');
 c.location.hash='#chat?thread='+encodeURIComponent(firstRoom.id);assert(a.chat().includes('booking?record='+encodeURIComponent(first.id)),'Chat points back to its own booking');assert.equal(a.chatContext().booking.id,first.id);
 assert(a.sendChatMessage('Older chat reply'));assert(!a.state.messages.some(m=>m.text==='Older chat reply'),'Old chat cannot overwrite active legacy message array');
 c.location.hash='#booking?record='+encodeURIComponent(first.id);assert.equal(a.displayedBooking().id,first.id);assert(a.booking().includes('chat?thread='+encodeURIComponent(firstRoom.id)));
 // Legacy history must not import the active booking messages or current request ID.
 a.state.bookingHistory=[{...first,id:'legacy-other',requestId:undefined,guideId:'jun',status:'cancelled'}];const old=a.syncConversations().find(r=>r.bookingId==='legacy-other');assert.equal(old.messages.length,0);assert.equal(old.requestId,'legacy-other');
 // Selecting any mate closes withdrawal of all other proposals on that request.
 a.activateMatching(secondRequest);a.state.proposals.push({...a.state.quote,id:'other-offer',guideId:'mina'});c.window.ReelAccess.mode=()=> 'guide';assert(!a.withdrawProposal('other-offer'));assert.equal(a.state.request.status,'booked');
 c.location.hash='#booking';a.state.booking.refundStatus='completed';assert(a.booking().includes(lang==='ko'?'반환 완료':'Refund completed'),'Traveler sees the final refund state');

 // Terminal bookings remain read-only in active and historical detail routes.
 for(const status of ['completed','cancelled']){
  a.state.booking.status=status;a.state.booking.feeStatus=status==='cancelled'?'void':'paid';
  for(const hash of ['#booking','#booking?record='+encodeURIComponent(first.id)]){
   first.status=status;first.feeStatus='paid';c.location.hash=hash;
   const html=a.booking();assert(!html.includes('meeting-card'));assert(!html.includes('chat?thread='));
   assert(!html.includes('href="#cancel"'));assert(!html.includes('data-action="reopen-matching"'));
   assert(html.includes(lang==='ko'?'약속한 여행 금액':'Agreed trip price'));
  }
  c.location.hash='#guide-fee';const mate=a.guideFee();
  assert(!mate.includes('id="mate-fee-form"'));assert(!mate.includes('chat?thread='));
  assert(!mate.includes('data-action="mate-complete"'));assert(!mate.includes('cancel=1'));
  assert.equal(a.mateFeeActions(a.state.booking),'');
 }
 console.log('PASS '+lang+': traveler empty chats, exact booking/chat navigation, inactive payment actions, legacy isolation, withdrawal guard and refund status display.');
}

for(const lang of ['ko','en']){
 const c=setup(lang),a=c.api;a.quiet();
 const date=new Date(Date.now()+10*86400000).toISOString().slice(0,10);
 a.submitTravelRequest({region:'Busan',date,time:'10:00',dayCount:'1',party:'2',guideAck:'on',ack:'on'},{free:true});
 a.makeQuote(120000,'A walk and a cafe',undefined,undefined,'mina');
 const q=a.state.quote;q.expires=Date.now()-1;q.activityStatus='waiting';
 assert.equal(a.mateProposalStatus(q),'expired');assert(!a.quote().includes('href="#checkout"'));assert(!a.checkout().includes('id="checkout-form"'));
 c.location.hash='#guide-activity?proposal='+encodeURIComponent(q.id);
 const detail=a.guideActivity();assert(!detail.includes('withdraw-proposal'));assert(detail.includes(lang==='ko'?'제안 일정':'Proposed itinerary'));
 q.expires=Date.now()+86400000;delete q.activityStatus;assert(a.requestBooking('Traveler','t@example.com'));
 for(const feeStatus of ['pending','failed']){
  a.state.booking.feeStatus=feeStatus;c.location.hash='#guide-fee';
  const html=a.guideFee();assert(html.includes('id="mate-fee-form"'));assert(!html.includes('chat?thread='));assert(!html.includes('data-action="mate-complete"'));
  assert(!a.booking().includes('meeting-card'));
  if(feeStatus==='failed'){
   const card=a.mateBookingCard(a.state.booking);assert(card.includes(lang==='ko'?'수수료 결제 실패':'Fee payment failed'));assert(card.includes(lang==='ko'?'다시 결제하기':'Retry payment'));
  }
 }
 console.log('PASS '+lang+': pending/failed payment actions and expired proposal status, detail and checkout guards.');
}
