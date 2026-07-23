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

# Volúmenes a respaldar (nombre_docker_swarm -> etiqueta legible)
declare -A VOLUMES
VOLUMES[n8n_data]="n8n_data"
VOLUMES[metabase_data]="metabase_data"
VOLUMES[recordings]="recordings"

mkdir -p "$BACKUP_DIR"

echo "[Backup-Vol] === Backup de volúmenes Docker: $(date +%Y-%m-%d) ==="

for VOLUME in "${!VOLUMES[@]}"; do
  LABEL="${VOLUMES[$VOLUME]}"
  BACKUP_FILE="${BACKUP_DIR}/${LABEL}_${TIMESTAMP}.tar.gz"
  ENCRYPTED_FILE="${BACKUP_FILE}.gpg"

  echo "[Backup-Vol] Respaldando volumen: $VOLUME ..."

  # Verificar que el volumen existe
  if ! docker volume inspect "$VOLUME" >/dev/null 2>&1; then
    echo "[Backup-Vol] ⚠️ Volumen $VOLUME no existe, saltando..."
    continue
  fi

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

echo "[Backup-Vol] === Backup de volúmenes completado: $TIMESTAMP ==="
