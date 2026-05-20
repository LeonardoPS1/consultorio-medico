#!/bin/bash
# ============================================================
# Backup Docker de PostgreSQL para VPS Aicore
# Uso: ./backup-docker.sh [output-dir]
#
# Diseñado para correr en la VPS con PostgreSQL en Docker.
# Puede ejecutarse manualmente, via cron, o via n8n (Execute Command).
# ============================================================
set -euo pipefail

# ─── Config ───────────────────────────────────────────────────
CONTAINER_NAME="${PG_CONTAINER:-postgres}"
DB_NAME="${PGDATABASE:-consultorio_medico}"
DB_USER="${PGUSER:-postgres}"
BACKUP_DIR="${1:-/backups/postgres}"
RETENTION_DAYS=30
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.sql"
COMPRESSED_FILE="${BACKUP_FILE}.gz"

mkdir -p "$BACKUP_DIR"

echo "[Backup Docker] Iniciando backup de $DB_NAME desde contenedor $CONTAINER_NAME..."

# 1. Verificar que el contenedor esté corriendo
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  echo "[Backup Docker] ❌ Contenedor $CONTAINER_NAME no está corriendo"
  exit 1
fi

# 2. Dump desde el contenedor
docker exec -t "$CONTAINER_NAME" pg_dump \
  --username="$DB_USER" \
  --dbname="$DB_NAME" \
  --format=custom \
  --compress=9 \
  --file="/tmp/${DB_NAME}_${TIMESTAMP}.dump" \
  --verbose 2>&1 | tail -3

# 3. Copiar el dump del contenedor al host
docker cp "${CONTAINER_NAME}:/tmp/${DB_NAME}_${TIMESTAMP}.dump" "$BACKUP_FILE"

# 4. Limpiar el dump dentro del contenedor
docker exec "$CONTAINER_NAME" rm -f "/tmp/${DB_NAME}_${TIMESTAMP}.dump"

# 5. Comprimir
gzip -f "$BACKUP_FILE"
echo "[Backup Docker] ✅ Backup creado: $COMPRESSED_FILE ($(du -h "$COMPRESSED_FILE" | cut -f1))"

# 6. Limpiar backups viejos (más de RETENTION_DAYS días)
find "$BACKUP_DIR" -name "*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete
echo "[Backup Docker] 🧹 Limpieza completada (retención: $RETENTION_DAYS días)"

# 7. Verificar integridad (probar que se puede descomprimir)
gunzip -t "$COMPRESSED_FILE" \
  && echo "[Backup Docker] ✅ Integridad verificada" \
  || echo "[Backup Docker] ❌ Error de integridad"

echo "[Backup Docker] ✅ Backup completado: $TIMESTAMP"
