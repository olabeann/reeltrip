릴트립 이메일 인증 템플릿

미리보기: index.html
직접 열 수 있는 발송 HTML 예시: verification-ko.html / verification-en.html /
verification-zh-CN.html / verification-ja.html
HTML 예시에는 JavaScript와 외부 폰트가 없으며, 프로젝트의 로고 PNG를 사용합니다.
각 메일은 ko / en / zh-CN / ja에 맞는 로고 PNG를 표시합니다.
중국어 브랜드명: 映旅. 일본어 브랜드명: リールトリップ.
레이아웃은 테이블과 인라인 스타일로 구성합니다. 실제 메일 클라이언트 수신 검증은 별도입니다.

생성: node tools/scripts/build_verification_emails.cjs
검사: node tools/tests/verification_email_checks.cjs
원본: src/assets/verification-email.js (브라우저 및 Node CommonJS 공용)

현재 단계
- 미리보기와 템플릿만 구현됨. 이메일을 보내거나 실제 인증을 수행하지 않음.
- 예시 코드는 앱 시연 코드와 같은 482916. 인증 코드는 발급 시각으로부터 30분 후 만료되도록 표시함.
- 미리보기는 ?lang= 값을 우선 사용하고, 없으면 앱과 동일한
  reeltrip-interface-language 설정을 사용함. 지원 언어: ko, en, zh-CN, ja.
- 미리보기 언어 선택은 앱의 저장된 언어 설정을 변경하지 않음.

발송 서버 연결 계약
1. 인증 요청 시 프런트엔드 signupLanguage() 값을 locale 필드로 서버에 전달한다.
   브라우저 언어나 수신 이메일 도메인으로 사용자 선택을 덮어쓰지 않는다.
2. 서버는 해당 요청의 locale을 인증 요청과 함께 보관하고 재발송에도 사용한다.
3. 서버가 생성한 코드와 발급 시각을 다음처럼 렌더러에 넘긴다:

   const {render}=require('../assets/verification-email.js');
   const message=render({locale:request.locale,code:serverCode,
     issuedAt:issuedAt.toISOString()});
   // 메일 공급자에 {to:verifiedRequestEmail,subject:message.subject,
   //   html:message.html,text:message.text}를 전달한다.
   // message.inlineImages의 assetPath(src/ 기준)를 파일로 읽고,
   // cid / filename / contentType을 사용해 공급자의 인라인 첨부로 함께 전송한다.
   // 기본 HTML은 cid:reeltrip-email-logo를 참조한다. preview:true는 로컬 미리보기 전용이다.

   // message.expiresAt은 발급 후 30분 시각이다. 서버 인증 만료 시각도 이 값으로 저장한다.

4. 선택 언어에 따라 제목·HTML·텍스트·날짜 표현이 함께 바뀐다.
   지원하지 않는 locale은 한국어로 대체한다. 시간대는 UTC+09:00으로 명시한다.
5. 예시 HTML을 실제 발송에 그대로 사용하지 않는다. 코드 발급·만료 검증·재전송 제한은
   서버에서 구현해야 한다. 클라이언트의 시연 로그인 상태를 실제 인증으로 사용하지 않는다.
