"""Test n8n API via external URL"""
import paramiko
import json
import base64

HOST = '51.222.207.250'
USER = 'ubuntu'
PASSWORD = 'Cool220479..@'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASSWORD)

# Test external access to n8n
print('=== Testing external n8n access ===')
cmds = [
    'curl -k -s https://n8n.aicorebots.com/healthz 2>&1 || echo "healthz failed"',
    'curl -k -s -I https://n8n.aicorebots.com/ 2>&1 | head -5 || echo "no headers"',
    'curl -k -s https://n8n.aicorebots.com/rest/workflows 2>&1 | head -5 || echo "no workflows endpoint"',
]

for cmd in cmds:
    print(f'$ {cmd}')
    stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    if out: 
        # Truncate long output
        if len(out) > 200:
            out = out[:200] + "..."
        print(out)
    if err: print(f'ERR: {err}')
    print('---')

client.close()
