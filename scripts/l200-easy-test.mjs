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
        '.ogg': 'audio/ogg',
        '.wav': 'audio/wav',
        '.json': 'application/json'
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
      const aspect = [];
      let easyCanvasW = 0, easyWrapW = 0;
      for (const b of api.B_OPTS) for (const m of api.M_OPTS) {
        api.resetAll(false); api.state.phase = "pick-b"; api.chooseB(b); api.chooseM(m); api.startFormaFacil();
        const o = api.worldToScreen(0, 0);
        const x1 = api.worldToScreen(1, 0);
        const y1 = api.worldToScreen(0, 1);
        aspect.push({ phase: 'easy-b', b, m, sx: x1.x - o.x, sy: o.y - y1.y });
        if (b === 3 && m === -1.5) {
          api.lockEasyP1();
          const om = api.worldToScreen(0, 0);
          aspect.push({
            phase: 'easy-m', b, m,
            sx: api.worldToScreen(1, 0).x - om.x,
            sy: om.y - api.worldToScreen(0, 1).y
          });
        }
        easyCanvasW = c.width;
        easyWrapW = document.getElementById('graphWrap').clientWidth;
      }
      api.resetAll(false);
      const origin = api.worldToScreen(0,0), corner = api.worldToScreen(12,12);
      const oN = api.worldToScreen(0, 0);
      const originalUnit = Math.min(api.worldToScreen(1, 0).x - oN.x, oN.y - api.worldToScreen(0, 1).y);
      return {normal, compact, failures, banners, top: rect.top, restored: c.getBoundingClientRect().height, origin, corner, aspect, originalUnit, easyCanvasW, easyWrapW};
    });
    assert.deepEqual(result.failures, []);
    if (width === 1440) assert.ok(result.compact <= result.normal * 2.2 + 1, JSON.stringify({compact: result.compact, normal: result.normal}));
    else assert.ok(result.compact >= 239, JSON.stringify(result));
    assert.ok(result.aspect.every(a => Math.abs(a.sx - a.sy) < 0.75), JSON.stringify(result.aspect.filter(a => Math.abs(a.sx - a.sy) >= 0.75)));
    const normalPlotH = Math.max(420, Math.min(720, result.easyWrapW * 0.74)) - 70;
    const easyOriginal = Math.min(result.easyCanvasW - 84, normalPlotH) / 24;
    const expectedUnit = easyOriginal * 9;
    const ref = result.aspect.find(a => a.b === 3 && a.m === 2);
    assert.ok(ref && ref.sx + 0.75 >= expectedUnit * 0.75, JSON.stringify({ref, expectedUnit}));
    assert.ok(result.aspect.every(a => a.sx + 0.75 >= expectedUnit * 0.55), JSON.stringify({easyOriginal, expectedUnit, easyCanvasW: result.easyCanvasW, worst: result.aspect.filter(a => a.sx + 0.75 < expectedUnit * 0.55)}));
    assert.ok(result.banners.every(bottom => bottom <= result.top), 'Las consignas no tapan el plano');
    assert.equal(result.restored, result.normal);
    assert.ok(result.corner.x > result.origin.x && result.corner.y < result.origin.y);
  });

  test(`L200: arrastre real de P1 y P2 y resize a ${width}px`, async t => {
    const p = await pageFor(t, { viewport: { width, height: width >= 1000 ? 1600 : 1000 } });
    await p.goto(base + '/tools/leccion-lineal-working-memory.html');
    await p.evaluate(() => { const a=window.__L200; a.state.phase="pick-b"; a.chooseB(3);a.chooseM(-1.5);a.startFormaFacil(); });
    await p.waitForFunction(() => window.__L200.state.phase === 'easy-b');
    async function drag(from, to) {
      await p.locator('#c').scrollIntoViewIfNeeded();
      const coords = await p.evaluate(({from,to}) => {
        const a=window.__L200,c=document.getElementById('c'),r=c.getBoundingClientRect();
        a.draw();
        const map = (q, i) => {
          let s = a.worldToScreen(q.x, q.y);
          // Prefer the live dock token for the grab point (may sit on origin).
          if (i === 0 && a.state && a.state._dock) s = a.state._dock;
          const x = r.left + s.x * r.width / c.width;
          const y = r.top + s.y * r.height / c.height;
          return { x, y };
        };
        return [map(from, 0), map(to, 1)];
      }, {from,to});
      // Keep the grab point inside the viewport.
      await p.evaluate(({x,y}) => {
        const el = document.elementFromPoint(x, y);
        if (!el) window.scrollBy(0, y - window.innerHeight * 0.5);
      }, coords[0]);
      await p.mouse.move(coords[0].x, coords[0].y);
      await p.mouse.down();
      await p.mouse.move(coords[1].x, coords[1].y, { steps: 12 });
      await p.mouse.up();
    }
    await drag({x:0,y:0},{x:0,y:3});
    await p.locator('#c').scrollIntoViewIfNeeded();
    await p.waitForFunction(() => window.__L200.state.phase === 'easy-m', null, { timeout: 8000 });
    const unit = await p.evaluate(() => {
      const a = window.__L200, o = a.worldToScreen(0, 0);
      return { sx: a.worldToScreen(1, 0).x - o.x, sy: o.y - a.worldToScreen(0, 1).y };
    });
    assert.ok(Math.abs(unit.sx - unit.sy) < 0.75, JSON.stringify(unit));
    await drag({x:0,y:3},{x:2,y:0});
    await p.locator('#c').scrollIntoViewIfNeeded();
    await p.waitForFunction(() => window.__L200.state.phase === 'easy-line', null, { timeout: 8000 });
    assert.equal(await p.evaluate(() => window.__L200.state.bad), 0);
    await p.setViewportSize({width: width === 390 ? 1440 : 390,height:1000});
    assert.equal(await p.evaluate(() => window.__L200.state.phase), 'easy-line');
    await p.locator('#resetBtn').click();
    assert.equal(await p.evaluate(() => window.__L200.state.phase), 'fill');
  });
}

for (const width of [390, 1440]) {
  test(`L200: sin Dictar, Enter confirma f(x) y hay dos barras de audio a ${width}px`, async t => {
    const p = await pageFor(t, { viewport: { width, height: 1000 } });
    await p.goto(base + '/tools/leccion-lineal-working-memory.html');
    assert.equal(await p.locator('#dictateBtn').count(), 0);
    assert.equal(await p.locator('#dictationStatus').count(), 0);
    assert.equal(await p.evaluate(() => !!document.querySelector('script[src*="number-dictation"]')), false);
    assert.match(await p.locator('#dockHint').textContent(), /Escribí f\(x\)/);
    const bars = p.locator('[data-l200-audio-bar]');
    assert.equal(await bars.count(), 2);
    assert.equal(await p.locator('[data-l200-audio="1"] .l200-audio-label').textContent(), 'Explicación 1');
    assert.equal(await p.locator('[data-l200-audio="2"] .l200-audio-label').textContent(), 'Explicación 2');
    assert.deepEqual(await p.evaluate(() => window.__L200.audioCandidates('1')), [
      'audio/l200/200_1.mp3',
      'audio/l200/explicacion-1.mp3'
    ]);
    assert.deepEqual(await p.evaluate(() => window.__L200.audioCandidates('2')), [
      'audio/l200/200_2.mp3',
      'audio/l200/explicacion-2.mp3'
    ]);
    assert.equal(await p.evaluate(() => window.__L200.audioPlaybackRate()), 1);
    assert.equal(await p.locator('[data-l200-audio="1"] [data-l200-audio-rate="1"]').getAttribute('aria-checked'), 'true');
    assert.equal(await p.locator('[data-l200-audio="1"] [data-l200-audio-rate="1.5"]').textContent(), '1,5×');
    assert.equal(await p.locator('[data-l200-audio="1"] [data-l200-audio-rate="2"]').textContent(), '2×');
    assert.deepEqual(await p.evaluate(() => window.__L200.cueCandidates('1')), [
      'audio/l200/200_1.json',
      'audio/l200/explicacion-1.json'
    ]);
    assert.deepEqual(await p.evaluate(() => window.__L200.cueCandidates('2')), [
      'audio/l200/200_2.json',
      'audio/l200/explicacion-2.json'
    ]);
    const layout = await p.evaluate(() => {
      const meter = document.getElementById('soundMeter').getBoundingClientRect();
      const slots = document.getElementById('l200AudioSlots').getBoundingClientRect();
      return { meterBottom: meter.bottom, slotsTop: slots.top, slotsBottom: slots.bottom };
    });
    assert.ok(layout.meterBottom <= layout.slotsTop + 1, JSON.stringify(layout));
    const exercise = await p.evaluate(() => {
      const a = window.__L200;
      return { b: a.state.b, m: a.state.m };
    });
    const first = exercise.m * (-4) + exercise.b;
    await p.locator('.fx-input:not(:disabled)').fill(String(first));
    await p.locator('.fx-input:not(:disabled)').press('Enter');
    await p.waitForFunction(() => window.__L200.state.active === 1);
    assert.equal(await p.evaluate(() => window.__L200.state.ok), 1);
  });
}

test('L200: overlay karaoke sincroniza cues al seek y se limpia en huecos', async t => {
  const p = await pageFor(t);
  await p.goto(base + '/tools/leccion-lineal-working-memory.html');
  const snap = await p.evaluate(() => {
    const a = window.__L200;
    a.setAudioCues('1', [
      { start: 0, end: 1.2, text: 'Hola, esta es la recta' },
      { start: 1.2, end: 3, text: 'f de x igual a mx más b' }
    ]);
    const first = a.syncSubtitles('1', 0.4);
    const host = document.getElementById('l200Subtitles');
    const panel = document.querySelector('.l200-subs-panel');
    const badge = document.querySelector('.l200-subs-badge');
    const mid = a.syncSubtitles('1', 2);
    const gap = a.syncSubtitles('1', 3.4);
    return {
      first,
      mid,
      gap,
      hasPanel: !!(panel && panel.querySelector('.l200-subs-line')),
      badge: badge && badge.textContent,
      hiddenAfterGap: host.hidden,
      pauseKeeps: (a.syncSubtitles('1', 0.5), a.subtitleText())
    };
  });
  assert.equal(snap.first, 'Hola, esta es la recta');
  assert.equal(snap.mid, 'f de x igual a mx más b');
  assert.equal(snap.gap, '');
  assert.equal(snap.hasPanel, true);
  assert.match(snap.badge || '', /Explicación 1/);
  assert.equal(snap.hiddenAfterGap, true);
  assert.equal(snap.pauseKeeps, 'Hola, esta es la recta');
});

const SPA_HTML = '<!doctype html><html><body>index</body></html>';

test('L200: HEAD HTML se rechaza; probe solo pide mp3', async t => {
  const p = await pageFor(t);
  p.setDefaultTimeout(10000);
  const probed = [];
  p.on('request', req => {
    try {
      const pathname = new URL(req.url()).pathname;
      if (pathname.includes('/audio/l200/')) probed.push(req.method() + ' ' + pathname);
    } catch { /* ignore */ }
  });
  await p.route('**/audio/l200/200_2.mp3', async route => {
    if (route.request().method() === 'HEAD') {
      await route.fulfill({ status: 200, contentType: 'text/html', body: SPA_HTML });
      return;
    }
    await route.continue();
  });
  await p.goto(base + '/tools/leccion-lineal-working-memory.html');
  await p.click('[data-l200-audio-play="explicacion-2"]');
  await p.waitForFunction(() => {
    const hint = document.querySelector('[data-l200-audio="2"] .l200-audio-hint');
    return hint && hint.textContent.indexOf('Sin audio aún') !== -1;
  });
  assert.ok(probed.some(item => item.includes('HEAD') && item.endsWith('/audio/l200/200_2.mp3')), JSON.stringify(probed));
  assert.ok(probed.some(item => item.includes('/audio/l200/explicacion-2.mp3')), JSON.stringify(probed));
  assert.equal(probed.filter(item => item.includes('.wav') || item.includes('.ogg')).length, 0, JSON.stringify(probed));
});

test('L200: mp3 con Content-Type audio pero cuerpo HTML cae al siguiente candidato', async t => {
  const p = await pageFor(t);
  p.setDefaultTimeout(10000);
  await p.route('**/audio/l200/200_2.mp3', async route => {
    await route.fulfill({ status: 200, contentType: 'audio/mpeg', body: SPA_HTML });
  });
  await p.goto(base + '/tools/leccion-lineal-working-memory.html');
  await p.click('[data-l200-audio-play="explicacion-2"]');
  await p.waitForFunction(() => {
    const hint = document.querySelector('[data-l200-audio="2"] .l200-audio-hint');
    const el = document.querySelector('[data-l200-audio-player="explicacion-2"]');
    const rel = el && el.getAttribute('data-rel');
    return (hint && hint.textContent.indexOf('Sin audio aún') !== -1)
      || rel === 'audio/l200/explicacion-2.mp3';
  });
});

test('L200: 1,5× y 2× cambian playbackRate al vuelo y el karaoke sigue', async t => {
  const p = await pageFor(t);
  p.setDefaultTimeout(10000);
  await p.goto(base + '/tools/leccion-lineal-working-memory.html');
  await p.click('[data-l200-audio-play="explicacion-1"]');
  await p.waitForFunction(() => {
    const el = document.querySelector('[data-l200-audio-player="explicacion-1"]');
    return el && el.getAttribute('data-rel') === 'audio/l200/200_1.mp3' && !el.paused;
  });
  const beforeSrc = await p.evaluate(() => document.querySelector('[data-l200-audio-player="explicacion-1"]').currentSrc);
  await p.click('[data-l200-audio="1"] [data-l200-audio-rate="1.5"]');
  const mid = await p.evaluate(() => {
    const el = document.querySelector('[data-l200-audio-player="explicacion-1"]');
    return {
      rate: el.playbackRate,
      paused: el.paused,
      src: el.currentSrc,
      session: window.__L200.audioPlaybackRate(),
      otherChecked: document.querySelector('[data-l200-audio="2"] [data-l200-audio-rate="1.5"]').getAttribute('aria-checked')
    };
  });
  assert.equal(mid.rate, 1.5);
  assert.equal(mid.paused, false);
  assert.equal(mid.src, beforeSrc);
  assert.equal(mid.session, 1.5);
  assert.equal(mid.otherChecked, 'true');
  await p.click('[data-l200-audio="2"] [data-l200-audio-rate="2"]');
  const fast = await p.evaluate(() => {
    const el = document.querySelector('[data-l200-audio-player="explicacion-1"]');
    return { rate: el.playbackRate, paused: el.paused, session: window.__L200.audioPlaybackRate() };
  });
  assert.equal(fast.rate, 2);
  assert.equal(fast.paused, false);
  assert.equal(fast.session, 2);
  await p.waitForFunction(() => {
    const el = document.querySelector('[data-l200-audio-player="explicacion-1"]');
    const host = document.getElementById('l200Subtitles');
    return el && !el.paused && host && host.hidden === false;
  });
});

test('L200: Play del slot 1 pide 200_1.json y deja cues listos', async t => {
  const p = await pageFor(t);
  p.setDefaultTimeout(10000);
  const fixture = JSON.stringify([
    { start: 0, end: 1.8, text: 'Esta es la recta.' },
    { start: 1.8, end: 4.2, text: 'f(x) = mx + b' }
  ]);
  await p.route('**/audio/l200/200_1.json', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: fixture
  }));
  await p.goto(base + '/tools/leccion-lineal-working-memory.html');
  const jsonReq = p.waitForRequest(req => {
    try {
      return new URL(req.url()).pathname.endsWith('/audio/l200/200_1.json');
    } catch {
      return false;
    }
  });
  await p.click('[data-l200-audio-play="explicacion-1"]');
  await jsonReq;
  await p.waitForFunction(() => {
    const el = document.querySelector('[data-l200-audio-player="explicacion-1"]');
    return el && el.getAttribute('data-rel') === 'audio/l200/200_1.mp3' && !el.paused;
  });
  await p.waitForFunction(() => window.__L200.syncSubtitles('1', 0.5) === 'Esta es la recta.');
  assert.equal(await p.evaluate(() => window.__L200.syncSubtitles('1', 2.5)), 'f(x) = mx + b');
  const chrome = await p.evaluate(() => {
    const panel = document.querySelector('#l200Subtitles .l200-subs-panel');
    return {
      hidden: document.getElementById('l200Subtitles').hidden,
      hasLine: !!(panel && panel.querySelector('.l200-subs-line')),
      hasBadge: !!(panel && panel.querySelector('.l200-subs-badge'))
    };
  });
  assert.equal(chrome.hidden, false);
  assert.equal(chrome.hasLine, true);
  assert.equal(chrome.hasBadge, true);
});

test('L200: Play sin archivo muestra Sin audio aún; mute cambia estado', async t => {
  const p = await pageFor(t);
  await p.goto(base + '/tools/leccion-lineal-working-memory.html');
  const mutedBefore = await p.evaluate(() => window.__L200.audioMuted('1'));
  await p.click('[data-l200-audio-mute="explicacion-1"]');
  const mutedAfter = await p.evaluate(() => window.__L200.audioMuted('1'));
  assert.notEqual(mutedAfter, mutedBefore);
  await p.click('[data-l200-audio-play="explicacion-2"]');
  await p.waitForFunction(() => {
    const hint = document.querySelector('[data-l200-audio="2"] .l200-audio-hint');
    return hint && hint.textContent.indexOf('Sin audio aún') !== -1;
  });
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
