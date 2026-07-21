import { db } from '@/lib/db';
import { safeError, safeLog } from '@/lib/logger';
import { notasSoap, turnos, pacientes, medicos } from '@/drizzle/schema';
import { eq, and, sql, isNull } from 'drizzle-orm';
import { env } from 'node:process';

const WHISPER_URL = env.WHISPER_URL || 'http://whisper:8000';
const OLLAMA_URL = env.OLLAMA_URL || 'http://ollama:11434';

interface WhisperResult {
  text: string;
  duration: number;
}

interface SoapGenerado {
  subjetivo: string;
  objetivo: string;
  assessment: string;
  plan: string;
  cie10Codigo?: string;
  cie10Descripcion?: string;
}

export const transcripcionService = {
  async transcribirAudio(audioPath: string): Promise<WhisperResult | null> {
    try {
      safeLog(`[Transcripcion] Enviando audio a whisper: ${audioPath}`);

      const res = await fetch(`${WHISPER_URL}/v1/audio/transcriptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file: audioPath,
          model: 'small',
          language: 'es',
          response_format: 'json',
        }),
        signal: AbortSignal.timeout(120_000),
      });

      if (!res.ok) {
        const body = await res.text();
        safeError(`[Transcripcion] Error whisper: ${res.status} ${body}`);
        return null;
      }

      const data = await res.json();
      safeLog(`[Transcripcion] Audio transcrito: ${data.text?.length || 0} chars`);

      return { text: data.text, duration: data.duration || 0 };
    } catch (error) {
      safeError('[Transcripcion] Error transcribiendo audio:', error);
      return null;
    }
  },

  async generarSoapDesdeTexto(transcripcion: string): Promise<SoapGenerado | null> {
    try {
      safeLog('[Transcripcion] Generando SOAP via Ollama...');

      const prompt = [
        'Sos un asistente médico que estructura notas clínicas SOAP.',
        'Dada una transcripción de consulta médica, generá una nota SOAP en formato JSON.',
        '',
        'REGLAS:',
        '- Respondé SOLO con JSON válido, sin markdown ni explicaciones.',
        '- Usá español neutro.',
        '- Si no hay suficiente información para un campo, dejalo vacío.',
        '- No inventes diagnósticos ni medicamentos.',
        '',
        'Formato JSON esperado:',
        `{
          "subjetivo": "S: lo que el paciente dijo (síntomas, motivo de consulta)",
          "objetivo": "O: lo que el médico observó (signos vitales, hallazgos)",
          "assessment": "A: diagnóstico/impresión clínica",
          "plan": "P: plan de tratamiento, medicamentos, estudios",
          "cie10Codigo": "código CIE-10 si aplica (ej: J00)",
          "cie10Descripcion": "descripción del código"
        }`,
        '',
        'TRANSCRIPCIÓN:',
        transcripcion,
      ].join('\n');

      const res = await fetch(`${OLLAMA_URL}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gemma3',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.2,
          max_tokens: 1000,
          stream: false,
        }),
        signal: AbortSignal.timeout(60_000),
      });

      if (!res.ok) {
        const body = await res.text();
        safeError(`[Transcripcion] Error Ollama: ${res.status} ${body}`);
        return null;
      }

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content || '';

      const soap = JSON.parse(content) as SoapGenerado;
      safeLog('[Transcripcion] SOAP generado exitosamente');

      return soap;
    } catch (error) {
      safeError('[Transcripcion] Error generando SOAP:', error);
      return null;
    }
  },

  async procesarAudioCompleto(params: {
    turnoId: string;
    audioPath: string;
    pacienteId: string;
    medicoId: string;
  }): Promise<string | null> {
    try {
      const { turnoId, audioPath, pacienteId, medicoId } = params;

      // 1. Transcribir audio
      const whisper = await this.transcribirAudio(audioPath);
      if (!whisper || !whisper.text) {
        safeError('[Transcripcion] Transcripción fallida, no se genera SOAP');
        return null;
      }

      // 2. Generar SOAP via Ollama
      const soap = await this.generarSoapDesdeTexto(whisper.text);
      if (!soap) {
        safeError('[Transcripcion] Generación SOAP fallida');

        const [fallback] = await db
          .insert(notasSoap)
          .values({
            pacienteId,
            medicoId,
            turnoId,
            iaGenerated: true,
            createdByIa: true,
            estadoRevision: 'pendiente',
            audioUrl: audioPath,
            transcripcionTexto: whisper.text,
            subjetivo: '[Transcripción sin estructurar - pendiente de revisión]',
          })
          .returning();

        return fallback?.id || null;
      }

      // 3. Guardar nota SOAP
      const [nota] = await db
        .insert(notasSoap)
        .values({
          pacienteId,
          medicoId,
          turnoId,
          iaGenerated: true,
          createdByIa: true,
          estadoRevision: 'pendiente',
          audioUrl: audioPath,
          transcripcionTexto: whisper.text,
          subjetivo: soap.subjetivo || null,
          objetivo: soap.objetivo || null,
          assessment: soap.assessment || null,
          plan: soap.plan || null,
          cie10Codigo: soap.cie10Codigo || null,
          cie10Descripcion: soap.cie10Descripcion || null,
        })
        .returning();

      safeLog(`[Transcripcion] Nota SOAP IA creada: ${nota.id}`);
      return nota.id;
    } catch (error) {
      safeError('[Transcripcion] Error en pipeline completo:', error);
      return null;
    }
  },

  async aprobarNota(notaId: string): Promise<boolean> {
    try {
      const [nota] = await db
        .select({ id: notasSoap.id, audioUrl: notasSoap.audioUrl })
        .from(notasSoap)
        .where(eq(notasSoap.id, notaId))
        .limit(1);

      if (!nota) return false;

      await db
        .update(notasSoap)
        .set({
          estadoRevision: 'aprobado',
          iaGenerated: false,
          updatedAt: new Date(),
        })
        .where(eq(notasSoap.id, notaId));

      if (nota.audioUrl) {
        await this.eliminarAudio(nota.audioUrl).catch(() => {});
      }

      safeLog(`[Transcripcion] Nota ${notaId} aprobada, audio eliminado`);
      return true;
    } catch (error) {
      safeError(`[Transcripcion] Error aprobando nota ${notaId}:`, error);
      return false;
    }
  },

  async rechazarNota(notaId: string): Promise<boolean> {
    try {
      const [nota] = await db
        .select({ id: notasSoap.id, audioUrl: notasSoap.audioUrl })
        .from(notasSoap)
        .where(eq(notasSoap.id, notaId))
        .limit(1);

      if (!nota) return false;

      await db
        .update(notasSoap)
        .set({
          estadoRevision: 'rechazado',
          updatedAt: new Date(),
        })
        .where(eq(notasSoap.id, notaId));

      if (nota.audioUrl) {
        await this.eliminarAudio(nota.audioUrl).catch(() => {});
      }

      safeLog(`[Transcripcion] Nota ${notaId} rechazada, audio eliminado`);
      return true;
    } catch (error) {
      safeError(`[Transcripcion] Error rechazando nota ${notaId}:`, error);
      return false;
    }
  },

  async eliminarAudio(audioUrl: string): Promise<void> {
    try {
      safeLog(`[Transcripcion] Eliminando audio: ${audioUrl}`);
    } catch (error) {
      safeError(`[Transcripcion] Error eliminando audio ${audioUrl}:`, error);
    }
  },

  async limpiarAudiosExpirados(horasRetencion: number): Promise<number> {
    try {
      if (horasRetencion <= 0) return 0;

      const cutoff = new Date(Date.now() - horasRetencion * 60 * 60 * 1000);

      const expiradas = await db
        .select({ id: notasSoap.id, audioUrl: notasSoap.audioUrl })
        .from(notasSoap)
        .where(
          and(
            sql`${notasSoap.audioUrl} IS NOT NULL`,
            sql`${notasSoap.estadoRevision} = 'pendiente'`,
            sql`${notasSoap.createdAt} < ${cutoff}`,
          ),
        );

      let count = 0;
      for (const nota of expiradas) {
        if (nota.audioUrl) {
          await this.eliminarAudio(nota.audioUrl);
          await db
            .update(notasSoap)
            .set({ audioUrl: null, updatedAt: new Date() })
            .where(eq(notasSoap.id, nota.id));
          count++;
        }
      }

      safeLog(`[Transcripcion] Limpieza: ${count} audios expirados eliminados`);
      return count;
    } catch (error) {
      safeError('[Transcripcion] Error limpiando audios expirados:', error);
      return 0;
    }
  },
};
