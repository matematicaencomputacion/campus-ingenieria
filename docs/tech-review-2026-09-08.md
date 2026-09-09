# Revisión técnica — 2026-09-08/09

Informe de la revisión de Tech Lead sobre el estado del repo tras el PR #216, con
las acciones ejecutadas. Sirve como registro de qué se auditó, qué se corrigió y
qué queda pendiente.

## Contexto

El PR #216 ("reconciliación de interactivos live, visor en temario, laboratorio y
ci/cd") incorporó bastante trabajo de una vez. La auditoría verificó las
afirmaciones de ese trabajo contra el estado real del repo, en vez de darlas por
buenas. Aparecieron varios **"falsos verdes"** (cosas reportadas como hechas que no
lo estaban) que se corrigieron.

## Hallazgos y correcciones

### 1. El deploy no desplegaba y reportaba `success` — PR #217
El job `deploy` terminaba en verde pero **los pasos de SSH y rsync se saltaban**
en todos los runs (evidencia: run `34295900047`). Dos causas:

- El guard `if: env.DEPLOY_SSH_KEY != ''` referenciaba un `env` definido en el
  **propio step**, que GitHub Actions no expone al `if` de ese mismo step → siempre
  falso → skip.
- Además el repo **no tiene cargado el secret `DEPLOY_SSH_KEY`**, así que ni con el
  guard arreglado desplegaría hoy.

El `success` venía solo de checkout + smoke + un `curl` al sitio que ya estaba vivo.

**Fix:** env a nivel job (visible en el `if` de steps), un step *gate* que emite un
`::warning::` visible y lo deja en el run summary ("producción SIN cambios") cuando
falta el secret, y el post-check ahora solo corre si hubo deploy real. El deploy a
producción sigue siendo **manual** (ver `DEPLOY.md`) hasta que se cargue el secret.

### 2. `lesson-bar` era código muerto — PRs #218, #219
`tools/lesson-bar.js` y `tools/lesson-shell.css` existían pero **0 de 188 lecciones**
los referenciaban. Censo: de 182 lecciones sin la barra, **171 ya tenían su propio
enlace de volver** — un rollout masivo habría creado doble botón.

**Acción:** rollout dirigido a las lecciones sin ninguna salida al Campus →
**16 lecciones** con la barra (5 trig + 11 core: lineales, cuadráticas, cúbica,
homográfica, módulo, exponencial, logaritmo, racional, raíz-lineal,
módulo-desplazado, scrubber). Verificado en navegador sobre 5 layouts distintos.
Las 171 con back propio quedaron fuera a propósito.

### 3. El buscador del catálogo estaba roto — PR #220
`tools/index.html:461` tenía `counter.textContent = ;` (sin valor): un `SyntaxError`
que **reventaba el IIFE completo al parsear**. El buscador en tiempo real, los chips
de filtro y el contador **nunca funcionaron**; el contador quedaba en
"Cargando lecciones...". Un `node --check` no lo veía porque es un `<script>` inline.

Se corrigió y se verificó en navegador (buscar `seno` → 8, chip `trig` → 13).

### 4. Ramas huérfanas
Quedaban 9 ramas remotas de PRs viejos. Se eliminaron todas (2 con contenido probado
en `main`; 7 de PRs CLOSED/superados, recuperables desde sus PRs). Queda solo `main`.

## Mejora de proceso: browser smoke test (PR #220)

La causa de fondo de los falsos verdes es que el CI **no ejecutaba el JS de las
lecciones**. Se agregó `scripts/browser-smoke.mjs`: abre las ~190 páginas en
Chromium headless y falla ante excepciones no capturadas, `console.error` o requests
same-origin ≥400. Corre en el job `browser-check`. Fue el que detectó el bug #3.

Dato que lo hace viable: **las 188 lecciones son self-contained** (0 recursos
externos), así que el headless corre sin red y es rápido.

## Backlog pendiente (no ejecutado)

1. **Unificar navegación:** las 171 lecciones con back bespoke podrían migrar a
   `lesson-bar` para una sola navegación consistente. Es refactor grande + decisión
   de producto (¿una barra única o se respeta el back propio de cada lección?).
2. **Duplicación de estilos:** ~6.5 MB de HTML con 188 bloques `<style>` inline.
   Un shell/CSS compartido reduciría peso y haría los cambios de diseño globales.
3. **Profundizar el browser smoke:** hoy verifica carga; podría ejercitar
   interacciones clave (sliders, botón play) por familia de lección.

## Cómo verificar localmente

```bash
npm test           # smoke estático (rápido)
npm run test:browser   # smoke de navegador (requiere: npm install + npx playwright install chromium)
npm run test:all       # ambos
```
