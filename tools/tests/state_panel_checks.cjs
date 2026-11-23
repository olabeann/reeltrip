// Exercise every panel choice, language toggle, direct URL and postMessage boundary.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'../..'),registry=JSON.parse(fs.readFileSync(path.join(root,'resources/review/screen-states.json'))),screens=JSON.parse(fs.readFileSync(path.join(root,'docs/screen-spec.json')));
const makeNode=()=>({value:'',textContent:'',children:[],attrs:{},classList:{toggle(){}},setAttribute(k,v){this.attrs[k]=v;},append(n){this.children.push(n);},replaceChildren(){this.children=[];}});
const nodes=Object.fromEntries(['screen','states','language','condition','transition','state-note','preview-status','spec','standalone','selection','reset','copy','copy-status'].map(id=>['#'+id,makeNode()]));
const frame={...makeNode(),contentWindow:{},style:{}},events={};let url=new URL('http://localhost/src/frontend/states.html#screen=guides&state=waiting&lang=ko');
const location={get href(){return url.href;},get hash(){return url.hash;},get origin(){return url.origin;}};
const context={URL,URLSearchParams,location,history:{pushState(a,b,value){url=new URL(value,url);},replaceState(a,b,value){url=new URL(value,url);}},navigator:{clipboard:{async writeText(value){context.copied=value;}}},document:{querySelector:s=>s==='iframe'?frame:nodes[s],createElement:makeNode},window:{REEL_REVIEW_SCREENS:screens,REEL_SCREEN_STATES:registry,addEventListener:(name,fn)=>events[name]=fn}};
vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(root,'src/frontend/states.js'),'utf8'),context);
let count=0;
function verify(route,v,lang){
 const target=new URL(frame.src,url),params=new URLSearchParams(url.hash.slice(1));
 assert.equal(target.hash,'#'+(v.fixture.hash||route));assert.equal(target.searchParams.get('state'),v.id);assert.equal(target.searchParams.get('screen'),route);assert.equal(target.searchParams.get('lang'),lang);
 assert.equal(params.get('screen'),route);assert.equal(params.get('state'),v.id);assert.equal(params.get('lang'),lang);
 assert.equal(nodes['#states'].children.filter(b=>b.attrs['aria-pressed']==='true').length,1);
 assert.equal(nodes['#states'].children.find(b=>b.attrs['aria-pressed']==='true').textContent,v.label);
 assert.equal(nodes['#condition'].textContent,v.condition);assert.equal(nodes['#transition'].textContent,v.transition);
 const shared=new URL(nodes['#standalone'].href,url),clean=new URL(frame.src,url);clean.searchParams.delete('previewRun');assert.equal(shared.href,clean.href);
 assert.equal(frame.style.visibility,'hidden','Previous frame must stay hidden until the requested state is ready');
 assert.equal(target.pathname.includes('-admin'),screens.find(s=>s.route===route).role==='admin');
 count++;
}
for(const lang of ['ko','en'])for(const [route,variants] of Object.entries(registry)){
 nodes['#screen'].value=route;nodes['#screen'].onchange();nodes['#language'].value=lang;nodes['#language'].onchange();
 for(const v of variants){nodes['#states'].children.find(b=>b.textContent===v.label).onclick();verify(route,v,lang);const beforeReset=frame.src;nodes['#reset'].onclick();assert.notEqual(frame.src,beforeReset,'Reset must create a fresh document even on the same state');verify(route,v,lang);events.popstate();verify(route,v,lang);}
}
// Invalid direct links are normalized, so the visible choice and copied link agree.
url=new URL('http://localhost/src/frontend/states.html#screen=unknown&state=missing&lang=invalid');events.hashchange();verify('guides',registry.guides[0],'ko');
const expected=new URL(frame.src,url);
const emit=(data,source=frame.contentWindow,origin=url.origin)=>events.message({source,origin,data:{type:'reeltrip-preview-status',ready:true,...data}});
emit({url:expected.href,ready:false});assert.equal(frame.style.visibility,'hidden');assert(nodes['#preview-status'].textContent.includes('불러오지 못했어요'));
emit({url:expected.href,changed:false});assert.equal(nodes['#preview-status'].textContent,'선택한 상태 표시 중');
emit({url:expected.href,changed:true},{},'https://untrusted.example');assert.equal(nodes['#preview-status'].textContent,'선택한 상태 표시 중');
emit({url:expected.href,changed:true});assert(nodes['#preview-status'].textContent.includes('조작한 상태'));
expected.hash='#account';emit({url:expected.href,changed:true});assert(nodes['#preview-status'].textContent.includes('다른 화면으로 이동'));
console.log(`PASS: ${count} panel selection/reset/history assertions, direct link normalization and frame status isolation.`);
