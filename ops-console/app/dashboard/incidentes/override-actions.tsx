'use client'

import { useState } from 'react'
import { ConfirmModal } from '@/components/confirm-modal'

interface TenantInfo {
  id: string
  nombre: string
  subdomain?: string | null
}

interface SuscripcionState {
  id?: string
  plan?: string
  estado?: string
  periodStart?: string | null
  periodEnd?: string | null
  mercadopagoPaymentId?: string | null
}

type ModalKey = 'gracia' | 'activar' | 'mp' | 'evolution' | null

function fmtFecha(value: string | null | undefined): string {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString('es-CL', {
      dateStyle: 'short',
      timeStyle: 'short',
    })
  } catch {
    return String(value)
  }
}

export function OverrideActions({ tenant }: { tenant: TenantInfo }) {
  const [modal, setModal] = useState<ModalKey>(null)
  const [dias, setDias] = useState(7)
  const [paymentId, setPaymentId] = useState('')
  const [pagos, setPagos] = useState<{ paymentId: string; fecha: string; estado: string }[]>([])
  const [error, setError] = useState<string | null>(null)
  const [suscripcion, setSuscripcion] = useState<SuscripcionState | null>(null)
  const [loadingEstado, setLoadingEstado] = useState(false)

  async function cargarEstado() {
    setError(null)
    setSuscripcion(null)
    setLoadingEstado(true)
    try {
      const res = await fetch(`/api/overrides/gracia?tenantId=${tenant.id}`)
      const data = await res.json()
      if (res.ok && data.data) {
        setSuscripcion(data.data.suscripcion)
      } else {
        setError(data.error || 'No se pudo obtener el estado de la suscripción')
      }
    } catch {
      setError('Error de conexión')
    } finally {
      setLoadingEstado(false)
    }
  }

  async function cargarPagos() {
    setError(null)
    setPagos([])
    try {
      const res = await fetch(`/api/overrides/mp/reintentar?tenantId=${tenant.id}`)
      const data = await res.json()
      if (res.ok && data.data) {
        const lista = (data.data.pagos as Record<string, unknown>[]).map((p) => ({
          paymentId: String(p.mercadopagoPaymentId || p.mercadopagoPreferenceId || ''),
          fecha: p.createdAt ? String(p.createdAt) : '',
          estado: String(p.estado || ''),
        }))
        setPagos(lista.filter((p) => p.paymentId))
      } else {
        setError(data.error || 'No se pudieron listar los pagos')
      }
    } catch {
      setError('Error de conexión')
    }
  }

  function abrirGracia() {
    setModal('gracia')
    cargarEstado()
  }
  function abrirActivar() {
    setModal('activar')
    cargarEstado()
  }
  function abrirMp() {
    setModal('mp')
    cargarEstado()
    cargarPagos()
  }
  function abrirEvolution() {
    setModal('evolution')
    cargarEstado()
  }

  async function confirmar(motivo: string) {
    if (modal === 'gracia') {
      const res = await fetch('/api/overrides/gracia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: tenant.id, dias, motivo }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al extender la gracia')
      return
    }
    if (modal === 'activar') {
      const res = await fetch('/api/overrides/suscripcion/activar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: tenant.id, motivo }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al activar la suscripción')
      return
    }
    if (modal === 'mp') {
      if (!paymentId.trim()) throw new Error('Seleccioná o ingresá un paymentId')
      const res = await fetch('/api/overrides/mp/reintentar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: tenant.id, paymentId: paymentId.trim(), motivo }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al reintentar el webhook')
      return
    }
    if (modal === 'evolution') {
      const res = await fetch('/api/overrides/evolution/reiniciar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: tenant.id, motivo }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al reiniciar la instancia de Evolution')
    }
  }

  const estadoDetalle = suscripcion ? (
    <div className="text-sm space-y-1">
      <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Estado actual</p>
      <p>
        Plan: <strong className="font-mono">{String(suscripcion.plan || '—')}</strong>
      </p>
      <p>
        Estado: <strong className="font-mono">{String(suscripcion.estado || '—')}</strong>
      </p>
      <p>
        Fin de período: <strong className="font-mono">{fmtFecha(suscripcion.periodEnd)}</strong>
      </p>
      <p>
        Inicio: <strong className="font-mono">{fmtFecha(suscripcion.periodStart)}</strong>
      </p>
    </div>
  ) : (
    <p className="text-sm text-[var(--text-muted)]">
      {loadingEstado ? 'Consultando estado...' : 'El tenant no tiene suscripción o no se pudo consultar.'}
    </p>
  )

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5">
      <h2 className="text-sm font-semibold mb-1">Acciones de override</h2>
      <p className="text-xs text-[var(--text-muted)] mb-4">
        Cada acción requiere confirmación explícita y queda registrada en el audit log.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <button
          onClick={abrirGracia}
          className="px-4 py-3 border border-[var(--border)] rounded-lg text-left hover:bg-[var(--bg-hover)] transition-colors"
        >
          <p className="text-sm font-medium">⏳ Extender período de gracia</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Pone la suscripción en past_due con nueva fecha de vencimiento
          </p>
        </button>

        <button
          onClick={abrirActivar}
          className="px-4 py-3 border border-[var(--border)] rounded-lg text-left hover:bg-[var(--bg-hover)] transition-colors"
        >
          <p className="text-sm font-medium">✅ Activar suscripción manualmente</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Para pagos confirmados fuera de banda
          </p>
        </button>

        <button
          onClick={abrirMp}
          className="px-4 py-3 border border-[var(--border)] rounded-lg text-left hover:bg-[var(--bg-hover)] transition-colors"
        >
          <p className="text-sm font-medium">🔁 Reintentar webhook de MercadoPago</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Reprocesa una notificación de pago fallida
          </p>
        </button>

        <button
          onClick={abrirEvolution}
          className="px-4 py-3 border border-[var(--border)] rounded-lg text-left hover:bg-[var(--bg-hover)] transition-colors"
        >
          <p className="text-sm font-medium">📱 Reiniciar conexión WhatsApp</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Reinicia la instancia de Evolution de este tenant
          </p>
        </button>
      </div>

      {error && <p className="text-sm text-red-500 mt-3">❌ {error}</p>}

      <ConfirmModal
        open={modal === 'gracia'}
        onClose={() => setModal(null)}
        title="Extender período de gracia"
        tenantName={tenant.nombre}
        confirmLabel="Extender gracia"
        onConfirm={confirmar}
        detail={
          <div className="space-y-3">
            {estadoDetalle}
            <div>
              <label className="block text-sm font-medium mb-1">Días a extender</label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={1}
                  max={30}
                  value={dias}
                  onChange={(e) => setDias(Number(e.target.value))}
                  className="flex-1"
                />
                <span className="font-mono text-sm w-8 text-right">{dias}d</span>
              </div>
            </div>
            <div className="bg-[var(--bg)] border border-[var(--border)] rounded-lg p-3">
              <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Resultado esperado</p>
              <p className="text-sm mt-1">
                <strong className="font-mono">past_due</strong> con vencimiento en{' '}
                <strong className="font-mono">
                  {fmtFecha(
                    new Date(
                      Date.now() + dias * 24 * 60 * 60 * 1000,
                    ).toISOString(),
                  )}
                </strong>
              </p>
            </div>
          </div>
        }
      />

      <ConfirmModal
        open={modal === 'activar'}
        onClose={() => setModal(null)}
        title="Activar suscripción manualmente"
        tenantName={tenant.nombre}
        confirmLabel="Activar suscripción"
        onConfirm={confirmar}
        detail={
          <div className="space-y-3">
            {estadoDetalle}
            <div className="bg-[var(--bg)] border border-[var(--border)] rounded-lg p-3">
              <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Resultado esperado</p>
              <p className="text-sm mt-1">
                <strong className="font-mono">active</strong> · período renovado +1 mes · plan aplicado a todos
                los usuarios del tenant
              </p>
            </div>
          </div>
        }
      />

      <ConfirmModal
        open={modal === 'mp'}
        onClose={() => setModal(null)}
        title="Reintentar webhook de MercadoPago"
        tenantName={tenant.nombre}
        confirmLabel="Reintentar webhook"
        onConfirm={confirmar}
        detail={
          <div className="space-y-3">
            {estadoDetalle}
            <div>
              <label className="block text-sm font-medium mb-1">Pago a reprocesar</label>
              {pagos.length > 0 ? (
                <select
                  value={paymentId}
                  onChange={(e) => setPaymentId(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-sm font-mono"
                >
                  <option value="">Seleccionar pago...</option>
                  {pagos.map((p, i) => (
                    <option key={i} value={p.paymentId}>
                      {p.paymentId} · {p.estado} · {fmtFecha(p.fecha)}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-xs text-[var(--text-muted)]">Sin pagos registrados del tenant.</p>
              )}
              <input
                type="text"
                value={paymentId}
                onChange={(e) => setPaymentId(e.target.value)}
                placeholder="O pegá el paymentId manualmente"
                className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-sm font-mono mt-2"
              />
            </div>
            <div className="bg-[var(--bg)] border border-[var(--border)] rounded-lg p-3">
              <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Resultado esperado</p>
              <p className="text-sm mt-1">
                Consulta el pago en MercadoPago y reaplica el efecto (activar suscripción / marcar turno pagado).
              </p>
            </div>
          </div>
        }
      />

      <ConfirmModal
        open={modal === 'evolution'}
        onClose={() => setModal(null)}
        title="Reiniciar conexión WhatsApp"
        tenantName={tenant.nombre}
        confirmLabel="Reiniciar instancia"
        onConfirm={confirmar}
        detail={
          <div className="space-y-3">
            <p className="text-sm">
              Instancia Evolution: <strong className="font-mono">{tenant.subdomain || 'sin subdomain'}</strong>
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              La instancia se reinicia vía Evolution API. Esto puede cortar brevemente la conexión de WhatsApp
              del tenant.
            </p>
          </div>
        }
      />
    </div>
  )
}
