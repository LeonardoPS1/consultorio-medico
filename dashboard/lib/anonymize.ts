/**
 * Anonimización de Datos — Utility de protección de PII (Personally Identifiable Information).
 *
 * Proporciona funciones para anonimizar/emnascarar datos sensibles antes de:
 * - Enviarlos a servicios externos (Google Calendar, n8n)
 * - Loggearlos en consola o archivos
 * - Mostrarlos en interfaces no autorizadas
 *
 * Todas las funciones preservan la utilidad del dato (trazabilidad, matching)
 * mientras ocultan la identidad del paciente.
 */

// ============================================================
// Estrategias de anonimización
// ============================================================

/**
 * Anonimiza un nombre completo.
 * Estrategia: "Juan Pérez" → "Juan P." (primer nombre + inicial del apellido)
 *             "María García López" → "María G." (solo primera inicial del apellido)
 */
export function anonymizeNombre(nombre?: string | null): string | null {
  if (!nombre) return null;
  const parts = nombre.trim().split(/\s+/);
  if (parts.length === 1) {
    // Solo un nombre: mostrar primera letra + asteriscos
    return parts[0].length > 2
      ? parts[0].slice(0, 1) + parts[0].slice(1).replace(/./g, '*')
      : parts[0];
  }
  // Primer nombre + inicial del primer apellido
  return `${parts[0]} ${parts[1].slice(0, 1)}.`;
}

/**
 * Anonimiza un email.
 * Estrategia: "juan.perez@gmail.com" → "ju***@gmail.com"
 */
export function anonymizeEmail(email?: string | null): string | null {
  if (!email) return null;
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const visible = local.slice(0, 2);
  const masked = visible + '***@' + domain;
  return masked;
}

/**
 * Anonimiza un número de teléfono.
 * Estrategia: "+56975680702" → "+569******02" (conserva código país + últimos 2)
 *             "1155550000" → "******0000"
 * Conserva suficientes dígitos para trazabilidad.
 */
export function anonymizeTelefono(telefono?: string | null): string | null {
  if (!telefono) return null;
  const digits = telefono.replace(/\D/g, '');
  if (digits.length <= 4) return telefono;
  const prefix = telefono.slice(0, telefono.length - digits.length); // símbolos (+)
  const visibleStart = digits.length > 8 ? digits.slice(0, 2) : '';
  const visibleEnd = digits.slice(-4);
  const maskedCount = digits.length - visibleStart.length - 4;
  return prefix + visibleStart + '*'.repeat(maskedCount) + visibleEnd;
}

/**
 * Anonimiza un DNI / RUT / documento.
 * Estrategia: "12345678-9" → "******678-9"
 *             "12345678" → "****5678"
 */
export function anonymizeDocumento(documento?: string | null): string | null {
  if (!documento) return null;
  if (documento.length <= 4) return documento;
  const visible = documento.slice(-4);
  const maskedCount = documento.length - 4;
  return '*'.repeat(maskedCount) + visible;
}

/**
 * Versión corta para Google Calendar (solo inicial + apellido sin contexto).
 * Estrategia: "Juan Pérez" → "Turno - Juan P."
 */
export function anonymizeNombreGCal(nombre?: string | null): string {
  if (!nombre) return 'Paciente';
  const anon = anonymizeNombre(nombre);
  return anon ? `Turno - ${anon}` : 'Turno';
}

// ============================================================
// Mascaras completas para objetos
// ============================================================

export interface DatosPaciente {
  nombre?: string | null;
  email?: string | null;
  telefono?: string | null;
  dni?: string | null;
  rut?: string | null;
}

export interface DatosAnonimizados {
  nombre: string | null;
  email: string | null;
  telefono: string | null;
  documento: string | null;
}

/**
 * Anonimiza todos los campos PII de un paciente de una sola vez.
 */
export function anonymizePaciente(data: DatosPaciente): DatosAnonimizados {
  return {
    nombre: anonymizeNombre(data.nombre),
    email: anonymizeEmail(data.email),
    telefono: anonymizeTelefono(data.telefono),
    documento: anonymizeDocumento(data.dni || data.rut),
  };
}

/**
 * Máscara profunda para objects con PII — recorre recursivamente y anonimiza
 * campos conocidos (nombre, email, telefono, dni, rut).
 * Útil para sanitizar logs y payloads.
 */
export function maskPII<T extends Record<string, unknown>>(obj: T): T {
  const result = { ...obj };

  for (const key of Object.keys(result)) {
    const value = result[key];
    const lowerKey = key.toLowerCase();

    if (typeof value === 'string') {
      if (lowerKey === 'nombre' || lowerKey === 'name' || lowerKey === 'apellido') {
        result[key] = anonymizeNombre(value) as unknown as T[Extract<keyof T, string>];
      } else if (lowerKey === 'email') {
        result[key] = anonymizeEmail(value) as unknown as T[Extract<keyof T, string>];
      } else if (lowerKey === 'telefono' || lowerKey === 'phone' || lowerKey === 'whatsapp') {
        result[key] = anonymizeTelefono(value) as unknown as T[Extract<keyof T, string>];
      } else if (lowerKey === 'dni' || lowerKey === 'rut' || lowerKey === 'documento' || lowerKey === 'document') {
        result[key] = anonymizeDocumento(value) as unknown as T[Extract<keyof T, string>];
      }
    } else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = maskPII(value as Record<string, unknown>) as unknown as T[Extract<keyof T, string>];
    }
  }

  return result;
}
