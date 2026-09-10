L200 reutiliza el patrón de media de L201 sin extraer un módulo nuevo.

Cada barra monta play, progreso, mute y volumen sobre un `<audio>` con `preload="none"`. Las rutas se arman en el cliente: `audio/l200/{stem}.mp3` y `.ogg`. Un HEAD (o play si el método no existe) decide si hay archivo; si no, se muestra «Sin audio aún». No hay CDN ni archivos binarios en el repo.

El indicador de SFX del juego (`#soundMeter`) queda en la bottom-bar, con margen inferior, encima de las dos ranuras.

`number-dictation.js` deja de cargarse en L200. Las respuestas de tabla siguen siendo teclado + Enter/OK.

`npm run test:l200` cubre ausencia de Dictar, rutas locales, hint sin archivo, mute y Enter. `npm test` afirma el `?v=` y el andamiaje de carpeta.
