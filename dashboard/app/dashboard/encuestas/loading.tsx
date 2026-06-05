import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function EncuestasLoading() {
  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-52 mt-1" />
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={`stat-${i}`}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-12" />
              <Skeleton className="h-3 w-20 mt-1" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Encuestas list */}
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={`enc-${i}`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-32" />
              <div className="flex gap-1 mt-2">
                {Array.from({ length: 5 }).map((_, star) => (
                  <Skeleton key={`star-${i}-${star}`} className="h-4 w-4" />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
