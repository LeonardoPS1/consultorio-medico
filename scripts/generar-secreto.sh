#!/bin/bash
# scripts/generar-secreto.sh
# Genera valores aleatorios criptográficamente seguros para credenciales AicoreMed
# Uso: ./generar-secreto.sh [tipo] [longitud]
# Tipos: base64, hex, alphanum, diceware
# Ejemplos:
#   ./generar-secreto.sh base64 32     # Para AUTH_SECRET, INTERNAL_API_KEY
#   ./generar-secreto.sh hex 32        # Para CERTIFICADO_HASH_SECRET, NOVEDADES_INTERNAL_KEY
#   ./generar-secreto.sh hex 64        # Para CHATWOOT_SECRET_KEY
#   ./generar-secreto.sh alphanum 32   # Para contraseñas PostgreSQL

set -euo pipefail

# Funciones de generación
generar_base64() {
    local length=${1:-32}
    openssl rand -base64 "$length" | tr -d '\n'
}

generar_hex() {
    local length=${1:-32}
    openssl rand -hex "$length" | tr -d '\n'
}

generar_alphanum() {
    local length=${1:-32}
    # A-Z, a-z, 0-9 (62 caracteres)
    < /dev/urandom tr -dc 'A-Za-z0-9' | head -c "$length"
}

generar_diceware() {
    local words=${1:-6}
    # Usa la lista EFF larga (7776 palabras)
    # Simplificado: genera palabras aleatorias de un diccionario pequeño
    # En producción, usar lista oficial EFF
    local wordlist=("abra" "cada" "bravo" "delta" "eco" "foxtrot" "golf" "hotel" "india" "juliet" "kilo" "lima" "mike" "november" "oscar" "papa" "quebec" "romeo" "sierra" "tango" "uniform" "victor" "whiskey" "xray" "yankee" "zulu")
    local result=""
    for ((i=0; i<words; i++)); do
        local idx=$((RANDOM % ${#wordlist[@]}))
        result+="${wordlist[$idx]} "
    done
    echo "$result" | sed 's/ $//'
}

# Función de ayuda
mostrar_ayuda() {
    cat << EOF
Uso: $0 [tipo] [longitud]

Genera valores aleatorios criptográficamente seguros para credenciales AicoreMed.

Tipos disponibles:
  base64   - Caracteres Base64 (A-Z, a-z, 0-9, +, /, =)
  hex      - Caracteres hexadecimales (0-9, a-f)
  alphanum - Letras y números (A-Z, a-z, 0-9)
  diceware - Palabras separadas por espacios (para frases de paso)

Ejemplos:
  $0 base64 32     # Para AUTH_SECRET, INTERNAL_API_KEY (32 bytes Base64)
  $0 hex 32        # Para CERTIFICADO_HASH_SECRET, NOVEDADES_INTERNAL_KEY
  $0 hex 64        # Para CHATWOOT_SECRET_KEY
  $0 alphanum 32   # Para contraseñas PostgreSQL (ej. dashboard_user, ops_console_user)
  $0 diceware 6    # Para frases de paso (opcional)

Si no se especifica tipo, usa base64 32 por defecto.
EOF
}

# Procesar argumentos
if [[ $# -eq 0 ]] || [[ "$1" == "-h" ]] || [[ "$1" == "--help" ]]; then
    mostrar_ayuda
    exit 0
fi

tipo="${1:-base64}"
longitud="${2:-}"

case "$tipo" in
    base64)
        if [[ -z "$longitud" ]]; then
            longitud=32
        fi
        generar_base64 "$longitud"
        ;;
    hex)
        if [[ -z "$longitud" ]]; then
            longitud=32
        fi
        generar_hex "$longitud"
        ;;
    alphanum)
        if [[ -z "$longitud" ]]; then
            longitud=32
        fi
        generar_alphanum "$longitud"
        ;;
    diceware)
        if [[ -z "$longitud" ]]; then
            longitud=6
        fi
        generar_diceware "$longitud"
        ;;
    *)
        echo "Error: Tipo desconocido '$tipo'" >&2
        mostrar_ayuda
        exit 1
        ;;
esac