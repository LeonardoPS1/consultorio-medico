#!/usr/bin/env python3
"""Diagnose n8n network connectivity from VPS"""
import paramiko
import os

HOST = '51.222.207.250'
USER = 'ubuntu'
PASSWORD = 'Cool220479..@'

env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
api_key = ''
with open(env_path) as f:
    for line in f:
        if line.startswith('N8N_API_KEY='):
            api_key = line.split('=', 1)[1].strip()

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASSWORD)

# Always run docker commands with sudo
def sudo_docker(cmd):
    return f'sudo docker {cmd}'

def run(cmd, timeout=30):
    print(f"\n=== {cmd[:80]}... ===")
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    exit_status = stdout.channel.recv_exit_status()
    out = stdout.read().decode('utf-8', errors='replace').strip()
    err = stderr.read().decode('utf-8', errors='replace').strip()
    if out:
        for line in out.split('\n'):
            print(f"  {line}")
    if err:
        for line in err.split('\n'):
            print(f"  [ERR] {line}")
    print(f"  exit: {exit_status}")

# 1. List Docker networks
run('sudo docker network ls --format "{{.Name}}"')

# 2. Find containers
run('sudo docker ps --format "{{.Names}}"')

# 3. Check n8n health from host (port might not be exposed)
run('curl -s -o /dev/null -w "%{http_code}" http://localhost:5678/healthz || echo "FAILED"')

# 4. Check n8n container env for API key
run('sudo docker exec $(sudo docker ps -q -f name=n8n-1) env 2>/dev/null | grep -i N8N || echo "NO_N8N_ENV_MATCH"')

# 5. Try calling n8n API from INSIDE the n8n container
run('sudo docker exec $(sudo docker ps -q -f name=n8n-1) curl -s -w "\\nHTTP:%{http_code}" http://localhost:5678/api/v1/workflows 2>/dev/null || echo "INSIDE_N8N_FAILED"')

# 6. Try calling n8n API from INSIDE the n8n container with Bearer auth
if api_key:
    run(f'sudo docker exec $(sudo docker ps -q -f name=n8n-1) curl -s -w "\\nHTTP:%{{http_code}}" -H "Authorization: Bearer {api_key}" http://localhost:5678/api/v1/workflows 2>/dev/null || echo "BEARER_FAILED"')

# 7. Check what port n8n container is listening on
run('sudo docker port $(sudo docker ps -q -f name=n8n-1) 2>/dev/null || echo "NO_PORT_INFO"')

# 8. Inspect n8n container networks
run('sudo docker inspect $(sudo docker ps -q -f name=n8n-1) --format "{{json .NetworkSettings.Networks}}" 2>/dev/null | head -200 || echo "INSPECT_FAILED"')

# 9. Check dashboard container env
dashboard_container = 'sudo docker ps --format "{{.Names}}" | grep -i aicoremed || echo "NO_DASHBOARD"'
run(dashboard_container)

client.close()
