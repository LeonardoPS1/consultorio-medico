import { describe, it, expect, beforeEach } from 'vitest';
import {
  isAccountLocked,
  incrementFailedAttempts,
  resetFailedAttempts,
  getRemainingAttempts,
} from '@/lib/account-lockout';

describe('account-lockout', () => {
  beforeEach(async () => {
    // Limpiar el mapa antes de cada test
    // Accedemos al mapa interno via las funciones de reset
    await resetFailedAttempts('test@example.com');
    await resetFailedAttempts('otro@test.com');
  });

  describe('incrementFailedAttempts', () => {
    it('primer intento no bloquea', async () => {
      const result = await incrementFailedAttempts('test@example.com');
      expect(result.locked).toBe(false);
    });

    it('bloquea después de 5 intentos', async () => {
      for (let i = 0; i < 5; i++) {
        await incrementFailedAttempts('test@example.com');
      }
      const result = await incrementFailedAttempts('test@example.com');
      expect(result.locked).toBe(true);
      expect(result.remainingMinutes).toBe(15);
    });

    it('no bloquea si fallan 3 veces (4to intento)', async () => {
      for (let i = 0; i < 3; i++) {
        await incrementFailedAttempts('test@example.com');
      }
      const result = await incrementFailedAttempts('test@example.com');
      expect(result.locked).toBe(false);
    });
  });

  describe('isAccountLocked', () => {
    it('no está bloqueada si no hay intentos', async () => {
      const result = await isAccountLocked('test@example.com');
      expect(result.locked).toBe(false);
    });

    it('está bloqueada tras 5 intentos', async () => {
      for (let i = 0; i < 6; i++) {
        await incrementFailedAttempts('test@example.com');
      }
      const result = await isAccountLocked('test@example.com');
      expect(result.locked).toBe(true);
    });

    it('case insensitive para email', async () => {
      await incrementFailedAttempts('Test@Example.com');
      for (let i = 0; i < 5; i++) {
        await incrementFailedAttempts('test@example.com');
      }
      const result = await isAccountLocked('TEST@EXAMPLE.COM');
      expect(result.locked).toBe(true);
    });
  });

  describe('resetFailedAttempts', () => {
    it('resetea contador después de bloqueo', async () => {
      for (let i = 0; i < 6; i++) {
        await incrementFailedAttempts('test@example.com');
      }
      expect(await isAccountLocked('test@example.com')).toBe(true);

      await resetFailedAttempts('test@example.com');
      expect(await isAccountLocked('test@example.com')).toBe(false);
    });
  });

  describe('getRemainingAttempts', () => {
    it('devuelve 5 si no hay intentos', async () => {
      expect(await getRemainingAttempts('test@example.com')).toBe(5);
    });

    it('devuelve intentos restantes', async () => {
      await incrementFailedAttempts('test@example.com');
      await incrementFailedAttempts('test@example.com');
      expect(await getRemainingAttempts('test@example.com')).toBe(3);
    });

    it('devuelve 0 si está bloqueada', async () => {
      for (let i = 0; i < 6; i++) {
        await incrementFailedAttempts('test@example.com');
      }
      expect(await getRemainingAttempts('test@example.com')).toBe(0);
    });
  });
});
