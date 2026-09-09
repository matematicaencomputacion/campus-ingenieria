import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

const window = {};
vm.runInNewContext(readFileSync(new URL('../tools/number-dictation.js', import.meta.url), 'utf8'), { window });
const parse = window.CampusNumberDictation.parseNumber;

test('dictado: reconoce signo, acentos, cifras y decimales españoles', () => {
  for (const [spoken, expected] of [
    ['cero', '0'], ['cinco', '5'], ['once', '11'], ['menos tres', '-3'],
    ['negativo once', '-11'], ['menos uno coma cinco', '-1.5'],
    ['  Más DOS. ', '2'], ['veintidós', '22'], ['treinta y cuatro', '34'],
    ['−1,5', '-1.5'], ['menos 2.5', '-2.5'], ['1 coma cero cinco', '1.05'],
    ['cero punto veinticinco', '0.25'], ['noventa', '90'], ['- 0', '0'],
  ]) assert.equal(parse(spoken), expected, spoken);
});

test('dictado: no extrae números de frases ambiguas ni evalúa expresiones', () => {
  for (const spoken of ['', 'hola', 'cinco o seis', 'uno dos', '2 + 3', 'f de cuatro es cinco',
    'menos menos dos', 'uno coma', '1,2,3', 'NaN', 'Infinity', 'constructor',
    '9007199254740992', '<script>5</script>', null, undefined]) {
    assert.equal(parse(spoken), null, String(spoken));
  }
});
