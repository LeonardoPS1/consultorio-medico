import { describe, it, expect } from 'vitest';
import {
  cn,
  formatPhone,
  truncate,
  getInitials,
  slugify,
  getTurnoColor,
  getTurnoLabel,
} from '@/lib/utils';

describe('cn', () => {
  it('combina clases simples', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('filtra valores falsy', () => {
    expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz');
  });

  it('mergea clases de Tailwind', () => {
    expect(cn('px-4', 'px-2')).toBe('px-2');
  });

  it('acepta objetos condicionales', () => {
    expect(cn('base', { active: true, hidden: false })).toBe('base active');
  });
});

describe('formatPhone', () => {
  it('formatea número argentino con 549', () => {
    expect(formatPhone('+5491155551234')).toBe('11 5555-1234');
  });

  it('formatea número sin código de país', () => {
    expect(formatPhone('+541155551234')).toBe('+541155551234');
  });

  it('retorna vacío si no hay número', () => {
    expect(formatPhone('')).toBe('');
  });

  it('retorna el mismo si no matchea formato', () => {
    expect(formatPhone('abc')).toBe('abc');
  });
});

describe('truncate', () => {
  it('no trunca texto corto', () => {
    expect(truncate('hola')).toBe('hola');
  });

  it('trunca texto largo por defecto a 100', () => {
    const long = 'a'.repeat(150);
    expect(truncate(long)).toBe('a'.repeat(100) + '...');
  });

  it('trunca a longitud custom', () => {
    const long = 'a'.repeat(50);
    expect(truncate(long, 10)).toBe('a'.repeat(10) + '...');
  });

  it('retorna exacto cuando text.length === length', () => {
    expect(truncate('hola', 4)).toBe('hola');
  });
});

describe('getInitials', () => {
  it('retorna iniciales en mayúscula', () => {
    expect(getInitials('juan', 'perez')).toBe('JP');
  });

  it('maneja nombres con acentos', () => {
    expect(getInitials('María', 'López')).toBe('ML');
  });

  it('retorna una letra si falta apellido', () => {
    expect(getInitials('Ana', '')).toBe('A');
  });
});

describe('slugify', () => {
  it('convierte texto a slug', () => {
    expect(slugify('Hola Mundo')).toBe('hola-mundo');
  });

  it('elimina caracteres especiales', () => {
    expect(slugify('¿Qué pasó?')).toBe('qu-pas');
  });

  it('evita guiones duplicados', () => {
    expect(slugify('foo   bar')).toBe('foo-bar');
  });

  it('trim resultado y remueve guiones extremos', () => {
    expect(slugify('  test  ')).toBe('test');
    expect(slugify('  hola  ')).toBe('hola');
  });
});

describe('getTurnoColor', () => {
  it('retorna color para pendiente', () => {
    expect(getTurnoColor('pendiente')).toBe('#F59E0B');
  });

  it('retorna gris por defecto para estado desconocido', () => {
    expect(getTurnoColor('inexistente')).toBe('#6B7280');
  });

  it('retorna color para cancelada', () => {
    expect(getTurnoColor('cancelada')).toBe('#EF4444');
  });
});

describe('getTurnoLabel', () => {
  it('retorna label para pendiente', () => {
    expect(getTurnoLabel('pendiente')).toBe('Pendiente');
  });

  it('retorna label para en_atencion', () => {
    expect(getTurnoLabel('en_atencion')).toBe('En atención');
  });

  it('retorna el mismo texto si no hay label', () => {
    expect(getTurnoLabel('desconocido')).toBe('desconocido');
  });
});
