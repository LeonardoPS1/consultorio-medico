import type { Metadata } from 'next';
import { LandingEspecialidad } from '@/components/landing/landing-especialidad';
import { odontologia } from '@/lib/landing-especialidades-data';

export const metadata: Metadata = {
  title: { absolute: odontologia.metadata.title },
  description: odontologia.metadata.description,
};

/**
 *
 */
export default function OdontologiaPage() {
  return <LandingEspecialidad slug="odontologia" />;
}
