## Purpose
Controlar la velocidad de las explicaciones de L200 sin desfasar el karaoke
y con menos HEAD.

## ADDED Requirements
### Requirement: Tres velocidades
L200 SHALL ofrecer 1×, 1,5× y 2× en cada barra de explicación. Default SHALL
ser 1×. La elección SHALL aplicarse a ambas barras en la misma sesión.
Cambiar la velocidad con audio en marcha SHALL actualizar `playbackRate`
sin reiniciar salvo que el navegador lo exija. Mute, volumen y seek SHALL
quedar igual. El overlay SHALL seguir `audio.currentTime`.
#### Scenario: Cambiar a 1,5× mientras suena
- **WHEN** Explicación 1 está en play y se elige 1,5×
- **THEN** `playbackRate` pasa a 1.5, el `src` no cambia y el karaoke
  sigue mostrando el cue de `currentTime`.

### Requirement: Probe solo mp3
Al reproducir el slot N, L200 SHALL probar `audio/l200/200_N.mp3` y el
fallback `explicacion-N.mp3`. SHALL NOT incluir `.wav` ni `.ogg` en la
lista. SHALL cargar `200_N.json` (o `explicacion-N.json`). HEAD SHALL
seguir rechazando `text/html`.
#### Scenario: Candidatos del slot 1
- **WHEN** se consultan las rutas del slot 1
- **THEN** el audio es `audio/l200/200_1.mp3` luego `explicacion-1.mp3`
  y el primer JSON es `audio/l200/200_1.json`.
