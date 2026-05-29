"""Deploy n8n workflow via container CLI"""
import paramiko
import json

HOST = '51.222.207.250'
USER = 'ubuntu'
PASSWORD = 'Cool220479..@'

with open(r'D:\OPENCODE\consultorio-medico\n8n-workflows\current\workflow-10-expiracion-waitlist.json', 'r', encoding='utf-8') as f:
    workflow = json.load(f)

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASSWORD)

N8N = 'aicore-n8nrunnerpostgresollama-a715gi-n8n-1'

# Check n8n CLI
print('=== Checking n8n CLI ===')
cmd = f'sudo docker exec {N8N} n8n --version 2>&1 || sudo docker exec {N8N} n8n --help 2>&1 | head -5 || echo "no n8n CLI"'
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
out = stdout.read().decode().strip()
err = stderr.read().decode().strip()
if out: print(out)
if err: print(f'ERR: {err}')

# Check for npx / node
print('\n=== Checking node/npx ===')
cmd = f'sudo docker exec {N8N} node --version 2>&1'
stdin, stdout, stderr = client.exec_command(cmd, timeout=10)
out = stdout.read().decode().strip()
print(f'node: {out}')

# Copy workflow JSON to VPS and then to container
print('\n=== Preparing workflow for import ===')
workflow_json_str = json.dumps(workflow, indent=2)

# Write workflow to VPS temp file using a heredoc approach
# First, write the file to VPS filesystem
cmds = [
    f'cat > /tmp/wf10.json << '"'"'EOF'"'"'',
    f'echo "Escribiendo workflow..."',
]

# Actually, simpler: base64 encode and decode on VPS
import base64
encoded = base64.b64encode(workflow_json_str.encode()).decode()

cmd = f'echo {encoded} | base64 -d | sudo tee /tmp/wf10.json > /dev/null'
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
out = stdout.read().decode().strip()
err = stderr.read().decode().strip()
if out: print(out)
if err: print(f'ERR: {err}')

# Verify file exists
cmd = 'ls -la /tmp/wf10.json'
stdin, stdout, stderr = client.exec_command(cmd, timeout=10)
out = stdout.read().decode().strip()
print(out)

# Try importing via docker cp + n8n import
print('\n=== Importing workflow via n8n CLI ===')
cmd = f'sudo docker cp /tmp/wf10.json {N8N}:/tmp/wf10.json && sudo docker exec {N8N} n8n import:workflow --input=/tmp/wf10.json 2>&1'
stdin, stdout, stderr = client.exec_command(cmd, timeout=30)
out = stdout.read().decode().strip()
err = stderr.read().decode().strip()
if out: print(out)
if err: print(f'ERR: {err}')

# Check if import succeeded by listing workflows
print('\n=== Listing workflows in n8n ===')
cmd = f'sudo docker exec {N8N} n8n list:workflows 2>&1 | head -20'
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
out = stdout.read().decode().strip()
err = stderr.read().decode().strip()
if out: print(out)
if err: print(f'ERR: {err}')

client.close()
