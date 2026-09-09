# ADR 0001 — Retorno contextual conservando controles de las lecciones

Fecha: 2026-09-09. Estado: implementado en rama; integración pendiente del PR.

## Contexto y evidencia
En fb9c959 hay 187 lecciones: 171 con a.back al catálogo y 16 con lesson-bar.
La prueba en Chromium reprodujo pérdida de búsqueda seno y categoría trig al
volver; activar Campus en el visor cargaba otro Campus dentro del iframe.
La inspección a 390px mostró que la barra fija cubría el título.

## Decisión
Unificar destinos y comportamiento, preservando los controles propios. Se usa
returnTo limitado al index del Campus o al catálogo del mismo origen y prefijo.
Sin historial heurístico, referrer ni almacenamiento del navegador.

El catálogo mantiene q/cat en URL. Su entrada desde una materia conserva también
la ruta de retorno. Las rutas de materia admiten un nodo opcional al final:
#/materia/informatica/mate1/temario/n-lin. Recargar o abrir otra pestaña conserva
ese nodo; cerrar el visor elimina el iframe y enfoca su botón (abriendo el tema
si estaba plegado). Solo mensajes del iframe actual y mismo origen lo cierran.

Las 16 barras ocupan flujo normal antes del título, muestran texto en móvil y
controles de al menos 44px. Su stylesheet se carga desde head para evitar una barra sin estilo al iniciar. Se conserva fullscreen y reinicio. Las 171 lecciones
con enlace propio no reciben una barra adicional.

## Alternativas
Una barra universal implicaría reemplazar 171 controles y validar muchos layouts
sin mejorar el retorno. history.back() depende de historia ajena a la lección.
Persistir en localStorage mezclaría contextos entre pestañas. Siguiente/anterior
necesita una secuencia pedagógica y queda fuera de este cambio.

## Verificación y límites
npm test incluye unidades de destinos. npm run test:navigation cubre catálogo,
retornos seguros, subdirectorio, pestañas, recarga, cierre/foco, mensajes ajenos,
187 salidas y geometría de las 16 barras a 390/1440px; corre en browser-check.
Las pruebas de navegación usan Chromium. No prueban corrección matemática ni
interacciones de todos los juegos. Los otros iframes de herramientas no son el
visor de materia y mantienen su comportamiento existente.

## Rollback
Revertir los commits del change contextual-lesson-navigation. No hay migraciones
ni datos persistidos. Merge y despliegue requieren autorización aparte.

## Evidencia local del cambio
- Las cinco pruebas de navegación iniciales fallaron sobre fb9c959; pasaron tras el fix.
- La prueba de geometría detectó superposición a 390px antes del ajuste.
- Estilos computados de economía-05 y construcción-seno: idénticos antes/después.
- El juego inversa-cara produce hashes variables sin editar código: en cinco cargas,
  cambian los anchos de SPAN.chip.coral y SPAN#modeTag. Su modo se elige con Math.random.
  No se usa su hash como prueba de equivalencia CSS; navegación y carga sí están cubiertas.
