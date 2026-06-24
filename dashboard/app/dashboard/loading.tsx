import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-in">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>

      {/* Quick Actions skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={`qa-${i}`} className="h-16 rounded-xl" />
        ))}
      </div>

      {/* KPI cards skeleton (6 cards) */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6 stagger-children">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={`kpi-skeleton-${i}`} className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Turnos + Actividad skeleton (2 columnas) */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="hover-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-5 w-24" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={`turno-${i}`} className="flex items-center gap-3 p-3">
                  <Skeleton className="h-11 w-11 rounded-xl" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-32 mb-1" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="hover-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-5 w-20" />
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={`act-${i}`} className="flex items-start gap-3 p-3">
                  <Skeleton className="h-3 w-12" />
                  <Skeleton className="h-4 flex-1" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sistema Status skeleton */}
      <Card className="border-primary/10">
        <CardContent className="flex items-center justify-between p-5">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div>
              <Skeleton className="h-4 w-48 mb-1" />
              <Skeleton className="h-3 w-64" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-2 w-2 rounded-full" />
            <Skeleton className="h-4 w-12" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
