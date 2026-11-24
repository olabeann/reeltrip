"""Render the notification policy's headings, paragraphs, lists and tables safely."""
import html
import re


def render_policy(source):
    def inline(value):
        value = html.escape(value, quote=True)
        value = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', lambda m: '<a href="' + m[2] + '">' + m[1] + '</a>' if not re.match(r'(?i)(javascript|data):', m[2]) else m[1], value)
        value = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', value)
        return re.sub(r'`([^`]+)`', r'<code>\1</code>', value)

    lines = source.splitlines()
    output = []
    index = 0
    while index < len(lines):
        line = lines[index].strip()
        if not line or line.startswith('# '):
            index += 1
            continue
        if line.startswith('## '):
            output.append('<h2>' + inline(line[3:]) + '</h2>')
        elif line.startswith('|'):
            rows = []
            while index < len(lines) and lines[index].strip().startswith('|'):
                cells = [cell.strip() for cell in lines[index].strip().strip('|').split('|')]
                if not all(re.fullmatch(r':?-+:?', cell) for cell in cells):
                    rows.append(cells)
                index += 1
            output.append('<div class="notification-policy-table-wrap"><table class="notification-table"><thead><tr>' + ''.join('<th scope="col">' + inline(cell) + '</th>' for cell in rows[0]) + '</tr></thead><tbody>')
            for row in rows[1:]:
                output.append('<tr>' + ''.join('<td>' + inline(cell) + '</td>' for cell in row) + '</tr>')
            output.append('</tbody></table></div>')
            continue
        elif line.startswith('- '):
            output.append('<ul>')
            while index < len(lines) and lines[index].startswith('- '):
                output.append('<li>' + inline(lines[index][2:]) + '</li>')
                index += 1
            output.append('</ul>')
            continue
        else:
            output.append('<p>' + inline(line) + '</p>')
        index += 1
    return '\n'.join(output)


def render_message_catalog(source):
    """Build cards and exact copy from the policy's single source of truth."""
    values = {'여행일': '2026-12-01', '메이트명': '민아', '제안수': '3',
              '결제기한': '2026-11-25 13:00 (한국 시간)', '수수료': '24,000', '짧은결제기한': '2026-11-25 13:00 (한국 시간)',
              '여행비': '240,000', '시작시간': '오후 1시 (한국 시간)', '인원': '2',
              '선택해제사유': '수수료 결제 기한 만료', '예약번호': 'RT-1201',
              '상대이름': 'Alex', '취소사유': '운영 정책에 따른 진행 불가',
              '보완내용': '프로필 사진을 선명한 사진으로 변경해 주세요',
              '심사사유': '제출 자료로 필수 조건을 확인하기 어려워요',
              '제한사유': '운영 정책 위반 확인', '문의번호': 'CS-1124',
              '요청자료': '예약 번호와 상황을 확인할 수 있는 자료',
              '접수시각': '2026-11-24 10:00 (한국 시간)',
              '접수유형': '문의', '인증기한': '2026-11-24 10:30 (한국 시간)'}
    def sample(value):
        for key, replacement in values.items():
            value = value.replace('{' + key + '}', replacement)
        return html.escape(value)
    definitions = {}
    for line in source.split('## 13 메시지별 문구 전체', 1)[0].splitlines():
        if line.startswith('| {'):
            key, description, example = [cell.strip() for cell in line.strip('|').split('|')]
            definitions[key[1:-1]] = (description, example)
    cards = []
    for line in source.split('## 13 메시지별 문구 전체', 1)[1].splitlines():
        if not line.startswith('| ') or line.startswith('| 상황'):
            continue
        scenario, recipient, channel, title, body, destination, trigger, condition = [cell.strip() for cell in line.strip('|').split('|')]
        number = len(cards) + 1
        recipient_chips = ''.join('<span class="rt-info-chip rt-info-chip--primary">' + html.escape(value.strip()) + '</span>' for value in recipient.split('·'))
        channel_chips = ''.join('<span class="rt-info-chip">' + html.escape(value.strip()) + '</span>' for value in channel.split('·'))
        condition_chips = ''.join('<li class="rt-info-chip">' + html.escape(value.strip()) + '</li>' for value in re.split(r'(?<=\.)\s+', condition) if value.strip())
        keys = list(dict.fromkeys(re.findall(r'\{([^{}]+)\}', title + ' ' + body)))
        missing = set(keys) - definitions.keys()
        if missing:
            raise ValueError(f'치환 기준 누락: {missing}')
        variable_html = ''.join('<dt><code>{' + html.escape(key) + '}</code></dt><dd>' + html.escape(definitions[key][0]) + '<br>예시: ' + html.escape(definitions[key][1]) + '</dd>' for key in keys)
        variable_html = '<dt>치환 변수</dt><dd>없음 · 고정 문구를 그대로 사용합니다.</dd>' if not keys else '<dt>치환 기준</dt><dd>아래 변수만 실제 사건의 값으로 바꿉니다. 필수 값 누락 시 예시 값으로 대체하지 않습니다.</dd>' + variable_html
        roles = ('operator' if recipient == '운영팀' else
                 'traveler mate' if recipient in ('여행자 · 메이트', '상대방', '취소한 사용자', '문의한 사용자', '인증 요청자') else
                 'mate' if '메이트' in recipient else 'traveler')
        event_date, event_label = ('2026-11-30', '11월 30일') if scenario in ('여행 전날',) else ('2026-12-01', '12월 1일') if scenario in ('선택 해제 · 시작 후', '여행 완료') else ('2026-11-25', '11월 25일') if scenario in ('결제 마감 안내',) else ('2026-11-24', '11월 24일')
        cards.append(f'''<section class="notification-message rt-message-review" data-recipients="{roles}" aria-labelledby="message-{number}">
<div class="rt-message-review-main">
<header><p class="rt-message-review-number">알림 {number:02d}</p><h3 id="message-{number}">{html.escape(scenario)}</h3><div class="rt-info-chip-list" aria-label="수신자 및 채널">{recipient_chips}{channel_chips}</div><p class="rt-message-review-destination">연결 · {html.escape(destination)}</p></header>
<article class="rt-notification-preview" aria-label="{html.escape(scenario)} 문구 미리보기"><div><strong>{sample(title)}</strong><p>{sample(body)}</p><time datetime="{event_date}">{event_date}</time></div><span aria-hidden="true">›</span></article>
</div>
<dl class="rt-message-review-rules"><dt><span class="rt-info-chip rt-info-chip--primary">발송 시점</span></dt><dd>{html.escape(trigger)}</dd><dt><span class="rt-info-chip rt-info-chip--primary">수신·발송 조건</span></dt><dd><ul class="rt-info-chip-list">{condition_chips}</ul></dd></dl>
<details class="rt-message-review-details"><summary>문구 확인</summary><dl><dt>제목 템플릿</dt><dd>{html.escape(title)}</dd><dt>본문 템플릿</dt><dd>{html.escape(body)}</dd>{variable_html}<dt>치환 후 표시 예시</dt><dd>{sample(title)}<br>{sample(body)}</dd></dl></details></section>''')
    return '<div class="notification-message-grid">' + '\n'.join(cards) + '</div>'
