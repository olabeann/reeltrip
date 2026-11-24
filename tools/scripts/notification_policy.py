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
              '결제기한': '2026년 11월 25일 오후 1시 (한국 시간)', '수수료': '24,000',
              '여행비': '240,000', '시작시간': '오후 1시 (한국 시간)', '인원': '2',
              '선택해제사유': '수수료 결제 기한 만료', '예약번호': 'RT-1201',
              '상대이름': 'Alex', '취소사유': '운영 정책에 따른 진행 불가',
              '보완내용': '프로필 사진을 선명한 사진으로 변경해 주세요',
              '심사사유': '제출 자료로 필수 조건을 확인하기 어려워요',
              '제한사유': '운영 정책 위반 확인', '문의번호': 'CS-1124',
              '요청자료': '예약 번호와 상황을 확인할 수 있는 자료',
              '접수시각': '2026년 11월 24일 오전 10시 (한국 시간)',
              '인증기한': '2026년 11월 24일 오전 10시 30분 (한국 시간)'}
    def sample(value):
        for key, replacement in values.items():
            value = value.replace('{' + key + '}', replacement)
        return html.escape(value)
    cards = []
    for line in source.split('## 11 메시지별 문구 전체', 1)[1].splitlines():
        if not line.startswith('| ') or line.startswith('| 상황'):
            continue
        scenario, recipient, channel, title, body, destination = [cell.strip() for cell in line.strip('|').split('|')]
        number = len(cards) + 1
        cards.append(f'''<section class="notification-message" aria-labelledby="message-{number}">
<h3 id="message-{number}">{number:02d} · {html.escape(scenario)}</h3>
<p class="notification-meta">{html.escape(recipient)} · {html.escape(channel)}</p>
<article class="rt-notification-preview" aria-label="{html.escape(scenario)} 문구 미리보기">
<div><strong>{sample(title)}</strong><p>{sample(body)}</p><time datetime="2026-11-24">11월 24일</time></div><span aria-hidden="true">›</span>
</article>
<details><summary>실제 적용 문구 · 변수 보기</summary><p><b>제목</b> {html.escape(title)}</p><p><b>본문</b> {html.escape(body)}</p></details>
<p class="notification-meta">연결 화면: {html.escape(destination)}</p></section>''')
    return '<div class="notification-message-grid">' + '\n'.join(cards) + '</div>'
