"""Phase 3: Verify database and test connections properly"""
import paramiko

HOST = '51.222.207.250'
USER = 'ubuntu'
PASSWORD = 'Cool220479..@'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASSWORD)

N8N = 'aicore-n8nrunnerpostgresollama-a715gi-n8n-1'
PG = 'aicore-n8nrunnerpostgresollama-a715gi-postgres-1'

def run(cmd, timeout=15):
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    return out, err

# Since there's no "postgres" role, we must use reece.schmeler67
U = 'reece.schmeler67'
P = '7anlnf0odssgmuwyjchqzdpk'

def psql(db, query, timeout=15):
    """Run psql query inside postgres container"""
    cmd = 'sudo docker exec -i ' + PG + ' psql -U ' + U + ' -d ' + db + ' -c ' + repr(query) + ' 2>&1'
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    return out, err

# 1. List databases
print('1. List databases')
print('='*60)
cmd = 'sudo docker exec -i ' + PG + ' psql -U ' + U + ' -d n8n -c "SELECT datname, datdba::regrole FROM pg_database" 2>&1'
out, err = run(cmd)
if out: print(out)
if err: print('ERR: ' + err)

# 2. List users
print('\n2. List users')
print('='*60)
cmd = 'sudo docker exec -i ' + PG + ' psql -U ' + U + ' -d n8n -c "SELECT rolname, rolsuper, rolcanlogin FROM pg_roles" 2>&1'
out, err = run(cmd)
if out: print(out)
if err: print('ERR: ' + err)

# 3. Check n8n database tables
print('\n3. Check n8n DB tables')
print('='*60)
cmd = 'sudo docker exec -i ' + PG + ' psql -U ' + U + ' -d n8n -c "\\dt" 2>&1'
out, err = run(cmd)
if out: print(out)
if err: print('ERR: ' + err)

# 4. Check consultorio_medico database
print('\n4. Check consultorio_medico DB tables')
print('='*60)
cmd = 'sudo docker exec -i ' + PG + ' psql -U ' + U + ' -d consultorio_medico -c "\\dt" 2>&1'
out, err = run(cmd)
if out: print(out)
if err: print('ERR: ' + err)

# 5. Test auth from n8n container with correct syntax
print('\n5. Test auth from n8n to postgres (n8n database)')
print('='*60)
cmd = 'sudo docker exec -i ' + N8N + ' sh -c "PGPASSWORD=' + P + ' psql -h postgres -U ' + U + ' -d n8n -c \'SELECT current_user, current_database()\'" 2>&1'
out, err = run(cmd)
if out: print(out)
if err: print('ERR: ' + err)

# 6. Check what DB n8n actually connects to (check n8n config in DB)
print('\n6. Check n8n migration/state in n8n database')
print('='*60)
cmd = 'sudo docker exec -i ' + PG + ' psql -U ' + U + ' -d n8n -c "SELECT table_name FROM information_schema.tables WHERE table_schema=\'public\'" 2>&1'
out, err = run(cmd)
if out: print(out)
if err: print('ERR: ' + err)

# 7. Check n8n migration_info if exists
print('\n7. Check for n8n migration table')
print('='*60)
cmd = 'sudo docker exec -i ' + PG + ' psql -U ' + U + ' -d n8n -c "SELECT * FROM information_schema.tables WHERE table_name LIKE \'%migration%\'" 2>&1'
out, err = run(cmd)
if out: print(out)
if err: print('ERR: ' + err)

# 8. Check if the role has password auth working
print('\n8. Test passwordless login via local socket (trust)')
print('='*60)
cmd = 'sudo docker exec -i ' + PG + ' psql -U ' + U + ' -d n8n -c "SELECT 1 as test" 2>&1'
out, err = run(cmd)
if out: print(out)
if err: print('ERR: ' + err)

# 9. Test if n8n can use psql from inside
print('\n9. Check if psql is available in n8n container')
print('='*60)
cmd = 'sudo docker exec -i ' + N8N + ' sh -c "which psql" 2>&1'
out, err = run(cmd)
if out: print(out)
if err: print('ERR: ' + err)

# 10. Check what database n8n was using when it crashed
# The error says "password authentication failed for user reece.schmeler67"
# This means n8n connected to postgres OK (port, host) but the auth failed
# This is typical when the password is wrong OR the database doesn't exist
print('\n10. Test connecting to wrong database')
print('='*60)
cmd = 'sudo docker exec -i ' + PG + ' psql -U ' + U + ' -d reece.schmeler67 -c "SELECT 1" 2>&1'
out, err = run(cmd)
if out: print(out)
if err: print('ERR: ' + err)

# 11. Check the old n8nEventLog to see what database n8n was trying to connect to
print('\n11. Check n8nEventLog for connection details')
print('='*60)
cmd = 'sudo docker exec -i ' + N8N + ' grep -i "database\|connect\|error\|fail\|password" /home/node/.n8n/n8nEventLog.log 2>&1 | tail -30'
out, err = run(cmd)
if out: print(out)
if err: print('ERR: ' + err)

# 12. Check n8n crash journal
print('\n12. Check crash journal')
print('='*60)
cmd = 'sudo docker exec -i ' + N8N + ' cat /home/node/.n8n/crash.journal 2>&1'
out, err = run(cmd)
if out: print(out)
if err: print('ERR: ' + err)

client.close()
print('\n' + '='*70)
print('PHASE 3 COMPLETE')
print('='*70)
