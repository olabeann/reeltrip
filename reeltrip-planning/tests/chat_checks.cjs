// Local conversation lifecycle, migration and privacy checks in both generated apps.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=__dirname+'/../';
function setup(lang,saved,member=true){
 const storage=new Map(saved||[]);
 const ctx={sessionStorage:{getItem:()=>member?'yes':null},URLSearchParams,Event:class{},location:{search:'',hash:'#messages'},document:{documentElement:{lang},body:{dataset:{},classList:{add(){}}},addEventListener(){}},window:{addEventListener(){},dispatchEvent(){}},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},setTimeout,clearTimeout};
 vm.createContext(ctx);
 for(const file of ['assets/nickname-bases.js','assets/signup-copy.js','assets/access.js',`assets/catalog${lang==='en'?'.en':''}.js`])vm.runInContext(fs.readFileSync(root+file,'utf8'),ctx);
 const code=fs.readFileSync(root+`assets/app${lang==='en'?'.en':''}.js`,'utf8').split('window.ReelBookingTools.init(')[0];
 vm.runInContext(code+'globalThis.chatAPI={state,ensureConversation,syncConversations,conversationRoute,conversationOpen,chatContext,sendChatMessage,markChatRead,unreadChats,messages,chat,requestBooking,makeQuote,save,layout};})();',ctx);
 return {...ctx,storage};
}
for(const lang of ['ko','en']){
 const c=setup(lang),a=c.chatAPI;
 a.state.request={id:'RQ-ONE',status:'quoted',date:'2026-12-01',tripTitle:'First trip',stops:[],party:2};
 assert(a.makeQuote(240000,undefined,undefined,undefined,'mina'));const minaQuote=a.state.quote;
 const mina=a.ensureConversation(minaQuote);c.location.hash='#'+a.conversationRoute(mina);
 assert(a.sendChatMessage('Question for Mina'));assert.equal(mina.messages.length,1);
 assert(!a.sendChatMessage('   '));assert(!a.sendChatMessage('a'.repeat(1001)));
 assert(a.makeQuote(250000,undefined,undefined,undefined,'mina'));
 assert.equal(a.ensureConversation(a.state.quote).id,mina.id);assert.equal(a.state.conversations.length,1);
 assert(a.makeQuote(260000,undefined,undefined,undefined,'jun'));const jun=a.ensureConversation(a.state.quote);
 c.location.hash='#'+a.conversationRoute(jun);assert(a.sendChatMessage('<Question for Jun>'));
 assert.equal(mina.messages[0].text,'Question for Mina');assert(!a.chat().includes('Question for Mina'));assert(a.chat().includes('&lt;Question for Jun&gt;'));
 c.window.ReelAccess.mode=()=> 'guide';assert.equal(a.unreadChats(),2);a.markChatRead();assert.equal(a.unreadChats(),1);
 assert(a.sendChatMessage('Reply from Jun'));c.window.ReelAccess.mode=()=> 'customer';assert.equal(a.unreadChats(),1);
 assert(a.layout('').includes('chat-tab-unread'));a.markChatRead();assert.equal(a.unreadChats(),0);
 a.state.quote=minaQuote;assert(a.requestBooking('Jamie','demo@example.com'));
 assert.equal(a.state.booking.requestId,'RQ-ONE');c.location.hash='#chat';assert.equal(a.chatContext().room.id,mina.id);
 assert(a.chat().includes('Question for Mina'));assert(a.conversationOpen(mina));assert(!a.conversationOpen(jun));
 c.location.hash='#'+a.conversationRoute(jun);assert(!a.sendChatMessage('Should not send'));assert(!a.chat().includes('id="chat-form"'));
 a.state.booking.status='confirmed';c.location.hash='#'+a.conversationRoute(mina);assert(a.sendChatMessage('Meeting question'));
 a.state.booking.status='completed';assert(!a.sendChatMessage('Closed'));assert(a.chat().includes('Meeting question'));
 a.state.request={id:'RQ-TWO',status:'quoted',date:'2026-12-08',stops:[]};a.state.booking=null;a.state.messages=[];
 const next=a.ensureConversation({...minaQuote,date:'2026-12-08'});assert.notEqual(next.id,mina.id);assert.equal(next.messages.length,0);
 assert.equal(a.state.conversations.length,3);assert(!a.conversationOpen(mina));
 c.location.hash='#chat?thread=missing';assert.equal(a.chatContext(),null);assert(!a.sendChatMessage('invalid'));
 c.location.hash='#chat?sample=1';assert(a.sendChatMessage('Sample only'));assert(!a.state.conversations.some(room=>room.messages.some(m=>m.text==='Sample only')));
 a.save();const reloaded=setup(lang,c.storage);assert.equal(reloaded.chatAPI.state.conversations.length,3);assert.equal(reloaded.chatAPI.state.conversations[0].messages.length,2);
 const guest=setup(lang,c.storage,false);guest.location.hash='#'+a.conversationRoute(mina);assert(guest.chatAPI.chatContext().sample);assert(!guest.chatAPI.chat().includes('Question for Mina'));assert(!guest.chatAPI.sendChatMessage('Guest'));assert.equal(guest.chatAPI.unreadChats(),0);
 const old=setup(lang),o=old.chatAPI;o.state.request={id:'RQ-LEGACY',status:'booked'};o.state.booking={id:'BK-LEGACY',guideId:'mina',guide:'Mina',status:'confirmed'};o.state.messages=[{text:'Legacy message',at:1}];
 o.syncConversations();o.syncConversations();assert.equal(o.state.conversations.length,1);assert.equal(o.state.conversations[0].messages.length,1);assert.equal(o.state.conversations[0].messages[0].sender,'customer');
 console.log(`PASS: ${lang} separate mate/request histories, proposal revisions, booking continuity, unread/read, archives, sample/guest isolation, reload and legacy migration.`);
}
