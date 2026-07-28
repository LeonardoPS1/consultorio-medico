#!/bin/bash
# ============================================================
# backup-infra.sh — Backup de infraestructura del VPS
#
# Respalda configuración crítica del servidor:
#   - Docker Compose files
#   - Docker secrets (lista, no valores)
#   - Traefik config (middleware, reglas, dinámico)
#   - Variables de entorno (.env files)
#   - Reglas de firewall (UFW)
#   - Lista de contenedores y servicios
#   - Lista de apps de Dokploy
#   - Config de red y DNS
#   - GPG public key (la privada NO, debe estar en otro lado)
#
# Uso: ./backup-infra.sh [output-dir]
# Requiere: docker, bash, gpg
# ============================================================
set -euo pipefail

BACKUP_DIR="${1:-/var/backups/consultorio}"
GPG_RECIPIENT="${GPG_RECIPIENT:-admin@consultorio.com}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
WORK_DIR=$(mktemp -d)
TAR_FILE="${BACKUP_DIR}/infra_${TIMESTAMP}.tar.gz"
ENCRYPTED_FILE="${TAR_FILE}.gpg"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

mkdir -p "$BACKUP_DIR"

echo "[Backup-Infra] === Backup de infraestructura: $(date +%Y-%m-%d) ==="
echo "[Backup-Infra] Directorio temporal: $WORK_DIR"

# ─── 1. Docker Compose files ───────────────────────────────────────────────────
echo "[Backup-Infra] 1/8 Docker Compose files..."
mkdir -p "$WORK_DIR/compose"
for F in docker-compose.yml docker-compose.prod.yml; do
  if [[ -f "$SCRIPT_DIR/../$F" ]]; then
    cp "$SCRIPT_DIR/../$F" "$WORK_DIR/compose/$F"
    echo "[Backup-Infra]   ✅ $F"
  fi
done

# ─── 2. Docker Swarm secrets (solo lista, no valores) ──────────────────────────
echo "[Backup-Infra] 2/8 Docker secrets (lista)..."
if command -v docker &>/dev/null && docker secret ls 2>/dev/null | grep -q .; then
  docker secret ls --format '{{.Name}} (creado: {{.CreatedAt}})' > "$WORK_DIR/secrets-list.txt"
  echo "[Backup-Infra]   Secrets encontrados: $(wc -l < "$WORK_DIR/secrets-list.txt")"
else
  echo "[Backup-Infra]   ⚠️  No hay secrets en Swarm o Docker no disponible"
fi

# ─── 3. Docker service list ────────────────────────────────────────────────────
echo "[Backup-Infra] 3/8 Docker services..."
if docker stack services consultorio 2>/dev/null | grep -q .; then
  docker stack services consultorio --format 'table {{.Name}}\t{{.Image}}\t{{.Ports}}' > "$WORK_DIR/services-list.txt"
  docker stack ps consultorio --no-trunc --format 'table {{.Name}}\t{{.Node}}\t{{.DesiredState}}\t{{.Error}}' > "$WORK_DIR/services-ps.txt"
  echo "[Backup-Infra]   ✅ Servicios exportados"
else
  echo "[Backup-Infra]   ⚠️  Stack consultorio no encontrado"
fi

# ─── 4. Traefik config (si existe) ──────────────────────────────────────────
echo "[Backup-Infra] 4/8 Traefik config..."
mkdir -p "$WORK_DIR/traefik"
for DIR in /etc/traefik /opt/traefik /var/lib/docker/volumes/*traefik*/_data; do
  if [[ -d "$DIR" ]]; then
    cp -r "$DIR"/* "$WORK_DIR/traefik/" 2>/dev/null || true
    echo "[Backup-Infra]   ✅ Traefik desde $DIR"
  fi
done
# También buscar en volúmenes Docker
docker volume ls --filter name=traefik --format '{{.Name}}' 2>/dev/null | while read -r VOL; do
  TMP_VOL=$(mktemp -d)
  docker run --rm -v "${VOL}:/source:ro" -v "${TMP_VOL}:/dest" alpine cp -r /source/. /dest/ 2>/dev/null || true
  cp -r "$TMP_VOL"/* "$WORK_DIR/traefik/" 2>/dev/null || true
  rm -rf "$TMP_VOL"
  echo "[Backup-Infra]   ✅ Traefik desde volumen $VOL"
done

# ─── 5. Environment variables (.env files) ─────────────────────────────────────
echo "[Backup-Infra] 5/8 Environment variables..."
mkdir -p "$WORK_DIR/env"
for ENV_FILE in "$SCRIPT_DIR/../dashboard/.env" "$SCRIPT_DIR/../ops-console/.env"; do
  if [[ -f "$ENV_FILE" ]]; then
    # Guardar solo nombres de variables, no valores sensibles
    grep -v '^\s*#' "$ENV_FILE" 2>/dev/null | grep '=' | sed 's/=.*/=***REDACTED***/' > "$WORK_DIR/env/$(basename "$(dirname "$ENV_FILE")").env.names" || true
    echo "[Backup-Infra]   ✅ Nombres de vars desde $(basename "$(dirname "$ENV_FILE")")"
  fi
done

# ─── 6. UFW firewall rules ─────────────────────────────────────────────────────
echo "[Backup-Infra] 6/8 Firewall rules..."
if command -v ufw &>/dev/null; then
  ufw status verbose > "$WORK_DIR/ufw-status.txt" 2>/dev/null
  ufw status numbered > "$WORK_DIR/ufw-rules.txt" 2>/dev/null
  echo "[Backup-Infra]   ✅ UFW rules exportadas"
else
  echo "[Backup-Infra]   ⚠️  UFW no disponible"
fi

# ─── 7. Config de red y DNS ───────────────────────────────────────────────────
echo "[Backup-Infra] 7/8 Network config..."
{
  echo "=== HOSTNAME ==="
  hostname
  echo ""
  echo "=== INTERFACES ==="
  ip addr show 2>/dev/null || ifconfig
  echo ""
  echo "=== RESOLV.CONF ==="
  cat /etc/resolv.conf 2>/dev/null || echo "No disponible"
  echo ""
  echo "=== HOSTS ==="
  cat /etc/hosts 2>/dev/null || echo "No disponible"
  echo ""
  echo "=== SWARM NODES ==="
  docker node ls 2>/dev/null || echo "No Swarm"
  echo ""
  echo "=== NETWORKS ==="
  docker network ls 2>/dev/null || echo "No Docker"
} > "$WORK_DIR/network-config.txt"
echo "[Backup-Infra]   ✅ Network config"

# ─── 8. GPG public key y scripts de backup ──────────────────────────────────
echo "[Backup-Infra] 8/8 GPG key + scripts..."
mkdir -p "$WORK_DIR/scripts"
if [[ -f "$SCRIPT_DIR/../scripts/gpg-key.asc" ]]; then
  cp "$SCRIPT_DIR/../scripts/gpg-key.asc" "$WORK_DIR/scripts/"
fi
if [[ -d "$SCRIPT_DIR" ]]; then
  cp "$SCRIPT_DIR/backup-encriptado.sh" "$WORK_DIR/scripts/" 2>/dev/null || true
  cp "$SCRIPT_DIR/backup-volumenes.sh" "$WORK_DIR/scripts/" 2>/dev/null || true
  cp "$SCRIPT_DIR/backup-n8n-workflows.sh" "$WORK_DIR/scripts/" 2>/dev/null || true
  cp "$SCRIPT_DIR/recover.sh" "$WORK_DIR/scripts/" 2>/dev/null || true
  cp "$SCRIPT_DIR/check-backups.sh" "$WORK_DIR/scripts/" 2>/dev/null || true
  cp "$SCRIPT_DIR/restore-pg.sh" "$WORK_DIR/scripts/" 2>/dev/null || true
  cp "$SCRIPT_DIR/restore-volumes.sh" "$WORK_DIR/scripts/" 2>/dev/null || true
  cp "$SCRIPT_DIR/restore-full.sh" "$WORK_DIR/scripts/" 2>/dev/null || true
fi

# ─── Generar metadatos ─────────────────────────────────────────────────────────
{
  echo "timestamp: $(date -Iseconds)"
  echo "hostname: $(hostname)"
  echo "gpg_recipient: $GPG_RECIPIENT"
  echo "scripts_version: infra-backup-1.0"
  echo "contents:"
  echo "  - compose/ (Docker Compose files)"
  echo "  - secrets-list.txt (Docker secrets names)"
  echo "  - services-list.txt (Docker services)"
  echo "  - traefik/ (Traefik config)"
  echo "  - env/ (env variable names)"
  echo "  - ufw-*.txt (firewall rules)"
  echo "  - network-config.txt (red/DNS)"
  echo "  - scripts/ (backup/recovery scripts + GPG key)"
} > "$WORK_DIR/metadata.yaml"

# ─── Comprimir ─────────────────────────────────────────────────────────────────
echo "[Backup-Infra] Comprimiendo..."
tar czf "$TAR_FILE" -C "$WORK_DIR" .

# ─── Encriptar ─────────────────────────────────────────────────────────────────
echo "[Backup-Infra] Encriptando con GPG..."
gpg --batch --yes \
  --trust-model always \
  --recipient "$GPG_RECIPIENT" \
  --output "$ENCRYPTED_FILE" \
  --encrypt "$TAR_FILE"

rm -f "$TAR_FILE"
rm -rf "$WORK_DIR"

SIZE=$(du -h "$ENCRYPTED_FILE" | cut -f1)
echo "[Backup-Infra] ✅ Backup de infraestructura: $ENCRYPTED_FILE ($SIZE)"

# ─── Verificar integridad ──────────────────────────────────────────────────────
gpg --batch --quiet --decrypt "$ENCRYPTED_FILE" > /dev/null 2>&1 \
  && echo "[Backup-Infra] ✅ Integridad verificada" \
  || echo "[Backup-Infra] ❌ Error de integridad"

# ─── Retention ─────────────────────────────────────────────────────────────────
find "$BACKUP_DIR" -name 'infra_*.tar.gz.gpg' -type f -mtime +90 -delete
echo "[Backup-Infra] Limpieza completada (retención: 90 días)"

# ─── Off-site (rclone) ─────────────────────────────────────────────────────────
if [[ -n "${RCLONE_REMOTE:-}" ]]; then
  echo "[Backup-Infra] Subiendo a off-site..."
  RCLONE_OPTS=""
  [[ -n "${RCLONE_CONFIG:-}" ]] && RCLONE_OPTS="--config $RCLONE_CONFIG"
  rclone copy $RCLONE_OPTS "$ENCRYPTED_FILE" "${RCLONE_REMOTE}/infra/" \
    && echo "[Backup-Infra] ✅ Subido a off-site" \
    || echo "[Backup-Infra] ⚠️ Error subiendo a off-site"
  rclone delete $RCLONE_OPTS "${RCLONE_REMOTE}/infra/" --min-age "90d" 2>/dev/null || true
fi

echo "[Backup-Infra] === Backup de infraestructura completado ==="
