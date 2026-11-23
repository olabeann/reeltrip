"""Package public files and legacy entry redirects without private reference material."""
from pathlib import Path
import argparse, shutil, json

def build(source, output):
    source=source.resolve(); output=output.resolve()
    if output.exists() and any(output.iterdir()):
        raise ValueError('Output directory must be empty')
    output.mkdir(parents=True, exist_ok=True)
    ignore=shutil.ignore_patterns('.DS_Store','__pycache__','*.pyc','.env','.env.*')
    for name in ('app','admin','assets','frontend','emails'):
        shutil.copytree(source/'src'/name,output/'src'/name,ignore=ignore)
    shutil.copytree(source/'docs',output/'docs',ignore=ignore)
    shutil.copy2(source/'index.html',output/'index.html')
    (output/'.nojekyll').touch()
    # Keep previously shared app URLs working after the source layout change.
    for folder in ('app','admin','frontend','emails'):
        for page in (source/'src'/folder).rglob('*.html'):
            relative=page.relative_to(source/'src')
            target='../' * len(relative.parent.parts)+'src/'+relative.as_posix()
            dest=output/relative;dest.parent.mkdir(parents=True,exist_ok=True)
            dest.write_text('<!doctype html><meta charset="utf-8"><title>Reeltrip</title>'
                +'<script>location.replace('+json.dumps(target)+'+location.search+location.hash)</script>'
                +'<a href="'+target+'">Open Reeltrip</a>')
    (output/'project.html').write_text('<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=docs/index.html"><a href="docs/index.html">Reeltrip project</a>')

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source',type=Path,default=Path(__file__).resolve().parents[2])
    parser.add_argument('--output',type=Path,required=True)
    args=parser.parse_args();build(args.source,args.output)
    print(f'Public site built: {args.output}')
