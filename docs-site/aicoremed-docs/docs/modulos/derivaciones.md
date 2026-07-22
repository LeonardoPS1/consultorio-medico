# Módulo Derivaciones

## Arquitectura

```
Routes (app/dashboard/derivaciones/)
  ├── page.tsx                      → Server component (stats + lista)
  ├── derivaciones-client.tsx       → Cliente con CRUD + cross-tenant
  ├── loading.tsx                   → Skeleton
  └── error.tsx                     → Error boundary

API (app/api/derivaciones/)
  ├── route.ts                      → GET (list) / POST (create)
  ├── medicos/route.ts              → GET (médicos disponibles)
  └── [id]/route.ts                 → GET / PATCH / DELETE

Cross-tenant consent
  ├── app/api/consentimiento-compartir/
  │   ├── route.ts                  → GET / POST
  │   └── [id]/route.ts             → GET / PATCH / DELETE
  ├── lib/services/consentimiento-compartir.ts → CRUD + firmar + revocar
  └── drizzle/access.ts             → consentimiento_compartir table

Convenios
  ├── app/api/convenios/route.ts    → GET / POST (admin-only)
  ├── app/api/convenios/[id]/route.ts → PATCH / DELETE
  ├── lib/services/convenios.ts     → CRUD + estado + verificación
  └── drizzle/tenant.ts             → convenios_intercambio table
```

## Schema

### `derivaciones`

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID PK | |
| `paciente_id` | UUID FK→pacientes | Paciente derivado |
| `medico_origen_id` | UUID FK→medicos | Médico que deriva |
| `medico_destino_id` | UUID FK→medicos | Médico destino (opcional) |
| `especialidad` | varchar(100) | Especialidad solicitada |
| `motivo` | text | Motivo de la derivación |
| `diagnostico` | text | Diagnóstico asociado |
| `cie10_codigo` | varchar(10) | Código CIE-10 |
| `gravedad` | varchar(20) | `normal`, `urgente`, `prioritaria` |
| `estado` | varchar(20) | `pendiente`, `aceptada`, `rechazada`, `completada` |
| `consentimiento_id` | UUID FK→consentimiento_compartir | Consentimiento asociado (cross-tenant) |
| `tenant_destino_id` | UUID FK→tenants | Tenant destino (cross-tenant) |
| `created_at` | timestamptz | |
| `deleted_at` | timestamptz | Soft delete |

### `consentimiento_compartir`

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID PK | |
| `paciente_id` | UUID FK | Paciente que otorga consentimiento |
| `medico_origen_id` | UUID FK | Médico de origen |
| `medico_destino_id` | UUID FK | Médico destino autorizado |
| `tenant_destino_id` | UUID FK | Organización destino |
| `alcance` | varchar(30) | Ver tabla de alcances |
| `datos_autorizados` | jsonb | Campos específicos autorizados |
| `estado` | varchar(20) | `pendiente`, `firmado`, `revocado`, `expirado` |
| `fecha_expiracion` | timestamptz | Opcional — expira automática |
| `firma_paciente_at` | timestamptz | Fecha de firma |
| `ip_firma` | varchar(50) | IP desde donde se firmó |
| `metadata` | jsonb | |

### `convenios_intercambio`

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID PK | |
| `tenant_origen_id` | UUID FK | Organización origen |
| `tenant_destino_id` | UUID FK | Organización destino |
| `estado` | varchar(20) | `activo`, `inactivo` |
| `fecha_inicio` | timestamptz | Inicio del convenio |
| `fecha_fin` | timestamptz | Fin del convenio (NULL = indefinido) |
| `metadata` | jsonb | |

Unique constraint: `(tenant_origen_id, tenant_destino_id)`.

## Alcances de Consentimiento

| Alcance | Datos compartidos |
|---------|------------------|
| `historial_completo` | Todo el historial clínico, turnos, recetas, diagnósticos |
| `solo_recetas` | Solo recetas activas e históricas |
| `solo_turnos` | Solo turnos y agenda |
| `solo_diagnosticos` | Solo historial de diagnósticos CIE-10 |

## Flujo Cross-Tenant

```
1. Admin configura convenio entre Tenant A y Tenant B (Enterprise)
2. Médico de Tenant A inicia derivación y selecciona consentimiento
3. Paciente firma consentimiento (alcance específico)
4. Derivación se crea con consentimientoId + tenantDestinoId
5. Médico de Tenant B responde (acepta/rechaza/completa)
6. consentimientoCompartirService.verificarAcceso() protege el acceso a datos
```

## Feature Gates

| Feature | Plan mínimo |
|---------|-------------|
| derivaciones (mismo tenant) | Professional |
| consentimiento-compartir (cross-tenant) | Professional |
| convenios-intercambio (admin) | Enterprise |

## API Endpoints

### Derivaciones

**`GET /api/derivaciones`**
- Params: `search`, `estado`, `pacienteId`, `medicoId`, `limit`, `offset`
- Response: `{ data, total, limit, offset }`

**`POST /api/derivaciones`**
- Body: `{ pacienteId, medicoOrigenId, medicoDestinoId, especialidad, motivo, diagnostico, cie10Codigo, gravedad, consentimientoId, tenantDestinoId }`

**`GET/PATCH/DELETE /api/derivaciones/[id]`**
- Estados válidos para update: `pendiente`, `aceptada`, `rechazada`, `completada`

### Consentimiento Compartir

**`GET /api/consentimiento-compartir`**
- Params: `pacienteId`, `medicoOrigenId`, `estado`, `limit`, `offset`

**`POST /api/consentimiento-compartir`**
- Body: `{ pacienteId, medicoOrigenId, medicoDestinoId, tenantDestinoId, alcance, fechaExpiracion }`

**`PATCH /api/consentimiento-compartir/[id]`**
- Acciones: `firmar` (requiere ip), `revocar`

### Convenios

**`GET /api/convenios`** — Admin-only
- Params: `estado`, `limit`, `offset`

**`POST /api/convenios`** — Admin-only
- Body: `{ tenantOrigenId, tenantDestinoId, fechaInicio, fechaFin }`

**`PATCH /api/convenios/[id]`** — Admin-only
- Body: `{ estado: 'activo' | 'inactivo' }`

## Servicios

### `derivacionesService`

| Función | Descripción |
|---------|-------------|
| `list()` | Lista con filtros, JOIN a pacientes/médicos, nombres destino |
| `create()` | Crea derivación + notifica al médico destino |
| `update()` | Cambia estado, notifica cambios al médico origen |
| `eliminar()` | Soft delete |
| `getStats()` | Totales por estado y gravedad |
| `getCrossTenant(tenantId)` | Derivaciones recibidas de otro tenant |
| `getByConsentimientoId()` | Busca derivación asociada a un consentimiento |

### `consentimientoCompartirService`

| Función | Descripción |
|---------|-------------|
| `create()` | Crea consentimiento en estado `pendiente` |
| `firmar()` | Pasa a `firmado` con IP de firma |
| `revocar()` | Revoca consentimiento |
| `verificarExpirados()` | Batch: expira consentimientos vencidos |
| `verificarAcceso()` | `true/false` si médico destino tiene acceso vigente |

### `conveniosService`

| Función | Descripción |
|---------|-------------|
| `create()` | Crea convenio entre dos tenants |
| `updateEstado()` | Activa/desactiva convenio |
| `verificarVigentes()` | Batch: desactiva convenios vencidos |
| `tieneConvenioActivo()` | `true/false` si hay convenio vigente entre dos tenants |

## UI

### Derivaciones Client

- Tabla con: Paciente, Médico Origen, Médico Destino, Especialidad, Estado (badge), Gravedad, Fecha
- Formulario de creación con selectores: paciente, médico origen/destino, especialidad, gravedad, motivo, diagnóstico, CIE-10
- Modal de edición con cambio de estado y notas destino
- Sección de consentimiento cross-tenant: selector de consentimiento existente o crear uno nuevo

### Consents (dentro del modal de derivación)

- Selector de alcance (historial_completo, solo_recetas, solo_turnos, solo_diagnosticos)
- Fecha de expiración opcional
- Estado visual con badge (pendiente/verde, firmado/azul, revocado/rojo, expirado/gris)

### Convenios Tab (Admin → Sistema)

- Lista de convenios con organización origen, destino, estado, fechas
- Crear convenio: seleccionar tenant origen y destino, fechas
- Toggle activo/inactivo
