#!/usr/bin/env bash
set -euo pipefail
if [[ "${CI:-}" != "true" ]]; then echo 'iOS preparation is CI-only.' >&2; exit 1; fi
mkdir -p artifacts
test -d platforms/ios
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
bundle exec ruby tools/ios-layout.rb
