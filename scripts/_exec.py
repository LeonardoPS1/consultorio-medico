"""VPS deployment - migrate + deploy n8n"""
import paramiko

HOST = '51.222.207.250'
USER = 'ubuntu'
PASSWORD = 'Cool220479..@'

# Read the migration SQL file
with open(r'D:\OPENCODE\consultorio-medico\dashboard\drizzle\migrations\0014_lista_espera_ofertas.sql', 'r', encoding='utf-8') as f:
    migration_sql = f.read()

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASSWORD)

# Find the right postgres container
print('=== Finding postgres container ===')
cmd = 'sudo docker ps --format "{{.Names}}" | grep "postgres-1" | head -1'
stdin, stdout, stderr = client.exec_command(cmd, timeout=10)
pg_container = stdout.read().decode().strip()
print(f'Postgres container: {pg_container}')

# Apply migration directly
print(f'\n=== Applying migration to {pg_container} ===')
cmd = f'sudo docker exec -i {pg_container} psql -U postgres -d consultorio_medico'
stdin, stdout, stderr = client.exec_command(cmd, timeout=30)
stdin.write(migration_sql)
stdin.channel.shutdown_write()
out = stdout.read().decode().strip()
err = stderr.read().decode().strip()
if out: print(out)
if err: print(f'ERR: {err}')

# Verify tables
print('\n=== Verifying tables ===')
cmd = f'sudo docker exec -i {pg_container} psql -U postgres -d consultorio_medico -c "\\dt lista_espera ofertas_turno"'
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
out = stdout.read().decode().strip()
err = stderr.read().decode().strip()
if out: print(out)
if err: print(f'ERR: {err}')

# Verify indexes
print('\n=== Verifying indexes ===')
cmd = f'sudo docker exec -i {pg_container} psql -U postgres -d consultorio_medico -c "SELECT indexname, tablename FROM pg_indexes WHERE tablename IN (\'lista_espera\', \'ofertas_turno\')"'
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
out = stdout.read().decode().strip()
if out: print(out)

client.close()
print('\n=== Migration complete! ===')
