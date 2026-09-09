## Why
Play es redundante: chooseM ya inicia la tabla, y Play borra respuestas. El usuario quiere que el sistema proponga una función y prepare la primera respuesta al entrar.
## What Changes
- Inicio y reinicio automáticos con coeficientes de las opciones existentes y valores x predefinidos.
- Quitar Play; ocultar Lento durante la tabla y aislar sus demoras a las fases gráficas.
- Conservar OK/Enter como confirmación y ✓ como resultado correcto; avance automático de una fila a la siguiente.
## Capabilities
### New Capabilities
- `automatic-table`: preparación automática y confirmación por fila en L200.
### Modified Capabilities
Ninguna.
## Impact
Solo L200, sus pruebas y documentación. No cambia el catálogo ni el dictado. Rollback: revertir el commit del change.
