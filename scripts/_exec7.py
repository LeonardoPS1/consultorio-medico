"""Check n8n DB config and use API instead"""
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

# Check n8n DB config
print('=== n8n DB config ===')
cmd = f'sudo docker exec {N8N} printenv | grep -i db_'
stdin, stdout, stderr = client.exec_command(cmd, timeout=10)
out = stdout.read().decode().strip()
print(out)

# Check n8n config file
print('\n=== n8n config file ===')
cmd = f'sudo docker exec {N8N} cat /home/node/.n8n/config 2>/dev/null || cat /etc/dokploy/applications/*/n8n/config 2>/dev/null || echo "no config"'
stdin, stdout, stderr = client.exec_command(cmd, timeout=10)
out = stdout.read().decode().strip()
err = stderr.read().decode().strip()
if out: print(out)

# Check if there's a database.json
print('\n=== Checking for database.json ===')
cmd = f'sudo docker exec {N8N} find / -name "database.json" -o -name ".n8n.db" 2>/dev/null | head -5'
stdin, stdout, stderr = client.exec_command(cmd, timeout=10)
out = stdout.read().decode().strip()
print(out)

# Look at the n8n docker-compose section
print('\n=== Dokploy app inspect ===')
cmd = 'sudo docker inspect app-hack-back-end-sensor-jd2eu3.1.7aogczjm3ro4wkpxizzh08t14 | grep -A5 -i "DB_\|DATABASE\|POSTGRES\|N8N_DB" | head -50'
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
out = stdout.read().decode().strip()
print(out)

# Try to use n8n API via node from within the container
print('\n=== Importing workflow via n8n API ===')
with open(r'D:\OPENCODE\consultorio-medico\n8n-workflows\current\workflow-10-expiracion-waitlist.json', 'r', encoding='utf-8') as f:
    workflow = json.load(f)

# Prepare the workflow - need to ensure it has the right format for n8n API
# n8n API expects: { "name": "...", "nodes": [...], "connections": {...}, "settings": {...}, ... }
workflow_data = workflow
if 'name' not in workflow_data:
    workflow_data['name'] = 'WF-10 Expiración Lista de Espera'
if 'active' not in workflow_data:
    workflow_data['active'] = True

# Use node script approach
node_script = f'''
const http = require('http');

const workflow = {json.dumps(workflow_data, indent=2)};

const data = JSON.stringify(workflow);
const options = {{
  hostname: 'localhost',
  port: 5678,
  path: '/rest/workflows',
  method: 'POST',
  headers: {{
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data),
  }}
}};

const req = http.request(options, (res) => {{
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {{
    console.log('Status:', res.statusCode);
    console.log('Response:', body.substring(0, 500));
  }});
}});

req.on('error', (e) => console.error('Error:', e.message));
req.write(data);
req.end();
'''

# Write the node script to VPS
encoded = base64.b64encode(node_script.encode()).decode()
cmd = f'echo {encoded} | base64 -d | sudo tee /tmp/import-wf.js > /dev/null && echo "Script written"'
stdin, stdout, stderr = client.exec_command(cmd, timeout=10)
out = stdout.read().decode().strip()
print(out)

# Execute via docker - run node inside the container
cmd = f'sudo docker cp /tmp/import-wf.js {N8N}:/tmp/import-wf.js && sudo docker exec {N8N} node /tmp/import-wf.js 2>&1'
stdin, stdout, stderr = client.exec_command(cmd, timeout=30)
out = stdout.read().decode().strip()
err = stderr.read().decode().strip()
if out: print(out)
if err: print(f'ERR: {err}')

client.close()
