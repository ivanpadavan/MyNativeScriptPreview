# MyNativeScriptPreview

## Rules

- One flow: build a project in CI, copy the entire `.preview.txt`, paste into the iOS shell, run.
- One versioned package format for every project; no special XML/JS shortcut.
- No local dependency installation, builds, generators, linters, or tests. All verification runs in GitHub Actions.
- CI produces an unsigned **device** IPA and separately tests a **simulator** app.
- First completed example: the supplied `checkGPU` function. Stop after its CI and artifacts are successful.
- Free Apple ID signing happens outside CI. Requested entitlements are not effective permissions until a compatible profile signs the app.
- `done` requires evidence. CI-dependent tasks include the successful run URL and commit.

## check

- [ ] Commit the CocoaPods lockfile from the first iOS preparation in CI; require unchanged resolution on subsequent runs.
- [ ] Pass package/source checks, simulator integration tests, and unsigned IPA verification in CI.
- [ ] Make successful IPA, GPU text package, requested entitlements, capability report, and test evidence available as CI artifacts.
- [ ] First-stage acceptance: import the GPU package through the real paste UI, run `checkGPU`, return, restart, and repeat offline. API unavailability on the iOS 26+ test runner is a failure, not a substitute for a successful check.
- [ ] Stop implementation after the GPU milestone; do not start the following examples automatically.
- [ ] `examples/tap-counter`: counter and reset, same exporter and import flow; integration tests exercise repeated taps and restart.
- [ ] `examples/background-location`: start/stop tracking, permission handling, persisted events, background updates. Simulator integration checks plus explicit physical-device CI evidence for actual background behavior.
- [ ] `examples/canvas`: complex animated Canvas scene with assets and interaction, render/interaction integration checks and cleanup on exit.
- [ ] Expand the shell's compiled plugin catalog by tested groups: graphics/media, collections/charts/animation, storage/network, camera/photos, device services. Every group must pass the common import and IPA jobs before being marked done.

## in-progress

- [ ] Implement the shared package contract, CI exporter, offline loader, iOS paste shell, GPU example, unsigned IPA pipeline, and XCUITest integration suite.

## done

- [x] JavaScript and Ruby dependency locks generated in CI: https://github.com/ivanpadavan/MyNativeScriptPreview/actions/runs/45076691257 (source commit `ad2e5d9`). No packages were installed locally.
- [x] Public repository created: https://github.com/ivanpadavan/MyNativeScriptPreview . GitHub CLI authorization was restored after fixing ownership of `/home/codex/.config`.
- [x] Agreed scope and execution constraints recorded in this file. This is planning evidence only; no build or test success is claimed.
