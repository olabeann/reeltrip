// Local conversation lifecycle, migration and privacy checks in both generated apps.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=__dirname+'/../../src/';
function setup(lang,saved,member=true){
 const storage=new Map(saved||[]);
 const ctx={sessionStorage:{getItem:()=>member?'yes':null},URLSearchParams,Event:class{},location:{search:'',hash:'#messages'},document:{documentElement:{lang},body:{dataset:{},classList:{add(){}}},addEventListener(){}},window:{addEventListener(){},dispatchEvent(){}},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},setTimeout,clearTimeout};
 vm.createContext(ctx);
 for(const file of ['assets/nickname-bases.js','assets/signup-copy.js','assets/access.js',`assets/catalog${lang==='en'?'.en':''}.js`])vm.runInContext(fs.readFileSync(root+file,'utf8'),ctx);
 const code=fs.readFileSync(root+`assets/app${lang==='en'?'.en':''}.js`,'utf8').split('window.ReelBookingTools.init(')[0];
 vm.runInContext(code+'globalThis.chatAPI={guideFee,state,adminSafetyRecords,adminSafetyPanel,setUserBlock,reportUser,conversationBlocked,ensureConversation,syncConversations,conversationRoute,conversationOpen,chatContext,sendChatMessage,markChatRead,unreadChats,messages,chat,requestBooking,makeQuote,save,layout};})();',ctx);
 return {...ctx,storage};
}
for(const lang of ['ko','en']){
 const c=setup(lang),a=c.chatAPI;
 a.state.request={id:'RQ-ONE',status:'quoted',date:'2099-12-01',endDate:'2099-12-03',tripTitle:'First trip',stops:[],party:2};
 assert(a.makeQuote(240000,undefined,undefined,undefined,'mina'));const q=a.state.quote;
 const room=a.ensureConversation(q);c.location.hash='#'+a.conversationRoute(room);
 assert(!a.sendChatMessage('Before mutual agreement'));assert(!a.chat().includes('id="chat-form"'));
 assert(a.requestBooking('Jamie','demo@example.com'));assert.equal(room.messages.length,0);
 assert(!a.sendChatMessage('Unpaid customer'));assert(!a.chat().includes('id="chat-form"'));
 c.window.ReelAccess.mode=()=> 'guide';assert(!a.sendChatMessage('Unpaid mate'));
 assert.equal(a.chatContext(),null);assert(!a.guideFee().includes('href="#chat'));assert(!a.messages().includes('conversation-item'));
 a.state.booking.feeStatus='failed';assert.equal(a.chatContext(),null);assert(!a.guideFee().includes('href="#chat'));assert(!a.sendChatMessage('Failed payment'));
 a.state.booking.status='confirmed';assert(!a.sendChatMessage('Confirmed without payment'));assert(!a.guideFee().includes('href="#chat'));
 a.state.booking.status='confirmed';a.state.booking.feeStatus='paid';
 assert(a.guideFee().includes('href="#'+a.conversationRoute(room)+'"'));
 c.window.ReelAccess.mode=()=> 'customer';assert(a.sendChatMessage('Customer can start after payment'));assert(a.chat().includes('id="chat-form"'));room.messages.pop(); // Isolate the following unread-count scenario.
 c.window.ReelAccess.mode=()=> 'guide';assert(a.sendChatMessage('First greeting'));
 c.window.ReelAccess.mode=()=> 'customer';a.markChatRead();
 assert(a.sendChatMessage('<Hello>'));assert(a.chat().includes('&lt;Hello&gt;'));
 assert(a.chat().includes('class="chat-date"'));assert(a.chat().includes('<textarea'));assert(a.chat().includes('chat-message-meta'));assert(a.chat().includes('chat-system-note'));
 assert(!a.chat().includes('<div class="bubble">일정'));
 assert(!a.sendChatMessage('   '));assert(!a.sendChatMessage('x'.repeat(1001)));
 c.window.ReelAccess.mode=()=> 'guide';assert.equal(a.unreadChats(),1);a.markChatRead();assert.equal(a.unreadChats(),0);
 assert(a.sendChatMessage('Welcome'));c.window.ReelAccess.mode=()=> 'customer';assert.equal(a.unreadChats(),1);
 c.location.hash='#messages?filter=unread';assert(a.messages().includes('conversation-item card pad is-unread'));assert(a.messages().includes('Welcome'));
 c.location.hash='#'+a.conversationRoute(room);a.markChatRead();
 c.location.hash='#messages?filter=unread';assert(a.messages().includes('conversation-item card pad'));assert(!a.messages().includes('conversation-filters'));assert(!a.messages().includes('conversation-status'));assert(a.layout(a.messages()).split('<main')[0].includes('data-action="chat-policy"'));assert(!a.messages().includes('<h1>'));
 c.location.hash='#messages';assert(a.messages().includes('Welcome'));
 c.location.hash='#'+a.conversationRoute(room);
 const archived={...room,id:'archived-recent',status:'cancelled',messages:[{text:'Archived recent',sender:'guide',at:Date.now()+10000}]};
 const olderArchived={...archived,id:'archived-older',messages:[{text:'Archived older',sender:'guide',at:1}]};
 a.state.conversations.push(olderArchived,archived);
 const ordered=a.messages();assert(ordered.indexOf('href="#'+a.conversationRoute(room)+'"')<ordered.indexOf('href="#chat?thread=archived-recent"'));assert(ordered.indexOf('href="#chat?thread=archived-recent"')<ordered.indexOf('href="#chat?thread=archived-older"'));
 a.state.conversations=a.state.conversations.filter(r=>r.id===room.id);
 assert(a.chat().includes('data-action="user-safety"'));
 assert(!a.reportUser(room,'invalid',''));assert(!a.reportUser(room,'other','   '));assert(!a.reportUser(room,'abuse','x'.repeat(1001)));
 assert(a.reportUser(room,'other','Unwanted contact'));assert(!a.reportUser(room,'spam','duplicate'));assert.equal(a.state.userReports.length,1);
 assert(a.setUserBlock(room,true));assert(a.setUserBlock(room,true));assert.equal(a.state.userBlocks.length,1);
 assert(!a.sendChatMessage('Blocked'));assert(!a.chat().includes('id="chat-form"'));assert.equal(a.unreadChats(),0);
 const samePerson={...room,id:'another-trip'};assert(a.conversationBlocked(samePerson));assert(!a.conversationBlocked({...room,guideId:'jun'}));
 const restored=setup(lang,c.storage).chatAPI;assert.equal(restored.state.userReports.length,1);assert(restored.conversationBlocked(restored.state.conversations[0]));
 c.window.ReelAccess.mode=()=> 'guide';assert(!a.sendChatMessage('Other side blocked'));a.setUserBlock(room,false);assert(a.conversationBlocked(room));
 assert(a.setUserBlock(room,true));c.window.ReelAccess.mode=()=> 'customer';a.setUserBlock(room,false);assert(a.conversationBlocked(room));
 c.window.ReelAccess.mode=()=> 'guide';a.setUserBlock(room,false);assert(!a.conversationBlocked(room));c.window.ReelAccess.mode=()=> 'customer';
 assert(a.conversationOpen(room));assert.equal(a.state.booking.status,'confirmed');
 c.window.ReelAccess.mode=()=> 'guide';assert(a.reportUser(room,'abuse','<mate report>'));assert(a.setUserBlock(room,true));
 assert.equal(a.adminSafetyRecords().reports.length,0,'member cannot read operations records');
 c.window.ReelAccess.isAdmin=true;assert.equal(a.adminSafetyRecords().reports.length,2);assert.equal(a.adminSafetyRecords().blocks.length,1);
 assert(a.adminSafetyPanel().includes('&lt;mate report&gt;'));assert(!a.adminSafetyPanel().includes('<mate report>'));assert(a.adminSafetyPanel().includes('data-action="refresh-safety"'));
 assert(!a.reportUser(room,'spam','admin'));assert(!a.setUserBlock(room,false));
 const otherKey=`reeltrip-demo-${lang==='ko'?'en':'ko'}-map-v2-option-2`;
 c.storage.set(otherKey,JSON.stringify({userReports:[{actor:'guide:jun',reason:'spam',details:'Other language report'}],userBlocks:[]}));
 assert.equal(a.adminSafetyRecords().reports.length,3);assert(a.adminSafetyPanel().includes('Other language report'));c.storage.delete(otherKey);
 c.window.ReelAccess.isAdmin=false;a.setUserBlock(room,false);c.window.ReelAccess.mode=()=> 'customer';

 a.state.booking.status='completed';assert(!a.conversationOpen(room),'Completed trips are read-only even before the end date');
 assert(!a.guideFee().includes('href="#'+a.conversationRoute(room)+'"'),'Completed trip detail has no chat action');
 for(const mode of ['customer','guide']){c.window.ReelAccess.mode=()=>mode;assert(!a.sendChatMessage('Completed trip'));assert(!a.chat().includes('id="chat-form"'));}
 c.window.ReelAccess.mode=()=> 'customer';a.state.booking.status='confirmed';
 a.state.booking.date='2020-01-01';a.state.booking.endDate='2099-12-03';assert(a.sendChatMessage('Still traveling'));
 room.read.customer=0;assert.equal(a.unreadChats(),2);
 a.state.booking.endDate='2020-01-03';assert(!a.sendChatMessage('Too late'));assert(!a.chat().includes('id="chat-form"'));
 assert.equal(a.unreadChats(),0);assert(a.messages().includes('card pad is-closed'));assert(!a.messages().includes('class="chat-unread"'));assert(!a.messages().includes('is-unread'));assert(a.messages().includes('href="#'+a.conversationRoute(room)+'"'));assert(a.chat().includes('Welcome'));
 a.state.booking.endDate='2099-12-03';a.state.booking.status='cancelled';assert(!a.sendChatMessage('Cancelled'));assert.equal(a.unreadChats(),0);assert(a.messages().includes('card pad is-closed'));assert(a.chat().includes('Welcome'));
 a.save();const reload=setup(lang,c.storage);assert.equal(reload.chatAPI.state.conversations[0].messages.length,4);
 c.location.hash='#chat?sample=1';assert.equal(a.chatContext(),null);assert(!a.sendChatMessage('Sample'));
 const guest=setup(lang,c.storage,false);guest.location.hash='#'+a.conversationRoute(room);assert.equal(guest.chatAPI.chatContext(),null);assert(!guest.chatAPI.chat().includes('&lt;Hello&gt;'));assert(!guest.chatAPI.sendChatMessage('Guest'));assert(!guest.chatAPI.setUserBlock(room,true));assert(!guest.chatAPI.reportUser(room,'spam',''));
 console.log(`PASS ${lang}: mutual consent, empty room, both senders, unread, escaped text, date closure, cancellation, reload and guest isolation`);
}
