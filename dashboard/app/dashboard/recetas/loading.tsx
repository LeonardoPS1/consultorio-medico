import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function RecetasLoading() {
  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-9 w-36 rounded-lg" />
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <Skeleton className="h-10 flex-1 rounded-lg" />
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>

      {/* Recetas list */}
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={`receta-${i}`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-40" />
              <div className="flex gap-2 mt-3">
                <Skeleton className="h-8 w-20 rounded-md" />
                <Skeleton className="h-8 w-20 rounded-md" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
