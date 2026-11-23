// Compatibility entry: all builds use the standalone packager.
import path from 'node:path';
import { buildProject } from '../packager/cli.mjs';
const directory = process.argv[2] || 'examples/gpu-check';
await buildProject(directory, { out: path.join('dist', `${path.basename(directory)}.preview.txt`) });
