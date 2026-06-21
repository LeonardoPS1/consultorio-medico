/**
 * GET /api/portal/certificados/[id] — Genera HTML del certificado con QR
 * Protegido: requiere cookie portal_session
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPortalSession } from '@/lib/portal-auth';
import { db } from '@/lib/db';
import { historialMedico, pacientes, medicos } from '@/drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { generarHashCertificado, generarHTMLCertificado } from '@/lib/certificados';
import QRCode from 'qrcode';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getPortalSession();
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const [entry] = await db
    .select()
    .from(historialMedico)
    .where(
      and(
        eq(historialMedico.id, params.id),
        eq(historialMedico.pacienteId, session.pacienteId),
        eq(historialMedico.tipo, 'certificado'),
        eq(historialMedico.visibleParaPaciente, true),
      ),
    );

  if (!entry) {
    return NextResponse.json({ error: 'Certificado no encontrado' }, { status: 404 });
  }

  // Paciente
  const [paciente] = await db
    .select({ nombre: pacientes.nombre, apellido: pacientes.apellido, dni: pacientes.dni })
    .from(pacientes)
    .where(eq(pacientes.id, session.pacienteId));

  if (!paciente) {
    return NextResponse.json({ error: 'Paciente no encontrado' }, { status: 404 });
  }

  // Médico
  const medicoId = entry.medicoId;
  let medicoNombre = '—';
  let medicoMatricula: string | null = null;
  if (medicoId) {
    const [medico] = await db
      .select({ nombre: medicos.nombre, matricula: medicos.matricula })
      .from(medicos)
      .where(eq(medicos.id, medicoId));
    if (medico) {
      medicoNombre = medico.nombre;
      medicoMatricula = medico.matricula;
    }
  }

  const data = entry.descripcion ? JSON.parse(entry.descripcion) : { diagnostico: '' };

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://med.aicorebots.com';
  const verificationUrl = `${baseUrl}/verificar-certificado/${entry.id}`;

  const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
    width: 120,
    margin: 2,
    color: { dark: '#1a1a1a', light: '#ffffff' },
  });

  const html = generarHTMLCertificado(
    {
      id: entry.id,
      pacienteId: session.pacienteId,
      pacienteNombre: paciente.nombre,
      pacienteApellido: paciente.apellido,
      pacienteDni: paciente.dni,
      medicoNombre,
      medicoMatricula,
      data,
    },
    qrDataUrl,
    baseUrl,
  );

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
