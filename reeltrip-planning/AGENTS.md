# Reeltrip 작업 기준

- 단일 릴트립 서비스만 기획·디자인·개발한다. 안별 구분과 비교 자료를 재생성하지 않는다.
- 앱: app/index.html, app/english.html. 운영 웹: admin/. 탐색: frontend/.
- 문서: docs/product.html, plan.html, screen-spec.json, developer-handoff.html.
- 한국어 원본 assets/app.js 및 i18n 번역을 수정하고 python3 i18n/build_english.py로 영어를 생성한다.
- python3 build_docs.py; python3 scripts/build_frontend_index.py로 문서를 생성한다.
- 기존 B-* 화면 ID 및 내부 localStorage 키는 호환성을 위해 유지한다.
- 고객/메이트 통합 앱, admin 별도 웹. 공개 여행→복수 제안→여행자 선택→메이트 수수료 10% 결제→확정. 여행비는 현장 현금 직접 지급.
- ../archives/ 동결 복원 백업은 작업본과 별개로 수정하지 않는다.
- 검사: python3 tests/static_checks.py; node tests/startup_checks.cjs; node tests/navigation_checks.cjs; node tests/access_checks.cjs; node tests/google_map_checks.js. 상위 폴더에서 node reeltrip-planning/tests/tower_seed_checks.cjs.
- 시제품을 실제 인증·결제·서버 연결 완료본으로 표시하지 않는다.
