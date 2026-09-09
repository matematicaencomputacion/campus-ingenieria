#!/usr/bin/env node
/**
 * Smoke test de navegador (headless) para Campus Ingeniería.
 *
 * Abre cada página HTML en Chromium y falla si detecta:
 *   - Excepciones JS no capturadas (pageerror).
 *   - Mensajes console.error.
 *   - Requests same-origin con status >= 400 (assets rotos / 404).
 *
 * A diferencia del smoke test estático (scripts/smoke-test.mjs), este SÍ ejecuta
 * el JS de cada lección: detecta canvas que revientan, referencias rotas y
 * errores de runtime que un `node --check` jamás vería.
 *
 * Uso:  node scripts/browser-smoke.mjs [--sample N] [--only substr]
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
const sampleIdx = args.indexOf('--sample');
const SAMPLE = sampleIdx !== -1 ? parseInt(args[sampleIdx + 1], 10) : 0;
const onlyIdx = args.indexOf('--only');
const ONLY = onlyIdx !== -1 ? args[onlyIdx + 1] : null;
const CONCURRENCY = 6;
const SETTLE_MS = 500; // margen para init de canvas / requestAnimationFrame

// Errores conocidos-benignos que NO deben tumbar el test (regex sobre el texto).
const ALLOWLIST = [
  // (vacío por ahora — agregar patrones justificados si aparecen falsos positivos)
];
const isAllowed = (msg) => ALLOWLIST.some((re) => re.test(msg));

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const urlPath = decodeURIComponent(req.url.split('?')[0]);
      let filePath = path.join(ROOT, urlPath === '/' ? 'index.html' : urlPath);
      // Evitar path traversal
      if (!filePath.startsWith(ROOT)) {
        res.writeHead(403).end('forbidden');
        return;
      }
      fs.stat(filePath, (err, st) => {
        if (err || !st.isFile()) {
          res.writeHead(404).end('not found');
          return;
        }
        const type = MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': type });
        fs.createReadStream(filePath).pipe(res);
      });
    });
    server.listen(0, '127.0.0.1', () => {
      resolve({ server, port: server.address().port });
    });
  });
}

function listPages() {
  const toolsDir = path.join(ROOT, 'tools');
  const toolPages = fs
    .readdirSync(toolsDir)
    .filter((f) => f.endsWith('.html'))
    .map((f) => `tools/${f}`);
  let pages = ['index.html', 'workbench.html', ...toolPages];
  if (ONLY) pages = pages.filter((p) => p.includes(ONLY));
  if (SAMPLE > 0) pages = pages.filter((_, i) => i % Math.ceil(pages.length / SAMPLE) === 0);
  return pages;
}

async function checkPage(browser, base, rel) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const problems = [];
  const origin = new URL(base).origin;

  page.on('pageerror', (err) => {
    const msg = `pageerror: ${err.message}`;
    if (!isAllowed(msg)) problems.push(msg);
  });
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const msg = `console.error: ${m.text()}`;
    if (!isAllowed(msg)) problems.push(msg);
  });
  page.on('response', (resp) => {
    const u = resp.url();
    if (u.startsWith(origin) && resp.status() >= 400) {
      problems.push(`http ${resp.status()}: ${u.replace(origin, '')}`);
    }
  });

  try {
    await page.goto(`${base}/${rel}`, { waitUntil: 'load', timeout: 20000 });
    await page.waitForTimeout(SETTLE_MS);
  } catch (e) {
    problems.push(`navegación falló: ${e.message}`);
  } finally {
    await context.close();
  }
  return problems;
}

async function main() {
  const { server, port } = await startServer();
  const base = `http://127.0.0.1:${port}`;
  const pages = listPages();
  console.log(`🌐 Browser smoke test · ${pages.length} páginas · concurrencia ${CONCURRENCY}\n`);

  const browser = await chromium.launch();
  const results = [];
  let idx = 0;

  async function worker() {
    while (idx < pages.length) {
      const rel = pages[idx++];
      const problems = await checkPage(browser, base, rel);
      if (problems.length === 0) {
        process.stdout.write('.');
        results.push({ rel, ok: true });
      } else {
        process.stdout.write('X');
        results.push({ rel, ok: false, problems });
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  await browser.close();
  server.close();

  const failed = results.filter((r) => !r.ok);
  console.log(`\n\n----------------------------------------`);
  console.log(`Páginas probadas: ${results.length}`);
  console.log(`OK:               ${results.length - failed.length}`);
  console.log(`Con problemas:    ${failed.length}`);
  console.log(`----------------------------------------\n`);

  if (failed.length) {
    for (const f of failed.sort((a, b) => a.rel.localeCompare(b.rel))) {
      console.error(`✗ ${f.rel}`);
      for (const p of f.problems) console.error(`    · ${p}`);
    }
    console.error(`\n❌ Browser smoke test FALLÓ (${failed.length} páginas con problemas).`);
    process.exit(1);
  }
  console.log('✅ Todas las páginas cargaron sin errores de runtime.');
}

main().catch((e) => {
  console.error('Error fatal en el browser smoke test:', e);
  process.exit(1);
});
