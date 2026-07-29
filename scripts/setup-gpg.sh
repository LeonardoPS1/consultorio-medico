#!/bin/bash
# ============================================================
# setup-gpg.sh — Genera par de claves GPG para backups
#
# USO:
#   1. ssh ubuntu@51.222.207.250
#   2. cd /opt/consultorio-medico
#   3. bash scripts/setup-gpg.sh
#   4. Guardar PRIVATE KEY en gestor de contraseñas (IMPORTANTE)
#   5. git add scripts/gpg-key.asc && git commit -m "update gpg key" && git push
#
# La clave privada se exporta a ~/gpg-private-key-admin.asc
# GUARDARLA FUERA DEL VPS (Bitwarden, 1Password, etc.)
# ============================================================
set -euo pipefail

GPG_EMAIL="admin@consultorio.com"
GPG_NAME="AicoreMed Backup"
GPG_PUBLIC_FILE="scripts/gpg-key.asc"
GPG_PRIVATE_FILE="${HOME}/gpg-private-key-admin.asc"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "╔══════════════════════════════════════════════════════════╗"
echo "║  🔐 Setup GPG — Backup Encriptado (Consultorio Médico)  ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# ─── Verificar si ya existe la clave ──────────────────────────
EXISTING=$(gpg --list-keys "$GPG_EMAIL" 2>/dev/null || echo "")
if [[ -n "$EXISTING" ]]; then
  echo "✅ Ya existe clave GPG para $GPG_EMAIL"
  echo ""
  echo "Para re-exportar la clave pública:"
  echo "  gpg --armor --export $GPG_EMAIL > $REPO_DIR/$GPG_PUBLIC_FILE"
  echo ""
  echo "Para exportar la clave privada:"
  echo "  gpg --armor --export-secret-keys $GPG_EMAIL > $GPG_PRIVATE_FILE"
  echo ""
  echo "La clave privada se guardó en $GPG_PRIVATE_FILE"
  gpg --armor --export-secret-keys "$GPG_EMAIL" > "$GPG_PRIVATE_FILE"
  chmod 600 "$GPG_PRIVATE_FILE"
  echo "⚠️  GUARDAR $GPG_PRIVATE_FILE EN UN GESTOR DE CONTRASEÑAS Y LUEGO BORRARLO DEL VPS"
  exit 0
fi

# ─── Generar nueva clave ──────────────────────────────────────
echo "🔄 Generando nueva clave GPG para $GPG_EMAIL..."
echo "   (Esto puede tomar unos segundos — mover el mouse o escribir ayuda)"

cat > /tmp/gpg-batch.txt << EOF
Key-Type: RSA
Key-Length: 4096
Key-Usage: encrypt,sign
Subkey-Type: RSA
Subkey-Length: 4096
Subkey-Usage: encrypt
Name-Real: $GPG_NAME
Name-Email: $GPG_EMAIL
Expire-Date: 0
%no-protection
%commit
EOF

gpg --batch --generate-key /tmp/gpg-batch.txt
rm /tmp/gpg-batch.txt

echo ""
echo "✅ Clave generada exitosamente"

# ─── Exportar clave pública al repo ───────────────────────────
echo "📤 Exportando clave pública a $GPG_PUBLIC_FILE..."
gpg --armor --export "$GPG_EMAIL" > "$REPO_DIR/$GPG_PUBLIC_FILE"
echo "✅ Clave pública exportada"

# ─── Exportar clave privada ───────────────────────────────────
echo "📤 Exportando clave privada a $GPG_PRIVATE_FILE..."
gpg --armor --export-secret-keys "$GPG_EMAIL" > "$GPG_PRIVATE_FILE"
chmod 600 "$GPG_PRIVATE_FILE"
echo "✅ Clave privada exportada"

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║  ⚠️  ACCIÓN REQUERIDA                                   ║"
echo "║                                                         ║"
echo "║  GUARDAR LA CLAVE PRIVADA EN UN GESTOR DE CONTRASEÑAS:  ║"
echo "║    $GPG_PRIVATE_FILE                                     ║"
echo "║                                                         ║"
echo "║  LUEGO BORRARLA DEL VPS:                                ║"
echo "║    rm $GPG_PRIVATE_FILE                                 ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "📋 Próximos pasos:"
echo "   1. Guardar clave privada en Bitwarden/1Password"
echo "   2. rm $GPG_PRIVATE_FILE"
echo "   3. cd $REPO_DIR && git add $GPG_PUBLIC_FILE && git commit -m 'update gpg key' && git push"
echo "   4. Recrear backups: bash scripts/backup-encriptado.sh"
