'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Search, Loader2, Check, ChevronDown } from 'lucide-react';
import { formatPhone } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────

interface PacienteResult {
  id: string;
  nombre: string;
  apellido: string;
  telefono: string;
}

interface NuevaRecetaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit?: (data: {
    pacienteId: string;
    pacienteNombre: string;
    medicamento: string;
    dosis: string;
    duracion: string;
    indicaciones: string;
  }) => void;
}

// ─── Component ─────────────────────────────────────────────

export function NuevaRecetaModal({ open, onOpenChange, onSubmit }: NuevaRecetaModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<PacienteResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedPaciente, setSelectedPaciente] = useState<PacienteResult | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [medicamento, setMedicamento] = useState('');
  const [dosis, setDosis] = useState('');
  const [duracion, setDuracion] = useState('');
  const [indicaciones, setIndicaciones] = useState('');
  const [loading, setLoading] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // ─── Búsqueda debounced ──────────────────────────────────

  const searchPacientes = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/pacientes?search=${encodeURIComponent(q)}&limit=8`);
      if (res.ok) {
        const json = await res.json();
        setResults(json.data || []);
        setShowDropdown(true);
      }
    } catch {
      // silencio
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (selectedPaciente) return; // no buscar si ya hay seleccionado
    debounceRef.current = setTimeout(() => searchPacientes(searchTerm), 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchTerm, selectedPaciente, searchPacientes]);

  // ─── Cerrar dropdown al hacer click fuera ────────────────

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ─── Reset al abrir/cerrar ───────────────────────────────

  useEffect(() => {
    if (!open) {
      setSearchTerm('');
      setResults([]);
      setSelectedPaciente(null);
      setShowDropdown(false);
      setMedicamento('');
      setDosis('');
      setDuracion('');
      setIndicaciones('');
    } else {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // ─── Submit ──────────────────────────────────────────────

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPaciente || !medicamento.trim() || !dosis.trim()) return;
    setLoading(true);
    // Pequeño timeout para mostrar estado de carga
    setTimeout(() => {
      onSubmit?.({
        pacienteId: selectedPaciente.id,
        pacienteNombre: `${selectedPaciente.nombre} ${selectedPaciente.apellido}`,
        medicamento: medicamento.trim(),
        dosis: dosis.trim(),
        duracion: duracion.trim(),
        indicaciones: indicaciones.trim(),
      });
      setLoading(false);
      onOpenChange(false);
    }, 300);
  };

  // ─── Seleccionar paciente ────────────────────────────────

  const selectPaciente = (p: PacienteResult) => {
    setSelectedPaciente(p);
    setSearchTerm(`${p.nombre} ${p.apellido}`);
    setShowDropdown(false);
    setResults([]);
  };

  const clearSelection = () => {
    setSelectedPaciente(null);
    setSearchTerm('');
    setResults([]);
    inputRef.current?.focus();
  };

  // ─── Render ──────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Nueva Receta</DialogTitle>
          <DialogDescription>
            Prescribí un nuevo medicamento para un paciente
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Buscador de pacientes */}
          <div className="space-y-2" ref={searchRef}>
            <Label htmlFor="paciente-search">Paciente *</Label>
            {selectedPaciente ? (
              <div className="flex items-center justify-between gap-2 p-2 rounded-md border bg-muted/30">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">
                    {selectedPaciente.nombre} {selectedPaciente.apellido}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatPhone(selectedPaciente.telefono)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={clearSelection}
                >
                  Cambiar
                </Button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  ref={inputRef}
                  id="paciente-search"
                  placeholder="Buscá por nombre, apellido o teléfono..."
                  className="pl-8 pr-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onFocus={() => {
                    if (results.length > 0) setShowDropdown(true);
                  }}
                  autoComplete="off"
                />
                {searching && (
                  <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
                )}
                {results.length > 0 && showDropdown && (
                  <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
                    {results.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-left hover:bg-muted transition-colors first:rounded-t-md last:rounded-b-md"
                        onClick={() => selectPaciente(p)}
                      >
                        <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-xs shrink-0">
                          {p.nombre.charAt(0)}{p.apellido.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {p.nombre} {p.apellido}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatPhone(p.telefono)}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {searchTerm.trim().length >= 2 && !searching && results.length === 0 && !showDropdown === false && (
                  <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-3 text-center text-sm text-muted-foreground shadow-md">
                    No se encontraron pacientes con ese nombre
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Medicamento */}
          <div className="space-y-2">
            <Label htmlFor="medicamento">Medicamento *</Label>
            <Input
              id="medicamento"
              placeholder="Ej: Amoxicilina 500mg"
              value={medicamento}
              onChange={(e) => setMedicamento(e.target.value)}
              required
            />
          </div>

          {/* Dosis + Duración */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dosis">Dosis *</Label>
              <Input
                id="dosis"
                placeholder="Ej: 1 comprimido c/8hs"
                value={dosis}
                onChange={(e) => setDosis(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duracion">Duración</Label>
              <Input
                id="duracion"
                placeholder="Ej: 7 días"
                value={duracion}
                onChange={(e) => setDuracion(e.target.value)}
              />
            </div>
          </div>

          {/* Indicaciones */}
          <div className="space-y-2">
            <Label htmlFor="indicaciones">Indicaciones adicionales</Label>
            <Textarea
              id="indicaciones"
              placeholder="Instrucciones especiales para el paciente..."
              value={indicaciones}
              onChange={(e) => setIndicaciones(e.target.value)}
              rows={3}
            />
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || !selectedPaciente || !medicamento.trim() || !dosis.trim()}
            >
              {loading ? 'Creando...' : 'Crear Receta'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
