'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function Header({ operatorNombre }: { operatorNombre: string }) {
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/login')
    } catch {
      router.push('/login')
    }
  }

  return (
    <header className="h-14 border-b border-[var(--border)] bg-[var(--bg-secondary)] flex items-center px-6 gap-4 shrink-0">
      <div className="flex-1" />
      <span className="text-sm text-[var(--text-secondary)]">
        {operatorNombre}
      </span>
      <button
        onClick={handleLogout}
        disabled={loggingOut}
        className="text-xs text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors disabled:opacity-50"
      >
        {loggingOut ? '...' : 'Salir'}
      </button>
    </header>
  )
}
