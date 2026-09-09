import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import http from 'node:http';
import { readFile, readdir } from 'node:fs/promises';
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
      const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' };
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
async function pageFor(t, options = {}) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, ...options });
  const errors = [];
  context.on('page', page => page.on('pageerror', error => errors.push(error.message)));
  t.after(async () => { await context.close(); assert.deepEqual(errors, [], 'Uncaught errors during navigation'); });
  const page = await context.newPage();
  page.setDefaultTimeout(5000);
  return page;
}
const returnControl = 'a.back, .campus-lb-btn.primary';
const materia = '/index.html#/materia/informatica/mate1/temario';

test('catálogo: búsqueda y categoría sobreviven regreso, recarga y Atrás sin storage', async t => {
  const p = await pageFor(t);
  await p.addInitScript(() => { Storage.prototype.getItem = Storage.prototype.setItem = () => { throw new Error('storage disabled'); }; });
  await p.goto(base + '/tools/index.html');
  await p.locator('#search-input').fill('seno');
  await p.locator('[data-cat="trig"]').click();
  const count = await p.locator('#counter').textContent();
  await p.locator('.tool-item:visible a').first().click();
  await p.locator(returnControl).click();
  assert.equal(await p.locator('#search-input').inputValue(), 'seno');
  assert.equal(await p.locator('.chip.active').getAttribute('data-cat'), 'trig');
  assert.equal(await p.locator('#counter').textContent(), count);
  await p.reload();
  assert.equal(await p.locator('#search-input').inputValue(), 'seno');
  await p.locator('.tool-item:visible a').first().click();
  await p.goBack();
  assert.equal(await p.locator('#search-input').inputValue(), 'seno');
  await p.goto(base + '/tools/index.html?cat=unknown&q=no-such-lesson');
  assert.equal(await p.locator('.chip.active').getAttribute('data-cat'), 'todas');
  assert.equal(await p.locator('#counter').textContent(), '0 interactivos');
});

test('retorno seguro y compatible con despliegue bajo subdirectorio', async t => {
  const p = await pageFor(t);
  for (const prefix of ['', '/campus']) {
    for (const target of ['', 'https://evil.example/index.html', '//evil.example/tools/index.html', 'javascript:alert(1)', '../workbench.html', 'http://[', base + '/tools/lesson-bar.js']) {
      await p.goto(`${base}${prefix}/tools/leccion-lineales.html?returnTo=${encodeURIComponent(target)}`);
      assert.equal(await p.locator(returnControl).count(), 1);
      assert.equal(await p.locator(returnControl).getAttribute('href'), `${base}${prefix}/tools/index.html`);
    }
    const destination = `${prefix}/tools/index.html?q=seno&cat=trig`;
    await p.goto(`${base}${prefix}/tools/leccion-lineales.html?returnTo=${encodeURIComponent(destination)}`);
    await p.locator(returnControl).click();
    assert.equal(p.url(), base + destination);
  }
});

test('materia: nueva pestaña y recarga conservan nodo; cierre recupera foco', async t => {
  const p = await pageFor(t);
  await p.goto(base + materia);
  await p.locator('[data-nodo="n-lin"]').click();
  await p.waitForURL('**/temario/n-lin');
  await p.reload();
  await p.locator('#interactive-embed-frame').waitFor({ state: 'attached' });
  assert.equal(await p.locator('#interactive-embed-frame').count(), 1);
  const popupPromise = p.waitForEvent('popup');
  await p.locator('[title="Abrir en ventana independiente"]').click();
  const popup = await popupPromise;
  await popup.waitForLoadState();
  await popup.locator(returnControl).click();
  await popup.waitForURL('**/temario/n-lin');
  assert.equal(await popup.locator('#interactive-embed-frame').count(), 1);
  await popup.close();
  await p.locator('#btn-close-embed').click();
  assert.equal(await p.locator('#interactive-embed-frame').count(), 0);
  assert.equal(await p.locator('[data-nodo="n-lin"]').evaluate(e => document.activeElement === e), true);
});

test('visor: retorno de ambas familias cierra; mensajes ajenos no lo cierran', async t => {
  const p = await pageFor(t);
  for (const route of [materia + '/n-lin', '/index.html#/materia/industrial/procesos/temario/n-costos']) {
    await p.goto(base + route);
    const frame = p.locator('#interactive-embed-frame');
    await frame.scrollIntoViewIfNeeded();
    await p.evaluate(() => window.postMessage({ type: 'campus:close-lesson' }, location.origin));
    await p.evaluate(() => window.dispatchEvent(new MessageEvent('message', { origin: 'https://evil.example', source: document.querySelector('iframe').contentWindow, data: { type: 'campus:close-lesson' } })));
    assert.equal(await frame.count(), 1);
    await p.frameLocator('#interactive-embed-frame').locator(returnControl).click();
    await p.waitForFunction(() => !document.querySelector('#interactive-embed-frame'));
    assert.ok(p.url().endsWith('/temario'));
    assert.equal(await p.locator('[data-nodo]:focus').count(), 1);
  }
});

test('cada lección tiene exactamente una salida al catálogo, incluso en móvil', async t => {
  const p = await pageFor(t, { viewport: { width: 390, height: 844 } });
  const pages = (await readdir(path.join(root, 'tools'))).filter(f => f.endsWith('.html') && f !== 'index.html');
  assert.ok(pages.length > 0);
  for (const name of pages) {
    await p.goto(`${base}/tools/${name}`);
    const back = p.locator(returnControl);
    assert.equal(await back.count(), 1, name);
    assert.equal(await back.getAttribute('href'), base + '/tools/index.html', name);
    assert.ok(await back.getAttribute('aria-label'), name);
  }
  console.log(`Censo verificado: ${pages.length} lecciones, una salida por página.`);
});


test('laboratorio: retorno desde catálogo y apertura integrada mantienen contexto', async t => {
  const p = await pageFor(t);
  await p.goto(base + '/index.html#/materia/informatica/mate1/lab');
  const popupPromise = p.waitForEvent('popup');
  await p.locator('.btn-catalog-link').click();
  const catalog = await popupPromise;
  await catalog.waitForLoadState();
  await catalog.locator('#search-input').fill('seno');
  await catalog.locator('.tool-item:visible a').first().click();
  await catalog.locator(returnControl).click();
  assert.equal(await catalog.locator('#search-input').inputValue(), 'seno');
  await catalog.locator('.back-campus').click();
  await catalog.waitForURL('**/mate1/lab');
  await catalog.close();
  await p.locator('[data-launch-nodo="n-lin"]').click();
  await p.waitForURL('**/temario/n-lin');
  await p.locator('#interactive-embed-frame').waitFor({ state: 'attached' });
  assert.equal(await p.locator('#interactive-embed-frame').count(), 1);
  const toggle = p.locator('.tema').filter({ has: p.locator('[data-nodo="n-lin"]') }).locator('[data-tema-toggle]');
  await toggle.click();
  assert.equal(await p.locator('[data-nodo="n-lin"]').isVisible(), false);
  await p.locator('#btn-close-embed').click();
  assert.equal(await p.locator('[data-nodo="n-lin"]:focus').count(), 1);
});


test('barras: no tapan títulos en móvil/escritorio y permiten retorno con teclado', async t => {
  const p = await pageFor(t);
  const files = (await readdir(path.join(root, 'tools'))).filter(f => f.endsWith('.html'));
  const shared = [];
  for (const name of files) {
    if ((await readFile(path.join(root, 'tools', name), 'utf8')).match(/src="lesson-bar\.js(?:\?[^"]*)?"/)) shared.push(name);
  }
  assert.ok(shared.length > 0);
  for (const width of [390, 1440]) {
    await p.setViewportSize({ width, height: 900 });
    for (const name of shared) {
      await p.goto(base + '/tools/' + name);
      const bar = p.locator('.campus-lesson-bar-wrap');
      const box = await bar.boundingBox();
      const heading = await p.locator('h1').first().boundingBox();
      assert.ok(box.y + box.height <= heading.y, `${name} at ${width}: header overlap`);
      assert.equal(await p.locator('.campus-lb-label').isVisible(), true, name);
      for (const control of await p.locator('.campus-lb-btn').all()) {
        assert.ok((await control.boundingBox()).height >= 44, `${name}: small target`);
      }
    }
  }
  await p.locator(returnControl).focus();
  await p.keyboard.press('Enter');
  await p.waitForURL('**/tools/index.html');
  console.log(`Layout: ${shared.length} barras a 390 y 1440px.`);
});


test('bandeja: dos tareas, cambio de K y vuelta desde lección sin storage', async t => {
  const p = await pageFor(t);
  await p.addInitScript(() => { Storage.prototype.getItem = Storage.prototype.setItem = Storage.prototype.removeItem = () => { throw new Error('denied'); }; });
  await p.goto(base + '/tools/index.html?q=seno&cat=trig');
  const first = await p.locator('.bandeja-done').first().getAttribute('data-id');
  await p.locator('.bandeja-done').first().click();
  const second = await p.locator('.bandeja-done').first().getAttribute('data-id');
  await p.locator('.bandeja-done').first().click();
  await p.locator('.bandeja-teacher summary').click();
  await p.locator('[data-bandeja-action="k"][data-k="15"]').click();
  assert.equal(await p.locator(`.bandeja-done[data-id="${first}"]`).count(), 0);
  assert.equal(await p.locator(`.bandeja-done[data-id="${second}"]`).count(), 0);
  await p.locator('.bandeja-link').first().click();
  await p.locator(returnControl).click();
  assert.equal(await p.locator('#search-input').inputValue(), 'seno');
  assert.equal(await p.locator('.chip.active').getAttribute('data-cat'), 'trig');
});

test('L200 → L201 conserva origen y tiene una sola salida por lección', async t => {
  const p = await pageFor(t);
  await p.goto(base + '/tools/index.html?q=Working&cat=todas');
  await p.locator('.bandeja-link').first().click();
  assert.equal(await p.locator(returnControl).count(), 1);
  await p.locator('a.lesson-nav.next').click();
  assert.equal(await p.locator(returnControl).count(), 1);
  await p.locator(returnControl).click();
  assert.equal(await p.locator('#search-input').inputValue(), 'Working');
});
