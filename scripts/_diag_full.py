#!/usr/bin/env python3
"""Full n8n API diagnosis from VPS"""
import paramiko

HOST = '51.222.207.250'
USER = 'ubuntu'
PASSWORD = 'Cool220479..@'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASSWORD)

def run(cmd):
    stdin, stdout, stderr = client.exec_command(cmd, timeout=30)
    exit_status = stdout.channel.recv_exit_status()
    out = stdout.read().decode('utf-8', errors='replace').strip()
    err = stderr.read().decode('utf-8', errors='replace').strip()
    return out, err, exit_status

# 1. Get dashboard container ID
print("=== Getting dashboard container ===")
out, _, _ = run('sudo docker ps --format "{{.ID}}|{{.Names}}" | grep app-hack | head -1 | cut -d"|" -f1')
cid = out.strip()
print(f"CID: [{cid}]")

if not cid:
    print("ERROR: No dashboard container found")
    exit(1)

# 2. Get API key
print("\n=== API key ===")
out, _, _ = run(f'sudo docker exec {cid} env | grep N8N_API_KEY')
api_key = out.split('=', 1)[1] if '=' in out else ''
print(f"  Found: {bool(api_key)}, Length: {len(api_key)}")

if not api_key:
    print("ERROR: No API key in dashboard env")
    exit(1)

# 3. Test health endpoint
print("\n=== Health (from node) ===")
code = "node -e \"fetch('https://n8n.aicorebots.com/healthz',{timeout:5000}).then(r=>r.text()).then(console.log).catch(e=>console.log('ERR:'+e.message))\""
out, _, _ = run(f'sudo docker exec {cid} {code}')
print(f"  {out[:200]}")

# 4. Test workflows with Bearer token
print("\n=== Workflows (Bearer auth) ===")
code = (
    "node -e \""
    "fetch('https://n8n.aicorebots.com/api/v1/workflows',"
    "{headers:{'Authorization':'Bearer " + api_key + "'},timeout:5000})"
    ".then(async r=>{console.log('STATUS:'+r.status);const t=await r.text();console.log(t.slice(0,500))})"
    ".catch(e=>console.log('ERR:'+e.message))\""
)
out, _, _ = run(f'sudo docker exec {cid} {code}')
for line in out.split('\n'):
    print(f"  {line}")

# 5. Test with X-N8N-API-KEY header
print("\n=== Workflows (X-N8N-API-KEY) ===")
code = (
    "node -e \""
    "fetch('https://n8n.aicorebots.com/api/v1/workflows',"
    "{headers:{'X-N8N-API-KEY':'" + api_key + "'},timeout:5000})"
    ".then(async r=>{console.log('STATUS:'+r.status);const t=await r.text();console.log(t.slice(0,500))})"
    ".catch(e=>console.log('ERR:'+e.message))\""
)
out, _, _ = run(f'sudo docker exec {cid} {code}')
for line in out.split('\n'):
    print(f"  {line}")

# 6. Check n8n config
print("\n=== n8n config ===")
out, _, _ = run('sudo docker ps -q -f name=n8n-1')
n8n_cid = out.strip()
print(f"n8n CID: {n8n_cid[:12] if n8n_cid else 'NOT FOUND'}")

if n8n_cid:
    out, _, _ = run(f'sudo docker exec {n8n_cid} cat /home/node/.n8n/config')
    if out:
        for line in out.split('\n')[:20]:
            low = line.lower()
            if 'api' in low or 'key' in low or 'auth' in low or 'security' in low:
                print(f"  {line}")
        print(f"  (first 600 chars)")
        print(f"  {out[:600]}")

client.close()
