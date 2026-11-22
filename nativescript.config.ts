import type { NativeScriptConfig } from '@nativescript/core';

export default {
  id: 'org.ivanpadavan.nativescriptpreview',
  projectName: 'MyNativeScriptPreview',
  appPath: 'src',
  appResourcesPath: 'App_Resources',
  main: './src/app.js',
  ios: { deploymentTarget: '16.0' },
  security: { allowRemoteModules: false },
} as NativeScriptConfig;
