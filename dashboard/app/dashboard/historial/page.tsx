import { PageHeader } from '@/components/page-header';
import { listarHistorial } from '@/lib/services/historial';
import { HistorialClient } from './historial-client';

export const dynamic = 'force-dynamic';

const TIPOS = [
  { value: 'consulta', label: 'Consulta' },
  { value: 'urgencia', label: 'Urgencia' },
  { value: 'receta', label: 'Receta' },
  { value: 'certificado', label: 'Certificado' },
  { value: 'orden_estudio', label: 'Orden de estudio' },
  { value: 'derivacion', label: 'Derivación' },
  { value: 'evolucion', label: 'Evolución' },
  { value: 'anamnesis', label: 'Anamnesis' },
  { value: 'examen_fisico', label: 'Examen físico' },
  { value: 'diagnostico', label: 'Diagnóstico' },
  { value: 'tratamiento', label: 'Tratamiento' },
  { value: 'encuesta', label: 'Encuesta' },
  { value: 'otro', label: 'Otro' },
];

async function getInitialData() {
  const result = await listarHistorial({ limit: 30, page: 1 });
  return {
    data: result.data,
    total: result.total,
  };
}

/**
 *
 */
export default async function HistorialPage() {
  const initial = await getInitialData();

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Historial Clínico"
        description="Todos los registros clínicos y notas SOAP de pacientes"
      />
      <HistorialClient initialData={initial.data} initialTotal={initial.total} tipos={TIPOS} />
    </div>
  );
}
