'use client';

import { Shield, ShieldCheck, ShieldAlert, FileText, Calendar, Clock, User, Pill, Syringe, QrCode } from 'lucide-react';

interface RecetaData {
  id: string;
  paciente: string;
  medicamento: string;
  presentacion: string | null;
  dosis: string;
  frecuencia: string;
  duracion: string;
  cantidadTotal: string | null;
  indicaciones: string | null;
  fechaInicio: string;
  fechaFin: string | null;
  estado: string;
  medico: string;
  vencida: boolean;
  createdAt: string;
}

interface VerificationData {
  valida: boolean;
  regenerarHash: string | null;
  error?: string;
  codigo?: string;
  receta?: RecetaData;
}

interface Props {
  data: VerificationData | null;
  recetaId: string;
}

export function VerificarRecetaClient({ data, recetaId }: Props) {
  if (!data) {
    return (
      <div className="w-full max-w-md mx-auto">
        <CardError recetaId={recetaId} />
      </div>
    );
  }

  if (data.error === 'NOT_FOUND' || !data.receta) {
    return (
      <div className="w-full max-w-md mx-auto">
        <CardNoEncontrada recetaId={recetaId} />
      </div>
    );
  }

  const receta = data.receta;

  return (
    <div className="w-full max-w-lg mx-auto space-y-4">
      {/* Header con escudo de verificación */}
      <div className={`rounded-2xl p-6 text-center ${
        data.valida && !receta.vencida
          ? 'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800'
          : receta.vencida
            ? 'bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800'
            : 'bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800'
      }`}>
        <div className="flex justify-center mb-3">
          {data.valida && !receta.vencida ? (
            <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
              <ShieldCheck className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
            </div>
          ) : receta.vencida ? (
            <div className="h-16 w-16 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
              <Clock className="h-10 w-10 text-amber-600 dark:text-amber-400" />
            </div>
          ) : (
            <div className="h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
              <ShieldAlert className="h-10 w-10 text-red-600 dark:text-red-400" />
            </div>
          )}
        </div>
        <h1 className={`text-xl font-bold ${
          data.valida && !receta.vencida
            ? 'text-emerald-700 dark:text-emerald-300'
            : receta.vencida
              ? 'text-amber-700 dark:text-amber-300'
              : 'text-red-700 dark:text-red-300'
        }`}>
          {data.valida && !receta.vencida
            ? '✅ Receta Válida'
            : receta.vencida
              ? '⏰ Receta Vencida'
              : '⚠️ Documento No Verificado'}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {data.valida && !receta.vencida
            ? 'Esta receta fue emitida por el profesional y es auténtica'
            : receta.vencida
              ? 'Esta receta ha superado su fecha de vencimiento'
              : 'El código de verificación no coincide con nuestros registros'}
        </p>
      </div>

      {/* Información de la receta */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Paciente */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
              <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Paciente</p>
              <p className="font-semibold text-lg">{receta.paciente}</p>
            </div>
          </div>
        </div>

        {/* Medicamento */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center shrink-0">
              <Pill className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="space-y-3 flex-1">
              <div>
                <p className="text-xs text-muted-foreground">Medicamento</p>
                <p className="font-semibold text-lg">{receta.medicamento}</p>
                {receta.presentacion && (
                  <p className="text-sm text-muted-foreground">{receta.presentacion}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Dosis</p>
                  <p className="font-medium">{receta.dosis}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Duración</p>
                  <p className="font-medium">{receta.duracion}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Frecuencia</p>
                  <p className="font-medium">{receta.frecuencia}</p>
                </div>
                {receta.cantidadTotal && (
                  <div>
                    <p className="text-xs text-muted-foreground">Cantidad</p>
                    <p className="font-medium">{receta.cantidadTotal}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Indicaciones */}
        {receta.indicaciones && (
          <div className="p-5 border-b border-slate-100 dark:border-slate-800">
            <div className="flex gap-3">
              <Syringe className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Indicaciones</p>
                <p className="text-sm italic">{receta.indicaciones}</p>
              </div>
            </div>
          </div>
        )}

        {/* Fechas */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            <div className="grid grid-cols-2 gap-4 flex-1">
              <div>
                <p className="text-xs text-muted-foreground">Emisión</p>
                <p className="font-medium">{formatearFecha(receta.fechaInicio)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Válida hasta</p>
                <p className={`font-medium ${receta.vencida ? 'text-red-600 dark:text-red-400' : ''}`}>
                  {receta.fechaFin ? formatearFecha(receta.fechaFin) : '—'}
                  {receta.vencida && ' (vencida)'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Médico */}
        <div className="p-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <Shield className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Prescripto por</p>
              <p className="font-medium">{receta.medico}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <QrCode className="h-3 w-3" />
          <span>Código de verificación: {receta.id.substring(0, 8)}...</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Este documento fue verificado electrónicamente el {new Date().toLocaleDateString('es-AR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>
    </div>
  );
}

function CardError({ recetaId }: { recetaId: string }) {
  return (
    <div className="text-center space-y-4">
      <div className="h-20 w-20 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center mx-auto">
        <ShieldAlert className="h-12 w-12 text-red-600 dark:text-red-400" />
      </div>
      <h1 className="text-xl font-bold">Error de verificación</h1>
      <p className="text-muted-foreground">
        No se pudo conectar con el servidor de verificación.
        <br />
        Intentá de nuevo más tarde.
      </p>
      <p className="text-xs text-muted-foreground">
        ID: {recetaId.substring(0, 8)}...
      </p>
    </div>
  );
}

function CardNoEncontrada({ recetaId }: { recetaId: string }) {
  return (
    <div className="text-center space-y-4">
      <div className="h-20 w-20 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center mx-auto">
        <ShieldAlert className="h-12 w-12 text-red-600 dark:text-red-400" />
      </div>
      <h1 className="text-xl font-bold">Receta no encontrada</h1>
      <p className="text-muted-foreground">
        Esta receta no existe en nuestros registros.
        <br />
        Podría haber sido eliminada o el código QR es inválido.
      </p>
      <p className="text-xs text-muted-foreground">
        ID: {recetaId.substring(0, 8)}...
      </p>
    </div>
  );
}

function formatearFecha(fecha: string): string {
  try {
    return new Date(fecha + 'T00:00:00').toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return fecha;
  }
}
