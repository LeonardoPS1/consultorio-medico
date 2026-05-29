"""Check all listening ports in n8n container"""
import paramiko

HOST = '51.222.207.250'
USER = 'ubuntu'
PASSWORD = 'Cool220479..@'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASSWORD)

N8N = 'aicore-n8nrunnerpostgresollama-a715gi-n8n-1'

print('=== All listening ports in n8n-1 ===')
cmd = f'sudo docker exec {N8N} sh -c "netstat -tlnp 2>/dev/null || ss -tlnp 2>/dev/null || cat /proc/net/tcp 2>/dev/null | grep :LISTEN || echo \"netstat/ss not available\""'
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
out = stdout.read().decode().strip()
err = stderr.read().decode().strip()
if out: print(out)
if err: print(f'ERR: {err}')

print('\n=== Checking for unix sockets ===')
cmd = f'sudo docker exec {N8N} sh -c "netstat -lxp 2>/dev/null || ss -lxp 2>/dev/null || find /var/run -type s 2>/dev/null | head -5 || echo \"no unix sockets check\""'
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
out = stdout.read().decode().strip()
err = stderr.read().decode().strip()
if out: print(out)
if err: print(f'ERR: {err}')

print('\n=== Checking n8n logs via docker inspect ===')
cmd = f'sudo docker inspect {N8N} | grep -A20 "LogPath\|Logs" 2>/dev/null || echo "no log info in inspect"'
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
out = stdout.read().decode().strip()
if out: print(out)

print('\n=== Try to start n8n in foreground to see output ===')
# This might interfere with the running container, so let's just check the entrypoint
cmd = f'sudo docker inspect {N8N} | grep -A5 "Entrypoint\|Command" 2>/dev/null'
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
out = stdout.read().decode().strip()
if out: print(out)

client.close()
