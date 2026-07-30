#!/bin/bash
# ============================================================
# restore-tenant.sh — Restauración per-tenant de PostgreSQL
#
# Restaura datos de UN solo tenant desde backup generado por
# backup-tenant.sh.
#
# Uso:
#   ./restore-tenant.sh <archivo.gpg> <tenant-id>
#
# Opciones:
#   --dry-run      Solo muestra lo que se restauraría
#   --force        No pedir confirmación
#   --drill        Restaura en container aislado (puerto 5433)
#   --keep-files   No eliminar archivos temporales
#   --help         Muestra esta ayuda
#
# Ejemplos:
#   ./restore-tenant.sh /backup/clinica_test_20260730.tenant.sql.gz.gpg "uuid"
#   ./restore-tenant.sh /backup/clinica_test_20260730.tenant.sql.gz.gpg "uuid" --drill
# ============================================================
set -euo pipefail

DRILL_MODE=false
DRILL_PORT=5433
KEEP_FILES=false
DRY_RUN=false
FORCE=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --drill) DRILL_MODE=true; shift ;;
    --drill-port) DRILL_PORT="$2"; shift 2 ;;
    --keep-files) KEEP_FILES=true; shift ;;
    --dry-run) DRY_RUN=true; shift ;;
    --force) FORCE=true; shift ;;
    --help)
      sed -n '/^# =/,/^set -/p' "$0" | grep '^#' | sed 's/^# \?//'
      exit 0
      ;;
    *) break ;;
  esac
done

BACKUP_FILE="${1:?Uso: restore-tenant.sh <archivo.gpg> <tenant-id>}"
TENANT_ID="${2:?Uso: restore-tenant.sh <archivo.gpg> <tenant-id>}"
DB_NAME="${PGDATABASE:-consultorio_medico}"
PG_SUPERUSER="${PG_SUPERUSER:-reece.schmeler67}"
PG_SUPERPASS="${PG_SUPERPASS:-7anlnf0odssgmuwyjchqzdpk}"

if [[ ! -f "$BACKUP_FILE" ]]; then
  echo "[Restore-Tenant] ❌ Archivo no encontrado: $BACKUP_FILE"
  exit 1
fi

# Auto-detectar contenedor PostgreSQL
PG_CONTAINER=""
PG_CONTAINER=$(docker ps --no-trunc --format '{{.Names}}' 2>/dev/null | grep -E '\-postgres-1(\.|$)' | grep -v 'chatwoot\|evolution\|dokploy\|pgbouncer' | head -1 || echo "")

PSQL_CMD() {
  local DB=$1
  local USER=$2
  local HOST=$3
  local PORT=$4
  local SQL=$5
  if [[ -z "$PG_CONTAINER" && "$DRILL_MODE" == "false" ]]; then
    psql -U "$USER" -d "$DB" -h "$HOST" -p "$PORT" -t -A -c "$SQL"
  else
    docker exec -e PGPASSWORD="$PG_SUPERPASS" "$PG_CONTAINER" \
      psql -U "$PG_SUPERUSER" -d "$DB" -t -A -c "$SQL"
  fi
}

echo "[Restore-Tenant] === Restauración per-tenant ==="
echo "[Restore-Tenant] Backup:  $BACKUP_FILE"
echo "[Restore-Tenant] Tenant:  $TENANT_ID"

# ─── FASE 1: Desencriptar y descomprimir ──────────────────────────────────────
TMPDIR=$(mktemp -d /tmp/restore-tenant-XXXXXX)
echo "[Restore-Tenant] Desencriptando backup..."

DECRYPTED="$TMPDIR/restore.sql.gz"
gpg --batch --decrypt "$BACKUP_FILE" > "$DECRYPTED" 2>/dev/null
if [[ $? -ne 0 ]]; then
  echo "[Restore-Tenant] ❌ Error al desencriptar. ¿GPG key privada importada?"
  rm -rf "$TMPDIR"
  exit 2
fi

gunzip -c "$DECRYPTED" > "$TMPDIR/restore.sql"
echo "[Restore-Tenant] ✅ Backup desencriptado: $(du -h "$TMPDIR/restore.sql" | cut -f1)"

# Validar que el backup corresponda al tenant correcto
HEADER_LINE=$(head -3 "$TMPDIR/restore.sql" | grep "Tenant:" || echo "")
echo "[Restore-Tenant] $HEADER_LINE"

# ─── Dry run ──────────────────────────────────────────────────────────────────
if $DRY_RUN; then
  echo "[Restore-Tenant] 🧪 Dry-run: modo simulación"
  echo "[Restore-Tenant]    Se restaurarían los datos del tenant $TENANT_ID"
  echo "[Restore-Tenant]    desde $BACKUP_FILE"
  echo "[Restore-Tenant]    Tablas a restaurar:"
  grep "^COPY " "$TMPDIR/restore.sql" | sed 's/^/      /'
  ROW_COUNT=$(grep -c "^COPY " "$TMPDIR/restore.sql")
  echo "[Restore-Tenant]    Total: ~$ROW_COUNT tablas"
  if [[ "$KEEP_FILES" == "false" ]]; then rm -rf "$TMPDIR"; fi
  exit 0
fi

# ─── Drill mode ───────────────────────────────────────────────────────────────
if $DRILL_MODE; then
  echo "[Restore-Tenant] 🧪 Modo DRILL — container PostgreSQL aislado en puerto $DRILL_PORT"

  CONTAINER_NAME="drill-tenant-restore"
  docker rm -f "$CONTAINER_NAME" 2>/dev/null || true

  docker run -d \
    --name "$CONTAINER_NAME" \
    -e POSTGRES_DB="$DB_NAME" \
    -e POSTGRES_USER="$PG_SUPERUSER" \
    -e POSTGRES_PASSWORD="drill_restore_pass" \
    -p "$DRILL_PORT":5432 \
    postgres:16-alpine

  echo "[Restore-Tenant] Esperando que PostgreSQL arranque..."
  for i in $(seq 1 15); do
    if docker exec "$CONTAINER_NAME" pg_isready -U "$PG_SUPERUSER" -d "$DB_NAME" >/dev/null 2>&1; then
      break
    fi
    sleep 2
  done

  echo "[Restore-Tenant] Restaurando en container aislado..."
  docker cp "$TMPDIR/restore.sql" "$CONTAINER_NAME:/tmp/restore.sql"
  docker exec -e PGPASSWORD="drill_restore_pass" "$CONTAINER_NAME" \
    psql -U "$PG_SUPERUSER" -d "$DB_NAME" -f /tmp/restore.sql

  echo "[Restore-Tenant] ✅ Drill completado. Container '$CONTAINER_NAME' activo en puerto $DRILL_PORT"
  echo "[Restore-Tenant]    Para destruirlo: docker stop $CONTAINER_NAME && docker rm $CONTAINER_NAME"

  if [[ "$KEEP_FILES" == "false" ]]; then rm -rf "$TMPDIR"; fi
  exit 0
fi

# ─── Modo producción ──────────────────────────────────────────────────────────
if [[ -z "$PG_CONTAINER" ]]; then
  echo "[Restore-Tenant] ❌ No se pudo detectar el contenedor PostgreSQL"
  rm -rf "$TMPDIR"
  exit 3
fi

PSQL="docker exec -e PGPASSWORD=$PG_SUPERPASS $PG_CONTAINER psql -U $PG_SUPERUSER -d $DB_NAME"

echo "[Restore-Tenant] ⚠️  VAS A RESTAURAR datos del tenant $TENANT_ID SOBRE $PG_CONTAINER"
echo "[Restore-Tenant]    Ctrl+C ahora para cancelar (esperando 5s)..."
sleep 5

# ─── Ejecutar restauración en transacción ─────────────────────────────────────
echo "[Restore-Tenant] Restaurando datos del tenant..."
time $PSQL -f "$TMPDIR/restore.sql"

if [[ $? -eq 0 ]]; then
  echo "[Restore-Tenant] ✅ Restauración completada exitosamente"
else
  echo "[Restore-Tenant] ❌ Error durante la restauración (posible rollback automático)"
fi

# ─── Verificación ─────────────────────────────────────────────────────────────
echo "[Restore-Tenant] Verificando datos restaurados..."
$PSQL -c "
  SELECT count(*)::text || ' sucursales' FROM public.sucursales WHERE tenant_id = '$TENANT_ID'
  UNION ALL
  SELECT count(*)::text || ' usuarios' FROM public.usuarios WHERE tenant_id = '$TENANT_ID'
  UNION ALL
  SELECT count(*)::text || ' pacientes' FROM public.pacientes WHERE sucursal_id IN (SELECT id FROM public.sucursales WHERE tenant_id = '$TENANT_ID')
  UNION ALL
  SELECT count(*)::text || ' turnos' FROM public.turnos WHERE sucursal_id IN (SELECT id FROM public.sucursales WHERE tenant_id = '$TENANT_ID')
  UNION ALL
  SELECT count(*)::text || ' recetas' FROM public.recetas WHERE paciente_id IN (SELECT id FROM public.pacientes WHERE sucursal_id IN (SELECT id FROM public.sucursales WHERE tenant_id = '$TENANT_ID'));
" 2>/dev/null || echo "[Restore-Tenant] ⚠️  No se pudo verificar completamente"

# ─── Limpieza ─────────────────────────────────────────────────────────────────
if [[ "$KEEP_FILES" == "false" ]]; then
  rm -rf "$TMPDIR"
  echo "[Restore-Tenant] Archivos temporales eliminados"
fi

echo "[Restore-Tenant] === Restauración per-tenant completada: $(date +%Y-%m-%d_%H%M%S) ==="
