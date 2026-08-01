'use client'

import { useState, type ReactNode } from 'react'

interface ConfirmModalProps {
  open: boolean
  onClose: () => void
  title: string
  tenantName: string
  detail: ReactNode
  confirmLabel?: string
  motivoRequired?: boolean
  onConfirm: (motivo: string) => Promise<void>
  error?: string | null
}

export function ConfirmModal({
  open,
  onClose,
  title,
  tenantName,
  detail,
  confirmLabel = 'Confirmar',
  motivoRequired = true,
  onConfirm,
  error,
}: ConfirmModalProps) {
  const [motivo, setMotivo] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState<string | null>(null)

  if (!open) return null

  async function handleConfirm() {
    if (motivoRequired && motivo.trim().length < 5) return
    setLoading(true)
    setDone(null)
    try {
      await onConfirm(motivo)
      setDone('Acción ejecutada correctamente')
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    setMotivo('')
    setDone(null)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={handleClose}
    >
      <div
        className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold mb-1">{title}</h2>
        <p className="text-sm text-[var(--text-secondary)] mb-4">
          <strong>{tenantName}</strong>
        </p>

        <div className="bg-[var(--bg)] border border-[var(--border)] rounded-lg p-4 mb-4 space-y-2">
          {detail}
        </div>

        {motivoRequired && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Motivo (obligatorio)</label>
            <input
              type="text"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ej: pago confirmado por el cliente fuera de banda"
              disabled={loading || !!done}
              className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-sm disabled:opacity-50"
            />
            {motivoRequired && motivo && motivo.trim().length < 5 && (
              <p className="text-xs text-red-500 mt-1">El motivo debe tener al menos 5 caracteres</p>
            )}
          </div>
        )}

        {done && (
          <p className="text-sm text-green-600 mb-4 bg-green-500/10 rounded-lg p-3">✅ {done}</p>
        )}

        {error && <p className="text-sm text-red-500 mb-4 bg-red-500/10 rounded-lg p-3">❌ {error}</p>}

        <div className="flex gap-2">
          <button
            onClick={handleClose}
            disabled={loading}
            className="flex-1 px-4 py-2 border border-[var(--border)] rounded-lg text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] disabled:opacity-50"
          >
            {done ? 'Cerrar' : 'Cancelar'}
          </button>
          {!done && (
            <button
              onClick={handleConfirm}
              disabled={loading || (motivoRequired && motivo.trim().length < 5)}
              className="flex-1 px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              {loading ? 'Ejecutando...' : confirmLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
