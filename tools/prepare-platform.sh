#!/usr/bin/env bash
set -euo pipefail
if [[ "${CI:-}" != "true" ]]; then echo 'Native dependency setup is CI-only.' >&2; exit 1; fi
export PATH="$PWD/node_modules/.bin:$PATH"
# Platform scaffolding belongs to the dependency stage. This does not invoke
# webpack or compile a simulator/device application.
if [[ ! -d platforms/ios ]]; then bundle exec ns platform add ios; fi
if [[ -f ci/Podfile.lock ]]; then cp ci/Podfile.lock platforms/ios/Podfile.lock; fi
bundle exec node tools/prepare-native-dependencies.cjs
if [[ -f ci/Podfile.lock ]]; then cmp ci/Podfile.lock platforms/ios/Podfile.lock; fi
