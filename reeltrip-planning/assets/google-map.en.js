/* Shared real Google Maps adapter. No simulated tiles or arbitrary pixel pins. */
(() => {
  'use strict';
  let loading, failedAuth=false, dispose=()=>{};
  function status(host,message){host.replaceChildren();const p=document.createElement('p');p.className='google-map-status';p.setAttribute('role','status');p.textContent=message;host.append(p);}
  function load(){
    if(failedAuth)return Promise.reject(new Error('authentication'));
    if(window.google?.maps?.importLibrary)return Promise.resolve();
    if(loading)return loading;
    const c=window.REEL_MAPS_CONFIG||{};
    if(!c.apiKey)return Promise.reject(new Error('configuration'));
    loading=new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(new Error('timeout')),20000);
      window.reelGoogleMapsReady=()=>{clearTimeout(timer);resolve();};
      window.gm_authFailure=()=>{failedAuth=true;clearTimeout(timer);reject(new Error('authentication'));document.querySelectorAll('[data-google-map]').forEach(h=>status(h,'The map could not load. You can still use the places below.'));};
      const script=document.createElement('script');
      const params=new URLSearchParams({key:c.apiKey,loading:'async',callback:'reelGoogleMapsReady',v:'weekly',language:'en',region:c.region||'KR',libraries:'marker'});
      script.src='https://maps.googleapis.com/maps/api/js?'+params;
      script.async=true;script.onerror=()=>{clearTimeout(timer);reject(new Error('network'));};
      document.head.append(script);
    });
    return loading;
  }
  const valid=p=>Number.isFinite(p.lat)&&Number.isFinite(p.lng)&&Math.abs(p.lat)<=90&&Math.abs(p.lng)<=180;
  async function mount(host,places,selected,onSelect){
    dispose();let cancelled=false;const markers=[];let map;
    dispose=()=>{cancelled=true;markers.forEach(m=>{m.map=null;});if(map&&window.google?.maps?.event)google.maps.event.clearInstanceListeners(map);};
    if(!host)return;
    if(!window.REEL_MAPS_CONFIG?.apiKey){status(host,'Google Maps is not connected yet. You can still use the places below.');return;}
    if(location.protocol==='file:'){status(host,'Open the app from a local server or hosted address to use Google Maps.');return;}
    status(host,'Loading Google Maps…');
    try{
      await load();if(cancelled||!host.isConnected)return;
      const [{Map},{AdvancedMarkerElement}]=await Promise.all([google.maps.importLibrary('maps'),google.maps.importLibrary('marker')]);
      if(cancelled||!host.isConnected||failedAuth)return;
      host.replaceChildren();const pts=places.filter(valid);
      map=new Map(host,{mapId:window.REEL_MAPS_CONFIG.mapId||'DEMO_MAP_ID',center:pts[0]?{lat:pts[0].lat,lng:pts[0].lng}:{lat:37.544625,lng:127.039844},zoom:15,disableDefaultUI:false,mapTypeControl:false,streetViewControl:false,fullscreenControl:false,gestureHandling:'cooperative'});
      const bounds=new google.maps.LatLngBounds();
      pts.forEach(p=>{
        const button=document.createElement('button');button.type='button';button.className='google-photo-pin'+(p.source?' numbered-pin':'')+(p.id===selected?' active':'');button.setAttribute('aria-label',p.name+' selected');
        if(['park','cafe','shop','food'].includes(p.photo)){const img=document.createElement('img');img.src='../assets/photos/'+p.photo+'.jpg';img.alt='';button.append(img);}
        const n=document.createElement('b');n.textContent=String(places.indexOf(p)+1);button.append(n);
        const marker=new AdvancedMarkerElement({map,position:{lat:p.lat,lng:p.lng},content:button,title:p.name,zIndex:p.id===selected?10:1});
        button.addEventListener('click',()=>onSelect(p.id));markers.push(marker);bounds.extend({lat:p.lat,lng:p.lng});
      });
      if(pts.length>1)map.fitBounds(bounds,55);
      // No straight line pretending to be a walking route. Routes require real route data.
    }catch(error){if(!cancelled&&host.isConnected)status(host,'The map could not load. Check your connection and refresh, or use the list below.');}
  }
  window.ReelGoogleMap={mount,valid,load};
})();
