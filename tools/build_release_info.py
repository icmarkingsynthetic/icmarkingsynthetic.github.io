"""Extract public archive facts without exposing any archive download URL."""
import argparse
import hashlib
import json
from pathlib import Path
from zipfile import ZipFile


def describe(path):
    with path.open('rb') as f:
        digest = hashlib.file_digest(f, 'sha256').hexdigest()
    with ZipFile(path) as archive:
        files = [n for n in archive.namelist() if not n.endswith('/')]
        prefix = files[0].split('/')[0] + '/'
        relative = [n[len(prefix):] for n in files]
        folders = {name: sum(p.startswith(name + '/') for p in relative)
                   for name in sorted({p.split('/')[0] for p in relative if '/' in p})}
        return {'name': path.name, 'bytes': path.stat().st_size, 'sha256': digest,
                'files': len(files), 'folders': folders,
                'readme': archive.read(prefix + 'README.md').decode('utf-8-sig')}


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--dataset', type=Path, required=True)
    p.add_argument('--code', type=Path, required=True)
    p.add_argument('--output', type=Path, required=True)
    a = p.parse_args()
    result = {'dataset': describe(a.dataset), 'code': describe(a.code)}
    with ZipFile(a.dataset) as z:
        prefix = z.namelist()[0].split('/')[0] + '/'
        result['counterparts'] = len(z.read(prefix + 'provenance/counterparts/records.jsonl').splitlines())
        result['documents'] = {name: z.read(prefix + name).decode('utf-8-sig') for name in
                               ['docs/FORMATS.md', 'docs/SPLITS.md', 'docs/LOADING.md', 'DATASET_CARD.md']}
    a.output.parent.mkdir(parents=True, exist_ok=True)
    a.output.write_text(json.dumps(result, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')


if __name__ == '__main__':
    main()
