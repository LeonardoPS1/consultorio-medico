#!/usr/bin/env python3
"""
Script para implementar pgBouncer en la VPS de producción.
Conecta via SSH, crea la configuración y actualiza el compose.
"""
import paramiko
import os
import json

HOST = '51.222.207.250'
USER = 'ubuntu'
PASS = 'Cool220479..@'
COMPOSE_DIR = '/etc/dokploy/compose/aicore-n8nrunnerpostgresollama-a715gi/code'
PGBOUNCER_DIR = f'{COMPOSE_DIR}/pgbouncer'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

def run(cmd):
    stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    return out, err, stdout.channel.recv_exit_status()

print("🔌 Conectando a VPS...")
client.connect(HOST, username=USER, password=PASS)
print("✅ Conectado\n")

# 1. Crear directorio pgbouncer
print("📁 Creando directorio pgbouncer...")
out, err, rc = run(f'mkdir -p {PGBOUNCER_DIR}')
print(f"   RC={rc} | {out[:100] if out else 'OK'}")

# 2. Escribir pgbouncer.ini
print("📝 Escribiendo pgbouncer.ini...")
ini_content = """; pgbouncer.ini — Pool de conexiones PostgreSQL (producción)
; Modo SESSION: compatible con prepared statements y SET

[databases]
consultorio_medico = host=postgres port=5432 dbname=consultorio_medico

[pgbouncer]
listen_addr = 0.0.0.0
listen_port = 6432
auth_type = scram-sha-256
auth_file = /etc/pgbouncer/userlist.txt
pool_mode = session
default_pool_size = 20
max_client_conn = 60
max_db_connections = 20
server_idle_timeout = 300
client_idle_timeout = 600
idle_transaction_timeout = 60
query_timeout = 30
stats_period = 60
application_name_add_host = 0
verbose = 0
"""
# Use tee/heredoc to write the file
cmd = f"cat > {PGBOUNCER_DIR}/pgbouncer.ini << 'EOFINI'\n{ini_content}\nEOFINI"
out, err, rc = run(cmd)
print(f"   RC={rc} | {err[:100] if err else 'OK'}")

# 3. Escribir userlist.txt
print("📝 Escribiendo userlist.txt...")
# Get the SCRAM password hash for the app user from PostgreSQL
out, err, rc = run(f"docker exec aicore-n8nrunnerpostgresollama-a715gi-postgres-1 psql -U reece.schmeler67 -d consultorio_medico -t -c \"SELECT concat('\\\"', usename, '\\\" \\\"', passwd, '\\\"') FROM pg_shadow WHERE usename IN ('dashboard_user', 'reece.schmeler67');\" 2>/dev/null || echo 'NO_PG_ACCESS'")
print(f"   PG shadow query: {out[:200]}")

if 'NO_PG_ACCESS' in out or not out.strip():
    # Fallback: use md5 hash for the app user
    print("   ⚠️ No se pudo obtener hash SCRAM, usando md5...")
    # md5 hash for dashboard_user password: "md5" + md5(password + username)
    import hashlib
    pw = 'gLfzAyEq0KQL4Qplamdlx8x9ouZdHcnP'
    user = 'dashboard_user'
    md5hash = hashlib.md5(f"{pw}{user}".encode()).hexdigest()
    userlist = f'"dashboard_user" "md5{md5hash}"\n"reece.schmeler67" "md5{hashlib.md5(f"JqPDLMUMyFxeMzGcGdBUGw2w1kqAdu/IRQwBsUiHAOU={user}".encode()).hexdigest()}"'
    cmd = f"cat > {PGBOUNCER_DIR}/userlist.txt << 'EOFUSER'\n{userlist}\nEOFUSER"
else:
    userlist_content = out.strip().replace('\t', ' ')
    cmd = f"cat > {PGBOUNCER_DIR}/userlist.txt << 'EOFUSER'\n{userlist_content}\nEOFUSER"

out, err, rc = run(cmd)
print(f"   RC={rc} | {err[:100] if err else 'OK'}")

# 4. Leer el docker-compose.yml actual
print("\n📖 Leyendo docker-compose.yml actual...")
out, err, rc = run(f"cat {COMPOSE_DIR}/docker-compose.yml")
print(f"   {len(out)} chars leídos")
compose_content = out

# 5. Agregar pgbouncer service al compose
# Find the position to insert pgbouncer (after postgres service, before n8n)
if 'pgbouncer:' not in compose_content:
    print("🔧 Agregando pgbouncer service al compose...")
    # Find the n8n service line to insert before it
    insert_point = compose_content.find('\n  n8n:')
    if insert_point > 0:
        pgbouncer_service = """
  # ─── PgBouncer (Pool de Conexiones PostgreSQL) ──────────────────────────────
  pgbouncer:
    image: edoburu/pgbouncer:latest
    container_name: aicore-pgbouncer
    restart: unless-stopped
    ports:
      - '6432:6432'
    volumes:
      - ./pgbouncer/pgbouncer.ini:/etc/pgbouncer/pgbouncer.ini
      - ./pgbouncer/userlist.txt:/etc/pgbouncer/userlist.txt
    depends_on:
      postgres:
        condition: service_healthy
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -h localhost -p 6432 -U postgres || exit 1']
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - aicore-net
    deploy:
      resources:
        limits:
          cpus: '0.25'
          memory: 128M
"""
        new_compose = compose_content[:insert_point] + pgbouncer_service + compose_content[insert_point:]
        
        # Write the updated compose file
        import base64
        encoded = base64.b64encode(new_compose.encode()).decode()
        cmd = f"echo '{encoded}' | base64 -d > {COMPOSE_DIR}/docker-compose.yml"
        out, err, rc = run(cmd)
        print(f"   Escritura RC={rc} | {err[:100] if err else 'OK'}")
    else:
        print("   ❌ No se encontró el punto de inserción (n8n:)")
else:
    print("   ⏭️ pgbouncer ya existe en el compose")

# 6. Verificar el compose resultante
print("\n📋 Verificando compose final...")
out, err, rc = run(f"cat {COMPOSE_DIR}/docker-compose.yml")
compose_lines = out.split('\n')
pgbouncer_lines = [i+1 for i, l in enumerate(compose_lines) if 'pgbouncer' in l.lower()]
print(f"   Líneas con 'pgbouncer': {pgbouncer_lines}")
print(f"   Total líneas: {len(compose_lines)}")

# 7. Verificar archivos pgbouncer
print("\n📁 Verificando archivos...")
out, err, rc = run(f"ls -la {PGBOUNCER_DIR}/")
print(f"   {out}")

# 8. Nota sobre DATABASE_URL
print("\n" + "="*60)
print("⚠️  IMPORTANTE: Recordá actualizar DATABASE_URL en Dokploy")
print("="*60)
print("""
En la UI de Dokploy → App Dashboard → Variables de entorno:
  Cambiar:
    DATABASE_URL=postgresql://dashboard_user:...@172.18.0.1:5432/consultorio_medico
  A:
    DATABASE_URL=postgresql://dashboard_user:...@172.18.0.1:6432/consultorio_medico
  (solo cambiar el puerto de :5432 a :6432)
""")

# 9. Mostrar los datos de pgBouncer que necesita n8n (opcional)
print("\n📊 Los servicios que se conectan a PG ahora:")
print("   - Dashboard → PgBouncer :6432")
print("   - n8n → PostgreSQL directo :5432 (sin cambios)")
print("   - Scripts → PostgreSQL directo :5432 (sin cambios)")

client.close()
print("\n✅ Listo. Hacé el deploy manual desde Dokploy UI.")
