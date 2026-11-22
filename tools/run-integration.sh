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
  device_id="$(xcrun simctl create PreviewIntegration "$PREVIEW_SIMULATOR_DEVICE" "$PREVIEW_SIMULATOR_RUNTIME")"
  echo "PREVIEW_DEVICE_ID=$device_id" >> "$GITHUB_ENV"
  export PREVIEW_DEVICE_ID="$device_id"
  xcrun simctl boot "$device_id"
  python3 - <<'PY' 2>&1 | tee artifacts/simulator-boot.log
import os, subprocess
subprocess.run(['xcrun', 'simctl', 'bootstatus', os.environ['PREVIEW_DEVICE_ID'], '-b'], timeout=180, check=True)
PY
  mkdir -p artifacts/shell/Simulator
  tar -xzf artifacts/shell/simulator-app.tar.gz -C artifacts/shell/Simulator
  xcrun simctl install "$device_id" artifacts/shell/Simulator/MyNativeScriptPreview.app
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
elif [[ "$phase" == test ]]; then
  set +e
  xcodebuild "${common[@]}" \
    -resultBundlePath artifacts/integration.xcresult \
    -parallel-testing-enabled NO \
    -test-timeouts-enabled YES \
    -default-test-execution-time-allowance 120 \
    -maximum-test-execution-time-allowance 150 \
    test-without-building 2>&1 | tee artifacts/integration.log
  test_status=${PIPESTATUS[0]}
  xcrun xcresulttool get test-results summary --path artifacts/integration.xcresult > artifacts/test-summary.json
  if [[ -d artifacts/integration.xcresult ]]; then
    xcrun xcresulttool export attachments --path artifacts/integration.xcresult --output-path artifacts/screenshots
  fi
  exit "$test_status"
else
  echo "Unknown integration phase: $phase" >&2
  exit 1
fi
