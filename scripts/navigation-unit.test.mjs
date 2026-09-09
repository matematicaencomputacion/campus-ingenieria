import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

const source = readFileSync(new URL('../tools/lesson-navigation.js', import.meta.url), 'utf8');
function configured(target, current = '/campus/tools/lesson.html') {
  const location = new URL(current, 'https://campus.example');
  if (target !== undefined) location.searchParams.set('returnTo', target);
  const window = { location };
  window.parent = window;
  const attributes = new Map();
  const link = { setAttribute: (k, v) => attributes.set(k, v), querySelector: () => null };
  vm.runInNewContext(source, {
    URL, window,
    document: { currentScript: { src: 'https://campus.example/campus/tools/lesson-navigation.js' }, addEventListener() {} },
  });
  window.CampusLessonNavigation.configureLink(link);
  return { href: link.href, label: attributes.get('aria-label') };
}

test('permite solo los dos documentos del mismo Campus y conserva query/hash', () => {
  assert.equal(configured('index.html?q=seno&cat=trig').href, 'https://campus.example/campus/tools/index.html?q=seno&cat=trig');
  assert.equal(configured('../index.html#/materia/informatica/mate1/temario/n-lin').label, 'Volver a la materia');
  assert.equal(configured('../index.html#/home/informatica').label, 'Volver al Campus');
});

test('rechaza origen, credenciales, puerto, protocolo y rutas ajenas', () => {
  for (const target of [undefined, '', '//other.example/campus/tools/index.html',
    'https://campus.example:444/campus/tools/index.html', 'http://campus.example/campus/tools/index.html',
    'https://user:password@campus.example/campus/tools/index.html', 'javascript:alert(1)', 'data:text/html,hi',
    '/index.html', '../workbench.html', './lesson.html', './index.html/extra', './%69ndex.html', 'http://[']) {
    assert.equal(configured(target).href, 'https://campus.example/campus/tools/index.html', String(target));
  }
});

test('entrada directa al catálogo evita autorretorno y vuelve al Campus', () => {
  assert.equal(configured(undefined, '/campus/tools/index.html').href, 'https://campus.example/campus/index.html');
  assert.equal(configured('index.html?q=loop', '/campus/tools/index.html').href, 'https://campus.example/campus/index.html');
});
