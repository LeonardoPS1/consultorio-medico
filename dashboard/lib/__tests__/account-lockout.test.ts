import { describe, it, expect, beforeEach } from 'vitest';
import {
  isAccountLocked,
  incrementFailedAttempts,
  resetFailedAttempts,
  getRemainingAttempts,
} from '@/lib/account-lockout';

describe('account-lockout', () => {
  beforeEach(() => {
    // Limpiar el mapa antes de cada test
    // Accedemos al mapa interno via las funciones de reset
    resetFailedAttempts('test@example.com');
    resetFailedAttempts('otro@test.com');
  });

  describe('incrementFailedAttempts', () => {
    it('primer intento no bloquea', () => {
      const result = incrementFailedAttempts('test@example.com');
      expect(result.locked).toBe(false);
    });

    it('bloquea después de 5 intentos', () => {
      for (let i = 0; i < 5; i++) {
        incrementFailedAttempts('test@example.com');
      }
      const result = incrementFailedAttempts('test@example.com');
      expect(result.locked).toBe(true);
      expect(result.remainingMinutes).toBe(15);
    });

    it('no bloquea si fallan 3 veces (4to intento)', () => {
      for (let i = 0; i < 3; i++) {
        incrementFailedAttempts('test@example.com');
      }
      const result = incrementFailedAttempts('test@example.com');
      expect(result.locked).toBe(false);
    });
  });

  describe('isAccountLocked', () => {
    it('no está bloqueada si no hay intentos', () => {
      const result = isAccountLocked('test@example.com');
      expect(result.locked).toBe(false);
    });

    it('está bloqueada tras 5 intentos', () => {
      for (let i = 0; i < 6; i++) {
        incrementFailedAttempts('test@example.com');
      }
      const result = isAccountLocked('test@example.com');
      expect(result.locked).toBe(true);
    });

    it('case insensitive para email', () => {
      incrementFailedAttempts('Test@Example.com');
      for (let i = 0; i < 5; i++) {
        incrementFailedAttempts('test@example.com');
      }
      const result = isAccountLocked('TEST@EXAMPLE.COM');
      expect(result.locked).toBe(true);
    });
  });

  describe('resetFailedAttempts', () => {
    it('resetea contador después de bloqueo', () => {
      for (let i = 0; i < 6; i++) {
        incrementFailedAttempts('test@example.com');
      }
      expect(isAccountLocked('test@example.com').locked).toBe(true);

      resetFailedAttempts('test@example.com');
      expect(isAccountLocked('test@example.com').locked).toBe(false);
    });
  });

  describe('getRemainingAttempts', () => {
    it('devuelve 5 si no hay intentos', () => {
      expect(getRemainingAttempts('test@example.com')).toBe(5);
    });

    it('devuelve intentos restantes', () => {
      incrementFailedAttempts('test@example.com');
      incrementFailedAttempts('test@example.com');
      expect(getRemainingAttempts('test@example.com')).toBe(3);
    });

    it('devuelve 0 si está bloqueada', () => {
      for (let i = 0; i < 6; i++) {
        incrementFailedAttempts('test@example.com');
      }
      expect(getRemainingAttempts('test@example.com')).toBe(0);
    });
  });
});
