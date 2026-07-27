'use client'

import { useState } from 'react'
import { X, Loader2, AlertTriangle, ShieldCheck } from 'lucide-react'

interface ImpersonateModalProps {
  open: boolean
  onClose: () => void
  tenantId: string
  tenantName: string
}

export function ImpersonateModal({ open, onClose, tenantId, tenantName }: ImpersonateModalProps) {
  const [step, setStep] = useState<'motivo' | 'totp' | 'confirming'>('motivo')
  const [motivo, setMotivo] = useState('')
  const [totpCode, setTotpCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (!open) return null

  async function handleMotivoSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (motivo.trim().length < 5) {
      setError('El motivo debe tener al menos 5 caracteres')
      return
    }
    setError('')
    setStep('totp')
  }

  async function handleTotpSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!/^\d{6}$/.test(totpCode)) {
      setError('Código inválido. Debe tener 6 dígitos.')
      return
    }
    setError('')
    setLoading(true)
    setStep('confirming')

    try {
      const verifyRes = await fetch('/api/auth/impersonate/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: totpCode, tenantId, tenantName, motivo: motivo.trim() }),
      })
      const verifyData = await verifyRes.json()

      if (!verifyRes.ok || !verifyData.success) {
        setError(verifyData.error || 'Error al verificar TOTP')
        setStep('totp')
        setLoading(false)
        return
      }

      const createRes = await fetch(
        `${window.location.origin}/api/internal/impersonate-proxy`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tenantId,
            tenantName: verifyData.data.tenantName,
            motivo: verifyData.data.motivo,
            creadoPor: verifyData.data.operatorEmail,
            creadoPorNombre: verifyData.data.operatorNombre,
          }),
        },
      )
      const createData = await createRes.json()

      if (!createRes.ok || !createData.token) {
        setError(createData.error || 'Error al crear token de acceso')
        setStep('totp')
        setLoading(false)
        return
      }

      window.open(
        `${createData.dashboardUrl}/api/auth/impersonate?token=${createData.token}`,
        '_blank',
      )
      onClose()
    } catch {
      setError('Error de conexión')
      setStep('totp')
      setLoading(false)
    }
  }

  function reset() {
    setStep('motivo')
    setMotivo('')
    setTotpCode('')
    setError('')
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl w-full max-w-md p-6 relative shadow-2xl">
        <button
          onClick={() => { reset(); onClose() }}
          className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          aria-label="Cerrar"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Entrar como {tenantName}</h2>
            <p className="text-sm text-[var(--text-secondary)]">
              Accedé al panel del tenant como administrador
            </p>
          </div>
        </div>

        {step === 'motivo' && (
          <form onSubmit={handleMotivoSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Motivo del acceso *</label>
              <textarea
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ej: Revisión de configuración de turnos solicitada por el cliente"
                rows={3}
                className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] resize-none"
                autoFocus
              />
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Este motivo quedará registrado en la auditoría y se notificará al admin del tenant.
              </p>
            </div>
            {error && (
              <div className="flex items-center gap-2 text-red-500 text-sm">
                <AlertTriangle className="w-4 h-4" />
                {error}
              </div>
            )}
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-[var(--accent)] text-white font-medium text-sm hover:opacity-90 transition-opacity"
            >
              Continuar
            </button>
          </form>
        )}

        {step === 'totp' && (
          <form onSubmit={handleTotpSubmit} className="space-y-4">
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-sm text-amber-700 dark:text-amber-400">
              <p className="font-medium mb-1">Verificación de seguridad</p>
              <p>
                Ingresá tu código TOTP de <strong>AicoreOps</strong> para autorizar el acceso como{' '}
                <strong>{tenantName}</strong>.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Código TOTP</label>
              <input
                type="text"
                inputMode="numeric"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-sm text-center text-2xl font-mono tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                autoFocus
              />
            </div>
            {error && (
              <div className="flex items-center gap-2 text-red-500 text-sm">
                <AlertTriangle className="w-4 h-4" />
                {error}
              </div>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep('motivo')}
                className="flex-1 py-2.5 rounded-xl border border-[var(--border)] text-sm hover:bg-[var(--bg-secondary)] transition-colors"
              >
                Volver
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl bg-[var(--accent)] text-white font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Verificar y entrar'}
              </button>
            </div>
          </form>
        )}

        {step === 'confirming' && loading && (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
            <p className="text-sm text-[var(--text-secondary)]">Creando acceso...</p>
          </div>
        )}
      </div>
    </div>
  )
}
