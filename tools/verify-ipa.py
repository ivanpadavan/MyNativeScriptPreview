import os
import pathlib
import plistlib
import subprocess
import zipfile

if os.environ.get('CI') != 'true':
    raise SystemExit('IPA verification is CI-only.')
ipa = pathlib.Path('artifacts/MyNativeScriptPreview-unsigned.ipa')
with zipfile.ZipFile(ipa) as archive:
    if archive.testzip() is not None:
        raise SystemExit('IPA ZIP is damaged.')
    names = archive.namelist()
    apps = {name.split('/')[1] for name in names if name.startswith('Payload/') and len(name.split('/')) > 2}
    if apps != {'MyNativeScriptPreview.app'}:
        raise SystemExit(f'Unexpected Payload structure: {apps}')
    if any(name.endswith('embedded.mobileprovision') for name in names):
        raise SystemExit('Unsigned IPA must not contain a provisioning profile.')
    if any(name.startswith('Payload/MyNativeScriptPreview.app/_CodeSignature/') for name in names):
        raise SystemExit('Device app unexpectedly contains a code signature.')
app = pathlib.Path('artifacts/package/Payload/MyNativeScriptPreview.app')
with (app / 'Info.plist').open('rb') as handle:
    info = plistlib.load(handle)
if info.get('CFBundleSupportedPlatforms') != ['iPhoneOS']:
    raise SystemExit('IPA must contain a physical-device build, not a simulator app.')
executable = app / info['CFBundleExecutable']
architectures = subprocess.check_output(['lipo', '-archs', str(executable)], text=True).split()
if architectures != ['arm64']:
    raise SystemExit(f'Unexpected device architectures: {architectures}')
build_info = subprocess.check_output(['xcrun', 'vtool', '-show-build', str(executable)], text=True)
if 'platform IOS' not in build_info or 'IOSSIMULATOR' in build_info:
    raise SystemExit('Mach-O platform is not iOS device.')
signed = subprocess.run(['codesign', '-dv', str(app)], capture_output=True)
if signed.returncode == 0:
    raise SystemExit('Expected an unsigned application.')
subprocess.run(['python3', 'tools/check-no-embedded-example.py', 'artifacts/package/Payload'], check=True)
for resource in ['PreviewRequestedEntitlements.plist', 'PreviewRuntimeCatalog.json']:
    if not (app / resource).is_file():
        raise SystemExit(f'Missing capability reference: {resource}')
print('Unsigned arm64 iOS IPA verified; no example payload is embedded.')
