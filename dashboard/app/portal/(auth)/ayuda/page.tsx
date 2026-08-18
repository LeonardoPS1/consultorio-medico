/**
 * Portal Ayuda — Centro de ayuda del paciente
 * Documentación completa de todas las funcionalidades del portal
 */

import { Metadata } from 'next';
import PortalAyudaClient from './portal-ayuda-client';

export const metadata: Metadata = {
  title: 'Centro de ayuda | Portal del Paciente',
  description: 'Guía completa de todas las funcionalidades del portal del paciente',
};

/**
 *
 */
export default async function PortalAyudaPage() {
  return <PortalAyudaClient />;
}
