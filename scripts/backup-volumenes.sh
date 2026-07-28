#!/bin/bash
# ============================================================
# Backup encriptado de volúmenes Docker no-PostgreSQL
#
# Respalda: n8n_data, metabase_data, recordings
# No respalda: ollama_data, redis_data, whisper_models
#   (son reproducibles: ollama pull, redis efímero, whisper download)
#
# Dependencias: docker, gpg, tar, rclone (opcional para off-site)
# Uso: ./backup-volumenes.sh [output-dir]
# ============================================================
set -euo pipefail

# Config
BACKUP_DIR="${1:-/var/backups/consultorio}"
GPG_RECIPIENT="${GPG_RECIPIENT:-admin@consultorio.com}"
RETENTION_DAYS=30
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Volúmenes a respaldar (sufijo -> etiqueta legible)
# En Docker Swarm/Dokploy, los volúmenes tienen prefijo del stack.
# Se buscan por sufijo para encontrar el activo.
declare -A VOLUME_SUFFIXES
VOLUME_SUFFIXES[n8n_data]="n8n_data"
VOLUME_SUFFIXES[metabase_data]="metabase_data"
VOLUME_SUFFIXES[recordings]="recordings"

mkdir -p "$BACKUP_DIR"

echo "[Backup-Vol] === Backup de volúmenes Docker: $(date +%Y-%m-%d) ==="

for SUFFIX in "${!VOLUME_SUFFIXES[@]}"; do
  LABEL="${VOLUME_SUFFIXES[$SUFFIX]}"
  BACKUP_FILE="${BACKUP_DIR}/${LABEL}_${TIMESTAMP}.tar.gz"
  ENCRYPTED_FILE="${BACKUP_FILE}.gpg"

  # Buscar volumen por sufijo (Docker Swarm/Dokploy añade prefijo del stack)
  VOLUME=$(docker volume ls --format '{{.Name}}' 2>/dev/null | grep -E "_${SUFFIX}$" | head -1 || echo "")

  if [[ -z "$VOLUME" ]]; then
    echo "[Backup-Vol] ⚠️ No se encontró volumen con sufijo $SUFFIX, saltando..."
    continue
  fi

  echo "[Backup-Vol] Respaldando volumen: $VOLUME ..."

  # Dump volumen a tar.gz usando contenedor temporal
  if docker run --rm \
    -v "${VOLUME}:/source:ro" \
    -v "${BACKUP_DIR}:/dest" \
    alpine:3.20 \
    tar czf "/dest/${LABEL}_${TIMESTAMP}.tar.gz" -C /source . 2>&1; then

    SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "[Backup-Vol]   Dump completado: $SIZE"

    # Encriptar
    gpg --batch --yes \
      --trust-model always \
      --recipient "$GPG_RECIPIENT" \
      --output "$ENCRYPTED_FILE" \
      --encrypt "$BACKUP_FILE"

    rm -f "$BACKUP_FILE"
    echo "[Backup-Vol]   Encriptado: $(du -h "$ENCRYPTED_FILE" | cut -f1)"

    # Verificar integridad
    gpg --batch --quiet --decrypt "$ENCRYPTED_FILE" > /dev/null 2>&1 \
      && echo "[Backup-Vol]   ✅ Integridad verificada" \
      || echo "[Backup-Vol]   ❌ Error de integridad en $ENCRYPTED_FILE"
  else
    echo "[Backup-Vol]   ❌ Error al respaldar volumen $VOLUME"
  fi
done

# Limpiar backups viejos
find "$BACKUP_DIR" -name "*.tar.gz.gpg" -type f -mtime +$RETENTION_DAYS -delete
echo "[Backup-Vol] Limpieza completada (retención: $RETENTION_DAYS días)"

# ─── Off-site backup (rclone) ───────────────────────────────────────────────
# Configurar vía variables de entorno:
#   RCLONE_REMOTE    — nombre del remote rclone (ej: "b2:consultorio-backups")
#   RCLONE_CONFIG    — ruta al archivo de config de rclone
#
# Ejemplo con Backblaze B2:
#   RCLONE_REMOTE="b2:consultorio-backups" RCLONE_CONFIG="/root/.config/rclone/rclone.conf"
#
# Ejemplo con S3 compatible:
#   RCLONE_REMOTE="s3:consultorio-backups"

if [[ -n "${RCLONE_REMOTE:-}" ]]; then
  echo "[Backup-Vol] Subiendo backups a off-site (rclone)..."
  RCLONE_OPTS=""
  if [[ -n "${RCLONE_CONFIG:-}" ]]; then
    RCLONE_OPTS="--config $RCLONE_CONFIG"
  fi

  for VOLUME in "${!VOLUME_SUFFIXES[@]}"; do
    LABEL="${VOLUME_SUFFIXES[$VOLUME]}"
    ENCRYPTED_FILE="${BACKUP_DIR}/${LABEL}_${TIMESTAMP}.tar.gz.gpg"
    if [[ -f "$ENCRYPTED_FILE" ]]; then
      rclone copy $RCLONE_OPTS "$ENCRYPTED_FILE" "${RCLONE_REMOTE}/volumes/" \
        && echo "[Backup-Vol] ✅ $LABEL subido a off-site" \
        || echo "[Backup-Vol] ⚠️  Error subiendo $LABEL a off-site"
    fi
  done

  # Limpiar backups off-site viejos (> RETENTION_DAYS)
  echo "[Backup-Vol] Limpiando backups off-site viejos..."
  rclone delete $RCLONE_OPTS "${RCLONE_REMOTE}/volumes/" --min-age "${RETENTION_DAYS}d" 2>/dev/null || true
  echo "[Backup-Vol] ✅ Off-site sync completado"
else
  echo "[Backup-Vol] ℹ️  Off-site no configurado (RCLONE_REMOTE no definido)"
fi

echo "[Backup-Vol] === Backup de volúmenes completado: $TIMESTAMP ==="
