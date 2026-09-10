import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

const window = { document: undefined };
vm.runInNewContext(readFileSync(new URL('../tools/l200-audio.js', import.meta.url), 'utf8'), {
  window,
  globalThis: window
});
const api = window.CampusL200Audio;
const fixture = JSON.parse(readFileSync(new URL('./fixtures/l200-200_1.json', import.meta.url), 'utf8'));

function fromVm(value) {
  return JSON.parse(JSON.stringify(value));
}

test('L200 audio: HEAD solo acepta Content-Type audio/*', () => {
  assert.equal(api.isAudioContentType('audio/mpeg'), true);
  assert.equal(api.isAudioContentType('audio/wav; charset=binary'), true);
  assert.equal(api.isAudioContentType('text/html'), false);
  assert.equal(api.isAudioContentType('text/html; charset=utf-8'), false);
  assert.equal(api.isAudioContentType('application/json'), false);
  assert.equal(api.isAudioContentType('application/octet-stream'), false);
  assert.equal(api.isAudioContentType(''), false);
});

test('L200 audio: candidatos solo mp3 (200_N + fallback)', () => {
  assert.deepEqual(fromVm(api.audioCandidatesFor('audio/l200', '1', 'explicacion-1')), [
    'audio/l200/200_1.mp3',
    'audio/l200/explicacion-1.mp3'
  ]);
  assert.deepEqual(fromVm(api.audioCandidatesFor('audio/l200', '2', 'explicacion-2')), [
    'audio/l200/200_2.mp3',
    'audio/l200/explicacion-2.mp3'
  ]);
  assert.deepEqual(fromVm(api.cueCandidatesFor('audio/l200', '2', 'explicacion-2')), [
    'audio/l200/200_2.json',
    'audio/l200/explicacion-2.json'
  ]);
});

test('L200 audio: playbackRate 1, 1.5 y 2', () => {
  assert.deepEqual(fromVm(api.PLAYBACK_RATES), [1, 1.5, 2]);
  assert.equal(api.normalizePlaybackRate(1), 1);
  assert.equal(api.normalizePlaybackRate(1.5), 1.5);
  assert.equal(api.normalizePlaybackRate(2), 2);
  assert.equal(api.normalizePlaybackRate(3), 1);
  assert.equal(api.setPlaybackRate(1), 1);
  assert.equal(api.playbackRate(), 1);
  assert.equal(api.setPlaybackRate(1.5), 1.5);
  assert.equal(api.playbackRate(), 1.5);
  assert.equal(api.setPlaybackRate(2), 2);
  assert.equal(api.playbackRate(), 2);
  assert.equal(api.setPlaybackRate(0.75), 1);
  assert.equal(api.playbackRate(), 1);
});

test('L200 audio: fixture { start, end, text } en segundos', () => {
  const cues = api.normalizeCues(fixture);
  assert.equal(cues.length, 2);
  assert.equal(api.cueAt(cues, 0.4).text, 'Esta es la recta.');
  assert.equal(api.cueAt(cues, 2).text, 'f(x) = mx + b');
  assert.equal(api.cueAt(cues, 5), null);
});

test('L200 audio: normaliza Whisper, words y milisegundos', () => {
  const whisper = api.normalizeCues({
    segments: [
      { start: 0, end: 1.2, text: 'Hola clase' },
      { start: 1.2, end: 2.4, text: 'vamos con la recta' }
    ]
  });
  assert.equal(api.cueAt(whisper, 1.3).text, 'vamos con la recta');

  const words = api.normalizeCues({
    words: [
      { word: 'f', start: 0, end: 0.2 },
      { word: 'de', start: 0.2, end: 0.4 },
      { word: 'x', start: 0.4, end: 0.7 }
    ]
  });
  assert.equal(api.cueAt(words, 0.5).text, 'x');

  const ms = api.normalizeCues([
    { start_ms: 0, end_ms: 1500, text: 'milisegundos' },
    { start_ms: 1500, end_ms: 3000, text: 'después' }
  ]);
  assert.equal(api.cueAt(ms, 0.2).text, 'milisegundos');
  assert.equal(api.cueAt(ms, 1.7).text, 'después');

  const clock = api.normalizeCues([
    { start: '00:00:00,000', end: '00:00:01,200', text: 'reloj' }
  ]);
  assert.equal(api.cueAt(clock, 0.8).text, 'reloj');
});
