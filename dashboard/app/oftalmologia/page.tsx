import type { Metadata } from 'next';
import { LandingEspecialidad } from '@/components/landing/landing-especialidad';
import { oftalmologia } from '@/lib/landing-especialidades-data';

export const metadata: Metadata = {
  title: { absolute: oftalmologia.metadata.title },
  description: oftalmologia.metadata.description,
};

/**
 *
 */
export default function OftalmologiaPage() {
  return <LandingEspecialidad slug="oftalmologia" />;
}
