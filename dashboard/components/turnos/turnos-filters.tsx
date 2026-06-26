'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Filter, List, RotateCcw, Search, Users, X } from 'lucide-react';
import { getTurnoColor, getTurnoLabel } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────

type TurnoEstado =
  | 'pendiente'
  | 'confirmada'
  | 'en_atencion'
  | 'atendido'
  | 'cancelada'
  | 'en_consulta'
  | 'completada'
  | 'no_asistio';

interface TurnoData {
  id: string;
  hora: string;
  paciente: string;
  tipo: string;
  medico: string;
  medicoId: string;
  pacienteId: string;
  estado: string;
  fecha: string;
}

interface TurnosFiltersProps {
  filtroMedico: string;
  filtroEstado: string;
  filtroTipo: string;
  searchText: string;
  medicos: string[];
  tipos: string[];
  filtrosActivos: number;
  loading: boolean;
  turnos: TurnoData[];
  turnosFiltrados: TurnoData[];
  onFiltroMedicoChange: (value: string) => void;
  onFiltroEstadoChange: (value: string) => void;
  onFiltroTipoChange: (value: string) => void;
  onSearchTextChange: (value: string) => void;
  onLimpiarFiltros: () => void;
  onToggleFilters: () => void;
  showFilters: boolean;
}

const OPCIONES_ESTADO = [
  { value: '__all__', label: 'Todos los estados' },
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'confirmada', label: 'Confirmada' },
  { value: 'en_atencion', label: 'En atención' },
  { value: 'atendido', label: 'Atendido' },
  { value: 'cancelada', label: 'Cancelada' },
  { value: 'no_asistio', label: 'No asistió' },
];

export function TurnosFilters({
  filtroMedico,
  filtroEstado,
  filtroTipo,
  searchText,
  medicos,
  tipos,
  filtrosActivos,
  loading,
  turnos,
  turnosFiltrados,
  onFiltroMedicoChange,
  onFiltroEstadoChange,
  onFiltroTipoChange,
  onSearchTextChange,
  onLimpiarFiltros,
  onToggleFilters,
  showFilters,
}: TurnosFiltersProps) {
  return (
    <div className="space-y-4">
      {/* Header con acciones */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onToggleFilters}>
            <Filter className="h-4 w-4 mr-1" />
            Filtros
          </Button>
          {filtrosActivos > 0 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              {filtrosActivos} filtro{filtrosActivos !== 1 ? 's' : ''} activo
              {filtrosActivos !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>

      {/* Panel de filtros expandible */}
      {showFilters && (
        <Card className="border-primary/20 bg-muted/30">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium flex items-center gap-2">
                <Filter className="h-4 w-4 text-primary" />
                Filtros
              </p>
              {filtrosActivos > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={onLimpiarFiltros}
                >
                  <RotateCcw className="h-3 w-3" />
                  Limpiar filtros
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Búsqueda */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Buscar paciente</Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Nombre del paciente..."
                    className="pl-8 h-9 text-sm"
                    value={searchText}
                    onChange={(e) => onSearchTextChange(e.target.value)}
                  />
                  {searchText && (
                    <button
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => onSearchTextChange('')}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Médico */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Médico</Label>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant={filtroMedico === '__all__' ? 'secondary' : 'outline'}
                    size="sm"
                    className="h-9 text-xs"
                    onClick={() => onFiltroMedicoChange('__all__')}
                  >
                    <Users className="h-3.5 w-3.5 mr-1" />
                    Todos
                  </Button>
                  {medicos.map((m) => (
                    <Button
                      key={m}
                      variant={filtroMedico === m ? 'default' : 'outline'}
                      size="sm"
                      className="h-9 text-xs"
                      onClick={() => onFiltroMedicoChange(filtroMedico === m ? '__all__' : m)}
                    >
                      {m}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Estado */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Estado</Label>
                <Select
                  value={filtroEstado === '__all__' ? '__all__' : filtroEstado}
                  onValueChange={(v) => onFiltroEstadoChange(v)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Todos los estados" />
                  </SelectTrigger>
                  <SelectContent>
                    {OPCIONES_ESTADO.map((op) => (
                      <SelectItem key={op.value} value={op.value}>
                        <span className="flex items-center gap-2">
                          {op.value !== '__all__' && (
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: getTurnoColor(op.value) }}
                            />
                          )}
                          {op.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Tipo */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Tipo de consulta</Label>
                <Select
                  value={filtroTipo === '__all__' ? '__all__' : filtroTipo}
                  onValueChange={(v) => onFiltroTipoChange(v)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Todos los tipos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Todos los tipos</SelectItem>
                    {tipos.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Resumen */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1 border-t">
              <span>
                <strong className="text-foreground">
                  {loading ? '...' : turnosFiltrados.length}
                </strong>{' '}
                turnos encontrados
                {filtrosActivos > 0 && (
                  <>
                    {' '}
                    de <strong className="text-foreground">{turnos.length}</strong> totales
                  </>
                )}
              </span>
              {filtrosActivos > 0 && (
                <>
                  <span>&middot;</span>
                  {filtroMedico && filtroMedico !== '__all__' && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1">
                      <Users className="h-3 w-3" /> {filtroMedico}
                      <button onClick={() => onFiltroMedicoChange('__all__')}>
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </Badge>
                  )}
                  {filtroEstado && filtroEstado !== '__all__' && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1">
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: getTurnoColor(filtroEstado) }}
                      />
                      {getTurnoLabel(filtroEstado)}
                      <button onClick={() => onFiltroEstadoChange('__all__')}>
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </Badge>
                  )}
                  {filtroTipo && filtroTipo !== '__all__' && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1">
                      {filtroTipo}
                      <button onClick={() => onFiltroTipoChange('__all__')}>
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </Badge>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
