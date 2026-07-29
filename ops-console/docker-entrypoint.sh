#!/bin/sh
set -e

# Detectar GID del socket Docker y agregar nextjs al grupo
if [ -S /var/run/docker.sock ]; then
  SOCKET_GID=$(stat -c "%g" /var/run/docker.sock 2>/dev/null || echo "")
  if [ -n "$SOCKET_GID" ]; then
    addgroup -g "$SOCKET_GID" docker 2>/dev/null || true
    adduser nextjs docker 2>/dev/null || true
  fi
fi

# Ejecutar la app como nextjs
exec su-exec nextjs "$@"
