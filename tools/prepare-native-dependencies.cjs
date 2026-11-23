'use strict';
if (process.env.CI !== 'true') throw new Error('Native dependency preparation is CI-only.');

// CLI 9.1.2 pins this service boundary. Unlike `ns prepare`, it resolves native
// plugin frameworks/CocoaPods without invoking the JS bundler or xcodebuild.
require('nativescript/lib/bootstrap');
const { injector } = require('nativescript/lib/common/yok');
const { IOSPrepareData } = require('nativescript/lib/data/prepare-data');

(async () => {
  injector.resolve('logger').initializeCliLogger({});
  const projectData = injector.resolve('projectDataService').getProjectData(process.cwd());
  const platformData = injector.resolve('platformsDataService').getPlatformData('ios', projectData);
  const prepareData = new IOSPrepareData(process.cwd(), 'ios', { release: false, env: {}, hmr: false, watch: false });
  await injector.resolve('prepareNativePlatformService').prepareNativePlatform(platformData, projectData, prepareData);
  console.log('Native plugin dependencies prepared without JS/native application compilation.');
})().catch((error) => { console.error(error.stack || error); process.exitCode = 1; });
