#!/bin/bash
# ============================================================
# Backup encriptado de PostgreSQL
# Uso: ./backup-encriptado.sh [output-dir]
# ============================================================
set -euo pipefail

# Config
BACKUP_DIR="${1:-/var/backups/consultorio}"
GPG_RECIPIENT="${GPG_RECIPIENT:-admin@consultorio.com}"
RETENTION_DAYS=30
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_NAME="${PGDATABASE:-consultorio_medico}"
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.sql.gz.gpg"
DUMP_FILE="/tmp/${DB_NAME}_${TIMESTAMP}.dump"
# En Docker Swarm/Dokploy, el contenedor postgres tiene un nombre distinto.
# Buscar el contenedor postgres activo por comando.
PG_CONTAINER=""
PG_CONTAINER=$(docker ps --format '{{.Names}}' 2>/dev/null | grep -E '\-postgres-1$' | head -1 || echo "")

# Crear directorio si no existe
mkdir -p "$BACKUP_DIR"

if [[ -z "$PG_CONTAINER" ]]; then
  echo "[Backup] ❌ No hay contenedor PostgreSQL disponible"
  exit 1
fi

echo "[Backup] Iniciando backup de $DB_NAME desde contenedor $PG_CONTAINER..."

# El superuser se autodetecta del contenedor (la app usa dashboard_user pero
# tiene RLS, así que necesitamos un superuser). Intentar con el de ops console.
PG_SUPERUSER="${PG_SUPERUSER:-reece.schmeler67}"
PG_SUPERPASS="${PG_SUPERPASS:-7anlnf0odssgmuwyjchqzdpk}"

# 1. Dump via docker exec (usa superuser para evitar RLS)
PG_DUMP_OK=false
if docker exec -e PGPASSWORD="$PG_SUPERPASS" "$PG_CONTAINER" \
  pg_dump -U "$PG_SUPERUSER" -d "$DB_NAME" --format=custom --compress=9 \
  --file="$DUMP_FILE" 2>/dev/null; then
  PG_DUMP_OK=true
else
  echo "[Backup] ⚠️ Error con superuser, intentando con dashboard_user..."
  if docker exec "$PG_CONTAINER" \
    pg_dump -U dashboard_user -d "$DB_NAME" --format=custom --compress=9 \
    --file="$DUMP_FILE" 2>/dev/null; then
    PG_DUMP_OK=true
  fi
fi

if ! $PG_DUMP_OK; then
  echo "[Backup] ❌ Error en pg_dump"
  exit 1
fi

echo "[Backup] Copiando dump del contenedor..."
docker cp "$PG_CONTAINER:$DUMP_FILE" "${DUMP_FILE}_host"
docker exec "$PG_CONTAINER" rm -f "$DUMP_FILE"

# 2. Encriptar con GPG
echo "[Backup] Encriptando..."
gpg --batch --yes \
  --trust-model always \
  --recipient "$GPG_RECIPIENT" \
  --output "$BACKUP_FILE" \
  --encrypt "${DUMP_FILE}_host"
rm -f "${DUMP_FILE}_host"

echo "[Backup] Backup encriptado: $BACKUP_FILE ($(du -h "$BACKUP_FILE" 2>/dev/null | cut -f1))"

# 4. Limpiar backups viejos
find "$BACKUP_DIR" -name "*.gpg" -type f -mtime +$RETENTION_DAYS -delete
echo "[Backup] Limpieza completada (retención: $RETENTION_DAYS días)"

# 5. Verificar integridad
gpg --batch --quiet --decrypt "$BACKUP_FILE" > /dev/null 2>&1 \
  && echo "[Backup] ✅ Integridad verificada" \
  || echo "[Backup] ❌ Error de integridad"

# ─── Off-site backup (rclone) ───────────────────────────────────────────────
if [[ -n "${RCLONE_REMOTE:-}" ]]; then
  echo "[Backup] Subiendo a off-site (rclone)..."
  RCLONE_OPTS=""
  [[ -n "${RCLONE_CONFIG:-}" ]] && RCLONE_OPTS="--config $RCLONE_CONFIG"

  rclone copy $RCLONE_OPTS "$BACKUP_FILE" "${RCLONE_REMOTE}/pg/" \
    && echo "[Backup] ✅ Backup subido a off-site" \
    || echo "[Backup] ⚠️  Error subiendo a off-site"

  # Limpiar backups off-site viejos
  rclone delete $RCLONE_OPTS "${RCLONE_REMOTE}/pg/" --min-age "${RETENTION_DAYS}d" 2>/dev/null || true
  echo "[Backup] ✅ Off-site sync completado"
else
  echo "[Backup] ℹ️  Off-site no configurado (RCLONE_REMOTE no definido)"
fi

echo "[Backup] ✅ Backup completado: $TIMESTAMP"
