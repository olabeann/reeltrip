"""Render a searchable, progressively enhanced screen specification directory."""
import html
import re
from urllib.parse import urlencode

E = lambda value: html.escape(str(value), quote=True)
ROLES = {'customer': '여행자', 'guide': '메이트', 'admin': '운영'}


def render_explorer(catalog):
    navigation = []
    articles = []
    for role, label in ROLES.items():
        links = ''.join(
            f'<a href="#spec-{s["id"]}" data-screen-link="spec-{s["id"]}"><span>{s["id"]}</span>{E(s["name"])}</a>'
            for s in catalog if s['role'] == role
        )
        navigation.append(f'<section data-screen-group><h3>{label}</h3>{links}</section>')
    for s in catalog:
        sid = s['id']
        surface = 'admin' if s['role'] == 'admin' else 'app'
        app = f'../src/{surface}/index.html#{s["route"]}'
        checks = [v.strip() for v in re.split(r'(?<=\.)\s+', s['accept']) if v.strip()]
        checklist = ''.join(f'<li><label><input type="checkbox"> <span>{E(v)}</span></label></li>' for v in checks)
        states = ''.join(
            f'<details class="state-detail"{" open" if index == 0 else ""}><summary>{E(v["label"])}</summary>'
            f'<dl><dt>표시 조건</dt><dd>{E(v["condition"])}</dd><dt>다음 동작</dt><dd>{E(v["transition"])}</dd></dl>'
            + (f'<p>{E(v["note"])}</p>' if v.get('note') else '')
            + '<div class="inline-spec-preview">'
            + f'<div class="inline-preview-toolbar"><span>화면 미리보기</span><button type="button" data-preview-reset>처음 상태로</button></div>'
            + '<p class="inline-preview-status" role="status">상태를 펼치면 미리보기가 표시됩니다.</p>'
            + f'<iframe class="inline-preview-frame{" is-admin" if s["role"] == "admin" else ""}" title="{E(s["name"])} · {E(v["label"])} 미리보기" data-preview-src="{E("../src/frontend/preview" + ("-admin" if s["role"] == "admin" else "") + ".html?" + urlencode({"lang":"ko", "screen":s["route"], "state":v["id"]}) + "#" + v.get("fixture", {}).get("hash", s["route"]))}" sandbox="allow-scripts allow-same-origin allow-forms allow-popups"></iframe></div>'
            + f'<a class="spec-button secondary" target="_blank" rel="noopener" href="../src/frontend/states.html#screen={s["route"]}&amp;state={v["id"]}">새 창에서 크게 보기 ↗</a></details>'
            for index, v in enumerate(s.get('statePreviews', []))
        )
        search = ' '.join(str(s.get(k, '')) for k in ('id', 'name', 'route', 'input', 'rule', 'action', 'states', 'accept'))
        articles.append(f'''<article class="screen-spec" id="spec-{sid}" data-role="{s['role']}" data-search="{E(search)}">
<header class="screen-heading"><p class="spec-kicker">{ROLES[s['role']]} · {sid}</p><h2 tabindex="-1">{E(s['name'])}</h2><p class="screen-route">화면 경로 <code>{E(s['route'])}</code></p>
<div class="spec-actions"><a class="spec-button" href="{app}" target="_blank" rel="noopener">앱 화면 열기 ↗</a><a class="spec-button secondary" href="#{'spec-' + sid}" data-copy-link>명세 링크 복사</a><a class="spec-button secondary" href="policies.html">공통 정책</a></div></header>
<div class="prototype-note"><strong>현재 구현 · 로컬 시제품</strong><span>상태 미리보기는 격리된 예시 데이터입니다. 실제 인증·결제·서버 연결 완료를 의미하지 않습니다.</span></div>
<section class="spec-block"><h3>01 <span>입력과 동작</span></h3><dl class="spec-fields"><dt>입력 조건</dt><dd>{E(s['input'])}</dd><dt>동작 · 다음 화면</dt><dd>{E(s['action'])}</dd><dt>화면 상태</dt><dd>{E(s['states'])}</dd></dl></section>
<section class="spec-block"><h3>02 <span>규칙과 예외</span></h3><p>{E(s['rule'])}</p><p class="spec-hint">화면별 명세 기준입니다. 공통 정책과 미확정 사항은 <a href="policies.html">운영 정책</a> · <a href="developer-handoff.html">개발 인계</a>에서 확인하세요.</p></section>
<section class="spec-block"><h3>03 <span>상태별 확인</span><small>{len(s.get('statePreviews', []))}개</small></h3><p class="spec-hint">상태를 펼치면 아래에 앱 화면이 바로 표시됩니다. 화면을 직접 조작하거나 처음 상태로 되돌릴 수 있습니다.</p><div class="state-list">{states or '<p>등록된 상태 미리보기가 없습니다.</p>'}</div></section>
<section class="spec-block"><h3>04 <span>검수 체크리스트</span></h3><p class="spec-hint">현재 열람 중 확인용입니다. 체크 여부는 저장되지 않습니다.</p><ul class="spec-checks">{checklist}</ul></section>
<details class="spec-block screen-zones"><summary>화면 구성 요소</summary><ol>{''.join('<li>' + E(z) + '</li>' for z in s['zones'])}</ol></details>
</article>''')
    return f'''<div class="spec-explorer" data-spec-explorer>
<aside class="spec-sidebar" aria-label="화면 명세 탐색"><div class="spec-tools"><h2>화면 명세</h2><label for="spec-search">화면 찾기</label><input id="spec-search" type="search" placeholder="화면명, B-04, 결제…" autocomplete="off"><label for="spec-role">이용자 구분</label><select id="spec-role"><option value="">전체 화면</option>{''.join(f'<option value="{r}">{l}</option>' for r,l in ROLES.items())}</select><p class="spec-count" role="status" aria-live="polite">전체 {len(catalog)}개 화면</p></div><nav class="spec-screen-list" aria-label="화면 목록">{''.join(navigation)}</nav></aside>
<div class="spec-content"><p class="spec-feedback" role="status" aria-live="polite"></p><div class="spec-empty" hidden><h2>검색 결과가 없습니다</h2><p>다른 화면명이나 ID로 검색해 보세요.</p><button type="button" data-clear-search>검색 초기화</button></div>{''.join(articles)}</div></div>'''
