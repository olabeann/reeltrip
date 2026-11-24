// Run the real entry scripts and exercise withdrawal through UI events.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'../../src');
for(const lang of ['ko','en'])for(const mode of ['customer','guide']){
 const values=new Map(),sessions=new Map([['reeltrip-signup-preview-member','yes']]),handlers={},windowHandlers={};
 const keys=['ko','en'].flatMap(l=>['','-comparison'].map(s=>`reeltrip-demo-${l}-map-v2-option-2${s}`));
 for(const k of keys)values.set(k,JSON.stringify({places:[],board:[],profile:{nickname:'Tester'}}));
 values.set('reeltrip-mate-application-v1',JSON.stringify({status:'approved',fields:{name:'Mate Tester'}}));
 values.set('reeltrip-prototype-access-v1',JSON.stringify({profile:'guide',mode}));
 values.set('unrelated','preserve');
 const app={innerHTML:''},error={textContent:''},toast={textContent:'',classList:{add(){},remove(){}}};
 const dialog={open:false,dataset:{},innerHTML:'',setAttribute(){},removeAttribute(){},showModal(){this.open=true},close(){this.open=false}};
 class HTMLFormElement{constructor(agree){this.id='withdraw-account-form';this.elements={agree:{checked:agree}};}}
 let fail=false;
 const ctx={URL,URLSearchParams,Event:class{},HTMLFormElement,FormData:class{},location:{hash:'#settings',search:'?lang='+lang},setTimeout:()=>0,clearTimeout(){},sessionStorage:{getItem:k=>sessions.get(k),setItem:(k,v)=>sessions.set(k,v),removeItem:k=>sessions.delete(k)},localStorage:{getItem:k=>values.get(k)||null,setItem:(k,v)=>{if(fail)throw Error('storage unavailable');values.set(k,v)},removeItem:k=>values.delete(k)},document:{documentElement:{lang},body:{dataset:{},classList:{add(){}}},querySelector:s=>({'#app':app,'#dialog':dialog,'#withdraw-account-error':error,'#toast':toast}[s]||null),querySelectorAll:()=>[],addEventListener:(name,fn)=>handlers[name]=fn},window:{addEventListener:(name,fn)=>windowHandlers[name]=fn,dispatchEvent(){},scrollTo(){}}};
 vm.createContext(ctx);
 const html=fs.readFileSync(path.join(root,lang==='en'?'app/english.html':'app/index.html'),'utf8');
 for(const m of html.matchAll(/<script src="([^"?]+)[^"]*"/g)){const file=path.resolve(root,'app',m[1]);vm.runInContext(fs.readFileSync(file,'utf8'),ctx,{filename:file});}
 const click=action=>handlers.click({target:{closest:s=>s==='[data-action]'?{dataset:{action}}:null},preventDefault(){}});
 const submit=agree=>handlers.submit({target:new HTMLFormElement(agree),preventDefault(){}});
 assert(app.innerHTML.includes('data-action="withdraw-account"'));
 const before=new Map(values);click('withdraw-account');assert(dialog.open);assert(dialog.innerHTML.includes('name="agree" required'));
 assert(dialog.innerHTML.indexOf('data-action="close"')<dialog.innerHTML.indexOf('class="btn danger"'));
 click('close');assert.deepEqual(values,before);assert(!dialog.open);
 click('withdraw-account');submit(false);assert.deepEqual(values,before);
 // A booking created in the other language after the dialog opens must block submission.
 const other=keys.find(k=>!k.includes(`-${lang}-`));
 for(const status of ['awaiting_mate_fee','confirmed']){
  values.set(other,JSON.stringify({booking:{status}}));submit(true);assert(error.textContent);assert(sessions.has('reeltrip-signup-preview-member'));
 }
 values.set(other,JSON.stringify({bookingHistory:[{status:'confirmed'}]}));submit(true);assert(sessions.has('reeltrip-signup-preview-member'));
 click('withdraw-account');assert(!dialog.innerHTML.includes('withdraw-account-form'),'Active bookings block opening the form');
 values.set(other,JSON.stringify({booking:{status:'completed'},bookingHistory:[{status:'cancelled'}]}));click('withdraw-account');
 fail=true;submit(true);assert(error.textContent);assert(sessions.has('reeltrip-signup-preview-member'));fail=false;
 values.set('reeltrip-prototype-nicknames-v1',JSON.stringify({tester:'traveler-demo',mate:'mate-demo',other:'another-member'}));
 submit(true);
 for(const k of [...keys,'reeltrip-preview-nickname-v1','reeltrip-mate-application-v1','reeltrip-prototype-access-v1'])assert(!values.has(k),k);
 assert(!sessions.has('reeltrip-signup-preview-member'));assert.equal(ctx.location.hash,'home');assert.equal(ctx.window.ReelAccess.mode(),'customer');assert(!dialog.open);
 assert.equal(values.get('unrelated'),'preserve');assert.equal(values.get('reeltrip-interface-language'),lang);
 const directory=JSON.parse(values.get('reeltrip-prototype-nicknames-v1'));assert.equal(directory.other,'another-member');assert(!Object.values(directory).includes('traveler-demo'));assert(!Object.values(directory).includes('mate-demo'));
 windowHandlers.storage({key:'reeltrip-prototype-access-v1',newValue:null});assert(!sessions.has('reeltrip-signup-preview-member'));
 // Old controls cannot delete data again after membership ends.
 values.set(keys[0],'sentinel');click('withdraw-account');assert(!dialog.open);assert.equal(values.get(keys[0]),'sentinel');
}
console.log('PASS: KO/EN traveler/mate withdrawal, cancellation, consent, active bookings/history, storage failure, deletion scope and guest transition.');
