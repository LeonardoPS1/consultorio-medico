import type { Metadata } from 'next';
import { LandingEspecialidad } from '@/components/landing/landing-especialidad';
import { estetica } from '@/lib/landing-especialidades-data';

export const metadata: Metadata = {
  title: { absolute: estetica.metadata.title },
  description: estetica.metadata.description,
};

/**
 *
 */
export default function EsteticaPage() {
  return <LandingEspecialidad slug="estetica" />;
}
