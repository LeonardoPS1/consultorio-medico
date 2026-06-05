import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function ListaEsperaLoading() {
  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-44" />
          <Skeleton className="h-4 w-60 mt-1" />
        </div>
      </div>

      {/* Tabs skeleton */}
      <div className="flex gap-2">
        <Skeleton className="h-9 w-28 rounded-lg" />
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>

      {/* Lista de espera */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={`item-${i}`} className="flex items-center gap-3 p-2">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-8 w-20 rounded-md" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
