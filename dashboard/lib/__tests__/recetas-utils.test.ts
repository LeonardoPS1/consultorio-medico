import { describe, it, expect } from 'vitest';
import { generarHashVerificacion, verificarHash } from '@/lib/services/recetas';
import { mapEstadoDisplay, ESTADOS_ACTIVOS, ESTADO_DISPLAY_LABELS } from '@/lib/receta-utils';

const recetaBase = {
  id: 'abc-123',
  pacienteId: 'pac-456',
  medicamento: 'Amoxicilina',
  dosis: '500mg',
  fechaInicio: '2026-07-11',
};

describe('generarHashVerificacion', () => {
  it('genera un hash de 64 caracteres hexadecimales', () => {
    const hash = generarHashVerificacion(recetaBase);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('produce el mismo hash para la misma entrada', () => {
    const hash1 = generarHashVerificacion(recetaBase);
    const hash2 = generarHashVerificacion(recetaBase);
    expect(hash1).toBe(hash2);
  });

  it('produce hash diferente si cambia medicamento', () => {
    const hash1 = generarHashVerificacion(recetaBase);
    const hash2 = generarHashVerificacion({ ...recetaBase, medicamento: 'Ibuprofeno' });
    expect(hash1).not.toBe(hash2);
  });

  it('produce hash diferente si cambia dosis', () => {
    const hash1 = generarHashVerificacion(recetaBase);
    const hash2 = generarHashVerificacion({ ...recetaBase, dosis: '250mg' });
    expect(hash1).not.toBe(hash2);
  });

  it('produce hash diferente si cambia id del paciente', () => {
    const hash1 = generarHashVerificacion(recetaBase);
    const hash2 = generarHashVerificacion({ ...recetaBase, pacienteId: 'otro-paciente' });
    expect(hash1).not.toBe(hash2);
  });
});

describe('verificarHash', () => {
  it('retorna valido:true si el hash coincide', () => {
    const hash = generarHashVerificacion(recetaBase);
    const result = verificarHash({ ...recetaBase, hashVerificacion: hash });
    expect(result.valido).toBe(true);
    expect(result.regenerado).toBe(hash);
  });

  it('retorna valido:false si el hash no coincide', () => {
    const result = verificarHash({
      ...recetaBase,
      hashVerificacion: '0000000000000000000000000000000000000000000000000000000000000000',
    });
    expect(result.valido).toBe(false);
  });

  it('retorna regenerado cuando hashVerificacion es null', () => {
    const result = verificarHash({ ...recetaBase, hashVerificacion: null });
    expect(result.valido).toBe(false);
    expect(result.regenerado).toBeDefined();
    expect(result.regenerado).toMatch(/^[a-f0-9]{64}$/);
  });

  it('retorna regenerado cuando hashVerificacion es undefined', () => {
    const result = verificarHash({ ...recetaBase });
    expect(result.valido).toBe(false);
    expect(result.regenerado).toBeDefined();
  });
});

describe('generarHashVerificacion — secreto en test', () => {
  it('usa el fallback de desarrollo cuando no hay RECETA_HASH_SECRET', () => {
    const hash = generarHashVerificacion(recetaBase);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe('mapEstadoDisplay — vocabulario legacy (varchar prod)', () => {
  const hoy = new Date().toISOString().split('T')[0];
  const ayer = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const manana = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  it('estado legacy "activa" con fecha_fin futura → activa', () => {
    expect(mapEstadoDisplay('activa', manana)).toBe('activa');
  });

  it('estado legacy "activa" con fecha_fin nula → activa', () => {
    expect(mapEstadoDisplay('activa', null)).toBe('activa');
  });

  it('estado legacy "activa" con fecha_fin pasada → vencida', () => {
    expect(mapEstadoDisplay('activa', ayer)).toBe('vencida');
  });

  it('estado legacy "vencida" → vencida (independiente de fecha)', () => {
    expect(mapEstadoDisplay('vencida', manana)).toBe('vencida');
  });

  it('estado "expirada" → vencida', () => {
    expect(mapEstadoDisplay('expirada', null)).toBe('vencida');
  });

  it('estado "historial" → historial aunque tenga fecha pasada', () => {
    expect(mapEstadoDisplay('historial', ayer)).toBe('historial');
  });

  it('estado enum "emitida" con fecha_fin futura → activa', () => {
    expect(mapEstadoDisplay('emitida', manana)).toBe('activa');
  });

  it('estado enum "emitida" con fecha_fin pasada → vencida', () => {
    expect(mapEstadoDisplay('emitida', ayer)).toBe('vencida');
  });
});

describe('ESTADOS_ACTIVOS — incluye legacy y enum', () => {
  it('contiene "activa" (dato legacy de prod varchar)', () => {
    expect(ESTADOS_ACTIVOS).toContain('activa');
  });

  it('sigue conteniendo los estados nuevos del enum', () => {
    expect(ESTADOS_ACTIVOS).toEqual(expect.arrayContaining(['borrador', 'emitida', 'entregada']));
  });
});

describe('ESTADO_DISPLAY_LABELS', () => {
  it('tiene etiquetas para los tres estados visuales', () => {
    expect(ESTADO_DISPLAY_LABELS).toEqual({
      activa: 'Activa',
      vencida: 'Vencida',
      historial: 'Historial',
    });
  });
});
