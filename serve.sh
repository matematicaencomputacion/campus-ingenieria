#!/bin/bash
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORT="${1:-3000}"
HOST="${HOST:-0.0.0.0}"
cd "$DIR"
echo "Iniciando Campus Ingeniería en http://localhost:${PORT} ..."
exec python3 -m http.server "$PORT" --bind "$HOST"
