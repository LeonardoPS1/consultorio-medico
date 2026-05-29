"""Deep n8n DB investigation"""
import paramiko
import base64

HOST = '51.222.207.250'
USER = 'ubuntu'
PASSWORD = 'Cool220479..@'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASSWORD)

N8N = 'aicore-n8nrunnerpostgresollama-a715gi-n8n-1'
PG = 'aicore-n8nrunnerpostgresollama-a715gi-postgres-1'

# Full n8n container logs
print('=== Last 50 lines of n8n logs ===')
cmd = f'sudo docker logs {N8N} --tail 50 2>&1'
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
out = stdout.read().decode().strip()
if out: print(out)

# Check n8n config files directory
print('\n=== Check n8n bin config dir ===')
cmd = f'sudo docker exec {N8N} sh -c "ls -la /usr/local/lib/node_modules/n8n/config/ 2>/dev/null || echo no config dir"'
stdin, stdout, stderr = client.exec_command(cmd, timeout=10)
out = stdout.read().decode().strip()
if out: print(out)

# Check if N8N_CONFIG_FILES is set
print('\n=== Check N8N_CONFIG_FILES ===')
cmd = f'sudo docker exec {N8N} sh -c "printenv | grep N8N_CONFIG"'
stdin, stdout, stderr = client.exec_command(cmd, timeout=10)
out = stdout.read().decode().strip()
if out: print(out)
else:
    print("N8N_CONFIG_FILES not set")

# Check the crash journal
print('\n=== Check n8n crash journal ===')
cmd = f'sudo docker exec {N8N} sh -c "cat /home/node/.n8n/crash.journal 2>/dev/null || echo no crash journal"'
stdin, stdout, stderr = client.exec_command(cmd, timeout=10)
out = stdout.read().decode().strip()
if out: print(out)

# Check what the n8n main process cmd line is
print('\n=== Check n8n main process cmdline ===')
cmd = f'sudo docker exec {N8N} sh -c "cat /proc/7/cmdline 2>/dev/null | tr \\\\0 \\\\  || echo no proc 7"'
stdin, stdout, stderr = client.exec_command(cmd, timeout=10)
out = stdout.read().decode().strip()
if out: print(out)

# Try to check the n8n schema for postgres config
print('\n=== Check n8n config schema for database settings ===')
cmd = f'sudo docker exec {N8N} sh -c "node -e \\"const c = require(\\'/usr/local/lib/node_modules/n8n/dist/config/schema.js\\'); console.log(Object.keys(c).slice(0,20).join(\\'\\\\n\\'));\\"" 2>&1'
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
out = stdout.read().decode().strip()
err = stderr.read().decode().strip()
if out: print(out)
if err: print(f'ERR: {err}')

# Let's try to actually start n8n and capture its stderr/stdout in more detail
print('\n=== Try running n8n with --help to see if DB issue is consistent ===')
cmd = f'sudo docker exec {N8N} sh -c "N8N_DIAGNOSTICS_ENABLED=false n8n --help 2>&1 | head -5"'
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
out = stdout.read().decode().strip()
err = stderr.read().decode().strip()
if out: print(out)
if err: print(f'ERR: {err}')

client.close()
