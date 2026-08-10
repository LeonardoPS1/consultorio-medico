# Módulo Lista de Espera

## Arquitectura

```
Routes (app/dashboard/lista-espera/)
  ├── page.tsx            → Server component (KPIs: en espera, pacientes únicos, médicos, sin turno)
  ├── lista-espera-client.tsx → Lista expandible + modal "Asignar turno" 2 pestañas + historial ofrecidos
  └── loading.tsx         → Skeleton

API (app/api/waitlist/)
  ├── route.ts                    → GET (listar) / POST (agregar)
  ├── [id]/route.ts               → DELETE (cancelar inscripción)
  ├── [id]/oferta/route.ts        → POST (turno existente | franja libre)
  ├── ofertas/route.ts            → GET (listar ofertas por inscripción)
  ├── ofertas/[id]/aceptar/route.ts → POST (aceptar → reasigna)
  ├── ofertas/[id]/rechazar/route.ts → POST (rechazar)
  ├── turnos-disponibles/route.ts → GET (turnos futuros del médico)
  ├── franjas/route.ts            → GET (próximas franjas libres)
  ├── candidatos/route.ts         → GET (primer candidato FIFO)
  ├── reasignar/route.ts          → POST (wrapper aceptar)
  └── pipeline/route.ts           → POST (WF-10, cron 5min, x-webhook-secret)

Service: lib/services/waitlist.ts (848 líneas)
Prefix: lib/whatsapp-waitlist.ts (notificaciones + handleWaitlistResponse)
```

## Schema (drizzle/waitlist.ts)

### lista_espera

| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | UUID PK | |
| `pacienteId` | UUID FK→pacientes.id | |
| `medicoId` | UUID FK→medicos.id | |
| `fechaInscripcion` | timestamptz | default now (base FIFO) |
| `estado` | varchar(20) | `activa`, `cancelada`, `cumplida` |
| `sucursalId` | UUID FK→sucursales.id | |
| `notas` | text | |
| `tenantId` | uuid | multi-tenant |

Índices: `idx_wa_paciente`, `idx_wa_medico`, `idx_wa_estado`.

### ofertas_turno

| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | UUID PK | |
| `listaEsperaId` | UUID FK→lista_espera.id | |
| `turnoId` | UUID FK→turnos.id | |
| `fechaOferta` | timestamptz | default now |
| `expiracion` | timestamptz | NOT NULL (now + 15 min) |
| `estado` | varchar(20) | `pendiente`, `aceptada`, `rechazada`, `expirada` |
| `notificada` | boolean | |
| `notificadaAt` | timestamptz | |
| `respondedAt` | timestamptz | |

Índices: `idx_oferta_lista_espera`, `idx_oferta_turno`, `idx_oferta_estado`, `idx_oferta_expiracion`.

## Flujo de Turno Ofrecido

### Pipeline automático (WF-10, cron cada 5 min)

```
Cancelación de turno
  → buscarCandidato() [FIFO por fechaInscripcion, excluye >3 ofertas/día → pausa 24h]
  → crearOferta()
  → notificarOfertaTurno() [WhatsApp: "Te ofrecemos un turno... respondé ACEPTAR o RECHAZAR"]
  → expiración 15 min → siguiente candidato
```

### Modal manual (2 pestañas) en `lista-espera-client.tsx`

1. Botón **"Asignar turno"** en cada item activo → abre Dialog "Asignar turno (turno ofrecido)"
2. Selector **"Paciente en espera"**: filtra inscripciones del MISMO médico con estado `activa`; default = el item propio
3. `Tabs`:
   - **Turno existente**: `GET /api/waitlist/turnos-disponibles?medicoId` → fecha·hora + paciente actual + badge estado, botón "Ofrecer"
   - **Franja libre**: `GET /api/waitlist/franjas?medicoId&dias=7&limite=15` → fecha·hora + duración, botón "Ofrecer en este horario"
4. Preview de destino ("Destino:" turno o franja según pestaña)
5. `confirmarOferta()` → POST casilla: `{tipo:'turno', turnoId}` o `{tipo:'franja', fechaHora, pacienteId, medicoId}`
6. Éxito: toast **"Turno ofrecido y notificado por WhatsApp"**

## API Endpoints

| Método | Ruta | Params/Body | Respuesta |
|--------|------|-------------|-----------|
| GET | `/api/waitlist` | `medicoId`, `estado` | `success(items)` con pacienteNombre/telefono, medicoNombre |
| POST | `/api/waitlist` | `{pacienteId*, medicoId*, notas?, sucursalId?}` | `created(item)`; 409 si ya hay inscripción activa del par |
| DELETE | `/api/waitlist/[id]` | id | `success({deleted:true})` (solo si activa) |
| POST | `/api/waitlist/[id]/oferta` | `{tipo:'turno', turnoId}` \| `{tipo:'franja', fechaHora, pacienteId, medicoId}` | `created(oferta)` (caso B crea turno nuevo) |
| GET | `/api/waitlist/ofertas` | `listaEsperaId`, `estado` | `success(items)` |
| POST | `/api/waitlist/ofertas/[id]/aceptar` | id | `success(result)` (reasigna + notifica) |
| POST | `/api/waitlist/ofertas/[id]/rechazar` | id | `success({rechazada:true})` |
| GET | `/api/waitlist/turnos-disponibles` | `medicoId` (requerido) | `success(turnos)` (pendiente/confirmada/cancelada, fecha/hora es-CL) |
| GET | `/api/waitlist/franjas` | `medicoId`, `dias` (7), `limite` (15) | `success([{fechaHora, fecha, hora, duracionMinutos}])` |
| GET | `/api/waitlist/candidatos` | `medicoId` | `success({data: candidatos[]})` |
| POST | `/api/waitlist/reasignar` | `{ofertaId*}` | `ok({success,...result})` |
| POST | `/api/waitlist/pipeline` | `x-webhook-secret` | `success({expiradas, nuevasOfertas, ofertas, mensaje})` |

## Estados UI de las Ofertas

| Estado | Badge |
|--------|-------|
| `pendiente` | `bg-amber-500` → "Pendiente de confirmación" |
| `aceptada` | `bg-emerald-500` → "Aceptada" |
| `rechazada` | outline → "Rechazada" |
| `expirada` | secondary → "Expirada" |

## Reglas de Negocio

- **FIFO estricto**: candidato más antiguo por `fechaInscripcion`
- **Expiración**: `TIEMPO_EXPIRACION_MINUTOS = 15` desde la creación
- **Límite**: `LIMITE_OFERTAS_POR_DIA = 3` por paciente (al superar → pausa 24h)
- **Máx 1 oferta pendiente** por paciente
- **Inscripción activa requerida** para ofrecer
- **Casos de oferta manual**:
  - Turno existente: debe ser del mismo médico, futuro, estado ∈ {pendiente, confirmada, cancelada}
  - Franja libre: verifica el slot contra `proximasFranjasLibres()`, crea turno nuevo `pendiente` (fuente `web`)
- **Renombrado**: la UI/mensajes usan "turno ofrecido"; los identificadores internos (tabla, rutas `/api/waitlist/ofertas`, `crearOferta`) se mantienen intactos

## Intercepción WhatsApp/Chatwoot

`handleWaitlistResponse(pacienteId, body, telefono, conversationId?)` — **determinístico sin IA**:

- Detecta `ACEPTAR|SI|OK|CONFIRMAR` y `RECHAZAR|NO|RECHAZO` (trim + mayúsculas)
- Busca la oferta pendiente más reciente; si no → "no encontré un turno ofrecido pendiente"; si expiró → "ya expiró"
- Aceptar → `waitlistService.aceptar()` + confirmación + aviso al médico por el mismo canal; Rechazar → `rechazar()` + aviso
- Callers: webhook Twilio (antes de forward n8n) y webhook Chatwoot (misma intercepción, responde por `conversation.id`)

## Feature Gating

| Feature | Plan mínimo |
|---------|-------------|
| lista-espera | Professional |

## Integraciones

- **WhatsApp**: `lib/whatsapp.ts` canal unificado (Chatwoot/Evolution primero, Twilio fallback)
- **n8n WF-10**: pipeline automático de expiración + candidatos (cron 5min)
- **Notificaciones**: `notificarOfertaTurno` (exige `consentimientoWhatsapp`), `notificarMedicoReasignacion`, `notificarConfirmacionReasignacion`, `notificarPacienteReasignado`

## Service (lib/services/waitlist.ts)

| Función | Descripción |
|---------|-------------|
| `agregar` / `quitar` | CRUD inscripción |
| `buscarCandidato` / `buscarCandidatoExcluyendo` | FIFO con límite de ofertas |
| `crearOferta` | Turno existente o franja libre |
| `aceptar` | Reasigna turno al inscrito, oferta→aceptada, inscripción→cumplida, notifica |
| `rechazar` | Oferta→rechazada |
| `expirarPendientes` | Marca vencidas |
| `ejecutarPipeline` | WF-10: expira + encadena candidatos |
| `listar` / `turnosDisponibles` / `listarOfertas` | Vistas |
| `proximasFranjasLibres` | Calcula slots libres desde `medicos.horarios` (soporta horario partido), excluye turnos no cancelados/no_asistio y `bloqueosAgenda` |