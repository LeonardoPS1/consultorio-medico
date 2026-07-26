'use client'

export function Header({ operatorNombre }: { operatorNombre: string }) {
  return (
    <header className="h-14 border-b border-[var(--border)] bg-[var(--bg-secondary)] flex items-center px-6 gap-4 shrink-0">
      <div className="flex-1" />
      <span className="text-sm text-[var(--text-secondary)]">
        {operatorNombre}
      </span>
    </header>
  )
}
