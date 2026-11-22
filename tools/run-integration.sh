#!/usr/bin/env bash
set -euo pipefail
if [[ "${CI:-}" != "true" ]]; then echo 'Integration tests are CI-only.' >&2; exit 1; fi
mkdir -p artifacts
device_id="$(xcrun simctl create PreviewIntegration com.apple.CoreSimulator.SimDeviceType.iPhone-17-Pro com.apple.CoreSimulator.SimRuntime.iOS-26-5)"
cleanup() {
  xcrun simctl shutdown "$device_id" || true
  xcrun simctl delete "$device_id" || true
}
trap cleanup EXIT
xcrun simctl boot "$device_id"
xcrun simctl bootstatus "$device_id" -b
# Guest import/run is tested with networking disabled at the application layer:
# no remote loader exists, and the app is launched without any dev server.
xcodebuild \
  -workspace "$NS_WORKSPACE" \
  -scheme PreviewIntegration \
  -configuration Debug \
  -destination "platform=iOS Simulator,id=$device_id" \
  -derivedDataPath artifacts/simulator-build \
  -resultBundlePath artifacts/integration.xcresult \
  CODE_SIGN_IDENTITY=- CODE_SIGNING_ALLOWED=YES CODE_SIGNING_REQUIRED=NO DEVELOPMENT_TEAM= \
  test 2>&1 | tee artifacts/integration.log
mkdir -p artifacts/simulator-app
ditto "artifacts/simulator-build/Build/Products/Debug-iphonesimulator/MyNativeScriptPreview.app" \
  artifacts/simulator-app/MyNativeScriptPreview.app
