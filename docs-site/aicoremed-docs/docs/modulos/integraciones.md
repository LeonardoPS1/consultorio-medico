# Módulo Integraciones — Webhooks Salientes

## Arquitectura

```
lib/services/webhooks.ts         → CRUD webhook configs + delivery engine
lib/webhook-outbox.ts             → Fire-and-forget delivery con retry
drizzle/operations.ts             → webhook_configs + webhook_logs tables
app/api/webhooks/
  ├── configs/route.ts            → GET (list) / POST (create)
  ├── configs/[id]/route.ts       → GET / PATCH / DELETE
  ├── configs/[id]/test/route.ts  → POST (test delivery)
  ├── configs/[id]/regenerate-secret/route.ts → POST
  └── logs/route.ts               → GET (delivery logs paginados)
components/configuracion/webhooks-tab.tsx → UI en Configuración → Integraciones
```

## Esquema de Datos

### `webhook_configs`

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID PK | Identificador único |
| `tenant_id` | UUID FK | Tenant propietario |
| `evento` | varchar(50) | Tipo de evento |
| `url` | text | URL de destino (HTTPS obligatorio) |
| `secret` | varchar(64) | Secreto HMAC generado automáticamente |
| `activo` | boolean | Si está habilitado (default true) |
| `ultimo_estado` | varchar(20) | `ok`, `error`, `pendiente` |
| `deleted_at` | timestamptz | Soft delete |

Unique constraint: `(tenant_id, evento, url)` — no duplicados.

### `webhook_logs`

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID PK | Identificador único |
| `config_id` | UUID FK | Configuración asociada |
| `evento` | varchar(50) | Evento disparado |
| `payload` | jsonb | Contenido del payload enviado |
| `url` | text | URL de destino |
| `status_code` | integer | Código HTTP de respuesta |
| `respuesta` | text | Cuerpo de la respuesta |
| `duracion_ms` | integer | Duración total (incluye reintentos) |
| `intentos` | integer | Número de intentos realizados |
| `error` | text | Mensaje de error si falló |

## Eventos Disponibles

| Evento | Disparador |
|--------|-----------|
| `turno.creado` | turnosService.create() |
| `turno.actualizado` | turnosService.update() |
| `turno.cancelado` | turnosService.cancel() |
| `paciente.creado` | pacientesService.create() |
| `paciente.actualizado` | pacientesService.update() |
| `receta.creada` | recetasService.create() |
| `derivacion.creada` | derivacionesService.create() |
| `derivacion.actualizada` | derivacionesService.update() |
| `pago.completado` | pagosService (webhook MP) |

## Mecanismo de Entrega

### Firma HMAC-SHA256

Cada payload se firma con HMAC-SHA256 usando el secreto de la configuración:

```
POST /webhook-endpoint
Content-Type: application/json
X-Webhook-Signature: sha256=<hmac-hex>
X-Webhook-Timestamp: <unix-ms>
X-Webhook-Event: turno.creado

{ ... payload ... }
```

### Reintentos con Exponential Backoff

| Intento | Espera |
|---------|--------|
| 1 | 1s |
| 2 | 2s |
| 3 | 4s |

Timeout por intento: 10 segundos. Máximo 3 intentos.

### Engine: `webhook-outbox.ts`

El servicio `emitirWebhook(evento, payload, tenantId)`:
1. Busca todas las configuraciones activas para ese evento+tenant
2. Ejecuta entregas en paralelo con `Promise.allSettled`
3. Loggea cada resultado en `webhook_logs`
4. Actualiza `ultimo_estado` en la configuración (`ok`/`error`)
5. Fire-and-forget: no bloquea la operación principal

## Feature Gate

| Feature | Plan mínimo |
|---------|-------------|
| webhooks salientes | Professional |

## UI

Las configuraciones se administran desde **Configuración → Integraciones**:

- Lista de webhooks con estado (dot verde/rojo/pendiente)
- Crear: seleccionar evento, ingresar URL, se genera secreto automáticamente
- Editar: cambiar URL, evento, activar/desactivar
- Test: envía payload de prueba y muestra resultado
- Regenerar secreto: genera nuevo HMAC secret
- Logs: historial de entregas con estado HTTP, duración, error
- Revelar secreto: toggle para copiar el secreto

---

# Canal de Mensajería — Chatwoot + Evolution API

AicoreMed puede enrutar la mensajería del paciente a través de **Chatwoot** (inbox self-hosted) conectado a **Evolution API** (WhatsApp), además del canal Twilio legacy.

| Propiedad | Valor |
|-----------|-------|
| Flag | `CANAL_MENSAJERIA` = `chatwoot` \| `twilio` |
| Cliente | `lib/services/chatwoot.ts` |
| Router | `lib/whatsapp.ts` — `sendWhatsApp()` enruta según el canal |
| Webhook | `POST /api/webhooks/chatwoot` |
| Firma | `x-chatwoot-signature` HMAC-SHA256 (o `x-hub-signature-256`) |
| Inboxes | `CHATWOOT_PATIENT_INBOX_ID` (pacientes) y `CHATWOOT_SUPPORT_INBOX_ID` (soporte) |

Env vars: `CHATWOOT_API_URL`, `CHATWOOT_BOT_TOKEN`, `CHATWOOT_ACCOUNT_ID` (default `1`), `CHATWOOT_PATIENT_INBOX_ID`, `CHATWOOT_SUPPORT_INBOX_ID`, `CHATWOOT_WEBHOOK_SECRET`.

`getActiveMessagingChannel()` (default `chatwoot` en el cliente; `twilio` como fallback en las rutas de webhook). En modo `chatwoot`, `sendWhatsApp()` requiere `conversationId` (busca/crea la conversación vía API); si no existe, loggea warning.

## Flujo del webhook entrante

1. Chatwoot firma el evento con HMAC-SHA256 del body (`x-chatwoot-signature`).
2. `verifyWebhookSignature()` valida con `timingSafeEqual` (falla en producción si `CHATWOOT_WEBHOOK_SECRET` no está configurado).
3. Solo procesa `message_created` con `message_type != 1` (salientes se ignoran).
4. Busca/crea paciente por teléfono, reutiliza o crea conversación activa en DB y persiste el mensaje (con metadata `chatwootMessageId`, `conversationId`, `inboxId`, `esSoporte`).
5. Respuestas a encuestas (1-5) y recordatorios (CONFIRMAR/CANCELAR) se ignoran aquí (las manejan otros flujos).
6. Forward a n8n `POST /webhook/consultorio-inbound` con `canal: 'chatwoot'`, `chatwootConversationId`, `chatwootContactId`, `inboxId`, `esSoporte` y header `X-Idempotency-Key` (sha256 del message id, evita duplicados).

## Soporte en el Dashboard

Feature `soporte` (plan Starter+), nav item `/dashboard/soporte`:

- `POST /api/soporte/enviar` (sesión autenticada): si `CANAL_MENSAJERIA=chatwoot` y `CHATWOOT_SUPPORT_INBOX_ID` existe → crea contacto + conversación en Chatwoot y envía mensaje; si no, cae a Twilio (`TWILIO_DOCTOR_NUMBER`); si no hay canal → 503.
- El onboarding detecta el canal en el paso `configuracion_whatsapp` (`CANAL_MENSAJERIA` + presencia de `CHATWOOT_API_URL`/`CHATWOOT_BOT_TOKEN`).

# MercadoPago — Billing Robusto

| Propiedad | Valor |
|-----------|-------|
| Idempotencia | Caché en memoria (Map) con TTL 5 min — evita cargos/efectos duplicados si MercadoPago reenvía el mismo webhook |
| Grace period | 7 días (`GRACE_PERIOD_DAYS = 7` en `app/api/pagos/webhook/route.ts`, configurable con `MP_GRACE_PERIOD_DAYS`) |
| Estado intermedio | `past_due` — el plan se mantiene activo durante la gracia en vez de cancelarse de inmediato |
| Cron nocturno | `POST /api/internal/suscripciones-vencidas` (header `x-internal-key`): suscripciones `past_due` con `period_end` vencido → `cancelled` + usuario downgrade a `free` (busca el usuario vía `metadata.userId`) |

En el webhook de pago, una notificación `rejected` marca la suscripción como `past_due` con `graceEnd = now + GRACE_PERIOD_DAYS` en vez de cancelar inmediatamente.
