const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
const registry=JSON.parse(fs.readFileSync(path.join(root,'resources/review/screen-states.json')));
const screens=JSON.parse(fs.readFileSync(path.join(root,'docs/screen-spec.json')));
assert.deepEqual(Object.keys(registry).sort(),screens.map(s=>s.route).sort(),'Every screen must register its implemented states');
for(const [route,variants] of Object.entries(registry)){
 assert(variants.length>0,route+' has no states');
 assert.equal(new Set(variants.map(v=>v.id)).size,variants.length,route+' duplicate state IDs');
 for(const v of variants)assert(v.condition&&v.transition&&v.fixture,route+'/'+v.id+' missing specification');
}
const inventory=[];
const reviewTime=Date.parse('2026-11-23T00:00:00Z');
class ReviewDate extends Date{constructor(...args){super(...(args.length?args:[reviewTime]));}static now(){return reviewTime;}}
for(const lang of ['ko','en'])for(const [route,variants] of Object.entries(registry))for(const variant of variants){
 const app={innerHTML:''},dialog={innerHTML:'',dataset:{},setAttribute(){},removeAttribute(){},showModal(){this.open=true}},handlers={},sessionHandlers={};
 const admin=screens.find(s=>s.route===route).role==='admin';
 const description=`${lang}/${route}/${variant.id}`;
 const fixture=variant.fixture||{};
 let realStorageTouches=0;
 const forbidden={getItem(){realStorageTouches++;throw new Error('Real storage read');},setItem(){realStorageTouches++;throw new Error('Real storage write');}};
 const ctx={Date:ReviewDate,console,URL,URLSearchParams,location:{hash:'#'+(fixture.hash||route),search:'?lang='+lang+'&state='+variant.id},localStorage:forbidden,sessionStorage:forbidden,
  setTimeout:()=>0,clearTimeout(){},scrollTo(){},addEventListener:(name,fn)=>sessionHandlers[name]=fn,dispatchEvent(){},
  document:{documentElement:{lang},body:{dataset:admin?{surface:'admin'}:{},classList:{add(){}}},querySelector:s=>s==='#app'?app:s==='#dialog'?dialog:null,querySelectorAll:()=>[],addEventListener:(name,fn)=>handlers[name]=fn}};
 ctx.window=ctx;vm.createContext(ctx);
 const file=`preview${admin?'-admin':''}${lang==='en'?'-en':''}.html`;
 const html=fs.readFileSync(path.join(root,'src/frontend',file),'utf8');
 for(const match of html.matchAll(/<script src="([^"?]+)[^"]*"/g)){
  const script=path.resolve(root,'src/frontend',match[1]);vm.runInContext(fs.readFileSync(script,'utf8'),ctx,{filename:script});
 }
 // Include the saved-place add sheet, which owns the search entry after the header action.
 if(route==='board'&&!fixture.guest)handlers.click({target:{closest:s=>s==='[data-action]'?{dataset:{action:'board-add'}}:null},preventDefault(){}});
 inventory.push({route,state:variant.id,lang,html:app.innerHTML+dialog.innerHTML});
}
process.stdout.write(JSON.stringify(inventory));
