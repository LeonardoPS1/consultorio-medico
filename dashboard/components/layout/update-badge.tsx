'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Newspaper, RefreshCw, ArrowUp, Bug, Shield, Code } from 'lucide-react';
import { useUpdate } from '@/lib/update-context';
import { CHANGELOG, type ChangelogEntry } from '@/lib/changelog-data';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

type NovedadApi = {
  id: string;
  version: string;
  titulo: string;
  items: string[];
  fecha: string;
  tipo: string;
};

const EMPTY_ENTRY: ChangelogEntry & { tipo: string } = {
  version: '—',
  date: '',
  title: 'No hay novedades registradas',
  items: [],
  tipo: 'feature',
};

const TIPO_BADGE: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
  feature: { variant: 'default', label: 'Feature' },
  fix: { variant: 'destructive', label: 'Fix' },
  security: { variant: 'destructive', label: 'Seguridad' },
  refactor: { variant: 'secondary', label: 'Refactor' },
  improvement: { variant: 'outline', label: 'Mejora' },
};

const TIPO_ICONS: Record<string, React.ReactNode> = {
  feature: <ArrowUp className="size-3" />,
  fix: <Bug className="size-3" />,
  security: <Shield className="size-3" />,
  refactor: <Code className="size-3" />,
  improvement: <RefreshCw className="size-3" />,
};

function apiToChangelog(n: NovedadApi): ChangelogEntry & { tipo: string } {
  const d = new Date(n.fecha);
  const dia = String(d.getDate()).padStart(2, '0');
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const anio = d.getFullYear();
  return {
    version: n.version,
    date: `${dia}/${mes}/${anio}`,
    title: n.titulo,
    items: n.items,
    tipo: n.tipo,
  };
}

export function UpdateBadge() {
  const {
    updateReady,
    handleUpdate,
    changelogOpen,
    setChangelogOpen,
    appVersion,
    hasUnseenChangelog,
    markChangelogSeen,
  } = useUpdate();

  const handleOpenChangelog = useCallback(() => {
    markChangelogSeen();
    setChangelogOpen(true);
  }, [markChangelogSeen, setChangelogOpen]);

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 relative"
            aria-label="Ver novedades"
            title="Novedades"
            onClick={handleOpenChangelog}
          >
            <Newspaper className="h-4 w-4" />
            {hasUnseenChangelog && (
              <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3 items-center justify-center">
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="end" className="p-3 max-w-[220px]">
          <p className="font-medium text-foreground mb-1">Novedades del sistema</p>
          <p className="text-muted-foreground text-xs">
            {hasUnseenChangelog
              ? 'Hay novedades sin leer'
              : 'Todo al día — no hay novedades nuevas'}
          </p>
          {updateReady && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleUpdate();
              }}
              className="w-full mt-2 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-lg hover:bg-primary/90 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              Actualizar ahora
            </button>
          )}
        </TooltipContent>
      </Tooltip>

      <ChangelogModal
        open={changelogOpen}
        onOpenChange={(open) => {
          if (open) markChangelogSeen();
          setChangelogOpen(open);
        }}
      />
    </>
  );
}

function ChangelogModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { handleUpdate, updateReady, appVersion } = useUpdate();
  const [entries, setEntries] = useState<(ChangelogEntry & { tipo: string })[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!open) {
      fetchedRef.current = false;
      return;
    }
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    let cancelled = false;
    setLoading(true);
    setError(false);

    fetch('/api/novedades')
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (cancelled) return;
        const data: NovedadApi[] = json?.data;
        if (data && data.length > 0) {
          setEntries(data.map(apiToChangelog));
        } else {
          setEntries([]);
        }
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  const displayEntries =
    entries.length > 0
      ? entries
      : !loading && !error
        ? [EMPTY_ENTRY]
        : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[620px] max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Newspaper className="h-4 w-4 text-primary" />
            Novedades
            {loading && (
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            )}
            <Badge variant="outline" className="text-[10px] font-mono ml-auto">
              v{appVersion}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Últimas actualizaciones y mejoras del sistema
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          {loading && entries.length === 0 && (
            <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent mr-2" />
              Cargando novedades...
            </div>
          )}

          {error && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No se pudieron cargar las novedades.
            </div>
          )}

          {!loading && !error && (
            <div className="space-y-5">
              {displayEntries.map((entry) => {
                const tipo = TIPO_BADGE[entry.tipo] ?? { variant: 'outline' as const, label: entry.tipo };
                const tipoIcon = TIPO_ICONS[entry.tipo];

                return (
                  <div key={entry.version} className="relative pl-6 border-l-2 border-border">
                    <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full border-2 border-border bg-background">
                      <div className="h-2 w-2 rounded-full bg-primary mt-[3px] ml-[3px]" />
                    </div>

                    <div className="mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold">{entry.title}</h3>
                        {displayEntries.length > 0 && entry.version === displayEntries[0].version && (
                          <Badge variant="default" className="text-[9px] h-4 px-1.5">
                            Última
                          </Badge>
                        )}
                        <Badge variant={tipo.variant} className="text-[9px] h-4 px-1.5 gap-1">
                          {tipoIcon}
                          {tipo.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        v{entry.version} · {entry.date}
                      </p>
                    </div>

                    {entry.items.length > 0 && (
                      <ul className="space-y-1">
                        {entry.items.map((item, i) => (
                          <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                            <span className="text-primary mt-0.5 shrink-0">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <div className="flex items-center justify-between border-t pt-4 mt-2">
          <p className="text-xs text-muted-foreground">
            {updateReady
              ? 'Hay una nueva versión lista para instalar.'
              : 'Estás usando la última versión.'}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
            {updateReady && (
              <Button
                size="sm"
                onClick={() => {
                  handleUpdate();
                  onOpenChange(false);
                }}
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Actualizar
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
