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
 * Formatea un número de teléfono para mostrar
 */
export function formatPhone(phone: string) {
  if (!phone) return '';
  // Chilean numbers: +569XXXXXXX → 9 XXX XXX XXX
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('569') && cleaned.length === 12) {
    const number = cleaned.slice(3);
    return `${number.slice(0, 1)} ${number.slice(1, 4)} ${number.slice(4, 7)} ${number.slice(7, 10)}`;
  }
  // Also handle numbers starting with 9 (without country code)
  if (cleaned.startsWith('9') && cleaned.length === 9) {
    return `${cleaned.slice(0, 1)} ${cleaned.slice(1, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7, 9)}`;
  }
  return phone;
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
