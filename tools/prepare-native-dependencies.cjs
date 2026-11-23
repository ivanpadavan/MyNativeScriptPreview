'use strict';
if (process.env.CI !== 'true') throw new Error('Native preparation is CI-only.');
const fs = require('node:fs');
const path = require('node:path');
require('nativescript/lib/bootstrap');
const { injector } = require('nativescript/lib/common/yok');
const { IOSPrepareData } = require('nativescript/lib/data/prepare-data');
const frozen = process.argv.includes('--bundle');
const root = process.cwd();
const platform = path.join(root, 'platforms/ios');
const sourcePackages = path.join(platform, 'SourcePackages');

function equalFiles(left, right) {
  if (!fs.existsSync(left) || !fs.existsSync(right) || !fs.readFileSync(left).equals(fs.readFileSync(right))) {
    throw new Error(`Prepared dependencies do not match: ${left} / ${right}. Regenerate locks in the dependency workflow.`);
  }
}

(async () => {
  injector.resolve('logger').initializeCliLogger({});
  const projectData = injector.resolve('projectDataService').getProjectData(root);
  const platformData = injector.resolve('platformsDataService').getPlatformData('ios', projectData);
  const resolutions = [
    path.join(platform, `${projectData.projectName}.xcworkspace/xcshareddata/swiftpm/Package.resolved`),
    path.join(platform, `${projectData.projectName}.xcodeproj/project.xcworkspace/xcshareddata/swiftpm/Package.resolved`),
  ];
  const swiftLock = path.join(root, 'ci/Package.resolved');
  if (!frozen && fs.existsSync(swiftLock)) {
    for (const file of resolutions) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.copyFileSync(swiftLock, file); }
  }
  const commands = injector.resolve('xcodebuildCommandService');
  const execute = commands.executeCommand.bind(commands);
  commands.executeCommand = (args, options) => {
    if (args.includes('-resolvePackageDependencies')) {
      args = [...args, '-clonedSourcePackagesDirPath', sourcePackages];
      if (fs.existsSync(swiftLock)) args.push('-onlyUsePackageVersionsFromResolvedFile');
    }
    return execute(args, options);
  };

  if (frozen) {
    // Pinned CLI 9.1.2 service seams: retain project/resource/config preparation,
    // but consume the dependency job's exact Pods/SPM state without installing.
    injector.resolve('cocoapodsService').executePodInstall = async () => {
      equalFiles(path.join(root, 'ci/Podfile.lock'), path.join(platform, 'Podfile.lock'));
      equalFiles(path.join(platform, 'Podfile.lock'), path.join(platform, 'Pods/Manifest.lock'));
      console.log('CocoaPods: using prepared dependency cache; installation skipped.');
      return { exitCode: 0 };
    };
    injector.resolve('spmService').resolveSPMDependencies = async () => {
      const resolved = resolutions.find(file => fs.existsSync(file));
      if (!resolved || !fs.existsSync(sourcePackages)) throw new Error('Prepared Swift packages are missing.');
      equalFiles(swiftLock, resolved);
      console.log('Swift Packages: using prepared dependency cache; resolution skipped.');
    };
    await injector.resolve('prepareController').prepare(new IOSPrepareData(root, 'ios', {
      release: false, env: { production: true }, hmr: false, watch: false,
    }));
    console.log('Host bundled with prepared native dependencies; no dependency installation.');
  } else {
    await injector.resolve('prepareNativePlatformService').prepareNativePlatform(platformData, projectData,
      new IOSPrepareData(root, 'ios', { release: false, env: {}, hmr: false, watch: false }));
    const resolved = resolutions.find(file => fs.existsSync(file));
    if (resolved) {
      if (fs.existsSync(swiftLock)) equalFiles(swiftLock, resolved);
      fs.mkdirSync(path.join(root, 'artifacts/native-locks'), { recursive: true });
      fs.copyFileSync(resolved, path.join(root, 'artifacts/native-locks/Package.resolved'));
    }
    console.log('Native plugin dependencies prepared without JS/native application compilation.');
  }
})().catch((error) => { console.error(error.stack || error); process.exitCode = 1; });
