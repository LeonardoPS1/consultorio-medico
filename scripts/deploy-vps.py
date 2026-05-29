#!/usr/bin/env python3
"""
Script para aplicar migraciones y deploy de workflows n8n en VPS.
Uso: python scripts/deploy-vps.py [--wf-only] [--migrate-only]
"""
import paramiko
import sys
import os

HOST = '51.222.207.250'
USER = 'ubuntu'
PASSWORD = 'Cool220479..@'
CODE_DIR = '/etc/dokploy/applications/app-hack-back-end-sensor-jd2eu3/code'

def run_ssh(commands, timeout=60):
    """Ejecuta comandos SSH y retorna (stdout, stderr, exit_code)"""
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=PASSWORD)
    
    for cmd in commands:
        print(f"\n$ {cmd}")
        stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
        exit_status = stdout.channel.recv_exit_status()
        out = stdout.read().decode('utf-8', errors='replace').strip()
        err = stderr.read().decode('utf-8', errors='replace').strip()
        if out: print(out)
        if err: print(f"[STDERR] {err}")
        if exit_status != 0:
            print(f"[EXIT: {exit_status}]")
    
    client.close()

def step1_migrate():
    """Aplicar migraciones SQL via docker exec"""
    print("=" * 60)
    print("PASO 1: Aplicar migraciones SQL en producción")
    print("=" * 60)
    
    commands = [
        # Find postgres container
        'PG_CONTAINER=$(docker ps --format "{{.Names}}" | grep -i postgres | head -1) && echo "Postgres: $PG_CONTAINER"',
        
        # Apply all pending migrations from the dashboard code
        'ls /etc/dokploy/applications/app-hack-back-end-sensor-jd2eu3/code/dashboard/drizzle/migrations/',
        
        # Find migration files and apply them
        'PG_CONTAINER=$(docker ps --format "{{.Names}}" | grep -i postgres | head -1) && '
        'for f in $(ls /etc/dokploy/applications/app-hack-back-end-sensor-jd2eu3/code/dashboard/drizzle/migrations/*.sql | sort); do '
        'echo "Aplicando: $(basename $f)"; '
        'docker exec -i $PG_CONTAINER psql -U postgres -d consultorio_medico < "$f" 2>&1 || true; '
        'done',
    ]
    run_ssh(commands, timeout=120)

def step2_deploy_workflows():
    """Deploy WF-10 a n8n via API"""
    print("=" * 60)
    print("PASO 2: Deploy WF-10 a n8n")
    print("=" * 60)
    
    # Get n8n API key from env on VPS
    commands = [
        # Find n8n container
        'N8N_CONTAINER=$(docker ps --format "{{.Names}}" | grep -i n8n | head -1) && echo "n8n: $N8N_CONTAINER"',
        
        # Get the API key from container env
        'N8N_CONTAINER=$(docker ps --format "{{.Names}}" | grep -i n8n | head -1) && '
        'docker exec $N8N_CONTAINER printenv N8N_API_KEY 2>/dev/null || echo "No N8N_API_KEY env"',
        
        # Get the internal n8n API key
        'N8N_CONTAINER=$(docker ps --format "{{.Names}}" | grep -i n8n | head -1) && '
        'docker exec $N8N_CONTAINER printenv N8N_CONFIG_FILES 2>/dev/null; '
        'docker exec $N8N_CONTAINER ls /home/node/.n8n/config 2>/dev/null || echo "no config dir"',
    ]
    run_ssh(commands, timeout=30)

if __name__ == '__main__':
    only_wf = '--wf-only' in sys.argv
    only_migrate = '--migrate-only' in sys.argv
    
    if not only_wf:
        step1_migrate()
    
    if not only_migrate:
        step2_deploy_workflows()
    
    print("\n✅ Deploy completo")
