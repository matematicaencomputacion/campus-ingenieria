## Purpose
Sincronizar subtítulos tipo karaoke con las dos explicaciones de L200.

## ADDED Requirements
### Requirement: Rutas 200_N y fallback
Al reproducir el slot N, L200 SHALL probar `audio/l200/200_N.wav` (y el mismo
stem en mp3/ogg) y SHALL conservar el fallback `explicacion-N.mp3|.ogg`.
SHALL cargar `200_N.json` (o `explicacion-N.json`). SHALL NOT usar CDN.
#### Scenario: Candidatos del slot 1
- **WHEN** se consultan las rutas del slot 1
- **THEN** el primer audio es `audio/l200/200_1.wav` y el primer JSON es
  `audio/l200/200_1.json`.

### Requirement: Cues flexibles
L200 SHALL normalizar el JSON a `{ start, end, text }` en segundos, incluyendo
arrays sueltos, `cues`/`segments`/`words`, milisegundos y segmentos Whisper.
#### Scenario: Whisper y milisegundos
- **WHEN** llega `{ segments: [{ start, end, text }] }` o `start_ms`/`end_ms`
- **THEN** `cueAt(t)` devuelve el texto cuyo intervalo cubre `t` en segundos.

### Requirement: Overlay sincronizado
Al `timeupdate` o seek, L200 SHALL mostrar el cue activo en un panel flotante
integrado (no un contenedor vacío) y SHALL limpiarlo si no hay cue. Pausa y
seek SHALL mantener el texto alineado con `currentTime`.
#### Scenario: Seek a un hueco
- **WHEN** `currentTime` no cae en ningún cue
- **THEN** el overlay queda vacío y oculto.
