# 🚀 Guía de Instalación — AicoreMed

> **Última actualización:** 03/06/2026
> **Stack:** Next.js 14 · PostgreSQL 16 · n8n · Ollama · Twilio · Docker

---

## 📋 Índice

1. [Prerrequisitos](#prerrequisitos)
2. [Instalación Local](#instalación-local)
3. [Variables de Entorno](#variables-de-entorno)
4. [Base de Datos](#base-de-datos)
5. [Producción con Docker](#producción-con-docker)
6. [Despliegue en Dokploy](#despliegue-en-dokploy)
7. [Deploy de Workflows n8n](#deploy-de-workflows-n8n)
8. [Solución de Problemas](#solución-de-problemas)

---

## Prerrequisitos

| Herramienta | Versión Mínima | Recomendada |
|-------------|---------------|-------------|
| Node.js | 18.x LTS | 20.x LTS |
| pnpm | 8.x | 9.x |
| PostgreSQL | 15.x | 16.x |
| Docker (opcional) | 24.x | 26.x |
| n8n (opcional) | 2.0.x | 2.19.x |

### Verificar instalación
```bash
node --version     # v20.x
pnpm --version     # 9.x
psql --version     # 16.x
```

---

## Instalación Local

### 1. Clonar repositorio
```bash
git clone https://github.com/LeonardoPS1/consultorio-medico.git
cd consultorio-medico
```

### 2. Instalar dependencias
```bash
cd dashboard
pnpm install
```

### 3. Configurar variables de entorno
```bash
cp .env.example .env.local
# Editar .env.local con tus credenciales (ver sección siguiente)
```

### 4. Inicializar base de datos
```bash
# Opción A: Push del schema (recomendado)
npx drizzle-kit push:pg

# Opción B: Migraciones manuales
cat database/migrations/001_*.sql | psql -U user -d consultorio_medico
cat database/migrations/002_*.sql | psql -U user -d consultorio_medico
# ... repetir para todas las migraciones hasta 0023
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

# ─── Google Calendar ───
GOOGLE_CALENDAR_EMAIL=service-account@xxx.iam.gserviceaccount.com
GOOGLE_CALENDAR_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
```

### Opcionales 🟢

```env
NEXT_PUBLIC_APP_URL=https://med.aicorebots.com
ORGANIZATION_NAME=Mi Consultorio
```

> 📝 Ver archivo `.env.example` completo en el repositorio.

---

## Base de Datos

### Esquema
El sistema usa **26+ tablas** orquestadas por Drizzle ORM:

```sql
-- Tablas principales
pacientes, turnos, recetas, medicos, historial_medico,
notas_soap, certificados, conversaciones, mensajes,
usuarios, sucursales, horarios_atencion, servicios,
credenciales, plantillas_mensajes, preferencias_notificaciones,
auditoria_accesos, api_keys, workflow_logs, encuestas, etc.
```

### Migraciones
```bash
# Generar nueva migración
cd dashboard && npx drizzle-kit generate

# Aplicar en producción
sudo docker exec -i postgres_container psql -U user -d consultorio_medico < migration.sql
```

### Backup
- Automático: WF-07 (3:00 AM, encriptado, limpieza 30 días)
- Manual: `bash scripts/backup-docker.sh`

---

## Producción con Docker

### Dockerfile (pnpm multi-stage)
```dockerfile
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate

FROM base AS deps
WORKDIR /app
COPY pnpm-lock.yaml ./
RUN pnpm fetch

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

FROM base AS runner
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
# Reemplazar symlinks de pnpm con archivos planos
RUN rm -rf node_modules && npm install --omit=dev --ignore-scripts
EXPOSE 3000
CMD ["node", "server.js"]
```

### docker-compose.yml
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

volumes:
  pgdata:
```

### Construir y ejecutar
```bash
pnpm build
docker compose up -d --build
```

---

## Despliegue en Dokploy

### Requisitos
- Dokploy corriendo en VPS con Docker Swarm
- Repositorio GitHub conectado
- Variables de entorno configuradas en Dokploy UI

### Pasos
1. **Conectar repo**: Dokploy → Applications → Add → GitHub → `consultorio-medico`
2. **Configurar build**: Usar el Dockerfile en `/dashboard`
3. **Variables de entorno**: Setear todas las variables (ver sección arriba)
4. **Port**: 3000
5. **Health check**: `/api/health`
6. **Resource limits**: 0.5 CPU / 512MB RAM

### Redeploy automático
```bash
git push origin main
# Dokploy detecta el push y redeploya automáticamente
```

### Redeploy manual
```bash
docker service update --force app-hack-back-end-sensor-jd2eu3
```

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

### Error: Build fails con symlinks pnpm
El standalone output de Next.js ≥14.2.21 tiene symlinks a la store de pnpm. El Dockerfile los reemplaza con:
```dockerfile
RUN rm -rf node_modules && npm install --omit=dev --ignore-scripts
```

### Error: Timeout en health check
```bash
# Revisar logs del servicio
docker service logs app-hack-back-end-sensor-jd2eu3 --tail 50
```

### Error: Webhook Twilio firma inválida
```bash
# Verificar TWILIO_AUTH_TOKEN
# Verificar que la URL del webhook coincide con la configurada en Twilio Console
```

---

## Soporte

- **Dashboard**: https://med.aicorebots.com
- **n8n**: https://n8n.aicorebots.com
- **Web**: https://aicorebots.com
- **Email**: contacto@aicorebots.com
