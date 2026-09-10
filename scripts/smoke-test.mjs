#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

let totalTests = 0;
let passedTests = 0;
let warnings = [];
let errors = [];

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ ${message}`);
  } else {
    errors.push(message);
    console.error(`  ✗ FAIL: ${message}`);
  }
}

function warn(message) {
  warnings.push(message);
  console.warn(`  ⚠ WARN: ${message}`);
}

console.log('🧪 Iniciando Smoke Tests de Campus Ingeniería...\n');

// 1. Archivos públicos esenciales
console.log('📁 1. Verificando estructura de archivos esenciales:');
const requiredFiles = [
  'index.html',
  'app.js',
  'data.js',
  'styles.css',
  'tools/index.html',
  'tools/game-kit.js',
  'resources/favicon.png'
];
for (const rel of requiredFiles) {
  const full = path.join(ROOT, rel);
  assert(fs.existsSync(full), `Existe archivo esencial: ${rel}`);
}

// 2. Archivos prohibidos en producción
console.log('\n🚫 2. Verificando que no existan archivos prohibidos (.bak, shots/, tools/_gen/):');
assert(!fs.existsSync(path.join(ROOT, 'shots')), 'No existe directorio shots/');
assert(!fs.existsSync(path.join(ROOT, 'tools/_gen')), 'No existe directorio tools/_gen/');

function findBakFiles(dir) {
  let baks = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      baks = baks.concat(findBakFiles(full));
    } else if (entry.name.endsWith('.bak')) {
      baks.push(full);
    }
  }
  return baks;
}
const bakFiles = findBakFiles(ROOT);
assert(bakFiles.length === 0, `No hay archivos temporales *.bak (encontrados: ${bakFiles.length})`);

// 3. Sintaxis JavaScript
console.log('\n⚙️ 3. Validando sintaxis JavaScript (node --check):');
const jsFiles = [
  'app.js',
  'data.js',
  'tools/game-kit.js',
  'tools/pending-queue-mock.js',
  'tools/bandeja-pendientes.js',
  'tools/enfoque-tabs.js',
  'tools/enfoque-elige.js',
  'tools/lesson-bar.js',
  'tools/l200-audio.js',
  'tools/leccion-lineal-working-memory.js',
  'tools/plantilla-shell.js'
];
for (const rel of jsFiles) {
  const full = path.join(ROOT, rel);
  if (fs.existsSync(full)) {
    try {
      execFileSync('node', ['--check', full], { stdio: 'pipe' });
      assert(true, `Sintaxis JS válida: ${rel}`);
    } catch (e) {
      assert(false, `Error de sintaxis en ${rel}: ${e.message}`);
    }
  }
}

// 4. Auditoría de enlaces en tools/index.html
console.log('\n🔗 4. Auditando enlaces en tools/index.html:');
const toolsIndexPath = path.join(ROOT, 'tools/index.html');
const toolsIndexContent = fs.readFileSync(toolsIndexPath, 'utf-8');
const linkMatches = [...toolsIndexContent.matchAll(/href=["']([^"']+\.html)["']/g)];
const uniqueLinks = [...new Set(linkMatches.map(m => m[1]))];

const KNOWN_LIVE_ONLY = new Set([
  'construccion-seno.html',
  'construccion-coseno.html',
  'leccion-transformaciones.html',
  'leccion-seno-desplazado.html',
  'leccion-coseno-desplazado.html',
  'leccion-seno-amplitud.html',
  'leccion-coseno-amplitud.html'
]);

let missingCount = 0;
let liveOnlyCount = 0;

for (const link of uniqueLinks) {
  if (link.startsWith('http') || link.startsWith('#') || link.startsWith('../')) continue;
  const target = path.join(ROOT, 'tools', link);
  const exists = fs.existsSync(target);
  if (!exists) {
    if (KNOWN_LIVE_ONLY.has(link)) {
      liveOnlyCount++;
      warn(`Archivo solo en producción (pendiente sincronización): tools/${link}`);
    } else {
      missingCount++;
      assert(false, `Enlace roto en tools/index.html: tools/${link}`);
    }
  }
}

if (liveOnlyCount > 0) {
  console.log(`     ℹ️  Se detectaron ${liveOnlyCount} archivos solo-live conocidos. Usa npm run reconcile para traerlos.`);
}
assert(missingCount === 0, `No hay enlaces 404 desconocidos en tools/index.html (rotos: ${missingCount})`);

// 5. Validar referencias toolUrl en data.js
console.log('\n📚 5. Validando referencias toolUrl en data.js:');
const dataContent = fs.readFileSync(path.join(ROOT, 'data.js'), 'utf-8');
const toolUrlMatches = [...dataContent.matchAll(/toolUrl:\s*["']([^"']+)["']/g)];
if (toolUrlMatches.length > 0) {
  for (const match of toolUrlMatches) {
    const relUrl = match[1];
    const fullPath = path.join(ROOT, relUrl);
    assert(fs.existsSync(fullPath), `toolUrl existe en el sistema de archivos: ${relUrl}`);
  }
} else {
  console.log('     (No hay toolUrls registradas aún en data.js)');
}

// 6. Validar DOCTYPE en HTML
console.log('\n📄 6. Comprobando DOCTYPE en documentos HTML:');
const rootHtmlFiles = ['index.html', 'workbench.html'];
for (const f of rootHtmlFiles) {
  const p = path.join(ROOT, f);
  if (fs.existsSync(p)) {
    const start = fs.readFileSync(p, 'utf-8').slice(0, 100).toLowerCase();
    assert(start.includes('<!doctype html>'), `${f} tiene declaración <!doctype html>`);
  }
}

// 7. Bandeja Top-K (mock + ranking + localStorage)
console.log('\n📥 7. Prototipo bandeja Top-K pendientes:');
{
  const mockPath = path.join(ROOT, 'tools/pending-queue-mock.js');
  const bandejaPath = path.join(ROOT, 'tools/bandeja-pendientes.js');
  const indexHtml = fs.readFileSync(toolsIndexPath, 'utf-8');
  assert(indexHtml.includes('id="bandeja-pendientes"'), 'tools/index.html monta #bandeja-pendientes');
  assert(indexHtml.includes('pending-queue-mock.js'), 'tools/index.html carga pending-queue-mock.js');
  assert(indexHtml.includes('bandeja-pendientes.js'), 'tools/index.html carga bandeja-pendientes.js');

  const memory = {};
  const storage = {
    getItem: (key) => (Object.prototype.hasOwnProperty.call(memory, key) ? memory[key] : null),
    setItem: (key, value) => { memory[key] = String(value); },
    removeItem: (key) => { delete memory[key]; }
  };
  const sandbox = { localStorage: storage, console };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(mockPath, 'utf-8'), sandbox);
  vm.runInContext(fs.readFileSync(bandejaPath, 'utf-8'), sandbox);

  const queue = sandbox.CAMPUS_PENDING_QUEUE;
  const bandeja = sandbox.CampusBandeja;
  assert(!!queue && Array.isArray(queue.items), 'Mock CAMPUS_PENDING_QUEUE.items existe');
  assert(queue.items.length >= 15 && queue.items.length <= 24, `Mock tiene 15–24 ítems (ahora ${queue.items.length})`);
  assert(queue.defaultK === 10, 'K por defecto es 10');
  assert(!!bandeja, 'CampusBandeja está expuesto');

  let mockHrefsOk = true;
  const titles = [];
  for (const item of queue.items) {
    const required = ['id', 'title', 'href', 'rank', 'status'];
    for (const key of required) {
      if (item[key] == null) {
        mockHrefsOk = false;
        assert(false, `Ítem mock completo (${item.id || '?'}.${key})`);
      }
    }
    if (item.status !== 'pending' && item.status !== 'done') {
      mockHrefsOk = false;
      assert(false, `status pending|done en ${item.id}`);
    }
    const target = path.join(ROOT, 'tools', item.href);
    if (!fs.existsSync(target)) {
      mockHrefsOk = false;
      assert(false, `href real de lección: tools/${item.href}`);
    }
    titles.push(String(item.title).toLowerCase());
  }
  if (mockHrefsOk) {
    assert(true, `Los ${queue.items.length} href del mock existen en tools/`);
  }
  const blob = titles.join(' | ');
  assert(blob.includes('working memory') || blob.includes('l200'), 'Mock incluye L200 working memory');
  assert(blob.includes('l183') || blob.includes('cara triste'), 'Mock incluye L183');
  assert(blob.includes('lineal'), 'Mock incluye lineales');
  assert(blob.includes('dominio'), 'Mock incluye dominio');

  const merged = bandeja.mergeQueue(queue.items, bandeja.emptyState());
  const top10 = bandeja.topPending(merged, 10);
  assert(top10.length === 10, `Top-K=10 devuelve 10 pendientes (obtuvo ${top10.length})`);
  assert(top10.every((it) => it.status === 'pending'), 'Top-K solo incluye status pending');
  assert(top10.every((it) => it.enabled !== false), 'Top-K ignora ítems deshabilitados');
  assert(
    top10.every((it, i) => i === 0 || it.rank >= top10[i - 1].rank),
    'Top-K ordena por rank ascendente'
  );
  assert(top10[0].id === 'l200-wm', 'El pendiente de mayor prioridad es L200');
  assert(bandeja.topPending(merged, 5).length === 5, 'K=5 devuelve 5');
  assert(bandeja.topPending(merged, 15).length === 15, 'K=15 devuelve 15');
  assert(bandeja.normalizeK(7) === 10, 'K inválido cae a 10');
  assert(
    bandeja.pendingLabel(1, 10) === 'Tenés 1 tarea pendiente (top 10)',
    'Copia singular de la bandeja'
  );
  assert(
    bandeja.pendingLabel(16, 10) === 'Tenés 16 tareas pendientes (top 10)',
    'Copia plural de la bandeja'
  );

  const firstId = top10[0].id;
  const afterDone = bandeja.mergeQueue(queue.items, bandeja.markDone(bandeja.emptyState(), firstId));
  const topAfter = bandeja.topPending(afterDone, 10);
  assert(topAfter.every((it) => it.id !== firstId), 'Marcar hecha saca el ítem del Top-K');
  assert(topAfter.length === 10, 'Al completar, entra el siguiente pendiente (sigue habiendo 10)');
  const disabled = bandeja.mergeQueue(
    queue.items,
    bandeja.setEnabled(bandeja.emptyState(), firstId, false)
  );
  assert(
    bandeja.topPending(disabled, 10).every((it) => it.id !== firstId),
    'Deshabilitar en mock docente saca el ítem de la cola'
  );
}

// 8. L201 Enfoque · dual nav + lámina H/V/oblicua
console.log('\n📐 8. L201 Enfoque (dual nav y primera lámina):');
{
  const l201Path = path.join(ROOT, 'tools/leccion-enfoque-formas-recta.html');
  const tabsJsPath = path.join(ROOT, 'tools/enfoque-tabs.js');
  const tabsCssPath = path.join(ROOT, 'tools/enfoque-tabs.css');
  const l201 = fs.readFileSync(l201Path, 'utf-8');
  const tabsJs = fs.readFileSync(tabsJsPath, 'utf-8');
  const tabsCss = fs.readFileSync(tabsCssPath, 'utf-8');
  assert(fs.existsSync(l201Path), 'Existe tools/leccion-enfoque-formas-recta.html');
  assert(l201.includes('enfoque-tabs.css?v=20260909e'), 'L201 cache-bust CSS ?v=20260909e');
  assert(l201.includes('enfoque-tabs.js?v=20260909e'), 'L201 cache-bust JS ?v=20260909e');
  assert(/Horizontal, vertical u oblicua/.test(l201), 'Teoría arranca con H/V/oblicua');
  assert(l201.includes('Función lineal vs ecuación de la recta'), 'Sigue el marco función vs ecuación');
  assert(l201.includes('audioBase: "audio/l201"'), 'L201 declara audioBase local');
  assert(l201.includes('Las rectas horizontales y oblicuas son funciones'), 'Panel compañero en la primera lámina de Teoría');
  assert(!/<a class="lesson-nav/.test(l201), 'L201 ya no usa lesson-nav de lección a lección en el marco');
  assert(tabsJs.includes('makePager("eleccion"'), 'enfoque-tabs.js crea pagers de elección');
  assert(!tabsJs.includes('makePager("lamina"'), 'Láminas ya no usan chevrons laterales');
  assert(tabsJs.includes('enfoque-media'), 'enfoque-tabs.js monta la barra de media');
  assert(tabsJs.includes('Sin audio aún'), 'Play sin archivo avisa en español');
  assert(tabsCss.includes('.enfoque-pager--eleccion'), 'CSS ubica elección arriba');
  assert(tabsCss.includes('.enfoque-media'), 'CSS de la barra de media');
  assert(!tabsCss.includes('.enfoque-pager--lamina'), 'CSS ya no posiciona chevrons de lámina');
  assert(fs.existsSync(path.join(ROOT, 'tools/audio/l201')), 'Andamiaje tools/audio/l201/');
  const slideBlocks = [...l201.matchAll(/slides:\s*\[/g)];
  assert(slideBlocks.length >= 11, `Cada etiqueta declara slides[] (${slideBlocks.length})`);
  const chromeNav = fs.readFileSync(path.join(ROOT, 'tools/lesson-chrome-3b0ebb5a.css'), 'utf-8');
  assert(/\.lesson-nav\s*\{[^}]*top:\s*44px/.test(chromeNav), 'Chrome compartido: triángulos a 44px');
  const shellCss = fs.readFileSync(path.join(ROOT, 'tools/lesson-shell.css'), 'utf-8');
  assert(shellCss.includes('top: 44px'), 'lesson-shell.css sube los triángulos');
}

// 10. L199 Plantilla shell · dos ejes + rieles (sin material didáctico)
console.log('\n🧩 10. L199 Plantilla shell (ejes, rieles y placeholders):');
{
  const l199Path = path.join(ROOT, 'tools/leccion-plantilla-shell.html');
  const shellJsPath = path.join(ROOT, 'tools/plantilla-shell.js');
  const shellCssPath = path.join(ROOT, 'tools/plantilla-shell.css');
  const l199 = fs.readFileSync(l199Path, 'utf-8');
  const shellJs = fs.readFileSync(shellJsPath, 'utf-8');
  const shellCss = fs.readFileSync(shellCssPath, 'utf-8');
  const indexHtml = fs.readFileSync(path.join(ROOT, 'tools/index.html'), 'utf-8');
  assert(fs.existsSync(l199Path), 'Existe tools/leccion-plantilla-shell.html');
  assert(l199.includes('plantilla-shell.css?v=20260910-l199'), 'L199 cache-bust CSS ?v=20260910-l199');
  assert(l199.includes('plantilla-shell.js?v=20260910-l199'), 'L199 cache-bust JS ?v=20260910-l199');
  assert(l199.includes('enfoque-tabs.css?v=20260909e'), 'L199 reusa enfoque-tabs.css');
  assert(l199.includes('lesson-shell.css?v=20260909-nav2'), 'L199 reusa lesson-shell.css');
  assert(l199.includes('lesson-navigation.js?v=20260909-nav2'), 'L199 cablea lesson-navigation.js');
  assert(l199.includes('lesson-bar.js?v=20260909-nav2'), 'L199 monta lesson-bar (una salida)');
  assert(l199.includes('lang="es"'), 'L199 declara UI en español');
  assert(l199.includes('Slot contenido (placeholder)'), 'L199 es shell con slots, no material didáctico');
  assert(!/y = mx \+ b/.test(l199), 'L199 no copia el contenido didáctico de L201');
  assert(indexHtml.includes('leccion-plantilla-shell.html'), 'Catálogo enlaza L199');
  assert(indexHtml.includes('Lección 199'), 'Catálogo muestra Lección 199');
  assert(shellJs.includes('FOCO: Lección ±'), 'JS distingue eje Lección ±');
  assert(shellJs.includes('FOCO: Slide'), 'JS distingue eje Slide ◀▶');
  assert(shellJs.includes('Modo Foco'), 'JS expone Modo Foco');
  assert(shellJs.includes('unknownAxis'), 'JS cierra el switch de eje');
  assert(shellJs.includes('unknownRail'), 'JS cierra el switch de riel');
  assert(shellCss.includes('--plantilla-lesson: #59a6ff'), 'CSS foco lección azul Figma');
  assert(shellCss.includes('--plantilla-slide: #ffb847'), 'CSS foco slide ámbar Figma');
  assert(shellCss.includes('data-foco="on"'), 'CSS Modo Foco oculta chrome');
}

// 9. L200 · sin Dictar + dos barras de audio locales
console.log('\n🎧 9. L200 (tabla, Sonido y audio local):');
{
  const l200Path = path.join(ROOT, 'tools/leccion-lineal-working-memory.html');
  const l200JsPath = path.join(ROOT, 'tools/leccion-lineal-working-memory.js');
  const l200 = fs.readFileSync(l200Path, 'utf-8');
  const l200Js = fs.readFileSync(l200JsPath, 'utf-8');
  assert(fs.existsSync(l200Path), 'Existe tools/leccion-lineal-working-memory.html');
  const l200AudioPath = path.join(ROOT, 'tools/l200-audio.js');
  const l200Audio = fs.readFileSync(l200AudioPath, 'utf-8');
  assert(l200.includes('l200-audio.js?v=20260910-rate'), 'L200 cache-bust audio JS ?v=20260910-rate');
  assert(!fs.existsSync(path.join(ROOT, 'tools/audio/l200/200_1.ogg')), 'Explicación 1 no duplica ogg junto al mp3');
  assert(l200.includes('leccion-lineal-working-memory.js?v=20260910-rate'), 'L200 cache-bust JS ?v=20260910-rate');
  assert(!l200.includes('number-dictation.js'), 'L200 ya no carga number-dictation.js');
  assert(!l200.includes('dictateBtn'), 'L200 ya no tiene Dictar');
  assert(!l200.includes('Podés dictar'), 'L200 ya no muestra ayuda de dictado');
  assert(l200.includes('data-audio-base="audio/l200"'), 'L200 declara audioBase local');
  assert(l200.includes('data-audio-stem="explicacion-1"'), 'Slot local explicacion-1');
  assert(l200.includes('data-audio-stem="explicacion-2"'), 'Slot local explicacion-2');
  assert(l200.includes('id="l200Subtitles"'), 'Host del overlay de subtítulos');
  assert(l200.includes('l200-subs-panel'), 'Panel de subtítulos integrado, no un div desnudo');
  assert(l200.includes('Explicación 1') && l200.includes('Explicación 2'), 'Etiquetas en español');
  assert(l200.includes('margin-bottom: 14px'), 'Sonido no queda pegado al borde');
  assert(l200Audio.includes('Sin audio aún'), 'Play sin archivo avisa en español');
  assert(l200Audio.includes('200_') && l200Audio.includes('.mp3') && l200Audio.includes('.json'), 'JS arma rutas 200_N');
  assert(!l200Audio.includes('.wav') && !l200Audio.includes('.ogg'), 'Probe de audio solo mp3');
  assert(l200Audio.includes('playbackRate'), 'Aplica velocidad de reproducción');
  assert(l200Audio.includes('normalizeCues'), 'Normaliza JSON de cues');
  assert(!l200Js.includes('CampusNumberDictation'), 'JS ya no cablea dictado');
  assert(fs.existsSync(path.join(ROOT, 'tools/audio/l200')), 'Andamiaje tools/audio/l200/');
  assert(fs.existsSync(path.join(ROOT, 'scripts/fixtures/l200-200_1.json')), 'Fixture JSON de cues para pruebas');
}

// Resumen final
console.log('\n----------------------------------------');
console.log(`Pruebas ejecutadas: ${totalTests}`);
console.log(`Pruebas aprobadas:  ${passedTests}`);
console.log(`Advertencias:       ${warnings.length}`);
console.log(`Errores:            ${errors.length}`);
console.log('----------------------------------------\n');

if (errors.length > 0) {
  console.error('❌ El Smoke Test ha fallado.');
  process.exit(1);
} else {
  console.log('✅ Todos los tests pasaron exitosamente.');
  process.exit(0);
}
