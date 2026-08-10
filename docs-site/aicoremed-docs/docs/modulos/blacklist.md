# Módulo Blacklist

## Arquitectura

```
Route (app/dashboard/blacklist/)
  ├── page.tsx              → Server component (force-dynamic, gate blacklist, stats)
  ├── blacklist-client.tsx  → Filtros, modal crear (combobox paciente + motivo + temporalidad), toggle, soft-delete
  └── loading.tsx           → Skeleton

API (app/api/blacklist/)
  ├── route.ts              → GET (list / ?stats=true) + POST (create)
  ├── [id]/route.ts         → GET / PATCH / DELETE (soft)
  └── auto-check/route.ts   → POST (admin, auto-bloqueo por scoring)

Service: lib/services/blacklist.ts
Validación: lib/validations.ts (createBlacklistSchema, updateBlacklistSchema)
```

## Schema (drizzle/access.ts)

| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | UUID PK | |
| `pacienteId` | UUID FK→pacientes.id | NOT NULL |
| `motivo` | text | NOT NULL (libre; ej: "Inasistencia recurrente sin aviso") |
| `activo` | boolean | default true |
| `bloqueadoHasta` | timestamptz | NULL = indefinido |
| `creadoPor` | UUID FK→medicos.id | |
| `sucursalId` | UUID FK→sucursales.id | |
| `tenantId` | uuid | multi-tenant + RLS |
| `createdAt` / `updatedAt` | timestamptz | |
| `deletedAt` | timestamptz | soft delete |

Índices: `idx_blacklist_paciente`, `idx_blacklist_activo`, `idx_blacklist_created_at`.

> RLS multi-tenant incluida en migración 0051.

## API Endpoints

| Método | Ruta | Params/Body | Respuesta |
|--------|------|-------------|-----------|
| GET | `/api/blacklist` | `activo`, `pacienteId`, `search` (LIKE motivo), `limit` (≤200, def 50), `offset`, `stats=true` | `ok({data, total, limit, offset})` con joins paciente/médico; con stats → `ok({total, activos})` |
| POST | `/api/blacklist` | `{pacienteId*, motivo*, activo? (true), bloqueadoHasta?, creadoPor?, sucursalId?}` | `created({data})` 201 |
| GET | `/api/blacklist/[id]` | id | `ok({data})` (404 via notFound) |
| PATCH | `/api/blacklist/[id]` | `{motivo?, activo?, bloqueadoHasta?}` | `ok({data})` |
| DELETE | `/api/blacklist/[id]` | id | `ok({success:true})` (soft: deletedAt = now) |
| POST | `/api/blacklist/auto-check` | — (solo admin, 403 si no) | `ok({message, totalEvaluados, bloqueados, resultados[]})` |

## Reglas de Negocio

- **Paciente bloqueado** si: `activo = true` AND (`bloqueadoHasta IS NULL OR > NOW()`) AND no soft-deleted
- **Self-expiración**: `isPacienteBloqueado` (blacklist.ts:174) evalúa `bloqueadoHasta > NOW()`
- **Portal**: `checkBlacklist()` en `lib/portal-auth.ts` bloquea la generación de **magic link** (paciente bloqueado no puede acceder); se loguea `Paciente bloqueado intenta acceso`
- **WhatsApp**: la blacklist NO bloquea mensajes entrantes en el webhook Twilio; el bloqueo efectivo es impedir acceso al portal (magic link)
- **Auto-bloqueo**: `auto-check` corre `calcularTodosLosScores()` (`scoring-pacientes`) y bloquea automáticamente si `score >= 80 && noShows >= 2` y no ya bloqueado; motivo autogenerado; evita duplicados
- **Soft delete**: DELETE solo marca `deletedAt` (no destruye)
- **Scoping**: consultas tenant-scoped vía `apiHandler` + `withTenantScope()` (RLS)

## Feature Gating

| Feature | Plan mínimo |
|---------|-------------|
| blacklist | Professional |

> Gate estricto en `page.tsx` (redirect si el plan no alcanza) + `canView` en el cliente.

## Integraciones

- **Portal auth**: bloquea magic link de pacientes en blacklist
- **Ficha paciente**: tab `blacklist` para gestionar desde el perfil
- **Scoring de pacientes**: alimenta el `auto-check` (no-shows)

## Service (lib/services/blacklist.ts)

| Función | Descripción |
|---------|-------------|
| `list` | Lista paginada con filtros + joins |
| `getById` | Detalle (404 si no existe) |
| `create` | Crea con `.returning()` |
| `update` | Actualiza (bumps updatedAt) |
| `eliminar` | Soft delete (deletedAt = now) |
| `getStats` | total, activos/inactivos |
| `isPacienteBloqueado` | Evalúa bloqueo activo vigente |