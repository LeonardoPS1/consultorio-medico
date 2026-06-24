'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { buscarCie10, type Cie10Entry } from '@/lib/cie10-data';

interface Props {
  value: string;
  onSelect: (entry: Cie10Entry) => void;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function Cie10Search({
  value,
  onSelect,
  onChange,
  placeholder = 'Buscar código CIE-10...',
  className,
}: Props) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<Cie10Entry[]>([]);
  const [open, setOpen] = useState(false);
  const [highlightedIdx, setHighlightedIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    if (query.length >= 1) {
      const r = buscarCie10(query);
      setResults(r);
      setOpen(r.length > 0);
      setHighlightedIdx(-1);
    } else {
      setResults([]);
      setOpen(false);
    }
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        listRef.current &&
        !listRef.current.contains(e.target as Node) &&
        !inputRef.current?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
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

  const handleSelect = (entry: Cie10Entry) => {
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
