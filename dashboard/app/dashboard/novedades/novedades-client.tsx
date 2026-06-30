'use client';

/**
 * NovedadesClient — Página de novedades con historial de versiones.
 *
 * Muestra el changelog completo en orden cronológico inverso con
 * timeline visual, versión, fecha y lista de cambios.
 */

import { useState } from 'react';
import type { ChangelogEntry } from '@/lib/changelog-data';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/page-header';
import { Search, PackageOpen } from 'lucide-react';

interface NovedadesClientProps {
  changelog: ChangelogEntry[];
}

export function NovedadesClient({ changelog }: NovedadesClientProps) {
  const [search, setSearch] = useState('');

  const filtered = changelog.filter((entry) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      entry.version.toLowerCase().includes(q) ||
      entry.title.toLowerCase().includes(q) ||
      entry.items.some((item) => item.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="Novedades"
        description={`Historial completo de versiones y cambios de ${process.env.NEXT_PUBLIC_APP_NAME || 'AiCoreMed'}`}
        icon={<PackageOpen className="size-6" />}
      />

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Buscar en novedades..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Línea vertical del timeline */}
        <div className="absolute left-[19px] top-2 bottom-2 w-px bg-border" />

        <div className="space-y-8">
          {filtered.map((entry, i) => (
            <div key={entry.version} className="relative pl-12">
              {/* Bullet del timeline */}
              <div className="absolute left-2.5 top-1.5 size-[15px] rounded-full border-2 border-primary bg-background flex items-center justify-center">
                <div className="size-[7px] rounded-full bg-primary" />
              </div>

              {/* Card de versión */}
              <div className="border rounded-lg p-4 sm:p-5 bg-card hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      v{entry.version}
                      {i === 0 && (
                        <Badge variant="default" className="text-[10px] px-1.5 py-0 h-5">
                          Actual
                        </Badge>
                      )}
                    </h2>
                    <p className="text-sm font-medium text-foreground/80 mt-0.5">
                      {entry.title}
                    </p>
                  </div>
                  <time className="text-xs text-muted-foreground whitespace-nowrap shrink-0 pt-1">
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
          ))}
        </div>
      </div>

      {/* Footer */}
      {filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No se encontraron resultados para &quot;{search}&quot;
        </div>
      )}
    </div>
  );
}
