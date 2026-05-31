import { Metadata } from 'next';
import { VerificarCertificadoClient } from './verificar-certificado-client';

interface Props {
  params: { id: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return {
    title: 'Verificar Certificado Médico',
    description: 'Verificación de autenticidad de certificado médico',
    robots: { index: false, follow: false },
  };
}

export const dynamic = 'force-dynamic';

async function getCertificadoData(id: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://med.aicorebots.com';
    const res = await fetch(`${baseUrl}/api/verificar-certificado/${id}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function VerificarCertificadoPage({ params }: Props) {
  const data = await getCertificadoData(params.id);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
      <VerificarCertificadoClient data={data} certId={params.id} />
    </div>
  );
}
