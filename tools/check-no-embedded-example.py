import os
import pathlib
import sys

if os.environ.get('CI') != 'true':
    raise SystemExit('Artifact checks are CI-only.')
root = pathlib.Path(sys.argv[1])
apps = list(root.glob('*.app'))
if len(apps) != 1:
    raise SystemExit('Expected exactly one shell .app.')
needle = b'Background GPU: '
for path in apps[0].rglob('*'):
    if not path.is_file():
        continue
    if path.name.endswith('.preview.txt') or 'gpu-check' in path.name:
        raise SystemExit(f'Example payload was embedded: {path}')
    if path.suffix in {'.js', '.cjs', '.mjs', '.json', '.map'} and needle in path.read_bytes():
        raise SystemExit(f'Example code was embedded: {path}')
print('Shell contains no GPU example payload or implementation.')
