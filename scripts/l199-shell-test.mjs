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
  const css = [];
  p.on('request', (req) => {
    if (req.url().includes('.css')) css.push(req.url());
  });
  await p.goto(base + '/tools/leccion-plantilla-shell.html');
  assert.equal(css.some((url) => url.includes('enfoque-tabs.css')), false, 'L199 no pide enfoque-tabs.css');
  assert.equal(css.some((url) => url.includes('plantilla-shell.css')), true, 'L199 carga plantilla-shell.css');
  assert.equal(css.some((url) => url.includes('lesson-shell.css')), true, 'L199 carga lesson-shell.css');
  const snap = await p.evaluate(() => {
    const api = window.__L199;
    const shell = document.querySelector('[data-plantilla="l199"]');
    const top = document.querySelector('.plantilla-top');
    const lesson = document.querySelector('.plantilla-lesson');
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
      placeholder: document.querySelector('.plantilla-slide-title')?.textContent,
      headingVisible: !!document.querySelector('.wrap > header h1') &&
        getComputedStyle(document.querySelector('.wrap > header')).display !== 'none',
      dropdown: document.body.innerText.includes('Colores ▾'),
      leftNums: [...document.querySelectorAll('.plantilla-rail--left .plantilla-item')].length,
      swatches: document.querySelectorAll('.plantilla-swatch').length,
      topBorder: top ? getComputedStyle(top).borderTopColor : '',
      lessonBorder: lesson ? getComputedStyle(lesson).borderTopColor : ''
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
  assert.equal(snap.headingVisible, true, 'El h1 de página queda visible para la barra Campus');
  assert.equal(snap.dropdown, false, 'Rieles visibles, no lista Colores ▾');
  assert.equal(snap.leftNums, 6, 'Riel izquierdo muestra Nº 1–6');
  assert.equal(snap.swatches, 9, 'Riel derecho muestra swatches de color');
  assert.match(snap.topBorder, /rgb\(89,\s*166,\s*255\)/, 'FOCO Lección ± pinta el borde del eje de azul');
});

test('L199: tab números habilita slides; eje ámbar al avanzar', async t => {
  const p = await pageFor(t);
  await p.goto(base + '/tools/leccion-plantilla-shell.html');
  await p.click('.plantilla-rail--left .plantilla-item');
  const afterTab = await p.evaluate(() => {
    const api = window.__L199;
    const shell = document.querySelector('[data-plantilla="l199"]');
    const kicker = document.querySelector('.plantilla-form-kicker');
    const title = document.querySelector('.plantilla-slide-title');
    const kickerBox = kicker?.getBoundingClientRect();
    const titleBox = title?.getBoundingClientRect();
    return {
      left: shell.getAttribute('data-left'),
      right: shell.getAttribute('data-right'),
      rail: api.rail(),
      item: api.item(),
      slide: api.slide(),
      count: api.slideCount(),
      axis: api.axis(),
      dataAxis: document.querySelector('[data-plantilla="l199"]')?.getAttribute('data-axis'),
      title: title?.textContent,
      kicker: kicker?.textContent,
      chipsAbove: !!(kickerBox && titleBox && kickerBox.bottom <= titleBox.top + 2),
      nums: [...document.querySelectorAll('.plantilla-num')].map((b) => b.textContent),
      dots: document.querySelector('.plantilla-dots')?.textContent,
      caption: document.querySelector('.plantilla-stage-caption')?.textContent,
      nextDisabled: document.querySelector('.plantilla-pager.next')?.disabled,
      formula: document.querySelector('.plantilla-formula')?.textContent
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
  assert.match(afterTab.title, /Implícita|eje números/);
  assert.match(afterTab.kicker, /FORMA 1/);
  assert.equal(afterTab.chipsAbove, true, 'Chips de slide quedan arriba del título');
  assert.deepEqual(afterTab.nums, ['1', '2', '3']);
  assert.match(afterTab.dots, /●/);
  assert.match(afterTab.caption, /activo/);
  assert.equal(afterTab.nextDisabled, false);
  assert.match(afterTab.formula || '', /ax \+ by \+ c/);

  await p.click('[data-plantilla-nav="slide"][data-plantilla-dir="next"]');
  const afterSlide = await p.evaluate(() => {
    const api = window.__L199;
    const shell = document.querySelector('[data-plantilla="l199"]');
    const stage = document.querySelector('.plantilla-stage');
    return {
      axis: api.axis(),
      slide: api.slide(),
      dataAxis: shell.getAttribute('data-axis'),
      title: document.querySelector('.plantilla-slide-title')?.textContent,
      caption: document.querySelector('.plantilla-stage-caption')?.textContent,
      stageBorder: stage ? getComputedStyle(stage).borderTopColor : '',
      slideFoco: document.querySelector('.plantilla-slide-foco')?.textContent
    };
  });
  assert.equal(afterSlide.axis, 'slide');
  assert.equal(afterSlide.dataAxis, 'slide');
  assert.equal(afterSlide.slide, 1);
  assert.match(afterSlide.title, /FOCO horizontal|Slide 2/);
  assert.match(afterSlide.caption, /FOCO: Slide/);
  assert.match(afterSlide.slideFoco, /FOCO: Slide/);
  assert.match(afterSlide.stageBorder, /rgb\(255,\s*184,\s*71\)/, 'FOCO Slide ◀▶ pinta el borde del eje de ámbar');
});

test('L199: riel colores y Modo Foco ocultan chrome', async t => {
  const p = await pageFor(t);
  await p.goto(base + '/tools/leccion-plantilla-shell.html');
  await p.click('.plantilla-rail--right .plantilla-item');
  const colors = await p.evaluate(() => {
    const api = window.__L199;
    const shell = document.querySelector('[data-plantilla="l199"]');
    return {
      left: shell.getAttribute('data-left'),
      right: shell.getAttribute('data-right'),
      rail: api.rail(),
      title: document.querySelector('.plantilla-slide-title')?.textContent,
      swatches: document.querySelectorAll('.plantilla-swatch').length,
      letters: [...document.querySelectorAll('.plantilla-swatch-letter')].map((n) => n.textContent),
      dropdown: document.body.innerText.includes('Colores ▾')
    };
  });
  assert.equal(colors.left, 'shut');
  assert.equal(colors.right, 'open');
  assert.equal(colors.rail, 'right');
  assert.match(colors.title, /colores|color/i);
  assert.equal(colors.swatches, 9);
  assert.deepEqual(colors.letters.slice(0, 3), ['A', 'B', 'C']);
  assert.equal(colors.dropdown, false);

  await p.click('[data-plantilla="foco"]');
  const foco = await p.evaluate(() => {
    const api = window.__L199;
    const shell = document.querySelector('[data-plantilla="l199"]');
    const top = document.querySelector('.plantilla-top');
    const header = document.querySelector('.wrap > header');
    const bar = document.querySelector('.campus-lesson-bar-wrap');
    const media = document.querySelector('[data-plantilla-media="bar"]');
    return {
      on: api.foco(),
      data: shell.getAttribute('data-foco'),
      body: document.body.getAttribute('data-l199-foco'),
      topDisplay: getComputedStyle(top).display,
      headerDisplay: header ? getComputedStyle(header).display : 'none',
      barDisplay: bar ? getComputedStyle(bar).display : 'none',
      mediaDisplay: media ? getComputedStyle(media).display : 'none',
      exit: document.querySelector('[data-plantilla="foco-exit"]')?.textContent
    };
  });
  assert.equal(foco.on, true);
  assert.equal(foco.data, 'on');
  assert.equal(foco.body, 'on');
  assert.equal(foco.topDisplay, 'none');
  assert.equal(foco.headerDisplay, 'none');
  assert.equal(foco.barDisplay, 'none');
  assert.equal(foco.mediaDisplay, 'none');
  assert.equal(foco.exit, 'Salir de foco');
});

test('L199: barra de media incluye play, tiempo, scrub, PDF, ayuda y volumen', async t => {
  const p = await pageFor(t);
  await p.goto(base + '/tools/leccion-plantilla-shell.html');
  const media = await p.evaluate(() => {
    const bar = document.querySelector('[data-plantilla-media="bar"]');
    const vol = document.querySelector('[data-plantilla-media="volume"]');
    return {
      hasBar: !!bar,
      play: !!document.querySelector('[data-plantilla-media="play"]'),
      time: document.querySelector('.plantilla-media-time')?.textContent,
      dur: document.querySelector('.plantilla-media-dur')?.textContent,
      seek: !!document.querySelector('.plantilla-media-seek'),
      pdf: !!document.querySelector('[data-plantilla-media="pdf"]'),
      help: !!document.querySelector('[data-plantilla-media="help"]'),
      mute: !!document.querySelector('[data-plantilla-media="mute"]'),
      vol: !!vol,
      volValue: vol && vol.value
    };
  });
  assert.equal(media.hasBar, true);
  assert.equal(media.play, true);
  assert.equal(media.time, '0:00');
  assert.equal(media.dur, '0:00');
  assert.equal(media.seek, true);
  assert.equal(media.pdf, true);
  assert.equal(media.help, true);
  assert.equal(media.mute, true);
  assert.equal(media.vol, true);
  assert.equal(media.volValue, '1');

  await p.locator('[data-plantilla-media="volume"]').evaluate((el) => {
    el.value = '0.4';
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
  const afterVol = await p.evaluate(() => window.__L199.volume());
  assert.ok(Math.abs(afterVol - 0.4) < 0.02, 'El slider de volumen actualiza el volumen');

  await p.click('[data-plantilla-media="play"]');
  const hint = await p.locator('.plantilla-media-hint').textContent();
  assert.match(hint, /Sin audio/);
});
