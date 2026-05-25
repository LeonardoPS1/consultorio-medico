/**
 * Portal Link Utility
 *
 * Genera URLs del portal del paciente para incluir en mensajes WhatsApp,
 * recordatorios, encuestas, etc.
 *
 * Estas URLs son de acceso público — el paciente deberá autenticarse con
 * su número de teléfono una vez que llegue a la página.
 */

const baseUrl = () => process.env.NEXTAUTH_URL || 'https://med.aicorebots.com';

/**
 * Genera el link a la página principal del portal.
 * El paciente deberá ingresar su teléfono.
 */
export function portalLoginUrl(): string {
  return `${baseUrl()}/portal`;
}

/**
 * Genera un link directo al dashboard del portal.
 * NOTA: El paciente deberá tener sesión activa o autenticarse primero.
 */
export function portalDashboardUrl(): string {
  return `${baseUrl()}/portal/dashboard`;
}

/**
 * Genera un link directo a los turnos del portal.
 */
export function portalTurnosUrl(): string {
  return `${baseUrl()}/portal/turnos`;
}

/**
 * Genera un link directo a las recetas del portal.
 */
export function portalRecetasUrl(): string {
  return `${baseUrl()}/portal/recetas`;
}

/**
 * Genera un link al portal con un mensaje prearmado para el paciente.
 *
 * @param texto Texto amigable que aparece como primer pantalla
 * @returns URL del portal
 *
 * @example
 * portalLink() // "Gestioná tus turnos desde: https://.../portal"
 */
export function portalLink(): string {
  return `${baseUrl()}/portal`;
}

/**
 * Renderiza un mensaje de WhatsApp con el link del portal incluido.
 *
 * @param nombre Nombre del paciente
 * @returns Texto del mensaje con link
 *
 * @example
 * portalWhatsAppMessage("Juan")
 * // "Hola Juan, podés ver tus turnos y recetas en tu portal: https://.../portal"
 */
export function portalWhatsAppMessage(nombre: string): string {
  return `Hola ${nombre}, podés ver tus turnos, recetas e historial médico desde tu portal seguro:\n\n👉 ${portalLoginUrl()}`;
}
