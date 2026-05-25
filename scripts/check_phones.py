#!/usr/bin/env python3
"""Check phone formats in the database."""
import paramiko
import io, sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

HOST = '51.222.207.250'
USER = 'ubuntu'
PASS = 'Cool220479..@'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=15)

def run(cmd, timeout=15):
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    exit_status = stdout.channel.recv_exit_status()
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    return out + err, exit_status

container = "aicore-n8nrunnerpostgresollama-a715gi-postgres-1"
# Try different users
users = ["postgres", "dashboard_user", "app"]
for user in users:
    out, code = run(
        f"sudo docker exec -t {container} psql -U {user} -d consultorio_medico "
        "-c \"SELECT telefono, nombre FROM pacientes ORDER BY nombre LIMIT 10;\""
    )
    if "FATAL" not in out and "password" not in out:
        print(f"=== With user: {user} ===")
        print(out)
        break
    else:
        print(f"User '{user}': {out.strip()[:80]}...")

# Try with the app password
out, code = run(
    f"PGPASSWORD=gLfzAyEq0KQL4Qplamdlx8x9ouZdHcnP sudo docker exec -t {container} psql -U dashboard_user -d consultorio_medico "
    "-c \"SELECT telefono, nombre FROM pacientes ORDER BY nombre LIMIT 10;\""
)
print(f"=== With dashboard_user + password ===")
print(out)

client.close()
