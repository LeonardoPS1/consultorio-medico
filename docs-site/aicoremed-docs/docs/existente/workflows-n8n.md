# 🔄 Workflows n8n — AicoreMed

> **12 workflows activos** · Automatización inteligente del consultorio
> **Última actualización:** 21/07/2026

---

## 📋 Índice

1. [Estructura de Archivos](#estructura-de-archivos)
2. [Matriz de Workflows](#matriz-de-workflows)
3. [WF-01: WhatsApp Inbound + Triaje IA](#wf-01-whatsapp-inbound-triaje-ia-critico)
4. [WF-02: Gestión de Turnos](#wf-02-gestion-de-turnos)
5. [WF-03: Recordatorios Automáticos](#wf-03-recordatorios-automaticos)
6. [WF-04: Correo Inteligente](#wf-04-correo-inteligente)
7. [WF-05: Resumen Diario del Médico](#wf-05-resumen-diario-del-medico)
8. [WF-06: Recetas y Renovaciones](#wf-06-recetas-y-renovaciones)
9. [WF-07: Backup Automático Encriptado](#wf-07-backup-automatico-encriptado)
10. [WF-08: Google Calendar Sync](#wf-08-google-calendar-sync)
11. [WF-09: Anonimización Post-Retención](#wf-09-anonimizacion-post-retencion)
12. [WF-11: Novedades desde Commits](#wf-11-novedades-desde-commits)
13. [WF-12: Actualizar Scores No-Show](#wf-12-actualizar-scores-no-show)
14. [Deploy de Workflows](#deploy-de-workflows)
15. [Buenas Prácticas](#buenas-practicas)

---

## Estructura de Archivos

```
n8n-workflows/
├── current/                          # ★ Workflows activos en producción
│   ├── workflow-01-agent.json        # WhatsApp Inbound + Triaje IA
│   ├── workflow-02-gestion-turnos.json
│   ├── workflow-03-recordatorios.json
│   ├── workflow-04-agent.json        # Correo Inteligente
│   ├── workflow-05-resumen-diario.json
│   ├── workflow-06-recetas.json
│   ├── workflow-07-backup.json
│   ├── workflow-08-google-calendar-sync.json
│   ├── workflow-09-anonimizar.json
│   ├── workflow-10-expiracion-waitlist.json
│   ├── workflow-11-novedades.json    # Novedades desde Commits
│   └── workflow-12-scores-no-show.json  # Scoring No-Show Nocturno
│
└── archive/                          # Versiones legacy y diseños
```

---

## Matriz de Workflows

| # | Nombre | Trigger | Nodos | Ollama | Twilio | PG | GCal | IMAP |
|   |--------|---------|-------|--------|--------|----|------|------|
| **01** | WhatsApp Inbound + Triaje IA | Webhook | 23 | ✅ 2 Agents (Triaje+Agenda) | ✅ | ✅ | ❌ | ❌ |
| **02** | Gestión de Turnos | Webhook | 9 | ✅ 2 nodos | ✅ | ✅ | ✅ | ❌ |
| **03** | Recordatorios Automáticos | Cron (c/hora) | 12 | ❌ | ✅ | ✅ | ❌ | ❌ |
| **04** | Correo Inteligente | IMAP (5 min) | 10 | ✅ Agent | ✅ | ✅ | ❌ | ✅ |
| **05** | Resumen Diario | Cron (7:00 AM) | 9 | ✅ 1 nodo | ✅ | ✅ | ❌ | ❌ |
| **06** | Recetas y Renovaciones | Webhook | 9 | ✅ 1 nodo | ✅ | ✅ | ❌ | ❌ |
| **07** | Backup Automático | Cron (3:00 AM) | 2 | ❌ | ❌ | ❌ | ❌ | ❌ |
| **08** | Google Calendar Sync | Webhook | 8 | ❌ | ❌ | ✅ | ✅ | ❌ |
| **09** | Anonimización Post-Retención | Cron (4:00 AM) | 5 | ❌ | ❌ | ✅ | ❌ | ❌ |
| **10** | Expiración Waitlist | Cron (diario) | — | ❌ | ✅ | ✅ | ❌ | ❌ |
| **11** | Novedades desde Commits | Webhook (GH) | 5 | ❌ | ❌ | ❌ | ❌ | ❌ |
| **12** | Scoring No-Show Nocturno | Cron (3:30 AM) | 3 | ❌ | ❌ | ✅ | ❌ | ❌ |

---

## WF-01: WhatsApp Inbound + Triaje IA ⭐ (Crítico)

### Propósito
Workflow principal que recibe mensajes de WhatsApp de pacientes, los procesa con
IA multi-agente y responde automáticamente. Usa **sub-agentes especializados con
handoff conversacional** — el paciente habla con un único asistente que deriva a
especialistas según la necesidad.

### Trigger
**Webhook** → `POST /webhook/consultorio-inbound`

### Flujo Multi-Agente
```
Twilio → Webhook (x-webhook-secret validado) →
  → Busca/crea paciente en PostgreSQL →
  → Consulta turnos próximos y recetas activas →
  → Construye contexto estructurado →

  ┌──────────────────────────────────────┐
  │ TRIAGE AGENT (clasifica + responde)  │
  │   • Saludo / info general / urgencia → responde directo (sin handoff)
  │   • Crear/cancelar/modificar turno  → HANDOFF → AGENDA AGENT
  │   • Recetas / consultas clínicas    → HANDOFF → CLÍNICO (Fase 2)
  └─────────────────┬────────────────────┘
                    │
              ┌─────┴─────┐
              │           │
          HANDOFF      SIN HANDOFF
              │           │
              ▼           ▼
  ┌─────────────────┐
  │ AGENDA AGENT    │    ──→ Merger → Parsear → Twilio → Log
  │ (turnos)        │
  │ temp=0.3        │
  │ memoria         │
  │ compartida      │
  └─────────────────┘
```

### Configuración IA

| Parámetro | Triaje Agent | Agenda Agent |
|-----------|-------------|--------------|
| Modelo | `gemma3` | `gemma3` |
| Base URL | `http://ollama:11434` | `http://ollama:11434` |
| Temperatura | 0.3 | 0.3 |
| Prompt | ~20 líneas (saludo + clasificación) | ~15 líneas (solo turnos) |
| Chat Memory | Postgres (sessionKey=phone) | Postgres (sessionKey=phone misma instancia) |

### Memoria Compartida
Ambos sub-agentes usan el mismo `sessionKey` (número de teléfono) en Postgres
Chat Memory. Como la memoria se almacena en PostgreSQL, todos los agentes
comparten el historial conversacional. El paciente no percibe el cambio.

### Mecanismo de Handoff
El Triaje Agent emite un marcador estructurado al final de su respuesta cuando
necesita delegar:

```
###HANDOFF###
{"destino": "agenda"}
###FIN###
```

Un Code node parsea el marcador y un IF node enruta al sub-agente. Si no hay
handoff, la respuesta del Triaje es la respuesta final.

### Acciones Estructuradas
El Agenda Agent (y futuros sub-agentes) pueden emitir acciones que requieren
cambios en la base de datos usando el mismo formato establecido:

```
###ACCION###
{"tipo": "crear_turno", "data": {"motivo": "...", "fecha": "..."}}
###FIN###
```

### Nodos (23 en total)
1. Webhook ← Twilio WhatsApp
2. Validar Mensaje (IF)
3. Extraer Datos (Set)
4. Obtener o Crear Paciente (PG)
5. Consultar Turnos del Paciente (PG)
6. Consultar Recetas Activas (PG)
7. Construir Contexto (Code)
8. Ollama - Triaje (Chat Model)
9. Postgres Memory - Triaje
10. **Triaje Agent** (AI Agent)
11. Extraer Output Triaje (Set)
12. Parsear Handoff (Code)
13. Hay Handoff? (IF)
14. Preparar Prompt Agenda (Code)
15. Ollama - Agenda (Chat Model)
16. Postgres Memory - Agenda
17. **Agenda Agent** (AI Agent)
18. Extraer Output Agenda (Set)
19. Merger (Merge)
20. Parsear y Preparar (Code)
21. Twilio - Enviar WhatsApp (HTTP)
22. Hay Accion? (IF)
23. PG nodes (Registrar, Guardar, Log)

### Logging
Cada respuesta incluye `subAgente` (`"triaje"` | `"agenda"` | `"clinico"` en
Fase 2) registrado en `workflow_logs.nivel` para trazabilidad.

### Seguridad
- Webhook autenticado con `x-webhook-secret`
- Mensajes sanitizados antes de enviar a IA
- Anti-jailbreak en system prompts de todos los sub-agentes

---

## WF-02: Gestión de Turnos

### Propósito
Procesa solicitudes de turno (creación, disponibilidad, cancelación) usando IA para extraer datos estructurados.

### Trigger
**Webhook** → `POST /webhook/turno-solicitar`

### Flujo
```
Webhook → Ollama extrae info (motivo, fecha, horario, médico) →
  → Verifica disponibilidad en PostgreSQL →
  → Calcula slots libres →
  → Ollama genera respuesta con horarios →
  → Crea turno en PostgreSQL →
  → Envía confirmación WhatsApp →
  → Crea evento Google Calendar
```

### Configuración IA
- Extracción: `gemma3`, temp=0.1 (estricto, JSON)
- Respuesta: `gemma3`, temp=0.7 (creativo, friendly)

---

## WF-03: Recordatorios Automáticos

### Propósito
Envía recordatorios de turnos a pacientes vía WhatsApp 24h y 1h antes.

### Trigger
**Cron** → Cada hora de 8:00 a 20:00

### Flujo
```
Cron → Consulta turnos con recordatorio pendiente a 24h →
  → Consulta turnos con recordatorio pendiente a 1h →
  → Arma mensaje con plantilla de DB →
  → Envía por WhatsApp →
  → Marca flags enviados
```

### Reglas de Negocio
| Regla | Descripción |
|-------|-------------|
| Horario | Solo 8:00-20:00 |
| Consentimiento | Solo pacientes con `consentimiento_whatsapp = TRUE` |
| No overlap | 24h excluye turnos dentro de 1h |
| Reintento | Si Twilio falla, flag no se marca |
| Plantillas | Configurables desde Dashboard → Configuración → Plantillas |

---

## WF-04: Correo Inteligente

### Propósito
Clasifica emails entrantes usando IA y toma acciones (responder, notificar al médico, spam).

### Trigger
**IMAP** → Cada 5 minutos (UNSEEN)

### Flujo
```
IMAP → Lee emails no leídos →
  → AI Agent clasifica (URGENTE/SPAM/RECETA/CONSULTA) →
  → Si URGENTE: notifica al médico vía WhatsApp →
  → Si SPAM: mueve a carpeta spam →
  → Otros: redacta borrador →
  → Loggea clasificación en PostgreSQL
```

### ⚠️ Pendiente
Requiere credenciales IMAP/SMTP reales configuradas en n8n.

---

## WF-05: Resumen Diario del Médico

### Propósito
Genera un resumen diario con turnos, pacientes nuevos, mensajes sin responder y recetas por autorizar.

### Trigger
**Cron** → Todos los días a las 7:00 AM

### Flujo
```
Cron → Consulta 4 fuentes en PostgreSQL:
  - Turnos de hoy
  - Pacientes nuevos (últimas 24h)
  - Mensajes sin responder
  - Recetas por autorizar
  → Mergea datos →
  → Ollama genera resumen (temp=0.3, maxTokens=800) →
  → Envía email detallado →
  → Envía WhatsApp breve →
  → Loggea en PostgreSQL
```

---

## WF-06: Recetas y Renovaciones

### Propósito
Gestiona solicitudes de recetas: analiza si es renovación o nueva, notifica al médico y genera PDF.

### Trigger
**Webhook** → `POST /webhook/receta-solicitar`

### Flujo
```
Webhook → Ollama analiza: ¿renovación? medicamento, dosis →
  → Si renovación: auto-crea refill →
  → Si nueva: notifica al médico vía WhatsApp →
  → Genera PDF de la receta →
  → Envía PDF por WhatsApp →
  → Loggea en PostgreSQL
```

---

## WF-07: Backup Automático Encriptado

### Propósito
Ejecuta backup diario de PostgreSQL con encriptación y limpieza de backups antiguos.

### Trigger
**Cron** → Todos los días a las 3:00 AM

### Flujo
```
Cron → Ejecuta script /opt/consultorio/scripts/backup-encriptado.sh →
  pg_dump → compresión gzip → encriptación AES-256 →
  → Limpieza: elimina backups de más de 30 días
```

---

## WF-08: Google Calendar Sync

### Propósito
Sincroniza turnos con Google Calendar (creación, actualización, eliminación).

### Trigger
**Webhook** → `POST /webhook/google-calendar-sync`

### Flujo
```
Webhook → Recibe acción (create/update/delete) →
  → Enruta según acción →
  → create: Crea evento en GCal, guarda event ID en turnos
  → update: Actualiza evento existente
  → delete: Elimina evento de GCal
  → Loggea en PostgreSQL
```

### Integración con Dashboard
- `syncTurnoToGCal()` en `lib/google-calendar-sync.ts`
- Se dispara desde `turnosService.create()` y `turnosService.update()`

---

## WF-09: Anonimización Post-Retención

### Propósito
Elimina datos de pacientes que han superado el período de retención legal (90 días desde baja).

### Trigger
**Cron** → Todos los días a las 4:00 AM

### Flujo
```
Cron → POST a /api/privacidad/anonimizar (con x-webhook-secret) →
  → Ejecuta privacidadService.anonimizarPostRetencion() →
  → UPDATE pacientes SET datos_anonimizados = TRUE →
  → Hard-delete de datos residuales →
  → Loggea resultado en workflow_logs
```

### Cumplimiento Legal
- Ley de datos personales (Chile)
- Período de retención configurable (default: 90 días)
- No reversible (anonimización completa)

---

## WF-11: Novedades desde Commits

### Propósito
Genera automáticamente entradas de novedades a partir de los mensajes de commits de GitHub.

### Trigger
**Webhook** → `POST /webhook/novedades-generar` (GitHub Push)

### Flujo
```
GitHub Push → Webhook → POST /api/novedades/generar (x-internal-key) →
  → Si generó novedades: OK →
  → Sin commits nuevos: skip
```

### Configuración
- Webhook de GitHub configurado apuntando a `https://med.aicorebots.com/webhook/novedades-generar`
- Usa `NOVEDADES_INTERNAL_KEY` como header de autenticación
- Dashboard API clasifica commits por tipo (`feat`, `fix`, `perf`, `security`, `chore`) y crea entradas en la tabla `novedades`

---

## WF-12: Actualizar Scores No-Show

### Propósito
Workflow nocturno que actualiza el score de riesgo de inasistencia (`risk_score`) para turnos próximos y envía recordatorios anticipados (48h) a pacientes de alto riesgo.

### Trigger
**Cron** → Todos los días a las 3:30 AM

### Nodos
3 (Cron → HTTP Request → noOp)

### Flujo
```
Cron (3:30 AM) → POST /api/internal/scores/actualizar (x-internal-key) →
  → Dashboard ejecuta scoringPacientesService.actualizarScoresBatch(30) →
    → Calcula risk_score para turnos de los próximos 30 días →
    → Envía recordatorios 48h a pacientes con riesgo alto/crítico →
    → Loggea todo en workflow_logs
```

### Integración con WF-03
WF-03 (Recordatorios Automáticos) fue modificado para incluir un tercer bloque de recordatorios:

| Bloque | Antelación | Destinatarios |
|--------|------------|---------------|
| 1 (nuevo) | 48h | Solo pacientes con `risk_nivel = alto` o `crítico` |
| 2 (original) | 24h | Todos los pacientes con turno próximo |
| 3 (original) | 1h | Todos los pacientes con turno próximo |

---

## Deploy de Workflows

### Script
```bash
# Deploy con activación
N8N_API_KEY=tu_key N8N_BASE_URL=http://localhost:5678 \
  node scripts/deploy-workflows.js --activate

# Simular deploy (dry-run)
node scripts/deploy-workflows.js --dry-run

# Deploy manual via API
curl -X POST https://n8n.aicorebots.com/rest/workflows \
  -H "Authorization: Bearer $N8N_API_KEY" \
  -H "Content-Type: application/json" \
  -d @n8n-workflows/current/workflow-01-agent.json
```

### Consideraciones
- Los workflows se importan/exportan como JSON
- Las credenciales se configuran manualmente en la UI de n8n
- Los webhooks requieren `x-webhook-secret` para autenticación
- Cron jobs usan la timezone de Chile (UTC-4)

---

## Buenas Prácticas

### Para Desarrolladores
1. **Versionar** los JSON de workflows en `n8n-workflows/current/`
2. **Documentar** cambios en este archivo y en AGENTS.md
3. **Testear** en entorno de desarrollo antes de deployar a producción
4. **Usar Postgres Chat Memory** en AI Agents en vez de toolCode
5. **Pre-cargar datos** del paciente en el prompt (evita sandbox de n8n)
6. **Temperatura baja** (0.1-0.3) para extracción de datos
7. **Temperatura media** (0.7) para respuestas al paciente
8. **Agregar webhook secrets** a todos los webhooks expuestos

### Errores Comunes
- ❌ ToolCode que falla silenciosamente → usar `console.log` en Function nodes
- ❌ AI Agent sin memoria → configurar Postgres Chat Memory
- ❌ Webhooks sin autenticación → agregar `x-webhook-secret`
- ❌ Timeouts en Ollama → mantener modelo cargado en memoria
