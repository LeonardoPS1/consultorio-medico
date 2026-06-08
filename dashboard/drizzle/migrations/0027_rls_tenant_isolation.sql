-- =============================================================================
-- Migration 0027 — Row-Level Security para aislamiento multi-tenant
--
-- Crea la infraestructura RLS para que cada tenant (consultorio) solo pueda
-- ver sus propios datos a nivel de base de datos.
--
-- Estrategia:
--   1. Función set_tenant_context() para establecer el tenant activo
--   2. RLS habilitado en tablas con tenant_id
--   3. Políticas que filtran por current_setting('app.current_tenant_id')
--   4. Política DEFAULT PERMISSIVE para tablas del sistema sin tenant_id
--
-- ⚠️  Las políticas son BYPASS_RLS-safe para el dueño de la tabla.
--    El usuario app (dashboard_user) NO tiene BYPASS_RLS, por lo que
--    las políticas se aplican automáticamente.
-- =============================================================================

-- ─── 1. Función para establecer el contexto del tenant ─────────────────────

CREATE OR REPLACE FUNCTION public.set_tenant_context(tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 'true' = local al transaction, no persiste fuera de la transacción
  PERFORM set_config('app.current_tenant_id', tenant_id::text, true);
END;
$$;

-- ─── 2. Función helper para obtener tenant_id actual (con fallback) ────────

CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  tid text;
BEGIN
  tid := current_setting('app.current_tenant_id', true);
  IF tid IS NULL OR tid = '' THEN
    RETURN NULL;
  END IF;
  RETURN tid::uuid;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$;

-- ─── 3. Habilitar RLS en tablas con tenant_id ──────────────────────────────

ALTER TABLE IF EXISTS public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.auditoria_accesos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sucursales ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.horarios_atencion ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notificaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.preferencias_notificaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.plantillas_mensajes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.api_keys ENABLE ROW LEVEL SECURITY;

-- ─── 4. Políticas de aislamiento por tenant ────────────────────────────────

-- Las políticas usan current_tenant_id() que retorna NULL si no está configurado.
-- Cuando es NULL, la política NO filtra (permite todo) — esto evita romper
-- consultas existentes que no usan el contexto todavía.
-- Cuando tiene un valor, filtra SOLO ese tenant.

-- 4a. Política: usuario solo ve datos de su tenant (o si es superadmin)
CREATE POLICY tenant_isolation_select ON public.usuarios
  FOR SELECT
  USING (
    current_tenant_id() IS NULL
    OR tenant_id = current_tenant_id()
    OR tenant_id = '00000000-0000-0000-0000-000000000000'
  );

CREATE POLICY tenant_isolation_insert ON public.usuarios
  FOR INSERT
  WITH CHECK (
    current_tenant_id() IS NULL
    OR tenant_id = current_tenant_id()
  );

CREATE POLICY tenant_isolation_update ON public.usuarios
  FOR UPDATE
  USING (
    current_tenant_id() IS NULL
    OR tenant_id = current_tenant_id()
  );

CREATE POLICY tenant_isolation_delete ON public.usuarios
  FOR DELETE
  USING (
    current_tenant_id() IS NULL
    OR tenant_id = current_tenant_id()
  );

-- 4b. Auditoría
CREATE POLICY tenant_isolation_select ON public.auditoria_accesos
  FOR ALL
  USING (
    current_tenant_id() IS NULL
    OR tenant_id = current_tenant_id()
  );

-- 4c. Sucursales
CREATE POLICY tenant_isolation_all ON public.sucursales
  FOR ALL
  USING (
    current_tenant_id() IS NULL
    OR tenant_id = current_tenant_id()
  );

-- 4d. Horarios
CREATE POLICY tenant_isolation_all ON public.horarios_atencion
  FOR ALL
  USING (
    current_tenant_id() IS NULL
    OR tenant_id = current_tenant_id()
  );

-- 4e. Notificaciones
CREATE POLICY tenant_isolation_all ON public.notificaciones
  FOR ALL
  USING (
    current_tenant_id() IS NULL
    OR tenant_id = current_tenant_id()
  );

-- 4f. Push Subscriptions
CREATE POLICY tenant_isolation_all ON public.push_subscriptions
  FOR ALL
  USING (
    current_tenant_id() IS NULL
    OR tenant_id = current_tenant_id()
  );

-- 4g. Preferencias de Notificaciones
CREATE POLICY tenant_isolation_all ON public.preferencias_notificaciones
  FOR ALL
  USING (
    current_tenant_id() IS NULL
    OR tenant_id = current_tenant_id()
  );

-- 4h. Plantillas de Mensajes
CREATE POLICY tenant_isolation_all ON public.plantillas_mensajes
  FOR ALL
  USING (
    current_tenant_id() IS NULL
    OR tenant_id = current_tenant_id()
  );

-- 4i. API Keys
CREATE POLICY tenant_isolation_all ON public.api_keys
  FOR ALL
  USING (
    current_tenant_id() IS NULL
    OR tenant_id = current_tenant_id()
  );

-- ─── 5. Política FORCE RLS (opcional, descomentar cuando todo esté migrado) ─
-- ALTER TABLE public.usuarios FORCE ROW LEVEL SECURITY;
-- ALTER TABLE public.auditoria_accesos FORCE ROW LEVEL SECURITY;

-- ─── 6. Verificación ───────────────────────────────────────────────────────

DO $$
DECLARE
  tbl text;
  tables_with_rls text[] := ARRAY[
    'usuarios', 'auditoria_accesos', 'sucursales',
    'horarios_atencion', 'notificaciones', 'push_subscriptions',
    'preferencias_notificaciones', 'plantillas_mensajes', 'api_keys'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables_with_rls
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = tbl
        AND policyname LIKE 'tenant_isolation%'
    ) THEN
      RAISE WARNING 'RLS policy missing on table: %', tbl;
    END IF;
  END LOOP;
END;
$$;
