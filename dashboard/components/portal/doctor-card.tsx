'use client';

import { CalendarIcon } from 'lucide-react';
import { AvatarInitials } from '@/components/portal/avatar-initials';
import { PortalButton } from '@/components/portal/portal-button';
import { PortalCard } from '@/components/portal/portal-card';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { MedicoPortal } from '@/lib/services/portal-booking';

interface DoctorCardProps {
  medico: MedicoPortal;
  selected: boolean;
  onSelect: (medico: MedicoPortal) => void;
}

interface DoctorCardProps {
  medico: MedicoPortal;
  selected: boolean;
  onSelect: (medico: MedicoPortal) => void;
}

/**
 *
 * @param root0
 * @param root0.medico
 * @param root0.selected
 * @param root0.onSelect
 */
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
          <AvatarInitials
            nombre={medico.nombre.split(' ')[0]}
            apellido={medico.nombre.split(' ').slice(1).join(' ') || ''}
            className="h-12 w-12 text-sm ring-2 ring-white dark:ring-[#1C1C22] shrink-0"
          />
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base truncate text-portal-fg">
              {medico.nombre}
            </CardTitle>
            <p className="text-sm text-portal-muted-fg">
              {medico.especialidad}
            </p>
          </div>
          {medico.matricula && (
            <span className="text-xs shrink-0 rounded-full border border-portal-border text-portal-muted-fg px-2 py-0.5">
              Mat. {medico.matricula}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {medico.servicios.map((s) => (
            <span
              key={s.id}
              className="rounded-full bg-portal-primary-soft text-portal-primary text-[12px] font-semibold px-3 py-1"
            >
              {s.nombre}
              {s.precio != null ? ` · $${s.precio.toLocaleString('es-CL')}` : ''}
            </span>
          ))}
        </div>
        <PortalButton
          variant={selected ? 'primary' : 'secondary'}
          className="w-full rounded-full h-9 px-4 text-sm"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(medico);
          }}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {selected ? 'Seleccionado' : 'Agendar turno'}
        </PortalButton>
      </CardContent>
    </PortalCard>
  );
}
