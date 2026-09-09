## Why
El catálogo pierde los filtros al volver de una lección; los controles de retorno
no distinguen entrada directa, catálogo y visor de materia. El usuario autorizó
investigar, proponer e implementar las mejoras de navegación (2026-09-09).

## What Changes
- Mantener búsqueda y categoría en la URL del catálogo.
- Unificar retorno contextual conservando 171 enlaces propios y 18 barras (L200/L201 sin salida duplicada).
- Cerrar el visor desde la lección o su cabecera, devolviendo foco al nodo.
- Conservar materia, pestaña y nodo en enlaces independientes y recargas.
- Evitar superposición de las 18 barras: ubicarlas en flujo normal con texto visible y controles de 44px.
- Reconciliar L200/L201 con una sola salida y cargar sus dependencias.
- Propagar contexto desde la bandeja y por los enlaces anterior/siguiente ya existentes.
- Conservar las mutaciones de la bandeja en memoria cuando falla storage.
- Añadir pruebas de navegación reales al CI existente.

## Capabilities
### New Capabilities
- `contextual-navigation`: retorno seguro, estado del catálogo y cierre accesible del visor.
### Modified Capabilities
Ninguna.

## Impact
app.js, tools/index.html, script compartido de navegación, lesson-bar.js,
189 entradas HTML de lecciones, scripts de pruebas y el job browser-check.
Sin dependencias adicionales, backend o build.

## Fuera de alcance
Rediseñar lecciones, barra visual universal, navegación siguiente/anterior sin
secuencia pedagógica definida, CSS Fase 2, merge y deploy.

## Rollback
Revertir los commits del change. Las URLs antiguas y enlaces HTML siguen siendo válidos;
no se migra almacenamiento del alumno.
