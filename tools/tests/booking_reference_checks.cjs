const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
for(const lang of ['ko','en']){
 const source=fs.readFileSync(`src/assets/app${lang==='en'?'.en':''}.js`,'utf8');
 const rows=[{id:'RT-DEMO-1',guide:'Mina',status:'confirmed'},{id:'RT-DEMO-2',guide:'Jun',status:'completed'}];
 let draw=0;
 const c={state:{},allBookings:()=>rows,crypto:{getRandomValues(v){v.fill(draw++);return v;}},URLSearchParams,location:{hash:'#admin-bookings'},esc:String,statusLabel:String,side:(_,s)=>s,title:(_,heading,description,back='')=>`<h1>${heading}</h1>${back}`,requestPeriod:()=>'',money:()=>'',icon:()=>''};
 vm.createContext(c);vm.runInContext(source.slice(source.indexOf('function bookingReference('),source.indexOf('function overlaps(')),c);
 assert(c.ensureBookingReferences());assert(!c.ensureBookingReferences());
 for(const b of rows)assert.equal(b.bookingNumber,c.state.bookingReferences[b.id]);
 delete rows[0].bookingNumber;assert(c.ensureBookingReferences(),'Backfill field even when registry exists');
 const copy={id:rows[0].id};c.state.matchingContexts=[{booking:copy}];
 assert(c.ensureBookingReferences());assert.equal(copy.bookingNumber,rows[0].bookingNumber);
 assert.equal(JSON.parse(JSON.stringify(rows))[0].bookingNumber,rows[0].bookingNumber);
 assert(!c.ensureBookingReferences());
 const first=c.bookingReference(rows[0]);assert.match(first,/^[A-Z2-9]{6}$/);assert.notEqual(first,c.bookingReference(rows[1]));
 rows[0].status='cancelled';assert.equal(c.bookingReference(rows[0]),first);assert.equal(rows[0].id,'RT-DEMO-1');
 c.state=JSON.parse(JSON.stringify(c.state));assert.equal(c.bookingReference({id:rows[0].id}),first);
 rows.shift();draw=0;const fresh=c.bookingReference({id:'new-booking'});assert.notEqual(fresh,first,'Deleted references stay reserved');assert.equal(fresh,'CCCCCC','Collisions retry');
 const names=['adminQuery','adminRecordLink','adminBack','adminFilter','adminBookingStatus','adminBookingRows','adminBookingTable','adminBookings','operationsBookingForm','refundLabel','operationsRefundEligible','pendingRefund'];
 vm.runInContext(source.split('\n').filter(l=>names.some(n=>l.startsWith(`function ${n}(`))).join('\n'),c);
 c.location.hash='#admin-bookings?query=bbbbbb&status=completed';let html=c.adminBookings();assert(html.includes('<strong>RT-BBBBBB</strong>'));assert(html.includes('record=RT-DEMO-2'),'Internal links remain compatible');assert(!html.includes('<strong>RT-DEMO'));
 c.location.hash='#admin-bookings?query=rt-bbbbbb&status=completed';assert(c.adminBookings().includes('<strong>RT-BBBBBB</strong>'));
 assert.equal(rows[0].bookingNumber,'BBBBBB','Display prefix does not change saved code');
 c.location.hash='#admin-bookings?query=bbbbbb&status=confirmed';assert(c.adminBookings().includes('rt-admin-empty'));
 c.location.hash='#admin-bookings?query=bbbbbb&status=completed&record=RT-DEMO-2';
 html=c.adminBookings();assert(html.includes('id="operations-booking-form-RT-DEMO-2"'));assert(html.includes('<h2>RT-BBBBBB</h2>'));
 assert(!html.includes('<table>'));assert(!html.includes('admin-filter-form'));assert(html.includes('href="#admin-bookings?query=bbbbbb&status=completed"'));
 c.location.hash='#admin-bookings?query=bbbbbb&status=completed&record=missing';
 html=c.adminBookings();assert(!html.includes('operations-booking-form-'));assert(!html.includes('<table>'));assert(html.includes('href="#admin-bookings?query=bbbbbb&status=completed"'));

}
console.log('PASS: KO/EN reference format, persistence, collision retries, non-reuse, legacy links, and combined reference/status search.');
