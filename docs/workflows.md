# 🔄 Workflows n8n — AicoreMed

> **9 workflows activos** · Automatización inteligente del consultorio
> **Última actualización:** 03/06/2026

---

## 📋 Índice

1. [Estructura de Archivos](#estructura-de-archivos)
2. [Matriz de Workflows](#matriz-de-workflows)
3. [WF-01: WhatsApp Inbound + Triaje IA](#wf-01-whatsapp-inbound--triaje-ia)
4. [WF-02: Gestión de Turnos](#wf-02-gestión-de-turnos)
5. [WF-03: Recordatorios Automáticos](#wf-03-recordatorios-automáticos)
6. [WF-04: Correo Inteligente](#wf-04-correo-inteligente)
7. [WF-05: Resumen Diario del Médico](#wf-05-resumen-diario-del-médico)
8. [WF-06: Recetas y Renovaciones](#wf-06-recetas-y-renovaciones)
9. [WF-07: Backup Automático Encriptado](#wf-07-backup-automático-encriptado)
10. [WF-08: Google Calendar Sync](#wf-08-google-calendar-sync)
11. [WF-09: Anonimización Post-Retención](#wf-09-anonimización-post-retención)
12. [Deploy de Workflows](#deploy-de-workflows)
13. [Buenas Prácticas](#buenas-prácticas)

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
│   └── workflow-09-anonimizar.json
│
└── archive/                          # Versiones legacy y diseños
```

---

## Matriz de Workflows

| # | Nombre | Trigger | Nodos | Ollama | Twilio | PG | GCal | IMAP |
|---|--------|---------|-------|--------|--------|----|------|------|
| **01** | WhatsApp Inbound + Triaje IA | Webhook | 17 | ✅ Agent | ✅ | ✅ | ❌ | ❌ |
| **02** | Gestión de Turnos | Webhook | 9 | ✅ 2 nodos | ✅ | ✅ | ✅ | ❌ |
| **03** | Recordatorios Automáticos | Cron (c/hora) | 12 | ❌ | ✅ | ✅ | ❌ | ❌ |
| **04** | Correo Inteligente | IMAP (5 min) | 10 | ✅ Agent | ✅ | ✅ | ❌ | ✅ |
| **05** | Resumen Diario | Cron (7:00 AM) | 9 | ✅ 1 nodo | ✅ | ✅ | ❌ | ❌ |
| **06** | Recetas y Renovaciones | Webhook | 9 | ✅ 1 nodo | ✅ | ✅ | ❌ | ❌ |
| **07** | Backup Automático | Cron (3:00 AM) | 2 | ❌ | ❌ | ❌ | ❌ | ❌ |
| **08** | Google Calendar Sync | Webhook | 8 | ❌ | ❌ | ✅ | ✅ | ❌ |
| **09** | Anonimización Post-Retención | Cron (4:00 AM) | 5 | ❌ | ❌ | ✅ | ❌ | ❌ |

---

## WF-01: WhatsApp Inbound + Triaje IA ⭐ (Crítico)

### Propósito
Workflow principal que recibe mensajes de WhatsApp de pacientes, los procesa con IA y responde automáticamente.

### Trigger
**Webhook** → `POST /webhook/consultorio-inbound`

### Flujo
```
Twilio → Webhook (x-webhook-secret validado) →
  → Busca/crea paciente en PostgreSQL por teléfono →
  → Consulta turnos próximos y recetas activas →
  → Construye contexto estructurado →
  → AI Agent (Ollama Mistral + Chat Memory) →
  → Analiza intención →
  → Ejecuta acción (responder, crear turno, etc.) →
  → Envía respuesta vía Twilio WhatsApp →
  → Loggea todo en PostgreSQL
```

### Configuración IA
| Parámetro | Valor |
|-----------|-------|
| Modelo | `mistral` |
| Base URL | `http://ollama:11434` |
| Temperatura | 0.3 |
| Chat Memory | Postgres (`n8n_chat_histories`, sessionKey=teléfono, contextWindow=10) |

### Seguridad
- Webhook autenticado con `x-webhook-secret`
- Mensajes sanitizados antes de enviar a IA
- Anti-jailbreak en system prompt

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
- Extracción: `mistral`, temp=0.1 (estricto, JSON)
- Respuesta: `mistral`, temp=0.7 (creativo, friendly)

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
