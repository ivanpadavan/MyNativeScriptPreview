import { Button, File, GridLayout, Label, Page, StackLayout } from '@nativescript/core';
import { Canvas } from '@nativescript/canvas';

export function createPage(context) {
  const page = new Page();
  page.actionBar.title = 'Particle Canvas';
  page.backgroundColor = '#090b17';
  const root = new GridLayout();
  root.rows = '*,auto';
  const canvas = new Canvas();
  canvas.automationText = 'particle-canvas';
  root.addChild(canvas);
  const footer = new StackLayout();
  footer.padding = 18;
  GridLayout.setRow(footer, 1);
  const status = new Label();
  status.text = 'Подготовка Canvas…';
  status.color = '#b4bcdd';
  status.automationText = 'canvas-render-result';
  footer.addChild(status);
  const theme = new Button();
  theme.text = 'Сменить палитру';
  theme.automationText = 'canvas-theme';
  theme.color = '#d1baff';
  footer.addChild(theme);
  root.addChild(footer);
  let timer;
  let palette = 0;
  let tick = 0;
  let disposed = false;
  let ctx;
  const colors = JSON.parse(File.fromPath(context.resourcePath('assets/palette.json')).readTextSync());
  function paint() {
    const width = canvas.width;
    const height = canvas.height;
    ctx.fillStyle = '#090b17';
    ctx.fillRect(0, 0, width, height);
    for (let i = 0; i < 80; i++) {
      const angle = i * 2.39996 + tick * 0.012;
      const radius = Math.sqrt((i + 1) / 80) * Math.min(width, height) * 0.4;
      const x = width / 2 + Math.cos(angle) * radius;
      const y = height / 2 + Math.sin(angle) * radius;
      ctx.beginPath();
      ctx.arc(x, y, 2 + (i % 5), 0, Math.PI * 2);
      ctx.fillStyle = colors[(i + palette) % colors.length];
      ctx.globalAlpha = 0.45 + (Math.sin(i + tick * 0.03) + 1) * 0.25;
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    tick++;
  }
  canvas.on('ready', () => {
    if (disposed || timer) return;
    try {
      canvas.width = Math.max(240, Math.round(canvas.getActualSize().width));
      canvas.height = Math.max(320, Math.round(canvas.getActualSize().height));
      ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas 2D недоступен');
      paint();
      const pixel = ctx.getImageData(0, 0, 1, 1).data;
      if (pixel[0] !== 9 || pixel[1] !== 11 || pixel[2] !== 23) throw new Error('Canvas: неверный результат чтения пикселя');
      status.text = 'Canvas: ready · 80 частиц';
      timer = setInterval(paint, 32);
    } catch (error) { status.text = String(error); }
  });
  theme.on('tap', () => { palette++; if (ctx) paint(); status.text = `Canvas: ready · палитра ${palette + 1}`; });
  context.onDispose(() => { disposed = true; if (timer) clearInterval(timer); });
  page.content = root;
  return page;
}
