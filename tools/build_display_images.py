"""Create lossless WebP display copies; preserve and verify every pixel."""
import json
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1]
items = json.loads((root / 'data/featured.json').read_text())
paths = {item[key] for item in items for key in ('image', 'counterpart')}
target = root / 'assets/display'
target.mkdir(parents=True, exist_ok=True)
for path in sorted(paths):
    with Image.open(root / path) as source:
        original = source.convert('RGB')
        output = target / (Path(path).stem + '.webp')
        original.save(output, 'WEBP', lossless=True, method=6)
        with Image.open(output) as check:
            assert check.convert('RGB').tobytes() == original.tobytes()
        print(output.name, (root / path).stat().st_size, output.stat().st_size, 'pixel-exact')
