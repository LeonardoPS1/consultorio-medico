import { describe, it, expect } from 'vitest';
import { validatePasswordStrength, passwordErrorsToString } from '@/lib/password-validator';

describe('validatePasswordStrength', () => {
  it('rechaza contraseña muy corta', () => {
    const result = validatePasswordStrength('Ab1!');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Mínimo 8 caracteres');
  });

  it('rechaza contraseña sin mayúscula', () => {
    const result = validatePasswordStrength('abcdef1!@');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Al menos una mayúscula');
  });

  it('rechaza contraseña sin minúscula', () => {
    const result = validatePasswordStrength('ABCDEF1!@');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Al menos una minúscula');
  });

  it('rechaza contraseña sin número', () => {
    const result = validatePasswordStrength('Abcdefg!@');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Al menos un número');
  });

  it('rechaza contraseña sin símbolo', () => {
    const result = validatePasswordStrength('Abcdefg1');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Al menos un símbolo especial (!@#$%...)');
  });

  it('acepta contraseña válida', () => {
    const result = validatePasswordStrength('Abcdef1!@');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.score).toBe(5);
  });

  it('acumula múltiples errores', () => {
    const result = validatePasswordStrength('a');
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(4);
    expect(result.score).toBeLessThanOrEqual(1);
  });

  it('puntaje 0 para string vacío', () => {
    const result = validatePasswordStrength('');
    expect(result.score).toBe(0);
    expect(result.valid).toBe(false);
  });
});

describe('passwordErrorsToString', () => {
  it('retorna string vacío si no hay errores', () => {
    expect(passwordErrorsToString([])).toBe('');
  });

  it('formatea un solo error', () => {
    expect(passwordErrorsToString(['Mínimo 8 caracteres'])).toBe(
      'La contraseña debe tener: Mínimo 8 caracteres.',
    );
  });

  it('formatea múltiples errores', () => {
    const result = passwordErrorsToString(['Mínimo 8 caracteres', 'Al menos una mayúscula']);
    expect(result).toBe('La contraseña debe tener: Mínimo 8 caracteres, Al menos una mayúscula.');
  });
});
