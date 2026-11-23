// Generate script-free email examples. Use the renderer with real server values when sending.
const fs=require('node:fs'),path=require('node:path');
const {render}=require('../../src/assets/verification-email.js');
const out=path.join(__dirname,'../../src/emails');
fs.mkdirSync(out,{recursive:true});
for(const locale of ['ko','en','zh-CN','ja']){
 const email=render({locale,preview:true,code:'482916',issuedAt:'2026-11-23T02:13:00Z'});
 fs.writeFileSync(path.join(out,`verification-${locale}.html`),email.html+'\n');
}
console.log('Generated four verification email HTML examples. No email sent.');
