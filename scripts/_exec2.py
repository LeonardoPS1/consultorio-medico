"""Check postgres users and connect"""
import paramiko

HOST = '51.222.207.250'
USER = 'ubuntu'
PASSWORD = 'Cool220479..@'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASSWORD)

PG = 'aicore-n8nrunnerpostgresollama-a715gi-postgres-1'

# Check what users exist
cmds = [
    f'sudo docker exec {PG} psql -U postgres -c "SELECT usename FROM pg_catalog.pg_user" 2>&1',
    f'sudo docker exec {PG} psql -U postgres -c "\\l" 2>&1',
    f'sudo docker exec {PG} psql -U postgres -c "SELECT current_database(), current_user, version()" 2>&1',
    f'sudo docker exec {PG} psql -U postgres -d consultorio_medico -c "SELECT current_user" 2>&1',
]

for cmd in cmds:
    print(f'$ {cmd}')
    stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    if out: print(out)
    if err: print(f'ERR: {err}')
    print('---')

client.close()
