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
        '.png': 'image/png'
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
    assert.deepEqual(errors, [], 'Errores no capturados en L199');
  });
  const page = await context.newPage();
  page.setDefaultTimeout(5000);
  await page.addInitScript(() => {
    try { sessionStorage.clear(); } catch (err) { /* private mode */ }
  });
  return page;
}

test('L199: Home arranca en Lección ± y slides inactivas', async t => {
  const p = await pageFor(t);
  await p.goto(base + '/tools/leccion-plantilla-shell.html');
  const snap = await p.evaluate(() => {
    const api = window.__L199;
    const shell = document.querySelector('[data-plantilla="l199"]');
    return {
      hasApi: !!api,
      axis: api && api.axis(),
      rail: api && api.rail(),
      slideCount: api && api.slideCount(),
      foco: api && api.foco(),
      dataAxis: shell && shell.getAttribute('data-axis'),
      lessonFocus: document.querySelector('.plantilla-lesson .plantilla-axis-label')?.textContent,
      caption: document.querySelector('.plantilla-stage-caption')?.textContent,
      prevDisabled: document.querySelector('.plantilla-pager.prev')?.disabled,
      nextDisabled: document.querySelector('.plantilla-pager.next')?.disabled,
      placeholder: document.querySelector('.plantilla-slide-title')?.textContent
    };
  });
  assert.equal(snap.hasApi, true);
  assert.equal(snap.axis, 'leccion');
  assert.equal(snap.dataAxis, 'leccion');
  assert.equal(snap.rail, null);
  assert.equal(snap.slideCount, 0);
  assert.equal(snap.foco, false);
  assert.equal(snap.lessonFocus, 'FOCO: Lección ±');
  assert.match(snap.caption, /inactivo hasta elegir tab/);
  assert.equal(snap.prevDisabled, true);
  assert.equal(snap.nextDisabled, true);
  assert.match(snap.placeholder, /placeholder/i);
});

test('L199: tab números habilita slides; eje ámbar al avanzar', async t => {
  const p = await pageFor(t);
  await p.goto(base + '/tools/leccion-plantilla-shell.html');
  await p.click('.plantilla-rail--left .plantilla-rail-toggle');
  const afterTab = await p.evaluate(() => {
    const api = window.__L199;
    const shell = document.querySelector('[data-plantilla="l199"]');
    return {
      left: shell.getAttribute('data-left'),
      right: shell.getAttribute('data-right'),
      rail: api.rail(),
      item: api.item(),
      slide: api.slide(),
      count: api.slideCount(),
      axis: api.axis(),
      dataAxis: document.querySelector('[data-plantilla="l199"]')?.getAttribute('data-axis'),
      title: document.querySelector('.plantilla-slide-title')?.textContent,
      nums: [...document.querySelectorAll('.plantilla-num')].map((b) => b.textContent),
      dots: document.querySelector('.plantilla-dots')?.textContent,
      caption: document.querySelector('.plantilla-stage-caption')?.textContent,
      nextDisabled: document.querySelector('.plantilla-pager.next')?.disabled
    };
  });
  assert.equal(afterTab.left, 'open');
  assert.equal(afterTab.right, 'shut');
  assert.equal(afterTab.rail, 'left');
  assert.equal(afterTab.item, 0);
  assert.equal(afterTab.slide, 0);
  assert.equal(afterTab.count, 3);
  assert.equal(afterTab.axis, 'idle');
  assert.equal(afterTab.dataAxis, 'idle');
  assert.match(afterTab.title, /eje números/);
  assert.deepEqual(afterTab.nums, ['1', '2', '3']);
  assert.match(afterTab.dots, /●/);
  assert.match(afterTab.caption, /activo/);
  assert.equal(afterTab.nextDisabled, false);

  await p.click('[data-plantilla-nav="slide"][data-plantilla-dir="next"]');
  const afterSlide = await p.evaluate(() => {
    const api = window.__L199;
    const shell = document.querySelector('[data-plantilla="l199"]');
    return {
      axis: api.axis(),
      slide: api.slide(),
      dataAxis: shell.getAttribute('data-axis'),
      title: document.querySelector('.plantilla-slide-title')?.textContent,
      caption: document.querySelector('.plantilla-stage-caption')?.textContent
    };
  });
  assert.equal(afterSlide.axis, 'slide');
  assert.equal(afterSlide.dataAxis, 'slide');
  assert.equal(afterSlide.slide, 1);
  assert.match(afterSlide.title, /FOCO horizontal|Slide 2/);
  assert.match(afterSlide.caption, /FOCO: Slide/);
});

test('L199: riel colores y Modo Foco ocultan chrome', async t => {
  const p = await pageFor(t);
  await p.goto(base + '/tools/leccion-plantilla-shell.html');
  await p.click('.plantilla-rail--right .plantilla-rail-toggle');
  const colors = await p.evaluate(() => {
    const api = window.__L199;
    const shell = document.querySelector('[data-plantilla="l199"]');
    return {
      left: shell.getAttribute('data-left'),
      right: shell.getAttribute('data-right'),
      rail: api.rail(),
      title: document.querySelector('.plantilla-slide-title')?.textContent,
      swatches: document.querySelectorAll('.plantilla-swatch').length
    };
  });
  assert.equal(colors.left, 'shut');
  assert.equal(colors.right, 'open');
  assert.equal(colors.rail, 'right');
  assert.match(colors.title, /colores|color/i);
  assert.equal(colors.swatches, 3);

  await p.click('[data-plantilla="foco"]');
  const foco = await p.evaluate(() => {
    const api = window.__L199;
    const shell = document.querySelector('[data-plantilla="l199"]');
    const top = document.querySelector('.plantilla-top');
    const header = document.querySelector('.wrap > header');
    const bar = document.querySelector('.campus-lesson-bar-wrap');
    return {
      on: api.foco(),
      data: shell.getAttribute('data-foco'),
      body: document.body.getAttribute('data-l199-foco'),
      topDisplay: getComputedStyle(top).display,
      headerDisplay: header ? getComputedStyle(header).display : 'none',
      barDisplay: bar ? getComputedStyle(bar).display : 'none',
      exit: document.querySelector('[data-plantilla="foco-exit"]')?.textContent
    };
  });
  assert.equal(foco.on, true);
  assert.equal(foco.data, 'on');
  assert.equal(foco.body, 'on');
  assert.equal(foco.topDisplay, 'none');
  assert.equal(foco.headerDisplay, 'none');
  assert.equal(foco.barDisplay, 'none');
  assert.equal(foco.exit, 'Salir de foco');
});
