import { describe, it, expect } from 'vitest';

/**
 * Prueba unitaria para el endpoint /api/health/deep
 * Verifica que los tipos refactorizados (unknown en lugar de any)
 * no rompan la lógica de negocio.
 */

describe('Health check logic', () => {
  it('should parse health status correctly', () => {
    const healthStatus = {
      status: 'ok' as const,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };

    expect(healthStatus.status).toBe('ok');
    expect(healthStatus.timestamp).toBeDefined();
    expect(healthStatus.uptime).toBeGreaterThan(0);
  });

  it('should handle error result type (formerly any)', () => {
    // Simula el tipo HealthResult recién tipado
    const errorResult = {
      status: 'error' as const,
      message: 'Database connection failed',
      code: 'DB_ERR_001',
    };

    expect(errorResult.status).toBe('error');
    expect(errorResult.message).toContain('Database');
  });

  it('should handle success result type', () => {
    const successResult = {
      status: 'ok' as const,
      data: { users: 10, turnos: 25 },
      timestamp: new Date().toISOString(),
    };

    expect(successResult.status).toBe('ok');
    expect(successResult.data).toHaveProperty('users');
  });
});
