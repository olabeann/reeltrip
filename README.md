# Reeltrip · 릴트립

`zamfit_global`은 릴트립 프로젝트의 루트입니다. 장소 수집, 여행 일정 구성, 현지 메이트 매칭을 검토하는 HTML 시제품입니다. 실제 인증·결제·메시징은 연결되지 않았습니다.

## 폴더 구성

| 폴더 | 내용 |
| --- | --- |
| `src/` | 서비스 코드: `app/` 고객·메이트 앱, `admin/` 운영 웹, `assets/` 공통 코드·이미지, `frontend/` 화면 탐색, `emails/` 메일 예시, `server/` 선택형 로컬 서버 |
| `docs/` | 기획·화면 명세·개발 인계·실행 안내 |
| `tools/` | `scripts/` 생성·배포 도구, `i18n/` 번역 원본·생성기, `tests/` 검사 |
| `resources/` | 원본 로고(`brand/`), 업무 문서(`documents/`), 이전 미리보기(`previews/`), 화면 캡처(`screenshots/`) |
| `archives/` | 수정하지 않는 복원 백업·원본 압축파일 |

앱에 실제 사용하는 **언어별 로고는 [src/assets/brand/](src/assets/brand/)** 에 있습니다. `resources/`의 파일은 참고용이며 앱 수정이 자동 반영되지 않습니다.

## 시작하기

- [앱 열기](index.html) — 파일을 브라우저에서 열면 회원가입 화면으로 이동
- [기획·문서 홈](docs/index.html)
- [개발자 안내](docs/DEVELOPER_OVERVIEW.md)
- [화면 탐색](src/frontend/index.html)

명령은 프로젝트 루트에서 실행합니다. Python 3와 Node.js가 필요합니다.

```sh
# 정적 앱·문서 확인: http://localhost:8765/
python3 -m http.server 8765 --bind 127.0.0.1

# 선택형 API 서버: http://127.0.0.1:8766/app/index.html
node src/server/places-server.mjs
```

파일 경로 변경으로 `file://`에서 저장한 데이터는 브라우저 정책에 따라 이전 위치와 공유되지 않을 수 있습니다. 앱 내부 저장 키는 유지했습니다.

## 수정과 검증

한국어 구현은 `src/assets/app.js`, 공통 UI 문구는 `src/assets/signup-copy.js`에서 수정합니다. `app.en.js`는 생성 결과이므로 번역 원본과 생성기를 수정합니다.

```sh
python3 tools/i18n/build_english.py
python3 tools/scripts/build_docs.py
python3 tools/scripts/build_frontend_index.py
node tools/scripts/build_verification_emails.cjs
python3 tools/tests/static_checks.py
node tools/tests/startup_checks.cjs
node tools/tests/navigation_checks.cjs
```

추가 검사는 [작업 기준](AGENTS.md)을 참고하세요. `docs/legacy-manifest.json`은 이전 패키지의 기록으로, 현재 파일 목록이나 체크섬을 나타내지 않습니다.

## 배포

커밋 후 `sh tools/scripts/publish-pages.sh`를 실행하면 검사하고 `main` 및 `gh-pages`에 푸시합니다. 현재 구조의 공개 파일만 패키징하며 `resources/`, `archives/`, `tools/`, 서버 코드는 게시하지 않습니다. 기존 `/app/`, `/admin/`, `/frontend/`, `/emails/` HTML 주소와 `/project.html`은 새 주소로 연결됩니다.

배포 없이 확인하려면 `python3 tools/scripts/build_site.py --output /tmp/reeltrip-site-preview`를 실행합니다. 출력 폴더는 비어 있어야 합니다.

[공유 앱](https://olabeann.github.io/reeltrip/app/) · [프로젝트 안내](https://olabeann.github.io/reeltrip/project.html)
