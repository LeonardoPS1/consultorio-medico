import type { Metadata } from 'next';
import { LandingEspecialidad } from '@/components/landing/landing-especialidad';
import { clinicasMedicas } from '@/lib/landing-especialidades-data';

export const metadata: Metadata = {
  title: { absolute: clinicasMedicas.metadata.title },
  description: clinicasMedicas.metadata.description,
};

/**
 *
 */
export default function ClinicasMedicasPage() {
  return <LandingEspecialidad slug="clinicas-medicas" />;
}
