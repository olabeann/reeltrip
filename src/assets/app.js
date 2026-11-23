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
 p.demoCoordinates=true;p.locationNote='정확한 위치를 확인해 주세요.';changed=true;
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
function dayTabs(){ensureDays();return `<div class="day-tabs" aria-label="여행 날짜">${state.days.map((d,i)=>`<button data-action="day" data-value="${i}" aria-pressed="${state.day===i}" class="${state.day===i?'active':''}">${i+1}일차<small>${esc(d.date.slice(5))}</small></button>`).join('')}<button data-action="add-day" ${state.days.length>=7?'disabled':''} aria-label="여행 날짜 추가">${icon('plus',20)} 날짜</button></div>`;}
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
 const name=String(d.title||'').trim(),count=Number(d.dayCount);
 if(!name||name.length>70||!/^\d{4}-\d{2}-\d{2}$/.test(d.date||'')||!Number.isFinite(Date.parse(d.date+'T12:00:00Z'))||dateAfter(d.date,0)!==d.date||!Number.isInteger(count)||count<1||count>7)return false;
 stashDay();stashTrip();let id='trip-'+Date.now();while(state.trips.some(t=>t.id===id))id+='-new';
 state.activeTripId=id;state.title=name;state.date=d.date;state.time='10:00';state.party=2;state.day=0;state.board=[];state.must=[];state.saved=false;state.focus=null;
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
 modal(`<div class="trip-calendar-shell"><header class="trip-calendar-header"><button type="button" class="textbtn" data-action="close" aria-label="닫기">${icon('close')}</button><h2>여행 일정 만들기</h2><p>시작일과 종료일을 선택해 주세요.</p></header><div class="trip-calendar-scroll" id="trip-calendar-scroll">${Array.from({length:tripDraft.months},(_,i)=>tripCalendarMonth(i)).join('')}<button type="button" class="btn secondary" data-action="trip-more-months">다음 달 더 보기</button></div><footer class="trip-calendar-footer"><div class="trip-date-summary"><span>시작일<strong>${tripDraft.start||'날짜 선택'}</strong></span><span aria-hidden="true">${icon('arrowRight')}</span><span>종료일<strong>${tripDraft.end||'날짜 선택'}</strong></span></div><p class="hint" role="status">${tripDraft.error||(n?tripLength(n):tripDraft.start?'종료일을 선택해 주세요. 당일 여행은 같은 날짜를 한 번 더 눌러주세요.':'최대 7일까지 선택할 수 있어요.')}</p><button type="button" class="btn" data-action="trip-dates-next" ${n?'':'disabled'}>이 날짜로 계속</button></footer></div>`,'trip-calendar');
 $('#trip-calendar-scroll').scrollTop=scroll;
}
function newTripDialog(){tripDraft={start:'',end:'',months:12,title:'',error:''};renderTripCalendar();}
function tripDetailsDialog(){const n=tripRangeDays(tripDraft?.start,tripDraft?.end);if(!n)return;modal(`<form id="new-trip-form"><h2>새 여행 만들기</h2><p>${esc(tripDraft.start)} → ${esc(tripDraft.end)} · ${tripLength(n)}</p><button type="button" class="textbtn" data-action="trip-dates-back">날짜 다시 선택</button><label>여행 이름<input name="title" required maxlength="70" value="${esc(tripDraft.title)}" placeholder="예: 부산 주말 여행"></label><p id="new-trip-error" class="error" role="alert"></p><div class="buttons"><button class="btn" type="submit">여행 만들기</button>${action('취소','close','secondary')}</div></form>`);}

function tripDetailRoute(){return 'trips?view=detail&id='+encodeURIComponent(state.activeTripId||'trip-legacy');}
function isTripDetail(){return location.hash.split('?')[0]==='#planner'||current()==='trips'&&new URLSearchParams(location.hash.split('?')[1]||'').get('view')==='detail';}
const save=()=>{if(isGuest())return;libraryIds();stashDay();stashTrip();if(comparison)return;try{localStorage.setItem(key,JSON.stringify(state,window.ReelPlaceAPI?.replacer));}catch{storageWarning=true;toast('저장소를 사용할 수 없어 이번 이용 내용은 저장되지 않습니다.');}};
const screens=window.REEL_SCREENS.filter(s=>s.both||guided).map(s=>({...s}));
const byRoute=r=>screens.find(s=>s.route===r);
const legacyRoutes={planner:'trips',review:'booking',upcoming:'booking','guide-calendar':'guide-activity','guide-earnings':'guide-fee'};
const current=()=>{const route=location.hash.slice(1).split('?')[0]||'home';return legacyRoutes[route]||route;};
const place=id=>state.places.find(p=>p.id===id);
const guide=()=>state.guide==='jun'?{name:'준',initial:'준',field:'동네 맛집과 숨은 골목',area:'안국'}:{name:'미나',initial:'미',field:'디자인, 카페와 동네 상점',area:'성수'};
const statusLabel=s=>({awaiting_mate_fee:'메이트 확정 대기',matching:'메이트 확정 대기',requested:'응답 대기',quoted:'제안 도착',booked:'예약 확정',withdrawn:'철회',declined:'거절',confirmed:'예약 확정',completed:'여행 완료',cancelled:'취소 완료',cancellation_requested:'취소 검토 중',pending:'심사 대기',approved:'승인',needs_info:'보완 요청',open:'접수',resolved:'처리 완료'})[s]||s;
let timer,toastTimer,feeExpiryTimer,previewExtractionStarted=false;
function toast(t){$('#toast').textContent=t;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),3500);}
function go(r){if(current()===r)render();else location.hash=r;}
function btn(label,route,kind=''){return `<a class="btn ${kind}" href="#${route}">${label}</a>`;}
function action(label,name,kind='',extra=''){return `<button class="btn ${kind}" data-action="${name}" ${extra}>${label}</button>`;}
function chip(t,active=false,attr=''){return `<button class="chip ${active?'active':''}" ${attr}>${t}</button>`;}
function taskGroup(label,content,kind='neutral',hint=''){return `<section class="task-group ${kind}"><h3 class="task-group-title">${label}</h3>${hint?`<p class="task-group-hint">${hint}</p>`:''}<div class="task-group-content">${content}</div></section>`;}
function title(k,h,p='',buttons=''){return `<div class="pagehead"><div>${k?`<div class="eyebrow">${k}</div>`:''}<h1>${h}</h1>${p?`<p class="muted">${p}</p>`:''}</div><div class="buttons">${buttons}</div></div>`;}
function steps(n){return `<div class="steps">${['여행 요청','메이트 제안','예약 요청','메이트 확정'].map((t,i)=>`<span class="${i===n?'current':''}"><b>${i+1}</b>${t}</span>`).join('')}</div>`;}
function empty(h,p,link='home',label='영상으로 시작하기',visual=''){return `<div class="empty">${visual}<div class="eyebrow">새로운 발견의 시작</div><h2>${h}</h2><p class="muted">${p}</p><div class="buttons">${btn(label,link)}</div></div>`;}
function icon(name,size=24){const shapes={star:'<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2L3 9.6l6.2-.9Z"/>',trash:'<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',chevronDown:'<path d="m6 9 6 6 6-6"/>',arrowUp:'<path d="M12 20V4m-6 6 6-6 6 6"/>',arrowDown:'<path d="M12 4v16m-6-6 6 6 6-6"/>',arrowRight:'<path d="M4 12h16m-6-6 6 6-6 6"/>',mail:'<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7 8 6 8-6"/>',lock:'<rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',search:'<circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/>',eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',plus:'<path d="M12 5v14M5 12h14"/>',edit:'<path d="m4 16-1 5 5-1L21 7l-4-4L4 16ZM14 6l4 4"/>',share:'<circle cx="18" cy="5" r="3"/><circle cx="5" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8 11 7-4m-7 6 7 4"/>',local:'<path d="M16.5 10c0 4-5.5 8-5.5 8S5.5 14 5.5 10a5.5 5.5 0 1 1 11 0Z"/><circle cx="11" cy="10" r="1.8"/><path d="m19 3 .7 2.3L22 6l-2.3.7L19 9l-.7-2.3L16 6l2.3-.7Z"/>',info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10h.01"/>',send:'<path d="m22 2-7 20-4-9-9-4 20-7ZM22 2 11 13"/>',warning:'<rect x="4" y="3" width="16" height="18" rx="4"/><path d="M12 7v6m0 4h.01"/>',location:'<path d="M17 10c0 4-5 8-5 8s-5-4-5-8a5 5 0 1 1 10 0Z"/><circle cx="12" cy="10" r="1.5"/><path d="M6 16H4l-2 5h20l-2-5h-2"/>',close:'<path d="m6 6 12 12M18 6 6 18"/>',chevronLeft:'<path d="m15 5-7 7 7 7"/>',chevronRight:'<path d="m9 5 7 7-7 7"/>',external:'<path d="M7 17 17 7M7 7h10v10"/>',check:'<path d="m5 12 4 4L19 6"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',more:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',calendar:'<rect x="4" y="5" width="16" height="16" rx="3"/><path d="M8 3v4m8-4v4M4 10h16M9 15h6"/>',messages:'<path d="M4 4h16v12H9l-5 4V4Z"/><path d="M8 8h8M8 12h5"/>',camera:'<path d="M4 6h4l2-3h4l2 3h4a1 1 0 0 1 1 1v13H3V7a1 1 0 0 1 1-1Z"/><circle cx="12" cy="13" r="4"/>',settings:'<path d="m9 3-1 3-3 1v4l2 2-1 3 3 2 3-1 3 1 3-2-1-3 2-2V7l-3-1-1-3Z"/><circle cx="12" cy="11" r="3"/>',bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/>',board:'<path d="M6 3h12v18l-6-4-6 4Z"/>',guides:'<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 5"/>',trips:'<rect x="4" y="6" width="16" height="15" rx="3"/><path d="M8 6V3h8v3M9 10v7m6-7v7"/>',account:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',park:'<path d="m12 2 6 8h-3l5 7h-6v5h-4v-5H4l5-7H6Z"/>',cafe:'<path d="M4 8h13v7a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5Zm13 1h2a3 3 0 1 1 0 6h-2M8 2v3m5-3v3M3 22h16"/>',shop:'<path d="M4 7h16l1 14H3ZM8 8V6a4 4 0 0 1 8 0v2"/>',food:'<path d="M5 2v7m3-7v7m-6-7v7a3 3 0 0 0 6 0M5 12v10M19 2c-4 4-5 8-1 10h2V2Zm1 10v10"/>',all:'<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',link:'<path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>'};return `<svg class="rt-icon" style="--rt-icon-size:${size}px" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${shapes[name]||shapes.all}</svg>`;}
function art(type){
 const names={park:'서울숲의 초록 풍경',cafe:'성수동 카페 외관',shop:'성수동 카메라 상점',food:'광장시장 전과 먹거리'};
 if(!names[type])return `<div class="photo-placeholder">${icon('board')}<span>사진 준비 중</span></div>`;
 return `<img class="travel-photo photo-${type}" src="../assets/photos/${type}.jpg" alt="${names[type]} · 실제 촬영 사진" loading="lazy" decoding="async" width="960" height="720">`;
}
function placeArt(p){const url=window.ReelPlaceAPI?.safeURL(p.photoURL);if(!url)return art(p.source||window.REEL_MAPS_CONFIG?.apiKey?undefined:p.photo);return `<span class="provider-photo ${p.source==='tourism'?'tourism-photo':''}"><img class="travel-photo" src="${esc(url)}" alt="${esc(p.name)}" loading="lazy" decoding="async" referrerpolicy="strict-origin-when-cross-origin"><small>${esc(p.source==='google'?'Google Maps · '+(p.photoAuthors||[]).map(a=>a.name).join(', '):'한국관광공사')}</small></span>`;}
function providerCredits(){if(!['manual','results','board','trips','planner','request','requested','quote','booking','chat'].includes(current()))return '';const places=state.places.filter(p=>p.source&&libraryIds().includes(p.id));if(!places.length)return '';return `<details class="provider-credits"><summary>장소·사진 출처</summary>${places.map(p=>`<p><strong>${esc(p.name)}</strong> · ${p.source==='google'?'Google Maps':'한국관광공사'} ${(p.photoAuthors||[]).concat(p.attributions||[]).map(a=>a.url?`<a href="${esc(window.ReelPlaceAPI.safeURL(a.url))}" target="_blank" rel="noopener noreferrer">${esc(a.name)}</a>`:esc(a.name)).join(', ')} ${p.googleMapsURI?`<a href="${esc(p.googleMapsURI)}" target="_blank" rel="noopener noreferrer">Google Maps ↗</a>`:''}</p>`).join('')}</details>`;}
let placeSearchResults=[],placeSearchVersion=0,placeSelectionVersion=0,placePickerTab='search',placePickerQuery='',placePickerStatus='',placePickerSelected='';
let pendingAPIPlace=null;
function resolvePlace(id,fromTrip=false){const p=place(id);if(!p)return;placePickerQuery=p.ko||p.name;placePickerTab='search';placeSearchResults=[];placePickerSelected='';pendingAPIPlace=null;placePickerStatus='검색 결과에서 이름과 주소를 확인하고 선택해 주세요.';$('#dialog').close();go('manual?resolve='+encodeURIComponent(id)+(fromTrip?'&from=trips':''));}
function resolvingPlace(){return new URLSearchParams(location.hash.split('?')[1]||'').get('resolve');}
function pickerPlaces(){return placePickerTab==='saved'?libraryIds().map(place).filter(Boolean):placeSearchResults;}
function googleRegistered(p){return p?.source==='google'&&typeof p.placeId==='string'&&Boolean(p.placeId.trim())&&!p.demoCoordinates&&!p.demoPreview;}
function pinEligible(p){return googleRegistered(p)&&window.ReelGoogleMap.valid(p);}
function saveSelectedPlaces(ids){if(!ids.length)return false;const unresolved=ids.find(id=>!pinEligible(place(id)));if(unresolved){resolvePlace(unresolved);return false;}state.library=[...new Set([...libraryIds(),...ids])];save();return true;}
function placeSearchForm(){return `<section class="place-map-picker"><form id="place-search-form" class="place-map-search"><label class="sr-only" for="map-place-query">장소 이름 또는 지역</label><input id="map-place-query" name="query" required minlength="2" maxlength="120" value="${esc(placePickerQuery)}" placeholder="관광지·맛집·숙소 검색"><button type="submit" class="btn small">검색</button><input type="hidden" name="provider" value="google"></form><div class="place-picker-map" data-place-picker-map role="region" aria-label="장소 선택 Google 지도"></div><section class="place-picker-sheet"><div class="trip-sheet-handle" aria-hidden="true"></div><div class="place-picker-tabs"><button type="button" data-action="place-picker-tab" data-id="search" aria-pressed="${placePickerTab==='search'}">검색 결과</button><button type="button" data-action="place-picker-tab" data-id="saved" aria-pressed="${placePickerTab==='saved'}">저장한 장소</button></div><p id="place-search-status" role="status">${esc(placePickerStatus)}</p><div id="place-picker-detail" aria-live="polite"></div><div id="place-search-results"></div></section></section>`;}
function renderPickerResults(){const host=$('#place-search-results');if(!host)return;const places=pickerPlaces();host.innerHTML=places.map((p,i)=>`<article class="place-map-row ${p.id===placePickerSelected?'is-selected':''}"><span class="place-map-row-photo">${placeArt(p)}</span><button type="button" class="place-map-row-select" data-action="preview-api-place" data-id="${i}" aria-pressed="${p.id===placePickerSelected}" ><strong>${i+1}. ${esc(p.name)}</strong><span>${esc(p.address)}</span><small>${pinEligible(p)?'지도에서 위치 확인':'눌러서 장소 보기'}</small></button></article>`).join('')||`<div class="place-picker-empty">${placePickerTab==='saved'?'저장한 장소가 없어요.':'장소를 검색하면 지도와 목록에서 확인할 수 있어요.'}</div>`;}
function mountPlacePicker(){renderPickerResults();const places=pickerPlaces();window.ReelGoogleMap.mount($('[data-place-picker-map]'),places.map(p=>pinEligible(p)?p:{...p,lat:null,lng:null}),placePickerSelected,id=>{const index=pickerPlaces().findIndex(p=>p.id===id);previewAPIPlace(index);});}
async function searchPlaces(form,d){window.ReelEnablePlaceSearch?.();const version=++placeSearchVersion,button=form.querySelector('button'),status=$('#place-search-status');placeSelectionVersion++;pendingAPIPlace=null;placePickerSelected='';placePickerQuery=d.query;placePickerTab='search';button.disabled=true;status.textContent='장소를 찾고 있어요…';placeSearchResults=[];$('#place-picker-detail').innerHTML='';mountPlacePicker();
 try{const found=await window.ReelPlaceAPI.search(d.query,'google');if(version!==placeSearchVersion||!form.isConnected)return;placeSearchResults=found;placePickerStatus=found.length?'목록이나 핀을 눌러 위치를 확인해 주세요.':'검색 결과가 없어요. 찾으시는 장소를 문의로 남겨 주세요.';}
 catch(error){if(version!==placeSearchVersion||!form.isConnected)return;placePickerStatus='검색 결과를 불러오지 못했어요. 다시 검색하거나 문의를 남겨 주세요.';}finally{button.disabled=false;}
 if(version!==placeSearchVersion||!form.isConnected)return;status.textContent=placePickerStatus;if(!placeSearchResults.length){const link=document.createElement('a');link.href='#support?placeQuery='+encodeURIComponent(placePickerQuery);link.className='btn secondary small';link.textContent='문의 남기기';status.append(document.createElement('br'),link);}document.querySelectorAll('[data-action="place-picker-tab"]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.id===placePickerTab)));mountPlacePicker();}
async function previewAPIPlace(index){const record=pickerPlaces()[index],version=++placeSelectionVersion,route=location.hash;if(!record)return;pendingAPIPlace=null;placePickerSelected=record.id;const host=$('#place-picker-detail');host.innerHTML='<p role="status">장소를 확인하고 있어요…</p>';mountPlacePicker();
 if(!pinEligible(record)){host.innerHTML=`<article class="place-pin-confirm"><div class="place-pin-photo">${placeArt(record)}</div><div><h3>${esc(record.name)}</h3><p>${esc(record.address)}</p><small>${esc(record.type)}</small></div></article>`;return;}
 try{const p=await window.ReelPlaceAPI.details(record);if(version!==placeSelectionVersion||location.hash!==route||!host.isConnected)return;if(!pinEligible(p))throw new Error('coordinates');pendingAPIPlace=p;host.innerHTML=`<article class="place-pin-confirm"><div class="place-pin-photo">${placeArt(p)}</div><div><small>선택한 장소</small><h3>${esc(p.name)}</h3><p>${esc(p.address)}</p>${(p.photoAuthors||[]).concat(p.attributions||[]).map(a=>`<small><a href="${esc(window.ReelPlaceAPI.safeURL(a.url))}" target="_blank" rel="noopener noreferrer">${esc(a.name)}</a></small>`).join('')}</div><button type="button" class="btn" data-action="save-api-place">${addingToTrip()?'이 장소를 일정에 추가':'이 장소 저장'}</button></article>`;host.scrollIntoView?.({behavior:'smooth',block:'nearest'});}
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
function reviewMapImage(places,active){return `<div class="review-map-image" role="group" aria-label="실제 Google 지도 캡처 위 장소 사진 핀"><img class="review-map-background" src="../assets/photos/google-seongsu-review.png" width="640" height="600" alt="서울숲과 성수동 Google 지도 캡처. 지도 데이터 ©2026 TMap Mobility. 확대·이동을 지원하지 않는 지도 이미지.">${reviewVisitLines(places)}${places.map((p,i)=>{const pos=reviewPosition(p);return pos?`<button class="review-photo-pin ${p.id===active?'active':''}" style="left:${pos.x}%;top:${Math.max(14,pos.y)}%" data-action="focus-place" data-id="${p.id}" aria-label="지도에서 ${esc(p.name)} 선택" aria-pressed="${p.id===active}">${placeArt(p).replace('loading="lazy"','loading="eager"')}<b>${i+1}</b></button>`:'';}).join('')}</div><div class="review-map-attribution">Google Maps · 지도 데이터 ©2026 TMap Mobility</div>`;}
let mapPlaces=[];
function mapPanel(ids=state.board,snapshots=null){
 mapPlaces=snapshots?snapshots.map(p=>({...p})):ids.map(place).filter(Boolean).map(p=>{const seed=window.REEL_PLACES.find(x=>x.id===p.id);return p.original?p:{...seed,...p};});
 const visible=mapPlaces.filter(p=>reviewMapMode()?reviewPosition(p):pinEligible(p)),active=visible.find(p=>p.id===state.focus)||visible[0];
 return `<section class="map-workspace" aria-label="Google 지도와 선택 장소">${reviewMapMode()?reviewMapImage(mapPlaces,active?.id):'<div class="google-map-host" data-google-map role="region" aria-label="Google 장소 지도"></div>'}${active?`<div class="map-selected"><div class="map-photo">${placeArt(active)}</div><div><strong>${esc(active.name)}</strong><p>${esc(active.demoCoordinates?'정확한 위치를 확인해 주세요.':active.locationNote||active.area+' · '+active.type)}</p><a target="_blank" rel="noopener noreferrer" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(active.lat+','+active.lng)}">Google 지도에서 열기 ↗</a></div></div>`:''}</section>`;
}
function mountMaps(){if(current()==='manual'&&!isGuest()){mountPlacePicker();const query=new URLSearchParams(location.hash.split('?')[1]||'').get('query');if(query&&discoveryRoute!==location.hash){discoveryRoute=location.hash;placePickerQuery=query;const form=$('#place-search-form');form.elements.query.value=query;searchPlaces(form,{query});}return;}const h=document.querySelector('[data-google-map]');window.ReelGoogleMap.mount(h,mapPlaces.map(p=>pinEligible(p)?p:{...p,lat:null,lng:null}),state.focus||mapPlaces.find(pinEligible)?.id,id=>{if(current()==='guide-quote'){updateQuoteMap(null,id);return;}state.focus=id;save();render();});}
const navIcon=route=>icon(({'guide-desk':'home','guide-activity':'trips','guide-calendar':'calendar'})[route]||route);
function brandLogo(){
 const english=document.documentElement.lang==='en';
 const filename=english?'reeltrip-logo-en-charcoal-transparent.png':'reeltrip-logo-ko-charcoal-transparent.png';
 return `<img class="brand-logo" src="../assets/brand/${filename}" alt="${english?'Reeltrip':'릴트립'}" width="${english?1164:993}" height="446">`;
}
function layout(content){
 const r=current(),screen=byRoute(r),role=screen?.role||'customer',access=window.ReelAccess;
 const tabs=access.isAdmin?[]:!isGuest()&&access.mode()==='guide'?[['guide-desk','▤','여행 찾기'],['guide-activity','▤','내 활동'],['messages','◇','채팅'],['account','○','마이']]:[['home','⌂','발견'],['trips','▤','내 여행'],['guides','♧','메이트'],['messages','◇','채팅'],['account','○','마이']];
 const tabRoute=({processing:'home',results:'home',manual:'trips',board:'trips',planner:'trips',guide:'guides',request:'guides',requested:'guides',quote:'guides',checkout:'guides',booking:'guides',chat:'messages',cancel:'guides',review:'guides','mate-register':'account',upcoming:'account',settings:'account',support:'account',policies:'account','guide-fee':'guide-activity','guide-earnings':'account','guide-quote':'guide-activity'})[r]||r;
 const parent=isTripDetail()?'trips':r==='chat'?'messages':role==='admin'?'admin':role==='guide'?(r==='guide-earnings'?'account':'guide-activity'):({processing:'home',results:'home',manual:addingToTrip()?tripDetailRoute():new URLSearchParams(location.hash.split('?')[1]||'').has('query')?'home':'board',planner:tripDetailRoute(),guide:'guides',request:location.hash.includes('trip=')?'request':'guides',requested:'guides',quote:'requested',checkout:'quote',booking:'guides',chat:'messages',board:'trips',cancel:'booking',review:'booking',signup:isGuest()?'home':'account','signup-email':isSignIn()?'signup?mode=signin':'signup','mate-register':'account',upcoming:'account',settings:'account',support:'settings',policies:'settings'})[r]||access.home();
 const shortTitleOriginal=({trips:'여행 상세',board:'저장한 장소',processing:'장소 찾기',results:'장소 확인',manual:'장소 추가',planner:'일정 편집',guide:'메이트 소개',request:location.hash.includes('mode=free')?'자유 견적 요청':'내 여행으로 메이트 요청',requested:'요청 상태',quote:'여행 제안',checkout:'예약 확인',booking:'예약 상세',chat:'채팅',cancel:'취소 요청',review:'후기 작성',upcoming:'예정된 일정',settings:'설정',support:'도움말',policies:policySection()==='privacy'?'개인정보처리방침':policySection()==='terms'?'서비스 이용약관':'이용 안내','guide-fee':'매칭 수수료','guide-quote':'제안 작성'})[r]||screen?.name||'릴트립';
 const signupRoute=r==='signup'||r==='signup-email';
 const shortTitle=signupRoute?signupText(r==='signup'?'title':'emailTitle'):shortTitleOriginal;
 const isRoot=tabs.some(t=>t[0]===r)&&!isTripDetail();
 const header=access.isAdmin?`${access.controls()}<header class="topbar"><a class="brand brand-lockup" href="#admin">${brandLogo()}</a><span class="brand-surface-label">${document.documentElement.lang==='en'?'Operations':'운영'}</span></header>`:isTripDetail()&&!isGuest()&&!content.includes('trip-unavailable')?tripDetailHeader():isRoot&&r!=='messages'||r==='chat'&&chatContext()?'':`<header class="topbar detail-topbar"><a class="app-back" href="#${parent}" aria-label="${signupRoute?signupText('back'):'이전 화면으로'}">${icon('chevronLeft')}</a><strong class="app-title">${shortTitle}</strong>${r==='messages'||r==='chat'&&!chatContext()?chatPolicyButton():r==='board'&&!isGuest()?`<button type="button" class="library-add" data-action="board-add" aria-label="장소 저장하기">${icon('plus')}</button>`:'<span class="header-balance" aria-hidden="true"></span>'}</header>`;
 return `${isGuest()?'':`<details class="reviewtools"><summary>모바일 앱 검토 도구</summary><div class="reviewlinks">${access.tools()}<a href="../../docs/index.html">기획 허브</a><a href="../../docs/product.html">기획·명세</a><button class="textbtn" data-action="scenarios">상태 관리</button><label>화면 바로가기<select id="screen-jump">${screens.filter(s=>access.allowed(s.role,s.route)).map(s=>`<option value="${s.route}" ${r===s.route?'selected':''}>${s.id} ${s.name}</option>`).join('')}</select></label><p>검토용 도구입니다. 실제 앱에는 표시되지 않습니다.</p></div></details>`}${header}<main id="main" class="page ${!access.isAdmin&&isRoot?'tab-page':''} ${isTripDetail()&&!isGuest()?'trip-detail-page':''}" tabindex="-1">${!access.isAdmin&&['home','guide-desk'].includes(r)?`<div class="home-entry-row"><div class="home-brand">${signupBrandLogo()}</div>${notificationBell()}</div>`:''}<div class="screennote">${screen?`${screen.id} · ${screen.name}`:'화면을 찾을 수 없습니다'}${role!=='customer'?' · 검토용 역할 화면 (실제 인증 없음)':''}</div>${storageWarning?'<div class="infobar warn">브라우저 저장소를 사용할 수 없습니다. 변경 내용은 이번 이용 중에만 유지됩니다.</div>':''}${content}</main>${access.isAdmin||signupRoute||r==='chat'&&chatContext()?'':`<nav class="mobiletabs" aria-label="앱 하단 메뉴">${tabs.map(([route,icon,label])=>`<a href="#${route}" class="${tabRoute===route?'active':''}" ${tabRoute===route?'aria-current="page"':''}><b aria-hidden="true">${navIcon(route)}</b>${label}${route==='messages'&&unreadChats()?`<span class="chat-tab-unread" aria-label="${unreadChats()} 읽지 않은 메시지">${unreadChats()}</span>`:''}</a>`).join('')}</nav>`}`;
}
function notificationItems(){
 const mode=window.ReelAccess.mode(),guideMode=mode==='guide',items=[];
 const b=state.booking,q=state.request;
 if(b)items.push({id:`${mode}:booking:${b.id}:${b.status}`,category:'guide',symbol:'trips',route:guideMode?'guide-fee':'booking',title:({confirmed:'예약이 확정됐어요',cancellation_requested:'취소 요청을 확인해 주세요',cancelled:'예약이 취소됐어요',completed:'여행이 완료됐어요'})[b.status]||statusLabel(b.status),body:`여행일 ${b.date} · ${b.guide}`,time:b.confirmedAt||b.requestedAt||0});
 else if(q)items.push({id:`${mode}:request:${q.id}:${q.status}:${state.quote?.version||0}`,category:'guide',symbol:q.status==='quoted'?'board':'trips',route:guideMode?'guide-desk':q.status==='quoted'?'quote':'requested',title:guideMode?(q.status==='requested'?'새 여행 요청이 도착했어요':'여행 요청 상태가 변경됐어요'):(q.status==='quoted'?'메이트의 제안이 도착했어요':'여행 요청 상태를 확인하세요'),body:`여행일 ${q.date} · ${statusLabel(q.status)}`,time:q.createdAt||0});
 return [...items,...(state.previewNotifications||[])].sort((a,b)=>b.time-a.time).map(n=>({...n,read:(state.readNotifications||[]).includes(n.id)}));
}
function markNotificationsRead(ids){state.readNotifications=[...new Set([...(state.readNotifications||[]),...ids])].slice(-200);save();}
function notificationBell(){const count=notificationItems().filter(n=>!n.read).length;return `<a class="notification-bell" href="#notifications" aria-label="알림${count?' · 읽지 않은 알림':''}">${icon('bell')}${count?'<span class="notification-dot" aria-hidden="true"></span>':''}</a>`;}
let notificationFilter='all';
function notifications(){const items=notificationItems(),visible=items;return `<section class="notifications-page">${visible.length?`<div class="notification-list">${visible.map(n=>`<a class="notification-item ${n.read?'is-read':'is-unread'}" href="#${n.route}" data-action="notification-open" data-id="${esc(n.id)}"><div><strong>${!n.read?'<span class="notification-unread-mark" aria-hidden="true"></span><span class="sr-only">읽지 않은 알림 · </span>':''}${esc(n.title)}</strong><p>${esc(n.body)}</p>${n.time?`<time datetime="${new Date(n.time).toISOString()}">${new Date(n.time).toLocaleDateString(document.documentElement.lang==='en'?'en-US':'ko-KR',{timeZone:'Asia/Seoul',month:'short',day:'numeric'})}</time>`:''}</div><span class="notification-chevron" aria-hidden="true">${icon('chevronRight')}</span></a>`).join('')}</div>`:`<div class="notification-empty rt-empty-card rt-empty-plain"><span class="rt-empty-card-icon">${icon('bell')}</span><h2>아직 알림이 없어요</h2><p>새로운 소식이 오면 여기서 알려드릴게요.</p></div>`}</section>`;}

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
 return `<div class="recommendation-grid">${recommendationRows.map((p,i)=>{const saved=recommendationSaved(p);return `<article class="recommendation-card"><div class="recommendation-photo">${window.ReelPlaceAPI.safeURL(p.photoURL)?`<span class="provider-photo"><img class="travel-photo" src="${esc(window.ReelPlaceAPI.safeURL(p.photoURL))}" alt="${esc(p.name)}" loading="lazy" decoding="async" referrerpolicy="strict-origin-when-cross-origin"></span>`:art()}</div><div class="recommendation-body"><h3>${esc(p.name)}</h3><p>${esc(p.address)}</p><div class="recommendation-attribution">${(p.photoAuthors||[]).concat(p.attributions||[]).map(a=>a.url?`<a href="${esc(window.ReelPlaceAPI.safeURL(a.url))}" target="_blank" rel="noopener noreferrer">${esc(a.name)}</a>`:esc(a.name)).join(' · ')}</div><div class="recommendation-actions">${p.googleMapsURI?`<a href="${esc(p.googleMapsURI)}" target="_blank" rel="noopener noreferrer">지도 ↗</a>`:''}<button type="button" class="btn small" data-action="save-recommendation" data-id="${i}" ${saved?'disabled':''} aria-label="${esc(p.name)} ${saved?'저장됨':'저장'}">${icon(saved?'check':'plus',20)}${saved?'저장됨':'저장'}</button></div></div></article>`;}).join('')}</div>`;
}
function paintRecommendations(){const host=$('#recommendation-results');if(!host)return;host.innerHTML=interfaceMarkup(recommendationCards());host.setAttribute('aria-busy',String(recommendationStatus==='loading'));const label=$('#recommendation-query');if(label)label.textContent=recommendationQuery;document.querySelectorAll('[data-action="discover-query"]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.query===recommendationQuery)));}
async function loadRecommendations(query=recommendationQuery,force=false){if(!force&&query===recommendationQuery&&recommendationStatus!=='idle'){paintRecommendations();return;}recommendationQuery=query;const version=++recommendationVersion;recommendationStatus='loading';recommendationRows=[];paintRecommendations();try{const rows=await window.ReelPlaceAPI.search(query,'google');if(version!==recommendationVersion)return;recommendationRows=rows.filter(pinEligible).slice(0,6);recommendationStatus='ready';}catch{if(version!==recommendationVersion)return;recommendationStatus='error';}paintRecommendations();}
function saveRecommendation(record){if(!record||!pinEligible(record))return false;if(isGuest()){pendingRecommendation={...record};go('member-required');return false;}const existing=state.places.find(p=>p.source==='google'&&p.placeId===record.placeId);const p=existing||{...record};if(!existing)state.places.push(p);else Object.assign(p,{...record,id:existing.id,duration:existing.duration||45});if(!libraryIds().includes(p.id))state.library.push(p.id);save();paintRecommendations();const next=$('#discover-next-step');if(next)next.innerHTML=interfaceMarkup(discoveryNext());toast('저장한 장소에 담았어요.');return true;}
let discoveryRoute='';
function startDiscovery(query){query=String(query||'').trim();if(query.length<2||query.length>120)return;loadRecommendations(query,true);}
function discoveryNext(){
 const count=isGuest()?0:libraryIds().length;
 if(!count)return '';
 return `<div class="discover-next"><div><strong>${signupText('savedTripTitle')}</strong><p>${esc(signupText('savedTripHint').replace('{count}',String(count)))}</p></div><div class="discover-next-links">${action(signupText('createTripFromSaved'),'new-trip','secondary small')}</div></div>`;
}
function discoveryPlaces(){
 return `<section class="mate-intro" aria-labelledby="mate-intro-title"><header><span class="mate-intro-eyebrow">한국 여행, 내 방식대로</span><h2 id="mate-intro-title">낯선 한국에서도,<br>여행은 내가 원하는 대로</h2><p>패키지 대신 내 일정으로.<br>한국을 아는 메이트와 함께해요.</p></header><div class="mate-intro-list"><article><span class="mate-intro-icon" aria-hidden="true">${icon('camera')}</span><div><h3>가고 싶은 곳만</h3><p>영상 속 골목부터 최애 카페까지, 내 취향대로.</p></div></article><article><span class="mate-intro-icon" aria-hidden="true">${icon('calendar',30)}</span><div><h3>원하는 시간만큼</h3><p>내 일정에 맞춰 동행하고, 언어와 이동도 함께.</p></div></article><article><span class="mate-intro-icon" aria-hidden="true">${icon('guides')}</span><div><h3>내 예산에 맞게</h3><p>일정과 비용을 비교하고, 메이트는 내가 선택.</p></div></article></div><footer class="rt-card-actions-centered"><strong>어떤 한국을 만나고 싶나요?</strong><p>내 여행에 맞는 제안을 받아 함께할 메이트를 선택해요.</p>${action('함께할 메이트 찾기','home-mate-start')}<span class="mate-intro-note">동행 범위와 비용은 제안에서 미리 확인해요.</span></footer></section>`;
}
function activeMateStep(){
 if(state.booking&&!['cancelled','completed'].includes(state.booking.status))return {route:'booking',label:signupText('trackBooking')};
 if(state.request?.status==='quoted')return {route:'requested',label:signupText('compareOffers')};
 if(state.request?.status==='requested')return {route:'requested',label:signupText('trackRequest')};
 return null;
}
function mateNextButton(kind='secondary'){
 const next=activeMateStep();
 return next?btn(next.label,next.route,kind):btn(signupText('mateRequestPublic'),'request',kind);
}
function requestStops(){stashDay();return [...new Set(state.days.flatMap(d=>d.ids))].filter(id=>place(id));}
function home(){return `<section class="import-card action-import"><div class="import-heading"><span class="import-icon">${icon('link')}</span><div><h1>영상 속 그곳,<br>여행으로!</h1><p class="import-subtext">마음에 든 영상 링크로 여행을 시작해요</p></div></div><form id="extract-form"><label class="sr-only" for="video-url">유튜브 쇼츠 또는 인스타그램 릴스 링크</label><div class="import-input-row"><input id="video-url" type="url" inputmode="url" autocomplete="off" autocapitalize="none" spellcheck="false" aria-describedby="url-error" placeholder="링크를 입력해주세요!" maxlength="2048"><button class="import-search btn light small" type="submit">확인하기</button></div><p id="url-error" class="error" role="alert"></p></form></section>${discoveryPlaces()}`;}
function processing(){const fail=state.extraction==='failed';return `<section class="centerbox card pad extraction-card ${fail?'is-failed':''}" aria-labelledby="extraction-title"><div class="extraction-visual" aria-hidden="true">${icon(fail?'warning':'location',48)}</div><div class="eyebrow">영상 속 장소 찾기</div><h1 id="extraction-title">${fail?'이 영상을 불러올 수 없어요.':'영상에 나온 이름과 위치를 찾고 있어요.'}</h1>${fail?'':`<div class="extraction-progress" aria-hidden="true"><span></span></div><ol class="extraction-stages"><li class="is-complete"><span class="extraction-stage-icon" aria-hidden="true">${icon('check',20)}</span><span>링크 형식 확인 완료</span></li><li class="is-active" aria-current="step"><span class="extraction-stage-icon" aria-hidden="true"></span><span>영상 속 장소 탐색 중</span></li><li class="is-pending"><span class="extraction-stage-icon" aria-hidden="true">3</span><span>장소 이름과 지점 확인</span></li></ol>`}<p class="extraction-note">${fail?'비공개이거나 삭제된 영상일 수 있어요. 공개 링크로 다시 시도하거나, 알고 있는 장소 이름과 주소를 직접 붙여넣어 주세요.':'장소 이름이 같아도 지점은 다를 수 있어요. 결과에서 주소를 확인해 주세요.'}</p><div class="buttons extraction-actions">${fail?`${btn('장소 검색','manual')}${btn('다른 링크 입력','home','secondary')}`:`${btn('돌아가기','home','secondary small')}`}</div></section>`;}
function placeCard(p,mode='result'){const saved=googleRegistered(p)&&libraryIds().includes(p.id);return `<article class="place"><div class="place-thumb">${placeArt(p)}</div><div class="place-main"><h3>${esc(p.name)}</h3><p>${esc(p.type)}${p.area&&p.area!==p.address?' · '+esc(p.area):''}</p>${googleRegistered(p)?'<span class="badge">Google Maps</span>':''}<p>${esc(p.address)}</p>${mode==='result'?`<button type="button" class="btn secondary small" data-action="save-result-place" data-id="${esc(p.id)}" aria-label="${esc(p.name)} · ${saved?'저장됨':'장소 저장'}" ${saved?'disabled':''}>${saved?'저장됨':'장소 저장'}</button>`:`<details class="place-menu"><summary aria-label="${esc(p.name)} · 장소 관리"><span aria-hidden="true">${icon('more')}</span></summary><div class="place-menu-panel rt-action-menu"><div class="rt-action-menu-list"><button class="rt-action-menu-item" data-action="must" data-id="${p.id}" aria-pressed="${state.must.includes(p.id)}">${icon('star',20)}<span>${state.must.includes(p.id)?'꼭 가볼 곳':'꼭 가볼 곳으로 지정'}</span></button><button class="rt-action-menu-item rt-action-menu-item--danger" data-action="remove" data-id="${p.id}">${icon('trash',20)}<span>${mode==='board'?'저장 취소':'삭제'}</span></button></div></div></details>`}</div></article>`;}
function results(){const filtered=state.places.filter(p=>!p.recommended&&(state.filter==='전체'||p.type===state.filter));return `${title('','발견한 장소','')}<p class="source-line">${state.source.startsWith('https:')?`<a href="${esc(state.source)}" target="_blank" rel="noopener noreferrer">원본 영상 확인 ↗</a>`:'성수의 카페와 산책'}</p><div class="sectionhead"><h2>발견한 장소 ${filtered.length}곳</h2>${btn('장소 검색','manual','secondary small')}</div><div class="chips">${['전체','카페','쇼핑','맛집','공원'].map(t=>chip(t,state.filter===t,`data-action="filter" data-value="${t}"`)).join('')}</div><p class="hint">원하는 장소를 각각 저장해 주세요. 같은 이름의 지점은 주소를 확인해 주세요.</p>${filtered.map(p=>placeCard(p)).join('')||'<p class="empty">이 분류에는 아직 장소가 없어요.</p>'}<div class="buttons">${btn('저장한 장소 보기','board','secondary')}</div>`;}
function addingToTrip(){return new URLSearchParams(location.hash.split('?')[1]||'').get('from')==='trips';}
function placeSuggestion(){
 return `<details class="trip-settings"><summary>장소 제안하기</summary><form class="card pad" id="suggest-place-form"><label>장소 이름<input name="name" required maxlength="80"></label><label>주소 또는 동네<input name="address" required maxlength="160"></label><button class="btn secondary" type="submit">제안 저장</button></form></details>`;
}
function manual(){return `<div class="place-picker-page">${placeSearchForm()}</div>`;}
function boardVideoDialog(){modal(`<div class="trip-menu-heading"><h2>링크를 붙여주세요</h2><button type="button" class="textbtn" data-action="close" aria-label="닫기">${icon('close')}</button></div><form id="board-video-form"><label for="board-video-url">유튜브 쇼츠 또는 인스타그램 릴스 링크</label><input id="board-video-url" name="url" type="url" required maxlength="2048" placeholder="링크를 입력해주세요!" autocomplete="off"><p id="board-video-error" class="error" role="alert"></p><div class="board-video-actions"><button type="submit" class="btn">장소 확인</button></div></form>`,'board-video');}
function boardVideoResults(){modal(`<div class="trip-menu-heading"><h2>저장할 장소 선택</h2><button type="button" class="textbtn" data-action="close" aria-label="닫기">${icon('close')}</button></div><form id="board-video-save">${sampleStopIds.map(place).filter(Boolean).map(p=>`<label class="video-place-option"><input type="checkbox" name="places" value="${esc(p.id)}" checked><span><strong>${esc(p.name)}</strong><small>${esc(p.address)}</small></span></label>`).join('')}<p id="board-video-error" class="error" role="alert"></p><div class="buttons"><button type="submit" class="btn">선택한 장소 저장</button>${action('다른 링크 입력','board-video','secondary')}</div></form>`,'board-video');}
let libraryFilter='all';
function boardAddMenu(){modal(`<div class="trip-menu-heading"><h2>장소 저장하기</h2><button type="button" class="textbtn" data-action="close" aria-label="닫기">${icon('close')}</button></div><div class="library-add-options"><button type="button" class="trip-add-option" data-action="board-video">${icon('link')}<span><strong>영상 링크로 장소 저장</strong><small>마음에 든 영상에서 장소를 찾아요.</small></span></button><button type="button" class="trip-add-option" data-action="board-search">${icon('board')}<span><strong>장소 검색해서 저장</strong><small>이름이나 주소로 가고 싶은 곳을 찾아요.</small></span></button></div>`,'trip-menu');}
function board(){
 const places=libraryIds().map(place).filter(googleRegistered),visible=places.filter(p=>libraryFilter==='all'||state.must.includes(p.id));
 return `<section class="saved-library"><div class="library-heading"><h1>나의 장소 <span>${places.length}</span></h1></div>${!places.length?`<div class="card rt-empty-card"><span class="rt-empty-card-icon" aria-hidden="true">${icon('board')}</span><h2>가고 싶은 곳을 저장해 두세요</h2><p>영상에서 발견한 곳도, 검색한 곳도<br>여기에 모아두고 일정에 담아보세요.</p>${action('장소 저장하기','board-add')}</div>`:`<div class="chips library-filters" role="group" aria-label="저장한 장소 필터">${[['all','전체'],['must','꼭 가볼 곳']].map(([key,label])=>chip(label,libraryFilter===key,`data-action="library-filter" data-id="${key}" aria-pressed="${libraryFilter===key}"`)).join('')}</div><div class="library-list">${visible.map(p=>`<div class="library-place">${placeCard(p,'board')}</div>`).join('')||'<div class="library-filter-empty"><p>꼭 가보고 싶은 곳을 골라보세요.</p><p class="hint">장소의 ⋯ 메뉴에서 지정할 수 있어요.</p></div>'}</div><section class="library-trip-footer"><h2>모아둔 장소로 여행을 준비할까요?</h2><p>여행을 선택하고 원하는 장소를 일정에 담아보세요.</p><div class="buttons">${action('새 여행 만들기','new-trip','secondary small')}${btn('내 여행 보기','trips','secondary small')}</div></section>`}</section>`;
}

function timeline(ids=state.board,edit=false){return `<div class="timeline">${ids.map(place).filter(Boolean).map((p,i)=>{return `<article class="stop"><div class="stop-dot">${i+1}</div><div class="stop-card"><div class="timeline-cover">${placeArt(p)}<span>서울 · ${esc(p.area)}</span></div><h3>${esc(p.name)} ${state.must.includes(p.id)?'<span class="badge">꼭 가볼 곳</span>':''}</h3><p>${esc(p.type)}${i?' · 이동시간 확인 필요':''}</p>${edit?`<div class="stop-controls"><button class="iconbtn" aria-label="${esc(p.name)} 위로 이동" data-action="move" data-id="${p.id}" data-dir="-1" ${i===0?'disabled':''}>${icon('arrowUp')}</button><button class="iconbtn" aria-label="${esc(p.name)} 아래로 이동" data-action="move" data-id="${p.id}" data-dir="1" ${i===ids.length-1?'disabled':''}>${icon('arrowDown')}</button></div>`:''}</div></article>`;}).join('')}</div>`;}
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
 return `<div class="route-leg"><strong>도보 약 ${e.minutes}분 <span>· 직선거리 ${distance}</span></strong><a class="route-directions" href="${esc(directions)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(a.name)} → ${esc(b.name)} · Google 지도 길찾기">길찾기 ↗</a><small>${a.demoCoordinates||b.demoCoordinates?'위치 기준 추정':'도보 추정 · 실제 경로와 다를 수 있어요.'}</small></div>`;
}
function planner(){return tripDetail();} // Compatibility for the retired B-06 screen.
function tripOverview(){stashDay();return `<section class="trip-overview"><div class="sectionhead"><div><span class="eyebrow">전체 여행 · 한국 시간</span><h2>${esc(state.title)}</h2></div><span class="badge">${state.days.length}일</span></div>${state.days.map((d,i)=>`<article class="overview-day"><div class="overview-head"><strong>${i+1}일차 · ${esc(d.date)}</strong><button class="textbtn" data-action="overview-day" data-value="${i}">이날 열기 →</button></div><div class="overview-stats"><div><span>방문 장소</span><strong>${d.ids.length}</strong></div></div><ol>${d.ids.map(id=>place(id)).filter(Boolean).map(p=>`<li><span class="overview-place-name">${esc(p.name)}</span></li>`).join('')||'<li>아직 장소가 없어요.</li>'}</ol><span class="hint overview-note">${guided&&state.booking?.date===d.date?'이 날짜의 예약은 아래 예약 상세에서 확인하세요.':'자유 일정 · 이동·대기시간은 별도 확인'}</span></article>`).join('')}${guided&&state.booking?'<p class="hint">일정을 수정해도 확정된 메이트 예약은 변경되지 않아요.</p>':''}</section>`;}
function sampleDay(){
 return {title:signupText('sampleDay'),date:future(),time:'13:00',party:2,stops:sampleStopIds.map(id=>window.REEL_PLACES.find(p=>p.id===id))};
}
function tripWorkspace(){return `<a href="#board" class="trip-library-shortcut" aria-label="저장한 장소" title="저장한 장소">${icon('board')}</a>`;}

function tripPreview(day,cta){
 const rows=day.stops.map((p,i)=>{
  return `<li class="trip-place-row"><span class="trip-place-photo">${placeArt(p)}<b>${i+1}</b></span><div class="trip-place-copy"><strong>${esc(p.name)}</strong><span>${esc(p.area)} · ${esc(p.type)}</span></div></li>`;
 }).join('');
 return `<section class="card pad trip-editor-card trip-plan"><h2>${esc(day.title)}</h2><p>${esc(day.date)}</p>${rows?`<div class="trip-route-heading"><h3>방문 순서</h3><span>${day.stops.length}곳</span></div><ol>${rows}</ol>`:`<div class="trip-empty"><h3>가고 싶은 장소부터 담아보세요</h3><p>저장한 장소를 담으면 하루 일정이 시작돼요.</p>${action('저장한 장소에서 담기','trip-pick-places','secondary')}${btn('새 장소 직접 추가','manual?from=trips','secondary')}</div>`}${cta}</section>`;
}
function tripDateRange(days){const dates=days.map(d=>d.date).sort();return dates[0]===dates.at(-1)?dates[0]:dates[0]+' ~ '+dates.at(-1);}
function tripListCard(t,requestChoice=false){const ids=[...new Set(t.days.flatMap(d=>d.ids))],first=ids.map(place).find(p=>p?.photoURL||(!window.REEL_MAPS_CONFIG?.apiKey&&p?.photo));return `<button type="button" class="my-trip-card" data-action="${requestChoice===true?'request-trip':'open-trip'}" data-id="${esc(t.id)}"><span class="my-trip-cover">${first?placeArt(first):icon('trips')}</span><span class="my-trip-summary"><strong>${esc(t.title)}</strong><span>${esc(tripDateRange(t.days))}</span><small>${t.days.length}일 · ${ids.length}곳</small></span><span class="my-trip-chevron" aria-hidden="true">${icon('chevronRight')}</span></button>`;}
function trips(){
 ensureDays();stashDay();stashTrip();if(isTripDetail()){const id=new URLSearchParams(location.hash.split('?')[1]).get('id');if(id&&id!==state.activeTripId&&!selectTrip(id))return `<section class="trip-unavailable" aria-labelledby="trip-unavailable-title"><h2 id="trip-unavailable-title">여행을 찾을 수 없어요.</h2><p class="muted">여행이 삭제되었거나 링크가 올바르지 않아요.</p><div class="buttons">${btn('내 여행 목록으로','trips')}</div></section>`;return tripDetail();}
 const today=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Seoul'}),past=state.trips.filter(t=>t.days.every(d=>d.date<today)),upcoming=state.trips.filter(t=>!past.includes(t));
 return `<div class="my-trips-heading"><h1>내 여행</h1>${tripWorkspace()}</div><button class="trip-create-banner" type="button" data-action="new-trip"><span aria-hidden="true">${icon('plus')}</span><span><strong>여행 일정 만들기</strong><small>새로운 여행을 준비해 보세요.</small></span></button>${upcoming.length?`<section class="trip-list-section"><h2>다가오는 여행</h2><div class="my-trip-list">${upcoming.map(tripListCard).join('')}</div></section>`:`<section class="trip-list-section"><h2>다가오는 여행</h2><div class="trip-upcoming-empty"><span aria-hidden="true">${icon('trips')}</span><h3>아직 다가오는 여행이 없어요</h3><p>새 여행을 만들고 가고 싶은 장소를 담아보세요.</p></div></section>`}${past.length?`<section class="trip-list-section"><h2>지난 여행</h2><div class="my-trip-list">${past.map(tripListCard).join('')}</div></section>`:''}`;
}
function tripDetailHeader(){ensureDays();return `<header class="trip-detail-header"><a class="app-back" href="#trips" aria-label="내 여행 목록">${icon('chevronLeft')}</a><div><h1>${esc(state.title)}</h1><p>${esc(tripDateRange(state.days))}</p></div><button type="button" class="trip-header-icon" data-action="edit-trip" aria-label="여행 정보 수정">${icon('edit')}</button></header>`;}
function tripDetail(){
 const next=activeMateStep(),linked=state.request?.tripId===state.activeTripId,stops=state.board.map(place).filter(Boolean);
 const requestAction=next?(linked?btn(next.label,next.route):btn('진행 중인 메이트 요청 확인',next.route,'secondary')):requestStops().length?btn(signupText('tripEstimate'),'request'):'';
 const rows=stops.map((p,i)=>{return `<li class="trip-timeline-stop"><span class="trip-stop-number">${i+1}</span><div class="rt-stop-row"><button class="trip-stop-content ${state.focus===p.id?'is-focused':''}" type="button" data-action="focus-place" data-id="${esc(p.id)}" aria-label="지도에서 ${esc(p.name)} 보기"><span><strong>${esc(p.name)}</strong><small>${esc(p.type)} · ${esc(p.area)}</small></span><span class="trip-stop-photo">${placeArt(p)}</span></button><button type="button" class="iconbtn" data-action="trip-stop-menu" data-id="${esc(p.id)}" aria-label="${esc(p.name)} 장소 메뉴" aria-haspopup="dialog">${icon('more')}</button></div>${i<stops.length-1?travelLeg(p,stops[i+1]):''}</li>`;}).join('');
 return `<div class="trip-detail-map">${stops.length?mapPanel():'<div class="trip-map-empty">'+icon('trips')+'<p>장소를 담으면 지도에서 동선을 볼 수 있어요.</p></div>'}</div><section class="trip-detail-sheet"><div class="sheet-handle" aria-hidden="true"></div><div class="trip-day-toolbar">${dayTabs()}</div><div class="trip-day-heading"><h2>Day ${state.day+1}</h2><span><time datetime="${esc(state.date)}">${esc(state.date.slice(5).replace('-','.'))}</time></span></div>${rows?`<ol class="trip-timeline">${rows}</ol>`:`<div class="trip-day-empty"><h3>어디부터 가볼까요?</h3><p>가고 싶은 장소를 일정에 추가해 보세요.</p></div>`}<button class="trip-add-button btn secondary" type="button" data-action="trip-add-menu" aria-haspopup="dialog"><span aria-hidden="true">${icon('plus')}</span>일정에 추가</button><section class="card rt-mate-invite"><span class="rt-mate-invite-eyebrow">${icon('guides',18)} 메이트와 함께하는 여행</span><h3>같이 걸으면,<br>더 좋아질 여행</h3><p>가고 싶던 곳에 메이트의 취향을 더해요.<br>혼자서는 지나쳤을 순간까지 만나보세요.</p><ul class="rt-mate-invite-moments"><li>${icon('local')}<span>동네의 작은 발견</span></li><li>${icon('cafe')}<span>취향이 닮은 카페</span></li><li>${icon('camera')}<span>함께 남기는 사진</span></li></ul><div class="rt-mate-invite-footer"><p>내 여행에 맞는 제안을 받아 함께할 메이트를 선택해요.</p>${requestAction||'<button class="btn" type="button" data-action="trip-add-menu">'+icon('plus',18)+'함께 갈 장소 담기</button>'}</div></section></section>`;
}
function tripStopMenu(id){const i=state.board.indexOf(id),p=place(id);if(i<0||!p)return;modal(`<div class="trip-menu-heading"><h2>${esc(p.name)}</h2><button type="button" class="textbtn" data-action="close" aria-label="닫기">${icon('close')}</button></div><div class="stack">${action(icon('arrowUp',20)+'위로 이동','trip-stop-move','secondary',`data-id="${esc(id)}" data-dir="-1" ${i===0?'disabled':''}`)}${action(icon('arrowDown',20)+'아래로 이동','trip-stop-move','secondary',`data-id="${esc(id)}" data-dir="1" ${i===state.board.length-1?'disabled':''}`)}${action(icon('trash',20)+'일정에서 빼기','trip-stop-remove','secondary',`data-id="${esc(id)}"`)}</div>`,'trip-menu');}
function moveTripPlace(id,dir){const i=state.board.indexOf(id),j=i+dir;if(i<0||![-1,1].includes(dir)||j<0||j>=state.board.length)return false;[state.board[i],state.board[j]]=[state.board[j],state.board[i]];state.saved=false;save();return true;}
function removeTripPlace(id){if(!state.board.includes(id))return false;state.board=state.board.filter(x=>x!==id);state.must=state.must.filter(x=>x!==id);if(state.focus===id)state.focus=null;state.saved=false;save();return true;}
function updateTripDay(field,value){if(field==='date'){if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(Date.parse(value+'T12:00:00Z'))||dateAfter(value,0)!==value)return false;}else if(field==='time'){if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(value))return false;}else return false;state[field]=value;state.saved=false;save();return true;}
function tripDaySettings(){modal(`<div class="trip-menu-heading"><h2>Day ${state.day+1} · 날짜</h2><button type="button" class="textbtn" data-action="close" aria-label="닫기">${icon('close')}</button></div><label>이날 날짜<input type="date" data-trip-day-field="date" required value="${esc(state.date)}"></label><p class="hint">변경한 내용은 자동 저장돼요.</p>`,'trip-menu');}
function tripAddMenu(){modal(`<div class="trip-menu-heading"><h2>Day ${state.day+1}에 추가</h2><button class="textbtn" type="button" data-action="close" aria-label="닫기">${icon('close')}</button></div><button type="button" class="trip-add-option" data-action="trip-pick-places">${icon('board')}<span><strong>저장한 장소에서 담기</strong><small>영상에서 찾은 장소를 일정에 추가해요.</small></span></button><div class="trip-add-grid"><button type="button" data-action="trip-manual">${icon('all')}<strong>새 장소 추가</strong></button></div>`,'trip-menu');}
function tripPlacePicker(){const places=libraryIds().map(place).filter(Boolean);modal(`<div class="trip-menu-heading"><h2>저장한 장소</h2>${action('완료','close','secondary small')}</div><p class="hint">Day ${state.day+1} · ${esc(state.date)}</p><div class="trip-place-picker">${places.map(p=>`<div class="trip-picker-row"><span>${placeArt(p)}</span><div><strong>${esc(p.name)}</strong><small>${esc(p.area)} · ${esc(p.type)}</small></div><button class="btn secondary small" type="button" data-action="trip-add-place" data-id="${esc(p.id)}" ${state.board.includes(p.id)?'disabled':''}>${state.board.includes(p.id)?'담김':'추가'}</button></div>`).join('')||'<p>저장한 장소가 없어요. 새 장소를 추가해 보세요.</p>'}</div>`,'trip-menu');}
function addTripPlace(id){if(!libraryIds().includes(id)||!place(id)||state.board.includes(id)||state.board.length>=20)return false;state.board.push(id);state.saved=false;save();return true;}
function editTripInfo(){modal(`<form id="edit-trip-form"><h2>여행 정보 수정</h2><label>여행 이름<input name="title" required maxlength="70" value="${esc(state.title)}"></label><label>출발일<input name="date" type="date" required value="${esc(state.days[0].date)}"></label><p class="hint">출발일을 바꾸면 모든 날짜가 함께 이동해요.</p><p id="edit-trip-error" role="alert" class="error"></p><div class="buttons"><button type="submit" class="btn">저장</button>${action('취소','close','secondary')}</div></form>`);}
function updateTripInfo(d){const name=String(d.title||'').trim(),date=d.date;if(!name||name.length>70||!/^\d{4}-\d{2}-\d{2}$/.test(date||'')||!Number.isFinite(Date.parse(date+'T12:00:00Z'))||dateAfter(date,0)!==date)return false;stashDay();const shift=Math.round((Date.parse(date)-Date.parse(state.days[0].date))/86400000);state.days.forEach(day=>day.date=dateAfter(day.date,shift));state.date=state.days[state.day].date;state.title=name;state.saved=false;save();return true;}
let guidesTab='requests';
function guideRequests(){
 const r=state.request,list=proposals(),open=r&&['requested','quoted'].includes(r.status)&&!state.booking;
 return `<div class="proposal-inbox">${r?requestInboxCard(r,list,open):`<section class="inbox-empty rt-card-actions-centered rt-card-compact"><span class="inbox-start-icon" aria-hidden="true">${icon('board')}</span><h2>아직 도착한 제안이 없어요!</h2><p>먼저 지역과 여행 기간을 정해 요청을 보내보세요.<br>메이트에게 일정과 금액을 제안받을 수 있어요.</p><button type="button" class="btn" data-action="guides-tab" data-id="discover">여행 메이트 찾기</button></section>`}</div>`;
}
function requestInboxCard(r,list,open){const created=r.createdAt?new Date(r.createdAt).toLocaleDateString(document.documentElement.lang==='en'?'en-US':'ko-KR',{timeZone:'Asia/Seoul',month:'short',day:'numeric'}):'';return `<a href="#requested" class="request-inbox-card"><div class="request-inbox-meta"><span class="request-inbox-status ${open?(list.length?'rt-status-text-primary':'is-open'):state.booking?'':'rt-status-text-ink'}">${open?(list.length?'제안 도착':'제안 기다리는 중'):state.booking?'메이트 선택 완료':'요청 마감'}</span><span>${esc(created)}</span></div><div class="request-inbox-title"><h4>${esc(r.tripTitle||state.title)}</h4><span>제안 ${list.length} <b aria-hidden="true">${icon('chevronRight')}</b></span></div><p class="request-inbox-facts">${requestPeriod(r)} · ${r.party}명 · ${r.requestType==='free'?'자유 견적':(r.stops||[]).length+'곳'}</p></a>`;}


const nicknameDirectoryKey='reeltrip-prototype-nicknames-v1',nicknameOwner='traveler-demo';
let checkedNickname='';
const normalizeNickname=value=>String(value||'').normalize('NFKC').replace(/\s+/gu,'').toLowerCase();
function readNicknameDirectory(){const raw=JSON.parse(localStorage.getItem(nicknameDirectoryKey)||'{}');if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error('Invalid nickname directory');const directory=Object.fromEntries(Object.entries(raw).filter(([,owner])=>owner!=='mate-demo'));const mate=JSON.parse(localStorage.getItem('reeltrip-mate-application-v1')||'null');if(mate?.fields?.name){const name=normalizeNickname(mate.fields.name);if(!directory[name])directory[name]='mate-demo';}return {...directory,[normalizeNickname('\uBBF8\uB098')]:'mate-mina',[normalizeNickname('\uC900')]:'mate-jun'};}
function nicknameProblem(value,directory,currentOwner=nicknameOwner){const display=String(value||'').normalize('NFKC').trim(),canonical=normalizeNickname(display);if(display.length<2||display.length>20||canonical.length<2)return '닉네임은 2~20자로 입력해 주세요.';if(/[\p{Cc}\p{Cf}]/u.test(display))return '사용할 수 없는 문자가 포함되어 있어요.';if(['\uB9B4\uD2B8\uB9BD','reeltrip','\uC6B4\uC601\uD300','\uACE0\uAC1D\uC13C\uD130','\uAD00\uB9AC\uC790'].some(word=>canonical.includes(word)))return '운영 계정으로 오해할 수 있는 이름은 사용할 수 없어요.';const owner=directory[canonical];return owner&&owner!==currentOwner?'이미 사용 중인 닉네임이에요. 다른 이름을 입력해 주세요.':'';}
function setNicknameStatus(text='',valid=null){const input=$('#profile-nickname'),message=$('#nickname-status');message.textContent=text;if(valid===null)delete message.dataset.valid;else message.dataset.valid=String(valid);input.setAttribute('aria-invalid',String(valid===false));}
function checkNickname(){const input=document.querySelector('#profile-form [name="nickname"]');checkedNickname='';try{const problem=nicknameProblem(input.value,readNicknameDirectory());setNicknameStatus(problem||'사용할 수 있는 닉네임이에요.',!problem);if(!problem)checkedNickname=normalizeNickname(input.value);}catch{setNicknameStatus('중복 확인을 완료하지 못했어요. 다시 시도해 주세요.',false);}}
function mateNameProblem(value){try{return nicknameProblem(value,readNicknameDirectory(),'mate-demo');}catch{return '중복 확인을 완료하지 못했어요. 다시 시도해 주세요.';}}
function checkMateName(){const input=$('#mate-name'),message=$('#mate-name-status'),editing=!!$('#mate-edit-form'),a=editing?mateEditDraft:mateApplication();if(editing?!canEditMate():['pending','approved'].includes(a.status))return;const problem=mateNameProblem(input.value);message.textContent=problem||'사용할 수 있는 닉네임이에요.';input.setAttribute('aria-invalid',String(!!problem));a.fields.name=input.value.normalize('NFKC').trim();a.fields.nameChecked=problem?'':normalizeNickname(input.value);if(!editing)saveMate(a);}
function mateNameField(a){return `<div class="mate-field"><label for="mate-name">활동 이름</label><div class="nickname-entry"><input id="mate-name" class="text-field" name="name" required minlength="2" maxlength="20" value="${esc(a.fields.name||'')}" placeholder="사용할 활동 이름을 직접 입력해 주세요." aria-describedby="mate-name-status"><button type="button" class="nickname-check btn secondary small" data-action="check-mate-name">중복 확인</button></div><p id="mate-name-status" class="nickname-status" role="status" aria-live="polite"></p></div>`;}
let profileDraftPhoto='';
function profileAvatar(photo=state.profile?.photo){return photo?`<img src="${esc(photo)}" alt="프로필 사진">`:icon('account');}
function profilePhotoControl(prefix,photo,removeAction){return `<div class="profile-photo-editor"><div class="profile-photo-preview" id="${prefix}-photo-preview">${profileAvatar(photo)}</div><label class="profile-camera-button" id="${prefix}-camera-button" aria-label="사진 선택" ${photo?'hidden':''}>${icon('camera')}<span class="sr-only">사진 선택</span><input id="${prefix}-photo" type="file" accept="image/jpeg,image/png,image/webp"></label><button type="button" class="profile-photo-clear" id="${prefix}-photo-clear" data-action="${removeAction}" aria-label="사진 삭제" ${photo?'':'hidden'}><span aria-hidden="true">${icon('close')}</span></button></div>`;}
function editProfile(){if(!isGuest())ensureMemberNickname();checkedNickname='';profileDraftPhoto=state.profile?.photo||'';modal(`<form id="profile-form" novalidate><div class="profile-dialog-heading"><h2>프로필 편집</h2><button type="button" class="textbtn" data-action="close" aria-label="닫기">${icon('close')}</button></div>${profilePhotoControl('profile',profileDraftPhoto,'remove-profile-photo')}<p class="hint">JPG·PNG·WebP · 최대 1MB</p><label class="field-label" for="profile-nickname">닉네임</label><div class="nickname-entry"><input id="profile-nickname" class="text-field" aria-invalid="false" name="nickname" required minlength="2" maxlength="20" value="${esc(state.profile?.nickname||'')}" placeholder="어떻게 불러드릴까요?" autocomplete="nickname" aria-describedby="nickname-status"><button type="button" class="nickname-check btn secondary small" data-action="check-nickname">중복 확인</button></div><p id="nickname-status" class="nickname-status" role="status" aria-live="polite"></p><p id="profile-error" class="error" role="alert"></p><button type="submit" id="profile-save" class="btn">저장</button></form>`);}
function upcomingBookings(bookings=[state.booking]){
 const today=new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Seoul'});
 return bookings.filter(b=>b&&b.status==='confirmed'&&(b.endDate||b.date)>=today).sort((a,b)=>`${a.date}T${a.time||'00:00'}`.localeCompare(`${b.date}T${b.time||'00:00'}`));
}
const mateKey='reeltrip-mate-application-v1';
// Keep legacy step IDs 1–4 so saved drafts resume at the same section.
function mateBio(fields){return [fields.bio,fields.localContext,fields.pace,fields.help].filter(value=>typeof value==='string'&&value.trim()).join('\n\n');}
function mateApplication(){try{const a=JSON.parse(localStorage.getItem(mateKey)||'null')||{status:'draft',step:1,fields:{}};a.step=Math.min(4,Math.max(1,a.step||1));a.fields=a.fields||{};a.fields.bio=mateBio(a.fields);for(const key of ['localContext','pace','help'])delete a.fields[key];return a;}catch{return {status:'draft',step:1,fields:{}};}}
function saveMate(a){try{localStorage.setItem(mateKey,JSON.stringify(a));window.ReelAccess.syncMate?.();return true;}catch{toast('신청 내용을 저장하지 못했어요. 다시 시도해 주세요.');return false;}}
const mateSpecialties=['동네 산책','맛집·카페','문화·역사','쇼핑','사진 명소','맞춤 여행'];
const mateSteps=['지역·언어','프로필','휴대폰 인증','최종 확인'];
const mateStatus=s=>({draft:'작성 중',pending:'심사 중',needs_info:'보완 요청',rejected:'승인 거절',approved:'등록 완료'})[s]||s;
function mateEntry(){const a=mateApplication();return `<a class="mate-entry" href="#mate-register"><span class="mate-entry-content"><span class="mate-entry-heading"><span class="mate-entry-icon" aria-hidden="true">${icon('local')}</span><strong>${a.status==='draft'?'메이트로 등록하기':'메이트 등록 상태'}</strong></span><small>${a.status==='draft'?'현지에 사는 누구나, 여행을 함께해요':mateStatus(a.status)}</small></span><span class="mate-entry-arrow" aria-hidden="true">${icon('external')}</span></a>`;}
const mateLanguages={en:'영어',ja:'일본어',zh:'중국어',ko:'한국어'};
const mateLanguageValues=value=>Array.isArray(value)?value:typeof value==='string'&&value?[value]:[];
const validMateLanguages=value=>{const values=mateLanguageValues(value);return values.length>0&&values.every(id=>Object.hasOwn(mateLanguages,id))&&new Set(values).size===values.length;};
const mateLanguageText=value=>mateLanguageValues(value).map(id=>mateLanguages[id]).filter(Boolean).join(', ');
const mateCities=['서울','부산','대구','인천','광주','대전','울산','세종','경기','강원','충북','충남','전북','전남','경북','경남','제주'];
// Persisted city/district indexes: keep ordering stable; append additions.
// 2026-11: Incheon reorganization and Hwaseong general districts included.
// Sources: https://www.incheon.go.kr/IC01070101
// https://www.seohae.go.kr/open_content/main/bbs/bbsMsgDetail.do?bcd=report&msg_seq=18773
// https://www.hscity.go.kr/www/intro/gnrlSttus/hscityMapDown.jsp
const mateDistricts=[
 ["종로구","중구","용산구","성동구","광진구","동대문구","중랑구","성북구","강북구","도봉구","노원구","은평구","서대문구","마포구","양천구","강서구","구로구","금천구","영등포구","동작구","관악구","서초구","강남구","송파구","강동구"],
 ["중구","서구","동구","영도구","부산진구","동래구","남구","북구","해운대구","사하구","금정구","강서구","연제구","수영구","사상구","기장군"],
 ["중구","동구","서구","남구","북구","수성구","달서구","달성군","군위군"],
 ["제물포구","영종구","미추홀구","연수구","남동구","부평구","계양구","서해구","검단구","강화군","옹진군"],
 ["동구","서구","남구","북구","광산구"],
 ["동구","중구","서구","유성구","대덕구"],
 ["중구","남구","동구","북구","울주군"],
 [],
 ["수원시 장안구","수원시 권선구","수원시 팔달구","수원시 영통구","성남시 수정구","성남시 중원구","성남시 분당구","의정부시","안양시 만안구","안양시 동안구","부천시 원미구","부천시 소사구","부천시 오정구","광명시","평택시","동두천시","안산시 상록구","안산시 단원구","고양시 덕양구","고양시 일산동구","고양시 일산서구","과천시","구리시","남양주시","오산시","시흥시","군포시","의왕시","하남시","용인시 처인구","용인시 기흥구","용인시 수지구","파주시","이천시","안성시","김포시","화성시 만세구","화성시 효행구","화성시 병점구","화성시 동탄구","광주시","양주시","포천시","여주시","연천군","가평군","양평군"],
 ["춘천시","원주시","강릉시","동해시","태백시","속초시","삼척시","홍천군","횡성군","영월군","평창군","정선군","철원군","화천군","양구군","인제군","고성군","양양군"],
 ["청주시 상당구","청주시 서원구","청주시 흥덕구","청주시 청원구","충주시","제천시","보은군","옥천군","영동군","증평군","진천군","괴산군","음성군","단양군"],
 ["천안시 동남구","천안시 서북구","공주시","보령시","아산시","서산시","논산시","계룡시","당진시","금산군","부여군","서천군","청양군","홍성군","예산군","태안군"],
 ["전주시 완산구","전주시 덕진구","군산시","익산시","정읍시","남원시","김제시","완주군","진안군","무주군","장수군","임실군","순창군","고창군","부안군"],
 ["목포시","여수시","순천시","나주시","광양시","담양군","곡성군","구례군","고흥군","보성군","화순군","장흥군","강진군","해남군","영암군","무안군","함평군","영광군","장성군","완도군","진도군","신안군"],
 ["포항시 남구","포항시 북구","경주시","김천시","안동시","구미시","영주시","영천시","상주시","문경시","경산시","의성군","청송군","영양군","영덕군","청도군","고령군","성주군","칠곡군","예천군","봉화군","울진군","울릉군"],
 ["창원시 의창구","창원시 성산구","창원시 마산합포구","창원시 마산회원구","창원시 진해구","진주시","통영시","사천시","김해시","밀양시","거제시","양산시","의령군","함안군","창녕군","고성군","남해군","하동군","산청군","함양군","거창군","합천군"],
 ["제주시","서귀포시"]
];
const mateDistrictsFor=city=>mateDistricts[city]||[];
let mateRegionDraft=[],mateRegionCity=0;
function mateRegionText(regions){return (regions||[]).map(r=>mateCities[r.city]+' '+(r.district==='all'?'전체':mateDistrictsFor(r.city)[r.district])).join(', ');}
function validMateRegions(regions){return Array.isArray(regions)&&regions.length>0&&regions.every(r=>r&&Number.isInteger(r.city)&&r.city>=0&&r.city<mateCities.length&&(r.district==='all'||Number.isInteger(r.district)&&r.district>=0&&r.district<mateDistrictsFor(r.city).length));}
function mateRegionSheet(open=true){
 const city=mateRegionCity,districts=mateDistrictsFor(city),all=mateRegionDraft.some(r=>r.city===city&&r.district==='all');
 const html=`<section class="mate-region-sheet rt-sheet"><div class="rt-sheet-head"><header><h2 id="mate-region-title">활동 지역 선택</h2><button type="button" class="mate-close" data-action="close" aria-label="닫기">${icon('close')}</button></header><p>함께할 수 있는 지역을 모두 선택해 주세요.</p><label for="mate-city">시·도</label><select id="mate-city">${mateCities.map((v,i)=>`<option value="${i}" ${city===i?'selected':''}>${v}</option>`).join('')}</select><button type="button" class="mate-region-all" data-action="mate-region-toggle" data-id="all" aria-pressed="${all}">${icon(all?'check':'plus',20)} ${mateCities[city]} 전체</button></div><div class="rt-sheet-body" data-city="${city}">${districts.length?`<div class="mate-region-chips rt-choice-grid">${districts.map((v,i)=>`<button type="button" class="rt-choice-button" data-action="mate-region-toggle" data-id="${i}" aria-pressed="${all||mateRegionDraft.some(r=>r.city===city&&r.district===i)}">${v}</button>`).join('')}</div>`:'<p class="muted">세종은 하위 시·군·구가 없어 전체 지역으로 선택해요.</p>'}</div><footer class="rt-sheet-footer"><p class="mate-region-selection" aria-live="polite">${esc(mateRegionText(mateRegionDraft)||'선택한 지역이 없어요.')}</p><button type="button" class="btn" data-action="mate-region-done" ${mateRegionDraft.length?'':'disabled'}>선택 완료</button></footer></section>`;
 if(open)modal(html,'mate-region');else{
  const d=$('#dialog'),body=d.querySelector?.('.rt-sheet-body'),scroll=body?.dataset.city===String(city)?body.scrollTop:0;
  const active=document.activeElement,focusId=active?.dataset?.action==='mate-region-toggle'?active.dataset.id:null,cityFocused=active?.id==='mate-city';
  d.innerHTML=interfaceMarkup(html);
  const next=d.querySelector?.('.rt-sheet-body');if(next)next.scrollTop=scroll;
  if(cityFocused)d.querySelector?.('#mate-city')?.focus({preventScroll:true});
  else if(focusId!==null)d.querySelector?.(`[data-action="mate-region-toggle"][data-id="${focusId}"]`)?.focus({preventScroll:true});
 }
}
function toggleMateRegion(id){const city=mateRegionCity,district=id==='all'?'all':Number(id);if(!validMateRegions([{city,district}]))return;const found=mateRegionDraft.some(r=>r.city===city&&r.district===district);if(district==='all'){mateRegionDraft=mateRegionDraft.filter(r=>r.city!==city);if(!found)mateRegionDraft.push({city,district});}else{if(mateRegionDraft.some(r=>r.city===city&&r.district==='all')){mateRegionDraft=mateRegionDraft.filter(r=>r.city!==city);mateRegionDraft.push(...mateDistrictsFor(city).map((_,district)=>({city,district})).filter(r=>r.district!==district));}else if(found)mateRegionDraft=mateRegionDraft.filter(r=>r.city!==city||r.district!==district);else mateRegionDraft.push({city,district});}mateRegionSheet(false);}
function resetMateScroll(){window.scrollTo(0,0);$('#main')?.scrollTo?.(0,0);}
function matePublicPreview(a){const f=a.fields;return `<section class="card pad mate-public-preview"><h2>공개 프로필 미리보기</h2><div class="profile-photo-preview">${profileAvatar(f.photo||'')}</div><h3>${esc(f.name||'—')}</h3><span class="badge">본인 작성 · 미검증</span><dl class="mate-summary">${[['활동 분야',mateSpecialties[Number(f.specialty)]],['활동 지역',mateRegionText(f.regions)],['사용 언어',mateLanguageText(f.languages)],['자기소개',mateBio(f)]].filter(([,v])=>v).map(([k,v])=>`<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl></section>`;}
let matePhotoRead=0;
function readMatePhoto(input){const file=input.files?.[0];if(!file)return;const token=++matePhotoRead,error=$('#mate-photo-error');if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>1048576){error.textContent='1MB 이하의 JPG·PNG·WebP 사진을 선택해 주세요.';input.value='';return;}error.textContent='';const reader=new FileReader();reader.onload=()=>{const a=mateApplication();if(token!==matePhotoRead||['pending','approved'].includes(a.status))return;a.fields.photo=reader.result;if(saveMate(a)&&$('#mate-photo-preview')){$('#mate-photo-preview').innerHTML=profileAvatar(a.fields.photo);if($('#mate-photo-clear'))$('#mate-photo-clear').hidden=false;if($('#mate-camera-button'))$('#mate-camera-button').hidden=true;}};reader.onerror=()=>{if($('#mate-photo-error'))$('#mate-photo-error').textContent='사진을 불러오지 못했어요. 다시 선택해 주세요.';};reader.readAsDataURL(file);}
function matePhotoEditor(a){return `<div class="mate-photo-editor"><span class="mate-field-label" id="mate-photo-label">프로필 사진</span>${profilePhotoControl('mate',a.fields.photo||'','mate-photo-remove')}<small>얼굴을 알아볼 수 있는 사진을 권장해요.</small><p id="mate-photo-error" role="alert"></p></div>`;}
function mateSummary(a){const f=a.fields;return `${matePublicPreview(a)}<h2>아래 정보는 공개되지 않아요</h2><dl class="mate-summary">${[['연락처',f.contact]].map(([k,v])=>`<div><dt>${k}</dt><dd>${esc(v||'—')}</dd></div>`).join('')}</dl>`;}
function mateField(a,name,label,extra='',area=false,required=true){return `<label>${label}${area?`<textarea name="${name}" ${required?'required':''} ${extra}>${esc(a.fields[name]||'')}</textarea>`:`<input name="${name}" ${required?'required':''} value="${esc(a.fields[name]||'')}" ${extra}>`}</label>`;}
// UI-only verification. Never use this browser-local state as proof of phone ownership.
let matePhoneDemo={phone:'',sentAt:0,verified:false,attempts:0};
const matePhoneDigits=value=>String(value||'').replace(/[^0-9]/g,'');
function matePhoneVerified(a){return matePhoneDemo.verified&&matePhoneDemo.phone===matePhoneDigits(a.fields.contact);}
function matePhoneUI(a){const verified=matePhoneVerified(a),sent=matePhoneDemo.sentAt&&matePhoneDemo.phone===matePhoneDigits(a.fields.contact);return `<p class="hint">문자 인증 시연 화면이에요. 실제 문자는 발송되지 않아요.</p>${verified?'':`<button type="button" class="btn secondary" data-action="mate-phone-send">${sent?'인증번호 재전송':'인증번호 받기'}</button>`}${sent&&!verified?`<p class="hint">시연용 인증번호: 123456 · 유효시간 3분 · 재전송은 30초 후 가능해요.</p><label>인증번호 6자리<input id="mate-phone-code" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}" placeholder="6자리 숫자" aria-describedby="mate-phone-status"></label><button type="button" class="btn secondary" data-action="mate-phone-verify">인증번호 확인</button>`:''}<p id="mate-phone-status" role="status" aria-live="polite">${verified?'인증번호 확인이 완료되었어요.':''}</p>`;}
function matePhoneAction(kind){const form=$('#mate-form');if(!form||isGuest())return;const a=captureMate(form,mateApplication());if(['pending','approved'].includes(a.status))return;if(!validMatePhone(a.fields.contact)){toast('010으로 시작하는 핸드폰 번호를 확인해 주세요.');return;}const phone=matePhoneDigits(a.fields.contact),now=Date.now();if(kind==='send'){if(matePhoneDemo.sentAt&&now-matePhoneDemo.sentAt<30000){toast('재전송은 30초 후 가능해요.');return;}matePhoneDemo={phone,sentAt:now,verified:false,attempts:0};saveMate(a);render();$('#mate-phone-code')?.focus();return;}const message=$('#mate-phone-status'),code=$('#mate-phone-code')?.value||'';if(!message)return;if(phone!==matePhoneDemo.phone||!matePhoneDemo.sentAt){message.textContent='인증번호를 먼저 요청해 주세요.';return;}if(now-matePhoneDemo.sentAt>=180000){message.textContent='인증번호가 만료됐어요. 다시 요청해 주세요.';return;}if(matePhoneDemo.attempts>=5){message.textContent='입력 횟수를 초과했어요. 인증번호를 다시 요청해 주세요.';return;}if(!/^[0-9]{6}$/.test(code)){message.textContent='인증번호 6자리를 입력해 주세요.';return;}matePhoneDemo.attempts++;if(code!=='123456'){message.textContent='인증번호가 일치하지 않아요.';return;}matePhoneDemo.verified=true;saveMate(a);render();}
function mateRegistration(){
 const a=mateApplication(),step=Math.min(4,Math.max(1,a.step||1));
 if(['pending','approved'].includes(a.status))return `<section class="mate-onboarding rt-card-stack"><section class="card pad rt-status-card rt-card-actions-centered"><span class="rt-status-symbol" aria-hidden="true">${icon(a.status==='approved'?'check':'clock',32)}</span>${a.status==='pending'?`<span class="badge">${mateStatus(a.status)}</span>`:''}<h1>${a.status==='approved'?'메이트 등록이 완료됐어요':'신청서를 검토하고 있어요'}</h1><p>${a.status==='approved'?'이제 메이트 모드에서 여행을 확인하고 제안할 수 있어요.':'관리자가 승인하면 메이트로 활동할 수 있어요!'}</p>${a.status==='approved'?'<button class="btn" data-access-mode="guide">메이트로 활동하기</button>':''}</section><details class="card rt-disclosure-card"><summary><span>제출한 신청서 보기</span>${icon('chevronDown',20)}</summary><div class="rt-disclosure-body">${mateSummary(a)}</div></details>${a.status==='pending'?'<p class="rt-status-note">심사 중에도 여행자 기능은 이용할 수 있어요.</p>':''}</section>`;
 let body='';
 if(step===1)body=`<h1>어디에서 함께할까요?</h1><p>활동할 지역과 사용할 언어를 선택해 주세요.</p><div class="mate-field"><span>활동 지역</span><button class="mate-region-trigger" type="button" data-action="mate-region-open">${esc(mateRegionText(a.fields.regions)||'활동 지역 선택')}<span aria-hidden="true">${icon('plus')}</span></button></div><fieldset class="mate-language"><legend>사용 언어</legend><p>여행자와 소통할 수 있는 언어를 모두 선택해 주세요.</p><div class="rt-multi-choice-group">${Object.entries(mateLanguages).map(([id,label])=>`<label class="rt-multi-choice"><input type="checkbox" name="languages" value="${id}" ${mateLanguageValues(a.fields.languages).includes(id)?'checked':''}><span>${label}</span></label>`).join('')}</div></fieldset>`;
 if(step===2)body=`${matePhotoEditor(a)}${mateNameField(a)}${mateField(a,'bio','자기소개','class="rt-textarea-large" rows="8" minlength="10" maxlength="1000" placeholder="동네와의 인연, 함께 걷는 스타일, 도와줄 수 있는 일을 자유롭게 소개해 주세요."',true)}`;
 if(step===3)body=`<h1>연락받을 핸드폰 번호를 알려주세요</h1>${mateField(a,'contact','연락 가능한 핸드폰 번호','type="tel" inputmode="tel" autocomplete="tel-national" maxlength="13" pattern="010[ -]?[0-9]{4}[ -]?[0-9]{4}" placeholder="010-1234-5678"')}${matePhoneUI(a)}<button type="button" class="textbtn" data-action="mate-contact-support">핸드폰 번호가 없으신가요?</button>`;
 if(step===4)body=`<h1>신청 전 마지막으로 확인해 주세요</h1>${mateSummary(a)}<label class="check"><input type="checkbox" name="policy" required ${a.fields.policy?'checked':''}>여행자가 선택하면 메이트가 매칭 수수료 10%를 결제해야 예약이 확정되며, 여행비는 현장에서 현금으로 직접 받는 것을 확인했어요.</label><label class="check"><input type="checkbox" name="consent" required ${a.fields.consent?'checked':''}>신청 정보의 심사 이용과 승인 후 공개 프로필 정보의 노출에 동의해요.</label><p class="muted">관리자가 승인하면 메이트로 활동할 수 있어요!</p>`;
 return `<section class="mate-onboarding"><header><a href="#account">닫기 · 이어서 작성 가능</a><strong>메이트 등록</strong></header>${step===2?'':`<div class="mate-progress"><progress max="4" value="${step}" aria-label="등록 진행 단계"></progress><span>${step} / 4</span></div><p class="eyebrow">${mateSteps[step-1]}</p>`}${['needs_info','rejected'].includes(a.status)?`<aside class="notice"><strong>${mateStatus(a.status)}</strong><p>${esc(a.reason)}</p><p>내용을 수정한 뒤 다시 심사를 요청해 주세요.</p></aside>`:''}<form id="mate-form" data-step="${step}">${body}<div class="mate-form-actions">${step>1?'<button type="button" class="btn secondary" data-action="mate-back">이전</button>':''}<button class="btn" type="submit">${step===4?'심사 요청하기':'다음'}</button></div></form></section>`;
}
function captureMate(f,a){const languageInputs=Array.from(f.elements).filter(el=>el.name==='languages'&&el.type==='checkbox');if(languageInputs.length)a.fields.languages=languageInputs.filter(el=>el.checked).map(el=>el.value);for(const el of f.elements){if(el.name==='languages'&&el.type==='checkbox')continue;if(!el.name||el.type==='file')continue;if(el.type==='radio'){if(el.checked)a.fields[el.name]=el.value;}else a.fields[el.name]=el.type==='checkbox'?el.checked:el.value;}if(a.fields.nameChecked!==normalizeNickname(a.fields.name))delete a.fields.nameChecked;return a;}
function validMatePhone(value){return /^010[ -]?[0-9]{4}[ -]?[0-9]{4}$/.test(String(value||'').trim());}
function validMate(a){const f=a.fields;return ['languages','name','bio','contact'].every(k=>String(f[k]||'').trim())&&validMateRegions(f.regions)&&validMateLanguages(f.languages)&&f.name.trim().length>=2&&!mateNameProblem(f.name)&&f.bio.trim().length>=10&&f.bio.length<=1000&&!!f.photo&&validMatePhone(f.contact)&&f.policy&&f.consent;}
function submitMate(f){const a=mateApplication();if(['pending','approved'].includes(a.status))return;captureMate(f,a);if([3,4].includes(a.step)&&!matePhoneVerified(a)){a.step=3;saveMate(a);render();toast('휴대폰 인증을 완료해 주세요.');return;}if(a.step===3&&!validMatePhone(a.fields.contact)){toast('010으로 시작하는 핸드폰 번호를 확인해 주세요.');return;}if(a.step===1&&(!validMateRegions(a.fields.regions)||!validMateLanguages(a.fields.languages))){toast('활동 지역과 언어를 선택해 주세요.');return;}if(a.step===2&&(!a.fields.photo||!a.fields.name?.trim()||a.fields.name.trim().length<2||!a.fields.bio||a.fields.bio.trim().length<10||a.fields.bio.length>1000)){toast('프로필 사진, 활동 이름, 자기소개를 모두 입력해 주세요.');return;}if(a.step===2||a.step===4){const problem=mateNameProblem(a.fields.name);if(problem){toast(problem);return;}if(a.fields.nameChecked!==normalizeNickname(a.fields.name)){toast('닉네임 중복 확인을 먼저 해주세요.');return;}}if(a.step===4){if(!validMate(a)){toast('필수 정보를 확인해 주세요.');return;}a.status='pending';a.submittedAt=new Date().toISOString();a.reason='';}else a.step=(a.step||0)+1;if(saveMate(a)){render();resetMateScroll();}}
function mateAdmin(){const a=mateApplication();return side('admin',`${title('메이트 등록 심사','신청서 검토','')}<section class="card pad"><span class="badge">${mateStatus(a.status)}</span>${a.status==='draft'?'<p>제출된 신청서가 없어요.</p>':`${mateSummary(a)}${a.reason?`<p class="notice">${esc(a.reason)}</p>`:''}${a.status==='pending'?`<form id="mate-review-form">${['활동 지역·언어·소개가 적합한지 확인했어요','연락처·본인·관련 자격 확인 결과를 검토했어요','수수료·현금 지급 조건 동의를 확인했어요'].map(t=>`<label class="check"><input type="checkbox" name="reviewCheck" required>${t}</label>`).join('')}<label>보완·거절 사유<textarea name="reason" maxlength="1000" placeholder="신청자가 수정할 내용을 구체적으로 적어주세요"></textarea></label><div class="buttons"><button class="btn" type="submit">승인 · 메이트 등록 완료</button><button class="btn secondary" type="button" data-action="mate-review" data-id="needs_info">보완 요청</button><button class="btn secondary" type="button" data-action="mate-review" data-id="rejected">거절</button></div></form>`:''}`}</section>`);}
function reviewMate(status,reason=''){if(!window.ReelAccess.isAdmin)return false;const a=mateApplication();if(a.status!=='pending')return false;if(status!=='approved'&&!reason.trim()){toast('보완·거절 사유를 입력해 주세요.');return false;}a.status=status;a.reason=reason.trim();a.reviewedAt=new Date().toISOString();return saveMate(a);}

// Approved mate edits stay in memory until explicit save.
let mateEditDraft=null,mateEditSection='profile',mateEditPhotoLoading=false;
function canEditMate(){return !isGuest()&&window.ReelAccess.mode()==='guide'&&mateApplication().status==='approved';}
function editMate(section,resume=false){
 if(!canEditMate())return;
 if(!resume){mateEditDraft=mateApplication();mateEditSection=section;mateEditPhotoLoading=false;matePhotoRead++;}
 const a=mateEditDraft,f=a.fields;
 const body=mateEditSection==='profile'?`${profilePhotoControl('mate-edit',f.photo||'','mate-edit-photo-remove')}<p class="hint">JPG·PNG·WebP · 최대 1MB</p>${mateNameField(a)}${mateField(a,'bio','자기소개','class="rt-textarea-large" rows="8" minlength="10" maxlength="1000"',true)}`:`<label>활동 분야<select name="specialty" required><option value="">활동 분야 선택</option>${mateSpecialties.map((label,i)=>`<option value="${i}" ${String(f.specialty)===String(i)?'selected':''}>${label}</option>`).join('')}</select></label><div class="mate-field"><span>활동 지역</span><button type="button" class="mate-region-trigger" data-action="mate-edit-region">${esc(mateRegionText(f.regions)||'활동 지역 선택')}${icon('plus')}</button></div><fieldset class="mate-language"><legend>사용 언어</legend><div class="rt-multi-choice-group">${Object.entries(mateLanguages).map(([id,label])=>`<label class="rt-multi-choice"><input type="checkbox" name="languages" value="${id}" ${mateLanguageValues(f.languages).includes(id)?'checked':''}><span>${label}</span></label>`).join('')}</div></fieldset>`;
 modal(`<form id="mate-edit-form"><h2>${mateEditSection==='profile'?'메이트 프로필 편집':'메이트 활동 정보 수정'}</h2>${body}<p id="mate-edit-error" class="error" role="alert"></p><div class="buttons">${action('취소','close','secondary')}<button type="submit" class="btn" id="mate-edit-save">저장</button></div></form>`);
}
function saveMateEdit(form){
 if(!canEditMate()||!mateEditDraft||mateEditPhotoLoading)return;
 captureMate(form,mateEditDraft);const f=mateEditDraft.fields,current=mateApplication();let problem='';
 if(mateEditSection==='profile'){
  f.name=String(f.name||'').normalize('NFKC').trim();f.bio=String(f.bio||'').trim();
  const changed=f.name!==current.fields.name;
  problem=changed?mateNameProblem(f.name):'';
  if(!problem&&(f.bio.length<10||f.bio.length>1000))problem='자기소개는 10~1,000자로 입력해 주세요.';
  if(!problem&&changed&&f.nameChecked!==normalizeNickname(f.name))problem='닉네임 중복 확인을 먼저 해주세요.';
 }else if(!validMateRegions(f.regions)||!validMateLanguages(f.languages)||!/^\d+$/.test(String(f.specialty))||!mateSpecialties[Number(f.specialty)])problem='활동 분야, 지역과 언어를 선택해 주세요.';
 if(problem){$('#mate-edit-error').textContent=problem;return;}
 const keys=mateEditSection==='profile'?['name','nameChecked','photo','bio']:['specialty','regions','languages'];
 for(const key of keys)current.fields[key]=f[key];
 if(mateEditSection==='activity'){current.fields.region=mateRegionText(f.regions);delete current.fields.range;}
 if(saveMate(current)){mateEditDraft=null;$('#dialog').close();render();toast('메이트 정보를 저장했어요.');}
}
function readMateEditPhoto(input){
 const file=input.files?.[0],draft=mateEditDraft;if(!file||!draft)return;
 const error=$('#mate-edit-error');if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>1048576){error.textContent='1MB 이하의 JPG·PNG·WebP 사진을 선택해 주세요.';input.value='';return;}
 const token=++matePhotoRead,form=$('#mate-edit-form');mateEditPhotoLoading=true;$('#mate-edit-save').disabled=true;error.textContent='';
 const reader=new FileReader();const active=()=>token===matePhotoRead&&draft===mateEditDraft&&form===$('#mate-edit-form')&&$('#dialog').open;
 reader.onload=()=>{if(!active())return;draft.fields.photo=reader.result;mateEditPhotoLoading=false;$('#mate-edit-save').disabled=false;$('#mate-edit-photo-preview').innerHTML=profileAvatar(reader.result);$('#mate-edit-photo-clear').hidden=false;$('#mate-edit-camera-button').hidden=true;};
 reader.onerror=()=>{if(!active())return;mateEditPhotoLoading=false;$('#mate-edit-save').disabled=false;error.textContent='사진을 불러오지 못했어요. 다시 선택해 주세요.';};reader.readAsDataURL(file);
}

function mateAccount(){
 const a=mateApplication(),f=a.fields||{};
 const rows=[['활동 분야',f.specialty!==undefined?mateSpecialties[Number(f.specialty)]:''],['활동 지역',mateRegionText(f.regions)],['사용 언어',mateLanguageText(f.languages)]];
 return `<section class="my-page"><div class="my-heading"><h1>마이</h1><a class="my-settings-button" href="#settings" aria-label="설정">${icon('settings')}</a></div><div class="rt-card-stack"><section class="card pad rt-profile-card"><div class="rt-profile-identity"><span class="my-avatar">${profileAvatar(f.photo||'')}</span><div><span class="rt-profile-label">메이트 프로필</span><h2>${esc(f.name||'메이트')}</h2></div></div><p class="rt-profile-bio">${esc(f.bio||'등록한 소개가 없어요.')}</p><div class="rt-card-actions"><button type="button" class="btn secondary small" data-action="mate-edit-profile">${icon('edit',18)} 프로필 편집</button></div></section><section class="card pad rt-info-card"><h2>메이트 활동 정보</h2>${rows.some(([,value])=>value)?`<dl class="rt-fact-list">${rows.filter(([,value])=>value).map(([label,value])=>`<div><dt>${label}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl>`:'<p class="rt-info-note">등록한 활동 정보가 없어요.</p>'}<div class="rt-card-actions"><button type="button" class="btn secondary small" data-action="mate-edit-activity">${icon('edit',18)} 활동 정보 수정</button></div></section><section class="card pad rt-info-card rt-info-card--private"><h2>${icon('lock',18)}신청 정보<span class="rt-private-label">비공개</span></h2><dl class="rt-fact-list"><div><dt>연락처</dt><dd>${esc(f.contact||'—')}</dd></div></dl><p class="rt-info-note">연락처와 심사 정보는 공개하지 않아요.</p></section></div></section>`;
}
function account(){
 if(window.ReelAccess.mode()==='guide')return mateAccount();
 return `<section class="my-page"><div class="my-heading"><h1>마이</h1><a class="my-settings-button" href="#settings" aria-label="설정">${icon('settings')}</a></div><button type="button" class="my-profile" data-action="edit-profile" aria-label="프로필 편집"><span class="my-avatar">${profileAvatar()}</span><span class="my-profile-copy"><strong>${esc(state.profile?.nickname||'여행자')}</strong><small>${state.profile?.nickname?'프로필 편집':'닉네임과 사진을 등록해 보세요'}</small></span><span class="profile-edit-chevron" aria-hidden="true">${icon('chevronRight')}</span></button>${window.ReelAccess.mode()==='guide'?'':mateEntry()}</section>`;}


// Account deletion is browser-local until server authentication is integrated.
function withdrawalKeys(){return ['ko','en'].flatMap(lang=>['', '-comparison'].map(suffix=>`reeltrip-demo-${lang}-map-v2-option-2${suffix}`));}
function withdrawalBlocked(){
 const records=[state,...withdrawalKeys().map(k=>JSON.parse(localStorage.getItem(k)||'null')).filter(Boolean)];
 return records.some(record=>[record.booking,...(record.bookingHistory||[])].some(b=>b&&!['completed','cancelled'].includes(b.status)));
}
function withdrawalDialog(){
 if(isGuest()||window.ReelAccess.isAdmin)return;
 try{if(withdrawalBlocked()){modal(`<h2>진행 중인 예약이 있어요</h2><p>여행 완료 또는 예약 취소 처리가 끝난 뒤 탈퇴할 수 있어요. 다른 언어에서 만든 예약도 확인해 주세요.</p><div class="buttons">${action('닫기','close','secondary')}${action('도움말·문의','withdrawal-support')}</div>`);return;}}
 catch{toast('저장 정보를 확인하지 못했어요. 다시 시도해 주세요.');return;}
 modal(`<form id="withdraw-account-form"><h2>회원 탈퇴</h2><p>탈퇴하면 여행자·메이트 활동을 모두 종료해요.</p><ul><li>프로필, 저장한 장소, 여행 일정, 요청·제안, 채팅·문의 기록을 삭제해요.</li><li>메이트 신청 정보와 활동 권한도 삭제해요.</li><li>한국어·영어 앱의 저장 정보가 함께 삭제되며 복구할 수 없어요.</li></ul><p class="hint">현재는 시제품으로, 이 브라우저의 저장 정보와 가입 상태만 삭제해요. 실제 서비스 계정 삭제는 연결되어 있지 않아요.</p><label><input type="checkbox" name="agree" required> 삭제 내용을 확인했고 회원 탈퇴에 동의해요.</label><p id="withdraw-account-error" class="error" role="alert"></p><div class="buttons">${action('취소','close','secondary')}<button type="submit" class="btn danger">탈퇴하기</button></div></form>`);
}
function withdrawAccount(form){
 if(isGuest()||window.ReelAccess.isAdmin||!form.elements.agree.checked)return;
 const error=$('#withdraw-account-error');
 try{
  if(withdrawalBlocked()){error.textContent='진행 중인 예약을 먼저 정리해 주세요.';return;}
  const directory=readNicknameDirectory();
  const retained=Object.fromEntries(Object.entries(directory).filter(([,owner])=>![nicknameOwner,'mate-demo'].includes(owner)));
  localStorage.setItem(nicknameDirectoryKey,JSON.stringify(retained));
  for(const k of [...withdrawalKeys(),sharedNicknameKey,mateKey,'reeltrip-prototype-access-v1'])localStorage.removeItem(k);
  sessionStorage.removeItem(memberSessionKey);
 }catch{error.textContent='탈퇴 처리를 완료하지 못했어요. 다시 시도해 주세요.';return;}
 clearTimeout(timer);previewMember=false;state=initial();window.ReelAccess.reset();
 pendingRestaurant=null;pendingEstimate=false;pendingRequestRoute=null;pendingRecommendation=null;profileDraftPhoto='';checkedNickname='';
 $('#dialog').close();go('home');render();toast('이 브라우저의 회원 정보가 삭제됐어요.');
}

function settingsPage(){return `<section class="settings-page">${window.ReelAccess.settings().replace(/<div class="account-setting-row">[\s\S]*?<\/a><\/div>/,()=>signupLanguageLink(true))}<section class="settings-group"><h2>고객센터</h2><a href="#settings" data-action="blocked-users">차단한 사용자<span>${icon('chevronRight')}</span></a><a href="#support">도움말·문의<span>${icon('chevronRight')}</span></a><a href="#policies?section=terms">서비스 이용약관<span>${icon('chevronRight')}</span></a></section><section class="settings-group"><h2>계정</h2><a href="#settings" data-action="withdraw-account">회원 탈퇴<span>${icon('chevronRight')}</span></a></section></section>`;}

function support(){const query=new URLSearchParams(location.hash.split('?')[1]||'').get('placeQuery')||'';return `<div class="centerbox">${title('도움말','무엇을 도와드릴까요?','')}<div class="card pad"><h2 class="support-group-title">자주 묻는 질문</h2><details><summary>한글 이름을 몰라도 장소를 찾을 수 있나요?</summary><p class="muted small">공개된 영상 링크로 장소 후보를 찾을 수 있어요. 모든 영상에서 추출되는 것은 아니며, 같은 이름의 지점은 주소를 비교해 확인해야 해요.</p></details><details style="margin-top:16px"><summary>${guided?'메이트가 식당 예약까지 해주나요?':'장소를 저장하면 식당도 예약되나요?'}</summary><p class="muted small">${guided?'장소 선택이나 메이트 요청만으로 식당이 예약되지는 않아요. 필요한 도움을 요청서에 적고, 메이트의 최종 제안에 포함된 범위를 확인해 주세요.':'장소 저장은 방문 계획을 정리하는 기능이에요. 식당 예약·주문 통역은 제공하지 않아요. 방문 조건과 예약 방법은 해당 매장에 별도로 확인해 주세요.'}</p></details><details style="margin-top:16px"><summary>장소를 찾지 못한 이유는 무엇인가요?</summary><p class="muted small">비공개 영상, 불명확한 이름, 여러 지점 때문에 추출하지 못할 수 있습니다. 공개 링크를 사용하거나 장소를 직접 추가해 보세요.</p></details></div><form id="support-form" class="card pad" style="margin-top:20px"><h2 class="support-group-title">직접 문의 작성</h2><label>문의 유형<select name="type"><option>장소·추출 오류</option><option>데이터·개인정보 요청</option>${guided?'<option>예약·환불</option>':''}<option>기타 의견</option></select></label><label style="margin-top:17px">문의 내용<textarea name="body" minlength="10" maxlength="1000" required placeholder="어느 장소나 단계에서 막혔나요? 한국어로 직접 쓰기 어렵다면 사용 중인 언어로 남겨주세요. (10자 이상)">${query?esc(`장소 검색 문의: ${query}\n찾으시는 장소의 지역이나 주소를 추가로 알려주세요.`):''}</textarea></label><button type="submit" class="btn" style="margin-top:18px">문의 저장</button></form></div>`;}
function policySection(){return new URLSearchParams(location.hash.split('?')[1]||'').get('section');}
function policies(){const section=policySection();const heading=section==='privacy'?'개인정보처리방침':section==='terms'?'서비스 이용약관':'이용 안내';return `<article class="legalcopy">${section==='privacy'||section==='terms'?title(heading,heading):''}${section==='privacy'?`<h2>여행 정보 저장</h2><p>여행은 현재 브라우저에 저장됩니다. 다른 기기와 자동으로 연결되지 않으며 브라우저 데이터를 지우면 함께 삭제될 수 있어요.</p><h2>개인정보</h2><p>실제 결제정보나 민감한 개인정보는 입력하지 마세요.</p>`:section==='terms'?`<h2>장소와 지도</h2><p>사진과 지도는 방문할 곳을 살펴보기 위한 정보예요. 현재 영업시간·정확한 지점·매장 입구는 방문 전에 확인해 주세요. 지도 위 연결선은 방문 순서이며 실제 이동 경로가 아닙니다.</p><h2>사진과 콘텐츠</h2><p>원본 영상은 링크로 확인할 수 있습니다. 사진의 촬영 시점과 현재 현장 모습은 다를 수 있어요.</p>`:`<h2>장소와 지도</h2><p>사진과 지도는 방문할 곳을 살펴보기 위한 정보예요. 현재 영업시간·정확한 지점·매장 입구는 방문 전에 확인해 주세요. 지도 위 연결선은 방문 순서이며 실제 이동 경로가 아닙니다.</p><h2>여행 정보 저장</h2><p>여행은 현재 브라우저에 저장됩니다. 다른 기기와 자동으로 연결되지 않으며 브라우저 데이터를 지우면 함께 삭제될 수 있어요.</p><h2>개인정보</h2><p>실제 결제정보나 민감한 개인정보는 입력하지 마세요.</p><h2>사진과 콘텐츠</h2><p>원본 영상은 링크로 확인할 수 있습니다. 사진의 촬영 시점과 현재 현장 모습은 다를 수 있어요.</p>`}</article>`;}
function guides(){return `${title('','메이트')}<div class="trip-mode-tabs" role="group" aria-label="메이트 메뉴"><button type="button" data-action="guides-tab" data-id="requests" aria-pressed="${guidesTab==='requests'}">${icon('board')}<span>도착한 제안</span>${proposals().length?`<span class="trip-request-count">${proposals().length}</span>`:''}</button><button type="button" data-action="guides-tab" data-id="discover" aria-pressed="${guidesTab==='discover'}">${icon('guides')}<span>제안받기</span></button></div><section class="trip-tab-panel">${guidesTab==='requests'?guideRequests():guideDiscovery()}</section>`;}

function guideDiscovery(){const next=activeMateStep(),hasTrips=Boolean(state.trips?.length);return `<div class="proposal-request-options"><section class="free-quote-intro"><header class="free-quote-heading"><h2>내 여행 함께하기</h2><p>내 여행에 맞는 제안을 받아 함께할 메이트를 선택해요.</p></header><div class="free-quote-action">${hasTrips?btn('내 여행에서 선택하기','request'):action('여행 일정 만들기','new-trip')}</div></section><section class="free-quote-intro"><header class="free-quote-heading"><h2>자유 여행 함께하기</h2><p>정해진 일정 없이 자유롭게 견적을 요청해요.<br>지역과 기간을 정하면 메이트가 코스와 전체 견적을 제안해요.</p></header><div class="free-quote-action">${next?`<p class="free-quote-status">진행 중인 요청이나 예약을 먼저 확인해 주세요.</p>${btn(next.label,next.route,'secondary')}`:btn('함께할 메이트 찾기','request?mode=free','secondary')}</div></section></div>`;}



function journeySummary(q,priceLabel='일행 전체 금액'){return `<section class="journey-summary"><div class="journey-guide"><span class="portrait">${esc(q.guide[0])}</span><div><h2>${esc(q.guide)}${q.guide==='매칭 전'?'':' 메이트'}</h2><p>영어 안내 · ${esc(q.region||'여행 지역')}</p></div></div><div class="journey-facts"><div><span>여행 날짜</span><strong>${requestPeriod(q)}</strong></div><div><span>시작 시간 · 한국</span><strong>${esc(q.time)}</strong></div><div><span>함께하는 인원</span><strong>${q.party}명</strong></div><div><span>요청 방식</span><strong>${q.requestType==='free'?'자유 견적':'내 여행 일정'}</strong></div></div>${q.amount!==undefined?`<div class="journey-price"><span>${priceLabel} · KRW</span><strong>${money(q.amount)}</strong><p>${q.party}명 전체 금액이에요. 식비·교통비·쇼핑·입장료는 별도예요.</p></div>`:`<div class="journey-price pending"><span>예상 비용</span><strong>일정 확인 후 안내</strong><p>지금은 결제하지 않아요. 제안받은 가격을 확인하고 결정하세요.</p></div>`}</section>`;}
function mateRequestSummary(q){return `<section class="mate-request-summary" aria-label="여행 요청 요약"><h2>${q.requestType==='free'?esc(q.region||'여행 지역')+' · 자유 견적':'여행 요청'}</h2><p>${requestPeriod(q)} · ${esc(q.time)} · ${q.party}명</p><span>시작 시간은 한국 시간 기준이에요.</span>${q.amount!==undefined?`<div class="summaryrow"><span>현장에서 받을 현금</span><b>${money(q.amount)}</b></div>`:''}</section>`;}
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
function requestPlan(r){return (r.days?.length?r.days:[{date:r.date,stops:r.stops||[]}]).map((d,i)=>`${i+1}일차 · ${d.date}\n${d.stops.length?d.stops.map(p=>p.name).join('\n'):'메이트가 방문 코스를 제안해요.'}`).join('\n');}
function submitTravelRequest(d,{free=false,example=false}={}){
 if(activeMateStep())return {route:activeMateStep().route};
 if(!free&&!example&&d.tripId&&!selectTrip(d.tripId))return {error:'요청할 여행을 다시 선택해 주세요.'};
 let days=free?[]:itineraryRequestDays(example);
 const count=Number(d.dayCount),party=Number(d.party),region=String(d.region||'').trim();
 if(free&&(!region||region.length>80))return {error:'여행 지역을 선택해 주세요.'};
 if(free&&(!Number.isInteger(count)||count<1||count>7))return {error:'여행 기간은 당일부터 6박 7일까지 선택해 주세요.'};
 if(!Number.isInteger(party)||party<1||party>99)return {error:'인원은 1명부터 99명까지 입력해 주세요.'};
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
 state.request={id:'RQ-DEMO-'+Date.now(),status:'requested',visibility:'approved_mates',requestType:free?'free':'itinerary',region:free?region:[...new Set(stops.map(p=>p.area))].join(', '),date:start,endDate:days.at(-1).date,dayCount:days.length,time,party,days:JSON.parse(JSON.stringify(days)),notes:String(d.notes||'').trim().slice(0,500),guide:'매칭 전',guideId:null,tripId:free?null:(state.activeTripId||'trip-legacy'),tripTitle:free?region+' · '+tripLength(days.length):example?signupText('sampleDay'):state.title,language:d.language||'영어',stops:JSON.parse(JSON.stringify(stops)),must:free||example?[]:state.must.filter(id=>stops.some(p=>p.id===id)),createdAt:Date.now()};
 if(state.booking){state.bookingHistory=state.bookingHistory||[];state.bookingHistory.push(JSON.parse(JSON.stringify(state.booking)));}state.quote=null;state.proposals=[];state.booking=null;state.review=null;state.messages=[];state.rating=0;save();return {route:'requested'};
}
function request(){
 const next=activeMateStep();if(next)return empty('진행 중인 여행이 있어요.','요청이나 예약 상태를 먼저 확인해 주세요.',next.route,next.label);
 const params=new URLSearchParams(location.hash.split('?')[1]||''),free=params.get('mode')==='free',example=params.get('sample')==='1',tripId=params.get('trip');
 if(!free&&!example){
  ensureDays();stashDay();stashTrip();
  if(!tripId)return `${title('1 / 2','함께할 여행을 선택해 주세요','여행을 선택한 다음 요청 내용을 작성해요.')}<div class="my-trip-list">${state.trips.map(t=>tripListCard(t,true)).join('')}</div>`;
  if(!state.trips.some(t=>t.id===tripId))return empty('여행을 찾을 수 없어요.','요청할 여행을 다시 선택해 주세요.','request','여행 다시 선택');
  if(state.activeTripId!==tripId)selectTrip(tripId);
 }
 const days=free?[]:itineraryRequestDays(example);
 if(!free&&!days.some(d=>d.stops.length))return empty('내 여행을 먼저 만들어보세요','그 이후 메이트를 요청할 수 있어요','trips','내 여행 만들기');
 return `${!free&&!example?title('2 / 2','요청 내용을 작성해 주세요','선택한 여행을 확인하고 메이트에게 필요한 도움을 알려주세요.'):''}${free?'':`<section class="handoff card pad"><span class="badge">${days.length===1?'당일 여행':tripLength(days.length)}</span><h2>${esc(example?signupText('sampleDay'):state.title)}</h2>${days.map((d,i)=>`<div class="handoff-day"><p class="handoff-date">${days.length>1?`${i+1}일차 · `:''}<time datetime="${esc(d.date)}">${esc(d.date.replaceAll('-','.'))}</time></p><p class="handoff-stops">${d.stops.map(p=>esc(p.name)).join(' → ')||'메이트에게 코스 추천을 부탁해요.'}</p></div>`).join('')}${example?'':`<div class="buttons">${btn('여행 다시 선택','request','secondary small')}${btn('여행 수정',tripDetailRoute(),'secondary small')}</div>`}</section>`}<p class="request-intro request-intro-outside">${free?'지역과 기간만 정하면 메이트가 코스를 제안해요.':'내 여행의 날짜별 장소를 메이트에게 전달해요.'}</p><form id="request-form" class="card pad" data-request-type="${free?'free':'itinerary'}">${!free&&!example?`<input type="hidden" name="tripId" value="${esc(tripId)}">`: ''}${free?`<label>여행 지역<select name="region" required><option value="" disabled selected>여행 지역을 선택해 주세요.</option>${mateCities.map(city=>`<option value="${esc(city)}">${esc(city)}</option>`).join('')}</select></label><div class="formrow request-date-row"><label>출발일<input type="date" name="date" required value="${future()}"></label><label>여행 기간<select name="dayCount">${[1,2,3,4,5,6,7].map(n=>`<option value="${n}">${tripLength(n)}</option>`).join('')}</select></label></div><label>첫날 만날 시간 (한국 기준)<input type="time" name="time" required value="10:00"></label><p class="hint">숙박 일수는 여행 기간이에요. 숙소 예약이나 24시간 동행이 포함되는 것은 아니에요.</p>`:''}<div class="formrow"><label>인원<input name="party" type="text" inputmode="numeric" pattern="[0-9]{1,2}" maxlength="2" required value="${esc(state.party)}"></label><label>안내 언어<select name="language"><option>영어</option></select></label></div><label>원하는 활동이나 도움 (선택)<textarea name="notes" maxlength="500" placeholder="예: 맛집과 쇼핑, 한국어 주문 도움, 꼭 가고 싶은 장소"></textarea></label><p class="notice">공개 범위: 날짜·지역·인원·방문 장소·요청사항. 작성 중인 여행과 저장한 장소는 공개되지 않아요. 요청사항에 연락처나 정확한 숙소 주소를 적지 마세요.</p><label class="check"><input type="checkbox" name="guideAck" required>여행 조건과 요청 내용을 모든 승인된 메이트에게 공개합니다.</label><label class="check"><input type="checkbox" name="ack" required>제안받은 코스와 전체 금액을 확인한 뒤 메이트를 선택합니다.</label><p class="hint">출발 최소 48시간 전에 요청하세요. 요청만으로 예약되거나 결제되지 않아요.</p><p id="request-error" class="error" role="alert"></p><button type="submit" class="btn">함께할 메이트 찾기</button></form>`;
}

function requested(){const r=state.request;if(!r)return empty('아직 여행 요청이 없어요.','내 여행으로 제안을 받아보세요.','request','함께할 메이트 찾기');const b=state.booking?.requestId===r.id&&['awaiting_mate_fee','confirmed','completed','cancellation_requested'].includes(state.booking.status)?state.booking:null;const selected=q=>!!b&&(b.proposalId?q.id===b.proposalId:q.guideId===b.guideId&&q.version===b.quoteVersion);const list=proposals().slice().sort((a,c)=>Number(selected(c))-Number(selected(a)));return `${title('',b?'메이트 선택 완료':'도착한 제안',b?'선택한 메이트와 예약 상태를 확인하세요.':'일정과 포함 사항, 전체 금액을 비교하고 선택하세요.')}<section class="card pad request-summary-card"><span class="badge">${esc(r.status==='requested'?'제안 기다리는 중':statusLabel(r.status))}</span><h2>${esc(r.tripTitle||state.title)}</h2><p>${requestPeriod(r)} · ${r.party}명 · ${r.requestType==='free'?'자유 견적':(r.stops||[]).length+'곳'}</p>${b?`<p><span class="badge rt-status-primary">선택한 메이트</span> <strong>${esc(b.guide)} 메이트</strong></p><p class="hint">${b.status==='awaiting_mate_fee'?'메이트가 매칭 수수료를 결제하면 예약이 확정돼요.':statusLabel(b.status)}</p>`:''}${state.booking||r.status==='booked'?btn('예약 보기','booking'):['requested','quoted'].includes(r.status)?action('제안 받기 종료하기','withdraw','secondary small'):btn('함께할 메이트 찾기','request')}</section>${list.length?`<div class="proposal-section-heading"><h2>메이트의 제안</h2><span>${list.length}</span></div><div class="proposal-grid">${list.map(q=>`<article class="card pad proposal-card rt-card-compact">${b?`<span class="badge ${selected(q)?'rt-status-primary':''}">${selected(q)?'선택한 메이트':'미선택'}</span>`:''}<div class="guide proposal-header"><span class="portrait">${esc(q.guide[0])}</span><div><h2>${esc(q.guide)}${q.guide==='매칭 전'?'':' 메이트'}</h2><p>영어 · ${esc(q.region||'여행 지역')}</p></div></div><p class="proposal-description">${esc(q.reason)}</p>${q.message?`<p class="proposal-description"><strong>메이트가 남긴 메시지</strong><br>${esc(q.message).replace(/\n/g,'<br>')}</p>`:''}<strong class="proposal-price">${money(q.amount)}<small> / ${q.party}명 전체</small></strong><p class="hint proposal-validity">${b?(selected(q)?statusLabel(b.status):'선택되지 않은 제안'):!['requested','quoted'].includes(r.status)&&!state.booking?'만료 또는 철회된 제안':q.expires>Date.now()?'제안 확인 가능':'유효기간 만료'}</p>${selected(q)?btn('예약 보기','booking'):action('일정·제안 보기','select-proposal','secondary',`data-id="${esc(q.id)}"`)}</article>`).join('')}</div>`:`<div class="empty"><h2>${['requested','quoted'].includes(r.status)?'메이트의 제안을 기다리고 있어요':'제안 받기가 종료되었어요'}</h2><p>${['requested','quoted'].includes(r.status)?'메이트가 여행을 확인하고 일정과 제안을 보내드려요.':'이 요청에는 도착한 제안이 없어요. 새로운 여행으로 다시 요청할 수 있어요.'}</p></div>`}`;}

function quoteValid(){const q=state.quote,r=state.request;return !!(q&&r&&Date.parse(q.date+'T'+(q.time||'00:00')+':00+09:00')>Date.now()&&q.expires>Date.now()&&r.status==='quoted'&&!state.booking&&(!q.requestId||q.requestId===r.id)&&proposals().some(p=>p.id===q.id&&p.version===q.version&&p.amount===q.amount));}
function proposalMessage(q){return q.message?`<section class="card pad quote-section"><h2>메이트가 남긴 메시지</h2><p>${esc(q.message).replace(/\n/g,'<br>')}</p></section>`:'';}
function quote(){const q=state.quote;if(!q)return empty('아직 제안이 준비되지 않았어요.','메이트가 요청한 일정을 확인하면 제안을 볼 수 있어요.','requested','요청 확인');const valid=quoteValid();return `${title('','메이트의 여행 제안','')}${journeySummary(q,'현장에서 지급할 현금')}${proposalMessage(q)}<section class="card pad quote-section"><h2>제안받은 여행 일정</h2>${journeyPlan(q.plan)}</section><div class="bottomaction journey-action"><p>${state.booking?'확인한 제안':valid?'제안 금액 · '+money(q.amount):'종료된 제안이에요'}</p>${state.booking?btn('예약 일정 보기','booking'):valid?btn('메이트 선택·예약 요청','checkout'):btn(signupText('compareOffers'),'requested','secondary')}</div>`;}

function requestBooking(name,email){if(window.ReelAccess.isAdmin||window.ReelAccess.mode()!=='customer'||state.booking||!quoteValid())return false;const q=state.quote;state.booking={...JSON.parse(JSON.stringify(q)),requestId:state.request.id,proposalId:q.id,id:'RT-DEMO-'+Date.now(),quoteVersion:q.version,status:'awaiting_mate_fee',customer:name,email,requestedAt:Date.now(),feeDeadline:Math.min(Date.now()+24*3600000,Date.parse(q.date+'T'+q.time+':00+09:00')),paymentMethod:'cash',feeRate:.1,feeAmount:Math.round(q.amount*.1),feeStatus:'pending',cashStatus:'uncollected',policyVersion:'CASH-MATCH-10-V1'};syncConversations();state.request.status='matching';state.request.guide=q.guide;state.request.guideId=q.guideId;save();return true;}
function confirmMateFee(outcome){expireMateFee();const b=state.booking;if(window.ReelAccess.isAdmin||window.ReelAccess.mode()!=='guide'||!b||b.status!=='awaiting_mate_fee'||b.feeStatus==='paid')return false;if(outcome!=='success'){b.feeStatus='failed';save();return false;}b.feeStatus='paid';b.feePaidAt=Date.now();b.status='confirmed';b.confirmedAt=Date.now();state.request.status='booked';save();return true;}
function cashNotice(amount){return `<section class="card pad cash-notice"><span class="badge">현장 현금 결제</span><h2>여행 당일 현금을 준비해 주세요</h2><strong>${money(amount)}</strong><p>여행 비용은 현장에서 메이트에게 직접 지급해요. 릴트립은 매칭을 연결하며 여행 비용을 받지 않아요.</p></section>`;}
// Demo grace period; production expiry and payment verification must run on the server.
function feeDeadline(b){return b.feeDeadline||Math.min((b.requestedAt||Date.now())+24*3600000,Date.parse(b.date+'T'+(b.time||'00:00')+':00+09:00'));}
function deadlineNotice(b){return `<p class="notice">확정 기한: ${esc(new Date(feeDeadline(b)).toLocaleString(document.documentElement.lang==='en'?'en-GB':'ko-KR',{timeZone:'Asia/Seoul'}))} · 한국 시간<br>선택 후 24시간 이내에 결제해 주세요. 기한이 지나면 선택이 해제돼요.</p>`;}
function expireMateFee(){const b=state.booking;if(!b||b.status!=='awaiting_mate_fee')return false;if(!b.feeDeadline)b.feeDeadline=feeDeadline(b);if(Date.now()<b.feeDeadline)return false;b.status='cancelled';b.feeStatus='void';b.cancelReason='확정 기한 만료';if(state.request)state.request.status='withdrawn';syncConversations();save();return true;}
function reopenMatching(){const b=state.booking,r=state.request;if(window.ReelAccess.isAdmin||window.ReelAccess.mode()!=='customer'||!b||b.status!=='cancelled'||b.feeStatus!=='void'||!r||r.id!==b.requestId||Date.parse(r.date+'T'+r.time+':00+09:00')<=Date.now())return false;syncConversations();state.bookingHistory=state.bookingHistory||[];state.bookingHistory.push(JSON.parse(JSON.stringify(b)));state.proposals=proposals().map(q=>q.id===b.id||q.guideId===b.guideId?{...q,expires:Math.min(q.expires,Date.now())}:q);state.booking=null;state.quote=null;r.status=proposals().some(q=>q.expires>Date.now())?'quoted':'requested';delete r.guide;delete r.guideId;save();return true;}
function feeBreakdown(b){return `<div class="summaryrow"><span>여행자와 약속한 금액</span><b>${money(b.amount)}</b></div><div class="summaryrow"><span>매칭 수수료 10%</span><b>${money(b.feeAmount)}</b></div>`;}
function refundNotice(b){return `<p class="notice">수수료 반환: ${b.refundStatus==='review'?'검토 중':'해당 없음'}<br>예약 취소와 수수료 반환은 별도로 처리해요. </p>`;}
function guideFee(){const b=state.booking;if(!b)return empty('선택된 예약이 없어요.','여행자의 선택 후 수수료를 결제할 수 있어요.','guide-activity','내 활동');const pending=b.status==='awaiting_mate_fee';return `${title('',pending?'매칭 수수료':'예약 상세',statusLabel(b.status))}<section class="card pad quote-section">${pending?`<div class="mate-fee-amount"><span>릴트립에 결제할 수수료</span><strong>${money(b.feeAmount)}</strong></div>`:''}${pending?'':`<h2>예약 금액</h2>${feeBreakdown(b)}`}${pending?deadlineNotice(b):''}${pending?`<form id="mate-fee-form">${b.feeStatus==='failed'?`<p role="status">${signupText('feeRetry')}</p>`:''}<label class="check"><input type="checkbox" name="terms" required>매칭 수수료 10%와 현장 현금 지급 방식을 확인했습니다.</label><label class="developer-only">결제 결과<select name="outcome"><option value="success">결제 성공</option><option value="failure">결제 실패</option></select></label><p id="mate-fee-error" class="error" role="alert"></p><div class="rt-card-actions rt-card-actions-equal">${btn('진행 불가','guide-activity?decline=1','secondary')}<button type="submit" class="btn">예약확정</button></div></form><details class="mate-fee-details"><summary>예약 금액</summary>${feeBreakdown(b)}</details>`:''}${refundNotice(b)}</section>${mateRequestSummary(b)}<section class="card pad quote-section"><h2>예약 일정</h2>${journeyPlan(b.plan)}<p>만날 장소와 날짜별 시간, 현금 지급 시점을 채팅으로 확인해 주세요.</p>${btn('여행자와 대화','chat','secondary')}</section>${mateTripActions(b)}`;}
function mateTripActions(b){
 if(!['confirmed','completed','cancellation_requested'].includes(b.status))return '';
 const cashPending=b.cashStatus!=='collected';
 const canComplete=b.status==='confirmed'&&Date.now()>=Date.parse((b.endDate||b.date)+'T'+(b.time||'00:00')+':00+09:00')+4*3600000;
 if(!cashPending&&!canComplete&&b.status!=='confirmed')return '';
 return `<section class="card pad quote-section"><h2>동행 관리</h2>${!cashPending?'<p>현금 수령 완료</p>':''}${cashPending||canComplete?`<div class="${cashPending&&canComplete?'rt-card-actions rt-card-actions-equal':'rt-booking-actions'}">${cashPending?action('현금 수령 확인','mate-cash',canComplete?'secondary':''):''}${canComplete?action('여행 완료 확인','mate-complete'):''}</div>`:''}${b.status==='confirmed'?`<div class="rt-booking-actions">${btn('취소 요청','guide-activity?cancel=1','secondary')}</div>`:''}</section>`;
}
function guideActivity(){const history=(state.bookingHistory||[]).filter(item=>item.guideId==='mina'),b=state.booking?.guideId==='mina'?state.booking:null,bookings=[b,...history].filter(Boolean),sent=proposals().filter(q=>q.guideId==='mina'&&!bookings.some(item=>item.requestId===q.requestId&&item.guideId===q.guideId&&item.quoteVersion===q.version)),params=new URLSearchParams(location.hash.split('?')[1]||'');const tab=params.has('decline')||params.has('cancel')?'bookings':['sent','bookings'].includes(params.get('tab'))?params.get('tab'):b?'bookings':'sent';const cancellation=b&&((params.has('decline')&&b.status==='awaiting_mate_fee')||(params.has('cancel')&&b.status==='confirmed'));return `<nav class="rt-segmented-tabs" aria-label="내 활동 분류">${[['sent','보낸 제안',sent.length],['bookings','예약',bookings.length]].map(([key,label,count])=>`<a href="#guide-activity?tab=${key}" ${tab===key?'aria-current="page"':''}>${label}<span class="badge">${count}</span></a>`).join('')}</nav><div class="rt-card-stack">${cancellation?`<form id="mate-cancel-form" class="card pad"><h2>${b.status==='awaiting_mate_fee'?'진행 불가':'취소 요청'}</h2><label>사유<textarea name="reason" required minlength="2" maxlength="500"></textarea></label><p>확정 전에는 선택을 해제하고, 확정 후에는 운영자가 취소와 수수료 반환을 검토해요.</p><div class="rt-card-actions rt-card-actions-equal">${btn('돌아가기','guide-fee','secondary')}<button class="btn" type="submit">제출</button></div></form>`:''}${tab==='bookings'&&b?`<section class="card pad quote-section"><span class="badge">${statusLabel(b.status)}</span><h2>${esc(b.tripTitle||b.region||'메이트와 함께하는 여행')}</h2><p>${requestPeriod(b)} · ${esc(b.customer)}</p>${b.status==='awaiting_mate_fee'?deadlineNotice(b):''}${btn(b.status==='awaiting_mate_fee'?'수수료 결제하고 확정':'예약 상세','guide-fee')}</section>`:''}${tab==='sent'&&sent.length?`<section class="card pad quote-section"><h2>보낸 제안 <span class="badge">${sent.length}</span></h2>${sent.map(q=>`<article><span class="badge">${state.booking&&state.booking.guideId!==q.guideId?'미선택':q.expires>Date.now()&&['requested','quoted'].includes(state.request?.status)?'선택 대기':'유효기간 만료'}</span><h3>${esc(q.region||q.tripTitle||'메이트와 함께하는 여행')} · ${q.party}명</h3><p>${requestPeriod(q)}</p><p>${money(q.amount)}</p>${btn('일정·제안 보기','guide-quote','secondary')}</article>`).join('')}</section>`:''}${tab==='bookings'&&history.length?`<section class="card pad quote-section"><h2>완료·취소 내역</h2>${history.map(b=>`<p>${requestPeriod(b)} · ${statusLabel(b.status)} · ${esc(b.cancelReason||'')}</p>`).join('')}</section>`:''}${(tab==='sent'?!sent.length:!bookings.length)?`<section class="card pad rt-empty-card"><span class="rt-empty-card-icon" aria-hidden="true">${icon('trips',28)}</span><h2>${tab==='sent'?'아직 보낸 제안이 없어요.':'아직 예약이 없어요.'}</h2><p>${tab==='sent'?'함께하고 싶은 여행을 찾아 제안해 보세요.':'여행자가 제안을 선택하면 여기에 표시돼요.'}</p><div class="rt-card-actions">${btn('여행 찾기','guide-desk')}</div></section>`:''}</div>`;}
function checkout(){if(state.booking)return empty('이미 예약 진행 중인 제안이에요.','예약을 열어 현재 상태를 확인하세요.','booking','예약 열기');if(!quoteValid())return empty('유효한 여행 제안이 필요해요.','메이트에게 최신 가격과 일정을 요청하세요.','quote','제안 확인');const q=state.quote;return `${title('','메이트 선택·예약 요청','메이트가 매칭 수수료를 결제하면 예약이 확정돼요.')}${journeySummary(q,'현장에서 지급할 현금')}<form id="checkout-form" class="card pad quote-section"><h2>예약자 정보</h2><label>메이트에게 알려줄 이름<input name="name" required maxlength="60" placeholder="이름을 입력해주세요." value="${esc(state.profile?.nickname||'')}" autocomplete="name"></label><label>이메일<span class="rt-field">${icon('mail')}<input name="email" type="email" required placeholder="이메일을 입력해주세요." autocomplete="email"></span></label><label class="check"><input name="terms" type="checkbox" required>일정과 전체 금액을 확인했으며, 여행 당일 메이트에게 현금으로 지급하겠습니다.</label><label class="check"><input name="pendingAck" type="checkbox" required>지금은 예약 요청이며 메이트의 수수료 결제 후 확정되는 것을 확인했습니다.</label><p id="checkout-error" class="error" role="alert"></p><button type="submit" class="btn">메이트 선택하고 예약 요청</button></form>`;}

function booking(){const b=state.booking;if(!b)return empty('아직 예약이 없어요.','메이트의 일정과 가격을 확인한 뒤 예약을 요청하세요.','requested','요청 확인');const pending=b.status==='awaiting_mate_fee',confirmed=['confirmed','completed'].includes(b.status);return `${title('나의 메이트 여행',pending?'메이트의 확정을 기다리고 있어요':statusLabel(b.status),'')}${pending?'<div class="notice">선택한 메이트가 매칭 수수료를 결제하면 예약이 확정돼요. 아직 확정된 예약이 아니에요.</div>':''}${journeySummary(b,'현장에서 지급할 현금')}${confirmed?'<p class="notice">여행 비용은 당일 메이트에게 현금으로 직접 지급해 주세요.</p>':''}${confirmed?`<section class="meeting-card"><span class="badge">만나는 곳</span><h2>메이트와 만날 장소를 정해 주세요</h2><p>${requestPeriod(b)} · 첫날 ${b.time} / 한국 시간</p><p class="hint">채팅에서 첫날 만날 위치와 날짜별 동행 시간을 확인하세요.</p></section>`:''}<section class="card pad quote-section"><h2>${pending?'요청한 일정':'예약 일정'}</h2>${journeyPlan(b.plan)}</section>${['awaiting_mate_fee','confirmed'].includes(b.status)?`<div class="rt-booking-actions">${btn(signupText('backTrips'),'trips')}${btn(pending?'예약 요청 철회':'취소 요청','cancel','secondary')}</div>`:''}${b.status==='cancellation_requested'?'<div class="notice">취소 요청을 확인하고 있어요. 현금으로 이미 지급한 금액이 있다면 메이트와 확인해 주세요.</div>':''}${confirmed?(syncConversations().some(room=>conversationBooking(room)&&conversationOpen(room))?`<div class="bottomaction journey-action">${btn('메이트에게 일정·만남 문의','chat')}</div>`:'<p class="notice">메이트가 먼저 메시지를 보내면 대화할 수 있어요.</p>'):''}${b.status==='cancelled'&&b.feeStatus==='void'?`<section class="card pad"><p>${esc(b.cancelReason||'')}</p>${action('다른 메이트 제안 선택','reopen-matching','secondary')}</section>`:''}${b.refundStatus==='review'?refundNotice(b):''}`;}

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
   room.bookingId=b.id;room.customer=b.customer||room.customer;room.status=b.status;room.date=b.date;room.endDate=b.endDate||b.date;room.mutualConsent=true;
   // Keep the old storage field compatible, importing its history only once.
   if(!room.legacyImported){if(!room.messages.length&&state.messages?.length)room.messages=state.messages.map(m=>({...m,sender:m.sender||'customer'}));room.legacyImported=true;}
  }
 }
 return state.conversations;
}
function conversationBooking(room){const b=state.booking;return b&&conversationKey(b.requestId||state.request?.id||b.id,b.guideId||'mina')===room.id?b:null;}
function conversationEndsAt(room){
 const b=conversationBooking(room)||room;
 const end=b.endDate||b.date;
 return end?Date.parse(end+'T00:00:00+09:00')+86400000:NaN;
}
// Browser-local safety MVP. Replace local participant IDs with authenticated server IDs at integration.
const reportReasons={spam:'스팸·광고',abuse:'욕설·괴롭힘',fraud:'사기·금전 요구',unsafe:'부적절한 행동',other:'기타'};
function safetyRecords(){if(!Array.isArray(state.userBlocks))state.userBlocks=[];if(!Array.isArray(state.userReports))state.userReports=[];}
function safetyPair(room){return {customer:room.customerId||'customer:local',guide:'guide:'+room.guideId};}
function safetyActor(room){return safetyPair(room)[window.ReelAccess.mode()];}
function safetyTarget(room){const pair=safetyPair(room);return window.ReelAccess.mode()==='guide'?pair.customer:pair.guide;}
function safetyName(room){return window.ReelAccess.mode()==='guide'?(room.customer||'여행자'):(room.guide||'메이트');}
function ownBlock(room){safetyRecords();return state.userBlocks.find(b=>b.actor===safetyActor(room)&&b.target===safetyTarget(room));}
function conversationBlocked(room){safetyRecords();const p=safetyPair(room);return state.userBlocks.some(b=>(b.actor===p.customer&&b.target===p.guide)||(b.actor===p.guide&&b.target===p.customer));}
function safetyAllowed(room){return !isGuest()&&!window.ReelAccess.isAdmin&&!!room&&syncConversations().includes(room)&&!!safetyActor(room);}
function setUserBlock(room,blocked){
 if(!safetyAllowed(room))return false;safetyRecords();
 const existing=ownBlock(room);if(blocked&&!existing)state.userBlocks.push({actor:safetyActor(room),target:safetyTarget(room),name:safetyName(room),actorName:window.ReelAccess.mode()==='guide'?room.guide:room.customer,actorRole:window.ReelAccess.mode(),at:Date.now()});
 if(!blocked)state.userBlocks=state.userBlocks.filter(b=>b!==existing);save();return true;
}
function reportUser(room,reason,details){
 if(!safetyAllowed(room)||!Object.hasOwn(reportReasons,reason))return false;
 details=String(details||'').trim();if(details.length>1000||(reason==='other'&&!details))return false;safetyRecords();
 if(state.userReports.some(r=>r.actor===safetyActor(room)&&r.threadId===room.id))return false;
 state.userReports.push({id:'report-'+Date.now(),actor:safetyActor(room),target:safetyTarget(room),threadId:room.id,actorName:window.ReelAccess.mode()==='guide'?room.guide:room.customer,targetName:safetyName(room),actorRole:window.ReelAccess.mode(),reason,details,at:Date.now(),status:'local'});save();return true;
}
function safetyMenu(){const room=chatContext()?.room;if(!safetyAllowed(room))return;
 modal(`<h2>신고·차단</h2><p>${esc(safetyName(room))}</p><div class="rt-action-menu-list"><button type="button" class="rt-action-menu-item" data-action="user-report">${icon('warning')}<span>사용자 신고</span></button><button type="button" class="rt-action-menu-item rt-action-menu-item--danger" data-action="user-block">${icon('lock')}<span>${ownBlock(room)?'차단 해제':'사용자 차단'}</span></button></div><div class="buttons">${action('닫기','close')}</div>`);
}
function unblockNotice(){return '차단을 해제하면 채팅 이용 조건을 충족하는 대화에서 다시 메시지를 주고받을 수 있어요. 상대방이 나를 차단했거나 대화가 종료된 경우에는 메시지를 보낼 수 없어요. 신고 기록은 유지돼요.';}
function blockedUsers(){safetyRecords();const mode=window.ReelAccess.mode(),actors=new Set(syncConversations().map(safetyActor));const blocks=state.userBlocks.filter(b=>actors.has(b.actor)&&(mode==='guide'?b.actor.startsWith('guide:'):!b.actor.startsWith('guide:')));
 modal(`<h2>차단한 사용자${blocks.length?` <span class="badge">${blocks.length}</span>`:''}</h2>${blocks.length?`<p>차단한 상대와는 모든 대화방에서 메시지를 주고받을 수 없어요. 기존 대화와 예약은 유지되며, 예약 취소는 별도로 진행해야 해요.</p><div class="rt-card-stack">${blocks.slice().sort((a,b)=>b.at-a.at).map(b=>`<section class="card pad"><div class="sectionhead"><h3>${esc(b.name)}</h3><span class="badge">차단 중</span></div><div class="rt-card-actions">${action('차단 해제','user-unblock','secondary small',`data-id="${esc(b.target)}" data-actor="${esc(b.actor)}"`)}</div></section>`).join('')}</div>`:`<section class="card pad rt-empty-card"><span class="rt-empty-card-icon" aria-hidden="true">${icon('lock')}</span><h3>차단한 사용자가 없어요.</h3><p>채팅방 오른쪽 위 더보기에서 사용자를 차단할 수 있어요. 차단한 사용자는 여기에서 확인하고 해제할 수 있어요.</p></section>`}<div class="buttons">${action('닫기','close','secondary')}</div>`);
}
function conversationOpen(room){
 if(conversationBlocked(room))return false;
 const b=conversationBooking(room);
 return !!b&&b.feeStatus==='paid'&&room.mutualConsent===true&&['confirmed','completed','cancellation_requested'].includes(b.status)&&Date.now()<conversationEndsAt(room)&&(window.ReelAccess.mode()==='guide'||room.messages.some(m=>m.sender==='guide'));
}
function conversationStatus(room){if(conversationBlocked(room))return '차단된 대화';const b=conversationBooking(room);if(b?.status==='awaiting_mate_fee')return '메이트 결제 대기';if(b?.feeStatus==='paid'&&['confirmed','completed','cancellation_requested'].includes(b.status)&&Date.now()<conversationEndsAt(room)&&!room.messages.some(m=>m.sender==='guide'))return '메이트의 첫 메시지 대기';return conversationOpen(room)?'대화 중':room.mutualConsent?'종료된 대화':'쌍방 동의 대기';}
function chatPolicyButton(){return `<button type="button" class="chat-policy-button" data-action="chat-policy" aria-label="채팅 이용 안내" title="채팅 이용 안내" aria-haspopup="dialog" aria-controls="dialog">${icon('info')}</button>`; }
function chatPolicy(){return `<h2 id="chat-policy-title">채팅 이용 안내</h2><ul class="chat-policy-list"><li>메이트가 수수료를 결제하고 먼저 메시지를 보내면 여행자가 대화에 참여할 수 있어요.</li><li>여행 마지막 날 밤 12시(한국 시간)까지 대화하고, 이후에는 이전 대화만 볼 수 있어요.</li><li>예약 철회·취소가 완료되면 대화가 종료돼요. 취소 검토 중에는 이용 기간 내 대화할 수 있어요.</li><li>텍스트만 한 번에 1,000자까지 보낼 수 있어요.</li><li>만날 장소와 시간을 확인해 주세요. 채팅으로 예약 일정·금액이 변경되지는 않아요.</li><li>메이트의 10% 수수료 결제 후 예약이 확정되며, 결제 전에는 대화할 수 없어요.</li></ul><div class="chat-policy-footer"><button type="button" class="btn secondary" data-action="close">닫기</button></div>`;}
function conversationRoute(room){return 'chat?thread='+encodeURIComponent(room.id);}
function conversationUnread(room){if(!conversationOpen(room))return 0;const mode=window.ReelAccess.mode();return room.messages.slice(room.read?.[mode]||0).filter(m=>(m.sender||'customer')!==mode).length;}
function unreadChats(){return isGuest()?0:syncConversations().reduce((sum,room)=>sum+conversationUnread(room),0);}
function chatContext(){
 const params=new URLSearchParams(location.hash.split('?')[1]||''),rooms=syncConversations();
 if(!isGuest()&&params.has('thread')){const room=rooms.find(c=>c.id===params.get('thread'));return room?{sample:false,room,booking:conversationBooking(room)||room,messages:room.messages}:null;}
 if(!isGuest()&&params.get('sample')!=='1'&&state.booking){const room=rooms.find(c=>conversationBooking(c));if(room)return {sample:false,room,booking:state.booking,messages:room.messages};}
 return null;
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
 if(!text||text.length>1000||!context||!conversationOpen(context.room))return false;
 const list=context.messages;
 list.push({text,sender:window.ReelAccess.mode(),at:Date.now()});
 if(!context.sample&&conversationBooking(context.room))state.messages=context.messages;
 save();return true;
}
function chatTime(at){if(!Number.isFinite(at))return '';return new Intl.DateTimeFormat(signupLanguage(),{timeZone:'Asia/Seoul',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(at);}
function conversationCard(room){
 const b=conversationBooking(room)||room,last=room.messages.at(-1),guideMode=window.ReelAccess.mode()==='guide',unread=conversationUnread(room),name=guideMode?(b.customer||'여행자'):room.guide;
 return `<a class="conversation-item card pad ${!conversationOpen(room)?'is-closed':unread?'is-unread':''}" href="#${esc(conversationRoute(room))}"><span class="conversation-avatar" aria-hidden="true">${esc(Array.from(name||'?')[0])}</span><div><div class="conversation-heading"><h2>${esc(name)}</h2>${last?.at?`<time datetime="${new Date(last.at).toISOString()}">${esc(chatTime(last.at))}</time>`:''}</div><p class="conversation-preview">${last&&(last.sender||'customer')===window.ReelAccess.mode()?'나: ':''}${esc(last?.text||'일정과 만남 장소를 이야기해 보세요.')}</p><p class="conversation-trip">${esc(room.tripTitle)}</p><div class="conversation-meta"><span>${requestPeriod(room)}</span>${conversationOpen(room)?'':`<span class="conversation-status">${conversationStatus(room)}</span>`}</div></div>${unread?`<span class="chat-unread" aria-label="${unread} 읽지 않은 메시지">${unread}</span>`:`<span class="conversation-chevron" aria-hidden="true">${icon('chevronRight')}</span>`}</a>`;
}
function messages(){
 const rooms=syncConversations().filter(room=>room.messages.length||(conversationBooking(room)?.feeStatus==='paid'&&window.ReelAccess.mode()==='guide')).slice().sort((a,b)=>Number(conversationOpen(b))-Number(conversationOpen(a))||(b.messages.at(-1)?.at||b.createdAt)-(a.messages.at(-1)?.at||a.createdAt));
 const guideMode=window.ReelAccess.mode()==='guide';
 const blank=`<section class="card chat-empty rt-empty-card"><span class="conversation-avatar" aria-hidden="true">${icon('messages')}</span><h2>아직 대화가 없어요.</h2><p>${guideMode?'수수료 결제로 예약을 확정한 뒤 여행자에게 먼저 메시지를 보내 주세요.':'예약 확정 후 메이트가 먼저 메시지를 보내면 대화가 시작돼요.'}</p>${btn(guideMode?'공개된 여행 보기':state.request?'도착한 제안':'메이트 둘러보기',guideMode?'guide-desk':state.request?'requested':'guides','small')}</section>`;
 return `<div class="conversation-list">${rooms.length?rooms.map(conversationCard).join(''):blank}</div>`;
}
function chatDate(at){return Number.isFinite(at)?new Intl.DateTimeFormat(signupLanguage(),{timeZone:'Asia/Seoul',year:'numeric',month:'long',day:'numeric'}).format(at):'';}
function chatClock(at){return Number.isFinite(at)?new Intl.DateTimeFormat(signupLanguage(),{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit',hour12:false}).format(at):'';}
function chat(){
 const context=chatContext();if(!context)return messages();
 const b=context.booking,guideMode=window.ReelAccess.mode()==='guide',mode=window.ReelAccess.mode(),room=context.room,open=conversationOpen(room),booked=conversationBooking(room),name=guideMode?(b.customer||'여행자'):(room.guide||b.guide||'메이트');
 const detail=`<section class="chat-trip-context"><div><span class="chat-context-label">함께할 여행</span><strong>${esc(room.tripTitle)}</strong><p>${requestPeriod(room)}${booked?' · '+statusLabel(b.status):''}</p></div>${booked?btn('예약 상세',guideMode?'guide-fee':'booking','secondary small'):room.requestId===state.request?.id?btn('제안 확인',guideMode?'guide-desk':'requested','secondary small'):''}</section>`;
 let previousDate='';
 const history=context.messages.map((m,i)=>{
  const mine=(m.sender||'customer')===mode,date=chatDate(m.at),separator=date&&date!==previousDate?`<div class="chat-date"><span>${esc(date)}</span></div>`:'';previousDate=date;
  const read=mine&&(room.read?.[guideMode?'customer':'guide']||0)>i;
  return `${separator}<div class="chat-message ${mine?'is-mine':'is-peer'}"><span class="chat-sender">${mine?'나':esc(name)}</span><div class="bubble ${mine?'mine':''}">${esc(m.text)}</div><div class="chat-message-meta">${Number.isFinite(m.at)?`<time datetime="${new Date(m.at).toISOString()}">${esc(chatClock(m.at))}</time>`:''}${read?'<span>읽음</span>':''}</div></div>`;
 }).join('');
 const composer=open?`<form id="chat-form" class="chat-composer"><textarea name="text" rows="1" aria-label="메시지" maxlength="1000" required placeholder="메시지를 입력하세요"></textarea><button type="submit" class="btn rt-round-action" aria-label="메시지 보내기">${icon('send')}</button></form>`:`<p class="chat-closed" role="status">${conversationBlocked(room)?'차단으로 메시지를 보낼 수 없어요.':b.status==='awaiting_mate_fee'?'메이트의 수수료 결제 후 대화할 수 있어요.':b.feeStatus==='paid'&&Date.now()<conversationEndsAt(room)&&['confirmed','completed','cancellation_requested'].includes(b.status)&&!room.messages.some(m=>m.sender==='guide')?'메이트가 먼저 메시지를 보내면 대화할 수 있어요.':'종료된 대화는 기록만 확인할 수 있어요.'}</p>`;
 return `<div class="chat-room"><header class="chat-person"><a class="app-back" href="#messages" aria-label="이전 화면으로">${icon('chevronLeft')}</a><span class="conversation-avatar" aria-hidden="true">${esc(Array.from(name)[0])}</span><div><h1>${esc(name)}</h1></div>${action(icon('more'),'user-safety','secondary rt-round-action','aria-label="신고·차단" aria-haspopup="dialog"')}</header><div class="chat-surface">${detail}<p class="chat-system-note">채팅으로 일정과 금액이 변경되지는 않아요. 만날 장소를 확인해 주세요.</p><div class="chat" id="chat-log" role="log" aria-live="polite" aria-label="대화 내용" tabindex="0">${history||`<div class="chat-start"><span aria-hidden="true">${icon('messages')}</span><strong>${open?'첫 인사를 나눠보세요':'대화 기록이 없어요'}</strong><p>${open?'만날 장소와 시간을 여기서 이야기해요.':'대화가 시작되면 메시지가 여기에 모여요.'}</p></div>`}</div><div class="chat-compose-area">${composer}</div></div></div>`;
}

function refundEstimate(){return 0;}

function cancel(){const b=state.booking;if(!b||!['awaiting_mate_fee','confirmed'].includes(b.status))return empty('취소할 수 있는 예약이 없어요.','현재 예약 상태를 확인하세요.','booking','예약 보기');return `${title('','예약 취소 요청')}<form id="cancel-form" class="card pad">${b.status==='awaiting_mate_fee'?'':'<p>현금 지급 전후 여부를 메이트와 확인해 주세요. 릴트립은 여행 비용을 수납하거나 자동 환불하지 않아요.</p>'}<textarea name="reason" aria-label="사유" placeholder="사유를 입력해주세요." required minlength="2" maxlength="500"></textarea><label class="check"><input name="terms" type="checkbox" required>취소 요청 내용을 확인했습니다.</label><button type="submit" class="btn danger">${b.status==='awaiting_mate_fee'?'요청 철회':'취소 요청 제출'}</button></form>`;}

function side(role,content){if(role==='guide')return content;const list=screens.filter(s=>s.role===role);return `<div class="adminlayout"><nav class="sidenav" aria-label="역할별 메뉴">${list.map(s=>`<a class="${current()===s.route?'active':''}" href="#${s.route}">${s.name}</a>`).join('')}</nav><section>${content}</section></div>`;}
function publicRequestMatch(r){
 const regions=mateApplication().fields?.regions||[];
 const area=[r.region,...(r.stops||[]).map(p=>[p.area,p.address].filter(Boolean).join(' '))].filter(Boolean).join(' ').toLowerCase();
 const cityAliases=['서울 Seoul','부산 Busan','대구 Daegu','인천 Incheon','광주 Gwangju','대전 Daejeon','울산 Ulsan','세종 Sejong','경기 Gyeonggi','강원 Gangwon','충북 Chungbuk','충남 Chungnam','전북 Jeonbuk','전남 Jeonnam','경북 Gyeongbuk','경남 Gyeongnam','제주 Jeju'];
 const region=regions.some(v=>{const names=v.district==='all'?(cityAliases[v.city]||'').split(' '):[mateDistrictsFor(v.city)[v.district]];return names.some(name=>name&&area.includes(name.toLowerCase()));});
 return {region,available:requestAvailable(r)};
}
function publicTravelRequests(requests=state.request?[state.request]:[]){
 return requests.filter(r=>r&&['requested','quoted'].includes(r.status)&&(!r.visibility||r.visibility==='approved_mates')&&state.booking?.requestId!==r.id)
 .sort((a,b)=>{const x=publicRequestMatch(a),y=publicRequestMatch(b);return Number(y.region&&y.available)-Number(x.region&&x.available)||Number(y.available)-Number(x.available)||Number(y.region)-Number(x.region)||(b.createdAt||0)-(a.createdAt||0)||String(a.id).localeCompare(String(b.id));});
}
function guideDesk(){const rows=publicTravelRequests();return `<div class="pagehead"><div><p class="muted">활동 지역과 가능한 날짜가 맞는 요청을 먼저 보여드려요. 다른 지역의 요청도 볼 수 있어요.</p></div></div>${state.booking?btn('진행 중인 예약 확인','guide-activity','secondary'):''}${rows.length?rows.map(r=>{
 const match=publicRequestMatch(r);
 const sent=proposals().some(q=>q.guideId==='mina'&&q.expires>Date.now()&&(!q.requestId||q.requestId===r.id));
 const region=String(r.region||'').trim()||[...new Set((r.stops||[]).map(p=>String(p.area||'').trim()).filter(Boolean))].join(', ');
 return `<section class="card pad rt-request-card"><div class="rt-request-badges"><span class="badge">${sent?'제안 보냄 · 선택 대기':'제안 전'}</span>${match.region&&match.available?'<span class="badge">활동 지역·날짜 일치</span>':''}</div><h2>${requestPeriod(r)}</h2>${region?`<p class="rt-request-region">${icon('location',18)}<span>${esc(region)}</span></p>`:''}<dl class="rt-request-facts"><div><dt>시작 시간</dt><dd>${esc(r.time||'—')}</dd></div><div><dt>여행 인원</dt><dd>${esc(r.party)}명</dd></div><div><dt>사용 언어</dt><dd>${esc(r.language||'영어')}</dd></div></dl>${!match.available?'<p class="hint">확정된 예약과 날짜가 겹쳐요. 다른 요청을 확인해 주세요.</p>':''}<div class="rt-card-actions">${btn(sent?'보낸 제안 보기':'일정 보고 제안하기','guide-quote')}</div></section>`;
 }).join(''):empty('새 요청이 없어요.','여행자가 제안 받기를 요청하면 여기서 확인할 수 있어요.','guide-activity','내 활동')}`;}


let quoteMapRequest='',quoteMapDay=0;
function updateQuoteMap(day=null,focus=null){
 const form=$('#quote-form'),draft=form?{amount:form.elements.amount?.value,plan:form.elements.plan?.value,ack:form.elements.ack?.checked}:null;
 if(day!==null)quoteMapDay=day;if(focus!==null)state.focus=focus;
 render();
 const next=$('#quote-form');if(next&&draft){for(const key of ['amount','plan'])if(next.elements[key]&&draft[key]!==undefined)next.elements[key].value=draft[key];if(next.elements.ack)next.elements.ack.checked=draft.ack;}
}
function requestItineraryMap(r){
 if(r.requestType==='free')return journeyPlan(r.plan||requestPlan(r));
 const key=r.requestId||r.id||'';if(quoteMapRequest!==key){quoteMapRequest=key;quoteMapDay=0;}
 const days=r.days?.length?r.days:[{date:r.date,time:r.time,stops:r.stops||[]}];
 if(!days.some(d=>d.stops?.length))return journeyPlan(r.plan||requestPlan(r));
 quoteMapDay=Math.min(Math.max(0,quoteMapDay),days.length-1);
 const day=days[quoteMapDay],stops=day.stops||[];
 const tabs=days.length>1?`<div class="day-tabs" aria-label="여행 날짜">${days.map((d,i)=>`<button type="button" data-action="quote-map-day" data-value="${i}" aria-pressed="${quoteMapDay===i}" class="${quoteMapDay===i?'active':''}">${i+1}일차<small>${esc(d.date||'')}</small></button>`).join('')}</div>`:'';
 const map=stops.length?mapPanel([],stops).replaceAll('data-action="focus-place"','type="button" data-action="quote-map-focus"'):'';
 return `${tabs}${map}<div class="sectionhead"><h3>${quoteMapDay+1}일차 · ${esc(day.date||'')}</h3></div>${stops.length?`<ol class="trip-timeline">${stops.map((p,i)=>`<li class="trip-timeline-stop"><span class="trip-stop-number">${i+1}</span><div class="trip-stop-content"><span><strong>${esc(p.name)}</strong><small>${esc(p.address||p.area||'')}</small></span><span class="trip-stop-photo">${placeArt(p)}</span></div>${i<stops.length-1?travelLeg(p,stops[i+1]):''}</li>`).join('')}</ol>`:'<p class="hint">이날은 등록된 장소가 없어요.</p>'}`;
}
function guideQuote(){const r=state.request;if(state.booking)return side('guide',empty('이미 여행자가 선택한 제안이에요.','예약 진행 상태와 수수료 결제 여부를 내 활동에서 확인하세요.','guide-activity','내 활동'));if(!r||!['requested','quoted'].includes(r.status))return side('guide',empty('제안을 작성할 요청이 없습니다.','요청함에서 진행 상태를 확인하세요.','guide-desk','요청함'));const sent=proposals().find(q=>q.guideId==='mina'&&q.expires>Date.now());if(sent)return side('guide',`${title('','보낸 제안','보낸 제안은 수정할 수 없어요. 여행자의 선택을 기다려 주세요.')}${mateRequestSummary(sent)}${proposalMessage(sent)}<section class="card pad quote-section"><h2>함께할 일정</h2>${requestItineraryMap(sent)}</section>`);return side('guide',`${title('','여행 제안 보내기','요청 조건을 확인하고 일행 전체 금액을 입력하세요.')}${mateRequestSummary(r)}<form id="quote-form" class="card pad quote-section">${r.requestType==='free'?`<label>날짜별 방문 코스<textarea name="plan" required minlength="10" maxlength="2000" placeholder="날짜별 방문 장소를 입력하세요."></textarea></label>`:`<h2>함께할 일정</h2>${requestItineraryMap(r)}`}<label>일행 전체 여행 금액 (원)<input type="number" name="amount" min="0" step="1" required placeholder="예: 240000"></label><label>여행자에게 남길 메시지를 작성해주세요!<textarea name="message" maxlength="1000" rows="4" placeholder="여행자에게 남길 메시지를 작성해주세요!"></textarea></label><p class="hint">작성한 메시지는 여행자의 도착한 제안과 제안 상세 화면에 표시돼요.</p><p class="notice">여행자가 선택하면 전체 금액의 10%를 결제하고 예약을 확정해요. 수수료 차감 후 금액은 입력 금액의 90%이며 기타 비용은 별도예요.</p><p class="hint">식비·쇼핑·교통비·입장료는 별도예요. 보낸 제안은 24시간 유효하며 수정할 수 없어요.</p><label class="check"><input name="ack" type="checkbox" required>요청 일정과 전체 금액을 확인했습니다.</label><p id="quote-error" class="error" role="alert"></p><button class="btn" type="submit">함께할 여행 제안하기</button></form>`);}

function requestAvailable(r=state.request){
 if(!r)return false;
 const start=r.date,end=r.endDate||r.date;
 return [state.booking,...(state.bookingHistory||[])].filter(b=>b&&['confirmed','cancellation_requested'].includes(b.status)).every(b=>end<b.date||start>(b.endDate||b.date));
}
function admin(){return side('admin',`${title('운영 관리','운영 현황','')}<div class="metrics"><div class="metric">저장 장소<strong>${state.board.length}</strong></div><div class="metric">확인 필요<strong>${state.places.filter(p=>!p.verified).length}</strong></div><div class="metric">${guided?'예약':'문의'}<strong>${guided?(state.booking?1:0):state.tickets.length}</strong></div></div><div class="card pad"><h2>지금 확인할 일</h2><ul class="listclean"><li><a href="#admin-places">장소 후보와 지점 확인 →</a></li><li><a href="#admin-support">사용자 신고 ${adminSafetyRecords().reports.length}건 · 차단 ${adminSafetyRecords().blocks.length}건 →</a></li><li><a href="#admin-support">고객 문의 ${state.tickets.filter(t=>t.status==='open').length}건 →</a></li>${guided?`<li><a href="#admin-guides">메이트 등록 심사: ${mateStatus(mateApplication().status)} →</a></li><li><a href="#admin-bookings">예약·환불 상태 확인 →</a></li>`:''}</ul></div>`);}
function adminPlaces(){return side('admin',`${title('장소 품질 관리','장소 검수','원본 추출값과 수정 이력을 보관하는 운영 흐름입니다.')}<div class="tablewrap"><table><thead><tr><th>장소</th><th>상태</th><th>검수 작업</th></tr></thead><tbody>${state.places.map(p=>`<tr><td><b>${esc(p.name)}</b><br>${esc(p.address)}</td><td><span class="badge ${p.verified?'':'warm'}">${p.verified?'확인 완료':p.rejected?'반려':'확인 필요'}</span></td><td><button class="textbtn" data-action="correct" data-id="${p.id}">검토·수정</button>${!p.verified?`<br><button class="textbtn" data-action="reject-place" data-id="${p.id}">반려</button>`:''}</td></tr>`).join('')}</tbody></table></div>`);}
// Operations reads both language stores afresh so another app tab is visible without overwriting its data.
function adminSafetyRecords(){
 if(!window.ReelAccess.isAdmin)return {reports:[],blocks:[]};
 const result={reports:[],blocks:[]};
 for(const language of ['ko','en']){try{const stored=JSON.parse(localStorage.getItem(`reeltrip-demo-${language}-map-v2-option-2`)||'null');if(!stored)continue;
  for(const [field,target] of [['userReports','reports'],['userBlocks','blocks']])if(Array.isArray(stored[field]))result[target].push(...stored[field].filter(r=>r&&typeof r==='object').map(r=>({...r,language})));
 }catch{}}
 return result;
}
function adminSafetyPanel(){
 const {reports,blocks}=adminSafetyRecords();
 const person=(name,id)=>`${esc(name||id||'—')} <small>${esc(id||'')}</small>`;
 const role=r=>(r.actorRole==='guide'||String(r.actor).startsWith('guide:'))?'메이트':'여행자';
 const meta=r=>`${r.language==='ko'?'KO':'EN'} · ${esc(chatTime(r.at))}`;
 return `<section class="stack"><div class="sectionhead"><h2>사용자 신고 · ${reports.length}</h2>${action('목록 새로고침','refresh-safety','secondary small')}</div>${reports.length?reports.slice().sort((a,b)=>b.at-a.at).map(r=>`<article class="card pad"><span class="badge">${meta(r)}</span><h3>${esc(reportReasons[r.reason]||r.reason)}</h3><p>신고자 (${role(r)}): ${person(r.actorName,r.actor)}</p><p>신고 대상: ${person(r.targetName,r.target)}</p><p>${esc(r.details||'상세 내용 없음')}</p><p class="hint">대화방: ${esc(r.threadId)}</p><p>차단 상태: ${blocks.some(b=>b.language===r.language&&b.actor===r.actor&&b.target===r.target)?'차단 중':'차단 안 함'}</p></article>`).join(''):'<div class="card pad"><p>접수된 사용자 신고가 없습니다.</p></div>'}<h2>현재 차단 내역 · ${blocks.length}</h2>${blocks.length?blocks.slice().sort((a,b)=>b.at-a.at).map(b=>`<article class="card pad"><span class="badge">${meta(b)}</span><p>차단한 사용자 (${role(b)}): ${person(b.actorName,b.actor)}</p><p>차단 대상: ${person(b.name,b.target)}</p></article>`).join(''):'<div class="card pad"><p>현재 차단 내역이 없습니다.</p></div>'}</section>`;
}
function adminSupport(){return side('admin',`${title('고객 문의','문의·신고·차단','')}${adminSafetyPanel()}<h2>고객 문의</h2><div class="stack">${state.tickets.length?state.tickets.map(t=>`<div class="card pad"><span class="badge">${t.id} · ${statusLabel(t.status)}</span><h3 style="margin:13px 0">${esc(t.type)}</h3><p>${esc(t.body)}</p>${t.status==='open'?`<button class="btn secondary small" style="margin-top:15px" data-action="resolve-ticket" data-id="${t.id}">처리 완료로 표시</button>`:''}</div>`).join(''):empty('접수된 문의가 없습니다.','고객 도움말 화면에서 문의를 등록할 수 있습니다.','admin','운영 현황')}</div>`);}
function adminGuides(){return side('admin',`${title('메이트 자격 확인','메이트 자격 심사','')}<form id="verify-form" class="card pad"><div class="guide"><div class="portrait">준</div><div><h2>준 · 안국</h2><span class="badge">${statusLabel(state.adminReview)}</span></div></div><div class="notice">실서비스는 자격증 진위, 본인 일치, 계약 체결을 담당자가 확인합니다. 공개 프로필에는 민감한 증빙을 노출하지 않습니다.</div>${['관광통역안내사 자격과 해당 언어 확인','신청자 본인과 증빙 일치 확인','메이트 계약·정산 조건 동의 확인'].map((t,i)=>`<label class="check"><input name="v${i}" type="checkbox" required>${t}</label>`).join('')}<div class="buttons"><button type="submit" class="btn">승인 · 프로필 공개</button>${action('보완 요청 · 노출 중지','guide-needs-info','secondary')}</div></form>`);}
function adminBookings(){const b=state.booking;return side('admin',`${title('','매칭·예약 관리')}${!b?'<p>예약이 없습니다.</p>':`<section class="card pad"><h2>${esc(b.guide)} · ${esc(b.date)}</h2><span class="badge">${statusLabel(b.status)}</span><div class="summaryrow"><span>현장 현금 약속 금액</span><b>${money(b.amount)}</b></div><div class="summaryrow"><span>매칭 수수료 10%</span><b>${money(b.feeAmount)}</b></div><p>수수료 상태: ${esc(b.feeStatus)}</p>${refundNotice(b)}<p>취소 사유: ${esc(b.cancelReason||'—')}</p><p>여행 비용은 여행자와 메이트 간 현금 거래입니다. 수수료 환불은 별도 확인이 필요합니다.</p>${b.status==='cancellation_requested'?action('취소 확인 완료','confirm-cash-cancel','secondary'):''}</section>`}`);}

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
function isSignIn(){return ['signup','signup-email'].includes(current()) && new URLSearchParams(location.hash.split('?')[1]||'').get('mode')==='signin';}
function signupText(key){
 if(isSignIn())key=({title:'signInTitle',choose:'signInChoose',emailAction:'signInEmailAction',social:'signInSocial',emailTitle:'signInEmailTitle',emailIntro:'signInEmailIntro',submit:'signInSubmit',preview:'signInPreview'})[key]||key;
 return window.ReelSignupCopy[key][signupLocales.indexOf(signupLanguage())];
}
function signupLanguageLink(asMenuRow=false){
 const names = ['한국어', 'English', '简体中文', '日本語'];
 const pages = ['index.html?lang=ko', 'english.html?lang=en', 'index.html?lang=zh-CN', 'index.html?lang=ja'];
 const links = signupLocales.map((lang, i) => '<a lang="'+lang+'" href="'+pages[i]+'#'+current()+(isSignIn()?'?mode=signin':'')+'"'+(lang===signupLanguage()?' aria-current="true"':'')+'>'+names[i]+(lang===signupLanguage()?' ✓':'')+'</a>').join('');
 if(asMenuRow){
  const activeName=names[signupLocales.indexOf(signupLanguage())];
  return '<details class="signup-locale"><summary class="guest-account-row">'+icon('settings')+'<span>'+signupText('languageSetting')+'</span><span class="value">'+activeName+'</span><span class="arrow" aria-hidden="true">'+icon('chevronRight')+'</span></summary><div>'+links+'</div></details>';
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
 return title('','저장한 장소')+`<section class="card rt-empty-card" aria-labelledby="guest-places-title"><span class="rt-empty-card-icon" aria-hidden="true">${icon('board')}</span><h2 id="guest-places-title">장소를 저장하고 내 여행을 만들어보세요</h2><p>가고 싶은 장소를 모아 나만의 여행 일정을 만들 수 있어요.</p>${btn('가입하고 장소 저장하기','signup')}</section>`;
}
function guestTrips(){return `<div class="guest-trips"><div class="my-trips-heading"><h1>내 여행</h1>${tripWorkspace()}</div><section class="card rt-empty-card" aria-labelledby="guest-trip-title"><span class="rt-empty-card-icon" aria-hidden="true">${icon('trips')}</span><h2 id="guest-trip-title">나만의 여행을 만들어보세요</h2><p>여행별로 장소와 일정을 모아 관리해요.</p>${btn('가입하고 여행 만들기','signup')}</section></div>`;}

function guestAccount(){
 return `<section class="guest-account">
  <h1>${signupText('myTab')}</h1>
  <div class="guest-account-intro">
   <span class="guest-account-avatar" aria-hidden="true">${icon('account')}</span>
   <div><h2>${signupText('guestAccountTitle')}</h2><p>${signupText('guestAccountNote')}</p></div>
   <div class="guest-account-actions rt-card-actions rt-card-actions-equal">
    ${btn(signupText('signInTitle'),'signup?mode=signin')}
    ${btn(signupText('title'),'signup','secondary')}
   </div>
  </div>
  <div class="guest-account-menu">
   ${signupLanguageLink(true)}
  </div>
 </section>`;
}

function guestGate(){
 return `<section class="guest-invite" aria-labelledby="guest-invite-title">
  <div class="guest-route-art" aria-hidden="true">
   <svg class="guest-route-illustration" viewBox="0 0 220 94" width="220" height="94" fill="none" focusable="false">
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
 return title('',library?'저장한 장소':signupText('browsePlaces'))+`<div class="guest-place-list">${cards}</div><div class="guest-place-join">${btn('가입하고 여행하기','signup')}</div>`;
}
function guestGuides(){
 return guides();
}

function signupBrandLogo(){
 const names={'zh-CN':'映旅', ja:'リールトリップ'};
 const name=names[signupLanguage()];
 if(!name)return brandLogo();
 return `<img class="brand-logo" src="../assets/brand/reeltrip-logo-${signupLanguage()}-charcoal-transparent.png" alt="${name}" width="${signupLanguage()==='ja'?2172:1873}" height="${signupLanguage()==='ja'?724:840}">`;
}

function signup(){
 return `<section class="signup-screen">
  ${signupLanguageLink()}
  <div class="signup-heading">${signupBrandLogo()}<h1>${signupText('title')}</h1><p>${signupText('choose')}</p></div>
  <a class="btn signup-primary" href="#signup-email${isSignIn()?'?mode=signin':''}">${signupText('emailAction')}</a>
  <div class="signup-divider">${signupText('social')}</div>
  <div class="signup-options">
   <button class="signup-provider signup-provider--google" type="button" data-action="signup-provider">${signupText('google')}</button>
   <button class="signup-provider signup-provider--kakao" type="button" data-action="signup-provider">${signupText('kakao')}</button>
   <button class="signup-provider signup-provider--naver" type="button" data-action="signup-provider">${signupText('naver')}</button>
  </div>
  <p class="signup-note" style="text-align:center">${signupText(isSignIn()?'newMember':'existingMember')} <a href="#signup${isSignIn()?'':'?mode=signin'}">${signupText(isSignIn()?'signUpLink':'signInTitle')}</a></p>
  <a class="signup-secondary" data-action="browse-guest" href="#home">${signupText('guest')}</a>
 </section>`;
}

function signupEmail(){
 const heading=(title,description)=>`<div class="signup-heading"><h1>${title}</h1><p>${description}</p></div>`;
 let content;
 if(signupEmailStep==='code'){
  content=`${heading(signupText('verify'),signupText('codeIntro'))}
   <p class="signup-demo-code developer-only">${signupText('demo')} <strong>${demoSignupCode}</strong></p>

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
    <input id="signup-address" name="email" type="email" autocomplete="email" autocapitalize="none" spellcheck="false" placeholder="traveler@example.com" maxlength="254" required>

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

const views={'guide-activity':guideActivity,'mate-register':mateRegistration,signup,'signup-email':signupEmail,'guide-fee':guideFee,settings:settingsPage,notifications,home,processing,results,manual,board,planner,trips,account,support,policies,guides,guide:guidePage,request,requested,quote,checkout,booking,messages,chat,cancel,'guide-desk':guideDesk,'guide-quote':guideQuote,admin,'admin-places':adminPlaces,'admin-support':adminSupport,'admin-guides':mateAdmin,'admin-bookings':adminBookings};
function render(){
 expireMateFee();
 clearTimeout(feeExpiryTimer);
 if(!isGuest()&&state.booking?.status==='awaiting_mate_fee'){const remaining=feeDeadline(state.booking)-Date.now();if(remaining>0&&remaining<2147483647)feeExpiryTimer=setTimeout(()=>render(),remaining);}
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
  document.title=canBrowse?(window.ReelInterfaceCopy?.text(byRoute(route)?.name||'Reeltrip',signupLanguage())||byRoute(route)?.name):signupText('needMember');
  return;
 }
 if(['requested','quote','checkout','booking','chat','cancel','review'].includes(current()))guidesTab='requests';if(fillExampleCoordinates())save();clearTimeout(timer);const r=current();document.body.dataset.route=r;const signingUp=r==='signup'||r==='signup-email';document.documentElement.lang=signupLanguage();const skipLink=$('.skip');if(skipLink)skipLink.textContent=signupText('skip');$('#app').innerHTML=interfaceMarkup(layout(byRoute(r)?(window.ReelAccess.allowed(byRoute(r).role,r)?(views[r]()+providerCredits()):window.ReelAccess.blocked()):empty('화면을 찾을 수 없어요.','메뉴에서 다시 이동해 주세요.')));document.title=signingUp?signupText(r==='signup'?'title':'emailTitle'):`${byRoute(r)?.name||'릴트립'}`;document.title=window.ReelInterfaceCopy?.text(document.title,signupLanguage())||document.title;mountMaps();window.ReelRevenue.mount();if(r==='processing'&&state.extraction!=='failed'&&(!window.ReelStatePreview||previewExtractionStarted)){timer=setTimeout(()=>{state.extraction='partial';save();go('results');},1400);}if(r==='chat'){$('#chat-log')?.scrollTo(0,99999);const context=chatContext();if(context&&conversationOpen(context.room)){const delay=conversationEndsAt(context.room)-Date.now();if(delay>0&&delay<2147483647)timer=setTimeout(()=>render(),delay);}}}
function modal(html,kind=''){html=interfaceMarkup(html);const d=$('#dialog');delete d.dataset.mateEditRegion;d.oncancel=null;d.dataset.kind=kind;d.classList?.toggle('booking-dialog',kind==='booking');d.classList?.toggle('rt-bottom-sheet',kind==='mate-region');if(kind==='chat-policy')d.setAttribute('aria-labelledby','chat-policy-title');else d.removeAttribute('aria-labelledby');d.innerHTML=html;
 // Shared dialog contract: title, secondary action first, and safe initial focus.
 const heading=d.querySelector?.('h2');if(heading){if(!heading.id)heading.id='dialog-title';d.setAttribute('aria-labelledby',heading.id);}
 d.querySelectorAll?.('.buttons').forEach(group=>{const buttons=[...group.children];if(buttons.length===2){const secondary=buttons.find(button=>button.classList.contains('secondary'));if(secondary)group.prepend(secondary);}});
 if(!d.open)d.showModal();
 if(d.querySelector?.('.btn.danger'))d.querySelector('.buttons .secondary')?.focus();
}
function snapshot(){return state.board.map(place).filter(Boolean).map(p=>({...p}));}
function makeQuote(amount,plan,reason,pricing,sender='mina',message=''){const r=state.request;if(!r||!['requested','quoted'].includes(r.status)||state.booking)return false;if(!requestAvailable()){toast('메이트가 함께할 수 없는 날짜입니다. 다른 날짜를 선택하세요.');return false;}if(amount===undefined)amount=240000*(r.dayCount||1);if(!Number.isSafeInteger(amount)||amount<0||!['mina','jun'].includes(sender))return false;const existing=proposals().find(q=>q.guideId===sender);if(existing?.expires>Date.now())return false;plan=r.requestType==='free'?String(plan||'').trim():requestPlan(r);if(r.requestType==='free'&&(plan.length<10||plan.length>2000))return false;message=String(message||'').trim();if(message.length>1000)return false;state.quote={message,requestId:r.id,guideId:sender,pricingPolicyVersion:"2026-11-23-mvp",feeRate:.1,feeVatIncluded:null,pricing:{hours:4*(r.dayCount||1)},id:'QT-'+r.id+'-'+sender,version:(existing?.version||0)+1,guide:sender==='jun'?'준':'미나',requestType:r.requestType||'itinerary',tripTitle:r.tripTitle,region:r.region,endDate:r.endDate||r.date,dayCount:r.dayCount||1,days:JSON.parse(JSON.stringify(r.days||[])),date:r.date,time:r.time,party:r.party,amount,plan:plan||requestPlan(r),reason:r.requestType==='free'?'요청한 날짜와 인원에 맞춘 여행 코스예요.':'요청한 일정 그대로 함께해요.',expires:Date.now()+86400000};state.proposals=[...proposals().filter(q=>q.guideId!==sender),state.quote];state.request.status='quoted';save();return true;}
function download(name,data){const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function sample(){previewExtractionStarted=true;state.source='성수의 카페와 산책';state.filter='전체';state.selected=['forest','cafe','shop'];state.extraction='processing';save();go('processing');}
function loadScenario(kind){
 state=initial();state.board=['forest','cafe','shop'];state.saved=true;
 if(guided&&kind!=='plan'){
  state.request={id:'RQ-DEMO-SAMPLE',status:'requested',date:state.date,time:state.time,party:2,notes:'사진을 찍을 여유가 있는 느긋한 일정을 원해요.',guide:'미나',guideId:'mina',stops:snapshot(),must:[],createdAt:Date.now()};
  if(kind!=='request')makeQuote();
  if(['booking','cancel','completed'].includes(kind)){state.request.status='booked';state.booking={...JSON.parse(JSON.stringify(state.quote)),id:'RT-DEMO-SAMPLE',quoteVersion:state.quote.version,status:kind==='completed'?'completed':kind==='cancel'?'cancellation_requested':'confirmed',customer:'제이미',email:'jamie@example.com',requestedAt:Date.now(),confirmedAt:Date.now(),feePaidAt:Date.now(),feeAmount:Math.round(state.quote.amount*.1),feeRate:.1,feeStatus:'paid',paymentMethod:'cash',cashStatus:'uncollected',policyVersion:'CASH-MATCH-10-V1',refundStatus:kind==='cancel'?'검토 중':'없음'};
   if(kind==='cancel'){state.booking.estimatedRefund=refundEstimate();state.booking.cancelReason='여행 일정 변경';state.booking.cancelledAt=Date.now();}
  }
 }
 save();$('#dialog').close();go(({plan:'planner',request:'requested',quote:'quote',booking:'booking',cancel:'admin-bookings',completed:'booking'})[kind]||'planner');toast('선택한 상태를 불러왔습니다.');
}
document.addEventListener('error',e=>{if(e.target.matches?.('.provider-photo img')){e.target.parentElement.innerHTML=art();}},true);
document.addEventListener('keydown',e=>{if(e.key==='Escape'){document.querySelectorAll('.place-menu[open]').forEach(menu=>{menu.open=false;menu.querySelector('summary').focus();});}});
document.addEventListener('click',e=>{document.querySelectorAll('.place-menu[open]').forEach(menu=>{if(!menu.contains(e.target)||e.target.closest('[data-action]'))menu.open=false;});if(e.target.closest('.skip')){e.preventDefault();$('#main')?.focus();return;}const b=e.target.closest('[data-action]');if(!b)return;e.preventDefault();const a=b.dataset.action,id=b.dataset.id;
 if(a==='withdrawal-support'){$('#dialog').close();go('support');return;}
 if(a==='withdraw-account'){withdrawalDialog();return;}
 if(a==='board-add'){boardAddMenu();return;}
 if(a==='board-search'){$('#dialog').close();go('manual');return;}
 if(a==='library-filter'){libraryFilter=id==='must'?'must':'all';render();return;}
 if(a==='board-video'){boardVideoDialog();return;}
 if(a==='mate-edit-profile'||a==='mate-edit-activity'){editMate(a==='mate-edit-profile'?'profile':'activity');return;}
 if(a==='mate-edit-photo-remove'){if(!canEditMate()||!mateEditDraft)return;captureMate($('#mate-edit-form'),mateEditDraft);matePhotoRead++;mateEditPhotoLoading=false;mateEditDraft.fields.photo='';editMate('profile',true);return;}
 if(a==='mate-edit-region'){if(!canEditMate()||!mateEditDraft)return;captureMate($('#mate-edit-form'),mateEditDraft);mateRegionDraft=JSON.parse(JSON.stringify(mateEditDraft.fields.regions||[]));mateRegionCity=mateRegionDraft[0]?.city||0;mateRegionSheet();$('#dialog').dataset.mateEditRegion='true';$('#dialog').oncancel=e=>{e.preventDefault();editMate('activity',true);};return;}
 if(a==='mate-region-done'&&$('#dialog').dataset.mateEditRegion==='true'){if(!canEditMate()||!validMateRegions(mateRegionDraft))return;mateEditDraft.fields.regions=JSON.parse(JSON.stringify(mateRegionDraft));delete $('#dialog').dataset.mateEditRegion;editMate('activity',true);return;}
 if(a==='close'&&$('#dialog').dataset.mateEditRegion==='true'){delete $('#dialog').dataset.mateEditRegion;editMate('activity',true);return;}
 if(a==='mate-region-open'){const m=mateApplication();mateRegionDraft=JSON.parse(JSON.stringify(m.fields.regions||[]));mateRegionCity=mateRegionDraft[0]?.city||0;mateRegionSheet();return;}
 if(a==='mate-region-toggle'){toggleMateRegion(id);return;}
 if(a==='mate-region-done'){const m=mateApplication();if(!validMateRegions(mateRegionDraft)||['pending','approved'].includes(m.status))return;m.fields.regions=mateRegionDraft;m.fields.region=mateRegionText(mateRegionDraft);delete m.fields.range;if(saveMate(m)){$('#dialog').close();render();}return;}
 if(a==='mate-photo-remove'){matePhotoRead++;const m=mateApplication();if(['pending','approved'].includes(m.status))return;m.fields.photo='';if(saveMate(m))render();return;}
 if(a==='mate-phone-send'||a==='mate-phone-verify'){matePhoneAction(a==='mate-phone-send'?'send':'verify');return;}
 if(a==='mate-contact-support'){const form=$('#mate-form');if(form&&!saveMate(captureMate(form,mateApplication())))return;go('support');return;}
 if(a==='mate-back'){const m=mateApplication();if(!['pending','approved'].includes(m.status)){m.step=Math.max(1,(m.step||1)-1);if(saveMate(m)){render();resetMateScroll();}}return;}
 if(a==='mate-review'){if(reviewMate(id,$('#mate-review-form textarea')?.value||''))render();return;}
 if(a==='save-recommendation'){saveRecommendation(recommendationRows[Number(id)]);return;}
 if(a==='recommendation-retry'){loadRecommendations(recommendationQuery,true);return;}
 if(a==='discover-query'){startDiscovery(b.dataset.query);return;}
 if(a==='home-mate-start'){guidesTab='discover';go('guides');return;}
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
 if(a==='open-proposal-chat'){const q=proposals().find(q=>q.id===id);if(!q||!state.request?.id)return;if(!state.booking){state.quote=q;save();go('checkout');return;}const room=syncConversations().find(c=>conversationBooking(c));if(room)go(conversationRoute(room));return;}
 if(a==='confirm-cash-cancel'){if(window.ReelAccess.isAdmin&&state.booking?.status==='cancellation_requested'){state.booking.status='cancelled';if(state.booking.feeStatus==='paid')state.booking.refundStatus='review';if(state.request)state.request.status='cancelled';save();render();}return;}
 if(a==='reopen-matching'){if(reopenMatching())go('requested');else toast('다시 선택할 수 없는 요청이에요. 새 여행 요청을 만들어 주세요.');return;}
 if(a==='mate-cash'||a==='mate-complete'){const booking=state.booking;if(window.ReelAccess.isAdmin||window.ReelAccess.mode()!=='guide'||!booking)return;const valid=a==='mate-cash'?['confirmed','completed','cancellation_requested'].includes(booking.status):booking.status==='confirmed'&&Date.now()>=Date.parse((booking.endDate||booking.date)+'T'+(booking.time||'00:00')+':00+09:00')+4*3600000;if(!valid){toast('여행 일정이 끝난 뒤 완료할 수 있어요.');return;}modal(`<form id="mate-progress-form"><input type="hidden" name="kind" value="${a}"><h2>${a==='mate-cash'?'현금 수령 확인':'여행 완료 확인'}</h2><label class="check"><input type="checkbox" name="ack" required>${a==='mate-cash'?'약속한 여행비 전액을 현금으로 받았습니다.':'전체 동행을 마쳤습니다. 현금 수령 여부는 별도로 확인합니다.'}</label><button class="btn" type="submit">확인</button></form>`);return;}
 if(a==='check-mate-name'){checkMateName();return;}
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
 if(a==='guides-tab'){if(['discover','requests'].includes(id)){guidesTab=id;render();}return;}
 if(a==='notification-filter'){if(['all','trip','guide'].includes(id)){notificationFilter=id;render();}return;}
 if(a==='notifications-read-all'){markNotificationsRead(notificationItems().map(n=>n.id));render();return;}
 if(a==='notification-open'){const item=notificationItems().find(n=>n.id===id);if(item){markNotificationsRead([id]);go(item.route);}return;}

 if(a==='trip-stop-menu'){tripStopMenu(id);return;}
 if(a==='trip-day-settings'){tripDaySettings();return;}
 if(a==='trip-stop-move'||a==='trip-stop-remove'){const changed=a==='trip-stop-move'?moveTripPlace(id,Number(b.dataset.dir)):removeTripPlace(id);if(changed){$('#dialog').close();render();}return;}
 if(a==='trip-add-menu'){tripAddMenu();return;}
 if(a==='trip-pick-places'){tripPlacePicker();return;}
 if(a==='trip-add-place'){if(addTripPlace(id)){render();tripPlacePicker();}else toast('하루에 20곳까지 담을 수 있어요.');return;}
 if(a==='trip-manual'){$('#dialog').close();go('manual?from=trips');return;}
 if(a==='edit-trip'){editTripInfo();return;}
 if(a==='trip-date'){chooseTripDate(b.dataset.value);renderTripCalendar();$('#dialog').querySelector(`[data-value="${b.dataset.value}"]`)?.focus({preventScroll:true});return;}
 if(a==='trip-more-months'){tripDraft.months+=12;renderTripCalendar();return;}
 if(a==='trip-dates-next'){tripDetailsDialog();return;}
 if(a==='trip-dates-back'){const f=$('#new-trip-form');tripDraft.title=f.elements.title.value;renderTripCalendar();return;}
 if(a==='new-trip'){newTripDialog();return;}
 if(a==='request-trip'){if(selectTrip(id))go('request?trip='+encodeURIComponent(id));return;}
 if(a==='open-trip'){if(selectTrip(id))go(tripDetailRoute());return;}

 if(a==='overview-day'){switchDay(Number(b.dataset.value));go(tripDetailRoute());}
 else if(a==='day'){switchDay(Number(b.dataset.value));}
 else if(a==='add-day'){ensureDays();if(state.days.length>=7)return;stashDay();const date=new Date(state.days[state.days.length-1].date+'T12:00:00Z');date.setUTCDate(date.getUTCDate()+1);state.days.push({date:date.toISOString().slice(0,10),time:'10:00',ids:[],durations:{}});switchDay(state.days.length-1);}
 else if(a==='quote-map-day'){updateQuoteMap(Number(b.dataset.value));}
 else if(a==='quote-map-focus'){updateQuoteMap(null,id);}
 else if(a==='focus-place'){if(!place(id))return;state.focus=id;save();render();}
 else if(a==='scenarios')modal(`<h2>화면 상태 선택</h2><div class="stack">${action('일정 편집 준비','load-scenario','secondary','data-kind="plan"')}${guided?`${action('메이트 응답 대기','load-scenario','secondary','data-kind="request"')}${action('제안 도착 · 결제 전','load-scenario','secondary','data-kind="quote"')}${action('예약 확정','load-scenario','secondary','data-kind="booking"')}${action('취소 요청 · 환불 검토','load-scenario','secondary','data-kind="cancel"')}${action('여행 완료 · 후기 작성','load-scenario','secondary','data-kind="completed"')}`:''}</div><div class="buttons">${action('돌아가기','close','secondary')}</div>`);
 else if(a==='load-scenario')loadScenario(b.dataset.kind);
 else if(a==='home-category'){state.source='성수의 카페와 산책';state.filter=b.dataset.value;save();go('results');}
 else if(a==='sample')sample();
 else if(a==='sample-results'){state.source='성수의 카페와 산책';state.filter='전체';save();go('results');}
 else if(a==='extract-fail'){clearTimeout(timer);state.extraction='failed';save();render();}
 else if(a==='filter'){state.filter=b.dataset.value;save();render();}
 else if(a==='save-result-place'){if(!place(id)||(googleRegistered(place(id))&&libraryIds().includes(id)))return;if(!saveSelectedPlaces([id]))return;render();toast('저장한 장소에 담았어요.');}
 else if(a==='save-places'){if(!saveSelectedPlaces(state.selected))return;go('board');toast('선택한 장소를 저장했어요.');}
 else if(a==='add-board'){const unresolved=state.selected.find(id=>!pinEligible(place(id)));if(unresolved){resolvePlace(unresolved,true);return;}if(state.selected.some(id=>!place(id)?.verified)){toast('같은 이름의 다른 지점에 가지 않도록, 확인이 필요한 장소에서 주소를 먼저 확인해 주세요.');return;}const ids=[...new Set([...state.board,...state.selected])];if(ids.length>20){toast('하루에 20곳까지 담을 수 있어요.');return;}state.library=[...new Set([...libraryIds(),...state.selected])];state.board=ids;state.saved=false;save();go(tripDetailRoute());}
 else if(a==='correct'){resolvePlace(id,isTripDetail()||current()==='planner');}
 else if(a==='refresh-safety'){if(window.ReelAccess.isAdmin)render();}
 else if(a==='user-safety'){safetyMenu();}
 else if(a==='blocked-users'){blockedUsers();}
 else if(a==='user-report'){const room=chatContext()?.room;if(!safetyAllowed(room))return;if(state.userReports?.some(r=>r.actor===safetyActor(room)&&r.threadId===room.id)){modal(`<h2>이미 신고를 저장했어요.</h2>${action('닫기','close','secondary')}`);return;}modal(`<form id="user-report-form"><input type="hidden" name="thread" value="${esc(room.id)}"><h2>사용자 신고</h2><p>${esc(safetyName(room))}</p><label>신고 사유<select name="reason" required><option value="">선택해 주세요</option>${Object.entries(reportReasons).map(([value,label])=>`<option value="${value}">${label}</option>`).join('')}</select></label><label>상세 내용 (기타 선택 시 필수)<textarea name="details" maxlength="1000"></textarea></label><p id="report-error" role="alert" class="error"></p><div class="buttons">${action('취소','close','secondary')}<button type="submit" class="btn">신고 저장</button></div></form>`);}
 else if(a==='user-block'){const room=chatContext()?.room;if(!safetyAllowed(room))return;const blocked=!!ownBlock(room);modal(`<h2>${blocked?'차단을 해제할까요?':'이 사용자를 차단할까요?'}</h2><p>${blocked?unblockNotice():'차단하면 이 상대와 메시지를 주고받을 수 없어요. 기존 대화와 예약은 유지돼요.'}</p><div class="buttons">${action('취소','close','secondary')}${action(blocked?'차단 해제':'차단','user-block-confirm','danger',`data-id="${esc(room.id)}" data-block="${!blocked}"`)}</div>`);}
 else if(a==='user-block-confirm'){const room=chatContext()?.room;if(room?.id!==id||!setUserBlock(room,b.dataset.block==='true'))return;$('#dialog').close();render();toast(b.dataset.block==='true'?'사용자를 차단했어요.':'차단을 해제했어요.');}
 else if(a==='user-unblock'){const room=syncConversations().find(r=>safetyActor(r)===b.dataset.actor&&safetyTarget(r)===id);if(!safetyAllowed(room)||!ownBlock(room))return;modal(`<h2>차단을 해제할까요?</h2><p>${esc(safetyName(room))}</p><p>${unblockNotice()}</p><div class="buttons">${action('취소','blocked-users','secondary')}${action('차단 해제','user-unblock-confirm','',`data-id="${esc(id)}" data-actor="${esc(b.dataset.actor)}"`)}</div>`);}
 else if(a==='user-unblock-confirm'){const room=syncConversations().find(r=>safetyActor(r)===b.dataset.actor&&safetyTarget(r)===id);if(setUserBlock(room,false)){render();blockedUsers();toast('차단을 해제했어요.');}}
 else if(a==='chat-policy'){modal(chatPolicy(),'chat-policy');}
 else if(a==='close')$('#dialog').close();
 else if(a==='must'){state.must=state.must.includes(id)?state.must.filter(x=>x!==id):[...state.must,id];save();render();}
 else if(a==='remove'&&current()==='board'){state.library=libraryIds().filter(x=>x!==id);save();render();}
 else if(a==='remove'){state.board=state.board.filter(x=>x!==id);state.must=state.must.filter(x=>x!==id);state.saved=false;save();render();}
 else if(a==='move'){const i=state.board.indexOf(id),j=i+Number(b.dataset.dir);if(j>=0&&j<state.board.length){[state.board[i],state.board[j]]=[state.board[j],state.board[i]];state.saved=false;save();render();}}
 else if(a==='save-trip'){state.saved=true;save();render();toast('모든 날짜의 여행을 저장했어요.');}
 else if(a==='download-trip'){download('reeltrip-itinerary.json',{title:state.title,date:state.date,time:state.time,timezone:'Asia/Seoul',stops:snapshot().map(({name,address})=>({name,address})),day:state.day+1,demo:true});toast('일정 파일을 내려받았습니다.');}
 else if(a==='print')window.print();
 else if(a==='export-data'){download(`reeltrip-data.json`,state);toast('저장 정보를 내보냈습니다.');}
 else if(a==='reset')modal(`<h2>저장 정보 삭제?</h2><p>릴트립의 저장 장소, 일정과 이용 기록을 삭제합니다. </p><div class="buttons">${action('저장 정보 삭제','confirm-reset','danger')}${action('데이터 유지','close','secondary')}</div>`);
 else if(a==='confirm-reset'){try{localStorage.removeItem(key);localStorage.removeItem(sharedNicknameKey);}catch{}state=initial();$('#dialog').close();go('home');toast('앱의 저장 정보를 삭제했습니다.');}
 else if(a==='guide-filter'){state.guideFilter=b.dataset.value;save();render();}
 else if(a==='choose-guide'){state.guide=id;save();go('guide');}
 else if(a==='withdraw'){if(state.request&&['requested','quoted'].includes(state.request.status)&&!state.booking)modal(`<h2>정말 제안을 받지 않으시겠어요?</h2><p>종료하면 이 여행 요청으로 더 이상 메이트의 제안을 받을 수 없어요.</p><div class="buttons">${action('취소','close','secondary')}${action('종료하기','confirm-withdraw','danger',`data-id="${esc(state.request.id)}"`)}</div>`);}
 else if(a==='confirm-withdraw'){if(state.request&&String(state.request.id)===id&&['requested','quoted'].includes(state.request.status)&&!state.booking){state.request.status='withdrawn';save();$('#dialog').close();render();}}
 else if(a==='renew-quote'){if(makeQuote(state.quote?.amount||240000,state.quote?.plan,state.quote?.reason,state.quote?.pricing,state.quote?.guideId||'mina',state.quote?.message))render();else toast('이 요청은 갱신할 수 없습니다.');}
 else if(a==='expire-quote'){if(state.quote){state.quote.expires=Date.now()-1;save();render();}}
 else if(a==='complete-trip'){if(state.booking?.status==='confirmed'){state.booking.status='completed';save();render();toast('여행을 완료 처리했습니다.');}}

 else if(a==='decline'){if(state.request&&['requested','quoted'].includes(state.request.status)&&!state.booking)modal(`<h2>요청 거절</h2><form id="decline-form"><label>사유<textarea name="reason" required minlength="5" maxlength="500"></textarea></label><div class="buttons"><button class="btn danger" type="submit">요청 거절</button>${action('돌아가기','close','secondary')}</div></form>`);}
 else if(a==='reject-place'){const p=place(id);p.rejected=true;p.verified=false;p.reviewReason='지점 확인 근거 부족';save();render();}
 else if(a==='resolve-ticket'){const t=state.tickets.find(x=>x.id===id);if(t){t.status='resolved';save();render();}}
 else if(a==='guide-needs-info'){state.guideApproved=false;state.adminReview='needs_info';if(state.guide==='jun')state.guide='mina';save();render();}
 else if(a==='refund-fail')toast('모의 PG 오류: 환불 검토 상태와 정산 보류를 유지합니다.');
});
document.addEventListener('input',e=>{if(e.target.id==='mate-phone-code')e.target.value=e.target.value.replace(/[^0-9]/g,'').slice(0,6);if(e.target.name==='contact'&&e.target.closest?.('#mate-form')){matePhoneDemo.verified=false;const status=$('#mate-phone-status');if(status)status.textContent='';const send=$('[data-action="mate-phone-send"]');if(send)send.disabled=false;}if(e.target.matches?.('input[name="party"]'))e.target.value=e.target.value.replace(/[^0-9]/g,'').slice(0,2);if(e.target.closest?.('#mate-form')&&!isGuest()){const a=mateApplication();if(!['pending','approved'].includes(a.status))saveMate(captureMate(e.target.closest('#mate-form'),a));}if(e.target.id==='mate-name'){const message=$('#mate-name-status');if(message)message.textContent='';e.target.setAttribute('aria-invalid','false');}if(e.target.id==='profile-nickname'){checkedNickname='';setNicknameStatus();}});
document.addEventListener('change',e=>{const t=e.target;if(t.dataset.tripDayField){if(!updateTripDay(t.dataset.tripDayField,t.value)){t.value=state[t.dataset.tripDayField];return;}render();return;}if(t.id==='mate-edit-photo'){readMateEditPhoto(t);return;}if(t.id==='mate-photo'){readMatePhoto(t);return;}if(t.id==='mate-city'){mateRegionCity=Number(t.value);mateRegionSheet(false);return;}if(t.id==='profile-photo'){const file=t.files?.[0];if(!file)return;const error=$('#profile-error');if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>1048576){error.textContent='1MB 이하의 JPG·PNG·WebP 사진을 선택해 주세요.';t.value='';return;}error.textContent='';const reader=new FileReader();$('#profile-save').disabled=true;reader.onload=()=>{profileDraftPhoto=reader.result;$('#profile-photo-preview').innerHTML=profileAvatar(profileDraftPhoto);$('#profile-photo-clear').hidden=false;$('#profile-camera-button').hidden=true;$('#profile-save').disabled=false;};reader.onerror=()=>{error.textContent='사진을 불러오지 못했어요. 다시 선택해 주세요.';$('#profile-save').disabled=false;};reader.readAsDataURL(file);return;}if(t.id==='screen-jump')go(t.value);else if(t.dataset.select){const id=t.dataset.select;state.selected=t.checked?[...new Set([...state.selected,id])]:state.selected.filter(x=>x!==id);save();render();}else if(['trip-title','trip-date','trip-time'].includes(t.id)){if(!t.value)return;state[t.id==='trip-title'?'title':t.id==='trip-date'?'date':'time']=t.value;state.saved=false;save();if(t.id==='trip-time')render();}});
document.addEventListener('submit',e=>{const f=e.target;if(!(f instanceof HTMLFormElement))return;e.preventDefault();if(f.id==='discover-search-form'){startDiscovery(f.elements.query.value);return;}if(isGuest() && !['signup-code-form','signup-email-form'].includes(f.id)){go('member-required');return;}
 if(f.id==='mate-edit-form'){saveMateEdit(f);return;}
 if(f.id==='mate-form'){submitMate(f);return;}
 if(f.id==='mate-review-form'){if(f.checkValidity()&&reviewMate('approved'))render();return;}
 if(f.id==='withdraw-account-form'){withdrawAccount(f);return;}
 const d=Object.fromEntries(new FormData(f));
 if(f.id==='place-search-form'){searchPlaces(f,d);return;}
 if(f.id==='signup-email-form'){showSignupEmailStep('code');return;}
 if(f.id==='signup-code-form'){
  if(d.code===demoSignupCode){setPreviewMember(true);if(!resumeSignupAction())go(window.ReelAccess.home());return;}
  f.elements.code.setAttribute('aria-invalid','true');
  $('#signup-code-error').textContent=signupText('wrong');
  f.elements.code.focus();
  return;
 }
 if(f.id==='profile-form'){const nickname=(d.nickname||'').normalize('NFKC').trim(),canonical=normalizeNickname(nickname);try{const directory=readNicknameDirectory(),problem=nicknameProblem(nickname,directory);if(problem){setNicknameStatus(problem,false);$('#profile-nickname').focus();checkedNickname='';return;}if(canonical!==normalizeNickname(state.profile?.nickname)&&checkedNickname!==canonical){setNicknameStatus('닉네임 중복 확인을 먼저 해주세요.',false);$('#profile-nickname').focus();return;}const updated=Object.fromEntries(Object.entries(directory).filter(([name,owner])=>owner!==nicknameOwner));updated[canonical]=nicknameOwner;localStorage.setItem(nicknameDirectoryKey,JSON.stringify(updated));localStorage.setItem(sharedNicknameKey,nickname);state.profile={nickname,photo:profileDraftPhoto};save();$('#dialog').close();render();toast('프로필을 저장했어요.');}catch{$('#profile-error').textContent='중복 확인을 완료하지 못했어요. 다시 시도해 주세요.';}}
 else if(f.id==='board-video-form'){let url;try{url=new URL(d.url.trim());}catch{}const ok=url&&url.protocol==='https:'&&((['youtube.com','www.youtube.com','m.youtube.com'].includes(url.hostname)&&/^\/shorts\/[A-Za-z0-9_-]+\/?$/.test(url.pathname))||(['instagram.com','www.instagram.com'].includes(url.hostname)&&/^\/reels?\/[A-Za-z0-9_-]+\/?$/.test(url.pathname)));if(!ok){$('#board-video-error').textContent='공개된 유튜브 쇼츠 또는 인스타그램 릴스의 보안 연결 링크(https)를 입력하세요.';return;}boardVideoResults();}
 else if(f.id==='board-video-save'){const ids=[...f.querySelectorAll('input[name="places"]:checked')].map(input=>input.value).filter(id=>sampleStopIds.includes(id));if(!ids.length){$('#board-video-error').textContent='저장할 장소를 선택해 주세요.';return;}if(!saveSelectedPlaces(ids))return;$('#dialog').close();render();toast('선택한 장소를 저장했어요.');}
 else if(f.id==='extract-form'){let url;try{url=new URL($('#video-url').value.trim());}catch{}const ok=url&&url.protocol==='https:'&&((['youtube.com','www.youtube.com','m.youtube.com'].includes(url.hostname)&&/^\/shorts\/[A-Za-z0-9_-]+\/?$/.test(url.pathname))||(['instagram.com','www.instagram.com'].includes(url.hostname)&&/^\/reels?\/[A-Za-z0-9_-]+\/?$/.test(url.pathname)));if(!ok){$('#url-error').textContent='공개된 유튜브 쇼츠 또는 인스타그램 릴스의 보안 연결 링크(https)를 입력하세요.';return;}previewExtractionStarted=true;state.source=url.href;state.extraction='processing';state.filter='전체';save();go('processing');}

 else if(f.id==='suggest-place-form'){
  const name=d.name.trim(),address=d.address.trim();
  if(!name||!address){toast('장소 이름과 주소를 입력해 주세요.');return;}
  state.tickets.push({id:'TK-'+Date.now(),type:'장소 제안하기',body:name+' · '+address,status:'open'});
  save();render();toast('제안을 저장했어요.');
 }
 else if(f.id==='edit-trip-form'){if(!updateTripInfo(d)){$('#edit-trip-error').textContent='여행 이름과 날짜를 확인해 주세요.';return;}$('#dialog').close();render();}
 else if(f.id==='new-trip-form'){const dayCount=tripRangeDays(tripDraft?.start,tripDraft?.end);if(!dayCount||tripDraft.start<tripToday()||!createTrip({...d,date:tripDraft.start,dayCount})){$('#new-trip-error').textContent='여행 이름과 날짜를 확인해 주세요.';return;}$('#dialog').close();go(tripDetailRoute());}
 else if(f.id==='support-form'){state.tickets.push({id:'TK-'+Date.now().toString().slice(-6),type:d.type,body:d.body.trim(),status:'open'});save();render();toast('문의 내용을 저장했어요.');}
 else if(f.id==='request-form'){const params=new URLSearchParams(location.hash.split('?')[1]||'');const result=submitTravelRequest(d,{free:params.get('mode')==='free',example:params.get('sample')==='1'});if(result.error){$('#request-error').textContent=result.error;return;}go(result.route);}
 else if(f.id==='quote-form'){if(!requestAvailable()){ $('#quote-error').textContent='해당 날짜가 수락 불가입니다. 가능 일정부터 변경해주세요.';return;}if(!d.ack){$('#quote-error').textContent='요청 일정과 전체 금액을 확인해 주세요.';return;}if(makeQuote(Number(d.amount),d.plan,undefined,undefined,'mina',d.message)){go('guide-activity');toast('제안을 보냈어요.');}else $('#quote-error').textContent='금액과 코스를 확인해 주세요. 이미 보냈거나 마감된 요청에는 보낼 수 없어요.';}

 else if(f.id==='checkout-form'){if(!d.terms||!d.pendingAck)return;if(requestBooking(d.name.trim(),d.email)){go('booking');}else{go(state.booking?'booking':'quote');}}
 else if(f.id==='mate-cancel-form'){const b=state.booking;if(window.ReelAccess.isAdmin||window.ReelAccess.mode()!=='guide'||!b||!['awaiting_mate_fee','confirmed'].includes(b.status)||String(d.reason||'').trim().length<2)return;const pending=b.status==='awaiting_mate_fee';b.cancelReason=d.reason.trim();b.status=pending?'cancelled':'cancellation_requested';if(pending){b.feeStatus='void';state.request.status='withdrawn';}else b.refundStatus='review';syncConversations();save();go('guide-fee');}
 else if(f.id==='mate-progress-form'){const b=state.booking;if(window.ReelAccess.isAdmin||window.ReelAccess.mode()!=='guide'||!b||!d.ack)return;if(d.kind==='mate-cash'&&['confirmed','completed','cancellation_requested'].includes(b.status)){b.cashStatus='collected';b.cashCollectedAt=Date.now();}else if(d.kind==='mate-complete'&&b.status==='confirmed'&&Date.now()>=Date.parse((b.endDate||b.date)+'T'+(b.time||'00:00')+':00+09:00')+4*3600000){b.status='completed';b.completedAt=Date.now();state.request.status='completed';}else return;save();$('#dialog').close();go('guide-fee');}
 else if(f.id==='mate-fee-form'){if(!d.terms)return;if(confirmMateFee(d.outcome||'success')){go('guide-fee');toast('수수료 결제 후 예약이 확정됐어요.');}else{if(state.booking?.status==='cancelled'){render();return;}const error=$('#mate-fee-error');if(error)error.textContent='결제가 완료되지 않았어요. 예약은 아직 확정되지 않았습니다.';}}
 else if(f.id==='user-report-form'){const room=chatContext()?.room;if(room?.id!==d.thread||!reportUser(room,d.reason,d.details)){$('#report-error').textContent='신고 사유를 선택하고 기타 사유는 상세 내용을 입력해 주세요. 중복 신고는 저장되지 않아요.';return;}$('#dialog').close();toast('신고를 저장했어요.');}
 else if(f.id==='chat-form'){if(sendChatMessage(d.text)){render();$('#chat-form textarea')?.focus();}else{render();}}
 else if(f.id==='cancel-form'){const b=state.booking;if(!b||!['awaiting_mate_fee','confirmed'].includes(b.status)||!d.terms)return;const pending=b.status==='awaiting_mate_fee';b.cancelReason=d.reason;if(!pending)b.refundStatus='review';b.status=pending?'cancelled':'cancellation_requested';if(pending){b.feeStatus='void';state.request.status='withdrawn';}save();go('booking');}
 else if(f.id==='decline-form'){state.request.status='declined';state.request.reason=d.reason.trim();state.quote=null;save();$('#dialog').close();render();}
 else if(f.id==='verify-form'){state.guideApproved=true;state.adminReview='approved';save();render();toast('준의 프로필을 공개했습니다.');}

});
window.addEventListener('reeltrip-access-change',()=>render());
window.addEventListener('storage',e=>{if(e.key===mateKey){window.ReelAccess.syncMate?.();render();}});
window.addEventListener('hashchange',()=>{if(current()!=='manual'){placeSearchVersion++;placeSelectionVersion++;placeSearchResults=[];placePickerTab='search';placePickerQuery='';placePickerStatus='';placePickerSelected='';pendingAPIPlace=null;}if(current()!=='signup-email')signupEmailStep='address';render();window.scrollTo(0,0);$('#main')?.focus({preventScroll:true});});
if(comparison){
 state.saved=true;ensureDays();
 if(guided&&['quote','checkout','booking'].includes(current())){
 state.request={id:'RQ-COMPARE',status:'requested',date:state.date,time:state.time,party:2,notes:'영어 안내와 한국어 주문 도움이 필요해요.',guide:'미나',guideId:'mina',stops:snapshot(),must:[],createdAt:Date.now()};makeQuote();
 if(current()==='booking'){state.request.status='booked';state.booking={...JSON.parse(JSON.stringify(state.quote)),id:'RT-COMPARE',quoteVersion:state.quote.version,status:'confirmed',customer:'제이미',email:'jamie@example.com',policyVersion:'DRAFT-2026-11-16',refundStatus:'없음'};}
 }
}
window.ReelBookingTools.init({state:()=>state,save,render,toast,modal,icon});
window.ReelRevenue.init({state:()=>state,save});
if(needsTowerSeed)save();
// Only the isolated developer preview supplies fixtures; normal app startup is unchanged.
if(window.ReelStatePreview){
 const fixture=window.ReelStatePreview.fixture||{},kind=fixture.flow||'none';
 state=initial();state.saved=fixture.saved??false;
 if(!['none','default'].includes(kind)){
  state.request={id:'RQ-PREVIEW',status:'requested',date:state.date,time:state.time,party:2,tripTitle:state.title,guide:'미나',guideId:'mina',stops:snapshot(),must:[],createdAt:Date.now()};
  if(kind==='closed')state.request.status='withdrawn';
  if(!['waiting','closed'].includes(kind)){
   makeQuote(240000,undefined,undefined,undefined,'mina');
   makeQuote(210000,undefined,undefined,{rate:52500,hours:4,extra:10000},'jun');
   if(kind==='expired')state.quote.expires=Date.now()-1000;
   if(['fee','failed','confirmed','cancel','cancelled','completed'].includes(kind)){
    const pending=['fee','failed'].includes(kind);
    if(window.ReelAccess.mode()==='guide')state.quote=proposals().find(q=>q.guideId==='mina')||state.quote;
    state.request.status=pending?'matching':kind==='cancelled'?'cancelled':'booked';
    state.booking={...JSON.parse(JSON.stringify(state.quote)),id:'RT-PREVIEW',proposalId:state.quote.id,requestId:state.request.id,quoteVersion:state.quote.version,status:({fee:'awaiting_mate_fee',failed:'awaiting_mate_fee',confirmed:'confirmed',cancel:'cancellation_requested',cancelled:'cancelled',completed:'completed'})[kind],customer:'제이미',requestedAt:Date.now(),confirmedAt:pending?null:Date.now(),feeAmount:Math.round(state.quote.amount*.1),feeRate:.1,feeStatus:kind==='failed'?'failed':pending?'pending':'paid',paymentMethod:'cash',cashStatus:'uncollected',policyVersion:'CASH-MATCH-10-V1',refundStatus:'없음'};
    if(kind==='cancel')state.booking.cancelReason='여행 일정 변경';
   }
  }
 }
 if(fixture.concurrentRequest&&state.booking){state.request={...state.request,id:'RQ-PREVIEW-NEXT',status:'quoted',tripTitle:'새 여행 메이트 요청'};}
 if(fixture.unpaidCancellation&&state.booking){state.booking.feeStatus='pending';state.booking.confirmedAt=null;}
 if(fixture.ended&&state.booking){state.booking.date='2020-01-01';state.booking.endDate='2020-01-01';}
 if(fixture.emptyBoard)state.board=[];
 if(fixture.emptyLibrary)state.library=[];
 if(fixture.noPlaces){state.places=[];state.board=[];state.library=[];}
 if(fixture.unselected)state.selected=[];
 if(fixture.resultFilter)state.filter=fixture.resultFilter;
 if(fixture.past)state.date='2020-01-01';
 // Rebuild trip snapshots after fixture overrides, before the first render.
 state.days=[{date:state.date,time:state.time,ids:[...state.board],durations:{}}];state.day=0;
 if(fixture.multiDay)state.days.push({date:dateAfter(state.date,1),time:'10:00',ids:['food'],durations:{}});
 state.trips=[];state.activeTripId='trip-preview';stashTrip();
 if(fixture.ticket)state.tickets=[{id:'TK-PREVIEW',type:'예약·환불',body:'여행 일정 변경에 따른 취소 절차를 확인하고 싶어요.',status:fixture.ticket}];
 if(fixture.mateApplication){
  const application=JSON.parse(JSON.stringify(fixture.mateApplication));
  if(application.step>=2||application.status!=='draft')application.fields={specialty:1,regions:[{city:0,district:3},{city:0,district:0}],languages:['ko','en'],name:'하늘',nameChecked:normalizeNickname('하늘'),bio:'서울 성수와 종로의 카페, 동네 맛집을 함께 둘러봐요. 영어로 주문을 돕고 여행자의 속도에 맞춰 여유롭게 산책해요.',contact:'010-0000-0000',...application.fields};
  saveMate(application);
 }
 if(fixture.available!==undefined)state.available=fixture.available;
 if(fixture.approved!==undefined)state.guideApproved=fixture.approved;
 if(fixture.adminReview)state.adminReview=fixture.adminReview;
 if(fixture.guide)state.guide=fixture.guide;
 if(fixture.placeStatus)state.places.forEach(p=>{p.verified=fixture.placeStatus==='verified';p.rejected=fixture.placeStatus==='rejected';});
 if(fixture.viewedProposals)state.viewedProposals=proposals().map(q=>q.id+':'+q.version);
 if(fixture.review)state.review={rating:5,body:'약속한 장소에서 만나 즐겁게 여행했어요.'};
 if(fixture.extraction)state.extraction=fixture.extraction;
 if(fixture.picker)placePickerTab=fixture.picker;
 if(fixture.emailStep)signupEmailStep=fixture.emailStep;
 if(fixture.notificationFilter)notificationFilter=fixture.notificationFilter;
 // Sample history belongs only to the isolated screen preview.
 if(fixture.notificationHistory){
  const now=Date.now(),day=86400000;
  const samples=[
   ['메이트의 제안이 도착했어요','준','quote',2*3600000],
   ['여행 요청 상태를 확인하세요','미나','guides',day],
   ['메이트의 제안이 도착했어요','미나','quote',2*day],
   ['예약이 확정됐어요','준','trips',3*day],
   ['여행이 완료됐어요','미나','trips',5*day],
   ['예약이 취소됐어요','준','trips',7*day],
   ['여행이 완료됐어요','미나','trips',10*day]
  ];
  state.previewNotifications=samples.map(([title,name,route,age],i)=>({id:`preview:notification:${i}`,category:'guide',title,body:`${name} · ${state.title}`,route,time:now-age}));
  state.readNotifications=state.previewNotifications.slice(3).map(n=>n.id);
 }
 if(fixture.readNotifications)state.readNotifications=notificationItems().map(n=>n.id);
 if(fixture.recommendation){recommendationStatus=fixture.recommendation==='empty'?'ready':fixture.recommendation;recommendationRows=[];
  if(['ready','saved'].includes(fixture.recommendation)){
   recommendationStatus='ready';
   recommendationRows=state.places.filter(p=>sampleStopIds.includes(p.id)).map(p=>({...p,id:'preview-'+p.id,placeId:'preview-'+p.id,source:'google',demoCoordinates:false,photoURL:undefined,attributions:[]}));
   if(fixture.recommendation==='saved'){state.places.push(...recommendationRows);state.library.push(...recommendationRows.map(p=>p.id));}
  }
 }
 if(fixture.chat){
  const room=syncConversations()[0];
  if(room){room.messages=[{sender:'guide',text:'안녕하세요! 여행 당일 만날 장소를 확인해 주세요.',at:Date.now()-60000},{sender:'customer',text:'네, 약속한 시간에 도착할게요.',at:Date.now()-30000}];room.read={customer:fixture.chat==='read'?2:0,guide:2};}
 }
 if(fixture.chat==='mixed'){
  const room=syncConversations()[0];
  if(room){
   room.read={customer:0,guide:0};
   state.conversations.unshift({...room,id:'preview-closed-conversation',requestId:'preview-closed-request',bookingId:'preview-closed-booking',guideId:'mina',guide:'미나',customer:'알렉스',status:'cancelled',messages:room.messages.map(m=>({...m,at:m.at+20000})),read:{customer:0,guide:0}});
  }
 }
 guidesTab=fixture.guidesTab||'requests';
}
// Prevent another open app tab from saving the deleted member's in-memory data.
window.addEventListener('storage',event=>{
 if(event.key!=='reeltrip-prototype-access-v1'||event.newValue!==null||window.ReelAccess.isAdmin)return;
 clearTimeout(timer);setPreviewMember(false);state=initial();window.ReelAccess.reset();
 pendingRestaurant=null;pendingEstimate=false;pendingRequestRoute=null;pendingRecommendation=null;profileDraftPhoto='';checkedNickname='';
 $('#dialog')?.close();go('home');render();
});
if(!location.hash)location.hash=window.ReelAccess.home();
render();
window.ReelPlaceAPI?.hydrate(state).then(changed=>{if(changed)render();});
})();
