릴트립 · 프론트 화면 폴더

여기서 시작: index.html
customer/index.html  고객 메인 화면
 guide/index.html     메이트 화면
 admin/index.html     운영 화면
각 폴더의 home.html, planner.html, booking.html 등은 이름에 해당하는 앱 화면으로 이동합니다.
한국어·영어 화면과 기능 명세는 각 폴더의 index.html에서 선택합니다.

이 폴더는 화면 탐색용입니다. 실제 구현 소스를 화면별로 분리한 구조는 아닙니다.
화면별 HTML을 독립 복제하면 공통 코드·저장 데이터가 어긋날 수 있어 기존 앱에 연결합니다.
요청·제안·예약 등은 현재 체험 데이터에 따라 내용이 달라집니다.
검토 도구의 데모 상태는 기존 체험 데이터를 교체하므로 필요한 경우만 사용하세요.

수정할 원본 (프로젝트 루트 기준):
 app/index.html / english.html   실제 앱 진입 파일
 assets/app.js                       화면 렌더링·상태·이벤트
 assets/catalog.js                   화면 목록·기능 정의
 assets/app.css / soft-glass.css / liquid-glass.css / booking-tools.css  앱 스타일
 i18n/build_english.py                영어 생성
 docs/screen-spec.json       화면 목록의 생성 결과

폴더 재생성 (프로젝트 루트에서):
 python3 build_docs.py
 python3 scripts/build_frontend_index.py

생성된 바로가기 파일 대신 원본 및 생성기를 수정하세요.
앱 진입 경로는 app/이며 내부 화면 ID·저장키는 호환성을 위해 유지합니다.
