# Campus Ingeniería

Prototipo navegable de plataforma de aprendizaje:
**carrera → materia → nodos/topics**, con +180 lecciones interactivas en `tools/`.

## Cómo correr

```bash
# desde la raíz del repo
python3 -m http.server 3000 --bind 127.0.0.1
# o bien:
npm run dev            # usa serve.sh (puerto 3000)
```

Abrí http://localhost:3000

## Flujos

1. Elegí una carrera y Continuar
2. Home con titulaciones y materias
3. Entrá a una materia: Bienvenida / Temario / Recursos audiovisuales
4. Catálogo de interactivos en `tools/index.html` (buscador + filtros por tema)

## Testing

```bash
npm test              # smoke estático: archivos, node --check, links (rápido, sin deps)
npm run test:browser      # smoke de navegador: abre las ~190 páginas en Chromium headless
                          # y falla ante errores de runtime (pageerror / console.error / 404)
npm run test:interaction  # mueve los sliders de cada lección y falla si alguno lanza errores
npm run test:all          # los tres
```

El smoke de navegador (`scripts/browser-smoke.mjs`) requiere una vez:

```bash
npm install
npx playwright install chromium
```

En CI ambos corren automáticamente (jobs `static-check` y `browser-check` en
`.github/workflows/ci.yml`).

## Deploy

Ver [`DEPLOY.md`](DEPLOY.md). **Importante:** hoy el deploy a producción es manual;
el workflow de GitHub Actions no despliega hasta que se cargue el secret
`DEPLOY_SSH_KEY` (ver también [`docs/tech-review-2026-09-08.md`](docs/tech-review-2026-09-08.md)).
