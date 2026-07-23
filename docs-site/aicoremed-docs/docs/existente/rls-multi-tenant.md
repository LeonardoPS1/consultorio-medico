# RLS (Row Level Security) — Aislamiento Multi-Tenant

## Arquitectura

El aislamiento multi-tenant se implementa a nivel de base de datos mediante **Row Level Security (RLS)** de PostgreSQL. Esto garantiza que cada tenant (organización/consultorio) solo pueda ver y modificar sus propios datos, incluso si una consulta SQL no filtra explícitamente por `tenant_id`.

## Componentes

### 1. Función `set_tenant_context(tenant_id uuid)`

Establece el tenant activo en la sesión de base de datos usando `current_setting('app.current_tenant_id')`. Se llama desde `withTenantScope()` en el código de la aplicación.

```sql
SELECT public.set_tenant_context('uuid-del-tenant');
```

### 2. Función `current_tenant_id()`

Helper que retorna el tenant activo o `NULL` si no se ha configurado (útil para migraciones y desarrollo).

### 3. Políticas RLS

Cada tabla con `tenant_id` tiene una política `tenant_isolation_all` que filtra:

```sql
CREATE POLICY tenant_isolation_all ON public.<tabla>
  FOR ALL
  USING (
    current_tenant_id() IS NULL
    OR tenant_id = current_tenant_id()
  );
```

Cuando `current_tenant_id()` es `NULL` (no se ha llamado a `set_tenant_context`), la política **no filtra** — permitiendo consultas legacy y administrativas.

## Tablas con RLS

### Migración 0027 (inicial — 9 tablas)

| Tabla | tenant_id | FK a tenants |
|-------|-----------|--------------|
| `usuarios` | `uuid` default `0000...` | Sí |
| `auditoria_accesos` | `uuid` nullable | Sí |
| `sucursales` | `uuid` not null | Sí |
| `horarios_atencion` | `uuid` default `0000...` | No |
| `notificaciones` | `uuid` default `0000...` | No |
| `push_subscriptions` | `uuid` default `0000...` | No |
| `preferencias_notificaciones` | `uuid` default `0000...` | No |
| `plantillas_mensajes` | `uuid` default `0000...` | No |
| `api_keys` | `uuid` not null | No |

### Migración 0051 (adicional — 10 tablas)

| Tabla | tenant_id |
|-------|-----------|
| `portal_config` | `uuid` not null (1:1 con tenant) |
| `web_vitals_metrics` | `uuid` nullable |
| `derivaciones` | `uuid` default `0000...` |
| `webhook_configs` | `uuid` not null |
| `ordenes_estudio` | `uuid` default `0000...` |
| `documentos_medicos` | `uuid` default `0000...` |
| `paquetes_portal` | `uuid` not null |
| `consentimiento_compartir` | `uuid` default `0000...` |
| `blacklist` | `uuid` default `0000...` |
| `consentimientos` | `uuid` default `0000...` |

## Flujo de Aplicación

```
API Request
  → apiHandler (api-handler.ts)
    → withTenantScope() (rls.ts)
      → auth() extrae session.user.tenantId
      → SELECT public.set_tenant_context(tenantId)
    → Handler ejecuta DB queries
      → RLS filtra automáticamente por tenant_id
```

### Server Components

Los Server Components de Next.js no pasan por `apiHandler`. Los siguientes archivos llaman explícitamente a `withTenantScope()`:

- `app/dashboard/pacientes/[id]/page.tsx`
- `lib/onboarding.ts`

## Buenas Prácticas

1. **Siempre llamar a `withTenantScope()`** antes de hacer queries DB desde fuera de `apiHandler`
2. **No usar `sql.raw()`** — RLS no se aplica a queries raw que no usen `current_setting`
3. **El usuario `dashboard_user` NO tiene `BYPASSRLS`** — las políticas se aplican siempre
4. **El dueño de la tabla (postgres) tiene `BYPASSRLS`** — no recomendado para uso diario
5. **Agregar RLS inmediatamente** al crear nuevas tablas con `tenant_id`

## Verificación

```sql
-- Verificar tablas con RLS habilitado
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = true;

-- Verificar políticas existentes
SELECT schemaname, tablename, policyname, permissive, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```
