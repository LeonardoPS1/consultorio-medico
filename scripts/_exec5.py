"""Grant permissions + verify access + deploy n8n workflow"""
import paramiko

HOST = '51.222.207.250'
USER = 'ubuntu'
PASSWORD = 'Cool220479..@'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASSWORD)

PG = 'aicore-n8nrunnerpostgresollama-a715gi-postgres-1'
SUPERUSER = 'reece.schmeler67'
PASS = '7anlnf0odssgmuwyjchqzdpk'

# Grant all privileges on new tables to dashboard_user
sql = "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO dashboard_user;"
print(f'=== Granting privileges ===')
cmd = f'sudo docker exec -e PGPASSWORD={PASS} -i {PG} psql -U {SUPERUSER} -d consultorio_medico -c "{sql}"'
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
out = stdout.read().decode().strip()
err = stderr.read().decode().strip()
if out: print(out)
if err: print(f'ERR: {err}')

# Verify dashboard_user can access
print('\n=== Verify dashboard_user access ===')
cmd = f'sudo docker exec -i {PG} psql -U dashboard_user -d consultorio_medico -c "SELECT * FROM lista_espera LIMIT 1; SELECT * FROM ofertas_turno LIMIT 1"'
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
out = stdout.read().decode().strip()
err = stderr.read().decode().strip()
if out: print(out)
if err: print(f'ERR: {err}')

# Now deploy WF-10 to n8n
print('\n=== Deploy WF-10 to n8n ===')

# Read the workflow JSON
import json
with open(r'D:\OPENCODE\consultorio-medico\n8n-workflows\current\workflow-10-expiracion-waitlist.json', 'r', encoding='utf-8') as f:
    workflow = json.load(f)

n8n_container = 'aicore-n8nrunnerpostgresollama-a715gi-n8n-1'

# Get n8n API key
cmd = f'sudo docker exec {n8n_container} printenv N8N_API_KEY'
stdin, stdout, stderr = client.exec_command(cmd, timeout=10)
n8n_api_key = stdout.read().decode().strip()

if n8n_api_key:
    print(f'Found N8N_API_KEY: {n8n_api_key[:10]}...')
else:
    print('No N8N_API_KEY - trying to get from config files...')
    cmd = f'sudo docker exec {n8n_container} cat ~/.n8n/config 2>/dev/null || sudo docker exec {n8n_container} cat /home/node/.n8n/config 2>/dev/null || echo "no config"'
    stdin, stdout, stderr = client.exec_command(cmd, timeout=10)
    out = stdout.read().decode().strip()
    print(out)

# Try to access n8n API via curl from inside the container or from the host
print(f'\n=== Testing n8n API access ===')
cmd = f'sudo docker exec {n8n_container} curl -s http://localhost:5678/healthz 2>&1 || echo "curl not in container"'
stdin, stdout, stderr = client.exec_command(cmd, timeout=10)
out = stdout.read().decode().strip()
print(out)

# Check n8n version and base URL
print(f'\n=== Checking n8n config ===')
cmd = f'sudo docker exec {n8n_container} printenv | grep -i n8n | head -20'
stdin, stdout, stderr = client.exec_command(cmd, timeout=10)
out = stdout.read().decode().strip()
print(out)

client.close()
