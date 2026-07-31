# 🚀 Guía de Instalación — AicoreMed

> **Última actualización:** 31/07/2026
> **Stack:** Next.js 16 · React 19 · PostgreSQL 16 · n8n · Ollama · Twilio · Docker

---

## 📋 Índice

1. [Prerrequisitos](#prerrequisitos)
2. [Instalación Local](#instalacion-local)
3. [Variables de Entorno](#variables-de-entorno)
4. [Base de Datos](#base-de-datos)
5. [Producción con Docker](#produccion-con-docker)
6. [Despliegue en Dokploy](#despliegue-en-dokploy)
7. [Deploy de Workflows n8n](#deploy-de-workflows-n8n)
8. [Solución de Problemas](#solucion-de-problemas)

---

## Prerrequisitos

| Herramienta | Versión Mínima | Recomendada |
|-------------|---------------|-------------|
| Node.js | 20.x LTS | 22.x LTS |
| pnpm | 10.x | 11.18.x |
| PostgreSQL | 15.x | 16.x |
| Docker (opcional) | 24.x | 26.x |
| n8n (opcional) | 2.0.x | 2.19.x |

### Verificar instalación
```bash
node --version     # v22.x
pnpm --version     # 11.18.x
psql --version     # 16.x
```

---

## Instalación Local

El repositorio es un **monorepo pnpm** con dos workspaces:

```
consultorio-medico/
├── dashboard/      # Dashboard web (Next.js 16) + portal paciente
├── ops-console/    # Consola de operaciones (AicoreOps)
├── n8n-workflows/  # Workflows n8n (WF-01 a WF-14)
├── scripts/        # Scripts de backup, restore, deploy
└── docs-site/      # Documentación MkDocs
```

### 1. Clonar repositorio
```bash
git clone https://github.com/LeonardoPS1/consultorio-medico.git
cd consultorio-medico
```

### 2. Instalar dependencias
```bash
pnpm install   # instala dashboard + ops-console (pnpm-workspace.yaml)
```

### 3. Configurar variables de entorno
```bash
cd dashboard
cp .env.example .env.local
# Editar .env.local con tus credenciales (ver sección siguiente)
```

### 4. Inicializar base de datos
```bash
# Opción A: Push del schema (recomendado para dev)
npx drizzle-kit push:pg

# Opción B: Migraciones manuales (las migraciones viven en dashboard/drizzle/migrations)
for f in dashboard/drizzle/migrations/0*.sql; do
  psql -U postgres -d consultorio_medico -f "$f"
done
# Actualmente: 0053 migraciones aplicadas en orden
```

### 5. Poblar datos iniciales
```bash
curl -X POST http://localhost:3000/api/setup \
  -H "X-Setup-Key: tu_setup_key"
```

### 6. Iniciar desarrollo
```bash
pnpm dev
# Abrir http://localhost:3000
# Ops Console: pnpm --filter ops-console dev (puerto 3002)
```

---

## Variables de Entorno

### Esenciales 🔴

```env
# ─── Base de datos ───
DATABASE_URL=postgresql://dashboard_user:password@localhost:5432/consultorio_medico

# ─── Autenticación ───
AUTH_SECRET=openssl_rand_base64_32_bytes
AUTH_SETUP_KEY=tu_clave_unica_para_setup

# ─── Twilio WhatsApp ───
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=tu_auth_token
TWILIO_WHATSAPP_NUMBER=+18453735358

# ─── Ollama (IA Local) ───
OLLAMA_BASE_URL=http://localhost:11434

# ─── Hash para Recetas QR ───
RECETA_HASH_SECRET=secreto_para_firma_qr
```

### Importantes 🟡

```env
# ─── MercadoPago ───
MP_ACCESS_TOKEN=APP_USR-xxx
MP_PUBLIC_KEY=APP_USR-xxx
MP_WEBHOOK_SECRET=tu_webhook_secret

# ─── n8n ───
N8N_WEBHOOK_SECRET=secret_compartido_con_n8n
N8N_BASE_URL=https://n8n.aicorebots.com
N8N_API_KEY=api_key_n8n

# ─── Google Calendar ───
GOOGLE_CALENDAR_EMAIL=service-account@xxx.iam.gserviceaccount.com
GOOGLE_CALENDAR_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."

# ─── Portal de pacientes (dominio dedicado) ───
PORTAL_DOMAINS=consultorio.aicorebots.com
PORTAL_BYPASS=1   # solo desarrollo, acceso directo sin magic link

# ─── Impersonación ("Entrar Como") + email ───
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USER=no-reply@example.com
EMAIL_PASS=xxx
EMAIL_FROM="AicoreMed <no-reply@example.com>"
```

### Opcionales 🟢

```env
NEXT_PUBLIC_APP_URL=https://med.aicorebots.com
ORGANIZATION_NAME=Mi Consultorio
# Ops Console (ops.aicorebots.com): envs OPS_JWT_SECRET, OPS_SETUP_TOKEN_PEPPER, OPS_DATABASE_URL
```

> 📝 Ver archivo `.env.example` completo en el repositorio.

---

## Base de Datos

### Esquema
El sistema usa **50+ tablas** orquestadas por Drizzle ORM (schema dividido por dominio en
`dashboard/drizzle/`):

```sql
-- Tablas principales
pacientes, turnos, recetas, medicos, historial_medico,
notas_soap, certificados, conversaciones, mensajes,
usuarios, sucursales, horarios_atencion, servicios,
credenciales, plantillas_mensajes, preferencias_notificaciones,
auditoria_accesos, api_keys, workflow_logs, encuestas,
derivaciones, ordenes_estudio, documentos_medicos,
webhook_configs, consentimiento_compartir, portal_config, etc.
```

### Migraciones
```bash
# Generar nueva migración
cd dashboard && npx drizzle-kit generate

# Aplicar en producción
sudo docker exec -i postgres_container psql -U superuser -d consultorio_medico < dashboard/drizzle/migrations/XXXX_nombre.sql
# o: pnpm --filter dashboard db:push
```

### Metabase (Analytics)

El sistema incluye **Metabase v0.52** para self-service analytics.

#### Setup inicial

1. **Ejecutar script SQL** como superusuario PostgreSQL para crear usuarios y DB de metadata:
   ```bash
   sudo docker exec -i postgres_container psql -U superuser < scripts/setup-metabase.sql
   ```

2. **Crear secrets en Docker Swarm** (si no existen):
   ```bash
   echo "password_metabase_db" | docker secret create metabase_db_password -
   echo "password_metabase_readonly" | docker secret create metabase_readonly_password -
   echo "clave_encriptacion_32_chars_min" | docker secret create metabase_encryption_key -
   ```

3. **Acceder a Metabase** en `http://<vps-ip>:3001` y configurar:
   - Cuenta admin inicial
   - Agregar DB `consultorio_medico` con usuario `metabase_readonly` (schema `public`)
   - Crear dashboards según necesidad

#### Servicio Docker
Metabase corre como servicio en `docker-compose.prod.yml` con backend PostgreSQL propio y
usuario de solo lectura (`metabase_readonly`) para datos productivos.

### Backup
- Automático: WF-07 (3:00 AM, pg_dump + GPG, limpieza 30 días) + backup-agent de volúmenes
- Manual: `bash scripts/backup-encriptado.sh` (PG) / `bash scripts/backup-volumenes.sh` (volúmenes)
- Recovery: `make recover` / `make recover-force` / `make recover-status` (ver [Disaster Recovery](disaster-recovery.md))

---

## Producción con Docker

### Dockerfile (node:22 + pnpm, multi-stage con cache mounts)

`dashboard/Dockerfile` usa un build multi-stage con **BuildKit cache mounts** (pnpm store +
npm), `ARG CACHEBUST` para invalidar caché desde GitHub Actions, y pnpm-workspace para
resolver el monorepo. Consideraciones clave:

- `allowBuilds` en `pnpm-workspace.yaml` (sharp, esbuild, @swc/core, etc.) — sin esto, el
  install falla con `ERR_PNPM_UNSUPPORTED_PROTOCOL` en Dokploy.
- El standalone output requiere `outputFileTracingRoot` apuntando al root del monorepo.
- `HEALTHCHECK` usa `curl` (instalado vía `apk add`).

### docker-compose.yml (desarrollo)

```yaml
services:
  dashboard:
    build: ./dashboard
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://user:pass@postgres:5432/consultorio_medico
      - AUTH_SECRET=...
    depends_on:
      - postgres

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: consultorio_medico
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
    volumes:
      - pgdata:/var/lib/postgresql/data

  n8n:    # workflows + webhooks
  ollama: # IA local (gemma3)
  redis:  # cache + rate limits

volumes:
  pgdata:
```

> `docker-compose.prod.yml` (Swarm) agrega: 2 réplicas dashboard con rolling update
> (parallelism=1, delay=10s, start-first, rollback), pgbouncer, metabase, chatwoot,
> backup-agent, ops-console, docs, whisper y secrets de Docker Swarm.

### Construir y ejecutar (dev)
```bash
pnpm build
docker compose up -d --build
```

---

## Despliegue en Dokploy

### Pipeline actual (obligatorio)

> ⚠️ **Bug conocido:** el build nativo de Dokploy (sourceType git) **no funciona** — la
> build completa pero `docker service update` no se ejecuta y el Swarm service queda
> corriendo la imagen vieja. El pipeline oficial usa **GitHub Actions → ghcr.io → Dokploy**.

```mermaid
graph LR
    PUSH["git push origin main"] --> GHA["GitHub Actions (.github/workflows/deploy.yml)"]
    GHA --> BUILD["Docker build multistage (pnpm)"]
    BUILD --> PUSHG["Push a ghcr.io/leonardops1/consultorio-medico:latest"]
    PUSHG --> PROXY["POST med.aicorebots.com/api/deploy/dokploy (proxy)"]
    PROXY --> DOK["Dokploy API interna (http://dokploy:3000)"]
    DOK --> SWARM["Docker Swarm service med-dashboard (rolling update)"]
```

### Pasos
1. **Push a main** — el workflow `deploy.yml` builda la imagen y la sube a ghcr.io.
2. **Registro ghcr.io** — configurado en Dokploy con un PAT de `read:packages`, vinculado
   al dashboard y a docs.
3. **Health check + smoke test** — el GHA espera HTTP 200 con `"ok":true` en `/api/health`
   (18 intentos / 3 min) y notifica a n8n con el resultado.
4. **Port**: 3000.
5. **Resource limits**: 0.5 CPU / 512MB RAM (2 réplicas, rolling update con rollback).

### Redeploy manual
```bash
docker service update --force med-dashboard
```

### Deploy de Docs
El sitio `docs.aicorebots.com` usa el mismo patrón: GHA `deploy-docs.yml` → imagen
`ghcr.io/leonardops1/consultorio-medico-docs:latest` → servicio `med-docs`.

### Deploy de Ops Console
Pipeline propio `deploy-ops.yml` → imagen `ghcr.io/leonardops1/consultorio-medico-ops:latest`
→ servicio `ops-console-23kboo` (puerto 3002, schema `platform` en la misma DB).

---

## Deploy de Workflows n8n

### Prerrequisitos
- n8n corriendo y accesible
- API Key generada en n8n Settings → API
- Workflows JSON en `n8n-workflows/current/`

### Desplegar
```bash
# Deploy + activación
N8N_API_KEY=tu_api_key N8N_BASE_URL=http://localhost:5678 \
  node scripts/deploy-workflows.js --activate

# Solo simular (dry-run)
node scripts/deploy-workflows.js --dry-run
```

### Configurar webhooks en n8n
1. Ir a n8n UI → Workflows → Abrir cada workflow
2. Configurar Webhook nodes con `x-webhook-secret` header
3. Conectar credenciales: PostgreSQL, Twilio, Ollama
4. Activar workflow

---

## Solución de Problemas

### Error: `Cannot find module 'next'`
```bash
cd dashboard && pnpm install && pnpm build
```

### Error: `ECONNREFUSED :5432`
```bash
# Verificar que PostgreSQL está corriendo
docker ps | grep postgres

# Verificar DATABASE_URL en .env.local
echo $DATABASE_URL
```

### Error: `RECETA_HASH_SECRET not configured`
```bash
# Agregar en Dokploy UI o en .env.local
echo "RECETA_HASH_SECRET=tu_secreto" >> dashboard/.env.local
# Redeployar
```

### Error: Build fails en Dokploy con `ERR_PNPM_UNSUPPORTED_PROTOCOL`
Los scripts de postinstall de `sharp`/`esbuild` etc. se bloquean. Fix: verificar
`allowBuilds` en `pnpm-workspace.yaml` en el root del monorepo (no en package.json).

### Error: Timeout en health check
```bash
# Revisar logs del servicio
docker service logs med-dashboard --tail 50

# Verificar health check
curl -s https://med.aicorebots.com/api/health
```

### Error: Dokploy sourceType git no actualiza la imagen
Bug conocido: la build completa pero el Swarm service no se actualiza. Usar el pipeline
GHA → ghcr.io (sourceType docker apps) en lugar del build nativo.

### Error: Webhook Twilio firma inválida
```bash
# Verificar TWILIO_AUTH_TOKEN
# Verificar que la URL del webhook coincide con la configurada en Twilio Console
```

### Error: Portal no redirige en consultorio.aicorebots.com
Verificar que `PORTAL_DOMAINS` esté seteado (default `consultorio.aicorebots.com`). La
lógica vive en `dashboard/proxy.ts`.

---

## Soporte

- **Dashboard**: https://med.aicorebots.com
- **Portal paciente**: https://consultorio.aicorebots.com
- **n8n**: https://n8n.aicorebots.com
- **Ops Console**: https://ops.aicorebots.com
- **Docs**: https://docs.aicorebots.com
- **Web**: https://aicorebots.com
- **Email**: contacto@aicorebots.com
