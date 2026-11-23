# MyNativeScriptPreview

## Rules

- One flow: build a project with the standalone Node tool, copy the entire `.preview.txt`, add it to the iOS launcher, open. CI calls the same tool.
- One versioned package format for every project; no special XML/JS shortcut.
- No local dependency installation, builds, generators, linters, or tests. All verification runs in GitHub Actions.
- CI produces an unsigned **device** IPA and separately tests a **simulator** app.
- The initial GPU-only boundary was extended by the user: launcher library, compiled plugins, unified project export, and examples using that flow. ZIP import remains out of scope.
- Free Apple ID signing happens outside CI. Requested entitlements are not effective permissions until a compatible profile signs the app.
- `done` requires evidence. CI-dependent tasks include the successful run URL and commit.

## check

- [ ] Physical iPhone: actual background location delivery, hardware features, and signing with the user's SideStore/profile. Simulator checks do not prove these.
- [ ] Physical background GPU execution and effective GPU entitlement after signing remain unverified. The tested system resource query returned `Background GPU: false` on the CI simulator.

## in-progress

No implementation work pending for this milestone. Physical-device acceptance above remains separate.

## done

- [x] Launcher milestone verified and published: https://github.com/ivanpadavan/MyNativeScriptPreview/actions/runs/45096358446 (`7823fc6`; exact native build reused from `437b2d4`). All 12 real-clipboard iOS integration scenarios passed with no failures. Verified artifact: `preview-verified-7823fc6bdd84c7c7bea44a3f82f0ad8df2fd2e62`.
- [x] Persistent multi-app library: import/update/delete/open, legacy migration without resurrection, and per-app data surviving restart and update. Guest pages own their navigation; native edge-back and sheet dismissal pass in the run above.
- [x] Core plus 24 plugins: every declared module imports on iOS, including a real SQLite `SELECT 42` roundtrip. Hardware functions beyond the exercised examples are not covered by this module-load check.
- [x] Every example uses the standalone Node tool and common packet/import flow. GPU query, counter/reset/persistence, native Canvas pixel readback/palette/assets, and simulated location start/watch/stop passed in the run above.
- [x] Import actions stay above a read-only preview: tapping the preview does not open the keyboard; a packet over 12,000 characters imports completely despite display truncation. Both scenarios passed in the run above.
- [x] Dependency reuse and test-only native reuse passed on `7823fc6`: no JS/Ruby dependency installation, no NativeScript preparation/compilation, and native artifact reuse handled on Linux. Native dependencies, compiled apps, and standalone builder dependencies retain independent exact keys.

- [x] Standalone Node export succeeds without installing the NativeScript SDK: https://github.com/ivanpadavan/MyNativeScriptPreview/actions/runs/45095364744 (`2c059f0`, Canvas project including its asset). Every example delegates to the same `packager/cli.mjs`; QUICKSTART.md covers Hello World and the copy/paste flow.
- [x] Exact native artifact reuse across branches validated: https://github.com/ivanpadavan/MyNativeScriptPreview/actions/runs/45096048819 (`7dc5f7a`). Native transfer ran on Linux without native compilation; JS/Ruby dependency installs were skipped. UI integration failed before app launch while the hosted CoreSimulator service was starting; that run is not application acceptance.

- [x] The extended native launcher builds for simulator and device; unsigned IPA verification passed with all selected native dependencies: https://github.com/ivanpadavan/MyNativeScriptPreview/actions/runs/45094627182 (`437b2d4`, native-only run). UI integration was intentionally skipped in this build-provisioning run; the same binaries subsequently passed the milestone run above.
- [x] SQLite switched to the NativeScript 9.1 Node-API backend after CI exposed a static-header collision with Canvas/FontManager. CocoaPods and Swift package resolution now run in dependency provisioning, with generated locks: https://github.com/ivanpadavan/MyNativeScriptPreview/actions/runs/45092293546 (`1a63d7a`). Full native compilation and integration subsequently passed in the milestone runs above.
- [x] Native plugin dependencies and standalone builder lockfiles resolved in CI without compiling JS or a native application: https://github.com/ivanpadavan/MyNativeScriptPreview/actions/runs/45089652674 (`9953f91`). The generated npm/packager/CocoaPods locks are committed; final module availability is verified in the milestone run above.
- [x] Shared package contract, exporter, offline loader, native paste shell, GPU example, unsigned device IPA, and all four integration scenarios passed at `d19c4a6`: https://github.com/ivanpadavan/MyNativeScriptPreview/actions/runs/45082008215 . The verified artifact includes the IPA, GPU text package, entitlement request, capability report, and signing notes; test logs and xcresults are separate artifacts. The suite exercises real clipboard import, numeric native GPU response, repeat import, restart with empty clipboard, and failed imports preserving the working project.
- [x] CocoaPods lock applicability checked in the successful native run above: the Core-only shell has no Podfile/CocoaPods dependencies and produces no Podfile.lock. The pipeline requires an exact committed `ci/Podfile.lock` if future plugins produce one.
- [x] Native device IPA verification and all four real-clipboard/GPU/import integration scenarios passed: https://github.com/ivanpadavan/MyNativeScriptPreview/actions/runs/45082008215 (`d19c4a6`). This records the original Core-only milestone; the launcher milestone above supersedes it.
- [x] Documentation-only routing verified: https://github.com/ivanpadavan/MyNativeScriptPreview/actions/runs/45078008779 (`3f85027`); only Linux scope ran, all dependency/native/test jobs skipped, and the relevant native run continued.
- [x] Source syntax, GPU TypeScript and text-package export passed in CI: https://github.com/ivanpadavan/MyNativeScriptPreview/actions/runs/45077531877 (`fad5ad6`). This is not native/UI-test completion.
- [x] JavaScript and Ruby dependency locks generated in CI: https://github.com/ivanpadavan/MyNativeScriptPreview/actions/runs/45076691257 (source commit `ad2e5d9`). No packages were installed locally.
- [x] Public repository created: https://github.com/ivanpadavan/MyNativeScriptPreview . GitHub CLI authorization was restored after fixing ownership of `/home/codex/.config`.
- [x] Agreed scope and execution constraints recorded in this file. This is planning evidence only; no build or test success is claimed.
