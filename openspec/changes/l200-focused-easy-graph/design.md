## Context
L200 transforma coordenadas con límites globales fijos. El alto depende del ancho, con un canvas mínimo interno de 640 px que se escala en móvil.
## Goals / Non-Goals
Compactar solo las fases easy. Conservar matemáticas y gestos existentes.
## Decisions
- Límites derivados de origen, P1 y P2 con margen para anillos, etiquetas y guías. Mantener el mismo encuadre durante todas las fases easy evita saltos al arrastrar.
- Alto normal / 3 en escritorio; mínimo de 240 px en móvil. Usar ancho real en easy para no reducir los blancos táctiles por escalado.
- Tras #249 la unidad compacta era 1,5× la del plano −12..12. El usuario pidió el triple de esa unidad: `EASY_ZOOM = 4.5`, `sx = sy`. Si el lienzo no entra, recortar márgenes (no estirar ejes).
- Consignas en flujo sobre el lienzo y navegación en esa cabecera. Volver al tamaño y límites originales en Reset.
- Actualizar versión del JS para invalidar caché. Pruebas de todas las combinaciones b/m, reset, resize y arrastre real en Chromium.
## Risks / Trade-offs
La proporción de reducción en móvil es menor para conservar legibilidad. Las escalas de ambos ejes ya son independientes; las etiquetas h/v mantienen la pendiente numérica explícita.
## Migration Plan
Suite completa antes de push; PR con CI verificado para SHA final. Integrar bajo autorización explícita de autonomía del usuario. Producción se reporta por separado.

## Ampliación autorizada: dictado de f(x)
Botón bajo la tabla, estado aria-live y cancelación con el mismo botón. SpeechRecognition/webkitSpeechRecognition en es-AR, una respuesta final por activación. Parser estricto de números españoles (incluye negativos y decimales), sin eval ni extracción arbitraria de dígitos de una frase. Solo escribe y dispara input; Enter/OK mantienen la validación existente. Una sesión captura la identidad del input; mutaciones de tabla, input manual, pagehide y timeout abortan e invalidan callbacks. API simulada para probar eventos y parser; no se afirmará haber probado micrófono real. No se almacenan audio/transcripciones por la aplicación. El servicio del navegador puede usar red y requiere permiso.
Referencia API: https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition

## Evidencia local de implementación
`npm run test:all` pasa: 81 checks estáticos, nueve unidades (incluidas dos de dictado), 192 páginas sin errores de carga, nueve escenarios de navegación y diez escenarios L200. Las capturas de la tabla fueron revisadas a 390 y 1440 px. Pruebas de voz con API simulada; micrófono/servicio reales pendientes de prueba manual. La verificación del SHA del PR y del merge se registra en GitHub para no confundir un commit probado localmente con una versión desplegada.
