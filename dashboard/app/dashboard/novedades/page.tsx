/**
 * Novedades — Historial completo de versiones
 *
 * Server Component: importa el changelog y lo pasa al cliente.
 */

export const dynamic = 'force-dynamic';

import { CHANGELOG } from '@/lib/changelog-data';
import { NovedadesClient } from './novedades-client';

export default async function NovedadesPage() {
  return <NovedadesClient changelog={CHANGELOG} />;
}
