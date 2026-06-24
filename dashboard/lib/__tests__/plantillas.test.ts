import { describe, it, expect } from 'vitest';

/**
 * Tests para el sistema de Plantillas WhatsApp.
 *
 * Verifica la lógica de sustitución de variables y el comportamiento
 * esperado de la API de populate. Estos tests son unitarios y no
 * requieren conexión a la base de datos ni a la API de Next.js.
 */

// ============================================================
// Helper: simula la lógica de populate sin la DB
// ============================================================

interface Plantilla {
  id?: string;
  nombre: string;
  contenido: string;
  categoria: string;
  variables: string[];
  activa?: boolean;
}

function populateTemplate(plantilla: Plantilla, datos: Record<string, string>): string {
  let contenido = plantilla.contenido;

  // Reemplazar {{variables}} en el contenido
  for (const [key, value] of Object.entries(datos)) {
    const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'gi');
    contenido = contenido.replace(regex, String(value ?? ''));
  }

  // Reemplazar variables declaradas pero no provistas con ''
  for (const varName of plantilla.variables) {
    if (!(varName in datos)) {
      const regex = new RegExp(`\\{\\{\\s*${varName}\\s*\\}\\}`, 'gi');
      contenido = contenido.replace(regex, '');
    }
  }

  return contenido;
}

// ============================================================
// Plantillas de ejemplo
// ============================================================

const template24h: Plantilla = {
  nombre: 'Recordatorio 24hs',
  contenido: 'Hola {{nombre}}! Recordatorio: turno mañana {{fecha_hora}} con {{medico_nombre}}.',
  categoria: 'recordatorios',
  variables: ['nombre', 'fecha_hora', 'medico_nombre'],
};

const template1h: Plantilla = {
  nombre: 'Recordatorio 1h',
  contenido: 'Recordatorio: en 1 hora tienes turno con {{medico_nombre}}.',
  categoria: 'recordatorios',
  variables: ['medico_nombre'],
};

const templateConfirmacion: Plantilla = {
  nombre: 'Confirmación Turno',
  contenido:
    'Turno confirmado! {{paciente_nombre}}, te esperamos el {{fecha_hora}} con {{medico_nombre}}.',
  categoria: 'turnos',
  variables: ['paciente_nombre', 'fecha_hora', 'medico_nombre', 'motivo'],
};

// ============================================================
// Tests
// ============================================================

describe('Plantillas WhatsApp - Sustitución de variables', () => {
  it('debe reemplazar una variable simple en la plantilla', () => {
    const resultado = populateTemplate(template1h, {
      medico_nombre: 'Dr. García',
    });
    expect(resultado).toBe('Recordatorio: en 1 hora tienes turno con Dr. García.');
  });

  it('debe reemplazar múltiples variables', () => {
    const resultado = populateTemplate(template24h, {
      nombre: 'María',
      fecha_hora: 'lunes 25/05 a las 10:30',
      medico_nombre: 'Dr. García',
    });
    expect(resultado).toBe(
      'Hola María! Recordatorio: turno mañana lunes 25/05 a las 10:30 con Dr. García.',
    );
  });

  it('debe limpiar variables no provistas', () => {
    const resultado = populateTemplate(templateConfirmacion, {
      paciente_nombre: 'Juan',
      fecha_hora: '25/05/2026 15:00',
      medico_nombre: 'Dra. López',
      // motivo no se provee
    });
    expect(resultado).toBe(
      'Turno confirmado! Juan, te esperamos el 25/05/2026 15:00 con Dra. López.',
    );
    // motivo se reemplazó con '' (se limpió la variable {{motivo}})
    expect(resultado).not.toContain('{{motivo}}');
  });

  it('debe manejar espacios alrededor de las variables', () => {
    const template = { ...template24h, contenido: 'Hola {{ nombre }}! Tu turno: {{ fecha_hora }}' };
    const resultado = populateTemplate(template, {
      nombre: 'Pedro',
      fecha_hora: 'hoy 14:00',
      medico_nombre: 'Dr. Smith',
    });
    expect(resultado).toBe('Hola Pedro! Tu turno: hoy 14:00');
    // medico_nombre también se limpia porque no se usó en el template
    expect(resultado).not.toContain('{{');
  });

  it('debe funcionar con variables vacías', () => {
    const resultado = populateTemplate(template24h, {
      nombre: '',
      fecha_hora: '',
      medico_nombre: 'Dr. Test',
    });
    expect(resultado).toBe('Hola ! Recordatorio: turno mañana  con Dr. Test.');
  });
});

describe('Plantillas WhatsApp - Casos borde', () => {
  it('debe preservar texto sin variables', () => {
    const template: Plantilla = {
      nombre: 'Texto plano',
      contenido: 'Mensaje sin variables.',
      categoria: 'alertas',
      variables: [],
    };
    const resultado = populateTemplate(template, { algo: 'valor' });
    expect(resultado).toBe('Mensaje sin variables.');
  });

  it('debe reemplazar la misma variable múltiples veces', () => {
    const template: Plantilla = {
      nombre: 'Multi-var',
      contenido: '{{x}} + {{x}} = {{y}}',
      categoria: 'test',
      variables: ['x', 'y'],
    };
    const resultado = populateTemplate(template, { x: '2', y: '4' });
    expect(resultado).toBe('2 + 2 = 4');
  });

  it('debe ignorar variables no declaradas en la plantilla', () => {
    const resultado = populateTemplate(template1h, {
      medico_nombre: 'Dr. López',
      variable_extra: 'no debería aparecer',
    });
    expect(resultado).toBe('Recordatorio: en 1 hora tienes turno con Dr. López.');
  });

  it('debe manejar caracteres especiales en los valores', () => {
    const resultado = populateTemplate(template24h, {
      nombre: 'María José',
      fecha_hora: '25/05/2026 10:30hs',
      medico_nombre: 'Dr. López (Médico clínico)',
    });
    expect(resultado).toContain('María José');
    expect(resultado).toContain('Dr. López (Médico clínico)');
  });
});

describe('Plantillas WhatsApp - Extracción de variables', () => {
  it('debe detectar variables en el contenido', () => {
    const extractVars = (content: string): string[] => {
      const matches = content.match(/\{\{(\w+)\}\}/g) || [];
      return Array.from(new Set(matches.map((v) => v.replace(/[{}]/g, ''))));
    };

    expect(extractVars('Hola {{nombre}}! Turno con {{medico_nombre}}')).toEqual([
      'nombre',
      'medico_nombre',
    ]);
    expect(extractVars('Sin variables')).toEqual([]);
    expect(extractVars('{{a}} y {{a}} otra vez')).toEqual(['a']);
  });
});
