#!/usr/bin/env python3
"""Apply migration 0015: hash_verificacion column to production."""
import paramiko
import sys

HOST = '51.222.207.250'
USER = 'ubuntu'
PASS = 'Cool220479..@'

SQL = """
ALTER TABLE recetas ADD COLUMN IF NOT EXISTS hash_verificacion VARCHAR(64);
CREATE INDEX IF NOT EXISTS idx_recetas_hash_verificacion ON recetas (hash_verificacion);
"""

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=15)

def run(cmd, timeout=30):
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    exit_status = stdout.channel.recv_exit_status()
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    return out + err, exit_status

# Find postgres container
print("[1/3] Finding postgres container...")
out, code = run("sudo docker ps --format '{{.Names}}'")
containers = [c.strip() for c in out.strip().split('\n') if c.strip()]
print(f"All containers: {containers}")
container = None
for c in containers:
    # Buscar solo contenedores que sean EXCLUSIVAMENTE postgres (no n8n-runner-postgres-...)
    if c.endswith('-postgres-1') or c == 'postgres' or 'postgres.' in c:
        container = c
        break
print(f"Postgres container: '{container}'")

# Apply SQL
print("[2/3] Applying migration 0015...")
# Try different user roles
for user in ['reece.schmeler67', 'dashboard_user']:
    print(f"\n  Trying with user: {user}")
    ok = True
    for stmt in SQL.strip().split(';'):
        stmt = stmt.strip()
        if not stmt:
            continue
        cmd = f'sudo docker exec -i {container} psql -U {user} -d consultorio_medico -c "{stmt}"'
        out, code = run(cmd, timeout=60)
        print(f"  -> {out.strip()[-300:]}")
        if code != 0:
            ok = False
            break
    if ok:
        print(f"  [OK] Migration applied with user: {user}")
        break
    else:
        print(f"  [FAIL] Try next user...")

# Verify
print("\n[3/3] Verifying column exists...")
verify_cmd = f"sudo docker exec -i {container} psql -U reece.schmeler67 -d consultorio_medico -c \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name='recetas' AND column_name='hash_verificacion';\""
out, code = run(verify_cmd)
print(out.strip())

print("[DONE] Migration 0015 applied")
client.close()
