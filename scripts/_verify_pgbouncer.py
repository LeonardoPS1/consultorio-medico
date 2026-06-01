"""Verify pgBouncer setup on VPS."""
import paramiko

HOST = '51.222.207.250'
USER = 'ubuntu'
PASS = 'Cool220479..@'
COMPOSE_DIR = '/etc/dokploy/compose/aicore-n8nrunnerpostgresollama-a715gi/code'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS)

def run(cmd):
    stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
    return stdout.read().decode(), stderr.read().decode()

print("=== Archivos pgbouncer ===")
out, err = run('sudo ls -la ' + COMPOSE_DIR + '/pgbouncer/')
print(out)

print("=== Ultimas 30 lineas del compose ===")
out, err = run('sudo tail -30 ' + COMPOSE_DIR + '/docker-compose.yml')
print(out)

print("=== Buscando pgbouncer en compose ===")
out, err = run("sudo grep -n 'pgbouncer' " + COMPOSE_DIR + '/docker-compose.yml')
print(out)

client.close()
