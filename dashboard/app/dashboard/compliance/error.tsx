'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function ComplianceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md">
        <CardContent className="pt-6 text-center space-y-4">
          <p className="text-destructive font-medium">Error al cargar Compliance</p>
          <p className="text-sm text-muted-foreground">
            {error.message || 'Ocurrió un error inesperado.'}
          </p>
          <Button onClick={reset} variant="outline">
            Reintentar
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
