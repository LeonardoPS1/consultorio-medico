import { Metadata } from 'next';
import { VerificarRecetaClient } from './verificar-receta-client';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return {
    title: 'Verificar Receta Médica',
    description: 'Verificación de autenticidad de receta médica',
    robots: { index: false, follow: false },
  };
}

export const dynamic = 'force-dynamic';

async function getRecetaData(id: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://med.aicorebots.com';
    const res = await fetch(`${baseUrl}/api/verificar-receta/${id}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function VerificarRecetaPage({ params }: Props) {
  const { id } = await params;
  const data = await getRecetaData(id);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
      <VerificarRecetaClient data={data} recetaId={id} />
    </div>
  );
}
