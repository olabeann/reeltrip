"""Build the application screen directory without duplicating application code."""
from pathlib import Path
import html
import json

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'frontend'
SCREENS = json.loads((ROOT / 'docs/screen-spec.json').read_text())
GROUPS = [('customer', '고객 메인 화면', '장소 발견부터 일정·메이트 요청·예약까지'),
          ('guide', '메이트 화면', '요청 확인·제안 작성·일정·수수료'),
          ('admin', '운영 화면', '장소·문의·메이트 심사·예약 및 환불')]
STYLE = '''*{box-sizing:border-box}body{margin:0;background:#f5f7fb;color:#20314a;font:16px/1.65 system-ui,sans-serif}main{max-width:1120px;margin:auto;padding:40px 24px}h1{font-size:32px;line-height:1.25}h2{margin-top:36px}a{color:#1260ac;text-underline-offset:3px}a:focus-visible{outline:3px solid #1379c5;outline-offset:4px}.intro{max-width:760px;color:#52617a}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,270px),1fr));gap:16px}.card{background:white;border:1px solid #dde4ee;border-radius:16px;padding:22px}.card h3{font-size:19px;margin:8px 0 14px}.card p{margin:0 0 16px;color:#52617a}.meta{font-size:13px;color:#52617a}.links{display:flex;flex-wrap:wrap;gap:16px}.notice{background:#eaf2fc;padding:18px;border-radius:12px;margin:24px 0}nav{display:flex;flex-wrap:wrap;gap:20px}code{overflow-wrap:anywhere}footer{margin-top:40px;color:#52617a}@media(max-width:400px){main{padding:24px 16px}h1{font-size:27px}}'''

def page(title, body, css):
    return f'''<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{html.escape(title)} · 릴트립</title><link rel="stylesheet" href="{css}"></head><body><main>{body}</main></body></html>'''

OUT.mkdir(exist_ok=True)
(OUT / 'directory.css').write_text(STYLE + '\n')
notice = '<div class="notice">요청·제안·예약·후기는 진행 상태에 따라 표시됩니다. 처음 열었을 때 안내 화면이 보이면 <a href="{app}?tools=1#home">앱 검토 도구</a>의 데모 상태에서 해당 단계를 먼저 선택하세요. 시연 상태를 불러오면 현재 체험 데이터가 교체됩니다.</div>'
for role, title, description in GROUPS:
    folder = OUT / role
    folder.mkdir(exist_ok=True)
    cards = []
    for screen in [s for s in SCREENS if s['role'] == role]:
        route, name, sid = screen['route'], screen['name'], screen['id']
        surface = 'admin' if role == 'admin' else 'app'
        target = f'../../{surface}/index.html#{route}'
        # Existing URLs, app assets and browser storage remain the single runtime.
        shortcut = f'''<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0;url={target}"><title>{html.escape(name)} · 릴트립</title></head><body><p><a href="{target}">{html.escape(name)} 열기</a></p><p><a href="index.html">화면 목록</a></p></body></html>'''
        (folder / f'{route}.html').write_text(shortcut)
        cards.append(f'<article class="card"><span class="meta">{sid} · {route}</span><h3>{html.escape(name)}</h3><div class="links"><a href="{route}.html">한국어 화면 →</a><a href="../../{surface}/english.html#{route}" lang="en">English →</a><a href="../../docs/product.html#spec-{sid}">기능 명세</a></div></article>')
    body = f'<nav><a href="../index.html">전체 화면 폴더</a><a href="../../index.html">기획·문서 허브</a></nav><h1>{title}</h1><p class="intro">{description} · {len(cards)}개 화면</p>' + notice.format(app='../../admin/index.html' if role == 'admin' else '../../app/index.html') + '<div class="grid">' + ''.join(cards) + '</div>'
    if role == 'guide':
        body = body.replace('<div class="grid">', '<p>메이트 화면은 앱 검토 도구에서 승인된 메이트 계정을 선택하고 메이트 모드로 전환한 뒤 열 수 있습니다.</p><div class="grid">', 1)
    (folder / 'index.html').write_text(page(title, body, '../directory.css'))
body = '''<nav><a href="../index.html">기획·문서 허브</a><a href="README.txt">폴더 사용 안내</a></nav><h1>릴트립 프론트 화면 모음</h1><p><a href="../docs/developer-handoff.html">개발 인계 기준: 고객·메이트 통합 앱 / 운영 웹</a></p><p class="intro">릴트립의 화면을 역할별로 모았습니다. 먼저 고객 메인 화면을 열어 앱의 전체 흐름을 살펴보세요.</p><div class="links"><a href="customer/home.html">한국어 앱 시작 →</a><a href="../app/english.html#home" lang="en">Start in English →</a></div>'''
body += '<h2>화면 폴더</h2><div class="grid">'
for role, title, description in GROUPS:
    count = sum(s['role'] == role for s in SCREENS)
    body += f'<article class="card"><span class="meta">{count}개 화면</span><h3><a href="{role}/index.html">{title} →</a></h3><p>{description}</p></article>'
body += '</div><h2>고객의 주요 이동 순서</h2><p>홈 → 장소 확인 → 일정 만들기 → 여행 공개 → 메이트 제안 비교 → 예약 요청 → 메이트 수수료 결제 → 예약 확정</p>'
body += notice.format(app='../app/index.html')
body += '<footer>화면 파일은 실제 앱으로 연결되는 진입점입니다. 구현 원본은 공통으로 관리하므로 한 번 수정하면 모든 화면 진입점에 반영됩니다.</footer>'
(OUT / 'index.html').write_text(page('프론트 화면 모음', body, 'directory.css'))
(OUT / 'README.txt').write_text('''릴트립 · 프론트 화면 폴더

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
''')
print(f'Built screen directory: {len(SCREENS)} screens in {len(GROUPS)} role folders.')
