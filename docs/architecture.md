# Arquitectura actual

Campus Ingeniería es un prototipo estático de aprendizaje: carrera → materia →
nodos/topics y un catálogo de lecciones interactivas.

- index.html, app.js, data.js y styles.css: interfaz y datos del Campus.
- tools/index.html: catálogo; tools/*.html: lecciones con JavaScript en navegador.
- tools/lesson-bar.js y tools/lesson-shell.css: navegación compartida de adopción parcial.
- resources/: recursos estáticos. No hay backend de aplicación ni paso de build.
- scripts/: validadores Node y Playwright; no son código del sitio.
- .github/workflows/ci.yml: static-check y browser-check; este último ejecuta carga e interacción.
- scripts/computed-style-check.mjs: comparación local de estilos; no se invoca desde CI.
- .github/workflows/deploy.yml: rsync a nginx condicionado por credenciales; es independiente de ci.yml.

No confundir éxito del workflow deploy con despliegue ejecutado ni con validación
de la versión servida. Consultar pasos del run y DEPLOY.md antes de reportar producción.

Decisiones conservadas: extracción CSS de bloques idénticos, Fase 2 descartada
por cascada/ROI, y navegación masiva pendiente de producto. El informe técnico
es histórico; sus cifras no son constantes ni sus pendientes un roadmap actualizado.
