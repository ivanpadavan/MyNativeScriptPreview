#!/usr/bin/env bash
set -euo pipefail
if [[ "${CI:-}" != "true" ]]; then echo 'Simulator builds are CI-only.' >&2; exit 1; fi
mkdir -p artifacts/shell artifacts/simulator-app
xcodebuild \
  -workspace "$NS_WORKSPACE" -scheme "$NS_SCHEME" -configuration Debug \
  -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' \
  -derivedDataPath artifacts/simulator-build \
  CODE_SIGN_IDENTITY=- CODE_SIGNING_ALLOWED=YES CODE_SIGNING_REQUIRED=NO DEVELOPMENT_TEAM= \
  build 2>&1 | tee artifacts/simulator-build.log
ditto artifacts/simulator-build/Build/Products/Debug-iphonesimulator/MyNativeScriptPreview.app \
  artifacts/simulator-app/MyNativeScriptPreview.app
python3 tools/check-no-embedded-example.py artifacts/simulator-app
# GitHub artifact uploads reset file permissions. Tar preserves executables,
# framework symlinks, and the simulator app's ad-hoc signature across jobs.
COPYFILE_DISABLE=1 tar -C artifacts/simulator-app -czf artifacts/shell/simulator-app.tar.gz MyNativeScriptPreview.app
