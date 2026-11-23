const core = require('@nativescript/core');
const { filePath } = require('../../shared/package.cjs');
const catalog = require('./catalog');

// A guest receives the host's actual Core instance: no second runtime or Page
// class, no network resolver, no npm installation on the device.

function relativePath(specifier, importer) {
  const parts = importer.split('/').slice(0, -1);
  for (const part of specifier.split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') {
      if (!parts.length) throw new Error('Импорт выходит за пределы проекта.');
      parts.pop();
    } else parts.push(part);
  }
  return filePath(parts.join('/'));
}

function createGuest(project, resourceDirectory, options = {}) {
  for (const name of project.requires || []) {
    if (!catalog.hasModule(name)) throw new Error(`Модуль не включён в эту оболочку: ${name}`);
  }
  const cache = new Map();
  let page;
  let entry;
  let disposed = false;
  let invoked = false;
  const cleanups = new Set();
  const timers = new Map();

  function trackedTimeout(callback, delay, ...args) {
    const id = setTimeout(() => {
      timers.delete(id);
      callback(...args);
    }, delay);
    timers.set(id, clearTimeout);
    return id;
  }
  function trackedInterval(callback, delay, ...args) {
    const id = setInterval(callback, delay, ...args);
    timers.set(id, clearInterval);
    return id;
  }
  function clearTracked(id) {
    const clear = timers.get(id);
    if (clear) clear(id);
    timers.delete(id);
  }

  const context = Object.freeze({
    appId: options.appId || null,
    dataPath: options.dataPath || resourceDirectory,
    packages: catalog.packages,
    close() { if (options.close) options.close(); },
    resourcePath(name) {
      const path = filePath(name);
      if (!Object.hasOwn(project.files, path)) throw new Error(`Ресурс не найден: ${path}`);
      return core.path.join(resourceDirectory, path);
    },
    onDispose(callback) {
      if (typeof callback !== 'function') throw new Error('onDispose ожидает функцию.');
      cleanups.add(callback);
    },
  });

  function load(name) {
    if (cache.has(name)) return cache.get(name).exports;
    const file = project.files[name];
    if (!file) throw new Error(`Файл не найден: ${name}`);
    if (file.encoding !== 'utf8') throw new Error(`Бинарный ресурс загружается через resourcePath: ${name}`);
    if (name.endsWith('.json')) return JSON.parse(file.data);
    if (!/\.(?:c?js)$/.test(name)) return file.data;
    const module = { exports: {} };
    cache.set(name, module);
    function guestRequire(specifier) {
      if (typeof specifier !== 'string') throw new Error('Имя модуля должно быть строкой.');
      if (catalog.hasModule(specifier)) return catalog.getModule(specifier);
      if (!specifier.startsWith('./') && !specifier.startsWith('../')) {
        throw new Error(`Модуль не включён в эту оболочку: ${specifier}`);
      }
      const resolved = relativePath(specifier, name);
      const match = [resolved, `${resolved}.cjs`, `${resolved}.js`, `${resolved}.json`, `${resolved}/index.js`]
        .find((candidate) => Object.hasOwn(project.files, candidate));
      if (!match) throw new Error(`Модуль не найден: ${specifier} (из ${name})`);
      return load(match);
    }
    try {
      const evaluate = new Function('require', 'module', 'exports', '__filename', '__dirname',
        'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval',
        `${file.data}\n//# sourceURL=preview/${name}`);
      evaluate(guestRequire, module, module.exports, name, name.split('/').slice(0, -1).join('/'),
        trackedTimeout, trackedInterval, clearTracked, clearTracked);
      return module.exports;
    } catch (error) {
      cache.delete(name);
      throw new Error(`${name}: ${error.message || String(error)}`);
    }
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    for (const [id, clear] of timers) clear(id);
    timers.clear();
    try { if (invoked && entry && typeof entry.dispose === 'function') entry.dispose(); }
    catch (error) { console.error('Guest dispose:', error); }
    for (const callback of cleanups) {
      try { callback(); } catch (error) { console.error('Guest cleanup:', error); }
    }
    cleanups.clear();
    cache.clear();
  }

  try {
    entry = load(project.entry);
    if (typeof entry.createPage !== 'function') throw new Error('Точка входа должна экспортировать createPage(context).');
    if (options.validateOnly) return { dispose };
    invoked = true;
    page = entry.createPage(context);
    if (!(page instanceof core.Page)) throw new Error('createPage(context) должна вернуть NativeScript Page.');
    return { page, dispose };
  } catch (error) {
    dispose();
    throw error;
  }
}

module.exports = { createGuest };
