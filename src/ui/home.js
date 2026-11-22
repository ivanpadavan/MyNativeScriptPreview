const {
  ActionItem, Button, GridLayout, Label, Page, StackLayout, TextView,
} = require('@nativescript/core');
const { parsePackage } = require('../../shared/package.cjs');
const { createGuest } = require('../runtime/loader');
const storage = require('../runtime/storage');
const { ProjectPasteControl } = require('./paste.ios');

function label(text, className) {
  const view = new Label();
  view.text = text;
  view.textWrap = true;
  view.className = className;
  return view;
}

function createHome() {
  const page = new Page();
  page.actionBar.title = 'NativeScript Preview';
  const layout = new GridLayout();
  layout.rows = 'auto, auto, *, auto';
  layout.padding = 20;
  const header = new StackLayout();
  header.addChild(label('Вставьте проект', 'title'));
  header.addChild(label('Скопируйте весь файл .preview.txt из CI, вставьте его и нажмите «Запустить».', 'body'));
  layout.addChild(header);

  const editor = new TextView();
  // NativeScript implements TextView.hint by putting placeholder text into the
  // native UITextView. A paste target need not be focused, so keep instructions
  // outside the editor rather than risking insertion into placeholder content.
  editor.className = 'editor';
  editor.automationText = 'project-text';
  editor.autocorrect = false;
  GridLayout.setRow(editor, 2);
  layout.addChild(editor);

  // Keep the primary actions above the editor: focusing UITextView must never
  // put Run underneath the keyboard. The navigation bar also offers an explicit
  // dismissal, including when the pasted package is invalid.
  const dismiss = new ActionItem();
  dismiss.text = 'Готово';
  dismiss.automationText = 'dismiss-keyboard';
  dismiss.ios.position = 'right';
  dismiss.on('tap', () => editor.dismissSoftInput());
  page.actionBar.actionItems.addItem(dismiss);

  const actions = new GridLayout();
  actions.columns = 'auto, *';
  actions.marginBottom = 12;
  GridLayout.setRow(actions, 1);
  layout.addChild(actions);
  const footer = new StackLayout();
  GridLayout.setRow(footer, 3);
  const paste = new ProjectPasteControl(editor);
  paste.on('pasteError', (args) => { errorView.text = args.message; });
  actions.addChild(paste);
  const run = new Button();
  run.text = 'Запустить';
  run.automationText = 'run-project';
  run.className = 'primary';
  GridLayout.setColumn(run, 1);
  actions.addChild(run);
  const clear = new Button();
  clear.text = 'Очистить текст';
  clear.automationText = 'clear-project-text';
  clear.className = 'secondary';
  clear.on('tap', () => { editor.text = ''; editor.dismissSoftInput(); });
  footer.addChild(clear);
  const reopen = new Button();
  reopen.text = 'Открыть сохранённый проект';
  reopen.automationText = 'open-saved-project';
  reopen.className = 'secondary';
  reopen.isEnabled = false;
  footer.addChild(reopen);
  const errorView = label('', 'error');
  errorView.automationText = 'import-error';
  footer.addChild(errorView);
  footer.addChild(label('После импорта проект доступен без сети. Core • iOS • ns-preview/1', 'muted'));
  layout.addChild(footer);
  page.content = layout;

  let saved = null;
  let busy = true;
  run.isEnabled = false;

  async function launch(raw) {
    if (busy) return;
    editor.dismissSoftInput();
    busy = true;
    run.isEnabled = false;
    reopen.isEnabled = false;
    errorView.text = '';
    let directory;
    let guest;
    try {
      const project = parsePackage(raw);
      directory = await storage.stage(project);
      guest = createGuest(project, directory);
      const back = new ActionItem();
      back.text = 'Оболочка';
      back.ios.position = 'left';
      back.on('tap', () => page.frame.goBack());
      guest.page.actionBar.actionItems.addItem(back);
      guest.page.once(Page.loadedEvent, () => {
        try {
          storage.save(raw);
          saved = { raw, project };
          reopen.isEnabled = true;
        } catch (error) { errorView.text = `Ошибка сохранения: ${error.message || error}`; }
      });
      guest.page.on(Page.navigatedFromEvent, (args) => {
        if (!args.isBackNavigation) return;
        guest.dispose();
        storage.removeStage(directory).catch((error) => console.error(error));
      });
      page.frame.navigate({ create: () => guest.page });
    } catch (error) {
      if (guest) guest.dispose();
      if (directory) await storage.removeStage(directory).catch(console.error);
      errorView.text = `Ошибка импорта: ${error.message || String(error)}`;
      console.error(error.stack || error);
    } finally {
      busy = false;
      run.isEnabled = true;
      reopen.isEnabled = Boolean(saved);
    }
  }

  run.on('tap', () => launch(editor.text));
  reopen.on('tap', () => { if (saved) launch(saved.raw); });
  page.once(Page.loadedEvent, async () => {
    try {
      await storage.clearAbandonedStages();
      saved = await storage.readSaved();
      reopen.isEnabled = Boolean(saved);
    } catch (error) { errorView.text = `Ошибка сохранённого проекта: ${error.message || error}`; }
    finally { busy = false; run.isEnabled = true; }
  });
  return page;
}

module.exports = { createHome };
