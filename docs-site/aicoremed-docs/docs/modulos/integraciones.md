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
