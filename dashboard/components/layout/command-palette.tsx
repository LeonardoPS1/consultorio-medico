'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { canAccess, type FeatureId } from '@/lib/features';
import { useFeatureFlags } from '@/lib/feature-flags-context';
import {
  ALL_COMMAND_ITEMS,
  GROUP_LABELS,
  GROUP_ORDER,
  type CommandItem,
} from '@/lib/command-palette-data';
import { useCommandSearch, type SearchResult } from '@/lib/hooks/use-command-search';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem as CmdItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Skeleton } from '@/components/ui/skeleton';
import { isMac } from '@/lib/utils';

// ============================================================
// Command Palette Component
// ============================================================

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const router = useRouter();
  const { data: session } = useSession();
  const { isFeatureEnabled } = useFeatureFlags();
  const { results: searchResults, isLoading: searchLoading, search } = useCommandSearch();

  const userPlan = session?.user?.plan as string | undefined;
  const isAdmin = session?.user?.role === 'admin';

  // ─── Keyboard shortcut: Cmd+K / Ctrl+K ───────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K o Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    // Custom event from header button click
    const handleOpenPalette = () => {
      setOpen(true);
    };

    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('open-command-palette', handleOpenPalette);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('open-command-palette', handleOpenPalette);
    };
  }, []);

  // ─── Debounced search ──────────────────────────────────────
  useEffect(() => {
    search(query);
  }, [query, search]);

  // ─── Filter items by feature gating + role ──────────────
  const filteredItems = useMemo(() => {
    return ALL_COMMAND_ITEMS.filter((item) => {
      // Admin-only items
      if (item.adminOnly && !isAdmin) return false;
      // Feature gating
      if (item.feature) {
        const hasPlan = canAccess(userPlan, item.feature as FeatureId);
        const isEnabled = isFeatureEnabled(item.feature);
        if (!hasPlan || !isEnabled) return false;
      }
      return true;
    });
  }, [userPlan, isAdmin, isFeatureEnabled]);

  // ─── Group static items ────────────────────────────────────
  const groupedItems = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {};
    for (const item of filteredItems) {
      const g = item.group;
      if (!groups[g]) groups[g] = [];
      groups[g].push(item);
    }
    return groups;
  }, [filteredItems]);

  // ─── Navigate on select ───────────────────────────────────
  const runCommand = useCallback(
    (command: { href: string }) => {
      // Cerrar paleta
      setOpen(false);
      setQuery('');
      // Navegar
      if (command.href.startsWith('/api/')) {
        // Para exportaciones, abrir en nueva pestaña
        window.open(command.href, '_blank');
      } else {
        router.push(command.href);
      }
    },
    [router],
  );

  const handleSelectSearchResult = useCallback(
    (result: SearchResult) => {
      setOpen(false);
      setQuery('');
      router.push(result.href);
    },
    [router],
  );

  // ─── Determine if we should show entity search results ────
  const showSearchResults = query.length >= 2 && (searchResults.length > 0 || searchLoading);

  return (
    <CommandDialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQuery(''); }}>
      <CommandInput
        placeholder="Buscar pacientes, turnos, páginas..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>
          {searchLoading ? (
            <div className="space-y-2 px-2 py-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-4/5" />
            </div>
          ) : (
            'No se encontraron resultados.'
          )}
        </CommandEmpty>

        {/* ── Acciones rápidas ──────────────────────────────── */}
        {groupedItems.acciones && groupedItems.acciones.length > 0 && (
          <CommandGroup heading={GROUP_LABELS.acciones}>
            {groupedItems.acciones.map((item) => (
              <CmdItem
                key={item.id}
                value={`${item.label} ${item.keywords ?? ''}`}
                onSelect={() => runCommand(item)}
              >
                <item.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>{item.label}</span>
                <span className="ml-auto text-[10px] text-muted-foreground font-mono">
                  {isMac() ? '⌘' : 'Ctrl'}K
                </span>
              </CmdItem>
            ))}
          </CommandGroup>
        )}

        {/* ── Navegación ────────────────────────────────────── */}
        {groupedItems.navegacion && groupedItems.navegacion.length > 0 && (
          <CommandGroup heading={GROUP_LABELS.navegacion}>
            {groupedItems.navegacion.map((item) => (
              <CmdItem
                key={item.id}
                value={`${item.label} ${item.keywords ?? ''}`}
                onSelect={() => runCommand(item)}
              >
                <item.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>{item.label}</span>
              </CmdItem>
            ))}
          </CommandGroup>
        )}

        {/* ── Administración ────────────────────────────────── */}
        {groupedItems.admin && groupedItems.admin.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading={GROUP_LABELS.admin}>
              {groupedItems.admin.map((item) => (
                <CmdItem
                  key={item.id}
                  value={`${item.label} ${item.keywords ?? ''}`}
                  onSelect={() => runCommand(item)}
                >
                  <item.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>{item.label}</span>
                  <span className="ml-auto text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded font-medium">
                    Admin
                  </span>
                </CmdItem>
              ))}
            </CommandGroup>
          </>
        )}

        {/* ── Resultados de búsqueda (entidades) ────────────── */}
        {showSearchResults && (
          <>
            <CommandSeparator />
            <CommandGroup heading={GROUP_LABELS.entidad}>
              {searchLoading ? (
                <div className="space-y-2 px-2 py-2">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-4/5" />
                </div>
              ) : (
                searchResults.map((result) => (
                  <CmdItem
                    key={result.id}
                    value={`${result.label} ${result.sublabel ?? ''}`}
                    onSelect={() => handleSelectSearchResult(result)}
                  >
                    <span className="mr-2 text-base leading-none">{result.icon}</span>
                    <span className="flex-1 truncate">{result.label}</span>
                    {result.sublabel && (
                      <span className="text-xs text-muted-foreground truncate max-w-[140px]">
                        {result.sublabel}
                      </span>
                    )}
                    <span className="ml-2 text-[10px] text-muted-foreground/60 uppercase">
                      {result.type}
                    </span>
                  </CmdItem>
                ))
              )}
            </CommandGroup>
          </>
        )}
      </CommandList>

      {/* ─── Footer con atajos ──────────────────────────────── */}
      <div className="flex items-center justify-between border-t px-4 py-2 text-[11px] text-muted-foreground">
        <span>
          <kbd className="rounded border bg-muted px-1 py-0.5 font-mono text-[10px]">↑↓</kbd>{' '}
          navegar{' '}
          <kbd className="rounded border bg-muted px-1 py-0.5 font-mono text-[10px]">↵</kbd>{' '}
          seleccionar{' '}
          <kbd className="rounded border bg-muted px-1 py-0.5 font-mono text-[10px]">esc</kbd>{' '}
          cerrar
        </span>
        <span>
          {isMac() ? '⌘' : 'Ctrl'}K
        </span>
      </div>
    </CommandDialog>
  );
}
