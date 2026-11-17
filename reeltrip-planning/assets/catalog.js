/* Shared screen inventory */
window.REEL_SCREENS = [
 {
  "route": "home",
  "name": "홈과 링크 입력",
  "role": "customer",
  "both": true,
  "zones": [
   "본문 브랜드 · 링크 입력과 장소 찾기",
   "진행 중 예약·요청·저장 일정 이어서 하기",
   "직접 장소 추가 · 여행 메이트 찾기",
   "링크 없이 샘플 체험 · 하단 탭"
  ],
  "action": "유효한 링크 입력 또는 샘플 시작 → processing",
  "input": "공개 Shorts/Reels HTTPS URL 1개, 최대 2,048자",
  "rule": "호스트·경로 허용 목록 검사. 비공개·삭제 영상은 분석 실패 처리. 임의 URL 서버 접근 금지.",
  "states": "기본 / 잘못된 URL / 처리 중 / 사용량 제한",
  "accept": "허용되지 않은 링크는 이동하지 않고 입력 오류 표시. 샘플은 네트워크 없이 예시 데이터 로드."
 },
 {
  "route": "processing",
  "name": "장소 분석 상태",
  "role": "customer",
  "both": true,
  "zones": [
   "진행 단계 · 링크 확인 / 장소 찾기 / 지점 확인",
   "분석 진행률과 안내",
   "결과 보기 / 실패 시 복구"
  ],
  "action": "처리 완료 → results / 실패 시 manual 또는 home",
  "input": "extraction_job_id, 원본 URL",
  "rule": "실서비스는 큐 비동기 처리·중복 요청 키 사용. 60초 초과 시 대기 안내, 3분 초과 실패 전환(제안).",
  "states": "대기열 / 분석 중 / 부분 성공 / 성공 / 실패",
  "accept": "부분 성공 시 발견한 장소는 유지. 실패 시 직접 장소 추가 경로 제공. 프로토타입은 1.4초 시뮬레이션."
 },
 {
  "route": "results",
  "name": "지도에서 영상 속 장소 확인",
  "role": "customer",
  "both": true,
  "zones": [
   "원본 영상 링크 / 추출 상태",
   "지도 우선 · 사진 핀 / 선택 장소 카드",
   "카테고리 / 지점 확인 / 장소 선택",
   "선택한 장소로 날짜별 일정 만들기"
  ],
  "action": "핀 선택 → 연결 카드 / 장소 확인·선택 → planner",
  "input": "place_id, source_url, 지점 후보, 사용자 선택",
  "rule": "정확한 좌표가 있는 후보만 지도에 표시. 미확인 후보는 별도 목록. place_id 기준 중복 제거. 추출 실패·부분 성공을 구분.",
  "states": "전체 / 음식 / 카페 / 쇼핑 / 공원 / 미확인 / 결과 없음",
  "accept": "핀과 카드 선택 동기화. 미확인 지점은 확인 후 일정 추가. 장소 0개여도 직접 추가 가능. 현재 시연 지도는 성수 후보만 표시."
 },
 {
  "route": "manual",
  "name": "장소 직접 추가",
  "role": "customer",
  "both": true,
  "zones": [
   "장소명 / 주소 입력",
   "카테고리 선택 / 확인 안내",
   "보드에 추가 버튼"
  ],
  "action": "필수 입력 검증 → board",
  "input": "장소명 2~80자, 주소 5~160자, category",
  "rule": "자동 추출 실패의 대체 경로. 실서비스는 장소 검색 API의 canonical ID로 선택; 자유입력은 사용자 입력 상태로 보관.",
  "states": "빈 입력 / 검증 오류 / 저장 완료",
  "accept": "잘못된 길이 입력은 차단. 직접 추가 장소를 추출 확인 장소로 표시하지 않음."
 },
 {
  "route": "board",
  "name": "선택한 날의 장소 모음",
  "role": "customer",
  "both": true,
  "zones": [
   "영상·수동 추가",
   "저장 장소 목록 · 여행에 담기"
  ],
  "action": "추가된 장소 → 보관함 → 선택 날짜의 여행에 담기",
  "input": "board_id, place_ids, must_visit_ids",
  "rule": "장소 보관함과 날짜별 일정은 별도 데이터. 일정에서 장소를 빼도 보관함에 유지.",
  "states": "빈 보드 / 저장됨 / 변경됨 / 용량 초과",
  "accept": "새로고침 후 장소·필수 방문 유지. 다른 안의 보드는 독립 저장."
 },
 {
  "route": "planner",
  "name": "지도와 날짜별 여행 일정",
  "role": "customer",
  "both": true,
  "zones": [
   "영상 추가 / 장소 모음",
   "1~7일차 탭 / 날짜 추가",
   "현재 날짜 지도 · 번호 핀 / 방문 순서 선",
   "장소 목록 · 순서 / 체류 / 다른 날로 이동",
   "여행 저장 / 이날 공유 / 이날 메이트 요청"
  ],
  "action": "날짜 선택 → 해당 지도·목록 / 핀 선택 ↔ 카드 / 순서·날짜 이동 → 저장 / request",
  "input": "trip_id, day_id, date, start_time, stop_order, dwell_minutes, place_id",
  "rule": "안별 1개 여행·최대 7일. 하루 최대 20곳, 메이트 요청은 선택한 하루 6곳·4시간 이내. 실제 경로 미연동 시 직선은 방문 순서로만 표시. 한국 시간 기준.",
  "states": "빈 날짜 / 편집 / 저장 / 미확인 위치 / 지도 실패 / 이동시간 미확인",
  "accept": "날짜별 장소·순서·체류·시작 시간 보존. 다른 날로 이동 시 원래 날에서 제거. 새로고침 유지. 현재 하루만 스냅샷으로 전달."
 },
 {
  "route": "share",
  "name": "선택한 하루 공유",
  "role": "customer",
  "both": true,
  "zones": [
   "공유 전 개인정보 확인",
   "일정 텍스트 미리보기",
   "복사 / JSON 내려받기 / 인쇄"
  ],
  "action": "일정 텍스트 복사 / 파일 다운로드",
  "input": "공유용 일정 데이터 (개인정보 제외)",
  "rule": "현재 선택한 하루의 텍스트·JSON 공유. 여행 전체 공유는 후속 기능. 연락처·결제·대화 제외.",
  "states": "공유 전 / 복사 성공 / 클립보드 실패 대체",
  "accept": "내보낸 날짜와 장소가 현재 날짜 탭과 일치. 다른 날짜나 개인정보가 섞이지 않음."
 },
 {
  "route": "trips",
  "name": "전체 여행과 예약 확인",
  "role": "customer",
  "both": true,
  "zones": [
   "예약·요청 상태와 다음 행동",
   "일정 편집",
   "접어서 보는 전체 일정",
   "외부 예약 기록"
  ],
  "action": "저장 일정 → planner / 예약 → booking",
  "input": "현재 로컬 저장 일정, 예약 상태",
  "rule": "첫 버전 1개 일정 편집 지원. 실서비스 다중 일정은 서버 계정에 귀속. 로컬 데모는 한 일정임을 명시.",
  "states": "비어 있음 / 저장 일정 있음 / 예약 있음",
  "accept": "모든 날짜의 장소와 시작 시간을 표시. 선택한 날짜로 편집 진입. 예약 사본과 개인 일정은 별도 표시."
 },
 {
  "route": "account",
  "name": "계정과 데이터 관리",
  "role": "customer",
  "both": true,
  "zones": [
   "닉네임·프로필 사진 편집",
   "진행 중인 여행·제안·알림",
   "설정 아이콘"
  ],
  "action": "언어 변경 / 모드 전환 / 내보내기 / 삭제 확인 → 초기 상태",
  "input": "로컬 데모 저장 데이터",
  "rule": "고객·메이트 공통 마이. 언어·모드·데이터 관리는 별도 settings 화면. 프로필은 로컬 저장, 닉네임 중복 검사는 현재 로컬 디렉터리 기준.",
  "states": "기본 / 삭제 확인 / 삭제 완료",
  "accept": "진행 중인 요청·예약이 없으면 요약 영역 없음. 설정에서 마이로 복귀. 닉네임 변경 후 중복 재확인."
 },
 {
  "route": "support",
  "name": "도움말과 문의",
  "role": "customer",
  "both": true,
  "zones": [
   "주요 도움말 / 추출 오류 안내",
   "문의 유형 / 내용 입력",
   "문의 등록 결과"
  ],
  "action": "문의 검증 → 로컬 접수 상태 표시",
  "input": "문의 유형, 내용 10~1,000자",
  "rule": "프로토타입에서 실제 문의를 전송하지 않는다. 실서비스 영업시간·응답 SLA 공지; 긴급지원과 일반 문의 분리.",
  "states": "기본 / 입력 오류 / 로컬 접수됨",
  "accept": "최소 길이 미달 제출 불가. 화면에 실제 전송이 아님을 표시."
 },
 {
  "route": "policies",
  "name": "이용 및 개인정보 안내",
  "role": "customer",
  "both": true,
  "zones": [
   "데모 범위 / 실제 연동 범위",
   "데이터와 원본 콘텐츠 안내",
   "예약·취소 정책 초안"
  ],
  "action": "도움말 이동",
  "input": "policy_version",
  "rule": "서비스 정책 초안으로 표시. 출시 약관은 별도 법률 검토 후 버전 관리하며 동의 기록 보관.",
  "states": "읽기 전용",
  "accept": "출시 확정 약관으로 오인하지 않도록 초안 표시와 실제 결제 없음 안내."
 },
 {
  "route": "guides",
  "name": "메이트 탐색",
  "role": "customer",
  "both": false,
  "zones": [
   "여행 메이트 찾기 · 도착한 제안",
   "선택한 내 여행 · 공개 요청",
   "메이트별 제안 비교"
  ],
  "action": "내 여행 확인 → request / 도착한 제안 → requested",
  "input": "지역, 언어, guide_id",
  "rule": "특정 메이트 지정이 아닌 여행 공개형 요청. 복수 메이트 제안을 비교하고 고객이 선택.",
  "states": "조회 / 조건 없음 / 메이트 없음",
  "accept": "필터와 결과가 일치. 모든 프로필은 시연용이며 실제 인물·자격으로 오인되지 않음."
 },
 {
  "route": "guide",
  "name": "메이트 프로필과 코스",
  "role": "customer",
  "both": false,
  "zones": [
   "컬러 요약 카드 · 메이트 / 언어 / 지역",
   "최대 동행시간·인원 / 가격 안내 방식",
   "도움 범위 / 장소 사진",
   "하단 고정 일정 요청 버튼"
  ],
  "action": "선택 메이트 저장 → request",
  "input": "guide_id, 설명, 지역, course_template_id",
  "rule": "메이트 자격 원본·번호·신분증은 비공개. 고객에는 검증 상태와 언어만 노출. 무단 대체 금지.",
  "states": "가능 일정 확인 전 / 심사 완료 예시",
  "accept": "요청서에 선택한 메이트가 유지. 예시 프로필임을 명시."
 },
 {
  "route": "request",
  "name": "맞춤 여행 요청서",
  "role": "customer",
  "both": false,
  "zones": [
   "선택 날짜의 일정 스냅샷",
   "언어·인원·요청 내용",
   "메이트에게 일정 공개 동의"
  ],
  "action": "여행 공개 → 복수 메이트 제안 수신",
  "input": "day_id, itinerary_snapshot, guide_id, date, time, party 1~4, notes",
  "rule": "초기 공개 요청은 성수·48시간 전·4시간/6곳 기준. 메이트 지정 없이 게시. 제출만으로 예약 확정 금지.",
  "states": "작성 / 검증 오류 / 제출 / 중복 요청",
  "accept": "과거·임박 날짜, 미확인 장소, 범위 초과 요청 차단. 제출된 스냅샷을 메이트가 동일하게 봄."
 },
 {
  "route": "requested",
  "name": "요청 접수와 응답 대기",
  "role": "customer",
  "both": false,
  "zones": [
   "공개 여행 요약",
   "메이트별 금액·설명·유효기간",
   "제안 상세 이동"
  ],
  "action": "제안 비교 → quote → checkout → 고객 선택 후 booking",
  "input": "request_id, status, response_due_at",
  "rule": "같은 요청에 여러 제안을 보존. 같은 메이트 재발행만 이전 버전 교체. 요청 마감 후 새 발행·수락 차단.",
  "states": "requested / reviewing / declined / withdrawn / quoted",
  "accept": "제안이 없으면 결제 진입 차단. 철회 후 메이트 함께할 여행 제안하기 차단."
 },
 {
  "route": "quote",
  "name": "최종 일정과 제안",
  "role": "customer",
  "both": false,
  "zones": [
   "상단 요약 · 메이트 / 날짜 / 인원 / 팀 전체 금액",
   "번호 목록의 제안 일정 / 원래 요청과 비교",
   "포함·별도 비용 / 취소 조건 펼치기",
   "하단 고정 금액·예약 진행"
  ],
  "action": "유효 제안 수락 → checkout",
  "input": "quote_id, version, amount_krw, expires_at, itinerary_snapshot",
  "rule": "제안 유효 24시간(제안). 메이트 일정 충돌 확인. 변경된 장소·가격은 새 버전으로 재동의. 만료 시 결제 차단.",
  "states": "유효 / 만료 / 변경 / 요청 취소",
  "accept": "고객이 선택한 메이트·총액·버전을 확인. 만료 시 재제안 요청 경로 제공."
 },
 {
  "route": "checkout",
  "name": "메이트 선택·예약 요청",
  "role": "customer",
  "both": false,
  "zones": [
   "일정·현장 지급 금액",
   "예약자 정보",
   "현금 준비·확정 대기 동의"
  ],
  "action": "awaiting_mate_fee → 메이트 결제 대기",
  "input": "이름, 이메일, policy_consent, quote version",
  "rule": "선택 제안을 복사해 현장 현금 금액과 매칭 수수료 10%를 고정한다. 여행비 결제 없음. 즉시 확정하지 않음.",
  "states": "미동의 / 입력 오류 / 결제 시도 / 실패 / 성공",
  "accept": "실패 시 예약 미확정. 중복 클릭으로 중복 결제·예약 없음. 화면에 실제 결제 없음 표시."
 },
 {
  "route": "booking",
  "name": "예약 상세와 당일 일정",
  "role": "customer",
  "both": false,
  "zones": [
   "예약 상태별 제목 / 메이트·날짜·인원·금액",
   "만남 장소와 한국 시간",
   "확정 일정 번호 목록",
   "예약·취소 내역 / 하단 메이트 문의"
  ],
  "action": "chat / cancel / completed → review",
  "input": "booking_id, quote snapshot, status",
  "rule": "메이트 매칭 수수료 결제 전 미확정. 여행자는 약속 금액을 메이트에게 현금 지급. 플랫폼은 현금 수령·송금·자동 환불하지 않음.",
  "states": "메이트 확정 대기 / 확정 / 취소 검토 / 취소 / 완료",
  "accept": "완료 전 후기 불가. 취소·환불 상태를 명확히 구분. 요청서 수정으로 확정 내역 변경 불가."
 },
 {
  "route": "chat",
  "name": "예약 문의 대화",
  "role": "customer",
  "both": false,
  "zones": [
   "예약·메이트 요약",
   "대화 목록",
   "메시지 입력 / 전송"
  ],
  "action": "로컬 메시지 추가",
  "input": "booking_id, text 1~1,000자",
  "rule": "정산·결제 우회 유도 금지. 관리자 접근은 분쟁 담당 권한으로 제한하고 감사 로그 남김. 데모는 수신자에게 발송하지 않음.",
  "states": "대화 있음 / 빈 메시지 / 발송 오류",
  "accept": "빈 메시지 차단, HTML 이스케이프, 새로고침 후 보존. 가짜 자동 응답으로 실제 연결을 암시하지 않음."
 },
 {
  "route": "cancel",
  "name": "취소 요청과 환불 예상",
  "role": "customer",
  "both": false,
  "zones": [
   "예약 취소 사유",
   "현금 반환 직접 확인 안내"
  ],
  "action": "확정 전 cancelled / 확정 후 cancellation_requested",
  "input": "booking_id, reason, requested_at",
  "rule": "확정 전 철회는 수수료 무효. 확정 후 취소 요청 검토. 현금 및 수수료 환불 정책은 별도 확정 필요.",
  "states": "예상 계산 / 요청됨 / 환불 검토 / 환불 완료",
  "accept": "요청만으로 실제 환불 완료 처리하지 않음. 운영 심사 전 정산 보류. 중복 요청 차단."
 },
 {
  "route": "review",
  "name": "여행 후기 작성",
  "role": "customer",
  "both": false,
  "zones": [
   "완료한 여행 요약",
   "별점 / 후기 입력",
   "등록 결과"
  ],
  "action": "검증 → booking",
  "input": "rating 1~5, body 10~1,000자",
  "rule": "완료 예약당 1개. 운영자는 불만 후기를 임의 삭제하지 않고 신고 검토 절차 적용. 개인정보·혐오·광고 금지.",
  "states": "작성 / 오류 / 등록됨",
  "accept": "미완료 예약은 진입 차단. 재제출은 기존 후기를 덮어쓰지 않고 이미 작성 안내."
 },
 {
  "route": "guide-desk",
  "name": "메이트 요청함",
  "role": "guide",
  "both": false,
  "zones": [
   "공개된 여행 일정·조건",
   "제안 작성",
   "업무 요약"
  ],
  "action": "여행 확인 → guide-quote",
  "input": "자신에게 배정된 request_id",
  "rule": "승인 메이트가 공개 여행에 제안. 메이트 한 명의 미참여가 공개 요청 전체를 거절 처리하지 않음.",
  "states": "대기 없음 / 요청 / 거절 / 제안 발행",
  "accept": "고객 화면의 요청과 동일. 거절 사유가 고객 상태에 반영."
 },
 {
  "route": "guide-quote",
  "name": "메이트 일정·제안 작성",
  "role": "guide",
  "both": false,
  "zones": [
   "여행 스냅샷",
   "메이트 코스·이유·전체 제안"
  ],
  "action": "자신의 함께할 여행 제안하기·수정 → 고객 제안 목록",
  "input": "amount_krw, change_reason, final_plan, expires_at",
  "rule": "메이트별 제안 독립 저장. 다른 메이트 제안 유지. 발신 계정 선택은 검토 도구로만 제공. 실서비스 발신 ID는 서버 세션에서 결정.",
  "states": "초안 / 입력 오류 / 발행 완료",
  "accept": "발행 금액과 최종 일정이 고객 제안에 동일하게 표시. 결제 완료 후 제안 변경 불가."
 },
 {
  "route": "guide-calendar",
  "name": "메이트 가능 일정",
  "role": "guide",
  "both": false,
  "zones": [
   "업무 가능 요일 / 시간",
   "휴무 설정",
   "고객 요청일 가능 여부"
  ],
  "action": "가능 / 불가 토글 저장",
  "input": "availability, blackout_dates",
  "rule": "실서비스 날짜별 시간 슬롯과 예약의 원자적 잠금 필요. 데모는 요청일 수락 가능 여부만 저장.",
  "states": "가능 / 불가 / 예약 일정 충돌",
  "accept": "불가 설정이면 신규 함께할 여행 제안하기 차단. 기존 확정 예약을 자동 취소하지 않음."
 },
 {
  "route": "guide-earnings",
  "name": "매칭 수수료 내역",
  "role": "guide",
  "both": false,
  "zones": [
   "현장 현금 약속 금액",
   "10% 매칭 수수료 결제 상태"
  ],
  "action": "미납 수수료 → guide-fee",
  "input": "gross, fee_rate, refund, payout_status",
  "rule": "플랫폼 여행비 정산과 송금 없음.",
  "states": "예정 / 보류 / 지급 검토 가능 / 지급 완료",
  "accept": "고객 금액·환불과 정산 계산 일치. 실제 송금 없음 표시."
 },
 {
  "route": "admin",
  "name": "운영 대시보드",
  "role": "admin",
  "both": true,
  "zones": [
   "분석·오류·일정 KPI / 예약 KPI",
   "처리 대기 목록",
   "운영 화면 바로가기"
  ],
  "action": "admin-places / admin-support / admin-guides·admin-bookings",
  "input": "집계 이벤트, 운영 큐",
  "rule": "데모 수치는 예시로 표시. 실서비스 집계에서 테스트·중복 이벤트 제외, 개인정보 최소 노출.",
  "states": "예시 집계 / 처리 대기",
  "accept": "완료되지 않은 실험 데이터가 실제 매출로 표시되지 않음."
 },
 {
  "route": "admin-places",
  "name": "장소 오류 검수",
  "role": "admin",
  "both": true,
  "zones": [
   "확인 필요 장소 / 원본 출처",
   "후보 지점과 주소 비교",
   "수정 승인 / 반려"
  ],
  "action": "검수 상태 변경",
  "input": "place_id, correction_reason",
  "rule": "원본 추출값과 수정값 모두 보관. 기존 확정 투어에는 자동 적용하지 않고 변경 검토 큐로 전달.",
  "states": "미검수 / 승인 / 반려",
  "accept": "고객 장소와 검수 상태 일치. 반려 사유 기록. 출처 콘텐츠를 무단 복제하지 않음."
 },
 {
  "route": "admin-support",
  "name": "문의와 데이터 요청 관리",
  "role": "admin",
  "both": true,
  "zones": [
   "문의 유형·상태·내용",
   "처리 메모",
   "처리 완료 / 대기"
  ],
  "action": "로컬 문의 상태 업데이트",
  "input": "ticket_id, status, response_note",
  "rule": "삭제 요청은 본인 확인 후 처리. 회계·분쟁 법정 보관 대상은 분리·접근 제한. 운영 메모는 고객 공유 제외.",
  "states": "없음 / open / resolved",
  "accept": "미접수 문의를 실제 문의로 표시하지 않음. 완료 상태가 저장됨."
 },
 {
  "route": "admin-guides",
  "name": "메이트 자격 심사",
  "role": "admin",
  "both": false,
  "zones": [
   "메이트 기본 정보 / 신청 상태",
   "자격·신원·계약 확인 체크",
   "승인 / 보완 요청"
  ],
  "action": "검토 체크 후 승인 또는 보완",
  "input": "verification_flags, review_note",
  "rule": "자격·본인 일치·계약을 모두 확인한 후 승인. 실서비스 자격자료 암호화·접근 통제. 승인 상태와 프로필 노출 연결.",
  "states": "pending / needs_info / approved / suspended",
  "accept": "필수 체크 없이 승인 불가. 프로토타입 자격 자료는 가상 예시이며 진짜 검증이 아님."
 },
 {
  "route": "admin-bookings",
  "name": "예약·환불 운영",
  "role": "admin",
  "both": false,
  "zones": [
   "매칭 상태",
   "수수료 결제 상태",
   "취소 요청"
  ],
  "action": "취소 요청 검토 → 모의 환불 완료",
  "input": "booking_id, refund_amount, operator_note",
  "rule": "플랫폼은 여행비 환불을 수행하지 않음. 매칭 수수료 결제와 취소만 운영 확인.",
  "states": "확정 / 취소 요청 / 환불 처리 중 / 환불 완료",
  "accept": "취소 요청 없는 예약 환불 승인 차단. 환불액은 결제액 이하. 정산 화면도 갱신."
 },
 {
  "route": "notifications",
  "name": "알림",
  "role": "customer",
  "both": true,
  "zones": [
   "읽지 않은 알림 · 모두 읽음",
   "예약·여행 요청 상태 알림",
   "알림 없음 안내"
  ],
  "action": "알림 선택 → 해당 예약/요청, 메이트 모드는 요청함",
  "input": "현재 요청·예약 상태와 읽음 ID",
  "rule": "고객·메이트 공통 접근. 모드별 읽음 상태 저장. 관리자 웹 제외. 현재 상태 기반이며 푸시·서버 알림 이력은 미연동.",
  "states": "알림 없음 / 읽지 않음 / 읽음",
  "accept": "읽은 알림은 배지에서 제외. 상태 변경 시 새 알림. 이전 화면은 현재 모드 홈."
 },
 {
  "route": "settings",
  "name": "설정",
  "role": "customer",
  "both": true,
  "zones": [
   "언어·역할 모드",
   "도움말·이용 안내",
   "데이터 내려받기·삭제"
  ],
  "action": "마이 설정 아이콘 → 설정 → 하위 메뉴",
  "input": "언어 및 모드 설정",
  "rule": "고객·메이트 공통 접근. 기존 역할·저장 키 보존. 데이터 삭제는 기존 확인 대화상자 사용.",
  "states": "일반 / 메이트 권한 보유",
  "accept": "마이에 드문 설정 메뉴 없음. 설정에서 마이로 복귀. 언어 변경 후 설정 유지."
 },
 {
  "route": "guide-fee",
  "name": "매칭 수수료 결제",
  "role": "guide",
  "both": true,
  "zones": [
   "선택된 제안 스냅샷",
   "매칭 수수료 10%",
   "결제·예약 확정"
  ],
  "action": "메이트 수수료 결제 성공 → confirmed",
  "input": "booking_id, fee_amount, payment_id",
  "rule": "여행자 예약 요청은 awaiting_mate_fee. 선택된 메이트의 수수료 결제 성공 확인 후에만 예약 확정. 실서비스 PG는 미연동.",
  "states": "결제 대기 / 실패 / 성공 / 취소",
  "accept": "실패·중복 결제·철회 후 결제는 예약 확정 금지. 현장 현금 지급은 플랫폼 결제와 분리."
 }
];
window.REEL_PLACES = [
 {id:'n-seoul-tower',lat:37.5512,lng:126.9882,demoCoordinates:true,locationNote:'예시 좌표 · 실제 위치 확인 필요',name:'N서울타워 전망대',ko:'N서울타워 전망대',type:'관광지',area:'용산',address:'서울 용산구 남산공원길 105',duration:90,verified:true,manual:true,recommended:true},
 {id:'forest',lat:37.544625,lng:127.0398444,locationNote:'서울숲 대표 위치 · 입구 위치 확인 필요',name:'서울숲',ko:'서울숲',type:'공원',area:'성수',address:'서울 성동구 뚝섬로 273',duration:45,x:185,y:345,art:'park',photo:'park',verified:true},
 {id:'cafe',lat:37.542081,lng:127.048347,locationNote:'사진 촬영 위치 · 매장 입구 확인 필요',name:'성수동 카페',ko:'성수동 카페 · 상호 확인 필요',type:'카페',area:'성수',address:'성수동 · 상세 주소 확인 필요',duration:45,x:320,y:240,art:'cafe',photo:'cafe',verified:true},
 {id:'shop',lat:37.547097,lng:127.040925,locationNote:'사진 촬영 위치 · 매장 입구 확인 필요',name:'성수동 카메라 상점',ko:'성수동 카메라 상점 · 상호 확인 필요',type:'쇼핑',area:'성수',address:'성수동 · 상세 주소 확인 필요',duration:50,x:410,y:330,art:'shop',photo:'shop',verified:true},
 {id:'food',name:'광장시장 먹거리',ko:'광장시장 · 점포 확인 필요',type:'맛집',area:'종로',address:'광장시장 일대 · 방문 점포 확인 필요',duration:60,x:350,y:430,art:'food',photo:'food',verified:false}
];
