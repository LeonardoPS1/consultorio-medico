"""Check .env files and test pg connection from n8n container"""
import paramiko
import base64

HOST = '51.222.207.250'
USER = 'ubuntu'
PASSWORD = 'Cool220479..@'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASSWORD)

N8N = 'aicore-n8nrunnerpostgresollama-a715gi-n8n-1'

# Check for .env files
print('=== Check for .env files in n8n container ===')
cmds = [
    f'sudo docker exec {N8N} sh -c "find /home/node -name \\".env\\" -maxdepth 4 2>/dev/null"',
    f'sudo docker exec {N8N} sh -c "find /home/node -name \\"*env*\\" -maxdepth 3 2>/dev/null | head -10"',
    f'sudo docker exec {N8N} sh -c "printenv | grep -i DB_"',
    f'sudo docker exec {N8N} sh -c "find /home/node/.n8n -name \\"*.json\\" -type f 2>/dev/null | head -10"',
    f'sudo docker exec {N8N} sh -c "ls /usr/local/lib/node_modules/n8n/dist/config/ 2>/dev/null | head -10"',
    f'sudo docker exec {N8N} sh -c "find /usr/local/lib/node_modules/n8n/dist -name \\"*database*\\" -type f 2>/dev/null | head -10"',
]

for cmd in cmds:
    print(f'$ {cmd.split("sh -c")[-1][:80]}...')
    stdin, stdout, stderr = client.exec_command(cmd, timeout=10)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    if out: print(out)
    if err: print(f'ERR: {err}')
    print('---')

# Write and run pg test as a file
print('\n=== Test pg connection via temp file ===')
node_test = """
const { Pool } = require('/usr/local/lib/node_modules/n8n/node_modules/.pnpm/pg@8.12.0/node_modules/pg');
const p = new Pool({
  host: 'postgres',
  port: 5432,
  user: 'reece.schmeler67',
  password: '7anlnf0odssgmuwyjchqzdpk',
  database: 'n8n',
  connectionTimeoutMillis: 5000,
});
p.query('SELECT 1 as test', (e, r) => {
  if (e) {
    console.log('ERR:', e.message, e.code);
  } else {
    console.log('OK:', JSON.stringify(r.rows[0]));
  }
  p.end();
});
"""

encoded = base64.b64encode(node_test.encode()).decode()
cmd = f'echo {encoded} | base64 -d | sudo tee /tmp/test-pg3.js > /dev/null && sudo docker cp /tmp/test-pg3.js {N8N}:/tmp/test-pg3.js && sudo docker exec {N8N} node /tmp/test-pg3.js 2>&1'
stdin, stdout, stderr = client.exec_command(cmd, timeout=20)
out = stdout.read().decode().strip()
err = stderr.read().decode().strip()
if out: print(out)
if err: print(f'ERR: {err}')

client.close()
