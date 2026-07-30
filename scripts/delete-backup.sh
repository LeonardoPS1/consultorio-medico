#!/bin/bash
# ============================================================
# delete-backup.sh — Elimina archivos de backup
#
# Uso:
#   ./delete-backup.sh <archivo> [opciones]
#
# Opciones:
#   --dry-run    Solo muestra lo que se eliminaría
#   --force      No pedir confirmación
#   --help       Muestra esta ayuda
#
# Ejemplos:
#   ./delete-backup.sh /var/backups/consultorio/backup.sql.gz.gpg
#   ./delete-backup.sh /var/backups/consultorio/backup.sql.gz.gpg --dry-run
#   ./delete-backup.sh /var/backups/consultorio/*.gpg --force
# ============================================================
set -euo pipefail

DRY_RUN=false
FORCE=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=true; shift ;;
    --force) FORCE=true; shift ;;
    --help)
      sed -n '/^# =/,/^set -/p' "$0" | grep '^#' | sed 's/^# \?//'
      exit 0
      ;;
    *) break ;;
  esac
done

BACKUP_FILE="${1:?Uso: delete-backup.sh <archivo> [--dry-run] [--force]}"

if [[ ! -f "$BACKUP_FILE" ]]; then
  echo "[Delete-Backup] ❌ Archivo no encontrado: $BACKUP_FILE"
  exit 1
fi

# Validar que sea un archivo de backup conocido
BASENAME=$(basename "$BACKUP_FILE")
EXT="${BASENAME##*.}"
if [[ "$EXT" != "gpg" ]]; then
  echo "[Delete-Backup] ⚠️  El archivo no parece ser un backup GPG: $BASENAME"
  if ! $FORCE; then
    echo "   Usá --force para eliminar de todas formas."
    exit 1
  fi
fi

SIZE=$(du -h "$BACKUP_FILE" 2>/dev/null | cut -f1)
MTIME=$(stat -c '%y' "$BACKUP_FILE" 2>/dev/null || stat -f '%Sm' "$BACKUP_FILE" 2>/dev/null)

echo "[Delete-Backup] === Eliminación de backup ==="
echo "[Delete-Backup] Archivo: $BASENAME"
echo "[Delete-Backup] Tamaño:  $SIZE"
echo "[Delete-Backup] Fecha:   $MTIME"
echo ""

if $DRY_RUN; then
  echo "[Delete-Backup] 🧪 Dry-run: se eliminaría $BASENAME ($SIZE)"
  echo "[Delete-Backup]    Ruta: $BACKUP_FILE"

  # También verificar off-site
  if [[ -n "${RCLONE_REMOTE:-}" ]]; then
    echo "[Delete-Backup]    Off-site: ${RCLONE_REMOTE}/ (buscar $BASENAME)"
    RCLONE_OPTS=""
    [[ -n "${RCLONE_CONFIG:-}" ]] && RCLONE_OPTS="--config $RCLONE_CONFIG"
    rclone ls $RCLONE_OPTS "${RCLONE_REMOTE}/" 2>/dev/null | grep "$BASENAME" || \
      echo "[Delete-Backup]    (no encontrado en off-site)"
  fi

  exit 0
fi

if ! $FORCE; then
  echo "⚠️  ¿Eliminar permanentemente este backup?"
  echo "   Escribí 'ELIMINAR' para confirmar (Ctrl+C cancela):"
  read -r CONFIRM
  if [[ "$CONFIRM" != "ELIMINAR" ]]; then
    echo "[Delete-Backup] Cancelado."
    exit 0
  fi
fi

rm -f "$BACKUP_FILE"
echo "[Delete-Backup] ✅ Backup eliminado localmente: $BASENAME"

# Eliminar también de off-site si está configurado
if [[ -n "${RCLONE_REMOTE:-}" ]]; then
  echo "[Delete-Backup] Eliminando de off-site..."
  RCLONE_OPTS=""
  [[ -n "${RCLONE_CONFIG:-}" ]] && RCLONE_OPTS="--config $RCLONE_CONFIG"

  # Buscar en todas las carpetas (pg/, volumes/, infra/)
  for REMOTE_PATH in "" "pg/" "volumes/" "infra/"; do
    rclone delete $RCLONE_OPTS "${RCLONE_REMOTE}/${REMOTE_PATH}$BASENAME" 2>/dev/null || true
  done
  echo "[Delete-Backup] ✅ Limpieza off-site completada"
fi

echo "[Delete-Backup] === Eliminación completada ==="
