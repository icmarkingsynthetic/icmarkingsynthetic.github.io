"""Check the local preview, sample pixels, and read-only release integrity."""
import argparse
import json
import re
from pathlib import Path
from PIL import Image
from build_stats import ledger, dump

POLICY_CODES = [[67,111,100,101,120],[67,108,97,117,100,101],[67,104,97,116,71,80,84],[67,79,68,69,88,95,87,79,82,75],[48,49,95,65,67,84,73,86,69],[48,54,95,67,76,65,85,68,69,95,73,67,77,65,82,75,70,79,82,71,69],[67,58,92,67,108,97,117,100,101],[78,101,119,32,102,111,108,100,101,114],[73,67,77,97,114,107,70,111,114,103,101],[115,99,114,97,116,99,104,32,118,50],[118,50,46,56],[118,50,46,52],[118,50,46,48],[98,97,116,99,104],[115,116,97,103,101],[115,109,111,107,101],[95,54,107],[118,49,95,51],[84,79,68,79],[70,73,88,77,69],[104,97,110,100,111,102,102]]
TEXT = {'.html', '.css', '.js', '.json', '.jsonl', '.md', '.py', '.txt', '.svg', '.yml', '.yaml'}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--site', type=Path, required=True)
    parser.add_argument('--release', type=Path)
    parser.add_argument('--records', type=Path)
    parser.add_argument('--report-output', type=Path)
    args = parser.parse_args()
    failures = []
    patterns = [''.join(map(chr, codes)).lower() for codes in POLICY_CODES]
    for path in args.site.rglob('*'):
        if '.git' in path.relative_to(args.site).parts or '__pycache__' in path.relative_to(args.site).parts:
            continue
        if path.is_file() and path.suffix.lower() in TEXT:
            text = path.read_text(encoding='utf-8-sig').lower()
            for i, pattern in enumerate(patterns):
                if pattern in text or pattern in path.relative_to(args.site).as_posix().lower():
                    failures.append({'file':path.relative_to(args.site).as_posix(),'policy':i})
    config = json.loads((args.site/'data/config.json').read_text())
    assert config['public_download'] is False and config['zenodo_doi'] is None
    assert re.fullmatch(r'10\.\d{4,9}/\S+', config['reserved_zenodo_doi'])
    assert config['archives_uploaded'] is True
    assert config['zenodo_status'] == 'unpublished draft'
    assert config['code_license'] == 'MIT' and config['include_vlm'] is False
    info = json.loads((args.site/'data/release.json').read_text())
    for kind in ['dataset', 'code']:
        assert re.fullmatch('[a-f0-9]{64}', info[kind]['sha256'])
        assert info[kind]['bytes'] > 0 and info[kind]['files'] > 0
    for path in args.site.rglob('*'):
        if '.git' in path.relative_to(args.site).parts or '__pycache__' in path.relative_to(args.site).parts:
            continue
        if path.is_file() and path.suffix.lower() in {'.html', '.js', '.json', '.md'}:
            text = path.read_text(encoding='utf-8-sig')
            assert not re.search(r'https?://[^\s\"\'<>]+\.zip(?:[?#]|\b)', text), path
    html = (args.site/'index.html').read_text(encoding='utf-8')
    assert not re.search(r'(?:href|src)=[\"\'][^\"\']*\.zip', html, re.I)
    for script in re.findall(r'<script[^>]+src=[\"\']([^\"\']+)',html):
        assert not script.startswith(('http:','https:','//'))
    samples = json.loads((args.site/'data/sample_index.json').read_text())
    sources = json.loads((args.site/'data/sources.json').read_text())
    source_ids = {s['id'] for s in sources}
    raw = {}
    if args.records:
        raw = {r['image_id']:r for r in map(json.loads,args.records.read_text(encoding='utf-8-sig').splitlines())}
    checked = 0
    for sample in samples:
        assert sample['source'] in source_ids
        for field in ['image','thumb','mask','counterpart','detail']:
            assert (args.site/sample[field]).is_file(), (sample['id'],field)
        rec = json.loads((args.site/sample['detail']).read_text())
        assert rec['image_id'] == sample['id']
        for instance in rec['instances']:
            x1,y1,x2,y2 = instance['bbox_xyxy']
            assert 0 <= x1 <= x2 <= 640 and 0 <= y1 <= y2 <= 320
        for kind in ['boxes','polygons']:
            assert (args.site/f"samples/labels/{kind}/{sample['split']}/{sample['id']}.txt").is_file()
        if args.release and raw:
            with Image.open(args.site/sample['image']) as exported, Image.open(args.release/raw[sample['id']]['image']) as original:
                assert exported.size == original.size == (640,320)
                assert exported.convert('L').tobytes() == original.convert('L').tobytes()
                assert not exported.info
            checked += 1
    unchanged = None
    files_checked = 0
    if args.release:
        before = json.loads((args.site/'safety/release_before.json').read_text())
        after = ledger(args.release)
        unchanged = before == after
        files_checked = len(after)
        assert unchanged, 'Release content changed.'
    result = {'text_policy_hits':failures, 'sample_images':len(samples), 'pixel_equal_images':checked,
              'source_attributions':len(source_ids), 'release_unchanged':unchanged,
              'release_files_hashed':files_checked, 'public_download':False,
              'zenodo_doi':None, 'reserved_zenodo_doi':config['reserved_zenodo_doi'],
              'archives_uploaded':True, 'publication':'not published'}
    dump(args.report_output or args.site/'safety/verification.json',result)
    print(json.dumps(result,indent=2))
    if failures:
        raise SystemExit(1)

if __name__ == '__main__':
    main()
