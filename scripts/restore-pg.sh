#!/bin/bash
# ============================================================
# restore-pg.sh — Restauración de PostgreSQL desde backup GPG
#
# Compatible con backups generados por backup-encriptado.sh
# (pg_dump --format=custom --compress=9 + GPG encrypt)
#
# Uso:
#   ./restore-pg.sh <archivo.gpg> [opciones]
#
# Opciones:
#   --db-name NAME     Nombre de BD destino (def: consultorio_medico)
#   --db-user USER     Usuario BD destino (def: dashboard_user)
#   --db-host HOST     Host BD destino (def: localhost)
#   --db-port PORT     Puerto BD destino (def: 5432)
#   --drill            Modo drill: restaura en container aislado
#   --drill-port PORT  Puerto para container drill (def: 5433)
#   --keep-files       No eliminar archivos temporales al finalizar
#   --help             Muestra esta ayuda
#
# Ejemplos:
#   ./restore-pg.sh /var/backups/consultorio/backup_20260722.sql.gz.gpg
#   ./restore-pg.sh --drill /var/backups/consultorio/backup_20260722.sql.gz.gpg
# ============================================================
set -euo pipefail

# ─── Configuración ────────────────────────────────────────────────────────────
DB_NAME="${PGDATABASE:-consultorio_medico}"
DB_USER="${PGUSER:-dashboard_user}"
DB_HOST="${PGHOST:-localhost}"
DB_PORT="${PGPORT:-5432}"
PG_SUPERUSER="${PG_SUPERUSER:-reece.schmeler67}"
PG_SUPERPASS="${PG_SUPERPASS:-7anlnf0odssgmuwyjchqzdpk}"
DRILL_MODE=false
DRILL_PORT=5433
KEEP_FILES=false

# Auto-detectar contenedor PostgreSQL (como backup-encriptado.sh)
PG_CONTAINER=""
PG_CONTAINER=$(docker ps --no-trunc --format '{{.Names}}' 2>/dev/null | grep -E '\-postgres-1(\.|$)' | grep -v 'chatwoot\|evolution\|dokploy\|pgbouncer' | head -1 || echo "")

# ─── Parsing de argumentos ────────────────────────────────────────────────────
POSITIONAL=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --db-name) DB_NAME="$2"; shift 2 ;;
    --db-user) DB_USER="$2"; shift 2 ;;
    --db-host) DB_HOST="$2"; shift 2 ;;
    --db-port) DB_PORT="$2"; shift 2 ;;
    --drill) DRILL_MODE=true; shift ;;
    --drill-port) DRILL_PORT="$2"; shift 2 ;;
    --keep-files) KEEP_FILES=true; shift ;;
    --help)
      sed -n '/^# =/,/^set -/p' "$0" | grep '^#' | sed 's/^# \?//'
      exit 0
      ;;
    *) POSITIONAL+=("$1"); shift ;;
  esac
done

BACKUP_FILE="${POSITIONAL[0]:?Error: especificar archivo .gpg del backup}"

if [[ ! -f "$BACKUP_FILE" ]]; then
  echo "[Restore-PG] ❌ Archivo no encontrado: $BACKUP_FILE"
  exit 1
fi

echo "[Restore-PG] === Restauración PostgreSQL ==="
echo "[Restore-PG] Backup: $BACKUP_FILE"
echo "[Restore-PG] DB: $DB_NAME @ $DB_HOST:$DB_PORT (user: $DB_USER)"

# ─── FASE 1: Desencriptar ────────────────────────────────────────────────────
TMPDIR=$(mktemp -d /tmp/restore-pg-XXXXXX)
echo "[Restore-PG] Desencriptando backup..."

gpg --batch --decrypt "$BACKUP_FILE" > "$TMPDIR/backup.dump" 2>/dev/null
if [[ $? -ne 0 ]]; then
  echo "[Restore-PG] ❌ Error al desencriptar. ¿GPG key privada importada?"
  rm -rf "$TMPDIR"
  exit 2
fi

SIZE=$(du -h "$TMPDIR/backup.dump" | cut -f1)
echo "[Restore-PG] ✅ Backup desencriptado: $SIZE"

# ─── FASE 2: Drill o Restauración directa ─────────────────────────────────────
if [[ "$DRILL_MODE" == "true" ]]; then
  echo "[Restore-PG] 🧪 Modo DRILL — container PostgreSQL aislado en puerto $DRILL_PORT"

  CONTAINER_NAME="drill-pg-restore"

  # Limpiar container previo si existe
  docker rm -f "$CONTAINER_NAME" 2>/dev/null || true

  docker run -d \
    --name "$CONTAINER_NAME" \
    -e POSTGRES_DB="$DB_NAME" \
    -e POSTGRES_USER="$DB_USER" \
    -e POSTGRES_PASSWORD="drill_restore_pass" \
    -p "$DRILL_PORT":5432 \
    postgres:16-alpine

  echo "[Restore-PG] Esperando que PostgreSQL arranque..."
  for i in $(seq 1 15); do
    if docker exec "$CONTAINER_NAME" pg_isready -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; then
      break
    fi
    sleep 2
  done

  echo "[Restore-PG] Restaurando en container aislado..."
  time pg_restore \
    -h localhost -p "$DRILL_PORT" -U "$DB_USER" -d "$DB_NAME" \
    --clean --if-exists \
    "$TMPDIR/backup.dump"

  echo "[Restore-PG] Verificando integridad..."
  docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -c "
    SELECT 'pacientes' as tabla, count(*) as registros FROM pacientes
    UNION ALL
    SELECT 'turnos', count(*) FROM turnos
    UNION ALL
    SELECT 'recetas', count(*) FROM recetas
    UNION ALL
    SELECT 'conversaciones', count(*) FROM conversaciones;
  " 2>/dev/null || echo "[Restore-PG] ⚠️  Algunas tablas no existen (drill parcial)"

  echo "[Restore-PG] ✅ Drill completado. Container '$CONTAINER_NAME' activo en puerto $DRILL_PORT"
  echo "[Restore-PG]    Para destruirlo: docker stop $CONTAINER_NAME && docker rm $CONTAINER_NAME"

  if [[ "$KEEP_FILES" == "false" ]]; then
    rm -rf "$TMPDIR"
  fi

  exit 0
fi

# ─── FASE 3: Restauración directa (producción) ───────────────────────────────
if [[ -z "$PG_CONTAINER" ]]; then
  echo "[Restore-PG] ❌ No se pudo detectar el contenedor PostgreSQL"
  rm -rf "$TMPDIR"
  exit 3
fi

echo "[Restore-PG] ⚠️  VAS A RESTAURAR SOBRE $PG_CONTAINER ($DB_NAME)"
echo "[Restore-PG]    Ctrl+C ahora para cancelar (esperando 5s)..."
sleep 5

echo "[Restore-PG] Copiando backup al contenedor..."
docker cp "$TMPDIR/backup.dump" "$PG_CONTAINER:/tmp/backup_restore.dump"

echo "[Restore-PG] Iniciando restauración..."
docker exec -e PGPASSWORD="$PG_SUPERPASS" "$PG_CONTAINER" \
  pg_restore -U "$PG_SUPERUSER" -d "$DB_NAME" \
  --clean --if-exists \
  /tmp/backup_restore.dump

docker exec "$PG_CONTAINER" rm -f /tmp/backup_restore.dump
echo "[Restore-PG] ✅ Restauración completada"

# ─── FASE 4: Verificación post-restauración ───────────────────────────────────
echo "[Restore-PG] Verificando..."
docker exec -e PGPASSWORD="$PG_SUPERPASS" "$PG_CONTAINER" \
  psql -U "$PG_SUPERUSER" -d "$DB_NAME" -c "
  SELECT count(*)::text || ' tablas' as total FROM information_schema.tables
  WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
" 2>/dev/null || echo "[Restore-PG] ⚠️  No se pudo verificar"

# ─── FASE 5: Limpieza ────────────────────────────────────────────────────────
if [[ "$KEEP_FILES" == "false" ]]; then
  rm -rf "$TMPDIR"
  echo "[Restore-PG] Archivos temporales eliminados"
fi

echo "[Restore-PG] === Restauración completada: $(date +%Y-%m-%d_%H%M%S) ==="
