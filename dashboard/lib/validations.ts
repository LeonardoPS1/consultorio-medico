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

/** Teléfono chileno: +569XXXXXXXX o +562XXXXXXXX o 9XXXXXXXX */
const telefonoChileRegex = /^(\+569\d{8}|\+562\d{7}|9\d{8})$/;

export const createPacienteSchema = z.object({
  nombre: z.string().min(1, 'Nombre es obligatorio'),
  apellido: z.string().min(1, 'Apellido es obligatorio'),
  telefono: z.string().min(1, 'Teléfono es obligatorio').regex(telefonoChileRegex, 'Teléfono debe ser chileno: +569XXXXXXXX'),
  email: z.string().email('Email inválido').optional().nullable(),
  obraSocial: z.string().optional().nullable(),
  sistemaSalud: z.enum(['fonasa', 'isapre', 'particular', 'otro']).optional().nullable(),
  isapreNombre: z.string().optional().nullable(),
  dni: z.string().optional().nullable(),
  fechaNacimiento: z.string().optional().nullable(),
  direccion: z.string().optional().nullable(),
  regionId: z.string().uuid('regionId debe ser UUID').optional().nullable(),
  comunaId: z.string().uuid('comunaId debe ser UUID').optional().nullable(),
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

// ─── Conversaciones ──────────────────────────────────────

export const conversacionQuerySchema = z.object({
  search: z.string().optional(),
  estado: z.enum(['activa', 'archivada', 'cerrada']).optional(),
  page: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
});

export const createConversacionSchema = z.object({
  telefono: z.string().min(1, 'Teléfono es obligatorio'),
  nombre: z.string().optional().nullable(),
  apellido: z.string().optional().nullable(),
  canal: z.enum(['whatsapp', 'sms', 'voz']).optional().default('whatsapp'),
});

export const updateConversacionSchema = z.object({
  estado: z.enum(['activa', 'archivada', 'cerrada']).optional(),
  notas: z.string().optional().nullable(),
});

export const createMensajeSchema = z.object({
  rol: z.enum(['user', 'assistant', 'system']),
  contenido: z.string().min(1, 'Contenido es obligatorio'),
  tipo: z.enum(['texto', 'imagen', 'audio', 'video', 'documento']).optional().default('texto'),
});

// ─── Horarios ────────────────────────────────────────────

export const updateHorariosSchema = z.array(z.object({
  dia: z.string(),
  activo: z.boolean(),
  inicio: z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:MM').optional().nullable(),
  fin: z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:MM').optional().nullable(),
}));

// ─── Organización ────────────────────────────────────────

export const updateOrganizationSchema = z.object({
  nombre: z.string().optional(),
  eslogan: z.string().optional(),
  descripcion: z.string().optional(),
  direccion: z.string().optional(),
  ciudad: z.string().optional(),
  telefono: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().email('Email inválido').optional(),
  colorPrimario: z.string().optional(),
  colorSecundario: z.string().optional(),
  firmaNombre: z.string().optional(),
  logoUrl: z.string().optional(),
  sitioWeb: z.string().optional(),
});

// ─── Onboarding ──────────────────────────────────────────

export const onboardingStepSchema = z.object({
  stepId: z.string().min(1, 'stepId es requerido'),
});

// ─── Notificaciones ──────────────────────────────────────

export const createNotificacionSchema = z.object({
  titulo: z.string().min(1, 'Título es obligatorio'),
  mensaje: z.string().min(1, 'Mensaje es obligatorio'),
  tipo: z.enum(['info', 'alerta', 'error', 'success']).optional().default('info'),
  usuarioId: z.string().uuid().optional().nullable(),
  pacienteId: z.string().uuid().optional().nullable(),
});

export const updateNotificacionSchema = z.object({
  action: z.enum(['read', 'unread']),
});

export const pushSubscriptionSchema = z.object({
  subscription: z.object({
    endpoint: z.string(),
    keys: z.object({
      p256dh: z.string(),
      auth: z.string(),
    }).optional(),
  }).passthrough(),
});

// ─── Credenciales ────────────────────────────────────────

export const createCredencialSchema = z.object({
  servicio: z.string().min(1, 'Servicio es obligatorio'),
  clave: z.string().min(1, 'Clave es obligatoria'),
  valor: z.string().optional().nullable(),
});

export const updateCredencialSchema = z.object({
  valor: z.string().min(1, 'Valor es obligatorio'),
});

// ─── Auth Register ───────────────────────────────────────

export const registerSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres').max(100),
  nombre: z.string().min(1, 'Nombre es obligatorio'),
  apellido: z.string().optional().nullable(),
  planId: z.string().optional().nullable(),
}).refine(data => {
  // Requisitos de fortaleza
  if (!/[A-Z]/.test(data.password)) return false;
  if (!/[a-z]/.test(data.password)) return false;
  if (!/[0-9]/.test(data.password)) return false;
  return true;
}, { message: 'La contraseña debe tener mayúscula, minúscula y número', path: ['password'] });

// ─── Pagos ───────────────────────────────────────────────

export const createPreferenceSchema = z.object({
  planId: z.string().min(1, 'planId es requerido'),
});

export const paymentStatusSchema = z.object({
  preferenceId: z.string().optional(),
  paymentId: z.string().optional(),
});

// ─── Admin Users ─────────────────────────────────────────

export const createUserSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  nombre: z.string().min(1, 'Nombre es obligatorio'),
  role: z.enum(['admin', 'medico', 'secretaria']).optional().default('medico'),
  plan: z.string().optional().nullable(),
});

export const updateUserSchema = z.object({
  email: z.string().email('Email inválido').optional(),
  password: z.string().min(8).optional(),
  nombre: z.string().optional(),
  role: z.enum(['admin', 'medico', 'secretaria']).optional(),
  plan: z.string().optional().nullable(),
  activo: z.boolean().optional(),
});

// ─── Admin Sucursales ────────────────────────────────────

export const createSucursalSchema = z.object({
  nombre: z.string().min(1, 'Nombre es obligatorio'),
  direccion: z.string().optional().nullable(),
  telefono: z.string().optional().nullable(),
  horarios: z.record(z.any()).optional(),
});

export const updateSucursalSchema = createSucursalSchema.partial();

// ─── Admin Features ──────────────────────────────────────

export const updateFeatureSchema = z.object({
  enabled: z.boolean(),
});

// ─── Admin Privacidad ────────────────────────────────────

export const updatePrivacidadSchema = z.object({
  diasRetencion: z.number().min(1).max(365).optional(),
  autoEliminarInactivos: z.boolean().optional(),
  anonimizarDatos: z.boolean().optional(),
});

// ─── Admin Tenants ───────────────────────────────────────

export const createTenantSchema = z.object({
  nombre: z.string().min(1, 'Nombre es obligatorio'),
  subdomain: z.string().min(1, 'Subdominio es obligatorio').regex(/^[a-z0-9-]+$/, 'Solo letras, números y guiones'),
});

// ─── Portal Auth ─────────────────────────────────────────

export const portalAuthRequestSchema = z.object({
  telefono: z.string().min(1, 'Teléfono es obligatorio'),
});

export const portalAuthVerifySchema = z.object({
  token: z.string().min(1, 'Token es obligatorio'),
  telefono: z.string().min(1, 'Teléfono es obligatorio'),
});

// ─── Portal Perfil ───────────────────────────────────────

export const updatePortalPerfilSchema = z.object({
  nombre: z.string().optional().nullable(),
  direccion: z.string().optional().nullable(),
  telefono: z.string().optional().nullable(),
  comuna: z.string().optional().nullable(),
  fechaNacimiento: z.string().optional().nullable(),
});

// ─── Portal Turno ────────────────────────────────────────

export const portalTurnoUpdateSchema = z.object({
  estado: z.enum(['cancelada']),
  motivo: z.string().optional().nullable(),
});

// ─── Plantillas Populate ─────────────────────────────────

export const populatePlantillasSchema = z.object({
  categoria: z.string().optional(),
  plantillaId: z.string().optional(),
});

// ─── Setup ───────────────────────────────────────────────

export const setupSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  nombre: z.string().min(1, 'Nombre es obligatorio'),
});

// ─── Tipos inferidos ─────────────────────────────────────

export type CreatePaciente = z.infer<typeof createPacienteSchema>;
export type UpdatePaciente = z.infer<typeof updatePacienteSchema>;
export type CreateTurno = z.infer<typeof createTurnoSchema>;
export type UpdateTurno = z.infer<typeof updateTurnoSchema>;
export type CreateReceta = z.infer<typeof createRecetaSchema>;
export type UpdateReceta = z.infer<typeof updateRecetaSchema>;
export type CreateMedico = z.infer<typeof createMedicoSchema>;
export type UpdateMedico = z.infer<typeof updateMedicoSchema>;
export type CreateServicio = z.infer<typeof createServicioSchema>;
export type UpdateServicio = z.infer<typeof updateServicioSchema>;
export type CreateConversacion = z.infer<typeof createConversacionSchema>;
export type CreateMensaje = z.infer<typeof createMensajeSchema>;
export type RegisterUser = z.infer<typeof registerSchema>;
export type CreateUser = z.infer<typeof createUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
