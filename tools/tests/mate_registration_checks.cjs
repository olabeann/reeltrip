const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
function setup(lang,admin=false,store=new Map()){
 const ctx={sessionStorage:{getItem:()=> 'yes'},URLSearchParams,Event:class{},location:{search:'',hash:'#mate-register'},document:{documentElement:{lang},body:{dataset:{surface:admin?'admin':''},classList:{add(){}}},addEventListener(){}},window:{addEventListener(){},dispatchEvent(){}},localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},setTimeout,clearTimeout};vm.createContext(ctx);
 for(const f of ['nickname-bases','signup-copy','access','catalog'+(lang==='en'?'.en':'')])vm.runInContext(fs.readFileSync(__dirname+'/../../src/assets/'+f+'.js','utf8'),ctx);
 const code=fs.readFileSync(__dirname+'/../../src/assets/app'+(lang==='en'?'.en':'')+'.js','utf8').split('window.ReelBookingTools.init(')[0];vm.runInContext(code+'globalThis.m={mateNameProblem,readNicknameDirectory,nicknameProblem,account,mateApplication,saveMate,validMate,reviewMate,mateRegistration,mateAdmin,validMateRegions,mateRegionText,mateDistricts,mateRegionSheet,toggleMateRegion,setRegionDraft:(city,regions)=>{mateRegionCity=city;mateRegionDraft=regions;},getRegionDraft:()=>mateRegionDraft,matePublicProfile,guidePage,matePublicPreview,captureMate,readMatePhoto};})();',ctx);return ctx;
}
for(const lang of ['ko','en']){
 const store=new Map(),app=setup(lang,false,store),ops=setup(lang,true,store);
 const dialog={innerHTML:''};app.document.querySelector=()=>dialog;
 for(const status of ['draft','pending','approved','needs_info','rejected']){
  app.m.saveMate({status,step:4,fields:{}});
  const page=app.m.account();
  assert.equal(page.includes('data-access-mode="guide"'),status==='approved');
  assert(page.includes(status==='approved'?'href="#guide-desk"':'href="#mate-register"'));
  if(lang==='en')assert(!/[가-힣]/.test(page));
 }
 store.delete('reeltrip-mate-application-v1');app.window.ReelAccess.reset();

 store.set('reeltrip-prototype-nicknames-v1',JSON.stringify({takenuser:'traveler-other',myuser:'traveler-demo'}));
 assert(app.m.mateNameProblem('Taken User'));assert(app.m.mateNameProblem('ＭＹＵＳＥＲ'));assert.equal(app.m.mateNameProblem('Fresh Mate'),'');
 app.m.saveMate({status:'draft',fields:{name:'Fresh Mate'}});
 assert.equal(app.m.mateNameProblem('Fresh Mate'),'');assert(app.m.nicknameProblem('Fresh Mate',app.m.readNicknameDirectory()));
 const edited=app.m.captureMate({elements:[{name:'name',type:'text',value:'Changed Mate'}]},{fields:{name:'Fresh Mate',nameChecked:'freshmate'}});assert.equal(edited.fields.nameChecked,undefined);
 store.delete('reeltrip-prototype-nicknames-v1');store.delete('reeltrip-mate-application-v1');
 const counts=[25,16,9,11,5,5,5,0,47,18,14,16,15,22,23,22,2];
 for(let city=0;city<17;city++){
  const districts=app.m.mateDistricts[city];assert.equal(districts.length,counts[city]);assert.equal(new Set(districts).size,districts.length);
  app.m.setRegionDraft(city,[]);app.m.mateRegionSheet(false);
  assert.equal((dialog.innerHTML.match(/data-action="mate-region-toggle"/g)||[]).length,districts.length+1);
  for(let district=0;district<districts.length;district++){
   assert(app.m.validMateRegions([{city,district}]));assert(app.m.mateRegionText([{city,district}]).includes(districts[district]));
   if(lang==='en')assert(!/[가-힣]/.test(app.m.mateRegionText([{city,district}])));
  }
  assert(!app.m.validMateRegions([{city,district:districts.length}]));
  const other={city:city===0?1:0,district:'all'};
  app.m.setRegionDraft(city,[other]);app.m.toggleMateRegion('all');assert.equal(app.m.getRegionDraft().length,2);
  if(districts.length){
   app.m.toggleMateRegion('0');const selected=app.m.getRegionDraft();
   assert.equal(selected.filter(r=>r.city===city).length,districts.length-1);
   assert(!selected.some(r=>r.city===city&&(r.district===0||r.district==='all')));
   assert(selected.some(r=>r.city===other.city));
   app.m.toggleMateRegion('0');assert.equal(app.m.getRegionDraft().length,districts.length+1);
   app.m.toggleMateRegion('all');assert.equal(app.m.getRegionDraft().length,2);
  }
  app.m.toggleMateRegion('all');assert.equal(app.m.getRegionDraft().length,1);
 }
 assert(!app.m.validMateRegions([null]));assert(!app.m.validMateRegions([{city:17,district:'all'}]));
 const mixedRegions=[{city:0,district:10},{city:1,district:8},{city:8,district:0},{city:16,district:1},{city:3,district:'all'}];
 app.m.saveMate({status:'draft',step:1,fields:{regions:mixedRegions}});
 const reloaded=setup(lang==='ko'?'en':'ko',false,store);
 assert.equal(JSON.stringify(reloaded.m.mateApplication().fields.regions),JSON.stringify(mixedRegions));
 assert(reloaded.m.validMateRegions(reloaded.m.mateApplication().fields.regions));
 if(lang==='ko')assert.equal(app.m.mateRegionText(mixedRegions),'서울 노원구, 부산 해운대구, 경기 수원시 장안구, 제주 서귀포시, 인천 전체');
 const a={status:'draft',step:4,fields:{photo:'data:image/png;base64,demo',specialty:'0',region:'Seoul',regions:[{city:0,district:3}],languages:'en',name:'Test mate',bio:'A friendly local with many years of neighborhood walking experience.',contact:'010-1234-5678',experience:'Local walking experience',policy:true,consent:true,adult:true,email:'mate@example.com',emailVerified:'mate@example.com'}};
 const multi={...a,fields:{...a.fields,languages:['en','ja']}};
 assert(app.m.validMate(multi));assert(!app.m.validMate({...multi,fields:{...multi.fields,photo:''}}));assert(!app.m.validMate({...multi,fields:{...multi.fields,bio:'x'.repeat(1001)}}));
 for(const languages of [[],['bad'],['en','bad'],['en','en'],true])assert(!app.m.validMate({...a,fields:{...a.fields,languages}}));
 const captured=app.m.captureMate({elements:[{name:'languages',type:'checkbox',value:'en',checked:true},{name:'languages',type:'checkbox',value:'ja',checked:true},{name:'languages',type:'checkbox',value:'ko',checked:false}]},{fields:{languages:'ko'}});
 assert.equal(JSON.stringify(captured.fields.languages),'["en","ja"]');
 const cleared=app.m.captureMate({elements:[{name:'languages',type:'checkbox',value:'en',checked:false}]},{fields:{languages:['en']}});assert.equal(cleared.fields.languages.length,0);
 const partial=app.m.captureMate({elements:[{name:'name',type:'text',value:'Mate'}]},{fields:{languages:['en','ja']}});assert.equal(partial.fields.languages.length,2);
 app.m.saveMate(multi);const restored=setup(lang,false,store);assert.equal(JSON.stringify(restored.m.mateApplication().fields.languages),'["en","ja"]');
 const preview=app.m.matePublicPreview(multi);assert(preview.includes(lang==='ko'?'영어, 일본어':'English, Japanese'));
 app.m.saveMate({...multi,step:1});const multiHTML=app.m.mateRegistration();assert.equal((multiHTML.match(/type="checkbox" name="languages"/g)||[]).length,4);assert(!multiHTML.includes('type="radio" name="languages"'));
 assert(app.m.validMate({...a,fields:{...a.fields,bio:'A kind local mate',experience:''}}));
 assert(!app.m.validMate({...a,fields:{...a.fields,bio:'short'}}));
 assert(app.m.validMate({...a,fields:{...a.fields,specialty:undefined}}));
 const publicInfo=app.m.matePublicPreview({...a,fields:{...a.fields,localContext:'Local for 3 years',pace:'Slow walks',help:'Menu help'}});
 assert(publicInfo.includes('Local for 3 years'));assert(publicInfo.includes('Slow walks'));assert(!publicInfo.includes(a.fields.contact));assert(!publicInfo.includes(a.fields.experience));
 const publicFields={...multi.fields,name:'Local <Mate>',bio:'Custom introduction\nSecond line',photo:'data:image/png;base64,TEST',contact:'010-9999-0000',specialty:2};
 const profile=app.m.matePublicProfile(publicFields);
 for(const value of ['Local &lt;Mate&gt;','Custom introduction\nSecond line','data:image/png;base64,TEST',app.m.mateRegionText(publicFields.regions)])assert(profile.includes(value));
 assert(!profile.includes(publicFields.contact));assert(!profile.includes(lang==='ko'?'활동 분야':'Specialty'));
 assert(app.m.matePublicPreview({fields:publicFields}).includes(profile));
 app.m.saveMate({status:'approved',fields:publicFields});app.location.hash='#guide?mate=self';assert(app.m.guidePage().includes(app.m.matePublicProfile(publicFields,true)));
 app.m.saveMate({status:'pending',fields:publicFields});assert(!app.m.guidePage().includes(publicFields.photo));app.location.hash='#mate-register';
 assert.equal(app.m.captureMate({elements:[{name:'photo',type:'file',value:'fakepath'}]},{fields:{photo:'retained'}}).fields.photo,'retained');
 const error={textContent:''};app.document.querySelector=()=>error;
 app.m.readMatePhoto({files:[{type:'image/svg+xml',size:100}],value:'bad'});assert(error.textContent);
 app.m.readMatePhoto({files:[{type:'image/jpeg',size:1048577}],value:'large'});assert(error.textContent);
 let reader;app.FileReader=class{constructor(){reader=this;}readAsDataURL(){}};
 app.m.saveMate(a);app.m.readMatePhoto({files:[{type:'image/png',size:100}],value:'photo'});reader.result='data:image/png;base64,demo';reader.onload();assert.equal(app.m.mateApplication().fields.photo,reader.result);
 app.m.readMatePhoto({files:[{type:'image/png',size:100}],value:'photo'});app.m.saveMate({...a,status:'pending'});reader.result='late';reader.onload();assert.notEqual(app.m.mateApplication().fields.photo,'late');
 app.m.saveMate({...a,fields:{...a.fields,name:'<Mate>',photo:'data:image/png;base64,demo',localContext:'My neighborhood',pace:'Slow',help:'Translation'}});
 app.window.ReelAccess.mode=()=> 'guide';
 const mine=app.m.account();assert(mine.includes('&lt;Mate&gt;'));assert(mine.includes(a.fields.bio));assert(mine.includes('data:image/png;base64,demo'));
 for(const value of [a.fields.contact,'My neighborhood','Slow','Translation'])assert(mine.includes(value));
 assert(!mine.includes(a.fields.experience));assert(mine.includes('rt-info-card--private'));assert(mine.includes('data-action="mate-edit-profile"'));assert(mine.includes('data-action="mate-edit-activity"'));assert(!mine.includes('data-action="edit-profile"'));assert(!mine.includes('class="mate-entry"'));
 app.window.ReelAccess.mode=()=> 'customer';assert(app.m.account().includes('data-action="edit-profile"'));
 for(const contact of ['01012345678','010-1234-5678','010 1234 5678'])assert(app.m.validMate({...a,fields:{...a.fields,contact}}));
 for(const contact of ['test@example.com','010123','0212345678'])assert(!app.m.validMate({...a,fields:{...a.fields,contact}}));
 app.m.saveMate({...a,step:3});const contactHTML=app.m.mateRegistration();assert(contactHTML.includes('type="tel"'));assert(contactHTML.includes('data-action="mate-contact-support"'));assert(!contactHTML.includes('<p class="notice">'));
 assert(app.m.validMate(a));assert(!app.m.validMate({...a,fields:{...a.fields,regions:[]}}));assert(!app.m.validMate({...a,fields:{...a.fields,languages:'English Japanese'}}));assert(!app.m.validMateRegions([{city:0,district:99}]));assert(app.m.validMateRegions([{city:0,district:'all'},{city:1,district:'all'}]));assert(!app.m.validMate({...a,fields:{...a.fields,consent:false}}));assert(!app.m.validMate({...a,fields:{...a.fields,contact:'bad'}}));
 app.m.saveMate(a);assert.equal(setup(lang,false,store).m.mateApplication().fields.name,'Test mate');
 a.status='pending';app.m.saveMate(a);
 ops.location.hash='#admin-guides';const listing=ops.m.mateAdmin();assert(listing.includes('record=application'));assert(!listing.includes('id="mate-review-form"'));
 ops.location.hash='#admin-guides?record=application';assert(ops.m.mateAdmin().includes('id="mate-review-form"'));
 ops.location.hash='#admin-guides?record=missing';assert(!ops.m.mateAdmin().includes('id="mate-review-form"'));
 ops.location.hash='#admin-guides?query=unmatched';assert(!ops.m.mateAdmin().includes('record=application'));
 assert(!app.window.ReelAccess.allowed('guide'));assert(!app.m.reviewMate('approved'));
 assert(ops.m.reviewMate('needs_info','Please expand your experience'));assert.equal(app.m.mateApplication().status,'needs_info');assert(app.m.mateRegistration().includes('Please expand your experience'));
 a.status='pending';app.m.saveMate(a);assert(ops.m.reviewMate('rejected','Please correct your area'));assert(!app.window.ReelAccess.allowed('guide'));
 a.status='pending';app.m.saveMate(a);assert(ops.m.reviewMate('approved'));app.window.ReelAccess.syncMate();assert(app.window.ReelAccess.controls().includes('data-access-mode="guide"'));assert(!ops.m.reviewMate('approved'));assert(app.m.mateRegistration().includes('data-access-mode="guide"'));
 for(let step=0;step<5;step++){app.m.saveMate({...a,status:'draft',step});const html=app.m.mateRegistration();assert(html.includes('id="mate-form"'));assert.equal(html.includes(`${Math.max(1,step)} / 4`),step!==2);assert(!html.includes('name="specialty"'));if(step<=1){assert(!html.includes('data-action="mate-back"'));assert(html.includes('name="languages"'));}}
}
console.log('PASS: KO/EN draft persistence, required fields, unapproved access, admin-only decisions, correction/reapplication, rejection, approval and duplicate decision prevention. Browser-local prototype only.');
