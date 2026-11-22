import { Button, Label, Page, StackLayout } from '@nativescript/core';
import { checkGPU } from './check-gpu';

export function createPage(): Page {
  const page = new Page();
  page.actionBar.title = 'GPU Check';
  const content = new StackLayout();
  content.padding = 24;

  const title = new Label();
  title.text = 'Проверка Background GPU';
  title.textWrap = true;
  title.fontSize = 24;
  content.addChild(title);

  const description = new Label();
  description.text = 'Проверяет доступность API и ресурса. Фоновая GPU-задача не запускается.';
  description.textWrap = true;
  description.marginTop = 16;
  content.addChild(description);

  const button = new Button();
  button.text = 'Проверить GPU';
  button.automationText = 'check-gpu';
  button.marginTop = 24;
  button.on(Button.tapEvent, checkGPU);
  content.addChild(button);
  page.content = content;
  return page;
}
