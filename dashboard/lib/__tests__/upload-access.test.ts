import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Tests de autorización de lectura de archivos subidos (`/api/uploads/[slug]`).
 *
 * `puedeAccederArchivo` decide si el llamante puede leer un archivo del directorio
 * de uploads. Sin registro dueño no hay acceso, de modo que adivinar un nombre de
 * archivo nunca alcanza.
 */

const dbState = vi.hoisted(() => ({ results: [] as unknown[][] }));

vi.mock('@/lib/db', () => {
  const buildChain = (): Record<string, unknown> => {
    const builder: Record<string, unknown> = {};
    builder.from = () => builder;
    builder.leftJoin = () => builder;
    builder.where = () => builder;
    builder.limit = () => Promise.resolve(dbState.results.shift() ?? []);
    return builder;
  };
  return { db: { select: () => buildChain() } };
});

import { puedeAccederArchivo, uploadUrlFor } from '@/lib/upload-access';

const TENANT = '11111111-1111-1111-1111-111111111111';
const OTRO_TENANT = '22222222-2222-2222-2222-222222222222';
const PLACEHOLDER = '00000000-0000-0000-0000-000000000000';
const PACIENTE = '33333333-3333-3333-3333-333333333333';

beforeEach(() => {
  dbState.results = [];
});

describe('uploadUrlFor', () => {
  it('construye la URL pública del archivo', () => {
    expect(uploadUrlFor('receta-123.pdf')).toBe('/api/uploads/receta-123.pdf');
  });
});

describe('puedeAccederArchivo — validaciones sin consulta', () => {
  it('niega un nombre de archivo vacío', async () => {
    await expect(puedeAccederArchivo('', { tenantId: TENANT })).resolves.toBe(false);
  });

  it('niega una sesión de dashboard sin tenant', async () => {
    await expect(puedeAccederArchivo('a.pdf', {})).resolves.toBe(false);
    await expect(puedeAccederArchivo('a.pdf', { tenantId: null })).resolves.toBe(false);
  });

  it('niega el tenant placeholder de filas legacy', async () => {
    await expect(puedeAccederArchivo('a.pdf', { tenantId: PLACEHOLDER })).resolves.toBe(false);
  });
});

describe('puedeAccederArchivo — portal del paciente', () => {
  it('permite un archivo de un documento propio', async () => {
    dbState.results = [[{ id: 'doc-1' }]];
    await expect(puedeAccederArchivo('a.pdf', { pacienteId: PACIENTE })).resolves.toBe(true);
  });

  it('niega un archivo que no pertenece a sus documentos', async () => {
    dbState.results = [[]];
    await expect(puedeAccederArchivo('a.pdf', { pacienteId: PACIENTE })).resolves.toBe(false);
  });
});

describe('puedeAccederArchivo — dashboard', () => {
  it('permite un documento del tenant', async () => {
    dbState.results = [[{ id: 'doc-1' }]];
    await expect(puedeAccederArchivo('a.pdf', { tenantId: TENANT })).resolves.toBe(true);
  });

  it('permite el logo del propio tenant cuando no hay documento', async () => {
    dbState.results = [[], [{ id: TENANT }]];
    await expect(puedeAccederArchivo('logo.png', { tenantId: TENANT })).resolves.toBe(true);
  });

  it('niega un archivo de otro tenant', async () => {
    dbState.results = [[], []];
    await expect(puedeAccederArchivo('a.pdf', { tenantId: OTRO_TENANT })).resolves.toBe(false);
  });

  it('prioriza la sesión de portal sobre la de dashboard', async () => {
    dbState.results = [[]];
    await expect(
      puedeAccederArchivo('a.pdf', { tenantId: TENANT, pacienteId: PACIENTE }),
    ).resolves.toBe(false);
  });
});
