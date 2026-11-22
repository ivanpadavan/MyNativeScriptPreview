'use strict';

const FORMAT = 'ns-preview/1';
const MAX_TEXT_LENGTH = 16 * 1024 * 1024;
const MAX_FILES = 4096;

function record(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function filePath(value) {
  if (typeof value !== 'string' || !value || value.includes('\\') || value.includes('\0') || value.includes(':')) {
    throw new Error('Некорректный путь файла проекта.');
  }
  if (value.split('/').some((part) => !part || part === '.' || part === '..')) {
    throw new Error('Путь должен быть относительным и не содержать «..».');
  }
  return value;
}

function parsePackage(text) {
  if (typeof text !== 'string' || !text.trim()) throw new Error('Сначала вставьте текст проекта.');
  if (text.length > MAX_TEXT_LENGTH) throw new Error('Пакет превышает лимит 16 млн символов.');
  let project;
  try { project = JSON.parse(text); }
  catch { throw new Error('Не удалось прочитать JSON проекта. Скопируйте файл целиком.'); }
  if (!record(project) || project.format !== FORMAT) throw new Error('Ожидается пакет ns-preview/1.');
  if (typeof project.name !== 'string' || !project.name.trim() || project.name.length > 120) {
    throw new Error('У проекта должно быть имя длиной от 1 до 120 символов.');
  }
  const entry = filePath(project.entry);
  if (!record(project.files)) throw new Error('В пакете отсутствует список files.');
  const names = Object.keys(project.files);
  if (!names.length || names.length > MAX_FILES) throw new Error('Некорректное количество файлов.');
  for (const name of names) {
    filePath(name);
    const file = project.files[name];
    if (!record(file) || typeof file.data !== 'string' || !['utf8', 'base64'].includes(file.encoding)) {
      throw new Error(`Некорректная запись файла: ${name}`);
    }
    if (file.encoding === 'base64' && !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(file.data)) {
      throw new Error(`Повреждён Base64 файла: ${name}`);
    }
  }
  if (!Object.hasOwn(project.files, entry) || project.files[entry].encoding !== 'utf8' || !/\.(?:c?js)$/.test(entry)) {
    throw new Error('Точка входа должна указывать на JavaScript-файл внутри пакета.');
  }
  return project;
}

module.exports = { FORMAT, MAX_TEXT_LENGTH, parsePackage, filePath };
