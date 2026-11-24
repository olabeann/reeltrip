"""Current MVP summaries for older document URLs. No alternative-product comparisons."""
import re

PAGES = {
 'mobile-app': ('홈페이지 플랫폼과 역할', '''<h2>단일 홈페이지 MVP</h2><p>고객·메이트는 모바일 화면에 맞춘 하나의 홈페이지와 계정을 사용합니다. 운영자는 별도 웹입니다. 설치형 iOS·Android 앱, 운영체제 공유 수신, 앱·브라우저 푸시는 현재 출시 범위에 포함하지 않습니다.</p><h2>이용 흐름</h2><p>장소 보관 → 날짜별 여행 → 공개 요청 → 복수 제안 → 여행자 선택 → 메이트 10% 수수료 결제 → 확정. 여행비는 현장 현금 직접 지급입니다.</p><p>여행자 메뉴는 발견 / 내 여행 / 메이트 / 채팅 / 마이, 메이트 메뉴는 여행 찾기 / 내 활동 / 채팅 / 마이입니다. 한국어·영어 홈페이지와 가입 언어 선택을 제공하며 실제 외국어 동행 가능 여부는 메이트 정보와 요청 조건으로 확인합니다.</p><h2>화면 검수</h2><p>작은 화면·큰 글자·키보드·뒤로가기·스크린리더·네트워크 오류를 확인합니다. 현재 상태는 브라우저 저장 시연이며 실제 계정 동기화와 결제는 서버 연결이 필요합니다.</p><p><a href="specification.html">화면 명세</a> · <a href="developer-handoff.html">개발 인계</a> · <a href="notification-policy.html">이메일 알림 정책</a></p>'''),
 'map-planning': ('장소와 여행 지도 기준', '''<h2>보관함과 여행</h2><p>장소 보관함과 여행 일정을 분리합니다. 여행은 최대 7일, 하루 최대 20곳으로 구성하며 날짜·장소 추가/삭제·순서를 편집합니다. 체류시간·방문시각 계산·날짜별 메모·장소를 다른 날짜로 이동하는 기능은 MVP에서 제외합니다.</p><h2>지도 표시</h2><p>선택 날짜의 확인된 좌표 전체로 지도 범위를 정하고 목록과 같은 순서로 번호를 표시합니다. 위치가 확인되지 않은 장소도 목록에는 유지합니다. 직선 연결은 방문 순서이며 실제 도보 경로가 아닙니다. 구간별 거리·도보 추정과 Google Maps 길찾기 링크를 구분합니다.</p><h2>여행 요청</h2><p>내 여행의 전체 일정 또는 지역·기간을 입력하는 자유 여행 요청을 지원합니다. 요청은 최소 48시간 전이며 최대 7일, 동행은 하루 4시간 기준입니다. 공개 요청·제안·예약에는 전체 날짜와 금액 스냅샷을 유지하고 개인 여행 편집으로 기존 요청을 덮어쓰지 않습니다.</p><h2>연동 경계</h2><p>실제 영상 추출은 미연결입니다. 고정 지도 이미지와 예시 좌표는 검증된 Google 장소로 간주하지 않습니다. 추출 작업은 중복 요청 식별자를 사용하고 이름·주소·좌표·출처·확인 상태를 구분해 저장합니다. 지도 키·장소 표시와 출처는 실제 제공자 설정을 따릅니다.</p><p><a href="technical.html#trip-map-pins">전체 핀 표시와 인수 기준</a> · <a href="google-maps-setup.html">지도 연결 설정</a></p>'''),
 'ux-writing': ('홈페이지 문구 기준', '''<h2>현재 상태와 다음 행동</h2><p>사용자가 지금 확인할 내용과 다음 행동을 짧게 씁니다. 제목은 상태, 설명은 이유, 버튼은 실행을 표현합니다. 내부 역할 ID와 개발 용어를 사용자 문구에 노출하지 않습니다.</p><h2>예약과 비용</h2><ul><li>여행자 선택 후에는 메이트 확정 대기, 실제 수수료 결제 검증 후에는 예약 확정으로 표시합니다.</li><li>메이트 수수료는 여행 금액의 10%입니다. 여행비는 현장 현금 직접 지급이며 플랫폼 여행비 결제 완료로 표현하지 않습니다.</li><li>예약 취소 완료와 수수료 반환 완료를 구분합니다. 반환 접수·검토 단계에서 반환됐다고 안내하지 않습니다.</li><li>일행 전체 금액·한국 시간·여행 날짜를 명확히 표시합니다. 현금 지급 시점과 추가 비용은 당사자 합의 사항이며 검증되지 않은 만남 장소를 확정 정보로 쓰지 않습니다.</li></ul><h2>알림과 가입</h2><p>이메일 가입에만 광고성 이메일 수신 선택 동의를 기본 미선택으로 표시합니다. 별도 안내 문구는 두지 않습니다. 소셜 신규 가입은 광고 OFF이며 마이에서 변경합니다. 서비스 알림은 사건과 현재 상태가 일치해야 하며 광고 문구를 섞지 않습니다.</p><h2>장소와 예시</h2><p>후보 장소·확인된 좌표·영업 정보·외부 예약을 구분합니다. 영상 분석 성공, 실시간 경로, 실제 인증·PG·이메일 완료를 시제품만으로 주장하지 않습니다. 예시와 오류는 사용자의 판단에 필요한 범위에서 안내합니다.</p><p><a href="design-guide.html">공통 UI 기준</a> · <a href="notification-policy.html">알림 문구와 트리거</a> · <a href="mvp-policy.html">운영 정책</a></p>'''),
 'project-direction': ('릴트립 작업 기준', '''<h2>단일 서비스와 문서 원본</h2><p>고객·메이트 통합 홈페이지, 운영자 별도 웹으로 개발합니다. 비교안은 관리하지 않습니다. 앱 원본은 src/assets/app.js, 영어는 tools/i18n에서 생성합니다. 기존 B-* 화면 ID와 localStorage 키를 유지하고 archives/ 동결 백업은 수정하지 않습니다.</p><p>정책 원본은 tools/templates/mvp-policy.html, 알림 기준은 docs/notification-policy.md, 기능 명세는 src/assets/catalog.js입니다. 문서는 tools/scripts/build_docs.py로 재생성합니다.</p><p><a href="index.html">문서 안내</a> · <a href="mvp-policy.html">MVP 운영 정책</a> · <a href="developer-handoff.html">개발 인계</a></p>''')
}


def build_reference_docs(root, page):
    for slug, (title, body) in PAGES.items():
        target = root / 'docs' / (slug + '.html')
        # Keep old incoming fragment URLs valid while replacing obsolete prose.
        anchors = sorted(set(re.findall(r'id="([A-Za-z0-9_-]+)"', target.read_text())) - {'document'}) if target.exists() else []
        compatibility = ''.join('<span id="' + anchor + '"></span>' for anchor in anchors)
        target.write_text(page(title, compatibility + body))
