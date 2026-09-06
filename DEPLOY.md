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

## Prerrequisitos
- Acceso SSH a la VM (llave en `~/.ssh` o metadata del proveedor).
- Usuario con permiso de escritura en `/var/www/campus/` (o `sudo`).
- No tocar certbot/LE ni el redirect HTTP→HTTPS en este paso.

## Procedimiento (rsync desde un checkout limpio)

```bash
# Desde un clone del repo (branch main, CI verde)
git clone https://github.com/matematicaencomputacion/campus-ingenieria.git
cd campus-ingenieria

rsync -avz --delete \
  --exclude '.git/' \
  --exclude '.github/' \
  --exclude 'shots/' \
  --exclude 'tools/_gen/' \
  --exclude '*.bak' \
  --exclude 'DEPLOY.md' \
  --exclude 'README.md' \
  --exclude 'serve.sh' \
  ./ USER@ingenieria.wechat.com.ar:/var/www/campus/
```

Ajustá `USER` al usuario SSH real. Si hace falta `sudo` en el destino, usá un path temporal + `sudo rsync` en la VM.

## Post-check (obligatorio)
Tras el sync, verificar que **no** se rompió lo ya tuneado:

```bash
curl -sI https://ingenieria.wechat.com.ar/ | tr -d '\r' | egrep -i 'HTTP/|strict-transport|cache-control|content-encoding|location'
curl -sI https://ingenieria.wechat.com.ar/styles.css | tr -d '\r' | egrep -i 'HTTP/|cache-control|content-encoding'
curl -sI http://ingenieria.wechat.com.ar/ | tr -d '\r' | egrep -i 'HTTP/|location'
```

Esperado:
- HTTPS `200`, HTTP/2
- HTML: `Cache-Control: no-cache` (o equivalente)
- CSS/JS: `public, max-age=…, immutable` + gzip/`content-encoding: gzip`
- HTTP → HTTPS redirect `301`

Si algo de caché/gzip/HTTPS falló, **no** seguir desplegando: restaurar config nginx y avisar a @Performance / @Prototipador.

## Flujo de trabajo (GitHub)
1. Branch + PR (main protegida; check `static-check` requerido).
2. CI verde.
3. Merge a `main`.
4. Deploy con el rsync de arriba (manual hasta automatizar).

## Notas
- No minificar ni empaquetar en el deploy: el artefacto debe quedar tan chico como el tree del repo.
- Secretos/SSH: nunca en el repo; pedir por canal seguro o metadata de la VM.
