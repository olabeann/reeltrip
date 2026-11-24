"""Ensure generated previews and app entries load the same current UI assets."""
from pathlib import Path
import hashlib
import re

ROOT = Path(__file__).resolve().parents[2]
ASSETS = re.compile(r'(?:src|href)="([^":?]+\.(?:js|css))(?:\?v=([^" ]+))?"')

def assets(entry):
    result = []
    for relative, version in ASSETS.findall(entry.read_text()):
        asset = (entry.parent / relative).resolve()
        expected = hashlib.sha256(asset.read_bytes()).hexdigest()[:12]
        assert version == expected, f'{entry.relative_to(ROOT)}: stale {relative}'
        if asset.parent == ROOT / 'src/assets':
            result.append((asset.name, version))
    return result

for source, preview in [('index.html', 'preview.html'), ('english.html', 'preview-en.html')]:
    assert assets(ROOT / 'src/app' / source) == assets(ROOT / 'src/frontend' / preview)
    # Preview-only storage and fixture setup must not replace UI scripts or styles.
    app = (ROOT / 'src/app' / source).read_text()
    actual = (ROOT / 'src/frontend' / preview).read_text()
    actual = re.sub(r'<style>html,body\{overscroll-behavior-y:contain\}</style>', '', actual)
    actual = re.sub(r'<script src="(?:state-catalog|preview-storage|preview-map-config)\.js[^" ]*"(?: defer)?></script>', '', actual)
    actual = actual.replace('href="../app/app.', 'href="app.')
    assert app == actual, f'{preview}: preview markup diverged from the app'
for name in ('index.html', 'english.html'):
    assets(ROOT / 'src/admin' / name)
print('PASS: Korean/English app and preview markup, asset order and current content hashes; admin asset hashes.')
