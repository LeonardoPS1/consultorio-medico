import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

export default function ConversacionesLoading() {
  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Skeleton className="h-8 w-52" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-36 rounded-lg" />
      </div>

      {/* Chat layout skeleton */}
      <div className="flex gap-4 h-[calc(100vh-280px)]">
        {/* Sidebar conversaciones */}
        <Card className="w-80 shrink-0">
          <CardContent className="p-3 space-y-2">
            <Skeleton className="h-9 w-full rounded-md" />
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={`conv-${i}`} className="flex items-center gap-3 p-2">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-40" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Chat area */}
        <Card className="flex-1">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-3 border-b pb-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <div className="flex-1 space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton
                  key={`msg-${i}`}
                  className={`h-16 w-3/4 rounded-xl ${i % 2 === 0 ? '' : 'ml-auto'}`}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
