# Deploy Campus → VM (`ingenieria.wechat.com.ar`)

## Destino
- Host: `ingenieria.wechat.com.ar`
- Docroot: `/var/www/campus/`
- Stack: nginx estático + HTTPS (Let's Encrypt) + gzip + Cache-Control
- VM: Ubuntu · 2 CPU · 4 GB RAM · 60 GB

## Qué se despliega
Solo el árbol público del repo (raíz + `tools/*.html` + `resources/`).

**Nunca** subir al docroot:
- `shots/`
- `tools/_gen/`
- `**/*.bak`
- `.git/`
- `.github/`
- `scripts/`
- `tests/`
- `package.json`

---

## 🚀 Despliegue Automatizado (Recomendado vía GitHub Actions)

El repositorio cuenta con un pipeline de CI/CD automatizado en `.github/workflows/deploy.yml`.

### Flujo estándar:
1. Abrir PR contra `main`.
2. El CI ejecuta automáticamente:
   - Chequeos de estructura obligatoria.
   - Smoke tests (`node scripts/smoke-test.mjs`).
   - Sanidad de HTML y sintaxis JS (`node --check`).
3. Al hacer merge en `main`, el workflow de deploy se dispara automáticamente.
4. También puede dispararse manualmente desde GitHub Actions (`workflow_dispatch`), permitiendo activar el flag `--delete` cuando corresponda.

### Secrets requeridos en GitHub:
- `DEPLOY_SSH_KEY`: Clave privada SSH con permisos en la VM.
- `DEPLOY_USER`: Usuario en el servidor (ej: `campus` o `root`).
- `DEPLOY_HOST`: Host de destino (`ingenieria.wechat.com.ar`).

---

## 🔄 Reconciliación Live → Repo (Eliminar Drift)

Para garantizar que el repositorio sea la única fuente de verdad (Single Source of Truth) y poder usar `rsync --delete` sin temor a borrar slides creados directamente en live:

```bash
# 1. Simular descarga de archivos solo-live
npm run reconcile

# 2. Descargar archivos efectivamente al repo
bash scripts/reconcile-live.sh USER@ingenieria.wechat.com.ar

# 3. Comprobar diferencias y commitear a Git
git status
git add tools/
git commit -m "chore: reconciliar slides solo-live desde producción"
git push origin main
```

Una vez que el repo incluya todos los archivos que están en producción, el deploy con `--delete` queda 100% habilitado.

---

## 🛠️ Procedimiento Manual (Fallback desde checkout limpio)

```bash
# Smoke test previo
npm test

# Sincronización a la VM
rsync -avz \
  --exclude '.git/' \
  --exclude '.github/' \
  --exclude 'shots/' \
  --exclude 'tools/_gen/' \
  --exclude '*.bak' \
  --exclude 'scripts/' \
  --exclude 'DEPLOY.md' \
  --exclude 'README.md' \
  --exclude 'serve.sh' \
  --exclude 'package.json' \
  ./ USER@ingenieria.wechat.com.ar:/var/www/campus/
```

## Post-check (obligatorio)
Tras el sync, verificar que los servicios y headers respondan correctamente:

```bash
curl -sI https://ingenieria.wechat.com.ar/ | tr -d '\r' | egrep -i 'HTTP/|strict-transport|cache-control|content-encoding|location'
curl -sI https://ingenieria.wechat.com.ar/styles.css | tr -d '\r' | egrep -i 'HTTP/|cache-control|content-encoding'
curl -sI http://ingenieria.wechat.com.ar/ | tr -d '\r' | egrep -i 'HTTP/|location'
```

Esperado:
- HTTPS `200`, HTTP/2
- HTML: `Cache-Control: no-cache`
- CSS/JS: `public, max-age=…, immutable` + gzip
- HTTP → HTTPS redirect `301`
