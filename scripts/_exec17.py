"""Create workflows directory and copy workflow"""
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

print('=== Create workflows directory ===')
cmd = f'sudo docker exec {N8N} mkdir -p /home/node/.n8n/workflows'
stdin, stdout, stderr = client.exec_command(cmd, timeout=10)
out = stdout.read().decode().strip()
err = stderr.read().decode().strip()
if out: print(out)
if err: print(f'ERR: {err}')

print('\n=== Check workflows dir exists ===')
cmd = f'sudo docker exec {N8N} ls -la /home/node/.n8n/workflows/ 2>&1'
stdin, stdout, stderr = client.exec_command(cmd, timeout=10)
out = stdout.read().decode().strip()
err = stderr.read().decode().strip()
if out: print(out)
if err: print(f'ERR: {err}')

# Copy workflow to .n8n/workflows/
print('\n=== Copy workflow to .n8n/workflows/ ===')
with open(r'D:\OPENCODE\consultorio-medico\n8n-workflows\current\workflow-10-expiracion-waitlist.json', 'r', encoding='utf-8') as f:
    workflow_content = f.read()

# Write to VPS temp file then copy to container
encoded = base64.b64encode(workflow_content.encode()).decode()
cmd = f'echo {encoded} | base64 -d | sudo tee /tmp/wf10.json > /dev/null'
stdin, stdout, stderr = client.exec_command(cmd, timeout=10)
out = stdout.read().decode().strip()
err = stderr.read().decode().strip()
if out: print(out)
if err: print(f'ERR: {err}')

# Copy to container
cmd = f'sudo docker cp /tmp/wf10.json {N8N}:/home/node/.n8n/workflows/wf-10-expiracion-waitlist.json'
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
out = stdout.read().decode().strip()
err = stderr.read().decode().strip()
if out: print(out)
if err: print(f'ERR: {err}')

# Verify file exists
cmd = f'sudo docker exec {N8N} ls -la /home/node/.n8n/workflows/wf-10-expiracion-waitlist.json'
stdin, stdout, stderr = client.exec_command(cmd, timeout=10)
out = stdout.read().decode().strip()
err = stderr.read().decode().strip()
if out: print(out)
if err: print(f'ERR: {err}')

# Check file size
cmd = f'sudo docker exec {N8N} wc -l /home/node/.n8n/workflows/wf-10-expiracion-waitlist.json'
stdin, stdout, stderr = client.exec_command(cmd, timeout=10)
out = stdout.read().decode().strip()
if out: print(out)

print('\n=== Try to trigger n8n to reload workflows ===')
# Restart the container
print('\n=== Restarting n8n container ===')
cmd = 'sudo docker restart aicore-n8nrunnerpostgresollama-a715gi-n8n-1 2>&1'
stdin, stdout, stderr = client.exec_command(cmd, timeout=30)
out = stdout.read().decode().strip()
err = stderr.read().decode().strip()
if out: print(out)
if err: print(f'ERR: {err}')

print('\n=== Waiting for restart... ===')
import time
time.sleep(10)

print('\n=== Check if workflow file still exists after restart ===')
cmd = f'sudo docker exec {N8N} ls -la /home/node/.n8n/workflows/ 2>&1'
stdin, stdout, stderr = client.exec_command(cmd, timeout=10)
out = stdout.read().decode().strip()
err = stderr.read().decode().strip()
if out: print(out)
if err: print(f'ERR: {err}')

# Try to access n8n API now
print('\n=== Try to access n8n API via Docker network ===')
cmd = 'sudo docker run --rm --network aicore-n8nrunnerpostgresollama-a715gi alpine:latest wget -T 10 -qO- http://n8n:5678/rest/workflows 2>&1 | head -20'
stdin, stdout, stderr = client.exec_command(cmd, timeout=30)
out = stdout.read().decode().strip()
err = stderr.read().decode().strip()
if out: print(out)
if err: print(f'ERR: {err}')

client.close()