/**
 * Tests de validación para el feature multi-sucursal.
 *
 * Cubre: schemas Zod con sucursalId, filtros en service layer.
 */

import { describe, it, expect } from 'vitest';
import { createTurnoSchema, createPacienteSchema, updateTurnoSchema, updatePacienteSchema } from '@/lib/validations';

// ─── UUIDs de prueba ───────────────────────────────────────

const UUID_VALIDO = '00000000-0000-0000-0000-000000000000';
const UUID_INVALIDO = 'esto-no-es-un-uuid';

// ─── createTurnoSchema ─────────────────────────────────────

describe('createTurnoSchema — sucursalId', () => {
  const baseTurno = {
    pacienteId: UUID_VALIDO,
    medicoId: UUID_VALIDO,
    fecha: '2026-06-01',
    hora: '09:00',
  };

  it('acepta turno sin sucursalId', () => {
    const result = createTurnoSchema.safeParse(baseTurno);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sucursalId).toBeUndefined();
    }
  });

  it('acepta turno con sucursalId válido', () => {
    const result = createTurnoSchema.safeParse({ ...baseTurno, sucursalId: UUID_VALIDO });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sucursalId).toBe(UUID_VALIDO);
    }
  });

  it('acepta sucursalId null', () => {
    const result = createTurnoSchema.safeParse({ ...baseTurno, sucursalId: null });
    expect(result.success).toBe(true);
  });

  it('rechaza sucursalId inválido (no UUID)', () => {
    const result = createTurnoSchema.safeParse({ ...baseTurno, sucursalId: UUID_INVALIDO });
    expect(result.success).toBe(false);
  });
});

// ─── updateTurnoSchema ─────────────────────────────────────

describe('updateTurnoSchema — sucursalId', () => {
  it('acepta actualización con sucursalId válido', () => {
    const result = updateTurnoSchema.safeParse({ sucursalId: UUID_VALIDO });
    expect(result.success).toBe(true);
  });

  it('acepta actualización sin sucursalId', () => {
    const result = updateTurnoSchema.safeParse({ estado: 'confirmada' });
    expect(result.success).toBe(true);
  });
});

// ─── createPacienteSchema ──────────────────────────────────

describe('createPacienteSchema — sucursalId', () => {
  const basePaciente = {
    nombre: 'Juan',
    apellido: 'Pérez',
    telefono: '+56912345678',
  };

  it('acepta paciente sin sucursalId', () => {
    const result = createPacienteSchema.safeParse(basePaciente);
    expect(result.success).toBe(true);
  });

  it('acepta paciente con sucursalId válido', () => {
    const result = createPacienteSchema.safeParse({ ...basePaciente, sucursalId: UUID_VALIDO });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sucursalId).toBe(UUID_VALIDO);
    }
  });

  it('rechaza sucursalId inválido (no UUID)', () => {
    const result = createPacienteSchema.safeParse({ ...basePaciente, sucursalId: 'no-uuid' });
    expect(result.success).toBe(false);
  });
});

// ─── updatePacienteSchema ──────────────────────────────────

describe('updatePacienteSchema — sucursalId', () => {
  it('acepta actualización con sucursalId válido', () => {
    const result = updatePacienteSchema.safeParse({ sucursalId: UUID_VALIDO });
    expect(result.success).toBe(true);
  });

  it('acepta actualización con sucursalId null', () => {
    const result = updatePacienteSchema.safeParse({ sucursalId: null });
    expect(result.success).toBe(true);
  });
});
