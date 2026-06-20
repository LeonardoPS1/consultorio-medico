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
export function parseQuery<T extends z.ZodType>(request: NextRequest, schema: T): z.infer<T> {
  const { searchParams } = new URL(request.url);
  const params: Record<string, string> = {};
  searchParams.forEach((value, key) => { params[key] = value; });
  const result = schema.safeParse(params);
  if (!result.success) {
    const messages = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
    fail(`Parametros invalidos: ${messages}`);
  }
  return result.data!;
}

// ─── Schemas ─────────────────────────────────────────────

/** 
 * Teléfono — acepta formatos chileno (+569, +562, 9) y cualquier internacional con +.
 * Se sanitiza: se eliminan espacios, guiones, paréntesis antes de validar.
 */
const telefonoRegex = /^(\+?\d{7,15})$/;

export const createPacienteSchema = z.object({
  nombre: z.string().min(1, 'Nombre es obligatorio'),
  apellido: z.string().min(1, 'Apellido es obligatorio'),
  telefono: z.string().min(1, 'Teléfono es obligatorio').trim()
    .regex(telefonoRegex, 'Teléfono inválido: debe tener entre 7 y 15 dígitos, con o sin +'),
  email: z.string().trim().email('Email inválido').optional().nullable().or(z.literal('')),
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
  skipWaitlist: z.boolean().optional(),
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
  logoUrl: z.string().optional(),
  avatarUrl: z.string().optional(),
  fondoUrl: z.string().optional(),
  firmaNombre: z.string().optional(),
  colorPrimario: z.string().optional(),
  colorSecundario: z.string().optional(),
  direccion: z.string().optional(),
  ciudad: z.string().optional(),
  provincia: z.string().optional(),
  telefono: z.string().optional(),
  telefonoSecundario: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  emailSecundario: z.string().email('Email inválido').optional().or(z.literal('')),
  sitioWeb: z.string().optional(),
  redesSociales: z.object({
    instagram: z.string(),
    facebook: z.string(),
    twitter: z.string(),
  }).optional(),
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

const PORTAL_PHONE_REGEX = /^\+?[1-9]\d{6,14}$/;

export const portalAuthRequestSchema = z.object({
  telefono: z.string().regex(PORTAL_PHONE_REGEX, 'Teléfono inválido'),
});

export const portalAuthVerifySchema = z.object({
  token: z.string().min(1, 'Token es obligatorio'),
  telefono: z.string().min(1, 'Teléfono es obligatorio'),
});

// ─── Portal Perfil ───────────────────────────────────────

export const updatePortalPerfilSchema = z.object({
  email: z.string().email('Email inválido').optional().nullable(),
  consentimientoWhatsapp: z.boolean().optional().nullable(),
  consentimientoEmail: z.boolean().optional().nullable(),
  sistemaSalud: z.enum(['fonasa', 'isapre', 'particular', 'otro']).optional().nullable(),
  regionId: z.string().uuid('regionId debe ser UUID').optional().nullable(),
  comunaId: z.string().uuid('comunaId debe ser UUID').optional().nullable(),
});

// ─── Portal Turno ────────────────────────────────────────

export const portalTurnoUpdateSchema = z.object({
  estado: z.enum(['cancelada']).optional(),
  motivo: z.string().optional().nullable(),
});

// ─── Plantillas Populate ─────────────────────────────────

export const populatePlantillasSchema = z.object({
  categoria: z.string().optional(),
  plantillaId: z.string().optional(),
  datos: z.record(z.string(), z.unknown()).optional(),
});

// ─── Setup ───────────────────────────────────────────────

export const setupSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  nombre: z.string().min(1, 'Nombre es obligatorio'),
});

// ─── Derivaciones ─────────────────────────────────────────

export const createDerivacionSchema = z.object({
  pacienteId: z.string().uuid('pacienteId debe ser UUID'),
  medicoOrigenId: z.string().uuid('medicoOrigenId debe ser UUID'),
  medicoDestinoId: z.string().uuid('medicoDestinoId debe ser UUID').optional().nullable(),
  especialidad: z.string().min(1, 'Especialidad es obligatoria'),
  motivo: z.string().min(1, 'Motivo es obligatorio'),
  diagnostico: z.string().optional().nullable(),
  cie10Codigo: z.string().optional().nullable(),
  gravedad: z.enum(['normal', 'prioritaria', 'urgente']).optional().default('normal'),
  notasOrigen: z.string().optional().nullable(),
  sucursalId: z.string().uuid().optional().nullable(),
});

export const updateDerivacionSchema = z.object({
  medicoDestinoId: z.string().uuid().optional().nullable(),
  estado: z.enum(['pendiente', 'aceptada', 'rechazada', 'completada']).optional(),
  notasDestino: z.string().optional().nullable(),
  gravedad: z.enum(['normal', 'prioritaria', 'urgente']).optional(),
  especialidad: z.string().optional(),
  motivo: z.string().optional(),
  diagnostico: z.string().optional().nullable(),
  cie10Codigo: z.string().optional().nullable(),
  fechaRespuesta: z.string().optional().nullable(),
}).partial();

// ─── Blacklist ───────────────────────────────────────────

export const createBlacklistSchema = z.object({
  pacienteId: z.string().uuid('pacienteId debe ser UUID'),
  motivo: z.string().min(1, 'Motivo es obligatorio'),
  activo: z.boolean().optional().default(true),
  bloqueadoHasta: z.string().optional().nullable(),
  creadoPor: z.string().uuid().optional().nullable(),
  sucursalId: z.string().uuid().optional().nullable(),
});

export const updateBlacklistSchema = z.object({
  motivo: z.string().optional(),
  activo: z.boolean().optional(),
  bloqueadoHasta: z.string().optional().nullable(),
}).partial();

export type CreateBlacklistEntry = z.infer<typeof createBlacklistSchema>;
export type UpdateBlacklistEntry = z.infer<typeof updateBlacklistSchema>;

// ─── Consentimiento Informado ──────────────────────────

export const createConsentimientoSchema = z.object({
  pacienteId: z.string().uuid('pacienteId debe ser UUID'),
  tipo: z.string().optional().default('general'),
  titulo: z.string().min(1, 'Título es obligatorio'),
  descripcion: z.string().optional().nullable(),
  fechaFirma: z.string().optional().nullable(),
  ipFirma: z.string().optional().nullable(),
  nombrePaciente: z.string().min(1, 'Nombre del paciente es obligatorio'),
  rutPaciente: z.string().optional().nullable(),
  documentoPdf: z.string().optional().nullable(),
  metadata: z.record(z.unknown()).optional().nullable(),
  medicoId: z.string().uuid().optional().nullable(),
  sucursalId: z.string().uuid().optional().nullable(),
});

export const updateConsentimientoSchema = z.object({
  tipo: z.string().optional(),
  titulo: z.string().optional(),
  descripcion: z.string().optional().nullable(),
  fechaFirma: z.string().optional().nullable(),
  ipFirma: z.string().optional().nullable(),
  nombrePaciente: z.string().optional(),
  rutPaciente: z.string().optional().nullable(),
  documentoPdf: z.string().optional().nullable(),
  metadata: z.record(z.unknown()).optional().nullable(),
}).partial();

export type CreateConsentimiento = z.infer<typeof createConsentimientoSchema>;
export type UpdateConsentimiento = z.infer<typeof updateConsentimientoSchema>;

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
export type CreateDerivacion = z.infer<typeof createDerivacionSchema>;
export type UpdateDerivacion = z.infer<typeof updateDerivacionSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;

// ─── Auth (Forgot/Reset/Change Password) ──────────────────
export const forgotPasswordSchema = z.object({
  email: z.string().email('Email inválido'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token requerido'),
  password: z
    .string()
    .min(8, 'Mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
    .regex(/[0-9]/, 'Debe contener al menos un número')
    .regex(/[^A-Za-z0-9]/, 'Debe contener al menos un carácter especial'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Contraseña actual requerida'),
  newPassword: z
    .string()
    .min(8, 'Mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
    .regex(/[0-9]/, 'Debe contener al menos un número')
    .regex(/[^A-Za-z0-9]/, 'Debe contener al menos un carácter especial'),
});

// ─── 2FA ──────────────────────────────────────────────────
export const setup2faSchema = z.object({
  secret: z.string().min(1, 'Secret requerido'),
  token: z.string().length(6, 'Token debe tener 6 dígitos').regex(/^\d{6}$/, 'Token debe ser numérico'),
  backupCodes: z.array(z.string()).optional(),
});

export type ForgotPasswordData = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordData = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordData = z.infer<typeof changePasswordSchema>;
export type Setup2faData = z.infer<typeof setup2faSchema>;
export type PortalAuthRequestData = z.infer<typeof portalAuthRequestSchema>;

// ─── Bulk Operations ──────────────────────────────────────

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const bulkWhatsAppSchema = z.object({
  pacienteIds: z.array(z.string().regex(UUID_REGEX, 'ID de paciente inválido')).min(1).max(500),
  mensaje: z.string().min(1, 'Mensaje requerido').max(2000, 'Máximo 2000 caracteres'),
});

export const bulkStatusSchema = z.object({
  turnoIds: z.array(z.string().regex(UUID_REGEX, 'ID de turno inválido')).min(1).max(500),
  estado: z.enum(['pendiente', 'confirmado', 'en_curso', 'completado', 'cancelado', 'no_asistio']),
});

export type BulkWhatsAppData = z.infer<typeof bulkWhatsAppSchema>;
export type BulkStatusData = z.infer<typeof bulkStatusSchema>;

// ─── LiveKit ──────────────────────────────────────────────

export const liveKitTokenSchema = z.object({
  roomName: z.string().min(1, 'Room requerida').max(100),
  role: z.enum(['participant', 'publisher', 'subscriber']).default('participant'),
});

// ─── Notas SOAP ───────────────────────────────────────────

export const createNotaSoapSchema = z.object({
  turnoId: z.string().uuid('ID de turno inválido').optional(),
  subjetivo: z.string().max(5000).optional().default(''),
  objetivo: z.string().max(5000).optional().default(''),
  evaluacion: z.string().max(5000).optional().default(''),
  plan: z.string().max(5000).optional().default(''),
  cie10: z.array(z.string()).optional().default([]),
});

export const updateNotaSoapSchema = createNotaSoapSchema.partial();

export type LiveKitTokenData = z.infer<typeof liveKitTokenSchema>;
export type CreateBloqueoData = z.infer<typeof createBloqueoSchema>;
export type CreateNotaSoapData = z.infer<typeof createNotaSoapSchema>;
export type UpdateNotaSoapData = z.infer<typeof updateNotaSoapSchema>;

// ─── Contact Form ─────────────────────────────────────────

export const contactFormSchema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres').max(255),
  email: z.string().email('Email inválido').max(255),
  phone: z.string().regex(PORTAL_PHONE_REGEX, 'Teléfono inválido').optional().or(z.literal('')),
  specialty: z.string().max(100).optional().or(z.literal('')),
  size: z.string().max(50).optional().or(z.literal('')),
  interests: z.array(z.string()).optional().default([]),
});

export type ContactFormData = z.infer<typeof contactFormSchema>;
// Tipos ya definidos arriba junto a los schemas
