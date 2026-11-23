#!/usr/bin/env bash
set -euo pipefail
if [[ "${CI:-}" != "true" ]]; then echo 'Device builds are CI-only.' >&2; exit 1; fi
mkdir -p artifacts
xcodebuild \
  "$NS_CONTAINER_FLAG" "$NS_CONTAINER_PATH" \
  -scheme "$NS_SCHEME" \
  -configuration Release \
  -sdk iphoneos \
  -destination 'generic/platform=iOS' \
  -archivePath "$PWD/artifacts/Preview.xcarchive" \
  CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO CODE_SIGN_IDENTITY= DEVELOPMENT_TEAM= \
  archive 2>&1 | tee artifacts/device-build.log
mkdir -p artifacts/package/Payload
apps=(artifacts/Preview.xcarchive/Products/Applications/*.app)
if [[ ${#apps[@]} -ne 1 || ! -d "${apps[0]}" ]]; then echo 'Expected one archived device application.' >&2; exit 1; fi
ditto "${apps[0]}" \
  artifacts/package/Payload/MyNativeScriptPreview.app
cp ci/requested-entitlements.plist artifacts/package/Payload/MyNativeScriptPreview.app/PreviewRequestedEntitlements.plist
cp packager/catalog.json artifacts/package/Payload/MyNativeScriptPreview.app/PreviewRuntimeCatalog.json
cp ci/requested-entitlements.plist artifacts/requested-entitlements.plist
# Package an unsigned device .app directly; exportArchive would require signing.
ditto -c -k --keepParent artifacts/package/Payload artifacts/MyNativeScriptPreview-unsigned.ipa
