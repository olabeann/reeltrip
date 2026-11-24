"""Generate independent English app assets from the shared Korean implementation."""
from pathlib import Path
import json,re
root=Path(__file__).resolve().parents[2]/'src'
source=json.loads((Path(__file__).resolve().parent/'ko-source.json').read_text())
translations={int(line.split('|',1)[0]):line.split('|',1)[1] for line in (Path(__file__).resolve().parent/'en-translations.txt').read_text().splitlines()}
assert len(source)==len(translations)==667
mapping={s:translations[i] for i,s in enumerate(source)}
mapping.update({'꼭 가볼 곳으로 지정':'Mark as must-visit','꼭 가볼 곳':'Must-visit'})
mapping.update({'포함: 입력한 시간의 영어 가이드·일정 준비 / 불포함: 식비·쇼핑·교통·입장료. 새 버전 발행 시 이전 견적은 무효화됩니다.':'Included: English guide for the selected duration and itinerary preparation. Meals, shopping, transport and admission are extra. Issuing a new version replaces the previous quote.', '일정 준비와 동네 이동·주문 도움':'Itinerary preparation and help getting around and ordering'})
mapping.update({"입력한 시간의 영어 가이드·일정 준비":"English guide for the selected duration and itinerary preparation"})
mapping.update({"일정 편집":"Edit this stop","출발 시각":"Departure", "방문 장소":"Stops", "총 체류 시간":"Time at stops"})
mapping.update({'장소 관리': 'Manage this place', '도움과 이용 안내': 'Help & information', '데이터 보관': 'Keep a copy', '여행 정보를 파일로 보관할 수 있어요.': 'Download a copy of your saved travel data.', '데이터 삭제': 'Delete your data', '현재 안에 저장한 장소와 일정을 초기화합니다.': 'Reset the places and itinerary saved in this option.', '일행에게 공유': 'Share with your group', '복사한 내용을 원하는 메신저에 붙여넣으세요.': 'Copy your itinerary, then paste it into your preferred messaging app.', '파일로 보관': 'Keep a file', '포함 항목': 'Included', '요청 관리': 'Manage this request', '요청 철회는 예약 취소와 다릅니다.': 'Withdrawing this request does not cancel a confirmed booking.', '예약 취소': 'Cancel your booking', '취소 조건과 예상 환불액을 먼저 확인하세요.': 'Check the cancellation terms and estimated refund first.', '여행 조건': 'Your travel details', '가이드에게 전달할 내용': 'Tell your guide', '요청 전 확인': 'Before you send', '예약 전 확인': 'Before you confirm', '자주 묻는 질문': 'Common questions', '직접 문의 작성': 'Write a message', '가이드 요청·예약': 'Guide requests & bookings'})
mapping.update({'위치 확인 필요':'Location needed','좌표가 없어 이동시간을 계산할 수 없어요.':'Travel time needs coordinates for both stops.','도보 약 ${e.minutes}분':'About ${e.minutes} min on foot','· 직선거리 ${distance}':'· ${distance} straight-line','좌표 기반 추정 · 시속 4 km 기준. 실제 길·횡단보도·경사는 반영하지 않아요.':'Coordinate estimate at 4 km/h. Streets, crossings and hills are not included.'})
mapping.update({'예시 좌표 기준 · 실제 이동시간과 다를 수 있어요.':'Based on example coordinates · Actual travel time may differ.'})
mapping.update({'예시 좌표 · 실제 위치 확인 필요':'Example coordinates · Verify the actual location'})
mapping.update({'Google 지도 길찾기':'Directions in Google Maps','길찾기 ↗':'Directions ↗'})
mapping.update({'같은 이름의 지점은 주소를 확인해 주세요.': 'Check the address for venues with multiple branches.', '방문 전 주소와 영업시간을 확인해 주세요.': 'Check the address and opening hours before visiting.', '연락처·결제정보는 공유되지 않아요.': 'Contact and payment details are not shared.', '여행은 이 브라우저에만 저장돼요.': 'Trips are saved only in this browser.', '만날 출구는 가이드와 최종 확인해 주세요.': 'Confirm the meeting exit with your guide.', '영어 안내 · 가능 날짜는 요청 후 확인': 'English-speaking guides · Availability confirmed on request', '현재는 성수 지역의 미나 가이드에게 요청할 수 있어요.': 'Requests are currently available for Mina in Seongsu.', '제안된 일정과 일행 전체 금액을 확인하세요.': 'Review the itinerary and total price for your group.', '예약 확정 전입니다. 가이드가 일정과 가격을 제안할 예정이에요.': 'Not booked yet. Your guide will propose an itinerary and price.', '도보 추정 · 실제 경로와 다를 수 있어요.': 'Estimated walk · Actual route may differ.', '예시 좌표 기준 추정': 'Estimate based on example coordinates', '일정을 수정해도 확정된 가이드 예약은 변경되지 않아요.': 'Editing your trip does not change a confirmed guide booking.', '선택한 ${state.day+1}일차만 요청해요.': 'Request a guide for Day ${state.day+1} only.'})
mapping.update({'수수료는 VAT 포함 20%. PG 비용은 플랫폼이 부담합니다.': 'The 20% fee includes VAT. Payment processing is covered by the platform.', '차감 수수료 (20% · VAT 포함)': 'Platform fee (20% · VAT included)', '여행 완료 7일 후 정산 대상입니다. 환불·분쟁 중에는 보류하며, 세금·원천징수 전 금액입니다. 실제 송금은 연결되지 않았습니다.': 'Eligible for payout 7 days after completion. Refunds and disputes pause settlement. Amounts are before taxes or withholding. Live payouts are not connected.'})
mapping.update({'요청함':'Requests','가능 일정':'Availability','정산':'Earnings','릴트립 · 운영':'Reeltrip · Operations'})
mapping.update({'장소 찾기':'Find places','장소 확인':'Check places','장소 추가':'Add a place','일정 공유':'Share day','가이드 소개':'Meet your guide','여행 요청':'Request a guide','요청 상태':'Request status','여행 제안':'Trip proposal','예약 확인':'Review booking','예약 상세':'Booking details','가이드와 대화':'Message guide','취소 요청':'Cancel booking','후기 작성':'Write a review','견적 작성':'Create a quote'})
mapping.update(json.loads((Path(__file__).resolve().parent/'action-first-translations.json').read_text()))
mapping.update(json.loads((Path(__file__).resolve().parent/'signup-translations.json').read_text()))
mapping.update({'저장되었어요.':'Saved.',' · 저장됨':' · Saved'})
mapping.update({'장소 제안하기':'Suggest a place','제안은 이 브라우저에만 저장돼요.':'Suggestions are saved only in this browser.','제안 저장':'Save suggestion','제안을 저장했어요.':'Suggestion saved.','장소 이름과 주소를 입력해 주세요.':'Enter the place name and address.','일정에 추가':'Add to itinerary'})
# Product terminology: preserve internal routes and role IDs.
terminology=[('가이드에게 전달할 내용', '어떤 도움이 필요하세요?'), ('가이드가 미리 알면 좋은 점', '필요한 도움을 알려주세요'), ('가이드 견적 요청하기', '여행 메이트 찾기'), ('여행 확인하고 견적 요청', '여행 메이트 찾기'), ('내 여행에 맞는 가이드 제안', '내 여행에 맞는 메이트 제안'), ('견적 요청하기', '여행 메이트 찾기'), ('가이드 찾기', '여행 메이트 찾기'), ('견적 발행', '함께할 여행 제안하기'), ('받은 견적', '도착한 제안'), ('이 여행으로 견적 받기', '여행 메이트 찾기'), ('이날 견적 받기', '여행 메이트 찾기'), ('새 견적 요청', '여행 메이트 찾기'), ('견적 받기', '제안 받기'), ('가이드', '메이트'), ('견적', '제안')]
def product_copy(value):
 for old,new in terminology:value=value.replace(old,new)
 return value
def english_product_copy(value):
 # Translate visible words while preserving interpolated JS expressions.
 parts=re.split(r'(\$\{[^}]*\})',value)
 for i in range(0,len(parts),2):
  for old,new in [('Guides','Mates'),('guides','mates'),('Guide','Mate'),('guide','mate'),('Quotes','Proposals'),('quotes','proposals'),('Quote','Proposal'),('quote','proposal')]:
   parts[i]=re.sub(r'(?<![\w.#-])'+old+r'(?![\w-])',new,parts[i])
 return ''.join(parts)

mapping={product_copy(k):english_product_copy(v) for k,v in mapping.items()}
mapping.update({'여행 메이트 찾기':'Find a travel mate','도착한 제안':'Received proposals','메이트':'Mates','어떤 도움이 필요하세요?':'What help do you need?','함께할 여행 제안하기':'Send a trip proposal'})
mapping.update({'채팅': 'Chats', '저장한 장소': 'Saved places', '아직 대화가 없어요.': 'No conversations yet.', '예약한 여행의 대화가 여기에 모여요.': 'Conversations for your bookings appear here.', '메이트 둘러보기': 'Explore mates', '일정과 만남 장소를 이야기해 보세요.': 'Discuss your itinerary and meeting point.', '여행자와 대화': 'Chat with traveler', '여행자': 'Traveler', '예약 상세': 'Booking details', '시연용 대화이며 이 브라우저에만 저장돼요.': 'Demo conversation saved only in this browser.'})
mapping.update({'예시 대화': 'Sample conversation', '예시 대화 보기': 'View sample conversation', '가입하고 대화하기': 'Sign up to chat', '안녕하세요! 성수 여행을 함께할 메이트 미나예요. 만나서 반가워요.': 'Hi! I’m Mina, your mate for the Seongsu trip. Nice to meet you!', '안녕하세요! 서울숲을 산책하고 조용한 카페에 가보고 싶어요.': 'Hi! I’d like to walk through Seoul Forest and visit a quiet cafe.', '좋아요. 서울숲을 먼저 걷고 근처 카페로 이동할게요. 사진 찍기 좋은 곳도 안내해 드릴게요.': 'Sounds great. We’ll walk through Seoul Forest, then visit a nearby cafe. I’ll show you some photo spots too.', '좋아요! 어디에서 만나면 될까요?': 'Great! Where should we meet?', '오후 1시에 서울숲역 4번 출구에서 만나요. 도착하시면 여기로 메시지 주세요!': 'Let’s meet at Seoul Forest Station, Exit 4, at 1 PM. Message me here when you arrive!'})
mapping.update({'제안 상담': 'Proposal discussion', '종료된 대화': 'Closed conversation', '읽지 않은 메시지': 'unread messages', '대화를 찾을 수 없어요.': 'Conversation not found.', '채팅 목록에서 대화를 다시 선택해 주세요.': 'Choose a conversation from your inbox.', '일정·가격 변경은 제안을 수정하고 확인해 주세요.': 'Confirm itinerary and price changes through a revised proposal.', '대화 내용': 'Conversation', '읽음': 'Read', '종료된 대화는 기록만 확인할 수 있어요.': 'This conversation is closed. You can still view its history.', '메이트에게 질문하기': 'Ask this mate', '메이트와 대화': 'Chat with mate'})
# Free-quote copy intentionally retains the Korean 견적 wording.
free_quote_copy=json.loads((Path(__file__).resolve().parent/'action-first-translations.json').read_text())
for key in ['메이트가 코스와 전체 견적을 제안해요.', '메이트의 코스와 견적 받기', '자유 견적 시작하기', '자유 견적 요청', '자유 견적 요청하기']:
 mapping[key]=free_quote_copy[key]
mapping.update({'제안받기':'Get proposals','자유 여행 함께하기':'Plan a trip with a mate','내 여행 함께하기':'Find a mate for my trip','정해진 일정 없이 자유롭게 견적을 요청해요.':'Request a quote without a fixed itinerary.','지역과 기간을 정하면 메이트가 코스와 전체 견적을 제안해요.':'Choose your area and dates to receive an itinerary and full quote from a mate.','내 여행에 저장한 여행을 선택해요.':'Choose a trip saved in My trips.','만들어 둔 일정으로 메이트의 제안을 받아보세요.':'Get mate proposals for the itinerary you have created.','내 여행에서 선택하기':'Choose from My trips'})
mapping.update(json.loads((Path(__file__).resolve().parent/'mate-translations.json').read_text()))
mapping.update({'아직 다가오는 여행이 없어요': 'No upcoming trips yet', '새 여행을 만들고 가고 싶은 장소를 담아보세요.': 'Create a trip and add the places you want to visit.', '링크를 붙여주세요': 'Paste your video link', '현재는 영상 분석 없이 예시 장소로 저장 흐름을 체험해요.': 'Try saving sample places. Video analysis is not connected yet.', '저장할 장소 선택': 'Choose places to save', '영상 분석 결과가 아닌 예시 장소예요.': 'These are sample places, not video analysis results.', '저장할 장소를 선택해 주세요.': 'Select a place to save.'})
mapping.update({'편집':'Edit','가고 싶은 장소를 일정에 추가해 보세요.':'Add places you want to visit to your itinerary.'})
mapping.update(json.loads((Path(__file__).resolve().parent/'mate-flow-translations.json').read_text()))
mapping.update(json.loads((Path(__file__).resolve().parent/'safety-translations.json').read_text()))
mapping.update({'검색 결과가 없어요. 찾으시는 장소를 문의로 남겨 주세요.':'No results found. Leave an inquiry about the place you are looking for.', '검색 결과를 불러오지 못했어요. 다시 검색하거나 문의를 남겨 주세요.':'Search results could not load. Try again or leave an inquiry.', '문의 남기기':'Leave an inquiry', '장소 검색 문의:':'Place search inquiry:', '찾으시는 장소의 지역이나 주소를 추가로 알려주세요.':'Please add the area or address of the place you are looking for.'})
mapping.update({'날짜 수정':'Edit date','날짜':'Date'})
mapping.update({'원하는 장소를 각각 저장해 주세요. 같은 이름의 지점은 주소를 확인해 주세요.':'Save each place you like. Check the address for venues with multiple branches.','저장한 장소 보기':'View saved places','장소 저장':'Save place','저장됨':'Saved'})
mapping.update(json.loads((Path(__file__).resolve().parent/'mvp-policy-translations.json').read_text()))
pattern=re.compile('|'.join(re.escape(s) for s in sorted(mapping,key=len,reverse=True)))
s=pattern.sub(lambda m:mapping[m.group()],(root/'assets/app.js').read_text().replace('영어로 보기','Switch to English'))
s=s.replace('reeltrip-demo-ko-map-v2','reeltrip-demo-en-map-v2').replace("toLocaleString('ko-KR')","toLocaleString('en-US')")
# English word order for dynamic counts and headings.
s=s.replace('${i+1} day','Day ${i+1}').replace('${state.day+1} day','Day ${state.day+1}').replace('${(state.day||0)+1} day','Day ${(state.day||0)+1}').replace('${state.day+1} day','Day ${state.day+1}').replace('${state.day+1} day','Day ${state.day+1}')
s=s.replace('${esc(q.guide)} Guides','${esc(q.guide)} · Your guide').replace('${esc(q.guide)} guide','${esc(q.guide)} · Your guide')
s=s.replace('${esc(guide().name)} — request this guide','Request ${esc(guide().name)}').replace('${g.name} — view profile ↗','Meet ${g.name} ↗')
s=s.replace('Places found: ${filtered.length} places','${filtered.length} places found')
s=s.replace('${option} option','Option ${option}').replace('${i+1} option','Option ${i+1}')
s=s.replace('${q.party} guests in total.','Total for ${q.party} guests.').replace('${esc(guide().name)} — I would like to request this guide for this itinerary.','I would like to request ${esc(guide().name)} for this itinerary.')
s=s.replace('${g.name} Guides','${g.name} · Your guide').replace('${g.name} — request this guide','Request ${g.name}')
s=s.replace('English and Korean · Seoul ${g.area}','English and Korean · ${g.area}, Seoul')
s=s.replace('${state.days.length} days', '${state.days.length} ${state.days.length===1?"day":"days"}').replace('${n} guests', '${n} ${n===1?"guest":"guests"}').replace('${q.party} guests','${q.party} ${q.party===1?"guest":"guests"}')
s=s.replace('App language: English · Planning documents: Korean','App language: English · Korean and English versions save trips separately.')
# Inflect dynamic counts and use natural English labels in every journey state.
for expr,noun in [('state.board.length','place'),('state.selected.length','place'),('filtered.length','place'),('q.stops.length','place'),('state.request.party','guest'),('state.booking.party','guest'),('b.party','guest'),('r.party','guest')]:
    s=s.replace('${'+expr+'} '+noun+'s', '${'+expr+'} ${'+expr+'===1?"'+noun+'":"'+noun+'s"}')
s=s.replace('${state.days?.length||1} days','${state.days?.length||1} ${(state.days?.length||1)===1?"day":"days"}')
s=s.replace('${esc(state.booking.guide)} : your guided day','Your day with ${esc(state.booking.guide)}')
s=s.replace('${state.date} · ${state.time} start','${state.date} · Starts at ${state.time}')
s=s.replace('${esc(d.time)} start ·','Starts at ${esc(d.time)} ·')
s=s.replace('${esc(q.guide)} · Your guide','${esc(q.guide)}').replace('${g.name} · Your guide','${g.name}')
s=s.replace('Days Day','Day')
# Keep language switching on the same screen, with deliberately separate saved data.
s=s.replace('<a class="language-switch" href="english.html#${r}" lang="en" aria-label="Switch to English">EN</a>','<a class="language-switch" href="index.html#${r}" lang="ko" aria-label="Switch to Korean">한국어</a>')
s=s.replace('<a href="#support" class="app-help"','<a class="language-switch" href="index.html#${r}" lang="ko" aria-label="Switch to Korean">한국어</a><a href="#support" class="app-help"')
(root/'assets/app.en.js').write_text('/* Generated by tools/i18n/build_english.py. Edit translations, not this file. */\n'+s)
# Runtime-only English catalog: planning specifications remain in Korean.
raw=(root/'assets/catalog.js').read_text()
screens=json.loads(raw.split('window.REEL_SCREENS = ',1)[1].split(';\nwindow.REEL_PLACES',1)[0])
names=['Discover','Finding places','Places from your video','Add a place','Saved places','Day planner','Share this day','My trips','My account','Help and support','Travel essentials','Find a guide','Meet your guide','Request a guide','Request status','Itinerary & quote','Review booking','Your booking','Message your guide','Cancel booking','Review your trip','Guide inbox','Create a quote','Guide availability','Guide earnings','Operations','Review places','Support requests','Guide verification','Bookings and refunds','Notifications','Settings','Matching fee payment']
names+=['Sign up','Sign up with email']
names.append('Conversations')
names.append('Upcoming trips')
names.append('Mate registration')
names.append('My activity')
names[21]='Find trips'
names[23]='Schedule'
names[24]='Matching fee history'
names[32]='Booking and matching fee'
assert all(0<int(x['id'].split('-')[1])<=len(names) for x in screens)
sc=[dict(id=x['id'],route=x['route'],name=english_product_copy(names[int(x['id'].split('-')[1])-1]),role=x['role'],both=x['both']) for x in screens]
places=[dict(id='forest',lat=37.544625,lng=127.0398444,locationNote='Seoul Forest area · Check the entrance',name='Seoul Forest',ko='서울숲',type='Parks',area='Seongsu',address='273 Ttukseom-ro, Seongdong-gu, Seoul',duration=45,x=185,y=345,art='park',photo='park',verified=True),dict(id='cafe',lat=37.542081,lng=127.048347,locationNote='Photo location · Check the actual entrance',name='Seongsu cafe',ko='성수동 카페 · 상호 확인 필요',type='Cafes',area='Seongsu',address='Seongsu-dong · Exact address needs checking',duration=45,x=320,y=240,art='cafe',photo='cafe',verified=True),dict(id='shop',lat=37.547097,lng=127.040925,locationNote='Photo location · Check the actual entrance',name='Seongsu camera shop',ko='성수동 카메라 상점 · 상호 확인 필요',type='Shopping',area='Seongsu',address='Seongsu-dong · Exact address needs checking',duration=50,x=410,y=330,art='shop',photo='shop',verified=True),dict(id='food',name='Gwangjang Market food',ko='광장시장 · 점포 확인 필요',type='Food',area='Jongno',address='Gwangjang Market · Choose a stall before visiting',duration=60,x=350,y=430,art='food',photo='food',verified=False)]
places.insert(0,dict(id='n-seoul-tower',lat=37.5512,lng=126.9882,demoCoordinates=True,locationNote='Example coordinates · Verify the actual location',name='N Seoul Tower Observatory',ko='N서울타워 전망대',type='Attraction',area='Yongsan',address='105 Namsangongwon-gil, Yongsan-gu, Seoul',duration=90,verified=True,manual=True,recommended=True))
(root/'assets/catalog.en.js').write_text('window.REEL_SCREENS = '+json.dumps(sc,ensure_ascii=False,indent=2)+';\nwindow.REEL_PLACES = '+json.dumps(places,ensure_ascii=False,indent=2)+';\n')
g=(root/'assets/google-map.js').read_text()
gm={
'지도를 불러오지 못했어요. 아래 장소 목록을 이용해 주세요.':'The map could not load. You can still use the places below.',
'Google 지도 연결 설정이 필요합니다. 아래 장소 목록은 계속 사용할 수 있어요.':'Google Maps is not connected yet. You can still use the places below.',
'Google 지도를 사용하려면 로컬 서버 또는 배포 주소로 앱을 열어 주세요.':'Open the app from a local server or hosted address to use Google Maps.',
'Google 지도를 불러오는 중이에요…':'Loading Google Maps…',
'지도를 불러오지 못했어요. 연결을 확인한 뒤 새로고침하거나 아래 장소 목록을 이용해 주세요.':'The map could not load. Check your connection and refresh, or use the list below.',
' 선택':' selected'}
for k,v in gm.items():g=g.replace(k,v)
g=g.replace("language:c.language||'ko'","language:'en'")
(root/'assets/google-map.en.js').write_text(g)
for n in (2,):
 p=root/'app'/'index.html'
 h=p.read_text().replace('lang="ko"','lang="en"').replace('assets/app.js','assets/app.en.js').replace('assets/catalog.js','assets/catalog.en.js').replace('assets/google-map.js','assets/google-map.en.js').replace('20261117-depth-10','20261117-en-10')
 h=re.sub(r'<title>.*?</title>','<title>Reeltrip</title>',h)
 h=re.sub(r'<meta name="description"[^>]+>','<meta name="description" content="Find places from videos and plan your Korea trip with Reeltrip.">',h)
 h=h.replace('href="app.webmanifest"', 'href="app.en.webmanifest"')
 h=h.replace('본문으로 건너뛰기','Skip to content').replace('</head>','<link rel="stylesheet" href="../assets/english.css?v=20261117-en-10"></head>')
 h=re.sub(r'<link rel="stylesheet" href="../assets/liquid-glass.css[^>]+>', '', h)
 h=h.replace('<link rel="stylesheet" href="../assets/action-first.css', '<link rel="stylesheet" href="../assets/liquid-glass.css?v=20261117-glass-8"><link rel="stylesheet" href="../assets/action-first.css')
 (root/'app'/'english.html').write_text(h)
print('English apps generated')

# Separate operations web uses the same domain prototype with a desktop shell.
admin=(root/"app/english.html").read_text().replace('<body>', '<body data-surface="admin">')
admin=admin.replace('<link rel="manifest" href="app.en.webmanifest">', '')
(root/"admin/english.html").write_text(admin.replace("<title>Reeltrip</title>", "<title>Reeltrip — Operations web</title>"))
