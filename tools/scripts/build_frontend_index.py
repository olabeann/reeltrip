"""Build the application screen directory without duplicating application code."""
from pathlib import Path
import html
import json
import hashlib
import re

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'src/frontend'
SCREENS = json.loads((ROOT / 'docs/screen-spec.json').read_text())
GROUPS = [('customer', '고객 메인 화면', '여행 준비부터 메이트 제안·예약까지'),
          ('guide', '메이트 화면', '요청 확인·제안 작성·일정·수수료'),
          ('admin', '운영 화면', '메이트 심사·예약 및 수수료 반환·문의·신고')]
STYLE = '''*{box-sizing:border-box}body{margin:0;background:#f5f7fb;color:#20314a;font:16px/1.65 system-ui,sans-serif}main{max-width:1120px;margin:auto;padding:40px 24px}h1{font-size:32px;line-height:1.25}h2{margin-top:36px}a{color:#1260ac;text-underline-offset:3px}a:focus-visible{outline:3px solid #1379c5;outline-offset:4px}.intro{max-width:760px;color:#52617a}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,270px),1fr));gap:16px}.card{background:white;border:1px solid #dde4ee;border-radius:16px;padding:22px}.card h3{font-size:19px;margin:8px 0 14px}.card p{margin:0 0 16px;color:#52617a}.meta{font-size:13px;color:#52617a}.links{display:flex;flex-wrap:wrap;gap:16px}.notice{background:#eaf2fc;padding:18px;border-radius:12px;margin:24px 0}nav{display:flex;flex-wrap:wrap;gap:20px}code{overflow-wrap:anywhere}footer{margin-top:40px;color:#52617a}@media(max-width:400px){main{padding:24px 16px}h1{font-size:27px}}'''

def page(title, body, css):
    return f'''<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{html.escape(title)} · 릴트립</title><link rel="stylesheet" href="{css}"></head><body><main>{body}</main></body></html>'''

OUT.mkdir(exist_ok=True)
(OUT / 'directory.css').write_text(STYLE + '\n')
notice = '<div class="notice">앱 화면을 바꾸지 않고 상태를 확인하려면 <a href="{review}">개발 확인 패널</a>을 여세요. 미리보기 데이터는 기존 체험 데이터와 분리되며 새로 열면 초기화됩니다. 실제 인증·결제·서버 연동은 없는 시제품입니다.</div>'
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
        preview_link = f'<a href="../states.html#screen={route}">상태 확인 →</a>'
        cards.append(f'<article class="card"><span class="meta">{sid} · {route}</span><h3>{html.escape(name)}</h3><div class="links"><a href="{route}.html">한국어 화면 →</a><a href="../../{surface}/english.html#{route}" lang="en">English →</a><a href="../../../docs/specification.html#spec-{sid}">기능 명세</a>{preview_link}</div></article>')
    body = f'<nav><a href="../index.html">전체 IA 구조도</a><a href="../../../docs/index.html">기획·문서 허브</a></nav><h1>{title}</h1><p class="intro">{description} · {len(cards)}개 화면</p>' + notice.format(review='../states.html') + '<div class="grid">' + ''.join(cards) + '</div>'
    if role == 'guide':
        body = body.replace('<div class="grid">', '<p>개발 확인 패널에서는 승인된 메이트 예시 계정으로 화면을 바로 확인할 수 있습니다.</p><div class="grid">', 1)
    (folder / 'index.html').write_text(page(title, body, '../directory.css'))
(OUT / 'README.txt').write_text('''릴트립 · 프론트 화면 폴더

여기서 시작: index.html — 클릭형 IA 구조도
화면 노드를 선택하면 구조도 옆에서 상태별 앱 미리보기를 확인합니다.
화면 검색과 고객/메이트/운영 범위 필터를 사용할 수 있습니다.
구조도 분류 원본: resources/review/ia-structure.json
customer/index.html  고객 메인 화면
 guide/index.html     메이트 화면
 admin/index.html     운영 화면
각 폴더의 home.html, trips.html, booking.html 등은 이름에 해당하는 앱 화면으로 이동합니다.
한국어·영어 화면과 기능 명세는 각 폴더의 index.html에서 선택합니다.

이 폴더는 화면 탐색용입니다. 실제 구현 소스를 화면별로 분리한 구조는 아닙니다.
화면별 HTML을 독립 복제하면 공통 코드·저장 데이터가 어긋날 수 있어 기존 앱에 연결합니다.
요청·제안·예약 등은 현재 체험 데이터에 따라 내용이 달라집니다.
states.html 개발 확인 패널은 별도 메모리 저장소에서 상태를 표시하므로 기존 체험 데이터를 변경하지 않습니다.
등록된 상태 원본: resources/review/screen-states.json. 고객·메이트·운영 모든 화면의 구현된 주요 상태를 등록합니다. 신규 화면 추가 시 상태 등록과 검사를 함께 갱신하세요.

수정할 원본 (프로젝트 루트 기준):
 src/app/index.html / english.html   실제 앱 진입 파일
 src/assets/app.js                       화면 렌더링·상태·이벤트
 src/assets/catalog.js                   화면 목록·기능 정의
 src/assets/app.css / soft-glass.css / liquid-glass.css / booking-tools.css  앱 스타일
 tools/i18n/build_english.py                영어 생성
 docs/screen-spec.json       화면 목록의 생성 결과

폴더 재생성 (프로젝트 루트에서):
 python3 tools/scripts/build_docs.py
 python3 tools/scripts/build_frontend_index.py

생성된 바로가기 파일 대신 원본 및 생성기를 수정하세요.
앱 진입 경로는 src/app/이며 내부 화면 ID·저장키는 호환성을 위해 유지합니다.
''')
print(f'Built screen directory: {len(SCREENS)} screens in {len(GROUPS)} role folders.')

# Preview entries reuse the actual app markup and assets, with isolated memory storage.
registry = json.loads((ROOT / 'resources/review/screen-states.json').read_text())
(OUT / 'state-catalog.js').write_text('window.REEL_SCREEN_STATES=' + json.dumps(registry, ensure_ascii=False) + ';\nwindow.REEL_REVIEW_SCREENS=' + json.dumps(SCREENS, ensure_ascii=False) + ';\n')
for source, target in [('index.html', 'preview.html'), ('english.html', 'preview-en.html'), ('index.html', 'preview-admin.html'), ('english.html', 'preview-admin-en.html')]:
    markup = (ROOT / 'src/app' / source).read_text()
    markup = markup.replace('<head>', '<head><style>html,body{overscroll-behavior-y:contain}</style><script src="state-catalog.js"></script><script src="preview-storage.js"></script>', 1)
    markup = markup.replace('href="app.webmanifest"', 'href="../app/app.webmanifest"').replace('href="app.en.webmanifest"', 'href="../app/app.en.webmanifest"')
    if 'admin' in target:markup=markup.replace('<body>', '<body data-surface="admin">', 1)
    markup=markup.replace('<script src="../assets/google-map', '<script src="preview-map-config.js" defer></script><script src="../assets/google-map', 1)
    (OUT / target).write_text(markup)
(OUT / 'states.html').write_text('''<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>개발 확인 · 릴트립</title><link rel="stylesheet" href="states.css"><script src="state-catalog.js" defer></script><script src="states.js" defer></script></head><body>
<header><a href="index.html">← 화면 탐색</a><h1>화면별 상태 확인</h1><p>상태를 선택하면 실제 앱 화면을 예시 데이터로 표시합니다. 기존 시연 데이터는 변경되지 않습니다.</p></header>
<main><aside><label>확인할 화면<select id="screen"></select></label><label>미리보기 언어<select id="language"><option value="ko">한국어</option><option value="en">English</option></select></label><h2>화면 상태</h2><div id="states" role="group" aria-label="화면 상태"></div><dl><dt>표시 조건</dt><dd id="condition"></dd><dt>다음 전환</dt><dd id="transition"></dd><dt>화면 구분</dt><dd id="state-note"></dd></dl><a id="spec">이 화면의 기능 명세 →</a><p class="note">고객·메이트·운영의 모든 화면에서 구현된 주요 상태를 확인할 수 있습니다. 정적 안내는 접근 상태별로 표시합니다. 분석 진행 상태는 확인하는 동안 자동 완료를 멈춥니다. 실제 인증·결제·서버 연결은 없는 시제품입니다.</p></aside>
<section class="preview" aria-label="앱 미리보기"><p id="selection" aria-live="polite"></p><p id="preview-status" class="note" role="status"></p><div class="actions"><button id="reset" type="button">선택 상태로 되돌리기</button><button id="copy" type="button">상태 링크 복사</button><a id="standalone" target="_blank" rel="noopener">앱만 새 창으로 보기 ↗</a></div><p id="copy-status" role="status"></p><iframe title="선택 상태의 릴트립 앱" sandbox="allow-scripts allow-same-origin allow-forms allow-popups"></iframe><p class="note">앱 안에서 이동한 후에는 ‘선택 상태로 되돌리기’로 처음 상태를 다시 확인하세요.</p></section></main></body></html>''')

# Navigable IA overview. Every catalog screen belongs to exactly one primary branch.
ia = json.loads((ROOT / 'resources/review/ia-structure.json').read_text())
by_route = {s['route']: s for s in SCREENS}
ia_routes = [route for role in ia for group in role['groups'] for route in group['routes']]
assert set(ia_routes) == set(by_route), 'IA must cover every screen'
for role in ia:
    routes=[r for g in role['groups'] for r in g['routes']]
    assert len(routes)==len(set(routes)), 'Each mode must list each screen once'

def mode_states(route, role):
    return [v for v in registry[route] if (v.get('fixture', {}).get('mode') or by_route[route]['role']) == role]

def node_id(route, role):
    return route if by_route[route]['role'] == role else role + '-' + route
short_names = {'guide-activity':'내 활동',
    "mate-register": "메이트 등록",
 'home':'홈 · 메이트와 함께하는 여행','processing':'영상 분석','results':'장소 선택','manual':'장소 검색',
 'trips':'내 여행','board':'저장한 장소',
 'guides':'메이트 탭','guide':'메이트 프로필','request':'여행 요청','requested':'도착한 제안','quote':'제안 상세',
 'checkout':'메이트 선택','booking':'예약 상세','cancel':'예약 취소','review':'후기 작성',
 'messages':'채팅 목록','chat':'대화방','account':'마이','upcoming':'예정된 일정','settings':'설정','notifications':'알림','support':'도움말·문의','policies':'이용 안내',
 'signup':'회원가입','signup-email':'이메일 가입','guide-desk':'여행 찾기','guide-activity':'내 활동','guide-quote':'제안 작성','guide-calendar':'일정',
 'mate-register':'메이트 등록','guide-fee':'수수료 결제','guide-earnings':'수수료 내역','admin':'운영 대시보드','admin-support':'문의 관리','admin-guides':'메이트 심사','admin-bookings':'예약·취소 관리'
}
from build_transition_catalog import build as build_transitions
transitions, _ = build_transitions()
(ROOT / 'resources/review/screen-transitions.json').write_text(json.dumps(transitions, ensure_ascii=False, indent=2) + '\n')
assert set(transitions) == set(by_route), 'Every IA screen must have transition rules'
for route, rows in transitions.items():
    assert rows, route
    for row in rows:
        assert all(row.get(key) for key in ('trigger', 'condition', 'effect', 'kind')), route
        if row['target']:
            assert row['target'] in by_route, row
            assert row['state'] in {v['id'] for v in registry[row['target']]}, row
(OUT / 'transition-catalog.js').write_text('window.REEL_SCREEN_TRANSITIONS=' + json.dumps(transitions, ensure_ascii=False) + ';\n')
# Hierarchy edges must be backed by rendered application controls, never inferred from IDs.
def incoming(route):
    return [(source,row) for source,rows in transitions.items() for row in rows
            if row.get('target') == route and source != route and not row.get('common')
            and row['trigger'] not in ('이전 화면으로','운영 홈')]

def render_node(route, entries, role):
    screen=by_route[route]
    edge=entries.get(route)
    prefix=''
    if edge:
        rules=[r for r in transitions[edge['parent']] if r.get('target') == route and r['trigger'] != '이전 화면으로' and any(v['id'] in r['sourceStates'] for v in mode_states(edge['parent'], role))]
        assert rules, f'IA edge has no actual app control: {edge["parent"]} -> {route}'
        labels=list(dict.fromkeys(r['trigger'] for r in rules))
        relation='하위 화면' if edge['relation']=='menu' else '진행 흐름'
        prefix=f'<div class="ia-edge {edge["relation"]}" title="{html.escape(" / ".join(labels))}"><span>{"└" if edge["relation"]=="menu" else "↓"} {relation} · {short_names[edge["parent"]]}에서</span> {html.escape(" / ".join(labels))}</div>'
    elif route=='guide':
        assert not incoming(route), 'Profile now has an entry: assign its actual parent'
        prefix='<p class="ia-unlinked">앱 내 진입 버튼 없음 · 검토용 직접 접근</p>'
    else:
        prefix='<div class="ia-entry-label">'+('운영 진입' if screen['role']=='admin' else '하단 탭')+'</div>'
    prefix='<span class="ia-unlinked">진입 미연결</span>' if route=='guide' and not edge else ''
    count=len(mode_states(route, role))
    assert count, (route, role)
    key=node_id(route, role)
    out=f'<li class="ia-tree-item {edge["relation"] if edge else "root"}" data-parent="{edge["parent"] if edge else ""}">{prefix}<a class="ia-node" id="ia-{key}" href="#ia-{key}" data-route="{route}" data-role="{role}" aria-label="{screen["id"]} {html.escape(screen["name"])} · {count}개 상태"><span class="node-id">{screen["id"]}</span><strong>{short_names[route]}</strong><span class="state-count" title="확인할 수 있는 상태 {count}개">{count}</span></a>'
    if route=='signup-email':
        out+='<div class="shared-links"><a href="../emails/index.html?lang=ko" target="_blank" rel="noopener" aria-label="인증번호 메일 HTML 미리보기 (새 탭)">인증번호 메일 HTML ↗</a></div>'
    children=[r for r,e in entries.items() if e['parent']==route]
    if children:out+='<ul class="ia-children">'+''.join(render_node(r,entries,role) for r in children)+'</ul>'
    return out+'</li>'

branches=''
for role in ia:
    count=sum(len(g['routes']) for g in role['groups'])
    branches+=f'<section class="ia-role role-{role["role"]}" data-role="{role["role"]}" aria-labelledby="role-{role["role"]}"><header class="role-heading"><div><span class="role-dot" aria-hidden="true"></span><h2 id="role-{role["role"]}">{role["label"]}</h2><span class="role-count">{count}개 화면</span></div><p>{role["description"]}</p></header><div class="ia-branches">'
    for group in role['groups']:
        entries=group['entries']
        assert all(mode_states(r,role['role']) for r in group['routes'])
        assert all(r in group['routes'] and e['parent'] in group['routes'] for r,e in entries.items())
        roots=[r for r in group['routes'] if r not in entries]
        branches+=f'<section class="ia-branch"><h3>{group["label"]}</h3><ul>'+''.join(render_node(r,entries,role['role']) for r in roots)+'</ul></section>'
    if role['role']=='guide':
        branches+='<div class="shared-links"><span>요청함 상단</span><a href="#ia-notifications">알림 ↗</a></div>'
    branches+='</div></section>'
assert len(re.findall(r'class="ia-node"',branches)) == len(ia_routes), 'IA hierarchy must render each mode entry once'
# Separate overview of the main journey; each arrow is checked against real controls.
journeys=[('여행자 · 요청부터 예약까지',[('guides','discover'),('request','free'),('requested','proposals'),('quote','proposals'),('checkout','proposals'),('booking','fee')]),
          ('메이트 · 제안 작성',[('guide-desk','waiting'),('guide-quote','waiting')]),
          ('메이트 · 선택받은 뒤 확정',[('guide-activity','fee'),('guide-fee','fee')]),
          ('예약 요청 철회',[('booking','fee'),('cancel','fee')])]
journey_markup='<section id="ia-journeys" hidden aria-label="요청·예약 흐름"><h2>요청·예약 흐름</h2><p>화면을 선택하면 실제 버튼과 상태 변화가 아래에 표시됩니다. 각 화면은 독립된 예시로 열립니다.</p>'
for title,routes in journeys:
    journey_markup+=f'<h3>{title}</h3><div class="journey-track">'
    for i,(route,state) in enumerate(routes):
        variant=next(v for v in registry[route] if v["id"]==state)
        if i:
            rules=[r for r in transitions[routes[i-1][0]] if r.get('target')==route and not r.get('common') and routes[i-1][1] in r['sourceStates']]
            assert rules, (routes[i-1],route)
            journey_markup+='<span class="journey-arrow" aria-label="다음 화면">→</span>'
        journey_markup+=f'<a href="#ia-{route}" data-state="{state}">{short_names[route]}<small>{variant["label"]}</small></a>'
    journey_markup+='</div>'
journey_markup+='<p class="journey-note">메이트의 제안 제출과 수수료 결제는 역할 간 상태를 이어주는 단계입니다. 실제 상태 변화는 선택 화면의 상세에서 확인하세요.</p></section>'
first=by_route['home']
state_total=sum(len(v) for v in registry.values())
index_markup = '''<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>릴트립 IA · 화면 구조도</title><link rel="stylesheet" href="ia.css"><script src="state-catalog.js" defer></script><script src="transition-catalog.js" defer></script><script src="ia.js" defer></script></head><body>
<header class="ia-header"><div class="header-top"><a class="brand" href="index.html">reeltrip<span>화면 구조도</span></a><nav aria-label="관련 자료"><a href="../../docs/product.html">기획·명세</a><a href="../../docs/developer-handoff.html">개발 인계</a><a href="states.html">상태 확인 패널 ↗</a></nav></div></header>
<main>
<div class="ia-toolbar"><div class="role-filters" role="group" aria-label="구조도 범위"><button type="button" data-role-filter="all" aria-pressed="true">전체</button><button type="button" data-role-filter="customer" aria-pressed="false">고객</button><button type="button" data-role-filter="guide" aria-pressed="false">메이트</button><button type="button" data-role-filter="admin" aria-pressed="false">운영</button></div><label class="search"><span>화면 찾기</span><input id="ia-search" type="search" placeholder="화면 이름 · B-12 · route" autocomplete="off"></label><button type="button" id="clear-search">초기화</button><span id="search-status" role="status">전체 SCREEN_TOTAL개 화면</span></div>
<div class="ia-layout"><div class="ia-map"><div class="ia-view-switch" role="group" aria-label="구조도 보기 방식"><button id="ia-overview-button" aria-pressed="true">구조 보기</button><button id="ia-journey-button" aria-pressed="false">요청·예약 흐름 보기</button></div>JOURNEYS<details class="ia-flow" id="ia-details"><summary>선택 화면 · 연결 경로와 버튼 상세</summary><div id="ia-connections" aria-label="선택 화면 연결 경로"></div><div class="flow-heading"><div><span class="eyebrow">BUTTON → SCREEN → STATE</span><h2 id="ia-flow-title">버튼과 상태 흐름</h2></div><span id="ia-flow-count"></span></div><p id="ia-flow-context"></p><p class="flow-help">현재 상태의 실제 버튼·링크와 후속 모달 동작입니다. 항목명·날짜 등 데이터 값은 예시입니다. 도착 화면 버튼은 <strong>독립된 예시 상태</strong>를 엽니다. 실제 데이터가 이어지는 동작은 오른쪽 앱에서 실행하세요.</p><div class="flow-table-wrap" tabindex="0" role="region" aria-label="화면 전환 규칙"><table class="flow-table"><thead><tr><th scope="col">버튼·이벤트 / 조건</th><th scope="col">도착 화면</th><th scope="col">상태 변화</th></tr></thead><tbody id="ia-flow-rows"></tbody></table></div><details class="flow-common"><summary>공통 메뉴 이동</summary><div id="ia-flow-common"></div></details></details><div id="ia-overview"><div class="app-root"><span>릴트립 서비스</span><strong>고객·메이트 통합 앱 <small>+ 별도 운영 웹</small></strong><p>화면을 선택하면 연결 경로와 버튼·상태 변화를 확인할 수 있습니다.</p></div>BRANCHES<p class="map-legend"><i aria-hidden="true"></i>화면 이름 · 들여쓰기: 하위 화면 <span class="state-count">3</span> 확인 가능한 상태 수 · 점선 테두리: 선택 화면의 이동 대상</p></div></div>
<aside class="ia-inspector" aria-labelledby="inspector-title"><section class="ia-state-panel" aria-label="미리보기 상태 선택"><div class="inspector-top"><span id="inspector-id">B-01 · 고객</span><a id="inspector-locate" href="#ia-home">구조도에서 찾기 ↖</a></div><h2 id="inspector-title">홈과 링크 입력</h2><code id="inspector-route">home</code><div class="preview-toolbar"><label>언어<select id="ia-language"><option value="ko">한국어</option><option value="en">English</option></select></label><button type="button" id="ia-reset">선택 상태로 되돌리기</button><button type="button" id="copy-node">링크 복사</button><a id="open-spec" href="../../docs/specification.html#spec-B-01" target="reeltrip-spec">명세 ↗</a></div><div class="inline-states"><h3>화면의 상태 <span id="inspector-count"></span></h3><div id="inspector-states" role="group" aria-label="미리보기 상태"></div></div><p id="ia-condition"></p><p id="ia-preview-status" role="status">화면을 불러오는 중…</p><p id="copy-status" role="status"></p></section><section class="ia-device-panel" aria-label="독립된 앱 미리보기"><div class="device-caption"><span id="device-label">앱 미리보기</span><span id="device-scale">390 × 700 · 화면에 맞춤</span><button type="button" id="preview-expand" aria-expanded="false">전체화면 ↗</button></div><div class="device-viewport"><div class="device-stage"><iframe id="ia-preview" title="IA에서 선택한 화면 미리보기" sandbox="allow-scripts allow-same-origin allow-forms allow-popups"></iframe></div></div></section></aside></div>
<noscript><p>구조도는 그대로 볼 수 있습니다. 상태별 상세는 <a href="states.html">개발 확인 패널</a>을 이용해 주세요.</p></noscript>
<footer><p>시제품 · 실제 인증·결제·상대방 메시지 전송은 연결 전입니다. 상태 미리보기는 기존 체험 데이터를 변경하지 않습니다.</p><nav aria-label="기존 화면 목록"><span>목록으로 보기</span><a href="customer/index.html">고객 화면</a><a href="guide/index.html">메이트 화면</a><a href="admin/index.html">운영 화면</a><a href="../emails/index.html">인증 이메일</a><a href="../../docs/design-guide.html">디자인 시스템</a><a href="../../docs/index.html">문서 허브</a></nav></footer></main></body></html>'''
detail_start=index_markup.index('<details class="ia-flow"')
detail_end=index_markup.index('<div id="ia-overview">',detail_start)
detail_markup=index_markup[detail_start:detail_end]
index_markup=index_markup[:detail_start]+index_markup[detail_end:]
index_markup=index_markup.replace('</p></div></div>\n<aside', '</p></div>'+detail_markup+'</div>\n<aside')
(OUT / 'index.html').write_text(index_markup.replace('SCREEN_TOTAL',str(len(SCREENS))).replace('STATE_TOTAL',str(state_total)).replace('BRANCHES',branches).replace('JOURNEYS',journey_markup))

# Version every local script/style together so cached copies cannot mix releases.
entries = [OUT / name for name in ('index.html', 'states.html', 'preview.html', 'preview-en.html', 'preview-admin.html', 'preview-admin-en.html')]
entries += [ROOT / 'src' / surface / name for surface in ('app', 'admin') for name in ('index.html', 'english.html')]
for entry in entries:
    def version_asset(match):
        asset = (entry.parent / match.group(2)).resolve()
        if not asset.is_file():
            raise FileNotFoundError(asset)
        digest = hashlib.sha256(asset.read_bytes()).hexdigest()[:12]
        return f'{match.group(1)}="{match.group(2)}?v={digest}"'
    entry.write_text(re.sub(r'(src|href)="([^":?]+\.(?:js|css))(?:\?[^" ]*)?"', version_asset, entry.read_text()))
