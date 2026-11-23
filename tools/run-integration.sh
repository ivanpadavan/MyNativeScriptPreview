#!/usr/bin/env bash
set -euo pipefail
if [[ "${CI:-}" != "true" ]]; then echo 'Integration tests are CI-only.' >&2; exit 1; fi
mkdir -p artifacts
phase="${1:?Expected boot, build, test, or cleanup}"

if [[ "$phase" == cleanup ]]; then
  if [[ -z "${PREVIEW_DEVICE_ID:-}" ]]; then exit 0; fi
  python3 - <<'PY'
import os, subprocess
for operation in ('shutdown', 'delete'):
    try:
        subprocess.run(['xcrun', 'simctl', operation, os.environ['PREVIEW_DEVICE_ID']], timeout=30, check=False)
    except subprocess.TimeoutExpired:
        print(f'Simulator {operation} timed out; runner is ephemeral.')
PY
  exit 0
fi

if [[ "$phase" == boot ]]; then
  device_id="$(python3 tools/select-simulator.py)"
  echo "PREVIEW_DEVICE_ID=$device_id" >> "$GITHUB_ENV"
  export PREVIEW_DEVICE_ID="$device_id"
  state="$(xcrun simctl list devices --json | python3 -c 'import json,os,sys; print(next(d["state"] for items in json.load(sys.stdin)["devices"].values() for d in items if d["udid"]==os.environ["PREVIEW_DEVICE_ID"]))')"
  if [[ "$state" != Booted ]]; then xcrun simctl boot "$device_id"; fi
  python3 - <<'PY' 2>&1 | tee artifacts/simulator-boot.log
import os, subprocess
subprocess.run(['xcrun', 'simctl', 'bootstatus', os.environ['PREVIEW_DEVICE_ID'], '-b'], timeout=180, check=True)
PY
  mkdir -p artifacts/shell/Simulator
  tar -xzf artifacts/shell/simulator-app.tar.gz -C artifacts/shell/Simulator
  xcrun simctl install "$device_id" artifacts/shell/Simulator/MyNativeScriptPreview.app
  xcrun simctl privacy "$device_id" grant location-always org.ivanpadavan.nativescriptpreview
  xcrun simctl location "$device_id" set '37.3349,-122.0090'
  # Seed only the old on-disk save, outside the application bundle. The smoke
  # case still imports its GPU app through the real clipboard; a separate case
  # verifies upgrade migration and that deletion does not resurrect this save.
  python3 - <<'PY'
import json, os, pathlib, subprocess
container = pathlib.Path(subprocess.check_output([
    'xcrun', 'simctl', 'get_app_container', os.environ['PREVIEW_DEVICE_ID'],
    'org.ivanpadavan.nativescriptpreview', 'data'], text=True).strip())
packet = json.loads(pathlib.Path('dist/gpu-check.preview.txt').read_text())
packet.pop('id', None)
packet['name'] = 'Legacy GPU'
destination = container / 'Documents/preview/last.preview.txt'
destination.parent.mkdir(parents=True, exist_ok=True)
destination.write_text(json.dumps(packet, ensure_ascii=False))
PY
  exit 0
fi

common=(
  -project artifacts/PreviewUITests.xcodeproj
  -scheme PreviewIntegration
  -configuration Debug
  -destination "platform=iOS Simulator,id=$PREVIEW_DEVICE_ID"
  -derivedDataPath artifacts/ui-build
  ARCHS=arm64 ONLY_ACTIVE_ARCH=YES
  CODE_SIGN_IDENTITY=- CODE_SIGNING_ALLOWED=YES CODE_SIGNING_REQUIRED=NO DEVELOPMENT_TEAM=
)

if [[ "$phase" == build ]]; then
  xcodebuild "${common[@]}" build-for-testing 2>&1 | tee artifacts/ui-build.log
elif [[ "$phase" == test || "$phase" == smoke ]]; then
  if [[ "$phase" == smoke ]]; then
    selection=(-only-testing:PreviewUITests/PreviewUITests/testRealPasteAndNativeGPUResult)
    result=smoke
  else
    selection=(-skip-testing:PreviewUITests/PreviewUITests/testRealPasteAndNativeGPUResult)
    result=integration
  fi
  set +e
  xcodebuild "${common[@]}" \
    -resultBundlePath "artifacts/$result.xcresult" \
    "${selection[@]}" \
    -parallel-testing-enabled NO \
    -test-timeouts-enabled YES \
    -default-test-execution-time-allowance 120 \
    -maximum-test-execution-time-allowance 150 \
    test-without-building 2>&1 | tee "artifacts/$result.log"
  test_status=${PIPESTATUS[0]}
  xcrun xcresulttool get test-results summary --path "artifacts/$result.xcresult" > "artifacts/$result-summary.json"
  if [[ -d "artifacts/$result.xcresult" ]]; then
    xcrun xcresulttool export attachments --path "artifacts/$result.xcresult" --output-path "artifacts/screenshots/$result"
  fi
  exit "$test_status"
else
  echo "Unknown integration phase: $phase" >&2
  exit 1
fi
