"""Investigate n8n password authentication failure"""
import paramiko
import time

HOST = '51.222.207.250'
USER = 'ubuntu'
PASSWORD = 'Cool220479..@'

N8N = 'aicore-n8nrunnerpostgresollama-a715gi-n8n-1'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASSWORD)

def run(cmd, timeout=15):
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    return out, err

# ── Phase 1: Find the REAL n8n configuration ──

print('='*70)
print('PHASE 1: n8n Configuration Investigation')
print('='*70)

# 1. Check n8n config file
print('\n' + '='*60)
print('1. n8n config at /home/node/.n8n/config')
print('='*60)
out, err = run('sudo docker exec ' + N8N + ' cat /home/node/.n8n/config 2>&1')
if out: print(out)
if err: print('ERR: ' + err)

# 2. Check .n8n.json
print('\n' + '='*60)
print('2. Check for .n8n.json or other config files')
print('='*60)
out, err = run('sudo docker exec ' + N8N + ' ls -la /home/node/.n8n/ 2>&1')
if out: print(out)
if err: print('ERR: ' + err)

# 3. Check for database.json
print('\n' + '='*60)
print('3. Check for database.json')
print('='*60)
out, err = run('sudo docker exec ' + N8N + ' find /home/node/.n8n -name "*.json" -type f 2>&1')
if out: print(out)
if err: print('ERR: ' + err)

# 4. Check for config folder contents
print('\n' + '='*60)
print('4. Check /home/node/.n8n directory tree')
print('='*60)
out, err = run('sudo docker exec ' + N8N + ' find /home/node/.n8n -type f 2>&1')
if out: print(out)
if err: print('ERR: ' + err)

# 5. Check environment variables
print('\n' + '='*60)
print('5. Environment variables in n8n container')
print('='*60)
out, err = run('sudo docker exec ' + N8N + ' env 2>&1 | sort')
if out: print(out)
if err: print('ERR: ' + err)

# 6. Docker inspect - extract env
print('\n' + '='*60)
print('6. Docker inspect - Env, Cmd, Entrypoint')
print('='*60)
out, err = run('sudo docker inspect ' + N8N + ' 2>&1', timeout=30)
if out:
    import json
    try:
        data = json.loads(out)
        c = data[0]
        config = c.get('Config', {})
        print('Config.Env:')
        for e in config.get('Env', []):
            print('  ', e)
        print()
        print('Config.Cmd:', config.get('Cmd'))
        print('Config.Entrypoint:', config.get('Entrypoint'))
        print()
        # Also show mounts
        mounts = c.get('Mounts', [])
        print('Mounts:')
        for m in mounts:
            print('  ', m.get('Source'), '->', m.get('Destination'), '(', m.get('Type'), ')')
    except Exception as e:
        print('Parse error:', e)
        print('Raw output (first 5000 chars):')
        print(out[:5000])
if err: print('ERR: ' + err)

# 7. Find dokploy compose files
print('\n' + '='*60)
print('7. List compose directory')
print('='*60)
out, err = run('ls -la /etc/dokploy/compose/ 2>&1')
if out: print(out)
if err: print('ERR: ' + err)

# 8. Show the actual compose file for n8n
print('\n' + '='*60)
print('8. n8n compose file contents')
print('='*60)
out, err = run('cat /etc/dokploy/compose/aicore-n8nrunnerpostgresollama-a715gi/code/docker-compose.yml 2>&1')
if out: print(out)
if err: print('ERR: ' + err)

# 9. Recent n8n container logs
print('\n' + '='*60)
print('9. Recent n8n container logs (last 80 lines)')
print('='*60)
out, err = run('sudo docker logs ' + N8N + ' --tail 80 2>&1', timeout=30)
if out: print(out)
if err: print('ERR: ' + err)

# 10. n8n config with cat -A
print('\n' + '='*60)
print('10. n8n config with cat -A (show special chars)')
print('='*60)
out, err = run('sudo docker exec ' + N8N + ' cat -A /home/node/.n8n/config 2>&1')
if out: print(out)
if err: print('ERR: ' + err)

# 11. Check config for DB-related entries
print('\n' + '='*60)
print('11. Check config for database entries')
print('='*60)
out, err = run('sudo docker exec ' + N8N + ' grep -i -E "database|postgres|db_host|db_port|db_user|db_password|db_type|db_name" /home/node/.n8n/config 2>&1')
if out: print(out)
if err: print('ERR: ' + err)

# 12. Check for any config files in node home
print('\n' + '='*60)
print('12. Check for config files in /home/node')
print('='*60)
out, err = run('sudo docker exec ' + N8N + ' find /home/node -maxdepth 2 -name "*.json" -o -name "*.yml" -o -name "*.yaml" -o -name "*.env" -o -name ".env*" 2>&1')
if out: print(out)
if err: print('ERR: ' + err)

# 13. Check docker-compose files in /opt
print('\n' + '='*60)
print('13. Look for docker-compose files anywhere')
print('='*60)
out, err = run('find / -name "docker-compose.yml" -not -path "/proc/*" -not -path "/sys/*" 2>/dev/null')
if out: print(out)
if err: print('ERR: ' + err)

# 14. Check if there's an .env file in the compose directory
print('\n' + '='*60)
print('14. Check for .env files in compose directory')
print('='*60)
out, err = run('find /etc/dokploy -name ".env*" -type f 2>/dev/null')
if out: print(out)
if err: print('ERR: ' + err)

# 15. List all files in compose directory
print('\n' + '='*60)
print('15. List all files in n8n compose dir')
print('='*60)
out, err = run('ls -la /etc/dokploy/compose/aicore-n8nrunnerpostgresollama-a715gi/code/ 2>&1')
if out: print(out)
if err: print('ERR: ' + err)

# 16. Check if there's dokploy.json or similar
print('\n' + '='*60)
print('16. Check for dokploy config files')
print('='*60)
out, err = run('find /etc/dokploy -name "*.json" -type f 2>/dev/null | head -10')
if out: print(out)
if err: print('ERR: ' + err)

# 17. Check the full n8n config file line by line
print('\n' + '='*60)
print('17. n8n config file with line numbers')
print('='*60)
out, err = run('sudo docker exec ' + N8N + ' cat -n /home/node/.n8n/config 2>&1')
if out: print(out)
if err: print('ERR: ' + err)

client.close()
print('\n' + '='*70)
print('INVESTIGATION COMPLETE')
print('='*70)
