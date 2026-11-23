'use strict';
// Load only in the real CLI process, never in its webpack/type-check workers.
const path = require('node:path');
const fs = require('node:fs');
if (process.env.CI === 'true' && process.env.PREVIEW_FROZEN_NATIVE_DEPS === '1' &&
    ['ns', 'nsc', 'tns', 'nativescript'].includes(path.basename(process.argv[1] || ''))) {
  require('nativescript/lib/bootstrap');
  const { injector } = require('nativescript/lib/common/yok');
  function same(left, right) {
    if (!fs.existsSync(left) || !fs.existsSync(right) || !fs.readFileSync(left).equals(fs.readFileSync(right))) {
      throw new Error(`Prepared dependency lock differs: ${left} / ${right}`);
    }
  }
  injector.resolve('cocoapodsService').executePodInstall = async (directory) => {
    same('ci/Podfile.lock', path.join(directory, 'Podfile.lock'));
    same(path.join(directory, 'Podfile.lock'), path.join(directory, 'Pods/Manifest.lock'));
    console.log('CocoaPods: prepared dependencies reused; no installation.');
    return { exitCode: 0 };
  };
  injector.resolve('spmService').resolveSPMDependencies = async (platformData, projectData) => {
    const base = platformData.projectRoot;
    const candidates = [
      path.join(base, `${projectData.projectName}.xcworkspace/xcshareddata/swiftpm/Package.resolved`),
      path.join(base, `${projectData.projectName}.xcodeproj/project.xcworkspace/xcshareddata/swiftpm/Package.resolved`),
    ];
    const resolved = candidates.find(file => fs.existsSync(file));
    if (!resolved || !fs.existsSync(path.join(base, 'SourcePackages'))) throw new Error('Prepared Swift packages are missing.');
    same('ci/Package.resolved', resolved);
    console.log('Swift Packages: prepared dependencies reused; no resolution.');
  };
}
