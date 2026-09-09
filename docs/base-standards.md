# Lineamientos de Campus Ingeniería

Fuente común para todos los copilotos. Adaptación del enfoque de
[LIDR Specboot](https://github.com/matematicaencomputacion/sdd-starter),
revisión upstream `d19d286e9895bdf9be54b3e97070b9fe081c93af`.
Las reglas genéricas de otro stack o modelo no se importan automáticamente.

## Contexto obligatorio
Antes de editar, leer README.md, DEPLOY.md, docs/architecture.md,
docs/tech-review-2026-09-08.md y el change correspondiente en openspec/changes/.
El código y los workflows definen el comportamiento actual; las specs definen
el cambio acordado. Si difieren, registrar y resolver la diferencia explícitamente.

## Stack y límites
- Sitio estático: HTML, CSS y JavaScript, con lecciones en tools/.
- No introducir React, Qwik, backend, base de datos o build sin propuesta y ADR.
- Preservar español en contenido educativo y documentación; nombres existentes coherentes.
- Mantener rutas, catálogo, enlaces de vuelta y comportamiento de lecciones.
- No extender lesson-bar a lecciones con back propio hasta una decisión de producto.
- No reabrir de-duplicación CSS Fase 2 sin nueva evidencia de beneficio y equivalencia.

## Flujo SDD
1. Definir problema, alcance, exclusiones y rollback en proposal.md.
2. Escribir escenarios verificables en specs/, diseño en design.md y tareas en tasks.md.
3. Implementar un slice revisable en rama; actualizar primero los artefactos si cambia el alcance.
4. Para bugs, reproducir y agregar una prueba que detecte la regresión; para features, probar el comportamiento requerido.
5. Ejecutar validaciones locales antes de push, abrir PR y verificar CI para su SHA final.
6. No mergear ni desplegar sin autorización explícita; no trabajar directamente en main.

## Evidencia y pruebas
- Todo cambio: npm test. Cambios de HTML/JS/CSS: npm run test:all.
- npm run test:browser detecta fallos de carga; no prueba corrección pedagógica.
- npm run test:interaction ejercita sliders; no cubre clicks, drag, play ni juegos.
- Refactor CSS: guardar baseline antes de editar y comparar las mismas páginas después
  con scripts/computed-style-check.mjs (ver README). El verificador es local, no un gate de CI.
- Igualdad de hashes solo cubre las propiedades, viewport y estado capturados; no demuestra equivalencia visual universal.
- No omitir ni debilitar tests para conseguir verde. Reportar pendientes y bloqueos.
- Informar comando, resultado, SHA y enlace al run. Separar prueba local, CI, merge y deploy.
- Un job success con rsync skipped significa deploy omitido. HTTP 200 no identifica la versión publicada.

## Recursos y autonomía
Trabajar en slices pequeños, usar staging selectivo y preservar cambios ajenos.
Reutilizar el CI existente; no lanzar reruns sin una causa identificada.
Elegir esfuerzo según complejidad: bajo para relevamiento y cambios acotados;
medio para planificación transversal; alto para regresiones difíciles o arquitectura.
Es una guía, no un bloqueo: no imponer un proveedor ni modificar el modelo del usuario.
