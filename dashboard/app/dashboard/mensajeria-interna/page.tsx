import { redirect } from 'next/navigation';
import { getEffectiveSession } from '@/lib/auth-effective';
import { MensajeriaInternaClient } from './mensajeria-interna-client';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ contextoPacienteId?: string; contextoTurnoId?: string }>;
}

/**
 *
 * @param root0
 * @param root0.searchParams
 */
export default async function MensajeriaInternaPage({ searchParams }: PageProps) {
  const session = await getEffectiveSession();
  if (!session?.user?.id) redirect('/login');

  const params = await searchParams;
  const miUserId = session.user.id;

  return (
    <MensajeriaInternaClient
      initialConversaciones={[]}
      miUserId={miUserId}
      contextoPaciente={params.contextoPacienteId}
      contextoTurno={params.contextoTurnoId}
    />
  );
}