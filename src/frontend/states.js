(() => {
 const screens=window.REEL_REVIEW_SCREENS, registry=window.REEL_SCREEN_STATES;
 let expectedPreview='',previewRun=0;
 const screen=document.querySelector('#screen'),states=document.querySelector('#states'),frame=document.querySelector('iframe'),language=document.querySelector('#language');
 for(const item of screens){const option=document.createElement('option');option.value=item.route;option.textContent=`${item.id} · ${item.name}${registry[item.route]?' · '+registry[item.route].length+'개 상태':' · 기본 화면'}`;screen.append(option);}
 function select(route,id,lang,update=true){
  const item=screens.find(s=>s.route===route)||screens.find(s=>s.route==='guides');
  const variants=registry[item.route]||[{id:'default',label:'기본 화면',condition:'이 화면의 개별 상태는 아직 등록되지 않았습니다. 로그인한 예시 계정의 초기 화면입니다.',transition:item.action}];
  const selected=variants.find(s=>s.id===id)||variants[0];
  screen.value=item.route;language.value=lang==='en'?'en':'ko';states.replaceChildren();
  for(const variant of variants){const button=document.createElement('button');button.type='button';button.textContent=variant.label;button.setAttribute('aria-pressed',String(variant===selected));button.onclick=()=>select(item.route,variant.id,language.value);states.append(button);}
  document.querySelector('#condition').textContent=selected.condition;document.querySelector('#transition').textContent=selected.transition;
  document.querySelector('#state-note').textContent=selected.note||'상태별 문구·버튼·데이터를 확인하세요.';
  document.querySelector('#preview-status').textContent='선택한 상태를 불러오는 중…';
  document.querySelector('#spec').href=`../../docs/product.html#spec-${item.id}`;
  const hash=new URLSearchParams({screen:item.route,state:selected.id,lang:language.value}).toString();
  if(location.hash.slice(1)!==hash)history[update?'pushState':'replaceState'](null,'','#'+hash);
  frame.classList.toggle('is-admin',item.role==='admin');
  const url=`preview${item.role==='admin'?'-admin':''}${language.value==='en'?'-en':''}.html?lang=${language.value}&screen=${item.route}&state=${selected.id}#${selected.fixture?.hash||item.route}`;
  const instance=new URL(url,location.href);instance.searchParams.set('previewRun',String(++previewRun));
  expectedPreview=instance.href;frame.style.visibility='hidden';frame.src=instance.href;document.querySelector('#standalone').href=url;
  if(new URL(location.href).protocol==='file:'){
   const status=document.querySelector('#preview-status'),link=document.createElement('a');
   status.textContent='파일로 직접 열면 브라우저 제한으로 앱 미리보기가 표시되지 않을 수 있어요. 로컬 서버를 실행한 뒤 열어 주세요: ';
   link.href='http://localhost:8765/src/frontend/states.html#'+hash;link.textContent='로컬 서버에서 미리보기 열기 ↗';status.append(link);
  }
  document.querySelector('#selection').textContent=`${item.name} · ${selected.label}`;
 }
 function restore(){const p=new URLSearchParams(location.hash.slice(1));select(p.get('screen'),p.get('state'),p.get('lang'),false);}
 screen.onchange=()=>select(screen.value,null,language.value);language.onchange=()=>select(screen.value,new URLSearchParams(location.hash.slice(1)).get('state'),language.value);
 document.querySelector('#reset').onclick=()=>select(screen.value,new URLSearchParams(location.hash.slice(1)).get('state'),language.value,false);
 document.querySelector('#copy').onclick=async()=>{const status=document.querySelector('#copy-status');try{await navigator.clipboard.writeText(location.href);status.textContent='현재 상태 링크를 복사했어요.';}catch{status.textContent='주소 표시줄의 URL을 복사해 주세요.';}};
 window.addEventListener('message',event=>{
  if(event.source!==frame.contentWindow||event.origin!==location.origin||event.data?.type!=='reeltrip-preview-status')return;
  const message=event.data;let current;try{current=new URL(message.url);}catch{return;}
  if(current.origin!==location.origin||current.pathname!==new URL(expectedPreview).pathname||current.search!==new URL(expectedPreview).search)return;
  if(event.data.ready!==true){frame.style.visibility='hidden';document.querySelector('#preview-status').textContent='화면을 불러오지 못했어요. 선택 상태로 되돌리기를 눌러 다시 불러와 주세요.';return;}
  frame.style.visibility='visible';
  const moved=current.hash!==new URL(expectedPreview).hash;
  document.querySelector('#preview-status').textContent=moved?'미리보기 안에서 다른 화면으로 이동했습니다. 선택 상태로 되돌리면 처음 화면을 다시 볼 수 있어요.':message.changed?'미리보기 안에서 조작한 상태입니다. 처음 상태와 비교하려면 선택 상태로 되돌려 주세요.':'선택한 상태 표시 중';
 });
 window.addEventListener('hashchange',restore);window.addEventListener('popstate',restore);restore();
})();
