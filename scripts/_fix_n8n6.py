"""Test n8n's connection to different databases"""
import paramiko
import base64

HOST = '51.222.207.250'
USER = 'ubuntu'
PASSWORD = 'Cool220479..@'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASSWORD)

N8N = 'aicore-n8nrunnerpostgresollama-a715gi-n8n-1'

# Test different databases and connection scenarios
test_script = """
const { Pool } = require('/usr/local/lib/node_modules/n8n/node_modules/.pnpm/pg@8.12.0/node_modules/pg');

const configs = [
  { host: 'postgres', user: 'reece.schmeler67', password: '7anlnf0odssgmuwyjchqzdpk', database: 'n8n' },
  { host: 'postgres', user: 'reece.schmeler67', password: '7anlnf0odssgmuwyjchqzdpk', database: 'postgres' },
  { host: 'postgres', user: 'reece.schmeler67', password: '7anlnf0odssgmuwyjchqzdpk', database: 'reece_schmeler67' },
  { host: 'postgres', user: 'reece.schmeler67', password: '7anlnf0odssgmuwyjchqzdpk', database: 'consultorio_medico' },
];

let completed = 0;
configs.forEach(cfg => {
  const p = new Pool({ ...cfg, connectionTimeoutMillis: 3000 });
  p.query('SELECT 1 as test', (e, r) => {
    if (e) {
      console.log('DB:', cfg.database, '-> ERR:', e.message.substring(0, 80));
    } else {
      console.log('DB:', cfg.database, '-> OK');
    }
    p.end();
    completed++;
    if (completed === configs.length) {
      // Check n8n default database setting
      try {
        const config = require('/usr/local/lib/node_modules/n8n/dist/config');
        console.log('\\nDefault DB config:');
        console.log('  type:', config.getEnv('database.type'));
        console.log('  host:', config.getEnv('database.postgresdb.host'));
        console.log('  user:', config.getEnv('database.postgresdb.user'));
        console.log('  database:', config.getEnv('database.postgresdb.database') || 'NOT SET');
      } catch(e) {
        console.log('\\nConfig check error:', e.message);
      }
    }
  });
});
"""

encoded = base64.b64encode(test_script.encode()).decode()
cmd = f'echo {encoded} | base64 -d | sudo tee /tmp/test-pg4.js > /dev/null && sudo docker cp /tmp/test-pg4.js {N8N}:/tmp/test-pg4.js && sudo docker exec {N8N} node /tmp/test-pg4.js 2>&1'
stdin, stdout, stderr = client.exec_command(cmd, timeout=30)
out = stdout.read().decode().strip()
err = stderr.read().decode().strip()
if out: print(out)
if err: print(f'ERR: {err}')

client.close()
