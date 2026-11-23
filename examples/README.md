# Examples

Every example uses the same standalone Node builder; no example-specific compiler.

```sh
# Once, from the repository root:
npm --prefix packager ci
# Any example:
cd examples/tap-counter
npm run build
```

Copy the complete `dist/<example>.preview.txt`, add it to the launcher and open
its card. The same build works outside CI and on Linux, macOS or Windows.
See [QUICKSTART.md](../QUICKSTART.md) to write your own app.

- `gpu-check`: native BackgroundTasks resource query; no background GPU workload.
- `tap-counter`: persistent counter and Haptics.
- `background-location`: permission request, start/stop, persisted location journal.
  Simulator coverage is not evidence of physical background delivery.
- `canvas`: animated native Canvas 2D, pixel readback and palette interaction.
