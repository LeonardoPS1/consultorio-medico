import { notFound } from 'next/navigation';
import { PacienteDetalleClient } from './paciente-detalle-client';
import { db } from '@/lib/db';
import {
  pacientes,
  turnos,
  recetas,
  medicos,
  historialMedico,
  notasSoap,
  conversaciones,
} from '@/drizzle/schema';
import { eq, and, sql, desc } from 'drizzle-orm';

import { auth } from '@/lib/auth';

// ─── Types ────────────────────────────────────────────────

interface PacienteDetalle {
  paciente: {
    id: string;
    nombre: string;
    apellido: string;
    telefono: string;
    email: string | null;
    dni: string | null;
    fechaNacimiento: string | null;
    direccion: string | null;
    obraSocial: string | null;
    sistemaSalud: string | null;
    isapreNombre: string | null;
    prevision: string | null;
    tramoFonasa: string | null;
    numeroAfiliado: string | null;
    regionId: string | null;
    comunaId: string | null;
    regionNombre: string | null;
    comunaNombre: string | null;
    alergias: string | null;
    medicacionCronica: string | null;
    notasMedicas: string | null;
    tags: string[];
    consentimientoWhatsapp: boolean;
    createdAt: string;
  };
  turnos: Array<{
    id: string;
    fechaHora: string;
    hora: string;
    estado: string;
    tipoConsulta: string;
    motivo: string | null;
    medicoNombre: string | null;
    duracionMinutos: number;
    notasMedico: string | null;
  }>;
  recetas: Array<{
    id: string;
    medicamento: string;
    dosis: string;
    frecuencia: string;
    duracion: string | null;
    indicaciones: string | null;
    estado: string;
    fechaInicio: string;
    fechaFin: string | null;
    medicoNombre: string | null;
  }>;
  historial: Array<{
    id: string;
    tipo: string;
    titulo: string;
    descripcion: string | null;
    diagnosticoCodigo: string | null;
    diagnosticoDescripcion: string | null;
    fecha: string;
  }>;
  ultimaConversacion: { id: string; estado: string } | null;
  stats: {
    totalTurnos: number;
    totalRecetas: number;
    totalHistorial: number;
    totalNotasSoap: number;
    turnosPorEstado: Record<string, number>;
    recetasPorEstado: Record<string, number>;
  };
  bajaSolicitadaAt?: string | null;
  bajaConfirmada?: boolean;
}

// ─── Data fetching (directo a DB, sin fetch a API) ─────────

export const dynamic = 'force-dynamic';

async function getPacienteDetalle(id: string): Promise<PacienteDetalle | null> {
  try {
    const session = await auth();
    if (!session?.user?.id) return null;

    // ─── Datos del paciente (core — siempre existen) ──
    const [paciente] = await db
      .select({
        id: pacientes.id,
        nombre: pacientes.nombre,
        apellido: pacientes.apellido,
        telefono: pacientes.telefono,
        email: pacientes.email,
        dni: pacientes.dni,
        fechaNacimiento: pacientes.fechaNacimiento,
        direccion: pacientes.direccion,
        obraSocial: pacientes.obraSocial,
        numeroAfiliado: pacientes.numeroAfiliado,
        alergias: pacientes.alergias,
        medicacionCronica: pacientes.medicacionCronica,
        notasMedicas: pacientes.notasMedicas,
        tags: pacientes.tags,
        consentimientoWhatsapp: pacientes.consentimientoWhatsapp,
        consentimientoEmail: pacientes.consentimientoEmail,
        createdAt: pacientes.createdAt,
        updatedAt: pacientes.updatedAt,
        deletedAt: pacientes.deletedAt,
      })
      .from(pacientes)
      .where(and(eq(pacientes.id, id), sql`${pacientes.deletedAt} IS NULL`));

    if (!paciente) return null;

    // ─── Datos Chile (pueden no existir si faltan migraciones) ──
    let sistemaSalud: string | null = null;
    let isapreNombre: string | null = null;
    let prevision: string | null = null;
    let tramoFonasa: string | null = null;
    let regionId: string | null = null;
    let comunaId: string | null = null;
    let regionNombre: string | null = null;
    let comunaNombre: string | null = null;

    try {
      const [extra] = await db.execute(sql`
        SELECT
          p.sistema_salud, p.isapre_nombre, p.region_id, p.comuna_id,
          p.prevision, p.tramo_fonasa,
          r.nombre AS region_nombre, c.nombre AS comuna_nombre
        FROM pacientes p
        LEFT JOIN regiones r ON r.id = p.region_id
        LEFT JOIN comunas c ON c.id = p.comuna_id
        WHERE p.id = ${id}
      `);
      if (extra) {
        const row = extra as Record<string, unknown>;
        sistemaSalud = row.sistema_salud ? String(row.sistema_salud) : null;
        isapreNombre = row.isapre_nombre ? String(row.isapre_nombre) : null;
        prevision = row.prevision ? String(row.prevision) : null;
        tramoFonasa = row.tramo_fonasa ? String(row.tramo_fonasa) : null;
        regionId = row.region_id ? String(row.region_id) : null;
        comunaId = row.comuna_id ? String(row.comuna_id) : null;
        regionNombre = row.region_nombre ? String(row.region_nombre) : null;
        comunaNombre = row.comuna_nombre ? String(row.comuna_nombre) : null;
      }
    } catch {
      // Migraciones de Chile no aplicadas — ignorar silenciosamente
    }

    // ─── Turnos ──────────────────────────────────────
    const turnosList = await db
      .select({
        id: turnos.id,
        fechaHora: turnos.fechaHora,
        hora: sql<string>`TO_CHAR(${turnos.fechaHora}, 'HH24:MI')`,
        estado: turnos.estado,
        tipoConsulta: turnos.tipoConsulta,
        motivo: turnos.motivo,
        medicoNombre: medicos.nombre,
        duracionMinutos: turnos.duracionMinutos,
        notasMedico: turnos.notasMedico,
      })
      .from(turnos)
      .leftJoin(medicos, eq(turnos.medicoId, medicos.id))
      .where(and(eq(turnos.pacienteId, id), sql`${turnos.deletedAt} IS NULL`))
      .orderBy(desc(turnos.fechaHora))
      .limit(30);

    // ─── Recetas ─────────────────────────────────────
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
      })
      .from(recetas)
      .leftJoin(medicos, eq(recetas.medicoId, medicos.id))
      .where(eq(recetas.pacienteId, id))
      .orderBy(desc(recetas.createdAt))
      .limit(20);

    // ─── Historial médico ────────────────────────────
    const historial = await db
      .select({
        id: historialMedico.id,
        tipo: historialMedico.tipo,
        titulo: historialMedico.titulo,
        descripcion: historialMedico.descripcion,
        diagnosticoCodigo: historialMedico.diagnosticoCodigo,
        diagnosticoDescripcion: historialMedico.diagnosticoDescripcion,
        fecha: historialMedico.createdAt,
      })
      .from(historialMedico)
      .where(eq(historialMedico.pacienteId, id))
      .orderBy(desc(historialMedico.createdAt));

    // ─── Notas SOAP count ─────────────────────────
    let notasSoapCount = { count: 0 };
    try {
      const [result] = await db
        .select({ count: sql<number>`count(*)` })
        .from(notasSoap)
        .where(eq(notasSoap.pacienteId, id));
      notasSoapCount = result || { count: 0 };
    } catch {
      notasSoapCount = { count: 0 };
    }

    // ─── Baja ARCO (query segura, columna puede no existir en prod) ──
    let bajaSolicitadaAt: string | null = null;
    try {
      const [row] = await db.execute(
        sql`SELECT baja_solicitada_at FROM pacientes WHERE id = ${id}`,
      );
      const raw = (row as Record<string, unknown>)?.baja_solicitada_at;
      bajaSolicitadaAt = raw ? String(raw) : null;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_e) {
      bajaSolicitadaAt = null; // columna no existe aún en esta DB
    }

    // ─── Última conversación ─────────────────────────
    const [ultimaConversacion] = await db
      .select({
        id: conversaciones.id,
        estado: conversaciones.estado,
      })
      .from(conversaciones)
      .where(and(eq(conversaciones.pacienteId, id), sql`${conversaciones.deletedAt} IS NULL`))
      .orderBy(desc(conversaciones.ultimaInteraccion))
      .limit(1);

    // ─── Stats ───────────────────────────────────────
    const statsTurnos = turnosList.reduce(
      (acc, t) => {
        acc[t.estado] = (acc[t.estado] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const statsRecetas = recetasList.reduce(
      (acc, r) => {
        acc[r.estado] = (acc[r.estado] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const pacienteData = {
      ...paciente,
      tags: paciente.tags ?? [],
      consentimientoWhatsapp: paciente.consentimientoWhatsapp ?? false,
      consentimientoEmail: paciente.consentimientoEmail ?? false,
      createdAt: paciente.createdAt?.toISOString() ?? '',
      fechaNacimiento: paciente.fechaNacimiento ?? null,
      sistemaSalud,
      isapreNombre,
      prevision,
      tramoFonasa,
      regionId,
      comunaId,
      regionNombre,
      comunaNombre,
    };
    const turnosData = turnosList.map((t) => ({
      ...t,
      fechaHora: t.fechaHora ? t.fechaHora.toISOString() : '',
      hora: t.hora || '',
    }));
    const recetasData = recetasList.map((r) => ({
      ...r,
      fechaInicio: r.fechaInicio ? String(r.fechaInicio) : '',
      fechaFin: r.fechaFin ? String(r.fechaFin) : '',
    }));
    const historialData = historial.map((h) => ({
      ...h,
      fecha: h.fecha ? String(h.fecha) : '',
    }));

    return {
      paciente: pacienteData,
      turnos: turnosData,
      recetas: recetasData,
      historial: historialData,
      ultimaConversacion: ultimaConversacion || null,
      stats: {
        totalTurnos: turnosList.length,
        totalRecetas: recetasList.length,
        totalHistorial: historial.length,
        totalNotasSoap: Number(notasSoapCount?.count || 0),
        turnosPorEstado: statsTurnos,
        recetasPorEstado: statsRecetas,
      },
      bajaSolicitadaAt,
      bajaConfirmada: false,
    };
  } catch (error) {
    console.error('[PacienteDetalle] Error al obtener datos:', error);
    return null;
  }
}

// ─── Page ──────────────────────────────────────────────────

export default async function PacienteDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getPacienteDetalle(id);
  if (!data) notFound();

  const {
    paciente,
    turnos,
    recetas,
    historial,
    ultimaConversacion,
    stats,
    bajaSolicitadaAt,
    bajaConfirmada,
  } = data;

  return (
    <PacienteDetalleClient
      paciente={paciente}
      turnos={turnos}
      recetas={recetas}
      historial={historial}
      ultimaConversacion={ultimaConversacion}
      stats={stats}
      bajaSolicitadaAt={bajaSolicitadaAt}
      bajaConfirmada={bajaConfirmada}
    />
  );
}
