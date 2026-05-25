/**
 * Portal Dashboard Client
 */

'use client';

import { Calendar, FileText, Clock, ChevronRight, Phone } from 'lucide-react';
import Link from 'next/link';
import { formatPhone } from '@/lib/utils';

interface Props {
  paciente: {
    nombre: string;
    apellido: string;
    telefono: string;
  };
  stats: {
    totalTurnos: number;
    proximosTurnos: number;
    totalRecetas: number;
  };
  ultimoTurno: {
    fechaHora: Date;
    estado: string;
  } | null;
}

function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function PortalDashboardClient({
  paciente,
  stats,
  ultimoTurno,
}: Props) {
  return (
    <>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Hola, {paciente.nombre}
        </h1>
        <p className="text-gray-500 flex items-center gap-1">
          <Phone className="h-3 w-3" /> {formatPhone(paciente.telefono)}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <Calendar className="h-6 w-6 text-blue-600 mx-auto mb-1" />
          <div className="text-2xl font-bold text-gray-900">
            {stats.totalTurnos}
          </div>
          <div className="text-xs text-gray-500">Total</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <Clock className="h-6 w-6 text-green-600 mx-auto mb-1" />
          <div className="text-2xl font-bold text-gray-900">
            {stats.proximosTurnos}
          </div>
          <div className="text-xs text-gray-500">Próximos</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <FileText className="h-6 w-6 text-purple-600 mx-auto mb-1" />
          <div className="text-2xl font-bold text-gray-900">
            {stats.totalRecetas}
          </div>
          <div className="text-xs text-gray-500">Recetas</div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="space-y-3 mb-6">
        <Link
          href="/portal/turnos"
          className="flex items-center justify-between bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-300 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-blue-600" />
            <div>
              <div className="font-medium text-gray-900">Mis Turnos</div>
              <div className="text-sm text-gray-500">Ver y gestionar turnos</div>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-gray-400" />
        </Link>

        <Link
          href="/portal/recetas"
          className="flex items-center justify-between bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-300 transition-colors"
        >
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-purple-600" />
            <div>
              <div className="font-medium text-gray-900">Mis Recetas</div>
              <div className="text-sm text-gray-500">Ver recetas y medicación</div>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-gray-400" />
        </Link>
      </div>

      {/* Último turno */}
      {ultimoTurno && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-sm font-medium text-gray-500 mb-1">
            Último turno
          </div>
          <div className="text-gray-900 font-medium">
            {formatDate(ultimoTurno.fechaHora)}
          </div>
          <span
            className={`inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full ${
              ultimoTurno.estado === 'atendido'
                ? 'bg-green-100 text-green-700'
                : ultimoTurno.estado === 'cancelada'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-blue-100 text-blue-700'
            }`}
          >
            {ultimoTurno.estado}
          </span>
        </div>
      )}
    </>
  );
}
