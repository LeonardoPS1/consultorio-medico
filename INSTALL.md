# 🚀 Guía de Inicio Rápido

## Stack

| Componente | Tecnología |
|------------|-----------|
| Frontend | Next.js 14 + shadcn/ui + Tailwind |
| Backend | Next.js API Routes |
| Base de Datos | PostgreSQL 15+ (o JSON local para desarrollo) |
| ORM | Drizzle ORM |
| Automatización | n8n (self-hosted) |
| IA Local | Ollama + Mistral |
| Mensajería | Twilio (WhatsApp) |
| Despliegue | Dokploy (VPS) |

---

## 1. Clonar e Instalar

```bash
git clone https://github.com/tu-usuario/consultorio-medico.git
cd consultorio-medico

# Dashboard
cd dashboard
npm install
cp .env.example .env.local
# Editar .env.local con tus datos
```

## 2. Base de Datos

```bash
# Opción A: PostgreSQL (producción)
createdb consultorio_medico
for f in database/migrations/0*.sql; do
  psql -U postgres -d consultorio_medico -f "$f"
done

# Opción B: Sin PostgreSQL (desarrollo local)
# El dashboard funciona automáticamente con JSON local
# No necesita configuración adicional
```

## 3. Iniciar Dashboard

```bash
cd dashboard
npm run dev
# Abrir http://localhost:3000
```

**Credenciales de prueba (modo desarrollo):**

| Usuario | Email | Contraseña | Rol |
|---------|-------|-----------|-----|
| Admin | admin@consultorio.com | admin123 | Administrador |
| Médico | medico@consultorio.com | medico123 | Médico |

## 4. Importar Workflows en n8n

```bash
# Los workflows están en n8n-workflows/current/
# Importar desde la UI de n8n: Workflows → Add → Import from File

# Orden recomendado:
# 1. workflow-01-agent.json
# 2. workflow-02-gestion-turnos.json
# 3. workflow-06-recetas.json
# 4. workflow-04-agent.json
# 5. workflow-03-recordatorios.json
# 6. workflow-05-resumen-diario.json
```

### Credenciales necesarias en n8n:
- **PostgreSQL**: Conexión a la base de datos
- **Twilio**: Account SID + Auth Token
- **Ollama**: `http://ollama:11434/v1` (modelo: `mistral`)
- **IMAP**: Servidor de correo entrante

## 5. Configurar Twilio

```env
# Consola Twilio → Messaging → Services
TWILIO_ACCOUNT_SID=tu_account_sid
TWILIO_AUTH_TOKEN=tu_auth_token
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

# Webhook URL → https://n8n.tudominio.com/webhook/consultorio-inbound
```

## 6. Verificar Ollama

```bash
# En la VPS
curl http://localhost:11434/api/tags

# Si no está mistral:
ollama pull mistral

# Probar:
curl -X POST http://localhost:11434/api/generate \
  -d '{"model": "mistral", "prompt": "Decime hola", "stream": false}'
```

---

## Desarrollo Local (sin VPS)

El dashboard funciona **sin PostgreSQL, sin Ollama y sin Twilio**:

- **Sin PostgreSQL**: Usa almacenamiento JSON en `.data/` con seed data automática
- **Sin Ollama**: Muestra datos mock de conversaciones
- **Sin Twilio**: Las conversaciones usan datos de ejemplo

Solo necesitás:
```bash
cd dashboard
npm install
npm run dev
```

---

## Despliegue en Producción (VPS + Dokploy)

```bash
# 1. En la VPS
git clone https://github.com/tu-usuario/consultorio-medico.git
cd consultorio-medico

# 2. Base de datos
createdb consultorio_medico
for f in database/migrations/0*.sql; do
  psql -U postgres -d consultorio_medico -f "$f"
done

# 3. Dashboard
cd dashboard
npm install
npm run build

# 4. Configurar Dokploy para que ejecute:
# node .next/standalone/server.js

# 5. n8n (desde Dokploy)
# Importar workflows de n8n-workflows/current/

# 6. Ollama
docker exec -it ollama ollama pull mistral
```

---

## Variables de Entorno

| Variable | Descripción | Obligatoria |
|----------|-------------|-------------|
| `DATABASE_URL` | Conexión PostgreSQL | No* |
| `AUTH_SECRET` | Clave secreta JWT | Sí |
| `TWILIO_ACCOUNT_SID` | SID de Twilio | No* |
| `TWILIO_AUTH_TOKEN` | Token de Twilio | No* |
| `TWILIO_WHATSAPP_NUMBER` | Número de WhatsApp | No* |
| `OLLAMA_BASE_URL` | URL de Ollama | No* |
| `OLLAMA_MODEL` | Modelo (default: mistral) | No |
| `N8N_BASE_URL` | URL de n8n | No |
| `N8N_API_KEY` | API Key de n8n | No |

\* No obligatorias para desarrollo local (usa defaults/mock).

---

## Solución de Problemas

**El dashboard no arranca:**
```bash
# Verificar que no haya otro proceso en puerto 3000
netstat -ano | findstr :3000

# Limpiar caché de Next.js
rm -rf .next/
```

**Error de conexión a PostgreSQL:**
```bash
# Verificar que PostgreSQL esté corriendo
pg_isready

# Si usás JSON fallback, el dashboard arranca igual
```

**Los workflows no se activan:**
```bash
# Verificar credenciales en n8n
# Verificar URLs de webhook en Twilio
# Verificar que Ollama responda
```

---

## 📚 Documentación

- [Arquitectura del Sistema](docs/architecture.md)
- [Documentación de Workflows](docs/workflows.md)
- [Esquema de Base de Datos](docs/database.md)
- [Changelog](CHANGELOG.md)
