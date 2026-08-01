'use client'

import { useState } from 'react'
import { OverrideActions } from './override-actions'

interface TenantOpt {
  id: string
  nombre: string
  subdomain?: string | null
}

export function OverridePanel({
  tenants,
  initialTenantId,
}: {
  tenants: TenantOpt[]
  initialTenantId?: string
}) {
  const [tenantId, setTenantId] = useState(initialTenantId || '')

  const selected = tenants.find((t) => t.id === tenantId)

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5">
      <h2 className="text-sm font-semibold mb-1">Resolución activa de incidentes</h2>
      <p className="text-xs text-[var(--text-muted)] mb-4">
        Seleccioná un tenant para aplicar acciones manuales de override.
      </p>

      <select
        value={tenantId}
        onChange={(e) => setTenantId(e.target.value)}
        className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-sm mb-4"
      >
        <option value="">Seleccionar tenant...</option>
        {tenants.map((t) => (
          <option key={t.id} value={t.id}>
            {t.nombre}
            {t.subdomain ? ` (${t.subdomain})` : ''}
          </option>
        ))}
      </select>

      {selected ? (
        <OverrideActions
          tenant={{ id: selected.id, nombre: selected.nombre, subdomain: selected.subdomain }}
        />
      ) : (
        <p className="text-sm text-[var(--text-muted)]">No hay tenant seleccionado.</p>
      )}
    </div>
  )
}
