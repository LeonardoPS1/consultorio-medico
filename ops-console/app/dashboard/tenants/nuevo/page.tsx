'use client'

import { useState } from 'react'
import Link from 'next/link'

const PLANES = ['free', 'starter', 'professional', 'premium', 'enterprise'] as const

const PLAN_LABELS: Record<(typeof PLANES)[number], string> = {
  free: 'Free',
  starter: 'Starter',
  professional: 'Professional',
  premium: 'Premium',
  enterprise: 'Enterprise',
}

const SUBDOMAIN_REGEX = /^[a-z0-9-]+$/

export default function NuevaClinicaPage() {
  const [nombre, setNombre] = useState('')
  const [subdomain, setSubdomain] = useState('')
  const [plan, setPlan] = useState<(typeof PLANES)[number]>('free')
  const [adminEmail, setAdminEmail] = useState('')
  const [adminNombre, setAdminNombre] = useState('')
  const [subdomainError, setSubdomainError] = useState('')
  const [formError, setFormError] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{
    ok: boolean
    message?: string
    tenantId?: string
    subdomain?: string
    adminEmail?: string
  } | null>(null)

  function validarSubdomain(value: string) {
    const v = value.trim()
    if (!v) {
      setSubdomainError('')
      return
    }
    if (!SUBDOMAIN_REGEX.test(v)) {
      setSubdomainError('Solo letras minúsculas, números y guiones')
      return
    }
    setSubdomainError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    setResult(null)

    const sub = subdomain.trim()
    if (!nombre.trim()) return setFormError('El nombre de la clínica es obligatorio')
    if (!sub) return setFormError('El subdominio es obligatorio')
    if (!SUBDOMAIN_REGEX.test(sub)) return setFormError('El subdominio solo admite letras minúsculas, números y guiones')
    if (!adminEmail.trim()) return setFormError('El email del administrador es obligatorio')
    if (!adminNombre.trim()) return setFormError('El nombre del administrador es obligatorio')

    setLoading(true)
    try {
      const res = await fetch('/api/tenants/crear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: nombre.trim(), subdomain: sub, plan, adminEmail: adminEmail.trim(), adminNombre: adminNombre.trim() }),
      })
      const data = await res.json()
      if (res.ok && data.data) {
        const r = data.data as { tenantId: string; subdomain: string; adminEmail: string }
        setResult({
          ok: true,
          tenantId: r.tenantId,
          subdomain: r.subdomain,
          adminEmail: r.adminEmail,
          message: 'Clínica creada correctamente. Se envió un email de bienvenida al administrador con sus credenciales de primer acceso.',
        })
      } else {
        setResult({ ok: false, message: data.error || 'Error al crear la clínica' })
      }
    } catch {
      setResult({ ok: false, message: 'Error de conexión' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/tenants" className="text-sm text-[var(--accent)] hover:underline">
          ← Volver
        </Link>
      </div>

      <div>
        <h1 className="text-xl font-bold">Nueva clínica</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Crea una organización nueva con su administrador de primer acceso.
        </p>
      </div>

      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6 space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="nombre" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Nombre de la clínica
            </label>
            <input
              id="nombre"
              type="text"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              placeholder="Ej: Clínica Los Andes"
              className="w-full px-3 py-2 text-sm bg-[var(--bg-card)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />
          </div>

          <div>
            <label htmlFor="subdomain" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Subdominio
            </label>
            <div className="flex items-center gap-2">
              <input
                id="subdomain"
                type="text"
                value={subdomain}
                onChange={e => {
                  const v = e.target.value.toLowerCase()
                  setSubdomain(v)
                  validarSubdomain(v)
                }}
                placeholder="clinica-los-andes"
                className="flex-1 px-3 py-2 text-sm bg-[var(--bg-card)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)] font-mono"
              />
              <span className="text-sm text-[var(--text-muted)] font-mono whitespace-nowrap">.aicorebots.com</span>
            </div>
            {subdomainError ? (
              <p className="text-xs text-[var(--danger)] mt-1">{subdomainError}</p>
            ) : (
              <p className="text-xs text-[var(--text-muted)] mt-1">Solo letras minúsculas, números y guiones.</p>
            )}
          </div>

          <div>
            <label htmlFor="plan" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Plan
            </label>
            <select
              id="plan"
              value={plan}
              onChange={e => setPlan(e.target.value as (typeof PLANES)[number])}
              className="w-full px-3 py-2 text-sm bg-[var(--bg-card)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            >
              {PLANES.map(p => (
                <option key={p} value={p}>
                  {PLAN_LABELS[p]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="adminEmail" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Email del administrador
            </label>
            <input
              id="adminEmail"
              type="email"
              value={adminEmail}
              onChange={e => setAdminEmail(e.target.value)}
              placeholder="admin@clinica.cl"
              className="w-full px-3 py-2 text-sm bg-[var(--bg-card)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />
          </div>

          <div>
            <label htmlFor="adminNombre" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Nombre del administrador
            </label>
            <input
              id="adminNombre"
              type="text"
              value={adminNombre}
              onChange={e => setAdminNombre(e.target.value)}
              placeholder="Ej: Dra. María Pérez"
              className="w-full px-3 py-2 text-sm bg-[var(--bg-card)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />
          </div>

          {formError ? (
            <p className="text-sm text-[var(--danger)]">{formError}</p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 text-sm font-medium text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 rounded-lg transition-colors"
          >
            {loading ? 'Creando clínica...' : 'Crear clínica'}
          </button>
        </form>
      </div>

      {result ? (
        result.ok && result.tenantId ? (
          <div className="bg-[var(--bg-card)] border border-[var(--success)] rounded-xl p-6 space-y-2">
            <p className="text-sm text-[var(--success)] font-medium">{result.message}</p>
            <dl className="text-sm space-y-1">
              <div className="flex justify-between">
                <dt className="text-[var(--text-secondary)]">Subdominio</dt>
                <dd className="font-mono">{result.subdomain}.aicorebots.com</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--text-secondary)]">Admin</dt>
                <dd>{result.adminEmail}</dd>
              </div>
            </dl>
            <div className="pt-2 flex gap-3">
              <Link
                href={`/dashboard/tenants/${result.tenantId}`}
                className="inline-flex px-4 py-2 text-sm font-medium text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] rounded-lg transition-colors"
              >
                Ver la clínica
              </Link>
              <Link
                href="/dashboard/tenants"
                className="inline-flex px-4 py-2 text-sm font-medium text-[var(--text-secondary)] border border-[var(--border)] hover:bg-[var(--bg-hover)] rounded-lg transition-colors"
              >
                Ir al listado
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-[var(--bg-card)] border border-[var(--danger)] rounded-xl p-6">
            <p className="text-sm text-[var(--danger)] font-medium">{result.message}</p>
          </div>
        )
      ) : null}
    </div>
  )
}
