import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function OnboardingLoading() {
  return (
    <div className="space-y-6 animate-in">
      <div>
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-4 w-72 mt-1" />
      </div>

      {/* Stepper skeleton */}
      <div className="flex gap-4 mb-8">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={`step-${i}`} className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>

      {/* Step content skeleton */}
      <Card className="max-w-2xl">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 mt-1" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
          <div className="flex gap-3 pt-4">
            <Skeleton className="h-9 w-28 rounded-lg" />
            <Skeleton className="h-9 w-28 rounded-lg" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
