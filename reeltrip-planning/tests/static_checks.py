"""Validate links, screen traceability and JS syntax. No third-party packages."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlparse,unquote
import subprocess,json,sys
ROOT=Path(__file__).resolve().parents[1]
class Document(HTMLParser):
 def __init__(self,text):
  super().__init__();self.links=[];self.ids=set();self.feed(text)
 def handle_starttag(self,tag,attrs):
  attrs=dict(attrs)
  if 'id' in attrs:self.ids.add(attrs['id'])
  for key in ('href','src'):
   if key in attrs:self.links.append(attrs[key])
fail=[];links=0;files=list(ROOT.rglob('*.html'))
for path in files:
 doc=Document(path.read_text())
 for link in doc.links:
  u=urlparse(link)
  if u.scheme or u.netloc:continue
  target=(path.parent/unquote(u.path)).resolve() if u.path else path
  links+=1
  if target==ROOT/'docs/static-checks.json' and not target.exists():continue
  if not target.exists():fail.append(f'{path.relative_to(ROOT)} → missing {link}');continue
  if u.fragment and target.suffix=='.html' and target.parent not in (ROOT/'app',ROOT/'admin'):
   if u.fragment not in Document(target.read_text()).ids:fail.append(f'{path.name} → missing anchor {link}')
for file in ['assets/app.js','assets/catalog.js','assets/google-map.js','assets/maps-config.js']:
 p=subprocess.run(['node','--check',str(ROOT/file)],text=True,capture_output=True)
 if p.returncode:fail.append(p.stderr)
counts={}
for n,expected in [(2,36)]:
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
