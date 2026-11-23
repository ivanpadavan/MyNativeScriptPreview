#!/usr/bin/env node
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { realpathSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const { FORMAT, parsePackage, filePath } = require('./protocol.cjs');
const catalog = JSON.parse(await readFile(new URL('./catalog.json', import.meta.url), 'utf8'));

export async function buildProject(directory, options = {}) {
  const projectDirectory = path.resolve(directory);
  let config;
  try { config = JSON.parse(await readFile(path.join(projectDirectory, 'preview.project.json'), 'utf8')); }
  catch (error) { throw new Error(`Не удалось прочитать ${path.join(projectDirectory, 'preview.project.json')}: ${error.message}`); }
  filePath(config.entry);
  const output = await build({
    absWorkingDir: projectDirectory,
    entryPoints: [config.entry], bundle: true, write: false,
    format: 'cjs', platform: 'neutral', target: 'es2022',
    external: catalog.packages, sourcemap: options.sourcemap ? 'inline' : false,
    sourcesContent: Boolean(options.sourcemap), minify: !options.sourcemap,
    legalComments: 'none', metafile: true, logLevel: 'silent',
    define: { 'process.env.NODE_ENV': '"production"' },
    loader: { '.xml': 'text', '.css': 'text', '.svg': 'text' },
  });
  const imports = new Set();
  for (const file of Object.values(output.metafile.outputs)) {
    for (const dependency of file.imports) {
      if (!dependency.external) continue;
      if (!catalog.packages.includes(dependency.path)) {
        throw new Error(`Модуль ${dependency.path} недоступен в лаунчере. Список: ns-preview modules.`);
      }
      imports.add(dependency.path);
    }
  }
  const files = { 'entry.cjs': { encoding: 'utf8', data: output.outputFiles[0].text } };
  const assets = new Set(config.assets || []);
  if (config.icon) assets.add(config.icon);
  for (const asset of assets) {
    filePath(asset);
    files[asset] = { encoding: 'base64', data: (await readFile(path.join(projectDirectory, asset))).toString('base64') };
  }
  const packet = { format: FORMAT, name: config.name, entry: 'entry.cjs', requires: [...imports].sort(), files };
  for (const key of ['id', 'description', 'icon', 'color']) {
    if (config[key] !== undefined) packet[key] = config[key];
  }
  const raw = JSON.stringify(packet);
  parsePackage(raw);
  // Check the decoded body as well as JSON escaping; do not execute guest code.
  new Function('require', 'module', 'exports', files['entry.cjs'].data);
  const destination = path.resolve(options.out || path.join(projectDirectory, 'dist', `${path.basename(projectDirectory)}.preview.txt`));
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, `${raw}\n`);
  console.log(`Готово: ${destination}\nСкопируйте файл целиком → добавьте в лаунчер → откройте приложение.`);
  return destination;
}

async function main(args) {
  if (args[0] === 'modules') { console.log(catalog.packages.join('\n')); return; }
  if (args[0] !== 'build' || !args[1]) {
    console.log('ns-preview build <папка проекта> [--out файл.preview.txt] [--sourcemap]\nns-preview modules');
    if (args.length && !['--help', '-h'].includes(args[0])) process.exitCode = 1;
    return;
  }
  const options = {};
  for (let i = 2; i < args.length; i++) {
    if (args[i] === '--out' && args[i + 1]) options.out = args[++i];
    else if (args[i] === '--sourcemap') options.sourcemap = true;
    else throw new Error(`Неизвестный параметр: ${args[i]}`);
  }
  await buildProject(args[1], options);
}

if (process.argv[1] && pathToFileURL(realpathSync(process.argv[1])).href === import.meta.url) {
  main(process.argv.slice(2)).catch((error) => {
    const detail = error.errors?.map((item) => `${item.location ? `${item.location.file}:${item.location.line}: ` : ''}${item.text}`).join('\n');
    console.error(detail || error.message);
    process.exitCode = 1;
  });
}
