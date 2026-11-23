# Working rules

## Rational CI is a primary requirement

CI must be economical by design. Do not rebuild the native application or
reinstall dependencies on every push. Treat redundant macOS jobs, repeated
dependency installation, and avoidable native compilation as defects.

- Determine affected work before allocating build runners. Documentation-only
  changes run at most lightweight routing checks; they must not install
  dependencies, allocate macOS build/test runners, or compile anything.
- Separate dependency provisioning, source/example checks, native compilation,
  integration testing, and publication into distinct jobs.
- Install dependencies only on an exact dependency-cache miss. Keys must cover
  relevant manifests and lockfiles, runtime/tool versions, OS and architecture.
  Build/test jobs consume prepared dependencies; do not silently install there.
- Cache native platform dependencies independently of the shell's JS/UI source
  and independently of compiled simulator/device applications.
- Key compiled shell reuse by all inputs affecting the native result, including
  host sources, shared protocol, native resources, build scripts, dependencies,
  capabilities, and the actual pinned toolchain. Never use a broad fallback key
  that can accept a stale binary or dependencies.
- Example, exporter and test-only changes must reuse a matching compiled shell.
  A standalone UI runner must not rebuild NativeScript as a test dependency.
- Preserve executable permissions and framework symlinks when transferring apps
  between jobs. Do not upload duplicate DerivedData or other large intermediates
  as routine evidence.
- Publish verified artifacts only after the required integration checks pass.
  Keep unverified build artifacts clearly labelled. Retain useful failure logs.
- Avoid duplicate work across concurrent runs, and cancel a known-obsolete run
  when a fix already makes its expensive work unnecessary. Documentation pushes
  must not cancel a relevant native build that is still needed.
- Validate routing and reuse in CI before claiming that the pipeline is rational:
  documentation skips expensive jobs, unchanged dependency keys skip installs,
  and example/test-only edits skip native compilation. Record run URLs in PLAN.md.

## Execution constraints

- Do not install dependencies, run builds, generators, linters, or tests on the
  local machine. All such operations and verification belong in CI.
- Local source editing, reading documentation/logs, Git operations, and copying
  lockfiles/artifacts produced by CI are allowed.
- Keep the plan in PLAN.md under `check`, `in-progress`, and `done`. CI-dependent
  completion claims require evidence, including the run URL and tested commit.
- The initial GPU-only milestone was extended by the user's launcher request:
  implement a persistent app library, a compiled plugin catalog, and one CI
  export flow used by the examples. Keep ZIP import out of scope for now.
- CI is authorized for the shell and project exports. The user's no-run request
  applies to ad-hoc JSON demos, not shell builds or integration checks.
- Use one package/import flow for every project size. Do not introduce a special
  two-file XML/JS format, a dev-server dependency, or a QR-based import flow.
- Do not claim that simulator checks prove physical background GPU execution,
  effective entitlements, or signing compatibility with a free Apple ID.
