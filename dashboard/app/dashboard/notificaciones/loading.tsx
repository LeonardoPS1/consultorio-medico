import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function NotificacionesLoading() {
  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64 mt-1" />
        </div>
        <Skeleton className="h-9 w-36 rounded-lg" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <Skeleton className="h-9 w-24 rounded-lg" />
        <Skeleton className="h-9 w-24 rounded-lg" />
        <Skeleton className="h-9 w-24 rounded-lg" />
      </div>

      {/* Notificaciones list */}
      <Card>
        <CardContent className="p-4 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={`notif-${i}`} className="flex items-start gap-4 py-3 border-b last:border-0">
              <Skeleton className="h-10 w-10 rounded-full shrink-0" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
