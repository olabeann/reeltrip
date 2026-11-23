const fs=require('fs'),vm=require('vm'),assert=require('assert');
for(const lang of ['', '.en']){
 const catalog=fs.readFileSync(__dirname+`/../../src/assets/catalog${lang}.js`,'utf8');
 const app=fs.readFileSync(__dirname+`/../../src/assets/app${lang}.js`,'utf8').split('// Refresh only unchanged legacy seed labels; preserve user-entered addresses.')[0];
 function run(saved,query=''){const context={window:{},document:{body:{dataset:{option:'2'},classList:{add(){}}}},location:{search:query},URLSearchParams,localStorage:{getItem(){return saved?JSON.stringify(saved):null;}}};vm.createContext(context);vm.runInContext(catalog,context);vm.runInContext(app+'\nglobalThis.result=JSON.parse(JSON.stringify(state));})();',context);return context.result;}
 const fresh=run(null);assert.deepEqual([...fresh.board],['forest','cafe','shop']);assert(fresh.library.includes('n-seoul-tower'));assert.equal(fresh.places.filter(p=>p.id==='n-seoul-tower').length,1);
 const legacy={places:[{id:'custom',name:'My saved place'}],board:['custom'],days:[{ids:['custom']}],title:'Keep my title'};const upgraded=run(legacy);assert.deepEqual([...upgraded.board],['custom','n-seoul-tower']);assert.equal(upgraded.title,'Keep my title');assert.equal(upgraded.places[0].name,'My saved place');assert.equal(run(upgraded).board.length,2);
 upgraded.board=['custom'];assert.deepEqual([...run(upgraded).board],['custom']);assert(run(null,'?compare=1').board.includes('n-seoul-tower'));
}
console.log('PASS: Korean/English defaults, legacy migration, duplicate prevention, and explicit removal.');
