#!/usr/bin/env bash
set -euo pipefail
if [[ "${CI:-}" != "true" ]]; then echo 'Integration tests are CI-only.' >&2; exit 1; fi
mkdir -p artifacts
device_id="$(xcrun simctl create PreviewIntegration "$PREVIEW_SIMULATOR_DEVICE" "$PREVIEW_SIMULATOR_RUNTIME")"
cleanup() {
  xcrun simctl shutdown "$device_id" || true
  xcrun simctl delete "$device_id" || true
}
trap cleanup EXIT
xcrun simctl boot "$device_id"
xcrun simctl bootstatus "$device_id" -b
mkdir -p artifacts/shell/Simulator
tar -xzf artifacts/shell/simulator-app.tar.gz -C artifacts/shell/Simulator
xcrun simctl install "$device_id" artifacts/shell/Simulator/MyNativeScriptPreview.app
# Guest import/run is tested with networking disabled at the application layer:
# no remote loader exists, and the app is launched without any dev server.
xcodebuild \
  -project artifacts/PreviewUITests.xcodeproj \
  -scheme PreviewIntegration \
  -configuration Debug \
  -destination "platform=iOS Simulator,id=$device_id" \
  -derivedDataPath artifacts/simulator-build \
  -resultBundlePath artifacts/integration.xcresult \
  CODE_SIGN_IDENTITY=- CODE_SIGNING_ALLOWED=YES CODE_SIGNING_REQUIRED=NO DEVELOPMENT_TEAM= \
  test 2>&1 | tee artifacts/integration.log
