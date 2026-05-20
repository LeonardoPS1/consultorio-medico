# Guía de Setup Completo — Consultorio Médico

## TL;DR

```bash
# 1. Clonar y configurar
git clone ...
cd consultorio-medico
cp dashboard/.env.example dashboard/.env.local
# Editar .env.local con credenciales reales

# 2. Levantar servicios
docker compose up -d

# 3. Migraciones + seed
docker compose exec dashboard node scripts/migrate-prod.js
curl -X POST http://localhost:3000/api/setup \
  -H "X-Setup-Key: tu_setup_key"

# 4. Deploy workflows a n8n
N8N_API_KEY=tu_key N8N_BASE_URL=http://localhost:5678 \
  node scripts/deploy-workflows.js --activate

# 5. Login
# admin@consultorio.com / admin123
```

---

## 1. Variables de Entorno

Copiá `.env.example` a `.env.local` y configurá:

| Variable | Descripción | Obligatoria |
|----------|-------------|:-----------:|
| `DATABASE_URL` | PostgreSQL connection string | 🔴 |
| `AUTH_SECRET` | Secret para JWT (generar con `openssl rand -base64 32`) | 🔴 |
| `SETUP_KEY` | Key para el endpoint `/api/setup` en producción | 🟡 |
| `TWILIO_ACCOUNT_SID` | SID de cuenta Twilio | 🟡 |
| `TWILIO_AUTH_TOKEN` | Token de autenticación Twilio | 🟡 |
| `TWILIO_WHATSAPP_NUMBER` | Número de WhatsApp de Twilio | 🟡 |
| `TWILIO_DOCTOR_NUMBER` | WhatsApp del médico para notificaciones | 🟡 |
| `N8N_BASE_URL` | URL base de n8n | 🟡 |
| `N8N_API_KEY` | API Key de n8n | 🟡 |
| `N8N_WEBHOOK_INBOUND_URL` | Webhook de n8n para inbound de WhatsApp | 🟡 |
| `OLLAMA_BASE_URL` | URL de Ollama | 🟡 |
| `MERCADOPAGO_ACCESS_TOKEN` | Token de MercadoPago | 🔵 |

### Nombres de columna que espera n8n

Los workflows n8n leen y escriben en las siguientes tablas:
- `pacientes` — pacientes del sistema
- `turnos` — turnos con `fecha_hora` (timestamp único, NO `fecha`/`hora_inicio` separados)
- `medicos` — médicos con `nombre`, `especialidad`, `email`
- `recetas` — recetas con `created_at` (NO `fecha_emision`)
- `conversaciones` — conversaciones activas
- `mensajes` — mensajes individuales
- `workflow_logs` — logs de ejecución de workflows
- `paciente_eventos` — eventos de pacientes
- `plantillas_mensajes` — plantillas de WhatsApp

---

## 3. Migraciones

Las migraciones Drizzle están en `dashboard/drizzle/migrations/`:

| Archivo | Descripción |
|---------|-------------|
| `0000_red_thunderbolt.sql` | Schema base (23 tablas) |
| `0001_watery_jean_grey.sql` | `tenant_id` en usuarios |
| `0002_lovely_sasquatch.sql` | `deleted_at` en turnos |
| `0003_seed_production.sql` | Seed: admin + tenant + horarios + plantillas |

### Ejecutar migraciones en producción:
```bash
node scripts/migrate-prod.js
```

Requiere `scripts/.env` con:
```
PG_HOST=tu_ip
PG_PORT=5432
PG_DATABASE=consultorio_medico
PG_SUPERUSER=postgres
PG_SUPERUSER_PASSWORD=...
PG_APP_USER=dashboard_user
PG_APP_PASSWORD=...
```

---

## 4. Seed de Datos

### Seed de producción (PostgreSQL)
```bash
# Vía API (recomendado):
curl -X POST https://tudominio.com/api/setup \
  -H "Content-Type: application/json" \
  -H "X-Setup-Key: tu_setup_key"

# O vía SQL directo:
docker exec -i postgres psql -U postgres -d consultorio_medico < database/seed_data_n8n.sql
```

### Datos creados:
- Usuario admin: `admin@consultorio.com` / `admin123`
- Usuario médico: `medico@consultorio.com` / `medico123`
- Tenant por defecto: `Consultorio Médico`
- Horarios de atención: L-V 9-18, S 9-13
- 6 plantillas de mensajes WhatsApp
- 5 pacientes de prueba
- 5 turnos próximos
- 2 conversaciones activas
- 2 recetas activas
- 3 eventos de pacientes

---

## 5. n8n Workflows

### Importar workflows a n8n

```bash
node scripts/deploy-workflows.js --activate
```

Variables de entorno necesarias:
```bash
N8N_BASE_URL=https://n8n.aicorebots.com
N8N_API_KEY=n8n_api_xxx
```

### 7 workflows disponibles:

| # | Nombre | Trigger | Descripción |
|---|--------|---------|-------------|
| 01 | WhatsApp Inbound + Triaje IA | Webhook | Recibe WhatsApp, clasifica con IA, responde |
| 02 | Gestión de Turnos | Webhook | Crea turnos verificando disponibilidad |
| 03 | Recordatorios Automáticos | Cron (c/hora) | Envía recordatorios 24h y 1h antes |
| 04 | Correo Inteligente | IMAP | Lee emails, clasifica urgencias, notifica |
| 05 | Resumen Diario | Cron (7am) | Genera resumen diario para el médico |
| 06 | Recetas y Renovaciones | Webhook | Procesa solicitudes de recetas |
| 07 | Backup Automático | Cron (3am) | Backup encriptado de PostgreSQL |

### Credenciales que necesita n8n:

Configurá estas credenciales desde el dashboard (`Configuración → Credenciales`):

| Servicio | Variables | Para workflows |
|----------|-----------|:--------------:|
| **Twilio** | Account SID, Auth Token | 01, 02, 03, 04, 05, 06 |
| **Ollama** | Base URL (`http://ollama:11434`) | 01, 02, 04, 05, 06 |
| **PostgreSQL** | Host, Port, DB, User, Password | 01, 02, 03, 04, 05, 06 |
| **SMTP** | Host, Port, User, Password | 04, 05 |
| **IMAP** | Host, Port, User, Password | 04 |
| **Google Calendar** | Service Account + Key | 02 |

---

## 6. Twilio Webhook

Configurá en la consola de Twilio:

1. Ir a **Messaging** → **Services** → **WhatsApp Senders**
2. En **Webhook URL for Incoming Messages**:
   - URL: `https://tudominio.com/api/webhooks/twilio`
   - Método: `POST`
3. El dashboard recibe el mensaje, lo guarda, y lo forwardea a n8n

Opcionalmente, podés apuntar Twilio directamente a n8n:
- URL: `https://n8n.tudominio.com/webhook/consultorio-inbound`

---

## 7. Credenciales (Dashboard)

Desde el panel (`Configuración → Credenciales`), los administradores pueden:

- Configurar **Twilio**, **Ollama**, **n8n**, **SMTP**, **IMAP**, **PostgreSQL**, **Google Calendar**
- Las credenciales se **encriptan con AES-256-GCM** antes de guardarse
- Se **sincronizan automáticamente** con n8n vía API REST
- Se puede **probar conexión** para Ollama, n8n, Twilio, PostgreSQL

---

## 8. Flujo Completo de WhatsApp

```
Paciente escribe a WhatsApp
        ↓
  [Twilio]
        ↓
  POST /api/webhooks/twilio  (Dashboard)
  - Valida firma X-Twilio-Signature
  - Busca/Crea paciente en DB
  - Guarda mensaje en conversación
  - Forwardea a n8n (fire-and-forget)
  - Responde TwiML a Twilio
        ↓
  [n8n WF-01: WhatsApp Inbound + Triaje IA]
  - Carga contexto del paciente (turnos, recetas)
  - Ollama (mistral) clasifica intención
  - AI Agent responde con tono profesional
  - Envía respuesta vía Twilio API
  - Guarda en DB (mensajes, logs)
```

---

## 9. Docker / Dokploy

### docker-compose.yml (desarrollo local)
```bash
docker compose up -d
```
Levanta 4 servicios: dashboard (3000), postgres (5432), n8n (5678), ollama (11434).

### Dokploy (producción)
- Build desde el Dockerfile multi-stage
- HEALTHCHECK activo en `/api/health`
- Variables de entorno configuradas en Dokploy UI
- Backup automático via cron: `bash scripts/backup-docker.sh`

---

## 10. Health Checks

| Endpoint | Descripción |
|----------|-------------|
| `GET /api/health` | Estado del dashboard + PostgreSQL |
| `GET /api/setup` | Estado completo: DB, admin, tablas |
| `GET /api/healthz` (n8n) | Estado de n8n |
| `GET /api/tags` (Ollama) | Modelos cargados en Ollama |
| `pg_isready` | PostgreSQL readiness |

---

## 11. Troubleshooting

### No llegan mensajes de WhatsApp
1. Verificar `TWILIO_ACCOUNT_SID` y `TWILIO_AUTH_TOKEN` en `.env.local`
2. En consola Twilio → Messaging → Logs → buscar el mensaje
3. Verificar webhook URL en Twilio apunte a `/api/webhooks/twilio`
4. Revisar logs del dashboard: `docker logs consultorio-medico-dashboard`

### n8n no procesa mensajes
1. Verificar `N8N_API_KEY` y `N8N_BASE_URL`
2. Activar workflows: `node scripts/deploy-workflows.js --activate`
3. Revisar credenciales de n8n desde Configuración → Credenciales
4. Revisar logs de n8n: `docker logs consultorio-medico-n8n`

### Ollama no responde
1. Verificar modelo: `curl http://localhost:11434/api/tags`
2. Descargar modelo: `docker exec ollama ollama pull mistral`
3. Probar inferencia: `curl -X POST http://localhost:11434/api/generate -d '{"model":"mistral","prompt":"hola","stream":false}'`

### No se puede hacer login
1. Verificar migraciones ejecutadas (`0003_seed_production.sql`)
2. Llamar `POST /api/setup` para crear admin
3. Credenciales default: `admin@consultorio.com` / `admin123`
4. Hash bcrypt en producción debe ser generado con `require('bcryptjs').hash('admin123', 10)`

---

## 12. Comandos Rápidos

```bash
# Setup completo (desarrollo)
cp dashboard/.env.example dashboard/.env.local
docker compose up -d
sleep 10
curl -X POST http://localhost:3000/api/setup
node scripts/deploy-workflows.js --activate
open http://localhost:3000/login

# Backup DB
bash scripts/backup-docker.sh /backups

# Restaurar DB
gunzip -c backup.sql.gz | docker exec -i postgres psql -U postgres -d consultorio_medico

# Ver logs
docker compose logs -f dashboard
docker compose logs -f n8n

# Reiniciar todo
docker compose down && docker compose up -d
```
