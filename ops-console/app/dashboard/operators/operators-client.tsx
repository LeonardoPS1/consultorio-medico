'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Operator {
  id: string
  email: string
  nombre: string
  activo: boolean
  totpVerified: boolean | null
  ultimoAcceso: Date | null
  createdAt: Date
  passkeyCount: number
}

export function OperatorsClient({
  operators: initialOperators,
  currentOperatorId,
}: {
  operators: Operator[]
  currentOperatorId: string
}) {
  const router = useRouter()
  const [operators, setOperators] = useState(initialOperators)
  const [showCreate, setShowCreate] = useState(false)
  const [email, setEmail] = useState('')
  const [nombre, setNombre] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    setError('')
    setSuccess('')
    try {
      const res = await fetch('/api/operators', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, nombre }),
      })
      const data = await res.json()
      if (!data.success) {
        setError(data.error || 'Error al crear operador')
        return
      }
      setSuccess(`Operador creado. Setup URL: /setup?token=${data.data.setupToken}`)
      setEmail('')
      setNombre('')
      setShowCreate(false)
      router.refresh()
      const refreshRes = await fetch('/api/operators')
      const refreshData = await refreshRes.json()
      if (refreshData.success) setOperators(refreshData.data)
    } catch {
      setError('Error de conexión')
    } finally {
      setCreating(false)
    }
  }

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  async function toggleActive(op: Operator) {
    const res = await fetch(`/api/operators/${op.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activo: !op.activo }),
    })
    const data = await res.json()
    if (data.success) {
      setOperators(operators.map(o => o.id === op.id ? { ...o, activo: !op.activo } : o))
    }
  }

  async function updateName(op: Operator) {
    if (!editName.trim() || editName.trim() === op.nombre) {
      setEditingId(null)
      return
    }
    const res = await fetch(`/api/operators/${op.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: editName.trim() }),
    })
    const data = await res.json()
    if (data.success) {
      setOperators(operators.map(o => o.id === op.id ? { ...o, nombre: editName.trim() } : o))
    }
    setEditingId(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Operadores</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            {operators.length} operador{operators.length !== 1 ? 'es' : ''} registrado{operators.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => { setShowCreate(!showCreate); setError(''); setSuccess('') }}
          className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-sm hover:opacity-90 transition-opacity"
        >
          {showCreate ? 'Cancelar' : 'Nuevo operador'}
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] text-sm focus:outline-none focus:border-[var(--accent)]"
                placeholder="operator@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Nombre</label>
              <input
                type="text"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] text-sm focus:outline-none focus:border-[var(--accent)]"
                placeholder="Nombre completo"
              />
            </div>
          </div>
          {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
          {success && <p className="text-sm text-[var(--success)]">{success}</p>}
          <button
            type="submit"
            disabled={creating}
            className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-sm hover:opacity-90 disabled:opacity-50"
          >
            {creating ? 'Creando...' : 'Crear operador'}
          </button>
        </form>
      )}

      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--bg-secondary)]">
              <th className="text-left py-3 px-4 font-medium text-[var(--text-secondary)]">Nombre</th>
              <th className="text-left py-3 px-4 font-medium text-[var(--text-secondary)]">Email</th>
              <th className="text-center py-3 px-4 font-medium text-[var(--text-secondary)]">Estado</th>
              <th className="text-center py-3 px-4 font-medium text-[var(--text-secondary)]">2FA</th>
              <th className="text-center py-3 px-4 font-medium text-[var(--text-secondary)]">Passkeys</th>
              <th className="text-right py-3 px-4 font-medium text-[var(--text-secondary)]">Último acceso</th>
              <th className="text-center py-3 px-4 font-medium text-[var(--text-secondary)]">Acción</th>
            </tr>
          </thead>
          <tbody>
            {operators.map(op => (
              <tr key={op.id} className="border-b border-[var(--border)] hover:bg-[var(--bg-hover)] transition-colors">
                <td className="py-3 px-4 font-medium">
                  {editingId === op.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') updateName(op); if (e.key === 'Escape') setEditingId(null) }}
                        className="px-2 py-1 rounded bg-[var(--bg-primary)] border border-[var(--border)] text-sm w-40 focus:outline-none focus:border-[var(--accent)]"
                        autoFocus
                      />
                      <button onClick={() => updateName(op)} className="text-xs text-[var(--success)] hover:opacity-80">✓</button>
                      <button onClick={() => setEditingId(null)} className="text-xs text-[var(--text-muted)] hover:opacity-80">✕</button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => { setEditingId(op.id); setEditName(op.nombre) }}
                        className="hover:text-[var(--accent)] transition-colors text-left"
                        title="Editar nombre"
                      >
                        {op.nombre}
                      </button>
                      {op.id === currentOperatorId && (
                        <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-[var(--accent)]/20 text-[var(--accent)]">tú</span>
                      )}
                    </>
                  )}
                </td>
                <td className="py-3 px-4 text-[var(--text-secondary)]">{op.email}</td>
                <td className="py-3 px-4 text-center">
                  <span className={`inline-block w-2 h-2 rounded-full ${op.activo ? 'bg-[var(--success)]' : 'bg-[var(--danger)]'}`} />
                </td>
                <td className="py-3 px-4 text-center">
                  <span className={`text-xs px-1.5 py-0.5 rounded ${op.totpVerified ? 'bg-[var(--success)]/20 text-[var(--success)]' : 'bg-[var(--bg-hover)] text-[var(--text-muted)]'}`}>
                    {op.totpVerified ? '✓' : '—'}
                  </span>
                </td>
                <td className="py-3 px-4 text-center">{op.passkeyCount}</td>
                <td className="py-3 px-4 text-right text-xs text-[var(--text-muted)]">
                  {op.ultimoAcceso ? new Date(op.ultimoAcceso).toLocaleString('es-CL') : 'Nunca'}
                </td>
                <td className="py-3 px-4 text-center">
                  <button
                    onClick={() => toggleActive(op)}
                    disabled={op.id === currentOperatorId}
                    className={`text-xs px-2 py-1 rounded transition-colors ${
                      op.id === currentOperatorId
                        ? 'text-[var(--text-muted)] cursor-not-allowed'
                        : op.activo
                          ? 'text-[var(--danger)] hover:bg-[var(--danger)]/10'
                          : 'text-[var(--success)] hover:bg-[var(--success)]/10'
                    }`}
                  >
                    {op.id === currentOperatorId ? '—' : op.activo ? 'Desactivar' : 'Activar'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
