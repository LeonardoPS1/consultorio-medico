/**
 * Utilidades para generación de HTML seguro (anti-XSS).
 */

/**
 * Escapa caracteres HTML para prevenir XSS en generación de PDFs y templates.
 * @param str
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
