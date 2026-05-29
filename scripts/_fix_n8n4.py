"""Find pg module in n8n and test connection properly"""
import paramiko
import base64

HOST = '51.222.207.250'
USER = 'ubuntu'
PASSWORD = 'Cool220479..@'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASSWORD)

N8N = 'aicore-n8nrunnerpostgresollama-a715gi-n8n-1'

# Find pg module location
print('=== Find pg module ===')
cmd = f'sudo docker exec {N8N} sh -c "find /usr/local/lib/node_modules -name \\"pg\\" -type d -maxdepth 4 2>/dev/null | head -5"'
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
out = stdout.read().decode().strip()
if out: print(out)

cmd = f'sudo docker exec {N8N} sh -c "find /home/node -name \\"pg\\" -type d -maxdepth 5 2>/dev/null | head -5"'
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
out = stdout.read().decode().strip()
if out: print(out)

# Check if pg is in n8n's node_modules
cmd = f'sudo docker exec {N8N} sh -c "ls /usr/local/lib/node_modules/n8n/node_modules/pg/package.json 2>/dev/null || ls /usr/local/lib/node_modules/pg/package.json 2>/dev/null || echo pg not found at common locations"'
stdin, stdout, stderr = client.exec_command(cmd, timeout=10)
out = stdout.read().decode().strip()
if out: print(out)

# Let's look at n8n's package.json to find pg
cmd = f'sudo docker exec {N8N} sh -c "cat /usr/local/lib/node_modules/n8n/node_modules/.package-lock.json 2>/dev/null | head -20 || echo no lock"'
stdin, stdout, stderr = client.exec_command(cmd, timeout=10)
out = stdout.read().decode().strip()
if out: print(out)

# Try to find pg module in n8n's dependencies
print('\n=== Search for pg module in n8n installed packages ===')
cmd = f'sudo docker exec {N8N} sh -c "find / -name \\"pg\\" -type d -path \\"*/node_modules/*\\" 2>/dev/null | head -10"'
stdin, stdout, stderr = client.exec_command(cmd, timeout=20)
out = stdout.read().decode().strip()
if out: print(out)
else:
    print("No pg directory found in node_modules")
    
# Look at the full n8n installation
print('\n=== Check n8n installation structure ===')
cmd = f'sudo docker exec {N8N} sh -c "ls /usr/local/lib/node_modules/ 2>/dev/null | head -20"'
stdin, stdout, stderr = client.exec_command(cmd, timeout=10)
out = stdout.read().decode().strip()
if out: print(out)

# Maybe pg is installed at a non-standard path
print('\n=== Check if we can require pg via NODE_PATH ===')
cmd = f'sudo docker exec {N8N} sh -c "echo \\$NODE_PATH 2>&1"'
stdin, stdout, stderr = client.exec_command(cmd, timeout=10)
out = stdout.read().decode().strip()
if out: print(out)

# Let's also check n8n's actual DB initialization code to understand how it connects
print('\n=== Check n8n binary link ===')
cmd = f'sudo docker exec {N8N} sh -c "which n8n && ls -la \\$(which n8n) 2>&1"'
stdin, stdout, stderr = client.exec_command(cmd, timeout=10)
out = stdout.read().decode().strip()
if out: print(out)

# Check the n8n bin script for how it initializes
print('\n=== Check n8n bin ===')
cmd = f'sudo docker exec {N8N} sh -c "cat /usr/local/lib/node_modules/n8n/bin/n8n 2>/dev/null || cat /usr/local/bin/n8n 2>/dev/null | head -20"'
stdin, stdout, stderr = client.exec_command(cmd, timeout=10)
out = stdout.read().decode().strip()
if out: print(out)

client.close()
