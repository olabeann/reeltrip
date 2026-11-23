# 장소·사진 API 연결

구현된 흐름: **새 장소 추가 → 검색 → 이름·주소·사진 확인 → 내 장소 또는 여행에 저장**.
여행 리스트는 일정에 담긴 장소 중 첫 사진을 대표 이미지로 사용한다. 관광공사 검색에서는 지역명으로 관광지 사진을 찾아 장소로 담을 수 있다. 사진이 없는 여행에 임의의 지역 사진을 자동 배정하지 않는다.

2026-11-19 로컬 Google Maps/Places 연결 후 서울숲 검색 결과 2곳, 지도 핀 선택, 상세 주소·사진·사진 출처 조회를 실제 API로 확인했다. 로컬 접속 주소는 http://localhost:8765/src/app/index.html 이다. TourAPI는 미연결이며 영상에서 장소를 추출하는 기능은 여전히 시연 데이터다.

## Google Maps / Places

1. Google Cloud 프로젝트에서 결제 계정 및 **Maps JavaScript API**, **Places API (New)**를 활성화한다.
2. 웹사이트 HTTP referrer 제한을 적용한 **브라우저용 키**를 발급한다. 운영 도메인과 개발 localhost만 허용하고 위 API로 범위를 제한한다.
3. `src/assets/maps-config.js`의 `apiKey`와 운영 `mapId`를 설정한다. 서버용 비밀키는 넣지 않는다.
4. 검색 후 결과를 선택할 때만 사진을 조회한다. 저장하는 Google 데이터는 Place ID와 앱 내부 ID·체류시간이며 이름·주소·좌표·사진·출처는 새로고침 후 다시 조회한다. 조회 실패 시 Place ID는 보존되고 기본 표시를 사용한다. 다시 불러오려면 새로고침한다.
5. 요금은 Google 프로젝트에 청구된다. 검색, 상세 조회 및 재접속 시 저장 장소 조회가 발생하므로 콘솔에서 할당량/예산을 설정한다.

공식 문서: [장소 검색](https://developers.google.com/maps/documentation/javascript/place-search), [사진과 출처](https://developers.google.com/maps/documentation/javascript/place-photos), [콘텐츠 저장 정책](https://developers.google.com/maps/documentation/javascript/policies).

## 한국관광공사 TourAPI — 선택 연결

[공공데이터포털 국문 관광정보 서비스](https://www.data.go.kr/data/15101578/openapi.do) 활용 신청 후 받은 **일반 인증키(Decoding)**를 서버 환경변수 `TOUR_API_KEY`에 설정한다. 키를 JS 파일, Git 또는 채팅에 붙여넣지 않는다.

- Node.js 20 이상에서 `node src/server/places-server.mjs` 실행 (프로젝트 폴더 기준).
- 기본 주소: `http://127.0.0.1:8766/app/index.html`; `PORT`로 변경 가능.
- `src/assets/maps-config.js`의 `tourismEndpoint`를 `/api/tourism/search`로 설정.
- 브라우저에는 정규화된 관광지 데이터만 반환하며 키와 공급자 오류 원문을 반환하지 않는다.
- 이 서버는 로컬 검증용으로 localhost에만 열린다. GitHub Pages에는 Node 서버가 실행되지 않는다. 운영 시 같은 도메인의 서버 함수로 프록시를 옮기고 요청 제한/모니터링을 적용해야 한다.
- 사진은 한국관광공사 출처를 표시하며 자르지 않고 표시한다. 공공누리 유형 등 개별 이미지 사용 조건은 운영 시 확인한다.

키 미설정·오류 상태에서는 수동 장소 추가를 계속 사용할 수 있다. 수동 입력에 가짜 위치 좌표를 생성하지 않는다.

## 검증

`node tools/tests/place_api_checks.cjs` — 키 미설정, 검색/상세 분리, 출처, 영구 저장 제외, 재조회, TourAPI 오류, 서버 비공개 파일 접근 차단.
실키 연결 후에는 이름·주소·좌표 일치, 사진/출처 표시, 중복 저장, 여행 대표 사진, 새로고침, 권한·할당량 오류를 실제 제공자로 추가 점검한다.
