import type { Metadata } from 'next';
import { estetica } from '@/lib/landing-especialidades-data';
import { LandingEspecialidad } from '@/components/landing/landing-especialidad';

export const metadata: Metadata = {
  title: { absolute: estetica.metadata.title },
  description: estetica.metadata.description,
};

export default function EsteticaPage() {
  return <LandingEspecialidad slug="estetica" />;
}
