'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: '◉' },
  { href: '/dashboard/tenants', label: 'Tenants', icon: '▦' },
  { href: '/dashboard/audit', label: 'Auditoría', icon: '⚙' },
]

export function Sidebar({
  operatorNombre,
  operatorEmail,
}: {
  operatorNombre: string
  operatorEmail: string
}) {
  const pathname = usePathname()

  return (
    <aside className="w-56 bg-[var(--bg-secondary)] border-r border-[var(--border)] flex flex-col">
      <div className="p-4 border-b border-[var(--border)]">
        <h2 className="text-lg font-bold tracking-tight">AicoreOps</h2>
        <p className="text-xs text-[var(--text-muted)]">Panel de plataforma</p>
      </div>

      <nav className="flex-1 p-2 space-y-1">
        {NAV_ITEMS.map(item => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-[var(--accent)] text-white'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-3 border-t border-[var(--border)]">
        <p className="text-xs font-medium truncate">{operatorNombre}</p>
        <p className="text-xs text-[var(--text-muted)] truncate">{operatorEmail}</p>
      </div>
    </aside>
  )
}
