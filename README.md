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
npm test              # smoke estático + unidades de destinos de navegación (sin deps)
npm run test:browser      # smoke de navegador: abre las ~190 páginas en Chromium headless
                          # y falla ante errores de runtime (pageerror / console.error / 404)
npm run test:interaction  # mueve los sliders de cada lección y falla si alguno lanza errores
npm run test:navigation   # retorno contextual, visor, foco y geometría de barras
npm run test:all          # suite completa
```

El smoke de navegador (`scripts/browser-smoke.mjs`) requiere una vez:

```bash
npm install
npx playwright install chromium
```

En CI las pruebas estáticas, unitarias, de carga, interacción y navegación corren automáticamente (jobs `static-check` y `browser-check` en
`.github/workflows/ci.yml`).

## Deploy

Ver [`DEPLOY.md`](DEPLOY.md). **Importante:** hoy el deploy a producción es manual;
el workflow de GitHub Actions no despliega hasta que se cargue el secret
`DEPLOY_SSH_KEY` (ver también [`docs/tech-review-2026-09-08.md`](docs/tech-review-2026-09-08.md)).

## Lineamientos para copilotos y SDD

La fuente común es [docs/base-standards.md](docs/base-standards.md).
Consultar [arquitectura](docs/architecture.md) y el change en `openspec/changes/`
antes de implementar. La configuración se adapta de Specboot al stack real de Campus.

Para refactors CSS, capturar **antes** de editar y comparar después las mismas páginas:

```bash
npm run css:snapshot -- --save /tmp/campus-css-before.json tools/leccion-lineales.html
npm run css:snapshot -- --compare /tmp/campus-css-before.json tools/leccion-lineales.html
```

Este verificador se ejecuta localmente; no forma parte de `test:all` ni del CI.
La comparación cubre las propiedades y el estado capturados a 1440×900;
no sustituye pruebas de interacción o revisión visual responsive.

## Navegación de lecciones

El catálogo conserva búsqueda y filtros al volver. Las lecciones abiertas desde
una materia regresan a esa materia; las abiertas directamente llevan al catálogo.
En el visor, «Cerrar lección» devuelve el foco al nodo sin cargar otra página dentro
del iframe. Las rutas de nodos se pueden recargar o compartir.

Ver [ADR 0001](docs/adr/0001-contextual-navigation.md) para decisiones y cobertura.
