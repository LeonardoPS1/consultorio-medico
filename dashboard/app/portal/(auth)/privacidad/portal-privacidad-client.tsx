/**
 * Portal Privacidad Client
 * Registro de accesos a la ficha del paciente en lenguaje simple.
 */

'use client';

import { ShieldCheck, Eye, Download, FileText } from 'lucide-react';
import { PortalBadge } from '@/components/portal/portal-badge';
import { PortalCard } from '@/components/portal/portal-card';

interface AccesoEntry {
  id: string;
  fecha: string;
  usuario: string;
  accion: string;
  tipo: 'view' | 'export' | 'other';
  detalle: string | null;
}

interface Props {
  accesos: AccesoEntry[];
  pacienteNombre: string;
}

function formatFecha(date: string): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 *
 * @param root0
 * @param root0.accesos
 * @param root0.pacienteNombre
 */
export default function PortalPrivacidadClient({ accesos, pacienteNombre }: Props) {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-2 text-portal-fg">Privacidad y accesos</h1>
      <p className="text-sm mb-6 text-portal-muted-fg">
        {pacienteNombre}, acá podés ver quién accedió a tu ficha médica y cuándo. Tus datos están
        protegidos y solo el personal autorizado del consultorio puede consultarlos.
      </p>

      {accesos.length > 0 ? (
        <div className="space-y-3">
          {accesos.map((a) => (
            <PortalCard key={a.id} hover padding="md">
              <div className="flex items-start gap-3">
                <div
                  className={`mt-1 shrink-0 ${
                    a.tipo === 'view'
                      ? 'text-portal-primary'
                      : a.tipo === 'export'
                        ? 'text-portal-accent'
                        : 'text-portal-muted-fg'
                  }`}
                >
                  {a.tipo === 'view' ? (
                    <Eye className="h-5 w-5" />
                  ) : a.tipo === 'export' ? (
                    <Download className="h-5 w-5" />
                  ) : (
                    <FileText className="h-5 w-5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-portal-fg">{a.accion}</span>
                    <PortalBadge
                      variant={
                        a.tipo === 'view' ? 'primary' : a.tipo === 'export' ? 'accent' : 'muted'
                      }
                    >
                      {a.tipo === 'view'
                        ? 'Consulta'
                        : a.tipo === 'export'
                          ? 'Exportación'
                          : 'Trámite'}
                    </PortalBadge>
                  </div>
                  <div className="text-sm mt-1 text-portal-muted-fg">
                    {a.usuario} · {formatFecha(a.fecha)}
                  </div>
                  {a.detalle && <p className="text-sm mt-2 text-portal-muted-fg/80">{a.detalle}</p>}
                </div>
              </div>
            </PortalCard>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3 bg-portal-muted">
            <ShieldCheck className="h-6 w-6 text-portal-muted-fg/50" />
          </div>
          <p className="text-portal-muted-fg">Aún no hay accesos registrados a tu ficha</p>
          <p className="text-sm mt-1 text-portal-muted-fg/70">
            Si alguien consulta tu información, aparecerá acá.
          </p>
        </div>
      )}
    </div>
  );
}
