import { Button, File, Label, Page, StackLayout, path } from '@nativescript/core';
import { Haptics } from '@nativescript/haptics';

export function createPage(context) {
  const page = new Page();
  page.actionBar.title = 'Tap Counter';
  page.backgroundColor = '#15111f';
  const layout = new StackLayout();
  layout.padding = 28;
  layout.verticalAlignment = 'middle';
  const destination = path.join(context.dataPath, 'counter.txt');
  let count = File.exists(destination) ? Number(File.fromPath(destination).readTextSync()) || 0 : 0;
  const value = new Label();
  value.fontSize = 88;
  value.fontWeight = 'bold';
  value.color = '#ffb383';
  value.textAlignment = 'center';
  value.automationText = 'counter-value';
  function update() {
    value.text = String(count);
    File.fromPath(destination).writeTextSync(String(count));
  }
  update();
  layout.addChild(value);
  const tap = new Button();
  tap.text = 'Ещё один';
  tap.automationText = 'counter-increment';
  tap.backgroundColor = '#ffb383';
  tap.color = '#15111f';
  tap.borderRadius = 18;
  tap.height = 60;
  tap.on('tap', () => { count++; update(); if (Haptics.isSupported()) Haptics.selection(); });
  layout.addChild(tap);
  const reset = new Button();
  reset.text = 'Начать заново';
  reset.automationText = 'counter-reset';
  reset.color = '#d1bddb';
  reset.on('tap', () => { count = 0; update(); });
  layout.addChild(reset);
  page.content = layout;
  return page;
}
