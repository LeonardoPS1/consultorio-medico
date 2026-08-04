import { describe, it, expect } from 'vitest';
import { buildOpenApiSpec, getPublicPaths } from '@/lib/api-docs';

describe('OpenAPI Spec', () => {
  it('genera un spec válido con todos los campos requeridos', () => {
    const spec = buildOpenApiSpec();

    expect(spec.openapi).toBe('3.1.0');
    expect(spec.info).toBeDefined();
    expect((spec.info as Record<string, unknown>).title).toBe('AicoreMed API');
    expect((spec.info as Record<string, unknown>).version).toBe('1.0.0');
    expect(spec.servers).toBeDefined();
    expect(Array.isArray(spec.servers)).toBe(true);
    expect(spec.paths).toBeDefined();
  });

  it('incluye solo paths públicos /api/v1/*', () => {
    const paths = getPublicPaths();

    expect(paths.length).toBeGreaterThan(0);

    for (const path of paths) {
      expect(path).toMatch(/^\/api\/v1\//);
    }
  });

  it('NO incluye paths internos prohibidos', () => {
    const paths = getPublicPaths();

    const forbiddenPrefixes = [
      '/api/internal',
      '/api/recuperacion',
      '/api/deploy',
      '/api/auth/impersonate',
    ];

    for (const path of paths) {
      for (const prefix of forbiddenPrefixes) {
        expect(path).not.toContain(prefix);
      }
    }
  });

  it('contiene los 7 endpoints públicos documentados', () => {
    const paths = getPublicPaths();

    expect(paths).toContain('/api/v1/medicos');
    expect(paths).toContain('/api/v1/servicios');
    expect(paths).toContain('/api/v1/horarios');
    expect(paths).toContain('/api/v1/turnos/disponibles');
    expect(paths).toContain('/api/v1/turnos');
    expect(paths).toContain('/api/v1/turnos/{id}');
    expect(paths).toContain('/api/v1/pacientes/{id}');
  });

  it('tiene securitySchemes apiKey configurado', () => {
    const spec = buildOpenApiSpec();
    const components = spec.components as Record<string, unknown>;
    const securitySchemes = components?.securitySchemes as Record<string, unknown>;

    expect(securitySchemes?.apiKey).toBeDefined();
    expect((securitySchemes?.apiKey as Record<string, unknown>)?.type).toBe('apiKey');
    expect((securitySchemes?.apiKey as Record<string, unknown>)?.name).toBe('x-api-key');
  });

  it('tiene los tags requeridos en las operaciones', () => {
    const spec = buildOpenApiSpec();
    const paths = spec.paths as Record<string, Record<string, unknown>>;
    const allTags = new Set<string>();

    for (const pathOps of Object.values(paths)) {
      if (!pathOps) continue;
      for (const methodOps of Object.values(pathOps)) {
        const tags = (methodOps as Record<string, unknown>)?.tags as string[] | undefined;
        if (tags) tags.forEach((t) => allTags.add(t));
      }
    }

    expect(allTags.has('Médicos')).toBe(true);
    expect(allTags.has('Servicios')).toBe(true);
    expect(allTags.has('Horarios')).toBe(true);
    expect(allTags.has('Turnos')).toBe(true);
    expect(allTags.has('Pacientes')).toBe(true);
  });
});
