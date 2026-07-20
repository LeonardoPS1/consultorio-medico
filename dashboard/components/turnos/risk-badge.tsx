'use client';

import { Badge } from '@/components/ui/badge';

export function RiskBadge({ riskNivel, riskScore }: { riskNivel: 'bajo' | 'medio' | 'alto' | null | undefined; riskScore?: number | null }) {
  if (!riskNivel) {
    return (
      <Badge variant="outline" className="text-xs h-5 px-2">
        Sin score
      </Badge>
    );
  }

  const config = {
    alto: { variant: 'destructive' as const, label: '🔴 Alto', color: 'destructive' },
    medio: { variant: 'secondary' as const, label: '🟡 Medio', color: 'secondary' },
    bajo: { variant: 'default' as const, label: '🟢 Bajo', color: 'default' },
  }[riskNivel] as { variant: 'destructive' | 'secondary' | 'default'; label: string; color: string };

  return (
    <Badge
      variant={config.variant}
      className="text-xs h-5 px-2 gap-1"
    >
      {config.label}
      {riskScore !== undefined && riskScore !== null && (
        <span className="opacity-70">({riskScore})</span>
      )}
    </Badge>
  );
}