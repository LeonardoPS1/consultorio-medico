-- ============================================================
-- Migration 011: Multi-tenant (Phase 1)
-- ============================================================
-- Agrega soporte multi-tenant a todas las tablas existentes.
-- Crea la tabla 'tenants' y agrega 'tenant_id' a cada tabla.
-- El tenant por defecto '00000000-0000-0000-0000-000000000000' representa
-- la instancia original (single-tenant).

-- Tabla de tenants
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(255) NOT NULL,
  subdomain VARCHAR(100) UNIQUE NOT NULL,
  logo_url TEXT DEFAULT '/aicoremed_dark_1200.svg',
  colores JSONB DEFAULT '{"primary": "#2563eb"}',
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tenant por defecto (instancia actual)
INSERT INTO tenants (id, nombre, subdomain, logo_url)
VALUES ('00000000-0000-0000-0000-000000000000', 'AiCoreMed Demo', 'demo', '/aicoremed_dark_1200.svg')
ON CONFLICT (id) DO NOTHING;

-- Función auxiliar para agregar tenant_id si no existe
DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'usuarios', 'medicos', 'pacientes', 'paciente_eventos',
    'turnos', 'servicios', 'bloqueos_agenda',
    'conversaciones', 'mensajes', 'plantillas_whatsapp',
    'tareas_pendientes', 'historial_medico', 'recetas', 'facturacion',
    'workflow_logs', 'workflow_errors', 'twilio_logs', 'ia_logs',
    'audit_log', 'credenciales', 'auditoria_accesos', 'suscripciones'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = tbl AND column_name = 'tenant_id'
    ) THEN
      EXECUTE format('ALTER TABLE %I ADD COLUMN tenant_id UUID NOT NULL DEFAULT ''00000000-0000-0000-0000-000000000000'' REFERENCES tenants(id)', tbl);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_tenant ON %I(tenant_id)', tbl, tbl);
      RAISE NOTICE 'Agregado tenant_id a %', tbl;
    ELSE
      RAISE NOTICE 'tenant_id ya existe en %', tbl;
    END IF;
  END LOOP;
END $$;
