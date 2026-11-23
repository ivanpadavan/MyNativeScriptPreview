const { Button, GridLayout, Label, Page, TextView, action } = require('@nativescript/core');
const { parsePackage } = require('../../shared/package.cjs');
const { createGuest } = require('../runtime/loader');
const storage = require('../runtime/storage');
const { ProjectPasteControl } = require('./paste.ios');

function createImport(onImported) {
  const page = new Page();
  page.actionBar.title = 'Добавить приложение';
  page.actionBar.backgroundColor = '#0d1017';
  page.actionBar.color = '#ffffff';
  page.className = 'launcher';
  const layout = new GridLayout();
  layout.padding = 20;
  layout.rows = 'auto,auto,auto,*,auto';
  const help = new Label();
  help.text = 'Скопируйте весь .preview.txt. Вставьте — и приложение останется в библиотеке.';
  help.textWrap = true;
  help.className = 'launcher-description';
  help.marginBottom = 18;
  layout.addChild(help);

  let raw = '';
  let busy = false;
  const preview = new TextView();
  preview.editable = false;
  preview.className = 'package-preview';
  preview.automationText = 'project-text';
  GridLayout.setRow(preview, 3);
  layout.addChild(preview);
  const status = new Label();
  status.text = 'JSON, JavaScript и ресурсы — одним текстом';
  status.className = 'launcher-caption';
  status.margin = '12 0';
  GridLayout.setRow(status, 2);
  layout.addChild(status);
  const errorView = new Label();
  errorView.automationText = 'import-error';
  errorView.className = 'error';
  errorView.textWrap = true;
  GridLayout.setRow(errorView, 4);
  layout.addChild(errorView);
  const actions = new GridLayout();
  actions.columns = 'auto,*';
  GridLayout.setRow(actions, 1);
  const paste = new ProjectPasteControl({
    set text(value) {
      raw = String(value);
      // Keep the entire packet, but don't render megabytes in UITextView.
      preview.text = raw.length > 12000 ? `${raw.slice(0, 12000)}\n… предпросмотр сокращён; пакет сохранён целиком` : raw;
      status.text = `${raw.length.toLocaleString('ru-RU')} символов · текст вставлен`;
      errorView.text = '';
      add.isEnabled = true;
    },
  });
  paste.on('pasteError', (args) => { errorView.text = args.message; });
  actions.addChild(paste);
  const add = new Button();
  add.text = 'Добавить';
  add.automationText = 'import-project';
  add.className = 'launcher-primary';
  add.isEnabled = false;
  GridLayout.setColumn(add, 1);
  actions.addChild(add);
  layout.addChild(actions);
  page.content = layout;

  add.on('tap', async () => {
    if (busy) return;
    busy = true;
    add.isEnabled = false;
    errorView.text = '';
    let guest;
    let directory;
    try {
      const project = parsePackage(raw);
      const apps = await storage.listApps();
      const previous = apps.find((item) => project.id ? item.packageId === project.id : item.name === project.name);
      let replaceId;
      if (previous) {
        const choice = await action({
          title: `«${project.name}» уже есть`, cancelButtonText: 'Отмена',
          actions: ['Обновить', 'Сохранить копию'],
        });
        if (choice === 'Отмена') return;
        if (choice === 'Обновить') replaceId = previous.id;
      }
      const appId = replaceId || NSUUID.UUID().UUIDString;
      directory = await storage.stage(project);
      // Validate entry/module resolution before replacing an existing app.
      guest = createGuest(project, directory, { appId, dataPath: storage.dataDirectory(appId) });
      guest.dispose();
      guest = null;
      const record = await storage.importApp(raw, replaceId, appId);
      if (onImported) onImported(record);
      page.frame.goBack();
    } catch (error) {
      errorView.text = `Ошибка импорта: ${error.message || String(error)}`;
      console.error(error.stack || error);
    } finally {
      if (guest) guest.dispose();
      if (directory) await storage.removeStage(directory).catch(console.error);
      busy = false;
      add.isEnabled = Boolean(raw);
    }
  });
  return page;
}

module.exports = { createImport };
