import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function TurnosLoading() {
  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>

      {/* Stats badges */}
      <div className="flex flex-wrap gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={`stat-${i}`} className="h-8 w-24 rounded-full" />
        ))}
      </div>

      {/* Tabla skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={`row-${i}`} className="flex items-center gap-4">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-36 flex-1" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
