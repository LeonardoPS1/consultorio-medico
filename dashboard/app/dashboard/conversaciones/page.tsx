import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { conversaciones, pacientes } from '@/drizzle/schema';
import { eq, desc, isNull, sql } from 'drizzle-orm';
import { ConversacionesClient } from './conversaciones-client';

export const dynamic = 'force-dynamic';

export default async function ConversacionesPage() {
  const session = await auth();
  if (!session) redirect('/login');

  const rows = await db
    .select({
      id: conversaciones.id,
      pacienteId: conversaciones.pacienteId,
      canal: conversaciones.canal,
      estado: conversaciones.estado,
      ultimoMensaje: conversaciones.ultimoMensaje,
      ultimoMensajeRol: conversaciones.ultimoMensajeRol,
      ultimaIntencion: conversaciones.ultimaIntencion,
      ultimaInteraccion: conversaciones.ultimaInteraccion,
      pacienteNombre: pacientes.nombre,
      pacienteApellido: pacientes.apellido,
      pacienteTelefono: pacientes.telefono,
    })
    .from(conversaciones)
    .leftJoin(pacientes, eq(conversaciones.pacienteId, pacientes.id))
    .where(isNull(conversaciones.deletedAt))
    .orderBy(desc(conversaciones.ultimaInteraccion))
    .limit(100);

  const toDateStr = (v: Date | null | undefined): string =>
    v instanceof Date ? v.toISOString() : v ?? '';

  const initialConversaciones = rows.map((r) => ({
    id: r.id,
    pacienteId: r.pacienteId,
    canal: r.canal,
    estado: r.estado,
    ultimoMensaje: r.ultimoMensaje ?? undefined,
    ultimoMensajeRol: r.ultimoMensajeRol ?? undefined,
    ultimaIntencion: r.ultimaIntencion ?? undefined,
    ultimaInteraccion: toDateStr(r.ultimaInteraccion),
    paciente: r.pacienteNombre
      ? {
          nombre: r.pacienteNombre,
          apellido: r.pacienteApellido ?? '',
          telefono: r.pacienteTelefono ?? '',
        }
      : undefined,
  }));

  return <ConversacionesClient initialConversaciones={initialConversaciones} />;
}
