import { describe, it, expect } from 'vitest';
import { getKpiConfig } from '@/lib/kpi-config';

describe('getKpiConfig', () => {
  it('retorna config para tipo calendar', () => {
    const config = getKpiConfig('calendar');
    expect(config).toBeDefined();
    expect(config.icon).toBeDefined();
    expect(config.gradient).toBe('from-blue-500 to-blue-600');
    expect(config.bg).toBe('bg-blue-50 dark:bg-blue-950/30');
  });

  it('retorna config para tipo users', () => {
    const config = getKpiConfig('users');
    expect(config.gradient).toBe('from-emerald-500 to-emerald-600');
    expect(config.bg).toBe('bg-emerald-50 dark:bg-emerald-950/30');
  });

  it('retorna config para tipo messages', () => {
    const config = getKpiConfig('messages');
    expect(config.gradient).toBe('from-amber-500 to-amber-600');
    expect(config.bg).toBe('bg-amber-50 dark:bg-amber-950/30');
  });

  it('retorna config para tipo alert', () => {
    const config = getKpiConfig('alert');
    expect(config.gradient).toBe('from-red-500 to-red-600');
    expect(config.bg).toBe('bg-red-50 dark:bg-red-950/30');
  });

  it('retorna config para tipo response', () => {
    const config = getKpiConfig('response');
    expect(config.gradient).toBe('from-purple-500 to-purple-600');
    expect(config.bg).toBe('bg-purple-50 dark:bg-purple-950/30');
  });

  it('retorna config para tipo today', () => {
    const config = getKpiConfig('today');
    expect(config.gradient).toBe('from-cyan-500 to-cyan-600');
    expect(config.bg).toBe('bg-cyan-50 dark:bg-cyan-950/30');
  });

  it('retorna default para tipo desconocido', () => {
    const config = getKpiConfig('inexistente');
    expect(config.gradient).toBe('from-gray-500 to-gray-600');
    expect(config.bg).toBe('bg-gray-50 dark:bg-gray-950/30');
  });

  it('el icono está definido y no es null', () => {
    const config = getKpiConfig('users');
    expect(config.icon).toBeDefined();
    expect(config.icon).not.toBeNull();
  });

  it('el objeto tiene la forma correcta (icon, gradient, bg)', () => {
    const config = getKpiConfig('calendar');
    expect(config).toHaveProperty('icon');
    expect(config).toHaveProperty('gradient');
    expect(config).toHaveProperty('bg');
  });
});
