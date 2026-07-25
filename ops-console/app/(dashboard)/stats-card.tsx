export function StatsCard({
  title,
  value,
  subtitle,
}: {
  title: string
  value: string
  subtitle: string
}) {
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5">
      <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-medium">
        {title}
      </p>
      <p className="text-3xl font-bold mt-1">{value}</p>
      <p className="text-xs text-[var(--text-secondary)] mt-1">{subtitle}</p>
    </div>
  )
}
