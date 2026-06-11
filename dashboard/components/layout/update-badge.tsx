'use client';

import { useState, useCallback } from 'react';
import { RefreshCw, X, ExternalLink } from 'lucide-react';
import { useUpdate } from '@/lib/update-context';
import { CHANGELOG } from '@/lib/changelog-data';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

/**
 * Badge de actualización + Modal de novedades.
 * Se muestra en el header cuando hay una nueva versión disponible.
 */
export function UpdateBadge() {
  const { updateReady, handleUpdate, changelogOpen, setChangelogOpen, appVersion, hasUnseenChangelog, markChangelogSeen } = useUpdate();
  const [showTooltip, setShowTooltip] = useState(false);

  const handleOpenChangelog = useCallback(() => {
    markChangelogSeen();
    setChangelogOpen(true);
  }, [markChangelogSeen, setChangelogOpen]);

  if (!updateReady) {
    // Mostrar botón Novedades con dot si hay sin leer
    return (
      <>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 relative"
          title="Novedades"
          onClick={handleOpenChangelog}
        >
          <ExternalLink className="h-4 w-4" />
          {hasUnseenChangelog && (
            <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3 items-center justify-center">
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
          )}
        </Button>
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

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 relative"
        title="Nueva versión disponible"
        onClick={handleOpenChangelog}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <RefreshCw className="h-4 w-4 text-primary animate-pulse-soft" />
        <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3 items-center justify-center">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/40" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
        </span>
      </Button>

      {/* Tooltip flotante */}
      {showTooltip && (
        <div className="absolute top-full mt-1 right-0 z-50 bg-popover border rounded-lg shadow-lg p-3 max-w-[220px] text-xs animate-in fade-in slide-in-from-top-1">
          <p className="font-medium text-foreground mb-1">Nueva versión disponible</p>
          <p className="text-muted-foreground mb-2">Mirá las novedades y actualizá cuando quieras.</p>
          <button
            onClick={(e) => { e.stopPropagation(); handleUpdate(); }}
            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-lg hover:bg-primary/90 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Actualizar ahora
          </button>
        </div>
      )}

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

// ============================================================
// Modal de Novedades (Changelog)
// ============================================================

function ChangelogModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { handleUpdate, updateReady, appVersion } = useUpdate();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Novedades
            <Badge variant="outline" className="text-[10px] font-mono ml-1">
              v{appVersion}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Últimas actualizaciones y mejoras del sistema
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[55vh] pr-4">
          <div className="space-y-6">
            {CHANGELOG.map((entry) => (
              <div key={entry.version} className="relative pl-6 border-l-2 border-border">
                {/* Versión y fecha */}
                <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full border-2 border-border bg-background">
                  <div className="h-2 w-2 rounded-full bg-primary mt-[3px] ml-[3px]" />
                </div>

                <div className="mb-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold">
                      {entry.title}
                    </h3>
                    {entry.version === CHANGELOG[0].version && (
                      <Badge className="text-[9px] h-4 px-1.5">Última</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    v{entry.version} · {entry.date}
                  </p>
                </div>

                <ul className="space-y-1.5">
                  {entry.items.map((item, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                      <span className="text-primary mt-0.5 shrink-0">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Footer con acción de actualizar */}
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
              <Button size="sm" onClick={() => { handleUpdate(); onOpenChange(false); }}>
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
