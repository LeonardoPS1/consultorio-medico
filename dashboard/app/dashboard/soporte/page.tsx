import { PageHeader } from '@/components/page-header';
import { SoporteContent } from './soporte-content';

export const metadata = {
  title: 'Soporte - AiCoreMed',
  description: 'Contacto y feedback con el equipo de soporte',
};

export default function SoportePage() {
  return (
    <>
      <PageHeader
        title="Soporte"
        description="Comunicate con el equipo de soporte o envianos tu feedback"
      />
      <SoporteContent />
    </>
  );
}
