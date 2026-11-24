// Exercise the actual controller with an in-memory DOM adapter, without a browser.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const rootPath = path.resolve(__dirname, '../..');
const catalog = JSON.parse(fs.readFileSync(path.join(rootPath, 'docs/screen-spec.json')));
class Element {
  constructor(data = {}) { this.dataset = data; this.handlers = {}; this.attrs = {}; this.value = ''; }
  addEventListener(name, fn) { this.handlers[name] = fn; }
  setAttribute(name, value) { this.attrs[name] = value; }
  removeAttribute(name) { delete this.attrs[name]; }
  focus() { this.focused = true; }
  scrollIntoView() {}
  fire(name) { return this.handlers[name]({preventDefault() {}}); }
}
const screens = catalog.map(s => {
  const el = new Element({role: s.role, search: ['id','name','route','input','rule','action','states','accept'].map(k => s[k]).join(' ')});
  el.id = 'spec-' + s.id;
  el.heading = new Element();
  el.querySelector = () => el.heading;
  return el;
});
const links = screens.map(s => new Element({screenLink: s.id}));
const groups = ['customer', 'guide', 'admin'].map(role => {
  const group = new Element();
  group.querySelectorAll = () => links.filter((link, i) => screens[i].dataset.role === role);
  return group;
});
const controls = Object.fromEntries(['#spec-search','#spec-role','.spec-count','.spec-feedback','.spec-empty','[data-clear-search]'].map(key => [key,new Element()]));
const copies = screens.map(s => Object.assign(new Element(), {hash:'#' + s.id}));
const root = {classList:{add(){}}, querySelector: key => controls[key], querySelectorAll: key => ({'.screen-spec':screens,'[data-screen-link]':links,'[data-screen-group]':groups,'[data-copy-link]':copies})[key]};
const location = {href:'file:///project/docs/specification.html#spec-B-04',hash:'#spec-B-04'};
const events = {};
const context = {document:{querySelector:()=>root,getElementById:id=>screens.find(s=>s.id===id)},location,
  history:{pushState(_,__,hash){location.hash=hash;}},window:{addEventListener:(name,fn)=>events[name]=fn},
  requestAnimationFrame:fn=>fn(),navigator:{},URL};
vm.runInNewContext(fs.readFileSync(path.join(rootPath,'src/assets/spec-explorer.js'),'utf8'),context);
const visible = () => screens.filter(s=>!s.hidden);
assert.equal(visible().length,1);
assert.equal(visible()[0].id,'spec-B-04');
controls['#spec-search'].value='Ｂ－０４'; controls['#spec-search'].fire('input');
assert.equal(links.filter(l=>!l.hidden).length,1);
assert.equal(visible()[0].id,'spec-B-04');
controls['#spec-search'].value='no-such-screen'; controls['#spec-search'].fire('input');
assert.equal(visible().length,0); assert.equal(controls['.spec-empty'].hidden,false);
controls['[data-clear-search]'].fire('click');
assert.equal(links.filter(l=>!l.hidden).length,catalog.length);
controls['#spec-role'].value='guide'; controls['#spec-role'].fire('change');
assert.equal(links.filter(l=>!l.hidden).length,catalog.filter(s=>s.role==='guide').length);
assert.equal(visible()[0].dataset.role,'guide');
const mateLink = links.find(l=>!l.hidden);
mateLink.fire('click');
assert.equal(location.hash,'#'+mateLink.dataset.screenLink);
assert.equal(mateLink.attrs['aria-current'],'page');
location.hash='#spec-B-04'; events.hashchange();
assert.equal(controls['#spec-role'].value,''); assert.equal(visible()[0].id,'spec-B-04');
location.hash='#does-not-exist'; events.hashchange(); assert.equal(visible().length,1);
(async () => {
 await copies[3].fire('click');
 assert.match(controls['.spec-feedback'].textContent,/주소창/);
 let copied;
 context.navigator.clipboard={writeText:async value=>{copied=value;}};
 await copies[3].fire('click'); assert.match(copied,/#spec-B-04$/);
 for (const file of ['specification.html','product.html']) {
  const html=fs.readFileSync(path.join(rootPath,'docs',file),'utf8');
  for (const screen of screens) assert(html.includes(`id="${screen.id}"`),`${file}: ${screen.id}`);
  assert(!/class="screen-spec"[^>]*\shidden/.test(html),'No-JS readers must retain all content');
 }
 console.log('PASS: catalog screen anchors, direct links, normalized search, role filter, empty/reset, selection, hash navigation, clipboard success/fallback, no-JS content. Browser layout not tested.');
})().catch(error=>{console.error(error);process.exitCode=1;});
