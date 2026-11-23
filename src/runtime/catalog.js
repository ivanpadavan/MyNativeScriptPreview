// Keep imports static for webpack/native metadata discovery, and evaluate them
// on demand. Importing a project must not request every device permission.
const factories = Object.freeze({
  '@nativescript/core': () => require('@nativescript/core'),
  '@nativescript/canvas': () => require('@nativescript/canvas'),
  '@nativescript/canvas-svg': () => require('@nativescript/canvas-svg'),
  '@nativescript/canvas-media': () => require('@nativescript/canvas-media'),
  '@nativescript/geolocation': () => require('@nativescript/geolocation'),
  '@nativescript/camera': () => require('@nativescript/camera'),
  '@nativescript/imagepicker': () => require('@nativescript/imagepicker'),
  '@nativescript/haptics': () => require('@nativescript/haptics'),
  '@nativescript/local-notifications': () => require('@nativescript/local-notifications'),
  '@nativescript/secure-storage': () => require('@nativescript/secure-storage'),
  '@nativescript/social-share': () => require('@nativescript/social-share'),
  '@nativescript/contacts': () => require('@nativescript/contacts'),
  '@nativescript/brightness': () => require('@nativescript/brightness'),
  '@nativescript/directions': () => require('@nativescript/directions'),
  '@nativescript/appavailability': () => require('@nativescript/appavailability'),
  '@nativescript/email': () => require('@nativescript/email'),
  '@nativescript/datetimepicker': () => require('@nativescript/datetimepicker'),
  '@nativescript/background-http': () => require('@nativescript/background-http'),
  '@nativescript-community/ui-collectionview': () => require('@nativescript-community/ui-collectionview'),
  '@nativescript-community/ui-image': () => require('@nativescript-community/ui-image'),
  '@nativescript-community/gesturehandler': () => require('@nativescript-community/gesturehandler'),
  '@nativescript-community/sqlite-core': () => {
    require('@nativescript-community/sqlite-default-engine');
    return require('@nativescript-community/sqlite-core');
  },
  '@nativescript-community/https': () => require('@nativescript-community/https'),
  '@nativescript-community/ui-webview': () => require('@nativescript-community/ui-webview'),
  '@nativescript-community/ui-lottie': () => require('@nativescript-community/ui-lottie'),
});

function hasModule(name) { return Object.hasOwn(factories, name); }
function getModule(name) {
  if (!hasModule(name)) throw new Error(`Модуль не включён в эту оболочку: ${name}`);
  return factories[name]();
}
const packages = Object.freeze(Object.keys(factories));
module.exports = { hasModule, getModule, packages };
