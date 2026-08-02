import { getDb } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { getSessionFromCookie } from '@/lib/auth'
import { notFound } from 'next/navigation'
import { ImpersonateButton } from './impersonate-button'
import { RevokeImpersonationButton } from './revoke-impersonation-button'
import { TenantManager } from './tenant-manager'

export const dynamic = 'force-dynamic'

export default async function TenantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getSessionFromCookie()
  if (!session) return null

  const { id } = await params
  const db = getDb()

  const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000000'

  // Fetch main tenant data first
  const [tenantResult] = await db.execute(sql`
    SELECT
      t.id,
      t.nombre,
      t.subdomain,
      t.activo,
      t.created_at,
      t.dominio_custom,
      t.colores,
      (SELECT plan FROM public.suscripciones s WHERE s.organizacion_id = t.id ORDER BY s.created_at DESC LIMIT 1) AS plan,
      (SELECT COUNT(*)::int FROM public.usuarios u WHERE u.tenant_id = t.id) AS usuario_count,
      (SELECT COUNT(*)::int FROM public.pacientes p LEFT JOIN public.sucursales s ON s.id = p.sucursal_id WHERE (s.tenant_id = t.id) OR (p.sucursal_id IS NULL AND t.id = ${DEFAULT_TENANT_ID})) AS paciente_count,
      (SELECT COUNT(*)::int FROM public.turnos tu LEFT JOIN public.sucursales s ON s.id = tu.sucursal_id WHERE (s.tenant_id = t.id) OR (tu.sucursal_id IS NULL AND t.id = ${DEFAULT_TENANT_ID})) AS turno_count,
      (SELECT COUNT(*)::int FROM public.recetas r JOIN public.pacientes p ON p.id = r.paciente_id LEFT JOIN public.sucursales s ON s.id = p.sucursal_id WHERE (s.tenant_id = t.id) OR (p.sucursal_id IS NULL AND t.id = ${DEFAULT_TENANT_ID})) AS receta_count,
      (SELECT MAX(tu.fecha_hora) FROM public.turnos tu LEFT JOIN public.sucursales s ON s.id = tu.sucursal_id WHERE (s.tenant_id = t.id) OR (tu.sucursal_id IS NULL AND t.id = ${DEFAULT_TENANT_ID})) AS ultimo_turno,
      (SELECT MAX(r.created_at) FROM public.recetas r JOIN public.pacientes p ON p.id = r.paciente_id LEFT JOIN public.sucursales s ON s.id = p.sucursal_id WHERE (s.tenant_id = t.id) OR (p.sucursal_id IS NULL AND t.id = ${DEFAULT_TENANT_ID})) AS ultima_receta
    FROM public.tenants t
    WHERE t.id = ${id}
  `)

  if (!tenantResult) notFound()

  // Fetch audit count separately (optional - won't break page if table/column missing)
  let audit7d = 0
  try {
    const [auditResult] = await db.execute(sql`
      SELECT COUNT(*)::int AS count
      FROM platform.platform_audit_log al
      WHERE al.tenant_afectado = ${(tenantResult as Record<string, unknown>).nombre as string}
        AND al.created_at > now() - interval '7 days'
    `)
    audit7d = (auditResult as Record<string, unknown>).count as number || 0
  } catch {
    // Ignore if table/column doesn't exist
  }

  const t = {
    ...(tenantResult as Record<string, unknown>),
    audit_7d: audit7d,
  } as Record<string, unknown> & { audit_7d: number }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <a href="/dashboard/tenants" className="text-sm text-[var(--accent)] hover:underline mb-2 inline-block">
            ← Volver a tenants
          </a>
          <h1 className="text-xl font-bold">{t.nombre as string}</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            {t.subdomain ? `${t.subdomain}.aicorebots.com` : 'Sin subdominio'}
            <span className="mx-2">·</span>
            Plan: {String(t.plan || 'free')}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <ImpersonateButton tenantId={id} tenantName={t.nombre as string} />
          <RevokeImpersonationButton tenantId={id} tenantName={t.nombre as string} />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatBox label="Usuarios" value={String(t.usuario_count || 0)} />
        <StatBox label="Pacientes" value={String(t.paciente_count || 0)} />
        <StatBox label="Turnos" value={String(t.turno_count || 0)} />
        <StatBox label="Recetas" value={String(t.receta_count || 0)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InfoCard title="Información general">
          <InfoRow label="ID" value={t.id as string} mono />
          <InfoRow label="Estado" value={t.activo ? 'Activo' : 'Inactivo'} />
          <InfoRow label="Creado" value={new Date(t.created_at as string).toLocaleString('es-CL')} />
          <InfoRow label="Plan" value={String(t.plan || 'free')} />
          <InfoRow label="Dominio custom" value={String(t.dominio_custom || '—')} />
        </InfoCard>

        <InfoCard title="Actividad reciente">
          <InfoRow label="Último turno" value={t.ultimo_turno ? new Date(t.ultimo_turno as string).toLocaleDateString('es-CL') : '—'} />
          <InfoRow label="Última receta" value={t.ultima_receta ? new Date(t.ultima_receta as string).toLocaleDateString('es-CL') : '—'} />
          <InfoRow label="Auditoría (7d)" value={String(t.audit_7d || 0)} />
        </InfoCard>
      </div>

      <TenantManager
        tenantId={id}
        tenantName={t.nombre as string}
        activo={Boolean(t.activo)}
        plan={String(t.plan || 'free')}
        colores={
          t.colores && typeof t.colores === 'object'
            ? (t.colores as { primary?: string; secondary?: string })
            : undefined
        }
      />
    </div>
  )
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4">
      <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  )
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5">
      <h2 className="text-sm font-semibold mb-3">{title}</h2>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between text-sm py-1">
      <span className="text-[var(--text-secondary)]">{label}</span>
      <span className={`${mono ? 'font-mono text-xs' : ''} text-right max-w-[60%] truncate`}>{value}</span>
    </div>
  )
}
