#!/usr/bin/env python3
"""Deploy script for Consultorio Medico dashboard on VPS."""
import paramiko
import time
import sys
import io

# Force UTF-8 output
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

HOST = '51.222.207.250'
USER = 'ubuntu'
PASS = 'Cool220479..@'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=15)

def run_cmd(cmd, timeout=60):
    """Run a command and return output."""
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    exit_status = stdout.channel.recv_exit_status()
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    return out + err, exit_status

def safe_print(text, max_len=500):
    """Print text safely, handling encoding issues."""
    try:
        if max_len and len(text) > max_len:
            text = text[-max_len:]
        print(text)
    except:
        print("[output truncated due to encoding]")

print("=" * 60)
print("[DEPLOY] Consultorio Medico Dashboard")
print("=" * 60)

# 1. Pull latest code
print("\n[1/4] Pulling latest code...")
out, code = run_cmd("cd /etc/dokploy/applications/app-hack-back-end-sensor-jd2eu3/code && sudo git config --global --add safe.directory /etc/dokploy/applications/app-hack-back-end-sensor-jd2eu3/code && sudo git fetch origin main && sudo git reset --hard origin/main", timeout=30)
print(out[-300:])
if code != 0:
    print("[ERROR] Git pull failed")
    sys.exit(1)
print("[OK] Git pull OK")

# 2. Build Docker image
print("\n[2/4] Building Docker image (this takes a few minutes)...")
out, code = run_cmd(
    "cd /etc/dokploy/applications/app-hack-back-end-sensor-jd2eu3/code && "
    "sudo docker compose -f docker-compose.yml build --no-cache dashboard 2>&1",
    timeout=240
)
safe_print(out)
if "ERROR" in out or code != 0:
    print("[ERROR] Docker build failed")
    sys.exit(1)
print("[OK] Docker build OK")

# 3. Force update service
print("\n[3/4] Restarting Docker service...")
out, code = run_cmd(
    "sudo docker service update --force app-hack-back-end-sensor-jd2eu3 2>&1",
    timeout=30
)
print(out[-300:])
print("[OK] Service update command sent")

# 4. Wait and check health
print("\n[4/4] Waiting 20s for service to stabilize...")
time.sleep(20)

print("\nChecking health endpoint...")
out, code = run_cmd("curl -s --max-time 10 https://med.aicorebots.com/api/health", timeout=15)
print(f"Health response: {out[:200]}")
if '"ok":true' in out or '"status":"ok"' in out:
    print("[OK] Health check PASSED")
else:
    print("[WARN] Health check might need more time, checking logs...")
    out, code = run_cmd("sudo docker service ps app-hack-back-end-sensor-jd2eu3 --no-trunc 2>&1 | head -10", timeout=15)
    print(out[:500])

client.close()
print("\n" + "=" * 60)
print("[DONE] Deploy process completed!")
print("=" * 60)
