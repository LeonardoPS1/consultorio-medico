"""Fix n8n DB auth - check password encoding and fix it"""
import paramiko

HOST = '51.222.207.250'
USER = 'ubuntu'
PASSWORD = 'Cool220479..@'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASSWORD)

PG = 'aicore-n8nrunnerpostgresollama-a715gi-postgres-1'

# Check the password hash for reece.schmeler67
print('=== Check password hash for reece.schmeler67 ===')
cmd = f'sudo docker exec -i {PG} psql -U reece.schmeler67 -d postgres -c "SELECT usename, passwd FROM pg_catalog.pg_shadow WHERE usename = \'reece.schmeler67\'" 2>&1'
stdin, stdout, stderr = client.exec_command(cmd, timeout=10)
out = stdout.read().decode().strip()
err = stderr.read().decode().strip()
if out: print(out)
if err: print(f'ERR: {err}')

# Check password_encryption setting
print('\n=== Check password_encryption ===')
cmd = f'sudo docker exec -i {PG} psql -U reece.schmeler67 -d postgres -c "SHOW password_encryption" 2>&1'
stdin, stdout, stderr = client.exec_command(cmd, timeout=10)
out = stdout.read().decode().strip()
if out: print(out)

# Check if scram is supported
print('\n=== Check scram supported ===')
cmd = f'sudo docker exec -i {PG} psql -U reece.schmeler67 -d postgres -c "SELECT * FROM pg_available_extensions WHERE name LIKE \'%scram%\'" 2>&1'
stdin, stdout, stderr = client.exec_command(cmd, timeout=10)
out = stdout.read().decode().strip()
if out: print(out)
else:
    # It's built-in, not an extension
    print("scram is built-in (not an extension)")

# THE FIX: Change pg_hba.conf to allow md5 OR scram-sha-256
print('\n=== THE FIX: Update pg_hba.conf to accept md5 + scram-sha-256 ===')
# Option 1: Change host all to use 'scram-sha-256' but re-encrypt password
# Option 2: Change host all to use 'md5' which is more compatible
# Option 3: Change to 'trust' (not recommended but works)
# Best option: Set password_encryption = scram-sha-256 and reset password

# Let's first try to reset the password with scram-sha-256 encoding
print('\n=== Resetting password for reece.schmeler67 (same password, scram-sha-256) ===')
cmd = f'sudo docker exec -i {PG} psql -U reece.schmeler67 -d postgres -c "ALTER USER \\"reece.schmeler67\\" WITH PASSWORD \'7anlnf0odssgmuwyjchqzdpk\'" 2>&1'
stdin, stdout, stderr = client.exec_command(cmd, timeout=10)
out = stdout.read().decode().strip()
err = stderr.read().decode().strip()
if out: print(out)
if err: print(f'ERR: {err}')

# Verify the hash changed
print('\n=== Verify new password hash ===')
cmd = f'sudo docker exec -i {PG} psql -U reece.schmeler67 -d postgres -c "SELECT usename, CASE WHEN passwd LIKE \'SCRAM-SHA-256%%\' THEN \'SCRAM-SHA-256\' WHEN passwd LIKE \'md5%%\' THEN \'md5\' ELSE \'other\' END AS encoding FROM pg_catalog.pg_shadow WHERE usename = \'reece.schmeler67\'" 2>&1'
stdin, stdout, stderr = client.exec_command(cmd, timeout=10)
out = stdout.read().decode().strip()
if out: print(out)

# Now test network connection via another container to simulate n8n
print('\n=== Test network connection (simulate n8n) ===')
# Run psql from the n8n container to test auth via network
get_host_cmd = f'sudo docker exec {PG} hostname -i 2>&1'
stdin, stdout, stderr = client.exec_command(get_host_cmd, timeout=5)
pg_ip = stdout.read().decode().strip()
print(f'Postgres IP: {pg_ip}')

# Now test from the n8n container
N8N = 'aicore-n8nrunnerpostgresollama-a715gi-n8n-1'
test_cmd = f'sudo docker exec -e PGPASSWORD=7anlnf0odssgmuwyjchqzdpk {N8N} sh -c "psql -h postgres -U reece.schmeler67 -d n8n -c \\"SELECT 1 as test\\" 2>&1" || echo "psql not in n8n container"'
stdin, stdout, stderr = client.exec_command(test_cmd, timeout=15)
out = stdout.read().decode().strip()
err = stderr.read().decode().strip()
if out: print(out)
if err: print(f'ERR: {err}')

# If psql not available, use node with pg module from n8n's own modules
print('\n=== Test with node from n8n container (using pg from n8n) ===')
node_test = '''
const { Pool } = require('n8n/dist/databases/pg');
// Just use the pg module from n8n's node_modules
const pgModule = require.resolve('pg');
console.log('pg module:', pgModule);
const pg = require(pgModule);
const pool = new pg.Pool({
  host: 'postgres',
  port: 5432,
  user: 'reece.schmeler67',
  password: '7anlnf0odssgmuwyjchqzdpk',
  database: 'n8n',
  connectionTimeoutMillis: 5000,
});
pool.query('SELECT 1 as test', (err, res) => {
  if (err) {
    console.log('ERROR:', err.message, err.code);
  } else {
    console.log('OK:', JSON.stringify(res.rows[0]));
  }
  pool.end();
});
'''
import base64
encoded = base64.b64encode(node_test.encode()).decode()
cmd = f'echo {encoded} | base64 -d | sudo tee /tmp/test-pg2.js > /dev/null && sudo docker cp /tmp/test-pg2.js {N8N}:/tmp/test-pg2.js && sudo docker exec {N8N} node /tmp/test-pg2.js 2>&1'
stdin, stdout, stderr = client.exec_command(cmd, timeout=20)
out = stdout.read().decode().strip()
err = stderr.read().decode().strip()
if out: print(out)
if err: print(f'ERR: {err}')

client.close()
