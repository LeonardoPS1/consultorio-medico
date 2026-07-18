# Módulo Conversaciones

## Arquitectura

```
API (app/api/)
  ├── conversaciones/
  │   ├── route.ts              → GET (list) / POST (create)
  │   └── [id]/
  │       ├── route.ts          → GET / PATCH
  │       └── mensajes/route.ts → GET / POST
  ├── webhooks/twilio/route.ts  → POST (inbound WhatsApp + status callback)
  └── sse/events/route.ts       → GET (eventos en tiempo real)

Client: app/dashboard/conversaciones/
  ├── page.tsx                    → Server component
  ├── conversaciones-client.tsx   → Split layout (lista + chat), SSE + React Query
  └── loading.tsx                 → Skeleton

Schemas: drizzle/communication.ts (conversaciones + mensajes)
Service: lib/data-store.ts (CRUD conversaciones + mensajes)
Webhook handler: app/api/webhooks/twilio/route.ts (593 líneas)
```

## Schemas

### `conversaciones`

| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | UUID PK | |
| `pacienteId` | UUID FK→pacientes.id | |
| `medicoId` | UUID FK→medicos.id | Opcional |
| `canal` | varchar(20) | whatsapp, sms, email, web |
| `estado` | varchar(20) | activa, pendiente, cerrada, derivada |
| `optOut` | boolean | default false |
| `ultimoMensaje` | text | |
| `ultimoMensajeRol` | varchar(20) | paciente, medico, asistente_ia |
| `ultimaIntencion` | varchar(30) | consulta, urgencia, receta... |
| `ultimaInteraccion` | timestamptz | |
| `contextoIa` | jsonb | Contexto del agente IA |
| `metadata` | jsonb | |
| `deletedAt` | timestamptz | Soft delete |

### `mensajes`

| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | UUID PK | |
| `conversacionId` | UUID FK→conversaciones.id | |
| `rol` | varchar(20) | paciente, medico, asistente_ia, secretaria, sistema |
| `contenido` | text | |
| `tipo` | varchar(20) | texto, imagen, audio, video, documento |
| `intencion` | varchar(30) | Detectada por IA |
| `confianzaIntencion` | decimal(4,3) | |
| `twilioSid` | varchar(255) | MessageSID de Twilio |
| `twilioStatus` | varchar(50) | received, sent, delivered, failed |
| `costo` | decimal(10,6) | |
| `n8nExecutionId` | varchar(255) | |

## Webhook Twilio (flujo completo)

```
POST /api/webhooks/twilio
  → 1. Rate limit: 60/min via withRateLimit
  → 2. Validación HMAC-SHA256 (obligatorio en prod)
  → 3. Status Callback? → updateMensajeByTwilioSid() → 200
  → 4. Extraer teléfono (remover prefijo whatsapp:/sms:)
  → 5. Buscar/crear paciente por teléfono
  → 6. Buscar/crear conversación activa (1 activa por paciente)
  → 7. Guardar mensaje con rol='paciente', twilioSid
  → 8. Detectar encuesta (1-5) → almacenar respuesta
  → 9. Detectar recordatorio (CONFIRMAR/CANCELAR/NO)
     → CONFIRMAR: actualiza turno, envía confirmación
     → CANCELAR: cancela turno, dispara waitlist + GCal
  → 10. Detectar waitlist (ACEPTAR/RECHAZAR) → handleWaitlistResponse()
  → 11. Fire-and-forget a n8n WF-01 (si no es respuesta automática)
  → 12. Notificar al médico vía WhatsApp
  → 13. Responder TwiML/JSON acuse
```

## Reglas de Negocio

- **1 conversación activa por paciente** — se reusa la existente
- **HMAC obligatorio en producción** — fallo → 403
- **Status callbacks** — actualizan estado del mensaje en DB (delivered, failed, etc.)
- **Respuestas automáticas** — recordatorios y waitlist se manejan sin IA
- **Forward a n8n condicional** — solo si no es status callback, recordatorio o waitlist
- **Notificación al médico** — WhatsApp con preview del mensaje (no si el remitente es el médico)
- **Soft-delete** via columna `deletedAt`

## Feature Gating

| Feature | Plan mínimo |
|---------|-------------|
| conversaciones | Starter |

## Integraciones

- **Twilio**: inbound + status callbacks vía webhook
- **n8n WF-01**: forward de mensajes para triaje IA (Ollama Gemma3)
- **SSE**: eventos `nuevo-mensaje` y `nueva-conversacion` en tiempo real
- **React Query**: refetch 30s conversaciones, 15s mensajes
