#!/bin/bash
# ==============================================================================
# Script de Reconciliación Live → Repo (Campus Ingeniería)
#
# Propósito:
#   Descarga de manera segura los archivos que existen en la VM de producción
#   (/var/www/campus/) pero no están en el repositorio Git (ej: slides solo-live).
#   Una vez descargados y commiteados, se podrá usar `rsync --delete` sin riesgo.
#
# Uso:
#   bash scripts/reconcile-live.sh [--dry-run] [USUARIO_SSH]
# ==============================================================================

set -euo pipefail

HOST="${DEPLOY_HOST:-ingenieria.wechat.com.ar}"
REMOTE_PATH="${DEPLOY_PATH:-/var/www/campus/}"
USER="${1:-${DEPLOY_USER:-$USER}}"
DRY_RUN=0

if [[ "${1:-}" == "--dry-run" ]] || [[ "${2:-}" == "--dry-run" ]]; then
  DRY_RUN=1
  if [[ "${1:-}" == "--dry-run" ]]; then
    USER="${2:-${DEPLOY_USER:-$USER}}"
  fi
fi

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$DIR"

echo "=========================================================="
echo "🔍 Reconciliación de archivos Live → Git Repo"
echo "Host:       $USER@$HOST"
echo "Ruta remota: $REMOTE_PATH"
echo "Ruta local:  $DIR"
echo "Modo:       $([[ $DRY_RUN -eq 1 ]] && echo 'DRY-RUN (solo simulación)' || echo 'DESCARGA ACTIVA')"
echo "=========================================================="

# Comprobación de conectividad SSH
if ! ssh -q -o BatchMode=yes -o ConnectTimeout=5 "$USER@$HOST" exit 2>/dev/null; then
  echo "⚠️  Aviso: No se pudo establecer conexión automática sin password a $USER@$HOST."
  echo "    Asegurate de tener tu llave SSH configurada o pasar el usuario correcto:"
  echo "    bash scripts/reconcile-live.sh [USER]"
  echo ""
  echo "Comando rsync que se ejecutaría:"
fi

RSYNC_CMD=(
  rsync
  -avz
  --update
  --exclude '.git/'
  --exclude '.github/'
  --exclude 'shots/'
  --exclude 'tools/_gen/'
  --exclude '*.bak'
)

if [[ $DRY_RUN -eq 1 ]]; then
  RSYNC_CMD+=(--dry-run)
  echo "Ejecutando simulación (dry-run):"
fi

echo "${RSYNC_CMD[*]} \"$USER@$HOST:$REMOTE_PATH\" ./"

if ssh -q -o BatchMode=yes -o ConnectTimeout=5 "$USER@$HOST" exit 2>/dev/null; then
  "${RSYNC_CMD[@]}" "$USER@$HOST:$REMOTE_PATH" ./
  echo "✅ Reconciliación completada."
  echo "Revisa el estado de Git con: git status"
else
  echo ""
  echo "Para ejecutar manualmente cuando tengas acceso SSH:"
  echo "rsync -avz --update $USER@$HOST:$REMOTE_PATH ./"
fi
