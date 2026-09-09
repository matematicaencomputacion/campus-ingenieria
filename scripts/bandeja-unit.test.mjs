import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
const source = readFileSync(new URL('../tools/bandeja-pendientes.js', import.meta.url), 'utf8');
function queue(storage, getterFails = false) {
  const context = vm.createContext({});
  Object.defineProperty(context, 'localStorage', { get() { if (getterFails) throw new Error('getter denied'); return storage; } });
  vm.runInContext(source, context);
  return context.CampusBandeja;
}
const unavailable = { getItem() { throw new Error('read denied'); }, setItem() { throw new Error('write denied'); }, removeItem() { throw new Error('remove denied'); } };
for (const getterFails of [false, true]) {
  test(`mutaciones consecutivas sin storage (getter bloqueado: ${getterFails})`, () => {
    const q = queue(unavailable, getterFails);
    for (const id of ['one', 'two']) q.saveState(q.markDone(q.loadState(), id));
    assert.equal(q.loadState().statusById.one, 'done');
    assert.equal(q.loadState().statusById.two, 'done');
    q.resetState();
    assert.equal(Object.keys(q.loadState().statusById).length, 0);
  });
}
test('una escritura fallida no recupera datos persistidos obsoletos', () => {
  const stale = JSON.stringify({ k: 10, statusById: { old: 'done' } });
  const q = queue({ getItem: () => stale, setItem() { throw new Error('quota'); }, removeItem() { throw new Error('quota'); } });
  q.saveState(q.markDone(q.loadState(), 'one'));
  q.saveState(q.markDone(q.loadState(), 'two'));
  for (const id of ['old', 'one', 'two']) assert.equal(q.loadState().statusById[id], 'done');
  q.resetState();
  assert.equal(Object.keys(q.loadState().statusById).length, 0);
});
test('storage disponible persiste y reset borra datos', () => {
  let saved = null;
  const storage = { getItem: () => saved, setItem: (_, value) => { saved = value; }, removeItem: () => { saved = null; } };
  const first = queue(storage);
  first.saveState(first.markDone(first.loadState(), 'one'));
  const reload = queue(storage);
  assert.equal(reload.loadState().statusById.one, 'done');
  reload.resetState();
  assert.equal(saved, null);
  assert.equal(Object.keys(reload.loadState().statusById).length, 0);
});
