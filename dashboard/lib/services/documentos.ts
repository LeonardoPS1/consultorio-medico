import { eq, and, desc, isNull } from 'drizzle-orm';
import { pacientes } from '@/drizzle/core';
import { documentosMedicos, historialMedico } from '@/drizzle/medical';
import { db } from '@/lib/db';
import { crearNotificacion } from '@/lib/services/portal-notificaciones';
import { getUploadDir } from '@/lib/upload-dir';
import { extraerTextoImagen, extraerLaboratorio, extraerReceta } from '@/lib/vision-ocr';

export interface DocumentoInput {
  pacienteId: string;
  tipo: 'laboratorio' | 'receta' | 'imagen' | 'informe' | 'estudio' | 'otro';
  archivoUrl: string;
  medicoId?: string;
  tenantId: string;
}

export interface RevisionInput {
  notaId: string;
  accion: 'aprobar' | 'rechazar' | 'editar';
  datosEditados?: Record<string, unknown>;
  medicoId?: string;
  turnoId?: string;
  motivoRechazo?: string;
}

export const documentosService = {
  async crear(input: DocumentoInput) {
    const [doc] = await db
      .insert(documentosMedicos)
      .values({
        pacienteId: input.pacienteId,
        tipo: input.tipo,
        archivoUrl: input.archivoUrl,
        medicoId: input.medicoId || null,
        tenantId: input.tenantId,
        extraccionEstado: 'pendiente',
        estadoRevision: 'pendiente',
      })
      .returning();
    return doc;
  },

  async procesarOcr(documentoId: string) {
    const doc = await db
      .select()
      .from(documentosMedicos)
      .where(eq(documentosMedicos.id, documentoId))
      .then((r) => r[0]);

    if (!doc) throw new Error('Documento no encontrado');

    let imageBase64: string | null = null;
    let mimeType = 'image/jpeg';

    if (typeof window === 'undefined' && doc.archivoUrl) {
      const fs = await import('fs');
      const pathModule = await import('path');
      const filename = pathModule.basename(doc.archivoUrl);
      const uploadDir = await getUploadDir();
      const filePath = pathModule.join(uploadDir, filename);

      const ext = pathModule.extname(filename).toLowerCase();
      if (ext === '.png') mimeType = 'image/png';
      else if (ext === '.webp') mimeType = 'image/webp';
      else if (ext === '.gif') mimeType = 'image/gif';
      else if (ext === '.svg') mimeType = 'image/svg+xml';
      else if (ext === '.pdf') mimeType = 'application/pdf';
      else mimeType = 'image/jpeg';

      if (fs.existsSync(filePath)) {
        imageBase64 = fs.readFileSync(filePath).toString('base64');
      }
    }

    if (!imageBase64) {
      await db
        .update(documentosMedicos)
        .set({
          extraccionEstado: 'fallida',
          confianzaExtraccion: 0,
          updatedAt: new Date(),
        })
        .where(eq(documentosMedicos.id, documentoId));
      return db
        .select()
        .from(documentosMedicos)
        .where(eq(documentosMedicos.id, documentoId))
        .then((r) => r[0]);
    }

    let resultado;
    if (doc.tipo === 'laboratorio') {
      resultado = await extraerLaboratorio(imageBase64, mimeType);
    } else if (doc.tipo === 'receta') {
      resultado = await extraerReceta(imageBase64, mimeType);
    } else {
      resultado = await extraerTextoImagen(imageBase64, doc.tipo || 'estudio', mimeType);
    }

    if (resultado && (resultado.confianza ?? 0) >= 30) {
      await db
        .update(documentosMedicos)
        .set({
          extraccionEstado: 'completada',
          datosExtraidos: resultado as unknown as Record<string, unknown>,
          confianzaExtraccion: resultado.confianza ?? 0,
          updatedAt: new Date(),
        })
        .where(eq(documentosMedicos.id, documentoId));
    } else {
      await db
        .update(documentosMedicos)
        .set({
          extraccionEstado: 'fallida',
          datosExtraidos: resultado ? (resultado as unknown as Record<string, unknown>) : null,
          confianzaExtraccion: resultado?.confianza ?? 0,
          updatedAt: new Date(),
        })
        .where(eq(documentosMedicos.id, documentoId));
    }

    return db
      .select()
      .from(documentosMedicos)
      .where(eq(documentosMedicos.id, documentoId))
      .then((r) => r[0]);
  },

  async confirmar(documentoId: string) {
    const [doc] = await db
      .update(documentosMedicos)
      .set({
        extraccionEstado: 'confirmado',
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(documentosMedicos.id, documentoId),
          eq(documentosMedicos.extraccionEstado, 'completada'),
        ),
      )
      .returning();
    return doc;
  },

  async listarPendientes(tenantId: string, medicoId?: string) {
    const conditions = [
      eq(documentosMedicos.estadoRevision, 'pendiente'),
      eq(documentosMedicos.tenantId, tenantId),
    ];
    if (medicoId) conditions.push(isNull(documentosMedicos.revisadoPor));

    return db
      .select({
        id: documentosMedicos.id,
        tipo: documentosMedicos.tipo,
        archivoUrl: documentosMedicos.archivoUrl,
        extraccionEstado: documentosMedicos.extraccionEstado,
        confianzaExtraccion: documentosMedicos.confianzaExtraccion,
        datosExtraidos: documentosMedicos.datosExtraidos,
        estadoRevision: documentosMedicos.estadoRevision,
        createdAt: documentosMedicos.createdAt,
        paciente: {
          id: pacientes.id,
          nombre: pacientes.nombre,
          rut: pacientes.rut,
        },
      })
      .from(documentosMedicos)
      .innerJoin(pacientes, eq(documentosMedicos.pacienteId, pacientes.id))
      .where(and(...conditions))
      .orderBy(desc(documentosMedicos.createdAt));
  },

  async listarPorPaciente(pacienteId: string) {
    return db
      .select()
      .from(documentosMedicos)
      .where(eq(documentosMedicos.pacienteId, pacienteId))
      .orderBy(desc(documentosMedicos.createdAt));
  },

  async revisar(input: RevisionInput) {
    const doc = await db
      .select()
      .from(documentosMedicos)
      .where(eq(documentosMedicos.id, input.notaId))
      .then((r) => r[0]);

    if (!doc) throw new Error('Documento no encontrado');

    if (input.accion === 'aprobar') {
      const datosStr = doc.datosExtraidos
        ? Object.entries(doc.datosExtraidos as Record<string, unknown>)
            .map(([k, v]) => `${k}: ${v}`)
            .join('\n')
        : '';

      const [historial] = await db
        .insert(historialMedico)
        .values({
          pacienteId: doc.pacienteId,
          medicoId: input.medicoId || null,
          turnoId: input.turnoId || null,
          tipo: 'otro',
          titulo: doc.tipo === 'laboratorio' ? 'Examen de laboratorio' : `Documento: ${doc.tipo}`,
          descripcion: datosStr,
          archivos: [
            { url: doc.archivoUrl, tipo: doc.tipo, datos: doc.datosExtraidos },
          ] as unknown as JSON,
          visibleParaPaciente: true,
        })
        .returning({ id: historialMedico.id });

      await db
        .update(documentosMedicos)
        .set({
          estadoRevision: 'aprobado',
          revisadoPor: input.medicoId || null,
          revisadoAt: new Date(),
          historialId: historial?.id || null,
          updatedAt: new Date(),
        })
        .where(eq(documentosMedicos.id, input.notaId));

      try {
        await crearNotificacion(doc.pacienteId, {
          titulo: 'Documento aprobado',
          descripcion: 'Tu documento fue aprobado por el médico e incorporado a tu historial.',
          tipo: 'sistema',
          href: '/portal/documentos',
        });
      } catch {
        /* la notificación no debe interrumpir la revisión */
      }
    } else if (input.accion === 'rechazar') {
      const metadataAtual = (doc.metadata as Record<string, unknown>) || {};
      await db
        .update(documentosMedicos)
        .set({
          estadoRevision: 'rechazado',
          revisadoPor: input.medicoId || null,
          revisadoAt: new Date(),
          metadata: { ...metadataAtual, motivoRechazo: input.motivoRechazo || '' },
          updatedAt: new Date(),
        })
        .where(eq(documentosMedicos.id, input.notaId));

      try {
        await crearNotificacion(doc.pacienteId, {
          titulo: 'Documento rechazado',
          descripcion: `Tu documento fue rechazado y requiere que lo reenvíes. ${
            input.motivoRechazo
              ? `Motivo: ${input.motivoRechazo}`
              : 'Contacta a tu médico para más información.'
          }`,
          tipo: 'sistema',
          href: '/portal/documentos',
        });
      } catch {
        /* la notificación no debe interrumpir la revisión */
      }
    } else if (input.accion === 'editar' && input.datosEditados) {
      await db
        .update(documentosMedicos)
        .set({
          estadoRevision: 'editado',
          datosExtraidos: input.datosEditados as unknown as Record<string, unknown>,
          revisadoPor: input.medicoId || null,
          revisadoAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(documentosMedicos.id, input.notaId));
    }

    return db
      .select()
      .from(documentosMedicos)
      .where(eq(documentosMedicos.id, input.notaId))
      .then((r) => r[0]);
  },
};
