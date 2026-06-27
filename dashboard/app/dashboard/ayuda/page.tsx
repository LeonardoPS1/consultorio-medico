/**
 * Ayuda — Centro de ayuda
 *
 * Server Component: importa contenido estático y lo pasa al cliente.
 */

import { SECCIONES_AYUDA } from '@/lib/ayuda-content';
import { AyudaClient } from './ayuda-client';
import type { AyudaSeccion } from '@/lib/ayuda-content';

const ICON_MAP: Record<string, string> = {
  Rocket: 'Rocket',
  Calendar: 'Calendar',
  Users: 'Users',
  Activity: 'Activity',
  Syringe: 'Syringe',
  MessageSquare: 'MessageSquare',
  BarChart3: 'BarChart3',
  Star: 'Star',
  Settings: 'Settings',
  CreditCard: 'CreditCard',
  ExternalLink: 'ExternalLink',
};

export default async function AyudaPage() {
  const secciones: AyudaSeccion[] = SECCIONES_AYUDA;

  return <AyudaClient sections={secciones} iconMap={ICON_MAP} />;
}
