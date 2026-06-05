import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function WebhooksLoading() {
  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-44" />
          <Skeleton className="h-4 w-56 mt-1" />
        </div>
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <Skeleton className="h-9 w-32 rounded-lg" />
        <Skeleton className="h-9 w-32 rounded-lg" />
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>

      {/* Log table */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={`log-${i}`} className="flex items-center gap-4 py-2">
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-36 flex-1" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
