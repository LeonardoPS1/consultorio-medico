// ============================================================
// Validador de fortaleza de contraseñas
// ============================================================

export interface PasswordValidation {
  valid: boolean;
  errors: string[];
  score: number; // 0-4
}

/**
 * Valida que una contraseña cumpla con los requisitos mínimos:
 * - Mínimo 8 caracteres
 * - Al menos 1 mayúscula
 * - Al menos 1 minúscula
 * - Al menos 1 número
 * - Al menos 1 símbolo especial
 */
export function validatePasswordStrength(password: string): PasswordValidation {
  const errors: string[] = [];
  let score = 0;

  if (password.length < 8) {
    errors.push('Mínimo 8 caracteres');
  } else {
    score++;
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Al menos una mayúscula');
  } else {
    score++;
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Al menos una minúscula');
  } else {
    score++;
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Al menos un número');
  } else {
    score++;
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Al menos un símbolo especial (!@#$%...)');
  } else {
    score++;
  }

  return {
    valid: errors.length === 0,
    errors,
    score,
  };
}

/**
 * Genera un mensaje de error legible para mostrar en UI
 */
export function passwordErrorsToString(errors: string[]): string {
  if (errors.length === 0) return '';
  return `La contraseña debe tener: ${errors.join(', ')}.`;
}
