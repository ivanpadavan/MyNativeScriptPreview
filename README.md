# MyNativeScriptPreview

An iOS NativeScript shell for applications transferred as one text package.
The shell and its compiled native dependencies are installed once. Imported
projects execute locally without QR codes, npm, or a development server.

**Status:** implementation published; CI bootstrapping is in progress. No successful native build or IPA is claimed yet.
The first milestone is **GPU Check only**. See [PLAN.md](PLAN.md).

## One flow

1. Obtain `gpu-check.preview.txt` from a successful **Preview CI** artifact.
2. Open it as text and copy **the entire contents**.
3. Open the installed shell, tap **Вставить проект**, then **Запустить**.
4. Tap **Проверить GPU**. Use **Оболочка** to return.

The last successfully opened project is saved. After restarting, use
**Открыть сохранённый проект**; the clipboard and a development server are
not needed. A failed import does not replace the saved working project.

The unsigned IPA must first be signed and installed with your own signing tool.
See [signing and capabilities](ci/signing.md). Signing is separate from this
project-import flow and requires no credentials in CI.

## First CI bootstrap

No dependency installation, build, generator, linter, or test is run locally.
Source editing and uploading files are the only local development operations.

1. Publish this source in public `ivanpadavan/MyNativeScriptPreview`, branch `main`.
2. **Bootstrap dependency locks** resolves `package-lock.json` and `Gemfile.lock`
   on a macOS runner and uploads the `dependency-locks` artifact. Commit those
   generated files without resolving them locally.
3. **Preview CI** builds the shell, exports the GPU example and runs native UI
   integration tests. On the first iOS preparation it publishes `ios-pod-lock`.
   Commit its `Podfile.lock` as `ci/Podfile.lock`.
4. Rerun **Preview CI**. Release artifact publication requires all locks to be
   committed, simulator scenarios to pass and the unsigned device IPA to verify.
5. Download `preview-verified-<commit>`. It contains the IPA, GPU package,
   requested entitlements, capability report, and signing notes.

Node is fixed in `.node-version`; Apple tools and the simulator are fixed in `ci/toolchain.json`.
Dependency versions become exact through CI-generated lockfiles. CocoaPods
resolution must match the committed lock in both simulator and device jobs.
Simulator tests use ad-hoc signing without an Apple account. The **device IPA**
is unsigned, built for arm64/iPhoneOS, and contains no provisioning profile.

All test logs and `.xcresult` evidence are retained. The pipeline never runs a
phone-side dev server. It verifies that the GPU example code and text package
are not present in the shell app bundle.

## CI cost and reuse

- Documentation-only pushes run just the lightweight change detector on Linux.
- Dependency jobs run separately from compilation. JS caches are keyed by OS,
  architecture, Node version, manifest and npm lock; Ruby caches use the Ruby
  version and Gemfile lock. Install commands run only on exact cache misses.
- Native platform scaffolding and CocoaPods dependencies have their own cache,
  separate from shell source and compiled app outputs.
- The simulator app and unsigned IPA are built only when the shell content key
  is missing. It covers host sources, the package protocol, native resources,
  native build/verification scripts, lockfiles and the pinned Apple toolchain.
- Example, exporter and UI-test edits reuse the exact prebuilt shell. Examples
  build on Linux. A standalone XCUITest runner controls the preinstalled app by
  bundle ID and never rebuilds the NativeScript shell.
- Missing/evicted caches are rebuilt through the dependency/build jobs; no
  broad restore-prefix fallback accepts stale dependency or native outputs.
- Internal `native-device-build-only` and `native-simulator-build-only` artifacts
  are **not** verified. Integration downloads only the simulator app; publication
  downloads only the device files. Only the
  downstream `preview-verified-*` artifact is published after integration passes.
- Native provenance in `capabilities.json` identifies the original build. The
  successful workflow identifies the current example/test revision that used it.

## Project contract

Every size of project uses the same JSON format:

```json
{
  "format": "ns-preview/1",
  "name": "My App",
  "entry": "entry.cjs",
  "files": {
    "entry.cjs": { "encoding": "utf8", "data": "...compiled CommonJS..." },
    "assets/logo.png": { "encoding": "base64", "data": "..." }
  }
}
```

The entry exports `createPage(context)`, returning a NativeScript `Page`, and
optionally `dispose()`. The shell owns `Application.run()` and navigation.
This is an explicit guest entry contract, not automatic support for arbitrary
NativeScript applications that call their own `Application.run()`.

- `require('@nativescript/core')` resolves to the shell's actual Core instance.
- Relative CommonJS and JSON modules resolve within the package. UTF-8 XML,
  CSS, SVG, and text files can be read with a relative `require`.
- `context.resourcePath('assets/logo.png')` gives a native filesystem path for
  a packaged resource. It does not change the shell-global `~/` alias.
- `context.onDispose(callback)` registers resource cleanup on leaving a project.
  Direct timer calls in guest modules are tracked; other native/global resources
  must be released by the project. This is not a security sandbox or a separate
  process, and `globalThis` can access the shell's native APIs.
- Exporting bundles application JS dependencies; host packages stay external.
  Unknown externals fail export, and unknown host modules fail import clearly.
- The input limit is 16 million characters and 4096 files. Paths must stay
  within the package. There is no `{xml, js}` shortcut or patch format in v1.

In CI, `npm run example:build` compiles the TypeScript GPU example and writes
the single-line `dist/gpu-check.preview.txt`. It does not build another IPA.
Other projects use `preview.project.json` with `name`, source `entry`, and an
optional array of binary `assets`; the same exporter accepts their directory.

## GPU acceptance

The supplied `checkGPU` source is preserved in `examples/gpu-check`.
The iOS 26+ simulator must show a numeric API result as `Background GPU: true`
or `Background GPU: false`. Missing native metadata must fail the CI case,
not quietly pass via the unavailable-API fallback.

This test does not perform background GPU work or prove entitlement support
for a physical device or a free Apple ID. Those facts are explicitly marked
unverified in the capability report.

The counter, background location, Canvas, and larger plugin catalog are later
milestones. Work stops at the verified GPU milestone.
