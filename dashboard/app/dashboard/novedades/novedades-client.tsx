'use client';

import { useState, useMemo } from 'react';
import type { ChangelogEntry } from '@/lib/changelog-data';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/page-header';
import { Search, PackageOpen, ArrowUp, Bug, Shield, RefreshCw, Code } from 'lucide-react';

interface NovedadesClientProps {
  changelog: (ChangelogEntry & { tipo: string })[];
}

const TIPO_ICONS: Record<string, React.ReactNode> = {
  feature: <ArrowUp className="size-3" />,
  fix: <Bug className="size-3" />,
  security: <Shield className="size-3" />,
  refactor: <Code className="size-3" />,
  improvement: <RefreshCw className="size-3" />,
};

const TIPO_BADGE: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
  feature: { variant: 'default', label: 'Feature' },
  fix: { variant: 'destructive', label: 'Fix' },
  security: { variant: 'destructive', label: 'Seguridad' },
  refactor: { variant: 'secondary', label: 'Refactor' },
  improvement: { variant: 'outline', label: 'Mejora' },
};

export function NovedadesClient({ changelog }: NovedadesClientProps) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search) return changelog;
    const q = search.toLowerCase();
    return changelog.filter((entry) =>
      entry.version.toLowerCase().includes(q) ||
      entry.title.toLowerCase().includes(q) ||
      entry.items.some((item) => item.toLowerCase().includes(q)) ||
      entry.tipo.toLowerCase().includes(q)
    );
  }, [changelog, search]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="Novedades"
        description={`Historial completo de versiones y cambios de ${process.env.NEXT_PUBLIC_APP_NAME || 'AiCoreMed'}`}
        icon={<PackageOpen className="size-6" />}
      />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Buscar en novedades..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="relative">
        <div className="absolute left-[19px] top-2 bottom-2 w-px bg-gradient-to-b from-primary/40 via-border to-border" />

        <div className="space-y-8">
          {filtered.map((entry, i) => {
            const tipoBadge = TIPO_BADGE[entry.tipo] ?? { variant: 'outline' as const, label: entry.tipo };
            const tipoIcon = TIPO_ICONS[entry.tipo];

            return (
              <div
                key={entry.version}
                className="relative pl-12 group"
              >
                <div className="absolute left-2.5 top-1.5 size-[15px] rounded-full border-2 border-primary bg-background flex items-center justify-center group-hover:scale-110 transition-transform">
                  <div className="size-[7px] rounded-full bg-primary" />
                </div>

                <div className="border rounded-lg p-4 sm:p-5 bg-card hover:shadow-md transition-all duration-200 hover:border-primary/20">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="space-y-1">
                      <h2 className="text-lg font-semibold flex items-center gap-2 flex-wrap">
                        v{entry.version}
                        {i === 0 && (
                          <Badge variant="default" className="text-[10px] px-1.5 py-0 h-5">
                            Actual
                          </Badge>
                        )}
                        <Badge variant={tipoBadge.variant} className="text-[10px] px-1.5 py-0 h-5 gap-1">
                          {tipoIcon}
                          {tipoBadge.label}
                        </Badge>
                      </h2>
                      <p className="text-sm font-medium text-foreground/80">
                        {entry.title}
                      </p>
                    </div>
                    <time className="text-xs text-muted-foreground whitespace-nowrap shrink-0 pt-1 tabular-nums">
                      {entry.date}
                    </time>
                  </div>

                  <ul className="space-y-1.5">
                    {entry.items.map((item, idx) => (
                      <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-primary/60 mt-1.5 shrink-0">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No se encontraron resultados para &quot;{search}&quot;
        </div>
      )}
    </div>
  );
}
