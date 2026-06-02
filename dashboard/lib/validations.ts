/**
 * Schemas de validación Zod para los endpoints de la API.
 * 
 * Reemplaza las validaciones manuales (if (!nombre?.trim())) por schemas
 * tipados que generan mensajes de error consistentes automáticamente.
 * 
 * Uso:
 *   const body = parseBody(request, createPacienteSchema);
 *   // body tiene tipo inferido automáticamente
 */

import { z } from 'zod';
import { NextRequest } from 'next/server';
import { fail } from './api-handler';

// ─── Helpers ────────────────────────────────────────────

/** Parsea el body de un request y valida con el schema. Tira error 400 si falla. */
export async function parseBody<T extends z.ZodType>(request: NextRequest, schema: T): Promise<z.infer<T>> {
  try {
    const json = await request.json();
    return schema.parse(json);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
      fail(`Datos inválidos: ${messages}`);
    }
    fail('Body JSON inválido');
  }
}

/** Parsea query params y valida con el schema */
export function parseQuery(request: NextRequest, schema: z.ZodType): Record<string, any> {
  const { searchParams } = new URL(request.url);
  const params: Record<string, any> = {};
  searchParams.forEach((value, key) => { params[key] = value; });
  const result = schema.safeParse(params);
  if (!result.success) {
    const messages = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
    fail(`Parametros invalidos: ${messages}`);
  }
  return result.data!;
}

// ─── Schemas ─────────────────────────────────────────────

export const createPacienteSchema = z.object({
  nombre: z.string().min(1, 'Nombre es obligatorio'),
  apellido: z.string().min(1, 'Apellido es obligatorio'),
  telefono: z.string().min(1, 'Teléfono es obligatorio').regex(/^\+?\d+/, 'Teléfono debe ser numérico'),
  email: z.string().email('Email inválido').optional().nullable(),
  obraSocial: z.string().optional().nullable(),
  sistemaSalud: z.enum(['fonasa', 'isapre', 'particular', 'otro']).optional().nullable(),
  isapreNombre: z.string().optional().nullable(),
  dni: z.string().optional().nullable(),
  fechaNacimiento: z.string().optional().nullable(),
  direccion: z.string().optional().nullable(),
  alergias: z.string().optional().nullable(),
  medicacionCronica: z.string().optional().nullable(),
  notasMedicas: z.string().optional().nullable(),
  sucursalId: z.string().uuid().optional().nullable(),
});

export const updatePacienteSchema = createPacienteSchema.partial();

export const createTurnoSchema = z.object({
  pacienteId: z.string().uuid('pacienteId debe ser UUID'),
  medicoId: z.string().uuid('medicoId debe ser UUID'),
  fecha: z.string().min(1, 'Fecha es obligatoria').regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato: YYYY-MM-DD'),
  hora: z.string().min(1, 'Hora es obligatoria').regex(/^\d{2}:\d{2}$/, 'Formato: HH:MM'),
  tipoConsulta: z.enum(['presencial', 'virtual', 'telefonica']).optional().default('presencial'),
  motivo: z.string().optional().nullable(),
  duracionMinutos: z.number().min(10).max(120).optional().default(30),
  sucursalId: z.string().uuid().optional().nullable(),
});

export const updateTurnoSchema = z.object({
  estado: z.enum(['pendiente', 'confirmada', 'en_atencion', 'atendido', 'cancelada', 'no_asistio']).optional(),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  hora: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  motivoCancelacion: z.string().optional().nullable(),
  tipoConsulta: z.string().optional(),
  motivo: z.string().optional().nullable(),
  duracionMinutos: z.number().min(10).max(120).optional(),
  pacienteId: z.string().uuid().optional(),
  medicoId: z.string().uuid().optional(),
  sucursalId: z.string().uuid().optional().nullable(),
});

export const createRecetaSchema = z.object({
  pacienteId: z.string().uuid('pacienteId debe ser UUID'),
  medicamento: z.string().min(1, 'Medicamento es obligatorio'),
  dosis: z.string().min(1, 'Dosis es obligatoria'),
  frecuencia: z.string().optional().nullable(),
  duracion: z.string().optional().nullable(),
  indicaciones: z.string().optional().nullable(),
  medicoId: z.string().uuid().optional().nullable(),
});

export const updateRecetaSchema = z.object({
  estado: z.enum(['activa', 'vencida', 'historial']).optional(),
  medicamento: z.string().optional(),
  dosis: z.string().optional(),
  frecuencia: z.string().optional().nullable(),
  duracion: z.string().optional().nullable(),
  indicaciones: z.string().optional().nullable(),
});

export const createMedicoSchema = z.object({
  nombre: z.string().min(1, 'Nombre es obligatorio'),
  especialidad: z.string().min(1, 'Especialidad es obligatoria'),
  email: z.string().email().optional().nullable(),
  telefono: z.string().optional().nullable(),
  whatsapp: z.string().optional().nullable(),
  matricula: z.string().optional().nullable(),
  duracionTurnoMinutos: z.number().min(10).max(120).optional().default(30),
});

export const updateMedicoSchema = createMedicoSchema.partial().extend({
  activo: z.boolean().optional(),
});

export const createServicioSchema = z.object({
  nombre: z.string().min(1, 'Nombre es obligatorio'),
  descripcion: z.string().optional().nullable(),
  duracionMinutos: z.number().min(5).max(180).optional().default(30),
  precio: z.number().min(0).optional().nullable(),
  medicoId: z.string().uuid().optional().nullable(),
});

export const updateServicioSchema = createServicioSchema.partial().extend({
  activo: z.boolean().optional(),
});

export const createBloqueoSchema = z.object({
  titulo: z.string().min(1, 'Titulo es obligatorio'),
  fechaInicio: z.string().min(1, 'Fecha inicio requerida'),
  fechaFin: z.string().min(1, 'Fecha fin requerida'),
  tipo: z.enum(['vacaciones', 'feriado', 'capacitacion', 'bloqueo']).optional().default('bloqueo'),
  motivo: z.string().optional().nullable(),
});

export const updateBloqueoSchema = createBloqueoSchema.partial();

// ─── Tipos inferidos ─────────────────────────────────────

export type CreatePaciente = z.infer<typeof createPacienteSchema>;
export type UpdatePaciente = z.infer<typeof updatePacienteSchema>;
export type CreateTurno = z.infer<typeof createTurnoSchema>;
export type UpdateTurno = z.infer<typeof updateTurnoSchema>;
export type CreateReceta = z.infer<typeof createRecetaSchema>;
export type UpdateReceta = z.infer<typeof updateRecetaSchema>;
