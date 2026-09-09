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

for (const width of [390, 1440]) {
  test(`L200: encuadre de todas las pendientes, consignas y reset a ${width}px`, async t => {
    const p = await pageFor(t, { viewport: { width, height: 1000 } });
    await p.goto(base + '/tools/leccion-lineal-working-memory.html');
    const result = await p.evaluate(() => {
      const api = window.__L200, c = document.getElementById('c');
      const normal = c.getBoundingClientRect().height;
      const failures = [];
      for (const b of api.B_OPTS) for (const m of api.M_OPTS) {
        api.resetAll(false); api.chooseB(b); api.chooseM(m); api.startFormaFacil();
        const points = [{x: 0, y: 0}, api.easyP1(), api.easyP2(), {x: api.easyP2().x, y: b}];
        for (const point of points) {
          const s = api.worldToScreen(point.x, point.y);
          if (s.x < 16 || s.x > c.width - 16 || s.y < 16 || s.y > c.height - 16) failures.push({b,m,point,s});
        }
      }
      const rect = c.getBoundingClientRect();
      const banners = ['easyBanner', 'stepCartel'].map(id => document.getElementById(id).getBoundingClientRect().bottom);
      const compact = rect.height;
      api.resetAll(false);
      const origin = api.worldToScreen(0,0), corner = api.worldToScreen(12,12);
      return {normal, compact, failures, banners, top: rect.top, restored: c.getBoundingClientRect().height, origin, corner};
    });
    assert.deepEqual(result.failures, []);
    if (width === 1440) assert.ok(Math.abs(result.compact / result.normal - 1/3) < .01, JSON.stringify(result));
    else assert.ok(result.compact >= 239, JSON.stringify(result));
    assert.ok(result.banners.every(bottom => bottom <= result.top), 'Las consignas no tapan el plano');
    assert.equal(result.restored, result.normal);
    assert.ok(result.corner.x > result.origin.x && result.corner.y < result.origin.y);
  });

  test(`L200: arrastre real de P1 y P2 y resize a ${width}px`, async t => {
    const p = await pageFor(t, { viewport: { width, height: 1000 } });
    await p.goto(base + '/tools/leccion-lineal-working-memory.html');
    await p.evaluate(() => { const a=window.__L200; a.chooseB(3);a.chooseM(-1.5);a.startFormaFacil(); });
    await p.waitForFunction(() => window.__L200.state.phase === 'easy-b');
    async function drag(from, to) {
      await p.locator('#c').scrollIntoViewIfNeeded();
      const coords = await p.evaluate(({from,to}) => {
        const a=window.__L200,c=document.getElementById('c'),r=c.getBoundingClientRect();
        return [from,to].map(q => {const s=a.worldToScreen(q.x,q.y);return {x:r.left+s.x*r.width/c.width,y:r.top+s.y*r.height/c.height};});
      }, {from,to});
      await p.mouse.move(coords[0].x,coords[0].y);await p.mouse.down();
      await p.mouse.move(coords[1].x,coords[1].y,{steps:12});await p.mouse.up();
    }
    await drag({x:0,y:0},{x:0,y:3});
    await p.waitForFunction(() => window.__L200.state.phase === 'easy-m');
    await drag({x:0,y:3},{x:2,y:0});
    await p.waitForFunction(() => window.__L200.state.phase === 'easy-line');
    assert.equal(await p.evaluate(() => window.__L200.state.bad), 0);
    await p.setViewportSize({width: width === 390 ? 1440 : 390,height:1000});
    assert.equal(await p.evaluate(() => window.__L200.state.phase), 'easy-line');
    await p.locator('#resetBtn').click();
    assert.equal(await p.evaluate(() => window.__L200.state.phase), 'pick-b');
  });
}
