"""Diagnose n8n DB authentication failure"""
import paramiko

HOST = '51.222.207.250'
USER = 'ubuntu'
PASSWORD = 'Cool220479..@'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASSWORD)

N8N = 'aicore-n8nrunnerpostgresollama-a715gi-n8n-1'
PG = 'aicore-n8nrunnerpostgresollama-a715gi-postgres-1'

print('=== 1. Verificar que el contenedor n8n existe y está restarting ===')
cmds = [
    'sudo docker ps -a --filter name=n8n --format "{{.Names}} | {{.Status}}"',
    f'sudo docker inspect {N8N} | grep -A5 "RestartCount" | head -10',
]

for cmd in cmds:
    print(f'$ {cmd}')
    stdin, stdout, stderr = client.exec_command(cmd, timeout=10)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    if out: print(out)
    if err: print(f'ERR: {err}')
    print('---')

print('\n=== 2. Verificar conexión directa a PostgreSQL ===')
# Try connecting with the n8n credentials
cmd = f'sudo docker exec -i {PG} psql -U reece.schmeler67 -d postgres -c "SELECT 1 as test" 2>&1'
stdin, stdout, stderr = client.exec_command(cmd, timeout=10)
out = stdout.read().decode().strip()
err = stderr.read().decode().strip()
print(f'Direct psql test (no password): {out}')
print(f'ERR: {err}')

# Try with PGPASSWORD
cmd = f'sudo docker exec -e PGPASSWORD=7anlnf0odssgmuwyjchqzdpk -i {PG} psql -U reece.schmeler67 -d postgres -c "SELECT 1 as test" 2>&1'
stdin, stdout, stderr = client.exec_command(cmd, timeout=10)
out = stdout.read().decode().strip()
err = stderr.read().decode().strip()
print(f'Direct psql (with PGPASSWORD): {out}')
print(f'ERR: {err}')

print('\n=== 3. Listar usuarios en PostgreSQL ===')
cmd = f'sudo docker exec -e PGPASSWORD=7anlnf0odssgmuwyjchqzdpk -i {PG} psql -U reece.schmeler67 -d postgres -c "SELECT usename, usesuper, passwd IS NOT NULL as has_pass FROM pg_catalog.pg_user" 2>&1'
stdin, stdout, stderr = client.exec_command(cmd, timeout=10)
out = stdout.read().decode().strip()
err = stderr.read().decode().strip()
if out: print(out)
if err: print(f'ERR: {err}')

# If that doesn't work, try as the default postgres superuser if it exists
print('\n=== 4. Intentar con usuario postgres (por defecto) ===')
cmd = f'sudo docker exec -i {PG} psql -U postgres -d postgres -c "SELECT usename FROM pg_catalog.pg_user" 2>&1'
stdin, stdout, stderr = client.exec_command(cmd, timeout=10)
out = stdout.read().decode().strip()
err = stderr.read().decode().strip()
print(f'As postgres: {out}')
print(f'ERR: {err}')

# Check pg_hba.conf for authentication method
print('\n=== 5. Revisar pg_hba.conf ===')
cmd = f'sudo docker exec -i {PG} cat /var/lib/postgresql/data/pg_hba.conf 2>/dev/null | grep -v "^#" | grep -v "^$" | head -20'
stdin, stdout, stderr = client.exec_command(cmd, timeout=10)
out = stdout.read().decode().strip()
if out: print(out)
if err: print(f'ERR: {err}')

print('\n=== 6. Verificar variables de entorno de n8n ===')
cmd = f'sudo docker inspect {N8N} | grep -A2 "DB_POSTGRESDB" | head -10'
stdin, stdout, stderr = client.exec_command(cmd, timeout=10)
out = stdout.read().decode().strip()
if out: print(out)
if err: print(f'ERR: {err}')

client.close()
