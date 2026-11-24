const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
for(const suffix of ['', '.en']){
 const source=fs.readFileSync(`${__dirname}/../../src/assets/app${suffix}.js`,'utf8');
 const handler=source.split("else if(a==='save-result-place'){")[1].split("\n else if(a==='save-places')")[0].replace(/}\s*$/,'');
 const card=source.slice(source.indexOf('function placeCard('),source.indexOf('\nfunction results('));
 const p={id:'forest',name:'Seoul Forest',address:'Seoul',type:'Park'};
 const attributes={};let persisted;
 const context={state:{library:['forest'],board:['forest'],focus:''},id:'forest',place:()=>p,libraryIds:()=>context.state.library,save:()=>{persisted=JSON.parse(JSON.stringify(context.state));},b:{setAttribute:(key,value)=>attributes[key]=value},toast:()=>{},esc:String,placeArt:()=>'',icon:()=>''};
 vm.createContext(context);vm.runInContext(card,context);
 const savedCard=vm.runInContext('placeCard(place())',context);
 assert(!savedCard.includes('disabled'));assert(savedCard.includes('aria-pressed="true"'));
 assert(!savedCard.includes('Park'));assert(savedCard.includes('Seoul Forest'));assert(savedCard.includes('Seoul'));
 vm.runInContext(`(()=>{${handler}})()`,context);
 assert.deepEqual(persisted.library,[]);assert.deepEqual(persisted.board,['forest']);assert.equal(attributes['aria-pressed'],'false');
 vm.runInContext(`(()=>{${handler}})()`,context);
 assert.deepEqual(persisted.library,['forest']);assert.deepEqual(persisted.board,['forest']);assert.equal(attributes['aria-pressed'],'true');
 assert.equal(context.b.disabled,undefined);
}
console.log('PASS: KO/EN saved-place buttons remain enabled, toggle persistence and aria-pressed, and preserve itinerary places.');
