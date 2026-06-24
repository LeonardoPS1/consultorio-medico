'use client';

import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Calendar,
  User,
  Stethoscope,
  FileText,
  Clock,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface CertificadoData {
  valido: boolean;
  certificado: {
    id: string;
    paciente: string;
    medico: string;
    diagnostico: string;
    cie10Codigo: string | null;
    reposoDesde: string | null;
    reposoHasta: string | null;
    reposoDias: number | null;
    indicaciones: string | null;
    emitido: string;
  };
}

interface Props {
  data: CertificadoData | null;
  certId: string;
}

export function VerificarCertificadoClient({ data, certId }: Props) {
  if (!data) {
    return (
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-red-200 dark:border-red-900 p-8 text-center">
          <ShieldAlert className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-red-600 mb-2">Certificado no encontrado</h1>
          <p className="text-sm text-muted-foreground">
            No se encontró un certificado con el ID proporcionado.
          </p>
          <p className="text-xs text-muted-foreground mt-4 font-mono">{certId}</p>
        </div>
      </div>
    );
  }

  const { valido, certificado } = data;

  return (
    <div className="w-full max-w-lg">
      <div
        className={`rounded-2xl shadow-lg border p-8 ${
          valido
            ? 'bg-white dark:bg-slate-900 border-emerald-200 dark:border-emerald-900'
            : 'bg-white dark:bg-slate-900 border-amber-200 dark:border-amber-900'
        }`}
      >
        {/* Header */}
        <div className="text-center mb-6">
          {valido ? (
            <ShieldCheck className="h-16 w-16 text-emerald-500 mx-auto mb-3" />
          ) : (
            <ShieldAlert className="h-16 w-16 text-amber-500 mx-auto mb-3" />
          )}
          <h1 className="text-xl font-bold mb-1">
            {valido ? 'Certificado Verificado' : 'Certificado no válido'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {valido
              ? 'El certificado es auténtico y no ha sido alterado.'
              : 'El hash de verificación no coincide. El documento pudo haber sido alterado.'}
          </p>
        </div>

        {/* Data */}
        <div className="space-y-3 mt-6">
          <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
            <User className="h-5 w-5 text-primary shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Paciente</p>
              <p className="font-medium">{certificado.paciente}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
            <Stethoscope className="h-5 w-5 text-primary shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Médico</p>
              <p className="font-medium">{certificado.medico}</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
            <FileText className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Diagnóstico</p>
              <p className="font-medium">{certificado.diagnostico}</p>
              {certificado.cie10Codigo && (
                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                  CIE-10: {certificado.cie10Codigo}
                </p>
              )}
            </div>
          </div>

          {certificado.reposoDesde && (
            <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
              <Calendar className="h-5 w-5 text-primary shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Reposo médico</p>
                <p className="font-medium">
                  {certificado.reposoDesde} → {certificado.reposoHasta}
                  {certificado.reposoDias && ` (${certificado.reposoDias} días)`}
                </p>
              </div>
            </div>
          )}

          {certificado.indicaciones && (
            <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
              <Shield className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Indicaciones</p>
                <p className="text-sm whitespace-pre-wrap">{certificado.indicaciones}</p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
            <Clock className="h-5 w-5 text-primary shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Emitido</p>
              <p className="font-medium">
                {formatDate(certificado.emitido, "d 'de' MMMM 'de' yyyy, HH:mm")}
              </p>
            </div>
          </div>
        </div>

        {/* Badge */}
        <div className="mt-6 pt-4 border-t text-center">
          <div
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
              valido
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
            }`}
          >
            <Shield className="h-4 w-4" />
            {valido ? 'Documento auténtico' : 'Documento alterado'}
          </div>
        </div>
      </div>
    </div>
  );
}
