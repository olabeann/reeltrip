const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
function setup(lang,admin=false,store=new Map()){
 const ctx={sessionStorage:{getItem:()=> 'yes'},URLSearchParams,Event:class{},location:{search:'',hash:'#mate-register'},document:{documentElement:{lang},body:{dataset:{surface:admin?'admin':''},classList:{add(){}}},addEventListener(){}},window:{addEventListener(){},dispatchEvent(){}},localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},setTimeout,clearTimeout};vm.createContext(ctx);
 for(const f of ['nickname-bases','signup-copy','access','catalog'+(lang==='en'?'.en':'')])vm.runInContext(fs.readFileSync(__dirname+'/../../src/assets/'+f+'.js','utf8'),ctx);
 const code=fs.readFileSync(__dirname+'/../../src/assets/app'+(lang==='en'?'.en':'')+'.js','utf8').split('window.ReelBookingTools.init(')[0];vm.runInContext(code+'globalThis.m={editMate,saveMateEdit,checkMateName,readMateEditPhoto,getDraft:()=>mateEditDraft,quiet:()=>{render=()=>{};toast=()=>{};},mateNameProblem,readNicknameDirectory,nicknameProblem,account,mateApplication,saveMate,validMate,reviewMate,mateRegistration,mateAdmin,validMateRegions,mateRegionText,mateDistricts,mateRegionSheet,toggleMateRegion,setRegionDraft:(city,regions)=>{mateRegionCity=city;mateRegionDraft=regions;},getRegionDraft:()=>mateRegionDraft,matePublicPreview,captureMate,readMatePhoto};})();',ctx);return ctx;
}

for(const lang of ['ko','en']){
 const store=new Map(),app=setup(lang);app.m.quiet();app.window.ReelAccess.mode=()=> 'guide';
 const dialog={dataset:{},classList:{toggle(){}},setAttribute(){},removeAttribute(){},showModal(){this.open=true},close(){this.open=false},innerHTML:''};
 const error={textContent:''},name={value:'',setAttribute(){}},status={textContent:''},form={elements:[]};
 app.document.querySelector=s=>s==='#dialog'?dialog:s==='#mate-edit-error'?error:s==='#mate-name'?name:s==='#mate-name-status'?status:s==='#mate-edit-form'?form:null;
 const original={status:'approved',step:4,reviewedAt:'2026-11-24',fields:{name:'미나',bio:'A friendly local walking guide.',specialty:'0',regions:[{city:0,district:3}],languages:['en'],contact:'01012345678',policy:true,photo:''}};
 app.m.saveMate(original);
 app.m.editMate('profile');assert(dialog.innerHTML.includes('mate-edit-form'));if(lang==='en')assert(!/[가-힣]/.test(dialog.innerHTML.replaceAll('미나','')));
 app.m.getDraft().fields.bio='Unsaved edits must be discarded.';dialog.close();app.m.editMate('profile');assert.equal(app.m.getDraft().fields.bio,original.fields.bio);
 const profileForm=(n,b)=>({elements:[{name:'name',type:'text',value:n},{name:'bio',type:'textarea',value:b}]});
 app.m.saveMateEdit(profileForm('미나','short'));assert(error.textContent);assert.equal(app.m.mateApplication().fields.bio,original.fields.bio);
 app.m.saveMateEdit(profileForm('미나','Updated biography with enough text.'));assert.equal(app.m.mateApplication().fields.bio,'Updated biography with enough text.');
 app.m.editMate('profile');app.m.saveMateEdit(profileForm('Fresh Mate','Another valid biography.'));assert.notEqual(app.m.mateApplication().fields.name,'Fresh Mate');
 name.value='Fresh Mate';app.m.checkMateName();assert.equal(app.m.mateApplication().fields.name,'미나');app.m.saveMateEdit(profileForm('Fresh Mate','Another valid biography.'));assert.equal(app.m.mateApplication().fields.name,'Fresh Mate');
 app.m.editMate('profile');app.m.saveMateEdit(profileForm('준','Another valid biography.'));assert.equal(app.m.mateApplication().fields.name,'Fresh Mate');
 app.m.editMate('activity');const activity=checked=>({elements:[{name:'specialty',type:'select-one',value:'2'},{name:'languages',type:'checkbox',value:'en',checked},{name:'languages',type:'checkbox',value:'ja',checked}]});
 app.m.saveMateEdit(activity(false));assert.equal(app.m.mateApplication().fields.specialty,'0');
 app.m.getDraft().fields.regions=[{city:1,district:'all'}];app.m.saveMateEdit(activity(true));
 const result=app.m.mateApplication();assert.equal(result.fields.specialty,'2');assert.equal(JSON.stringify(result.fields.languages),'["en","ja"]');assert.equal(result.fields.regions[0].city,1);assert.equal(result.status,'approved');assert.equal(result.reviewedAt,original.reviewedAt);assert.equal(result.fields.contact,original.fields.contact);
 app.m.editMate('activity');const set=app.localStorage.setItem;app.localStorage.setItem=()=>{throw Error('quota')};app.m.saveMateEdit(activity(true));assert(dialog.open);app.localStorage.setItem=set;
 app.m.saveMate({...result,status:'pending'});const html=dialog.innerHTML;app.m.editMate('profile');assert.equal(dialog.innerHTML,html);
}
console.log('PASS: KO/EN mate edits, discard/reopen, validation, duplicate checks, storage failure, approval and private data preservation.');
