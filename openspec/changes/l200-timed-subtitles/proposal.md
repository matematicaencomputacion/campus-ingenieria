## Why
Darío deja explicaciones grabadas en L200. Sin cues sincronizados el alumno
escucha el audio suelto; con un overlay tipo karaoke el texto acompaña el
reproducción y el seek.

## What Changes
- Aceptar `tools/audio/l200/200_1.wav` + `200_1.json` (y `200_2.*` en el slot 2),
  conservando el fallback `explicacion-N.mp3|.ogg`.
- Normalizar JSON flexible a cues `{ start, end, text }` en segundos.
- Mostrar el cue activo en un panel flotante integrado a la UI oscura de Campus.
- Extraer audio + subtítulos a `l200-audio.js` para no inflar el JS de juego.

## Capabilities
### New Capabilities
- `timed-subtitles`: overlay sincronizado por `timeupdate`/seek en las ranuras L200.
### Modified Capabilities
- `explanation-audio`: las ranuras también prueban `200_N.wav` y cargan JSON.

## Impact
L200 HTML/JS, módulo nuevo, pruebas, README y fixture chico de JSON.
Sin CDN ni wav grandes en el repo.
Rollback: revertir el commit del change.
