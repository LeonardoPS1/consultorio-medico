import type { Metadata } from 'next';
import { clinicasMedicas } from '@/lib/landing-especialidades-data';
import { LandingEspecialidad } from '@/components/landing/landing-especialidad';

export const metadata: Metadata = {
  title: { absolute: clinicasMedicas.metadata.title },
  description: clinicasMedicas.metadata.description,
};

export default function ClinicasMedicasPage() {
  return <LandingEspecialidad slug="clinicas-medicas" />;
}
