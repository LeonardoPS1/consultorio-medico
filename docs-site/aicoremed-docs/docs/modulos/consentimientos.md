# Módulo Consentimientos

## Arquitectura

```
Routes (app/dashboard/consentimientos/)
  ├── page.tsx              → Server component (plan + rol, stats, list)
  ├── consentimientos-client.tsx → Stats 4 cards, buscador, modal crear, modal detalle, soft-delete

API (app/api/consentimientos/)
  ├── route.ts              → GET (list + ?stats=true) / POST (create)
  └── [id]/route.ts         → GET / PATCH / DELETE (soft)

API (app/api/consentimiento-compartir/)
  ├── route.ts              → GET + POST (consentimiento cross-tenant)
  └── [id]/route.ts         → GET / PATCH (firmar|revocar) / DELETE

API (app/api/portal/consentimientos/)
  ├── route.ts              → GET (portal list)
  ├── [id]/route.ts         → GET (detalle, ownership)
  └── [id]/firmar/route.ts  → POST (firma digital con IP)

Service:
  ├── lib/services/consentimientos.ts       → CRUD consentimiento informado (Ley 20.584)
  └── lib/services/consentimiento-compartir.ts → cross-tenant (firmar, revocar, verificarExpirados, verificarAcceso)
Auditoría: lib/services/privacidad.ts → consentimiento_log
```

## Tipos de Consentimiento

### Consentimiento informado (dashboard, Ley 20.584)

DB enum `consentimiento_tipo`: `tratamiento | cirugia | anestesia | datos | fotografia | investigacion | otro`
DB enum `consentimiento_estado`: `pendiente | firmado | rechazado | revocado`

Campos: `fechaFirma`, `ipFirma`, `nombrePaciente`, `rutPaciente`, `documentoPdf` (URL), `metadata`.

### Consentimiento de compartir datos (cross-tenant, derivaciones)

- `estado` (varchar): `pendiente | firmado | revocado | expirado`
- `alcance` (default `historial_completo`): `historial_completo | solo_recetas | solo_turnos | solo_diagnosticos`
- `datosAutorizados` (jsonb), `fechaExpiracion` (opcional → auto-expiración)
- **Granularidad**: `medicoOrigenId` + `medicoDestinoId` + `tenantDestinoId` + alcance + expiración + firma con IP
- **Revocable**: `revocar()`
- **`verificarAcceso(pacienteId, medicoDestinoId, tenantDestinoId)`** → booleano: existe consentimiento `firmado`, no borrado y sin expirar

### consentimiento_log (auditoría)

| Columna | Uso |
|---------|-----|
| `pacienteId` | FK pacientes |
| `tipo` / `accion` | varchar (ej. tipo='datos', accion='grant' en bajas ARCO) |
| `aceptado` | boolean |
| `ip` / `userAgent` | origen |
| `createdAt` | timestamptz |

## API Endpoints

| Método | Ruta | Params/Body | Respuesta |
|--------|------|-------------|-----------|
| GET | `/api/consentimientos` | `tipo`, `pacienteId`, `medicoId`, `search`, `limit` (≤200), `offset`, `stats=true` | `ok({data,total,limit,offset})`; con stats → `ok({total,porTipo})`; joins paciente/médico |
| POST | `/api/consentimientos` | `createConsentimientoSchema` (pacienteId*, tipo, titulo*, descripcion, fechaFirma, ipFirma, nombrePaciente*, rutPaciente, documentoPdf, metadata, medicoId, sucursalId) | `created({data})` 201 |
| GET | `/api/consentimientos/[id]` | id | `ok({data})` detalle con joins |
| PATCH | `/api/consentimientos/[id]` | `updateConsentimientoSchema` (partial) | `ok({data})` |
| DELETE | `/api/consentimientos/[id]` | id | `ok({success:true})` soft |
| GET | `/api/consentimiento-compartir` | `pacienteId`, `medicoOrigenId`, `estado`, `limit`, `offset` | `ok({data,total,limit,offset})` scoped al tenant sesión |
| POST | `/api/consentimiento-compartir` | `createConsentimientoCompartirSchema` | `created({data})` 201 (estado `pendiente`) |
| GET | `/api/consentimiento-compartir/[id]` | id | `ok({data})` |
| PATCH | `/api/consentimiento-compartir/[id]` | `{accion: 'firmar'\|'revocar'}` (IP de headers) | `ok({data})`; firmar solo si `pendiente` |
| DELETE | `/api/consentimiento-compartir/[id]` | id | `ok({success:true})` soft |
| GET | `/api/portal/consentimientos` | cookie `portal_session` | Array plano (joins médico) |
| GET | `/api/portal/consentimientos/[id]` | id | Detalle (404 si no es suyo) |
| POST | `/api/portal/consentimientos/[id]/firmar` | CSRF origin + cookie | `{success, mensaje}`; 403 CSRF, 401 cookie, 409 si ya firmado |

## Reglas de Negocio

- **Portal firma**: valida CSRF origin (403), cookie portal (401), ownership (404), 409 si `fechaFirma` ya seteada; guarda `fechaFirma=now()` + `ipFirma` de `x-forwarded-for`
- **Expiración**: `verificarExpirados()` pasa firmado→expirado al vencer `fechaExpiracion`
- **Derivaciones cross-tenant**: `derivaciones-client.tsx` crea `POST /api/consentimiento-compartir` ANTES de crear la derivación (solo si `isCrossTenant`), exige `form.consentimientoAceptado` y envía `consentimientoId` en el payload de `/api/derivaciones`
- **FHIR export**: exige consentimiento `tipo='datos'` `estado='firmado'` o fallback `paciente.consentimientoEmail===true` (403 si no)
- **Scoping**: `consentimientos` y `consentimiento_compartir` con RLS (migración 0051); `withTenantScope()` vía apiHandler
- **Soft delete**: ambas tablas conservan `deletedAt`

> **Nota técnica**: la UI usa labels `general|cirugia|tratamiento|procedimiento|estetica|otros` mientras el enum DB es `tratamiento|cirugia|anestesia|datos|fotografia|investigacion|otro`; el service castea `input.tipo` como enum. Algunos valores UI (`general`, `procedimiento`, `estetica`) pueden no mapear al enum → riesgo latente de violación si se envían.

## Feature Gating

| Feature | Plan mínimo |
|---------|-------------|
| consentimiento-informado | Professional |
| consentimiento-compartir | Professional |
| convenios-intercambio | Enterprise |

## Integraciones

- **Portal paciente**: listado + detalle + firma digital (`/portal/consentimientos`)
- **Derivaciones**: consentimiento previo para intercambio cross-tenant
- **FHIR export**: valida consentimiento de datos
- **Baja ARCO**: `privacidadService` escribe `consentimiento_log` (tipo='datos', accion='grant')
- **Auditoría**: `consentimiento_log` es la fuente de verdad de eventos de consentimiento

## Service (lib/services/consentimientos.ts)

| Función | Descripción |
|---------|-------------|
| `list` | Lista con filtros + joins |
| `getById` | Detalle |
| `create` | Inserta con tipo casteado |
| `update` | Actualiza parcial |
| `eliminar` | Soft delete |
| `getStats` | total, porTipo |

## Service (lib/services/consentimiento-compartir.ts)

| Función | Descripción |
|---------|-------------|
| `list` / `getById` | Lecturas scoped al tenant |
| `create` | Crea con estado `pendiente` |
| `firmar` | Solo si `pendiente`; setea firmaPacienteAt + ipFirma |
| `revocar` | Revoca consentimiento |
| `verificarExpirados` | Auto-expiración por fechaExpiracion |
| `verificarAcceso` | Booleano de acceso vigente |
| `softDelete` | Baja lógica |