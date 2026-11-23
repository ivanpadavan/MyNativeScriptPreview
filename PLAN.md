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

- [ ] Verify rational CI routing: documentation skips builds, dependency-cache hits skip installs, and example/test-only changes reuse the compiled native shell.
- [ ] Stop implementation after the GPU milestone; do not start the following examples automatically.
- [ ] `examples/tap-counter`: counter and reset, same exporter and import flow; integration tests exercise repeated taps and restart.
- [ ] `examples/background-location`: start/stop tracking, permission handling, persisted events, background updates. Simulator integration checks plus explicit physical-device CI evidence for actual background behavior.
- [ ] `examples/canvas`: complex animated Canvas scene with assets and interaction, render/interaction integration checks and cleanup on exit.
- [ ] Expand the shell's compiled plugin catalog by tested groups: graphics/media, collections/charts/animation, storage/network, camera/photos, device services. Every group must pass the common import and IPA jobs before being marked done.

## in-progress

- [ ] Fix the manually authored Netflix paste package's escaped line breaks; validate decoded JavaScript in a standalone Linux CI job without installing dependencies or rebuilding the shell. This is a syntax check, not native UI acceptance.
- [ ] Fix keyboard covering import actions: place Paste/Run above the editor, provide explicit keyboard dismissal, and verify real clipboard paste and launch with the keyboard open in CI before publishing a replacement IPA.

## done

- [x] Shared package contract, exporter, offline loader, native paste shell, GPU example, unsigned device IPA, and all four integration scenarios passed at `d19c4a6`: https://github.com/ivanpadavan/MyNativeScriptPreview/actions/runs/45082008215 . The verified artifact includes the IPA, GPU text package, entitlement request, capability report, and signing notes; test logs and xcresults are separate artifacts. The suite exercises real clipboard import, numeric native GPU response, repeat import, restart with empty clipboard, and failed imports preserving the working project.
- [x] CocoaPods lock applicability checked in the successful native run above: the Core-only shell has no Podfile/CocoaPods dependencies and produces no Podfile.lock. The pipeline requires an exact committed `ci/Podfile.lock` if future plugins produce one.
- [x] Native device IPA verification and all four real-clipboard/GPU/import integration scenarios passed: https://github.com/ivanpadavan/MyNativeScriptPreview/actions/runs/45082008215 (`d19c4a6`). Final cache-reuse validation and publication evidence are still pending below the milestone boundary.
- [x] Documentation-only routing verified: https://github.com/ivanpadavan/MyNativeScriptPreview/actions/runs/45078008779 (`3f85027`); only Linux scope ran, all dependency/native/test jobs skipped, and the relevant native run continued.
- [x] Source syntax, GPU TypeScript and text-package export passed in CI: https://github.com/ivanpadavan/MyNativeScriptPreview/actions/runs/45077531877 (`fad5ad6`). This is not native/UI-test completion.
- [x] JavaScript and Ruby dependency locks generated in CI: https://github.com/ivanpadavan/MyNativeScriptPreview/actions/runs/45076691257 (source commit `ad2e5d9`). No packages were installed locally.
- [x] Public repository created: https://github.com/ivanpadavan/MyNativeScriptPreview . GitHub CLI authorization was restored after fixing ownership of `/home/codex/.config`.
- [x] Agreed scope and execution constraints recorded in this file. This is planning evidence only; no build or test success is claimed.
