# Приложение для NativeScript Launcher

Нужен Node.js 22+. Один раз в папке этого репозитория установите сборщик:

```sh
npm --prefix packager ci
```

Создайте папку `hello` с двумя файлами.

**`hello/preview.project.json`**

```json
{"id":"hello","name":"Hello","entry":"main.js"}
```

**`hello/main.js`**

```js
import { Page, Button, alert } from '@nativescript/core';

export function createPage() {
  const page = new Page();
  page.actionBar.title = 'Hello';
  const button = new Button();
  button.text = 'Привет!';
  button.on('tap', () => alert('Работает!'));
  page.content = button;
  return page;
}
```

Соберите из корня репозитория:

```sh
npm run preview:build -- ./hello
```

Откройте `hello/dist/hello.preview.txt`, скопируйте **весь текст**, добавьте его в лаунчер и откройте карточку Hello.

Все примеры используют этот же сборщик: `cd examples/tap-counter && npm run build`.
Сам сборщик можно вызвать из любой папки: `node /путь/к/репозиторию/packager/cli.mjs build /путь/к/проекту`.

- JS и TypeScript поддерживаются; обычные JS-зависимости устанавливайте в своём проекте — сборщик включит их в пакет.
- Доступные нативные модули: `node packager/cli.mjs modules`. Они уже встроены в IPA; добавление нового нативного плагина требует обновления лаунчера.
- Картинки перечислите в `assets` в `preview.project.json`; путь внутри приложения получите через `createPage(context)` → `context.resourcePath('assets/picture.png')`.
- `Application.run()` не вызывайте. Верните `Page` из `createPage()`. Для своих данных используйте `context.dataPath`, для освобождения ресурсов — `context.onDispose(callback)`.

CI запускает ту же команду и выдаёт тот же файл. Для упаковки не нужны Mac, Xcode или сборка IPA.
