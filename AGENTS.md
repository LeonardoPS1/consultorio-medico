# 🤖 AGENTS — Sistema de Agentes IA · Consultorio Médico

> **Archivo de referencia principal.** Debe ser consultado antes de iniciar cualquier tarea, desarrollo o debugging para entender el contexto completo del sistema, la metodología de trabajo y el estado actual.

**Última actualización:** 12/07/2026
**Proyecto:** AicoreMed — Sistema de Gestión para Consultorios Médicos (Chile)
**Dashboard:** https://med.aicorebots.com
**n8n:** https://n8n.aicorebots.com
**Repositorio:** `main` → https://github.com/LeonardoPS1/consultorio-medico

---

## 📋 Índice

1. [Metodología de Trabajo](#-metodología-de-trabajo)
2. [Stack Tecnológico](#-stack-tecnológico)
3. [Arquitectura del Sistema](#-arquitectura-del-sistema)
4. [Agentes n8n (Workflows)](#-agentes-n8n-workflows)
5. [Modelos de IA (Ollama)](#-modelos-de-ia-ollama)
6. [Integraciones](#-integraciones)
7. [Seguridad y Validaciones](#-seguridad-y-validaciones)
8. [Roadmap y Pendientes](#-roadmap-y-pendientes)
9. [Infraestructura y Despliegue](#-infraestructura-y-despliegue)
10. [Skills y Herramientas](#-skills-y-herramientas)
11. [Comandos Útiles](#-comandos-útiles)

---

## 🛠 Metodología de Trabajo

### Filosofía Aicore
- **Soluciones prácticas, escalables y mantenibles.** Priorizamos lo que funciona sobre lo perfecto.
- **AI Agents > HTTP calls**: Reemplazar múltiples llamadas HTTP por un solo AI Agent con memoria conversacional nativa (Postgres Chat Memory).
- **Pre-carga de datos > toolCode**: Los datos del paciente se inyectan en el prompt antes de llamar al agente (evita sandbox de n8n).
- **Almacenamiento dual**: PostgreSQL (producción) + JSON (desarrollo) con detección automática.
- **Feature gating**: Single source of truth en `lib/planes.ts` → `lib/features.ts` → sidebar/rutas/tabs.
- **Server Components primero**: Todo lo que pueda ser server-rendered debe serlo. Client Components solo para interactividad.

### Flujo de Desarrollo
1. **Entender el problema** antes de codear. Preguntar si algo no está claro.
2. **Planificar** la solución (arquitectura, flujos, modelo de datos, endpoints).
3. **Desarrollar** con TypeScript estricto, Drizzle ORM, Next.js App Router.
4. **Verificar** con `npm run build` (0 errores TS source), probar endpoints, verificar flujo completo.
5. **Actualizar documentación** (AGENTS.md, memories, session-log).
6. **Commit + Push** a `origin/main` con mensajes claros y convencionales.

### Convenciones de Código
- **Idioma**: Todo el texto visible al usuario en español neutro chileno (no argentino). Prompts de IA en español neutro.
- **TypeScript estricto**: `strict: true` en tsconfig. `no-explicit-any: error`. JSDoc obligatorio en funciones públicas.
- **ESLint**: `@typescript-eslint`, `jsdoc`, `prettier`, `react`, `import/order`. Corre con typed rules.
- **Prettier**: `pnpm run format` sobre `*.{ts,tsx}`. Single quotes, trailing commas, printWidth 100.
- **Drizzle ORM puro**: Queries tipadas con `db.select()`, `db.insert()`, etc. Sin SQL raw excepto migraciones.
- **API Routes**: Patrón RESTful con `apiHandler` para errores consistentes.
- **Componentes UI**: shadcn/ui + Radix UI + Tailwind CSS. Animaciones con framer-motion.
- **Zod**: Validación de schemas en todas las API routes.
- **Server Actions**: Solo cuando es necesario. Preferir API Routes para operaciones complejas.
- **Tests**: Vitest (unit) + Playwright (e2e). 247+ tests. `pnpm test` / `pnpm test:coverage` / `pnpm e2e`.

### Gestión de Sesiones (OpenCode)
- **Memoria persistente** en `.opencode/memory/`:
  - `projects/consultorio-medico.md` — Contexto del proyecto
  - `session-log.md` — Historial de sesiones
  - `audit-consultorio-medico.md` — Auditoría técnica detallada
- **Skills cargadas**: 17 skills disponibles (ver sección Skills).
- **Antes de `compress`**: Siempre ejecutar `/handoff` + actualizar memorias.
- **Al iniciar sesión**: Cargar contexto del proyecto + session-log + audit block.

### Skills del Sistema
| Skill | Propósito |
|-------|-----------|
| **n8n-workflow-builder** | Diseño, debugging y refactor de workflows n8n |
| **ollama-aicore** | Prompts para Gemma3, optimización de respuestas |
| **twilio-debugger** | Problemas con WhatsApp/SMS/voz, webhooks, firmas |
| **sql-aicore** | Esquemas DB, consultas optimizadas, migraciones |
| **drizzle-migrations** | Migraciones Drizzle ORM seguras en producción |
| **nextjs-deploy** | Build, deploy y diagnóstico en Dokploy |
| **dokploy-deploy** | Diagnóstico de servicios en VPS, logs, backups |
| **whatsapp-bot** | Flujos conversacionales con Twilio WhatsApp API |
| **design-taste-frontend** | Perfil de diseño frontend |
| **emil-design-eng** | UI polish, animaciones, detalles invisibles |
| **impeccable** | Auditoría de código, enforce de estándares |
| **web-design-guidelines** | Revisión de UI contra Web Interface Guidelines (Vercel) |
| **ui-ux-pro-max** | UI/UX patterns, 58 reglas de diseño, best practices |
| **huashu-design** | Sistema de diseño visual, tokens, animaciones, glassmorphism |
| **frontend-patterns** | Patrones React/Next.js, state, performance |
| **graphify** | Knowledge graph del codebase, queries, path/explain |
| **n8n-cli** | Interactuar con n8n CLI, workflows, credenciales |

---

## 🥞 Stack Tecnológico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| **Frontend** | Next.js 14 (App Router) + Tailwind CSS + shadcn/ui | 14.2.x |
| **Autenticación** | NextAuth v5 (beta) + JWT + 2FA TOTP | 5.0.0-beta.19 |
| **ORM** | Drizzle ORM | ^0.31.0 |
| **Base de datos** | PostgreSQL 16 | 16 |
| **Automatización** | n8n (self-hosted) | 2.19.5 |
| **IA Local** | Ollama + gemma3/llama3.2 | Último |
| **WhatsApp** | Twilio API | ^5.0.0 |
| **Pagos** | MercadoPago (sandbox, CLP) | ^2.12.1 |
| **Calendario** | Google Calendar API (service account) | — |
| **Infraestructura** | Docker Swarm + Dokploy | — |
| **Proxy** | Traefik + Let's Encrypt | — |
| **Animaciones** | framer-motion | ^12.40.0 |
| **Gráficos** | Recharts | ^2.12.0 |
| **Validación** | Zod | ^3.22.0 |
| **JWT** | jose | ^6.2.3 |

---

## 🏗 Arquitectura del Sistema

### Capas (5 Capas)

```
PACIENTES
  │
  ▼
Twilio WhatsApp / IMAP Email
  │
  ▼
n8n (11 Workflows)
  │  ├── WF-01: WhatsApp Inbound + Triaje IA
  │  ├── WF-02: Gestión de Turnos
  │  ├── WF-03: Recordatorios Automáticos
  │  ├── WF-04: Correo Inteligente
  │  ├── WF-05: Resumen Diario del Médico
  │  ├── WF-06: Recetas y Renovaciones
  │  ├── WF-07: Backup Automático Encriptado
  │  ├── WF-08: Google Calendar Sync
  │  ├── WF-09: Anonimización Post-Retención
  │  └── WF-10: Expiración Waitlist
  │
  ▼
Ollama (Gemma3 - IA Local)
  │
  ▼
PostgreSQL (26+ tablas)
  │
  ▼
Dashboard Web (Next.js 14 - med.aicorebots.com)
```

### Flujo de Mensaje WhatsApp (Crítico)

```
Twilio → Webhook → Dashboard (valida firma HMAC) →
  → Guarda en DB (conversaciones + mensajes) →
  → Forward a n8n (WF-01 con x-webhook-secret) →
  → n8n busca paciente en DB →
  → Construye contexto (turnos, recetas, historial) →
  → AI Agent (Ollama Gemma3 + Postgres Chat Memory) →
  → Analiza intención y genera respuesta →
  → Ejecuta acciones estructuradas (crear turno, cancelar, etc.) →
  → Twilio responde al paciente →
  → Loggea todo en DB
```

### Estructura del Proyecto

```
consultorio-medico/
├── dashboard/                  # Next.js 14 App Router
│   ├── app/
│   │   ├── (login)/           # Login, forgot/reset password
│   │   ├── dashboard/         # Dashboard principal (protegido)
│   │   │   ├── page.tsx       # KPIs reales (server component)
│   │   │   ├── pacientes/     # CRUD pacientes
│   │   │   ├── turnos/        # CRUD turnos + Kanban
│   │   │   ├── recetas/       # CRUD recetas + PDF
│   │   │   ├── conversaciones/# Chat con pacientes
│   │   │   ├── webhooks/      # Logs de Twilio
│   │   │   ├── reportes/      # Reportes con datos reales de DB
│   │   │   ├── encuestas/     # Encuestas post-consulta
│   │   │   ├── onboarding/    # Onboarding asistido por IA
│   │   │   ├── configuracion/ # 8 tabs de configuración
│   │   │   ├── admin/         # Admin (auditoría, webhooks, etc.)
│   │   │   └── atencion/      # Kanban de atención
│   │   └── api/               # API Routes RESTful
│   ├── components/            # UI, layout, calendar, charts, modals
│   ├── lib/                   # auth, db, planes, features, servicios
│   ├── drizzle/               # Schema Drizzle (10 módulos por dominio + barrel) + migraciones
│   └── public/                # Landing page + assets
├── n8n-workflows/             # 10 workflows JSON
│   └── current/               # Activos (WF-01 a WF-10)
├── scripts/                   # Backup, deploy, migrate
├── docs/                      # Arquitectura, workflows, DB, seguridad
└── AGENTS.md                  # ← Este archivo
```

---

## 🤖 Agentes n8n (Workflows)

### WF-01: WhatsApp Inbound + Triaje IA ⭐ (Crítico)

| Propiedad | Valor |
|-----------|-------|
| **Archivo** | `n8n-workflows/current/workflow-01-agent.json` |
| **Trigger** | Webhook → `POST /webhook/consultorio-inbound` |
| **Estado** | ✅ **ACTIVO** |
| **Nodos** | 17 (webhook, IF, set, postgres×5, code×2, Ollama Agent, Postgres Memory, Twilio) |

**Flujo:**
1. Webhook recibe mensaje de Twilio (con `x-webhook-secret` validado)
2. Busca/crea paciente en PostgreSQL por teléfono
3. Consulta turnos próximos y recetas activas del paciente
4. Construye contexto estructurado para el AI Agent
5. **AI Agent** (Ollama Gemma3 + Postgres Chat Memory) analiza y responde
6. Si detecta acciones estructuradas: `crear_turno`, `cancelar_turno`, `receta`, `urgencia`
7. Envía respuesta vía Twilio WhatsApp
8. Loggea todo en PostgreSQL

**Configuración IA:**
- Modelo: `gemma3` (Ollama)
- Base URL: `http://ollama:11434`
- Temperatura: 0.3
- Chat Memory: Postgres (`n8n_chat_histories`, sessionKey=telefono, contextWindow=10)
- System Prompt: Completo con reglas de negocio, formato de acciones, contexto del paciente

**Credenciales:** Consultorio - PostgreSQL, Consultorio - Twilio Basic Auth, Ollama - Consultorio Medico

---

### WF-02: Gestión de Turnos

| Propiedad | Valor |
|-----------|-------|
| **Archivo** | `n8n-workflows/current/workflow-02-gestion-turnos.json` |
| **Trigger** | Webhook → `POST /webhook/turno-solicitar` |
| **Estado** | ✅ **ACTIVO** |
| **Nodos** | 9 (webhook, ollama×2, postgres×3, function, twilio, googleCalendar) |

**Flujo:**
1. Recibe solicitud de turno vía webhook
2. Ollama extrae info estructurada (motivo, fecha, horario, médico, tipo)
3. Verifica disponibilidad en PostgreSQL
4. Calcula slots libres con function node
5. Ollama genera respuesta amigable con horarios disponibles
6. Crea turno en PostgreSQL
7. Envía confirmación por Twilio WhatsApp
8. Crea evento en Google Calendar

**Configuración IA:**
- Extracción: `gemma3`, temp=0.1 (estricto, JSON)
- Respuesta: `gemma3`, temp=0.7 (creativo, friendly)

---

### WF-03: Recordatorios Automáticos

| Propiedad | Valor |
|-----------|-------|
| **Archivo** | `n8n-workflows/current/workflow-03-recordatorios.json` |
| **Trigger** | Cron (cada hora, 8:00-20:00) |
| **Estado** | ✅ **ACTIVO** |
| **Nodos** | 12 (cron, postgres×5, IF×2, code×2, twilio×2) |

**Flujo:**
1. Cron dispara cada hora en horario diurno
2. Consulta turnos con recordatorio pendiente a 24h
3. Consulta turnos con recordatorio pendiente a 1h
4. Arma mensaje usando plantillas de DB (con sustitución de variables)
5. Envía por Twilio WhatsApp
6. Marca flags `recordatorio_24h_enviado` / `recordatorio_1h_enviado`
7. Solo envía a pacientes con `consentimiento_whatsapp = TRUE`
8. No solapa: 24h excluye turnos dentro de 1h

**Reglas de negocio:**
- No envía antes de las 8:00 ni después de las 20:00
- Reintento automático si Twilio falla (flag no se marca)
- Plantillas configurables desde Dashboard → Configuración → Plantillas

---

### WF-04: Correo Inteligente

| Propiedad | Valor |
|-----------|-------|
| **Archivo** | `n8n-workflows/current/workflow-04-agent.json` |
| **Trigger** | IMAP (UNSEEN cada 5 min) |
| **Estado** | ✅ **ACTIVO** (🟡 requiere IMAP/SMTP configurados) |
| **Nodos** | 10 (emailReadImap, set, Ollama Agent, code, switch, twilio, emailSend×2, postgres×2) |

**Flujo:**
1. Lee emails no leídos vía IMAP cada 5 minutos
2. Extrae campos (from, subject, body)
3. **AI Agent** (Ollama Gemma3) clasifica el email:
   - `URGENTE` → Notifica al doctor vía Twilio WhatsApp
   - `SPAM` → Mueve a carpeta spam
   - `RECETA` / `CONSULTA_TURNO` / `CONSULTA_GENERAL` / `OTRO` → Redacta borrador de respuesta
4. Loggea clasificación y acción en PostgreSQL

**Configuración IA:**
- Modelo: `gemma3`, temp=0.3
- Clasifica y decide acción en un solo paso

**⚠️ Pendiente:** Configurar credenciales IMAP/SMTP reales en n8n para activar flujo completo.

---

### WF-05: Resumen Diario del Médico

| Propiedad | Valor |
|-----------|-------|
| **Archivo** | `n8n-workflows/current/workflow-05-resumen-diario.json` |
| **Trigger** | Cron (7:00 AM todos los días) |
| **Estado** | ✅ **ACTIVO** |
| **Nodos** | 9 (cron, postgres×5, merge, code×2, ollama, emailSend, twilio) |

**Flujo:**
1. Cron a las 7:00 AM
2. Consulta 4 fuentes en PostgreSQL:
   - Turnos de hoy
   - Pacientes nuevos (últimas 24h)
   - Mensajes sin responder
   - Recetas por autorizar
3. Mergea y agrega datos con code node
4. Ollama genera resumen formateado (temp=0.3, maxTokens=800)
5. Envía resumen detallado por email
6. Envía resumen breve por Twilio WhatsApp (opcional)
7. Loggea en PostgreSQL

---

### WF-06: Recetas y Renovaciones

| Propiedad | Valor |
|-----------|-------|
| **Archivo** | `n8n-workflows/current/workflow-06-recetas.json` |
| **Trigger** | Webhook → `POST /webhook/receta-solicitar` |
| **Estado** | ✅ **ACTIVO** |
| **Nodos** | 9 (webhook, ollama, postgres×4, IF, twilio×2, html PDF) |

**Flujo:**
1. Recibe solicitud de receta vía webhook
2. Ollama analiza: ¿es renovación? medicamento, dosis, tipo
3. Si es renovación: busca receta activa en PG y auto-crea refill
4. Si es nueva receta: notifica al médico vía Twilio
5. Genera PDF de la receta (HTML template)
6. Envía PDF por Twilio WhatsApp
7. Marca como enviada en PG, loggea todo

**Configuración IA:**
- Modelo: `gemma3`, temp=0.1, maxTokens=200 (estricto, extraer JSON)
- Campos extraídos: `es_renovacion`, `medicamento`, `dosis`, `tipo`

---

### WF-07: Backup Automático Encriptado

| Propiedad | Valor |
|-----------|-------|
| **Archivo** | `n8n-workflows/current/workflow-07-backup.json` |
| **Trigger** | Cron (3:00 AM todos los días) |
| **Estado** | ✅ **ACTIVO** |
| **Nodos** | 2 (cron, executeCommand) |

**Flujo:**
1. Cron a las 3:00 AM
2. Ejecuta script `/opt/consultorio/scripts/backup-encriptado.sh`
3. Script: pg_dump → compresión gzip → encriptación → limpieza 30 días

---

### WF-08: Google Calendar Sync

| Propiedad | Valor |
|-----------|-------|
| **Archivo** | `n8n-workflows/current/workflow-08-google-calendar-sync.json` |
| **Trigger** | Webhook → `POST /webhook/google-calendar-sync` |
| **Estado** | ✅ **ACTIVO** |
| **Nodos** | 8 (webhook, IF×2, googleCalendar×3, postgres×2) |

**Flujo:**
1. Recibe acción vía webhook (create/update/delete)
2. Enruta según acción:
   - `delete` → Elimina evento de Google Calendar
   - `create` → Crea evento, guarda event ID en `turnos.google_calendar_event_id`
   - `update` → Actualiza evento existente
3. Loggea la operación de sync en PostgreSQL

**Integración con Dashboard:**
- `syncTurnoToGCal()` en `lib/google-calendar-sync.ts` hace POST fire-and-forget a n8n
- Se dispara desde `turnosService.create()` y `turnosService.update()`

---

### WF-09: Anonimización Post-Retención

| Propiedad | Valor |
|-----------|-------|
| **Archivo** | `n8n-workflows/current/workflow-09-anonimizar.json` |
| **Trigger** | Cron (4:00 AM todos los días) |
| **Estado** | ✅ **NUEVO** |
| **Nodos** | 5 (cron, httpRequest, IF×1, postgres×2) |

**Flujo:**
1. Cron a las 4:00 AM
2. POST a `https://med.aicorebots.com/api/privacidad/anonimizar` con `x-webhook-secret`
3. El endpoint ejecuta `privacidadService.anonimizarPostRetencion()` (90 días)
4. Si encontró pacientes expirados: `UPDATE pacientes` + hard-delete de datos residuales
5. Loggea el resultado en `workflow_logs`

**Integración con Dashboard:**
- `privacidadService.notificarBajaAN8n()` notifica a n8n sobre bajas confirmadas
- Webhook `/webhook/paciente-baja` para limpiar `n8n_chat_histories`
- Endpoint protegido `POST /api/privacidad/anonimizar` con verificación de webhook secret

---

### WF-10: Expiración Waitlist

| Propiedad | Valor |
|-----------|-------|
| **Archivo** | `n8n-workflows/current/workflow-10-expiracion-waitlist.json` |
| **Trigger** | Cron (diario) |
| **Estado** | ✅ **ACTIVO** |

**Flujo:**
1. Cron diario verifica ofertas de waitlist expiradas
2. Cambia estado de `pendiente` a `expirada` en PostgreSQL
3. Notifica a pacientes vía Twilio WhatsApp si corresponde
4. Loggea el resultado en `workflow_logs`

**Integración con Dashboard:**
- Endpoint `POST /api/waitlist/reasignar` para reasignar ofertas
- Ofertas se crean con TTL configurable (default 24h)

---

### WF-11: Novedades desde Commits

| Propiedad | Valor |
|-----------|-------|
| **Archivo** | `n8n-workflows/current/workflow-11-novedades.json` |
| **Trigger** | Webhook (GitHub Push) → `POST /webhook/novedades-generar` |
| **Estado** | ✅ **ACTIVO** |
| **Nodos** | 5 (webhook, httpRequest, IF, noOp×2) |

**Flujo:**
1. Webhook recibe push de GitHub
2. POST a `https://med.aicorebots.com/api/novedades/generar` con `x-internal-key`
3. IF verifica si se generaron entradas (mensaje contiene "generaron")
4. `Novedades generadas` → OK (noOp)
5. `Sin commits nuevos` → skip (noOp)

**✅ Completado:** Webhook de GitHub configurado y enviando pushes a `https://med.aicorebots.com/webhook/novedades-generar`.

---

### Matriz Resumen de Agentes

| # | Nombre | Trigger | Ollama | Twilio | PG | GCal | IMAP | Webhook |
|---|--------|---------|--------|--------|----|------|------|---------|
| **WF-01** | WhatsApp Inbound + Triaje IA | Webhook | ✅ Agent | ✅ | ✅ | ❌ | ❌ | `/consultorio-inbound` |
| **WF-02** | Gestión de Turnos | Webhook | ✅ 2 nodos | ✅ | ✅ | ✅ | ❌ | `/turno-solicitar` |
| **WF-03** | Recordatorios Automáticos | Cron | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **WF-04** | Correo Inteligente | IMAP | ✅ Agent | ✅ | ✅ | ❌ | ✅ | ❌ |
| **WF-05** | Resumen Diario del Médico | Cron | ✅ 1 nodo | ✅ | ✅ | ❌ | ❌ | ❌ |
| **WF-06** | Recetas y Renovaciones | Webhook | ✅ 1 nodo | ✅ | ✅ | ❌ | ❌ | `/receta-solicitar` |
| **WF-07** | Backup Automático | Cron | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **WF-08** | Google Calendar Sync | Webhook | ❌ | ❌ | ✅ | ✅ | ❌ | `/google-calendar-sync` |
| **WF-09** | Anonimización Post-Retención | Cron | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| **WF-10** | Expiración Waitlist | Cron | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **WF-11** | Novedades desde Commits | Webhook | ❌ | ❌ | ❌ | ❌ | ❌ | `/novedades-generar` |

---

## 🧠 Modelos de IA (Ollama)

### Configuración General
- **Servidor:** Ollama en VPS (172.18.0.1:11434 interno, ollama:11434 desde n8n)
- **API:** Compatible con OpenAI (`/v1/chat/completions`)
- **Modelo principal:** `gemma3`
- **Límite de RAM:** 8GB

### Configuración por Workflow

| Workflow | Modelo | Temp | MaxTokens | Propósito |
|----------|--------|------|-----------|-----------|
| WF-01 Agent | gemma3 | 0.3 | default | Triaje completo con memoria conversacional |
| WF-02 Extraer | gemma3 | 0.1 | default | Extracción estructurada de datos del turno |
| WF-02 Responder | gemma3 | 0.7 | default | Respuesta friendly con horarios disponibles |
| WF-04 Agent | gemma3 | 0.3 | default | Clasificación de emails + decisión de acción |
| WF-05 Resumen | gemma3 | 0.3 | 800 | Generar resumen diario formateado |
| WF-06 Analizar | gemma3 | 0.1 | 200 | Extraer datos de solicitud de receta |

### Buenas Prácticas con Ollama
- **Temperatura baja (0.1-0.3)** para extracción de datos estructurados
- **Temperatura media-alta (0.7)** para respuestas creativas al paciente
- **Pre-cargar contexto** en el prompt (no confiar en toolCode del agente)
- **Sanitizar prompts** contra jailbreak (implementado en dashboard)
- **Mantener el modelo cargado** en memoria (evitar cold starts)
- **Timeout generoso** (30s+) para inferencia local

---

## 🔌 Integraciones

### Twilio (WhatsApp)
| Propiedad | Valor |
|-----------|-------|
| Account SID | 🔒 `process.env.TWILIO_ACCOUNT_SID` |
| Auth Token | 🔒 `process.env.TWILIO_AUTH_TOKEN` |
| Número WhatsApp | `+18453735358` |
| Número Doctor | `+18453735358` (actualmente mismo, configurable vía `TWILIO_DOCTOR_NUMBER`) |
| SMS URL | `https://med.aicorebots.com/api/webhooks/twilio` |
| Status Callback | `https://med.aicorebots.com/api/webhooks/twilio` |
| Soportados | Chile (+56) |
| Verificación | HMAC-SHA256 via `validateRequest()` de twilio SDK |

### PostgreSQL
| Propiedad | Valor |
|-----------|-------|
| Host interno | `172.18.0.1:5432` |
| Database | `consultorio_medico` |
| App User | `dashboard_user` |
| Tablas | 48 (pacientes, turnos, recetas, conversaciones, mensajes, médicos, usuarios, etc.) |

### Google Calendar
- Service Account (OAuth2)
- Calendar ID configurable
- Sincronizado desde `turnosService.create()` y `turnosService.update()`
- Opcional (feature gating)

### MercadoPago (Sandbox)
- 5 planes de suscripción (Free, Starter, Professional, Business, Enterprise)
- Webhook con validación HMAC-SHA256 (`x-signature`)
- Moneda: CLP (Chile)
- Flujo: checkout → preferencia → webhook → actualiza plan del usuario

### n8n
| Propiedad | Valor |
|-----------|-------|
| URL | `https://n8n.aicorebots.com` |
| API | `http://172.18.0.1:5678` (interno, sin Cloudflare) |
| API Key | JWT |
| Versión | 2.19.5 |
| Workflows activos | 10 |
| Webhook auth | `x-webhook-secret` |
| Credenciales | PostgreSQL, Twilio (Basic Auth + API), Ollama |

---

## 🔒 Seguridad y Validaciones

### Capas de Seguridad
1. **HTTPS** via Traefik + Let's Encrypt
2. **Autenticación**: NextAuth + JWT + 2FA TOTP
3. **Rate limiting**: 5/min login, 30/min API general
4. **Account lockout**: 5 intentos fallidos → 15 min bloqueo
5. **Auto-logout**: 30 min de inactividad
6. **Password**: bcrypt(10), validador de fortaleza
7. **Creación de usuarios**: Solo admin (setup key)
8. **Multi-tenant**: `tenantId` en 22+ tablas
9. **Soft delete**: 8 tablas (turnos, pacientes, recetas, médicos, etc.)
10. **Auditoría**: `auditoria_accesos` con tenantId, login/logout tracking
11. **Twilio**: Validación de firma HMAC-SHA256 en webhooks
12. **MercadoPago**: Validación HMAC-SHA256 de `x-signature`
13. **n8n**: Webhook secret entre dashboard y n8n
14. **Datos encriptados**: AES-256-GCM para credenciales en DB
15. **Firewall**: UFW, puertos 5432 y 11434 ALLOW solo desde redes Docker (172.17/18/19.0.0/16, 10.0.1.0/24), DENY externo. PG/Ollama bind a 0.0.0.0 (no 127.0.0.1) para que Swarm pueda alcanzarlos via docker_gwbridge (172.18.0.1)
16. **Prompt sanitization**: Anti-jailbreak implementado
17. **Auditoría 03/06**: 0 críticos / 0 altos / 0 medios / 0 bajos ✅
18. **Auditoría 12/07**: 0 críticos / 0 altos / 0 medios / 0 bajos ✅ (Post-Fase 4 y Fase 5)

### Webhooks
| Webhook | Endpoint | Validación |
|---------|----------|------------|
| Twilio Inbound | `POST /api/webhooks/twilio` | HMAC-SHA256 + Status Callback |
| n8n Consultorio | `POST /webhook/consultorio-inbound` | `x-webhook-secret` |
| n8n Turnos | `POST /webhook/turno-solicitar` | — |
| n8n Recetas | `POST /webhook/receta-solicitar` | — |
| n8n GCal Sync | `POST /webhook/google-calendar-sync` | — |
| MercadoPago | `POST /api/pagos/webhook` | HMAC-SHA256 `x-signature` |

---

## 🗺 Roadmap y Pendientes

### ✅ Prioritario — Completado

| Feature | Descripción | Fecha |
|---------|-------------|-------|
| **Reportes con datos reales** | API `/api/reportes` con queries DB reales (4 tabs con charts: ingresos, turnos, pacientes, recetas) | 31/05 |
| **Notas SOAP** | Evolución clínica estructurada (S/O/A/P) con CIE-10, migration 0018, API CRUD, UI en ficha paciente | 31/05 |
| **Certificados médicos con QR** | Hash SHA-256, verificación pública, HTML PDF, migration 0019 | 31/05 |
| **CIE-10 buscador** | ~900 códigos con autocomplete, integrado en SOAP, historial, certificados | 31/05 |
| **Firma digital QR en recetas** | Hash de verificación SHA-256 con QR y endpoint público | 29/05 |
| **PWA (App instalable)** | Service worker v2, offline page, update/install prompts | 30/05 |
| **Exportación Excel/PDF** | Exportar pacientes y recetas en formato Excel y PDF | 29/05 |
| **Múltiples médicos** | Sesión con medicoId, scoping en 7 rutas API, agenda-scope utility | 29/05 |
| ~~Google Calendar sync~~ | `turnosService.create/update/delete()` con GCal sync | 28/05 |
| ~~ARCO - Derecho de Supresión~~ | `privacidadService` con baja, cascada de datos, anonimización, WF-09 retención 90 días | 28/05 |
| **Portal Paciente** | Magic link WhatsApp + JWT 24h + Booking Wizard 4 pasos + gestión turnos/recetas/historial | 26/06 |
| **Asistente IA Flotante** | FAB + panel contextual con 3 modos (silencioso/sugerente/activo), 9 contextos de página | 27/06 |
| **Command Palette Cmd+K** | 17 nav + 9 admin + 6 quick actions, búsqueda paralela, debounce 250ms | 27/06 |
| **Historial Lateral pacientes** | Sheet con fuse.js, scoring dots, resumen rápido + acciones | 27/06 |
| **Notificaciones Mejoradas** | Prioridad por tipo, silenciar categorías, stack badges, filtros | 27/06 |
| **Editar pacientes en lista** | Modal de edición directa desde la lista de pacientes (no solo desde ficha). Implementado en commit `41f8923` | 03/07 |
| **Buscador CIE-10 offline** | Búsqueda fuzzy con fuse.js + debounce 200ms. Códigos hardcodeados en bundle JS. Commit `41f8923` + `?` | 03/07 |
| **Panel monitoreo n8n** | Admin page con workflows, ejecuciones, logs, errores desde dashboard. Service `n8n-monitor.ts`, 5 APIs | 03/07 |
| **Encuestas post-consulta con IA** | Análisis de sentimiento con Ollama Gemma3. `lib/encuestas.ts` + `analyzeSentiment()`, charts evolución | 03/07 |
| **Dashboard analytics** | Reportes con 4 tabs (ingresos, turnos, pacientes, recetas), 6 charts Recharts, predicción demanda | 03/07 |
| **Alertas inteligentes** | 4 detectores: cumpleaños, ausentismo recurrente, pacientes críticos, score alto. `alertas-inteligentes.ts` | 03/07 |
| **Sistema de derivaciones** | Tabla DB `derivaciones`, CRUD completo, UI en sidebar, feature gated | 03/07 |
| **Historial expandido** | Página standalone con search cross-pacientes, filtro tipo, paginación, iconos por tipo, sidebar entry. 15 tipos de historial. Commit `6dabbbe` | 03/07 |
| **Fix Ollama puerto 11434** | Agregado `ports: ["11434:11434"]` al compose de Ollama vía Dokploy API. Redeploy completado. | 10/07 |
| **Mejoras UI low-effort (5 items)** | Skip-to-content link, page transitions framer-motion, 8 portal spinners→skeletons, 22+ aria-labels, custom easing en toasts. Commit `fa5b4ab` | 10/07 |
| **Mejoras UI medium-effort (4 items)** | Portal inline styles→Tailwind (156), split sidebar (531→150+250), split header (592→340+268), transition-all→específicas (31+ files). Commit `01f0455` | 10/07 |
| **28 aria-labels adicionales** | Icon buttons en paciente-detalle, configuracion, api-keys, backups, medicos, bloqueos, onboarding, lista-espera. Commit `bed9c23` | 10/07 |
| **Tooltips con delay inteligente** | `@radix-ui/react-tooltip`, `tooltip.tsx`, `smart-tooltip.tsx` con SmartTooltipProvider (delay=500ms, skip=300ms), integrado en providers. Commit `ac58e8f` | 10/07 |
| **Portal design system unify** | PortalButton/Badge/Card refactored de inline styles a Tailwind. ~29 inline style declarations removed. Commit `ac58e8f` | 10/07 |
| **Dark mode portal polish** | 3 semantic colors (destructive/success/warning) con dark overrides. PushNotificationToggle refactored a portal tokens. Commit `ac58e8f` | 10/07 |
| **Glassmorphism layer** | CSS variables + utility classes (glass-sm/md/lg), ambient orbs, aplicado a Card/Dialog/Sheet/KPIs. Commit `25394cf` | 10/07 |
| **Layout variations system** | LayoutConfigProvider (default/wide/centered/minimal), SidebarContext, DashboardLayoutClient, MainContent, PageLayout. Commit `e04f970` | 10/07 |
| **Storybook con Vite 5** | 5 stories (Button 12, Card 3, Badge 5, Skeleton 4, Tooltip 2), @alias resolve, globals.css. Commit `a77b82d` | 10/07 |
| **Fase 4: Calidad de Código** | schema.ts split (1594→10 módulos), DRY KPIs (3 switch→config object), tipado any→Session/MedicoDia/TurnoDia, split config (1584→528) y turnos (1069→779), 38 tests nuevos, @vitest/coverage-v8. Commit `150922a` | 12/07 |
| **Fase 5: Performance** | Self-fetch→DB directo, CSS code-split globals (450 líneas→landing.css), useOrganization hook, useReducedMotion en 3 componentes, cascading useEffect fix. Commit `73a14da` | 12/07 |

### 🟡 Prioridad Media

| Feature | Descripción | Dependencias |
|---------|-------------|--------------|
| **WF-04 Correo Inteligente completo** | Configurar IMAP/SMTP real en n8n. Ya tiene el workflow completo (10 nodos), falta activar las credenciales | Credenciales IMAP/SMTP |
| **Tests de integración** | Suite de tests automatizados para flujo completo: webhook → DB → n8n → Twilio | Playwright/Jest |

### 🟢 Prioridad Baja

| Feature | Descripción |
|---------|-------------|
| WhatsApp Business API (producción) | Migrar de sandbox a producción con número dedicado |
| Soporte multimedia en WhatsApp | Imágenes, PDFs, audio en conversaciones |

### 💡 Ideas a Futuro
- Chat en vivo en dashboard (WebSocket)
- Recordatorios vía email (SMTP configurable, falta servicio automático de recordatorios)
- Historial clínico digital expandido (integrado en ficha paciente, sin página independiente)

---

## 🏗 Infraestructura y Despliegue

### VPS
| Propiedad | Valor |
|-----------|-------|
| Proveedor | OVH |
| IP | `51.222.207.250` |
| Usuario SSH | `ubuntu` |
| Sistema | Docker Swarm via Dokploy |

### Servicios en Dokploy

| App ID | Nombre | Directorio |
|--------|--------|------------|
| `app-hack-back-end-sensor-jd2eu3` | **AicoreMed-dashboard** | `/etc/dokploy/applications/app-hack-back-end-sensor-jd2eu3/code/` |
| `aicore-n8nrunnerpostgresollama-a715gi` | **Backend** (n8n+PG+Ollama) | `/etc/dokploy/compose/aicore-n8nrunnerpostgresollama-a715gi/code/` |

### URLs
| Servicio | URL |
|----------|-----|
| Dashboard | `https://med.aicorebots.com` |
| n8n | `https://n8n.aicorebots.com` |
| Dokploy UI | `https://51.222.207.250:3000` |

### Resource Limits
| Contenedor | CPU | RAM |
|------------|-----|-----|
| Dashboard | 0.5 | 512MB |
| Ollama | — | 8GB |

### Docker Compose
- **`docker-compose.yml`** (dev): 5 servicios (dashboard, postgres, n8n, ollama) con healthchecks, NODE_ENV=development, volúmenes persistentes.
- **`docker-compose.prod.yml`** (Swarm): rolling update (parallelism=1, delay=10s, order=start-first, failure_action=rollback). 2 réplicas dashboard, placement constraints DB/GPU, resource limits.

### Despliegue
- **Dashboard**: Docker build multistage con `ARG CACHEBUST`
- **Actualización**: Dokploy detecta push a `main` y redeploya automáticamente. Rolling update vía Swarm para zero-downtime.
- **Backup**: Script `backup-docker.sh` corre diariamente a las 3AM vía n8n WF-07
- **Workflows n8n**: Se deployan via `scripts/deploy-workflows.js --activate`
- **CI/CD**: GitHub Actions con 4 jobs paralelos (quality, test, build, docker) + migrate + e2e.

### Comandos de Infra
```bash
# Redeploy dashboard (via Dokploy UI o SSH)
docker service update --force med-dashboard

# Deploy stack a Swarm (producción)
make docker-stack

# Backup manual
bash /opt/consultorio/scripts/backup-encriptado.sh

# Ver logs de n8n
docker logs $(docker ps -q -f name=n8n) --tail 100

# Ver logs de dashboard
docker logs $(docker ps -q -f name=med-dashboard) --tail 100

# CI completo (local)
make ci-full
```

---

## 💡 Skills y Herramientas

### Skills Disponibles (OpenCode)
Ubicadas en `.opencode/skills/`. Se cargan con `skill` tool.

| Skill | Archivo | Cuándo Usarla |
|-------|---------|---------------|
| **n8n-workflow-builder** | `.opencode/skills/n8n-workflow-builder/SKILL.md` | Diseñar, debuggear o refactorizar workflows n8n |
| **ollama-aicore** | `.opencode/skills/ollama-aicore/SKILL.md` | Optimizar prompts Gemma3, debuggear inferencia |
| **twilio-debugger** | `.opencode/skills/twilio-debugger/SKILL.md` | Problemas con WhatsApp, webhooks, rate limiting |
| **sql-aicore** | `.opencode/skills/sql-aicore/SKILL.md` | Diseñar esquemas DB, consultas optimizadas |
| **drizzle-migrations** | `.opencode/skills/drizzle-migrations/SKILL.md` | Crear/aplicar migraciones Drizzle seguras |
| **nextjs-deploy** | `.opencode/skills/nextjs-deploy/SKILL.md` | Build, deploy y troubleshooting Next.js en Dokploy |
| **dokploy-deploy** | `.opencode/skills/dokploy-deploy/SKILL.md` | Diagnosticar servicios VPS, logs, backups |
| **whatsapp-bot** | `.opencode/skills/whatsapp-bot/SKILL.md` | Flujos conversacionales Twilio WhatsApp |
| **design-taste-frontend** | `.opencode/skills/taste-skill/SKILL.md` | Perfil de diseño frontend |
| **emil-design-eng** | `.opencode/skills/emil-design-eng/SKILL.md` | UI polish, animaciones, detalles |
| **impeccable** | `.opencode/skills/impeccable/SKILL.md` | Auditoría de código, enforce estándares |
| **web-design-guidelines** | `.opencode/skills/web-design-guidelines/SKILL.md` | Revisión de UI contra Web Interface Guidelines (Vercel) |
| **ui-ux-pro-max** | `.opencode/skills/ui-ux-pro-max/SKILL.md` | UI/UX patterns, 58 reglas de diseño, best practices |
| **huashu-design** | `.opencode/skills/huashu-design/SKILL.md` | Sistema de diseño visual, tokens, animaciones, glassmorphism |
| **frontend-patterns** | `.opencode/skills/frontend-patterns/SKILL.md` | Patrones React/Next.js, state, performance |
| **graphify** | `.opencode/skills/graphify/SKILL.md` | Knowledge graph del codebase, queries, path/explain |
| **n8n-cli** | `.opencode/skills/n8n-cli/SKILL.md` | Interactuar con n8n CLI, workflows, credenciales |

### Plugins OpenCode Instalados (12)
- `opencode-agent-memory` — Memoria persistente entre sesiones
- `opencode-notify` — Notificaciones del OS
- `opencode-handoff` — Handoff prompts entre sesiones
- `opencode-pty` — Procesos background interactivos
- `opencode-scheduler` — Jobs recurrentes con cron
- `opencode-vibeguard` — Protección de secrets/PII
- `opencode-conductor` — Orquestación de subagentes
- `opencode-snippets` — Snippets reutilizables
- `@tarquinen/opencode-dcp` — Dynamic Context Pruning
- `open-trees` — Git worktrees
- `@ykaratkou/opencode-worktree` — Git worktrees (fork)
- `@warp-dot-dev/opencode-warp` — (preexistente)

---

## ⚡ Comandos Útiles

```bash
# Desarrollo
cd dashboard && npm run dev          # Iniciar servidor de desarrollo
cd dashboard && npm run build         # Build production (verificar errores)
cd dashboard && npx next build       # Build alternativo

# Base de datos
cd dashboard && npx drizzle-kit push:pg  # Push schema a DB local
cd dashboard && npx drizzle-kit generate  # Generar migración

# n8n
node scripts/deploy-workflows.js --activate  # Deploy workflows a n8n
node scripts/deploy-workflows.js --dry-run   # Simular deploy

# Tests
cd dashboard && npm run test              # Tests unitarios
cd dashboard && npm run test:coverage     # Tests con cobertura

# Storybook
cd dashboard && npx storybook dev -p 6006    # Iniciar Storybook local
cd dashboard && npx storybook build          # Build estático para deploy

# Git
git add . && git commit -m "tipo(scope): mensaje" && git push

# Ver estado
git status
git log --oneline -10
git diff
```

---

> **Este archivo debe ser consultado al inicio de cada sesión y actualizado cuando se agreguen, modifiquen o eliminen agentes, integraciones o cambios significativos en la arquitectura.**
