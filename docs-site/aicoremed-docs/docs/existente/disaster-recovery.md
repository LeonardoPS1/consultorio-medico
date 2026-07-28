# Disaster Recovery & Backup

## Respaldo de Base de Datos

### Automático (WF-07)

El workflow **WF-07** (Backup Automático Encriptado) corre diariamente a las **3:00 AM** en n8n.

**Flujo actual:**
1. Cron → n8n Execute Command → `bash /opt/consultorio/scripts/backup-encriptado.sh`
2. El script ejecuta `pg_dump --format=custom --compress=9`
3. Comprime con gzip, encripta con GPG (`--recipient admin@consultorio.com`)
4. Almacena en `/var/backups/consultorio/`
5. Verifica integridad del backup encriptado
6. Limpieza automática de backups > 30 días

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

---

## Respaldo de Volúmenes Docker

### Automático (backup-agent)

Un contenedor **backup-agent** (sidecar en `docker-compose.prod.yml`) corre diariamente a las **3:15 AM** y respalda los volúmenes Docker no-PostgreSQL.

**Flujo:**
1. Cron interno a las 3:15 AM
2. Por cada volumen: `docker run --rm alpine tar czf` → GPG encrypt → almacena en `/backup/`
3. Verifica integridad de cada backup encriptado
4. Limpieza automática de backups > 30 días

### Volúmenes respaldados

| Volumen | Servicio | ¿Se respalda? | Fundamento |
|---------|----------|---------------|------------|
| `n8n_data` | n8n | ✅ Sí | Workflows, credenciales encriptadas, execution history |
| `metabase_data` | metabase | ✅ Sí | Dashboards, queries guardadas, configuraciones |
| `recordings` | whisper | ✅ Sí | Grabaciones de audio (evaluar tamaño real) |
| `ollama_data` | ollama | ❌ No | Modelos grandes (~4-8 GB), reproducible con `ollama pull` |
| `redis_data` | redis | ❌ No | Cache + rate limits, 100% efímero, regenerable desde PG |
| `whisper_models` | whisper | ❌ No | Modelos reproducible descargando de nuevo |

### Recuperación de volúmenes reproducibles

```bash
# ollama_data (modelos)
docker exec $(docker ps -q -f name=ollama) ollama pull gemma3

# redis_data
docker service update --force med_redis

# whisper_models
# Se descargan automáticamente al arrancar whisper.cpp
docker service update --force med_whisper
```

### Restauración de un volumen desde backup

```bash
# Listar backups disponibles
ls -la /var/backups/consultorio/*.tar.gz.gpg

# Desencriptar
gpg --decrypt n8n_data_20260723_031500.tar.gz.gpg > n8n_data_20260723_031500.tar.gz

# Descomprimir
tar xzf n8n_data_20260723_031500.tar.gz -C /tmp/n8n_restore

# Restaurar a Docker volumens
docker run --rm \
  -v n8n_data:/target \
  -v /tmp/n8n_restore:/source \
  alpine \
  cp -a /source/. /target/
```

---

## RTO/RPO

| Métrica | Valor |
|---------|-------|
| **RPO** (Recovery Point Objective) | 24 horas (backup diario) |
| **RTO** (Recovery Time Objective) | ~1 hora (restauración desde backup + deploy) |
| **Retención** | 30 días |

---

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
LATEST=$(ls -t /var/backups/consultorio/*.gz.gpg | head -1)

# Desencriptar y restaurar
gpg --decrypt "$LATEST" | gunzip | pg_restore -h postgres -U dashboard_user -d consultorio_medico --clean
```

### 3. Restaurar volúmenes
```bash
# Obtener último backup de n8n_data
N8N_BACKUP=$(ls -t /var/backups/consultorio/n8n_data_*.tar.gz.gpg | head -1)

# Desencriptar y restaurar n8n_data
gpg --decrypt "$N8N_BACKUP" | tar xz -C /tmp/n8n_restore
docker run --rm -v n8n_data:/target -v /tmp/n8n_restore:/source alpine cp -a /source/. /target/

# Repetir para metabase_data y recordings si es necesario
```

### 4. Recuperar modelos reproducibles
```bash
# Ollama: descargar modelos
docker exec $(docker ps -q -f name=ollama) ollama pull gemma3

# Whisper: el modelo se descarga automáticamente al arrancar
docker service update --force med_whisper

# Redis: arranca limpio, datos se regeneran desde PostgreSQL
docker service update --force med_redis
```

### 5. Verificar integridad
```bash
# Check de la base de datos
docker exec $(docker ps -q -f name=postgres) psql -U dashboard_user -d consultorio_medico -c "SELECT count(*) FROM pacientes;"

# Verificar workflows n8n activos
curl -s https://n8n.aicorebots.com/api/v1/workflows | jq '.data | length'

# Health check del dashboard
curl -s https://med.aicorebots.com/api/health
```

---

## Drill de Restauración

> **Propósito:** Validar que el procedimiento de recuperación funciona realmente y medir el RTO real.

### Procedimiento para drill en container aislado

Este drill se ejecuta en un **contenedor PostgreSQL temporal en el mismo VPS**, sin tocar la base de datos productiva.

```bash
# ═══════════════════════════════════════════════
# DRILL DE RESTAURACIÓN — Container Aislado
# ═══════════════════════════════════════════════

# ── FASE 1: Preparación ────────────────────────
# 1. Obtener último backup de PG
LATEST=$(ls -t /var/backups/consultorio/*.gz.gpg | head -1)
echo "Backup: $LATEST"

# 2. Crear directorio temporal para restauración
TMPDIR=$(mktemp -d /tmp/drill-restore-XXXXXX)

# 3. Desencriptar
time gpg --decrypt "$LATEST" > "$TMPDIR/backup.sql.gz"

# 4. Descomprimir
time gunzip "$TMPDIR/backup.sql.gz"

# 5. Crear container PostgreSQL aislado
docker run -d \
  --name drill-pg \
  -e POSTGRES_DB=consultorio_medico \
  -e POSTGRES_USER=dashboard_user \
  -e POSTGRES_PASSWORD=drill_test_pass \
  -p 5433:5432 \
  postgres:16-alpine

# Esperar a que esté listo
sleep 5
docker exec drill-pg pg_isready -U dashboard_user -d consultorio_medico

# ── FASE 2: Restauración ───────────────────────
# 6. Restaurar (medir tiempo)
time pg_restore -h localhost -p 5433 -U dashboard_user -d consultorio_medico --clean --if-exists "$TMPDIR/backup.sql"

# ── FASE 3: Verificación ───────────────────────
# 7. Verificar integridad de datos
docker exec drill-pg psql -U dashboard_user -d consultorio_medico -c "
SELECT 'pacientes' as tabla, count(*) as registros FROM pacientes
UNION ALL
SELECT 'turnos', count(*) FROM turnos
UNION ALL
SELECT 'recetas', count(*) FROM recetas
UNION ALL
SELECT 'conversaciones', count(*) FROM conversaciones;
"

# 8. Verificar tenant isolation
docker exec drill-pg psql -U dashboard_user -d consultorio_medico -c "
SELECT tenant_id, count(*) FROM pacientes GROUP BY tenant_id;
"

# 9. Verificar RLS policies
docker exec drill-pg psql -U dashboard_user -d consultorio_medico -c "
SELECT schemaname, tablename, policyname, permissive, cmd
FROM pg_policies
ORDER BY tablename;
"

# ── FASE 4: Restauración de volúmenes (si aplica) ──
# 10. Restaurar n8n_data en temp (opcional en drill completo)
# Último backup de volumenes
# N8N_BACKUP=$(ls -t /var/backups/consultorio/n8n_data_*.tar.gz.gpg | head -1)
# gpg --decrypt "$N8N_BACKUP" > "$TMPDIR/n8n_data.tar.gz"
# mkdir -p "$TMPDIR/n8n_verify"
# tar xzf "$TMPDIR/n8n_data.tar.gz" -C "$TMPDIR/n8n_verify"
# ls -la "$TMPDIR/n8n_verify/" | head -20

# ── FASE 5: Limpieza ────────────────────────────
# 11. Destruir container aislado
docker stop drill-pg
docker rm drill-pg

# 12. Eliminar archivos temporales
rm -rf "$TMPDIR"

# 13. Verificar que prod sigue intacta
docker exec $(docker ps -q -f name=postgres) pg_isready -U dashboard_user -d consultorio_medico
docker exec $(docker ps -q -f name=postgres) psql -U dashboard_user -d consultorio_medico -c "SELECT count(*) as pacientes_prod FROM pacientes;"
```

### Checklist de Drill

| # | Paso | Comando | Tiempo estimado | ✅ |
|---|------|---------|-----------------|----|
| 1 | Obtener último backup | `ls -t /var/backups/consultorio/*.gz.gpg \| head -1` | 5s | |
| 2 | Desencriptar | `gpg --decrypt` | ~30s | |
| 3 | Descomprimir | `gunzip` | ~10s | |
| 4 | Crear container aislado | `docker run -d --name drill-pg postgres:16-alpine` | ~10s | |
| 5 | Restaurar | `pg_restore --clean --if-exists` | ~5-15min (según tamaño) | |
| 6 | Verificar integridad | queries de conteo por tabla | ~10s | |
| 7 | Verificar RLS | `pg_policies` query | ~5s | |
| 8 | Limpiar | `docker stop/rm drill-pg` + `rm -rf $TMPDIR` | ~5s | |
| | **Total** | | **~10-20min** | |

### Último drill ejecutado

| Fecha | Operador | RTO real (PG) | RTO real (volúmenes) | Verificación | Resultado |
|-------|----------|---------------|---------------------|-------------|-----------|
| *— pendiente —* | | | | | |

La columna **RTO real (PG)** debe medir el tiempo desde que se inicia la descarga del backup hasta que `pg_restore` termina con éxito.
La columna **RTO real (volúmenes)** mide el tiempo de desencriptar + extraer + copiar al volumen Docker.

### Cadencia de drills

Se propone ejecutar este drill **cada 3 meses** (trimestral). Idealmente:

1. **Trimestral sincronizado** con el calendario del equipo (ej: primer viernes de cada trimestre a las 10:00 AM)
2. **Notificación automática** vía un workflow n8n (propuesta: WF-13 "Recordatorio Drill DR") que:
   - Se dispara el primer día de cada trimestre
   - Envía un mensaje al médico/admin por WhatsApp recordando ejecutar el drill
   - Incluye el enlace a esta documentación
3. **Registro obligatorio** en disaster-recovery.md (actualizar "Último drill ejecutado") después de cada drill

---

## Herramientas de Restauración Automatizada

### restore-pg.sh

Script para restaurar PostgreSQL desde backup GPG encriptado.

```bash
# Restauración directa (con advertencia de 5s)
./scripts/restore-pg.sh /var/backups/consultorio/backup_20260722.sql.gz.gpg

# Drill en container aislado (sin afectar prod)
./scripts/restore-pg.sh --drill /var/backups/consultorio/backup_20260722.sql.gz.gpg

# Restauración con parámetros custom
./scripts/restore-pg.sh --db-host postgres --db-port 5432 --db-user dashboard_user backup.gpg

# Ayuda completa
./scripts/restore-pg.sh --help
```

**Características:**
- Desencriptado automático con GPG
- Restaura con `pg_restore --clean --if-exists`
- Modo drill en container PostgreSQL aislado (puerto 5433)
- Verificación post-restauración
- Limpieza automática de archivos temporales

### restore-volumes.sh

Script para restaurar volúmenes Docker desde backup GPG encriptado.

```bash
# Restaurar un volumen
./scripts/restore-volumes.sh /backup/n8n_data_20260722.tar.gz.gpg n8n_data

# Restaurar metabase_data
./scripts/restore-volumes.sh /backup/metabase_data_20260722.tar.gz.gpg metabase_data
```

**Características:**
- Desencriptado, extracción y copia al volumen Docker
- Crea el volumen si no existe
- Verificación de contenido post-restauración

### restore-full.sh

Orquestador de restauración completa del sistema (BD + volúmenes).

```bash
# Drill completo
./scripts/restore-full.sh --drill --pg-backup /backup/consultorio_20260722.sql.gz.gpg

# Restauración real
./scripts/restore-full.sh \
  --pg-backup /backup/consultorio_20260722.sql.gz.gpg \
  --vol-backup n8n_data:/backup/n8n_data_20260722.tar.gz.gpg \
  --vol-backup metabase_data:/backup/metabase_data_20260722.tar.gz.gpg
```

**Características:**
- Orquesta PG + volúmenes en orden correcto
- Modo drill para testing sin afectar producción
- Checklist de verificación post-restauración

---

## Monitoreo de Backups

### check-backups.sh

Script de monitoreo que verifica el estado de los backups automatizados.

```bash
# Verificación manual
./scripts/check-backups.sh

# Con umbrales custom
./scripts/check-backups.sh --alert-hours 26 --dir /var/backups/consultorio

# Integrar en cron (cada hora)
# 0 * * * * /opt/consultorio/scripts/check-backups.sh >> /var/log/backup-check.log 2>&1
```

**Verifica:**
- Antigüedad del último backup de PostgreSQL (alerta > 26h, crítico > 50h)
- Antigüedad de cada tipo de backup de volúmenes
- Integridad GPG del backup más reciente de cada tipo
- Espacio en disco disponible (alerta < 20%, crítico < 10%)
- Tamaño total de backups

**Exit codes:** 0=OK, 1=Warning, 2=Critical

Se recomienda ejecutar cada hora vía cron en el VPS para detectar fallas temprano.

---

## Backup de Workflows n8n

### backup-n8n-workflows.sh

Exporta todos los workflows activos de n8n a archivos JSON individuales.

```bash
# Configurar API key
export N8N_API_KEY=tu-api-key

# Backup a directorio con timestamp
./scripts/backup-n8n-workflows.sh

# Backup a directorio específico
./scripts/backup-n8n-workflows.sh ./n8n-backup-$(date +%Y%m%d)

# Sugerencia: encriptar el backup de workflows
tar czf n8n-workflows.tar.gz n8n-workflows-backup-*/
gpg --encrypt --recipient admin@consultorio.com n8n-workflows.tar.gz
```

Genera `_metadata.json` con timestamp, cantidad de workflows y lista de archivos.

---

## Off-Site Backup (rclone)

Los scripts `backup-encriptado.sh` y `backup-volumenes.sh` soportan sincronización a almacenamiento externo vía **rclone**.

### Configuración

1. **Instalar y configurar rclone:**
   ```bash
   # En el VPS
   curl https://rclone.org/install.sh | bash
   rclone config  # Configurar remote (B2, S3, etc.)
   ```

2. **Configurar variables de entorno:**
   ```bash
   # En docker-compose.prod.yml (backup-agent) o en n8n
   RCLONE_REMOTE="b2:consultorio-backups"
   RCLONE_CONFIG="/root/.config/rclone/rclone.conf"
   ```

3. **Verificar:**
   ```bash
   rclone ls b2:consultorio-backups/pg/
   rclone ls b2:consultorio-backups/volumes/
   ```

### Destinos Soportados

| Servicio | Rclone remote type | Config example |
|----------|-------------------|----------------|
| Backblaze B2 | `b2` | `b2:consultorio-backups` |
| AWS S3 | `s3` | `s3:consultorio-backups` |
| Google Cloud Storage | `gcs` | `gcs:consultorio-backups` |
| Wasabi | `s3` | `wasabi:consultorio-backups` |

---

## CI/CD — Health Check y Smoke Test

El workflow `deploy.yml` ahora incluye verificación post-deploy:

1. **Health check:** 18 intentos (3 min) esperando HTTP 200 en `/api/health`
2. **Smoke test:** Verifica que la respuesta contenga `"ok":true`
3. **Notificación:** POST a n8n webhook con resultado del deploy

Si el health check falla, el GHA reporta error (exit 1). Docker Swarm ya tiene `rollback_config` automático.

---

## GPG Key Management

### Archivo de clave pública

`scripts/gpg-key.asc` — clave pública GPG para encriptar backups.

- Se importa automáticamente en el `backup-agent` al arrancar
- Debe coincidir con el recipient `admin@consultorio.com`
- **No incluir la clave privada en el repositorio**

### Generar par de claves

```bash
gpg --full-generate-key
# Tipo: RSA, Tamaño: 4096, Expiración: no expira
# Email: admin@consultorio.com

# Exportar clave pública (para el repositorio)
gpg --armor --export admin@consultorio.com > scripts/gpg-key.asc

# Exportar clave privada (guardar FUERA del VPS)
gpg --armor --export-secret-keys admin@consultorio.com > /tmp/backup-gpg-private.key
# Guardar en: 1Password, Bitwarden, o pendrive en caja fuerte
# NUNCA en el repositorio ni en el VPS
```

### Importar clave privada (para restaurar)

```bash
# En el VPS donde se va a restaurar
gpg --import backup-gpg-private.key
```

---

## Notas

- La clave GPG `admin@consultorio.com` debe estar disponible en el sistema para desencriptar backups.
- Los backups de volúmenes se almacenan en el volumen Docker `backup_agent_data` montado en `/backup/` del contenedor backup-agent.
- Los backups de PostgreSQL se almacenan en `/var/backups/consultorio/` dentro del contenedor n8n (path montado desde el host).
- `ollama_data` y `redis_data` no se respaldan automáticamente — ver sección "Recuperación de volúmenes reproducibles" para comandos de regeneración.
- **Off-site backup disponible** vía rclone en ambos scripts de backup. Configurar `RCLONE_REMOTE` para activar.
- **RTO real:** monitorear con `scripts/check-backups.sh` (recomendado: cron cada hora).
