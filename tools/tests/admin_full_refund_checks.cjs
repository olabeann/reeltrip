const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
for(const lang of ['ko','en']){
 const source=fs.readFileSync(`src/assets/app${lang==='en'?'.en':''}.js`,'utf8');
 const b={id:'booking',requestId:'request',feeAmount:18000},request={id:'request'};
 const c={window:{ReelAccess:{isAdmin:true}},allBookings:()=>[b],matchingContexts:()=>[{request}],syncConversations(){},save(){},pendingRefund:b=>['review','needs_info','approved','processing'].includes(b.refundStatus)};
 vm.createContext(c);vm.runInContext(source.split('\n').find(l=>l.startsWith('function operationsRefundEligible('))+'\n'+source.slice(source.indexOf('function saveOperationsBooking('),source.indexOf('function confirmOperationsBooking(')),c);
 const cancel={bookingId:b.id,operation:'cancel',reasonCode:'customer',note:'Verified reason'},refund={bookingId:b.id,operation:'refund',note:'Verified PG refund',reference:'PG-42',pgConfirmed:true};
 Object.assign(b,{status:'awaiting_mate_fee',feeStatus:'pending'});assert(c.saveOperationsBooking(cancel));assert.equal(b.feeStatus,'void');assert.equal(b.refundStatus,'none');assert(!c.saveOperationsBooking(refund));
 Object.assign(b,{status:'confirmed',feeStatus:'paid',refundStatus:'none',disputeStatus:'open'});assert(c.saveOperationsBooking({...cancel,reasonCode:'guide'}));assert.equal(b.refundStatus,'not_eligible');assert(!c.saveOperationsBooking(refund));assert(c.saveOperationsBooking({...refund,exceptionConfirmed:true}));assert.equal(b.refundAmount,18000);assert.equal(b.disputeStatus,'open');assert(!c.saveOperationsBooking(refund));
 Object.assign(b,{status:'confirmed',feeStatus:'paid',refundStatus:'none'});assert(c.saveOperationsBooking(cancel));assert.equal(b.refundStatus,'review');assert.equal(request.status,'cancelled');
 for(const d of [{...refund,pgConfirmed:false},{...refund,reference:''},{...refund,refundAmount:9000}])assert(!c.saveOperationsBooking(d));
 assert(c.saveOperationsBooking(refund));assert.equal(b.refundAmount,b.feeAmount);assert.equal(b.refundReference,'PG-42');assert(!c.saveOperationsBooking(refund));
 c.window.ReelAccess.isAdmin=false;assert(!c.saveOperationsBooking(cancel));
}
console.log('PASS: unpaid cancellation, no-refund mate cancellation, verified exceptions, full-only refund, PG evidence, duplicate protection, audit and admin checks in KO/EN.');
