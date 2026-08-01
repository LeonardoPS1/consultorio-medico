'use client'

import { useState } from 'react'
import Link from 'next/link'

interface SearchResult {
  tipo: 'telefono' | 'nombre' | 'turno'
  registroId: string
  telefono?: string | null
  nombre?: string | null
  apellido?: string | null
  rut?: string | null
  email?: string | null
  fechaHora?: string | null
  estado?: string | null
  pacienteId?: string | null
  tenant?: { id: string; nombre: string; subdomain?: string | null } | null
}

const TIPO_LABEL: Record<SearchResult['tipo'], string> = {
  telefono: '📞 Teléfono',
  nombre: '👤 Nombre',
  turno: '🗓 Turno',
}

const TIPO_BADGE: Record<SearchResult['tipo'], string> = {
  telefono: 'bg-blue-500/10 text-blue-600',
  nombre: 'bg-green-500/10 text-green-600',
  turno: 'bg-purple-500/10 text-purple-600',
}

export function IncidentSearch() {
  const [q, setQ] = useState('')
  const [tipo, setTipo] = useState('')
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function buscar() {
    const query = q.trim()
    if (!query) return
    setSearching(true)
    setError(null)
    setSearched(false)
    try {
      const params = new URLSearchParams({ q: query })
      if (tipo) params.set('tipo', tipo)
      const res = await fetch(`/api/busqueda?${params.toString()}`)
      const data = await res.json()
      if (res.ok) {
        setResults(data.data.resultados || [])
      } else {
        setResults([])
        setError(data.error || 'Error al buscar')
      }
    } catch {
      setResults([])
      setError('Error de conexión')
    } finally {
      setSearching(false)
      setSearched(true)
    }
  }

  function renderRegistro(r: SearchResult) {
    if (r.tipo === 'turno') {
      return (
        <span className="font-mono text-xs truncate">
          #{r.registroId} · {r.nombre} {r.apellido} ·{' '}
          {r.fechaHora ? new Date(r.fechaHora).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
          {r.estado ? ` · ${r.estado}` : ''}
        </span>
      )
    }
    return (
      <span className="text-sm truncate">
        {r.nombre} {r.apellido}
        {r.rut ? ` · ${r.rut}` : ''}
        {r.telefono ? ` · ${r.telefono}` : ''}
        {r.email ? ` · ${r.email}` : ''}
      </span>
    )
  }

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5">
      <h2 className="text-sm font-semibold mb-1">Búsqueda global</h2>
      <p className="text-xs text-[var(--text-muted)] mb-4">
        Busca por teléfono, nombre de paciente o ID de turno en todos los tenants.
      </p>

      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && buscar()}
          placeholder="Teléfono, nombre o ID de turno"
          className="flex-1 px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-sm"
        />
        <select
          value={tipo}
          onChange={(e) => setTipo(e.target.value)}
          className="px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-sm"
        >
          <option value="">Todos</option>
          <option value="telefono">Teléfono</option>
          <option value="nombre">Nombre</option>
          <option value="turno">Turno</option>
        </select>
        <button
          onClick={buscar}
          disabled={searching || !q.trim()}
          className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {searching ? 'Buscando...' : 'Buscar'}
        </button>
      </div>

      {error && <p className="text-sm text-red-500 mt-3">❌ {error}</p>}

      {searched && !searching && !error && (
        <p className="text-xs text-[var(--text-muted)] mt-3">
          {results.length === 0 ? 'Sin resultados.' : `${results.length} resultado(s).`}
        </p>
      )}

      {results.length > 0 && (
        <ul className="mt-3 divide-y divide-[var(--border)]">
          {results.map((r, i) => (
            <li key={i} className="py-2.5 flex items-center gap-3">
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${TIPO_BADGE[r.tipo]}`}>
                {TIPO_LABEL[r.tipo]}
              </span>
              <span className="flex-1 min-w-0">{renderRegistro(r)}</span>
              <span className="text-xs text-[var(--text-muted)] shrink-0">
                {r.tenant?.nombre || 'Tenant desconocido'}
              </span>
              {r.tenant?.id && (
                <Link
                  href={`/dashboard/tenants/${r.tenant.id}`}
                  className="text-xs text-[var(--accent)] hover:underline shrink-0"
                >
                  Ver tenant →
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
