import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { historialMedico, pacientes, medicos } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import { generarHashCertificado } from '@/lib/certificados';

/**
 * GET /api/verificar-certificado/[id]
 *
 * Endpoint público (sin auth) para verificar autenticidad de un certificado médico.
 * Usado por el QR code en los certificados impresos.
 */
export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const [entry] = await db
      .select()
      .from(historialMedico)
      .where(eq(historialMedico.id, params.id));

    if (!entry || entry.tipo !== 'certificado') {
      return NextResponse.json(
        { valido: false, error: 'Certificado no encontrado', codigo: 'NOT_FOUND' },
        { status: 404 },
      );
    }

    // Parsear data del certificado
    const data = entry.descripcion ? JSON.parse(entry.descripcion) : { diagnostico: '' };

    // Verificar hash
    const hashEsperado = generarHashCertificado({
      id: entry.id,
      pacienteId: entry.pacienteId,
      diagnostico: data.diagnostico || '',
    });

    const hashValido = entry.hashVerificacion === hashEsperado;

    // Datos del paciente
    const [paciente] = await db
      .select({ nombre: pacientes.nombre, apellido: pacientes.apellido })
      .from(pacientes)
      .where(eq(pacientes.id, entry.pacienteId));

    // Datos del médico
    let medicoNombre = '—';
    if (entry.medicoId) {
      const [medico] = await db
        .select({ nombre: medicos.nombre })
        .from(medicos)
        .where(eq(medicos.id, entry.medicoId));
      if (medico) medicoNombre = medico.nombre;
    }

    return NextResponse.json({
      valido: hashValido,
      certificado: {
        id: entry.id,
        paciente: paciente ? `${paciente.nombre} ${paciente.apellido}` : '—',
        medico: medicoNombre,
        diagnostico: data.diagnostico || '—',
        cie10Codigo: data.cie10Codigo || null,
        reposoDesde: data.reposoDesde || null,
        reposoHasta: data.reposoHasta || null,
        reposoDias: data.reposoDias || null,
        indicaciones: data.indicaciones || null,
        emitido: entry.createdAt,
      },
    });
  } catch (error) {
    console.error('[API] Error GET /api/verificar-certificado/[id]:', error);
    return NextResponse.json(
      { valido: false, error: 'Error al verificar certificado' },
      { status: 500 },
    );
  }
}
