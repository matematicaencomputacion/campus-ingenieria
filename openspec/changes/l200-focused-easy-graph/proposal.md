## Why
La forma fácil de L200 muestra un plano de −12 a 12 cuando solo necesita el origen, P1=(0,b) y P2=(h,b+v). El usuario pide concentrar la atención y reducir el gráfico aproximadamente a un tercio.

## What Changes
- Encuadre estable del origen, ambos puntos y el desplazamiento h/v.
- Alto del lienzo de aproximadamente un tercio en escritorio; mínimo legible en móvil.
- Consignas fuera del lienzo para no ocultar los puntos; reset restaura la vista completa.
- Fuera de alcance: otras lecciones, ecuaciones, puntuación y secuencia pedagógica.

## Capabilities
### New Capabilities
- `focused-easy-graph`: encuadre compacto y manipulable de la forma fácil.
### Modified Capabilities
Ninguna.

## Impact
L200 HTML/JS, pruebas Playwright y CI existente. Sin dependencias nuevas.
Rollback: revertir el commit de este change.
