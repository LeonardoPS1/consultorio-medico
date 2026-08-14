/* eslint-disable react/no-array-index-key -- skeleton placeholders estaticos, index key estable */
import { Skeleton } from '@/components/ui/skeleton';

/**
 *
 */
export default function IntegracionesLoading() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <Skeleton className="h-9 w-48" />
      <Skeleton className="h-5 w-96" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-40 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
