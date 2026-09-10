## Why
Darío pide sacar Dictar de L200 y dejar dos ranuras de audio grabado, con el indicador de Sonido un poco más arriba.

## What Changes
- Quitar el botón Dictar, su texto de ayuda/privacidad y la carga de `number-dictation.js` en L200.
- Conservar escritura + Enter para las respuestas de la tabla.
- Subir el control «Sonido: off» para que no quede pegado al borde.
- Dos barras de audio al pie, andamiaje como L201: `tools/audio/l200/explicacion-1.mp3` y `explicacion-2.mp3` (u `.ogg`), Play/mute y «Sin audio aún» si falta el archivo. Sin CDN.

## Capabilities
### New Capabilities
- `explanation-audio`: dos ranuras locales de explicación en L200.
### Modified Capabilities
Ninguna. El dictado deja de usarse en L200; el módulo compartido no se carga.

## Impact
Solo L200 HTML/JS, pruebas, README y carpeta `tools/audio/l200/`. Se conservan tabla automática, forma fácil, zoom iso6x y lock de P2.
Rollback: revertir el commit del change.
