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
  t.after(async () => { await context.close(); assert.deepEqual(errors, [], 'Uncaught errors in L200'); });
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
        api.resetAll(false); api.state.phase = "pick-b"; api.chooseB(b); api.chooseM(m); api.startFormaFacil();
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
    await p.evaluate(() => { const a=window.__L200; a.state.phase="pick-b"; a.chooseB(3);a.chooseM(-1.5);a.startFormaFacil(); });
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
    assert.equal(await p.evaluate(() => window.__L200.state.phase), 'fill');
  });
}

// Simulate browser speech events; these tests do not access a microphone or service.
async function dictationPage(t, { support = true, width = 1440, prefixed = false } = {}) {
  const p = await pageFor(t, { viewport: { width, height: 1000 } });
  await p.addInitScript(({ support, prefixed }) => {
    window.__speech = [];
    const originalTimeout = window.setTimeout;
    window.setTimeout = function (callback, delay, ...args) {
      if (delay === 15000) window.__speechTimeout = callback;
      return originalTimeout(callback, delay, ...args);
    };
    window.SpeechRecognition = window.webkitSpeechRecognition = undefined;
    if (!support) return;
    class FakeRecognition {
      constructor() { this.started = false; this.aborted = false; window.__speech.push(this); }
      start() { this.started = true; if (window.__speechStartError) throw new Error('start failed'); }
      abort() { this.aborted = true; this.onend?.(); }
      result(transcript) { this.onresult?.({ resultIndex: 0, results: [Object.assign([{ transcript }], { isFinal: true })] }); }
      error(error) { this.onerror?.({ error }); }
    }
    window[prefixed ? 'webkitSpeechRecognition' : 'SpeechRecognition'] = FakeRecognition;
  }, { support, prefixed });
  await p.goto(base + '/tools/leccion-lineal-working-memory.html');
  assert.equal(await p.evaluate(() => window.__L200.state.phase), 'fill');
  await p.evaluate(() => { const a = window.__L200; a.state.phase = 'pick-b'; a.chooseB(-3); a.chooseM(-2); });
  return p;
}

for (const width of [390, 1440]) {
  test(`L200: Dictar debajo de f(x), revisar y confirmar a ${width}px`, async t => {
    const p = await dictationPage(t, { width, prefixed: width === 390 });
    const button = p.locator('#dictateBtn');
    const input = p.locator('.fx-input:not(:disabled)');
    assert.equal(await p.evaluate(() => window.__speech.length), 0, 'No escucha al cargar');
    const tableRect = await p.locator('.wm-table').boundingBox();
    const buttonRect = await button.boundingBox();
    assert.ok(buttonRect.y >= tableRect.y + tableRect.height && buttonRect.height >= 44);
    await button.click();
    assert.equal(await button.getAttribute('aria-pressed'), 'true');
    assert.deepEqual(await p.evaluate(() => { const r=window.__speech.at(-1); return [r.started,r.lang,r.continuous,r.interimResults]; }), [true,'es-AR',false,false]);
    await p.evaluate(() => window.__speech.at(-1).result('menos uno coma cinco'));
    assert.equal(await input.inputValue(), '-1.5');
    assert.deepEqual(await p.evaluate(() => [window.__L200.state.ok,window.__L200.state.bad]), [0,0]);
    assert.match(await p.locator('#dictationStatus').textContent(), /Revisá/);
    await button.click();
    await p.evaluate(() => window.__speech.at(-1).result('cinco'));
    await input.press('Enter');
    await p.waitForFunction(() => window.__L200.state.active === 1);
    assert.equal(await p.evaluate(() => window.__L200.state.ok), 1);
    assert.equal(await p.locator('.fx-input').first().inputValue(), '5');
    assert.equal(await p.locator('.fx-input:not(:disabled)').inputValue(), '');
  });
}

test('L200: errores de reconocimiento y frases ambiguas conservan la entrada manual', async t => {
  const p = await dictationPage(t);
  const input = p.locator('.fx-input:not(:disabled)');
  await input.fill('7');
  for (const [error, expected] of [['not-allowed', /Permití/], ['audio-capture', /micrófono/], ['no-speech', /No escuché/], ['network', /conectar/]]) {
    await p.locator('#dictateBtn').click();
    await p.evaluate(error => window.__speech.at(-1).error(error), error);
    assert.match(await p.locator('#dictationStatus').textContent(), expected);
    assert.equal(await input.inputValue(), '7');
    assert.equal(await p.locator('#dictateBtn').getAttribute('aria-pressed'), 'false');
  }
  await p.locator('#dictateBtn').click();
  await p.evaluate(() => window.__speech.at(-1).result('cinco o seis'));
  assert.equal(await input.inputValue(), '7');
  assert.match(await p.locator('#dictationStatus').textContent(), /único número/);
  await p.evaluate(() => { window.__speechStartError = true; });
  await p.locator('#dictateBtn').click();
  assert.match(await p.locator('#dictationStatus').textContent(), /iniciar el micrófono/);
  assert.equal(await p.locator('#dictateBtn').getAttribute('aria-pressed'), 'false');
});

test('L200: cancelar, escribir, cambiar fila y Reiniciar invalidan resultados tardíos', async t => {
  const p = await dictationPage(t);
  const button = p.locator('#dictateBtn');
  const input = p.locator('.fx-input:not(:disabled)');
  await button.click();
  await button.click();
  await p.evaluate(() => window.__speech.at(-1).result('nueve'));
  assert.equal(await input.inputValue(), '');
  await button.click();
  await input.fill('5');
  await p.evaluate(() => window.__speech.at(-1).result('nueve'));
  assert.equal(await input.inputValue(), '5');
  assert.equal(await p.evaluate(() => window.__speech.at(-1).aborted), true);
  await button.click();
  await input.press('Enter');
  await p.waitForFunction(() => window.__L200.state.active === 1);
  await p.evaluate(() => window.__speech.at(-1).result('nueve'));
  assert.equal(await input.inputValue(), '');
  await button.click();
  await p.locator('#resetBtn').click();
  await p.evaluate(() => window.__speech.at(-1).result('nueve'));
  assert.equal(await button.isDisabled(), false);
  assert.equal(await p.evaluate(() => window.__speech.at(-1).aborted), true);
  assert.deepEqual(await p.locator('.fx-input').evaluateAll(inputs => inputs.map(i => i.value)), ['', '', '', '', '']);
  assert.doesNotMatch(await p.locator('#dictationStatus').textContent(), /Escuchando/);
});

test('L200: sin API de voz se explica y se puede responder por teclado', async t => {
  const p = await dictationPage(t, { support: false });
  assert.equal(await p.locator('#dictateBtn').isDisabled(), true);
  assert.match(await p.locator('#dictationStatus').textContent(), /no admite dictado/);
  await p.locator('.fx-input:not(:disabled)').fill('5');
  await p.locator('.fx-input:not(:disabled)').press('Enter');
  assert.equal(await p.evaluate(() => window.__L200.state.ok), 1);
});


test('L200: fin sin resultado, timeout y salida detienen la escucha', async t => {
  const p = await dictationPage(t);
  for (const action of ['end', 'timeout', 'pagehide']) {
    await p.locator('#dictateBtn').click();
    await p.evaluate(action => {
      if (action === 'end') window.__speech.at(-1).onend();
      if (action === 'timeout') window.__speechTimeout();
      if (action === 'pagehide') window.dispatchEvent(new Event('pagehide'));
      window.__speech.at(-1).result('nueve');
    }, action);
    assert.equal(await p.locator('#dictateBtn').getAttribute('aria-pressed'), 'false');
    assert.equal(await p.evaluate(() => window.__speech.at(-1).aborted), true);
    assert.equal(await p.locator('.fx-input:not(:disabled)').inputValue(), '');
    assert.doesNotMatch(await p.locator('#dictationStatus').textContent(), /Escuchando/);
  }
});

for (const width of [390, 1440]) {
  test(`L200: entrada automática, OK por fila y reinicio a ${width}px`, async t => {
    const p = await pageFor(t, { viewport: { width, height: 1000 } });
    await p.goto(base + '/tools/leccion-lineal-working-memory.html');
    assert.equal(await p.locator('#playBtn').count(), 0);
    assert.equal(await p.locator('#slowBtn').isVisible(), false);
    assert.equal(await p.locator('#pickBBox').isVisible(), false);
    assert.equal(await p.locator('#pickMBox').isVisible(), false);
    assert.equal(await p.locator('#tableWrap').isVisible(), true);
    assert.match(await p.locator('#fnBox').textContent(), /f\(x\)\s*=/);
    assert.equal(await p.locator('#scoreRound').textContent(), 'Completá f(x)');
    assert.equal(await p.locator('.fx-input:not(:disabled)').count(), 1);
    assert.equal(await p.locator('.fx-input:not(:disabled)').getAttribute('data-i'), '0');
    const exercise = await p.evaluate(() => { const a=window.__L200; return {b:a.state.b,m:a.state.m,bs:a.B_OPTS,ms:a.M_OPTS}; });
    assert.ok(exercise.bs.includes(exercise.b) && exercise.ms.includes(exercise.m));
    assert.deepEqual(await p.locator('#tbody td.x').allTextContents(), ['−4','−2','0','2','4']);
    const formats = await p.locator('#tbody td.work').allTextContents();
    assert.notEqual(formats[0], '—');
    assert.deepEqual(formats.slice(1), ['—','—','—','—']);
    const values = [-4,-2,0,2,4].map(x => exercise.m*x+exercise.b);
    await p.locator('.fx-input:not(:disabled)').fill(String(values[0]+1));
    await p.getByRole('button', { name: 'Comprobar f(x)', exact: true }).click();
    assert.equal(await p.locator('.mark.bad').count(), 1);
    assert.equal(await p.locator('.fx-input:not(:disabled)').getAttribute('data-i'), '0');
    for (let i=0;i<5;i++) {
      await p.locator('.fx-input:not(:disabled)').fill(String(values[i]));
      if (i===0) await p.getByRole('button', { name: 'Reintentar f(x)', exact: true }).click();
      else await p.locator('.fx-input:not(:disabled)').press('Enter');
      if(i<4) await p.waitForFunction(i=>window.__L200.state.active===i+1,i);
      assert.equal(await p.locator('.mark.ok').count(), i+1);
    }
    await p.waitForFunction(()=>window.__L200.state.phase==='place');
    assert.equal(await p.locator('#slowBtn').isVisible(), true);
    await p.locator('#slowBtn').click();
    await p.getByRole('button', { name:'Reiniciar', exact:true }).click();
    assert.equal(await p.locator('#slowBtn').isVisible(), false);
    assert.equal(await p.locator('.fx-input:not(:disabled)').getAttribute('data-i'), '0');
    assert.deepEqual(await p.locator('.fx-input').evaluateAll(inputs=>inputs.map(i=>i.value)), ['','','','','']);
    assert.equal(await p.locator('.mark.ok').count(), 0);
    const first = await p.evaluate(()=>window.__L200.state.m*(-4)+window.__L200.state.b);
    await p.locator('.fx-input:not(:disabled)').fill(String(first));
    await p.locator('.fx-input:not(:disabled)').press('Enter');
    await p.waitForFunction(()=>window.__L200.state.active===1, null, {timeout:1000});
  });
}
