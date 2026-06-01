"""Read full compose from VPS."""
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

out, err = run('sudo cat ' + COMPOSE_DIR + '/docker-compose.yml')
print(out)
client.close()
