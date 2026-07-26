'use client'

import { useState, useEffect } from 'react'

interface Passkey {
  id: string
  credential_id: string
  device_name: string | null
  created_at: string
  last_used_at: string | null
}

export default function PasskeysPage() {
  const [passkeys, setPasskeys] = useState<Passkey[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

  async function loadPasskeys() {
    setLoading(true)
    try {
      const res = await fetch('/api/passkeys')
      const data = await res.json()
      if (data.success) setPasskeys(data.data)
    } catch {
      setPasskeys([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadPasskeys() }, [])

  async function deletePasskey(id: string) {
    setDeleting(id)
    try {
      await fetch('/api/passkeys', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passkeyId: id }),
      })
      setPasskeys(prev => prev.filter(p => p.id !== id))
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Passkeys</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Dispositivos registrados para autenticación sin contraseña
        </p>
      </div>

      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--bg-secondary)]">
              <th className="text-left py-3 px-4 font-medium text-[var(--text-secondary)]">Dispositivo</th>
              <th className="text-left py-3 px-4 font-medium text-[var(--text-secondary)]">Registrada</th>
              <th className="text-left py-3 px-4 font-medium text-[var(--text-secondary)]">Último uso</th>
              <th className="text-center py-3 px-4 font-medium text-[var(--text-secondary)]">Acción</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-sm text-[var(--text-muted)]">Cargando...</td>
              </tr>
            ) : passkeys.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-sm text-[var(--text-muted)]">
                  Sin passkeys registradas. Registrate desde /setup.
                </td>
              </tr>
            ) : (
              passkeys.map(pk => (
                <tr key={pk.id} className="border-b border-[var(--border)] hover:bg-[var(--bg-hover)] transition-colors">
                  <td className="py-3 px-4">{pk.device_name || 'Dispositivo sin nombre'}</td>
                  <td className="py-3 px-4 text-xs text-[var(--text-muted)] font-mono">
                    {new Date(pk.created_at).toLocaleString('es-CL')}
                  </td>
                  <td className="py-3 px-4 text-xs text-[var(--text-muted)] font-mono">
                    {pk.last_used_at ? new Date(pk.last_used_at).toLocaleString('es-CL') : 'Nunca'}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => deletePasskey(pk.id)}
                      disabled={deleting === pk.id}
                      className="text-xs text-[var(--danger)] hover:underline disabled:opacity-50"
                    >
                      {deleting === pk.id ? '...' : 'Eliminar'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
