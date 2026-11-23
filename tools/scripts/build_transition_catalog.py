"""Derive IA labels, state availability and link destinations from real KO/EN renders.
Effects of non-link actions are reviewed against the actual event handlers.
"""
import json
import subprocess
from pathlib import Path
from html.parser import HTMLParser
ROOT=Path(__file__).resolve().parents[2]
class Controls(HTMLParser):
    def __init__(self):
        super().__init__();self.stack=[];self.controls=[]
    def handle_starttag(self,tag,attrs):
        node={'tag':tag,'attrs':dict(attrs),'text':'','parents':list(self.stack)}
        if tag in ('a','button','select','input','summary'):self.controls.append(node)
        if tag not in ('input','img','br','hr','meta','link','path','circle','rect','line','polyline','polygon'):self.stack.append(node)
    def handle_endtag(self,tag):
        for i in range(len(self.stack)-1,-1,-1):
            if self.stack[i]['tag']==tag:self.stack=self.stack[:i];break
    def handle_data(self,text):
        for node in self.stack:node['text']+=text

def build():
    rendered=json.loads(subprocess.check_output(['node',str(ROOT/'tools/scripts/collect_transition_controls.cjs')],cwd=ROOT))
    effects=json.loads((ROOT/'resources/review/transition-effects.json').read_text())
    states=json.loads((ROOT/'resources/review/screen-states.json').read_text())
    groups={route:{} for route in states}
    coverage=[]
    for sample in rendered:
        route,sid,lang=sample['route'],sample['state'],sample['lang'];p=Controls();p.feed(sample['html'])
        for control_index,node in enumerate(p.controls):
            a=node['attrs'];parents=node['parents'];tag=node['tag']
            if any('reviewtools' in x['attrs'].get('class','') or 'developer-only' in x['attrs'].get('class','') for x in parents) or 'developer-only' in a.get('class',''):continue
            if tag=='input' and not a.get('data-select'):continue
            form=next((x['attrs'].get('id') for x in parents if x['tag']=='form'),None)
            label=' '.join((a.get('aria-label') or node['text']).split()) or ('운영 홈' if a.get('href')=='#admin' else a.get('name',''))
            href=a.get('href');action=a.get('data-action') or a.get('data-booking');key='';rule={}
            if action:
                key='action:'+action;assert key in effects,(route,key)
                rule=dict(effects[key])
                # The notification handler follows each item's real route, not a fixed request page.
                if action=='notification-open':rule['target']=(href or '').lstrip('#').split('?')[0];rule['destination']=href
                if action in ('guides-tab','place-picker-tab','notification-filter'):key+=':'+a.get('data-id','')
                if action=='guides-tab':rule['state']='discover' if a.get('data-id')=='discover' else ('waiting' if sid=='discover-existing' else 'none' if sid=='discover' else sid)
                if action=='availability':rule['state']='unavailable' if sid=='available' else 'available'
                if action=='correct' and route=='admin-places':rule.update(kind='구현 제한',target=None,state=None,destination='#manual?resolve=장소ID',effect='현재 구현: manual?resolve=장소ID로 이동하지만 운영 모드에서 고객 화면 접근이 차단됨. 운영 검수 편집 연결 보완 필요.')
                if action=='signup-edit-email' and sid.startswith('signin-'):rule['state']='signin-address'
            elif 'data-access-mode' in a:
                mode=a['data-access-mode'];key='mode:'+mode;rule=dict(kind='이동',target='guide-desk' if mode=='guide' else 'home',state=None,effect=f'mode={mode} 저장 → 해당 모드 홈. 요청·예약 데이터 유지; 승인된 메이트만 전환 가능')
            elif href:
                key='locale:'+a['lang'] if a.get('lang') else 'link:'+href.replace('lang='+lang,'lang={current}')
                if href.startswith('https://www.google.com/maps/search/?api=1&query='):
                    key='link:google-maps-place:'+str(control_index)
                if href.startswith('#'):
                    target=href[1:].split('?')[0]
                    if target=='main':continue
                    assert target in states,(route,href)
                    rule=dict(kind='이동',target=target,state=None,destination=href,effect='현재 데이터를 유지하고 표시된 주소로 이동; 상태를 새로 생성하거나 완료 처리하지 않음')
                    if target=='chat':rule['effect']='현재 예약 또는 thread ID의 대화 열기; 현재 모드의 읽음 위치 갱신. 대화 없으면 목록 표시'
                else:
                    rule=dict(kind='언어 전환' if a.get('lang') else '외부',target=None,state=None,destination=href,effect=('선택 언어의 같은 route로 이동; 정상 앱 저장 데이터 유지. IA 미리보기는 독립 예시를 다시 로드' if a.get('lang') else ('새 탭에서 링크 열기' if a.get('target') else '현재 프레임에서 문서로 이동')+'; 앱 데이터 변경 없음'))
            elif tag=='button' and form and a.get('type','submit')=='submit':
                key='form:'+form;assert key in effects,(route,key);rule=dict(effects[key])
                if form=='cancel-form' and sid=='fee':rule['state']='cancelled'
                if form=='signup-email-form' and sid.startswith('signin-'):rule['state']='signin-code'
            elif tag=='summary':
                key='disclosure:'+str(control_index);rule=dict(kind='펼침',target=None,state=None,effect='현재 화면의 상세 설명·메뉴를 펼치거나 접기; 데이터 변경 없음')
            elif tag=='select' or a.get('data-select'):
                key='field:'+('selected' if a.get('data-select') else 'duration' if a.get('data-duration') else a.get('id') or a.get('name',''))
                rule=dict(kind='입력 변경',target=None,state=None,effect='폼 값을 변경하며 화면 이동 없음; 제출 버튼에서 검증·저장')
                if a.get('data-select'):rule['effect']='체크한 장소를 state.selected에 추가/제거하고 화면 갱신'
                if a.get('data-duration'):rule['effect']='해당 장소 체류시간 변경, saved=false; 현재 날짜 일정 저장에 반영'
            else:continue
            common=any(x['tag']=='nav' for x in parents)
            # One action can lead to different screens (for example, notification history).
            signature=key+'|'+str(common)+'|'+str(rule.get('target'))
            record=groups[route].setdefault(signature,{**rule,'source':key,'common':common,'sourceStates':[],'labels':{'ko':{},'en':{}},'disabledStates':[]})
            record.setdefault('destinations',{}).setdefault(lang,{})[sid]=rule.get('destination') or ('#'+rule['target'] if rule.get('target') else '')
            if sid not in record['sourceStates']:record['sourceStates'].append(sid)
            labels=record['labels'][lang].setdefault(sid,[])
            if label not in labels:labels.append(label)
            if 'disabled' in a and sid not in record['disabledStates']:record['disabledStates'].append(sid)
            # Resolve preview independently of the actual destination address.
            if rule.get('target'):
                target=rule['target'];target_states=states[target]
                preferred=rule.get('state')
                if href and href.startswith('#'):
                    fixture=next(v['fixture'] for v in states[route] if v['id']==sid)
                    mode=fixture.get('mode', 'guide' if route.startswith('guide-') else 'customer')
                    matching_mode=[v for v in target_states if v.get('fixture',{}).get('mode', 'guide' if target.startswith('guide-') else 'customer')==mode]
                    target_states=matching_mode or target_states
                    exact=next((v for v in target_states if v.get('fixture',{}).get('hash')==href[1:]),None)
                    match=next((v for v in target_states if fixture.get('flow') and v.get('fixture',{}).get('flow')==fixture['flow']),None)
                    member_match=next((v for v in target_states if bool(v.get('fixture',{}).get('guest'))==bool(fixture.get('guest'))),None)
                    preferred=(exact or match or member_match or {}).get('id')
                record.setdefault('previewStates',{})[sid]=preferred or target_states[0]['id']
                record['state']=record['previewStates'][sid]
            coverage.append([route,sid,lang,key,label])
    result={}
    for route,items in groups.items():
        result[route]=[]
        for record in items.values():
            assert record['labels']['ko'],(route,record['source'])
            record['trigger']=next(iter(record['labels']['ko'].values()))[0]
            record['condition']='노출 상태: '+', '.join(v['label'] for v in states[route] if v['id'] in record['sourceStates'])
            result[route].append(record)
    # An automatic completion is an event, not a visible button.
    result['processing'].append(dict(trigger='분석 완료 (자동)',source='auto:processing',condition='사용자가 분석 시작 · 시연 약 1.4초',target='results',state='selected',kind='자동',effect='processing → partial → results. 초기 분석 진행 상태 미리보기는 확인을 위해 정지 유지',sourceStates=['loading'],labels={'ko':{},'en':{}},disabledStates=[],common=False))
    runtime=json.loads((ROOT/'resources/review/transition-runtime-rules.json').read_text())
    for index,rule in enumerate(runtime):
        assert rule['marker'] in (ROOT/rule['sourceFile']).read_text(), rule['trigger']+' source missing'
        for route in rule['routes']:
            source_states=[v['id'] for v in states[route] if not v.get('fixture',{}).get('guest')]
            result[route].append(dict(trigger=rule['trigger'],source='runtime:'+str(index),condition=rule['condition'],target=rule['target'],state=rule['state'],kind=rule['kind'],effect=rule['effect'],sourceStates=source_states,labels={'ko':{},'en':{}},disabledStates=[],common=False,reviewedSource=rule['sourceFile']))
    return result,coverage
if __name__=='__main__':
    result,coverage=build()
    path=ROOT/'resources/review/screen-transitions.json'
    import sys
    if '--check' in sys.argv:
        assert json.loads(path.read_text())==result,'IA catalog differs from rendered labels/links or reviewed effects. Rebuild frontend index.'
        print(f'PASS: {len(result)} screens, {sum(map(len,result.values()))} rules, {len(coverage)} KO/EN control observations; exact labels, availability and link destinations.')
    else:
        path.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
        print(f'Generated {sum(map(len,result.values()))} IA rules from {len(coverage)} rendered controls.')
