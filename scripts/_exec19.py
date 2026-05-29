"""Phase 2: Read .env file and test postgres auth"""
import paramiko

HOST = '51.222.207.250'
USER = 'ubuntu'
PASSWORD = 'Cool220479..@'

N8N = 'aicore-n8nrunnerpostgresollama-a715gi-n8n-1'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASSWORD)

def run(cmd, timeout=15):
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    return out, err

# Get postgres container name
print('=== Finding postgres container ===')
out, err = run('sudo docker ps --format "{{.Names}}" | grep "postgres-1" | head -1')
pg = out
print(f'Postgres container: {pg}')

# 1. Read the .env file
print('\n' + '='*60)
print('1. Read .env file for n8n compose')
print('='*60)
out, err = run('cat /etc/dokploy/compose/aicore-n8nrunnerpostgresollama-a715gi/code/.env 2>&1')
if out: print(out)
if err: print('ERR: ' + err)

# 2. Check what databases exist in postgres
print('\n' + '='*60)
print('2. List databases in postgres')
print('='*60)
out, err = run("sudo docker exec " + pg + " psql -U postgres -c '\\l' 2>&1")
if out: print(out)
if err: print('ERR: ' + err)

# 3. Check what users exist and their permissions
print('\n' + '='*60)
print('3. List users/roles')
print('='*60)
out, err = run("sudo docker exec " + pg + " psql -U postgres -c '\\du' 2>&1")
if out: print(out)
if err: print('ERR: ' + err)

# 4. Test auth with reece.schmeler67 directly
print('\n' + '='*60)
print('4. Test auth: try connecting with reece.schmeler67 to consultorio_medico')
print('='*60)
out, err = run("sudo docker exec " + pg + " PGPASSWORD=7anlnf0odssgmuwyjchqzdpk psql -U reece.schmeler67 -d consultorio_medico -c 'SELECT current_user, current_database()' 2>&1")
if out: print(out)
if err: print('ERR: ' + err)

# 5. Test auth to default database
print('\n' + '='*60)
print('5. Test auth: try connecting to default postgres db with reece.schmeler67')
print('='*60)
out, err = run("sudo docker exec " + pg + " PGPASSWORD=7anlnf0odssgmuwyjchqzdpk psql -U reece.schmeler67 -d postgres -c 'SELECT current_user, current_database()' 2>&1")
if out: print(out)
if err: print('ERR: ' + err)

# 6. Check pg_hba.conf for auth method
print('\n' + '='*60)
print('6. Check pg_hba.conf')
print('='*60)
out, err = run("sudo docker exec " + pg + " cat /var/lib/postgresql/data/pg_hba.conf 2>&1 | grep -v '^#' | grep -v '^$'")
if out: print(out)
if err: print('ERR: ' + err)

# 7. Check n8n database name - n8n stores its data in specific tables
print('\n' + '='*60)
print('7. Check what tables exist in consultorio_medico (n8n tables?)')
print('='*60)
out, err = run("sudo docker exec " + pg + " PGPASSWORD=7anlnf0odssgmuwyjchqzdpk psql -U reece.schmeler67 -d consultorio_medico -c '\\dt' 2>&1")
if out: print(out)
if err: print('ERR: ' + err)

# 8. Check if reece.schmeler67 owns any databases
print('\n' + '='*60)
print('8. Check database ownership')
print('='*60)
out, err = run("sudo docker exec " + pg + " psql -U postgres -c \"SELECT datname, datdba::regrole FROM pg_database\" 2>&1")
if out: print(out)
if err: print('ERR: ' + err)

# 9. Check if n8n has connected to postgres successfully via the logs
print('\n' + '='*60)
print('9. Check postgres logs for n8n connections')
print('='*60)
out, err = run("sudo docker exec " + pg + " cat /var/lib/postgresql/data/log/*.log 2>/dev/null | tail -40 2>&1")
if out: print(out)
if err: print('ERR: ' + err)

# 10. Check if there's pg log directory
print('\n' + '='*60)
print('10. Check postgres log directory')
print('='*60)
out, err = run("sudo docker exec " + pg + " ls -la /var/lib/postgresql/data/log/ 2>&1")
if out: print(out)
if err: print('ERR: ' + err)

# 11. Try connecting as the n8n container would (from another container)
print('\n' + '='*60)
print('11. Try connecting from n8n container to postgres')
print('='*60)
out, err = run("sudo docker exec " + N8N + " PGPASSWORD=7anlnf0odssgmuwyjchqzdpk psql -h postgres -U reece.schmeler67 -d consultorio_medico -c 'SELECT current_user, current_database()' 2>&1")
if out: print(out)
if err: print('ERR: ' + err)

# 12. Check n8n database - does n8n have its own DB?
print('\n' + '='*60)
print('12. Check if n8n database exists')
print('='*60)
out, err = run("sudo docker exec " + pg + " psql -U postgres -c \"SELECT datname FROM pg_database WHERE datname LIKE '%n8n%' OR datname LIKE '%n8n%'\" 2>&1")
if out: print(out)
if err: print('ERR: ' + err)

# 13. Check for any recent postgres errors
print('\n' + '='*60)
print('13. Try to find CSV logs or systemd journal for postgres')
print('='*60)
out, err = run("sudo docker exec " + pg + " find /var/lib/postgresql -name '*.csv' -o -name '*.log' 2>/dev/null | head -10")
if out: print(out)
if err: print('ERR: ' + err)

# 14. Query postgres log_directory
print('\n' + '='*60)
print('14. Postgres log settings')
print('='*60)
out, err = run("sudo docker exec " + pg + " psql -U postgres -c \"SHOW log_directory; SHOW log_destination; SHOW logging_collector;\" 2>&1")
if out: print(out)
if err: print('ERR: ' + err)

client.close()
print('\n' + '='*70)
print('PHASE 2 COMPLETE')
print('='*70)
