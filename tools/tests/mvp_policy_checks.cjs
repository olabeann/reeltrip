// Both matching entry paths preserve the original trip and carry full dates through booking.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=__dirname+'/../../src/';
function setup(lang,storage=new Map()){
 const handlers={},toast={textContent:'',classList:{add(){},remove(){}}};
 const ctx={HTMLFormElement:class{},FormData:class{constructor(form){return Object.entries(form.values);}},URLSearchParams,Event:class{},sessionStorage:{getItem:()=> 'yes'},location:{hash:'#results',search:''},document:{documentElement:{lang},body:{dataset:{},classList:{add(){}}},querySelector:s=>s==='#toast'?toast:s==='#dialog'?{close(){}}:s==='#app'?{innerHTML:''}:null,querySelectorAll:()=>[],addEventListener:(n,fn)=>handlers[n]=fn},window:{ReelBookingTools:{widget:()=>''},ReelGoogleMap:{mount(){},valid:p=>Number.isFinite(p.lat)&&Number.isFinite(p.lng)},addEventListener(){},dispatchEvent(){}},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},setTimeout:()=>0,clearTimeout(){}};
 vm.createContext(ctx);
 for(const file of ['assets/nickname-bases.js','assets/signup-copy.js','assets/access.js',`assets/catalog${lang==='en'?'.en':''}.js`,'assets/revenue.js'])vm.runInContext(fs.readFileSync(root+file,'utf8'),ctx);
 const code=fs.readFileSync(root+`assets/app${lang==='en'?'.en':''}.js`,'utf8').split('window.ReelBookingTools.init(')[0];
 vm.runInContext(code+'globalThis.api={mateEmailAction,mateApplication,saveMate,storeSupport,matchingContexts,activateMatching,allBookings,mateConflict,proposalSelectable,canCancelBooking,cancelBooking,withdrawProposal,saveOperationsBooking,withdrawalBlocked,conversationOpen,expireAllMateFees,mateEmailVerified,validEmail,matchingPicker,results,requestItineraryMap,getMapPlaces:()=>mapPlaces,setQuoteMapDay:n=>quoteMapDay=n,publicTravelRequests,publicRequestMatch,expireMateFee,reopenMatching,guideActivity,guideFee,requestAvailable,layout,board,saveSelectedPlaces,saveRecommendation,loadRecommendations,getRecommendations:()=>({rows:recommendationRows,status:recommendationStatus}),saveAPIPlace,setPendingPlace:p=>pendingAPIPlace=p,pinEligible,tripRangeDays,chooseTripDate,setTripDraft:v=>tripDraft=v,getTripDraft:()=>tripDraft,moveTripPlace,removeTripPlace,updateTripDay,updateTripInfo,addTripPlace,createTrip,selectTrip,trips,tripDetailRoute,state,quiet:()=>{render=()=>{};toast=()=>{};},stashDay,submitTravelRequest,request,makeQuote,proposals,requestBooking,confirmMateFee,quote,requested,guideDesk,guideQuote,booking,save,ensureConversation};})();',ctx);
 ctx.window.ReelRevenue.init({state:()=>ctx.api.state,save:ctx.api.save});
 return {...ctx,handlers,storage};
}

for(const lang of ['ko','en']){
 const c=setup(lang),a=c.api;a.quiet();const date=new Date(Date.now()+10*86400000).toISOString().slice(0,10),later=new Date(Date.now()+20*86400000).toISOString().slice(0,10);
 const request=day=>a.submitTravelRequest({region:'Busan',date:day,time:'10:00',dayCount:'2',party:'2',guideAck:'on',ack:'on'},{free:true});
 assert.equal(request(date).route,'requested');const first=a.state.request.id;
 assert(request(date).error,'Overlapping traveler request rejected');
 assert(a.makeQuote(600000,'A full two day walk',undefined,undefined,'mina'));
 assert(a.requestBooking('Traveler','t@example.com'));const firstBooking=a.state.booking;
 assert(a.mateConflict({date},'mina'),'Pending payment reserves mate dates');
 assert(!a.requestAvailable({date}));assert.equal(a.publicTravelRequests([{id:'other',date,status:'requested'}]).length,0);
 c.window.ReelAccess.mode=()=> 'guide';assert(a.confirmMateFee('success'));c.window.ReelAccess.mode=()=> 'customer';
 const room=a.ensureConversation(firstBooking,first);room.mutualConsent=true;assert(a.conversationOpen(room),'Traveler can open an empty confirmed chat');
 assert.equal(request(later).route,'requested');assert.equal(a.matchingContexts().length,2);const second=a.state.request.id;
 assert(a.allBookings().some(x=>x.id===firstBooking.id));assert(a.matchingPicker().includes(first));
 assert(a.activateMatching(first));assert.equal(a.state.booking.id,firstBooking.id);assert(a.activateMatching(second));
 assert(a.makeQuote(100000,'Another two day trip',undefined,undefined,'mina'));
 c.window.ReelAccess.mode=()=> 'guide';assert(a.withdrawProposal(a.state.quote.id));assert(!a.proposalSelectable(a.state.quote));
 c.window.ReelAccess.mode=()=> 'customer';assert(!a.requestBooking('Traveler','t@example.com'));
 assert(a.activateMatching(first));assert(a.cancelBooking('customer','Changed plans'));assert.equal(a.state.booking.refundStatus,'review');assert.equal(a.state.booking.refundRequestedAmount,60000);
 assert(!a.withdrawalBlocked(),'Traveler is not blocked by another mate fee refund');
 c.storage.set('reeltrip-prototype-access-v1',JSON.stringify({profile:'guide',mode:'guide'}));assert(a.withdrawalBlocked(),'Same account with mate fee refund cannot delete');
 a.state.booking.refundStatus='completed';a.save();assert(!a.withdrawalBlocked());a.state.booking.disputeStatus='open';assert(a.withdrawalBlocked());a.state.booking.disputeStatus='closed';a.save();
 c.window.ReelAccess.isAdmin=true;a.state.booking.refundStatus='approved';
 const update={bookingId:firstBooking.id,refundStatus:'completed',refundAmount:20000,note:'Verified in PG',reference:'PG-123',pgConfirmed:true};
 assert(!a.saveOperationsBooking({...update,pgConfirmed:false}));assert(!a.saveOperationsBooking({...update,refundAmount:60001}));assert(a.saveOperationsBooking(update));assert.equal(a.state.booking.refundAmount,20000);
 c.window.ReelAccess.isAdmin=false;assert(!a.saveOperationsBooking(update));
 a.state.booking.status='confirmed';a.state.booking.date='2000-01-01';assert(!a.canCancelBooking(a.state.booking));assert(!a.cancelBooking('customer','After start'));
 assert(a.validEmail('mate@example.com'));assert(!a.validEmail('broken'));assert(a.mateEmailVerified({fields:{email:'mate@example.com',emailVerified:'mate@example.com'}}));assert(!a.mateEmailVerified({fields:{email:'changed@example.com',emailVerified:'mate@example.com'}}));
 // Exercise real admin submit handlers, not only the pure update function.
 c.window.ReelAccess.isAdmin=true;const opForm=new c.HTMLFormElement();Object.assign(opForm,{id:'operations-booking-form-'+firstBooking.id,values:{...update,resolution:'end'}});c.handlers.submit({target:opForm,preventDefault(){}});assert.equal(a.state.booking.status,'cancelled');
 const beforeTickets=a.state.tickets.length;assert(!a.storeSupport({email:'bad',body:'A valid long message'}));assert(!a.storeSupport({email:'t@example.com',body:'No traveler arrived',type:'no_show',meeting:'Exit 4 at 10:00',waited:true}),'No-show needs location or evidence');assert.equal(a.state.tickets.length,beforeTickets);assert(a.storeSupport({email:'t@example.com',body:'A valid long message',type:'general'}));
 const ticket=a.state.tickets.at(-1);Object.assign(opForm,{id:'operations-ticket-form-'+ticket.id,values:{ticketId:ticket.id,status:'review',note:'Email reply pending'}});c.handlers.submit({target:opForm,preventDefault(){}});assert.equal(ticket.status,'review');assert.equal(ticket.history.length,1);
 c.window.ReelAccess.isAdmin=false;
 // Email verification binds to the address, requires a request and cannot be reused after editing it.
 const emailForm={elements:[{name:'email',type:'email',value:'mate@example.com'},{name:'emailCode',type:'text',value:'482916'}]};const originalQuery=c.document.querySelector;c.document.querySelector=x=>x==='#mate-form'?emailForm:originalQuery(x);a.saveMate({status:'draft',step:3,fields:{}});assert(!a.mateEmailAction('verify'));assert(a.mateEmailAction('send'));assert(a.mateEmailAction('verify'));assert(a.mateEmailVerified(a.mateApplication()));emailForm.elements[0].value='changed@example.com';assert(!a.mateEmailAction('verify'));
 a.save();const restored=setup(lang,c.storage).api;assert.equal(restored.matchingContexts().length,2);assert.equal(restored.allBookings()[0].refundAmount,20000);
 console.log('PASS '+lang+': multiple dates, overlap holds, withdrawal, first chat, cancellation boundary, refund ownership and PG confirmation records.');
}
