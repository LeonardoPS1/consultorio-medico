'use client';

import { Search } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { buscarCie10Fuzzy, type Cie10Entry } from '@/lib/cie10-data';

interface Props {
  value: string;
  onSelect: (entry: Cie10Entry) => void;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
}

/**
 * Buscador de códigos CIE-10 con autocompletado.
 * @param {Props} root0 - Props del componente.
 * @param {string} root0.value - Valor inicial de la búsqueda.
 * @param {(entry: Cie10Entry) => void} root0.onSelect - Callback al seleccionar una entrada.
 * @param {(value: string) => void} root0.onChange - Callback al cambiar el valor de búsqueda.
 * @param {string} root0.placeholder - Texto de ejemplo del campo de búsqueda.
 * @param {string} root0.className - Clases CSS adicionales.
 * @returns {React.JSX.Element} Campo de búsqueda con lista de resultados.
 */
export function Cie10Search({
  value,
  onSelect,
  onChange,
  placeholder = 'Buscar código CIE-10...',
  className,
}: Props): React.JSX.Element {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<Cie10Entry[]>([]);
  const [open, setOpen] = useState(false);
  const [highlightedIdx, setHighlightedIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza el estado con el prop value
    setQuery(value);
  }, [value]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.length < 1) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resetea resultados al vaciar la búsqueda
      setResults([]);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(() => {
      const r = buscarCie10Fuzzy(query);
      setResults(r);
      setOpen(r.length > 0);
      setHighlightedIdx(-1);
    }, 200);

    return (): void => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent): void => {
      if (
        listRef.current &&
        !listRef.current.contains(e.target as Node) &&
        !inputRef.current?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return (): void => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIdx((prev) => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIdx((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === 'Enter' && highlightedIdx >= 0) {
      e.preventDefault();
      handleSelect(results[highlightedIdx]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const handleSelect = (entry: Cie10Entry): void => {
    setQuery(`${entry.codigo} — ${entry.descripcion}`);
    setOpen(false);
    onSelect(entry);
  };

  return (
    <div className={`relative ${className || ''}`}>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          className="h-8 text-xs pl-8 font-mono"
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            onChange?.(e.target.value);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setOpen(true)}
        />
      </div>

      {open && results.length > 0 && (
        <div
          ref={listRef}
          className="absolute z-50 mt-1 w-full bg-popover border rounded-md shadow-lg max-h-[280px] overflow-y-auto"
        >
          {results.map((entry, idx) => (
            <button
              key={entry.codigo}
              className={`w-full text-left px-3 py-2 text-xs flex items-center gap-3 hover:bg-accent transition-colors ${
                idx === highlightedIdx ? 'bg-accent' : ''
              }`}
              onClick={() => handleSelect(entry)}
              onMouseEnter={() => setHighlightedIdx(idx)}
            >
              <span className="font-mono font-bold text-primary shrink-0 w-14">{entry.codigo}</span>
              <span className="flex-1 truncate">{entry.descripcion}</span>
              <span className="text-[10px] text-muted-foreground shrink-0">{entry.categoria}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
