"""Find postgres credentials"""
import paramiko

HOST = '51.222.207.250'
USER = 'ubuntu'
PASSWORD = 'Cool220479..@'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASSWORD)

PG = 'aicore-n8nrunnerpostgresollama-a715gi-postgres-1'

# Check pg env vars
cmds = [
    f'sudo docker inspect {PG} | grep -i "user\\|POSTGRES_USER\\|POSTGRES_PASSWORD\\|POSTGRES_DB" | head -20',
    f'sudo docker exec {PG} printenv | grep -i postgres',
    f'sudo docker exec {PG} ls /docker-entrypoint-initdb.d/ 2>/dev/null',
    # Also check with the container user
    f'sudo docker exec {PG} whoami 2>&1',
    f'sudo docker exec {PG} psql -U dashboard_user -d consultorio_medico -c "SELECT current_user" 2>&1',
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
