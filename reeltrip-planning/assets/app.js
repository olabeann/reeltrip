/* Buildless, browser-local review prototype. Optional live map/place APIs; extraction, auth and payment remain demonstrations. */
(() => {
'use strict';
// Single product. Legacy storage namespace remains for data compatibility.
const option=2, guided=true;
if(new URLSearchParams(location.search).get('tools')==='1')document.body.classList.add('show-review-tools');
const comparison=new URLSearchParams(location.search).get('compare')==='1';
const key=`reeltrip-demo-ko-map-v2-option-${option}${comparison?'-comparison':''}`, $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>`₩${Number(n||0).toLocaleString('ko-KR')}`;
const future=()=>{const d=new Date(Date.now()+7*86400000);return d.toLocaleDateString('en-CA',{timeZone:'Asia/Seoul'});};
const sampleStopIds=['forest','cafe','shop'];
const initial=()=>({places:JSON.parse(JSON.stringify(window.REEL_PLACES)),selected:['forest','cafe','shop'],board:comparison?['forest','cafe','shop','n-seoul-tower']:[...sampleStopIds],library:[...sampleStopIds,'n-seoul-tower'],towerSeedVersion:1,must:[],title:'성수에서 보내는 여유로운 오후',date:future(),time:'13:00',party:2,saved:false,filter:'전체',source:'성수의 카페와 산책',extraction:'idle',guide:'mina',request:null,quote:null,booking:null,messages:[],review:null,tickets:[],available:true,guideApproved:false,adminReview:'pending',rating:0});
let state=initial(),storageWarning=false;
try{const saved=comparison?null:JSON.parse(localStorage.getItem(key)||'null');if(saved&&Array.isArray(saved.places)&&Array.isArray(saved.board))state={...state,...saved,library:saved.library,towerSeedVersion:saved.towerSeedVersion||0};}catch{storageWarning=true;}
window.ReelPlaceAPI?.restore(state);
// Migrate old demo bookings to the cash matching policy; never claim cash was collected.
if(state.booking&&state.booking.policyVersion!=='CASH-MATCH-10-V1'){const b=state.booking;b.paymentMethod='cash';b.feeRate=.1;b.feeAmount=Math.round(b.amount*.1);b.cashStatus='uncollected';b.feeStatus=b.status==='confirmed'?'pending':'unverified';if(b.status==='confirmed'){b.status='awaiting_mate_fee';if(state.request)state.request.status='matching';}b.policyVersion='CASH-MATCH-10-V1';}
// Upgrade existing browser data once; never restore a place the user later removes.
const towerSeed=window.REEL_PLACES.find(p=>p.id==='n-seoul-tower');
if(!state.places.some(p=>p.id===towerSeed.id))state.places.push({...towerSeed});
// Fill missing coordinates in old browser records and newly edited places for preview estimates.
function fillExampleCoordinates(){if(window.REEL_MAPS_CONFIG?.apiKey)return false;let changed=false;state.places.forEach((p,i)=>{
 if(p.source||p.manual||p.courseId||p.restaurant)return;
 if(Number.isFinite(p.lat)&&Number.isFinite(p.lng)&&Math.abs(p.lat)<=90&&Math.abs(p.lng)<=180)return;
 const seed=window.REEL_PLACES.find(x=>x.id===p.id);
 p.lat=Number.isFinite(seed?.lat)?seed.lat:37.544625+(i%8)*0.0015;
 p.lng=Number.isFinite(seed?.lng)?seed.lng:127.0398444+(i%7)*0.0018;
 p.demoCoordinates=true;p.locationNote='예시 좌표 · 실제 위치 확인 필요';changed=true;
});return changed;}
const needsTowerSeed=state.towerSeedVersion!==1;
if(needsTowerSeed){
 if(!state.board.includes(towerSeed.id)&&!state.days?.some(d=>d.ids.includes(towerSeed.id))&&state.board.length<20)state.board.push(towerSeed.id);
 state.towerSeedVersion=1;
}
// Refresh only unchanged legacy seed labels; preserve user-entered addresses.
for(const p of state.places){const seed=window.REEL_PLACES.find(x=>x.id===p.id);if(seed&&['성수 카페 거리 · 예시 위치','성수 쇼핑 거리 · 예시 위치'].includes(p.address))p.address=seed.address;}
function libraryIds(){if(!Array.isArray(state.library))state.library=[...new Set([...(state.board||[]),...(state.days||[]).flatMap(d=>d.ids||[])])];return state.library;}
function proposals(){if(!Array.isArray(state.proposals))state.proposals=state.quote?[{...state.quote,guideId:state.quote.guideId||'mina'}]:[];return state.proposals;}
function ensureDays(){if(!state.days?.length){state.days=[{date:state.date,time:state.time,ids:[...state.board],durations:{}}];state.day=0;}state.day=state.day||0;}
function stashDay(){ensureDays();state.days[state.day]={...state.days[state.day],date:state.date,time:state.time,ids:[...state.board],durations:Object.fromEntries(state.board.map(id=>[id,place(id)?.duration||45]))};}
function switchDay(n){stashDay();state.day=n;const d=state.days[n];state.board=[...d.ids];state.date=d.date;state.time=d.time;for(const [id,v] of Object.entries(d.durations||{})){const p=place(id);if(p)p.duration=v;}state.focus=null;save();render();}
function dayTabs(){ensureDays();return `<div class="day-tabs" aria-label="여행 날짜">${state.days.map((d,i)=>`<button data-action="day" data-value="${i}" aria-pressed="${state.day===i}" class="${state.day===i?'active':''}">${i+1}일차<small>${esc(d.date.slice(5))}</small></button>`).join('')}<button data-action="add-day" ${state.days.length>=7?'disabled':''} aria-label="여행 날짜 추가">＋ 날짜</button></div>`;}
const tripFields=['title','date','time','party','days','day','board','must','saved'];
function tripSnapshot(){return Object.fromEntries(tripFields.map(k=>[k,JSON.parse(JSON.stringify(state[k]??(k==='must'?[]:null)))]));}
function stashTrip(){
 if(!Array.isArray(state.trips))state.trips=[];
 if(!state.activeTripId)state.activeTripId='trip-legacy';
 const record={id:state.activeTripId,...tripSnapshot()},index=state.trips.findIndex(t=>t.id===record.id);
 if(index<0)state.trips.push(record);else state.trips[index]=record;
 if(state.request&&!state.request.tripId&&state.request.requestType!=='free')state.request.tripId=state.activeTripId;
}
function selectTrip(id){
 stashDay();stashTrip();const trip=state.trips.find(t=>t.id===id);if(!trip)return false;
 for(const k of tripFields)state[k]=JSON.parse(JSON.stringify(trip[k]));state.activeTripId=id;state.focus=null;
 for(const [placeId,n] of Object.entries(state.days[state.day]?.durations||{})){const p=place(placeId);if(p)p.duration=n;}
 save();return true;
}
function createTrip(d){
 const name=String(d.title||'').trim(),count=Number(d.dayCount),party=Number(d.party);
 if(!name||name.length>70||!/^\d{4}-\d{2}-\d{2}$/.test(d.date||'')||!Number.isFinite(Date.parse(d.date+'T12:00:00Z'))||dateAfter(d.date,0)!==d.date||!Number.isInteger(count)||count<1||count>7||!Number.isInteger(party)||party<1||party>4)return false;
 stashDay();stashTrip();let id='trip-'+Date.now();while(state.trips.some(t=>t.id===id))id+='-new';
 state.activeTripId=id;state.title=name;state.date=d.date;state.time='10:00';state.party=party;state.day=0;state.board=[];state.must=[];state.saved=false;state.focus=null;
 state.days=Array.from({length:count},(_,i)=>({date:dateAfter(d.date,i),time:'10:00',ids:[],durations:{}}));save();return true;
}
const tripToday=()=>new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Seoul'});
let tripDraft=null;
function tripRangeDays(start,end){if(!/^\d{4}-\d{2}-\d{2}$/.test(start||'')||!/^\d{4}-\d{2}-\d{2}$/.test(end||''))return 0;const a=Date.parse(start+'T12:00:00Z'),b=Date.parse(end+'T12:00:00Z');if(!Number.isFinite(a)||!Number.isFinite(b)||dateAfter(start,0)!==start||dateAfter(end,0)!==end)return 0;const n=Math.round((b-a)/86400000)+1;return n>=1&&n<=7?n:0;}
function chooseTripDate(date){
 if(!tripDraft||!tripRangeDays(date,date)||date<tripToday())return false;
 tripDraft.error='';
 if(!tripDraft.start||tripDraft.end||date<tripDraft.start){tripDraft.start=date;tripDraft.end='';return true;}
 if(!tripRangeDays(tripDraft.start,date)){tripDraft.error='여행은 최대 7일까지 선택할 수 있어요.';return false;}
 tripDraft.end=date;return true;
}
function tripCalendarMonth(offset){
 const today=tripToday(),base=new Date(today.slice(0,7)+'-01T12:00:00Z');base.setUTCMonth(base.getUTCMonth()+offset);
 const year=base.getUTCFullYear(),month=base.getUTCMonth(),first=base.getUTCDay(),count=new Date(Date.UTC(year,month+1,0)).getUTCDate(),locale=document.documentElement.lang==='en'?'en-US':'ko-KR';
 const heading=base.toLocaleDateString(locale,{year:'numeric',month:'long',timeZone:'UTC'});
 const week=Array.from({length:7},(_,i)=>new Date(Date.UTC(2026,10,1+i)).toLocaleDateString(locale,{weekday:'short',timeZone:'UTC'}));
 return `<section class="trip-calendar-month"><h3>${esc(heading)}</h3><div class="trip-calendar-week" aria-hidden="true">${week.map(d=>`<span>${d}</span>`).join('')}</div><div class="trip-calendar-grid">${'<span></span>'.repeat(first)}${Array.from({length:count},(_,i)=>{const date=`${year}-${String(month+1).padStart(2,'0')}-${String(i+1).padStart(2,'0')}`,edge=date===tripDraft.start||date===tripDraft.end,inside=tripDraft.end&&date>tripDraft.start&&date<tripDraft.end;return `<button type="button" class="trip-calendar-day ${edge?'range-edge':''} ${inside?'in-range':''} ${date===today?'is-today':''}" data-action="trip-date" data-value="${date}" aria-label="${date}" aria-pressed="${Boolean(edge||inside)}" ${date===today?'aria-current="date"':''} ${date<today?'disabled':''}><span>${i+1}</span><small>${date===tripDraft.start?'시작':date===tripDraft.end?'종료':date===today?'오늘':'&nbsp;'}</small></button>`;}).join('')}</div></section>`;
}
function renderTripCalendar(){
 const scroll=$('#trip-calendar-scroll')?.scrollTop||0,n=tripRangeDays(tripDraft.start,tripDraft.end);
 modal(`<div class="trip-calendar-shell"><header class="trip-calendar-header"><button type="button" class="textbtn" data-action="close" aria-label="닫기">×</button><h2>여행 일정 만들기</h2><p>시작일과 종료일을 선택해 주세요.</p></header><div class="trip-calendar-scroll" id="trip-calendar-scroll">${Array.from({length:tripDraft.months},(_,i)=>tripCalendarMonth(i)).join('')}<button type="button" class="btn secondary" data-action="trip-more-months">다음 달 더 보기</button></div><footer class="trip-calendar-footer"><div class="trip-date-summary"><span>시작일<strong>${tripDraft.start||'날짜 선택'}</strong></span><span aria-hidden="true">→</span><span>종료일<strong>${tripDraft.end||'날짜 선택'}</strong></span></div><p class="hint" role="status">${tripDraft.error||(n?tripLength(n):tripDraft.start?'종료일을 선택해 주세요. 당일 여행은 같은 날짜를 한 번 더 눌러주세요.':'최대 7일까지 선택할 수 있어요.')}</p><button type="button" class="btn" data-action="trip-dates-next" ${n?'':'disabled'}>이 날짜로 계속</button></footer></div>`,'trip-calendar');
 $('#trip-calendar-scroll').scrollTop=scroll;
}
function newTripDialog(){tripDraft={start:'',end:'',months:12,title:'',party:'2',error:''};renderTripCalendar();}
function tripDetailsDialog(){const n=tripRangeDays(tripDraft?.start,tripDraft?.end);if(!n)return;modal(`<form id="new-trip-form"><h2>새 여행 만들기</h2><p>${esc(tripDraft.start)} → ${esc(tripDraft.end)} · ${tripLength(n)}</p><button type="button" class="textbtn" data-action="trip-dates-back">날짜 다시 선택</button><label>여행 이름<input name="title" required maxlength="70" value="${esc(tripDraft.title)}" placeholder="예: 부산 주말 여행"></label><label>인원<select name="party">${[1,2,3,4].map(n=>`<option value="${n}" ${String(n)===tripDraft.party?'selected':''}>${n}명</option>`).join('')}</select></label><p id="new-trip-error" class="error" role="alert"></p><div class="buttons"><button class="btn" type="submit">여행 만들기</button>${action('취소','close','secondary')}</div></form>`);}

function tripDetailRoute(){return 'trips?view=detail&id='+encodeURIComponent(state.activeTripId||'trip-legacy');}
function isTripDetail(){return current()==='trips'&&new URLSearchParams(location.hash.split('?')[1]||'').get('view')==='detail';}
const save=()=>{if(isGuest())return;libraryIds();stashDay();stashTrip();if(comparison)return;try{localStorage.setItem(key,JSON.stringify(state,window.ReelPlaceAPI?.replacer));}catch{storageWarning=true;toast('저장소를 사용할 수 없어 이번 이용 내용은 저장되지 않습니다.');}};
const screens=window.REEL_SCREENS.filter(s=>s.both||guided).map((s,i)=>({...s,id:`${guided?'B':'A'}-${String(i+1).padStart(2,'0')}`}));
const byRoute=r=>screens.find(s=>s.route===r);
const current=()=>location.hash.slice(1).split('?')[0]||'home';
const place=id=>state.places.find(p=>p.id===id);
const guide=()=>state.guide==='jun'?{name:'준',initial:'준',field:'동네 맛집과 숨은 골목',area:'안국'}:{name:'미나',initial:'미',field:'디자인, 카페와 동네 상점',area:'성수'};
const statusLabel=s=>({awaiting_mate_fee:'메이트 확정 대기',matching:'메이트 확정 대기',requested:'응답 대기',quoted:'제안 도착',booked:'예약 확정',withdrawn:'철회',declined:'거절',confirmed:'예약 확정',completed:'여행 완료',cancelled:'취소 완료',cancellation_requested:'취소 검토 중',pending:'심사 대기',approved:'승인',needs_info:'보완 요청',open:'접수',resolved:'처리 완료'})[s]||s;
let timer,toastTimer;
function toast(t){$('#toast').textContent=t;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),3500);}
function go(r){if(current()===r)render();else location.hash=r;}
function btn(label,route,kind=''){return `<a class="btn ${kind}" href="#${route}">${label}</a>`;}
function action(label,name,kind='',extra=''){return `<button class="btn ${kind}" data-action="${name}" ${extra}>${label}</button>`;}
function chip(t,active=false,attr=''){return `<button class="chip ${active?'active':''}" ${attr}>${t}</button>`;}
function taskGroup(label,content,kind='neutral',hint=''){return `<section class="task-group ${kind}"><h3 class="task-group-title">${label}</h3>${hint?`<p class="task-group-hint">${hint}</p>`:''}<div class="task-group-content">${content}</div></section>`;}
function title(k,h,p='',buttons=''){return `<div class="pagehead"><div>${k?`<div class="eyebrow">${k}</div>`:''}<h1>${h}</h1>${p?`<p class="muted">${p}</p>`:''}</div><div class="buttons">${buttons}</div></div>`;}
function steps(n){return `<div class="steps">${['여행 요청','메이트 제안','예약 요청','메이트 확정'].map((t,i)=>`<span class="${i===n?'current':''}"><b>${i+1}</b>${t}</span>`).join('')}</div>`;}
function empty(h,p,link='home',label='영상으로 시작하기'){return `<div class="empty"><div class="eyebrow">새로운 발견의 시작</div><h2>${h}</h2><p class="muted">${p}</p><div class="buttons">${btn(label,link)}</div></div>`;}
function icon(name){const shapes={messages:'<path d="M4 4h16v12H9l-5 4V4Z"/><path d="M8 8h8M8 12h5"/>',camera:'<path d="M4 6h4l2-3h4l2 3h4a1 1 0 0 1 1 1v13H3V7a1 1 0 0 1 1-1Z"/><circle cx="12" cy="13" r="4"/>',settings:'<path d="m9 3-1 3-3 1v4l2 2-1 3 3 2 3-1 3 1 3-2-1-3 2-2V7l-3-1-1-3Z"/><circle cx="12" cy="11" r="3"/>',bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/>',board:'<path d="M6 3h12v18l-6-4-6 4Z"/>',guides:'<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 5"/>',trips:'<rect x="4" y="6" width="16" height="15" rx="3"/><path d="M8 6V3h8v3M9 10v7m6-7v7"/>',account:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',park:'<path d="m12 2 6 8h-3l5 7h-6v5h-4v-5H4l5-7H6Z"/>',cafe:'<path d="M4 8h13v7a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5Zm13 1h2a3 3 0 1 1 0 6h-2M8 2v3m5-3v3M3 22h16"/>',shop:'<path d="M4 7h16l1 14H3ZM8 8V6a4 4 0 0 1 8 0v2"/>',food:'<path d="M5 2v7m3-7v7m-6-7v7a3 3 0 0 0 6 0M5 12v10M19 2c-4 4-5 8-1 10h2V2Zm1 10v10"/>',all:'<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',link:'<path d="m10 13 4-4m-6 6-2 2a4 4 0 0 1-6-6l5-5a4 4 0 0 1 6 0m2 2 2-2a4 4 0 0 1 6 6l-5 5a4 4 0 0 1-6 0" transform="translate(1 1)"/>'};return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${shapes[name]||shapes.all}</svg>`;}
function art(type){
 const names={park:'서울숲의 초록 풍경',cafe:'성수동 카페 외관',shop:'성수동 카메라 상점',food:'광장시장 전과 먹거리'};
 if(!names[type])return `<div class="photo-placeholder">${icon('board')}<span>사진 준비 중</span></div>`;
 return `<img class="travel-photo photo-${type}" src="../assets/photos/${type}.jpg" alt="${names[type]} · 실제 촬영 사진" loading="lazy" decoding="async" width="960" height="720">`;
}
function placeArt(p){const url=window.ReelPlaceAPI?.safeURL(p.photoURL);if(!url)return art(p.source||window.REEL_MAPS_CONFIG?.apiKey?undefined:p.photo);return `<span class="provider-photo ${p.source==='tourism'?'tourism-photo':''}"><img class="travel-photo" src="${esc(url)}" alt="${esc(p.name)}" loading="lazy" decoding="async" referrerpolicy="strict-origin-when-cross-origin"><small>${esc(p.source==='google'?'Google Maps · '+(p.photoAuthors||[]).map(a=>a.name).join(', '):'한국관광공사')}</small></span>`;}
function providerCredits(){if(!['manual','results','board','trips','planner','share','request','requested','quote','booking','chat'].includes(current()))return '';const places=state.places.filter(p=>p.source&&libraryIds().includes(p.id));if(!places.length)return '';return `<details class="provider-credits"><summary>장소·사진 출처</summary>${places.map(p=>`<p><strong>${esc(p.name)}</strong> · ${p.source==='google'?'Google Maps':'한국관광공사'} ${(p.photoAuthors||[]).concat(p.attributions||[]).map(a=>a.url?`<a href="${esc(window.ReelPlaceAPI.safeURL(a.url))}" target="_blank" rel="noopener noreferrer">${esc(a.name)}</a>`:esc(a.name)).join(', ')} ${p.googleMapsURI?`<a href="${esc(p.googleMapsURI)}" target="_blank" rel="noopener noreferrer">Google Maps ↗</a>`:''}</p>`).join('')}</details>`;}
let placeSearchResults=[],placeSearchVersion=0,placeSelectionVersion=0,placePickerTab='search',placePickerQuery='',placePickerStatus='',placePickerSelected='';
let pendingAPIPlace=null;
function resolvePlace(id,fromTrip=false){const p=place(id);if(!p)return;placePickerQuery=p.ko||p.name;placePickerTab='search';placeSearchResults=[];placePickerSelected='';pendingAPIPlace=null;placePickerStatus='검색 결과에서 이름과 주소를 확인하고 선택해 주세요.';$('#dialog').close();go('manual?resolve='+encodeURIComponent(id)+(fromTrip?'&from=trips':''));}
function resolvingPlace(){return new URLSearchParams(location.hash.split('?')[1]||'').get('resolve');}
function pickerExamples(){return window.REEL_PLACES.filter(p=>['forest','cafe','shop','food'].includes(p.id)).map(p=>({...p,demoPreview:true})).filter(p=>!placePickerQuery||[p.name,p.address,p.type,p.area].join(' ').toLowerCase().includes(placePickerQuery.trim().toLowerCase()));}
function showingPickerExamples(){return placePickerTab==='search'&&!window.REEL_MAPS_CONFIG?.apiKey;}
function pickerPlaces(){return placePickerTab==='saved'?libraryIds().map(place).filter(Boolean):showingPickerExamples()?pickerExamples():placeSearchResults;}
function pinEligible(p){return Boolean(p?.source)&&!p.demoCoordinates&&window.ReelGoogleMap.valid(p);}
function placeSearchForm(){return `<section class="place-map-picker"><form id="place-search-form" class="place-map-search"><label class="sr-only" for="map-place-query">장소 이름 또는 지역</label><input id="map-place-query" name="query" required minlength="2" maxlength="120" value="${esc(placePickerQuery)}" placeholder="관광지·맛집·숙소 검색"><button type="submit" class="btn small">검색</button><input type="hidden" name="provider" value="google"></form><div class="place-picker-map" data-place-picker-map role="region" aria-label="장소 선택 Google 지도"></div><section class="place-picker-sheet"><div class="trip-sheet-handle" aria-hidden="true"></div><div class="place-picker-tabs"><button type="button" data-action="place-picker-tab" data-id="search" aria-pressed="${placePickerTab==='search'}">검색 결과</button><button type="button" data-action="place-picker-tab" data-id="saved" aria-pressed="${placePickerTab==='saved'}">저장한 장소</button></div><p id="place-search-status" role="status">${esc(showingPickerExamples()?'예시 장소 4곳 · 실제 검색 결과가 아니에요.':placePickerStatus)}</p><div id="place-picker-detail" aria-live="polite"></div><div id="place-search-results"></div></section></section>`;}
function renderPickerResults(){const host=$('#place-search-results');if(!host)return;const places=pickerPlaces();host.innerHTML=places.map((p,i)=>`<article class="place-map-row ${p.id===placePickerSelected?'is-selected':''}"><span class="place-map-row-photo">${placeArt(p)}</span><button type="button" class="place-map-row-select" data-action="${pinEligible(p)||p.demoPreview?'preview-api-place':'resolve-place'}" data-id="${pinEligible(p)||p.demoPreview?i:esc(p.id)}" aria-pressed="${p.id===placePickerSelected}" ><strong>${i+1}. ${esc(p.name)}</strong><span>${esc(p.address)}</span><small>${p.demoPreview?'예시 장소 · 눌러서 미리 보기':pinEligible(p)?'지도에서 위치 확인':'Google에서 장소 연결'}</small></button></article>`).join('')||`<div class="place-picker-empty">${placePickerTab==='saved'?'저장한 장소가 없어요.':'장소를 검색하면 지도와 목록에서 확인할 수 있어요.'}</div>`;}
function mountPlacePicker(){renderPickerResults();const places=pickerPlaces();if(showingPickerExamples()){window.ReelGoogleMap.mount(null,[],null,()=>{});const host=$('[data-place-picker-map]');if(host)host.innerHTML=`<div class="picker-example-label">예시 지도 · Google 지도 캡처</div>${reviewMapImage(places,placePickerSelected).replaceAll('data-action="focus-place"','data-action="preview-example-pin"')}`;return;}window.ReelGoogleMap.mount($('[data-place-picker-map]'),places.map(p=>pinEligible(p)?p:{...p,lat:null,lng:null}),placePickerSelected,id=>{const index=pickerPlaces().findIndex(p=>p.id===id);previewAPIPlace(index);});}
async function searchPlaces(form,d){const version=++placeSearchVersion,button=form.querySelector('button'),status=$('#place-search-status');placeSelectionVersion++;pendingAPIPlace=null;placePickerSelected='';placePickerQuery=d.query;placePickerTab='search';button.disabled=true;status.textContent='장소를 찾고 있어요…';placeSearchResults=[];$('#place-picker-detail').innerHTML='';mountPlacePicker();
 if(showingPickerExamples()){status.textContent=pickerExamples().length?'예시 장소 검색 결과 · 실제 검색 결과가 아니에요.':'일치하는 예시가 없어요. 성수 또는 서울숲을 검색해 보세요.';button.disabled=false;return;}
 try{const found=await window.ReelPlaceAPI.search(d.query,'google');if(version!==placeSearchVersion||!form.isConnected)return;placeSearchResults=found;placePickerStatus=found.length?'목록이나 핀을 눌러 위치를 확인해 주세요.':'검색 결과가 없어요. 지역이나 장소 이름을 바꿔 보세요.';}
 catch(error){if(version!==placeSearchVersion||!form.isConnected)return;placePickerStatus=error.message==='configuration'?'장소 검색을 준비 중이에요. 연결 후 다시 검색해 주세요.':'장소를 불러오지 못했어요. 잠시 후 다시 검색해 주세요.';}finally{button.disabled=false;}
 if(version!==placeSearchVersion||!form.isConnected)return;status.textContent=placePickerStatus;document.querySelectorAll('[data-action="place-picker-tab"]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.id===placePickerTab)));mountPlacePicker();}
async function previewAPIPlace(index){const record=pickerPlaces()[index],version=++placeSelectionVersion,route=location.hash;if(!record||(!record.demoPreview&&!pinEligible(record)))return;pendingAPIPlace=null;placePickerSelected=record.id;const host=$('#place-picker-detail');host.innerHTML='<p role="status">장소를 확인하고 있어요…</p>';mountPlacePicker();
 if(record.demoPreview){host.innerHTML=`<article class="place-pin-confirm"><div class="place-pin-photo">${placeArt(record)}</div><div><small>예시 장소</small><h3>${esc(record.name)}</h3><p>${esc(record.address)}</p><small>${esc(record.type)} · ${record.duration}분</small></div><p class="picker-example-note">화면 확인용 예시예요. 실제 장소는 Google 검색 연결 후 추가할 수 있어요.</p></article>`;return;}
 try{const p=await window.ReelPlaceAPI.details(record);if(version!==placeSelectionVersion||location.hash!==route||!host.isConnected)return;if(!pinEligible(p))throw new Error('coordinates');pendingAPIPlace=p;const mapsURL=p.googleMapsURI||'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(p.lat+','+p.lng)+(p.placeId?'&query_place_id='+encodeURIComponent(p.placeId):'');host.innerHTML=`<article class="place-pin-confirm"><div class="place-pin-photo">${placeArt(p)}</div><div><small>선택한 장소</small><h3>${esc(p.name)}</h3><p>${esc(p.address)}</p><a href="${esc(mapsURL)}" target="_blank" rel="noopener noreferrer">Google 지도에서 확인 ↗</a>${(p.photoAuthors||[]).concat(p.attributions||[]).map(a=>`<small><a href="${esc(window.ReelPlaceAPI.safeURL(a.url))}" target="_blank" rel="noopener noreferrer">${esc(a.name)}</a></small>`).join('')}</div><button type="button" class="btn" data-action="save-api-place">${addingToTrip()?'이 장소를 일정에 추가':'이 장소 저장'}</button></article>`;host.scrollIntoView?.({behavior:'smooth',block:'nearest'});}
 catch{if(version===placeSelectionVersion&&host.isConnected)host.innerHTML='<p role="alert">장소 정보를 불러오지 못했어요. 다시 선택해 주세요.</p>';}}
function saveAPIPlace(){const p=pendingAPIPlace;if(!p||!pinEligible(p))return;const trip=addingToTrip();if(trip&&state.board.length>=20&&!state.board.includes(p.id)){toast('하루에 20곳까지 담을 수 있어요.');return;}const resolved=resolvingPlace(),existing=place(resolved)||state.places.find(x=>x.source===p.source&&x.placeId===p.placeId)||place(p.id);if(existing)p.id=existing.id;if(existing){delete existing.demoCoordinates;delete existing.locationNote;delete existing.original;Object.assign(existing,{...p,duration:existing.duration});}else state.places.push(p);if(!libraryIds().includes(p.id))state.library.push(p.id);if(trip&&!state.board.includes(p.id)){state.board.push(p.id);state.saved=false;}pendingAPIPlace=null;save();$('#dialog').close();go(trip?tripDetailRoute():'board');}

function reviewMapMode(){return window.REEL_MAPS_CONFIG?.mode==='review'||!window.REEL_MAPS_CONFIG?.apiKey;}
function reviewPosition(p){
 if(p.source||!window.ReelGoogleMap.valid(p))return null;
 const scale=256*Math.pow(2,16),merc=lat=>Math.log(Math.tan(Math.PI/4+lat*Math.PI/360));
 const x=320+(p.lng-127.044)/360*scale,y=300-(merc(p.lat)-merc(37.5446))/(2*Math.PI)*scale-110;
 return x>25&&x<615&&y>25&&y<420?{x:x/640*100,y:y/490*100}:null;
}
function reviewVisitLines(places){
 const points=places.map(p=>{const pos=reviewPosition(p);return pos?{x:pos.x*6.4,y:Math.max(14,pos.y)*4.9}:null;});
 const segments=points.slice(1).flatMap((to,i)=>{const from=points[i];if(!from||!to)return [];const path=`${from.x},${from.y} ${(from.x+to.x)/2},${(from.y+to.y)/2} ${to.x},${to.y}`;return [`<g data-visit-segment="${esc(places[i].id)}:${esc(places[i+1].id)}"><polyline points="${path}" class="visit-line-halo"/><polyline points="${path}" class="visit-line" marker-mid="url(#visit-arrow)"/></g>`];});
 return `<svg class="review-visit-lines" viewBox="0 0 640 490" aria-label="선택한 장소의 방문 순서 연결선" role="img"><defs><marker id="visit-arrow" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto" markerUnits="strokeWidth"><path d="M1 1L7 4L1 7Z" fill="#7353c7"/></marker></defs>${segments.join('')}</svg>`;
}
function reviewMapImage(places,active){return `<div class="review-map-image" role="group" aria-label="실제 Google 지도 캡처 위 장소 사진 핀"><img class="review-map-background" src="../assets/photos/google-seongsu-review.png" width="640" height="600" alt="서울숲과 성수동 Google 지도 캡처. 지도 데이터 ©2026 TMap Mobility. 확대·이동을 지원하지 않는 지도 이미지.">${reviewVisitLines(places)}${places.map((p,i)=>{const pos=reviewPosition(p);return pos?`<button class="review-photo-pin ${p.id===active?'active':''}" style="left:${pos.x}%;top:${Math.max(14,pos.y)}%" data-action="focus-place" data-id="${p.id}" aria-label="지도에서 ${esc(p.name)} 선택" aria-pressed="${p.id===active}">${placeArt(p).replace('loading="lazy"','loading="eager"')}<b>${i+1}</b></button>`:'';}).join('')}</div><div class="review-map-attribution">Google Maps · 지도 데이터 ©2026 TMap Mobility</div><div class="review-map-caption"><span>방문 순서 → · 실제 이동 경로 아님</span><a href="../docs/google-maps-setup.html">출처·표시 기준</a></div>`;}
let mapPlaces=[];
function mapPanel(ids=state.board){
 mapPlaces=ids.map(place).filter(Boolean).map(p=>{const seed=window.REEL_PLACES.find(x=>x.id===p.id);return p.original?p:{...seed,...p};});
 const visible=mapPlaces.filter(p=>reviewMapMode()?reviewPosition(p):pinEligible(p)),active=visible.find(p=>p.id===state.focus)||visible[0];
 return `<section class="map-workspace" aria-label="Google 지도와 선택 장소">${reviewMapMode()?reviewMapImage(mapPlaces,active?.id):'<div class="google-map-host" data-google-map role="region" aria-label="Google 장소 지도"></div>'}${active?`<div class="map-selected"><div class="map-photo">${placeArt(active)}</div><div><strong>${esc(active.name)}</strong><p>${esc(active.locationNote||active.area+' · '+active.type)}</p><a target="_blank" rel="noopener noreferrer" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(active.lat+','+active.lng)}">Google 지도에서 열기 ↗</a></div></div>`:''}</section>`;
}
function mountMaps(){if(current()==='home')loadRecommendations();if(current()==='manual'&&!isGuest()){mountPlacePicker();const query=new URLSearchParams(location.hash.split('?')[1]||'').get('query');if(query&&discoveryRoute!==location.hash){discoveryRoute=location.hash;placePickerQuery=query;const form=$('#place-search-form');form.elements.query.value=query;searchPlaces(form,{query});}return;}const h=document.querySelector('[data-google-map]');window.ReelGoogleMap.mount(h,mapPlaces.map(p=>pinEligible(p)?p:{...p,lat:null,lng:null}),state.focus||mapPlaces.find(pinEligible)?.id,id=>{state.focus=id;save();render();});}
const navIcon=route=>icon(route);
function brandLogo(){
 const english=document.documentElement.lang==='en';
 const filename=english?'reeltrip-logo-en-charcoal-transparent.png':'reeltrip-logo-ko-charcoal-transparent.png';
 return `<img class="brand-logo" src="../assets/brand/${filename}" alt="${english?'Reeltrip':'릴트립'}" width="${english?1164:993}" height="446">`;
}
function layout(content){
 const r=current(),screen=byRoute(r),role=screen?.role||'customer',access=window.ReelAccess;
 const tabs=access.isAdmin?[]:!isGuest()&&access.mode()==='guide'?[['guide-desk','▤','요청함'],['guide-calendar','◇','가능 일정'],['guide-earnings','○','수수료'],['messages','◇','채팅'],['account','○','마이']]:[['home','⌂','발견'],['trips','▤','내 여행'],['guides','♧','메이트'],['messages','◇','채팅'],['account','○','마이']];
 const tabRoute=({processing:'home',results:'home',manual:'trips',board:'trips',planner:'trips',share:'trips',guide:'guides',request:'guides',requested:'guides',quote:'guides',checkout:'guides',booking:'guides',chat:'messages',cancel:'guides',review:'guides',settings:'account',support:'account',policies:'account','guide-fee':'guide-desk','guide-quote':'guide-desk'})[r]||r;
 const parent=isTripDetail()?'trips':r==='chat'?'messages':role==='admin'?'admin':role==='guide'?'guide-desk':({processing:'home',results:'home',manual:addingToTrip()?tripDetailRoute():new URLSearchParams(location.hash.split('?')[1]||'').has('query')?'home':'board',planner:tripDetailRoute(),share:location.hash.includes('scope=trip')?tripDetailRoute():'planner',guide:'guides',request:location.hash.includes('mode=free')?'guides':tripDetailRoute(),requested:'guides',quote:'requested',checkout:'quote',booking:'guides',chat:'messages',board:'trips',cancel:'booking',review:'booking',signup:isGuest()?'home':'account','signup-email':'signup',settings:'account',support:'settings',policies:'settings'})[r]||access.home();
 const shortTitleOriginal=({trips:'여행 상세',board:'저장한 장소',processing:'장소 찾기',results:'장소 확인',manual:'장소 추가',planner:'일정 편집',share:'일정 공유',guide:'메이트 소개',request:location.hash.includes('mode=free')?'자유 견적 요청':'내 여행으로 메이트 요청',requested:'요청 상태',quote:'여행 제안',checkout:'예약 확인',booking:'예약 상세',chat:'채팅',cancel:'취소 요청',review:'후기 작성',settings:'설정',support:'도움말',policies:'이용 안내','guide-fee':'매칭 수수료','guide-quote':'제안 작성'})[r]||screen?.name||'릴트립';
 const signupRoute=r==='signup'||r==='signup-email';
 const shortTitle=signupRoute?signupText(r==='signup'?'title':'emailTitle'):shortTitleOriginal;
 const isRoot=tabs.some(t=>t[0]===r)&&!isTripDetail();
 const header=access.isAdmin?`${access.controls()}<header class="topbar"><a class="brand brand-lockup" href="#admin">${brandLogo()}</a><span class="brand-surface-label">${document.documentElement.lang==='en'?'Operations':'운영'}</span></header>`:isTripDetail()&&!isGuest()?tripDetailHeader():isRoot?'':`<header class="topbar detail-topbar"><a class="app-back" href="#${parent}" aria-label="${signupRoute?signupText('back'):'이전 화면으로'}">‹</a><strong class="app-title">${shortTitle}</strong><span class="header-balance" aria-hidden="true"></span></header>`;
 return `${isGuest()?'':`<details class="reviewtools"><summary>모바일 앱 검토 도구</summary><div class="reviewlinks">${access.tools()}<a href="../index.html">기획 허브</a><a href="../docs/product.html">기획·명세</a><button class="textbtn" data-action="scenarios">데모 상태</button><label>화면 바로가기<select id="screen-jump">${screens.filter(s=>access.allowed(s.role,s.route)).map(s=>`<option value="${s.route}" ${r===s.route?'selected':''}>${s.id} ${s.name}</option>`).join('')}</select></label><p>검토용 도구입니다. 실제 앱에는 표시되지 않습니다.</p></div></details>`}${header}<main id="main" class="page ${!access.isAdmin&&isRoot?'tab-page':''} ${isTripDetail()&&!isGuest()?'trip-detail-page':''}" tabindex="-1">${!access.isAdmin&&r==='home'?`<div class="home-entry-row"><div class="home-brand">${signupBrandLogo()}</div>${notificationBell()}</div>`:''}<div class="screennote">${screen?`${screen.id} · ${screen.name}`:'화면을 찾을 수 없습니다'}${role!=='customer'?' · 검토용 역할 화면 (실제 인증 없음)':''}</div>${storageWarning?'<div class="infobar warn">브라우저 저장소를 사용할 수 없습니다. 변경 내용은 이번 이용 중에만 유지됩니다.</div>':''}${!access.isAdmin&&r==='guide-desk'?`<div class="guide-notification-row">${notificationBell()}</div>`:''}${content}</main>${access.isAdmin||signupRoute?'':`<nav class="mobiletabs" aria-label="앱 하단 메뉴">${tabs.map(([route,icon,label])=>`<a href="#${route}" class="${tabRoute===route?'active':''}" ${tabRoute===route?'aria-current="page"':''}><b aria-hidden="true">${navIcon(route)}</b>${label}${route==='messages'&&unreadChats()?`<span class="chat-tab-unread" aria-label="${unreadChats()} 읽지 않은 메시지">${unreadChats()}</span>`:''}</a>`).join('')}</nav>`}`;
}
function notificationItems(){
 const mode=window.ReelAccess.mode(),guideMode=mode==='guide',items=[];
 const b=state.booking,q=state.request;
 if(b)items.push({id:`${mode}:booking:${b.id}:${b.status}`,category:'guide',symbol:'trips',route:guideMode?'guide-desk':'booking',title:({confirmed:'예약이 확정됐어요',cancellation_requested:'취소 요청을 확인해 주세요',cancelled:'예약이 취소됐어요',completed:'여행이 완료됐어요'})[b.status]||statusLabel(b.status),body:`여행일 ${b.date} · ${b.guide}`,time:b.confirmedAt||b.requestedAt||0});
 else if(q)items.push({id:`${mode}:request:${q.id}:${q.status}:${state.quote?.version||0}`,category:'guide',symbol:q.status==='quoted'?'board':'trips',route:guideMode?'guide-desk':q.status==='quoted'?'quote':'requested',title:guideMode?(q.status==='requested'?'새 여행 요청이 도착했어요':'여행 요청 상태가 변경됐어요'):(q.status==='quoted'?'메이트의 제안이 도착했어요':'여행 요청 상태를 확인하세요'),body:`여행일 ${q.date} · ${statusLabel(q.status)}`,time:q.createdAt||0});
 return items.map(n=>({...n,read:(state.readNotifications||[]).includes(n.id)}));
}
function markNotificationsRead(ids){state.readNotifications=[...new Set([...(state.readNotifications||[]),...ids])].slice(-200);save();}
function notificationBell(){const count=notificationItems().filter(n=>!n.read).length;return `<a class="notification-bell" href="#notifications" aria-label="알림${count?' · 읽지 않은 알림':''}">${icon('bell')}${count?'<span class="notification-dot" aria-hidden="true"></span>':''}</a>`;}
let notificationFilter='all';
function notifications(){const items=notificationItems(),unread=items.filter(n=>!n.read).length,filters=[['all','전체'],['trip','여행 일정'],['guide','메이트']],visible=items.filter(n=>notificationFilter==='all'||n.category===notificationFilter);return `<section class="notifications-page"><div class="notification-filters" role="group" aria-label="알림 유형">${filters.map(([id,label])=>`<button type="button" class="notification-filter ${notificationFilter===id?'is-active':''}" data-action="notification-filter" data-id="${id}" aria-pressed="${notificationFilter===id}">${label}${items.some(n=>!n.read&&(id==='all'||n.category===id))?`<span class="filter-unread"><span class="sr-only">읽지 않은 알림 </span>${items.filter(n=>!n.read&&(id==='all'||n.category===id)).length}</span>`:''}</button>`).join('')}</div>${items.length?`<div class="notification-toolbar"><p aria-live="polite">${visible.length}개의 알림</p>${unread?'<button type="button" class="notification-read-all" data-action="notifications-read-all">모두 읽음</button>':''}</div>`:''}${visible.length?`<div class="notification-list">${visible.map(n=>`<a class="notification-item ${n.read?'is-read':'is-unread'}" href="#${n.route}" data-action="notification-open" data-id="${esc(n.id)}"><span class="notification-symbol category-${n.category}">${icon(n.symbol||'bell')}</span><div><strong>${!n.read?'<span class="notification-unread-mark" aria-hidden="true"></span><span class="sr-only">읽지 않은 알림 · </span>':''}${esc(n.title)}</strong><p>${esc(n.body)}</p>${n.time?`<time datetime="${new Date(n.time).toISOString()}">${new Date(n.time).toLocaleDateString(document.documentElement.lang==='en'?'en-US':'ko-KR',{timeZone:'Asia/Seoul',month:'short',day:'numeric'})}</time>`:''}</div><span class="notification-chevron" aria-hidden="true">›</span></a>`).join('')}</div>`:`<div class="notification-empty"><span>${icon('bell')}</span><h2>아직 알림이 없어요</h2><p>새로운 소식이 오면 여기서 알려드릴게요.</p></div>`}</section>`;}

function saveRestaurant(id){
  const item=window.ReelRestaurants.find(restaurant=>restaurant.id===id);
  if(!item)return false;
  if(!place(id))state.places.push({id,restaurant:true,name:item.name[0],ko:item.name[0],address:item.address,type:'맛집',duration:45,recommended:true});
  resolvePlace(id);
  return true;
}
function resumeSignupAction(){
 if(pendingRecommendation){const record=pendingRecommendation;pendingRecommendation=null;saveRecommendation(record);go('home');return true;}
 if(pendingRequestRoute){const route=pendingRequestRoute;pendingRequestRoute=null;go(route);return true;}
 if(pendingEstimate){pendingEstimate=false;go(activeMateStep()?.route||'request?sample=1');return true;}
 if(!pendingRestaurant)return false;
 const id=pendingRestaurant;pendingRestaurant=null;
 if(!saveRestaurant(id))return false;
 return true;
}
let recommendationQuery='서울 관광명소',recommendationRows=[],recommendationStatus='idle',recommendationVersion=0,pendingRecommendation=null;
function recommendationSaved(p){return !isGuest()&&state.places.some(x=>x.source==='google'&&x.placeId===p.placeId&&libraryIds().includes(x.id));}
function recommendationCards(){
 if(recommendationStatus==='loading'||recommendationStatus==='idle')return '<div class="recommendation-loading" role="status">장소와 사진을 불러오고 있어요…</div>';
 if(recommendationStatus==='error')return '<div class="recommendation-empty" role="status"><p>장소를 불러오지 못했어요.</p><button class="btn secondary small" data-action="recommendation-retry">다시 불러오기</button></div>';
 if(!recommendationRows.length)return '<p class="recommendation-empty">검색 결과가 없어요. 다른 지역이나 장소를 검색해 보세요.</p>';
 return `<div class="recommendation-grid">${recommendationRows.map((p,i)=>{const saved=recommendationSaved(p);return `<article class="recommendation-card"><div class="recommendation-photo">${window.ReelPlaceAPI.safeURL(p.photoURL)?`<span class="provider-photo"><img class="travel-photo" src="${esc(window.ReelPlaceAPI.safeURL(p.photoURL))}" alt="${esc(p.name)}" loading="lazy" decoding="async" referrerpolicy="strict-origin-when-cross-origin"></span>`:art()}</div><div class="recommendation-body"><h3>${esc(p.name)}</h3><p>${esc(p.address)}</p><div class="recommendation-attribution">${(p.photoAuthors||[]).concat(p.attributions||[]).map(a=>a.url?`<a href="${esc(window.ReelPlaceAPI.safeURL(a.url))}" target="_blank" rel="noopener noreferrer">${esc(a.name)}</a>`:esc(a.name)).join(' · ')}</div><div class="recommendation-actions">${p.googleMapsURI?`<a href="${esc(p.googleMapsURI)}" target="_blank" rel="noopener noreferrer">지도 ↗</a>`:''}<button type="button" data-action="save-recommendation" data-id="${i}" ${saved?'disabled':''} aria-label="${esc(p.name)} ${saved?'저장됨':'저장'}">${saved?'✓ 저장됨':'＋ 저장'}</button></div></div></article>`;}).join('')}</div>`;
}
function paintRecommendations(){const host=$('#recommendation-results');if(!host)return;host.innerHTML=interfaceMarkup(recommendationCards());host.setAttribute('aria-busy',String(recommendationStatus==='loading'));const label=$('#recommendation-query');if(label)label.textContent=recommendationQuery;document.querySelectorAll('[data-action="discover-query"]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.query===recommendationQuery)));}
async function loadRecommendations(query=recommendationQuery,force=false){if(!force&&query===recommendationQuery&&recommendationStatus!=='idle'){paintRecommendations();return;}recommendationQuery=query;const version=++recommendationVersion;recommendationStatus='loading';recommendationRows=[];paintRecommendations();try{const rows=await window.ReelPlaceAPI.search(query,'google');if(version!==recommendationVersion)return;recommendationRows=rows.filter(pinEligible).slice(0,6);recommendationStatus='ready';}catch{if(version!==recommendationVersion)return;recommendationStatus='error';}paintRecommendations();}
function saveRecommendation(record){if(!record||!pinEligible(record))return false;if(isGuest()){pendingRecommendation={...record};go('member-required');return false;}const existing=state.places.find(p=>p.source==='google'&&p.placeId===record.placeId);const p=existing||{...record};if(!existing)state.places.push(p);else Object.assign(p,{...record,id:existing.id,duration:existing.duration||45});if(!libraryIds().includes(p.id))state.library.push(p.id);save();paintRecommendations();const count=$('#discover-saved-count');if(count)count.textContent=String(libraryIds().length);toast('저장한 장소에 담았어요.');return true;}
let discoveryRoute='';
function startDiscovery(query){query=String(query||'').trim();if(query.length<2||query.length>120)return;loadRecommendations(query,true);}
function discoveryPlaces(){
 const count=isGuest()?0:libraryIds().length;
 return `<section class="discover-places" aria-labelledby="discover-title"><header><span class="discover-eyebrow">장소 발견</span><h2 id="discover-title">다음 여행, 어디로 갈까요?</h2><p>장소를 저장하고, 내 여행에서 일정을 만들어보세요.</p></header><form id="discover-search-form" class="discover-search"><label class="sr-only" for="discover-query">지역 또는 장소 이름</label><input id="discover-query" name="query" required minlength="2" maxlength="120" placeholder="지역 또는 장소 이름"><button class="btn" type="submit">검색</button></form><div class="discover-themes" aria-label="장소 검색 아이디어">${[['성수 카페','카페','잠깐 쉬어갈 곳','☕'],['부산 해변','바다','바람 쐬러 가는 곳','〰'],['제주 산책','산책','천천히 걷는 곳','↟']].map(([query,label,copy,symbol])=>`<button type="button" data-action="discover-query" data-query="${esc(query)}"><span class="discover-theme-icon" aria-hidden="true">${symbol}</span><strong>${label}</strong><small>${copy}</small><span class="discover-theme-query">${query}</span></button>`).join('')}</div><section class="recommendations" aria-label="추천 장소"><div class="recommendation-heading"><h3>가보고 싶은 장소</h3><span>Google Maps</span></div><p id="recommendation-query">${esc(recommendationQuery)}</p><div id="recommendation-results" aria-busy="${recommendationStatus==='loading'}">${recommendationCards()}</div></section><div class="discover-next"><div><strong>${count?'모아둔 장소로 여행을 준비해요':'마음에 드는 곳부터 모아보세요'}</strong><p>${count?'저장한 장소 <span id="discover-saved-count">'+count+'</span>곳 · 일정은 내 여행에서 관리해요.':'장소 저장 → 내 여행 만들기 → 메이트 제안 받기'}</p></div><div class="discover-next-links">${btn('저장한 장소','board','secondary small')}${btn('내 여행 보기','trips','secondary small')}</div></div></section>`;
}
function activeMateStep(){
 if(state.booking&&state.booking.status!=='cancelled')return {route:'booking',label:signupText('trackBooking')};
 if(state.request?.status==='quoted')return {route:'requested',label:signupText('compareOffers')};
 if(state.request?.status==='requested')return {route:'requested',label:signupText('trackRequest')};
 return null;
}
function mateNextButton(kind='secondary'){
 const next=activeMateStep();
 return next?btn(next.label,next.route,kind):btn(signupText('mateRequestPublic'),'request',kind);
}
function requestStops(){stashDay();return [...new Set(state.days.flatMap(d=>d.ids))].filter(id=>place(id));}
function home(){const resume=isGuest()?null:activeMateStep()||(state.saved?{route:'planner',label:'일정 이어서 편집'}:null);return `<section class="import-card action-import"><div class="import-heading"><span class="import-icon">${icon('link')}</span><div><h1>링크로 여행 시작</h1><p class="import-subtext">마음에 든 쇼츠·릴스 속 장소를 모아 여행 일정을 만들어보세요.</p></div></div><form id="extract-form"><label class="sr-only" for="video-url">유튜브 쇼츠 또는 인스타그램 릴스 링크</label><input id="video-url" type="url" inputmode="url" autocomplete="off" autocapitalize="none" spellcheck="false" aria-describedby="url-error" placeholder="쇼츠·릴스 링크 붙여넣기" maxlength="2048"><button class="btn" type="submit">장소 찾기 <span aria-hidden="true">→</span></button><p id="url-error" class="error" role="alert"></p></form></section>${resume?`<a class="resume-action" href="#${resume.route}"><div><span>이어서 하기</span><strong>${resume.label}</strong></div><span aria-hidden="true">→</span></a>`:''}${discoveryPlaces()}`;}
function processing(){const fail=state.extraction==='failed';return `<section class="centerbox card pad extraction-card ${fail?'is-failed':''}" aria-labelledby="extraction-title"><div class="extraction-visual" aria-hidden="true"><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${fail?'<rect x="9" y="7" width="30" height="34" rx="9"/><path d="M24 16v10m0 6h.01"/>':'<path d="M33 20c0 8-9 15-9 15s-9-7-9-15a9 9 0 1 1 18 0Z"/><circle cx="24" cy="20" r="3"/><path d="M13 32H9l-4 9h38l-4-9h-4"/>'}</svg></div><div class="eyebrow">영상 속 장소 찾기</div><h1 id="extraction-title">${fail?'이 영상을 불러올 수 없어요.':'영상에 나온 이름과 위치를 찾고 있어요.'}</h1>${fail?'':`<div class="extraction-progress" aria-hidden="true"><span></span></div><ol class="extraction-stages"><li class="is-complete"><span class="extraction-stage-icon" aria-hidden="true">✓</span><span>링크 형식 확인 완료</span></li><li class="is-active" aria-current="step"><span class="extraction-stage-icon" aria-hidden="true"></span><span>영상 속 장소 탐색 중</span></li><li class="is-pending"><span class="extraction-stage-icon" aria-hidden="true">3</span><span>장소 이름과 지점 확인</span></li></ol>`}<p class="extraction-note">${fail?'비공개이거나 삭제된 영상일 수 있어요. 공개 링크로 다시 시도하거나, 알고 있는 장소 이름과 주소를 직접 붙여넣어 주세요.':'장소 이름이 같아도 지점은 다를 수 있어요. 결과에서 주소를 확인해 주세요.'}</p><div class="buttons extraction-actions">${fail?`${btn('장소 검색','manual')}${btn('다른 링크 입력','home','secondary')}`:`${btn('돌아가기','home','secondary small')}`}</div></section>`;}
function placeCard(p,mode='result'){const chosen=state.selected.includes(p.id);return `<article class="place ${mode==='result'&&chosen?'is-selected':''}">${mode==='result'?`<input type="checkbox" aria-label="${esc(p.name)} 선택" data-select="${p.id}" ${chosen?'checked':''}>`:''}<div class="place-thumb">${placeArt(p)}</div><div class="place-main"><h3>${esc(p.name)}</h3><p>${esc(p.type)}${p.area&&p.area!==p.address?' · '+esc(p.area):''}</p><span class="badge ${p.verified?'':'warm'}">${pinEligible(p)?'Google Maps':'장소 연결 필요'}</span>${!pinEligible(p)?`<button class="textbtn" data-action="resolve-place" data-id="${esc(p.id)}">Google에서 장소 연결</button>`:''}<p>${esc(p.address)}</p><details class="place-menu"><summary aria-label="${esc(p.name)} · 장소 관리"><span aria-hidden="true">⋯</span></summary><div class="place-menu-panel"><div class="buttons">${mode==='result'?`<button class="textbtn" data-action="correct" data-id="${p.id}">Google 장소 연결</button>`:`<button class="textbtn" data-action="correct" data-id="${p.id}">Google 장소 연결</button><button class="textbtn" data-action="must" data-id="${p.id}">${state.must.includes(p.id)?'★ 꼭 가볼 곳':'☆ 꼭 가볼 곳으로 지정'}</button><button class="textbtn" data-action="remove" data-id="${p.id}">삭제</button>`}</div></div></details>${mode==='board'?window.ReelBookingTools.widget(p):''}</div></article>`;}
function results(){const filtered=state.places.filter(p=>!p.recommended&&(state.filter==='전체'||p.type===state.filter));return `${title('','장소 선택','')}<p class="source-line">${state.source.startsWith('https:')?`<a href="${esc(state.source)}" target="_blank" rel="noopener noreferrer">원본 영상 확인 ↗</a>`:'성수의 카페와 산책'}</p>${mapPanel(state.selected)}<div class="sectionhead"><h2>발견한 장소 ${filtered.length}곳</h2>${btn('장소 검색','manual','secondary small')}</div><div class="chips">${['전체','카페','쇼핑','맛집','공원'].map(t=>chip(t,state.filter===t,`data-action="filter" data-value="${t}"`)).join('')}</div><p class="hint">같은 이름의 지점은 주소를 확인해 주세요.</p>${filtered.map(p=>placeCard(p)).join('')||'<p class="empty">이 분류에는 아직 장소가 없어요.</p>'}<div class="bottomaction"><span>${state.selected.length}곳 선택</span>${action('선택한 장소 저장','save-places','',state.selected.length?'':'disabled')}</div>`;}
function addingToTrip(){return new URLSearchParams(location.hash.split('?')[1]||'').get('from')==='trips';}
function placeSuggestion(){
 return `<details class="trip-settings"><summary>장소 제안하기</summary><form class="card pad" id="suggest-place-form"><label>장소 이름<input name="name" required maxlength="80"></label><label>주소 또는 동네<input name="address" required maxlength="160"></label><p class="hint">제안은 이 브라우저에만 저장돼요.</p><button class="btn secondary" type="submit">제안 저장</button></form></details>`;
}
function manual(){return `<div class="place-picker-page">${placeSearchForm()}</div>`;}
function board(){ensureDays();const ids=libraryIds();return `${title('','저장한 장소','저장한 장소를 선택해 여행 일정에 담아보세요.',`${btn('영상 추가','home','secondary')}${btn('장소 추가','manual','secondary')}`)}<p class="collection-target"><strong>${esc(state.title)}</strong><br>${state.day+1}일차 · ${esc(state.date)} 일정에 담아요.</p>${!ids.length?empty('아직 장소가 없어요.','링크를 넣거나 장소를 직접 추가하세요.'):`<section>${ids.map(place).filter(Boolean).map(p=>`<div class="library-place">${placeCard(p,'board')}<button class="btn secondary" data-action="library-to-trip" data-id="${esc(p.id)}" ${state.board.includes(p.id)?'disabled':''}>${state.board.includes(p.id)?'이날 일정에 담김':'이날 일정에 담기'}</button></div>`).join('')}<div class="bottomaction">${btn('담은 장소로 일정 편집','planner')}</div></section>`}`;}

const duration=ids=>ids.map(place).filter(Boolean).reduce((n,p)=>n+p.duration,0)+Math.max(0,ids.length-1)*12;
function timeAt(offset,start=state.time){const [h,m]=start.split(':').map(Number),total=h*60+m+offset;return `${String(Math.floor(total/60)%24).padStart(2,'0')}:${String(total%60).padStart(2,'0')}`;}
function timeline(ids=state.board,edit=false){let offset=0;return `<div class="timeline">${ids.map(place).filter(Boolean).map((p,i)=>{const t=timeAt(offset);offset+=p.duration+12;return `<article class="stop"><div class="stop-time">${t}</div><div class="stop-dot">${i+1}</div><div class="stop-card"><div class="timeline-cover">${placeArt(p)}<span>서울 · ${esc(p.area)}</span></div><h3>${esc(p.name)} ${state.must.includes(p.id)?'<span class="badge">꼭 가볼 곳</span>':''}</h3><p>${esc(p.type)} · ${p.duration}분${i?' · 이동시간 확인 필요':''}</p>${edit?`<div class="stop-controls"><button class="iconbtn" aria-label="${esc(p.name)} 위로 이동" data-action="move" data-id="${p.id}" data-dir="-1" ${i===0?'disabled':''}>↑</button><button class="iconbtn" aria-label="${esc(p.name)} 아래로 이동" data-action="move" data-id="${p.id}" data-dir="1" ${i===ids.length-1?'disabled':''}>↓</button><label style="display:flex;align-items:center;gap:8px;font-weight:400">체류시간 <select data-duration="${p.id}" aria-label="${esc(p.name)} 체류시간" style="width:87px;padding:6px;min-height:32px;margin:0">${[15,30,45,50,60,90,120,180].map(n=>`<option value="${n}" ${p.duration===n?'selected':''}>${n}분</option>`).join('')}</select></label></div>`:''}</div></article>`;}).join('')}</div>`;}
// Coordinate-only estimate, not a road route or live travel time. Walking speed: 4 km/h.
function walkingEstimate(a,b){
 const valid=p=>p&&Number.isFinite(p.lat)&&Number.isFinite(p.lng)&&Math.abs(p.lat)<=90&&Math.abs(p.lng)<=180;
 if(!valid(a)||!valid(b)||(window.REEL_MAPS_CONFIG?.apiKey&&(!pinEligible(a)||!pinEligible(b))))return null;
 const rad=n=>n*Math.PI/180,dl=rad(b.lat-a.lat),dn=rad(b.lng-a.lng);
 const h=Math.sin(dl/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dn/2)**2;
 const meters=6371000*2*Math.asin(Math.sqrt(Math.min(1,Math.max(0,h))));
 return {meters,minutes:meters===0?0:Math.max(1,Math.ceil(meters/(4000/60)))};
}
function travelLeg(a,b){const e=walkingEstimate(a,b);if(!e)return '<div class="route-leg"><strong>위치 확인 필요</strong><small>좌표가 없어 이동시간을 계산할 수 없어요.</small></div>';
 const directions='https://www.google.com/maps/dir/?api=1&origin='+encodeURIComponent(a.lat+','+a.lng)+'&destination='+encodeURIComponent(b.lat+','+b.lng);
 const distance=e.meters<1000?Math.round(e.meters)+' m':(e.meters/1000).toFixed(1)+' km';
 return `<div class="route-leg"><strong>도보 약 ${e.minutes}분 <span>· 직선거리 ${distance}</span></strong><a class="route-directions" href="${esc(directions)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(a.name)} → ${esc(b.name)} · Google 지도 길찾기">길찾기 ↗</a><small>${a.demoCoordinates||b.demoCoordinates?'예시 좌표 기준 추정':'도보 추정 · 실제 경로와 다를 수 있어요.'}</small></div>`;
}
function planner(){ensureDays();return `${title('','일정 편집','')}<div class="planner-tools">${btn('＋ 영상 추가','home','secondary small')}${btn('장소 모음','board','secondary small')}</div>${dayTabs()}${mapPanel()}<section class="itinerary-sheet"><div class="sheet-handle"></div><div class="sectionhead"><div><span class="eyebrow">${state.day+1}일차 · 한국 시간</span><h2>${state.board.length?'오늘 가고 싶은 곳':'이날은 아직 비어 있어요'}</h2></div><span class="badge">${state.board.length}곳</span></div><details class="trip-settings"><summary><span>${state.date} · ${state.time} 출발</span><b>수정</b></summary><label>여행 제목<input id="trip-title" value="${esc(state.title)}" maxlength="70"></label><label>이날 날짜<input id="trip-date" type="date" value="${state.date}"></label><label>시작 시간<input id="trip-time" type="time" value="${state.time}"></label></details>${state.board.length?state.board.map((id,i)=>{const p=place(id);return `<article class="route-stop ${state.focus===id?'focused':''}"><button class="route-thumb" data-action="focus-place" data-id="${id}" aria-label="지도에서 ${esc(p.name)} 보기">${placeArt(p).replace('loading="lazy"','loading="eager"')}<b>${i+1}</b></button><div class="route-info"><h3>${esc(p.name)}</h3><p>${esc(p.area)} · ${esc(p.type)} · ${p.duration}분</p><p class="hint">${esc(p.address)}</p><div class="route-edit"><span class="route-edit-label">일정 편집</span><div class="stop-controls"><button class="iconbtn" data-action="move" data-id="${id}" data-dir="-1" aria-label="${esc(p.name)} 위로 이동" ${i===0?'disabled':''}>↑</button><button class="iconbtn" data-action="move" data-id="${id}" data-dir="1" aria-label="${esc(p.name)} 아래로 이동" ${i===state.board.length-1?'disabled':''}>↓</button><select data-duration="${id}" aria-label="${esc(p.name)} 머무는 시간">${[15,30,45,50,60,90,120,180].map(n=>`<option value="${n}" ${p.duration===n?'selected':''}>${n}분</option>`).join('')}</select></div><div class="buttons"><button class="textbtn" data-action="move-day" data-id="${id}">다른 날로</button><button class="textbtn" data-action="remove" data-id="${id}">빼기</button></div></div>${window.ReelBookingTools.widget(p)}</div></article>${i<state.board.length-1?travelLeg(p,place(state.board[i+1])):''}`;}).join(''):`<div class="empty"><p>다른 날짜의 장소를 옮기거나 영상에서 새 장소를 찾아보세요.</p>${btn('영상에서 장소 찾기','home','secondary')}</div>`}${window.ReelBookingTools.saved(state.date)}<div class="bottomaction"><div class="buttons">${action(state.saved?'저장 완료':'일정 저장','save-trip',state.saved?'secondary small':'',state.saved?'disabled':'')}${state.board.length?btn('이날 공유','share','secondary'):''}</div></div></section>`;}
function tripText(){if(location.hash.includes('scope=trip')){stashDay();return state.title+'\n'+state.days.map((d,i)=>`Day ${i+1} · ${d.date} · ${d.time}\n${d.ids.map(place).filter(Boolean).map((p,j)=>`${j+1}. ${p.name} — ${d.durations?.[p.id]||p.duration}분`).join('\n')}${(d.notes||[]).length?'\n'+d.notes.join('\n'):''}`).join('\n\n');}return `${state.title} · ${state.day+1}일차\n${state.date} · ${state.time} (한국 시간)\n${state.board.map(place).filter(Boolean).map((p,i)=>`${i+1}. ${p.name} — ${p.duration}분\n${p.address}`).join('\n')}\n방문 전에 위치와 영업시간을 확인하세요.`;}
function share(){if(!location.hash.includes('scope=trip')&&!state.board.length)return empty('아직 공유할 일정이 없어요.','저장한 장소로 하루 일정을 만들어보세요.');return `<div class="centerbox">${title('함께 나누면 더 좋은 여행','함께 오는 일행에게 일정을 보내세요.','연락처·결제정보는 공유되지 않아요.')}<div class="card pad"><label for="share-text">공유할 일정 내용</label><textarea id="share-text" style="min-height:260px" readonly>${esc(tripText())}</textarea>${taskGroup('일행에게 공유',action('일정 복사','copy'),'visit','복사한 내용을 원하는 메신저에 붙여넣으세요.')}</div></div>`;}
function tripOverview(){stashDay();return `<section class="trip-overview"><div class="sectionhead"><div><span class="eyebrow">전체 여행 · 한국 시간</span><h2>${esc(state.title)}</h2></div><span class="badge">${state.days.length}일</span></div>${state.days.map((d,i)=>`<article class="overview-day"><div class="overview-head"><strong>${i+1}일차 · ${esc(d.date)}</strong><button class="textbtn" data-action="overview-day" data-value="${i}">이날 열기 →</button></div><div class="overview-stats"><div><span>출발 시각</span><strong>${esc(d.time)}</strong><small>KST</small></div><div><span>방문 장소</span><strong>${d.ids.length}</strong></div><div><span>총 체류 시간</span><strong>${d.ids.reduce((sum,id)=>sum+(d.durations?.[id]||place(id)?.duration||0),0)}<small>분</small></strong></div></div><ol>${d.ids.map(id=>place(id)).filter(Boolean).map(p=>`<li><span class="overview-place-name">${esc(p.name)}</span><small class="overview-duration">${d.durations?.[p.id]||p.duration}분</small></li>`).join('')||'<li>아직 장소가 없어요.</li>'}</ol><span class="hint overview-note">${guided&&state.booking?.date===d.date?'이 날짜의 예약은 아래 예약 상세에서 확인하세요.':'자유 일정 · 이동·대기시간은 별도 확인'}</span></article>`).join('')}${guided&&state.booking?'<p class="hint">일정을 수정해도 확정된 메이트 예약은 변경되지 않아요.</p>':''}</section>`;}
function sampleDay(){
 return {title:signupText('sampleDay'),date:future(),time:'13:00',party:2,stops:sampleStopIds.map(id=>window.REEL_PLACES.find(p=>p.id===id))};
}
function tripWorkspace(){return `<a href="#board" class="trip-library-shortcut">${icon('board')}<span>저장한 장소</span><small>${isGuest()?'':libraryIds().length}</small><b aria-hidden="true">›</b></a>`;}

function tripPreview(day,cta){
 let offset=0;
 const rows=day.stops.map((p,i)=>{
  const arrival=timeAt(offset,day.time);
  offset+=p.duration+12;
  return `<li class="trip-place-row"><span class="trip-place-photo">${placeArt(p)}<b>${i+1}</b></span><div class="trip-place-copy"><strong>${esc(p.name)}</strong><span>${esc(p.area)} · ${esc(p.type)}</span><small>${p.duration}분</small></div><time>${arrival}</time></li>`;
 }).join('');
 return `<section class="card pad trip-editor-card trip-plan"><h2>${esc(day.title)}</h2><p>${esc(day.date)} · ${day.party}${signupText(day.party===1?'oneGuestUnit':'partyUnit')}</p>${rows?`<div class="trip-route-heading"><h3>방문 순서</h3><span>${day.stops.length}곳</span></div><ol>${rows}</ol><p class="hint">${signupText('estimateNote')}</p>`:`<div class="trip-empty"><h3>가고 싶은 장소부터 담아보세요</h3><p>저장한 장소를 담으면 하루 일정이 시작돼요.</p>${btn('저장한 장소에서 담기','board','secondary')}${btn('새 장소 직접 추가','manual?from=trips','secondary')}</div>`}${cta}</section>`;
}
function tripDateRange(days){const dates=days.map(d=>d.date).sort();return dates[0]===dates.at(-1)?dates[0]:dates[0]+' ~ '+dates.at(-1);}
function tripListCard(t){const ids=[...new Set(t.days.flatMap(d=>d.ids))],first=ids.map(place).find(p=>p?.photoURL||(!window.REEL_MAPS_CONFIG?.apiKey&&p?.photo));return `<button type="button" class="my-trip-card" data-action="open-trip" data-id="${esc(t.id)}"><span class="my-trip-cover">${first?placeArt(first):icon('trips')}</span><span class="my-trip-summary"><strong>${esc(t.title)}</strong><span>${esc(tripDateRange(t.days))}</span><small>${t.days.length}일 · ${ids.length}곳 · ${t.party}명</small></span><span class="my-trip-chevron" aria-hidden="true">›</span></button>`;}
function trips(){
 ensureDays();stashDay();stashTrip();if(isTripDetail()){const id=new URLSearchParams(location.hash.split('?')[1]).get('id');if(id&&id!==state.activeTripId&&!selectTrip(id))return empty('여행을 찾을 수 없어요.','','trips','내 여행 목록');return tripDetail();}
 const today=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Seoul'}),past=state.trips.filter(t=>t.days.every(d=>d.date<today)),upcoming=state.trips.filter(t=>!past.includes(t));
 return `<div class="my-trips-heading"><h1>내 여행</h1></div><button class="trip-create-banner" type="button" data-action="new-trip"><span aria-hidden="true">＋</span><span><strong>여행 일정 만들기</strong><small>새로운 여행을 준비해 보세요.</small></span></button>${tripWorkspace()}${upcoming.length?`<section class="trip-list-section"><h2>다가오는 여행</h2><div class="my-trip-list">${upcoming.map(tripListCard).join('')}</div></section>`:''}${past.length?`<section class="trip-list-section"><h2>지난 여행</h2><div class="my-trip-list">${past.map(tripListCard).join('')}</div></section>`:''}`;
}
function tripDetailHeader(){return `<header class="trip-detail-header"><a class="app-back" href="#trips" aria-label="내 여행 목록">‹</a><div><h1>${esc(state.title)}</h1><p>${esc(tripDateRange(state.days))}</p></div><button type="button" class="trip-header-icon" data-action="edit-trip" aria-label="여행 정보 수정"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m4 16-1 5 5-1L21 7l-4-4L4 16ZM14 6l4 4"/></svg></button><a class="trip-header-icon" href="#share?scope=trip" aria-label="전체 여행 공유"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="5" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8 11 7-4m-7 6 7 4"/></svg></a></header>`;}
function tripDetail(){
 const next=activeMateStep(),linked=state.request?.tripId===state.activeTripId,stops=state.board.map(place).filter(Boolean);
 const requestAction=next?(linked?btn(next.label,next.route):btn('진행 중인 메이트 요청 확인',next.route,'secondary')):requestStops().length?btn(signupText('tripEstimate'),'request'):'';
 let offset=0;
 const rows=stops.map((p,i)=>{const at=timeAt(offset);offset+=p.duration+12;return `<li class="trip-timeline-stop"><span class="trip-stop-number">${i+1}</span><button class="trip-stop-content ${state.focus===p.id?'is-focused':''}" type="button" data-action="focus-place" data-id="${esc(p.id)}" aria-label="지도에서 ${esc(p.name)} 보기"><span><strong>${esc(p.name)}</strong><small>${esc(p.type)} · ${esc(p.area)}</small><small>${at} · ${p.duration}분</small>${!pinEligible(p)?'<small class="place-connect-hint">눌러서 Google 장소 연결</small>':''}</span><span class="trip-stop-photo">${placeArt(p)}</span></button>${i<stops.length-1?travelLeg(p,stops[i+1]):''}</li>`;}).join('');
 const notes=state.days[state.day].notes||[];
 return `<div class="trip-detail-map">${stops.length?mapPanel():'<div class="trip-map-empty">'+icon('trips')+'<p>장소를 담으면 지도에서 동선을 볼 수 있어요.</p></div>'}</div><section class="trip-detail-sheet"><div class="sheet-handle" aria-hidden="true"></div><div class="trip-day-toolbar">${dayTabs()}${btn('편집','planner','secondary small')}</div><div class="trip-day-heading"><h2>Day ${state.day+1}</h2><span>${esc(state.date.slice(5).replace('-','.'))} · ${state.time}</span></div>${rows?`<ol class="trip-timeline">${rows}</ol>`:`<div class="trip-day-empty"><h3>어디부터 가볼까요?</h3><p>아래 ＋ 버튼에서 가고 싶은 장소를 담아보세요.</p></div>`}${notes.length?`<section class="trip-notes"><h3>이날의 메모</h3>${notes.map((note,i)=>`<button type="button" class="trip-note" data-action="edit-note" data-id="${i}"><span>${esc(note)}</span><small>수정</small></button>`).join('')}</section>`:''}<section class="trip-mate-inline"><div>${icon('guides')}<h3>메이트와 함께하는 여행</h3></div><p>내 일정으로 코스와 가격을 제안받아요.</p>${requestAction||'<span class="hint">장소를 담으면 요청할 수 있어요.</span>'}</section></section><button class="trip-add-fab" type="button" data-action="trip-add-menu" aria-label="일정에 추가" aria-haspopup="dialog">＋</button>`;
}
function tripAddMenu(){modal(`<div class="trip-menu-heading"><h2>Day ${state.day+1}에 추가</h2><button class="textbtn" type="button" data-action="close" aria-label="닫기">×</button></div><button type="button" class="trip-add-option" data-action="trip-pick-places">${icon('board')}<span><strong>저장한 장소에서 담기</strong><small>영상에서 찾은 장소를 일정에 추가해요.</small></span></button><div class="trip-add-grid"><button type="button" data-action="add-note">${icon('messages')}<strong>메모 추가</strong></button><button type="button" data-action="trip-manual">${icon('all')}<strong>새 장소 추가</strong></button></div>`,'trip-menu');}
function tripPlacePicker(){const places=libraryIds().map(place).filter(Boolean);modal(`<div class="trip-menu-heading"><h2>저장한 장소</h2>${action('완료','close','secondary small')}</div><p class="hint">Day ${state.day+1} · ${esc(state.date)}</p><div class="trip-place-picker">${places.map(p=>`<div class="trip-picker-row"><span>${placeArt(p)}</span><div><strong>${esc(p.name)}</strong><small>${esc(p.area)} · ${esc(p.type)}</small></div><button class="btn secondary small" type="button" data-action="trip-add-place" data-id="${esc(p.id)}" ${state.board.includes(p.id)?'disabled':''}>${state.board.includes(p.id)?'담김':'추가'}</button></div>`).join('')||'<p>저장한 장소가 없어요. 새 장소를 추가해 보세요.</p>'}</div>`,'trip-menu');}
function addTripPlace(id){if(!libraryIds().includes(id)||!place(id)||state.board.includes(id)||state.board.length>=20)return false;state.board.push(id);state.saved=false;save();return true;}
function editTripInfo(){modal(`<form id="edit-trip-form"><h2>여행 정보 수정</h2><label>여행 이름<input name="title" required maxlength="70" value="${esc(state.title)}"></label><label>출발일<input name="date" type="date" required value="${esc(state.days[0].date)}"></label><label>인원<select name="party">${[1,2,3,4].map(n=>`<option value="${n}" ${state.party===n?'selected':''}>${n}명</option>`).join('')}</select></label><p class="hint">출발일을 바꾸면 모든 날짜가 함께 이동해요.</p><p id="edit-trip-error" role="alert" class="error"></p><div class="buttons"><button type="submit" class="btn">저장</button>${action('취소','close','secondary')}</div></form>`);}
function updateTripInfo(d){const name=String(d.title||'').trim(),party=Number(d.party),date=d.date;if(!name||name.length>70||!/^\d{4}-\d{2}-\d{2}$/.test(date||'')||!Number.isFinite(Date.parse(date+'T12:00:00Z'))||dateAfter(date,0)!==date||!Number.isInteger(party)||party<1||party>4)return false;stashDay();const shift=Math.round((Date.parse(date)-Date.parse(state.days[0].date))/86400000);state.days.forEach(day=>day.date=dateAfter(day.date,shift));state.date=state.days[state.day].date;state.title=name;state.party=party;state.saved=false;save();return true;}
function editTripNote(index=-1){const note=(state.days[state.day].notes||[])[index]||'';modal(`<form id="trip-note-form" data-index="${index}"><h2>Day ${state.day+1} 메모</h2><label>메모<textarea name="note" required maxlength="500" placeholder="만날 장소, 예약 시간, 챙길 것을 적어보세요.">${esc(note)}</textarea></label><p id="note-error" class="error" role="alert"></p><div class="buttons"><button type="submit" class="btn">저장</button>${action('취소','close','secondary')}</div></form>`);}
function saveTripNote(text,index=-1){const note=String(text||'').trim();if(!note||note.length>500)return false;stashDay();const notes=state.days[state.day].notes||(state.days[state.day].notes=[]);if(index>=0){if(index>=notes.length)return false;notes[index]=note;}else notes.push(note);state.saved=false;save();return true;}

let guidesTab='requests';
function guideRequests(){const r=state.request,list=proposals(),open=r&&['requested','quoted'].includes(r.status)&&!state.booking;return `<div class="proposal-inbox"><div class="inbox-heading"><h2>도착한 제안</h2><a href="#support">이용 안내</a></div><section class="request-group"><h3>제안 받는 중</h3>${open?requestInboxCard(r,list,true):`<button type="button" class="inbox-start" data-action="guides-tab" data-id="discover"><span class="inbox-start-icon">${icon('board')}</span><span><strong>아직 받은 제안이 없어요</strong><small>지역과 여행 기간만 정해 자유 견적을 받아보세요.</small></span><b aria-hidden="true">›</b></button>`}</section>${r&&!open?`<section class="request-group"><h3>마감된 요청</h3><p class="request-group-note">제안 받기가 종료된 여행이에요.</p>${requestInboxCard(r,list,false)}</section>`:''}</div>`;}
function requestInboxCard(r,list,open){const unread=list.filter(q=>!(state.viewedProposals||[]).includes(q.id+':'+q.version));const created=r.createdAt?new Date(r.createdAt).toLocaleDateString(document.documentElement.lang==='en'?'en-US':'ko-KR',{timeZone:'Asia/Seoul',month:'short',day:'numeric'}):'';return `<a href="#requested" class="request-inbox-card"><div class="request-inbox-meta"><span class="request-inbox-status ${open?'is-open':''}">${open?'제안 받는 중':state.booking?'메이트 선택 완료':'요청 마감'}</span><span>${esc(created)}</span></div><div class="request-inbox-title"><h4>${esc(r.tripTitle||state.title)}</h4><span>제안 ${list.length} <b aria-hidden="true">›</b></span></div><p class="request-inbox-facts">${requestPeriod(r)} · ${r.party}명 · ${r.requestType==='free'?'자유 견적':(r.stops||[]).length+'곳'}</p><div class="request-inbox-footer">${list.length?`<span class="proposal-avatar-stack" aria-hidden="true">${list.slice(0,3).map(q=>`<span>${esc(q.guide[0])}</span>`).join('')}</span><span>${unread.length?'새 제안 '+unread.length:'도착한 제안을 비교해 보세요'}</span>`:'<span>메이트가 여행을 살펴보고 있어요</span>'}</div></a>`;}


const nicknameDirectoryKey='reeltrip-prototype-nicknames-v1',nicknameOwner='traveler-demo';
let checkedNickname='';
const normalizeNickname=value=>String(value||'').normalize('NFKC').replace(/\s+/gu,'').toLowerCase();
function readNicknameDirectory(){const raw=JSON.parse(localStorage.getItem(nicknameDirectoryKey)||'{}');if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error('Invalid nickname directory');return {...raw,[normalizeNickname('\uBBF8\uB098')]:'mate-mina',[normalizeNickname('\uC900')]:'mate-jun'};}
function nicknameProblem(value,directory){const display=String(value||'').normalize('NFKC').trim(),canonical=normalizeNickname(display);if(display.length<2||display.length>20||canonical.length<2)return '닉네임은 2~20자로 입력해 주세요.';if(/[\p{Cc}\p{Cf}]/u.test(display))return '사용할 수 없는 문자가 포함되어 있어요.';if(['\uB9B4\uD2B8\uB9BD','reeltrip','\uC6B4\uC601\uD300','\uACE0\uAC1D\uC13C\uD130','\uAD00\uB9AC\uC790'].some(word=>canonical.includes(word)))return '운영 계정으로 오해할 수 있는 이름은 사용할 수 없어요.';const owner=directory[canonical];return owner&&owner!==nicknameOwner?'이미 사용 중인 닉네임이에요. 다른 이름을 입력해 주세요.':'';}
function checkNickname(){const input=document.querySelector('#profile-form [name="nickname"]'),message=$('#nickname-status');checkedNickname='';try{const problem=nicknameProblem(input.value,readNicknameDirectory());message.textContent=problem||'사용할 수 있는 닉네임이에요.';message.dataset.valid=String(!problem);if(!problem)checkedNickname=normalizeNickname(input.value);}catch{message.textContent='중복 확인을 완료하지 못했어요. 다시 시도해 주세요.';message.dataset.valid='false';}}
let profileDraftPhoto='';
function profileAvatar(photo=state.profile?.photo){return photo?`<img src="${esc(photo)}" alt="프로필 사진">`:icon('account');}
function editProfile(){checkedNickname='';profileDraftPhoto=state.profile?.photo||'';modal(`<form id="profile-form"><div class="profile-dialog-heading"><h2>프로필 편집</h2><button type="button" class="textbtn" data-action="close" aria-label="닫기">×</button></div><div class="profile-photo-editor"><div class="profile-photo-preview" id="profile-photo-preview">${profileAvatar(profileDraftPhoto)}</div><label class="profile-camera-button" id="profile-camera-button" aria-label="사진 선택" ${profileDraftPhoto?'hidden':''}>${icon('camera')}<span class="sr-only">사진 선택</span><input id="profile-photo" type="file" accept="image/jpeg,image/png,image/webp"></label><button type="button" class="profile-photo-clear" id="profile-photo-clear" data-action="remove-profile-photo" aria-label="사진 삭제" ${profileDraftPhoto?'':'hidden'}><span aria-hidden="true">×</span></button></div><p class="hint">JPG·PNG·WebP · 최대 1MB</p><label for="profile-nickname">닉네임</label><div class="nickname-entry"><input id="profile-nickname" name="nickname" required minlength="2" maxlength="20" value="${esc(state.profile?.nickname||'')}" placeholder="어떻게 불러드릴까요?" autocomplete="nickname" aria-describedby="nickname-status"><button type="button" class="nickname-check" data-action="check-nickname">중복 확인</button></div><p id="nickname-status" class="nickname-status" role="status" aria-live="polite"></p><p id="profile-error" class="error" role="alert"></p><button type="submit" id="profile-save" class="btn">저장</button></form>`);}
function account(){const mate=window.ReelAccess.mode()==='guide',booking=state.booking,request=state.request;const activeBooking=booking&&['awaiting_mate_fee','confirmed','cancellation_requested'].includes(booking.status),activeRequest=!activeBooking&&request&&['requested','quoted'].includes(request.status);return `<section class="my-page"><div class="my-heading"><h1>마이</h1><a class="my-settings-button" href="#settings" aria-label="설정">${icon('settings')}</a></div><button type="button" class="my-profile" data-action="edit-profile" aria-label="프로필 편집"><span class="my-avatar">${profileAvatar()}</span><span class="my-profile-copy"><strong>${esc(state.profile?.nickname||'여행자')}</strong><small>${state.profile?.nickname?'프로필 편집':'닉네임과 사진을 등록해 보세요'}</small></span><span class="profile-edit-chevron" aria-hidden="true">›</span></button>${activeBooking||activeRequest?`<section class="my-current"><span class="eyebrow">진행 중인 여행</span><h2>${esc(activeBooking?booking.date:request.tripTitle||state.title)}</h2><p>${esc(statusLabel(activeBooking?booking.status:request.status))}${activeRequest?' · '+proposals().length+'개의 제안':''}</p>${mate?btn('요청 확인','guide-desk','secondary'):activeBooking?btn('예약 확인','booking','secondary'):'<a class="btn secondary" href="#guides" data-action="my-proposals">도착한 제안 확인</a>'}</section>`:''}<div class="my-menu">${mate?`<a href="#guide-calendar">가능 일정 관리<span>›</span></a><a href="#guide-earnings">매칭 수수료<span>›</span></a>`:`<a href="#guides" data-action="my-proposals">도착한 제안<span>${proposals().length?proposals().length+' · ':''}›</span></a>`}</div></section>`;}

function settingsPage(){return `<section class="settings-page">${window.ReelAccess.settings().replace(/<div class="account-setting-row">[\s\S]*?<\/a><\/div>/,()=>signupLanguageLink())}<section class="settings-group"><h2>도움과 이용 안내</h2><a href="#support">도움말·문의<span>›</span></a><a href="#policies">이용약관·개인정보<span>›</span></a></section><section class="settings-group"><h2>데이터 관리</h2><button type="button" data-action="export-data">내 정보 내려받기<span>↓</span></button><button type="button" data-action="reset" class="settings-danger">저장 정보 삭제<span>›</span></button></section></section>`;}

function support(){return `<div class="centerbox">${title('도움말','무엇을 도와드릴까요?','')}<div class="card pad"><h2 class="support-group-title">자주 묻는 질문</h2><details><summary>한글 이름을 몰라도 장소를 찾을 수 있나요?</summary><p class="muted small">공개된 영상 링크로 장소 후보를 찾을 수 있어요. 모든 영상에서 추출되는 것은 아니며, 같은 이름의 지점은 주소를 비교해 확인해야 해요.</p></details><details style="margin-top:16px"><summary>${guided?'메이트가 식당 예약까지 해주나요?':'장소를 저장하면 식당도 예약되나요?'}</summary><p class="muted small">${guided?'장소 선택이나 메이트 요청만으로 식당이 예약되지는 않아요. 필요한 도움을 요청서에 적고, 메이트의 최종 제안에 포함된 범위를 확인해 주세요.':'장소 저장은 방문 계획을 정리하는 기능이에요. 식당 예약·주문 통역은 제공하지 않아요. 방문 조건과 예약 방법은 해당 매장에 별도로 확인해 주세요.'}</p></details><details style="margin-top:16px"><summary>장소를 찾지 못한 이유는 무엇인가요?</summary><p class="muted small">비공개 영상, 불명확한 이름, 여러 지점 때문에 추출하지 못할 수 있습니다. 공개 링크를 사용하거나 장소를 직접 추가해 보세요.</p></details></div><form id="support-form" class="card pad" style="margin-top:20px"><h2 class="support-group-title">직접 문의 작성</h2><label>문의 유형<select name="type"><option>장소·추출 오류</option><option>데이터·개인정보 요청</option>${guided?'<option>예약·환불</option>':''}<option>기타 의견</option></select></label><label style="margin-top:17px">문의 내용<textarea name="body" minlength="10" maxlength="1000" required placeholder="어느 장소나 단계에서 막혔나요? 한국어로 직접 쓰기 어렵다면 사용 중인 언어로 남겨주세요. (10자 이상)"></textarea></label><button type="submit" class="btn" style="margin-top:18px">문의 저장</button></form>${state.tickets.length?`<div class="notice">${state.tickets.length}건의 저장한 문의. 최근 상태: ${esc(statusLabel(state.tickets.at(-1).status))}. 외부로 전송되지 않습니다.</div>`:''}</div>`;}
function policies(){return `<article class="legalcopy">${title('이용 안내','여행 전에 확인해 주세요.','장소 정보와 저장 방식, 현금 지급·매칭 방식을 안내합니다.')}<h2>장소와 지도</h2><p>사진과 지도는 방문할 곳을 살펴보기 위한 정보예요. 현재 영업시간·정확한 지점·매장 입구는 방문 전에 확인해 주세요. 지도 위 연결선은 방문 순서이며 실제 이동 경로가 아닙니다.</p><h2>여행 정보 저장</h2><p>여행은 현재 브라우저에 저장됩니다. 다른 기기와 자동으로 연결되지 않으며 브라우저 데이터를 지우면 함께 삭제될 수 있어요. 내 계정에서 정보를 내려받거나 삭제할 수 있습니다.</p><h2>현재 이용 가능한 범위</h2><p>영상 분석·실시간 길찾기·고객센터 전송은 아직 연결되지 않았어요.${guided?' 메이트 요청과 메시지는 이 기기에만 저장됩니다. 실제 메이트 연락·예약·수수료 결제는 발생하지 않습니다. 여행 비용은 현장에서 메이트에게 현금으로 지급하는 구조입니다.':''}</p><h2>개인정보</h2><p>실제 결제정보나 민감한 개인정보는 입력하지 마세요. 공유한 일정에는 개인 연락처와 대화 내용이 포함되지 않습니다.</p><h2>사진과 콘텐츠</h2><p>원본 영상은 링크로 확인할 수 있습니다. 사진의 촬영 시점과 현재 현장 모습은 다를 수 있어요.</p><div class="buttons"><a class="btn secondary" href="../docs/photo-credits.html">사진 출처</a>${btn('도움말','support','secondary')}</div></article>`;}
function guides(){return `${title('','메이트')}<div class="trip-mode-tabs" role="group" aria-label="메이트 메뉴"><button type="button" data-action="guides-tab" data-id="requests" aria-pressed="${guidesTab==='requests'}">${icon('board')}<span>도착한 제안</span>${proposals().length?`<span class="trip-request-count">${proposals().length}</span>`:''}</button><button type="button" data-action="guides-tab" data-id="discover" aria-pressed="${guidesTab==='discover'}">${icon('guides')}<span>자유 견적 받기</span></button></div><section class="trip-tab-panel">${guidesTab==='requests'?guideRequests():guideDiscovery()}</section>`;}

function guideDiscovery(){const next=activeMateStep();return `<section class="card pad free-quote-intro"><span class="eyebrow">일정이 없어도 괜찮아요</span><h2>어디로, 며칠 동안 떠나세요?</h2><p>지역과 여행 기간을 알려주면 메이트가 코스와 전체 견적을 제안해요.</p><ul class="listclean"><li>여행 지역 선택</li><li>당일 또는 숙박 일정을 선택</li><li>받은 코스와 가격을 비교하고 메이트 선택</li></ul>${next?`<p class="notice">진행 중인 요청이나 예약을 먼저 확인해 주세요.</p>${btn(next.label,next.route)}`:btn('지역·기간 정하고 자유 견적 받기','request?mode=free')}<p class="hint">이미 만든 여행이 있다면 내 여행에서 일정 그대로 요청할 수 있어요.</p>${btn('내 여행 보기','trips','secondary')}</section>`;}



function journeySummary(q,priceLabel='일행 전체 금액'){return `<section class="journey-summary"><div class="journey-guide"><span class="portrait">${esc(q.guide[0])}</span><div><h2>${esc(q.guide)}${q.guide==='매칭 전'?'':' 메이트'}</h2><p>영어 안내 · ${esc(q.region||'여행 지역')}</p></div></div><div class="journey-facts"><div><span>여행 날짜</span><strong>${requestPeriod(q)}</strong></div><div><span>시작 시간 · 한국</span><strong>${esc(q.time)}</strong></div><div><span>함께하는 인원</span><strong>${q.party}명</strong></div><div><span>요청 방식</span><strong>${q.requestType==='free'?'자유 견적':'내 여행 일정'}</strong></div></div>${q.amount!==undefined?`<div class="journey-price"><span>${priceLabel} · KRW</span><strong>${money(q.amount)}</strong><p>${q.party}명 전체 금액이에요. 식비·교통비·쇼핑·입장료는 별도예요.</p></div>`:`<div class="journey-price pending"><span>예상 비용</span><strong>일정 확인 후 안내</strong><p>지금은 결제하지 않아요. 제안받은 가격을 확인하고 결정하세요.</p></div>`}</section>`;}
function journeyPlan(plan){return `<ol class="journey-plan">${String(plan||'').split('\n').filter(line=>line.trim()).map((line,i)=>`<li><b>${i+1}</b><span>${esc(line.replace(/^\d+[.)]\s*/,''))}</span></li>`).join('')}</ol>`;}
function guidePage(){
 const mate=state.guide==='jun'?'jun':'mina';
 const photo=guide().photo;
 return `${title('','메이트 소개','')}
 <section class="mate-profile">
  <header class="mate-cover mate-cover--${mate}">
   <div class="mate-identity">
    ${photo?`<img class="mate-avatar" src="${esc(photo)}" alt="">`:''}
    <div><p class="mate-area">${signupText(mate+'Area')}</p><h2>${signupText(mate+'Title')}</h2></div>
   </div>
  </header>
  <div class="mate-bio">
   <p class="mate-intro">${signupText(mate+'Intro')}</p>
   <p class="mate-meta">${signupText('mateLanguages')}<br>${signupText('mateCapacity')}</p>
   <p class="mate-price-note">${signupText('matePriceNote')}</p>
  </div>
 </section>
 <section class="mate-help"><h2>어떤 도움을 받을 수 있나요?</h2><ul>
  <li>${icon('guides')}<span>영어로 동네와 장소 안내</span></li>
  <li>${icon('cafe')}<span>카페·식당에서 한국어 주문 도움</span></li>
  <li>${icon('trips')}<span>방문 순서와 이동 방법 조율</span></li>
 </ul><p class="hint">식비·쇼핑·교통비·입장료는 포함되지 않아요. 예약 가능 여부는 요청 후 확인해요.</p></section>`;
}

function requestPeriod(r){return r.endDate&&r.endDate!==r.date?`${esc(r.date)} ~ ${esc(r.endDate)}`:esc(r.date);}
function tripLength(n){return n===1?'당일':`${n-1}박 ${n}일`;}
function dateAfter(date,offset){return new Date(Date.parse(date+'T12:00:00Z')+offset*86400000).toISOString().slice(0,10);}
function itineraryRequestDays(example=false){
 if(example){const d=sampleDay();return [{date:d.date,time:d.time,stops:d.stops.map(p=>({...p}))}];}
 stashDay();return state.days.map(d=>({date:d.date,time:d.time,stops:d.ids.map(place).filter(Boolean).map(p=>({...p,duration:d.durations?.[p.id]||p.duration}))}));
}
function requestPlan(r){return (r.days?.length?r.days:[{date:r.date,stops:r.stops||[]}]).map((d,i)=>`${i+1}일차 · ${d.date}\n${d.stops.length?d.stops.map(p=>p.name+' · '+p.duration+'분').join('\n'):'메이트가 방문 코스를 제안해요.'}`).join('\n');}
function submitTravelRequest(d,{free=false,example=false}={}){
 if(activeMateStep())return {route:activeMateStep().route};
 let days=free?[]:itineraryRequestDays(example);
 const count=Number(d.dayCount),party=Number(d.party),region=String(d.region||'').trim();
 if(free&&(!region||region.length>80))return {error:'여행 지역을 입력해 주세요.'};
 if(free&&(!Number.isInteger(count)||count<1||count>7))return {error:'여행 기간은 당일부터 6박 7일까지 선택해 주세요.'};
 if(!Number.isInteger(party)||party<1||party>4)return {error:'인원은 1명부터 4명까지 선택해 주세요.'};
 const start=free?d.date:days[0]?.date,time=free?d.time:days[0]?.time;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(start||'')||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time||'')||!Number.isFinite(Date.parse(`${start}T${time}:00+09:00`))||Date.parse(`${start}T${time}:00+09:00`)<Date.now()+48*3600000)return {error:'출발 최소 48시간 이후의 날짜와 시간을 선택해 주세요.'};
 if(dateAfter(start,0)!==start)return {error:'올바른 날짜를 선택해 주세요.'};
 if(free)days=Array.from({length:count},(_,i)=>({date:dateAfter(start,i),time,stops:[]}));
 if(!days.length||days.length>7||days.some((day,i)=>!Number.isFinite(Date.parse(day.date+'T12:00:00Z'))||(i&&day.date<=days[i-1].date))||Date.parse(days.at(-1).date)-Date.parse(start)>6*86400000)return {error:'내 여행의 날짜를 7일 이내의 순서대로 정리해 주세요.'};
 const stops=days.flatMap(day=>day.stops);
 if(!free&&!stops.length)return {error:'저장한 장소를 내 여행에 먼저 담아주세요.'};
 if(!free&&days.some(day=>day.stops.length>20))return {error:'하루에 20곳까지 요청할 수 있어요.'};
 if(!d.guideAck||!d.ack)return {error:'여행 공개와 예약 요청 안내를 확인해 주세요.'};
 syncConversations();
 state.request={id:'RQ-DEMO-'+Date.now(),status:'requested',requestType:free?'free':'itinerary',region:free?region:[...new Set(stops.map(p=>p.area))].join(', '),date:start,endDate:days.at(-1).date,dayCount:days.length,time,party,days:JSON.parse(JSON.stringify(days)),notes:String(d.notes||'').trim().slice(0,500),guide:'매칭 전',guideId:null,tripId:free?null:(state.activeTripId||'trip-legacy'),tripTitle:free?region+' · '+tripLength(days.length):example?signupText('sampleDay'):state.title,language:d.language||'영어',stops:JSON.parse(JSON.stringify(stops)),must:free||example?[]:state.must.filter(id=>stops.some(p=>p.id===id)),createdAt:Date.now()};
 state.quote=null;state.proposals=[];state.booking=null;state.review=null;state.messages=[];state.rating=0;save();return {route:'requested'};
}
function request(){
 const next=activeMateStep();if(next)return empty('진행 중인 여행이 있어요.','요청이나 예약 상태를 먼저 확인해 주세요.',next.route,next.label);
 const params=new URLSearchParams(location.hash.split('?')[1]||''),free=params.get('mode')==='free',example=params.get('sample')==='1',days=free?[]:itineraryRequestDays(example);
 if(!free&&!days.some(d=>d.stops.length))return empty('요청할 여행에 장소가 없어요.','장소를 담거나 메이트에게 코스부터 제안받아 보세요.','request?mode=free','자유 견적 받기');
 return `${steps(0)}${title('',free?'자유 견적 요청':'내 여행으로 메이트 요청',free?'지역과 기간만 정하면 메이트가 코스를 제안해요.':'내 여행의 날짜별 장소를 메이트에게 전달해요.')} ${free?'':`<section class="handoff card pad"><span class="badge">전체 여행 · ${days.length}일</span><h2>${esc(example?signupText('sampleDay'):state.title)}</h2>${days.map((d,i)=>`<h3>${i+1}일차 · ${esc(d.date)}</h3><p>${d.stops.map(p=>esc(p.name)).join(' · ')||'메이트에게 코스 추천을 부탁해요.'}</p>`).join('')}${example?'':btn('내 여행 수정',tripDetailRoute(),'secondary small')}</section>`}<form id="request-form" class="card pad" data-request-type="${free?'free':'itinerary'}"><h2>여행 조건</h2>${free?`<label>여행 지역<input name="region" required maxlength="80" placeholder="예: 서울 성수, 부산, 제주"></label><div class="formrow"><label>출발일<input type="date" name="date" required value="${future()}"></label><label>여행 기간<select name="dayCount">${[1,2,3,4,5,6,7].map(n=>`<option value="${n}">${tripLength(n)}</option>`).join('')}</select></label></div><label>첫날 만날 시간 (한국 기준)<input type="time" name="time" required value="10:00"></label><p class="hint">숙박 일수는 여행 기간이에요. 숙소 예약이나 24시간 동행이 포함되는 것은 아니에요.</p>`:''}<div class="formrow"><label>인원<select name="party">${[1,2,3,4].map(n=>`<option value="${n}" ${state.party===n?'selected':''}>${n}명</option>`).join('')}</select></label><label>안내 언어<select name="language"><option>영어</option></select></label></div><label>원하는 활동이나 도움 (선택)<textarea name="notes" maxlength="500" placeholder="예: 맛집과 쇼핑, 한국어 주문 도움, 꼭 가고 싶은 장소"></textarea></label><label class="check"><input type="checkbox" name="guideAck" required>여행 조건과 요청 내용을 메이트에게 공개합니다.</label><label class="check"><input type="checkbox" name="ack" required>제안받은 코스와 전체 금액을 확인한 뒤 메이트를 선택합니다.</label><p class="hint">출발 최소 48시간 전에 요청하세요. 요청만으로 예약되거나 결제되지 않아요.</p><p id="request-error" class="error" role="alert"></p><button type="submit" class="btn">${free?'자유 견적 요청하기':'이 여행으로 메이트 제안 받기'}</button></form>`;
}

function requested(){const r=state.request;if(!r)return empty('아직 여행 요청이 없어요.','내 여행으로 제안을 받아보세요.','request','여행 메이트 찾기');const list=proposals();return `${title('','도착한 제안','일정과 포함 사항, 전체 금액을 비교하고 선택하세요.')}<section class="card pad request-summary-card"><span class="badge">${esc(statusLabel(r.status))}</span><h2>${esc(r.tripTitle||state.title)}</h2><p>${requestPeriod(r)} · ${r.party}명 · ${r.requestType==='free'?'자유 견적':(r.stops||[]).length+'곳'}</p>${state.booking||r.status==='booked'?btn('예약 보기','booking'):['requested','quoted'].includes(r.status)?action('요청 마감','withdraw','secondary small'):btn('여행 메이트 찾기','request')}</section>${list.length?`<div class="proposal-section-heading"><h2>메이트의 제안</h2><span>${list.length}</span></div><div class="proposal-grid">${list.map(q=>`<article class="card pad proposal-card"><div class="guide proposal-header"><span class="portrait">${esc(q.guide[0])}</span><div><h2>${esc(q.guide)}${q.guide==='매칭 전'?'':' 메이트'}</h2><p>영어 · ${esc(q.region||'여행 지역')}</p></div></div><p class="proposal-description">${esc(q.reason)}</p><strong class="proposal-price">${money(q.amount)}<small> / ${q.party}명 전체</small></strong><p class="hint proposal-validity">${q.expires>Date.now()?'제안 확인 가능':'유효기간 만료'}</p>${action('일정·제안 보기','select-proposal','secondary',`data-id="${esc(q.id)}"`)}</article>`).join('')}</div>`:`<div class="empty"><h2>메이트의 제안을 기다리고 있어요</h2><p>메이트가 여행을 확인하고 일정과 제안을 보내드려요.</p></div>`}${!state.booking&&['requested','quoted'].includes(r.status)?`<details class="demo-next"><summary>예시 제안으로 체험하기</summary>${action('예시 제안 생성','demo-proposals','secondary')}</details>`:''}`;}

function quoteValid(){return state.quote&&state.quote.expires>Date.now()&&state.request?.status==='quoted';}
function quote(){const q=state.quote;if(!q)return empty('아직 제안이 준비되지 않았어요.','메이트가 요청한 일정을 확인하면 제안을 볼 수 있어요.','requested','요청 확인');const valid=quoteValid();return `${steps(1)}${title('메이트의 여행 제안','일정과 총액을 확인하세요.',`제안 ${q.version}차 · ${state.booking?'수락한 제안':valid?'발행 후 24시간 유효':'만료 또는 철회된 제안'}`)}${journeySummary(q,'현장에서 지급할 현금')}${action('메이트에게 질문하기','open-proposal-chat','secondary',`data-id="${esc(q.id)}"`)}<section class="card pad"><h2>제안받은 여행 일정</h2>${journeyPlan(q.plan)}<details class="trip-settings"><summary><span>내가 요청한 일정과 비교</span><b>보기</b></summary>${journeyPlan(state.request?requestPlan(state.request):'')}</details><div class="notice"><strong>변경 내용과 이유</strong><p>${esc(q.reason)}</p></div></section><section class="card pad"><h2>가격에 포함된 내용</h2>${taskGroup('포함 항목',`<ul class="listclean"><li>${window.ReelRevenue.duration(q.pricing?.hours||4)}</li><li>일정 준비와 동네 이동·주문 도움</li></ul>`,'visit')}${taskGroup('별도로 준비할 비용','<p>식비·쇼핑·교통비·입장료</p><p class="hint">대기 없는 입장이나 예약 대행은 보장하지 않아요.</p>','caution')}</section><details class="card pad journey-terms"><summary>현금 지급·취소 안내</summary><p>여행 비용은 현장에서 현금으로 지급해요. 취소나 이미 지급한 현금의 반환은 메이트와 확인해 주세요.</p></details><div class="bottomaction journey-action"><p>${state.booking?'확인한 제안':valid?'제안 금액 · '+money(q.amount):'유효한 새 제안이 필요해요'}</p>${state.booking?btn('예약 일정 보기','booking'):valid?btn('이 일정으로 예약 진행','checkout'):btn(signupText('compareOffers'),'requested','secondary')}</div>`;}

function requestBooking(name,email){if(window.ReelAccess.isAdmin||window.ReelAccess.mode()!=='customer'||state.booking||!quoteValid())return false;const q=state.quote;state.booking={...JSON.parse(JSON.stringify(q)),requestId:state.request.id,id:'RT-DEMO-'+Date.now(),quoteVersion:q.version,status:'awaiting_mate_fee',customer:name,email,requestedAt:Date.now(),paymentMethod:'cash',feeRate:.1,feeAmount:Math.round(q.amount*.1),feeStatus:'pending',cashStatus:'uncollected',policyVersion:'CASH-MATCH-10-V1'};syncConversations();state.request.status='matching';state.request.guide=q.guide;state.request.guideId=q.guideId;save();return true;}
function confirmMateFee(outcome){const b=state.booking;if(window.ReelAccess.isAdmin||window.ReelAccess.mode()!=='guide'||!b||b.status!=='awaiting_mate_fee'||b.feeStatus==='paid')return false;if(outcome!=='success'){b.feeStatus='failed';save();return false;}b.feeStatus='paid';b.feePaidAt=Date.now();b.status='confirmed';b.confirmedAt=Date.now();state.request.status='booked';save();return true;}
function cashNotice(amount){return `<section class="card pad cash-notice"><span class="badge">현장 현금 결제</span><h2>여행 당일 현금을 준비해 주세요</h2><strong>${money(amount)}</strong><p>여행 비용은 현장에서 메이트에게 직접 지급해요. 릴트립은 매칭을 연결하며 여행 비용을 받지 않아요.</p></section>`;}
function guideFee(){const b=state.booking;if(!b)return side('guide',empty('선택된 예약이 없어요.','여행자의 선택 후 수수료를 결제할 수 있어요.','guide-desk','요청함'));return side('guide',`${title('','매칭 확정','여행자가 회원님의 제안을 선택했어요.')}${journeySummary(b,'현장에서 받을 현금')}<section class="card pad"><h2>매칭 수수료 10%</h2><div class="summaryrow"><span>여행자와 약속한 금액</span><b>${money(b.amount)}</b></div><div class="summaryrow total"><span>릴트립에 결제할 수수료</span><b>${money(b.feeAmount)}</b></div><p>수수료 결제가 완료되어야 예약이 확정돼요. 여행 비용은 여행자에게 현금으로 직접 받으세요.</p>${b.status==='awaiting_mate_fee'?`<form id="mate-fee-form">${b.feeStatus==='failed'?`<p role="status">${signupText('feeRetry')}</p>`:''}<label class="check"><input type="checkbox" name="terms" required>매칭 수수료 10%와 현장 현금 지급 방식을 확인했습니다.</label><label class="developer-only">결제 결과<select name="outcome"><option value="success">결제 성공</option><option value="failure">결제 실패</option></select></label><p id="mate-fee-error" class="error" role="alert"></p><button type="submit" class="btn">${money(b.feeAmount)} 결제하고 예약 확정</button></form>`:`<p>${b.feeStatus==='paid'?'매칭 수수료 결제 완료':'현재 상태에서는 결제할 수 없어요.'}</p>`}</section>`);}
function checkout(){if(state.booking)return empty('이미 예약 진행 중인 제안이에요.','예약을 열어 현재 상태를 확인하세요.','booking','예약 열기');if(!quoteValid())return empty('유효한 여행 제안이 필요해요.','메이트에게 최신 가격과 일정을 요청하세요.','quote','제안 확인');const q=state.quote;return `${steps(2)}${title('','메이트 선택·예약 요청','메이트가 매칭 수수료를 결제하면 예약이 확정돼요.')}${journeySummary(q,'현장에서 지급할 현금')}<form id="checkout-form" class="card pad"><h2>예약자 정보</h2><label>메이트에게 알려줄 이름<input name="name" required maxlength="60" value="${esc(state.profile?.nickname||'')}" autocomplete="name"></label><label>이메일<input name="email" type="email" required autocomplete="email"></label><label class="check"><input name="terms" type="checkbox" required>일정과 전체 금액을 확인했으며, 여행 당일 메이트에게 현금으로 지급하겠습니다.</label><label class="check"><input name="pendingAck" type="checkbox" required>지금은 예약 요청이며 메이트의 수수료 결제 후 확정되는 것을 확인했습니다.</label><p id="checkout-error" class="error" role="alert"></p><button type="submit" class="btn">메이트 선택하고 예약 요청</button></form>`;}

function booking(){const b=state.booking;if(!b)return empty('아직 예약이 없어요.','메이트의 일정과 가격을 확인한 뒤 예약을 요청하세요.','requested','요청 확인');const pending=b.status==='awaiting_mate_fee',confirmed=['confirmed','completed'].includes(b.status);return `${title('나의 메이트 여행',pending?'메이트의 확정을 기다리고 있어요':statusLabel(b.status),b.id)}${pending?'<div class="notice">선택한 메이트가 매칭 수수료를 결제하면 예약이 확정돼요. 아직 확정된 예약이 아니에요.</div>':''}${journeySummary(b,'현장에서 지급할 현금')}${confirmed?'<p class="notice">여행 비용은 당일 메이트에게 현금으로 직접 지급해 주세요.</p>':''}${confirmed?`<section class="meeting-card"><span class="badge">만나는 곳</span><h2>메이트와 만날 장소를 정해 주세요</h2><p>${requestPeriod(b)} · 첫날 ${b.time} / 한국 시간</p><p class="hint">채팅에서 첫날 만날 위치와 날짜별 동행 시간을 확인하세요.</p></section>`:''}<section class="card pad"><h2>${pending?'요청한 일정':'예약 일정'}</h2>${journeyPlan(b.plan)}</section>${pending?btn(signupText('backTrips'),'trips','secondary small'):''}${['awaiting_mate_fee','confirmed'].includes(b.status)?`<section class="card pad">${btn(pending?'예약 요청 철회':'취소 요청','cancel','secondary')}</section>`:''}${b.status==='cancellation_requested'?'<div class="notice">취소 요청을 확인하고 있어요. 현금으로 이미 지급한 금액이 있다면 메이트와 확인해 주세요.</div>':''}${!confirmed||b.status==='completed'&&!state.review?btn('메이트와 대화','chat','secondary'):''}${confirmed?`<div class="bottomaction journey-action">${b.status==='completed'&&!state.review?btn('여행 후기 남기기','review'):btn('메이트에게 일정·만남 문의','chat')}</div>`:''}${state.review?`<section class="card pad"><h2>내 후기 · ${state.review.rating}/5</h2><p>${esc(state.review.body)}</p></section>`:''}`;}

function sampleChatMessages(){return [
 {sender:'guide',text:'안녕하세요! 성수 여행을 함께할 메이트 미나예요. 만나서 반가워요.',at:1795051800000},
 {sender:'customer',text:'안녕하세요! 서울숲을 산책하고 조용한 카페에 가보고 싶어요.',at:1795051920000},
 {sender:'guide',text:'좋아요. 서울숲을 먼저 걷고 근처 카페로 이동할게요. 사진 찍기 좋은 곳도 안내해 드릴게요.',at:1795052100000},
 {sender:'customer',text:'좋아요! 어디에서 만나면 될까요?',at:1795052220000},
 {sender:'guide',text:'오후 1시에 서울숲역 4번 출구에서 만나요. 도착하시면 여기로 메시지 주세요!',at:1795052400000}
 ];}
// Conversation IDs are stable across proposal revisions and booking confirmation.
function conversationKey(requestId,guideId){return JSON.stringify([requestId,guideId]);}
function ensureConversation(q,requestId=state.request?.id){
 if(!requestId||!q)return null;
 if(!Array.isArray(state.conversations))state.conversations=[];
 const guideId=q.guideId||'mina',id=conversationKey(requestId,guideId);
 let room=state.conversations.find(c=>c.id===id);
 if(!room){room={id,requestId,guideId,guide:q.guide,tripTitle:q.tripTitle||state.request?.tripTitle||state.title,endDate:q.endDate||q.date,date:q.date,customer:state.profile?.nickname||'여행자',messages:[],read:{customer:0,guide:0},createdAt:Date.now()};state.conversations.push(room);}
 return room;
}
function syncConversations(){
 if(isGuest())return [];
 if(!Array.isArray(state.conversations))state.conversations=[];
 const b=state.booking;
 if(b){
  const requestId=b.requestId||state.request?.id||b.id;
  const room=ensureConversation(b,requestId);
  if(room){
   room.bookingId=b.id;room.customer=b.customer||room.customer;room.status=b.status;
   // Keep the old storage field compatible, importing its history only once.
   if(!room.legacyImported){if(!room.messages.length&&state.messages?.length)room.messages=state.messages.map(m=>({...m,sender:m.sender||'customer'}));room.legacyImported=true;}
  }
 }
 return state.conversations;
}
function conversationBooking(room){const b=state.booking;return b&&conversationKey(b.requestId||state.request?.id||b.id,b.guideId||'mina')===room.id?b:null;}
function conversationOpen(room){
 const b=conversationBooking(room);
 if(b)return ['awaiting_mate_fee','confirmed'].includes(b.status);
 return room.requestId===state.request?.id&&!state.booking&&['requested','quoted'].includes(state.request.status);
}
function conversationStatus(room){const b=conversationBooking(room);return b?statusLabel(b.status):conversationOpen(room)?'제안 상담':'종료된 대화';}
function conversationRoute(room){return 'chat?thread='+encodeURIComponent(room.id);}
function conversationUnread(room){const mode=window.ReelAccess.mode();return room.messages.slice(room.read?.[mode]||0).filter(m=>(m.sender||'customer')!==mode).length;}
function unreadChats(){return isGuest()?0:syncConversations().reduce((sum,room)=>sum+conversationUnread(room),0);}
function chatContext(){
 const params=new URLSearchParams(location.hash.split('?')[1]||''),rooms=syncConversations();
 if(!isGuest()&&params.has('thread')){const room=rooms.find(c=>c.id===params.get('thread'));return room?{sample:false,room,booking:conversationBooking(room)||room,messages:room.messages}:null;}
 if(!isGuest()&&params.get('sample')!=='1'&&state.booking){const room=rooms.find(c=>conversationBooking(c));if(room)return {sample:false,room,booking:state.booking,messages:room.messages};}
 return {sample:true,booking:{guide:'미나',customer:'제이미',tripTitle:'성수에서 보내는 여유로운 오후',date:future(),status:'confirmed'},messages:isGuest()?sampleChatMessages():(state.sampleMessages||sampleChatMessages())};
}
function markChatRead(){
 if(isGuest()||window.ReelAccess.isAdmin||current()!=='chat')return;
 const context=chatContext();if(!context||context.sample)return;
 const room=context.room,mode=window.ReelAccess.mode();room.read=room.read||{};
 if(room.read[mode]!==room.messages.length){room.read[mode]=room.messages.length;save();}
}
function sendChatMessage(value){
 if(isGuest()||window.ReelAccess.isAdmin)return false;
 const text=String(value||'').trim(),context=chatContext();
 if(!text||text.length>1000||!context||(!context.sample&&!conversationOpen(context.room)))return false;
 if(context.sample&&!state.sampleMessages)state.sampleMessages=sampleChatMessages();
 const list=context.sample?state.sampleMessages:context.messages;
 list.push({text,sender:window.ReelAccess.mode(),at:Date.now()});
 if(!context.sample&&conversationBooking(context.room))state.messages=context.messages;
 save();return true;
}
function chatTime(at){if(!Number.isFinite(at))return '';return new Intl.DateTimeFormat(signupLanguage(),{timeZone:'Asia/Seoul',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(at);}
function conversationCard(room){
 const b=conversationBooking(room)||room,last=room.messages.at(-1),guideMode=window.ReelAccess.mode()==='guide',unread=conversationUnread(room);
 return `<a class="conversation-item card pad" href="#${esc(conversationRoute(room))}"><span class="conversation-avatar">${icon('messages')}</span><div><div class="conversation-heading"><h2>${esc(guideMode?(b.customer||'여행자'):room.guide)}</h2>${last?.at?`<time datetime="${new Date(last.at).toISOString()}">${esc(chatTime(last.at))}</time>`:''}</div><p>${esc(room.tripTitle)} · ${requestPeriod(room)}</p><p class="conversation-preview">${esc(last?.text||'일정과 만남 장소를 이야기해 보세요.')}</p><span class="badge">${conversationStatus(room)}</span></div>${unread?`<span class="chat-unread" aria-label="${unread} 읽지 않은 메시지">${unread}</span>`:'<span aria-hidden="true">›</span>'}</a>`;
}
function messages(){
 const rooms=syncConversations().slice().sort((a,b)=>(b.messages.at(-1)?.at||b.createdAt)-(a.messages.at(-1)?.at||a.createdAt));
 const preview=isGuest()?sampleChatMessages():(state.sampleMessages||sampleChatMessages());
 return `${title('','채팅')}${rooms.map(conversationCard).join('')}${rooms.length?'':`<section class="sample-conversation"><p class="hint">아직 대화가 없어요. 예시 대화로 사용 방법을 확인해 보세요.</p><a class="conversation-item card pad" href="#chat?sample=1"><span class="conversation-avatar">${icon('messages')}</span><div><h2>${window.ReelAccess.mode()==='guide'?'제이미':'미나'}</h2><p>성수에서 보내는 여유로운 오후</p><p class="conversation-preview">${esc(preview.at(-1)?.text)}</p><span class="badge">예시 대화</span></div><span aria-hidden="true">›</span></a></section>`}`;
}
function chat(){
 const context=chatContext();if(!context)return empty('대화를 찾을 수 없어요.','채팅 목록에서 대화를 다시 선택해 주세요.','messages','채팅');
 const b=context.booking,guideMode=window.ReelAccess.mode()==='guide',mode=window.ReelAccess.mode(),room=context.room,open=context.sample||conversationOpen(room),booked=!context.sample&&conversationBooking(room);
 const detail=context.sample?'<p class="hint">예시 대화</p>':`<section class="chat-trip-context"><strong>${esc(room.tripTitle)}</strong><p>${requestPeriod(room)} · ${conversationStatus(room)}</p>${booked?btn('예약 상세',guideMode?'guide-desk':'booking','secondary small'):room.requestId===state.request?.id?btn('제안 확인',guideMode?'guide-desk':'requested','secondary small'):''}</section>`;
 return `<div class="centerbox">${title('',guideMode?'여행자와 대화':`${esc(b.guide)} 메이트와의 대화`,'')}${detail}<div class="card pad"><div class="chat" id="chat-log" role="log" aria-live="polite" aria-label="대화 내용"><div class="bubble">일정·가격 변경은 제안을 수정하고 확인해 주세요.<small>안내</small></div>${context.messages.map((m,i)=>{const mine=(m.sender||'customer')===mode;return `<div class="bubble ${mine?'mine':''}">${esc(m.text)}<small>${mine?'나':guideMode?'여행자':esc(b.guide)}${m.at?` · <time datetime="${new Date(m.at).toISOString()}">${esc(chatTime(m.at))}</time>`:''}${!context.sample&&mine&&(room.read?.[guideMode?'customer':'guide']||0)>i?' · 읽음':''}</small></div>`;}).join('')}</div>${isGuest()?btn('가입하고 대화하기','signup'):open?`<form id="chat-form" class="chat-composer"><input name="text" aria-label="메시지" maxlength="1000" required placeholder="예: 역에서 어느 출구로 나가면 되나요?"><button type="submit" class="btn">보내기</button></form>`:'<p class="notice">종료된 대화는 기록만 확인할 수 있어요.</p>'}<p class="hint">시연용 대화이며 이 브라우저에만 저장돼요.</p></div></div>`;
}

function refundEstimate(){return 0;}

function cancel(){const b=state.booking;if(!b||!['awaiting_mate_fee','confirmed'].includes(b.status))return empty('취소할 수 있는 예약이 없어요.','현재 예약 상태를 확인하세요.','booking','예약 보기');return `${title('','예약 취소 요청')}<form id="cancel-form" class="card pad"><p>${b.status==='awaiting_mate_fee'?'확정 전 요청을 철회합니다.':'현금 지급 전후 여부를 메이트와 확인해 주세요. 릴트립은 여행 비용을 수납하거나 자동 환불하지 않아요.'}</p><label>사유<textarea name="reason" required minlength="2" maxlength="500"></textarea></label><label class="check"><input name="terms" type="checkbox" required>취소 요청 내용을 확인했습니다.</label><button type="submit" class="btn danger">${b.status==='awaiting_mate_fee'?'요청 철회':'취소 요청 제출'}</button></form>`;}

function review(){if(state.booking?.status!=='completed')return empty('여행을 마친 뒤 후기를 작성할 수 있어요.','여행이 완료된 예약에서 후기를 남길 수 있어요.','booking','예약 보기');if(state.review)return empty('이미 후기를 저장했어요.','여행 경험을 나눠주셔서 감사합니다.','booking','내 후기 보기');return `<div class="centerbox">${title('여행의 경험을 들려주세요','오늘 여행은 어땠나요?','')}<form id="review-form" class="card pad"><label>전체 만족도</label><div class="rating">${[1,2,3,4,5].map(n=>`<button type="button" class="${state.rating>=n?'selected':''}" data-action="rate" data-value="${n}" aria-label="5점 만점에 ${n}점" aria-pressed="${state.rating===n}">★</button>`).join('')}</div><label>내 후기<textarea name="body" required minlength="10" maxlength="1000" placeholder="예: 영어 설명이 이해하기 쉬웠나요? 약속한 장소·시간·도움이 지켜졌나요?"></textarea></label><p id="review-error" class="error" role="alert"></p><button type="submit" class="btn" style="margin-top:20px">후기 저장</button></form></div>`;}
function side(role,content){if(role==='guide')return content;const list=screens.filter(s=>s.role===role);return `<div class="adminlayout"><nav class="sidenav" aria-label="역할별 메뉴">${list.map(s=>`<a class="${current()===s.route?'active':''}" href="#${s.route}">${s.name}</a>`).join('')}</nav><section>${content}</section></div>`;}
function guideDesk(){const r=state.request;return side('guide',`${state.booking?.status==='awaiting_mate_fee'?`<section class="card pad"><span class="badge">여행자의 선택을 받았어요</span><h2>수수료 결제 후 예약이 확정돼요</h2><p>${money(state.booking.feeAmount)} · 여행 금액의 10%</p>${btn('수수료 결제하고 확정','guide-fee')}</section>`:state.booking?.feeStatus==='paid'?btn(signupText('feeReceipt'),'guide-earnings','secondary small'):''}${title('','공개된 여행','공개된 여행을 확인하고 코스와 가격을 제안하세요.')}${!r?empty('새 요청이 없어요.','가능 일정을 확인해 두세요.','guide-calendar','가능 일정 관리'):`<div class="card pad"><span class="badge">${r.id} · ${statusLabel(r.status)}</span><h2 style="margin:15px 0">${requestPeriod(r)} · ${r.party}명 · ${r.time}</h2><p>${r.requestType==='free'?esc(r.region)+' · 자유 견적 · '+tripLength(r.dayCount||1):r.stops.map(p=>esc(p.name)).join(' → ')}</p><div class="notice">고객 요청: ${esc(r.notes||'별도 요청 없음')}<br>필수 방문: ${r.must.map(id=>r.stops.find(p=>p.id===id)?.name||id).map(esc).join(', ')||'없음'}</div><div class="buttons">${r.status==='requested'||r.status==='quoted'?`${btn('일정 검토 · 제안 작성','guide-quote')}`:''}</div></div>`}<details class="trip-settings"><summary><span>업무 요약</span><b>＋</b></summary><div class="metrics"><div class="metric">응답 대기<strong>${r?.status==='requested'?1:0}</strong></div><div class="metric">발행 제안<strong>${state.quote?1:0}</strong></div><div class="metric">예약<strong>${state.booking?1:0}</strong></div></div></details>`);}
function guideQuote(){const r=state.request;if(!r||!['requested','quoted'].includes(r.status)||state.booking)return side('guide',empty('제안을 작성할 요청이 없습니다.','요청함에서 진행 상태를 확인하세요.','guide-desk','요청함'));return side('guide',`${title('여행 제안 편집','고객의 하루를 완성하세요','발행된 일정과 금액이 고객의 제안 화면에 반영됩니다.')}<form id="quote-form" class="card pad"><label class="developer-only">제안 발신 계정<select name="sender"><option value="mina">미나</option><option value="jun">준</option></select></label>${window.ReelRevenue.calculator(state.request.party)}<label>최종 일정 (고객에게 표시 · 한국어 검토본)<textarea name="plan" required minlength="10" maxlength="2000" placeholder="날짜별 방문 장소와 동행 시간을 입력하세요.">${esc(state.quote?.plan||(r.requestType==='free'?'':requestPlan(r)))}</textarea></label><label style="margin-top:18px">변경 내용과 이유 (고객에게 표시 · 한국어 검토본)<textarea name="reason" required minlength="5" maxlength="500">${esc(state.quote?.reason||'선택한 장소를 유지하고 이동과 짧은 휴식 시간을 반영했습니다.')}</textarea></label><div class="formrow"><label>전체 여행 가격 (원)<input type="number" name="amount" min="100000" max="14000000" step="500" readonly required value="${state.quote?.amount||window.ReelRevenue.quoteAmount(state.request.party)}"></label><label>제안 유효기간<input value="발행 후 24시간 · 제안 정책" disabled></label></div><div class="notice">포함: 입력한 시간의 영어 메이트·일정 준비 / 불포함: 식비·쇼핑·교통·입장료. 같은 메이트의 이전 제안만 갱신되며 다른 메이트의 제안은 유지됩니다.</div><p id="quote-error" class="error" role="alert"></p><button class="btn" type="submit">함께할 여행 제안하기</button></form>`);}
function guideCalendar(){return side('guide',`${title('가능 일정','가능 일정 관리','')}<div class="card pad"><h2>${state.request?.date||state.date}</h2><p class="muted" style="margin:15px 0">신규 요청 수락 상태: <strong>${state.available?'가능':'불가'}</strong></p>${action(state.available?'해당 날짜 수락 불가로 변경':'해당 날짜 수락 가능으로 변경','availability','secondary')}<div class="notice">이미 확정된 예약은 이 설정으로 취소되지 않습니다. 변경이 필요하면 운영자에게 요청해야 합니다.</div></div>`);}
function earnings(){const b=state.booking;return side('guide',`${title('','매칭 수수료','여행 비용은 여행자에게 현금으로 직접 받아요.')}<section class="card pad"><div class="summaryrow"><span>현장 현금 약속 금액</span><b>${money(b?.amount||0)}</b></div><div class="summaryrow"><span>매칭 수수료 10%</span><b>${money(b?.feeAmount||0)}</b></div><div class="summaryrow"><span>수수료 결제 상태</span><b>${!b?'예약 없음':b.feeStatus==='paid'?'결제 완료':b.feeStatus==='failed'?'결제 실패':'결제 대기'}</b></div><p>플랫폼에서 여행 비용을 정산하거나 송금하지 않아요. 현금 수령은 여행자와 직접 확인하세요.</p>${b?.status==='awaiting_mate_fee'?btn('수수료 결제하고 확정','guide-fee'):''}</section>`);}

function admin(){return side('admin',`${title('운영 관리','운영 현황','아래 집계는 현재 브라우저의 시연 데이터입니다. 실제 운영 실적이 아닙니다.')}<div class="metrics"><div class="metric">저장 장소<strong>${state.board.length}</strong></div><div class="metric">확인 필요<strong>${state.places.filter(p=>!p.verified).length}</strong></div><div class="metric">${guided?'예약':'문의'}<strong>${guided?(state.booking?1:0):state.tickets.length}</strong></div></div><div class="card pad"><h2>지금 확인할 일</h2><ul class="listclean"><li><a href="#admin-places">장소 후보와 지점 확인 →</a></li><li><a href="#admin-support">고객 문의 ${state.tickets.filter(t=>t.status==='open').length}건 →</a></li>${guided?`<li><a href="#admin-guides">메이트 준 심사: ${statusLabel(state.adminReview)} →</a></li><li><a href="#admin-bookings">예약·환불 상태 확인 →</a></li>`:''}</ul></div>`);}
function adminPlaces(){return side('admin',`${title('장소 품질 관리','장소 검수','원본 추출값과 수정 이력을 보관하는 운영 흐름입니다.')}<div class="tablewrap"><table><thead><tr><th>장소</th><th>상태</th><th>검수 작업</th></tr></thead><tbody>${state.places.map(p=>`<tr><td><b>${esc(p.name)}</b><br>${esc(p.address)}</td><td><span class="badge ${p.verified?'':'warm'}">${p.verified?'확인 완료':p.rejected?'반려':'확인 필요'}</span></td><td><button class="textbtn" data-action="correct" data-id="${p.id}">검토·수정</button>${!p.verified?`<br><button class="textbtn" data-action="reject-place" data-id="${p.id}">반려</button>`:''}</td></tr>`).join('')}</tbody></table></div>`);}
function adminSupport(){return side('admin',`${title('고객 문의','문의와 데이터 요청','외부 전송 없이 로컬에서 접수·처리 상태를 시연합니다.')}<div class="stack">${state.tickets.length?state.tickets.map(t=>`<div class="card pad"><span class="badge">${t.id} · ${statusLabel(t.status)}</span><h3 style="margin:13px 0">${esc(t.type)}</h3><p>${esc(t.body)}</p>${t.status==='open'?`<button class="btn secondary small" style="margin-top:15px" data-action="resolve-ticket" data-id="${t.id}">처리 완료로 표시</button>`:''}</div>`).join(''):empty('접수된 문의가 없습니다.','고객 도움말 화면에서 시연 문의를 등록할 수 있습니다.','support','문의 화면 열기')}</div>`);}
function adminGuides(){return side('admin',`${title('메이트 자격 확인','메이트 자격 심사','가상 신청자 준 · 실제 자격증이나 신분증은 수집하지 않습니다.')}<form id="verify-form" class="card pad"><div class="guide"><div class="portrait">준</div><div><h2>준 · 안국</h2><span class="badge">${statusLabel(state.adminReview)}</span></div></div><div class="notice">실서비스는 자격증 진위, 본인 일치, 계약 체결을 담당자가 확인합니다. 공개 프로필에는 민감한 증빙을 노출하지 않습니다.</div>${['관광통역안내사 자격과 해당 언어 확인','신청자 본인과 증빙 일치 확인','메이트 계약·정산 조건 동의 확인'].map((t,i)=>`<label class="check"><input name="v${i}" type="checkbox" required>${t} (시연 체크)</label>`).join('')}<div class="buttons"><button type="submit" class="btn">승인 · 프로필 공개</button>${action('보완 요청 · 노출 중지','guide-needs-info','secondary')}</div></form>`);}
function adminBookings(){const b=state.booking;return side('admin',`${title('','매칭·예약 관리')}${!b?'<p>예약이 없습니다.</p>':`<section class="card pad"><h2>${esc(b.guide)} · ${esc(b.date)}</h2><span class="badge">${statusLabel(b.status)}</span><div class="summaryrow"><span>현장 현금 약속 금액</span><b>${money(b.amount)}</b></div><div class="summaryrow"><span>매칭 수수료 10%</span><b>${money(b.feeAmount)}</b></div><p>수수료 상태: ${esc(b.feeStatus)}</p><p>취소 사유: ${esc(b.cancelReason||'—')}</p><p>여행 비용은 여행자와 메이트 간 현금 거래입니다. 수수료 환불은 별도 확인이 필요합니다.</p>${b.status==='cancellation_requested'?action('취소 확인 완료','confirm-cash-cancel','secondary'):''}</section>`}`);}

const demoSignupCode='482916';
let signupEmailStep='address';

const signupLocales = ['ko', 'en', 'zh-CN', 'ja'];
const appLanguage = document.documentElement.lang;
const preferenceKey='reeltrip-interface-language';
const explicitLanguage=new URLSearchParams(location.search).get('lang');
let preferredLanguage=appLanguage;
try {
 const saved=localStorage.getItem(preferenceKey);
 if(signupLocales.includes(saved))preferredLanguage=saved;
 if(signupLocales.includes(explicitLanguage))localStorage.setItem(preferenceKey,explicitLanguage);
} catch {}
function signupLanguage(){
 return signupLocales.includes(explicitLanguage)?explicitLanguage:preferredLanguage;
}
function interfaceMarkup(html){
 if(!['zh-CN','ja'].includes(signupLanguage()) || ['signup','signup-email'].includes(current()))return html;
 const personal=new Set([state.profile?.nickname, ...state.places.filter(p=>p.manual&&!p.recommended).map(p=>p.name)]);
 return window.ReelInterfaceCopy?.markup(html,signupLanguage(),personal)??html;
}
function signupText(key){
 return window.ReelSignupCopy[key][signupLocales.indexOf(signupLanguage())];
}
function signupLanguageLink(asMenuRow=false){
 const names = ['한국어', 'English', '简体中文', '日本語'];
 const pages = ['index.html?lang=ko', 'english.html?lang=en', 'index.html?lang=zh-CN', 'index.html?lang=ja'];
 const links = signupLocales.map((lang, i) => '<a lang="'+lang+'" href="'+pages[i]+'#'+current()+'"'+(lang===signupLanguage()?' aria-current="true"':'')+'>'+names[i]+(lang===signupLanguage()?' ✓':'')+'</a>').join('');
 if(asMenuRow){
  const activeName=names[signupLocales.indexOf(signupLanguage())];
  return '<details class="signup-locale"><summary class="guest-account-row">'+icon('settings')+'<span>'+signupText('languageSetting')+'</span><span class="value">'+activeName+'</span><span class="arrow" aria-hidden="true">›</span></summary><div>'+links+'</div></details>';
 }
 return '<details class="signup-locale"><summary class="signup-language" aria-label="'+signupText('language')+'">'+signupText('languageSetting')+' · '+names[signupLocales.indexOf(signupLanguage())]+' ▾</summary><div>'+links+'</div></details>';
}

const memberSessionKey = 'reeltrip-signup-preview-member';
let previewMember = false;
try { previewMember = sessionStorage.getItem(memberSessionKey) === 'yes'; } catch {}
function isGuest(){ return !window.ReelAccess.isAdmin && !previewMember; }
const sharedNicknameKey='reeltrip-preview-nickname-v1';
function ensureMemberNickname(){
 let directory={};
 let shared='';
 try{
  shared=localStorage.getItem(sharedNicknameKey)||'';
  directory=readNicknameDirectory();
 }catch{}
 let nickname=shared || state.profile?.nickname;
 if(!nickname){
  const bases=window.ReelNicknameBases[signupLanguage()];
  const count=bases.length*10000;
  const start=Math.floor(Math.random()*count);
  for(let offset=0;offset<count;offset++){
   const slot=(start+offset)%count;
   const candidate=bases[Math.floor(slot/10000)]+' '+String(slot%10000).padStart(4,'0');
   if(!nicknameProblem(candidate,directory)){nickname=candidate;break;}
  }
 }
 if(!nickname)return;
 state.profile={...state.profile,nickname};
 if(shared===nickname)return;
 try{
  directory[normalizeNickname(nickname)]=nicknameOwner;
  localStorage.setItem(nicknameDirectoryKey,JSON.stringify(directory));
  localStorage.setItem(sharedNicknameKey,nickname);
 }catch{}
}
if(previewMember && !window.ReelAccess.isAdmin)ensureMemberNickname();
function setPreviewMember(value){
 previewMember=value;
 if(value)ensureMemberNickname();
 try { if(value) sessionStorage.setItem(memberSessionKey,'yes'); else sessionStorage.removeItem(memberSessionKey); } catch {}
}
let lastBrowseRoute='home';
let pendingRestaurant=null,pendingEstimate=false,pendingRequestRoute=null;
function guestBoard(){
 return guestPlaces(true);
}
function guestTrips(){return `${title('','내 여행')}${tripWorkspace()}<section class="empty"><h2>나만의 여행을 만들어보세요</h2><p>여행별로 장소와 일정을 모아 관리해요.</p>${btn('가입하고 여행 만들기','signup')}</section>`;}

function guestAccount(){
 return `<section class="guest-account">
  <h1>${signupText('myTab')}</h1>
  <div class="guest-account-intro">
   <span class="guest-account-avatar" aria-hidden="true">${icon('account')}</span>
   <div><h2>${signupText('guestProfile')}</h2><p>${signupText('guestAccountNote')}</p></div>
   <a class="guest-account-join" href="#signup">${signupText('title')}<span class="arrow" aria-hidden="true">›</span></a>
  </div>
  <div class="guest-account-menu">
   ${signupLanguageLink(true)}
  </div>
 </section>`;
}

function guestGate(){
 return `<section class="guest-invite" aria-labelledby="guest-invite-title">
  <div class="guest-route-art" aria-hidden="true">
   <svg viewBox="0 0 220 94" width="220" height="94" fill="none" focusable="false">
    <path d="m23 42 44-18 46 12 48-17 29 49-49 19-50-12-48 14z" fill="#d7e9e9"/>
    <path d="m19 38 45-18 46 12 48-17 29 49-49 19-50-12-48 14z" fill="#fafffd" stroke="#adcfce" stroke-width="1.5" stroke-linejoin="round"/>
    <path d="m64 21 23 49 51 12-28-50z" fill="#dceeea"/>
    <path d="m24 39 31-13 8 16-16 10-13-4zM125 30l29-11 9 14-24 12zM95 56l15-7 12 21-19-4z" fill="#a9d9bd"/>
    <path d="M34 66c28-23 42-14 62-11s50-8 78-24" stroke="#9ad7e9" stroke-width="6"/>
    <path d="m39 30 25 49m54-48 26 48M30 51l42-17 46 12 47-17" stroke="white" stroke-width="3"/>
    <path d="M51 65c9-11 24-17 38-14s18 14 31 8 9-14 19-20" stroke="#188197" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="3 5"/>
    <circle cx="51" cy="65" r="4" fill="white" stroke="#188197" stroke-width="2"/>
   </svg>
   <span class="guest-route-pin">${brandLogo()}</span>
  </div>
  <h1 id="guest-invite-title">${signupText('needMember')}</h1>
  <p>${signupText('memberFeatures')}</p>
  <div class="guest-invite-actions">${btn(signupText('joinTrip'),'signup')}${btn(signupText('keepBrowsing'),lastBrowseRoute,'secondary')}</div>
 </section>`;
}
function guestPlaces(library=false){
 const cards=window.REEL_PLACES.filter(p=>!p.recommended).map(p=>`<article class="card guest-place-card"><div class="guest-place-photo">${placeArt(p)}</div><div class="guest-place-details"><h3>${esc(p.name)}</h3><p>${esc(p.address)}</p></div></article>`).join('');
 return title('',library?'저장한 장소':signupText('browsePlaces'),'가입 전에는 예시 장소를 둘러볼 수 있어요.')+cards+btn('가입하고 장소 저장','signup');
}
function guestGuides(){
 return guides();
}

function signupBrandLogo(){
 const names={'zh-CN':'映旅', ja:'リールトリップ'};
 const name=names[signupLanguage()];
 if(!name)return brandLogo();
 return `<span class="signup-wordmark" role="img" aria-label="${name}"><span class="signup-brand-pin" aria-hidden="true">${brandLogo()}</span><b aria-hidden="true">${name}</b></span>`;
}

function signup(){
 return `<section class="signup-screen">
  ${signupLanguageLink()}
  <div class="signup-heading">${signupBrandLogo()}<h1>${signupText('title')}</h1><p>${signupText('choose')}</p></div>
  <a class="btn signup-primary" href="#signup-email">${signupText('emailAction')}</a>
  <div class="signup-divider">${signupText('social')}</div>
  <div class="signup-options">
   <button class="signup-provider signup-provider--google" type="button" data-action="signup-provider">${signupText('google')}</button>
   <button class="signup-provider signup-provider--kakao" type="button" data-action="signup-provider">${signupText('kakao')}</button>
   <button class="signup-provider signup-provider--naver" type="button" data-action="signup-provider">${signupText('naver')}</button>
  </div>
  <a class="signup-secondary" data-action="browse-guest" href="#home">${signupText('guest')}</a>
 </section>`;
}

function signupEmail(){
 const heading=(title,description)=>`<div class="signup-heading"><h1>${title}</h1><p>${description}</p></div>`;
 let content;
 if(signupEmailStep==='complete'){
  content=`${heading(signupText('done'),signupText('doneNote'))}<a class="btn signup-primary" href="#account">${signupText('account')}</a>`;
 }else if(signupEmailStep==='code'){
  content=`${heading(signupText('verify'),signupText('codeIntro'))}
   <p class="signup-demo-code">${signupText('demo')} <strong>${demoSignupCode}</strong></p>
   <form id="signup-code-form">
    <label for="signup-code">${signupText('code')}</label>
    <input id="signup-code" name="code" type="text" inputmode="numeric" autocomplete="off" pattern="[0-9]{6}" maxlength="6" required aria-describedby="signup-code-error">
    <p id="signup-code-error" class="signup-feedback error" role="alert"></p>
    <button class="btn signup-primary" type="submit">${signupText('submit')}</button>
   </form>
   <button class="signup-secondary" type="button" data-action="signup-edit-email">${signupText('edit')}</button>`;
 }else{
  content=`${heading(signupText('emailTitle'),signupText('emailIntro'))}
   <form id="signup-email-form">
    <label for="signup-address">${signupText('address')}</label>
    <input id="signup-address" name="email" type="email" autocomplete="email" autocapitalize="none" spellcheck="false" placeholder="traveler@example.com" maxlength="254" required aria-describedby="signup-preview-note">
    <p id="signup-preview-note" class="signup-note">${signupText('preview')}</p>
    <button class="btn signup-primary" type="submit">${signupText('send')}</button>
   </form>`;
 }
 return `<section class="signup-screen">${signupLanguageLink()}${content}</section>`;
}

function showSignupEmailStep(step){
 signupEmailStep=step;
 render();
 window.scrollTo(0,0);
 $('#main')?.focus({preventScroll:true});
}

const views={signup,'signup-email':signupEmail,'guide-fee':guideFee,settings:settingsPage,notifications,home,processing,results,manual,board,planner,share,trips,account,support,policies,guides,guide:guidePage,request,requested,quote,checkout,booking,messages,chat,cancel,review,'guide-desk':guideDesk,'guide-quote':guideQuote,'guide-calendar':guideCalendar,'guide-earnings':earnings,admin,'admin-places':adminPlaces,'admin-support':adminSupport,'admin-guides':adminGuides,'admin-bookings':adminBookings};
function render(){
 markChatRead();
 if(!['member-required','signup','signup-email'].includes(current())){pendingRestaurant=null;pendingEstimate=false;}
 const route=current();
 if(isGuest() && route!=='signup' && route!=='signup-email'){
  clearTimeout(timer);
  document.body.dataset.route=route;
  document.documentElement.lang=signupLanguage();
  const skip=$('.skip');if(skip)skip.textContent=signupText('skip');
  const publicViews={home,messages,chat,board:guestBoard,trips:guestTrips,account:guestAccount,results:guestPlaces,guides:guestGuides,guide:guidePage,policies};
  if(route==='request')pendingRequestRoute=location.hash.slice(1);
  const canBrowse=Object.hasOwn(publicViews,route);
  if(canBrowse)lastBrowseRoute=route;
  const content=canBrowse?publicViews[route]():guestGate();
  $('#app').innerHTML=interfaceMarkup(layout(content));
  if(route==='home')loadRecommendations();
  document.title=canBrowse?(window.ReelInterfaceCopy?.text(byRoute(route)?.name||'Reeltrip',signupLanguage())||byRoute(route)?.name):signupText('needMember');
  return;
 }
 if(['requested','quote','checkout','booking','chat','cancel','review'].includes(current()))guidesTab='requests';if(fillExampleCoordinates())save();clearTimeout(timer);const r=current();document.body.dataset.route=r;const signingUp=r==='signup'||r==='signup-email';document.documentElement.lang=signupLanguage();const skipLink=$('.skip');if(skipLink)skipLink.textContent=signupText('skip');$('#app').innerHTML=interfaceMarkup(layout(byRoute(r)?(window.ReelAccess.allowed(byRoute(r).role,r)?(views[r]()+providerCredits()):window.ReelAccess.blocked()):empty('화면을 찾을 수 없어요.','메뉴에서 다시 이동해 주세요.')));document.title=signingUp?signupText(r==='signup'?'title':'emailTitle'):`${byRoute(r)?.name||'릴트립'}`;document.title=window.ReelInterfaceCopy?.text(document.title,signupLanguage())||document.title;mountMaps();window.ReelRevenue.mount();if(r==='processing'&&state.extraction!=='failed'){timer=setTimeout(()=>{state.extraction='partial';save();go('results');},1400);}if(r==='chat')$('#chat-log')?.scrollTo(0,99999);}
function modal(html,kind=''){html=interfaceMarkup(html);const d=$('#dialog');d.dataset.kind=kind;d.innerHTML=html;if(!d.open)d.showModal();}
function snapshot(){return state.board.map(place).filter(Boolean).map(p=>({...p}));}
function makeQuote(amount,plan,reason,pricing,sender='mina'){const r=state.request;if(!r||!['requested','quoted'].includes(r.status)||state.booking)return false;if(!state.available){toast('메이트가 함께할 수 없는 날짜입니다. 다른 날짜를 선택하세요.');return false;}if(amount===undefined)amount=240000*(r.dayCount||1);const existing=proposals().find(q=>q.guideId===sender);state.quote={guideId:sender,pricingPolicyVersion:"2026-11-17-v1",feeRate:.1,feeVatIncluded:null,pricing:JSON.parse(JSON.stringify(pricing||{rate:60000,hours:4*(r.dayCount||1),extra:10000})),id:'QT-'+r.id+'-'+sender,version:(existing?.version||0)+1,guide:sender==='jun'?'준':'미나',requestType:r.requestType||'itinerary',tripTitle:r.tripTitle,region:r.region,endDate:r.endDate||r.date,dayCount:r.dayCount||1,days:JSON.parse(JSON.stringify(r.days||[])),date:r.date,time:r.time,party:r.party,amount,plan:plan||requestPlan(r),reason:reason||'선택한 장소와 순서를 유지했습니다. 이동·휴식시간과 실제 방문 가능 여부는 메이트의 최종 확인이 필요합니다.',expires:Date.now()+86400000};state.proposals=[...proposals().filter(q=>q.guideId!==sender),state.quote];state.request.status='quoted';save();return true;}
function download(name,data){const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function sample(){state.source='성수의 카페와 산책';state.filter='전체';state.selected=['forest','cafe','shop'];state.extraction='processing';save();go('processing');}
function loadScenario(kind){
 state=initial();state.board=['forest','cafe','shop'];state.saved=true;
 if(guided&&kind!=='plan'){
  state.request={id:'RQ-DEMO-SAMPLE',status:'requested',date:state.date,time:state.time,party:2,notes:'사진을 찍을 여유가 있는 느긋한 일정을 원해요.',guide:'미나',guideId:'mina',stops:snapshot(),must:[],createdAt:Date.now()};
  if(kind!=='request')makeQuote();
  if(['booking','cancel','completed'].includes(kind)){state.request.status='booked';state.booking={...JSON.parse(JSON.stringify(state.quote)),id:'RT-DEMO-SAMPLE',quoteVersion:state.quote.version,status:kind==='completed'?'completed':kind==='cancel'?'cancellation_requested':'confirmed',customer:'제이미',email:'jamie@example.com',requestedAt:Date.now(),confirmedAt:Date.now(),feePaidAt:Date.now(),feeAmount:Math.round(state.quote.amount*.1),feeRate:.1,feeStatus:'paid',paymentMethod:'cash',cashStatus:'uncollected',policyVersion:'CASH-MATCH-10-V1',refundStatus:kind==='cancel'?'검토 중':'없음'};
   if(kind==='cancel'){state.booking.estimatedRefund=refundEstimate();state.booking.cancelReason='여행 일정 변경';state.booking.cancelledAt=Date.now();}
  }
 }
 save();$('#dialog').close();go(({plan:'planner',request:'requested',quote:'quote',booking:'booking',cancel:'admin-bookings',completed:'review'})[kind]||'planner');toast('시연 상태를 불러왔습니다. 실제 요청·거래는 없습니다.');
}
document.addEventListener('error',e=>{if(e.target.matches?.('.provider-photo img')){e.target.parentElement.innerHTML=art();}},true);
document.addEventListener('keydown',e=>{if(e.key==='Escape'){document.querySelectorAll('.place-menu[open]').forEach(menu=>{menu.open=false;menu.querySelector('summary').focus();});}});
document.addEventListener('click',e=>{document.querySelectorAll('.place-menu[open]').forEach(menu=>{if(!menu.contains(e.target)||e.target.closest('[data-action]'))menu.open=false;});if(e.target.closest('.skip')){e.preventDefault();$('#main')?.focus();return;}const b=e.target.closest('[data-action]');if(!b)return;e.preventDefault();const a=b.dataset.action,id=b.dataset.id;
 if(a==='save-recommendation'){saveRecommendation(recommendationRows[Number(id)]);return;}
 if(a==='recommendation-retry'){loadRecommendations(recommendationQuery,true);return;}
 if(a==='discover-query'){startDiscovery(b.dataset.query);return;}
 if(a==='browse-guest'){setPreviewMember(false);go('home');return;}
 if(isGuest() && !['signup-provider','signup-edit-email','guides-tab','close'].includes(a)){
  if(a==='sample'){go('results');return;}
  pendingRestaurant=a==='save-restaurant'?id:null;pendingEstimate=a==='guest-trip-estimate';
  go('member-required');return;
 }
 if(a==='preview-example-pin'){previewAPIPlace(pickerPlaces().findIndex(p=>p.id===id));return;}
 if(a==='place-picker-tab'){placePickerTab=id==='saved'?'saved':'search';placeSelectionVersion++;pendingAPIPlace=null;placePickerSelected='';render();return;}
 if(a==='preview-api-place'){previewAPIPlace(Number(id),b);return;}
 if(a==='save-api-place'){saveAPIPlace();return;}
 if(a==='resolve-place'){resolvePlace(id,addingToTrip());return;}
 if(a==='save-restaurant'){saveRestaurant(id);return;}
 if(a==='open-proposal-chat'){const q=proposals().find(q=>q.id===id);if(!q||!state.request?.id)return;const room=ensureConversation(q);save();go(conversationRoute(room));return;}
 if(a==='confirm-cash-cancel'){if(window.ReelAccess.isAdmin&&state.booking?.status==='cancellation_requested'){state.booking.status='cancelled';save();render();}return;}
 if(a==='check-nickname'){checkNickname();return;}
 if(a==='signup-provider'){
  setPreviewMember(true);
  if(!resumeSignupAction())go(window.ReelAccess.home());
  return;
 }
 if(a==='signup-edit-email'){showSignupEmailStep('address');return;}
 if(a==='edit-profile'){editProfile();return;}
 if(a==='remove-profile-photo'){profileDraftPhoto='';$('#profile-photo').value='';$('#profile-photo-preview').innerHTML=profileAvatar('');$('#profile-photo-clear').hidden=true;$('#profile-camera-button').hidden=false;return;}
 if(a==='my-proposals'){guidesTab='requests';go('guides');return;}
 if(a==='select-proposal'){const q=proposals().find(q=>q.id===id);if(q){state.viewedProposals=[...new Set([...(state.viewedProposals||[]),q.id+':'+q.version])];state.quote=q;save();go('quote');}return;}
 if(a==='demo-proposals'){const demoPlan=state.request?.requestType==='free'?state.request.days.map((d,i)=>`${i+1}일차 · ${d.date} · ${state.request.region}\n예시 코스: 지역 산책 · 카페 · 상점 방문`).join('\n'):undefined;makeQuote(240000*(state.request?.dayCount||1),demoPlan,'여행 기간에 맞춰 카페와 산책 코스를 제안합니다.',undefined,'mina');makeQuote(210000*(state.request?.dayCount||1),demoPlan,'골목과 상점 위주로 이동을 줄인 코스를 제안합니다.',undefined,'jun');render();return;}
 if(a==='guides-tab'){if(['discover','requests'].includes(id)){guidesTab=id;render();}return;}
 if(a==='notification-filter'){if(['all','trip','guide'].includes(id)){notificationFilter=id;render();}return;}
 if(a==='notifications-read-all'){markNotificationsRead(notificationItems().map(n=>n.id));render();return;}
 if(a==='notification-open'){const item=notificationItems().find(n=>n.id===id);if(item){markNotificationsRead([id]);go(item.route);}return;}

 if(a==='trip-add-menu'){tripAddMenu();return;}
 if(a==='trip-pick-places'){tripPlacePicker();return;}
 if(a==='trip-add-place'){if(window.REEL_MAPS_CONFIG?.apiKey&&!pinEligible(place(id))){resolvePlace(id,true);return;}if(addTripPlace(id)){render();tripPlacePicker();}else toast('하루에 20곳까지 담을 수 있어요.');return;}
 if(a==='trip-manual'){$('#dialog').close();go('manual?from=trips');return;}
 if(a==='edit-trip'){editTripInfo();return;}
 if(a==='add-note'){editTripNote();return;}
 if(a==='edit-note'){editTripNote(Number(id));return;}
 if(a==='trip-date'){chooseTripDate(b.dataset.value);renderTripCalendar();$('#dialog').querySelector(`[data-value="${b.dataset.value}"]`)?.focus({preventScroll:true});return;}
 if(a==='trip-more-months'){tripDraft.months+=12;renderTripCalendar();return;}
 if(a==='trip-dates-next'){tripDetailsDialog();return;}
 if(a==='trip-dates-back'){const f=$('#new-trip-form');tripDraft.title=f.elements.title.value;tripDraft.party=f.elements.party.value;renderTripCalendar();return;}
 if(a==='new-trip'){newTripDialog();return;}
 if(a==='open-trip'){if(selectTrip(id))go(tripDetailRoute());return;}
 if(a==='library-to-trip'){if(window.REEL_MAPS_CONFIG?.apiKey&&!pinEligible(place(id))){resolvePlace(id,true);return;}if(state.board.includes(id)){go('planner');return;}libraryIds();if(!state.board.includes(id)){if(state.board.length>=20){toast('하루에 20곳까지 담을 수 있어요.');return;}state.board.push(id);state.saved=false;save();render();}toast('선택한 날짜의 여행에 담았어요.');return;}
 if(a==='overview-day'){switchDay(Number(b.dataset.value));go('planner');}
 else if(a==='day'){switchDay(Number(b.dataset.value));}
 else if(a==='add-day'){ensureDays();if(state.days.length>=7)return;stashDay();const date=new Date(state.days[state.days.length-1].date+'T12:00:00Z');date.setUTCDate(date.getUTCDate()+1);state.days.push({date:date.toISOString().slice(0,10),time:'10:00',ids:[],durations:{}});switchDay(state.days.length-1);}
 else if(a==='focus-place'){if(window.REEL_MAPS_CONFIG?.apiKey&&!pinEligible(place(id))){resolvePlace(id,true);return;}state.focus=id;save();render();}
 else if(a==='move-day'){ensureDays();modal(`<h2>어느 날에 갈까요?</h2><p>선택한 장소를 다른 날의 마지막에 옮겨요.</p><div class="stack">${state.days.map((d,i)=>i===state.day?'':action(`${i+1}일차 · ${d.date}`,'transfer-day','secondary',`data-id="${id}" data-value="${i}"`)).join('')||'<p>날짜를 먼저 추가해 주세요.</p>'}</div>${action('닫기','close','secondary')}`);}
 else if(a==='transfer-day'){const target=state.days[Number(b.dataset.value)];if(target.ids.length>=20&&!target.ids.includes(id)){toast('이날은 20곳까지 담을 수 있어요.');return;}if(!target.ids.includes(id)){target.ids.push(id);target.durations[id]=place(id).duration;}state.board=state.board.filter(x=>x!==id);state.saved=false;save();$('#dialog').close();render();toast('다른 날짜로 장소를 옮겼어요.');}
 else if(a==='scenarios')modal(`<h2>검토할 데모 상태</h2><p>선택하면 이 안의 기존 시연 데이터를 예시 데이터로 바꿉니다. 실제 요청·결제·알림은 발생하지 않습니다.</p><div class="stack">${action('일정 편집 준비','load-scenario','secondary','data-kind="plan"')}${guided?`${action('메이트 응답 대기','load-scenario','secondary','data-kind="request"')}${action('제안 도착 · 결제 전','load-scenario','secondary','data-kind="quote"')}${action('예약 확정','load-scenario','secondary','data-kind="booking"')}${action('취소 요청 · 환불 검토','load-scenario','secondary','data-kind="cancel"')}${action('여행 완료 · 후기 작성','load-scenario','secondary','data-kind="completed"')}`:''}</div><div class="buttons">${action('돌아가기','close','secondary')}</div>`);
 else if(a==='load-scenario')loadScenario(b.dataset.kind);
 else if(a==='home-category'){state.source='성수의 카페와 산책';state.filter=b.dataset.value;save();go('results');}
 else if(a==='sample')sample();
 else if(a==='sample-results'){state.source='성수의 카페와 산책';state.filter='전체';save();go('results');}
 else if(a==='extract-fail'){clearTimeout(timer);state.extraction='failed';save();render();}
 else if(a==='filter'){state.filter=b.dataset.value;save();render();}
 else if(a==='save-places'){const unresolved=state.selected.find(id=>!pinEligible(place(id)));if(window.REEL_MAPS_CONFIG?.apiKey&&unresolved){resolvePlace(unresolved);return;}state.library=[...new Set([...libraryIds(),...state.selected])];save();go('board');toast('선택한 장소를 저장했어요.');}
 else if(a==='add-board'){const unresolved=state.selected.find(id=>!pinEligible(place(id)));if(window.REEL_MAPS_CONFIG?.apiKey&&unresolved){resolvePlace(unresolved,true);return;}if(state.selected.some(id=>!place(id)?.verified)){toast('같은 이름의 다른 지점에 가지 않도록, 확인이 필요한 장소에서 주소를 먼저 확인해 주세요.');return;}const ids=[...new Set([...state.board,...state.selected])];if(ids.length>20){toast('하루에 20곳까지 담을 수 있어요.');return;}state.library=[...new Set([...libraryIds(),...state.selected])];state.board=ids;state.saved=false;save();go('planner');}
 else if(a==='correct'){resolvePlace(id,isTripDetail()||current()==='planner');}
 else if(a==='close')$('#dialog').close();
 else if(a==='must'){state.must=state.must.includes(id)?state.must.filter(x=>x!==id):[...state.must,id];save();render();}
 else if(a==='remove'&&current()==='board'){state.library=libraryIds().filter(x=>x!==id);save();render();}
 else if(a==='remove'){state.board=state.board.filter(x=>x!==id);state.must=state.must.filter(x=>x!==id);state.saved=false;save();render();}
 else if(a==='move'){const i=state.board.indexOf(id),j=i+Number(b.dataset.dir);if(j>=0&&j<state.board.length){[state.board[i],state.board[j]]=[state.board[j],state.board[i]];state.saved=false;save();render();}}
 else if(a==='save-trip'){state.saved=true;save();render();toast('모든 날짜의 여행을 이 브라우저에 저장했어요.');}
 else if(a==='copy'){const text=tripText();if(navigator.clipboard?.writeText)navigator.clipboard.writeText(text).then(()=>toast('일정을 복사했습니다.')).catch(()=>{$('#share-text').select();toast('일정 내용을 선택해 복사하세요.');});else{$('#share-text').select();toast('일정 내용을 선택해 복사하세요.');}}
 else if(a==='download-trip'){download('reeltrip-itinerary.json',{title:state.title,date:state.date,time:state.time,timezone:'Asia/Seoul',stops:snapshot().map(({name,address,duration})=>({name,address,duration})),day:state.day+1,demo:true});toast('일정 파일을 내려받았습니다.');}
 else if(a==='print')window.print();
 else if(a==='export-data'){download(`reeltrip-data.json`,state);toast('저장 정보를 내보냈습니다.');}
 else if(a==='reset')modal(`<h2>저장 정보 삭제?</h2><p>릴트립의 저장 장소, 일정과 체험 기록을 삭제합니다. </p><div class="buttons">${action('저장 정보 삭제','confirm-reset','danger')}${action('데이터 유지','close','secondary')}</div>`);
 else if(a==='confirm-reset'){try{localStorage.removeItem(key);localStorage.removeItem(sharedNicknameKey);}catch{}state=initial();$('#dialog').close();go('home');toast('앱의 저장 정보를 삭제했습니다.');}
 else if(a==='guide-filter'){state.guideFilter=b.dataset.value;save();render();}
 else if(a==='choose-guide'){state.guide=id;save();go('guide');}
 else if(a==='demo-quote'){if(makeQuote()){go('quote');toast('제안이 준비됐어요.');}}
 else if(a==='withdraw'){if(state.request?.status==='requested'){state.request.status='withdrawn';save();render();}}
 else if(a==='renew-quote'){if(makeQuote(state.quote?.amount||240000,state.quote?.plan,state.quote?.reason,state.quote?.pricing,state.quote?.guideId||'mina'))render();else toast('이 요청은 갱신할 수 없습니다.');}
 else if(a==='expire-quote'){if(state.quote){state.quote.expires=Date.now()-1;save();render();}}
 else if(a==='complete-trip'){if(state.booking?.status==='confirmed'){state.booking.status='completed';save();render();toast('체험 여행을 완료 처리했습니다.');}}
 else if(a==='rate'){state.rating=Number(b.dataset.value);save();document.querySelectorAll('.rating button').forEach(x=>{x.classList.toggle('selected',Number(x.dataset.value)<=state.rating);x.setAttribute('aria-pressed',String(Number(x.dataset.value)===state.rating));});}
 else if(a==='decline'){if(state.request&&['requested','quoted'].includes(state.request.status)&&!state.booking)modal(`<h2>요청 거절</h2><form id="decline-form"><label>사유<textarea name="reason" required minlength="5" maxlength="500"></textarea></label><div class="buttons"><button class="btn danger" type="submit">요청 거절</button>${action('돌아가기','close','secondary')}</div></form>`);}
 else if(a==='availability'){state.available=!state.available;save();render();}
 else if(a==='reject-place'){const p=place(id);p.rejected=true;p.verified=false;p.reviewReason='체험: 지점 확인 근거 부족';save();render();}
 else if(a==='resolve-ticket'){const t=state.tickets.find(x=>x.id===id);if(t){t.status='resolved';save();render();}}
 else if(a==='guide-needs-info'){state.guideApproved=false;state.adminReview='needs_info';if(state.guide==='jun')state.guide='mina';save();render();}
 else if(a==='refund-fail')toast('모의 PG 오류: 환불 검토 상태와 정산 보류를 유지합니다.');
});
document.addEventListener('input',e=>{if(e.target.id==='profile-nickname'){checkedNickname='';$('#nickname-status').textContent='';$('#profile-error').textContent='';}});
document.addEventListener('change',e=>{const t=e.target;if(t.id==='profile-photo'){const file=t.files?.[0];if(!file)return;const error=$('#profile-error');if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>1048576){error.textContent='1MB 이하의 JPG·PNG·WebP 사진을 선택해 주세요.';t.value='';return;}error.textContent='';const reader=new FileReader();$('#profile-save').disabled=true;reader.onload=()=>{profileDraftPhoto=reader.result;$('#profile-photo-preview').innerHTML=profileAvatar(profileDraftPhoto);$('#profile-photo-clear').hidden=false;$('#profile-camera-button').hidden=true;$('#profile-save').disabled=false;};reader.onerror=()=>{error.textContent='사진을 불러오지 못했어요. 다시 선택해 주세요.';$('#profile-save').disabled=false;};reader.readAsDataURL(file);return;}if(t.id==='screen-jump')go(t.value);else if(t.dataset.select){const id=t.dataset.select;state.selected=t.checked?[...new Set([...state.selected,id])]:state.selected.filter(x=>x!==id);save();render();}else if(t.dataset.duration){place(t.dataset.duration).duration=Number(t.value);state.saved=false;save();render();}else if(['trip-title','trip-date','trip-time'].includes(t.id)){if(!t.value)return;state[t.id==='trip-title'?'title':t.id==='trip-date'?'date':'time']=t.value;state.saved=false;save();if(t.id==='trip-time')render();}});
document.addEventListener('submit',e=>{const f=e.target;if(!(f instanceof HTMLFormElement))return;e.preventDefault();if(f.id==='discover-search-form'){startDiscovery(f.elements.query.value);return;}if(isGuest() && !['signup-code-form','signup-email-form'].includes(f.id)){go('member-required');return;}
 const d=Object.fromEntries(new FormData(f));
 if(f.id==='place-search-form'){searchPlaces(f,d);return;}
 if(f.id==='signup-email-form'){showSignupEmailStep('code');return;}
 if(f.id==='signup-code-form'){
  if(d.code===demoSignupCode){setPreviewMember(true);if(!resumeSignupAction())showSignupEmailStep('complete');return;}
  f.elements.code.setAttribute('aria-invalid','true');
  $('#signup-code-error').textContent=signupText('wrong');
  f.elements.code.focus();
  return;
 }
 if(f.id==='profile-form'){const nickname=(d.nickname||'').normalize('NFKC').trim(),canonical=normalizeNickname(nickname);try{const directory=readNicknameDirectory(),problem=nicknameProblem(nickname,directory);if(problem){$('#profile-error').textContent=problem;checkedNickname='';return;}if(canonical!==normalizeNickname(state.profile?.nickname)&&checkedNickname!==canonical){$('#profile-error').textContent='닉네임 중복 확인을 먼저 해주세요.';return;}const updated=Object.fromEntries(Object.entries(directory).filter(([name,owner])=>owner!==nicknameOwner));updated[canonical]=nicknameOwner;localStorage.setItem(nicknameDirectoryKey,JSON.stringify(updated));localStorage.setItem(sharedNicknameKey,nickname);state.profile={nickname,photo:profileDraftPhoto};save();$('#dialog').close();render();toast('프로필을 저장했어요.');}catch{$('#profile-error').textContent='중복 확인을 완료하지 못했어요. 다시 시도해 주세요.';}}
 else if(f.id==='extract-form'){let url;try{url=new URL($('#video-url').value.trim());}catch{}const ok=url&&url.protocol==='https:'&&((['youtube.com','www.youtube.com','m.youtube.com'].includes(url.hostname)&&/^\/shorts\/[A-Za-z0-9_-]+\/?$/.test(url.pathname))||(['instagram.com','www.instagram.com'].includes(url.hostname)&&/^\/reels?\/[A-Za-z0-9_-]+\/?$/.test(url.pathname)));if(!ok){$('#url-error').textContent='공개된 유튜브 쇼츠 또는 인스타그램 릴스의 보안 연결 링크(https)를 입력하세요.';return;}state.source=url.href;state.extraction='processing';state.filter='전체';save();go('processing');}

 else if(f.id==='suggest-place-form'){
  const name=d.name.trim(),address=d.address.trim();
  if(!name||!address){toast('장소 이름과 주소를 입력해 주세요.');return;}
  state.tickets.push({id:'TK-'+Date.now(),type:'장소 제안하기',body:name+' · '+address,status:'open'});
  save();render();toast('제안을 저장했어요.');
 }
 else if(f.id==='edit-trip-form'){if(!updateTripInfo(d)){$('#edit-trip-error').textContent='여행 이름과 날짜를 확인해 주세요.';return;}$('#dialog').close();render();}
 else if(f.id==='trip-note-form'){if(!saveTripNote(d.note,Number(f.dataset.index))){$('#note-error').textContent='메모를 1자 이상 입력해 주세요.';return;}$('#dialog').close();render();}
 else if(f.id==='new-trip-form'){const dayCount=tripRangeDays(tripDraft?.start,tripDraft?.end);if(!dayCount||tripDraft.start<tripToday()||!createTrip({...d,date:tripDraft.start,dayCount})){$('#new-trip-error').textContent='여행 이름과 날짜를 확인해 주세요.';return;}$('#dialog').close();go(tripDetailRoute());}
 else if(f.id==='support-form'){state.tickets.push({id:'TK-'+Date.now().toString().slice(-6),type:d.type,body:d.body.trim(),status:'open'});save();render();toast('저장한 문의를 브라우저에 저장했습니다. 외부로 전송되지 않습니다.');}
 else if(f.id==='request-form'){const params=new URLSearchParams(location.hash.split('?')[1]||'');const result=submitTravelRequest(d,{free:params.get('mode')==='free',example:params.get('sample')==='1'});if(result.error){$('#request-error').textContent=result.error;return;}go(result.route);}
 else if(f.id==='quote-form'){if(!state.available){$('#quote-error').textContent='해당 날짜가 수락 불가입니다. 가능 일정부터 변경해주세요.';return;}if(makeQuote(window.ReelRevenue.calculate(Number(d.hourlyRate),Number(d.guideHours),Number(d.extraGuestRate),state.request.party).total,d.plan.trim(),d.reason.trim(),{rate:Number(d.hourlyRate),hours:Number(d.guideHours),extra:Number(d.extraGuestRate)},d.sender||'mina')){go('guide-desk');toast('새 제안 버전을 발행했습니다.');}}
 else if(f.id==='checkout-form'){if(!d.terms||!d.pendingAck)return;if(requestBooking(d.name.trim(),d.email)){go('booking');}else{go(state.booking?'booking':'quote');}}
 else if(f.id==='mate-fee-form'){if(!d.terms)return;if(confirmMateFee(d.outcome||'success')){go('guide-earnings');toast('수수료 결제 후 예약이 확정됐어요.');}else{const error=$('#mate-fee-error');if(error)error.textContent='결제가 완료되지 않았어요. 예약은 아직 확정되지 않았습니다.';}}
 else if(f.id==='chat-form'){if(sendChatMessage(d.text)){render();$('#chat-form input')?.focus();}}
 else if(f.id==='cancel-form'){const b=state.booking;if(!b||!['awaiting_mate_fee','confirmed'].includes(b.status)||!d.terms)return;const pending=b.status==='awaiting_mate_fee';b.cancelReason=d.reason;b.status=pending?'cancelled':'cancellation_requested';if(pending){b.feeStatus='void';state.request.status='withdrawn';}save();go('booking');}
 else if(f.id==='review-form'){if(!state.rating){$('#review-error').textContent='먼저 별점을 선택하세요.';return;}if(state.booking?.status!=='completed'||state.review)return;state.review={rating:state.rating,body:d.body.trim(),at:Date.now()};save();go('booking');}
 else if(f.id==='decline-form'){state.request.status='declined';state.request.reason=d.reason.trim();state.quote=null;save();$('#dialog').close();render();}
 else if(f.id==='verify-form'){state.guideApproved=true;state.adminReview='approved';save();render();toast('가상 프로필 준을 공개했습니다.');}

});
window.addEventListener('reeltrip-access-change',()=>render());
window.addEventListener('hashchange',()=>{if(current()!=='signup-email')signupEmailStep='address';render();window.scrollTo(0,0);$('#main')?.focus({preventScroll:true});});
if(comparison){
 state.saved=true;ensureDays();
 if(guided&&['quote','checkout','booking'].includes(current())){
 state.request={id:'RQ-COMPARE',status:'requested',date:state.date,time:state.time,party:2,notes:'영어 안내와 한국어 주문 도움이 필요해요.',guide:'미나',guideId:'mina',stops:snapshot(),must:[],createdAt:Date.now()};makeQuote();
 if(current()==='booking'){state.request.status='booked';state.booking={...JSON.parse(JSON.stringify(state.quote)),id:'RT-COMPARE',quoteVersion:state.quote.version,status:'confirmed',customer:'제이미',email:'jamie@example.com',policyVersion:'DRAFT-2026-11-16',refundStatus:'없음'};}
 }
}
window.ReelBookingTools.init({state:()=>state,save,render,toast});
window.ReelRevenue.init({state:()=>state,save});
if(needsTowerSeed)save();
if(!location.hash)location.hash=window.ReelAccess.home();
render();
window.ReelPlaceAPI?.hydrate(state).then(changed=>{if(changed)render();});
})();
