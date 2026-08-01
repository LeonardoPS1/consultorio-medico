'use client'

import { useState } from 'react'

const PLANES = ['free', 'starter', 'professional', 'business', 'enterprise'] as const

interface Props {
  tenantId: string
  tenantName: string
  activo: boolean
  plan: string
  colores?: { primary?: string; secondary?: string }
}

export function TenantManager({ tenantId, tenantName, activo, plan, colores }: Props) {
  const [isActivo, setIsActivo] = useState(activo)
  const [selectedPlan, setSelectedPlan] = useState(plan || 'free')
  const [primary, setPrimary] = useState(colores?.primary || '#2563eb')
  const [secondary, setSecondary] = useState(colores?.secondary || '#059669')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  async function save(fields: Record<string, unknown>) {
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch(`/api/tenants/${tenantId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      })
      const data = await res.json()
      if (res.ok) {
        setMessage({ ok: true, text: 'Cambios guardados correctamente' })
      } else {
        setMessage({ ok: false, text: data.error || 'Error al guardar' })
      }
    } catch {
      setMessage({ ok: false, text: 'Error de conexión' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5">
      <h2 className="text-sm font-semibold mb-4">Gestión del tenant</h2>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Tenant activo</p>
            <p className="text-xs text-[var(--text-muted)]">
              {isActivo ? 'Habilitado para accesos' : 'Deshabilitado — los usuarios no pueden operar'}
            </p>
          </div>
          <button
            onClick={() => {
              const next = !isActivo
              setIsActivo(next)
              save({ activo: next })
            }}
            disabled={saving}
            className={`relative w-11 h-6 rounded-full transition-colors disabled:opacity-50 ${
              isActivo ? 'bg-green-500' : 'bg-gray-400'
            }`}
            aria-label={isActivo ? 'Deshabilitar tenant' : 'Habilitar tenant'}
          >
            <span
              className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${
                isActivo ? 'left-[22px]' : 'left-0.5'
              }`}
            />
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Plan</label>
          <select
            value={selectedPlan}
            onChange={(e) => {
              const next = e.target.value
              setSelectedPlan(next)
              save({ plan: next })
            }}
            disabled={saving}
            className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-sm disabled:opacity-50"
          >
            {PLANES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Actualiza la suscripción vigente y el plan de todos los usuarios del tenant.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Colores de marca</label>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
              Primario
              <input
                type="color"
                value={primary}
                onChange={(e) => setPrimary(e.target.value)}
                className="w-8 h-8 rounded border border-[var(--border)] bg-transparent cursor-pointer"
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
              Secundario
              <input
                type="color"
                value={secondary}
                onChange={(e) => setSecondary(e.target.value)}
                className="w-8 h-8 rounded border border-[var(--border)] bg-transparent cursor-pointer"
              />
            </label>
            <button
              onClick={() => save({ colores: { primary, secondary } })}
              disabled={saving}
              className="ml-auto px-3 py-1.5 text-xs bg-[var(--accent)] text-white rounded-lg hover:opacity-90 disabled:opacity-50"
            >
              Guardar colores
            </button>
          </div>
        </div>

        {message && (
          <p className={`text-sm ${message.ok ? 'text-green-600' : 'text-red-500'}`}>
            {message.text}
          </p>
        )}
      </div>

      <p className="text-[10px] text-[var(--text-muted)] mt-4">
        Tenant: <strong>{tenantName}</strong> ({tenantId})
      </p>
    </div>
  )
}
