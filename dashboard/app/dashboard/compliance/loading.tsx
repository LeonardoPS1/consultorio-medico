/* eslint-disable react/no-array-index-key -- skeleton placeholders estaticos, index key estable */
import { Skeleton } from '@/components/ui/skeleton';

/**
 *
 */
export default function ComplianceLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-64" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-5">
            <Skeleton className="h-4 w-24 mb-3" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-5">
            <Skeleton className="h-5 w-48 mb-4" />
            <Skeleton className="h-48 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
