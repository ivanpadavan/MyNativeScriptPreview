const { ActionItem, Button, GridLayout, Image, ImageSource, Label, Page, ScrollView, StackLayout, confirm } = require('@nativescript/core');
const storage = require('../runtime/storage');
const { packages } = require('../runtime/catalog');
const { openSession } = require('../runtime/session');
const { createImport } = require('./import');

function label(text, className) {
  const view = new Label();
  view.text = text;
  view.textWrap = true;
  view.className = className;
  return view;
}

function createHome() {
  const page = new Page();
  page.className = 'launcher';
  page.statusBarStyle = 'light';
  page.actionBar.title = 'Preview';
  page.actionBar.backgroundColor = '#0d1017';
  page.actionBar.color = '#ffffff';
  page.actionBar.flat = true;
  const addAction = new ActionItem();
  const add = new Button();
  add.text = '+';
  add.automationText = 'add-project';
  add.className = 'launcher-add';
  add.width = 44; add.height = 44;
  addAction.actionView = add;
  addAction.ios.position = 'right';
  page.actionBar.actionItems.addItem(addAction);

  const scroll = new ScrollView();
  scroll.scrollBarIndicatorVisible = false;
  const content = new StackLayout();
  content.padding = '14 20 28';
  scroll.content = content;
  page.content = scroll;
  let opening = false;

  function importProject() {
    if (!opening) page.frame.navigate({ create: () => createImport() });
  }
  add.on('tap', importProject);

  async function refresh() {
    try {
      const apps = await storage.listApps();
      content.removeChildren();
      content.addChild(label('Ваши приложения', 'launcher-title'));
      content.addChild(label('Одна библиотека. Любые истории.', 'launcher-description'));
      const banner = new GridLayout();
      banner.columns = '*,auto';
      banner.className = 'launcher-banner';
      const message = new StackLayout();
      message.addChild(label('Из строки — в приложение', 'launcher-card-title'));
      message.addChild(label('Вставьте пакет. Он останется на iPhone.', 'launcher-caption'));
      banner.addChild(message);
      const paste = new Button();
      paste.text = 'Добавить';
      paste.automationText = 'import-from-library';
      paste.className = 'launcher-primary';
      paste.on('tap', importProject);
      GridLayout.setColumn(paste, 1);
      banner.addChild(paste);
      content.addChild(banner);
      const count = label(`БИБЛИОТЕКА · ${apps.length}`, 'launcher-section');
      count.automationText = 'library-count';
      content.addChild(count);
      const error = label('', 'error');
      error.automationText = 'launcher-error';
      content.addChild(error);

      if (!apps.length) {
        const empty = new StackLayout();
        empty.className = 'launcher-empty';
        empty.addChild(label('＋', 'launcher-empty-icon'));
        empty.addChild(label('Здесь начинается\nваша коллекция', 'launcher-empty-title'));
        empty.addChild(label('Скопируйте .preview.txt из примера или своего проекта и нажмите «Добавить».', 'launcher-caption'));
        content.addChild(empty);
      }
      const grid = new GridLayout();
      grid.columns = '*,*';
      grid.rows = Array(Math.ceil(apps.length / 2)).fill('auto').join(',');
      for (const [index, record] of apps.entries()) {
        const card = new StackLayout();
        card.className = 'launcher-card';
        card.marginRight = index % 2 === 0 ? 6 : 0;
        card.marginLeft = index % 2 === 1 ? 6 : 0;
        GridLayout.setRow(card, Math.floor(index / 2));
        GridLayout.setColumn(card, index % 2);
        const top = new GridLayout();
        top.columns = '*,40';
        let icon;
        if (record.iconBase64) {
          try {
            const source = ImageSource.fromBase64Sync(record.iconBase64);
            if (source) { icon = new Image(); icon.imageSource = source; }
          } catch (problem) { console.error(problem); }
        }
        if (!icon) icon = label(record.name.slice(0, 2).toUpperCase(), 'launcher-monogram');
        icon.width = 48; icon.height = 48; icon.borderRadius = 14;
        icon.backgroundColor = record.color;
        icon.horizontalAlignment = 'left';
        top.addChild(icon);
        const menu = new Button();
        menu.text = '•••';
        menu.className = 'launcher-menu';
        menu.automationText = `delete-app-${record.name}`;
        GridLayout.setColumn(menu, 1);
        menu.on('tap', async () => {
          if (opening) return;
          if (await confirm({ title: `Удалить «${record.name}»?`, message: 'Приложение и его файлы данных будут удалены.', okButtonText: 'Удалить', cancelButtonText: 'Отмена' })) {
            try { await storage.deleteApp(record.id); await refresh(); }
            catch (problem) { error.text = problem.message || String(problem); }
          }
        });
        top.addChild(menu);
        card.addChild(top);
        const title = label(record.name, 'launcher-card-title');
        title.marginTop = 14;
        title.height = 42;
        card.addChild(title);
        const description = label(record.description || 'Готово к запуску · офлайн', 'launcher-caption');
        description.height = 42;
        card.addChild(description);
        const open = new Button();
        open.text = 'Открыть';
        open.automationText = `open-app-${record.name}`;
        open.className = 'launcher-open';
        open.on('tap', async () => {
          if (opening) return;
          opening = true;
          error.text = '';
          try { await openSession(page, record, () => { opening = false; refresh(); }); }
          catch (problem) { opening = false; error.text = `Ошибка запуска: ${problem.message || problem}`; }
        });
        card.addChild(open);
        grid.addChild(card);
      }
      content.addChild(grid);
      const plugins = new Button();
      plugins.text = `${packages.length - 1} встроенных плагина  ›`;
      plugins.automationText = 'show-plugins';
      plugins.className = 'launcher-plugins';
      plugins.on('tap', () => {
        page.frame.navigate({ create: () => {
          const info = new Page();
          info.actionBar.title = 'Встроенные модули';
          const list = new ScrollView();
          const names = label(packages.join('\n\n'), 'plugin-list');
          names.padding = 20;
          list.content = names;
          info.content = list;
          return info;
        } });
      });
      content.addChild(plugins);
      content.addChild(label('Собрать → скопировать → добавить → открыть', 'launcher-footnote'));
    } catch (problem) {
      content.removeChildren();
      content.addChild(label(`Ошибка библиотеки: ${problem.message || problem}`, 'error'));
    }
  }

  page.once(Page.loadedEvent, async () => {
    await storage.clearAbandonedStages().catch(console.error);
    await refresh();
  });
  page.on(Page.navigatedToEvent, refresh);
  return page;
}

module.exports = { createHome };
