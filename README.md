# Reeltrip · 릴트립

`zamfit_global`은 릴트립 프로젝트의 루트입니다. 장소 수집, 여행 일정 구성, 현지 메이트 매칭을 검토하는 HTML 시제품입니다. 실제 인증·결제·메시징은 연결되지 않았습니다.

## 문서부터 확인하기

**[릴트립 문서 안내](docs/index.html)**에서 목적별 최신 문서를 확인하세요. 브라우저에서 보려면 로컬 서버 실행 후 [문서 홈](http://127.0.0.1:8765/docs/)을 열면 됩니다. GitHub에서는 아래 링크로 파일을 확인할 수 있습니다.

| 확인할 내용 | 기준 문서 |
| --- | --- |
| 예약·결제·취소·노쇼·심사·CS | [MVP 운영 정책](docs/mvp-policy.html) |
| 알림 대상·발송 조건·채널·메시지 문구 | [알림 트리거와 발송 정책](docs/notification-policy.html) · [Markdown으로 읽기](docs/notification-policy.md) |
| 화면별 입력·행동·상태·연결 | [화면별 기능 명세](docs/specification.html) · [화면 명세 JSON](docs/screen-spec.json) |
| 현재 구현 범위·서버 연결·개발 인계 | [개발 인계](docs/developer-handoff.html) |
| 버튼·카드·팝업·색상·아이콘 | [디자인 시스템](docs/design-guide.html) |
| 사용자에게 보여주는 문구 | [화면 문구 기준](docs/ux-writing.html) |
| 기능·흐름 검수 | [검수 기준](docs/qa.html) |

운영 규칙은 **MVP 운영 정책**, 알림 세부 규칙은 **알림 정책**, 화면 동작은 **기능 명세**, 공통 UI는 **디자인 시스템**을 우선합니다. [전체 기획·명세](docs/product.html), [서비스 기획 상세](docs/plan.html), [공통 정책 상세](docs/policies.html), [개발 설계 참고](docs/technical.html)는 배경과 상세 맥락을 확인하는 자료입니다.

[서비스 이용약관](docs/service-terms-draft.md)과 [개인정보처리방침](docs/privacy-policy-draft.md)은 검토용 초안입니다. 알림 주기·재시도 수치 등 운영 제안과 [미확정 운영 사항](docs/legal.html)은 출시 전 확정이 필요합니다.

## 서비스 흐름

여행자·메이트는 통합 홈페이지를 사용하고, 운영자는 별도 운영 웹을 사용합니다.

**공개 여행 등록 → 복수 메이트 제안 → 여행자 선택 → 메이트 수수료 10% 결제 → 예약 확정**

여행비는 현장에서 여행자가 메이트에게 현금으로 직접 지급합니다. 현재 저장소는 화면과 동작을 검토하는 시제품이며 실제 인증·결제·이메일 발송·메시징의 서버 연결 완료본이 아닙니다.

## 시작하기

- [통합 홈페이지](src/app/index.html) · [English](src/app/english.html)
- [운영 웹](src/admin/index.html)
- [화면 구조와 상태 모음](src/frontend/index.html)
- [개발자 기능 개요](docs/DEVELOPER_OVERVIEW.md)

명령은 프로젝트 루트에서 실행합니다. Python 3와 Node.js가 필요합니다.

```sh
# 정적 앱·문서 확인: http://localhost:8765/
python3 -m http.server 8765 --bind 127.0.0.1

# 선택형 API 서버: http://127.0.0.1:8766/app/index.html
node src/server/places-server.mjs
```

파일 경로 변경으로 `file://`에서 저장한 데이터는 브라우저 정책에 따라 이전 위치와 공유되지 않을 수 있습니다. 앱 내부 저장 키는 유지했습니다.

## 폴더 구성

| 폴더 | 내용 |
| --- | --- |
| `src/` | 서비스 코드: `app/` 고객·메이트 앱, `admin/` 운영 웹, `assets/` 공통 코드·이미지, `frontend/` 화면 탐색, `emails/` 메일 예시, `server/` 선택형 로컬 서버 |
| `docs/` | 기획·화면 명세·개발 인계·실행 안내 |
| `tools/` | `scripts/` 생성·배포 도구, `i18n/` 번역 원본·생성기, `tests/` 검사 |
| `resources/` | 원본 로고(`brand/`), 업무 문서(`documents/`), 이전 미리보기(`previews/`), 화면 캡처(`screenshots/`) |
| `archives/` | 수정하지 않는 복원 백업·원본 압축파일 |

앱에 실제 사용하는 **언어별 로고는 [src/assets/brand/](src/assets/brand/)** 에 있습니다. `resources/`의 파일은 참고용이며 앱 수정이 자동 반영되지 않습니다.

## 수정과 검증

한국어 구현은 `src/assets/app.js`, 공통 UI 문구는 `src/assets/signup-copy.js`에서 수정합니다. `app.en.js`는 생성 결과이므로 번역 원본과 생성기를 수정합니다.

```sh
python3 tools/i18n/build_english.py
python3 tools/scripts/build_docs.py
python3 tools/scripts/build_frontend_index.py
node tools/scripts/build_verification_emails.cjs
python3 tools/tests/static_checks.py
python3 tools/tests/document_consistency_checks.py
node tools/tests/startup_checks.cjs
node tools/tests/navigation_checks.cjs
node tools/tests/access_checks.cjs
node tools/tests/google_map_checks.js
node tools/tests/tower_seed_checks.cjs
```

디자인 시스템을 변경했다면 `node tools/tests/design_system_checks.cjs`도 실행합니다. 문서는 `tools/scripts/build_docs.py`와 관련 생성 모듈·`tools/templates/`에서 생성하며, 알림 정책 원본은 `docs/notification-policy.md`입니다. 생성된 HTML만 수정하면 다시 생성할 때 덮어써집니다. 세부 작업 규칙은 [작업 기준](AGENTS.md)을 참고하세요. `docs/legacy-manifest.json`은 이전 패키지의 기록으로, 현재 파일 목록이나 체크섬을 나타내지 않습니다.

## 배포

커밋 후 `sh tools/scripts/publish-pages.sh`를 실행하면 검사하고 `main` 및 `gh-pages`에 푸시합니다. 현재 구조의 공개 파일만 패키징하며 `resources/`, `archives/`, `tools/`, 서버 코드는 게시하지 않습니다. 기존 `/app/`, `/admin/`, `/frontend/`, `/emails/` HTML 주소와 `/project.html`은 새 주소로 연결됩니다.

배포 없이 확인하려면 `python3 tools/scripts/build_site.py --output /tmp/reeltrip-site-preview`를 실행합니다. 출력 폴더는 비어 있어야 합니다.

[공유 앱](https://olabeann.github.io/reeltrip/app/) · [프로젝트 안내](https://olabeann.github.io/reeltrip/project.html)
