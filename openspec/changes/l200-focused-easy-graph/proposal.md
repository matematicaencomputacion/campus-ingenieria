## Why
La forma fácil de L200 muestra un plano de −12 a 12 cuando solo necesita el origen, P1=(0,b) y P2=(h,b+v). El usuario pide concentrar la atención y reducir el gráfico aproximadamente a un tercio.

## What Changes
- A pedido posterior del usuario, botón Dictar debajo de la tabla f(x) de L200; completar la entrada activa sin enviar automáticamente.
- Encuadre estable del origen, ambos puntos y el desplazamiento h/v.
- Alto del lienzo de aproximadamente un tercio en escritorio; mínimo legible en móvil.
- Consignas fuera del lienzo para no ocultar los puntos; reset restaura la vista completa.
- Fuera de alcance: otras lecciones, ecuaciones, puntuación y secuencia pedagógica.

## Capabilities
### New Capabilities
- `focused-easy-graph`: encuadre compacto y manipulable de la forma fácil.
- `number-dictation`: entrada numérica por voz en español con confirmación manual.
### Modified Capabilities
Ninguna.

## Impact
L200 HTML/JS, pruebas Playwright y CI existente. Sin dependencias nuevas.
Rollback: revertir el commit de este change.
