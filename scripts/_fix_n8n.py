"""Fix n8n DB auth - test network connectivity and check logs"""
import paramiko
import base64

HOST = '51.222.207.250'
USER = 'ubuntu'
PASSWORD = 'Cool220479..@'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASSWORD)

N8N = 'aicore-n8nrunnerpostgresollama-a715gi-n8n-1'
PG = 'aicore-n8nrunnerpostgresollama-a715gi-postgres-1'

# Test actual PostgreSQL connection from n8n container using node
print('=== Test PostgreSQL connection from n8n container ===')
node_script = '''
const { Pool } = require('pg');
const pool = new Pool({
  host: 'postgres',
  port: 5432,
  user: 'reece.schmeler67',
  password: '7anlnf0odssgmuwyjchqzdpk',
  database: 'postgres',
  connectionTimeoutMillis: 5000,
});
pool.query('SELECT 1 as test', (err, res) => {
  if (err) {
    console.log('ERROR:', err.message);
    console.log('CODE:', err.code);
  } else {
    console.log('OK:', JSON.stringify(res.rows[0]));
  }
  pool.end();
});
'''
encoded = base64.b64encode(node_script.encode()).decode()
cmd = f'echo {encoded} | base64 -d | sudo tee /tmp/test-pg.js > /dev/null && sudo docker cp /tmp/test-pg.js {N8N}:/tmp/test-pg.js && sudo docker exec {N8N} node /tmp/test-pg.js 2>&1'
stdin, stdout, stderr = client.exec_command(cmd, timeout=20)
out = stdout.read().decode().strip()
err = stderr.read().decode().strip()
if out: print(out)
if err: print(f'ERR: {err}')

# Check all databases
print('\n=== List all databases ===')
cmd = f'sudo docker exec -i {PG} psql -U reece.schmeler67 -d postgres -c "SELECT datname FROM pg_catalog.pg_database" 2>&1'
stdin, stdout, stderr = client.exec_command(cmd, timeout=10)
out = stdout.read().decode().strip()
err = stderr.read().decode().strip()
if out: print(out)
if err: print(f'ERR: {err}')

# Check env vars of n8n
print('\n=== Check n8n DB env vars ===')
cmd = f'sudo docker inspect {N8N} | grep -i "DB_POSTGRESDB_DATABASE\\|DB_DATABASE" 2>&1'
stdin, stdout, stderr = client.exec_command(cmd, timeout=10)
out = stdout.read().decode().strip()
if out: print(out)
else:
    print("No DB_DATABASE env set - n8n might use default")

# Check docker-compose for n8n DB configuration
print('\n=== Check n8n docker-compose from the project ===')
cmd = 'sudo docker inspect ' + N8N + ' | grep -A2 "DB_DATABASE\\|DB_POSTGRESDB_DATABASE\\|POSTGRES_DB" | head -10'
stdin, stdout, stderr = client.exec_command(cmd, timeout=10)
out = stdout.read().decode().strip()
if out: print(out)

# Read the last lines of n8n container logs
print('\n=== Last 30 lines of n8n container logs ===')
cmd = f'sudo docker logs {N8N} --tail 30 2>&1'
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
out = stdout.read().decode().strip()
err = stderr.read().decode().strip()
if out: print(out)
if err: print(f'ERR: {err}')

# Also check the last 20 lines of the postgres log for auth failures
print('\n=== PostgreSQL recent logs (auth failures) ===')
cmd = f'sudo docker logs {PG} --tail 20 2>&1 | grep -i "password\\|authentic\\|FATAL" | head -10'
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
out = stdout.read().decode().strip()
if out: print(out)
else:
    print("No auth failures found in postgres logs")

client.close()
