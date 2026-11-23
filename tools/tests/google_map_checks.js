// Unit checks of adapter boundaries; does not assert live Google rendering.
const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const code=fs.readFileSync(__dirname+'/../../src/assets/google-map.js','utf8');
const element=()=>({children:[],isConnected:true,append(x){this.children.push(x)},replaceChildren(){this.children=[]},setAttribute(){},addEventListener(){}});
(async()=>{
 let created=[],loads=0;
 const document={createElement:element,head:{append(){loads++}},querySelectorAll:()=>[]};
 const context={window:{REEL_MAPS_CONFIG:{apiKey:''}},document,location:{protocol:'http:'},URLSearchParams,setTimeout,clearTimeout};
 vm.createContext(context);vm.runInContext(code,context);
 const host=element();await context.window.ReelGoogleMap.mount(host,[],null,()=>{});
 assert.equal(loads,0);assert.match(host.children[0].textContent,/설정/);
 context.window.REEL_MAPS_CONFIG.apiKey='unit-test-placeholder';
 const google={maps:{importLibrary:async type=>type==='maps'?{Map:class{fitBounds(){}}}:{AdvancedMarkerElement:class{constructor(options){created.push(options)}}},LatLngBounds:class{extend(){}},event:{clearInstanceListeners(){}}}};
 context.google=google;context.window.google=google;
 await context.window.ReelGoogleMap.mount(host,[{id:'missing',name:'Unknown',lat:null,lng:null},{id:'known',name:'Known',lat:37.54,lng:127.04,photo:'park'}],'known',()=>{});
 assert.equal(created.length,1);assert.equal(created[0].position.lat,37.54);assert.equal(created[0].content.children[1].textContent,'2');
 assert.equal(context.window.ReelGoogleMap.valid({lat:200,lng:0}),false);
 assert.equal(context.window.ReelGoogleMap.valid({lat:null,lng:null}),false);
 console.log('PASS: missing-key status, no unauthorized API load, coordinate validation, marker location and original order. Live Google rendering NOT tested (no API key).');
})();
