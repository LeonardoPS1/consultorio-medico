/**
 * Utilidades para generación de HTML seguro (anti-XSS).
 */

/**
 * Escapa caracteres HTML para prevenir XSS en generación de PDFs y templates.
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
