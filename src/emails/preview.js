/* Preview only: no network calls, addresses, or real credentials. */
(()=>{
 const locales=['ko','en','zh-CN','ja'];
 const labels={
  ko:['인증 이메일 미리보기','예시 인증번호와 시간을 사용한 미리보기입니다. 실제 이메일은 발송되지 않습니다.','언어','메일 HTML 열기','가입 화면으로','제목','인증 이메일 본문'],
  en:['Verification email preview','This preview uses a sample code and timestamps. No email is sent.','Language','Open email HTML','Back to sign-up','Subject','Verification email body'],
  'zh-CN':['验证邮件预览','此预览使用示例验证码和时间，不会发送真实邮件。','语言','打开邮件 HTML','返回注册','主题','验证邮件正文'],
  ja:['認証メールのプレビュー','サンプルのコードと日時を使用しています。実際のメールは送信されません。','言語','メール HTML を開く','登録画面に戻る','件名','認証メール本文']
 };
 const explicit=new URLSearchParams(location.search).get('lang');
 let saved='ko';
 try{saved=localStorage.getItem('reeltrip-interface-language')||'ko';}catch{}
 const select=document.getElementById('language');
 function show(locale){
  const c=labels[locale];
  document.documentElement.lang=locale;document.title=c[0]+' · Reeltrip';select.value=locale;
  ['title','note','language-label','open-html','back'].forEach((id,i)=>document.getElementById(id).textContent=c[i]);
  const email=window.ReelVerificationEmail.render({locale,preview:true,code:'482916',issuedAt:'2026-11-23T02:13:00Z'});
  document.getElementById('subject').textContent=c[5]+': '+email.subject;
  const frame=document.getElementById('email');frame.title=c[6];frame.srcdoc=email.html;
  document.getElementById('open-html').href=`verification-${locale}.html`;
  document.getElementById('back').href=`../app/${locale==='en'?'english':'index'}.html?lang=${locale}#signup-email`;
 }
 select.addEventListener('change',()=>{
  show(select.value);
  const url=new URL(location.href);url.searchParams.set('lang',select.value);
  try{history.replaceState(null,'',url);}catch{}
 });
 show(locales.includes(explicit)?explicit:window.ReelVerificationEmail.normalizeLocale(saved));
})();
