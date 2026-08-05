import { describe, it, expect } from 'vitest';
import { normalizarFarmaco, verificarReceta } from '@/lib/farmaco-interacciones';

describe('normalizarFarmaco', () => {
  it('convierte a minúsculas y quita unidades', () => {
    expect(normalizarFarmaco('Amoxicilina 500mg')).toBe('amoxicilina');
  });

  it('quita tildes', () => {
    expect(normalizarFarmaco('Ibuprofeno 400 mg')).toBe('ibuprofeno');
  });

  it('quita presentaciones', () => {
    expect(normalizarFarmaco('Amoxicilina Comprimidos')).toBe('amoxicilina');
  });

  it('quita caracteres no alfabéticos', () => {
    expect(normalizarFarmaco('Ácido acetilsalicílico 100mg')).toBe('acido acetilsalicilico');
  });

  it('devuelve string vacío si no hay texto', () => {
    expect(normalizarFarmaco('')).toBe('');
    expect(normalizarFarmaco(null as unknown as string)).toBe('');
  });
});

describe('verificarReceta — alergias', () => {
  it('detecta alergia directa a penicilina al recetar amoxicilina', () => {
    const alertas = verificarReceta({
      medicamento: 'Amoxicilina 500mg',
      alergias: 'Penicilina',
    });
    expect(alertas).toHaveLength(1);
    expect(alertas[0].tipo).toBe('alergia');
    expect(alertas[0].riesgo).toBe('alta');
    expect(alertas[0].con).toBe('Penicilina');
  });

  it('detecta alergia a penicilinas cuando se receta ampicilina', () => {
    const alertas = verificarReceta({
      medicamento: 'Ampicilina 500mg',
      alergias: 'penicilina',
    });
    expect(alertas).toHaveLength(1);
    expect(alertas[0].tipo).toBe('alergia');
  });

  it('no dispara alergia si el medicamento no pertenece a la familia', () => {
    const alertas = verificarReceta({
      medicamento: 'Paracetamol 500mg',
      alergias: 'Penicilina',
    });
    expect(alertas).toHaveLength(0);
  });

  it('maneja alergias vacías sin error', () => {
    const alertas = verificarReceta({ medicamento: 'Amoxicilina 500mg', alergias: null });
    expect(alertas).toHaveLength(0);
  });

  it('soporta múltiples alergias separadas por coma', () => {
    const alertas = verificarReceta({
      medicamento: 'Sulfametoxazol 400mg',
      alergias: 'Penicilina, Sulfas',
    });
    expect(alertas.some((a) => a.tipo === 'alergia')).toBe(true);
  });
});

describe('verificarReceta — interacciones', () => {
  it('detecta warfarina + aspirina como interacción de alto riesgo', () => {
    const alertas = verificarReceta({
      medicamento: 'Aspirina 100mg',
      alergias: null,
      medicamentosActivos: ['Warfarina 5mg'],
    });
    const inter = alertas.find((a) => a.tipo === 'interaccion');
    expect(inter).toBeDefined();
    expect(inter?.riesgo).toBe('alta');
  });

  it('detecta ISRS + triptanes como interacción', () => {
    const alertas = verificarReceta({
      medicamento: 'Sumatriptan 50mg',
      alergias: null,
      medicamentosActivos: ['Sertralina 50mg'],
    });
    expect(alertas.some((a) => a.tipo === 'interaccion' && a.riesgo === 'alta')).toBe(true);
  });

  it('detecta IECA + diurético ahorrador de potasio (espironolactona)', () => {
    const alertas = verificarReceta({
      medicamento: 'Enalapril 10mg',
      alergias: null,
      medicamentosActivos: ['Espironolactona 25mg'],
    });
    const inter = alertas.find((a) => a.tipo === 'interaccion');
    expect(inter).toBeDefined();
    expect(inter?.riesgo).toBe('alta');
  });

  it('no marca interacción con medicamentos sin cruce', () => {
    const alertas = verificarReceta({
      medicamento: 'Paracetamol 500mg',
      alergias: null,
      medicamentosActivos: ['Metformina 850mg'],
    });
    expect(alertas).toHaveLength(0);
  });

  it('no se auto-cruza con el mismo medicamento en recetas vigentes', () => {
    const alertas = verificarReceta({
      medicamento: 'Amoxicilina 500mg',
      alergias: null,
      medicamentosActivos: ['Amoxicilina 500mg'],
    });
    expect(alertas).toHaveLength(0);
  });
});
