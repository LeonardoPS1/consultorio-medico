# Módulo Turnos

## Arquitectura

```
Routes (app/dashboard/turnos/)
  ├── page.tsx              → Server component, fetch + render
  ├── turnos-client.tsx     → Client orchestrator (3 vistas)
  ├── loading.tsx           → Skeleton loading state
  ├── nuevo/               → [futuro] Create page variant
  └── [id]/                → [futuro] Detail page variant

API (app/api/turnos/)
  ├── route.ts              → GET (list) / POST (create)
  ├── [id]/route.ts         → GET / PATCH / DELETE
  ├── day-view/route.ts     → GET (timeline data)
  └── bulk-status/route.ts  → PATCH (bulk update)

Components (components/turnos/)
  ├── turnos-header.tsx       → Toggle 3 vistas
  ├── turnos-date-nav.tsx     → Navegación fecha
  ├── turnos-filters.tsx      → Filtros expandibles
  ├── turnos-table.tsx        → Lista de turnos
  ├── turnos-calendar.tsx     → Vista calendario
  ├── turnos-day-view.tsx     → Vista día wrapper
  ├── turno-detail-modal.tsx  → Editar / Cancelar
  ├── turnos-waitlist-dialogs.tsx → Reasignar / Propuesta
  ├── turnos-patient-confirm.tsx  → Crear paciente on-the-fly
  └── day-timeline.tsx        → Timeline horizontal

Service (lib/services/turnos.ts) → 611 lines
```

## Endpoints API

### `GET /api/turnos`

Lista turnos con filtros.

**Parámetros query**: `fecha`, `fecha_desde`, `fecha_hasta`, `estado`, `medico`, `tipo`, `search`, `limit` (default 100), `offset`, `sucursalId`.

**Respuesta**: `{ data, total, statsTotal, statsPorEstado, fecha }`

- `data`: Array de turnos
- `statsTotal`: Conteo total por estado (para el día de `fecha` o `fecha_desde`)
- `statsPorEstado`: Desglose por estado (usado para los badges coloridos)

**Scoping**: Si `role=medico`, filtra automáticamente por `sessionMedicoId`.

### `POST /api/turnos`

Crea un turno. Schema de validación (Zod):

| Campo | Tipo | Requerido |
|-------|------|-----------|
| `pacienteId` | UUID | Sí |
| `medicoId` | UUID | Sí |
| `fecha` | Date (YYYY-MM-DD) | Sí |
| `hora` | String (HH:mm) | Sí |
| `motivo` | String | No |
| `tipoConsulta` | Enum | No (default `presencial`) |
| `duracionMinutos` | Int (10-120) | No (default 30) |
| `sucursalId` | UUID | No |

**Respuesta**: 201 + turno creado.

**Cache**: Revalida tags `TURNOS`, `PACIENTES`, `DASHBOARD_STATS`.

### `GET /api/turnos/[id]`

Detalle de turno con JOIN a pacientes y médicos.

**Respuesta**: Datos completos del turno más `pacienteNombre`, `pacienteApellido`, `pacienteTelefono`, `medicoNombre`, `medicoEspecialidad`.

### `PATCH /api/turnos/[id]`

Actualiza turno. Esquema de actualización:

| Campo | Tipo | Notas |
|-------|------|-------|
| `fecha` | Date | |
| `hora` | String | |
| `motivo` | String | |
| `estado` | Enum | Dispara side effects |
| `tipoConsulta` | Enum | |
| `duracionMinutos` | Int | |
| `pagado` | Boolean | |
| `precio` | Decimal | |
| `metodoPago` | String | |

**Side effects por cambio de estado**:

- `en_atencion` → setea `inicioAtencionAt`
- `cancelada` → setea `canceladoPor='dashboard'`, `motivoCancelacion`, dispara chain de waitlist
- `atendido` → dispara `sendSurveyWhatsApp()` fire-and-forget

**Respuesta**: 200 + turno actualizado.

### `DELETE /api/turnos/[id]`

Soft-delete (setea `deletedAt`). Requiere autorización (admin/secretaria/médico del turno).

### `GET /api/turnos/day-view`

Datos estructurados para la timeline del día.

**Parámetros**: `fecha` (requerido), `sucursalId`, `medicoId`.

**Respuesta**: `{ medicos: MedicoDia[], turnos: TurnoDia[], fecha }`

### `PATCH /api/turnos/bulk-status`

Actualización masiva de estados. Acepta `{ turnoIds: string[], estado }`.

## Reglas de Negocio

### Validación de Agenda

1. **Día de semana**: Si el médico tiene horarios configurados, el turno debe caer en un día activo (`horarios[dia].activo === true`)
2. **Ventana horaria**: Soporta dos tipos:
   - `corrido`: Bloque único (`inicio` - `fin`)
   - `partido`: Mañana + tarde (`inicio`/`fin` + `inicio2`/`fin2`)
3. **Bloqueos**: Consulta `bloqueosAgenda` (vacaciones, feriados, no disponible)
4. **Conflicto horario**: No pueden existir dos turnos no cancelados con mismo `medicoId` + `fechaHora` → HTTP 409

### Feature Gating

| Plan | Acceso |
|------|--------|
| Free | ❌ Bloqueado (5 turnos/mes, según `planes.ts`) |
| Starter | ✅ Ilimitado |
| Professional | ✅ |
| Business | ✅ |
| Enterprise | ✅ |

### Cache

- `turnos:list:{...}` — 10s TTL
- `turnos:dayview:{...}` — 10s TTL
- Tags de revalidación: `TURNOS`, `PACIENTES`, `DASHBOARD_STATS`

## Integraciones

| Servicio | Vía | Acción |
|----------|-----|--------|
| **Google Calendar** | n8n WF-08 (webhook) | create/update/delete con datos anonimizados |
| **Twilio WhatsApp** | n8n WF-01 / WF-03 | Recordatorios 24h y 1h, confirmación asistencia, encuesta post-consulta |
| **Waitlist** | Directo | Chain de reasignación automática al cancelar turno |
| **LiveKit** | Directo | Creación de sala de videollamada para telemedicina |
| **MercadoPago** | Columnas DB | Seguimiento de pago (`pagado`, `precio`, `metodoPago`) |

## Estados

```
pendiente ──→ confirmada ──→ en_atencion ──→ atendido ──→ completada
     │                              │
     └──→ cancelada                 └──→ no_asistio
```

| Cambio | Trigger UI | Side Effect |
|--------|-----------|-------------|
| → `en_atencion` | Botón Atender | `inicioAtencionAt` |
| → `cancelada` | Botón Cancelar | `canceladoPor`, notificación waitlist |
| → `atendido` | Botón Finalizar | Encuesta WhatsApp |

## Modelo de Datos

```sql
TABLE turnos (
  id              UUID PK DEFAULT gen_random_uuid(),
  paciente_id     UUID FK → pacientes.id NOT NULL,
  medico_id       UUID FK → medicos.id NOT NULL,
  fecha_hora      TIMESTAMPTZ NOT NULL,
  duracion_minutos INTEGER NOT NULL DEFAULT 30,
  motivo          TEXT,
  estado          turno_estado NOT NULL DEFAULT 'pendiente',
  tipo_consulta   turno_tipo NOT NULL DEFAULT 'consulta',
  notas_paciente  TEXT,
  notas_medico    TEXT,
  recordatorio_24h_enviado BOOLEAN DEFAULT FALSE,
  recordatorio_1h_enviado  BOOLEAN DEFAULT FALSE,
  confirmo_asistencia      BOOLEAN DEFAULT FALSE,
  fuente          VARCHAR(20) DEFAULT 'whatsapp',
  sucursal_id     UUID FK → sucursales.id,
  cancelado_por   VARCHAR(20),
  motivo_cancelacion TEXT,
  google_calendar_event_id VARCHAR(500),
  inicio_atencion_at TIMESTAMPTZ,
  pagado          BOOLEAN DEFAULT FALSE,
  precio          DECIMAL(10,2),
  metodo_pago     VARCHAR(30),
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  deleted_at      TIMESTAMPTZ   -- Soft delete
);
```

### Índices

- `idx_turnos_fecha_hora` ON `fecha_hora`
- `idx_turnos_medico_fecha` ON `medico_id, fecha_hora`
- `idx_turnos_estado` ON `estado`
- `idx_turnos_paciente_id` ON `paciente_id`
- `idx_turnos_sucursal_id` ON `sucursal_id`

### Enums

```sql
CREATE TYPE turno_estado AS ENUM (
  'pendiente', 'confirmada', 'en_atencion', 'atendido',
  'cancelada', 'no_asistio', 'completada'
);

CREATE TYPE turno_tipo AS ENUM (
  'consulta', 'control', 'urgencia', 'telemedicina',
  'procedimiento', 'otro'
);
```
