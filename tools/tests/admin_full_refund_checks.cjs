const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
for(const lang of ['ko','en']){
 const source=fs.readFileSync(`src/assets/app${lang==='en'?'.en':''}.js`,'utf8');
 let b,notices,dialog;
 const request={id:'request'};
 const c={window:{ReelAccess:{isAdmin:true}},allBookings:()=>[b],matchingContexts:()=>[{request}],syncConversations(){},saveOperationsRecord:()=>true,
  recordBookingNotice(kind){notices.push(kind)},bookingReference:()=> 'ABC234',bookingReferenceLabel:()=> 'RS-ABC234',money:n=>'₩'+n,esc:String,
  action:()=>'<button type="button">Back</button>',modal:html=>{dialog=html},bookingOperationLabel:op=>op};
 vm.createContext(c);
 for(const [start,end] of [['hasPaidFee','bookingCaseControls'],['localFeeRefundResult','confirmOperationsBooking']]){
  vm.runInContext(source.slice(source.indexOf('function '+start+'('),source.indexOf('function '+end+'(')),c);
 }
 const confirmStart=source.indexOf('function confirmOperationsBooking(');
 vm.runInContext(source.slice(confirmStart,source.indexOf('\n}',confirmStart)+2),c);
 const op=(operation,fields={})=>c.saveOperationsBooking({bookingId:b.id,note:'Verified reason',operation,...fields});
 for(const reason of ['customer','no_show','guide','exception','interrupted','unpaid']){
  b={id:'booking',requestId:'request',status:reason==='unpaid'?'awaiting_mate_fee':'confirmed',feeStatus:reason==='unpaid'?'pending':'paid',feeAmount:18000};
  notices=[];dialog='';
  const cancel={operation:'cancel',bookingId:b.id,reasonCode:reason==='unpaid'?'customer':reason,note:'Trip cancelled'};
  const immediate=['customer','no_show'].includes(reason);
  const outcome={textContent:''},submit={textContent:''};
  const control={value:cancel.reasonCode,form:{elements:{bookingId:{value:b.id}},querySelector:selector=>selector==='[data-refund-outcome]'?outcome:submit}};
  c.updateCancellationRefund(control);
  const noRefund=reason==='guide'||reason==='unpaid';
  const terms=lang==='ko'?['전액 환불 예정','환불 없음','심사 후 결정']:['Full refund upon confirmation','No refund','Subject to review'];
  assert(outcome.textContent.includes(terms[immediate?0:noRefund?1:2]),lang+' '+reason+' outcome');
  assert(outcome.textContent.includes(noRefund?'₩0':'₩18000'));
  c.confirmOperationsBooking(cancel);
  assert(dialog.includes(outcome.textContent)&&dialog.includes(submit.textContent),'Form and confirmation agree');
  if(immediate){
   control.value='guide';c.updateCancellationRefund(control);
   assert(outcome.textContent.includes('₩0'),'Changing the reason replaces the amount');
  }
  assert.equal(dialog.includes('name="expectedRefundAmount"'),immediate);assert.equal(b.operationsLog,undefined,'Opening the dialog has no side effects');
  assert(op('cancel',cancel));assert.equal(b.status,'cancelled');assert.equal(b.refundStatus,immediate?'completed':reason==='unpaid'?'none':reason==='guide'?'not_eligible':'review');
  if(immediate){
   assert.equal(b.refundReference,'RF-ABC234');assert.equal(b.refundAmount,18000);assert.equal(notices.filter(n=>n==='refunded').length,1);
   assert(!op('cancel',cancel));assert(!op('refund'));
  }else if(['exception','interrupted'].includes(reason)){
   assert(!op('refund'));
   c.confirmOperationsBooking({operation:'refund_review',bookingId:b.id,previous:'review',decision:'approved',note:'Evidence checked'});
   assert(dialog.includes('name="expectedRefundAmount"')&&dialog.includes('₩18000'));
   assert(!op('refund_review',{previous:'review',decision:'needs_info'}));
   assert.equal(b.refundStatus,'review');
   if(reason==='interrupted')b.refundStatus='needs_info'; // Previously saved case.
   assert.deepEqual([...c.refundReviewOptions(b)],['not_eligible','approved']);
   const decision=reason==='exception'?'approved':'not_eligible';
   assert(op('refund_review',{previous:b.refundStatus,decision}));
   assert.equal(b.refundStatus,decision==='approved'?'completed':'not_eligible');
   assert(!op('refund'));assert.equal(c.refundReviewOptions(b).length,0);
  }else {assert(!op('refund'));assert.equal(c.refundReviewOptions(b).length,0);}
 }
 b={id:'booking',status:'confirmed',feeStatus:'paid',feeAmount:18000,requestId:'request',disputeStatus:'open'};notices=[];
 c.window.ReelStatePreview={fixture:{firstRefundFails:true}};
 assert(!op('cancel',{reasonCode:'customer',expectedRefundAmount:1000}));
 assert(op('cancel',{reasonCode:'customer'}));assert.equal(b.status,'cancelled');assert.equal(b.refundStatus,'failed');assert(!b.refundReference);
 assert(!notices.includes('refunded'));assert.equal(b.operationsLog.at(-1).operation,'refund_failed');
 c.window.ReelAccess.isAdmin=false;assert(!op('refund'));c.window.ReelAccess.isAdmin=true;
 assert(op('refund'));assert.equal(b.refundAmount,18000);assert.equal(b.disputeStatus,'open');assert(!op('refund'));assert.equal(notices.filter(n=>n==='refunded').length,1);
}
console.log('PASS: KO/EN cancellation confirmation, full fee refunds, exclusions, review, failure, retry and duplicate protection.');
