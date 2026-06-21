'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarIcon } from 'lucide-react';
import type { MedicoPortal } from '@/lib/services/portal-booking';

interface DoctorCardProps {
  medico: MedicoPortal;
  selected: boolean;
  onSelect: (medico: MedicoPortal) => void;
}

export function DoctorCard({ medico, selected, onSelect }: DoctorCardProps) {
  return (
    <Card
      className={`cursor-pointer transition-all hoverable:hover:shadow-card-hover ${
        selected ? 'ring-2 ring-primary shadow-card-hover' : ''
      }`}
      onClick={() => onSelect(medico)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">{medico.nombre}</CardTitle>
            <p className="text-sm text-muted-foreground">{medico.especialidad}</p>
          </div>
          {medico.matricula && (
            <Badge variant="outline" className="text-xs">
              Mat. {medico.matricula}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {medico.servicios.map((s) => (
            <Badge key={s.id} variant="secondary" className="text-xs">
              {s.nombre}
              {s.precio != null ? ` · $${s.precio.toLocaleString('es-CL')}` : ''}
            </Badge>
          ))}
        </div>
        <Button
          variant={selected ? 'default' : 'outline'}
          size="sm"
          className="w-full"
          onClick={(e) => { e.stopPropagation(); onSelect(medico); }}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {selected ? 'Seleccionado' : 'Agendar turno'}
        </Button>
      </CardContent>
    </Card>
  );
}
