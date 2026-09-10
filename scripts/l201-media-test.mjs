import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let server, browser, base;

before(async () => {
  server = http.createServer(async (req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const relative = pathname.replace(/^\/campus\//, '/');
    const file = path.resolve(root, `.${relative === '/' ? '/index.html' : relative}`);
    if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    try {
      const data = await readFile(file);
      const types = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.png': 'image/png',
        '.mp3': 'audio/mpeg',
        '.ogg': 'audio/ogg'
      };
      res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' }).end(data);
    } catch { res.writeHead(404).end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch();
});

after(async () => {
  await browser?.close();
  if (server) await new Promise(resolve => server.close(resolve));
});

async function pageFor(t) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  context.on('page', page => page.on('pageerror', error => errors.push(error.message)));
  t.after(async () => {
    await context.close();
    assert.deepEqual(errors, [], 'Errores no capturados en L201');
  });
  const page = await context.newPage();
  page.setDefaultTimeout(5000);
  return page;
}

test('L201: barra de media reemplaza chevrons inferiores y prev/next cambian lámina', async t => {
  const p = await pageFor(t);
  await p.goto(base + '/tools/leccion-enfoque-formas-recta.html');
  const snap = await p.evaluate(() => {
    const api = window.__L201;
    const bar = document.querySelector('[data-enfoque-media="bar"]');
    const lowerChevrons = document.querySelectorAll('.enfoque-pager--lamina');
    const upper = document.querySelectorAll('.enfoque-pager--eleccion');
    const first = document.querySelector('.enfoque-slide[data-slide="0"]');
    return {
      hasApi: !!api,
      tab: api.index(),
      slide: api.slide(),
      count: api.slideCount(),
      hasBar: !!bar,
      lowerChevrons: lowerChevrons.length,
      upper: upper.length,
      audio0: first && first.getAttribute('data-audio'),
      candidates: api.audioCandidates()
    };
  });
  assert.equal(snap.hasApi, true);
  assert.equal(snap.tab, 0);
  assert.equal(snap.slide, 0);
  assert.ok(snap.count >= 2, 'Teoría tiene más de una lámina');
  assert.equal(snap.hasBar, true);
  assert.equal(snap.lowerChevrons, 0);
  assert.equal(snap.upper, 2);
  assert.equal(snap.audio0, 'audio/l201/teoria-0.mp3');
  assert.deepEqual(snap.candidates, ['audio/l201/teoria-0.mp3', 'audio/l201/teoria-0.ogg']);

  await p.click('[data-enfoque-nav="lamina"][data-enfoque-dir="next"]');
  const afterNext = await p.evaluate(() => ({
    tab: window.__L201.index(),
    slide: window.__L201.slide(),
    hidden0: document.querySelector('.enfoque-slide[data-slide="0"]').hidden,
    hidden1: document.querySelector('.enfoque-slide[data-slide="1"]').hidden,
    candidates: window.__L201.audioCandidates()
  }));
  assert.equal(afterNext.tab, 0, 'Next no cambia de etiqueta');
  assert.equal(afterNext.slide, 1);
  assert.equal(afterNext.hidden0, true);
  assert.equal(afterNext.hidden1, false);
  assert.deepEqual(afterNext.candidates, ['audio/l201/teoria-1.mp3', 'audio/l201/teoria-1.ogg']);

  await p.click('[data-enfoque-nav="lamina"][data-enfoque-dir="prev"]');
  const afterPrev = await p.evaluate(() => window.__L201.slide());
  assert.equal(afterPrev, 0);
});

test('L201: Play sin archivo muestra hint; mute cambia estado', async t => {
  const p = await pageFor(t);
  await p.goto(base + '/tools/leccion-enfoque-formas-recta.html');
  await p.click('[data-enfoque-media="play"]');
  await p.waitForFunction(() => {
    const hint = document.querySelector('.enfoque-media-hint');
    return hint && hint.textContent.indexOf('Sin audio aún') !== -1;
  });
  const mutedBefore = await p.evaluate(() => window.__L201.muted());
  await p.click('[data-enfoque-media="mute"]');
  const mutedAfter = await p.evaluate(() => window.__L201.muted());
  assert.notEqual(mutedAfter, mutedBefore);
});

test('L201: panel compañero en Teoría y elección sigue arriba', async t => {
  const p = await pageFor(t);
  await p.goto(base + '/tools/leccion-enfoque-formas-recta.html');
  const ui = await p.evaluate(() => {
    const companion = document.querySelector('.enfoque-companion');
    const sketch = document.querySelector('.enfoque-sketch-row .enfoque-sketch');
    const upper = document.querySelector('.enfoque-pager--eleccion.next');
    const tabBefore = window.__L201.index();
    return {
      text: companion && companion.textContent.trim(),
      hasSketch: !!sketch,
      upperTop: upper && upper.getBoundingClientRect().top,
      mediaTop: document.querySelector('[data-enfoque-media="bar"]').getBoundingClientRect().top,
      tabBefore
    };
  });
  assert.equal(
    ui.text,
    'Las rectas horizontales y oblicuas son funciones, y las rectas verticales no son funciones.'
  );
  assert.equal(ui.hasSketch, true);
  assert.ok(ui.upperTop < ui.mediaTop, 'Elección arriba, media abajo');

  await p.click('.enfoque-pager--eleccion.next');
  const tabAfter = await p.evaluate(() => window.__L201.index());
  assert.equal(tabAfter, ui.tabBefore + 1);
});
