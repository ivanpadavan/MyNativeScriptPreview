#!/usr/bin/env bash
set -euo pipefail
if [[ "${CI:-}" != "true" ]]; then echo 'Native dependency setup is CI-only.' >&2; exit 1; fi
export PATH="$PWD/node_modules/.bin:$PATH"
# Platform scaffolding belongs to the dependency stage. This does not invoke
# webpack or compile a simulator/device application.
bundle exec ns platform add ios
if [[ -f ci/Podfile.lock ]]; then cp ci/Podfile.lock platforms/ios/Podfile.lock; fi
if [[ -f platforms/ios/Podfile ]]; then
  if [[ -f ci/Podfile.lock ]]; then
    bundle exec pod install --project-directory=platforms/ios --deployment
  else
    bundle exec pod install --project-directory=platforms/ios
  fi
fi
