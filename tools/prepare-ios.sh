#!/usr/bin/env bash
set -euo pipefail
if [[ "${CI:-}" != "true" ]]; then echo 'iOS preparation is CI-only.' >&2; exit 1; fi
mkdir -p artifacts
test -d platforms/ios/MyNativeScriptPreview.xcodeproj
if [[ -f ci/Podfile.lock ]]; then
  cp ci/Podfile.lock platforms/ios/Podfile.lock
elif [[ -f artifacts/pod-lock/Podfile.lock ]]; then
  cp artifacts/pod-lock/Podfile.lock platforms/ios/Podfile.lock
fi
export PATH="$PWD/node_modules/.bin:$PATH"
bundle exec ns prepare ios --env.production 2>&1 | tee artifacts/prepare-ios.log
if [[ -f ci/Podfile.lock ]]; then
  cmp ci/Podfile.lock platforms/ios/Podfile.lock
elif [[ -f artifacts/pod-lock/Podfile.lock ]]; then
  cmp artifacts/pod-lock/Podfile.lock platforms/ios/Podfile.lock
fi
workspace="$PWD/platforms/ios/MyNativeScriptPreview.xcworkspace"
project="$PWD/platforms/ios/MyNativeScriptPreview.xcodeproj"
test -d "$workspace"
test -d "$project"
if [[ -n "${GITHUB_ENV:-}" ]]; then
  echo "NS_WORKSPACE=$workspace" >> "$GITHUB_ENV"
  echo "NS_PROJECT=$project" >> "$GITHUB_ENV"
  echo 'NS_SCHEME=MyNativeScriptPreview' >> "$GITHUB_ENV"
fi
