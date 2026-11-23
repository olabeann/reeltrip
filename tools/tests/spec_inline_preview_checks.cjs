const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..');
const owners = [{hidden:false}, {hidden:true}];
const details = [0, 0, 1].map((owner, index) => {
 const frame = {dataset:{previewSrc:`../src/frontend/preview.html?lang=ko&screen=results&state=${index}#results`},style:{},contentWindow:{}};
 const status = {}, reset = {addEventListener(_,fn){this.click=fn;}};
 return {open:index!==1,handlers:{},frame,status,reset,closest:()=>owners[owner],
  querySelector:s=>s==='[data-preview-src]'?frame:s==='[data-preview-reset]'?reset:status,
  addEventListener(name,fn){this.handlers[name]=fn;}};
});
let sync, message;
const timers = new Map(); let timerId=0;
const location={href:'file:///project/docs/specification.html',origin:'null'};
vm.runInNewContext(fs.readFileSync(path.join(root,'src/assets/spec-inline-preview.js'),'utf8'),{
 document:{querySelector:()=>({querySelectorAll:()=>details})},location,URL,
 setTimeout:fn=>{timers.set(++timerId,fn);return timerId;},clearTimeout:id=>timers.delete(id),
 MutationObserver:class{constructor(fn){sync=fn;}observe(){}},window:{addEventListener:(_,fn)=>{message=fn;}}
});
assert.match(details[0].frame.src,/preview.html\?.*state=0/);
assert.equal(details[1].frame.src,undefined); assert.equal(details[2].frame.src,undefined);
function report(detail,overrides={}) {message({source:detail.frame.contentWindow,origin:'null',data:{type:'reeltrip-preview-status',url:detail.frame.src,ready:true,...overrides}});}
report(details[0]); assert.equal(details[0].frame.style.visibility,'visible');
assert.equal(timers.size,0);
details[1].open=true; details[1].handlers.toggle();
assert.equal(details[0].open,false); assert.equal(details[0].frame.src,'about:blank');
assert.match(details[1].frame.src,/state=1/);
const firstUrl=details[1].frame.src;
details[1].reset.click(); assert.notEqual(details[1].frame.src,firstUrl);
report(details[1],{url:firstUrl}); assert.equal(details[1].frame.style.visibility,'hidden','Reject stale runs');
message({source:{},origin:'null',data:{type:'reeltrip-preview-status',url:details[1].frame.src,ready:true}});
assert.equal(details[1].frame.style.visibility,'hidden','Reject unrelated frames');
report(details[1]); assert.equal(details[1].frame.style.visibility,'visible');
report(details[1],{changed:true}); assert.match(details[1].status.textContent,/조작한 상태/);
owners[0].hidden=true; owners[1].hidden=false; sync();
assert.equal(details[1].frame.src,'about:blank'); assert.match(details[2].frame.src,/state=2/);
report(details[2],{ready:false}); assert.equal(details[2].frame.style.visibility,'hidden');
assert.match(details[2].status.textContent,/불러오지 못했습니다/);
details[2].reset.click(); [...timers.values()][0](); assert.match(details[2].status.textContent,/새 창/);
details[2].open=false; details[2].handlers.toggle(); assert.equal(details[2].frame.src,'about:blank');
assert.equal(timers.size,0);
console.log('PASS: inline preview startup, single active fixture, accordion switching, reset, stale/source validation, ready/failure/timeout, hidden-screen unloading.');
