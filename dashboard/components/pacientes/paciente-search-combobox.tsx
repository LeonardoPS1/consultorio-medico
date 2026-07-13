/**
 * PacienteSearchCombobox
 *
 * Componente reutilizable de búsqueda de pacientes con autocomplete.
 * Busca contra GET /api/pacientes?search=... con debounce de 250ms.
 * Soporta búsqueda por nombre, apellido, teléfono, RUT y DNI.
 *
 * Props:
 *   - value: string (pacienteId seleccionado)
 *   - onChange: (pacienteId: string, pacienteNombre: string) => void
 *   - placeholder: texto del placeholder (default: "Buscar paciente...")
 *   - label: etiqueta opcional arriba del input
 *   - error: mensaje de error opcional
 *   - disabled: deshabilitar el input
 *   - size: 'default' | 'sm' para inputs más chicos
 *   - autoFocus: auto-focus al montar
 *   - onLoadingChange: callback opcional cuando cambia estado loading
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Search, User } from 'lucide-react';

// ─── Types ────────────────────────────────────────────

interface PacienteResult {
  id: string;
  nombre: string;
  apellido: string;
  telefono: string | null;
  rut: string | null;
}

export interface PacienteSearchComboboxProps {
  value?: string;
  onChange: (pacienteId: string, pacienteNombre: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  size?: 'default' | 'sm';
  autoFocus?: boolean;
  onLoadingChange?: (loading: boolean) => void;
}

export function PacienteSearchCombobox({
  value,
  onChange,
  placeholder = 'Buscar paciente...',
  label,
  error,
  disabled = false,
  size = 'default',
  autoFocus = false,
  onLoadingChange,
}: PacienteSearchComboboxProps) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<PacienteResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedName, setSelectedName] = useState('');
  const [highlightedIdx, setHighlightedIdx] = useState(-1);

  const searchRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const isSelectedRef = useRef(false);

  // Cleanup al cambiar value externamente
  useEffect(() => {
    if (!value) {
      setSelectedName('');
      isSelectedRef.current = false;
    }
  }, [value]);

  // ─── Debounced search ──────────────────────────────
  useEffect(() => {
    if (isSelectedRef.current) return;
    if (search.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }

    if (searchRef.current) clearTimeout(searchRef.current);

    searchRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/pacientes?search=${encodeURIComponent(search.trim())}&limit=8`,
        );
        if (!res.ok) throw new Error('Error en búsqueda');
        const json = await res.json();
        const list: PacienteResult[] = json.data || [];
        setResults(list);
        setOpen(list.length > 0);
        setHighlightedIdx(-1);
      } catch {
        setResults([]);
        setOpen(false);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => {
      if (searchRef.current) clearTimeout(searchRef.current);
    };
  }, [search]);

  // Sincronizar loading hacia afuera
  useEffect(() => {
    onLoadingChange?.(loading);
  }, [loading, onLoadingChange]);

  // ─── Click outside ─────────────────────────────────
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (
        listRef.current &&
        !listRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  // ─── Select ────────────────────────────────────────
  const select = (p: PacienteResult) => {
    const fullName = `${p.nombre} ${p.apellido}`;
    setSelectedName(fullName);
    setSearch(fullName);
    setOpen(false);
    setResults([]);
    isSelectedRef.current = true;
    onChange(p.id, fullName);
  };

  // ─── Keyboard navigation ───────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || results.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIdx((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIdx((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && highlightedIdx >= 0) {
      e.preventDefault();
      select(results[highlightedIdx]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearch(val);
    if (isSelectedRef.current) {
      isSelectedRef.current = false;
      // Si el usuario cambia el texto después de seleccionar, reseteamos
      onChange('', '');
    }
  };

  const inputHeight = size === 'sm' ? 'h-8 text-xs' : 'h-10 text-sm';

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground z-10 pointer-events-none">
          {loading ? (
            <Loader2 className={`animate-spin ${size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'}`} />
          ) : (
            <Search className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
          )}
        </div>

        <Input
          ref={inputRef}
          value={search}
          onChange={handleInputChange}
          onFocus={() => {
            if (results.length > 0) setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={selectedName ? '' : placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          className={`pl-9 ${inputHeight} ${error ? 'border-red-500' : ''}`}
        />

        {/* Results dropdown */}
        {open && results.length > 0 && (
          <div
            ref={listRef}
            className="absolute z-50 w-full mt-1 bg-popover text-popover-foreground border rounded-lg shadow-lg overflow-hidden"
          >
            {results.map((p, idx) => (
              <button
                key={p.id}
                type="button"
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                  idx === highlightedIdx ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
                }`}
                onClick={() => select(p)}
                onMouseEnter={() => setHighlightedIdx(idx)}
              >
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {p.nombre} {p.apellido}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {p.telefono && <span>{p.telefono}</span>}
                    {p.rut && <span className="ml-2">{p.rut}</span>}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
