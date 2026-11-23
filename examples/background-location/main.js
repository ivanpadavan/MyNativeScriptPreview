import { Button, File, Label, Page, StackLayout, path, CoreTypes } from '@nativescript/core';
import * as location from '@nativescript/geolocation';

export function createPage(context) {
  const page = new Page();
  page.actionBar.title = 'Location Journal';
  const layout = new StackLayout();
  layout.padding = 24;
  const file = File.fromPath(path.join(context.dataPath, 'locations.json'));
  let entries;
  try { entries = JSON.parse(file.readTextSync() || '[]'); } catch (_) { entries = []; }
  const status = new Label();
  status.text = 'Геолокация остановлена';
  status.automationText = 'location-status';
  status.textWrap = true;
  status.fontSize = 20;
  layout.addChild(status);
  const journal = new Label();
  journal.automationText = 'location-journal';
  journal.textWrap = true;
  journal.marginTop = 20;
  function display() {
    journal.text = entries.length ? entries.slice(-12).reverse().map((entry) => `${entry.latitude.toFixed(5)}, ${entry.longitude.toFixed(5)}`).join('\n') : 'Журнал пуст';
  }
  display();
  let watch;
  let generation = 0;
  let disposed = false;
  const start = new Button();
  start.text = 'Начать отслеживание';
  start.automationText = 'location-start';
  function stop() {
    generation++;
    if (watch !== undefined) location.clearWatch(watch);
    watch = undefined;
    start.isEnabled = true;
    status.text = 'Геолокация остановлена';
  }
  start.on('tap', async () => {
    const token = ++generation;
    start.isEnabled = false;
    try {
      await location.enableLocationRequest(true);
      if (disposed || token !== generation) return;
      const id = await location.watchLocation((point) => {
        if (disposed || token !== generation) return;
        entries.push({ latitude: point.latitude, longitude: point.longitude, time: Date.now() });
        entries = entries.slice(-200);
        file.writeTextSync(JSON.stringify(entries));
        status.text = `Обновлений: ${entries.length}`;
        display();
      }, (error) => { status.text = String(error); }, {
        desiredAccuracy: CoreTypes.Accuracy.high, updateDistance: 1,
        iosAllowsBackgroundLocationUpdates: true, iosPausesLocationUpdatesAutomatically: false,
      });
      if (disposed || token !== generation) location.clearWatch(id);
      else { watch = id; if (!entries.length) status.text = 'Ожидаем координаты…'; }
    } catch (error) { if (!disposed) { status.text = String(error); start.isEnabled = true; } }
  });
  layout.addChild(start);
  const end = new Button();
  end.text = 'Остановить';
  end.automationText = 'location-stop';
  end.on('tap', stop);
  layout.addChild(end);
  layout.addChild(journal);
  context.onDispose(() => { disposed = true; stop(); });
  page.content = layout;
  return page;
}
