import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { calcularScorePaciente, calcularScoreBulk } from '@/lib/services/scoring-pacientes';
import { db } from '@/lib/db';
import { turnos, pacientes } from '@/drizzle/schema';
import { eq, and, sql } from 'drizzle-orm';

describe('Scoring de inasistencia - Determinismo', () => {
  const testPacienteId = 'test-paciente-deterministic';
  const testSucursalId = 'test-sucursal';

  beforeAll(async () => {
    // Limpiar datos de prueba previos
    await db.delete(turnos).where(eq(turnos.pacienteId, testPacienteId));
  });

  afterAll(async () => {
    // Limpiar después de tests
    await db.delete(turnos).where(eq(turnos.pacienteId, testPacienteId));
  });

  const createTestTurnos = async (turnosData: Array<{
    estado: string;
    fechaHora: Date;
    confirmoAsistencia?: boolean;
    recordatorio24hEnviado?: boolean;
    recordatorio1hEnviado?: boolean;
    recordatorio24hLeido?: boolean;
    recordatorio1hLeido?: boolean;
    canceladoPor?: string;
  }>) => {
    // Eliminar turnos existentes para este paciente
    await db.delete(turnos).where(eq(turnos.pacienteId, testPacienteId));

    // Insertar nuevos turnos
    for (const t of turnosData) {
      await db.insert(turnos).values({
        pacienteId: testPacienteId,
        medicoId: 'test-medico-id', // Asumimos que existe
        sucursalId: testSucursalId,
        fechaHora: t.fechaHora,
        estado: t.estado as any,
        confirmoAsistencia: t.confirmoAsistencia ?? false,
        recordatorio24hEnviado: t.recordatorio24hEnviado ?? false,
        recordatorio1hEnviado: t.recordatorio1hEnviado ?? false,
        recordatorio24hLeido: t.recordatorio24hLeido ?? false,
        recordatorio1hLeido: t.recordatorio1hLeido ?? false,
        canceladoPor: t.canceladoPor ?? null,
        createdAt: new Date(t.fechaHora.getTime() - 86400000), // 1 día antes
      });
    }
  };

  test('calcularScorePaciente es determinístico para el mismo dataset', async () => {
    // Dataset fijo: 10 turnos en los últimos 90 días
    // - 2 no_asistio
    // - 1 cancelada sin aviso
    // - 7 confirmados
    // - 5 recordatorios leídos de 8 enviados
    const now = new Date();
    const baseDate = new Date(now);
    baseDate.setDate(baseDate.getDate() - 10); // Empezar hace 10 días

    const turnosData = [
      // No-shows (2)
      { estado: 'no_asistio', fechaHora: new Date(baseDate.getTime() + 0 * 86400000) },
      { estado: 'no_asistio', fechaHora: new Date(baseDate.getTime() + 7 * 86400000) },
      // Cancelación sin aviso (1)
      { estado: 'cancelada', fechaHora: new Date(baseDate.getTime() + 14 * 86400000), canceladoPor: 'dashboard', confirmoAsistencia: false },
      // Confirmados (7)
      { estado: 'atendido', fechaHora: new Date(baseDate.getTime() + 21 * 86400000), confirmoAsistencia: true, recordatorio24hEnviado: true, recordatorio1hEnviado: true, recordatorio24hLeido: true, recordatorio1hLeido: true },
      { estado: 'atendido', fechaHora: new Date(baseDate.getTime() + 28 * 86400000), confirmoAsistencia: true, recordatorio24hEnviado: true, recordatorio1hEnviado: true, recordatorio24hLeido: true, recordatorio1hLeido: false },
      { estado: 'confirmada', fechaHora: new Date(baseDate.getTime() + 35 * 86400000), confirmoAsistencia: true, recordatorio24hEnviado: true, recordatorio1hEnviado: true, recordatorio24hLeido: true, recordatorio1hLeido: true },
      { estado: 'confirmada', fechaHora: new Date(baseDate.getTime() + 42 * 86400000), confirmoAsistencia: true, recordatorio24hEnviado: true, recordatorio1hEnviado: true, recordatorio24hLeido: false, recordatorio1hLeido: false },
      { estado: 'pendiente', fechaHora: new Date(baseDate.getTime() + 49 * 86400000), confirmoAsistencia: false, recordatorio24hEnviado: true, recordatorio1hEnviado: false, recordatorio24hLeido: false, recordatorio1hLeido: false },
      { estado: 'pendiente', fechaHora: new Date(baseDate.getTime() + 56 * 86400000), confirmoAsistencia: false, recordatorio24hEnviado: false, recordatorio1hEnviado: false },
      { estado: 'atendido', fechaHora: new Date(baseDate.getTime() + 63 * 86400000), confirmoAsistencia: true, recordatorio24hEnviado: true, recordatorio1hEnviado: true, recordatorio24hLeido: true, recordatorio1hLeido: true },
      { estado: 'atendido', fechaHora: new Date(baseDate.getTime() + 70 * 86400000), confirmoAsistencia: true, recordatorio24hEnviado: true, recordatorio1hEnviado: true, recordatorio24hLeido: true, recordatorio1hLeido: true },
    ];

    await createTestTurnos(turnosData);

    // Primera llamada
    const result1 = await calcularScorePaciente(testPacienteId, { sucursalId: testSucursalId });
    
    // Segunda llamada (debe ser idéntica)
    const result2 = await calcularScorePaciente(testPacienteId, { sucursalId: testSucursalId });
    
    // Tercera llamada (debe ser idéntica)
    const result3 = await calcularScorePaciente(testPacienteId, { sucursalId: testSucursalId });

    expect(result1.score).toBe(result2.score);
    expect(result2.score).toBe(result3.score);
    expect(result1.nivel).toBe(result2.nivel);
    expect(result2.nivel).toBe(result3.nivel);
    
    // Verificar factores son iguales
    expect(result1.factores.noShows).toBe(result2.factores.noShows);
    expect(result1.factores.cancelacionesSinAviso).toBe(result2.factores.cancelacionesSinAviso);
    expect(result1.factores.totalTurnos).toBe(result2.factores.totalTurnos);
    expect(result1.factores.turnosConfirmados).toBe(result2.factores.turnosConfirmados);
    expect(result1.factores.recordatoriosLeidos).toBe(result2.factores.recordatoriosLeidos);
    expect(result1.factores.recordatoriosEnviados).toBe(result2.factores.recordatoriosEnviados);
  });

  test('calcularScorePaciente retorna bajo para paciente sin historial', async () => {
    // Paciente sin turnos en los últimos 90 días
    const newPatientId = 'new-patient-no-history';
    
    // Asegurar que no tiene turnos
    await db.delete(turnos).where(eq(turnos.pacienteId, newPatientId));
    
    const result = await calcularScorePaciente(newPatientId, { sucursalId: testSucursalId });
    
    expect(result.score).toBe(0);
    expect(result.nivel).toBe('bajo');
    expect(result.factores.totalTurnos).toBe(0);
  });

  test('calcularScorePaciente penaliza correctamente no-shows', async () => {
    const pacienteId = 'test-paciente-noshows';
    await db.delete(turnos).where(eq(turnos.pacienteId, pacienteId));

    const now = new Date();
    const baseDate = new Date(now);
    baseDate.setDate(baseDate.getDate() - 10);

    // 5 turnos: 3 no_shows, 2 atendidos confirmados
    const turnosData = [
      { estado: 'no_asistio', fechaHora: new Date(baseDate.getTime() + 0 * 86400000) },
      { estado: 'no_asistio', fechaHora: new Date(baseDate.getTime() + 7 * 86400000) },
      { estado: 'no_asistio', fechaHora: new Date(baseDate.getTime() + 14 * 86400000) },
      { estado: 'atendido', fechaHora: new Date(baseDate.getTime() + 21 * 86400000), confirmoAsistencia: true },
      { estado: 'atendido', fechaHora: new Date(baseDate.getTime() + 28 * 86400000), confirmoAsistencia: true },
    ];

    await createTestTurnosForPatient(pacienteId, turnosData);

    const result = await calcularScorePaciente(pacienteId, { sucursalId: testSucursalId });
    
    // 3 no-shows de 5 turnos = 60% no-show rate
    // Score no-shows = min(0.6 * 40 * 2, 40) = min(48, 40) = 40
    // Confirmación = 2/5 = 40% → score confirm = (1-0.4) * 20 = 12
    // Sin recordatorios → score recordatorios = 10
    // Cancelaciones = 0
    // Asistencias = 2 → bonificación = min(2 * 0.5, 5) = 1
    // Total = 40 + 12 + 10 - 1 = 61 → nivel 'medio'
    
    expect(result.factores.noShows).toBe(3);
    expect(result.factores.totalTurnos).toBe(5);
    expect(result.nivel).toBe('medio');
  });

  test('calcularScoreBulk produce mismos resultados que calcularScorePaciente individual', async () => {
    const pacienteId1 = 'test-bulk-1';
    const pacienteId2 = 'test-bulk-2';
    
    await db.delete(turnos).where(eq(turnos.pacienteId, pacienteId1));
    await db.delete(turnos).where(eq(turnos.pacienteId, pacienteId2));

    const now = new Date();
    const baseDate = new Date(now);
    baseDate.setDate(baseDate.getDate() - 10);

    // Paciente 1: buen historial
    await createTestTurnosForPatient(pacienteId1, [
      { estado: 'atendido', fechaHora: new Date(baseDate.getTime() + 0 * 86400000), confirmoAsistencia: true },
      { estado: 'atendido', fechaHora: new Date(baseDate.getTime() + 7 * 86400000), confirmoAsistencia: true },
    ]);

    // Paciente 2: mal historial
    await createTestTurnosForPatient(pacienteId2, [
      { estado: 'no_asistio', fechaHora: new Date(baseDate.getTime() + 0 * 86400000) },
      { estado: 'no_asistio', fechaHora: new Date(baseDate.getTime() + 7 * 86400000) },
      { estado: 'cancelada', fechaHora: new Date(baseDate.getTime() + 14 * 86400000), canceladoPor: 'dashboard', confirmoAsistencia: false },
    ]);

    // Calcular individual
    const individual1 = await calcularScorePaciente(pacienteId1, { sucursalId: testSucursalId });
    const individual2 = await calcularScorePaciente(pacienteId2, { sucursalId: testSucursalId });

    // Calcular bulk
    const bulk = await calcularScoreBulk([pacienteId1, pacienteId2], { sucursalId: testSucursalId });
    const bulkMap = new Map(bulk.map(s => [s.pacienteId, s]));

    expect(bulkMap.get(pacienteId1)?.score).toBe(individual1.score);
    expect(bulkMap.get(pacienteId1)?.nivel).toBe(individual1.nivel);
    expect(bulkMap.get(pacienteId2)?.score).toBe(individual2.score);
    expect(bulkMap.get(pacienteId2)?.nivel).toBe(individual2.nivel);
  });
});

// Helper function para tests
async function createTestTurnosForPatient(pacienteId: string, turnosData: Array<{
  estado: string;
  fechaHora: Date;
  confirmoAsistencia?: boolean;
  recordatorio24hEnviado?: boolean;
  recordatorio1hEnviado?: boolean;
  recordatorio24hLeido?: boolean;
  recordatorio1hLeido?: boolean;
  canceladoPor?: string;
}>) {
  await db.delete(turnos).where(eq(turnos.pacienteId, pacienteId));
  
  for (const t of turnosData) {
    await db.insert(turnos).values({
      pacienteId,
      medicoId: 'test-medico-id',
      sucursalId: 'test-sucursal',
      fechaHora: t.fechaHora,
      estado: t.estado as any,
      confirmoAsistencia: t.confirmoAsistencia ?? false,
      recordatorio24hEnviado: t.recordatorio24hEnviado ?? false,
      recordatorio1hEnviado: t.recordatorio1hEnviado ?? false,
      recordatorio24hLeido: t.recordatorio24hLeido ?? false,
      recordatorio1hLeido: t.recordatorio1hLeido ?? false,
      canceladoPor: t.canceladoPor ?? null,
      createdAt: new Date(t.fechaHora.getTime() - 86400000),
    });
  }
}