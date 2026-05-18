import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  decimal,
  date,
  jsonb,
  uniqueIndex,
  index,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

// ============================================================
// USUARIOS
// ============================================================
export const usuarios = pgTable('usuarios', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  nombre: varchar('nombre', { length: 255 }).notNull(),
  rol: varchar('rol', { length: 20 }).notNull().default('medico'),
  activo: boolean('activo').notNull().default(true),
  ultimoAcceso: timestamp('ultimo_acceso', { withTimezone: true }),
  secreto2fa: varchar('secreto_2fa', { length: 255 }),
  activo2fa: boolean('activo_2fa').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

// ============================================================
// MEDICOS
// ============================================================
export const medicos = pgTable('medicos', {
  id: uuid('id').defaultRandom().primaryKey(),
  usuarioId: uuid('usuario_id').references(() => usuarios.id),
  nombre: varchar('nombre', { length: 255 }).notNull(),
  especialidad: varchar('especialidad', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }),
  telefono: varchar('telefono', { length: 20 }),
  whatsapp: varchar('whatsapp', { length: 20 }),
  matricula: varchar('matricula', { length: 50 }),
  horarios: jsonb('horarios').default({}),
  duracionTurnoMinutos: integer('duracion_turno_minutos').notNull().default(30),
  activo: boolean('activo').notNull().default(true),
  colorEvento: varchar('color_evento', { length: 7 }).default('#3B82F6'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

// ============================================================
// PACIENTES
// ============================================================
export const pacientes = pgTable('pacientes', {
  id: uuid('id').defaultRandom().primaryKey(),
  telefono: varchar('telefono', { length: 20 }).unique().notNull(),
  email: varchar('email', { length: 255 }),
  nombre: varchar('nombre', { length: 255 }).notNull(),
  apellido: varchar('apellido', { length: 255 }).notNull(),
  dni: varchar('dni', { length: 20 }),
  fechaNacimiento: date('fecha_nacimiento'),
  direccion: text('direccion'),
  obraSocial: varchar('obra_social', { length: 255 }),
  numeroAfiliado: varchar('numero_afiliado', { length: 100 }),
  alergias: text('alergias'),
  medicacionCronica: text('medicacion_cronica'),
  notasMedicas: text('notas_medicas'),
  canalPreferido: varchar('canal_preferido', { length: 20 }).default('whatsapp'),
  consentimientoWhatsapp: boolean('consentimiento_whatsapp').default(false),
  consentimientoEmail: boolean('consentimiento_email').default(false),
  fuente: varchar('fuente', { length: 50 }).default('whatsapp'),
  tags: text('tags').array().default([]),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

// ============================================================
// TURNOS
// ============================================================
export const turnos = pgTable('turnos', {
  id: uuid('id').defaultRandom().primaryKey(),
  pacienteId: uuid('paciente_id').notNull().references(() => pacientes.id),
  medicoId: uuid('medico_id').notNull().references(() => medicos.id),
  fechaHora: timestamp('fecha_hora', { withTimezone: true }).notNull(),
  duracionMinutos: integer('duracion_minutos').notNull().default(30),
  motivo: text('motivo'),
  estado: varchar('estado', { length: 20 }).notNull().default('pendiente'),
  tipoConsulta: varchar('tipo_consulta', { length: 20 }).notNull().default('presencial'),
  linkVideollamada: text('link_videollamada'),
  notasPaciente: text('notas_paciente'),
  notasMedico: text('notas_medico'),
  recordatorio24hEnviado: boolean('recordatorio_24h_enviado').notNull().default(false),
  recordatorio1hEnviado: boolean('recordatorio_1h_enviado').notNull().default(false),
  recordatorio24hLeido: boolean('recordatorio_24h_leido').default(false),
  recordatorio1hLeido: boolean('recordatorio_1h_leido').default(false),
  confirmoAsistencia: boolean('confirmo_asistencia').default(false),
  fuente: varchar('fuente', { length: 20 }).default('whatsapp'),
  creadoPor: uuid('creado_por').references(() => usuarios.id),
  canceladoPor: varchar('cancelado_por', { length: 20 }),
  motivoCancelacion: text('motivo_cancelacion'),
  googleCalendarEventId: varchar('google_calendar_event_id', { length: 500 }),
  n8nWorkflowExecutionId: varchar('n8n_workflow_execution_id', { length: 255 }),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ============================================================
// SERVICIOS / PRESTACIONES
// ============================================================
export const servicios = pgTable('servicios', {
  id: uuid('id').defaultRandom().primaryKey(),
  medicoId: uuid('medico_id').notNull().references(() => medicos.id),
  nombre: varchar('nombre', { length: 255 }).notNull(),
  descripcion: text('descripcion'),
  duracionMinutos: integer('duracion_minutos').notNull().default(30),
  precio: decimal('precio', { precision: 10, scale: 2 }),
  activo: boolean('activo').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ============================================================
// CONVERSACIONES
// ============================================================
export const conversaciones = pgTable('conversaciones', {
  id: uuid('id').defaultRandom().primaryKey(),
  pacienteId: uuid('paciente_id').notNull().references(() => pacientes.id),
  medicoId: uuid('medico_id').references(() => medicos.id),
  canal: varchar('canal', { length: 20 }).notNull().default('whatsapp'),
  estado: varchar('estado', { length: 20 }).notNull().default('activa'),
  optOut: boolean('opt_out').notNull().default(false),
  optOutAt: timestamp('opt_out_at', { withTimezone: true }),
  ultimoMensaje: text('ultimo_mensaje'),
  ultimoMensajeRol: varchar('ultimo_mensaje_rol', { length: 20 }),
  ultimaIntencion: varchar('ultima_intencion', { length: 30 }),
  ultimaInteraccion: timestamp('ultima_interaccion', { withTimezone: true }).defaultNow().notNull(),
  contextoIa: jsonb('contexto_ia').default({}),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ============================================================
// MENSAJES
// ============================================================
export const mensajes = pgTable('mensajes', {
  id: uuid('id').defaultRandom().primaryKey(),
  conversacionId: uuid('conversacion_id').notNull().references(() => conversaciones.id),
  rol: varchar('rol', { length: 20 }).notNull(),
  contenido: text('contenido').notNull(),
  contenidoProcesado: text('contenido_procesado'),
  tipo: varchar('tipo', { length: 20 }).notNull().default('texto'),
  intencion: varchar('intencion', { length: 30 }),
  confianzaIntencion: decimal('confianza_intencion', { precision: 4, scale: 3 }),
  twilioSid: varchar('twilio_sid', { length: 255 }),
  twilioStatus: varchar('twilio_status', { length: 50 }),
  n8nExecutionId: varchar('n8n_execution_id', { length: 255 }),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ============================================================
// HISTORIAL MÉDICO
// ============================================================
export const historialMedico = pgTable('historial_medico', {
  id: uuid('id').defaultRandom().primaryKey(),
  pacienteId: uuid('paciente_id').notNull().references(() => pacientes.id),
  medicoId: uuid('medico_id').references(() => medicos.id),
  turnoId: uuid('turno_id').references(() => turnos.id),
  tipo: varchar('tipo', { length: 30 }).notNull(),
  titulo: varchar('titulo', { length: 255 }).notNull(),
  descripcion: text('descripcion'),
  diagnosticoCodigo: varchar('diagnostico_codigo', { length: 10 }),
  diagnosticoDescripcion: text('diagnostico_descripcion'),
  archivos: jsonb('archivos').default([]),
  visibleParaPaciente: boolean('visible_para_paciente').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ============================================================
// RECETAS
// ============================================================
export const recetas = pgTable('recetas', {
  id: uuid('id').defaultRandom().primaryKey(),
  pacienteId: uuid('paciente_id').notNull().references(() => pacientes.id),
  medicoId: uuid('medico_id').notNull().references(() => medicos.id),
  turnoId: uuid('turno_id').references(() => turnos.id),
  estado: varchar('estado', { length: 20 }).notNull().default('activa'),
  medicamento: varchar('medicamento', { length: 255 }).notNull(),
  presentacion: varchar('presentacion', { length: 255 }),
  dosis: varchar('dosis', { length: 255 }).notNull(),
  frecuencia: varchar('frecuencia', { length: 255 }).notNull(),
  duracion: varchar('duracion', { length: 255 }),
  cantidadTotal: varchar('cantidad_total', { length: 100 }),
  indicaciones: text('indicaciones'),
  fechaInicio: date('fecha_inicio').notNull().default(sql`CURRENT_DATE`),
  fechaFin: date('fecha_fin'),
  requiereAutorizacion: boolean('requiere_autorizacion').default(false),
  autorizacionObraSocial: boolean('autorizacion_obra_social').default(false),
  recetaAnteriorId: uuid('receta_anterior_id').references((): any => recetas.id),
  pdfGenerado: boolean('pdf_generado').default(false),
  pdfUrl: text('pdf_url'),
  whatsappEnviado: boolean('whatsapp_enviado').default(false),
  whatsappEnviadoAt: timestamp('whatsapp_enviado_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ============================================================
// FACTURACIÓN
// ============================================================
export const facturacion = pgTable('facturacion', {
  id: uuid('id').defaultRandom().primaryKey(),
  pacienteId: uuid('paciente_id').notNull().references(() => pacientes.id),
  turnoId: uuid('turno_id').references(() => turnos.id),
  servicioId: uuid('servicio_id').references(() => servicios.id),
  tipo: varchar('tipo', { length: 20 }).notNull().default('consulta'),
  monto: decimal('monto', { precision: 10, scale: 2 }).notNull(),
  formaPago: varchar('forma_pago', { length: 30 }).default('efectivo'),
  estado: varchar('estado', { length: 20 }).notNull().default('pendiente'),
  pagadaAt: timestamp('pagada_at', { withTimezone: true }),
  observaciones: text('observaciones'),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ============================================================
// CREDENCIALES (Centralizadas)
// ============================================================
export const credenciales = pgTable('credenciales', {
  id: uuid('id').defaultRandom().primaryKey(),
  servicio: varchar('servicio', { length: 50 }).notNull(),
  clave: varchar('clave', { length: 100 }).notNull(),
  valor: text('valor').notNull(),
  encriptado: boolean('encriptado').notNull().default(true),
  etiqueta: varchar('etiqueta', { length: 255 }),
  n8nCredentialId: varchar('n8n_credential_id', { length: 255 }),
  n8nCredentialType: varchar('n8n_credential_type', { length: 100 }),
  orden: integer('orden').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  uniqueServicioClave: uniqueIndex('idx_credenciales_unique').on(table.servicio, table.clave),
  idxServicio: index('idx_credenciales_servicio').on(table.servicio),
}));

// ============================================================
// WORKFLOW LOGS
// ============================================================
export const workflowLogs = pgTable('workflow_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  workflowId: varchar('workflow_id', { length: 255 }).notNull(),
  workflowName: varchar('workflow_name', { length: 255 }),
  executionId: varchar('execution_id', { length: 255 }),
  nivel: varchar('nivel', { length: 10 }).notNull().default('info'),
  mensaje: text('mensaje').notNull(),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ============================================================
// AUDITORIA DE ACCESOS A DATOS MÉDICOS
// ============================================================
export const auditoriaAccesos = pgTable('auditoria_accesos', {
  id: uuid('id').defaultRandom().primaryKey(),
  usuarioId: uuid('usuario_id').references(() => usuarios.id),
  usuarioEmail: varchar('usuario_email', { length: 255 }),
  usuarioNombre: varchar('usuario_nombre', { length: 255 }),
  accion: varchar('accion', { length: 100 }).notNull(),
  entidad: varchar('entidad', { length: 100 }).notNull(),
  entidadId: varchar('entidad_id', { length: 255 }),
  detalle: text('detalle'),
  ip: varchar('ip', { length: 45 }),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  idxAccion: index('idx_auditoria_accion').on(table.accion),
  idxEntidad: index('idx_auditoria_entidad').on(table.entidad),
  idxCreatedAt: index('idx_auditoria_created_at').on(table.createdAt),
  idxUsuario: index('idx_auditoria_usuario').on(table.usuarioId),
}));

// ============================================================
// RELACIONES
// ============================================================
export const pacientesRelations = relations(pacientes, ({ many }) => ({
  turnos: many(turnos),
  conversaciones: many(conversaciones),
  historialMedico: many(historialMedico),
  recetas: many(recetas),
}));

export const medicosRelations = relations(medicos, ({ many }) => ({
  turnos: many(turnos),
  servicios: many(servicios),
  conversaciones: many(conversaciones),
}));

export const turnosRelations = relations(turnos, ({ one }) => ({
  paciente: one(pacientes, {
    fields: [turnos.pacienteId],
    references: [pacientes.id],
  }),
  medico: one(medicos, {
    fields: [turnos.medicoId],
    references: [medicos.id],
  }),
}));

export const conversacionesRelations = relations(conversaciones, ({ one, many }) => ({
  paciente: one(pacientes, {
    fields: [conversaciones.pacienteId],
    references: [pacientes.id],
  }),
  mensajes: many(mensajes),
}));

export const mensajesRelations = relations(mensajes, ({ one }) => ({
  conversacion: one(conversaciones, {
    fields: [mensajes.conversacionId],
    references: [conversaciones.id],
  }),
}));
