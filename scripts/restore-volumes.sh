#!/bin/bash
# ============================================================
# restore-volumes.sh — Restauración de volúmenes Docker
#
# Compatible con backups generados por backup-volumenes.sh
# (tar.gz + GPG encrypt)
#
# Uso:
#   ./restore-volumes.sh <archivo.gpg> <nombre-volumen>
#
# Ejemplos:
#   ./restore-volumes.sh /backup/n8n_data_20260722.tar.gz.gpg n8n_data
#   ./restore-volumes.sh /backup/metabase_data_20260722.tar.gz.gpg metabase_data
# ============================================================
set -euo pipefail

BACKUP_FILE="${1:?Uso: restore-volumes.sh <archivo.gpg> <nombre-volumen>}"
VOLUME_NAME="${2:?Uso: restore-volumes.sh <archivo.gpg> <nombre-volumen>}"

if [[ ! -f "$BACKUP_FILE" ]]; then
  echo "[Restore-Vol] ❌ Archivo no encontrado: $BACKUP_FILE"
  exit 1
fi

echo "[Restore-Vol] === Restauración de Volumen Docker ==="
echo "[Restore-Vol] Backup:  $BACKUP_FILE"
echo "[Restore-Vol] Volumen: $VOLUME_NAME"

# ─── FASE 1: Desencriptar ────────────────────────────────────────────────────
TMPDIR=$(mktemp -d /tmp/restore-vol-XXXXXX)
echo "[Restore-Vol] Desencriptando..."

gpg --batch --decrypt "$BACKUP_FILE" > "$TMPDIR/restore.tar.gz" 2>/dev/null
if [[ $? -ne 0 ]]; then
  echo "[Restore-Vol] ❌ Error al desencriptar. ¿GPG key privada importada?"
  rm -rf "$TMPDIR"
  exit 2
fi

SIZE=$(du -h "$TMPDIR/restore.tar.gz" | cut -f1)
echo "[Restore-Vol] ✅ Backup desencriptado: $SIZE"

# ─── FASE 2: Extraer ─────────────────────────────────────────────────────────
echo "[Restore-Vol] Extrayendo contenido..."
mkdir -p "$TMPDIR/data"
tar xzf "$TMPDIR/restore.tar.gz" -C "$TMPDIR/data"

EXTRACTED=$(du -sh "$TMPDIR/data" | cut -f1)
echo "[Restore-Vol] ✅ Extraído: $EXTRACTED"

# ─── FASE 3: Verificar volumen destino ────────────────────────────────────────
echo "[Restore-Vol] Verificando volumen Docker '$VOLUME_NAME'..."

if docker volume inspect "$VOLUME_NAME" >/dev/null 2>&1; then
  echo "[Restore-Vol] ⚠️  El volumen '$VOLUME_NAME' ya existe."
  echo "[Restore-Vol]    Se restaurará sobre el volumen existente."
  echo "[Restore-Vol]    Ctrl+C para cancelar (esperando 5s)..."
  sleep 5
else
  echo "[Restore-Vol] Creando volumen '$VOLUME_NAME'..."
  docker volume create "$VOLUME_NAME"
fi

# ─── FASE 4: Restaurar datos al volumen ───────────────────────────────────────
echo "[Restore-Vol] Copiando datos al volumen..."
docker run --rm \
  -v "${VOLUME_NAME}:/target" \
  -v "${TMPDIR}/data:/source:ro" \
  alpine:3.20 \
  cp -a /source/. /target/

echo "[Restore-Vol] ✅ Restauración completada"

# ─── FASE 5: Verificación ─────────────────────────────────────────────────────
echo "[Restore-Vol] Verificando contenido del volumen..."
docker run --rm \
  -v "${VOLUME_NAME}:/data:ro" \
  alpine:3.20 \
  sh -c "echo 'Archivos:'; find /data -maxdepth 2 -type f | head -20; echo '...'; echo 'Total:'; find /data -type f | wc -l"

# ─── FASE 6: Limpieza ────────────────────────────────────────────────────────
rm -rf "$TMPDIR"
echo "[Restore-Vol] Archivos temporales eliminados"

echo "[Restore-Vol] === Restauración completada: $(date +%Y-%m-%d_%H%M%S) ==="
