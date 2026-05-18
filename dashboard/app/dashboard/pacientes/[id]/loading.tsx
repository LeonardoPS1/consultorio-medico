import { Skeleton } from '@/components/ui/skeleton';

export default function PacienteDetailLoading() {
  return (
    <div className="space-y-6 p-6">
      {/* Back button skeleton */}
      <Skeleton className="h-5 w-24" />

      {/* Profile header skeleton */}
      <div className="flex items-start gap-6">
        <Skeleton className="h-20 w-20 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-36" />
          <div className="flex gap-4">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      </div>

      {/* Info cards skeleton */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border bg-card p-5 shadow-sm">
          <Skeleton className="mb-4 h-5 w-28" />
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
        <div className="rounded-lg border bg-card p-5 shadow-sm">
          <Skeleton className="mb-4 h-5 w-36" />
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </div>

      {/* History skeleton */}
      <div className="rounded-lg border bg-card p-5 shadow-sm">
        <Skeleton className="mb-4 h-5 w-32" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3">
              <Skeleton className="mt-1 h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
