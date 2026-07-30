#!/bin/bash
# ============================================================
# backup-tenant.sh — Backup per-tenant de PostgreSQL
#
# Extrae datos de UN solo tenant en SQL (INSERT statements).
# Compatible con restore-tenant.sh.
#
# Uso:
#   ./backup-tenant.sh <tenant-id> [output-dir]
#
# Variables de entorno:
#   PG_SUPERUSER / PG_SUPERPASS / PGDATABASE
#   GPG_RECIPIENT (def: admin@consultorio.com)
#
# Ejemplos:
#   ./backup-tenant.sh "uuid-del-tenant"
#   ./backup-tenant.sh "uuid-del-tenant" /var/backups/consultorio
# ============================================================
set -euo pipefail

TENANT_ID="${1:?Uso: backup-tenant.sh <tenant-id> [output-dir]}"
BACKUP_DIR="${2:-/var/backups/consultorio}"
GPG_RECIPIENT="${GPG_RECIPIENT:-admin@consultorio.com}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_NAME="${PGDATABASE:-consultorio_medico}"
PG_SUPERUSER="${PG_SUPERUSER:-reece.schmeler67}"
PG_SUPERPASS="${PG_SUPERPASS:-7anlnf0odssgmuwyjchqzdpk}"

# Auto-detectar contenedor PostgreSQL
PG_CONTAINER=""
PG_CONTAINER=$(docker ps --no-trunc --format '{{.Names}}' 2>/dev/null | grep -E '\-postgres-1(\.|$)' | grep -v 'chatwoot\|evolution\|dokploy\|pgbouncer' | head -1 || echo "")
if [[ -z "$PG_CONTAINER" ]]; then
  echo "[Backup-Tenant] ❌ No hay contenedor PostgreSQL disponible"
  exit 1
fi

PSQL="docker exec -e PGPASSWORD=$PG_SUPERPASS $PG_CONTAINER psql -U $PG_SUPERUSER -d $DB_NAME -t -A"
mkdir -p "$BACKUP_DIR"

# ─── Obtener nombre del tenant ────────────────────────────────────────────────
echo "[Backup-Tenant] Obteniendo información del tenant $TENANT_ID..."
TENANT_INFO=$($PSQL -c "SELECT nombre FROM public.tenants WHERE id = '$TENANT_ID'" 2>/dev/null || echo "")
if [[ -z "$TENANT_INFO" ]]; then
  echo "[Backup-Tenant] ❌ Tenant no encontrado: $TENANT_ID"
  exit 1
fi
TENANT_SLUG=$(echo "$TENANT_INFO" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/_/g' | sed 's/__*/_/g' | sed 's/^_//;s/_$//')

# Obtener sucursales del tenant
SUC_IDS=$($PSQL -c "SELECT string_agg('''' || id::text || '''', ',') FROM public.sucursales WHERE tenant_id = '$TENANT_ID'" 2>/dev/null || echo "")
SUC_COUNT=$($PSQL -c "SELECT count(*) FROM public.sucursales WHERE tenant_id = '$TENANT_ID'" 2>/dev/null || echo "0")

echo "[Backup-Tenant] Tenant: $TENANT_INFO (slug: $TENANT_SLUG)"
echo "[Backup-Tenant] Sucursales: $SUC_COUNT"

TMPDIR=$(mktemp -d /tmp/tenant-backup-XXXXXX)
SQL_FILE="$TMPDIR/${TENANT_SLUG}.sql"
OUTPUT_FILE="${BACKUP_DIR}/${TENANT_SLUG}_${TIMESTAMP}.tenant.sql.gz.gpg"

# ─── Funciones helper ─────────────────────────────────────────────────────────

# Extraer tabla con filtro directo por tenant_id
export_tenant_table() {
  local TABLE=$1
  local COLUMNS=$2
  echo "[Backup-Tenant]   → $TABLE (tenant_id)..."
  {
    echo ""
    echo "-- Tabla: $TABLE"
    echo "COPY $TABLE ($COLUMNS) FROM stdin DELIMITER '|' CSV;"
    $PSQL -c "COPY (SELECT $COLUMNS FROM $TABLE WHERE tenant_id = '$TENANT_ID') TO STDOUT WITH CSV DELIMITER '|' NULL ''" 2>/dev/null || true
    echo "\\."
  } >> "$SQL_FILE"
}

# Extraer tabla con filtro por sucursal_id
export_sucursal_table() {
  local TABLE=$1
  local COLUMNS=$2
  if [[ -z "$SUC_IDS" ]]; then return; fi
  echo "[Backup-Tenant]   → $TABLE (sucursal_id)..."
  {
    echo ""
    echo "-- Tabla: $TABLE"
    echo "COPY $TABLE ($COLUMNS) FROM stdin DELIMITER '|' CSV;"
    $PSQL -c "COPY (SELECT $COLUMNS FROM $TABLE WHERE sucursal_id IN ($SUC_IDS)) TO STDOUT WITH CSV DELIMITER '|' NULL ''" 2>/dev/null || true
    echo "\\."
  } >> "$SQL_FILE"
}

# Extraer tabla con filtro por paciente_id (indirecto)
export_paciente_table() {
  local TABLE=$1
  local COLUMNS=$2
  local FK_COL="${3:-paciente_id}"
  if [[ -z "$SUC_IDS" ]]; then return; fi
  echo "[Backup-Tenant]   → $TABLE ($FK_COL → pacientes)..."
  {
    echo ""
    echo "-- Tabla: $TABLE"
    echo "COPY $TABLE ($COLUMNS) FROM stdin DELIMITER '|' CSV;"
    $PSQL -c "COPY (SELECT $COLUMNS FROM $TABLE WHERE $FK_COL IN (SELECT id FROM public.pacientes WHERE sucursal_id IN ($SUC_IDS))) TO STDOUT WITH CSV DELIMITER '|' NULL ''" 2>/dev/null || true
    echo "\\."
  } >> "$SQL_FILE"
}

# Extraer tabla con filtro por medico_id (indirecto)
export_medico_table() {
  local TABLE=$1
  local COLUMNS=$2
  local FK_COL="${3:-medico_id}"
  if [[ -z "$SUC_IDS" ]]; then return; fi
  echo "[Backup-Tenant]   → $TABLE ($FK_COL → medicos)..."
  {
    echo ""
    echo "-- Tabla: $TABLE"
    echo "COPY $TABLE ($COLUMNS) FROM stdin DELIMITER '|' CSV;"
    $PSQL -c "COPY (SELECT $COLUMNS FROM $TABLE WHERE $FK_COL IN (SELECT id FROM public.medicos WHERE sucursal_id IN ($SUC_IDS))) TO STDOUT WITH CSV DELIMITER '|' NULL ''" 2>/dev/null || true
    echo "\\."
  } >> "$SQL_FILE"
}

# Extraer tabla con filtro por turno_id (indirecto)
export_turno_table() {
  local TABLE=$1
  local COLUMNS=$2
  local FK_COL="${3:-turno_id}"
  if [[ -z "$SUC_IDS" ]]; then return; fi
  echo "[Backup-Tenant]   → $TABLE ($FK_COL → turnos)..."
  {
    echo ""
    echo "-- Tabla: $TABLE"
    echo "COPY $TABLE ($COLUMNS) FROM stdin DELIMITER '|' CSV;"
    $PSQL -c "COPY (SELECT $COLUMNS FROM $TABLE WHERE $FK_COL IN (SELECT id FROM public.turnos WHERE sucursal_id IN ($SUC_IDS))) TO STDOUT WITH CSV DELIMITER '|' NULL ''" 2>/dev/null || true
    echo "\\."
  } >> "$SQL_FILE"
}

# ─── STEP 0: Crear cabecera SQL ──────────────────────────────────────────────
cat > "$SQL_FILE" << EOF
-- ============================================================
-- Backup per-tenant
-- Tenant: $TENANT_INFO ($TENANT_ID)
-- Fecha: $(date -Iseconds)
-- ============================================================
BEGIN;
EOF

# ─── STEP 1: Tablas con tenant_id directo ─────────────────────────────────────
echo "[Backup-Tenant] === Tier 1: Tablas directas (tenant_id) ==="

# Obtener columnas para cada tabla consultando information_schema
get_columns() {
  local TABLE=$1
  $PSQL -c "SELECT string_agg(column_name::text, ', ' ORDER BY ordinal_position) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '$TABLE'" 2>/dev/null || echo ""
}

# sucursales (padre, FK→tenants)
COLS=$(get_columns "sucursales")
if [[ -n "$COLS" ]]; then
  echo "[Backup-Tenant]   → sucursales (tenant_id)..."
  {
    echo ""
    echo "-- Tabla: public.sucursales"
    echo "COPY public.sucursales ($COLS) FROM stdin DELIMITER '|' CSV;"
    $PSQL -c "COPY (SELECT $COLS FROM public.sucursales WHERE tenant_id = '$TENANT_ID') TO STDOUT WITH CSV DELIMITER '|' NULL ''" 2>/dev/null || true
    echo "\\."
  } >> "$SQL_FILE"
fi

# Tablas con tenant_id directo
DIRECT_TABLES=(
  "usuarios"
  "horarios_atencion"
  "plantillas_mensajes"
  "api_keys"
  "notificaciones"
  "push_subscriptions"
  "preferencias_notificaciones"
  "webhook_configs"
  "portal_config"
  "web_vitals_metrics"
  "ordenes_estudio"
  "documentos_medicos"
  "paquetes_portal"
  "consentimientos"
  "blacklist"
)

for TABLE in "${DIRECT_TABLES[@]}"; do
  COLS=$(get_columns "$TABLE")
  [[ -n "$COLS" ]] && export_tenant_table "public.$TABLE" "$COLS"
done

# suscripciones (usa organizacion_id como tenant_id)
COLS=$(get_columns "suscripciones")
if [[ -n "$COLS" ]]; then
  echo "[Backup-Tenant]   → suscripciones (organizacion_id)..."
  {
    echo ""
    echo "-- Tabla: public.suscripciones"
    echo "COPY public.suscripciones ($COLS) FROM stdin DELIMITER '|' CSV;"
    $PSQL -c "COPY (SELECT $COLS FROM public.suscripciones WHERE organizacion_id = '$TENANT_ID') TO STDOUT WITH CSV DELIMITER '|' NULL ''" 2>/dev/null || true
    echo "\\."
  } >> "$SQL_FILE"
fi

# consentimiento_compartir
COLS=$(get_columns "consentimiento_compartir")
if [[ -n "$COLS" ]]; then
  echo "[Backup-Tenant]   → consentimiento_compartir (tenant_id)..."
  {
    echo ""
    echo "-- Tabla: public.consentimiento_compartir"
    echo "COPY public.consentimiento_compartir ($COLS) FROM stdin DELIMITER '|' CSV;"
    $PSQL -c "COPY (SELECT $COLS FROM public.consentimiento_compartir WHERE tenant_id = '$TENANT_ID') TO STDOUT WITH CSV DELIMITER '|' NULL ''" 2>/dev/null || true
    echo "\\."
  } >> "$SQL_FILE"
fi

# derivaciones
COLS=$(get_columns "derivaciones")
if [[ -n "$COLS" ]]; then
  echo "[Backup-Tenant]   → derivaciones (tenant_id)..."
  {
    echo ""
    echo "-- Tabla: public.derivaciones"
    echo "COPY public.derivaciones ($COLS) FROM stdin DELIMITER '|' CSV;"
    $PSQL -c "COPY (SELECT $COLS FROM public.derivaciones WHERE tenant_id = '$TENANT_ID') TO STDOUT WITH CSV DELIMITER '|' NULL ''" 2>/dev/null || true
    echo "\\."
  } >> "$SQL_FILE"
fi

# convenios_intercambio
COLS=$(get_columns "convenios_intercambio")
if [[ -n "$COLS" ]]; then
  echo "[Backup-Tenant]   → convenios_intercambio (tenant_origen_id)..."
  {
    echo ""
    echo "-- Tabla: public.convenios_intercambio"
    echo "COPY public.convenios_intercambio ($COLS) FROM stdin DELIMITER '|' CSV;"
    $PSQL -c "COPY (SELECT $COLS FROM public.convenios_intercambio WHERE tenant_origen_id = '$TENANT_ID' OR tenant_destino_id = '$TENANT_ID') TO STDOUT WITH CSV DELIMITER '|' NULL ''" 2>/dev/null || true
    echo "\\."
  } >> "$SQL_FILE"
fi

# auditoria_accesos (solo limited rows — muy pesada)
COLS=$(get_columns "auditoria_accesos")
if [[ -n "$COLS" ]]; then
  echo "[Backup-Tenant]   → auditoria_accesos (tenant_id, últimos 1000)..."
  {
    echo ""
    echo "-- Tabla: public.auditoria_accesos (últimos 1000 registros)"
    echo "COPY public.auditoria_accesos ($COLS) FROM stdin DELIMITER '|' CSV;"
    $PSQL -c "COPY (SELECT $COLS FROM public.auditoria_accesos WHERE tenant_id = '$TENANT_ID' ORDER BY created_at DESC LIMIT 1000) TO STDOUT WITH CSV DELIMITER '|' NULL ''" 2>/dev/null || true
    echo "\\."
  } >> "$SQL_FILE"
fi

# ─── STEP 2: Tablas con sucursal_id (Tier 2) ──────────────────────────────────
if [[ -n "$SUC_IDS" ]]; then
  echo "[Backup-Tenant] === Tier 2: Tablas indirectas (sucursal_id) ==="

  SUCURSAL_TABLES=(
    "medicos"
    "pacientes"
    "turnos"
    "lista_espera"
  )
  for TABLE in "${SUCURSAL_TABLES[@]}"; do
    COLS=$(get_columns "$TABLE")
    [[ -n "$COLS" ]] && export_sucursal_table "public.$TABLE" "$COLS"
  done

  # ─── STEP 3: Tablas con FK a pacientes (Tier 3) ────────────────────────────
  echo "[Backup-Tenant] === Tier 3: Tablas FK → pacientes ==="

  PACIENTE_TABLES=(
    "paciente_eventos:paciente_id"
    "conversaciones:paciente_id"
    "suscripciones_paciente:paciente_id"
    "consentimiento_log:paciente_id"
    "facturacion:paciente_id"
    "portal_pagos:paciente_id"
  )
  for ENTRY in "${PACIENTE_TABLES[@]}"; do
    TABLE="${ENTRY%%:*}"
    FK="${ENTRY##*:}"
    COLS=$(get_columns "$TABLE")
    [[ -n "$COLS" ]] && export_paciente_table "public.$TABLE" "$COLS" "$FK"
  done

  # ─── STEP 4: Tablas con FK a medicos ───────────────────────────────────────
  echo "[Backup-Tenant] === Tier 4: Tablas FK → medicos ==="

  MEDICO_TABLES=(
    "servicios:medico_id"
    "bloqueos_agenda:medico_id"
  )
  for ENTRY in "${MEDICO_TABLES[@]}"; do
    TABLE="${ENTRY%%:*}"
    FK="${ENTRY##*:}"
    COLS=$(get_columns "$TABLE")
    [[ -n "$COLS" ]] && export_medico_table "public.$TABLE" "$COLS" "$FK"
  done

  # ─── STEP 5: Tablas FK → turnos ────────────────────────────────────────────
  echo "[Backup-Tenant] === Tier 5: Tablas FK → turnos ==="

  TURNO_TABLES=(
    "portal_pagos:turno_id"
  )
  for ENTRY in "${TURNO_TABLES[@]}"; do
    TABLE="${ENTRY%%:*}"
    FK="${ENTRY##*:}"
    COLS=$(get_columns "$TABLE")
    [[ -n "$COLS" ]] && export_turno_table "public.$TABLE" "$COLS" "$FK"
  done

  # ─── STEP 6: Recetas, NotasSOAP, Historial (FK múltiple paciente/medico) ────
  echo "[Backup-Tenant] === Tier 6: Tablas FK múltiple ==="

  # recetas: puede ir por paciente_id
  COLS=$(get_columns "recetas")
  if [[ -n "$COLS" ]]; then
    echo "[Backup-Tenant]   → recetas (paciente_id)..."
    {
      echo ""
      echo "-- Tabla: public.recetas"
      echo "COPY public.recetas ($COLS) FROM stdin DELIMITER '|' CSV;"
      $PSQL -c "COPY (SELECT $COLS FROM public.recetas WHERE paciente_id IN (SELECT id FROM public.pacientes WHERE sucursal_id IN ($SUC_IDS))) TO STDOUT WITH CSV DELIMITER '|' NULL ''" 2>/dev/null || true
      echo "\\."
    } >> "$SQL_FILE"
  fi

  # notas_soap: puede ir por paciente_id
  COLS=$(get_columns "notas_soap")
  if [[ -n "$COLS" ]]; then
    echo "[Backup-Tenant]   → notas_soap (paciente_id)..."
    {
      echo ""
      echo "-- Tabla: public.notas_soap"
      echo "COPY public.notas_soap ($COLS) FROM stdin DELIMITER '|' CSV;"
      $PSQL -c "COPY (SELECT $COLS FROM public.notas_soap WHERE paciente_id IN (SELECT id FROM public.pacientes WHERE sucursal_id IN ($SUC_IDS))) TO STDOUT WITH CSV DELIMITER '|' NULL ''" 2>/dev/null || true
      echo "\\."
    } >> "$SQL_FILE"
  fi

  # historial_medico: puede ir por paciente_id
  COLS=$(get_columns "historial_medico")
  if [[ -n "$COLS" ]]; then
    echo "[Backup-Tenant]   → historial_medico (paciente_id)..."
    {
      echo ""
      echo "-- Tabla: public.historial_medico"
      echo "COPY public.historial_medico ($COLS) FROM stdin DELIMITER '|' CSV;"
      $PSQL -c "COPY (SELECT $COLS FROM public.historial_medico WHERE paciente_id IN (SELECT id FROM public.pacientes WHERE sucursal_id IN ($SUC_IDS))) TO STDOUT WITH CSV DELIMITER '|' NULL ''" 2>/dev/null || true
      echo "\\."
    } >> "$SQL_FILE"
  fi

  # mensajes (via conversaciones)
  COLS=$(get_columns "mensajes")
  if [[ -n "$COLS" ]]; then
    echo "[Backup-Tenant]   → mensajes (conversacion_id)..."
    {
      echo ""
      echo "-- Tabla: public.mensajes"
      echo "COPY public.mensajes ($COLS) FROM stdin DELIMITER '|' CSV;"
      $PSQL -c "COPY (SELECT $COLS FROM public.mensajes WHERE conversacion_id IN (SELECT id FROM public.conversaciones WHERE paciente_id IN (SELECT id FROM public.pacientes WHERE sucursal_id IN ($SUC_IDS)))) TO STDOUT WITH CSV DELIMITER '|' NULL ''" 2>/dev/null || true
      echo "\\."
    } >> "$SQL_FILE"
  fi

  # tareas_pendientes: puede ir por paciente_id o medico_id
  COLS=$(get_columns "tareas_pendientes")
  if [[ -n "$COLS" ]]; then
    echo "[Backup-Tenant]   → tareas_pendientes (paciente_id o medico_id)..."
    {
      echo ""
      echo "-- Tabla: public.tareas_pendientes"
      echo "COPY public.tareas_pendientes ($COLS) FROM stdin DELIMITER '|' CSV;"
      $PSQL -c "COPY (SELECT $COLS FROM public.tareas_pendientes WHERE paciente_id IN (SELECT id FROM public.pacientes WHERE sucursal_id IN ($SUC_IDS)) OR medico_id IN (SELECT id FROM public.medicos WHERE sucursal_id IN ($SUC_IDS))) TO STDOUT WITH CSV DELIMITER '|' NULL ''" 2>/dev/null || true
      echo "\\."
    } >> "$SQL_FILE"
  fi

  # ofertas_turno (via lista_espera)
  COLS=$(get_columns "ofertas_turno")
  if [[ -n "$COLS" ]]; then
    echo "[Backup-Tenant]   → ofertas_turno (lista_espera_id)..."
    {
      echo ""
      echo "-- Tabla: public.ofertas_turno"
      echo "COPY public.ofertas_turno ($COLS) FROM stdin DELIMITER '|' CSV;"
      $PSQL -c "COPY (SELECT $COLS FROM public.ofertas_turno WHERE lista_espera_id IN (SELECT id FROM public.lista_espera WHERE sucursal_id IN ($SUC_IDS))) TO STDOUT WITH CSV DELIMITER '|' NULL ''" 2>/dev/null || true
      echo "\\."
    } >> "$SQL_FILE"
  fi

  # onboarding_progress (via usuario_id → usuarios.tenant_id)
  COLS=$(get_columns "onboarding_progress")
  if [[ -n "$COLS" ]]; then
    echo "[Backup-Tenant]   → onboarding_progress (usuario_id)..."
    {
      echo ""
      echo "-- Tabla: public.onboarding_progress"
      echo "COPY public.onboarding_progress ($COLS) FROM stdin DELIMITER '|' CSV;"
      $PSQL -c "COPY (SELECT $COLS FROM public.onboarding_progress WHERE usuario_id IN (SELECT id FROM public.usuarios WHERE tenant_id = '$TENANT_ID')) TO STDOUT WITH CSV DELIMITER '|' NULL ''" 2>/dev/null || true
      echo "\\."
    } >> "$SQL_FILE"
  fi

  # user_feature_overrides (via usuario_id → usuarios.tenant_id)
  COLS=$(get_columns "user_feature_overrides")
  if [[ -n "$COLS" ]]; then
    echo "[Backup-Tenant]   → user_feature_overrides (usuario_id)..."
    {
      echo ""
      echo "-- Tabla: public.user_feature_overrides"
      echo "COPY public.user_feature_overrides ($COLS) FROM stdin DELIMITER '|' CSV;"
      $PSQL -c "COPY (SELECT $COLS FROM public.user_feature_overrides WHERE usuario_id IN (SELECT id FROM public.usuarios WHERE tenant_id = '$TENANT_ID')) TO STDOUT WITH CSV DELIMITER '|' NULL ''" 2>/dev/null || true
      echo "\\."
    } >> "$SQL_FILE"
  fi
fi

# ─── STEP 7: Cerrar transacción ───────────────────────────────────────────────
echo "" >> "$SQL_FILE"
echo "COMMIT;" >> "$SQL_FILE"

# ─── Encriptar ────────────────────────────────────────────────────────────────
echo "[Backup-Tenant] Comprimiendo y encriptando..."
gzip -c "$SQL_FILE" | gpg --batch --yes --trust-model always \
  --recipient "$GPG_RECIPIENT" --output "$OUTPUT_FILE" --encrypt

FINAL_SIZE=$(du -h "$OUTPUT_FILE" 2>/dev/null | cut -f1)
echo "[Backup-Tenant] ✅ Backup creado: $OUTPUT_FILE ($FINAL_SIZE)"

# Verificar integridad
gpg --batch --quiet --decrypt "$OUTPUT_FILE" > /dev/null 2>&1 \
  && echo "[Backup-Tenant] ✅ Integridad verificada" \
  || echo "[Backup-Tenant] ❌ Error de integridad"

# Off-site
if [[ -n "${RCLONE_REMOTE:-}" ]]; then
  echo "[Backup-Tenant] Subiendo a off-site..."
  RCLONE_OPTS=""
  [[ -n "${RCLONE_CONFIG:-}" ]] && RCLONE_OPTS="--config $RCLONE_CONFIG"
  rclone copy $RCLONE_OPTS "$OUTPUT_FILE" "${RCLONE_REMOTE}/tenants/" \
    && echo "[Backup-Tenant] ✅ Off-site sync completado" \
    || echo "[Backup-Tenant] ⚠️  Error en off-site sync"
fi

# Limpiar
rm -rf "$TMPDIR"
echo "[Backup-Tenant] === Backup per-tenant completado: $TIMESTAMP ==="
