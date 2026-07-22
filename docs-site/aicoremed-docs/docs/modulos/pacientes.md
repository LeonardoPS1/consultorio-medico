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
| `prevision` | varchar(30) | `fonasa`, `isapre`, `particular`, `prais`, `otro` |
| `tramoFonasa` | varchar(5) | `A`, `B`, `C`, `D` (solo FONASA) |
| `isapreNombre` | varchar(100) | Nombre de la ISAPRE |
| `alergias` | text | |
| `medicacionCronica` | text | |
| `notasMedicas` | text | |
| `consentimientoWhatsapp` | boolean | default false |
| `consentimientoEmail` | boolean | default false |
| `canalPreferido` | varchar(20) | default 'whatsapp' |
| `fuente` | varchar(50) | default 'whatsapp' |
| `numeroAfiliado` | varchar(100) | Número de afiliado en FONASA/ISAPRE |
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
- **Previsión chilena**: campo `prevision` con valores `fonasa`, `isapre`, `particular`, `prais`, `otro`. Si es FONASA, se puede especificar tramo (A/B/C/D). Si es ISAPRE, se puede especificar nombre de la ISAPRE y número de afiliado.

## Feature Gating

| Feature | Plan mínimo |
|---------|-------------|
| pacientes (datos básicos, incluye previsión) | Starter |
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

## Previsión y FONASA (Chile)

### Sistema de Salud Chileno

El módulo de pacientes soporta el sistema de salud chileno con los siguientes tipos de previsión:

| Previsión | Descripción |
|-----------|-------------|
| `fonasa` | Fondo Nacional de Salud |
| `isapre` | Instituciones de Salud Previsional |
| `particular` | Paciente particular (sin cobertura) |
| `prais` | Programa de Reparación y Atención Integral en Salud |
| `otro` | Otro sistema (FF.AA., etc.) |

### Tramos FONASA

| Tramo | Copago | Descripción |
|-------|--------|-------------|
| A | 0% | Exento — sin copago |
| B | 10% | 10% copago (excepto pensionados) |
| C | 20% | 20% copago |
| D | 20% | 20% copago |

### ISAPREs Soportadas

15 ISAPREs registradas: Colmena Golden Cross, Cruz Blanca, Banmédica, Consalud, Masvida, Vida Tres, Esencial, Nueva Masvida, Cruz del Norte, Ripley Corp, Fundación, CHCC Salud, Cooperativa, Fusat, Lautaro.

### Cálculo de Copago

La función `calcularCopago(tramo, valorPrestacion)` en `lib/aranceles-fonasa.ts` calcula el copago según el tramo FONASA:

```typescript
calcularCopago('A', 10000) → 0
calcularCopago('C', 10000) → 2000
```

### Feature Gate

| Feature | Plan mínimo |
|---------|-------------|
| previsión (campos en paciente) | Starter (incluido en datos básicos) |

## Privacidad ARCO

- **Solicitar baja**: registra en consentimiento_log + auditoria_accesos
- **Confirmar baja**: cascade soft-delete + anonimización PII + notifica n8n WF-09
- **Anonimización**: nombre→anónimo, email→hash, teléfono→hash, documento→hash
- **Retención**: 90 días (WF-09 ejecuta anonimización permanente)
- **Exportación**: JSON completo de todos los datos del paciente
