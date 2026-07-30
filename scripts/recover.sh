#!/bin/bash
# ============================================================
# recover.sh — Recuperación completa automatizada (one-command)
#
# Detecta automáticamente los últimos backups y restaura:
#   - PostgreSQL: busca *.sql.gz.gpg más reciente
#   - Volúmenes:  busca *.tar.gz.gpg más reciente por tipo
#   - Tenant:     busca *.tenant.sql.gz.gpg más reciente
#
# Uso:
#   ./scripts/recover.sh                          # Modo interactivo
#   ./scripts/recover.sh --force                  # Sin confirmación
#   ./scripts/recover.sh --drill                  # Drill aislado
#   ./scripts/recover.sh --pg-only                # Solo PostgreSQL
#   ./scripts/recover.sh --vols-only              # Solo volúmenes
#   ./scripts/recover.sh --tenant <uuid>          # Restaurar un tenant
#   ./scripts/recover.sh --tenant <uuid> --drill  # Tenant en drill
#   ./scripts/recover.sh --pg-backup <archivo>    # Backup específico PG
#   ./scripts/recover.sh --tenant-backup <archivo> --tenant <uuid>  # Tenant específico
# ============================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/consultorio}"
FORCE=false
DRILL=false
PG_ONLY=false
VOLS_ONLY=false
TENANT_ID=""
PG_BACKUP_SPECIFIC=""
TENANT_BACKUP_SPECIFIC=""

# ─── Parse args ───────────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --force) FORCE=true; shift ;;
    --drill) DRILL=true; shift ;;
    --pg-only) PG_ONLY=true; shift ;;
    --vols-only) VOLS_ONLY=true; shift ;;
    --tenant) TENANT_ID="${2:?--tenant requiere UUID}"; shift 2 ;;
    --pg-backup) PG_BACKUP_SPECIFIC="${2:?--pg-backup requiere ruta}"; shift 2 ;;
    --tenant-backup) TENANT_BACKUP_SPECIFIC="${2:?--tenant-backup requiere ruta}"; shift 2 ;;
    --help)
      sed -n '/^# =/,/^set -/p' "$0" | grep '^#' | sed 's/^# \?//'
      exit 0
      ;;
    *) echo "Opción desconocida: $1"; exit 1 ;;
  esac
done

# ─── Banner ───────────────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║     🚀 RECUPERACIÓN AUTOMATIZADA — Consultorio Médico   ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

if $DRILL; then
  echo "🧪 Modo DRILL — containers aislados, no afecta prod"
fi
echo "📁 Backups: $BACKUP_DIR"
echo ""

# ─── Modo tenant ──────────────────────────────────────────────────────────────
if [[ -n "$TENANT_ID" ]]; then
  echo "────────────────────────────────────────────────────────"
  echo " 🎯 Modo TENANT — restaurando solo tenant $TENANT_ID"
  echo "────────────────────────────────────────────────────────"

  if [[ -n "$TENANT_BACKUP_SPECIFIC" ]]; then
    TENANT_FILE="$TENANT_BACKUP_SPECIFIC"
  else
    TENANT_FILE=$(ls -t "$BACKUP_DIR"/*.tenant.sql.gz.gpg 2>/dev/null | head -1 || echo "")
  fi

  if [[ -z "$TENANT_FILE" ]]; then
    echo "❌ No se encontró backup de tenant"
    exit 1
  fi

  echo "📦 Backup: $(basename "$TENANT_FILE") ($(du -h "$TENANT_FILE" | cut -f1))"
  echo ""

  if $DRILL; then
    bash "$SCRIPT_DIR/restore-tenant.sh" --drill "$TENANT_FILE" "$TENANT_ID"
  elif $FORCE; then
    bash "$SCRIPT_DIR/restore-tenant.sh" --force "$TENANT_FILE" "$TENANT_ID"
  else
    bash "$SCRIPT_DIR/restore-tenant.sh" "$TENANT_FILE" "$TENANT_ID"
  fi

  echo ""
  echo "✅ Recuperación de tenant completada."
  echo ""
  echo "╚══════════════════════════════════════════════════════════╝"
  exit $?
fi

# ─── Verificar prerequisitos (solo para modo completo) ─────────────────────────
for CMD in docker gpg pg_restore; do
  if ! command -v "$CMD" &>/dev/null; then
    echo "❌ $CMD no instalado. Instalá: apk add docker-cli gpg postgresql-client"
    exit 1
  fi
done

# ─── Auto-detectar backups ────────────────────────────────────────────────────
echo "────────────────────────────────────────────────────────"
echo " Buscando últimos backups..."
echo "────────────────────────────────────────────────────────"

if [[ -n "$PG_BACKUP_SPECIFIC" ]]; then
  PG_BACKUP="$PG_BACKUP_SPECIFIC"
  if [[ ! -f "$PG_BACKUP" ]]; then
    echo "❌ Backup específico no encontrado: $PG_BACKUP"
    exit 1
  fi
  PG_SIZE=$(du -h "$PG_BACKUP" | cut -f1)
  echo "  📦 PostgreSQL (específico): $(basename "$PG_BACKUP") ($PG_SIZE)"
else
  PG_BACKUP=$(ls -t "$BACKUP_DIR"/*.sql.gz.gpg 2>/dev/null | head -1 || echo "")
  if [[ -n "$PG_BACKUP" ]]; then
    PG_SIZE=$(du -h "$PG_BACKUP" | cut -f1)
    echo "  📦 PostgreSQL: $(basename "$PG_BACKUP") ($PG_SIZE)"
  else
    echo "  ⚠️  No hay backup de PostgreSQL"
  fi
fi

declare -A VOL_BACKUPS
for VOL_TYPE in n8n_data metabase_data recordings; do
  LATEST=$(ls -t "$BACKUP_DIR"/${VOL_TYPE}_*.tar.gz.gpg 2>/dev/null | head -1 || echo "")
  if [[ -n "$LATEST" ]]; then
    VOL_BACKUPS["$VOL_TYPE"]="$LATEST"
  fi
done

if [[ -z "$PG_BACKUP" && ${#VOL_BACKUPS[@]} -eq 0 ]]; then
  echo "❌ No se encontraron backups en $BACKUP_DIR"
  exit 1
fi

for VOL_TYPE in "${!VOL_BACKUPS[@]}"; do
  VOL_SIZE=$(du -h "${VOL_BACKUPS[$VOL_TYPE]}" | cut -f1)
  echo "  💾 $VOL_TYPE: $(basename "${VOL_BACKUPS[$VOL_TYPE]}") ($VOL_SIZE)"
done
echo ""

# ─── Confirmación ─────────────────────────────────────────────────────────────
if ! $FORCE && ! $DRILL; then
  echo "⚠️  VAS A RESTAURAR LA BASE DE DATOS PRODUCTIVA."
  echo "   Escribí 'RECUPERAR' para confirmar (Ctrl+C cancela):"
  read -r CONFIRM
  if [[ "$CONFIRM" != "RECUPERAR" ]]; then
    echo "Cancelado."
    exit 0
  fi
elif ! $FORCE && $DRILL; then
  echo "Presioná Enter para iniciar drill, o Ctrl+C para cancelar..."
  read -r
fi

echo ""

# ─── FASE 1: Restaurar PostgreSQL ─────────────────────────────────────────────
if ! $VOLS_ONLY && [[ -n "$PG_BACKUP" ]]; then
  echo "────────────────────────────────────────────────────────"
  echo " FASE 1/2 — Restaurando PostgreSQL..."
  echo "────────────────────────────────────────────────────────"

  if $DRILL; then
    bash "$SCRIPT_DIR/restore-pg.sh" --drill "$PG_BACKUP"
  else
    bash "$SCRIPT_DIR/restore-pg.sh" "$PG_BACKUP"
  fi
  echo ""
elif $VOLS_ONLY; then
  echo "⏭️  PostgreSQL saltado (--vols-only)"
elif [[ -z "$PG_BACKUP" ]]; then
  echo "⏭️  No hay backup de PostgreSQL"
fi

# ─── FASE 2: Restaurar volúmenes ─────────────────────────────────────────────
if ! $PG_ONLY && [[ ${#VOL_BACKUPS[@]} -gt 0 ]]; then
  echo "────────────────────────────────────────────────────────"
  echo " FASE 2/2 — Restaurando volúmenes Docker..."
  echo "────────────────────────────────────────────────────────"

  for VOL_TYPE in "${!VOL_BACKUPS[@]}"; do
    echo ""
    echo "  → Restaurando $VOL_TYPE..."
    bash "$SCRIPT_DIR/restore-volumes.sh" "${VOL_BACKUPS[$VOL_TYPE]}" "$VOL_TYPE"
  done
  echo ""
elif $PG_ONLY; then
  echo "⏭️  Volúmenes saltados (--pg-only)"
fi

# ─── Resumen final ────────────────────────────────────────────────────────────
echo "────────────────────────────────────────────────────────"
echo " RESUMEN"
echo "────────────────────────────────────────────────────────"
echo ""

if $DRILL; then
  echo "🧪 Drill completado. Verificar datos y limpiar containers."
else
  echo "✅ Recuperación completada."
  echo ""
  echo "📋 Próximos pasos:"
  echo "   1. Verificar servicios: docker stack services med"
  echo "   2. Verificar dashboard: curl https://med.aicorebots.com/api/health"
  echo "   3. Verificar n8n: curl https://n8n.aicorebots.com/api/v1/workflows"
fi
echo ""

if $DRILL; then
  echo "🧪 Para limpiar containers drill:"
  echo "   docker ps --filter name=drill -q | xargs docker stop | xargs docker rm"
fi

echo "╚══════════════════════════════════════════════════════════╝"
