# Examples

Every example uses the same `ns-preview/1` package. There is no special format
for small projects. GitHub Actions builds the examples; the phone executes the
result without a dev server.

## First milestone

`gpu-check` is the only example implemented in this milestone. Download
`gpu-check.preview.txt` from a successful CI run, open it as text, copy all,
paste in the shell, and tap **Запустить**.

## Later milestones

The following directories will be implemented in order after explicit follow-up:

- `tap-counter`: increment/reset and lifecycle integration tests.
- `background-location`: permissions, recording, background location events,
  and physical-device CI validation for actual background delivery.
- `canvas`: complex interactive animated rendering with local assets and cleanup.

Their detailed acceptance criteria and current status are in `PLAN.md`. They
are not stub examples and are not included in the first build matrix.
