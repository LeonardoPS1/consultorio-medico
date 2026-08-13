export type Prevision = 'fonasa' | 'isapre' | 'particular' | 'prais' | 'otro'
export type TramoFonasa = 'A' | 'B' | 'C' | 'D'

export interface TramoInfo {
  value: TramoFonasa
  label: string
  copagoPercent: number
  descripcion: string
}

const TRAMOS: TramoInfo[] = [
  { value: 'A', label: 'Tramo A', copagoPercent: 0, descripcion: 'Exento — 0% copago' },
  { value: 'B', label: 'Tramo B', copagoPercent: 10, descripcion: '10% copago (excepto pensionados)' },
  { value: 'C', label: 'Tramo C', copagoPercent: 20, descripcion: '20% copago' },
  { value: 'D', label: 'Tramo D', copagoPercent: 20, descripcion: '20% copago' },
]

const PREVISIONES: { value: Prevision; label: string }[] = [
  { value: 'fonasa', label: 'FONASA' },
  { value: 'isapre', label: 'ISAPRE' },
  { value: 'particular', label: 'Particular' },
  { value: 'prais', label: 'PRAIS' },
  { value: 'otro', label: 'Otro' },
]

const ISAPRES: { value: string; label: string }[] = [
  { value: 'colmena', label: 'Colmena Golden Cross' },
  { value: 'cruz_blanca', label: 'Cruz Blanca' },
  { value: 'banmedica', label: 'Banmédica' },
  { value: 'consalud', label: 'Consalud' },
  { value: 'masvida', label: 'Masvida' },
  { value: 'vida_tres', label: 'Vida Tres' },
  { value: 'esencial', label: 'Esencial' },
  { value: 'nueva_masvida', label: 'Nueva Masvida' },
  { value: 'cruz_del_norte', label: 'Cruz del Norte' },
  { value: 'ripley', label: 'Ripley Corp' },
  { value: 'fundacion', label: 'Fundación' },
  { value: 'chcc', label: 'CHCC Salud' },
  { value: 'cooperativa', label: 'Cooperativa' },
  { value: 'fusat', label: 'Fusat' },
  { value: 'lautaro', label: 'Lautaro' },
]

/**
 * Lista los tramos FONASA configurados.
 * @returns {TramoInfo[]} Lista de tramos FONASA.
 */
export function getTramos(): TramoInfo[] {
  return TRAMOS
}

/**
 * Lista las previsiones de salud disponibles.
 * @returns {{ value: Prevision; label: string }[]} Lista de previsiones.
 */
export function getPrevisiones(): { value: Prevision; label: string }[] {
  return PREVISIONES
}

/**
 * Lista las ISAPREs disponibles.
 * @returns {{ value: string; label: string }[]} Lista de ISAPREs.
 */
export function getIsapres(): { value: string; label: string }[] {
  return ISAPRES
}

/**
 * Calcula el copago de referencia según el tramo FONASA.
 * @param {string} tramo - Tramo FONASA del paciente (A, B, C o D).
 * @param {number} valorPrestacion - Valor arancelario de la prestación.
 * @returns {number} Monto del copago redondeado (0 si el tramo no existe).
 */
export function calcularCopago(tramo: string, valorPrestacion: number): number {
  const t = TRAMOS.find((t) => t.value === tramo)
  if (!t) return 0
  return Math.round(valorPrestacion * (t.copagoPercent / 100))
}
