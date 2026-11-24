const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
for(const lang of ['ko','en']){
 const source=fs.readFileSync(`src/assets/app${lang==='en'?'.en':''}.js`,'utf8');
 const code=source.slice(source.indexOf('function seedAdminSamples(){'),source.indexOf('function adminPendingCounts(){'));
 function setup(existing=false){
  const application=existing?{status:'draft',fields:{name:'My draft'}}:{status:'draft',fields:{}};
  const state={tickets:existing?[{id:'existing-ticket',status:'review'}]:[],bookingHistory:existing?[{id:'existing-booking',status:'cancelled',refundStatus:'none'}]:[],userReports:existing?[{id:'existing-report'}]:[],userBlocks:existing?[{actor:'existing'}]:[]};
  const ctx={state,window:{ReelAccess:{isAdmin:true}},Date,mateKey:'mate',localStorage:{getItem:()=>existing?'saved':null},mateApplication:()=>application,saveMate:a=>ctx.application=a,allBookings:()=>state.bookingHistory,dateAfter:(d,n)=>{const v=new Date(d);v.setUTCDate(v.getUTCDate()+n);return v.toISOString().slice(0,10)},save:()=>ctx.saves=(ctx.saves||0)+1};
  vm.createContext(ctx);vm.runInContext(code,ctx);return ctx;
 }
 const empty=setup();empty.seedAdminSamples();assert.equal(empty.state.bookingHistory.length,3);assert.equal(empty.state.tickets.length,3);assert.equal(empty.state.userReports.length,3);assert.equal(empty.state.userBlocks.length,3);assert.equal(empty.application.status,'pending');
 const first=JSON.stringify(empty.state);empty.seedAdminSamples();assert.equal(JSON.stringify(empty.state),first);assert.equal(empty.saves,1);
 const existing=setup(true),before=JSON.stringify(existing.state);existing.seedAdminSamples();const {adminSampleSeedVersion,...after}=existing.state;const original=JSON.parse(before);for(const key of Object.keys(original))assert.equal(JSON.stringify(after[key].filter(x=>JSON.stringify(original[key]).includes(x.id||x.actor))),JSON.stringify(original[key]));assert.equal(existing.application,undefined);
 const customer=setup();customer.window.ReelAccess.isAdmin=false;customer.seedAdminSamples();assert.equal(customer.saves,undefined);
}
console.log('PASS: KO/EN admin samples populate empty lists once, preserve existing records and drafts, and never seed customer sessions.');

for(const lang of ['ko','en']){
 const source=fs.readFileSync(`src/assets/app${lang==='en'?'.en':''}.js`,'utf8');
 const review=source.split('\n').find(l=>l.startsWith('function reviewMate('));
 const rows={a:{status:'pending',fields:{name:'A'}},b:{status:'pending',fields:{name:'B'}}};
 const c={window:{ReelAccess:{isAdmin:true}},adminReviewApplication:id=>rows[id],saveAdminApplication:()=>true,toast(){},Date};vm.createContext(c);vm.runInContext(review,c);
 assert.equal(c.reviewMate('rejected','   ','a'),false);assert.equal(rows.a.status,'pending');
 assert.equal(c.reviewMate('rejected','Missing information','a'),true);assert.equal(rows.a.reason,'Missing information');assert.equal(rows.b.status,'pending');
 assert.equal(c.reviewMate('approved','','a'),false);assert.equal(c.reviewMate('approved','','b'),true);assert.equal(rows.b.status,'approved');
 assert.equal(c.reviewMate('approved','','missing'),false);
}
console.log('PASS: review decisions target only the selected pending application and require rejection reasons.');
