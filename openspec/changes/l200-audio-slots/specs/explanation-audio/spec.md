## Purpose
Reemplazar el dictado de L200 por dos ranuras de audio grabado, sin cambiar la tabla ni la forma fácil.

## ADDED Requirements
### Requirement: Sin Dictar
L200 SHALL NOT mostrar Dictar, textos de dictado ni cargar `number-dictation.js`. La casilla activa SHALL seguir confirmándose con OK o Enter.
#### Scenario: Abrir la tabla
- **WHEN** el alumno abre L200
- **THEN** no hay Dictar y puede escribir f(x) y confirmar con Enter.

### Requirement: Dos barras locales
L200 SHALL mostrar al pie dos barras etiquetadas «Explicación 1» y «Explicación 2», cableadas a `audio/l200/explicacion-1.mp3|.ogg` y `audio/l200/explicacion-2.mp3|.ogg`. Play SHALL avisar «Sin audio aún» si el archivo no está. SHALL NOT usar CDN.
#### Scenario: Play sin archivo
- **WHEN** se pulsa Play y no hay mp3/ogg local
- **THEN** la barra correspondiente muestra «Sin audio aún».

### Requirement: Sonido del juego más arriba
El indicador «Sonido: off» SHALL quedar por encima de las barras de explicación, no pegado al borde inferior.
#### Scenario: Layout del pie
- **WHEN** se abre L200
- **THEN** el medidor de Sonido está más arriba que las dos barras de audio.
