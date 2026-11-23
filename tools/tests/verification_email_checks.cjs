const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {render,normalizeLocale}=require('../../src/assets/verification-email.js');
const sample={code:'482916',issuedAt:'2026-11-23T02:13:00Z'};
const subjects=new Set();
for(const locale of ['ko','en','zh-CN','ja']){
 const result=render({...sample,locale,preview:true});subjects.add(result.subject);
 assert(result.html.includes(`lang="${locale}"`));
 assert(result.html.includes(sample.code)&&result.text.includes(sample.code));
 assert(result.html.includes('UTC+09:00'));
 assert(result.html.includes(`<img src="../assets/brand/reeltrip-logo-${locale}-charcoal-transparent.png"`));
 const mail=render({...sample,locale});
 assert(mail.html.includes('src="cid:reeltrip-email-logo"'));
 assert(fs.existsSync(path.join(__dirname,'../../src',mail.inlineImages[0].assetPath)));
 assert(!/<script|<link|\son\w+=/i.test(result.html));
 assert.equal(fs.readFileSync(path.join(__dirname,`../../src/emails/verification-${locale}.html`),'utf8'),result.html+'\n');
 const zero=render({...sample,locale,code:'012345'});assert(zero.text.includes('012345'));
}
assert.equal(subjects.size,4);
for(const [input,output] of [['en-US','en'],['ja-JP','ja'],['zh-Hans','zh-CN'],['ko-KR','ko'],['<script>','ko'],[undefined,'ko']])assert.equal(normalizeLocale(input),output);
for(const code of ['<img>',123456,'12345','1234567','１２３４５６'])assert.throws(()=>render({...sample,code}));
assert.throws(()=>render({...sample,issuedAt:'bad'}));
assert.equal(render(sample).expiresAt,'2026-11-23T02:43:00.000Z');
assert(render(sample).html.includes('본 메일은 발신전용 입니다.'));
assert(!render(sample).text.includes('다른 사람에게 공유'));
assert(!render(sample).html.includes('<br>Reeltrip'));
console.log('PASS: four localized email bodies/subjects, script-free generated HTML, leading zeros, locale fallback, code and timestamp validation.');
