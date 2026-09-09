#!/usr/bin/env node
/**
 * Smoke test de INTERACCIÓN para Campus Ingeniería.
 *
 * El browser-smoke solo verifica que la página carga. Este va un paso más:
 * en cada lección con sliders (input[type=range]) los barre (min y max,
 * disparando input+change) y verifica:
 *   - que NO se lance ninguna excepción / console.error durante la interacción
 *     (cazando bugs de runtime que solo aparecen al usar la lección);
 *   - como señal de cobertura (no de fallo), si algún <canvas> reacciona al
 *     mover los sliders.
 *
 * Alcance: cubre las lecciones slider-driven (familia función). Las de
 * canvas-drag / juego quedan cubiertas por carga en browser-smoke; su
 * interacción sintética requeriría drivers por tipo y no se hace acá.
 *
 * Solo se tocan sliders (jamás navegan). No se clickean botones/enlaces para
 * evitar recargas o navegación accidental.
 *
 * Uso:  node scripts/interaction-smoke.mjs [--only substr]
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
const onlyIdx = args.indexOf('--only');
const ONLY = onlyIdx !== -1 ? args[onlyIdx + 1] : null;
const CONCURRENCY = 4;

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.ico': 'image/x-icon' };

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const p = decodeURIComponent(req.url.split('?')[0]);
      const fp = path.join(ROOT, p === '/' ? 'index.html' : p);
      if (!fp.startsWith(ROOT)) return res.writeHead(403).end();
      fs.stat(fp, (e, st) => {
        if (e || !st.isFile()) return res.writeHead(404).end();
        res.writeHead(200, { 'Content-Type': MIME[path.extname(fp).toLowerCase()] || 'application/octet-stream' });
        fs.createReadStream(fp).pipe(res);
      });
    });
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

function listPages() {
  const dir = path.join(ROOT, 'tools');
  let pages = fs.readdirSync(dir).filter((f) => f.endsWith('.html') && f !== 'index.html').map((f) => `tools/${f}`);
  if (ONLY) pages = pages.filter((p) => p.includes(ONLY));
  return pages;
}

async function drivePage(browser, base, rel) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const problems = [];
  const origin = new URL(base).origin;
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') problems.push(`console.error: ${m.text()}`); });

  let sliders = 0, reacted = false;
  try {
    await page.goto(`${base}/${rel}`, { waitUntil: 'load', timeout: 20000 });
    await page.waitForTimeout(200);

    const result = await page.evaluate(async () => {
      const canvasHash = () => [...document.querySelectorAll('canvas')].map((c) => {
        try { return c.toDataURL().length + ':' + c.toDataURL().slice(-32); } catch (e) { return 'x'; }
      }).join('|');

      const ranges = [...document.querySelectorAll('input[type=range]')];
      if (!ranges.length) return { sliders: 0, reacted: false };

      const before = canvasHash();
      for (const r of ranges) {
        for (const v of [r.min || '0', r.max || '100']) {
          r.value = v;
          r.dispatchEvent(new Event('input', { bubbles: true }));
          r.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
      await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
      const after = canvasHash();
      return { sliders: ranges.length, reacted: before !== after };
    });
    sliders = result.sliders;
    reacted = result.reacted;
  } catch (e) {
    problems.push(`interacción falló: ${e.message}`);
  } finally {
    await ctx.close();
  }
  return { rel, problems, sliders, reacted };
}

async function main() {
  const { server, port } = await startServer();
  const base = `http://127.0.0.1:${port}`;
  const pages = listPages();
  console.log(`🎛️  Interaction smoke · ${pages.length} lecciones · concurrencia ${CONCURRENCY}\n`);

  const browser = await chromium.launch();
  const results = [];
  let idx = 0;
  async function worker() {
    while (idx < pages.length) {
      const rel = pages[idx++];
      const r = await drivePage(browser, base, rel);
      if (r.problems.length) process.stdout.write('X');
      else if (r.sliders === 0) process.stdout.write('-');
      else if (r.reacted) process.stdout.write('.');
      else process.stdout.write('o');
      results.push(r);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  await browser.close();
  server.close();

  const failed = results.filter((r) => r.problems.length);
  const withSliders = results.filter((r) => r.sliders > 0);
  const reacted = withSliders.filter((r) => r.reacted);
  console.log(`\n\n----------------------------------------`);
  console.log(`Lecciones:              ${results.length}`);
  console.log(`Con sliders (probadas): ${withSliders.length}`);
  console.log(`  · canvas reaccionó:   ${reacted.length}`);
  console.log(`  · sin reacción visible (o=tabla/otro): ${withSliders.length - reacted.length}`);
  console.log(`Sin sliders (- omitidas): ${results.length - withSliders.length}`);
  console.log(`Con errores:            ${failed.length}`);
  console.log(`----------------------------------------\n`);
  console.log('Leyenda: . reacciona · o sin reacción visible · - sin sliders · X error\n');

  if (failed.length) {
    for (const f of failed.sort((a, b) => a.rel.localeCompare(b.rel))) {
      console.error(`✗ ${f.rel}`);
      for (const p of f.problems) console.error(`    · ${p}`);
    }
    console.error(`\n❌ Interaction smoke FALLÓ (${failed.length} lecciones con errores al interactuar).`);
    process.exit(1);
  }
  console.log('✅ Ninguna lección lanzó errores al mover sus sliders.');
}

main().catch((e) => { console.error('Error fatal:', e); process.exit(1); });
