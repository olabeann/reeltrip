// Execute complete entry scripts, including init/render, to catch startup failures.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'..');
for(const stored of [false,true])for(const lang of ['ko','en'])for(const mode of ['customer','guide'])for(const requested of ['home','board','trips','guides','account','settings','notifications','guide-desk','guide-fee']){
 const route=mode==='guide'&&requested==='home'?'guide-desk':requested;
 const app={innerHTML:''},values=new Map();values.set('reeltrip-prototype-access-v1',JSON.stringify({profile:'guide',mode}));
 if(stored)values.set('reeltrip-demo-'+lang+'-map-v2-option-2',JSON.stringify({places:[],board:[],request:{id:'RQ-OLD',status:'booked',date:'2026-12-01',party:2,time:'10:00',stops:[],must:[]},booking:{id:'BK-OLD',guide:'Mina',status:'confirmed',date:'2026-12-01',time:'10:00',amount:240000,party:2,plan:'A walk',policyVersion:'DRAFT-2026-11-16'}}));
 const ctx={URL,URLSearchParams,Event:class{},location:{hash:'#'+route,search:''},setTimeout,clearTimeout,document:{documentElement:{lang},title:'',body:{dataset:{},classList:{add(){}}},querySelector(s){return s==='#app'?app:null},querySelectorAll(){return []},addEventListener(){}},window:{addEventListener(){},dispatchEvent(){},scrollTo(){}},localStorage:{getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)}};
 vm.createContext(ctx);
 const html=fs.readFileSync(path.join(root,lang==='en'?'app/english.html':'app/index.html'),'utf8');
 const scripts=[...html.matchAll(/<script src="([^"?]+)[^"]*"/g)].map(m=>path.resolve(root,'app',m[1]));
 for(const file of scripts)vm.runInContext(fs.readFileSync(file,'utf8'),ctx,{filename:file});
 assert(app.innerHTML.includes('<main'),`${lang}/${mode}/${route}: blank startup`);
 assert(app.innerHTML.includes('mobiletabs'),`${lang}/${mode}/${route}: missing navigation`);
}
console.log('PASS: complete KO/EN entry scripts initialize and render main navigation across customer/mate routes.');
