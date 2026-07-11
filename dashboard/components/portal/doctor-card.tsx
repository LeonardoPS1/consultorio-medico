'use client';

import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PortalCard } from '@/components/portal/portal-card';
import { CalendarIcon } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { MedicoPortal } from '@/lib/services/portal-booking';

interface DoctorCardProps {
  medico: MedicoPortal;
  selected: boolean;
  onSelect: (medico: MedicoPortal) => void;
}

const AVATAR_COLORS = [
  'hsl(168 76% 42%)',
  'hsl(168 60% 50%)',
  'hsl(168 50% 38%)',
  'hsl(168 70% 45%)',
  'hsl(168 55% 48%)',
  'hsl(168 65% 40%)',
  'hsl(168 45% 52%)',
  'hsl(168 75% 44%)',
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
    <PortalCard
      hover
      padding="none"
      onClick={() => onSelect(medico)}
      className="cursor-pointer"
      style={selected ? {
        borderColor: 'hsl(var(--portal-primary) / 0.3)',
        boxShadow: 'var(--portal-shadow-md), 0 0 0 1px hsl(var(--portal-primary) / 0.15)',
      } : undefined}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start gap-3">
          <Avatar className="h-12 w-12 shrink-0">
            <AvatarImage src={medico.fotoUrl || undefined} alt={medico.nombre} />
            <AvatarFallback
              className="text-white text-sm font-semibold"
              style={{ background: getAvatarColor(medico.nombre) }}
            >
              {getInitials(medico.nombre)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base truncate text-portal-fg">
              {medico.nombre}
            </CardTitle>
            <p className="text-sm text-portal-muted-fg">
              {medico.especialidad}
            </p>
          </div>
          {medico.matricula && (
            <Badge
              variant="outline"
              className="text-xs shrink-0 border-portal-border text-portal-muted-fg"
            >
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
    </PortalCard>
  );
}
