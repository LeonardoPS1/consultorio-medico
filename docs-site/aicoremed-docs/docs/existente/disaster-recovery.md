# Disaster Recovery & Backup

## Respaldo de Base de Datos

### Automático (WF-07)

El workflow **WF-07** (Backup Automático Encriptado) corre diariamente a las **3:00 AM** en n8n.

**Flujo actual:**
1. Cron → n8n Execute Command → `bash /opt/consultorio/scripts/backup-encriptado.sh`
2. El script ejecuta `pg_dump --format=custom --compress=9`
3. Comprime con gzip, encripta con GPG (`--recipient admin@consultorio.com`)
4. Almacena en `/var/backups/consultorio/`
5. Limpieza automática de backups > 30 días

**Requisitos del contenedor n8n:**
- `pg_dump` instalado (o `postgresql-client` package)
- Conexión a PostgreSQL via `postgres:5432` (DNS interno de Docker Swarm)
- Directorio `/opt/consultorio/scripts/` montado como volumen
- GPG key `admin@consultorio.com` importada

### Manual

```bash
# Usando backup-docker.sh (recomendado)
bash scripts/backup-docker.sh

# Usando pg_dump directo
pg_dump -h postgres -U dashboard_user -d consultorio_medico --format=custom --compress=9 > backup_$(date +%Y%m%d).dump
```

### Restauración

```bash
# 1. Desencriptar (si está encriptado con GPG)
gpg --decrypt backup_20260722_030000.sql.gz.gpg > backup.sql.gz

# 2. Descomprimir
gunzip backup.sql.gz

# 3. Restaurar a PostgreSQL
pg_restore -h postgres -U dashboard_user -d consultorio_medico --clean --if-exists backup.sql

# 4. O desde SQL plano
psql -h postgres -U dashboard_user -d consultorio_medico < backup.sql
```

## Respaldo de Volúmenes Docker

Además de la base de datos, los siguientes volúmenes deben respaldarse periódicamente:

| Volumen | Servicio | Ruta en contenedor |
|---------|----------|-------------------|
| `postgres_data` | postgres | `/var/lib/postgresql/data` |
| `n8n_data` | n8n | `/home/node/.n8n` |
| `ollama_data` | ollama | `/root/.ollama` |
| `metabase_data` | metabase | `/metabase-data` |
| `redis_data` | redis | `/data` |

Para respaldar un volumen:

```bash
docker run --rm -v postgres_data:/source -v /backup:/dest alpine tar czf /dest/postgres_data_$(date +%Y%m%d).tar.gz -C /source .
```

## RTO/RPO

| Métrica | Valor |
|---------|-------|
| **RPO** (Recovery Point Objective) | 24 horas (backup diario) |
| **RTO** (Recovery Time Objective) | ~1 hora (restauración desde backup + deploy) |
| **Retención** | 30 días |

## Procedimiento de Recuperación Completa

### 1. Recuperar instancia Docker Swarm
```bash
# Desplegar stack desde cero
docker stack deploy -c docker-compose.prod.yml med

# Verificar servicios
docker stack services med
```

### 2. Restaurar base de datos
```bash
# Obtener último backup
LATEST=$(ls -t /var/backups/consultorio/*.gpg | head -1)

# Desencriptar y restaurar
gpg --decrypt "$LATEST" | gunzip | pg_restore -h postgres -U dashboard_user -d consultorio_medico --clean
```

### 3. Restaurar volúmenes (si es necesario)
```bash
# Por cada volumen dañado
docker run --rm -v n8n_data:/target -v /backup:/source alpine tar xzf /source/n8n_data_*.tar.gz -C /target
```

### 4. Verificar integridad
```bash
# Check de la base de datos
docker exec $(docker ps -q -f name=postgres) psql -U dashboard_user -d consultorio_medico -c "SELECT count(*) FROM pacientes;"

# Verificar workflows n8n activos
curl -s https://n8n.aicorebots.com/api/v1/workflows | jq '.data | length'

# Health check del dashboard
curl -s https://med.aicorebots.com/api/health
```

## Notas

- Los backups residen actualmente en el mismo VPS que los datos. Para producción crítica, configure un destino off-site (S3, rsync remoto, etc.).
- No hay backup automático de volúmenes no-PG (n8n_data, ollama_data, etc.). Deben respaldarse manualmente o mediante script adicional.
- La clave GPG `admin@consultorio.com` debe estar disponible en el sistema para desencriptar backups.
