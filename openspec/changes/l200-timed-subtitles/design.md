El JS de juego ya ronda ~17 KB gzip. Audio + cues van a `l200-audio.js`
(`CampusL200Audio`), cache-bust `?v=`. Sin CDN.

Rutas (path-only), slot N:
1. `audio/l200/200_N.wav` (y `.mp3`/`.ogg` del mismo stem)
2. fallback `explicacion-N.mp3|.ogg`
Cues: `200_N.json`, luego `explicacion-N.json`. Play dispara HEAD/play y
`fetch` del JSON; el audio no espera al JSON.

Normalización: array `{ start, end, text }` en segundos; también `cues`/
`segments`/`words`, milisegundos, reloj `mm:ss` y Whisper-like. `cueAt`
usa `[start, end)`. Pause y seek reusan el mismo reloj (`timeupdate`/`seeked`).

El overlay no es un div desnudo: panel con badge, línea karaoke y caret,
encima de las barras. Sin cue se oculta. Pruebas: unidad de normalize +
Playwright con Audio mockeado y fixture JSON chico, sin wav de producción.
