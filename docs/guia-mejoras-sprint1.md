# 🚀 Guía de Mejoras — Sprint 1

> **Proyecto:** Consultorio Médico  
> **Versión:** 0.3.1  
> **Fecha:** 2026-05-17  
> **Commits:** `d54a248`, `6f6e8fe`, `e8bc1db`

---

## Índice

1. [Infraestructura Docker](#1-infraestructura-docker)
2. [Seguridad y Autenticación](#2-seguridad-y-autenticación)
3. [Base de Datos](#3-base-de-datos)
4. [Workflows n8n](#4-workflows-n8n)
5. [Frontend y UI](#5-frontend-y-ui)
6. [Cómo aplicar en Dokploy](#6-cómo-aplicar-en-dokploy)
7. [Verificación post-deploy](#7-verificación-post-deploy)

---

## 1. Infraestructura Docker

### Archivos creados

| Archivo | Propósito |
|---------|-----------|
| `dashboard/Dockerfile` | Build multi-stage para producción (3 etapas) |
| `dashboard/.dockerignore` | Excluye archivos innecesarios de la imagen |
| `docker-compose.yml` | Orquestación de servicios (dashboard, postgres, n8n, ollama) |
| `dashboard/app/api/health/route.ts` | Health check endpoint |
| `dashboard/.env.example` | Template de variables de entorno |

### Dockerfile (3 etapas)

```
Stage 1: deps         → pnpm install --frozen-lockfile
Stage 2: builder      → next build (standalone)
Stage 3: runner       → node:20-alpine, usuario nextjs (no-root)
```

**Cambios en next.config.js:**
```diff
- // output: 'standalone', // Activar solo en Linux/VPS
+ output: 'standalone',
```

**Health check integrado en Docker:**
```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1
```

### docker-compose.yml

4 servicios con red bridge compartida:

| Servicio | Puerto | Health check | Volumen |
|----------|--------|-------------|---------|
| dashboard | 3000 | `/api/health` cada 30s | - |
| postgres | 5432 | `pg_isready` cada 10s | `postgres-data` |
| n8n | 5678 | - | `n8n-data` |
| ollama | 11434 | - | `ollama-data` |

**Migraciones automáticas:** Los archivos SQL en `database/migrations/` se montan en `/docker-entrypoint-initdb.d/` de PostgreSQL y se ejecutan al primer inicio.

---

## 2. Seguridad y Autenticación

### 2.1 Rate limiting de login (CORREGIDO)

**Problema:** El rate limit apuntaba a `pathname === '/'` pero NextAuth v5 POSTea a `/api/auth/callback/credentials`.

**Solución:**
```diff
- if (pathname === '/' && request.method === 'POST') {
+ if (pathname.startsWith('/api/auth/') && request.method === 'POST') {
```

Ahora también excluye `/api/auth/` del rate limit general de APIs.

### 2.2 Autenticación en API de pacientes (NUEVO)

**Problema:** `GET /api/pacientes/[id]` y `PATCH /api/pacientes/[id]` no verificaban sesión.

**Solución:**
- Nuevo helper `requireAuth()` que retorna 401 si no hay sesión
- GET retorna 404 si paciente no existe
- PATCH retorna 400 si body vacío, 404 si no existe
- Errores internos ocultan detalle en producción
- Refactor: `getAuditMetadata()` reutilizable para logging

### 2.3 User enumeration (ELIMINADO)

**Problema:** Se revelaba si el email existía o no, y cuántos intentos quedaban.

**Solución:**
- Mensaje unificado: *"Email o contraseña incorrectos"* en todos los casos
- Se eliminó `getRemainingAttempts()` del flujo de error
- Cuenta bloqueada: mensaje genérico sin minutos restantes

### 2.4 Validación de firma Twilio (CORREGIDO)

**Problema:** 
1. Requests JSON no poblaban `params`, la firma se validaba contra objeto vacío
2. Si faltaba `X-Twilio-Signature`, se saltaba la validación sin importar el entorno
3. `console.log` exponía teléfonos de pacientes

**Solución:**
```typescript
function validateTwilioRequest(request, params): boolean {
  const isProduction = process.env.NODE_ENV === 'production';
  
  // En producción, la firma es obligatoria
  if (isProduction && !signature) return false;
  
  // En desarrollo, skip si no hay firma ni token
  if (!isProduction && !signature) return true;
  
  // JSON bodies ahora también pasan params
  // Error response oculta detalles en producción
}
```

### 2.5 JSON writes atómicos (CORREGIDO)

**Problema:** `writeJSON()` escribía directo al archivo. Dos requests concurrentes se pisaban.

**Solución:**
```typescript
function writeJSON<T>(filePath: string, data: T): void {
  const tmpPath = filePath + '.tmp.' + process.pid;
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tmpPath, filePath); // Atómico en el mismo filesystem
}
```

---

## 3. Base de Datos

### Migration 008: Seguridad y Soft Delete

**Archivo:** `database/migrations/008_seguridad.sql`

#### 3.1 Tabla `auditoria_accesos`

```sql
CREATE TABLE auditoria_accesos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID REFERENCES usuarios(id),
    usuario_email VARCHAR(255),
    usuario_nombre VARCHAR(255),
    accion VARCHAR(100) NOT NULL,     -- login, view, edit, delete, export, config
    entidad VARCHAR(100) NOT NULL,     -- paciente, turno, receta, credencial
    entidad_id VARCHAR(255),
    detalle TEXT,
    ip VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

5 índices para consultas de auditoría: `created_at`, `usuario_id`, `accion`, `entidad`, `entidad_id`.

#### 3.2 Soft Delete (8 tablas)

| Tabla | Columna agregada |
|-------|------------------|
| `turnos` | `deleted_at TIMESTAMPTZ` |
| `historial_medico` | `deleted_at TIMESTAMPTZ` |
| `recetas` | `deleted_at TIMESTAMPTZ` |
| `facturacion` | `deleted_at TIMESTAMPTZ` |
| `conversaciones` | `deleted_at TIMESTAMPTZ` |
| `mensajes` | `deleted_at TIMESTAMPTZ` |
| `tareas_pendientes` | `deleted_at TIMESTAMPTZ` |
| `bloqueos_agenda` | `deleted_at TIMESTAMPTZ` |

#### 3.3 Nuevos Índices

```sql
-- Foreign keys más consultadas
idx_turnos_paciente_id, idx_turnos_medico_id
idx_historial_medico_paciente, idx_recetas_paciente_id
idx_conversaciones_paciente_id, idx_mensajes_conversacion_id

-- Compuesto para dashboard
idx_conversaciones_estado_ultima (estado, ultima_interaccion DESC)

-- GIN para búsqueda por tags
idx_pacientes_tags USING GIN(tags)

-- Recetas activas + errores no resueltos
idx_recetas_estado, idx_workflow_errors_resuelto
```

#### 3.4 Constraints

```sql
-- Matrícula única por médico
ALTER TABLE medicos ADD CONSTRAINT uq_medicos_matricula UNIQUE (matricula);

-- Afiliado único por obra social
ALTER TABLE pacientes ADD CONSTRAINT uq_pacientes_afiliado_obra_social UNIQUE (numero_afiliado, obra_social);

-- Validaciones de datos
ALTER TABLE turnos ADD CONSTRAINT chk_turnos_duracion CHECK (duracion_minutos > 0);
ALTER TABLE facturacion ADD CONSTRAINT chk_facturacion_monto CHECK (monto > 0);
```

---

## 4. Workflows n8n

### 4.1 WF-01: SQL Injection (CORREGIDO)

**Problema:** Las queries de "Consultar Turnos del Paciente" y "Consultar Recetas Activas" concatenaban strings SQL.

**Antes:**
```json
"query": "={{ 'SELECT ... WHERE t.paciente_id = ' + $(\"...\").first().json.id + '...' }}"
```

**Después:**
```json
"query": "SELECT ... WHERE t.paciente_id = $1 ...",
"additionalFields": {
  "queryParams": "={{ [$(\"...\").first().json.id] }}"
}
```

**Además:** La función `esc()` en el Code node "Parsear y Preparar" se mejoró para escapar también backslashes, null bytes y caracteres de control.

### 4.2 WF-02: Nodo huérfano conectado (CORREGIDO)

**Problema:** El nodo "PG - Crear Turno" NO estaba conectado al flujo. Los turnos nunca se guardaban.

**Solución:** Se cambió la conexión:
```diff
- "Ollama - Responder con Horarios" → "Twilio - Confirmación Turno"
+ "Ollama - Responder con Horarios" → "PG - Crear Turno" → "Twilio - Confirmación Turno"
```

### 4.3 WF-05: Merge node + Code aggregator (CORREGIDO)

**Problema:** 4 queries paralelas alimentaban a Ollama sin Merge. Se ejecutaba 4 veces con datos parciales.

**Solución:**
```
Cron → [PG-Turnos, PG-Pacientes, PG-Mensajes, PG-Recetas]
     ↓
Merge (combine multiplex)
     ↓
Code - Agrupar Datos (combina en { turnos: [], pacientes: [], mensajes: [], recetas: [] })
     ↓
Ollama - Generar Resumen (se ejecuta UNA vez con todos los datos)
```

**Nodo Code agregado:**
```javascript
const turnos = $('PG - Turnos de Hoy').all().map(i => i.json);
const pacientes = $('PG - Pacientes Nuevos (24h)').all().map(i => i.json);
// ... etc
return [{ turnos, pacientes_nuevos, mensajes_pendientes, recetas_recientes, ... }];
```

### Cómo reimportar los workflows en n8n

```bash
# 1. Ir a n8n UI (https://n8n.aicorebots.com o http://localhost:5678)
# 2. Para CADA workflow modificado:
#    - Abrir el workflow existente
#    - Workflow → Delete (confirmar)
#    - Workflows → Add → Import from File
#    - Seleccionar el JSON de n8n-workflows/current/
#    - Guardar y activar
#
# Workflows modificados:
#   - workflow-01-agent.json
#   - workflow-02-gestion-turnos.json
#   - workflow-05-resumen-diario.json
```

---

## 5. Frontend y UI

### 5.1 Select component: transform-origin (CORREGIDO)

**Problema:** `SelectContent` no tenía `transform-origin`, la animación de zoom escalaba desde el centro.

**Solución:**
```diff
+ style={{ transformOrigin: 'var(--radix-select-content-transform-origin)' }}
```

### 5.2 Reportes: Transiciones GPU-acceleradas (CORREGIDO)

| Antes | Después |
|-------|---------|
| `transition-all` en cards | `transition-[transform,box-shadow]` |
| `transition-all duration-700` en barras | `transition-transform duration-300` |
| `transition-[height]` en barras de obra social | `transition-transform scaleX + origin-left` |
| `transition-[width]` en canales | `transition-transform scaleX + origin-left` |
| Cards sin hover translateY | `hoverable:hover:-translate-y-[1px]` |

### 5.3 Charts: Animaciones optimizadas (CORREGIDO)

| Antes | Después |
|-------|---------|
| `animationDuration={600-700}` | `animationDuration={300}` |
| Colores idénticos (fillOpacity 0.4) | Colores distintos (primary vs emerald) |
| Doble signo `+` en comparativa | `{w.cambio}` sin `+` extra |

### 5.4 Cambios visuales aplicados

- ✅ **Select**: transform-origin desde el trigger (Radix CSS variable)
- ✅ **Cards**: hover con `translateY(-1px)` + shadow, no `transition-all`
- ✅ **Progress bars**: `scaleX()` con `origin-left` — GPU acelerado, no layout
- ✅ **Chart bars**: colores contrastantes para distinguir series
- ✅ **Chart animaciones**: 300ms en vez de 600-700ms
- ✅ **Double-plus bug**: corregido en comparativa mensual

---

## 6. Cómo aplicar en Dokploy

### 6.1 Primer deploy del dashboard

```yaml
# En Dokploy, crear nuevo servicio:
# Tipo: Docker
# Puerto: 3000
# Build: Dockerfile (en dashboard/Dockerfile)
# Health check: /api/health

# Variables de entorno REQUERIDAS:
DATABASE_URL=postgresql://postgres:password@postgres-host:5432/consultorio_medico
AUTH_SECRET=<generar con: openssl rand -base64 32>
AUTH_URL=https://tudominio.com
NEXT_PUBLIC_APP_URL=https://tudominio.com
NODE_ENV=production

# Variables OPCIONALES:
TWILIO_ACCOUNT_SID=<desde consola Twilio>
TWILIO_AUTH_TOKEN=<desde consola Twilio>
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
OLLAMA_BASE_URL=http://ollama:11434
OLLAMA_MODEL=mistral
```

### 6.2 Servicios adicionales (recomendado via docker-compose)

Si usás Dokploy para servicios separados:

**PostgreSQL:**
```yaml
# Crear servicio PostgreSQL en Dokploy
image: postgres:16-alpine
puerto: 5432
volumen: /var/lib/postgresql/data
env:
  POSTGRES_USER: postgres
  POSTGRES_PASSWORD: <fuerte>
  POSTGRES_DB: consultorio_medico
```

**n8n:**
```yaml
# Crear servicio n8n en Dokploy
image: n8nio/n8n:latest
puerto: 5678
volumen: /home/node/.n8n
env:
  DB_TYPE: postgresdb
  DB_POSTGRESDB_HOST: <postgres-host>
  DB_POSTGRESDB_USER: postgres
  DB_POSTGRESDB_PASSWORD: <password>
  DB_POSTGRESDB_DATABASE: consultorio_medico
  N8N_ENCRYPTION_KEY: <random-32-chars>
```

**Ollama:**
```yaml
# Crear servicio Ollama en Dokploy
image: ollama/ollama:latest
puerto: 11434 (solo LAN)
volumen: /root/.ollama
limites: memoria 8G
# Post-deploy: docker exec ollama pull mistral
```

### 6.3 Migraciones de base de datos

```bash
# Ejecutar TODAS las migraciones en orden
for f in database/migrations/0*.sql; do
  psql -U postgres -d consultorio_medico -f "$f"
done

# O vía Docker:
for f in database/migrations/0*.sql; do
  docker exec -i consultorio-medico-postgres psql -U postgres -d consultorio_medico < "$f"
done
```

### 6.4 Health checks configurados

| Servicio | Endpoint | Intervalo |
|----------|----------|-----------|
| Dashboard | `GET /api/health` → 200 | 30s |
| PostgreSQL | `pg_isready -U postgres` | 10s |

### 6.5 Generación de secrets

```bash
# AUTH_SECRET (para JWT)
openssl rand -base64 32

# n8n encryption key
openssl rand -hex 16

# GPG key para backups encriptados
gpg --full-generate-key
# Tipo: RSA
# Tamaño: 4096
# Expiración: 0 (no expira)
# Email: admin@consultorio.com
```

---

## 7. Verificación post-deploy

### 7.1 Dashboard

```bash
# Health check
curl https://tudominio.com/api/health
# → {"status":"ok","checks":{"postgres":"ok"},"version":"0.3.0"}

# Login
curl -X POST https://tudominio.com/api/auth/callback/credentials \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@consultorio.com","password":"admin123","csrfToken":"..."}'
# → 200 con session token
```

### 7.2 Rate limiting

```bash
# Probar rate limiting (5 intentos/min)
for i in $(seq 1 6); do
  curl -s -o /dev/null -w "%{http_code}\n" \
    -X POST https://tudominio.com/api/auth/callback/credentials
done
# → 200, 200, 200, 200, 200, 429
```

### 7.3 Auth en API pacientes

```bash
# Sin sesión → 401
curl https://tudominio.com/api/pacientes/123
# → {"error":"No autorizado. Iniciá sesión para acceder."}

# Con sesión → 200 o 404
curl -H "Cookie: authjs.session-token=..." \
  https://tudominio.com/api/pacientes/123
# → {"data":{...}} o {"error":"Paciente no encontrado."}
```

### 7.4 Twilio webhook

```bash
# Simular webhook de Twilio
curl -X POST https://tudominio.com/api/webhooks/twilio \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "From=whatsapp:+5491155550101&Body=Hola&To=whatsapp:+14155238886&SmsSid=SM123"
# → 200 con TwiML

# Sin firma en producción → 403
# → {"error":"Firma inválida"}
```

### 7.5 Migración 008

```bash
# Verificar tabla auditoria_accesos
psql -d consultorio_medico -c "\d auditoria_accesos"

# Verificar soft delete en turnos
psql -d consultorio_medico -c "SELECT column_name FROM information_schema.columns WHERE table_name='turnos' AND column_name='deleted_at'"
# → deleted_at

# Verificar constraints
psql -d consultorio_medico -c "\d medicos"
# → uq_medicos_matricula (UNIQUE)
```

---

## Resumen de archivos modificados

| Archivo | Cambio | Prioridad |
|---------|--------|-----------|
| `dashboard/Dockerfile` | 🆕 Creado | 🔴 Crítica |
| `dashboard/.dockerignore` | 🆕 Creado | 🔴 Crítica |
| `docker-compose.yml` | 🆕 Creado | 🔴 Crítica |
| `dashboard/app/api/health/route.ts` | 🆕 Creado | 🔴 Crítica |
| `dashboard/.env.example` | 🆕 Creado | 🟠 Alta |
| `dashboard/next.config.js` | Activado standalone | 🔴 Crítica |
| `dashboard/middleware.ts` | Fix rate limiting path | 🔴 Crítica |
| `dashboard/lib/auth.ts` | Fix user enumeration | 🔴 Crítica |
| `dashboard/app/api/pacientes/[id]/route.ts` | +Auth +validación | 🔴 Crítica |
| `dashboard/app/api/webhooks/twilio/route.ts` | Fix firma + JSON | 🔴 Crítica |
| `dashboard/lib/data-store.ts` | Atomic JSON writes | 🔴 Crítica |
| `database/migrations/008_seguridad.sql` | 🆕 Auditoría + soft delete | 🔴 Crítica |
| `n8n-workflows/current/wf-01-agent.json` | Fix SQL injection | 🔴 Crítica |
| `n8n-workflows/current/wf-02-gestion-turnos.json` | Fix nodo huérfano | 🔴 Crítica |
| `n8n-workflows/current/wf-05-resumen-diario.json` | +Merge +Code node | 🔴 Crítica |
| `dashboard/components/select.tsx` | +transform-origin | 🟠 Alta |
| `dashboard/app/dashboard/reportes/page.tsx` | Fix transiciones | 🟠 Alta |
| `dashboard/components/charts/*.tsx` | Fix animaciones + colores | 🟠 Alta |
| `dashboard/components/reportes/comparativa-mensual.tsx` | Fix double-plus + colores | 🟠 Alta |
| `dashboard/package.json` | Scripts + lint-staged | 🟡 Media |
| `INSTALL.md` | Sección Docker | 🟡 Media |
