"""Run migration as dashboard_user"""
import paramiko

HOST = '51.222.207.250'
USER = 'ubuntu'
PASSWORD = 'Cool220479..@'

# Read migration SQL
with open(r'D:\OPENCODE\consultorio-medico\dashboard\drizzle\migrations\0014_lista_espera_ofertas.sql', 'r', encoding='utf-8') as f:
    migration_sql = f.read()

print(f"Migration SQL size: {len(migration_sql)} chars")
print(f"First 200 chars: {migration_sql[:200]}")

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASSWORD)

PG = 'aicore-n8nrunnerpostgresollama-a715gi-postgres-1'
SUPERUSER = 'reece.schmeler67'
PASS = '7anlnf0odssgmuwyjchqzdpk'

# Try as superuser first with PGPASSWORD
print('\n=== Applying migration as superuser ===')
cmd = f'sudo docker exec -e PGPASSWORD={PASS} -i {PG} psql -U {SUPERUSER} -d consultorio_medico'
stdin, stdout, stderr = client.exec_command(cmd, timeout=30)
stdin.write(migration_sql)
stdin.channel.shutdown_write()
out = stdout.read().decode().strip()
err = stderr.read().decode().strip()
if out: print(out)
if err: print(f'ERR: {err}')

# Verify tables
print('\n=== Verifying tables ===')
cmd = f'sudo docker exec -e PGPASSWORD={PASS} -i {PG} psql -U {SUPERUSER} -d consultorio_medico -c "\\dt lista_espera ofertas_turno"'
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
out = stdout.read().decode().strip()
err = stderr.read().decode().strip()
if out: print(out)
if err: print(f'ERR: {err}')

# Check count
print('\n=== Checking row counts ===')
cmd = f'sudo docker exec -e PGPASSWORD={PASS} -i {PG} psql -U {SUPERUSER} -d consultorio_medico -c "SELECT count(*) as lista_espera FROM lista_espera; SELECT count(*) as ofertas FROM ofertas_turno"'
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
out = stdout.read().decode().strip()
if out: print(out)

client.close()
print('\n=== Done! ===')
