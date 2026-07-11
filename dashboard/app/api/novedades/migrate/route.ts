import { NextRequest, NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { getMigrationDb } from '@/lib/db';
import { apiHandler, success, fail } from '@/lib/api-handler';
import { requireAuth } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

// ─── POST /api/novedades/migrate ─────────────────────────
// Ejecuta la migración 0044 para crear la tabla novedades
// Auth: x-internal-key (compartida con n8n)
export const POST = apiHandler(async (request: NextRequest) => {
  const internalKey = request.headers.get('x-internal-key');
  const expectedKey = process.env.NOVEDADES_INTERNAL_KEY;

  if (internalKey !== expectedKey) {
    const session = await requireAuth();
    if (session.user.role !== 'admin') {
      return fail('Solo administradores pueden ejecutar migraciones', 403);
    }
  }

  const migrationClient = getMigrationDb();

  try {
    await migrationClient.execute(sql`
      CREATE TABLE IF NOT EXISTS novedades (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        version VARCHAR(20) NOT NULL,
        titulo VARCHAR(255) NOT NULL,
        items JSONB NOT NULL DEFAULT '[]'::jsonb,
        fecha TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        tipo VARCHAR(20) NOT NULL DEFAULT 'feature',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_novedades_fecha ON novedades(fecha DESC);
      CREATE INDEX IF NOT EXISTS idx_novedades_version ON novedades(version);

      CREATE OR REPLACE FUNCTION update_novedades_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS trg_novedades_updated_at ON novedades;
      CREATE TRIGGER trg_novedades_updated_at
        BEFORE UPDATE ON novedades
        FOR EACH ROW
        EXECUTE FUNCTION update_novedades_updated_at();
    `);

    return NextResponse.json({ success: true, message: 'Migración 0044 ejecutada correctamente' });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[Migrate Novedades]', error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
});
