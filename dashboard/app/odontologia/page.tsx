import type { Metadata } from 'next';
import { odontologia } from '@/lib/landing-especialidades-data';
import { LandingEspecialidad } from '@/components/landing/landing-especialidad';

export const metadata: Metadata = {
  title: { absolute: odontologia.metadata.title },
  description: odontologia.metadata.description,
};

export default function OdontologiaPage() {
  return <LandingEspecialidad slug="odontologia" />;
}
