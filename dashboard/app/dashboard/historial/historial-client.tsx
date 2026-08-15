'use client';

import {
  Activity,
  Shield,
  FileText,
  AlertCircle,
  Pill,
  Stethoscope,
  HeartPulse,
  ScrollText,
  ChevronLeft,
  ChevronRight,
  Search,
  Loader2,
  User,
  Calendar,
  Hash,
  Plus,
  Download,
  StickyNote,
  Expand,
} from 'lucide-react';
import { useState, useCallback, useRef, useMemo } from 'react';
import { PacienteSearchCombobox } from '@/components/pacientes/paciente-search-combobox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Cie10Search } from '@/components/ui/cie10-search';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import type { Cie10Entry } from '@/lib/cie10-data';
import { useCanAccess } from '@/lib/features';

interface HistorialEntry {
  id: string;
  origen: 'historial' | 'soap';
  tipo: string;
  titulo: string;
  descripcion: string | null;
  diagnosticoCodigo: string | null;
  diagnosticoDescripcion: string | null;
  subjetivo: string | null;
  objetivo: string | null;
  assessment: string | null;
  plan: string | null;
  fecha: string;
  pacienteId: string;
  pacienteNombre: string;
  pacienteTelefono: string;
}

interface HistorialResponse {
  data?: HistorialEntry[];
  total?: number;
}

interface TipoOption {
  value: string;
  label: string;
}

function getHistorialIcon(tipo: string, origen: string) {
  if (origen === 'soap') return StickyNote;
  switch (tipo) {
    case 'consulta':
      return Activity;
    case 'diagnostico':
      return Shield;
    case 'receta':
      return Pill;
    case 'certificado':
      return ScrollText;
    case 'examen_fisico':
      return Stethoscope;
    case 'tratamiento':
      return HeartPulse;
    case 'urgencia':
      return AlertCircle;
    default:
      return FileText;
  }
}

function getTipoLabel(tipo: string, tipos: TipoOption[]): string {
  return tipos.find((t) => t.value === tipo)?.label ?? tipo;
}

function formatFecha(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString('es-CL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

interface Props {
  initialData: HistorialEntry[];
  initialTotal: number;
  tipos: TipoOption[];
}

/**
 *
 * @param root0
 * @param root0.initialData
 * @param root0.initialTotal
 * @param root0.tipos
 */
export function HistorialClient({ initialData, initialTotal, tipos }: Props) {
  const canExportar = useCanAccess('reportes-avanzados');
  const [data, setData] = useState<HistorialEntry[]>(initialData);
  const [total, setTotal] = useState(initialTotal);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [tipo, setTipo] = useState('');
  const [origen, setOrigen] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [pacienteId, setPacienteId] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showNuevo, setShowNuevo] = useState(false);
  const limit = 30;
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const filtros = useMemo(
    () => ({ search, tipo, origen, from, to, pacienteId }),
    [search, tipo, origen, from, to, pacienteId],
  );

  const buildParams = useCallback((f: typeof filtros, p: number) => {
    const params = new URLSearchParams();
    if (f.search) params.set('search', f.search);
    if (f.tipo) params.set('tipo', f.tipo);
    if (f.origen) params.set('origen', f.origen);
    if (f.from) params.set('from', f.from);
    if (f.to) params.set('to', f.to);
    if (f.pacienteId) params.set('pacienteId', f.pacienteId);
    params.set('page', String(p));
    params.set('limit', String(limit));
    return params;
  }, []);

  const fetchData = useCallback(
    async (f: typeof filtros, p: number) => {
      setLoading(true);
      try {
        const params = buildParams(f, p);
        const res = await fetch(`/api/historial?${params}`);
        const json = (await res.json()) as { data?: HistorialResponse } | HistorialResponse;
        const payload = (json.data ?? json) as HistorialResponse | undefined;
        if (payload && Array.isArray(payload.data)) {
          setData(payload.data);
          setTotal(payload.total ?? 0);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    },
    [buildParams],
  );

  const handleSearchInput = useCallback(
    (value: string) => {
      setSearchInput(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const nextFiltros = { ...filtros, search: value };
        setSearch(value);
        setPage(1);
        fetchData(nextFiltros, 1);
      }, 300);
    },
    [filtros, fetchData],
  );

  const handleFilterChange = useCallback(
    (patch: Partial<typeof filtros>) => {
      const next = { ...filtros, ...patch };
      setSearchInput(patch.search !== undefined ? patch.search : searchInput);
      setTipo(patch.tipo !== undefined ? patch.tipo : tipo);
      setOrigen(patch.origen !== undefined ? patch.origen : origen);
      setFrom(patch.from !== undefined ? patch.from : from);
      setTo(patch.to !== undefined ? patch.to : to);
      setPacienteId(patch.pacienteId !== undefined ? patch.pacienteId : pacienteId);
      setPage(1);
      fetchData(next, 1);
    },
    [filtros, fetchData, searchInput, tipo, origen, from, to, pacienteId],
  );

  const handlePageChange = useCallback(
    (newPage: number) => {
      setPage(newPage);
      fetchData(filtros, newPage);
    },
    [filtros, fetchData],
  );

  const resetFilters = useCallback(() => {
    const empty = { search: '', tipo: '', origen: '', from: '', to: '', pacienteId: '' };
    setSearchInput('');
    setTipo('');
    setOrigen('');
    setFrom('');
    setTo('');
    setPacienteId('');
    setPage(1);
    fetchData(empty, 1);
  }, [fetchData]);

  const hasFilters = Boolean(search || tipo || origen || from || to || pacienteId);
  const totalPages = Math.ceil(total / limit);

  const handleExportar = useCallback(
    (formato: string) => {
      const params = buildParams(filtros, 1);
      params.set('limit', '200');
      window.open(`/api/historial/exportar?formato=${formato}&${params.toString()}`, '_blank');
    },
    [filtros, buildParams],
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar por nombre del paciente..."
                value={searchInput}
                onChange={(e) => handleSearchInput(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setShowNuevo(true)}>
                <Plus className="size-4" /> Nuevo registro
              </Button>
              {canExportar && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => handleExportar('csv')}
                    title="Exportar CSV"
                  >
                    <Download className="size-4" /> CSV
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleExportar('excel')}
                    title="Exportar Excel"
                  >
                    <Download className="size-4" /> Excel
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleExportar('pdf')}
                    title="Exportar PDF"
                  >
                    <Download className="size-4" /> PDF
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={origen}
              onChange={(e) => handleFilterChange({ origen: e.target.value })}
              aria-label="Filtrar por origen"
            >
              <option value="">Todos los orígenes</option>
              <option value="historial">Historial clínico</option>
              <option value="soap">Notas SOAP</option>
            </select>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={tipo}
              onChange={(e) => handleFilterChange({ tipo: e.target.value })}
              aria-label="Filtrar por tipo"
            >
              <option value="">Todos los tipos</option>
              {tipos.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <Input
              type="date"
              value={from}
              onChange={(e) => handleFilterChange({ from: e.target.value })}
              aria-label="Desde la fecha"
            />
            <Input
              type="date"
              value={to}
              onChange={(e) => handleFilterChange({ to: e.target.value })}
              aria-label="Hasta la fecha"
            />
            <div className="flex gap-2 items-center">
              <div className="flex-1">
                <PacienteSearchCombobox
                  size="sm"
                  placeholder="Paciente..."
                  value={pacienteId}
                  onChange={(id) => handleFilterChange({ pacienteId: id })}
                />
              </div>
              <Button variant="ghost" size="sm" onClick={resetFilters} disabled={!hasFilters}>
                Limpiar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading && (
        <div className="flex justify-center py-8">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!loading && data.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <FileText className="size-12 mx-auto mb-3 opacity-40" />
            <p>No se encontraron registros clínicos</p>
            <p className="text-sm">Intentá con otros filtros de búsqueda</p>
          </CardContent>
        </Card>
      )}

      {!loading && data.length > 0 && (
        <>
          <p className="text-sm text-muted-foreground">
            {total} registro{total !== 1 ? 's' : ''} encontrado{total !== 1 ? 's' : ''}
          </p>

          <div className="space-y-2">
            {data.map((entry) => {
              const Icon = getHistorialIcon(entry.tipo, entry.origen);
              const isExpanded = expanded === entry.id;
              const isSoap = entry.origen === 'soap';
              const hasDetalle =
                Boolean(entry.descripcion) ||
                Boolean(entry.diagnosticoDescripcion) ||
                Boolean(entry.subjetivo || entry.objetivo || entry.assessment || entry.plan);
              return (
                <Card key={entry.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 size-8 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Icon className="size-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">
                            {isSoap ? 'Nota SOAP' : entry.titulo}
                          </span>
                          <Badge
                            variant={isSoap ? 'default' : 'secondary'}
                            className="text-[10px] px-1.5 py-0"
                          >
                            {isSoap ? 'Evolución' : getTipoLabel(entry.tipo, tipos)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <User className="size-3" />
                            {entry.pacienteNombre}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="size-3" />
                            {formatFecha(entry.fecha)}
                          </span>
                          {entry.diagnosticoCodigo && (
                            <span className="flex items-center gap-1">
                              <Hash className="size-3" />
                              {entry.diagnosticoCodigo}
                            </span>
                          )}
                          {hasDetalle && (
                            <button
                              type="button"
                              className="flex items-center gap-1 text-primary hover:underline"
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpanded(isExpanded ? null : entry.id);
                              }}
                              aria-expanded={isExpanded}
                            >
                              <Expand className="size-3" />
                              {isExpanded ? 'Ocultar' : 'Ver detalle'}
                            </button>
                          )}
                        </div>
                        {!isExpanded && !isSoap && entry.descripcion && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {entry.descripcion}
                          </p>
                        )}
                        {isExpanded && (
                          <div className="mt-3 space-y-2 text-xs text-muted-foreground border-t pt-3">
                            {isSoap ? (
                              <>
                                {entry.subjetivo && (
                                  <p>
                                    <strong className="text-foreground">Subjetivo:</strong>{' '}
                                    {entry.subjetivo}
                                  </p>
                                )}
                                {entry.objetivo && (
                                  <p>
                                    <strong className="text-foreground">Objetivo:</strong>{' '}
                                    {entry.objetivo}
                                  </p>
                                )}
                                {entry.assessment && (
                                  <p>
                                    <strong className="text-foreground">Assessment:</strong>{' '}
                                    {entry.assessment}
                                  </p>
                                )}
                                {entry.plan && (
                                  <p>
                                    <strong className="text-foreground">Plan:</strong> {entry.plan}
                                  </p>
                                )}
                              </>
                            ) : (
                              <>
                                {entry.descripcion && (
                                  <p>
                                    <strong className="text-foreground">Descripción:</strong>{' '}
                                    {entry.descripcion}
                                  </p>
                                )}
                                {entry.diagnosticoDescripcion && (
                                  <p>
                                    <strong className="text-foreground">Diagnóstico:</strong>{' '}
                                    {entry.diagnosticoCodigo ? `${entry.diagnosticoCodigo} — ` : ''}
                                    {entry.diagnosticoDescripcion}
                                  </p>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => handlePageChange(page - 1)}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <span className="text-sm text-muted-foreground px-2">
                Página {page} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => handlePageChange(page + 1)}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          )}
        </>
      )}

      <NuevoRegistroDialog
        key={showNuevo ? 'open' : 'closed'}
        open={showNuevo}
        onOpenChange={setShowNuevo}
        tipos={tipos}
        onSaved={() => {
          setShowNuevo(false);
          fetchData(filtros, 1);
        }}
      />
    </div>
  );
}

function NuevoRegistroDialog({
  open,
  onOpenChange,
  tipos,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tipos: TipoOption[];
  onSaved: () => void;
}) {
  const [tab, setTab] = useState<string>('clinico');
  const [pacienteId, setPacienteId] = useState('');
  const [tipo, setTipo] = useState('');
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [cie10, setCie10] = useState<Cie10Entry | null>(null);

  const [subjetivo, setSubjetivo] = useState('');
  const [objetivo, setObjetivo] = useState('');
  const [assessment, setAssessment] = useState('');
  const [plan, setPlan] = useState('');
  const [soapCie10, setSoapCie10] = useState<Cie10Entry | null>(null);

  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!pacienteId) {
      setError('Seleccioná un paciente.');
      return;
    }
    setGuardando(true);
    setError('');
    try {
      if (tab === 'soap') {
        if (!subjetivo && !objetivo && !assessment && !plan) {
          setError('Completá al menos un campo de la nota SOAP.');
          setGuardando(false);
          return;
        }
        const res = await fetch(`/api/pacientes/${pacienteId}/notas-soap`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subjetivo,
            objetivo,
            assessment,
            plan,
            cie10Codigo: soapCie10?.codigo,
            cie10Descripcion: soapCie10?.descripcion,
          }),
        });
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
          throw new Error(j.error || j.message || 'Error al guardar la nota SOAP');
        }
      } else {
        if (!titulo) {
          setError('El título es obligatorio.');
          setGuardando(false);
          return;
        }
        const res = await fetch('/api/historial', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pacienteId,
            tipo,
            titulo,
            descripcion,
            diagnosticoCodigo: cie10?.codigo,
            diagnosticoDescripcion: cie10?.descripcion,
          }),
        });
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
          throw new Error(j.error || j.message || 'Error al guardar el registro');
        }
      }
      toast({
        title: 'Registro guardado',
        description: 'El historial se actualizó correctamente.',
      });
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error inesperado');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuevo registro clínico</DialogTitle>
        </DialogHeader>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="clinico">Clínico</TabsTrigger>
            <TabsTrigger value="soap">Nota SOAP</TabsTrigger>
          </TabsList>

          <div className="my-3">
            <Label>Paciente</Label>
            <PacienteSearchCombobox
              value={pacienteId}
              onChange={(id) => setPacienteId(id)}
              placeholder="Buscar paciente..."
            />
          </div>

          <TabsContent value="clinico" className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Tipo</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                >
                  <option value="">Seleccioná un tipo...</option>
                  {tipos.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Título *</Label>
                <Input
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ej: Control de hipertensión"
                />
              </div>
            </div>
            <div>
              <Label>Descripción</Label>
              <Textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                rows={3}
              />
            </div>
            <div>
              <Label>CIE-10 (opcional)</Label>
              <Cie10Search
                value={cie10 ? `${cie10.codigo} - ${cie10.descripcion}` : ''}
                onSelect={setCie10}
              />
            </div>
          </TabsContent>

          <TabsContent value="soap" className="space-y-3">
            <div>
              <Label>Subjetivo (S)</Label>
              <Textarea value={subjetivo} onChange={(e) => setSubjetivo(e.target.value)} rows={2} />
            </div>
            <div>
              <Label>Objetivo (O)</Label>
              <Textarea value={objetivo} onChange={(e) => setObjetivo(e.target.value)} rows={2} />
            </div>
            <div>
              <Label>Assessment (A)</Label>
              <Textarea
                value={assessment}
                onChange={(e) => setAssessment(e.target.value)}
                rows={2}
              />
            </div>
            <div>
              <Label>Plan (P)</Label>
              <Textarea value={plan} onChange={(e) => setPlan(e.target.value)} rows={2} />
            </div>
            <div>
              <Label>CIE-10 (opcional)</Label>
              <Cie10Search
                value={soapCie10 ? `${soapCie10.codigo} - ${soapCie10.descripcion}` : ''}
                onSelect={setSoapCie10}
                onChange={(val) => {
                  if (!val) setSoapCie10(null);
                }}
              />
            </div>
          </TabsContent>
        </Tabs>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={guardando}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={guardando}>
            {guardando && <Loader2 className="size-4 animate-spin" />}
            Guardar registro
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
