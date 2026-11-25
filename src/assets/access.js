/* Prototype permissions only. Production authorization must run on the server. */
(() => {
'use strict';
const en=document.documentElement.lang==='en', t=(ko,enText)=>en?enText:ko;
const admin=document.body.dataset.surface==='admin';
const key='reeltrip-prototype-access-v1';
const profiles={customer:['customer'],pending:['customer'],guide:['customer','guide'],suspended:['customer']};
let session={profile:'customer',mode:'customer'};
try{const saved=JSON.parse(localStorage.getItem(key)||'null');if(saved&&profiles[saved.profile])session={profile:saved.profile,mode:saved.mode==='guide'&&profiles[saved.profile].includes('guide')?'guide':'customer'};}catch{}
function syncMate(){let a;try{a=JSON.parse(localStorage.getItem('reeltrip-mate-application-v1')||'null');}catch{}if(!a?.status)return;session.profile=a.status==='approved'?'guide':a.status==='pending'?'pending':'customer';if(session.profile!=='guide')session.mode='customer';persist();}
function persist(){try{localStorage.setItem(key,JSON.stringify(session));}catch{}}
syncMate();
function allowed(role,route){syncMate();if(admin)return role==='admin';if(role==='customer'&&['messages','chat','account','support','policies','notifications','settings','signup','signup-email','mate-register'].includes(route))return true;return profiles[session.profile].includes(role)&&role===session.mode;}
function home(){return admin?'admin':session.mode==='guide'?'guide-desk':'home';}
function controls(){if(admin)return '<div class="modebar">'+t('운영 웹 · 관리자','Operations web · Administrator')+'</div>';
return '<div class="modebar"><span>'+ (session.mode==='guide'?t('메이트 모드','Mate mode'):t('여행자 모드','Traveler mode'))+'</span>'+(profiles[session.profile].includes('guide')?'<button class="textbtn" data-access-mode="'+(session.mode==='guide'?'customer':'guide')+'">'+(session.mode==='guide'?t('여행자로 전환','Switch to traveler'):t('메이트로 전환','Switch to mate'))+'</button>':'')+'</div>';}
function settings(){
 const query=new URLSearchParams(location.search).get('tools')==='1'?'?tools=1':'';
 const target=(en?'index.html':'english.html')+query+'#settings';
 const mate=session.mode==='guide',canSwitch=profiles[session.profile].includes('guide');
 const modeLabel=mate?t('메이트 모드','Mate mode'):t('여행자 모드','Traveler mode');
 const modeRow=canSwitch?'<button type="button" class="settings-mode-row" data-access-mode="'+(mate?'customer':'guide')+'"><span>'+modeLabel+'</span><span class="settings-row-value">'+(mate?t('여행자로 전환','Switch to traveler'):t('메이트로 전환','Switch to mate'))+'</span><span class="settings-row-arrow" aria-hidden="true">›</span></button>':'<div class="settings-mode-row"><span>'+modeLabel+'</span></div>';
 return '<section class="account-preferences"><div class="account-setting-row"><div><strong>'+t('언어','Language')+'</strong><p>'+t('한국어','English')+'</p></div><a class="btn secondary small" href="'+target+'" lang="'+(en?'ko':'en')+'">'+(en?'한국어':'English')+'</a></div><div class="account-mode">'+modeRow+'</div></section>';
}
function tools(){if(admin)return '';return '<label>'+t('계정 권한','Account permissions')+'<select id="demo-access-profile">'+Object.keys(profiles).map(p=>'<option value="'+p+'" '+(p===session.profile?'selected':'')+'>'+({customer:t('일반 고객','Customer'),pending:t('메이트 심사 중','Mate pending'),guide:t('승인된 메이트','Approved mate'),suspended:t('메이트 정지','Mate suspended')})[p]+'</option>').join('')+'</select></label>';}
function blocked(){return '<section class="card pad"><h1>'+t('이 모드에서는 열 수 없는 화면입니다.','This screen is unavailable in this mode.')+'</h1><p>'+t('계정 권한과 현재 모드를 확인해 주세요. 운영 화면은 별도 운영 웹에서 사용합니다.','Check your account permissions and active mode. Operations screens use a separate web app.')+'</p><a class="btn" href="#'+home()+'">'+t('현재 모드 홈으로','Back to mode home')+'</a></section>';}
document.addEventListener('click',e=>{const b=e.target.closest('[data-access-mode]');if(!b)return;const mode=b.dataset.accessMode;if(!profiles[session.profile].includes(mode))return;session.mode=mode;persist();location.hash=home();window.dispatchEvent(new Event('reeltrip-access-change'));});
document.addEventListener('change',e=>{if(e.target.id!=='demo-access-profile'||!profiles[e.target.value])return;session.profile=e.target.value;if(!profiles[session.profile].includes(session.mode))session.mode='customer';persist();location.hash=home();window.dispatchEvent(new Event('reeltrip-access-change'));});
function switchMode(mode){syncMate();if(!profiles[session.profile].includes(mode))return false;session.mode=mode;persist();return true;}
window.ReelAccess={switchMode,reset(){session={profile:'customer',mode:'customer'};},syncMate,allowed,home,controls,settings,tools,blocked,isAdmin:admin,mode:()=>session.mode};
})();
