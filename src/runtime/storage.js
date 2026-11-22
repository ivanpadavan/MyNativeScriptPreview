const { File, Folder, knownFolders, path } = require('@nativescript/core');
const { parsePackage } = require('../../shared/package.cjs');

const home = () => knownFolders.documents().getFolder('preview');
const savedPath = () => path.join(home().path, 'last.preview.txt');

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

module.exports = { readSaved, save, stage, removeStage, clearAbandonedStages };
