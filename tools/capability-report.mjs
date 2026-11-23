import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

if (process.env.CI !== 'true') throw new Error('Capability reporting is CI-only.');
const catalog = JSON.parse(await readFile('packager/catalog.json', 'utf8'));
const versions = Object.fromEntries(await Promise.all(catalog.packages.map(async (name) => {
  const installed = JSON.parse(await readFile(new URL(`../node_modules/${name}/package.json`, import.meta.url), 'utf8'));
  return [name, installed.version];
})));
const plist = JSON.parse(execFileSync('plutil', ['-convert', 'json', '-o', '-',
  'artifacts/package/Payload/MyNativeScriptPreview.app/Info.plist'], { encoding: 'utf8' }));
const report = {
  commit: process.env.GITHUB_SHA,
  workflowRun: `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`,
  runtime: catalog,
  installedVersions: versions,
  xcode: execFileSync('xcodebuild', ['-version'], { encoding: 'utf8' }).trim(),
  backgroundModes: plist.UIBackgroundModes,
  usageDescriptions: Object.keys(plist).filter((key) => key.endsWith('UsageDescription')),
  requestedEntitlements: ['com.apple.developer.background-tasks.continued-processing.gpu'],
  effectiveEntitlements: null,
  signed: false,
  physicalDeviceGPUExecutionVerified: false,
  personalTeamSigningVerified: false,
  notes: 'Declarations and requested entitlements are not effective permissions. Sign with a compatible profile.',
};
await writeFile('artifacts/capabilities.json', `${JSON.stringify(report, null, 2)}\n`);
