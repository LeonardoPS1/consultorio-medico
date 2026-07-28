#!/bin/bash
# ============================================================
# check-backups.sh — Monitoreo de estado de backups
#
# Verifica:
#   - Antigüedad del último backup de PostgreSQL
#   - Antigüedad del último backup de volúmenes
#   - Espacio en disco disponible
#   - Tamaño total de backups
#
# Uso:
#   ./check-backups.sh [--alert-hours 26] [--dir /var/backups/consultorio]
#
# Exit codes:
#   0 = OK
#   1 = Warning (backup antiguo o espacio bajo)
#   2 = Critical (sin backups o espacio crítico)
# ============================================================
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/consultorio}"
ALERT_HOURS="${ALERT_HOURS:-26}"  # 1h de tolerancia sobre el schedule de 24h
CRITICAL_HOURS="${CRITICAL_HOURS:-50}"
SPACE_WARN_PCT=20
SPACE_CRIT_PCT=10

echo "[Check-Backups] === Verificación de backups: $(date +%Y-%m-%d_%H%M%S) ==="
echo "[Check-Backups] Directorio: $BACKUP_DIR"
echo ""

EXIT_CODE=0

# ─── 1. Verificar backups de PostgreSQL ───────────────────────────────────────
echo "──────────────────────────────────────────────"
echo " PostgreSQL Backups (.sql.gz.gpg)"
echo "──────────────────────────────────────────────"

PG_FILES=()
if [[ -d "$BACKUP_DIR" ]]; then
  while IFS= read -r -d '' f; do
    PG_FILES+=("$f")
  done < <(find "$BACKUP_DIR" -name '*.sql.gz.gpg' -type f -print0 2>/dev/null || true)
fi

if [[ ${#PG_FILES[@]} -eq 0 ]]; then
  echo "[Check-Backups] ❌ CRÍTICO: No hay backups de PostgreSQL"
  EXIT_CODE=2
else
  LATEST="${PG_FILES[0]}"
  for f in "${PG_FILES[@]}"; do
    [[ "$f" -nt "$LATEST" ]] && LATEST="$f"
  done

  MTIME=$(stat -c %Y "$LATEST" 2>/dev/null || stat -f %m "$LATEST" 2>/dev/null)
  NOW=$(date +%s)
  AGE_HOURS=$(( (NOW - MTIME) / 3600 ))
  AGE_HUMAN=$(date -d "@$MTIME" '+%Y-%m-%d %H:%M:%S' 2>/dev/null || stat -f '%Sm' -t '%Y-%m-%d %H:%M:%S' "$LATEST" 2>/dev/null)

  SIZE=$(du -h "$LATEST" | cut -f1)
  echo "[Check-Backups] Último backup: $AGE_HUMAN ($AGE_HORASh ago, $SIZE)"

  if [[ $AGE_HOURS -gt $CRITICAL_HOURS ]]; then
    echo "[Check-Backups] ❌ CRÍTICO: Backup tiene más de $CRITICAL_HOURS horas"
    EXIT_CODE=2
  elif [[ $AGE_HOURS -gt $ALERT_HOURS ]]; then
    echo "[Check-Backups] ⚠️  WARNING: Backup tiene más de $ALERT_HOURS horas"
    [[ $EXIT_CODE -lt 1 ]] && EXIT_CODE=1
  else
    echo "[Check-Backups] ✅ OK"
  fi

  # Verificar integridad del último backup
  echo "[Check-Backups] Verificando integridad..."
  if gpg --batch --quiet --decrypt "$LATEST" > /dev/null 2>&1; then
    echo "[Check-Backups] ✅ Integridad OK"
  else
    echo "[Check-Backups] ❌ CRÍTICO: Error de integridad en $LATEST"
    EXIT_CODE=2
  fi
fi
echo ""

# ─── 2. Verificar backups de volúmenes Docker ─────────────────────────────────
echo "──────────────────────────────────────────────"
echo " Volume Backups (.tar.gz.gpg)"
echo "──────────────────────────────────────────────"

VOL_FILES=()
if [[ -d "$BACKUP_DIR" ]]; then
  while IFS= read -r -d '' f; do
    VOL_FILES+=("$f")
  done < <(find "$BACKUP_DIR" -name '*.tar.gz.gpg' -type f -print0 2>/dev/null || true)
fi

if [[ ${#VOL_FILES[@]} -eq 0 ]]; then
  echo "[Check-Backups] ❌ CRÍTICO: No hay backups de volúmenes"
  EXIT_CODE=2
else
  echo "[Check-Backups] ${#VOL_FILES[@]} backups de volúmenes encontrados"

  # Agrupar por prefijo (n8n_data, metabase_data, recordings)
  declare -A VOL_GROUPS
  for f in "${VOL_FILES[@]}"; do
    BASENAME=$(basename "$f")
    PREFIX=$(echo "$BASENAME" | sed 's/_[0-9].*//')
    VOL_GROUPS["$PREFIX"]="${VOL_GROUPS["$PREFIX"]} $f"
  done

  for PREFIX in "${!VOL_GROUPS[@]}"; do
    # Obtener el más reciente de cada grupo
    LATEST_VOL=""
    for f in ${VOL_GROUPS["$PREFIX"]}; do
      if [[ -z "$LATEST_VOL" || "$f" -nt "$LATEST_VOL" ]]; then
        LATEST_VOL="$f"
      fi
    done

    MTIME=$(stat -c %Y "$LATEST_VOL" 2>/dev/null || stat -f %m "$LATEST_VOL" 2>/dev/null)
    AGE_HOURS=$(( (NOW - MTIME) / 3600 ))
    SIZE=$(du -h "$LATEST_VOL" | cut -f1)

    if [[ $AGE_HOURS -gt $CRITICAL_HOURS ]]; then
      echo "[Check-Backups] ❌ $PREFIX: backup antiguo (>${CRITICAL_HOURS}h), $SIZE"
      EXIT_CODE=2
    elif [[ $AGE_HOURS -gt $ALERT_HOURS ]]; then
      echo "[Check-Backups] ⚠️  $PREFIX: backup antiguo (>${ALERT_HOURS}h), $SIZE"
      [[ $EXIT_CODE -lt 1 ]] && EXIT_CODE=1
    else
      echo "[Check-Backups] ✅ $PREFIX: $SIZE"
    fi

    # Verificar integridad del más reciente de cada tipo
    if gpg --batch --quiet --decrypt "$LATEST_VOL" > /dev/null 2>&1; then
      echo "[Check-Backups]   └─ Integridad: ✅"
    else
      echo "[Check-Backups]   └─ Integridad: ❌"
      EXIT_CODE=2
    fi
  done
fi
echo ""

# ─── 3. Verificar espacio en disco ────────────────────────────────────────────
echo "──────────────────────────────────────────────"
echo " Disk Space"
echo "──────────────────────────────────────────────"

if command -v df &>/dev/null; then
  AVAILABLE_PCT=$(df "$BACKUP_DIR" 2>/dev/null | tail -1 | awk '{print $5}' | sed 's/%//')
  if [[ -n "$AVAILABLE_PCT" ]]; then
    USED_PCT=$((100 - AVAILABLE_PCT))
    # Recalcular: df muestra usado%, no disponible%
    AVAILABLE_PCT=$((100 - $(df "$BACKUP_DIR" 2>/dev/null | tail -1 | awk '{print $5}' | sed 's/%//')))

    echo "[Check-Backups] Espacio disponible en $BACKUP_DIR: ${AVAILABLE_PCT}%"

    if [[ $AVAILABLE_PCT -lt $SPACE_CRIT_PCT ]]; then
      echo "[Check-Backups] ❌ CRÍTICO: Espacio disponible < ${SPACE_CRIT_PCT}%"
      EXIT_CODE=2
    elif [[ $AVAILABLE_PCT -lt $SPACE_WARN_PCT ]]; then
      echo "[Check-Backups] ⚠️  WARNING: Espacio disponible < ${SPACE_WARN_PCT}%"
      [[ $EXIT_CODE -lt 1 ]] && EXIT_CODE=1
    else
      echo "[Check-Backups] ✅ Espacio OK"
    fi

    TOTAL_SIZE=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1)
    echo "[Check-Backups] Tamaño total de backups: $TOTAL_SIZE"
  fi
fi
echo ""

# ─── Resumen ──────────────────────────────────────────────────────────────────
echo "──────────────────────────────────────────────"
echo " RESUMEN"
echo "──────────────────────────────────────────────"

case $EXIT_CODE in
  0) echo "[Check-Backups] ✅ Todos los checks OK" ;;
  1) echo "[Check-Backups] ⚠️  Warning: algún backup está atrasado o espacio bajo" ;;
  2) echo "[Check-Backups] ❌ CRÍTICO: backups faltantes, corruptos o sin espacio" ;;
esac

exit $EXIT_CODE
