import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  pacientes,
  turnos,
  recetas,
  medicos,
  historialMedico,
  conversaciones,
  mensajes,
  pacienteEventos,
  tareasPendientes,
  facturacion,
  consentimientoLog,
  auditoriaAccesos,
} from '@/drizzle/schema';
import { eq, sql, desc, and } from 'drizzle-orm';

/**
 * GET /api/pacientes/[id]/exportar-datos
 *
 * Exporta todos los datos del paciente en formato JSON estructurado.
 * Derecho ARCO de portabilidad (Art. 15 RGPD / Ley 19.628 Chile / Ley 25.326 Argentina).
 *
 * Incluye:
 * - Datos personales del paciente
 * - Turnos, recetas, historial médico
 * - Conversaciones y mensajes
 * - Eventos del paciente
 * - Tareas pendientes
 * - Facturación
 * - Historial de consentimientos
 * - Auditoría de accesos a sus datos
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const pacienteId = params.id;

    // ─── 1. Datos del paciente ────────────────────────
    const [paciente] = await db
      .select()
      .from(pacientes)
      .where(eq(pacientes.id, pacienteId));

    if (!paciente) {
      return NextResponse.json(
        { error: 'Paciente no encontrado' },
        { status: 404 },
      );
    }

    // ─── 2. Turnos ─────────────────────────────────────
    const turnosList = await db
      .select({
        id: turnos.id,
        fechaHora: turnos.fechaHora,
        estado: turnos.estado,
        tipoConsulta: turnos.tipoConsulta,
        motivo: turnos.motivo,
        duracionMinutos: turnos.duracionMinutos,
        notasMedico: turnos.notasMedico,
        medicoNombre: medicos.nombre,
        createdAt: turnos.createdAt,
        deletedAt: turnos.deletedAt,
      })
      .from(turnos)
      .leftJoin(medicos, eq(turnos.medicoId, medicos.id))
      .where(eq(turnos.pacienteId, pacienteId))
      .orderBy(desc(turnos.fechaHora));

    // ─── 3. Recetas ────────────────────────────────────
    const recetasList = await db
      .select({
        id: recetas.id,
        medicamento: recetas.medicamento,
        dosis: recetas.dosis,
        frecuencia: recetas.frecuencia,
        duracion: recetas.duracion,
        indicaciones: recetas.indicaciones,
        estado: recetas.estado,
        fechaInicio: recetas.fechaInicio,
        fechaFin: recetas.fechaFin,
        medicoNombre: medicos.nombre,
        createdAt: recetas.createdAt,
      })
      .from(recetas)
      .leftJoin(medicos, eq(recetas.medicoId, medicos.id))
      .where(eq(recetas.pacienteId, pacienteId))
      .orderBy(desc(recetas.createdAt));

    // ─── 4. Historial médico ──────────────────────────
    const historial = await db
      .select()
      .from(historialMedico)
      .where(eq(historialMedico.pacienteId, pacienteId))
      .orderBy(desc(historialMedico.createdAt));

    // ─── 5. Conversaciones + mensajes ──────────────────
    const conversacionesList = await db
      .select()
      .from(conversaciones)
      .where(eq(conversaciones.pacienteId, pacienteId))
      .orderBy(desc(conversaciones.ultimaInteraccion));

    // Mensajes de cada conversación
    const conversacionesConMensajes = await Promise.all(
      conversacionesList.map(async (conv) => {
        const msgs = await db
          .select()
          .from(mensajes)
          .where(eq(mensajes.conversacionId, conv.id))
          .orderBy(mensajes.createdAt);
        return { ...conv, mensajes: msgs };
      }),
    );

    // ─── 6. Eventos del paciente ──────────────────────
    const eventos = await db
      .select()
      .from(pacienteEventos)
      .where(eq(pacienteEventos.pacienteId, pacienteId))
      .orderBy(desc(pacienteEventos.createdAt));

    // ─── 7. Tareas pendientes ─────────────────────────
    const tareas = await db
      .select()
      .from(tareasPendientes)
      .where(eq(tareasPendientes.pacienteId, pacienteId))
      .orderBy(desc(tareasPendientes.createdAt));

    // ─── 8. Facturación ──────────────────────────────
    const facturas = await db
      .select()
      .from(facturacion)
      .where(and(
        eq(facturacion.pacienteId, pacienteId),
        sql`${facturacion.deletedAt} IS NULL`,
      ))
      .orderBy(desc(facturacion.createdAt));

    // ─── 9. Consentimiento log ────────────────────────
    const consentimientos = await db
      .select()
      .from(consentimientoLog)
      .where(eq(consentimientoLog.pacienteId, pacienteId))
      .orderBy(desc(consentimientoLog.createdAt));

    // ─── 10. Auditoría de accesos ─────────────────────
    const accesos = await db
      .select()
      .from(auditoriaAccesos)
      .where(eq(auditoriaAccesos.entidadId, pacienteId))
      .orderBy(desc(auditoriaAccesos.createdAt));

    // ─── Respuesta ─────────────────────────────────────
    const exportData = {
      metadata: {
        exportadoAt: new Date().toISOString(),
        pacienteId,
        formatoVersion: '1.0',
        derechosARCO: 'Portabilidad de datos (Art. 15 RGPD / Art. 14 Ley 19.628 Chile)',
      },
      datosPersonales: {
        id: paciente.id,
        nombre: paciente.nombre,
        apellido: paciente.apellido,
        telefono: paciente.telefono,
        email: paciente.email,
        dni: paciente.dni,
        fechaNacimiento: paciente.fechaNacimiento,
        direccion: paciente.direccion,
        obraSocial: paciente.obraSocial,
        numeroAfiliado: paciente.numeroAfiliado,
        alergias: paciente.alergias,
        medicacionCronica: paciente.medicacionCronica,
        consentimientoWhatsapp: paciente.consentimientoWhatsapp,
        consentimientoEmail: paciente.consentimientoEmail,
        canalPreferido: paciente.canalPreferido,
        tags: paciente.tags,
        sucursalId: paciente.sucursalId,
        createdAt: paciente.createdAt,
      },
      registroMedico: {
        turnos: turnosList,
        recetas: recetasList,
        historialMedico: historial,
      },
      comunicaciones: {
        conversaciones: conversacionesConMensajes,
      },
      eventos: eventos,
      tareasPendientes: tareas,
      facturacion: facturas,
      consentimientos: consentimientos,
      accesosRegistrados: accesos,
    };

    // Si el usuario quiere descargar como archivo
    // Content-Disposition se puede agregar para forzar descarga
    return NextResponse.json(exportData);
  } catch (error) {
    console.error('[API] Error GET /api/pacientes/[id]/exportar-datos:', error);
    return NextResponse.json(
      { error: 'Error al exportar datos del paciente' },
      { status: 500 },
    );
  }
}
