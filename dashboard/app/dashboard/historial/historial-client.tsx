'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Activity,
  Shield,
  Syringe,
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
  ClipboardList,
} from 'lucide-react';
import Link from 'next/link';

interface HistorialEntry {
  id: string;
  tipo: string;
  titulo: string;
  descripcion: string | null;
  diagnosticoCodigo: string | null;
  diagnosticoDescripcion: string | null;
  fecha: string;
  pacienteId: string;
  pacienteNombre: string;
  pacienteTelefono: string;
}

interface TipoOption {
  value: string;
  label: string;
}

function getHistorialIcon(tipo: string) {
  switch (tipo) {
    case 'consulta':
      return Activity;
    case 'diagnostico':
      return Shield;
    case 'control':
      return ClipboardList;
    case 'procedimiento':
      return Syringe;
    case 'cirugia':
      return Activity;
    case 'estudio':
      return Search;
    case 'resultado':
      return FileText;
    case 'receta':
      return Pill;
    case 'internacion':
      return HeartPulse;
    case 'alergia':
      return AlertCircle;
    case 'vacuna':
      return HeartPulse;
    case 'observacion':
      return FileText;
    case 'certificado':
      return ScrollText;
    case 'nota':
      return Stethoscope;
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

export function HistorialClient({ initialData, initialTotal, tipos }: Props) {
  const router = useRouter();
  const [data, setData] = useState<HistorialEntry[]>(initialData);
  const [total, setTotal] = useState(initialTotal);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [tipo, setTipo] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const limit = 30;
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const fetchData = useCallback(async (q: string, t: string, p: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set('search', q);
      if (t) params.set('tipo', t);
      params.set('page', String(p));
      params.set('limit', String(limit));

      const res = await fetch(`/api/historial?${params}`);
      const json = await res.json();
      if (json.data) {
        setData(json.data.data);
        setTotal(json.data.total);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearchInput = useCallback(
    (value: string) => {
      setSearchInput(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setSearch(value);
        setPage(1);
        fetchData(value, tipo, 1);
      }, 300);
    },
    [tipo, fetchData],
  );

  const handleTipoChange = useCallback(
    (value: string) => {
      setTipo(value);
      setPage(1);
      fetchData(search, value, 1);
    },
    [search, fetchData],
  );

  const handlePageChange = useCallback(
    (newPage: number) => {
      setPage(newPage);
      fetchData(search, tipo, newPage);
    },
    [search, tipo, fetchData],
  );

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
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
            <select
              className="flex h-10 w-full sm:w-44 rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={tipo}
              onChange={(e) => handleTipoChange(e.target.value)}
            >
              <option value="">Todos los tipos</option>
              {tipos.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
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
              const Icon = getHistorialIcon(entry.tipo);
              return (
                <Link
                  key={entry.id}
                  href={`/dashboard/pacientes/${entry.pacienteId}`}
                  className="block"
                >
                  <Card className="transition-colors hover:bg-accent/50 cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 size-8 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Icon className="size-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">{entry.titulo}</span>
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              {getTipoLabel(entry.tipo, tipos)}
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
                          </div>
                          {entry.descripcion && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {entry.descripcion}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
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
    </div>
  );
}
