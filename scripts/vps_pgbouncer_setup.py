#!/usr/bin/env python3
"""Setup pgBouncer on production VPS via SSH."""
import paramiko, hashlib, base64, sys

HOST = '51.222.207.250'
USER = 'ubuntu'
PASS = 'Cool220479..@'
COMPOSE_DIR = '/etc/dokploy/compose/aicore-n8nrunnerpostgresollama-a715gi/code'
PGB_DIR = COMPOSE_DIR + '/pgbouncer'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

def run(cmd, timeout=20):
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    return out, err, stdout.channel.recv_exit_status()

def write_file(path, content):
    b64 = base64.b64encode(content.encode()).decode()
    out, err, rc = run('echo ' + b64 + ' | base64 -d | sudo tee ' + path + ' > /dev/null')
    if rc != 0:
        print("  ERROR writing", path, err[:200])
    return rc

print("[1/8] Conectando a VPS...")
client.connect(HOST, username=USER, password=PASS)
print("  OK")

print("[2/8] Creando directorio pgbouncer...")
run('sudo mkdir -p ' + PGB_DIR)
print("  OK")

print("[3/8] Escribiendo pgbouncer.ini...")
ini = """[databases]
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
write_file(PGB_DIR + '/pgbouncer.ini', ini)
print("  OK")

print("[4/8] Obteniendo hash de usuarios PostgreSQL...")
# Try to get SCRAM hash from PG
query = "SELECT concat('\"', usename, '\" \"', passwd, '\"') FROM pg_shadow WHERE usename='dashboard_user';"
cmd = "docker exec aicore-n8nrunnerpostgresollama-a715gi-postgres-1 psql -U reece.schmeler67 -d consultorio_medico -t -c \"" + query + "\" 2>/dev/null || echo NO_PG"
out, err, rc = run(cmd)
print("  PG result:", out[:100])

if 'NO_PG' in out or not out.strip():
    print("  Calculando md5 localmente...")
    pw = 'gLfzAyEq0KQL4Qplamdlx8x9ouZdHcnP'
    user = 'dashboard_user'
    m = hashlib.md5((pw + user).encode()).hexdigest()
    userlist = '"dashboard_user" "md5' + m + '"'
    print("  Hash md5:", "md5" + m)
else:
    userlist = out.strip().split('\n')[0]

write_file(PGB_DIR + '/userlist.txt', userlist)
print("  userlist.txt escrito")

print("[5/8] Leyendo docker-compose.yml actual...")
out, err, rc = run('sudo cat ' + COMPOSE_DIR + '/docker-compose.yml')
compose = out
print("  Leidos", len(compose), "chars")

if 'pgbouncer:' not in compose:
    print("[6/8] Agregando servicio pgbouncer al compose...")
    insert_at = compose.find('\n  n8n:')
    if insert_at > 0:
        service = """
  # --- PgBouncer (Pool de Conexiones PostgreSQL) ---
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

  n8n:"""
        new_compose = compose[:insert_at] + service + compose[insert_at + 5:]
        write_file(COMPOSE_DIR + '/docker-compose.yml', new_compose)
        print("  Servicio pgbouncer agregado")
    else:
        print("  ERROR: No se encontro 'n8n:' en el compose")
else:
    print("[6/8] pgbouncer ya existe en el compose, omitiendo")

print("[7/8] Verificando archivos creados...")
out, err, rc = run('ls -la ' + PGB_DIR + '/')
print(" ", out[:400])

print("[8/8] Verificando compose final...")
out, err, rc = run('cat ' + COMPOSE_DIR + '/docker-compose.yml')
lines = out.split('\n')
p_lines = [i+1 for i, l in enumerate(lines) if 'pgbouncer' in l.lower()]
print("  Lineas con pgbouncer:", p_lines)

client.close()
print()
print("=" * 60)
print("LISTO - pgBouncer configurado en la VPS")
print("=" * 60)
print()
print("Pasos siguientes (hacer desde Dokploy UI):")
print("  1. Ir a Dokploy -> App Dashboard -> Variables")
print("  2. Cambiar DATABASE_URL:")
print("     De: postgresql://dashboard_user:...@172.18.0.1:5432/...")
print("     A:  postgresql://dashboard_user:...@172.18.0.1:6432/...")
print("     (solo cambiar :5432 -> :6432)")
print("  3. Hacer redeploy del compose backend (n8n+PG+Ollama+pgBouncer)")
print("  4. Hacer redeploy del dashboard")
