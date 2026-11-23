const { File, Folder, knownFolders, path } = require('@nativescript/core');
const { parsePackage } = require('../../shared/package.cjs');

const home = () => knownFolders.documents().getFolder('preview');
const savedPath = () => path.join(home().path, 'last.preview.txt');
const library = () => home().getFolder('library');
const indexPath = () => path.join(library().path, 'index.json');
let transaction = Promise.resolve();

function atomicText(destination, raw) {
  if (!NSString.stringWithString(raw).writeToFileAtomicallyEncodingError(destination, true, NSUTF8StringEncoding)) {
    throw new Error('Не удалось сохранить приложение.');
  }
}

function uuid(value) {
  if (typeof value !== 'string' || !/^[0-9a-f-]{36}$/i.test(value)) throw new Error('Повреждён идентификатор приложения.');
  return value;
}

function appFolder(id) { return library().getFolder(uuid(id)); }
function packetPath(record) { return path.join(appFolder(record.id).path, `${uuid(record.revision)}.preview.txt`); }
function writeIndex(records) { atomicText(indexPath(), JSON.stringify({ format: 'preview-library/1', apps: records })); }

function recordFor(raw, project, previous) {
  const id = previous ? previous.id : NSUUID.UUID().UUIDString;
  const icon = project.icon && project.files[project.icon];
  const record = {
    id, revision: NSUUID.UUID().UUIDString, packageId: project.id || null,
    name: project.name, description: project.description || '', color: project.color || '#635bff',
    iconBase64: icon && icon.encoding === 'base64' && icon.data.length < 180000 ? icon.data : null,
    createdAt: previous ? previous.createdAt : Date.now(), updatedAt: Date.now(),
    lastOpenedAt: previous ? previous.lastOpenedAt : 0,
  };
  atomicText(packetPath(record), raw);
  return record;
}

async function loadIndex() {
  if (!File.exists(indexPath())) {
    // Commit an empty library too: deleting the final app must not resurrect
    // a legacy last.preview.txt on the next launch.
    const legacy = await readSaved();
    const apps = legacy ? [recordFor(legacy.raw, legacy.project)] : [];
    writeIndex(apps);
    return apps;
  }
  const index = JSON.parse(await File.fromPath(indexPath()).readText());
  if (index.format !== 'preview-library/1' || !Array.isArray(index.apps)) throw new Error('Не удалось прочитать библиотеку.');
  for (const app of index.apps) {
    uuid(app.id); uuid(app.revision);
    if (typeof app.name !== 'string') throw new Error('Повреждена запись библиотеки.');
  }
  return index.apps;
}

function serial(operation) {
  const result = transaction.then(operation);
  transaction = result.catch(() => {});
  return result;
}

function listApps() {
  return serial(async () => (await loadIndex()).sort((a, b) => (b.lastOpenedAt || b.updatedAt) - (a.lastOpenedAt || a.updatedAt)));
}

function readApp(id) {
  return serial(async () => {
    const record = (await loadIndex()).find((app) => app.id === id);
    if (!record) throw new Error('Приложение не найдено.');
    const raw = await File.fromPath(packetPath(record)).readText();
    return { record, raw, project: parsePackage(raw) };
  });
}

function importApp(raw, replaceId, newId) {
  return serial(async () => {
    const project = parsePackage(raw);
    const apps = await loadIndex();
    const previous = replaceId ? apps.find((app) => app.id === replaceId) : null;
    if (replaceId && !previous) throw new Error('Приложение для обновления не найдено.');
    const record = recordFor(raw, project, previous || (newId ? { id: uuid(newId), createdAt: Date.now(), lastOpenedAt: 0 } : null));
    const next = previous ? apps.map((app) => app.id === replaceId ? record : app) : [...apps, record];
    try { writeIndex(next); }
    catch (error) {
      await File.fromPath(packetPath(record)).remove().catch(console.error);
      throw error;
    }
    if (previous) await File.fromPath(packetPath(previous)).remove().catch(console.error);
    return record;
  });
}

function markOpened(id) {
  return serial(async () => {
    const apps = await loadIndex();
    const record = apps.find((app) => app.id === id);
    if (!record) throw new Error('Приложение не найдено.');
    record.lastOpenedAt = Date.now();
    writeIndex(apps);
  });
}

function deleteApp(id) {
  return serial(async () => {
    const apps = await loadIndex();
    if (!apps.some((app) => app.id === id)) return;
    writeIndex(apps.filter((app) => app.id !== id));
    await appFolder(id).remove();
  });
}

function dataDirectory(id) { return appFolder(id).getFolder('data').path; }

async function readSaved() {
  if (!File.exists(savedPath())) return null;
  const raw = await File.fromPath(savedPath()).readText();
  return { raw, project: parsePackage(raw) };
}

function save(raw) {
  // Atomic replacement keeps the previous project intact if writing fails.
  const value = NSString.stringWithString(raw);
  if (!value.writeToFileAtomicallyEncodingError(savedPath(), true, NSUTF8StringEncoding)) {
    throw new Error('Не удалось сохранить проект.');
  }
}

async function stage(project) {
  const directory = home().getFolder(`run-${NSUUID.UUID().UUIDString}`);
  try {
    for (const [name, file] of Object.entries(project.files)) {
      const segments = name.split('/');
      let parent = directory;
      for (const part of segments.slice(0, -1)) parent = parent.getFolder(part);
      const target = parent.getFile(segments[segments.length - 1]);
      if (file.encoding === 'utf8') await target.writeText(file.data);
      else {
        const data = NSData.alloc().initWithBase64EncodedStringOptions(file.data, 0);
        if (!data || !data.writeToFileAtomically(target.path, true)) {
          throw new Error(`Не удалось сохранить ресурс: ${name}`);
        }
      }
    }
    return directory.path;
  } catch (error) {
    await directory.remove();
    throw error;
  }
}

async function removeStage(directory) {
  if (directory && Folder.exists(directory)) await Folder.fromPath(directory).remove();
}

async function clearAbandonedStages() {
  for (const entity of await home().getEntities()) {
    if (entity.name.startsWith('run-') && entity instanceof Folder) await entity.remove();
  }
}

module.exports = { readSaved, save, stage, removeStage, clearAbandonedStages,
  listApps, readApp, importApp, markOpened, deleteApp, dataDirectory };
