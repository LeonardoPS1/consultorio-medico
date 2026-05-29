"""Access n8n API via Docker network"""
import paramiko
import json
import base64

HOST = '51.222.207.250'
USER = 'ubuntu'
PASSWORD = 'Cool220479..@'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASSWORD)

N8N = 'aicore-n8nrunnerpostgresollama-a715gi-n8n-1'

# Check docker network
print('=== Docker networks ===')
cmds = [
    'sudo docker network ls',
    # Try on the worker container
    f'sudo docker exec {N8N} ss -tlnp 2>/dev/null || echo "no ss"',
    f'sudo docker exec {N8N} netstat -tlnp 2>/dev/null || echo "no netstat"',
    f'sudo docker exec {N8N} cat /proc/net/tcp 2>/dev/null | head -5 || echo "no proc"',
    # Try installing curl temporarily
    f'sudo docker exec {N8N} apt-get update -qq 2>/dev/null && sudo docker exec {N8N} apt-get install -y -qq curl 2>/dev/null || echo "no apt in container"',
    # Try alpine style
    f'sudo docker exec {N8N} apk add --no-cache curl 2>/dev/null || echo "no apk"',
]

for cmd in cmds:
    print(f'$ {cmd}')
    stdin, stdout, stderr = client.exec_command(cmd, timeout=30)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    if out: print(out)
    if err: print(f'ERR: {err}')
    print('---')

# Let me check what's actually listening on the n8n-1 container
print('\n=== Checking what processes are running ===')
cmd = f'sudo docker exec {N8N} ps aux 2>&1 | head -20'
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
out = stdout.read().decode().strip()
print(out)

# Check if n8n is the main process or if it's a worker-only image
print('\n=== Checking container image ===')
cmd = f'sudo docker inspect {N8N} | grep -i image | head -3'
stdin, stdout, stderr = client.exec_command(cmd, timeout=10)
out = stdout.read().decode().strip()
print(out)

# Check command
print('\n=== Checking container command ===')
cmd = 'sudo docker inspect ' + N8N + ' | grep -A3 \\"Cmd\\" | head -5'
stdin, stdout, stderr = client.exec_command(cmd, timeout=10)
out = stdout.read().decode().strip()
print(out)

client.close()
