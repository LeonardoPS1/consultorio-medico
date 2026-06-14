import type { Metadata } from 'next';
import { oftalmologia } from '@/lib/landing-especialidades-data';
import { LandingEspecialidad } from '@/components/landing/landing-especialidad';

export const metadata: Metadata = {
  title: { absolute: oftalmologia.metadata.title },
  description: oftalmologia.metadata.description,
};

export default function OftalmologiaPage() {
  return <LandingEspecialidad slug="oftalmologia" />;
}
