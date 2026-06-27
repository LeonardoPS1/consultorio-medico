'use client';

import { useRef, useEffect } from 'react';
import { Search, User, Phone, Mail, Hash, Loader2 } from 'lucide-react';
import { useFuzzyPatients } from '@/lib/hooks/use-fuzzy-patients';
import { usePatientPanel } from '@/lib/hooks/use-patient-panel';
import { cn, getInitials } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { PatientSummaryLite } from '@/lib/types/patient-panel';

/** Scoring dot colors */
const scoringColor: Record<string, string> = {
  alto: 'bg-red-500',
  medio: 'bg-yellow-500',
  bajo: 'bg-green-500',
};

export function PatientSearch() {
  const { results, query, setQuery, isLoadingCache, totalCached } = useFuzzyPatients();
  const { selectPatient, data, close } = usePatientPanel();
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus on mount
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(t);
  }, []);

  const handleSelect = (patient: PatientSummaryLite) => {
    selectPatient(patient);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search input */}
      <div className="relative px-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Buscar paciente${totalCached > 0 ? ` (${totalCached})` : ''}...`}
          className="w-full h-10 pl-9 pr-3 rounded-lg border border-border/60 bg-muted/40 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
          aria-label="Buscar paciente"
        />
        {isLoadingCache && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Results */}
      <ScrollArea className="flex-1 mt-1 -mx-1 px-1">
        {results.length === 0 && !isLoadingCache && query.trim() ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No se encontraron pacientes
          </div>
        ) : (
          <div className="space-y-0.5 py-1">
            {results.map((p) => {
              const isActive = data?.patient.id === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => handleSelect(p)}
                  className={cn(
                    'w-full flex items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-accent/70',
                    isActive && 'bg-accent',
                  )}
                >
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {getInitials(p.nombre, p.apellido)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate leading-tight">
                      {p.nombre} {p.apellido}
                    </p>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5 leading-tight">
                      {p.telefono && (
                        <span className="flex items-center gap-0.5 truncate">
                          <Phone className="h-2.5 w-2.5" />
                          {p.telefono}
                        </span>
                      )}
                      {p.dni && (
                        <span className="flex items-center gap-0.5 truncate">
                          <Hash className="h-2.5 w-2.5" />
                          {p.dni}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Stats pills */}
                  <div className="flex items-center gap-1 shrink-0">
                    {p.totalTurnos > 0 && (
                      <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        {p.totalTurnos}T
                      </span>
                    )}
                    {p.totalRecetas > 0 && (
                      <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        {p.totalRecetas}R
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
