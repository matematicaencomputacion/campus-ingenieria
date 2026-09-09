#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

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
const jsFiles = ['app.js', 'data.js', 'tools/game-kit.js', 'tools/leccion-lineal-working-memory.js'];
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
