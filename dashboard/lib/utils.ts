import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow, isToday, isTomorrow, isYesterday } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Combina clases de Tailwind de forma inteligente
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formatea una fecha para mostrar
 */
export function formatDate(date: Date | string, pattern: string = 'PPP') {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, pattern, { locale: es });
}

/**
 * Formatea una hora
 */
export function formatTime(date: Date | string) {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'HH:mm', { locale: es });
}

/**
 * Formatea fecha + hora
 */
export function formatDateTime(date: Date | string) {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, "PPP 'a las' HH:mm", { locale: es });
}

/**
 * Retorna un texto relativo (hace 5 min, ayer, etc)
 */
export function formatRelative(date: Date | string) {
  const d = typeof date === 'string' ? new Date(date) : date;
  return formatDistanceToNow(d, { addSuffix: true, locale: es });
}

/**
 * Texto amigable para fecha de turno
 */
export function formatTurnoDate(date: Date | string) {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isToday(d)) return 'Hoy';
  if (isTomorrow(d)) return 'Mañana';
  if (isYesterday(d)) return 'Ayer';
  return format(d, 'EEE d/M', { locale: es });
}

/**
 * Retorna el color según el estado del turno
 */
export function getTurnoColor(estado: string) {
  const colors: Record<string, string> = {
    pendiente: '#F59E0B',
    confirmada: '#10B981',
    en_consulta: '#3B82F6',
    en_atencion: '#2563EB',
    atendido: '#059669',
    completada: '#6B7280',
    cancelada: '#EF4444',
    no_asistio: '#EC4899',
  };
  return colors[estado] || '#6B7280';
}

/**
 * Traduce estados del turno a texto legible
 */
export function getTurnoLabel(estado: string) {
  const labels: Record<string, string> = {
    pendiente: 'Pendiente',
    confirmada: 'Confirmada',
    en_consulta: 'En consulta',
    en_atencion: 'En atención',
    atendido: 'Atendido',
    completada: 'Completada',
    cancelada: 'Cancelada',
    no_asistio: 'No asistió',
  };
  return labels[estado] || estado;
}

/**
 * Valida un número de teléfono chileno (+569 o 9)
 */
export function isValidPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s\-()]/g, '');
  return /^(\+56?9|9)\d{8}$/.test(cleaned);
}

/**
 * Formatea un número de teléfono chileno para mostrar
 * +569XXXXXXXX → +56 9 XXXX XXXX
 */
export function formatPhone(phone: string) {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  // +569XXXXXXXX (11 dígitos después de limpiar)
  if (cleaned.startsWith('569') && cleaned.length === 11) {
    const n = cleaned.slice(3);
    return `+56 9 ${n.slice(0, 4)} ${n.slice(4, 7)} ${n.slice(7)}`;
  }
  // 9XXXXXXXX (9 dígitos, sin código país)
  if (cleaned.startsWith('9') && cleaned.length === 9) {
    return `+56 9 ${cleaned.slice(1, 5)} ${cleaned.slice(5, 7)} ${cleaned.slice(7)}`;
  }
  return phone;
}

/**
 * Limpia un RUT: elimina puntos, guión y espacios
 * "12.345.678-5" → "123456785"
 */
export function cleanRut(rut: string): string {
  return rut.replace(/[.\\-]/g, '').trim();
}

/**
 * Formatea un RUT chileno para mostrar
 * "123456785" → "12.345.678-5"
 */
export function formatRut(rut: string): string {
  const cleaned = cleanRut(rut);
  if (cleaned.length < 2) return rut;
  const cuerpo = cleaned.slice(0, -1);
  const dv = cleaned.slice(-1).toUpperCase();
  const formateado = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${formateado}-${dv}`;
}

/**
 * Valida un RUT chileno (dígito verificador)
 * Retorna true si el RUT es válido
 */
export function validateRut(rut: string): boolean {
  const cleaned = cleanRut(rut);
  if (cleaned.length < 2) return false;

  const cuerpo = cleaned.slice(0, -1);
  const dv = cleaned.slice(-1).toUpperCase();

  // Calcular dígito verificador
  let suma = 0;
  let multiplo = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += parseInt(cuerpo[i], 10) * multiplo;
    multiplo = multiplo === 7 ? 2 : multiplo + 1;
  }
  const dvEsperado = 11 - (suma % 11);
  const dvCalculado =
    dvEsperado === 11 ? '0' :
    dvEsperado === 10 ? 'K' :
    dvEsperado.toString();

  return dv === dvCalculado;
}

/**
 * Trunca texto largo
 */
export function truncate(text: string, length: number = 100) {
  if (text.length <= length) return text;
  return text.slice(0, length) + '...';
}

/**
 * Genera iniciales para avatar
 */
export function getInitials(nombre: string, apellido: string) {
  return `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase();
}

/**
 * Slug para URLs
 */
export function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .trim();
}
