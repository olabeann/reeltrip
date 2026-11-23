const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
for(const lang of ['ko','en']){
 const store=new Map(),phone={name:'contact',type:'tel',value:'010-1234-5678'},form={elements:[phone]},code={value:'',focus(){}},message={textContent:''};
 const ctx={sessionStorage:{getItem:()=> 'yes'},URLSearchParams,Event:class{},location:{search:'',hash:'#mate-register'},document:{querySelector:s=>({'#mate-form':form,'#mate-phone-code':code,'#mate-phone-status':message}[s]),documentElement:{lang},body:{dataset:{},classList:{add(){}}},addEventListener(){}},window:{addEventListener(){},dispatchEvent(){},scrollTo(){}},localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},setTimeout,clearTimeout};vm.createContext(ctx);
 for(const f of ['nickname-bases','signup-copy','access','catalog'+(lang==='en'?'.en':'')])vm.runInContext(fs.readFileSync(__dirname+'/../../src/assets/'+f+'.js','utf8'),ctx);
 const src=fs.readFileSync(__dirname+'/../../src/assets/app'+(lang==='en'?'.en':'')+'.js','utf8').split('window.ReelBookingTools.init(')[0];
 vm.runInContext(src+`render=()=>{};toast=()=>{};isGuest=()=>false;globalThis.m={matePhoneUI,matePhoneAction,matePhoneVerified,mateApplication,saveMate,mateRegistration,submitMate,age:ms=>matePhoneDemo.sentAt=Date.now()-ms,state:()=>matePhoneDemo};})();`,ctx);
 const m=ctx.m;m.saveMate({status:'draft',step:3,fields:{contact:phone.value}});
 assert(!m.mateRegistration().includes('name="experience"'));
 m.submitMate(form);assert.equal(m.mateApplication().step,3);
 m.matePhoneAction('send');assert(m.state().sentAt);assert(m.mateRegistration().includes('autocomplete="one-time-code"'));if(lang==='en')assert(!/[가-힣]/.test(m.matePhoneUI(m.mateApplication())));
 const sent=m.state().sentAt;m.matePhoneAction('send');assert.equal(m.state().sentAt,sent);
 code.value='000000';m.matePhoneAction('verify');assert(!m.matePhoneVerified(m.mateApplication()));assert(message.textContent);
 code.value='123456';m.age(180001);m.matePhoneAction('verify');assert(!m.state().verified);
 m.matePhoneAction('send');code.value='000000';for(let i=0;i<5;i++)m.matePhoneAction('verify');code.value='123456';m.matePhoneAction('verify');assert(!m.state().verified);
 m.age(31000);m.matePhoneAction('send');m.matePhoneAction('verify');assert(m.matePhoneVerified(m.mateApplication()));m.submitMate(form);assert.equal(m.mateApplication().step,4);
 phone.value='010-9999-8888';m.submitMate(form);assert.equal(m.mateApplication().step,3);assert(!m.matePhoneVerified(m.mateApplication()));
}
console.log('PASS: KO/EN demo phone UI, verification gate, resend cooldown, expiry, attempt limit and changed-number rejection. No SMS sent.');
