import { execFileSync } from 'node:child_process';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';

if (!process.env.CI) throw new Error('Source checks are restricted to CI.');
const require = createRequire(import.meta.url);
const { parsePackage } = require('../shared/package.cjs');

async function inspect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const name = path.join(directory, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules') await inspect(name);
    else if (/\.(?:c?js|mjs)$/.test(name)) execFileSync(process.execPath, ['--check', name], { stdio: 'inherit' });
  }
}
for (const directory of ['src', 'shared', 'tools', 'packager']) await inspect(directory);
const project = parsePackage(await readFile('dist/gpu-check.preview.txt', 'utf8'));
if (project.name !== 'GPU Check') throw new Error('Unexpected built example.');
const registry = await readFile('src/runtime/catalog.js', 'utf8');
const expectedExport = new Set([...registry.matchAll(/'([^']+)': \(\) => require\('/g)].map((match) => match[1]));
const catalog = JSON.parse(await readFile('packager/catalog.json', 'utf8'));
const manifest = JSON.parse(await readFile('package.json', 'utf8'));
if (catalog.packages.length !== expectedExport.size || catalog.packages.some((name) => !expectedExport.has(name) || !manifest.dependencies[name])) {
  throw new Error('Host catalog and exporter externals disagree.');
}
const info = await readFile('App_Resources/iOS/Info.plist', 'utf8');
if (!info.includes('location') || !info.includes('processing')) throw new Error('Missing declared background modes.');
console.log('Source syntax, exported package, catalog, and declarations checked.');
