"""Final verification of pgBouncer setup."""
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

out, err = run('sudo cat ' + COMPOSE_DIR + '/pgbouncer/userlist.txt')
print('=== userlist.txt ===')
print(out)

out, err = run('sudo head -15 ' + COMPOSE_DIR + '/pgbouncer/pgbouncer.ini')
print('=== pgbouncer.ini (primeras 15 lineas) ===')
print(out)

out, err = run('sudo sed -n "155,180p" ' + COMPOSE_DIR + '/docker-compose.yml')
print('=== pgbouncer service en compose (lineas 155-180) ===')
print(out)

out, err = run("sudo grep -c 'aicore-n8nrunnerpostgresollama-a715gi' " + COMPOSE_DIR + '/docker-compose.yml')
print('Red correcta mencionada ' + out.strip() + ' veces')

out, err = run("sudo grep -c 'aicore-net' " + COMPOSE_DIR + '/docker-compose.yml')
print('Red incorrecta (aicore-net) encontrada ' + out.strip() + ' veces')

client.close()
