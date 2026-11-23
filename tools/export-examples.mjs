import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { buildProject } from '../packager/cli.mjs';

for (const entry of await readdir('examples', { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  await buildProject(path.join('examples', entry.name), { out: path.join('dist', `${entry.name}.preview.txt`) });
}
