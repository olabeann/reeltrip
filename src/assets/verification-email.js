/* Shared by the browser preview and a future mail sender (CommonJS). No mail is sent here. */
(function(root){
 'use strict';
 const copy={
  ko:{brand:'릴트립',subject:'[릴트립] 이메일 인증 코드',hello:'안녕하세요.',title:'이메일을 인증해 주세요',intro:'릴트립에서 요청하신 이메일 인증 코드입니다.',instruction:'가입 중인 화면에 아래 6자리 코드를 입력해 주세요.',label:'이메일 인증 코드',created:'발급 시간',expires:'만료 시간',footer:'본 메일은 발신전용 입니다.',tagline:'마음에 든 순간을, 나만의 여행으로.'},
  en:{brand:'Reeltrip',subject:'[Reeltrip] Your email verification code',hello:'Hello,',title:'Verify your email',intro:'Here is the email verification code you requested for Reeltrip.',instruction:'Enter the 6-digit code below on the sign-up screen.',label:'Email verification code',created:'Issued at',expires:'Expires at',footer:'This is a send-only email. Replies are not monitored.',tagline:'Turn moments you love into your next trip.'},
  'zh-CN':{brand:'映旅',subject:'[Reeltrip] 邮箱验证码',hello:'您好！',title:'请验证您的邮箱',intro:'这是您在 Reeltrip 申请的邮箱验证码。',instruction:'请在注册页面输入以下 6 位验证码。',label:'邮箱验证码',created:'发送时间',expires:'失效时间',footer:'此邮箱仅用于发送邮件，请勿回复。',tagline:'把心动的瞬间，变成自己的旅行。'},
  ja:{brand:'リールトリップ',subject:'[Reeltrip] メールアドレス認証コード',hello:'こんにちは。',title:'メールアドレスを認証してください',intro:'Reeltripでリクエストされたメールアドレス認証コードです。',instruction:'登録画面に以下の6桁のコードを入力してください。',label:'メールアドレス認証コード',created:'発行日時',expires:'有効期限',footer:'本メールは送信専用です。',tagline:'心が動いた瞬間を、自分だけの旅に。'}
 };
 function normalizeLocale(value){
  const locale=String(value||'').replace(/_/g,'-').toLowerCase();
  if(locale==='zh'||locale==='zh-cn'||locale==='zh-hans'||locale.startsWith('zh-hans-'))return 'zh-CN';
  if(/^en(?:-|$)/.test(locale))return 'en';
  if(/^ja(?:-|$)/.test(locale))return 'ja';
  return 'ko';
 }
 function escape(value){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
 function render({locale,code,issuedAt,preview=false}){
  locale=normalizeLocale(locale);
  if(typeof code!=='string'||!/^\d{6}$/.test(code))throw new TypeError('code must be a six-digit string');
  const issued=new Date(issuedAt),expires=new Date(issued.getTime()+30*60*1000);
  if(!Number.isFinite(issued.getTime()))throw new TypeError('Valid issuedAt is required');
  const c=copy[locale];
  const logoFile=`reeltrip-logo-${locale}-charcoal-transparent.png`;
  const logoCid='reeltrip-email-logo';
  const logoSrc=preview?`../assets/brand/${logoFile}`:`cid:${logoCid}`;
  const logoHeight=({ko:81,en:69,'zh-CN':81,ja:60})[locale];
  const format=date=>new Intl.DateTimeFormat(locale,{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).format(date)+' (UTC+09:00)';
  const issuedText=format(issued),expiresText=format(expires);
  const text=[c.brand,c.hello,c.title,c.intro,c.instruction,`${c.label}: ${code}`,`${c.created}: ${issuedText}`,`${c.expires}: ${expiresText}`,c.footer].join('\n\n');
  const html=`<!doctype html>
<html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${escape(c.subject)}</title></head>
<body style="margin:0;padding:0;background-color:#f5f8fb;color:#19364e;font-family:Arial,'Apple SD Gothic Neo','Malgun Gothic','Microsoft YaHei',sans-serif;">
<div style="display:none;font-size:1px;line-height:1px;color:#f5f8fb;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${escape(c.instruction)}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f5f8fb;"><tr><td align="center" style="padding:32px 12px;">
<!--[if mso]><table role="presentation" width="640" cellspacing="0" cellpadding="0" border="0"><tr><td><![endif]-->
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:640px;background-color:#ffffff;border:1px solid #dce6ee;border-radius:16px;">
<tr><td style="padding:36px 28px 28px;border-bottom:1px solid #edf2f6;"><img src="${logoSrc}" alt="${escape(c.brand)}" width="180" height="${logoHeight}" style="display:block;width:180px;height:${logoHeight}px;max-width:100%;border:0;"><div style="margin-top:8px;font-size:12px;line-height:20px;color:#657e90;">${escape(c.tagline)}</div></td></tr>
<tr><td style="padding:32px 28px 0;"><p style="margin:0 0 14px;font-size:14px;line-height:24px;color:#566e80;">${escape(c.hello)}</p><h1 style="margin:0 0 18px;font-size:26px;line-height:36px;letter-spacing:-0.6px;color:#19364e;">${escape(c.title)}</h1><p style="margin:0;font-size:15px;line-height:26px;color:#566e80;">${escape(c.intro)}<br>${escape(c.instruction)}</p></td></tr>
<tr><td style="padding:28px 28px 0;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#eff8ff;border:1px solid #d7ecfc;border-radius:12px;"><tr><td align="center" style="padding:22px 12px 24px;"><p style="margin:0 0 12px;font-size:13px;line-height:20px;color:#486b85;">${escape(c.label)}</p><p dir="ltr" style="margin:0;font-family:Consolas,'Courier New',monospace;font-size:40px;font-weight:700;line-height:50px;letter-spacing:6px;color:#008af0;white-space:nowrap;">${code}</p></td></tr></table></td></tr>
<tr><td align="center" style="padding:16px 28px 28px;"><p style="margin:0;font-size:12px;line-height:22px;color:#708494;">${escape(c.created)}: ${escape(issuedText)}<br>${escape(c.expires)}: ${escape(expiresText)}</p></td></tr>
<tr><td style="padding:24px 28px;border-top:1px solid #edf2f6;"><p style="margin:0;font-size:11px;line-height:20px;color:#8495a2;">${escape(c.footer)}</p></td></tr>
</table><!--[if mso]></td></tr></table><![endif]-->
</td></tr></table></body></html>`;
  return {locale,subject:c.subject,html,text,expiresAt:expires.toISOString(),inlineImages:preview?[]:[{cid:logoCid,filename:logoFile,assetPath:`assets/brand/${logoFile}`,contentType:'image/png'}]};
 }
 const api={normalizeLocale,render};
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.ReelVerificationEmail=api;
})(typeof window==='undefined'?globalThis:window);
