#!/bin/bash
# ============================================================
# Backup encriptado de PostgreSQL
# Uso: ./backup-encriptado.sh [output-dir]
# ============================================================
set -euo pipefail

# Config
DB_NAME="${PGDATABASE:-consultorio_medico}"
DB_USER="${PGUSER:-postgres}"
DB_HOST="${PGHOST:-localhost}"
DB_PORT="${PGPORT:-5432}"
BACKUP_DIR="${1:-/var/backups/consultorio}"
GPG_RECIPIENT="${GPG_RECIPIENT:-admin@consultorio.com}"
RETENTION_DAYS=30
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.sql.gz"
ENCRYPTED_FILE="${BACKUP_FILE}.gpg"

# Crear directorio si no existe
mkdir -p "$BACKUP_DIR"

echo "[Backup] Iniciando backup de $DB_NAME..."

# 1. Dump + comprimir
pg_dump \
  --host="$DB_HOST" \
  --port="$DB_PORT" \
  --username="$DB_USER" \
  --dbname="$DB_NAME" \
  --format=custom \
  --compress=9 \
  --file="$BACKUP_FILE" \
  --verbose \
  2>&1 | tail -5

echo "[Backup] Dump completado: $(du -h "$BACKUP_FILE" | cut -f1)"

# 2. Encriptar con GPG
gpg --batch --yes \
  --trust-model always \
  --recipient "$GPG_RECIPIENT" \
  --output "$ENCRYPTED_FILE" \
  --encrypt "$BACKUP_FILE"

# 3. Eliminar archivo sin encriptar
rm -f "$BACKUP_FILE"

echo "[Backup] Backup encriptado: $ENCRYPTED_FILE ($(du -h "$ENCRYPTED_FILE" | cut -f1))"

# 4. Limpiar backups viejos
find "$BACKUP_DIR" -name "*.gpg" -type f -mtime +$RETENTION_DAYS -delete
echo "[Backup] Limpieza completada (retención: $RETENTION_DAYS días)"

# 5. Verificar integridad
gpg --batch --quiet --decrypt "$ENCRYPTED_FILE" > /dev/null 2>&1 \
  && echo "[Backup] ✅ Integridad verificada" \
  || echo "[Backup] ❌ Error de integridad"

echo "[Backup] ✅ Backup completado: $TIMESTAMP"
