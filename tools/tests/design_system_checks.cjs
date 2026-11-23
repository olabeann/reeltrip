const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..');
for(const file of ['app/index.html','app/english.html','admin/index.html','admin/english.html']){
 const html=fs.readFileSync(path.join(root,'src',file),'utf8');
 assert(html.includes('design-system.css'),file);
 assert(html.indexOf('design-system.css')>html.indexOf('action-first.css'),file+' cascade order');
}
for(const file of ['app.js','app.en.js']){
 const code=fs.readFileSync(path.join(root,'src/assets',file),'utf8');
 const modal=code.slice(code.indexOf('function modal('),code.indexOf('function ',code.indexOf('function modal(')+9));
 const secondary={classList:{contains:n=>n==='secondary'},focus(){this.focused=true}},danger={classList:{contains:()=>false}};
 const group={children:[danger,secondary],prepend(node){this.children=[node,...this.children.filter(n=>n!==node)]}};
 const heading={id:''},attrs={};const dialog={dataset:{},open:false,setAttribute(k,v){attrs[k]=v},removeAttribute(k){delete attrs[k]},showModal(){this.open=true},querySelector(s){return s==='h2'?heading:s==='.btn.danger'?danger:s==='.buttons .secondary'?secondary:null},querySelectorAll(){return [group]}};
 const context={interfaceMarkup:x=>x,$:()=>dialog};vm.createContext(context);vm.runInContext(modal,context);context.modal('<h2>Example</h2>');
 assert.equal(attrs['aria-labelledby'],'dialog-title');assert.equal(group.children[0],secondary);assert(secondary.focused);assert(dialog.open);
}
console.log('PASS: shared CSS in four entries; KO/EN dialog naming, action order and safe initial focus.');
// Reject new per-screen SVG icons: map geometry and decorative illustration are the only non-icon SVGs.
for(const file of ['app.js','app.en.js']){
 const source=fs.readFileSync(path.join(root,'src/assets',file),'utf8');
 const svgs=[...source.matchAll(/<svg\b[^>]*>/g)].map(m=>m[0]);
 assert.equal(svgs.length,3,file+' must use the common icon registry');
 assert(svgs.every(svg=>svg.includes('rt-icon')||svg.includes('review-visit-lines')||svg.includes('guest-route-illustration')));
}
const css=fs.readFileSync(path.join(root,'src/assets/design-system.css'),'utf8');
for(const name of ['recommendation-card','my-trip-card','request-inbox-card','meeting-card','journey-summary','mate-request-summary','guest-place-card','inbox-empty','notification-empty','route-stop'])assert(css.includes('.'+name),name+' missing shared styling');
console.log('PASS: dedicated card families covered; functional SVG icons centralized.');
// CSS image SVGs must be standalone XML, not only valid inline HTML SVGs.
const fieldCSS=fs.readFileSync(path.join(root,'src/assets/field-icons.css'),'utf8');
const imageSVGs=[...fieldCSS.matchAll(/data:image\/svg\+xml,([^"\)]+)/g)].map(m=>decodeURIComponent(m[1]));
assert.equal(imageSVGs.length,4,'email, password, search and dropdown share icons');
for(const svg of imageSVGs){assert(svg.includes('xmlns="http://www.w3.org/2000/svg"'));assert(svg.includes('stroke-width="1.7"'));}
const legacyCSS=fs.readFileSync(path.join(root,'src/assets/action-first.css'),'utf8');
assert(!legacyCSS.includes("stroke='%23607185'"),'legacy dropdown icon must be removed');
for(const lang of ['ko','en']){
 const context={URL,window:{},document:{documentElement:{lang}}};
 vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(root,'src/assets/booking-tools.js'),'utf8'),context);
 context.window.ReelBookingTools.init({icon:name=>`<svg data-icon="${name}"></svg>`});
 for(const place of [{id:'n-seoul-tower',name:'Tower'},{id:'test',name:'Cafe & park',address:'Seoul'}]){
  const widget=context.window.ReelBookingTools.widget(place);
  assert.equal(widget, '', 'MVP must not show external visit or booking buttons');
 }
 assert.equal(context.window.ReelBookingTools.saved(), '');
}
console.log('PASS: shared design system and MVP external booking links hidden.');
