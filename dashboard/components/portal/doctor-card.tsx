'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarIcon } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { MedicoPortal } from '@/lib/services/portal-booking';

interface DoctorCardProps {
  medico: MedicoPortal;
  selected: boolean;
  onSelect: (medico: MedicoPortal) => void;
}

const AVATAR_COLORS = [
  'bg-blue-500',
  'bg-emerald-500',
  'bg-violet-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-cyan-500',
  'bg-pink-500',
  'bg-indigo-500',
];

function getInitials(nombre: string): string {
  return nombre
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function getAvatarColor(nombre: string): string {
  let hash = 0;
  for (let i = 0; i < nombre.length; i++) {
    hash = nombre.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function DoctorCard({ medico, selected, onSelect }: DoctorCardProps) {
  return (
    <Card
      className={`cursor-pointer transition-all duration-200 hoverable:hover:-translate-y-0.5 hoverable:hover:shadow-card-hover active:scale-[0.98] ${
        selected ? 'ring-2 ring-primary shadow-card-hover' : ''
      }`}
      onClick={() => onSelect(medico)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start gap-3">
          <Avatar className="h-12 w-12 shrink-0">
            <AvatarImage src={medico.fotoUrl || undefined} alt={medico.nombre} />
            <AvatarFallback
              className={`${getAvatarColor(medico.nombre)} text-white text-sm font-semibold`}
            >
              {getInitials(medico.nombre)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base truncate">{medico.nombre}</CardTitle>
            <p className="text-sm text-muted-foreground">{medico.especialidad}</p>
          </div>
          {medico.matricula && (
            <Badge variant="outline" className="text-xs shrink-0">
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
          onClick={(e) => {
            e.stopPropagation();
            onSelect(medico);
          }}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {selected ? 'Seleccionado' : 'Agendar turno'}
        </Button>
      </CardContent>
    </Card>
  );
}
