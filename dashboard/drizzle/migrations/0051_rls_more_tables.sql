-- =============================================================================
-- Migration 0051 — RLS para tablas restantes con tenant_id
--
-- Agrega RLS a las tablas que se crearon después de la migración 0027 y que
-- tienen columna tenant_id pero no tenían políticas RLS.
-- =============================================================================

-- 1. Habilitar RLS en tablas faltantes
ALTER TABLE IF EXISTS public.portal_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.web_vitals_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.derivaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.webhook_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ordenes_estudio ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.documentos_medicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.paquetes_portal ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.consentimiento_compartir ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.blacklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.consentimientos ENABLE ROW LEVEL SECURITY;

-- 2. Políticas de aislamiento por tenant
CREATE POLICY tenant_isolation_all ON public.portal_config
  FOR ALL
  USING (
    current_tenant_id() IS NULL
    OR tenant_id = current_tenant_id()
  );

CREATE POLICY tenant_isolation_all ON public.web_vitals_metrics
  FOR ALL
  USING (
    current_tenant_id() IS NULL
    OR tenant_id = current_tenant_id()
  );

CREATE POLICY tenant_isolation_all ON public.derivaciones
  FOR ALL
  USING (
    current_tenant_id() IS NULL
    OR tenant_id = current_tenant_id()
  );

CREATE POLICY tenant_isolation_all ON public.webhook_configs
  FOR ALL
  USING (
    current_tenant_id() IS NULL
    OR tenant_id = current_tenant_id()
  );

CREATE POLICY tenant_isolation_all ON public.ordenes_estudio
  FOR ALL
  USING (
    current_tenant_id() IS NULL
    OR tenant_id = current_tenant_id()
  );

CREATE POLICY tenant_isolation_all ON public.documentos_medicos
  FOR ALL
  USING (
    current_tenant_id() IS NULL
    OR tenant_id = current_tenant_id()
  );

CREATE POLICY tenant_isolation_all ON public.paquetes_portal
  FOR ALL
  USING (
    current_tenant_id() IS NULL
    OR tenant_id = current_tenant_id()
  );

CREATE POLICY tenant_isolation_all ON public.consentimiento_compartir
  FOR ALL
  USING (
    current_tenant_id() IS NULL
    OR tenant_id = current_tenant_id()
  );

CREATE POLICY tenant_isolation_all ON public.blacklist
  FOR ALL
  USING (
    current_tenant_id() IS NULL
    OR tenant_id = current_tenant_id()
  );

CREATE POLICY tenant_isolation_all ON public.consentimientos
  FOR ALL
  USING (
    current_tenant_id() IS NULL
    OR tenant_id = current_tenant_id()
  );

-- 3. Verificación
DO $$
DECLARE
  tbl text;
  tables_with_rls text[] := ARRAY[
    'portal_config', 'web_vitals_metrics', 'derivaciones',
    'webhook_configs', 'ordenes_estudio', 'documentos_medicos',
    'paquetes_portal', 'consentimiento_compartir', 'blacklist',
    'consentimientos'
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
