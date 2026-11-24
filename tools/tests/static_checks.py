"""Validate links, screen traceability and JS syntax. No third-party packages."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlparse,unquote,parse_qs
import subprocess,json,sys
ROOT=Path(__file__).resolve().parents[2]
class Document(HTMLParser):
 def __init__(self,text):
  super().__init__();self.links=[];self.ids=set();self.feed(text)
 def handle_starttag(self,tag,attrs):
  attrs=dict(attrs)
  if 'id' in attrs:self.ids.add(attrs['id'])
  for key in ('href','src'):
   if key in attrs:self.links.append(attrs[key])
fail=[];links=0;files=[ROOT/'index.html', * (ROOT/'src').rglob('*.html'), * (ROOT/'docs').rglob('*.html')]
for path in files:
 doc=Document(path.read_text())
 for link in doc.links:
  u=urlparse(link)
  if u.scheme or u.netloc:continue
  target=(path.parent/unquote(u.path)).resolve() if u.path else path
  links+=1
  if target==ROOT/'docs/static-checks.json' and not target.exists():continue
  if not target.exists():fail.append(f'{path.relative_to(ROOT)} → missing {link}');continue
  if target==ROOT/'src/frontend/states.html' and u.fragment:
   params=parse_qs(u.fragment);route=params.get('screen',[''])[0]
   screens=json.loads((ROOT/'docs/screen-spec.json').read_text())
   registry=json.loads((ROOT/'resources/review/screen-states.json').read_text())
   if route not in [s['route'] for s in screens]:fail.append(f'Invalid preview screen: {link}')
   if 'state' in params and params['state'][0] not in [s['id'] for s in registry.get(route,[])]:fail.append(f'Invalid preview state: {link}')
   continue
  if target in [ROOT/'src/frontend/preview.html',ROOT/'src/frontend/preview-en.html',ROOT/'src/frontend/preview-admin.html',ROOT/'src/frontend/preview-admin-en.html'] and u.fragment:
   if u.fragment=='main':continue
   registry=json.loads((ROOT/'resources/review/screen-states.json').read_text())
   route=u.fragment.split('?')[0];params=parse_qs(u.query)
   if route not in registry:fail.append(f'Invalid preview route: {link}')
   if 'screen' in params and params['screen'][0]!=route:fail.append(f'Mismatched preview route: {link}')
   if 'state' in params and params['state'][0] not in [s['id'] for s in registry.get(route,[])]:fail.append(f'Invalid preview state: {link}')
   continue
  if u.fragment and target.suffix=='.html' and target.parent not in (ROOT/'src/app',ROOT/'src/admin'):
   if u.fragment not in Document(target.read_text()).ids:fail.append(f'{path.name} → missing anchor {link}')
for file in ['assets/app.js','assets/catalog.js','assets/google-map.js','assets/maps-config.js','frontend/states.js','frontend/preview-storage.js','frontend/state-catalog.js','frontend/preview-map-config.js','frontend/ia.js']:
 p=subprocess.run(['node','--check',str(ROOT/'src'/file)],text=True,capture_output=True)
 if p.returncode:fail.append(p.stderr)
counts={}
for n,expected in [(2,32)]:
 data=json.loads((ROOT/'docs/screen-spec.json').read_text());counts['app']=len(data)
 if len(data)!=expected:fail.append(f'Option {n} screen count {len(data)} != {expected}')
 if len({s['route'] for s in data})!=len(data):fail.append(f'Option {n} duplicate route')
 text=(ROOT/'docs/product.html').read_text()
 for s in data:
  if f'id="spec-{s["id"]}"' not in text or f'id="wire-{s["id"]}"' not in text:fail.append(f'Missing screen/spec traceability {s["id"]}')
report={'htmlFiles':len(files),'localLinksChecked':links,'screenCounts':counts,'failures':fail,'passed':not fail}
print(json.dumps(report,ensure_ascii=False,indent=2))
(ROOT/'docs/static-checks.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
sys.exit(bool(fail))
