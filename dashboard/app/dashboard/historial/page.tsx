import { db } from '@/lib/db';
import { historialMedico, pacientes } from '@/drizzle/schema';
import { desc, sql, eq } from 'drizzle-orm';
import { PageHeader } from '@/components/page-header';
import { HistorialClient } from './historial-client';

export const dynamic = 'force-dynamic';

const TIPOS = [
  { value: 'consulta', label: 'Consulta' },
  { value: 'control', label: 'Control' },
  { value: 'diagnostico', label: 'Diagnóstico' },
  { value: 'estudio', label: 'Estudio' },
  { value: 'resultado', label: 'Resultado' },
  { value: 'receta', label: 'Receta' },
  { value: 'procedimiento', label: 'Procedimiento' },
  { value: 'internacion', label: 'Internación' },
  { value: 'cirugia', label: 'Cirugía' },
  { value: 'alergia', label: 'Alergia' },
  { value: 'vacuna', label: 'Vacuna' },
  { value: 'observacion', label: 'Observación' },
  { value: 'certificado', label: 'Certificado' },
  { value: 'nota', label: 'Nota de evolución' },
  { value: 'otro', label: 'Otro' },
];

async function getInitialData() {
  const [rows, countResult] = await Promise.all([
    db
      .select({
        id: historialMedico.id,
        tipo: historialMedico.tipo,
        titulo: historialMedico.titulo,
        descripcion: historialMedico.descripcion,
        diagnosticoCodigo: historialMedico.diagnosticoCodigo,
        diagnosticoDescripcion: historialMedico.diagnosticoDescripcion,
        fecha: historialMedico.createdAt,
        pacienteId: historialMedico.pacienteId,
        pacienteNombre: sql<string>`CONCAT(${pacientes.nombre}, ' ', ${pacientes.apellido})`,
        pacienteTelefono: pacientes.telefono,
      })
      .from(historialMedico)
      .innerJoin(pacientes, eq(historialMedico.pacienteId, pacientes.id))
      .orderBy(desc(historialMedico.createdAt))
      .limit(30),
    db
      .select({ count: sql<number>`count(*)` })
      .from(historialMedico)
      .innerJoin(pacientes, eq(historialMedico.pacienteId, pacientes.id)),
  ]);

  return {
    data: rows.map((r) => ({
      ...r,
      fecha: r.fecha instanceof Date ? r.fecha.toISOString() : String(r.fecha ?? ''),
    })),
    total: Number(countResult[0]?.count ?? 0),
  };
}

export default async function HistorialPage() {
  const initial = await getInitialData();

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Historial Clínico"
        description="Todos los registros clínicos de pacientes"
      />
      <HistorialClient initialData={initial.data} initialTotal={initial.total} tipos={TIPOS} />
    </div>
  );
}
