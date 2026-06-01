"""Rewrite the docker-compose.yml on VPS with correct pgBouncer placement."""
import paramiko, base64

HOST = '51.222.207.250'
USER = 'ubuntu'
PASS = 'Cool220479..@'
COMPOSE_DIR = '/etc/dokploy/compose/aicore-n8nrunnerpostgresollama-a715gi/code'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS)

def run(cmd, timeout=20):
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    return stdout.read().decode(), stderr.read().decode(), stdout.channel.recv_exit_status()

compose = """services:
  n8n:
    image: n8nio/n8n:latest
    pull_policy: always
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - N8N_HOST=${N8N_HOST}
      - N8N_PORT=${N8N_PORT}
      - N8N_PROTOCOL=https
      - DB_TYPE=postgresdb
      - DB_POSTGRESDB_DATABASE=${POSTGRES_DB}
      - DB_POSTGRESDB_HOST=postgres
      - DB_POSTGRESDB_USER=${POSTGRES_USER}
      - DB_POSTGRESDB_PASSWORD=${POSTGRES_PASSWORD}
      - DB_POSTGRESDB_DATABASE=n8n
      - N8N_DIAGNOSTICS_ENABLED=false
      - N8N_PERSONALIZATION_ENABLED=true
      - N8N_ENCRYPTION_KEY=${ENCRYPTION_KEY}
      - N8N_USER_MANAGEMENT_JWT_SECRET
      - N8N_SECURE_COOKIE=true
      - N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS=true
      - N8N_BLOCK_ENV_ACCESS_IN_NODE=true
      - N8N_PROXY_HOPS=${PROXY_HOPS:-1}
      - WEBHOOK_URL=https://${N8N_HOST}/
      - GENERIC_TIMEZONE=${GENERIC_TIMEZONE}
      - N8N_TEMPLATES_ENABLED=true
      - N8N_HIRING_BANNER_ENABLED=false
      - OFFLOAD_MANUAL_EXECUTIONS_TO_WORKERS=true
      - OLLAMA_HOST=${OLLAMA_HOST:-ollama:11434}
      - N8N_RUNNERS_ENABLED=true
      - N8N_RUNNERS_MODE=external
      - N8N_RUNNERS_BROKER_LISTEN_ADDRESS=0.0.0.0
      - N8N_RUNNERS_AUTH_TOKEN=${N8N_RUNNERS_SECRET}
      - N8N_NATIVE_PYTHON_RUNNER=true
      - N8N_RUNNERS_MAX_CONCURRENCY=50
      - EXECUTIONS_DATA_PRUNE=true
      - EXECUTIONS_DATA_MAX_AGE=7
      - EXECUTIONS_MODE=queue
      - QUEUE_BULL_REDIS_HOST=redis
      - QUEUE_BULL_REDIS_PORT=6379
    volumes:
      - n8n_data:/home/node/.n8n
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - aicore-n8nrunnerpostgresollama-a715gi
    labels:
      - traefik.http.routers.aicore-n8nrunnerpostgresollama-a715gi-5-web.rule=Host(`n8n.aicorebots.com`)
      - traefik.http.routers.aicore-n8nrunnerpostgresollama-a715gi-5-web.entrypoints=web
      - traefik.http.services.aicore-n8nrunnerpostgresollama-a715gi-5-web.loadbalancer.server.port=5678
      - traefik.http.routers.aicore-n8nrunnerpostgresollama-a715gi-5-web.service=aicore-n8nrunnerpostgresollama-a715gi-5-web
      - traefik.http.routers.aicore-n8nrunnerpostgresollama-a715gi-5-web.middlewares=redirect-to-https@file
      - traefik.http.routers.aicore-n8nrunnerpostgresollama-a715gi-5-websecure.rule=Host(`n8n.aicorebots.com`)
      - traefik.http.routers.aicore-n8nrunnerpostgresollama-a715gi-5-websecure.entrypoints=websecure
      - traefik.http.services.aicore-n8nrunnerpostgresollama-a715gi-5-websecure.loadbalancer.server.port=5678
      - traefik.http.routers.aicore-n8nrunnerpostgresollama-a715gi-5-websecure.service=aicore-n8nrunnerpostgresollama-a715gi-5-websecure
      - traefik.http.routers.aicore-n8nrunnerpostgresollama-a715gi-5-websecure.tls.certresolver=letsencrypt
      - traefik.enable=true
  n8n-worker:
    image: docker.n8n.io/n8nio/n8n:latest
    restart: always
    command: worker
    environment:
      - NODE_ENV=production
      - N8N_HOST=${N8N_HOST}
      - N8N_PORT=${N8N_PORT}
      - N8N_PROTOCOL=https
      - EXECUTIONS_MODE=queue
      - DB_TYPE=postgresdb
      - DB_POSTGRESDB_HOST=postgres
      - DB_POSTGRESDB_USER=${POSTGRES_USER}
      - DB_POSTGRESDB_PASSWORD=${POSTGRES_PASSWORD}
      - N8N_ENCRYPTION_KEY=${ENCRYPTION_KEY}
      - N8N_SECURE_COOKIE=true
      - N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS=true
      - N8N_BLOCK_ENV_ACCESS_IN_NODE=true
      - N8N_PROXY_HOPS=${PROXY_HOPS}
      - WEBHOOK_URL=https://${N8N_HOST}/
      - GENERIC_TIMEZONE=${GENERIC_TIMEZONE}
      - QUEUE_BULL_REDIS_HOST=redis
      - QUEUE_BULL_REDIS_PORT=6379
    depends_on:
      - n8n
      - redis
    networks:
      - aicore-n8nrunnerpostgresollama-a715gi
  n8n-runner:
    image: n8nio/runners:nightly
    restart: always
    environment:
      - N8N_RUNNERS_TASK_BROKER_URI=http://n8n:5679
      - N8N_RUNNERS_AUTH_TOKEN=${N8N_RUNNERS_SECRET}
      - N8N_ENCRYPTION_KEY=${ENCRYPTION_KEY}
      - GENERIC_TIMEZONE=${GENERIC_TIMEZONE}
      - N8N_RUNNERS_MAX_CONCURRENCY=50
    depends_on:
      - n8n
    networks:
      - aicore-n8nrunnerpostgresollama-a715gi
  ollama:
    image: ollama/ollama:latest
    restart: unless-stopped
    volumes:
      - ollama_storage:/home/node/.ollama
    networks:
      - aicore-n8nrunnerpostgresollama-a715gi
  init-ollama:
    image: ollama/ollama:latest
    volumes:
      - ollama_storage:/home/node/.ollama
    entrypoint: /bin/sh
    environment:
      - OLLAMA_HOST=ollama:11434
    command:
      - -c
      - sleep 3; ollama pull llama3.2:latest; ollama pull gemma3:latest
    networks:
      - aicore-n8nrunnerpostgresollama-a715gi
  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command: redis-server --appendonly yes
    healthcheck:
      test:
        - CMD
        - redis-cli
        - ping
      interval: 10s
      timeout: 5s
      retries: 5
    volumes:
      - redis_storage:/data
    networks:
      - aicore-n8nrunnerpostgresollama-a715gi
  postgres:
    image: postgres:17-alpine
    hostname: postgres
    restart: unless-stopped
    ports:
      - 5432:5432
    environment:
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_DB=${POSTGRES_DB}
    volumes:
      - postgres_storage:/var/lib/postgresql/data
    healthcheck:
      test:
        - CMD-SHELL
        - pg_isready -h localhost -U ${POSTGRES_USER} -d ${POSTGRES_DB}
      interval: 5s
      timeout: 5s
      retries: 10
    networks:
      - aicore-n8nrunnerpostgresollama-a715gi
  pgbouncer:
    image: edoburu/pgbouncer:latest
    container_name: aicore-pgbouncer
    restart: unless-stopped
    ports:
      - '6432:6432'
    volumes:
      - ./pgbouncer/pgbouncer.ini:/etc/pgbouncer/pgbouncer.ini
      - ./pgbouncer/userlist.txt:/etc/pgbouncer/userlist.txt
    depends_on:
      postgres:
        condition: service_healthy
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -h localhost -p 6432 -U postgres || exit 1']
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - aicore-n8nrunnerpostgresollama-a715gi
    deploy:
      resources:
        limits:
          cpus: '0.25'
          memory: 128M
volumes:
  n8n_data: null
  postgres_storage: null
  ollama_storage: null
  redis_storage: null
networks:
  aicore-n8nrunnerpostgresollama-a715gi:
    name: aicore-n8nrunnerpostgresollama-a715gi
    external: true
"""

# Fix pgbouncer.ini with correct network - postgres hostname should work
# Also read current pgbouncer.ini and update network reference in the db references
ini = """[databases]
consultorio_medico = host=postgres port=5432 dbname=consultorio_medico

[pgbouncer]
listen_addr = 0.0.0.0
listen_port = 6432
auth_type = scram-sha-256
auth_file = /etc/pgbouncer/userlist.txt
pool_mode = session
default_pool_size = 20
max_client_conn = 60
max_db_connections = 20
server_idle_timeout = 300
client_idle_timeout = 600
idle_transaction_timeout = 60
query_timeout = 30
stats_period = 60
application_name_add_host = 0
verbose = 0
"""

# Write compose
print("Escribiendo docker-compose.yml...")
b64 = base64.b64encode(compose.encode()).decode()
out, err, rc = run('echo ' + b64 + ' | base64 -d | sudo tee ' + COMPOSE_DIR + '/docker-compose.yml > /dev/null')
print("  RC:", rc, "| Error:", err[:100] if err else "OK")

# Write pgbouncer.ini
print("Escribiendo pgbouncer.ini...")
b64 = base64.b64encode(ini.encode()).decode()
out, err, rc = run('echo ' + b64 + ' | base64 -d | sudo tee ' + COMPOSE_DIR + '/pgbouncer/pgbouncer.ini > /dev/null')
print("  RC:", rc, "| Error:", err[:100] if err else "OK")

# Verify
print("\nVerificando...")
out, err, rc = run("sudo grep -n 'pgbouncer\\|n8n:' " + COMPOSE_DIR + '/docker-compose.yml | head -10')
print(out[:500])

out, err, rc = run('sudo wc -l ' + COMPOSE_DIR + '/docker-compose.yml')
print(out)

client.close()
print("\nListo. Ahora hace deploy desde Dokploy UI.")
