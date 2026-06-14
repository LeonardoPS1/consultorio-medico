'use client';

import { useState, useRef, useEffect } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/select';
import { Loader2, Search, Plus, User, Video, Phone, MapPin } from 'lucide-react';

interface MedicoOption {
  id: string;
  nombre: string;
}

interface PacienteSuggestion {
  id: string;
  nombre: string;
  apellido: string;
  telefono: string | null;
}

interface NuevoTurnoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    pacienteId?: string;
    paciente: string;
    tipo: string;
    tipoConsulta: string;
    medicoId: string;
    medico: string;
    hora: string;
    fecha: string;
  }) => void;
  pacienteId?: string;
  pacienteName?: string;
}

export function NuevoTurnoModal({ open, onOpenChange, onSubmit, pacienteId: propPacienteId, pacienteName }: NuevoTurnoModalProps) {
  const [paciente, setPaciente] = useState(pacienteName || '');
  const [tipo, setTipo] = useState('Consulta');
  const [tipoConsulta, setTipoConsulta] = useState('presencial');
  const [medicoId, setMedicoId] = useState('');
  const [medicoNombre, setMedicoNombre] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [hora, setHora] = useState('09:00');
  const [loading, setLoading] = useState(false);
  const [medicos, setMedicos] = useState<MedicoOption[]>([]);
  const [loadingMedicos, setLoadingMedicos] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // ─── Autocomplete paciente ──────────────────────────────
  const [pacienteSearch, setPacienteSearch] = useState(pacienteName || '');
  const [pacienteSuggestions, setPacienteSuggestions] = useState<PacienteSuggestion[]>([]);
  const [pacienteSearchOpen, setPacienteSearchOpen] = useState(false);
  const [pacienteSearchLoading, setPacienteSearchLoading] = useState(false);
  const [selectedPaciente, setSelectedPaciente] = useState<PacienteSuggestion | null>(null);
  const [highlightedIdx, setHighlightedIdx] = useState(-1);
  const [pacienteSearchError, setPacienteSearchError] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Reset form when opening
  useEffect(() => {
    if (open) {
      if (pacienteName) {
        setPacienteSearch(pacienteName);
        setSelectedPaciente(null); // will be set from prop below
      } else {
        setPacienteSearch('');
        setSelectedPaciente(null);
      }
      setPacienteSuggestions([]);
      setPacienteSearchOpen(false);
      setPacienteSearchError(false);
      setHighlightedIdx(-1);
    }
  }, [open, pacienteName]);

  // Debounced search
  useEffect(() => {
    if (!open || pacienteName) return; // no search when pacienteName is already set
    if (selectedPaciente) return; // already selected

    if (pacienteSearch.trim().length < 2) {
      setPacienteSuggestions([]);
      setPacienteSearchOpen(false);
      return;
    }

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    searchTimeoutRef.current = setTimeout(async () => {
      setPacienteSearchLoading(true);
      setPacienteSearchError(false);
      try {
        const res = await fetch(`/api/pacientes?search=${encodeURIComponent(pacienteSearch.trim())}&limit=8`);
        if (!res.ok) throw new Error('Error en búsqueda');
        const json = await res.json();
        const list: PacienteSuggestion[] = json.data || [];
        setPacienteSuggestions(list);
        setPacienteSearchOpen(list.length > 0);
        setHighlightedIdx(-1);
      } catch {
        setPacienteSearchError(true);
        setPacienteSuggestions([]);
        setPacienteSearchOpen(false);
      } finally {
        setPacienteSearchLoading(false);
      }
    }, 250);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [pacienteSearch, open, pacienteName, selectedPaciente]);

  // Click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (listRef.current && !listRef.current.contains(e.target as Node) &&
          inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setPacienteSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectPaciente = (p: PacienteSuggestion) => {
    setSelectedPaciente(p);
    setPacienteSearch(`${p.nombre} ${p.apellido}`);
    setPacienteSearchOpen(false);
    setPacienteSuggestions([]);
  };

  const handlePacienteKeyDown = (e: React.KeyboardEvent) => {
    if (!pacienteSearchOpen || pacienteSuggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIdx((prev) => Math.min(prev + 1, pacienteSuggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIdx((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && highlightedIdx >= 0) {
      e.preventDefault();
      selectPaciente(pacienteSuggestions[highlightedIdx]);
    } else if (e.key === 'Escape') {
      setPacienteSearchOpen(false);
    }
  };

  // ─── Cargar médicos ─────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoadingMedicos(true);
    fetch('/api/medicos')
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        const lista: MedicoOption[] = json.data || [];
        setMedicos(lista);
        if (lista.length > 0) {
          setMedicoId(lista[0].id);
          setMedicoNombre(lista[0].nombre);
        }
      })
      .catch(() => {
        if (!cancelled) setMedicos([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingMedicos(false);
      });
    return () => { cancelled = true; };
  }, [open]);

  // Reset form on close
  useEffect(() => {
    if (!open) {
      setLoading(false);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    }
  }, [open]);

  const handleMedicoChange = (value: string) => {
    setMedicoId(value);
    const found = medicos.find((m) => m.id === value);
    setMedicoNombre(found?.nombre || value);
  };

  const handleClearPaciente = () => {
    setSelectedPaciente(null);
    setPacienteSearch('');
    setPacienteSuggestions([]);
    setPacienteSearchOpen(false);
    setHighlightedIdx(-1);
    inputRef.current?.focus();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    timeoutRef.current = setTimeout(() => {
      onSubmit({
        pacienteId: propPacienteId || selectedPaciente?.id,
        paciente: pacienteSearch,
        tipo,
        tipoConsulta,
        medicoId,
        medico: medicoNombre,
        hora,
        fecha,
      });
      setLoading(false);
      onOpenChange(false);
      // Reset
      if (!propPacienteId) {
        setSelectedPaciente(null);
        setPacienteSearch('');
      }
      setTipo('Consulta');
      setTipoConsulta('presencial');
      setHora('09:00');
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Nuevo Turno</DialogTitle>
          <DialogDescription>
            Agendá un nuevo turno para un paciente
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="paciente">Paciente</Label>
            {propPacienteId && pacienteName ? (
              <div className="flex h-10 w-full items-center rounded-md border border-input bg-muted/50 px-3 py-2 text-sm font-medium">
                {pacienteName}
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  ref={inputRef}
                  id="paciente"
                  placeholder="Buscá un paciente por nombre o teléfono..."
                  value={pacienteSearch}
                  onChange={(e) => {
                    setPacienteSearch(e.target.value);
                    if (selectedPaciente) setSelectedPaciente(null);
                  }}
                  onKeyDown={handlePacienteKeyDown}
                  onFocus={() => {
                    if (pacienteSuggestions.length > 0) setPacienteSearchOpen(true);
                  }}
                  className="pl-9 pr-8"
                  required
                  autoFocus
                />
                {pacienteSearchLoading && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
                {selectedPaciente && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                    onClick={handleClearPaciente}
                  >
                    ✕
                  </Button>
                )}

                {/* Dropdown sugerencias */}
                {pacienteSearchOpen && pacienteSuggestions.length > 0 && (
                  <div
                    ref={listRef}
                    className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg max-h-56 overflow-y-auto"
                  >
                    {pacienteSuggestions.map((p, idx) => (
                      <button
                        key={p.id}
                        type="button"
                        className={`flex w-full items-center gap-3 px-3 py-2.5 text-sm text-left transition-colors hover:bg-accent ${
                          highlightedIdx === idx ? 'bg-accent' : ''
                        }`}
                        onClick={() => selectPaciente(p)}
                        onMouseEnter={() => setHighlightedIdx(idx)}
                      >
                        <User className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <span className="font-medium">{p.nombre} {p.apellido}</span>
                          {p.telefono && (
                            <span className="ml-2 text-xs text-muted-foreground">{p.telefono}</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Sin resultados */}
                {pacienteSearch.trim().length >= 2 && !pacienteSearchLoading &&
                 !pacienteSearchOpen && pacienteSuggestions.length === 0 && (
                  <div className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                    <Plus className="h-3 w-3" />
                    <span>No se encontró el paciente. Completá los datos y se creará automáticamente al guardar.</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Motivo</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Consulta">Consulta</SelectItem>
                  <SelectItem value="Control">Control</SelectItem>
                  <SelectItem value="Resultados">Resultados</SelectItem>
                  <SelectItem value="Especialista">Especialista</SelectItem>
                  <SelectItem value="Primera vez">Primera vez</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Modalidad</Label>
              <Select value={tipoConsulta} onValueChange={setTipoConsulta}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="presencial">
                    <span className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5" /> Presencial
                    </span>
                  </SelectItem>
                  <SelectItem value="virtual">
                    <span className="flex items-center gap-2">
                      <Video className="h-3.5 w-3.5" /> Virtual
                    </span>
                  </SelectItem>
                  <SelectItem value="telefonica">
                    <span className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5" /> Telefónica
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Médico</Label>
              {loadingMedicos ? (
                <div className="flex h-10 w-full items-center gap-2 rounded-md border border-input bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Cargando médicos...
                </div>
              ) : medicos.length === 0 ? (
                <div className="flex h-10 w-full items-center rounded-md border border-dashed border-destructive/50 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                  No hay médicos registrados
                </div>
              ) : (
                <Select value={medicoId} onValueChange={handleMedicoChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {medicos.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fecha">Fecha</Label>
              <Input
                id="fecha"
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hora">Hora</Label>
              <Input
                id="hora"
                type="time"
                value={hora}
                onChange={(e) => setHora(e.target.value)}
                required
              />
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !pacienteSearch.trim() || loadingMedicos || medicos.length === 0}>
              {loading ? 'Creando...' : 'Crear Turno'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
