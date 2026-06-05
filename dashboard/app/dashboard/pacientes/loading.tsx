import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function PacientesLoading() {
  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Skeleton className="h-8 w-44" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-36 rounded-lg" />
      </div>

      {/* Search + filters */}
      <div className="flex gap-3">
        <Skeleton className="h-10 flex-1 rounded-lg" />
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>

      {/* Tabla pacientes */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={`row-${i}`} className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-56" />
                </div>
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-8 w-8 rounded-md" />
                <Skeleton className="h-8 w-8 rounded-md" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
