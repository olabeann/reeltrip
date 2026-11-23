// Screen previews stay offline until the user explicitly searches for a place.
(() => {
  const liveConfig={...window.REEL_MAPS_CONFIG,mode:'auto',tourismEndpoint:''};
  window.ReelEnablePlaceSearch=()=>{window.REEL_MAPS_CONFIG={...liveConfig};};
  if(new URLSearchParams(location.search).get('maps')==='live'){
    window.ReelEnablePlaceSearch();
  }else{
    window.REEL_MAPS_CONFIG={...liveConfig,apiKey:'',mode:'review'};
  }
})();
