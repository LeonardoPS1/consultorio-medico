#!/bin/bash
# ============================================================
# restore-full.sh — Restauración completa del sistema
#
# Orquesta la restauración de BD + volúmenes.
# Guía paso a paso: backup → restauración → verificación.
#
# Uso:
#   ./restore-full.sh [--pg-backup archivo.gpg] [--vol-backup nombre:archivo.gpg] [--drill]
#
# Ejemplos:
#   # Drill completo en container aislado
#   ./restore-full.sh --drill --pg-backup /backup/consultorio_20260722.sql.gz.gpg
#
#   # Restauración real (con advertencia de 15s)
#   ./restore-full.sh \
#     --pg-backup /backup/consultorio_20260722.sql.gz.gpg \
#     --vol-backup n8n_data:/backup/n8n_data_20260722.tar.gz.gpg
# ============================================================
set -euo pipefail

DRILL_MODE=false
PG_BACKUP=""
VOL_BACKUPS=()

# ─── Parsing de argumentos ────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --drill) DRILL_MODE=true; shift ;;
    --pg-backup) PG_BACKUP="$2"; shift 2 ;;
    --vol-backup) VOL_BACKUPS+=("$2"); shift 2 ;;
    --help)
      sed -n '/^# =/,/^set -/p' "$0" | grep '^#' | sed 's/^# \?//'
      exit 0
      ;;
    *) echo "Opción desconocida: $1"; exit 1 ;;
  esac
done

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║     RESTAURACIÓN COMPLETA — Consultorio Médico          ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

if [[ "$DRILL_MODE" == "true" ]]; then
  echo "🧪 Modo DRILL — todo se restaura en containers aislados"
  echo "   No afecta a la instancia productiva."
  echo ""
fi

# ─── FASE 1: Restaurar PostgreSQL ─────────────────────────────────────────────
if [[ -n "$PG_BACKUP" ]]; then
  echo "────────────────────────────────────────────────────────"
  echo " FASE 1/3 — Restaurar PostgreSQL"
  echo "────────────────────────────────────────────────────────"

  if [[ "$DRILL_MODE" == "true" ]]; then
    bash "$(dirname "$0")/restore-pg.sh" --drill "$PG_BACKUP"
  else
    bash "$(dirname "$0")/restore-pg.sh" "$PG_BACKUP"
  fi
  echo ""
else
  echo "⚠️  No se especificó backup de PostgreSQL (--pg-backup). Saltando..."
  echo ""
fi

# ─── FASE 2: Restaurar volúmenes Docker ───────────────────────────────────────
if [[ ${#VOL_BACKUPS[@]} -gt 0 ]]; then
  echo "────────────────────────────────────────────────────────"
  echo " FASE 2/3 — Restaurar volúmenes Docker"
  echo "────────────────────────────────────────────────────────"

  for VOL_SPEC in "${VOL_BACKUPS[@]}"; do
    VOL_NAME="${VOL_SPEC%%:*}"
    VOL_FILE="${VOL_SPEC#*:}"
    echo "  • Volumen: $VOL_NAME"
    echo "    Backup:   $VOL_FILE"
    bash "$(dirname "$0")/restore-volumes.sh" "$VOL_FILE" "$VOL_NAME"
    echo ""
  done
else
  echo "⚠️  No se especificaron volúmenes (--vol-backup). Saltando..."
  echo ""
fi

# ─── FASE 3: Verificación post-restauración ───────────────────────────────────
echo "────────────────────────────────────────────────────────"
echo " FASE 3/3 — Verificación del sistema"
echo "────────────────────────────────────────────────────────"

echo ""
echo "📋 Checklist de verificación:"
echo ""
echo "  [ ] ¿PostgreSQL responde?"
echo "       → pg_isready -U dashboard_user -d consultorio_medico"
echo ""
echo "  [ ] ¿Volúmenes restaurados?"
echo "       → docker volume inspect n8n_data"
echo "       → docker volume inspect metabase_data"
echo ""
echo "  [ ] ¿Contenedores arrancan?"
echo "       → docker stack deploy -c docker-compose.prod.yml med"
echo "       → docker stack services med (todos replicados 1/1)"
echo ""
echo "  [ ] ¿n8n responde?"
echo "       → curl -s https://n8n.aicorebots.com/api/v1/workflows"
echo ""
echo "  [ ] ¿Dashboard responde?"
echo "       → curl -s https://med.aicorebots.com/api/health"
echo ""
echo "  [ ] ¿Workflows activos?"
echo "       → curl -s https://n8n.aicorebots.com/api/v1/workflows | jq '.data | length'"
echo "       (esperado: 10)"
echo ""
echo "  [ ] ¿Logs sin errores?"
echo "       → docker service logs --tail 50 med_dashboard"
echo "       → docker service logs --tail 50 med_n8n"
echo ""

if [[ "$DRILL_MODE" == "true" ]]; then
  echo "🧪 Drill completado. Los containers aislados están activos."
  echo "   Para limpiar:"
  echo "   docker stop drill-pg-restore 2>/dev/null; docker rm drill-pg-restore 2>/dev/null"
fi

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║  ✅ RESTAURACIÓN COMPLETADA                             ║"
echo "║  $(date +%Y-%m-%d_%H%M%S)                               ║"
echo "╚══════════════════════════════════════════════════════════╝"
