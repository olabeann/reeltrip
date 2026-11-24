"""Guard current MVP scope and generated-document sources against known regressions."""
from pathlib import Path
import json
import re

root = Path(__file__).resolve().parents[2]
docs = root / 'docs'
for name in ['mobile-app.html', 'map-planning.html', 'ux-writing.html', 'DEVELOPER_OVERVIEW.md', 'external-booking-spec.md', 'developer-handoff.html']:
    text = (docs / name).read_text()
    for obsolete in ['이전 설계', '1안·릴트립', '여행 1개·공개 요청 1개', '활성 화면은 35개', '장소별 체류시간은 별도 보관']:
        assert obsolete not in text, (name, obsolete)
product = (docs / 'product.html').read_text()
for anchor in ['mvp-policy-20261124', 'mate-registration', 'public-trip-requests', 'chat-mvp', 'support-slack', 'automatic-rematching']:
    assert product.count('id="'+anchor+'"') == 1, anchor
handoff = (docs / 'developer-handoff.html').read_text()
assert f'활성 화면은 {len(json.loads((docs / "screen-spec.json").read_text()))}개' in handoff
source = (root / 'tools/scripts/build_docs.py').read_text()
assert "handoff_path.read_text()" not in source, 'Generated handoff must not be its own source'
policy = (docs / 'notification-policy.md').read_text()
assert '| 해당 문의 |' not in policy, 'MVP has no user ticket-detail page'
assert '문의 본문·연락처·위치·첨부는 Slack에 넣지 않는다' in source
assert '여행 소식 이메일' in policy and '1분마다' in policy
screens = {s['route']:s for s in json.loads((docs / 'screen-spec.json').read_text())}
assert '광고 OFF' in screens['signup']['rule']
assert '브라우저에 저장' in screens['signup-email']['rule']
assert '모두 읽음' not in ' '.join(screens['notifications']['zones'])
print('PASS: MVP scope, single policy sections, current screen count, canonical build source, CS privacy and signup/notification specs.')
