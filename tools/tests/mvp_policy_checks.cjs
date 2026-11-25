// Both matching entry paths preserve the original trip and carry full dates through booking.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=__dirname+'/../../src/';
function setup(lang,storage=new Map()){
 const handlers={},toast={textContent:'',classList:{add(){},remove(){}}};
 const ctx={HTMLFormElement:class{},FormData:class{constructor(form){return Object.entries(form.values);}},URLSearchParams,Event:class{},sessionStorage:{getItem:()=> 'yes'},location:{hash:'#results',search:''},document:{documentElement:{lang},body:{dataset:{},classList:{add(){}}},querySelector:s=>s==='#toast'?toast:s==='#dialog'?{close(){}}:s==='#app'?{innerHTML:''}:null,querySelectorAll:()=>[],addEventListener:(n,fn)=>handlers[n]=fn},window:{ReelBookingTools:{widget:()=>''},ReelGoogleMap:{mount(){},valid:p=>Number.isFinite(p.lat)&&Number.isFinite(p.lng)},addEventListener(){},dispatchEvent(){}},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},setTimeout:()=>0,clearTimeout(){}};
 vm.createContext(ctx);
 for(const file of ['assets/nickname-bases.js','assets/signup-copy.js','assets/access.js',`assets/catalog${lang==='en'?'.en':''}.js`,'assets/revenue.js'])vm.runInContext(fs.readFileSync(root+file,'utf8'),ctx);
 const code=fs.readFileSync(root+`assets/app${lang==='en'?'.en':''}.js`,'utf8').split('window.ReelBookingTools.init(')[0];
 vm.runInContext(code+'globalThis.api={compareApplications,refundIncidentRange,scheduleTravelNotices,notificationItems,adminBookings,supportTicketCard,reviewMate,mateEmailAction,mateApplication,saveMate,storeSupport,matchingContexts,activateMatching,allBookings,mateConflict,proposalSelectable,canCancelBooking,cancelBooking,withdrawProposal,saveOperationsBooking,withdrawalBlocked,conversationOpen,expireAllMateFees,mateEmailVerified,validEmail,matchingPicker,results,requestItineraryMap,getMapPlaces:()=>mapPlaces,setQuoteMapDay:n=>quoteMapDay=n,publicTravelRequests,publicRequestMatch,expireMateFee,reopenMatching,guideActivity,guideFee,requestAvailable,layout,board,saveSelectedPlaces,saveRecommendation,loadRecommendations,getRecommendations:()=>({rows:recommendationRows,status:recommendationStatus}),saveAPIPlace,setPendingPlace:p=>pendingAPIPlace=p,pinEligible,tripRangeDays,chooseTripDate,setTripDraft:v=>tripDraft=v,getTripDraft:()=>tripDraft,moveTripPlace,removeTripPlace,updateTripDay,updateTripInfo,addTripPlace,createTrip,selectTrip,trips,tripDetailRoute,state,quiet:()=>{render=()=>{};toast=()=>{};},stashDay,submitTravelRequest,request,makeQuote,proposals,requestBooking,confirmMateFee,quote,requested,guideDesk,guideQuote,booking,save,ensureConversation};})();',ctx);
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
 assert(a.activateMatching(first));assert(a.cancelBooking('customer','Changed plans'));assert.equal(a.state.booking.refundStatus,'completed');assert.equal(a.state.booking.refundRequestedAmount,60000);assert.equal(a.state.booking.refundAmount,60000);
 // Pending refunds from older bookings still block the mate's withdrawal.
 a.state.booking.refundStatus='review';
 assert(!a.withdrawalBlocked(),'Traveler is not blocked by another mate fee refund');
 c.storage.set('reeltrip-prototype-access-v1',JSON.stringify({profile:'guide',mode:'guide'}));assert(a.withdrawalBlocked(),'Same account with mate fee refund cannot delete');
 a.state.booking.refundStatus='completed';a.save();assert(!a.withdrawalBlocked());a.state.booking.disputeStatus='open';assert(a.withdrawalBlocked());a.state.booking.disputeStatus='closed';a.save();
 c.window.ReelAccess.isAdmin=true;a.state.booking.refundStatus='approved';
 const update={bookingId:firstBooking.id,operation:'refund',note:'Refund approved'};
 assert(!a.saveOperationsBooking({...update,expectedRefundAmount:60001}));assert(a.saveOperationsBooking(update));assert.equal(a.state.booking.refundAmount,60000);assert(!a.saveOperationsBooking(update),'Duplicate completion rejected');
 c.window.ReelAccess.isAdmin=false;assert(!a.saveOperationsBooking(update));
 a.state.booking.status='confirmed';a.state.booking.date='2000-01-01';assert(!a.canCancelBooking(a.state.booking));assert(!a.cancelBooking('customer','After start'));
 assert(a.validEmail('mate@example.com'));assert(!a.validEmail('broken'));assert(a.mateEmailVerified({fields:{email:'mate@example.com',emailVerified:'mate@example.com'}}));assert(!a.mateEmailVerified({fields:{email:'changed@example.com',emailVerified:'mate@example.com'}}));
 // Exercise real admin submit handlers, not only the pure update function.
 c.window.ReelAccess.isAdmin=true;a.state.booking.refundStatus='none';const opForm=new c.HTMLFormElement();Object.assign(opForm,{id:'operations-booking-confirm-form',values:{bookingId:firstBooking.id,operation:'cancel',reasonCode:'customer',note:'Verified cancellation'}});c.handlers.submit({target:opForm,preventDefault(){}});assert.equal(a.state.booking.status,'cancelled');
 const beforeTickets=a.state.tickets.length;assert(!a.storeSupport({email:'bad',body:'A valid long message'}));assert(!a.storeSupport({email:'t@example.com',body:'No traveler arrived',type:'no_show',meeting:'Exit 4 at 10:00',waited:true}),'No-show needs location or evidence');assert.equal(a.state.tickets.length,beforeTickets);assert(a.storeSupport({email:'t@example.com',body:'A valid long message',type:'general'}));
 const ticket=a.state.tickets.at(-1);opForm.id='operations-ticket-form-'+ticket.id;
 const sendTicket=values=>{opForm.values={ticketId:ticket.id,...values};c.handlers.submit({target:opForm,preventDefault(){}});};
 const html=a.supportTicketCard(ticket);assert(!html.includes('name="status"'));assert(!html.includes('name="reply"'));assert(!html.includes('ticket-email'));assert(!html.includes('name="markDispute"'));
 sendTicket({note:'Email sent'});assert.equal(ticket.status,'open');
 sendTicket({replySent:'on',note:'   '});assert.equal(ticket.status,'open');
 sendTicket({replySent:'on',note:'Email sent with instructions'});assert.equal(ticket.status,'resolved');assert.equal(ticket.history.length,1);
 assert.equal(ticket.history[0].replySent,true);assert.equal(ticket.history[0].replyEmail,'t@example.com');
 sendTicket({replySent:'on',note:'Email sent with instructions'});assert.equal(ticket.history.length,1);
 const reloaded=setup(lang,c.storage).api.state.tickets.find(t=>t.id===ticket.id);assert.equal(reloaded.status,'resolved');assert.equal(reloaded.note,ticket.note);
 c.window.ReelAccess.isAdmin=false;
 // Email verification binds to the address, requires a request and cannot be reused after editing it.
 const emailForm={elements:[{name:'email',type:'email',value:'mate@example.com'},{name:'emailCode',type:'text',value:'482916'}]};const originalQuery=c.document.querySelector;c.document.querySelector=x=>x==='#mate-form'?emailForm:originalQuery(x);a.saveMate({status:'draft',step:3,fields:{}});assert(!a.mateEmailAction('verify'));assert(a.mateEmailAction('send'));assert(a.mateEmailAction('verify'));assert(a.mateEmailVerified(a.mateApplication()));emailForm.elements[0].value='changed@example.com';assert(!a.mateEmailAction('verify'));
 a.save();const restored=setup(lang,c.storage).api;assert.equal(restored.matchingContexts().length,2);assert.equal(restored.allBookings()[0].refundAmount,60000);
 console.log('PASS '+lang+': multiple dates, overlap holds, withdrawal, first chat, cancellation boundary, refund ownership and PG confirmation records.');
}

for(const lang of ['ko','en']){
 const c=setup(lang),a=c.api;a.quiet();
 const row=(id,status,submittedAt,revision)=>({id,application:{status,submittedAt,revision}});
 const sorted=[row('old','pending','bad'),row('b','approved','2026-11-25'),row('a','rejected','2026-11-25'),
  row('resubmitted','approved',0,{status:'pending',submittedAt:2000}),row('new','pending',1000),row('waiting','needs_info',3000)].sort(a.compareApplications);
 assert.deepEqual(sorted.map(r=>r.id),['resubmitted','new','old','waiting','a','b']);
 const {first,today}=a.refundIncidentRange();
 const inquiry={type:'fee_refund',body:'Please review my trip refund.',email:'test@example.com',refundReason:'disruption'};
 for(const invalid of ['', '2000-01-01','2099-01-01','not-a-date'])assert(!a.storeSupport({...inquiry,incidentDate:invalid}));
 for(const incidentDate of [first,today])assert(a.storeSupport({...inquiry,incidentDate}));
 assert(a.state.tickets.every(t=>t.incidentDate&&t.ticketNumber));
 const ticket=a.state.tickets[0];ticket.history=[{at:Date.now(),status:'review',note:'<review note>'}];
 const ticketHtml=a.supportTicketCard(ticket);
 assert(ticketHtml.includes('&lt;review note&gt;'));
 const contentAt=ticketHtml.indexOf('rt-admin-narrative');
 const formAt=ticketHtml.indexOf('rt-admin-action-form');
 assert(contentAt>=0&&contentAt<formAt&&formAt<ticketHtml.indexOf('rt-admin-history'));
 c.window.ReelAccess.isAdmin=true;
 const reviewForm=new c.HTMLFormElement();Object.assign(reviewForm,{id:'operations-ticket-form-'+ticket.id,values:{ticketId:ticket.id,replySent:'on',note:'Evidence received',evidenceDate:today}});
 c.handlers.submit({target:reviewForm,preventDefault(){}});assert.equal(ticket.evidenceDate,today);
 assert.equal(ticket.history.at(-1).evidenceDate,today);assert(a.supportTicketCard(ticket).includes(today));
 c.window.ReelAccess.isAdmin=false;

 const date=new Date(Date.now()+6*86400000).toISOString().slice(0,10);
 a.submitTravelRequest({region:'Seoul',date,time:'14:00',dayCount:'1',party:'2',guideAck:'on',ack:'on'},{free:true});
 assert(a.makeQuote(120000,'Walking tour of Seoul'));assert(a.requestBooking('T','t@example.com'));
 const b=a.state.booking;c.window.ReelAccess.mode=()=> 'guide';
 b.requestedAt=Date.now()-2*3600000;b.feeDeadline=Date.now()+3599000;
 a.scheduleTravelNotices();a.scheduleTravelNotices();
 assert.equal(a.notificationItems().filter(n=>n.kind==='payment_due').length,1);
 c.location.hash='#admin-bookings?record='+b.id;
 const waitingHtml=a.adminBookings();
 assert(waitingHtml.includes('rt-admin-info-grid'));
 assert(waitingHtml.includes('rt-admin-disclosure"><summary>'));
 assert(!waitingHtml.includes('rt-admin-disclosure" open'));
 assert(waitingHtml.includes('12,000')&&waitingHtml.includes('₩0'));
 assert(a.confirmMateFee('success'));c.window.ReelAccess.mode=()=> 'customer';
 assert(a.cancelBooking('customer','Change of travel plans'));
 assert.equal(b.refundStatus,'completed');assert.equal(b.refundAmount,12000);
 // Restore the pre-migration shape to exercise the operations queue for an older traveler cancellation.
 b.refundStatus='review';delete b.refundAmount;delete b.refundReference;delete b.refundedAt;
 b.operationsLog=[];a.state.serviceNotifications=a.state.serviceNotifications.filter(n=>n.kind!=='refunded');a.save();
 const openPanels=()=>a.adminBookings().match(/<details[^>]* open>[\s\S]*?<\/details>/g)||[];
 assert(!a.adminBookings().includes('value="refund_review"'),'No review for guaranteed refunds');
 c.window.ReelAccess.isAdmin=true;
 const op=(operation,fields={})=>a.saveOperationsBooking({bookingId:b.id,operation,note:'Operator verified records',...fields});
 assert(!op('open_dispute'),'Only an inquiry can flag a disputed booking');
 assert(!a.adminBookings().includes('operations-booking-form-dispute-'));
 const mark={ticketId:ticket.id,replySent:'on',note:'Accounts conflict',markDispute:'on',disputeReference:'RS-NOTFOUND'};
 reviewForm.values=mark;c.handlers.submit({target:reviewForm,preventDefault(){}});
 assert(!b.disputeStatus&&!ticket.disputeBookingId,'Unmatched booking leaves both records untouched');
 mark.disputeReference='rs-'+b.bookingNumber.toLowerCase();c.handlers.submit({target:reviewForm,preventDefault(){}});
 assert.equal(b.disputeStatus,'open');assert.equal(ticket.disputeBookingId,b.id);
 assert.equal(b.disputeTicketId,ticket.id);
 assert(a.supportTicketCard(ticket).includes('#admin-bookings?record='+b.id));
 c.handlers.submit({target:reviewForm,preventDefault(){}});assert.equal(b.operationsLog.length,1);
 assert(a.adminBookings().includes('#admin-support?record='+ticket.id));
 assert(openPanels().some(panel=>panel.includes('value="close_dispute"')));
 assert(!op('open_dispute'));assert(op('close_dispute'));assert.equal(b.disputeStatus,'closed');
 assert(!op('refund_review',{previous:'review',decision:'not_eligible'}));
 assert(!op('refund_review',{previous:'review',decision:'needs_info'}));
 const pg={expectedRefundAmount:12000};
 assert(!op('refund_review',{previous:'review',decision:'approved'}));
 assert(!op('refund_review',{previous:'needs_info',decision:'approved'}));
 assert(openPanels().some(panel=>panel.includes('value="refund"')));
 assert(!op('refund',{expectedRefundAmount:1}));
 assert(op('refund',pg));assert(!op('refund',pg));assert.equal(b.refundAmount,12000);
 c.location.hash='#admin-bookings?record='+b.id;const html=a.adminBookings();
 const reference=b.refundReference;assert(reference.startsWith('RF-'));assert(html.includes(reference));assert(html.includes('Operator verified records'));
 assert(html.includes('rt-admin-history')&&!html.includes('name="pgConfirmed"'));
 assert.equal(b.operationsLog.length,3);assert.equal(a.state.serviceNotifications.filter(n=>n.kind==='refunded').length,1);
 const restored=setup(lang,c.storage).api;assert.equal(restored.state.booking.refundReference,reference);
 assert.equal(restored.state.booking.operationsLog.length,3);
 const finished={...b,id:'past-paid-trip',bookingNumber:null,status:'completed',refundStatus:'none',refundReviewedAt:null,cancelCategory:null,cancelActor:null,operationsLog:[]};
 (a.state.bookingHistory||=[]).push(finished);
 c.location.hash='#admin-bookings?record='+finished.id;
 assert(!a.adminBookings().includes('value="refund_review"'));
 reviewForm.values={ticketId:ticket.id,replySent:'on',note:'Review supporting evidence',refundReference:finished.bookingNumber};
 c.handlers.submit({target:reviewForm,preventDefault(){}});
 assert.equal(ticket.refundBookingId,finished.id);assert.equal(finished.refundStatus,'review');
 assert.deepEqual([...a.adminBookings().matchAll(/name="decision" value="([^"]+)"/g)].map(match=>match[1]),['not_eligible','approved']);
 const dialog={open:false,dataset:{},classList:{toggle(){}},setAttribute(){},removeAttribute(){},showModal(){this.open=true},close(){this.open=false}};
 const query=c.document.querySelector;c.document.querySelector=selector=>selector==='#dialog'?dialog:query(selector);
 const decisionForm=new c.HTMLFormElement();
 Object.assign(decisionForm,{id:'operations-booking-form-review-'+finished.id,checkValidity:()=>true,values:{operation:'refund_review',bookingId:finished.id,previous:'review',note:'Eligible exception'}});
 c.handlers.submit({target:decisionForm,submitter:{value:'approved'},preventDefault(){}});
 assert(dialog.open&&dialog.innerHTML.includes('name="expectedRefundAmount" value="12000"'));
 assert.equal(finished.refundStatus,'review','Opening confirmation has no payment effect');
 const confirmed=Object.fromEntries([...dialog.innerHTML.matchAll(/<input type="hidden" name="([^"]+)" value="([^"]*)">/g)].map(match=>[match[1],match[2]]));
 Object.assign(decisionForm,{id:'operations-booking-confirm-form',values:confirmed});
 c.handlers.submit({target:decisionForm,preventDefault(){}});
 assert.equal(finished.refundStatus,'completed');assert.equal(finished.refundAmount,12000);
 c.document.querySelector=query;
 for(const cause of ['no_show','interrupted']){
  const another={...b,id:'booking-'+cause,refundStatus:'none',status:'confirmed',feeStatus:'paid',operationsLog:[]};
  (a.state.bookingHistory||=[]).push(another);
  const decide=(operation,details={})=>a.saveOperationsBooking({bookingId:another.id,operation,note:'Checked the evidence',...details});
  assert(decide('cancel',{reasonCode:cause}));
  if(cause==='interrupted'){
   assert(!decide('refund',pg));assert(decide('refund_review',{previous:'review',decision:'approved'}));
   assert(!decide('refund',pg));
  }
  assert.equal(another.refundStatus,'completed');assert(!decide('refund',pg));
 }
}
console.log('PASS: KO/EN review queue order, seven-day evidence intake, dispute lifecycle, refund decisions, PG audit and reminder deduplication.');
