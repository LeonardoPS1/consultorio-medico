#!/usr/bin/env python3
"""Check dashboard container env vars for N8N"""
import paramiko
import json

HOST = '51.222.207.250'
USER = 'ubuntu'
PASSWORD = 'Cool220479..@'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASSWORD)

# 1. List all containers to find dashboard
print("=== All containers ===")
stdin, stdout, stderr = client.exec_command('sudo docker ps --format "{{.ID}}\t{{.Names}}"', timeout=15)
out = stdout.read().decode().strip()
for line in out.split('\n'):
    print(f"  {line}")

# Find dashboard container - look for names with hack or med
dashboard_cid = ''
for line in out.split('\n'):
    parts = line.split('\t')
    if len(parts) == 2:
        cid, name = parts
        if 'hack' in name or 'med' in name.lower():
            dashboard_cid = cid
            print(f"\n=== Found dashboard: {name} ({cid}) ===")
            break

if not dashboard_cid:
    print("ERROR: No dashboard container found")
    client.close()
    exit(1)

# 2. Check env vars for N8N
print("\n=== N8N env vars in dashboard ===")
for prefix in ['N8N', 'URL']:
    cmd = f'sudo docker exec {dashboard_cid} env 2>/dev/null | grep -i {prefix} || echo "NO_{prefix}_ENV_VARS"'
    stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
    out = stdout.read().decode('utf-8', errors='replace').strip()
    for line in out.split('\n'):
        print(f"  {line}")

# 3. Check DNS resolution
print("\n=== DNS resolution ===")
for hostname in ['n8n', 'postgres', 'ollama']:
    cmd = f'sudo docker exec {dashboard_cid} getent hosts {hostname} 2>/dev/null || echo "NOT_RESOLVABLE"'
    stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
    out = stdout.read().decode().strip()
    print(f"  {hostname}: {out}")

# 4. Test n8n connectivity
print("\n=== n8n connectivity from dashboard ===")
for url in ['http://n8n:5678/healthz', 'http://172.19.0.5:5678/healthz']:
    cmd = f'sudo docker exec {dashboard_cid} wget -q -O - {url} --timeout=5 2>/dev/null || echo "FAILED"'
    stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
    out = stdout.read().decode().strip()
    print(f"  {url}: {out}")

# 5. Check if node is available for a fetch test
print("\n=== Node.js fetch test ===")
cmd = f'sudo docker exec {dashboard_cid} node -e "fetch(\'http://n8n:5678/healthz\', {{timeout: 5000}}).then(r => r.text()).then(console.log).catch(e => console.log(\'ERR:\' + e.message))" 2>/dev/null || echo "NODE_TEST_FAILED"'
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
out = stdout.read().decode().strip()
for line in out.split('\n'):
    print(f"  {line}")

# 6. Dashboard networks
print("\n=== Dashboard networks ===")
cmd = f'sudo docker inspect {dashboard_cid} --format "{{{{json .NetworkSettings.Networks}}}}" 2>/dev/null'
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
out = stdout.read().decode().strip()
if out:
    nets = json.loads(out)
    for net_name, net_info in nets.items():
        print(f"  {net_name}: {net_info.get('IPAddress', 'N/A')}")

# 7. Test via public URL
print("\n=== Test via public URL ===")
cmd = f'sudo docker exec {dashboard_cid} wget -q -O - https://n8n.aicorebots.com/healthz --timeout=5 2>/dev/null || echo "PUBLIC_FAILED"'
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
out = stdout.read().decode().strip()
print(f"  https://n8n.aicorebots.com/healthz: {out}")

# 8. All env vars
print("\n=== All env (N8N/URL/API related) ===")
cmd = f'sudo docker inspect {dashboard_cid} --format "{{{{json .Config.Env}}}}" 2>/dev/null'
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
out = stdout.read().decode().strip()
if out:
    try:
        env_list = json.loads(out)
        for e in env_list:
            if 'N8N' in e or 'URL' in e or 'API' in e or 'BASE' in e:
                print(f"  {e}")
    except:
        print(f"  (parse error)")

client.close()
