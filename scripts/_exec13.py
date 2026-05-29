"""Connect to n8n API via Docker network"""
import paramiko

HOST = '51.222.207.250'
USER = 'ubuntu'
PASSWORD = 'Cool220479..@'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASSWORD)

# Check if we can use busybox/alpine to curl
print('=== Trying busybox container ===')
cmd = 'sudo docker pull alpine:latest 2>&1 | tail -3; sudo docker run --rm --network aicore-n8nrunnerpostgresollama-a715gi alpine:latest wget -qO- http://n8n:5678/healthz 2>&1'
stdin, stdout, stderr = client.exec_command(cmd, timeout=60)
out = stdout.read().decode().strip()
err = stderr.read().decode().strip()
if out: print(out)
if err: print(f'ERR: {err}')

# Also try the dashboard app container (it talks to n8n)
print('\n=== Trying through dashboard container ===')
cmd = 'sudo docker exec app-hack-back-end-sensor-jd2eu3.1.7aogczjm3ro4wkpxizzh08t14 nslookup n8n 2>&1 || echo "no nslookup in dashboard"'
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
out = stdout.read().decode().strip()
if out: print(out)

client.close()