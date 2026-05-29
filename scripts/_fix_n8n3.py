"""Test connection and restart n8n"""
import paramiko
import base64
import time

HOST = '51.222.207.250'
USER = 'ubuntu'
PASSWORD = 'Cool220479..@'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASSWORD)

N8N = 'aicore-n8nrunnerpostgresollama-a715gi-n8n-1'
PG = 'aicore-n8nrunnerpostgresollama-a715gi-postgres-1'

# First, check the n8n connection by looking at n8n's source for how it connects to DB
# Or try to use docker network to test connection

# Test via a temporary alpine container with postgresql-client
print('=== Test network connection via alpine ===')
cmd = 'sudo docker run --rm --network aicore-n8nrunnerpostgresollama-a715gi alpine:latest sh -c "apk add -q postgresql-client && PGPASSWORD=7anlnf0odssgmuwyjchqzdpk psql -h postgres -U reece.schmeler67 -d n8n -c \\\"SELECT 1 as test\\\" 2>&1"'
stdin, stdout, stderr = client.exec_command(cmd, timeout=60)
out = stdout.read().decode().strip()
err = stderr.read().decode().strip()
if out: print(out)
if err: print(f'ERR: {err}')

# Also check if there's a client_min_messages issue
print('\n=== Check PG logs for n8n connection attempts ===')
cmd = f'sudo docker logs {PG} --tail 10 2>&1 | grep -i "n8n''" | head -5 || echo "no n8n specific logs"'
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
out = stdout.read().decode().strip()
if out: print(out)

# Check n8n container entrypoint/config for how it initializes DB
print('\n=== Check n8n entrypoint ===')
cmd = f'sudo docker exec {N8N} cat /docker-entrypoint.sh 2>/dev/null | head -50 || echo "no entrypoint"'
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
out = stdout.read().decode().strip()
if out: print(out)

# Let's look at the actual error - the issue might be in n8n's config
print('\n=== Check n8n .n8n/config ===')
cmd = f'sudo docker exec {N8N} cat /home/node/.n8n/config 2>/dev/null || echo "no config"'
stdin, stdout, stderr = client.exec_command(cmd, timeout=10)
out = stdout.read().decode().strip()
if out: print(out)
else:
    # Try different paths
    cmd = f'sudo docker exec {N8N} find /home/node -name "config*" -maxdepth 3 2>/dev/null | head -5'
    stdin, stdout, stderr = client.exec_command(cmd, timeout=10)
    out = stdout.read().decode().strip()
    if out: print(out)

# Check if there's a database.json that overrides env vars
print('\n=== Check for database.json config ===')
cmd = f'sudo docker exec {N8N} find /home/node -name "*.json" -path "*database*" -o -name "*.json" -path "*db*" 2>/dev/null | head -5'
stdin, stdout, stderr = client.exec_command(cmd, timeout=10)
out = stdout.read().decode().strip()
if out: print(out)

client.close()
