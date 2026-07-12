import { describe, it, expect } from 'vitest';
import { createPacienteSchema, updatePacienteSchema } from '@/lib/validations';
import { validateRut } from '@/lib/utils';

const pacienteValido = {
  nombre: 'Juan',
  apellido: 'Pérez',
  telefono: '+56912345678',
};

describe('createPacienteSchema', () => {
  it('acepta datos válidos completos', () => {
    const result = createPacienteSchema.safeParse({
      ...pacienteValido,
      email: 'juan@example.com',
      obraSocial: 'Fonasa',
    });
    expect(result.success).toBe(true);
  });

  it('acepta datos válidos mínimos (solo obligatorios)', () => {
    const result = createPacienteSchema.safeParse(pacienteValido);
    expect(result.success).toBe(true);
  });

  it('rechaza datos sin nombre', () => {
    const result = createPacienteSchema.safeParse({
      apellido: 'Pérez',
      telefono: '+56912345678',
    });
    expect(result.success).toBe(false);
  });

  it('rechaza datos sin apellido', () => {
    const result = createPacienteSchema.safeParse({
      nombre: 'Juan',
      telefono: '+56912345678',
    });
    expect(result.success).toBe(false);
  });

  it('rechaza datos sin teléfono', () => {
    const result = createPacienteSchema.safeParse({
      nombre: 'Juan',
      apellido: 'Pérez',
    });
    expect(result.success).toBe(false);
  });

  it('rechaza email inválido', () => {
    const result = createPacienteSchema.safeParse({
      ...pacienteValido,
      email: 'no-es-un-email',
    });
    expect(result.success).toBe(false);
  });

  it('acepta email vacío como opcional', () => {
    const result = createPacienteSchema.safeParse({
      ...pacienteValido,
      email: '',
    });
    expect(result.success).toBe(true);
  });

  it('rechaza teléfono muy corto (menos de 7 dígitos)', () => {
    const result = createPacienteSchema.safeParse({
      ...pacienteValido,
      telefono: '123',
    });
    expect(result.success).toBe(false);
  });

  it('acepta teléfono sin prefijo +', () => {
    const result = createPacienteSchema.safeParse({
      ...pacienteValido,
      telefono: '56912345678',
    });
    expect(result.success).toBe(true);
  });
});

describe('updatePacienteSchema', () => {
  it('acepta actualización parcial de un campo', () => {
    const result = updatePacienteSchema.safeParse({ nombre: 'Carlos' });
    expect(result.success).toBe(true);
  });

  it('acepta objeto vacío', () => {
    const result = updatePacienteSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('rechaza email inválido en actualización', () => {
    const result = updatePacienteSchema.safeParse({ email: 'invalido' });
    expect(result.success).toBe(false);
  });

  it('acepta actualización con teléfono válido', () => {
    const result = updatePacienteSchema.safeParse({ telefono: '+56998765432' });
    expect(result.success).toBe(true);
  });
});

describe('validateRut', () => {
  it('acepta RUT chileno válido 12.345.678-5', () => {
    expect(validateRut('12.345.678-5')).toBe(true);
  });

  it('acepta RUT sin puntos ni guión 123456785', () => {
    expect(validateRut('123456785')).toBe(true);
  });

  it('acepta RUT con dígito K', () => {
    expect(validateRut('15.432.321-K')).toBe(true);
  });

  it('rechaza RUT con dígito verificador incorrecto', () => {
    expect(validateRut('12.345.678-0')).toBe(false);
  });

  it('rechaza RUT muy corto', () => {
    expect(validateRut('1')).toBe(false);
  });

  it('rechaza string vacío', () => {
    expect(validateRut('')).toBe(false);
  });
});
