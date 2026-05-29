#!/usr/bin/env python3
"""Test n8n API from dashboard container with API key"""
import paramiko
import json

HOST = '51.222.207.250'
USER = 'ubuntu'
PASSWORD = 'Cool220479..@'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASSWORD)

# Get dashboard container ID
stdin, stdout, stderr = client.exec_command(
    'sudo docker ps --format "{{.ID}}" --filter name=app-hack --limit 1',
    timeout=15
)
cid = stdout.read().decode().strip()
print(f"Dashboard: {cid}")

# Get API key from dashboard env
cmd = f'sudo docker exec {cid} env 2>/dev/null | grep N8N_API_KEY'
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
api_key = stdout.read().decode().strip().split('=', 1)[1] if '=' in stdout.read().decode().strip() else ''
# Actually need to re-read
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
api_line = stdout.read().decode().strip()
api_key = api_line.split('=', 1)[1] if '=' in api_line else ''
print(f"API Key found: {'yes' if api_key else 'no'} ({len(api_key)} chars)")

# Test 1: Health endpoint (no auth)
print("\n=== Test 1: Health (no auth) ===")
code = 'fetch("https://n8n.aicorebots.com/healthz", {timeout: 5000}).then(r => r.text()).then(t => console.log("OK:" + t)).catch(e => console.log("ERR:" + e.message))'
cmd = f'sudo docker exec {cid} node -e "{code}" 2>/dev/null || echo "NODE_FAILED"'
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
out = stdout.read().decode().strip()
for line in out.split('\n'):
    print(f"  {line}")

# Test 2: Workflows with Bearer auth
print("\n=== Test 2: Workflows (Bearer auth) ===")
code = f'fetch("https://n8n.aicorebots.com/api/v1/workflows", {{headers: {{"Authorization": "Bearer {api_key}"}}, timeout: 5000}}).then(async r => {{console.log("STATUS:" + r.status); if(r.ok) {{const j=await r.json(); console.log("COUNT:" + (j.data?.length||0))}} else {{const t=await r.text(); console.log("BODY:" + t.slice(0,200))}}}}).catch(e => console.log("ERR:" + e.message))'
cmd = f'sudo docker exec {cid} node -e "{code}" 2>/dev/null || echo "NODE_FAILED"'
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
out = stdout.read().decode().strip()
for line in out.split('\n'):
    print(f"  {line}")

# Test 3: Workflows with X-N8N-API-KEY
print("\n=== Test 3: Workflows (X-N8N-API-KEY) ===")
code = f'fetch("https://n8n.aicorebots.com/api/v1/workflows", {{headers: {{"X-N8N-API-KEY": "{api_key}"}}, timeout: 5000}}).then(async r => {{console.log("STATUS:" + r.status); if(r.ok) {{const j=await r.json(); console.log("COUNT:" + (j.data?.length||0))}} else {{const t=await r.text(); console.log("BODY:" + t.slice(0,200))}}}}).catch(e => console.log("ERR:" + e.message))'
cmd = f'sudo docker exec {cid} node -e "{code}" 2>/dev/null || echo "NODE_FAILED"'
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
out = stdout.read().decode().strip()
for line in out.split('\n'):
    print(f"  {line}")

# Test 4: Create new API key via n8n API (if we have user auth)
print("\n=== Test 4: Check /api/v1/login (to get cookie) ===")
code = 'fetch("https://n8n.aicorebots.com/rest/login", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:"admin@consultorio.com",password:"admin123"}),timeout:5000}).then(async r => {console.log("STATUS:"+r.status);const t=await r.text();console.log("BODY:"+t.slice(0,300))}).catch(e=>console.log("ERR:"+e.message))'
cmd = f'sudo docker exec {cid} node -e "{code}" 2>/dev/null || echo "NODE_FAILED"'
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
out = stdout.read().decode().strip()
for line in out.split('\n'):
    print(f"  {line}")

client.close()
