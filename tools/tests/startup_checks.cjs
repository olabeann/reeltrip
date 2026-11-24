// Execute complete entry scripts, including init/render, to catch startup failures.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'../../src');
for(const stored of [false,true])for(const lang of ['ko','en','zh-CN','ja'])for(const mode of ['customer','guide'])for(const requested of ['home','results','guide','request','planner','checkout','booking','messages','chat','board','trips','guides','account','settings','notifications','guide-desk','guide-fee','signup','signup-email','manual','processing','share','requested','quote','cancel','review','support','policies','guide-quote','guide-calendar','guide-earnings']){
 const route=mode==='guide'&&requested==='home'?'guide-desk':requested;
 const app={innerHTML:''},values=new Map(),handlers={};values.set('reeltrip-prototype-access-v1',JSON.stringify({profile:'guide',mode}));
 if(stored)values.set('reeltrip-demo-'+lang+'-map-v2-option-2',JSON.stringify({places:[],board:[],request:{id:'RQ-OLD',status:'booked',date:'2026-12-01',party:2,time:'10:00',stops:[],must:[]},booking:{id:'BK-OLD',guide:'Mina',status:'confirmed',date:'2026-12-01',time:'10:00',amount:240000,party:2,plan:'A walk',policyVersion:'DRAFT-2026-11-16'}}));
 const codeError={textContent:''};
 class HTMLFormElement{
  constructor(id,fields){this.id=id;this.fields=fields;this.elements={code:{setAttribute(){},focus(){}}};}
 }
 const handlersForWindow={};
 const sessionValues=new Map(stored?[['reeltrip-signup-preview-member','yes']]:[]);
 const ctx={sessionStorage:{getItem:k=>sessionValues.get(k),setItem:(k,v)=>sessionValues.set(k,v),removeItem:k=>sessionValues.delete(k)},URL,URLSearchParams,Event:class{},HTMLFormElement,FormData:class{constructor(form){return Object.entries(form.fields);}},location:{hash:'#'+route,search:'?lang='+lang},setTimeout:(fn,delay)=>{const timer=setTimeout(fn,delay);timer.unref();return timer;},clearTimeout,document:{documentElement:{lang:lang==='en'?'en':'ko'},title:'',body:{dataset:{},classList:{add(){}}},querySelector(s){return s==='#app'?app:s==='#signup-code-error'?codeError:null},querySelectorAll(){return []},addEventListener(name,callback){handlers[name]=callback;}},window:{addEventListener(name,fn){handlersForWindow[name]=fn},dispatchEvent(){},scrollTo(){}},localStorage:{getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)}};
 vm.createContext(ctx);
 const html=fs.readFileSync(path.join(root,lang==='en'?'app/english.html':'app/index.html'),'utf8');
 const scripts=[...html.matchAll(/<script src="([^"?]+)[^"]*"/g)].map(m=>path.resolve(root,'app',m[1]));
 for(const file of scripts)vm.runInContext(fs.readFileSync(file,'utf8'),ctx,{filename:file});
 assert(app.innerHTML.includes('<main'),`${lang}/${mode}/${route}: blank startup`);
 if(stored&&mode==='customer'&&route==='board'&&['ko','en'].includes(lang)){
  const dialog={open:false,dataset:{},innerHTML:'',setAttribute(){},removeAttribute(){},showModal(){this.open=true},close(){this.open=false}};
  const error={textContent:''},toast={textContent:'',classList:{add(){},remove(){}}};
  const query=ctx.document.querySelector;
  ctx.document.querySelector=s=>s==='#dialog'?dialog:s==='#board-video-error'?error:s==='#toast'?toast:query(s);
  const click=action=>handlers.click({target:{closest:s=>s==='[data-action]'?{dataset:{action}}:null},preventDefault(){}});
  const submit=(id,fields,selected=[])=>{const form=new HTMLFormElement(id,fields);form.querySelectorAll=()=>selected.map(value=>({value}));handlers.submit({target:form,preventDefault(){}});};
  click('board-add');assert(dialog.open);assert(dialog.innerHTML.includes('data-action="board-video"'));assert(dialog.innerHTML.includes('data-action="board-search"'));
  click('board-search');assert(!dialog.open);assert.equal(ctx.location.hash,'manual');ctx.location.hash='#board';
  click('board-video');assert(dialog.open);assert(dialog.innerHTML.includes('board-video-form'));assert.equal(ctx.location.hash,'#board');
  submit('board-video-form',{url:'https://example.com/video'});assert(error.textContent);assert(dialog.innerHTML.includes('board-video-form'));
  const videoURL='https://www.youtube.com/shorts/demo123';
  submit('board-video-form',{url:videoURL});assert(!dialog.open,'Link dialog closes before navigation');assert.equal(ctx.location.hash,'processing');
  let finishExtraction;ctx.setTimeout=(callback,delay)=>{if(delay===1400)finishExtraction=callback;return 0;};
  ctx.location.hash='#processing';handlersForWindow.hashchange();assert(finishExtraction,'Processing schedules result navigation');finishExtraction();
  assert.equal(ctx.location.hash,'results');ctx.location.hash='#results';handlersForWindow.hashchange();
  assert(app.innerHTML.includes(videoURL),'Results preserve the submitted source URL');
  assert(app.innerHTML.includes('data-action="board-video"'),'Empty results let the user search again');
  assert(!dialog.open,'Results render as a page, not a modal');

 }

 if(!stored){
  const actionRoute=null;
  if(route==='trips'){assert(app.innerHTML.includes('href="#signup"'));assert(!app.innerHTML.includes('class="day-tabs"'));assert(!app.innerHTML.includes('href="#planner"'));}
  if(route==='board'){assert(app.innerHTML.includes('href="#signup"'));assert(!app.innerHTML.includes('href="#manual"'));}
  if(route==='account'){
   assert(app.innerHTML.includes('class="btn secondary" href="#signup"'));
   assert(!app.innerHTML.includes('class="guest-account-row" href="#policies"'));
   assert(app.innerHTML.includes('<summary class="guest-account-row">') && app.innerHTML.includes('lang=ja#account'));
   assert(!app.innerHTML.includes('data-action="edit-profile"'));
  }
  if(actionRoute){
   assert(app.innerHTML.includes('href="#'+actionRoute+'"'));
   ctx.location.hash='#'+actionRoute; handlersForWindow.hashchange();
   assert(app.innerHTML.includes('class="guest-invite"'));
   assert(app.innerHTML.includes('href="#'+route+'">'+ctx.window.ReelSignupCopy.keepBrowsing[['ko','en','zh-CN','ja'].indexOf(lang)]));
   ctx.location.hash='#'+route; handlersForWindow.hashchange();
  }
  const gated=!['messages','chat','home','board','trips','planner','account','guides','results','signup','signup-email','policies'].includes(route);
  assert.equal(app.innerHTML.includes(ctx.window.ReelSignupCopy.needMember[['ko','en','zh-CN','ja'].indexOf(lang)]),gated,'guest route '+route);
  assert(!app.innerHTML.includes('class="reviewtools"'));
 }
 const signupRoute=route==='signup'||route==='signup-email';
 const conversationRoom=route==='chat'&&app.innerHTML.includes('class="chat-room"');
 assert.equal(app.innerHTML.includes('mobiletabs'),!signupRoute&&!conversationRoom,`${lang}/${mode}/${route}: unexpected navigation`);
 if(conversationRoom){
  assert(app.innerHTML.includes('href="#messages"'));
  assert(!app.innerHTML.includes('detail-topbar'));
  assert(!app.innerHTML.includes('card chat-surface'));
 }
 if(signupRoute) assert.equal(ctx.document.documentElement.lang,lang);
 if(route==='signup'){
  assert(app.innerHTML.includes('index.html?lang=zh-CN#signup') && app.innerHTML.includes('index.html?lang=ja#signup'));
  assert.equal(ctx.document.title,{ko:'회원가입',en:'Sign up','zh-CN':'注册',ja:'新規登録'}[lang]);
  assert(app.innerHTML.includes('href="#signup-email"'));
  assert.equal([...app.innerHTML.matchAll(/data-action="signup-provider"/g)].length,3);
  assert(app.innerHTML.includes('english.html?lang=en#signup') && app.innerHTML.includes('index.html?lang=ko#signup'));
  assert(!app.innerHTML.includes('id="signup-marketing"'),'Provider selection has no consent checkbox');
  // A stale email-signup draft must never opt a social signup into advertising.
  if(stored)handlers.change({target:{id:'signup-marketing',checked:true}});
  const provider={dataset:{action:'signup-provider'}};
  handlers.click({target:{closest:selector=>selector==='[data-action]'?provider:null},preventDefault(){}});
  assert.equal(JSON.parse(values.get('reeltrip-notification-preferences-v1')).marketingEmail,false);
  assert.equal(sessionValues.get('reeltrip-signup-preview-member'),'yes');
  const assigned=values.get('reeltrip-preview-nickname-v1');
  assert(ctx.window.ReelNicknameBases[lang].some(base=>assigned.startsWith(base+' ')) && / \d{4}$/.test(assigned) && assigned.length<=20);
  assert.equal(ctx.location.hash,mode==='guide'?'guide-desk':'home');
  ctx.location.hash='#'+ctx.location.hash;handlersForWindow.hashchange();
  assert.equal(ctx.document.documentElement.lang,lang);
  assert(!app.innerHTML.includes('class="guest-invite"'));
  if(mode==='customer'){
   ctx.location.hash='#manual';handlersForWindow.hashchange();
   assert(app.innerHTML.includes('id="place-search-form"'));
   assert(!app.innerHTML.includes('id="manual-form"'));
  }
 }
 if(route==='signup-email'){
  assert(app.innerHTML.includes('id="signup-email-form"')&&app.innerHTML.includes('type="email"'));
  const submit=(id,fields)=>handlers.submit({target:new HTMLFormElement(id,fields),preventDefault(){}});
  assert(app.innerHTML.includes('id="signup-marketing"'));
  submit('signup-email-form',{email:'traveler@example.com',...(stored?{marketingEmail:'on'}:{})});
  const demoCode=app.innerHTML.match(/<strong>(\d{6})<\/strong>/)?.[1];
  assert(demoCode&&app.innerHTML.includes('id="signup-code-form"'));
  assert(!app.innerHTML.includes(`../emails/index.html?lang=${lang}`), 'Email preview link must stay out of the product flow');
  assert(app.innerHTML.includes('signup-demo-code developer-only'), 'Fixture code is restricted to developer tools');
  submit('signup-code-form',{code:'000000'});
  if(lang==='zh-CN') assert.match(codeError.textContent,/验证码/);
  if(lang==='ja') assert.match(codeError.textContent,/認証コード/);
  assert(codeError.textContent&&app.innerHTML.includes('id="signup-code-form"'));
  assert.equal(sessionValues.has('reeltrip-signup-preview-member'),stored);
  submit('signup-code-form',{code:demoCode});
  assert.equal(sessionValues.get('reeltrip-signup-preview-member'),'yes');
  const assigned=values.get('reeltrip-preview-nickname-v1');
  assert(ctx.window.ReelNicknameBases[lang].some(base=>assigned.startsWith(base+' ')) && / \d{4}$/.test(assigned) && assigned.length<=20);
  assert.equal(ctx.location.hash,ctx.window.ReelAccess.home());
  ctx.location.hash='#'+ctx.location.hash;handlersForWindow.hashchange();
  assert(!app.innerHTML.includes('class="signup-screen"'));
  assert(!app.innerHTML.includes('class="guest-account-actions"'));
  const prefKey='reeltrip-notification-preferences-v1';
  assert.equal(JSON.parse(values.get(prefKey)).marketingEmail,stored,'Unchecked signup is not consent; checked signup is retained');
  const dialog={open:false,dataset:{},innerHTML:'',setAttribute(){},removeAttribute(){},showModal(){this.open=true},close(){this.open=false}};
  const error={textContent:''},toast={textContent:'',classList:{add(){},remove(){}}};
  const query=ctx.document.querySelector;
  ctx.document.querySelector=s=>s==='#dialog'?dialog:s==='#notification-settings-error'?error:s==='#toast'?toast:query(s);
  ctx.location.hash='#settings';handlersForWindow.hashchange();
  assert(app.innerHTML.includes('data-action="notification-settings"'));
  const click=action=>handlers.click({target:{closest:s=>s==='[data-action]'?{dataset:{action}}:null},preventDefault(){}});
  click('notification-settings');assert(dialog.open);assert(dialog.innerHTML.includes('notification-settings-form'));
  submit('notification-settings-form',{});assert(!dialog.open);
  assert.equal(JSON.parse(values.get(prefKey)).serviceEmail,false);
  assert.equal(JSON.parse(values.get(prefKey)).marketingEmail,false);
  click('notification-settings');assert(!/name="serviceEmail" checked/.test(dialog.innerHTML));
  submit('notification-settings-form',{serviceEmail:'on',marketingEmail:'on'});
  const before=values.get(prefKey);click('notification-settings');click('close');assert.equal(values.get(prefKey),before,'Cancel preserves preferences');
  ctx.location.hash='#signup-email?mode=signin';handlersForWindow.hashchange();
  assert(!app.innerHTML.includes('id="signup-marketing"'),'Login never re-requests consent');
  submit('signup-email-form',{email:'traveler@example.com'});submit('signup-code-form',{code:demoCode});
  assert.equal(values.get(prefKey),before,'Login preserves consent and timestamp');
  ctx.location.hash='#settings';handlersForWindow.hashchange();click('notification-settings');
  const setItem=ctx.localStorage.setItem;ctx.localStorage.setItem=(k,v)=>{if(k===prefKey)throw Error('quota');setItem(k,v);};
  submit('notification-settings-form',{});assert(dialog.open&&error.textContent,'Storage failures do not claim success');assert.equal(values.get(prefKey),before);ctx.localStorage.setItem=setItem;
  // Verified demo email is retained for mate notification email reuse.
  assert(!app.innerHTML.includes('traveler@example.com'));
 }
}
console.log('PASS: complete KO/EN entry scripts and Chinese/Japanese sign-up initialize main navigation and sign-up on customer/mate routes.');
