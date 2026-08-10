-- =============================================================================
-- Migration 0060 — Mensajería Interna del staff
--
-- Mensajería 1:1 entre usuarios del staff (médico↔secretaria, médico↔médico)
-- del mismo tenant. Reemplaza el chat del portal del paciente (que fue
-- removido; las tablas `conversaciones`/`mensajes` con canal='web' quedan
-- huérfanas intencionalmente para trazabilidad).
--
-- Contexto vinculable (nullable) a paciente y/o turno.
-- =============================================================================

-- 1. Tabla conversaciones internas
CREATE TABLE IF NOT EXISTS public.conversaciones_internas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  participante_a_id uuid NOT NULL REFERENCES public.usuarios(id),
  participante_b_id uuid NOT NULL REFERENCES public.usuarios(id),
  contexto_paciente_id uuid REFERENCES public.pacientes(id),
  contexto_turno_id uuid REFERENCES public.turnos(id),
  ultimo_mensaje text,
  ultimo_autor_id uuid REFERENCES public.usuarios(id),
  ultima_interaccion timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_conv_internas_participante_a
  ON public.conversaciones_internas (participante_a_id);
CREATE INDEX IF NOT EXISTS idx_conv_internas_participante_b
  ON public.conversaciones_internas (participante_b_id);
CREATE INDEX IF NOT EXISTS idx_conv_internas_ultima
  ON public.conversaciones_internas (ultima_interaccion);

-- 2. Tabla mensajes internos
CREATE TABLE IF NOT EXISTS public.mensajes_internos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  conversacion_id uuid NOT NULL REFERENCES public.conversaciones_internas(id) ON DELETE CASCADE,
  autor_id uuid NOT NULL REFERENCES public.usuarios(id),
  contenido text NOT NULL,
  urgente boolean NOT NULL DEFAULT false,
  leido_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_msgs_internos_conversacion
  ON public.mensajes_internos (conversacion_id, created_at);

-- 3. RLS: aislamiento por tenant (mismo patrón que el resto del sistema)
ALTER TABLE public.conversaciones_internas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mensajes_internos ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_all ON public.conversaciones_internas
  FOR ALL USING (
    current_tenant_id() IS NULL
    OR tenant_id = current_tenant_id()
  );

CREATE POLICY tenant_isolation_all ON public.mensajes_internos
  FOR ALL USING (
    current_tenant_id() IS NULL
    OR tenant_id = current_tenant_id()
  );

-- 4. Verificación
DO $$
DECLARE
  tbl text;
  tables_with_rls text[] := ARRAY['conversaciones_internas', 'mensajes_internos'];
BEGIN
  FOREACH tbl IN ARRAY tables_with_rls
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = tbl
        AND policyname = 'tenant_isolation_all'
    ) THEN
      RAISE WARNING 'RLS policy missing on table: %', tbl;
    END IF;
  END LOOP;
END;
$$;