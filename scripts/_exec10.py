"""Find n8n web server"""
import paramiko

HOST = '51.222.207.250'
USER = 'ubuntu'
PASSWORD = 'Cool220479..@'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASSWORD)

# Check which container exposes port 5678
cmds = [
    'sudo docker ps --format "{{.Names}} | {{.Ports}}"',
    'sudo docker port aicore-n8nrunnerpostgresollama-a715gi-n8n-1 2>&1',
    'sudo docker port aicore-n8nrunnerpostgresollama-a715gi-n8n-worker-1 2>&1',
    # Try host port
    'curl -s http://localhost:5678/healthz 2>&1 | head -5 || echo "no host port 5678"',
    'curl -s https://n8n.aicorebots.com/rest/workflows 2>&1 | head -5 || echo "no external"',
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
