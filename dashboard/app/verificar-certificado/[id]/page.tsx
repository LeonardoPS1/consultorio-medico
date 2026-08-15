import { Metadata } from 'next';
import { VerificarCertificadoClient } from './verificar-certificado-client';

interface Props {
  params: Promise<{ id: string }>;
}

/**
 *
 * @param root0
 * @param root0.params
 */
export async function generateMetadata({ params: _params }: Props): Promise<Metadata> {
  return {
    title: 'Verificar Certificado Médico',
    description: 'Verificación de autenticidad de certificado médico',
    robots: { index: false, follow: false },
  };
}

export const dynamic = 'force-dynamic';

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

async function getCertificadoData(id: string): Promise<CertificadoData | null> {
  try {
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXT_PUBLIC_BASE_URL ||
      'https://med.aicorebots.com';
    const res = await fetch(`${baseUrl}/api/verificar-certificado/${id}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return res.json() as Promise<CertificadoData>;
  } catch {
    return null;
  }
}

/**
 *
 * @param root0
 * @param root0.params
 */
export default async function VerificarCertificadoPage({ params }: Props) {
  const { id } = await params;
  const data = await getCertificadoData(id);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
      <VerificarCertificadoClient data={data} certId={id} />
    </div>
  );
}
