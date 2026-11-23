# Reeltrip 작업 기준

- 단일 릴트립 서비스만 기획·디자인·개발한다. 안별 구분과 비교 자료를 재생성하지 않는다.
- 앱: src/app/index.html, src/app/english.html. 운영 웹: src/admin/. 탐색: src/frontend/.
- 문서: docs/product.html, plan.html, screen-spec.json, developer-handoff.html.
- 한국어 원본 src/assets/app.js 및 tools/i18n 번역을 수정하고 python3 tools/i18n/build_english.py로 영어를 생성한다.
- python3 tools/scripts/build_docs.py; python3 tools/scripts/build_frontend_index.py로 문서를 생성한다.
- 기존 B-* 화면 ID 및 내부 localStorage 키는 호환성을 위해 유지한다.
- 고객/메이트 통합 앱, admin 별도 웹. 공개 여행→복수 제안→여행자 선택→메이트 수수료 10% 결제→확정. 여행비는 현장 현금 직접 지급.
- archives/ 동결 복원 백업은 작업본과 별개로 수정하지 않는다.
- 검사: python3 tools/tests/static_checks.py; node tools/tests/startup_checks.cjs; node tools/tests/navigation_checks.cjs; node tools/tests/access_checks.cjs; node tools/tests/google_map_checks.js. 프로젝트 루트에서 node tools/tests/tower_seed_checks.cjs.
- 시제품을 실제 인증·결제·서버 연결 완료본으로 표시하지 않는다.
- 디자인 시스템: docs/design-guide.html을 기준으로 src/assets/design-system.css의 --rt-* 토큰과 공통 컴포넌트를 사용한다. 새 버튼·카드·팝업 변형은 화면별 임의 스타일 대신 공통 CSS와 tools/scripts/build_design_system.py에 함께 등록한다. 기능 아이콘은 app.js의 icon()을 사용한다. 2버튼 팝업은 취소→실행 순서를 유지한다.
- 디자인 시스템 변경 후 node tools/tests/design_system_checks.cjs도 실행한다. 화면 전용 카드도 공통 카드 변형을 사용하며, 기능 SVG를 화면에 직접 작성하지 않는다. 지도 경로와 장식 일러스트만 예외로 유지한다.
