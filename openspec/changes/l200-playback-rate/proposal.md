## Why
Las explicaciones de L200 se escuchan solo a velocidad normal. Darío pide
1× / 1,5× / 2× sin perder el karaoke, y DevOps pide dejar de probar wav/ogg
(HEAD de más contra nginx).

## What Changes
- Control compacto de velocidad en cada barra (1×, 1,5×, 2×), compartido
  por sesión, default 1×. Al cambiar con el audio en marcha se aplica
  `playbackRate` al vuelo; el karaoke sigue `currentTime`.
- Candidatos de audio solo `.mp3` (`200_N.mp3`, fallback `explicacion-N.mp3`).
  El JSON de cues no cambia (`200_N.json`). El chequeo de Content-Type HEAD
  se conserva.

## Capabilities
### New Capabilities
- `playback-rate`: velocidad 1 / 1.5 / 2 en las barras de explicación.
### Modified Capabilities
- `explanation-audio` / `timed-subtitles`: probe solo mp3.

## Impact
`tools/l200-audio.js`, CSS de L200, pruebas y README. Mute, volumen y seek
iguales. Rollback: revertir el commit.
