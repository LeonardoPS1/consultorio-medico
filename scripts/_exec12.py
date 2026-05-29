"""Check n8n process details"""
import paramiko

HOST = '51.222.207.250'
USER = 'ubuntu'
PASSWORD = 'Cool220479..@'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASSWORD)

# Check both containers
containers = [
    'aicore-n8nrunnerpostgresollama-a715gi-n8n-1',
    'aicore-n8nrunnerpostgresollama-a715gi-n8n-worker-1',
]

for c in containers:
    print(f'\n=== Container: {c} ===')
    cmds = [
        f'sudo docker exec {c} ps aux 2>&1',
        f'sudo docker exec {c} cat /proc/net/tcp 2>&1',
        f'sudo docker exec {c} printenv | sort 2>&1',
    ]
    for cmd in cmds:
        print(f'$ {cmd}')
        stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
        out = stdout.read().decode().strip()
        err = stderr.read().decode().strip()
        if out: 
            lines = out.split('\n')
            for l in lines[:30]:
                print(l)
        if err: print(f'ERR: {err[:200]}')
        print('---')

client.close()
