/* Shared screen inventory */
// B-07 is retired; existing screen IDs remain unchanged.
// B-06 is retired into trip details; its legacy route remains compatible.
window.REEL_SCREENS = [
  {
    "route": "home",
    "name": "홈과 링크 입력",
    "role": "customer",
    "both": true,
    "zones": [
      "본문 브랜드 · 영상 링크 입력",
      "방한 외국인의 원하는 일정·필요한 동행·예산 선택을 중심으로 한 맞춤 한국 여행 소개 · 메이트 찾기 · 하단 탭"
    ],
    "action": "유효한 링크 입력 또는 샘플 시작 → processing",
    "input": "공개 Shorts/Reels HTTPS URL 1개, 최대 2,048자",
    "rule": "호스트·경로 허용 목록 검사. 비공개·삭제 영상은 분석 실패 처리. 임의 URL 서버 접근 금지.",
    "states": "기본 / 잘못된 URL / 처리 중 / 사용량 제한",
    "accept": "허용되지 않은 링크는 이동하지 않고 입력 오류 표시. 샘플은 네트워크 없이 예시 데이터 로드.",
    "id": "B-01"
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
    "accept": "부분 성공 시 발견한 장소는 유지. 실패 시 직접 장소 추가 경로 제공. 프로토타입은 1.4초 시뮬레이션.",
    "id": "B-02"
  },
  {
    "route": "results",
    "name": "지도에서 영상 속 장소 확인",
    "role": "customer",
    "both": true,
    "zones": [
      "원본 영상 링크 / 추출 상태",
      "지도와 장소 카드",
      "카테고리 / 지점 확인 / 장소 선택",
      "선택한 장소 저장"
    ],
    "action": "장소 선택 → 저장한 장소(board) → 날짜별 일정 만들기",
    "input": "place_id, source_url, 지점 후보, 사용자 선택",
    "rule": "정확한 좌표가 있는 후보만 지도에 표시. 미확인 후보는 별도 목록. place_id 기준 중복 제거. 추출 실패·부분 성공을 구분.",
    "states": "전체 / 음식 / 카페 / 쇼핑 / 공원 / 미확인 / 결과 없음",
    "accept": "저장은 보관함만 갱신하며 날짜별 일정을 변경하지 않는다. 중복 저장 방지. 결과가 없어도 직접 장소 추가 가능.",
    "id": "B-03"
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
    "accept": "잘못된 길이 입력은 차단. 직접 추가 장소를 추출 확인 장소로 표시하지 않음.",
    "id": "B-04"
  },
  {
    "route": "board",
    "name": "저장한 장소",
    "role": "customer",
    "both": true,
    "zones": [
      "영상·수동 추가",
      "저장 장소 목록 · 새 여행 만들기 / 내 여행 보기"
    ],
    "action": "장소 저장 → 공용 보관함. 일정 만들기는 새 여행 생성 또는 내 여행 선택 후 별도로 진행.",
    "input": "board_id, place_ids, must_visit_ids",
    "rule": "장소 보관함과 날짜별 일정은 별도 데이터. 일정에서 장소를 빼도 보관함에 유지.",
    "states": "빈 보드 / 저장됨 / 변경됨 / 용량 초과",
    "accept": "새로고침 후 저장 장소 유지. 보관함에는 여행명·날짜·일정에 담기 버튼을 표시하지 않는다. 저장·삭제는 기존 일정을 변경하지 않는다.",
    "id": "B-05"
  },
  {
    "route": "trips",
    "name": "내 여행 목록과 상세",
    "role": "customer",
    "both": true,
    "zones": [
      "저장한 장소 한 줄 진입",
      "여행 목록 / 새 여행 만들기",
      "선택한 여행 상세의 날짜별 일정·장소·메이트 요청 / 장소별 순서·삭제 메뉴 / 날짜·시작 시간 수정"
    ],
    "action": "여행 카드 선택 → 여행 상세 → 장소 메뉴·날짜/시간 수정 → 자동 저장",
    "input": "현재 로컬 저장 일정, 예약 상태",
    "rule": "기존 단일 여행은 첫 여행으로 보존. 여러 여행의 제목·날짜·장소·체류시간을 분리 저장. 보관함과 메이트 제안함은 공통.",
    "states": "비어 있음 / 저장 일정 있음 / 예약 있음",
    "accept": "목록에는 날짜 탭이나 일정 편집이 나타나지 않는다. 여행 전환·새로고침 후 각 여행의 일정이 보존된다.",
    "id": "B-08"
  },
  {
    "route": "account",
    "name": "마이",
    "role": "customer",
    "both": true,
    "zones": [
      "닉네임·프로필 사진 편집",
      "고객 모드: 메이트 등록 · 메이트 모드: 등록한 프로필·활동 정보·비공개 신청 정보",
      "설정"
    ],
    "action": "프로필 편집 / 메이트 등록 / 설정",
    "input": "로컬 데모 저장 데이터",
    "rule": "진행 요청·예약 요약과 예정된 일정 별도 목록은 제공하지 않는다. 요청·예약은 메이트 제안함에서 확인한다.",
    "states": "기본 / 프로필 편집",
    "accept": "프로필·설정·메이트 등록 유지. 중복 여행 요약 없음.",
    "id": "B-09"
  },
  {
    "route": "support",
    "name": "도움말과 문의",
    "role": "customer",
    "both": true,
    "zones": [
      "주요 도움말 / 추출 오류 안내",
      "문의 유형 / 내용 입력",
      "제출 후 일시적 완료 안내 · 빈 양식"
    ],
    "action": "실서비스: 문의 보내기 → 서버 접수 → 운영팀 Slack 알림. 시제품: 로컬 저장 후 토스트와 빈 양식",
    "input": "문의 유형, 내용 10~1,000자",
    "rule": "MVP는 접수로 종료한다. 사용자 저장됨·처리 완료 화면, 문의 이력·건수·최근 상태는 제공하지 않는다. 실서비스는 서버에 문의를 저장하고 운영팀 Slack으로 알린다. 현재 시제품은 외부 전송 없이 로컬 저장한다.",
    "states": "문의 작성 / 입력 오류. 실서비스 개발: 전송 중 / 접수 실패·재시도 / 일시적 접수 완료 안내",
    "accept": "내용 10~1,000자 검증. 성공 후 일시적 안내와 빈 양식만 표시하며 저장됨·처리 완료 화면은 없다. 실패 시 입력 유지. 서버 접수 뒤 Slack 알림 실패는 운영 재시도로 처리한다. 시제품 토스트는 실제 전송이 아님을 표시한다.",
    "id": "B-10"
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
    "accept": "출시 확정 약관으로 오인하지 않도록 초안 표시와 실제 결제 없음 안내.",
    "id": "B-11"
  },
  {
    "route": "guides",
    "name": "받은 제안과 자유 견적",
    "role": "customer",
    "both": false,
    "zones": [
      "도착한 제안 / 함께할 메이트 찾기",
      "요청별 제안 비교와 선택",
      "지역·기간으로 자유 견적 요청"
    ],
    "action": "받은 제안 → requested / 자유 견적 → request?mode=free",
    "input": "request_id, region, date, dayCount",
    "rule": "내 여행 요청과 자유 견적 요청을 같은 제안함에서 관리. 활성 요청 또는 예약이 있으면 해당 진행 상태로 연결.",
    "states": "조회 / 조건 없음 / 메이트 없음",
    "accept": "장소나 일정 없이 자유 견적 진입 가능. 제안함에서 코스·총액 비교와 선택 가능.",
    "id": "B-12"
  },
  {
    "route": "guide",
    "name": "메이트 프로필과 코스",
    "role": "customer",
    "both": false,
    "zones": [
      "메이트 소개 / 언어 / 지역",
      "도움 범위 / 가격 안내 방식"
    ],
    "action": "소개 열람 후 이전 화면으로 이동",
    "input": "guide_id, 설명, 지역, course_template_id",
    "rule": "메이트 자격 원본·번호·신분증은 비공개. 고객에는 검증 상태와 언어만 노출. 무단 대체 금지.",
    "states": "가능 일정 확인 전 / 심사 완료 예시",
    "accept": "개별 프로필에 공개 견적 요청 버튼을 붙이지 않는다. 특정 메이트 지정으로 오인시키지 않는다.",
    "id": "B-13"
  },
  {
    "route": "request",
    "name": "맞춤 여행 요청서",
    "role": "customer",
    "both": false,
    "zones": [
      "여행 목록에서 선택 → 요청 내용 작성 또는 자유 여행 지역·기간 입력",
      "출발일·첫날 시간·인원·선택 요청 내용",
      "공개 요청 및 제안 확인 동의"
    ],
    "action": "여행 공개 → 복수 메이트 제안 수신",
    "input": "requestType, region, date, endDate, dayCount, days, party, language, notes",
    "rule": "내 여행 전체 일정 또는 자유 견적의 두 경로. 최소 48시간 전·1~4명·최대 7일. 자유 견적에는 장소 목록을 요구하지 않는다. 특정 메이트 지정 없음.",
    "states": "여행 선택 / 요청 작성 / 검증 오류 / 제출 / 중복 요청",
    "accept": "날짜·기간·인원 오류와 중복 활성 요청을 차단한다. 자유 견적은 내 여행을 덮어쓰지 않는다. 기간과 일정을 제안·예약까지 보존한다.",
    "id": "B-14"
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
    "rule": "같은 요청에 여러 제안을 보존. 동일 메이트 유효 제안 수정·중복 발행 금지. 만료 후에만 교체. 요청 일정 고정·하루 4시간·전체 금액 입력, 자유 여행만 코스 입력. 요청 마감 후 새 발행·수락 차단.",
    "states": "requested / reviewing / declined / withdrawn / quoted",
    "accept": "제안이 없으면 결제 진입 차단. 철회 후 메이트 함께할 여행 제안하기 차단.",
    "id": "B-15"
  },
  {
    "route": "quote",
    "name": "최종 일정과 제안",
    "role": "customer",
    "both": false,
    "zones": [
      "상단 요약 · 메이트 / 날짜 / 인원 / 팀 전체 금액",
      "번호 목록의 제안 일정",
      "포함·별도 비용",
      "하단 고정 금액·예약 진행"
    ],
    "action": "유효 제안 수락 → checkout",
    "input": "quote_id, version, amount_krw, expires_at, itinerary_snapshot",
    "rule": "제안 유효 24시간. 유효한 제안 수정 불가. 만료·마감·현재 목록과 다른 버전의 수락 차단. 선택된 일정·금액은 예약 스냅샷에 고정.",
    "states": "유효 / 만료 / 변경 / 요청 취소",
    "accept": "고객이 선택한 메이트·총액·버전을 확인. 만료 시 재제안 요청 경로 제공.",
    "id": "B-16"
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
    "accept": "실패 시 예약 미확정. 중복 클릭으로 중복 결제·예약 없음. 화면에 실제 결제 없음 표시.",
    "id": "B-17"
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
    "action": "chat / cancel",
    "input": "booking_id, quote snapshot, status",
    "rule": "메이트 매칭 수수료 결제 전 미확정. 여행자는 약속 금액을 메이트에게 현금 지급. 플랫폼은 현금 수령·송금·자동 환불하지 않음.",
    "states": "메이트 확정 대기 / 확정 / 취소 검토 / 취소 / 완료",
    "accept": "후기 작성·조회 없음. 취소·환불 상태 구분. 요청 수정으로 확정 내역 변경 불가.",
    "id": "B-18"
  },
  {
    "route": "chat",
    "name": "메이트와 대화",
    "role": "customer",
    "both": true,
    "zones": [
      "상대 이름·대화 상태, 여행 요약 및 제안·예약 연결",
      "한국 시간 기준 날짜 구분, 좌우 메시지와 전송 시각·읽음",
      "여러 줄 메시지 입력 / 전송, 종료 상태 안내"
    ],
    "action": "로컬 메시지 추가",
    "input": "request_id + guide_id, text 1~1,000자",
    "rule": "메이트 제안 + 여행자 선택·예약 요청으로 쌍방 의사를 확인하고 빈 대화방을 연다. 여행자가 정한 전체 일정 마지막 날 자정(Asia/Seoul)에 종료한다. 중간 일정 완료는 종료 조건이 아니다. 철회·취소 완료는 즉시 읽기 전용. 텍스트 1~1,000자, 역할별 읽음·미읽음, 새로고침 후 기록 유지. 수수료 결제 전에도 대화 가능하나 예약 확정은 결제 후다. 실제 전송·서버 인증은 미구현이며 검토 도구에서 역할을 바꿔 양쪽 메시지를 직접 입력한다.",
    "states": "쌍방 동의 대기 / 대화 중 / 읽기 전용 / 잘못된 대화 링크",
    "accept": "기존 예약 메시지 1회 이전. 제안 재발행·예약 확정 시 이력 유지. 새 요청·다른 메이트의 메시지 격리. 게스트는 개인 대화 열람 불가.",
    "id": "B-19"
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
    "accept": "요청만으로 실제 환불 완료 처리하지 않음. 운영 심사 전 정산 보류. 중복 요청 차단.",
    "id": "B-20"
  },
  {
    "route": "guide-desk",
    "name": "여행 찾기",
    "role": "guide",
    "both": false,
    "zones": [
      "공개된 여행 일정·조건",
      "제안 작성"
    ],
    "action": "여행 확인 → guide-quote",
    "input": "공개된 여행 요청",
    "rule": "모든 승인 메이트가 공개 요청을 탐색한다. 활동 지역·가능 날짜 일치 요청을 우선 정렬하며 다른 지역도 숨기지 않는다. 확정 예약과 날짜가 겹치는 제안은 차단한다.",
    "states": "대기 없음 / 요청 / 거절 / 제안 발행",
    "accept": "requested/quoted 공개 요청만 노출하고 선택·철회·마감 시 제외한다. 개인 여행·연락처·숙소 주소를 공개하지 않는다. 현재 로컬 1건 시연이며 다중 사용자 피드는 서버 개발 대상이다.",
    "id": "B-22"
  },
  {
    "route": "guide-quote",
    "name": "메이트 일정·제안 작성",
    "role": "guide",
    "both": false,
    "zones": [
      "여행 스냅샷",
      "고정 요청 조건·전체 금액·자유 여행 코스",
      "함께할 일정: 요청 스냅샷의 날짜별 지도·장소·구간 거리·길찾기 (읽기 전용)"
    ],
    "action": "함께할 여행 제안하기 → 고객 제안 목록",
    "input": "amount_krw, final_plan(자유 여행만), ack",
    "rule": "메이트별 제안 독립 저장. 유효한 제안 수정·중복 발행 금지. 만료 후만 재발행. 하루 4시간 고정. 시연 발신은 미나이며 복수 예시는 검토 도구에서 생성. 실서비스 발신 ID는 서버 세션에서 결정.",
    "states": "초안 / 입력 오류 / 발행 완료",
    "accept": "발행 금액과 일정이 고객 제안에 동일하게 표시. 요청 날짜·인원·기존 일정 유지. 선택 후 모든 재발행 차단.",
    "id": "B-23"
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
    "accept": "완료되지 않은 실험 데이터가 실제 매출로 표시되지 않음.",
    "id": "B-26"
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
    "accept": "고객 장소와 검수 상태 일치. 반려 사유 기록. 출처 콘텐츠를 무단 복제하지 않음.",
    "id": "B-27"
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
    "accept": "미접수 문의를 실제 문의로 표시하지 않음. 완료 상태가 저장됨.",
    "id": "B-28"
  },
  {
    "route": "admin-guides",
    "name": "메이트 자격 심사",
    "role": "admin",
    "both": false,
    "zones": [
      "제출된 신청서와 비공개 심사 정보",
      "심사 확인 체크·승인",
      "사유 필수 보완 요청·거절"
    ],
    "action": "pending 신청 → 승인/보완 요청/거절",
    "input": "verification_flags, review_note",
    "rule": "승인만 활동 권한 부여. 보완/거절 사유 필수. 실제 서버 권한 검사 별도 구현.",
    "states": "신청 없음 / 심사 중 / 보완 요청 / 승인 거절 / 등록 완료",
    "accept": "필수 체크 없이 승인 불가. 프로토타입 자격 자료는 가상 예시이며 진짜 검증이 아님.",
    "id": "B-29"
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
    "accept": "취소 요청 없는 예약 환불 승인 차단. 환불액은 결제액 이하. 정산 화면도 갱신.",
    "id": "B-30"
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
    "accept": "읽지 않은 알림 제목 왼쪽에 파란 점을 표시한다. 읽지 않은 알림은 진한 제목(700)과 기본 배경, 읽은 알림은 보통 굵기(400)와 기본 배경. 읽은 알림은 배지에서 제외. 상태 변경 시 새 알림. 이전 화면은 현재 모드 홈.",
    "id": "B-31"
  },
  {
    "route": "settings",
    "name": "설정",
    "role": "customer",
    "both": true,
    "zones": [
      "언어·역할 모드",
      "고객센터: 도움말·문의 / 서비스 이용약관",
      "계정: 회원 탈퇴"
    ],
    "action": "마이 설정 아이콘 → 설정 → 하위 메뉴",
    "input": "언어 및 모드 설정",
    "rule": "고객·메이트 공통 접근. 기존 역할·저장 키 보존. 일반 데이터 관리 메뉴는 제공하지 않는다. 회원 탈퇴는 삭제 범위 안내·필수 동의 후 실행한다. 한국어·영어 저장 정보와 메이트 신청·권한을 함께 삭제하고 게스트 홈으로 이동한다. 진행 중인 예약이 있으면 탈퇴를 막는다. 실제 서버 계정 삭제는 미연동이다. 서비스 이용약관은 policies?section=terms로 연결한다. 개인정보처리방침 메뉴는 제공하지 않는다.",
    "states": "일반 / 메이트 권한 보유",
    "accept": "마이에 드문 설정 메뉴 없음. 설정에서 마이로 복귀. 언어 변경 후 설정 유지.",
    "id": "B-32"
  },
  {
    "route": "guide-fee",
    "name": "메이트 예약·수수료",
    "role": "guide",
    "both": true,
    "zones": [
      "예약 일정",
      "전체 금액·10% 수수료·차감 후 금액",
      "확정 기한",
      "채팅·완료·현금 수령 확인"
    ],
    "action": "메이트 수수료 결제 성공 → confirmed",
    "input": "booking_id, fee_amount, payment_id",
    "rule": "여행자 예약 요청은 awaiting_mate_fee. 선택된 메이트의 수수료 결제 성공 확인 후에만 예약 확정. 실서비스 PG는 미연동.",
    "states": "결제 대기 / 실패 / 성공 / 취소",
    "accept": "결제 후 같은 예약 상세에서 만남 조율. 완료와 현금 수령 별도 상태. 기한 이후 결제 금지.",
    "id": "B-33"
  },
  {
    "route": "signup",
    "name": "회원가입",
    "role": "customer",
    "both": true,
    "zones": [
      "언어 전환",
      "이메일과 간편가입 선택",
      "가입 없이 둘러보기"
    ],
    "action": "마이 → 회원가입 → 이메일 가입 또는 간편가입 선택",
    "input": "가입 수단",
    "rule": "카카오·네이버·Google은 연결 전 안내를 표시한다.",
    "states": "가입 수단 선택 / 간편가입 미연동 안내",
    "accept": "한·영 앱에서 열 수 있다. 가입 없이 여행을 둘러볼 수 있다.",
    "id": "B-34"
  },
  {
    "route": "signup-email",
    "name": "이메일 가입",
    "role": "customer",
    "both": true,
    "zones": [
      "이메일 주소 입력",
      "6자리 인증 코드 입력",
      "시연 완료"
    ],
    "action": "이메일 입력 → 예시 코드 확인 → 시연 완료",
    "input": "이메일, 시연 코드",
    "rule": "국내 휴대폰 번호·비밀번호 없이 진행한다. 이메일을 발송하거나 저장하지 않는다.",
    "states": "이메일 입력 / 코드 입력 / 코드 불일치 / 시연 완료",
    "accept": "코드가 틀리면 다시 입력하거나 이메일을 변경할 수 있다. 실제 계정이나 로그인 세션을 만들지 않는다.",
    "id": "B-35"
  },
  {
    "route": "messages",
    "name": "채팅 목록",
    "role": "customer",
    "both": true,
    "zones": [
      "최근 대화순 목록",
      "상대 이름·최근 메시지·여행 정보·시간·상태",
      "전체·안 읽음 필터, 미읽음 배지와 빈 목록"
    ],
    "action": "대화 선택 → chat",
    "input": "여행 요청·메이트별 대화, 역할별 읽음 상태",
    "rule": "고객·메이트 공통. 로컬 시제품으로 실제 전송하지 않는다.",
    "states": "빈 목록 / 대화 중 / 종료된 대화",
    "accept": "여러 메이트 대화를 독립 표시. 대화를 열면 해당 역할의 미읽음 해제. 예시 대화 자동 생성 없음.",
    "id": "B-36"
  },
  {
    "route": "mate-register",
    "name": "메이트 등록",
    "role": "customer",
    "both": true,
    "zones": [
      "지역·언어 → 프로필 → 휴대폰 인증 → 최종 확인",
      "진행률·자동 임시 저장·이전·다음·공개 프로필 미리보기",
      "제출 후 심사 상태·보완 사유·승인 후 메이트 전환"
    ],
    "action": "마이 → 신청 작성 → 심사 요청 → 운영 승인 → 메이트 활동",
    "input": "필수: 분야·지역·언어·활동 이름·10자 이상 한 줄 소개·이메일·동의. 선택: 사진·동네 인연·걷는 속도·도움·경험/자격",
    "rule": "공개 정보는 본인 작성·미검증으로 표시하며 연락처 심사 정보는 비공개. 사진은 JPG/PNG/WebP 1MB 이하 브라우저 저장. 제출만으로 활동 불가. 관리자만 승인·보완 요청·거절. 보완/거절 사유 필수. 수정 후 재심사.",
    "states": "작성 중 / 심사 중 / 보완 요청 / 승인 거절 / 등록 완료",
    "accept": "승인 전 메이트 화면 차단. 승인 후 모드 전환. 동일 브라우저 시연이며 서버 인증·검증 미연동.",
    "id": "B-38"
  },
  {
    "route": "guide-activity",
    "name": "메이트 내 활동",
    "role": "guide",
    "both": false,
    "zones": [
      "확정 대기·예약 상세",
      "보낸 제안",
      "완료·취소 내역"
    ],
    "action": "예약 상세 → guide-fee / 제안 → guide-quote",
    "input": "booking, proposals, bookingHistory",
    "rule": "선택 후 24시간 또는 출발 시각 중 빠른 시각까지 확정. 미결제 만료·거절·철회 후 재선택 가능.",
    "states": "제안 없음 / 제안 발행 / 확정 대기 / 예약 확정 / 완료 / 취소",
    "accept": "기존 B-* ID 유지. 결제 후 예약 상세. 예약 취소와 수수료 반환 검토 분리.",
    "id": "B-39"
  }
];
window.REEL_PLACES = [
 {id:'n-seoul-tower',lat:37.5512,lng:126.9882,demoCoordinates:true,locationNote:'예시 좌표 · 실제 위치 확인 필요',name:'N서울타워 전망대',ko:'N서울타워 전망대',type:'관광지',area:'용산',address:'서울 용산구 남산공원길 105',duration:90,verified:true,manual:true,recommended:true},
 {id:'forest',lat:37.544625,lng:127.0398444,locationNote:'서울숲 대표 위치 · 입구 위치 확인 필요',name:'서울숲',ko:'서울숲',type:'공원',area:'성수',address:'서울 성동구 뚝섬로 273',duration:45,x:185,y:345,art:'park',photo:'park',verified:true},
 {id:'cafe',lat:37.542081,lng:127.048347,locationNote:'사진 촬영 위치 · 매장 입구 확인 필요',name:'성수동 카페',ko:'성수동 카페 · 상호 확인 필요',type:'카페',area:'성수',address:'성수동 · 상세 주소 확인 필요',duration:45,x:320,y:240,art:'cafe',photo:'cafe',verified:true},
 {id:'shop',lat:37.547097,lng:127.040925,locationNote:'사진 촬영 위치 · 매장 입구 확인 필요',name:'성수동 카메라 상점',ko:'성수동 카메라 상점 · 상호 확인 필요',type:'쇼핑',area:'성수',address:'성수동 · 상세 주소 확인 필요',duration:50,x:410,y:330,art:'shop',photo:'shop',verified:true},
 {id:'food',name:'광장시장 먹거리',ko:'광장시장 · 점포 확인 필요',type:'맛집',area:'종로',address:'광장시장 일대 · 방문 점포 확인 필요',duration:60,x:350,y:430,art:'food',photo:'food',verified:false}
];
