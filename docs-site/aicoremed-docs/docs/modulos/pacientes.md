# Módulo Pacientes

## Arquitectura

```
Routes (app/dashboard/pacientes/)
  ├── page.tsx                → Server component (stats + lista)
  ├── pacientes-client.tsx    → Cliente con búsqueda, paginación, edición inline
  ├── loading.tsx             → Skeleton
  └── [id]/
      ├── page.tsx            → Detalle del paciente (server)
      ├── paciente-detalle-client.tsx  → Ficha completa con 9+ tabs
      └── loading.tsx         → Skeleton

API (app/api/pacientes/)
  ├── route.ts                          → GET (list) / POST (create)
  ├── exportar/route.ts                 → GET (excel/pdf)
  ├── scoring/route.ts                  → GET (scoring 0-100)
  └── [id]/
      ├── route.ts                      → GET / PATCH / DELETE
      ├── detalle/route.ts              → GET (datos compuestos)
      ├── historial/route.ts            → GET/POST hist. médico
      ├── notas-soap/route.ts           → GET/POST SOAP
      ├── certificados/route.ts         → GET/POST certificados + QR
      ├── consentimiento/route.ts       → GET/POST consentimientos
      ├── solicitar-baja/route.ts       → POST (ARCO)
      ├── confirmar-baja/route.ts       → POST (cascade delete)
      └── exportar-datos/route.ts       → GET (portabilidad)
```

## Schema (drizzle/core.ts)

| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | UUID PK | |
| `telefono` | varchar(20) UNIQUE | Clave de negocio |
| `nombre` | varchar(255) | |
| `apellido` | varchar(255) | |
| `email` | varchar(255) | |
| `rut` | varchar(20) | Chile |
| `dni` | varchar(20) | Argentina |
| `fechaNacimiento` | date | |
| `direccion` | text | |
| `regionId` | UUID FK→regiones.id | |
| `comunaId` | UUID FK→comunas.id | |
| `sistemaSalud` | varchar(20) | fonasa, isapre, particular, otro |
| `isapreNombre` | varchar(100) | |
| `alergias` | text | |
| `medicacionCronica` | text | |
| `notasMedicas` | text | |
| `consentimientoWhatsapp` | boolean | default false |
| `consentimientoEmail` | boolean | default false |
| `canalPreferido` | varchar(20) | default 'whatsapp' |
| `fuente` | varchar(50) | default 'whatsapp' |
| `tags` | text[] | |
| `metadata` | jsonb | |
| `portalToken` | varchar(255) | Magic link |
| `portalTokenExpires` | timestamptz | |
| `ultimoAccesoPortal` | timestamptz | |
| `maxCancelacionesMes` | integer | default 3 |
| `bajaSolicitadaAt` | timestamptz | ARCO |
| `sucursalId` | UUID FK→sucursales.id | |
| `createdAt` | timestamptz | |
| `updatedAt` | timestamptz | |
| `deletedAt` | timestamptz | Soft delete |

Índices: `idx_pacientes_sucursal_id`, `idx_pacientes_created_at`, `idx_pacientes_rut`.

## Relaciones

```
pacientes ──1:N── turnos, conversaciones, recetas, historialMedico
           ──1:N── notasSoap, pacienteEventos, tareasPendientes
           ──1:N── listaEspera, facturacion, blacklist, consentimientos
           ──1:N── notificaciones, pushSubscriptions, derivaciones
           ──1:1── sucursal
```

## Reglas de Negocio

- **Soft delete ARCO**: cascade en 10+ tablas + anonimización PII (nombre, email, teléfono → hash). Período de retención: 90 días (WF-09).
- **IDOR protection**: `verifyPacienteAccess()` — admin bypass; médico debe tener al menos 1 turno con el paciente; si no → 403.
- **Scoping por rol**: `medico` solo ve pacientes con los que tuvo turnos; `admin` ve todos.
- **Teléfono único**: constraint UNIQUE + validación explícita en create.
- **Búsqueda**: 6 campos ILIKE (nombre, apellido, teléfono, rut, dni, nombre+apellido).
- **Scoring automático** (Starter+): score 0-100 (no-shows ×40, cancelaciones ×25, confirmación ×20, lectura recordatorios ×10, asistencia ×5+). Niveles: bajo/medio/alto.
- **Tags automáticos**: según sistemaSalud (Fonasa → ['Fonasa'], isapre → [isapreNombre], particular → ['Particular']).

## Feature Gating

| Feature | Plan mínimo |
|---------|-------------|
| pacientes | Starter |
| scoring-pacientes | Starter |
| historial | Starter |
| certificados-qr | Professional |
| exportacion | Professional |
| consentimiento-informado | Professional |
| portal-paciente | Premium |

## API Endpoints

### `GET /api/pacientes`
- **Params**: `search`, `limit` (100), `offset`, `sucursalId`
- **Response**: `{ data, total, conTurnos, nuevos, limit, offset }`
- **Cache**: 30s TTL

### `POST /api/pacientes`
- **Body**: `{ nombre, apellido, telefono, ... }` — validación Zod
- **Response**: 201 + paciente
- **Side effects**: evento `opt_in` en pacienteEventos

### `GET/PATCH/DELETE /api/pacientes/[id]`
- **DELETE**: cascade soft-delete via privacidadService.confirmarBaja()
- **PATCH**: actualización parcial, invalida cache

### `GET /api/pacientes/[id]/detalle`
- **Response compuesta**: paciente + turnos(30) + recetas(20) + historial(20) + stats
- Maneja pacientes dados de baja (devuelve `bajaConfirmada: true`)

### `GET /api/pacientes/scoring`
- **Params**: `ids=id1,id2,id3` (opcional, sin ids calcula todos)
- **Response**: scores por paciente con nivel y factores

### `GET /api/pacientes/exportar`
- **Params**: `formato=excel|pdf`
- Excel con librería `xlsx`, PDF como HTML imprimible

## Componentes Cliente

| Componente | Propósito |
|-----------|-----------|
| `PacientesClient` | Lista con búsqueda (300ms debounce), paginación 25/pág, selección múltiple, badges de scoring |
| `PacienteDetalleClient` | Ficha con tabs (turnos, recetas, historial, SOAP, certificados, eventos, tareas). 2558 líneas. |
| `NuevoPacienteModal` | Registro con auto-formato RUT chileno, teléfono +569, selector región/comuna, sistema salud |
| `EditarPacienteModal` | Edición con mismos selectores |
| `PacienteSearchCombobox` | Autocomplete reutilizable, 250ms debounce, navegación teclado |

## Service (lib/services/pacientes.ts)

| Función | Descripción |
|---------|-------------|
| `list()` | Lista con búsqueda ILIKE + stats. Cache 30s. |
| `create()` | Crea con validación teléfono único. Tags auto. Evento opt_in. |
| `getById()` | Obtiene por ID. Cache 30s. NotFound si no existe. |
| `update()` | Actualización parcial. Invalida cache. |
| `delete()` | Soft-delete cascade via privacidadService. Invalida cache. |

## Privacidad ARCO

- **Solicitar baja**: registra en consentimiento_log + auditoria_accesos
- **Confirmar baja**: cascade soft-delete + anonimización PII + notifica n8n WF-09
- **Anonimización**: nombre→anónimo, email→hash, teléfono→hash, documento→hash
- **Retención**: 90 días (WF-09 ejecuta anonimización permanente)
- **Exportación**: JSON completo de todos los datos del paciente
