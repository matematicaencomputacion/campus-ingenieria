#!/usr/bin/env node
/**
 * Verificador de equivalencia CSS por estilos computados.
 *
 * Para cada página, renderiza en headless y toma un snapshot del getComputedStyle
 * de TODOS los elementos (un set curado de propiedades). Produce un hash por página.
 *
 * Uso:
 *   node scripts/computed-style-check.mjs --save baseline.json  <pages...>
 *   node scripts/computed-style-check.mjs --compare baseline.json <pages...>
 *
 * Si dos snapshots (antes/después de un refactor CSS) tienen el mismo hash, el
 * render controlado por CSS es idéntico — sin depender de pixel-diff (que fallaría
 * por los canvas animados).
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
const saveIdx = args.indexOf('--save');
const cmpIdx = args.indexOf('--compare');
const SAVE = saveIdx !== -1 ? args[saveIdx + 1] : null;
const COMPARE = cmpIdx !== -1 ? args[cmpIdx + 1] : null;
const pages = args.filter((a, i) => !a.startsWith('--') && i !== saveIdx + 1 && i !== cmpIdx + 1);

const PROPS = [
  'display', 'position', 'top', 'right', 'bottom', 'left', 'width', 'height',
  'margin', 'padding', 'border', 'border-radius', 'box-shadow',
  'color', 'background-color', 'background', 'opacity',
  'font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing',
  'text-align', 'flex', 'flex-direction', 'flex-wrap', 'gap', 'justify-content',
  'align-items', 'grid-template-columns', 'grid-template-rows', 'z-index',
  'transform', 'transition', 'overflow', 'white-space', 'text-transform',
];

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

async function snapshotPage(browser, base, rel) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${base}/${rel}`, { waitUntil: 'load', timeout: 20000 });
  await page.waitForTimeout(300);
  const digest = await page.evaluate((props) => {
    const els = document.querySelectorAll('*');
    const parts = [];
    for (const el of els) {
      const tag = el.tagName.toLowerCase();
      // el canvas y su contenido pintado no dependen del CSS del chrome; excluimos su render dinámico
      const cs = getComputedStyle(el);
      const row = props.map((p) => cs.getPropertyValue(p)).join('|');
      parts.push(tag + '#' + (el.id || '') + '.' + (el.className || '') + '::' + row);
    }
    return parts.join('\n');
  }, PROPS);
  await ctx.close();
  return crypto.createHash('sha256').update(digest).digest('hex');
}

async function main() {
  const { server, port } = await startServer();
  const base = `http://127.0.0.1:${port}`;
  const browser = await chromium.launch();
  const result = {};
  for (const rel of pages) {
    result[rel] = await snapshotPage(browser, base, rel);
    process.stdout.write('.');
  }
  await browser.close();
  server.close();
  console.log('');

  if (SAVE) {
    fs.writeFileSync(SAVE, JSON.stringify(result, null, 2));
    console.log(`Snapshot guardado en ${SAVE} (${pages.length} páginas).`);
    return;
  }
  if (COMPARE) {
    const baseline = JSON.parse(fs.readFileSync(COMPARE, 'utf-8'));
    let diffs = 0;
    for (const rel of pages) {
      if (baseline[rel] !== result[rel]) {
        console.error(`✗ CAMBIÓ: ${rel}`);
        diffs++;
      } else {
        console.log(`✓ idéntico: ${rel}`);
      }
    }
    if (diffs) { console.error(`\n❌ ${diffs} página(s) con estilos computados distintos.`); process.exit(1); }
    console.log('\n✅ Estilos computados idénticos en todas las páginas (CSS-equivalente).');
    return;
  }
  console.log(JSON.stringify(result, null, 2));
}

main().catch((e) => { console.error('Error:', e); process.exit(1); });
