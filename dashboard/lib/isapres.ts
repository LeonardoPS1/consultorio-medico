/**
 * Catálogo de Isapres chilenas y sistemas de salud.
 *
 * Fuente: Superintendencia de Salud de Chile (suseso.cl)
 */

export const SISTEMAS_SALUD = [
  { value: 'particular', label: 'Particular' },
  { value: 'fonasa', label: 'FONASA' },
  { value: 'isapre', label: 'ISAPRE' },
  { value: 'otro', label: 'Otro' },
] as const;

export const ISAPRES_CHILENAS = [
  { value: 'colmena', label: 'Colmena Golden Cross' },
  { value: 'cruz_blanca', label: 'Cruz Blanca' },
  { value: 'banmedica', label: 'Banmédica' },
  { value: 'consalud', label: 'Consalud' },
  { value: 'masvida', label: 'Masvida' },
  { value: 'vida_tres', label: 'Vida Tres' },
  { value: 'esencial', label: 'Esencial' },
  { value: 'nueva_masvida', label: 'Nueva Masvida' },
] as const;

export type SistemaSalud = (typeof SISTEMAS_SALUD)[number]['value'];
export type IsapreNombre = (typeof ISAPRES_CHILENAS)[number]['value'];
