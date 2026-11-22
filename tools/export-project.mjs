import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { FORMAT, parsePackage, filePath } = require('../shared/package.cjs');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const projectDirectory = path.resolve(process.argv[2] || 'examples/gpu-check');
const config = JSON.parse(await readFile(path.join(projectDirectory, 'preview.project.json'), 'utf8'));
filePath(config.entry);
const output = await build({
  absWorkingDir: projectDirectory,
  entryPoints: [config.entry],
  bundle: true,
  write: false,
  format: 'cjs',
  platform: 'neutral',
  target: 'es2022',
  external: ['@nativescript/core'],
  sourcemap: 'inline',
  sourcesContent: true,
  legalComments: 'inline',
  metafile: true,
  loader: { '.xml': 'text', '.css': 'text', '.svg': 'text' },
});

// Export-time resolution must agree with the host's actual compiled catalog.
for (const file of Object.values(output.metafile.outputs)) {
  for (const dependency of file.imports) {
    if (dependency.external && dependency.path !== '@nativescript/core') {
      throw new Error(`Module is not in the shell catalog: ${dependency.path}`);
    }
  }
}
const files = Object.create(null);
files['entry.cjs'] = { encoding: 'utf8', data: output.outputFiles[0].text };
for (const asset of config.assets || []) {
  filePath(asset);
  const bytes = await readFile(path.join(projectDirectory, asset));
  files[asset] = { encoding: 'base64', data: bytes.toString('base64') };
}
const packet = { format: FORMAT, name: config.name, entry: 'entry.cjs', files };
const raw = JSON.stringify(packet);
parsePackage(raw);
const destination = path.join(root, 'dist', `${path.basename(projectDirectory)}.preview.txt`);
await mkdir(path.dirname(destination), { recursive: true });
await writeFile(destination, `${raw}\n`);
console.log(`Text package: ${path.relative(root, destination)}`);
