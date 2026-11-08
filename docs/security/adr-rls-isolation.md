# ADR: Row Level Security is not an isolation boundary today

- **Status:** Accepted (with follow-up work)
- **Date:** 2026-11-07
- **Scope:** `dashboard` (multi-tenant clinical data)

## Context

The project ships two RLS migrations (`dashboard/drizzle/migrations/0027_rls_tenant_isolation.sql`
and `0051_rls_more_tables.sql`) and `lib/rls.ts` exposes `setTenantContext()` /
`withTenantScope()`. Reading the code end to end shows that the policies **do not isolate
tenants in production**:

1. `set_tenant_context()` calls `set_config('app.current_tenant_id', ..., true)`. The third
   argument marks the setting as **transaction-local**. `setTenantContext()` issues that call
   through `db.execute()` **outside any transaction** (postgres.js autocommits every statement),
   so the setting is discarded the moment the statement returns. Every later query in the same
   request sees `current_setting('app.current_tenant_id', true)` as `NULL`.
2. The policies are written **fail-open**:
   `USING (current_tenant_id() IS NULL OR tenant_id = current_tenant_id() OR tenant_id = '<placeholder>')`.
   With a `NULL` setting they filter nothing.
3. `ALTER TABLE ... FORCE ROW LEVEL SECURITY` is **commented out** in `0027`, and the application
   connects as the table owner (`dashboard_user`), which bypasses non-forced policies anyway.
4. Errors raised while setting the context are swallowed with `console.warn`.

## Decision

Do **not** ship a fail-closed RLS migration in this iteration.

Enabling fail-closed policies while `set_tenant_context` is transaction-scoped would make every
query see `NULL` and return empty result sets — a production outage across the whole product.
Fixing it properly requires wrapping every request in a transaction that also sets the context
(a connection-pool refactor), which is a large architectural change, not a bug fix.

Therefore:

- **Every tenant-scoped query must filter by `tenantId` explicitly.** That filter is the real
  isolation boundary. Code that relies on RLS, or that derives the tenant from a client-supplied
  header, is a defect.
- `lib/rls.ts` helpers stay in place but must not be treated as a security control. Its behaviour
  is documented here so nobody assumes protection that does not exist.
- New code must not introduce queries whose tenant scope depends only on the connection role.

## Consequences

- Reviews must verify tenant scoping per endpoint, not per database.
- The next milestone is a `withTenantTransaction(tenantId, fn)` helper plus a `FORCE ROW LEVEL
  SECURITY` migration applied **after** every request path runs inside that transaction.
- Until then, cross-tenant leakage is prevented by explicit `WHERE tenant_id = ...` predicates
  (and by resolving `pacientes.tenantId` / `medicos.tenantId` through `sucursales`).

## Known gaps in current schema

`pacientes` and `medicos` have no `tenant_id` column; their tenant is reachable only through the
nullable `sucursal_id`. Rows with a `NULL` branch cannot be attributed to a tenant, so any endpoint
that must be tenant-safe has to treat "tenant not resolvable" as a denial or as a legacy case
handled explicitly.

## `x-tenant-id` request header: verified not client-controlled

`lib/api-handler.ts` seeds its request context from the `x-tenant-id` header, which raised the
question of whether a client could forge it and shift its own tenant scope. Traced end to end:

1. `dashboard/proxy.ts` matches every route except static assets
   (`/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)`),
   so every `/api/*` request passes through it.
2. The proxy builds `requestHeaders` and calls `requestHeaders.set('x-tenant-id', tenantId)` with a
   value it derives itself: the tenant resolved from the request host (`resolveTenant(hostname)`)
   or, when an impersonation JWT cookie is valid, that JWT's `tenantId`.
3. `Headers.set()` overwrites whatever the client sent, so the value reaching `apiHandler` is always
   the proxy's. A forged header cannot survive.

Conclusion: the header is **not** an injection point. It is still not an authorization control —
`runWithContext` uses it for logging/correlation and as a last-resort fallback; every handler must
derive its scope from the session (`withTenantScope()`) or resolve it per resource, as the fixed
endpoints do.

