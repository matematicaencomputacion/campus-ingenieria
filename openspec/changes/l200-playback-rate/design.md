La velocidad vive en memoria de sesión (`sessionRate`, default 1). Cada barra
pinta 1× · 1,5× · 2×; un click actualiza todas y asigna `audio.playbackRate`
sin recargar la fuente. Se reaplica al arrancar play porque algunos
navegadores resetean el rate al cambiar `src`.

Candidatos: `audio/l200/200_N.mp3` y fallback `explicacion-N.mp3`. Cues:
`200_N.json` (igual que hoy). HEAD sigue exigiendo `audio/*` y rechaza HTML.

`npm test` cubre candidatos mp3 y `setPlaybackRate(1.5|2)`.
`npm run test:l200` cubre UI, rate al vuelo y karaoke.
