"""Check n8n workflows directory and copy workflow"""
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

print('=== Check n8n user dir ===')
cmd = f'sudo docker exec {N8N} ls -la /home/node/.n8n/ 2>&1'
stdin, stdout, stderr = client.exec_command(cmd, timeout=10)
out = stdout.read().decode().strip()
err = stderr.read().decode().strip()
if out: print(out)
if err: print(f'ERR: {err}')

print('\n=== Check for workflows in .n8n ===')
cmd = f'sudo docker exec {N8N} ls -la /home/node/.n8n/workflows/ 2>&1 || echo "no workflows dir"'
stdin, stdout, stderr = client.exec_command(cmd, timeout=10)
out = stdout.read().decode().strip()
err = stderr.read().decode().strip()
if out: print(out)
if err: print(f'ERR: {err}')

print('\n=== Check if n8n loads workflows from filesystem ===')
cmd = f'sudo docker exec {N8N} grep -r "workflows" /home/node/.n8n/config 2>/dev/null || echo "no config"'
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

print('\n=== Try to trigger n8n to reload workflows ===')
# Send SIGHUP to n8n process or restart via dokploy?
# Let's just check if we can restart the container via dokploy CLI or docker

print('\n=== Check if we can restart n8n service ===')
cmd = 'sudo docker restart aicore-n8nrunnerpostgresollama-a715gi-n8n-1 2>&1 | head -5'
stdin, stdout, stderr = client.exec_command(cmd, timeout=30)
out = stdout.read().decode().strip()
err = stderr.read().decode().strip()
if out: print(out)
if err: print(f'ERR: {err}')

print('\n=== Waiting for restart... ===')
import time
time.sleep(5)

print('\n=== Check if workflow is loaded ===')
cmd = f'sudo docker exec {N8N} ls -la /home/node/.n8n/workflows/ 2>&1'
stdin, stdout, stderr = client.exec_command(cmd, timeout=10)
out = stdout.read().decode().strip()
err = stderr.read().decode().strip()
if out: print(out)
if err: print(f'ERR: {err}')

client.close()