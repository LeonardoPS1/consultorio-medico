#!/bin/bash
# ============================================================
# backup-n8n-workflows.sh — Backup de workflows n8n a JSON
#
# Exporta todos los workflows activos desde n8n API a archivos
# JSON individuales en un directorio con timestamp.
#
# Dependencias: curl, jq
#
# Uso:
#   ./backup-n8n-workflows.sh [output-dir]
#
# Configuración vía variables de entorno:
#   N8N_URL       (def: https://n8n.aicorebots.com)
#   N8N_API_KEY   (requerida)
#
# Ejemplo:
#   N8N_API_KEY=tu-api-key ./backup-n8n-workflows.sh ./n8n-backup-$(date +%Y%m%d)
# ============================================================
set -euo pipefail

N8N_URL="${N8N_URL:-https://n8n.aicorebots.com}"
N8N_API_KEY="${N8N_API_KEY:?Error: definir N8N_API_KEY (v:settings:API)}"
OUTPUT_DIR="${1:-n8n-workflows-backup-$(date +%Y%m%d_%H%M%S)}"

# ─── Verificar dependencias ───────────────────────────────────────────────────
for CMD in curl jq; do
  if ! command -v "$CMD" &>/dev/null; then
    echo "[Backup-n8n] ❌ $CMD no está instalado"
    exit 1
  fi
done

echo "[Backup-n8n] === Backup de workflows n8n ==="
echo "[Backup-n8n] URL: $N8N_URL"
echo "[Backup-n8n] Destino: $OUTPUT_DIR"

mkdir -p "$OUTPUT_DIR"

# ─── Obtener lista de workflows ───────────────────────────────────────────────
echo "[Backup-n8n] Obteniendo lista de workflows..."

RESPONSE=$(curl -s -H "X-N8N-API-KEY: $N8N_API_KEY" "$N8N_URL/api/v1/workflows" 2>/dev/null)
if echo "$RESPONSE" | jq -e '.data' >/dev/null 2>&1; then
  WORKFLOWS=$(echo "$RESPONSE" | jq -c '.data[]')
elif echo "$RESPONSE" | jq -e '.length' >/dev/null 2>&1 || echo "$RESPONSE" | jq -e 'type == "array"' >/dev/null 2>&1; then
  WORKFLOWS=$(echo "$RESPONSE" | jq -c '.[]')
else
  echo "[Backup-n8n] ❌ Error al obtener workflows. Respuesta:"
  echo "$RESPONSE" | head -5
  exit 1
fi

COUNT=0
while IFS= read -r WF; do
  if [[ -z "$WF" ]]; then continue; fi

  WF_ID=$(echo "$WF" | jq -r '.id // empty')
  WF_NAME=$(echo "$WF" | jq -r '.name // "unknown"' | sed 's/[\/:*?"<>|]/_/g')

  if [[ -z "$WF_ID" ]]; then
    echo "[Backup-n8n] ⚠️  Workflow sin ID, saltando..."
    continue
  fi

  # Obtener workflow completo (con nodos y conexiones)
  DETAIL=$(curl -s -H "X-N8N-API-KEY: $N8N_API_KEY" "$N8N_URL/api/v1/workflows/$WF_ID" 2>/dev/null)

  if echo "$DETAIL" | jq -e '.id' >/dev/null 2>&1; then
    OUTPUT_FILE="$OUTPUT_DIR/${WF_ID}_${WF_NAME}.json"
    echo "$DETAIL" | jq '.' > "$OUTPUT_FILE"
    echo "[Backup-n8n] ✅ WF#$WF_ID: $WF_NAME → $(du -h "$OUTPUT_FILE" | cut -f1)"
    COUNT=$((COUNT + 1))
  else
    echo "[Backup-n8n] ⚠️  WF#$WF_ID: $WF_NAME — error al obtener detalle"
  fi
done <<< "$WORKFLOWS"

# ─── Generar metada ───────────────────────────────────────────────────────────
cat > "$OUTPUT_DIR/_metadata.json" <<EOF
{
  "timestamp": "$(date -Iseconds)",
  "source_url": "$N8N_URL",
  "total_workflows": $COUNT,
  "files": $(ls "$OUTPUT_DIR"/*.json 2>/dev/null | grep -v _metadata | jq -R -s 'split("\n") | map(select(length > 0))')
}
EOF

echo "[Backup-n8n] Metadatos guardados en $OUTPUT_DIR/_metadata.json"
echo ""
echo "[Backup-n8n] === Backup completado: $COUNT workflows exportados ==="
echo "[Backup-n8n] Directorio: $OUTPUT_DIR"

# Sugerir encriptar
echo ""
echo "[Backup-n8n] 💡 Sugerencia: encriptar este backup con GPG:"
echo "   tar czf ${OUTPUT_DIR}.tar.gz $OUTPUT_DIR"
echo "   gpg --encrypt --recipient admin@consultorio.com ${OUTPUT_DIR}.tar.gz"
echo "   rm -rf $OUTPUT_DIR ${OUTPUT_DIR}.tar.gz"
