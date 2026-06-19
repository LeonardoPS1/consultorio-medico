import { NextRequest, NextResponse } from 'next/server';
import { calcularTodosLosScores } from '@/lib/services/scoring-pacientes';
import { blacklistService } from '@/lib/services/blacklist';
import { apiHandler, ok } from '@/lib/api-handler';
import { requireAuth } from '@/lib/api-auth';
import { safeLog } from '@/lib/logger';

// POST /api/blacklist/auto-check
// Corre scoring para todos los pacientes y bloquea automáticamente
// a aquellos con score >= 80 y al menos 2 no_shows en los factores
export const POST = apiHandler(async (_request: NextRequest) => {
  const session = await requireAuth();
  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Solo administradores' }, { status: 403 });
  }

  const scores = await calcularTodosLosScores();
  if (!scores || scores.size === 0) {
    return ok({ message: 'No hay pacientes para evaluar', bloqueados: 0 });
  }

  let bloqueados = 0;
  const resultados: { pacienteId: string; score: number; accion: string }[] = [];

  for (const [pacienteId, s] of Array.from(scores)) {
    const noShows = s.factores?.noShows ?? 0;
    if (s.score >= 80 && noShows >= 2) {
      const yaBloqueado = await blacklistService.isPacienteBloqueado(pacienteId);
      if (!yaBloqueado) {
        try {
          await blacklistService.create({
            pacienteId,
            motivo: `Bloqueo automático por scoring alto (score: ${s.score}, inasistencias: ${noShows})`,
            activo: true,
          });
          bloqueados++;
          resultados.push({ pacienteId, score: s.score, accion: 'bloqueado' });
          safeLog('[AutoBlacklist] Paciente bloqueado', { pacienteId, score: s.score, noShows });
        } catch {
          resultados.push({ pacienteId, score: s.score, accion: 'error_al_bloquear' });
        }
      } else {
        resultados.push({ pacienteId, score: s.score, accion: 'ya_bloqueado' });
      }
    } else {
      resultados.push({ pacienteId, score: s.score, accion: 'no_supera_umbral' });
    }
  }

  return ok({
    message: `Auto-blacklist completado. ${bloqueados} pacientes bloqueados.`,
    totalEvaluados: scores.size,
    bloqueados,
    resultados,
  });
});
