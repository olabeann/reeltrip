const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
(async()=>{
 let searches=0,details=0;
 class Place {
  constructor({id}){this.id=id;this.displayName='Actual cafe';this.formattedAddress='Busan';this.location={lat:()=>35.1,lng:()=>129.1};this.photos=[{getURI:()=> 'https://example.com/photo',authorAttributions:[{displayName:'Photographer',uri:'https://example.com/author'}]}];}
  async fetchFields(){details++;}
  static async searchByText(args){assert.equal(args.maxResultCount,10);searches++;return {places:[new Place({id:'real-id'})]};}
 }
 const window={REEL_MAPS_CONFIG:{apiKey:''},ReelGoogleMap:{load:async()=>{}},google:{maps:{importLibrary:async()=>({Place})}}};
 const ctx=vm.createContext({window,URL,AbortSignal,location:{href:'https://reeltrip.test/app/',origin:'https://reeltrip.test'},fetch:async()=>{throw Error('Unexpected request');}});
 vm.runInContext(fs.readFileSync('assets/place-api.js','utf8'),ctx);const api=window.ReelPlaceAPI;
 await assert.rejects(api.search('Busan'),/configuration/);assert.equal(searches,0);
 window.REEL_MAPS_CONFIG.apiKey='test-key';const rows=await api.search('Busan');assert.equal(rows[0].placeId,'real-id');assert.equal(details,0);
 const record=await api.details(rows[0]);assert.equal(record.lat,35.1);assert.equal(record.photoAuthors[0].name,'Photographer');assert.equal(details,1);
 assert.equal(api.safeURL('javascript:alert(1)'),'');
 const saved=JSON.stringify({places:[record],request:{stops:[record]}},api.replacer);assert(!saved.includes('example.com'));assert(!saved.includes('Actual cafe'));assert(!saved.includes('35.1'));
 const state=JSON.parse(saved);api.restore(state);assert.equal(state.places[0].name,'Google Maps');await api.hydrate(state);assert.equal(state.request.stops[0].name,'Actual cafe');assert.equal(details,2);
 const legacy={places:[{...record,id:'forest'}],days:[{ids:['forest']}]};await api.hydrate(legacy);assert.equal(legacy.places[0].id,'forest');assert.equal(legacy.places[0].placeId,'real-id');
 const {searchTourism,createServer}=await import('../server/places-server.mjs');
 await assert.rejects(searchTourism('Busan',{key:''}),e=>e.status===503);
 const tourism=await searchTourism('부산',{key:'private+key',fetcher:async u=>{assert.equal(u.searchParams.get('serviceKey'),'private+key');assert.equal(u.searchParams.get('keyword'),'부산');return {ok:true,json:async()=>({response:{header:{resultCode:'0000'},body:{items:{item:[{contentid:1,title:'Busan',mapx:'129.1',mapy:'35.1',firstimage:'http://tong.visitkorea.or.kr/image.jpg'}]}}}})};}});
 assert.equal(tourism.places[0].photoURL,'https://tong.visitkorea.or.kr/image.jpg');assert.equal(tourism.places[0].lng,129.1);
 await assert.rejects(searchTourism('부산',{key:'key',fetcher:async()=>({ok:true,json:async()=>({response:{header:{resultCode:'30'}}})})}));
 const server=createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{const base='http://127.0.0.1:'+server.address().port;assert.equal((await fetch(base+'/server/places-server.mjs')).status,404);assert.equal((await fetch(base+'/app/index.html')).status,200);}finally{await new Promise(resolve=>server.close(resolve));}
 console.log('Place API checks passed: search, details, attribution, persistence, hydration, TourAPI errors and private-file boundaries.');
})().catch(e=>{console.error(e);process.exitCode=1;});
