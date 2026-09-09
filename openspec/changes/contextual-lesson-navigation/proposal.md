## Why
El catálogo pierde los filtros al volver de una lección; los controles de retorno
no distinguen entrada directa, catálogo y visor de materia. El usuario autorizó
investigar, proponer e implementar las mejoras de navegación (2026-09-09).

## What Changes
- Mantener búsqueda y categoría en la URL del catálogo.
- Unificar retorno contextual conservando los 171 enlaces propios y las 16 barras.
- Cerrar el visor desde la lección o su cabecera, devolviendo foco al nodo.
- Conservar materia, pestaña y nodo en enlaces independientes y recargas.
- Evitar superposición de las 16 barras: ubicarlas en flujo normal con texto visible y controles de 44px.
- Añadir pruebas de navegación reales al CI existente.

## Capabilities
### New Capabilities
- `contextual-navigation`: retorno seguro, estado del catálogo y cierre accesible del visor.
### Modified Capabilities
Ninguna.

## Impact
app.js, tools/index.html, script compartido de navegación, lesson-bar.js,
187 entradas HTML de lecciones, scripts de pruebas y el job browser-check.
Sin dependencias adicionales, backend o build.

## Fuera de alcance
Rediseñar lecciones, barra visual universal, navegación siguiente/anterior sin
secuencia pedagógica definida, CSS Fase 2, merge y deploy.

## Rollback
Revertir los commits del change. Las URLs antiguas y enlaces HTML siguen siendo válidos;
no se migra almacenamiento del alumno.
