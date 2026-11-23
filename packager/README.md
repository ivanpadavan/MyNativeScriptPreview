# @nspreview/pack

Reusable Node.js project builder for NativeScript Launcher. See
[QUICKSTART.md](../QUICKSTART.md) for the complete Hello World flow.

```sh
node cli.mjs build /path/to/project
node cli.mjs modules
```

The builder reads `preview.project.json` (`name`, `entry`, optional `id`,
`description`, `color`, `icon`, `assets`), bundles JS/TS and ordinary JS
dependencies, and writes one `dist/<project>.preview.txt` in the project.
`--out` selects another destination; `--sourcemap` enables debug source maps.
NativeScript host modules listed in `catalog.json` remain external. No iOS
toolchain, native compilation, launcher process, or server is needed to export.
