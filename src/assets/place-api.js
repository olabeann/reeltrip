/* Live providers. Google content is session-only; only Place IDs persist. */
(() => {
  'use strict';
  const safeURL = value => {try {const u=new URL(value);return u.protocol==='https:'?u.href:'';}catch{return '';}};
  const configured = provider => provider==='tourism' ? Boolean(window.REEL_MAPS_CONFIG?.tourismEndpoint) : Boolean(window.REEL_MAPS_CONFIG?.apiKey);
  async function library(){if(!configured('google'))throw new Error('configuration');await window.ReelGoogleMap.load();return window.google.maps.importLibrary('places');}
  function normalize(p){const photo=p.photos?.[0];return {photo:photo?'provider':undefined,photoURL:photo?safeURL(photo.getURI({maxWidth:640})):undefined,photoAuthors:(photo?.authorAttributions||[]).map(a=>({name:a.displayName||'',url:safeURL(a.uri)})),id:'google-'+p.id,source:'google',placeId:p.id,name:p.displayName||'',address:p.formattedAddress||'',area:p.formattedAddress||'',type:p.primaryTypeDisplayName||'Google Maps',lat:p.location?.lat(),lng:p.location?.lng(),duration:45,verified:true,googleMapsURI:safeURL(p.googleMapsURI),attributions:(p.attributions||[]).map(a=>({name:a.provider||'',url:safeURL(a.providerURI)}))};}
  async function search(query,provider='google'){
    query=String(query||'').trim();if(query.length<2||query.length>120)throw new Error('query');
    if(!configured(provider))throw new Error('configuration');
    if(provider==='tourism'){
      const u=new URL(window.REEL_MAPS_CONFIG.tourismEndpoint,location.href);if(u.origin!==location.origin)throw new Error('configuration');u.searchParams.set('q',query);
      const r=await fetch(u,{signal:AbortSignal.timeout(12000)});if(!r.ok)throw new Error('network');const data=await r.json();if(!Array.isArray(data.places))throw new Error('response');return data.places.slice(0,10).map(p=>({...p,photoURL:safeURL(p.photoURL)}));
    }
    const {Place}=await library();const {places}=await Place.searchByText({textQuery:query,fields:['id','displayName','formattedAddress','location','photos','googleMapsURI','attributions'],maxResultCount:10});return places.map(normalize);
  }
  async function details(record){
    if(record.source!=='google')return record;
    const {Place}=await library(),p=new Place({id:record.placeId});
    await p.fetchFields({fields:['id','displayName','formattedAddress','location','primaryTypeDisplayName','photos','googleMapsURI','attributions']});
    return {...normalize(p),duration:record.duration||45};
  }
  function replacer(key,value){if(value?.source==='google')return {id:value.id,source:'google',placeId:value.placeId,duration:value.duration,verified:true};return value;}
  function records(root){const found=[];function walk(v){if(!v||typeof v!=='object')return;if(v.source==='google'&&v.placeId){found.push(v);return;}Object.values(v).forEach(walk);}walk(root);return found;}
  function restore(root){records(root).forEach(p=>Object.assign(p,{name:p.name||'Google Maps',address:p.address||'',area:p.area||'',type:p.type||'Google Maps'}));}
  async function hydrate(root){const items=records(root);if(!configured('google')||!items.length)return false;let changed=false;
    // Sequential to avoid a burst of paid detail requests on reload.
    for(const id of new Set(items.map(p=>p.placeId))){try{const fresh=await details({source:'google',placeId:id});items.filter(p=>p.placeId===id).forEach(p=>Object.assign(p,{...fresh,id:p.id,duration:p.duration||45}));changed=true;}catch{/* Keep the saved Place ID and allow retry on the next visit. */}}
    return changed;
  }
  window.ReelPlaceAPI={search,details,replacer,restore,hydrate,configured,safeURL};
})();
