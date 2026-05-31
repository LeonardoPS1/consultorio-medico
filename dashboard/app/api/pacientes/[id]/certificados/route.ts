import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { historialMedico, pacientes, medicos } from '@/drizzle/schema';
import { eq, desc, and } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { generarHashCertificado, generarHTMLCertificado } from '@/lib/certificados';
import QRCode from 'qrcode';

/**
 * GET /api/pacientes/[id]/certificados
 * Lista certificados del paciente (entradas de tipo 'certificado' en historial)
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { searchParams } = new URL(_request.url);
    const format = searchParams.get('format');
    const entryId = searchParams.get('entryId');

    // ─── PDF output ─────────────────────────────────
    if (format === 'pdf' && entryId) {
      const [entry] = await db
        .select()
        .from(historialMedico)
        .where(
          and(
            eq(historialMedico.id, entryId),
            eq(historialMedico.pacienteId, params.id),
            eq(historialMedico.tipo, 'certificado'),
          ),
        );

      if (!entry) {
        return NextResponse.json(
          { error: 'Certificado no encontrado' },
          { status: 404 },
        );
      }

      // Paciente
      const [paciente] = await db
        .select({ nombre: pacientes.nombre, apellido: pacientes.apellido, dni: pacientes.dni })
        .from(pacientes)
        .where(eq(pacientes.id, params.id));

      if (!paciente) {
        return NextResponse.json(
          { error: 'Paciente no encontrado' },
          { status: 404 },
        );
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

      // Data del certificado (descripcion es JSON string)
      const data = entry.descripcion ? JSON.parse(entry.descripcion) : { diagnostico: '' };

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://med.aicorebots.com';
      const verificationUrl = `${baseUrl}/verificar-certificado/${entry.id}`;

      // Generar QR code (base64 data URL)
      const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
        width: 120,
        margin: 2,
        color: { dark: '#1a1a1a', light: '#ffffff' },
      });

      const html = generarHTMLCertificado(
        {
          id: entry.id,
          pacienteId: params.id,
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

    // ─── List ────────────────────────────────────────
    const list = await db
      .select()
      .from(historialMedico)
      .where(
        and(
          eq(historialMedico.pacienteId, params.id),
          eq(historialMedico.tipo, 'certificado'),
        ),
      )
      .orderBy(desc(historialMedico.createdAt));

    return NextResponse.json(list);
  } catch (error) {
    console.error('[API] Error GET certificados:', error);
    return NextResponse.json(
      { error: 'Error al obtener certificados' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/pacientes/[id]/certificados
 * Crea un nuevo certificado médico (como entrada en historial)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await auth();
    if (!session?.user?.medicoId) {
      return NextResponse.json(
        { error: 'Debe estar autenticado como médico' },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { diagnostico, cie10Codigo, reposoDesde, reposoHasta, reposoDias, indicaciones } = body;

    if (!diagnostico?.trim()) {
      return NextResponse.json(
        { error: 'El diagnóstico es obligatorio' },
        { status: 400 },
      );
    }

    // Generar ID primero para el hash
    const { randomUUID } = await import('crypto');
    const entryId = randomUUID();

    // Preparar data estructurada en descripcion (JSON)
    const data = {
      diagnostico: diagnostico.trim(),
      cie10Codigo: cie10Codigo || null,
      reposoDesde: reposoDesde || null,
      reposoHasta: reposoHasta || null,
      reposoDias: reposoDias ? parseInt(reposoDias) : null,
      indicaciones: indicaciones || null,
    };

    // Generar hash de verificación
    const hash = generarHashCertificado({
      id: entryId,
      pacienteId: params.id,
      diagnostico: diagnostico.trim(),
    });

    const titulo = `Certificado Médico — ${new Date().toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}`;

    const [entry] = await db
      .insert(historialMedico)
      .values({
        id: entryId,
        pacienteId: params.id,
        medicoId: session.user.medicoId,
        tipo: 'certificado',
        titulo,
        descripcion: JSON.stringify(data),
        diagnosticoCodigo: cie10Codigo || null,
        hashVerificacion: hash,
        pdfGenerado: true,
        visibleParaPaciente: true,
      })
      .returning();

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    console.error('[API] Error POST certificados:', error);
    return NextResponse.json(
      { error: 'Error al crear certificado' },
      { status: 500 },
    );
  }
}
