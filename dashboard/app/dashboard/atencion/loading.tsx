import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function AtencionLoading() {
  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-60 mt-1" />
        </div>
      </div>

      {/* Kanban columns skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, col) => (
          <Card key={`col-${col}`} className="h-[calc(100vh-220px)]">
            <CardHeader>
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-6 w-6 rounded-full" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {Array.from({ length: 3 }).map((_, card) => (
                <div key={`card-${col}-${card}`} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-20" />
                  <div className="flex gap-2">
                    <Skeleton className="h-7 w-16 rounded-md" />
                    <Skeleton className="h-7 w-16 rounded-md" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
