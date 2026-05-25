#!/usr/bin/env python3
"""Check env and n8n on VPS."""
import paramiko
import io, sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

HOST = '51.222.207.250'
USER = 'ubuntu'
PASS = 'Cool220479..@'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=15)

def run(cmd, timeout=30):
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    exit_status = stdout.channel.recv_exit_status()
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    return out + err, exit_status

# Check env vars of the dashboard container
out, _ = run(
    "sudo docker inspect $(sudo docker ps --format '{{.Names}}' | grep -v dokploy | grep -v postgres | grep -v n8n | grep -v ollama | grep -v redis) "
    "--format='{{range .Config.Env}}{{println .}}{{end}}' | grep -E 'AUTH_SECRET|NEXTAUTH_URL|NEXT_PUBLIC_APP_URL'"
)
print("=== Dashboard env vars ===")
print(out)

# Check the actual deploy path to see if there was a build issue
out2, _ = run(
    "sudo docker logs $(sudo docker ps --format '{{.Names}}' | grep -v dokploy | grep -v postgres | grep -v n8n | grep -v ollama | grep -v redis) --tail 30 2>&1 | grep -v '^$' | tail -5"
)
print("=== Recent container logs ===")
print(out2)

client.close()
