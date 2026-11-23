import hashlib
import json
import os
import pathlib
import subprocess
import sys

if os.environ.get('CI') != 'true':
    raise SystemExit('CI scope detection is CI-only.')
event = json.loads(pathlib.Path(os.environ['GITHUB_EVENT_PATH']).read_text())
event_name = os.environ['GITHUB_EVENT_NAME']
revision = sys.argv[2] if len(sys.argv) == 3 and sys.argv[1] == '--native-key-for-ref' else None
head = revision or os.environ['GITHUB_SHA']
base = event.get('pull_request', {}).get('base', {}).get('sha') or event.get('before')
tracked = subprocess.check_output(['git', 'ls-tree', '-r', '--name-only', '-z', revision] if revision else ['git', 'ls-files', '-z']).decode().split('\0')
tracked = [name for name in tracked if name]
if revision:
    changed = tracked
elif base and set(base) != {'0'}:
    changed = subprocess.check_output(['git', 'diff', '--name-only', '-z', base, head]).decode().split('\0')
else:
    changed = tracked

native_files = {
    'package.json', 'package-lock.json', 'Gemfile', 'Gemfile.lock', '.node-version',
    'nativescript.config.ts', 'webpack.config.js', 'tsconfig.json', 'ci/Podfile.lock', 'ci/Package.resolved',
    'packager/catalog.json', 'packager/protocol.cjs', 'ci/requested-entitlements.plist', 'ci/toolchain.json',
    'tools/prepare-ios.sh', 'tools/frozen-cli-dependencies.cjs', 'tools/prepare-platform.sh', 'tools/prepare-native-dependencies.cjs', 'tools/build-simulator.sh',
    'tools/build-unsigned.sh', 'tools/verify-ipa.py', 'tools/capability-report.mjs',
    'tools/check-no-embedded-example.py', 'tools/ios-layout.rb',
}

def native(name):
    return name in native_files or name.startswith(('src/', 'shared/', 'App_Resources/'))

def relevant(name):
    if not name or name.endswith('.md') or name in {'LICENSE', '.gitignore'}:
        return False
    return native(name) or name.startswith(('examples/', 'packager/', 'tests/', 'tools/', 'ci/', '.github/workflows/ci.yml'))

def fingerprint(names):
    digest = hashlib.sha256()
    for name in sorted(names):
        path = pathlib.Path(name)
        if revision:
            content = subprocess.run(['git', 'show', f'{revision}:{name}'], capture_output=True)
            if content.returncode == 0:
                digest.update(name.encode() + b'\0' + content.stdout + b'\0')
        elif path.is_file():
            digest.update(name.encode() + b'\0' + path.read_bytes() + b'\0')
    return digest.hexdigest()

node_hash = fingerprint(['package.json', 'package-lock.json', '.node-version'])
native_dependencies = {'package.json', 'package-lock.json', 'Gemfile', 'Gemfile.lock', '.node-version', 'ci/toolchain.json',
                       'nativescript.config.ts', 'ci/Podfile.lock', 'ci/Package.resolved', 'tools/prepare-platform.sh', 'tools/prepare-native-dependencies.cjs'}
platform_hash = fingerprint([name for name in tracked if name in native_dependencies
                             or name == 'App_Resources/iOS/Podfile' or name.endswith('.podspec')])
shell_hash = fingerprint([name for name in tracked if native(name)])
toolchain = json.loads(subprocess.check_output(['git', 'show', f'{revision}:ci/toolchain.json']) if revision else pathlib.Path('ci/toolchain.json').read_text())
values = {
    'work': str(event_name == 'workflow_dispatch' or any(relevant(name) for name in changed)).lower(),
    'node_hash': node_hash,
    'platform_hash': platform_hash,
    'shell_key': 'shell-v2-macos26-arm64-xcode' + toolchain['xcode'] + '-' + shell_hash,
    'xcode': toolchain['xcode'],
    'ruby': toolchain['ruby'],
    'simulator_runtime': toolchain['simulatorRuntime'],
    'simulator_device': toolchain['simulatorDeviceType'],
}
if revision:
    print(values['shell_key'])
    raise SystemExit(0)
with open(os.environ['GITHUB_OUTPUT'], 'a') as output:
    for key, value in values.items():
        output.write(f'{key}={value}\n')
with open(os.environ['GITHUB_STEP_SUMMARY'], 'a') as summary:
    summary.write('## CI scope\n\n')
    summary.write('Documentation-only change: no dependencies, builds, or tests.\n' if values['work'] == 'false'
                  else 'Dependencies use independent OS/architecture/lock keys. Native builds use the shell content key; examples and UI tests do not invalidate it.\n')
