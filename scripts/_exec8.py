"""Debug n8n API access + import workflow"""
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

# First, let's try a simple GET to the API
probe_script = '''
const http = require('http');

// Try health endpoint
http.get('http://localhost:5678/rest/workflows', (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log('GET /rest/workflows');
    console.log('Status:', res.statusCode);
    console.log('Headers:', JSON.stringify(res.headers));
    console.log('Body:', body.substring(0, 500));
  });
}).on('error', (e) => {
  console.log('GET /rest/workflows ERROR:', e.message);
});

// Also check health
http.get('http://localhost:5678/healthz', (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log('GET /healthz Status:', res.statusCode);
    console.log('Body:', body);
  });
}).on('error', (e) => {
  console.log('GET /healthz ERROR:', e.message);
});
'''

encoded = base64.b64encode(probe_script.encode()).decode()
cmd = f'echo {encoded} | base64 -d | sudo tee /tmp/probe.js > /dev/null && sudo docker cp /tmp/probe.js {N8N}:/tmp/probe.js && sudo docker exec {N8N} node /tmp/probe.js 2>&1'
stdin, stdout, stderr = client.exec_command(cmd, timeout=20)
out = stdout.read().decode().strip()
err = stderr.read().decode().strip()
if out: print(out)
if err: print(f'ERR: {err}')

# Check user management
print('\n=== Checking n8n user management ===')
cmd = f'sudo docker exec {N8N} n8n --help 2>&1 | grep -i "user\\|import" | head -10'
stdin, stdout, stderr = client.exec_command(cmd, timeout=10)
out = stdout.read().decode().strip()
if out: print(out)

# Try to use CLI with DB env vars
print('\n=== Trying n8n import with DB URL ===')
cmd = f'sudo docker exec -e DB_POSTGRESDB_PASSWORD=7anlnf0odssgmuwyjchqzdpk {N8N} n8n import:workflow --input=/tmp/wf10.json 2>&1 | head -20'
stdin, stdout, stderr = client.exec_command(cmd, timeout=30)
out = stdout.read().decode().strip()
err = stderr.read().decode().strip()
if out: print(out)
if err: print(f'ERR: {err}')

client.close()
