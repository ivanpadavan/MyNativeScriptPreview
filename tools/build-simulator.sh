#!/usr/bin/env bash
set -euo pipefail
if [[ "${CI:-}" != "true" ]]; then echo 'Simulator builds are CI-only.' >&2; exit 1; fi
mkdir -p artifacts/shell artifacts/simulator-app
xcodebuild \
  "$NS_CONTAINER_FLAG" "$NS_CONTAINER_PATH" -scheme "$NS_SCHEME" -configuration Debug \
  -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' \
  -derivedDataPath artifacts/simulator-build \
  -clonedSourcePackagesDirPath "$PWD/platforms/ios/SourcePackages" \
  -disableAutomaticPackageResolution -onlyUsePackageVersionsFromResolvedFile \
  ARCHS=arm64 ONLY_ACTIVE_ARCH=YES \
  CURRENT_PROJECT_VERSION="${GITHUB_RUN_NUMBER:-1}" PREVIEW_BUILD_REVISION="${GITHUB_SHA:-local}" \
  CODE_SIGN_IDENTITY=- CODE_SIGNING_ALLOWED=YES CODE_SIGNING_REQUIRED=NO DEVELOPMENT_TEAM= \
  build 2>&1 | tee artifacts/simulator-build.log
apps=(artifacts/simulator-build/Build/Products/Debug-iphonesimulator/*.app)
if [[ ${#apps[@]} -ne 1 || ! -d "${apps[0]}" ]]; then echo 'Expected one built simulator application.' >&2; exit 1; fi
ditto "${apps[0]}" \
  artifacts/simulator-app/MyNativeScriptPreview.app
python3 tools/check-no-embedded-example.py artifacts/simulator-app
# GitHub artifact uploads reset file permissions. Tar preserves executables,
# framework symlinks, and the simulator app's ad-hoc signature across jobs.
COPYFILE_DISABLE=1 tar -C artifacts/simulator-app -czf artifacts/shell/simulator-app.tar.gz MyNativeScriptPreview.app
