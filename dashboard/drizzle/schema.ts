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
import { relations, sql, type InferSelectModel, type InferInsertModel } from 'drizzle-orm';

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
  tenantId: uuid('tenant_id').default('00000000-0000-0000-0000-000000000000').references(() => tenants.id),
  plan: varchar('plan', { length: 50 }).notNull().default('free'),
  resetToken: varchar('reset_token', { length: 255 }),
  resetTokenExpires: timestamp('reset_token_expires', { withTimezone: true }),
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
  rut: varchar('rut', { length: 20 }),
  horarios: jsonb('horarios').default({}),
  duracionTurnoMinutos: integer('duracion_turno_minutos').notNull().default(30),
  activo: boolean('activo').notNull().default(true),
  colorEvento: varchar('color_evento', { length: 7 }).default('#3B82F6'),
  sucursalId: uuid('sucursal_id').references(() => sucursales.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

// ============================================================
// REGIONES DE CHILE
// ============================================================
export const regiones = pgTable('regiones', {
  id: uuid('id').defaultRandom().primaryKey(),
  nombre: varchar('nombre', { length: 100 }).notNull().unique(),
  numeroRomano: varchar('numero_romano', { length: 10 }), // ej: 'XV', 'I', 'RM'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ============================================================
// COMUNAS DE CHILE
// ============================================================
export const comunas = pgTable('comunas', {
  id: uuid('id').defaultRandom().primaryKey(),
  nombre: varchar('nombre', { length: 100 }).notNull(),
  regionId: uuid('region_id').notNull().references(() => regiones.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
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
  rut: varchar('rut', { length: 20 }),
  fechaNacimiento: date('fecha_nacimiento'),
  direccion: text('direccion'),
  comuna: varchar('comuna', { length: 100 }),
  region: varchar('region', { length: 100 }),
  regionId: uuid('region_id').references(() => regiones.id),
  comunaId: uuid('comuna_id').references(() => comunas.id),
  obraSocial: varchar('obra_social', { length: 255 }),
  sistemaSalud: varchar('sistema_salud', { length: 20 }),
  sucursalId: uuid('sucursal_id').references(() => sucursales.id),
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
  portalToken: varchar('portal_token', { length: 255 }),
  portalTokenExpires: timestamp('portal_token_expires', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

// ============================================================
// PACIENTE EVENTOS (historial de contacto)
// ============================================================
export const pacienteEventos = pgTable('paciente_eventos', {
  id: uuid('id').defaultRandom().primaryKey(),
  pacienteId: uuid('paciente_id').notNull().references(() => pacientes.id),
  tipo: varchar('tipo', { length: 30 }).notNull(),
  descripcion: text('descripcion'),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
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
  sucursalId: uuid('sucursal_id').references(() => sucursales.id),
  creadoPor: uuid('creado_por').references(() => usuarios.id),
  canceladoPor: varchar('cancelado_por', { length: 20 }),
  motivoCancelacion: text('motivo_cancelacion'),
  googleCalendarEventId: varchar('google_calendar_event_id', { length: 500 }),
  n8nWorkflowExecutionId: varchar('n8n_workflow_execution_id', { length: 255 }),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
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
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

// ============================================================
// BLOQUEOS DE AGENDA (vacaciones, feriados, capacitaciones)
// ============================================================
export const bloqueosAgenda = pgTable('bloqueos_agenda', {
  id: uuid('id').defaultRandom().primaryKey(),
  medicoId: uuid('medico_id').notNull().references(() => medicos.id),
  titulo: varchar('titulo', { length: 255 }).notNull(),
  fechaInicio: timestamp('fecha_inicio', { withTimezone: true }).notNull(),
  fechaFin: timestamp('fecha_fin', { withTimezone: true }).notNull(),
  tipo: varchar('tipo', { length: 20 }).notNull().default('bloqueo'),
  motivo: text('motivo'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
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
  proximoRecordatorio: timestamp('proximo_recordatorio', { withTimezone: true }),
  contextoIa: jsonb('contexto_ia').default({}),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => ({
  idxEstado: index('idx_conversaciones_estado').on(table.estado),
}));

// ============================================================
// PLANTILLAS WHATSAPP (templates aprobados por Twilio)
// ============================================================
export const plantillasWhatsapp = pgTable('plantillas_whatsapp', {
  id: uuid('id').defaultRandom().primaryKey(),
  nombre: varchar('nombre', { length: 255 }).notNull(),
  idioma: varchar('idioma', { length: 10 }).notNull().default('es'),
  categoria: varchar('categoria', { length: 30 }).notNull(),
  contenido: text('contenido').notNull(),
  variables: text('variables').array().default(sql`'{}'`),
  estado: varchar('estado', { length: 20 }).notNull().default('pendiente'),
  twilioTemplateSid: varchar('twilio_template_sid', { length: 255 }),
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
  templateName: varchar('template_name', { length: 100 }),
  templateParams: jsonb('template_params').default({}),
  costo: decimal('costo', { precision: 10, scale: 6 }),
  n8nExecutionId: varchar('n8n_execution_id', { length: 255 }),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ============================================================
// TAREAS PENDIENTES (seguimiento)
// ============================================================
export const tareasPendientes = pgTable('tareas_pendientes', {
  id: uuid('id').defaultRandom().primaryKey(),
  pacienteId: uuid('paciente_id').notNull().references(() => pacientes.id),
  medicoId: uuid('medico_id').references(() => medicos.id),
  tipo: varchar('tipo', { length: 30 }).notNull(),
  descripcion: text('descripcion').notNull(),
  estado: varchar('estado', { length: 20 }).notNull().default('pendiente'),
  prioridad: varchar('prioridad', { length: 10 }).notNull().default('normal'),
  asignadoA: uuid('asignado_a').references(() => usuarios.id),
  fechaLimite: timestamp('fecha_limite', { withTimezone: true }),
  completadaAt: timestamp('completada_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
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
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
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
// WORKFLOW ERRORS (n8n)
// ============================================================
export const workflowErrors = pgTable('workflow_errors', {
  id: uuid('id').defaultRandom().primaryKey(),
  workflowId: varchar('workflow_id', { length: 255 }).notNull(),
  executionId: varchar('execution_id', { length: 255 }),
  nodo: varchar('nodo', { length: 255 }),
  codigo: varchar('codigo', { length: 50 }),
  mensajeError: text('mensaje_error'),
  detalle: jsonb('detalle'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ============================================================
// AUDITORIA DE ACCESOS A DATOS MÉDICOS
// ============================================================
export const auditoriaAccesos = pgTable('auditoria_accesos', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id),
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
  idxTenant: index('idx_auditoria_tenant').on(table.tenantId),
}));

// ============================================================
// RELACIONES
// ============================================================
export const usuariosRelations = relations(usuarios, ({ one }) => ({
  tenant: one(tenants, {
    fields: [usuarios.tenantId],
    references: [tenants.id],
  }),
}));

export const auditoriaAccesosRelations = relations(auditoriaAccesos, ({ one }) => ({
  tenant: one(tenants, {
    fields: [auditoriaAccesos.tenantId],
    references: [tenants.id],
  }),
  usuario: one(usuarios, {
    fields: [auditoriaAccesos.usuarioId],
    references: [usuarios.id],
  }),
}));

export const pacientesRelations = relations(pacientes, ({ many, one }) => ({
  turnos: many(turnos),
  conversaciones: many(conversaciones),
  historialMedico: many(historialMedico),
  recetas: many(recetas),
  pacienteEventos: many(pacienteEventos),
  tareasPendientes: many(tareasPendientes),
  sucursal: one(sucursales, {
    fields: [pacientes.sucursalId],
    references: [sucursales.id],
  }),
}));

export const regionesRelations = relations(regiones, ({ many }) => ({
  comunas: many(comunas),
}));

export const comunasRelations = relations(comunas, ({ one }) => ({
  region: one(regiones, {
    fields: [comunas.regionId],
    references: [regiones.id],
  }),
}));

export const medicosRelations = relations(medicos, ({ many, one }) => ({
  turnos: many(turnos),
  recetas: many(recetas),
  servicios: many(servicios),
  sucursal: one(sucursales, {
    fields: [medicos.sucursalId],
    references: [sucursales.id],
  }),
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
  sucursal: one(sucursales, {
    fields: [turnos.sucursalId],
    references: [sucursales.id],
  }),
}));

export const conversacionesRelations = relations(conversaciones, ({ one, many }) => ({
  paciente: one(pacientes, {
    fields: [conversaciones.pacienteId],
    references: [pacientes.id],
  }),
  mensajes: many(mensajes),
}));

export const pacienteEventosRelations = relations(pacienteEventos, ({ one }) => ({
  paciente: one(pacientes, {
    fields: [pacienteEventos.pacienteId],
    references: [pacientes.id],
  }),
}));

export const bloqueosAgendaRelations = relations(bloqueosAgenda, ({ one }) => ({
  medico: one(medicos, {
    fields: [bloqueosAgenda.medicoId],
    references: [medicos.id],
  }),
}));

export const tareasPendientesRelations = relations(tareasPendientes, ({ one }) => ({
  paciente: one(pacientes, {
    fields: [tareasPendientes.pacienteId],
    references: [pacientes.id],
  }),
  medico: one(medicos, {
    fields: [tareasPendientes.medicoId],
    references: [medicos.id],
  }),
  asignadoA: one(usuarios, {
    fields: [tareasPendientes.asignadoA],
    references: [usuarios.id],
  }),
}));

// ============================================================
// TENANTS (multi-tenant)
// ============================================================
export const tenants = pgTable('tenants', {
  id: uuid('id').defaultRandom().primaryKey(),
  nombre: varchar('nombre', { length: 255 }).notNull(),
  subdomain: varchar('subdomain', { length: 100 }).unique().notNull(),
  logoUrl: text('logo_url').default('/aicoremed_dark_1200.svg'),
  colores: jsonb('colores').default({ primary: '#2563eb' }),
  activo: boolean('activo').notNull().default(true),
  featuresEnabled: jsonb('features_enabled').default({} as Record<string, boolean>),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ============================================================
// SUCURSALES (multi-sucursal)
// ============================================================
export const sucursales = pgTable('sucursales', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().default('00000000-0000-0000-0000-000000000000').references(() => tenants.id),
  nombre: varchar('nombre', { length: 255 }).notNull(),
  direccion: text('direccion'),
  telefono: varchar('telefono', { length: 20 }),
  email: varchar('email', { length: 255 }),
  activo: boolean('activo').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type Sucursal = InferSelectModel<typeof sucursales>;
export type NewSucursal = InferInsertModel<typeof sucursales>;

// ============================================================
// SUSCRIPCIONES (MercadoPago)
// ============================================================
export const suscripciones = pgTable('suscripciones', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizacionId: uuid('organizacion_id').notNull().default('00000000-0000-0000-0000-000000000000').references(() => tenants.id),
  plan: varchar('plan', { length: 50 }).notNull().default('free'),
  estado: varchar('estado', { length: 50 }).notNull().default('free'),
  mercadopagoPreferenceId: varchar('mercadopago_preference_id', { length: 255 }),
  mercadopagoPaymentId: varchar('mercadopago_payment_id', { length: 255 }),
  mercadopagoMerchantOrderId: varchar('mercadopago_merchant_order_id', { length: 255 }),
  periodStart: timestamp('period_start', { withTimezone: true }),
  periodEnd: timestamp('period_end', { withTimezone: true }),
  trialEnd: timestamp('trial_end', { withTimezone: true }),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type Suscripcion = InferSelectModel<typeof suscripciones>;
export type NewSuscripcion = InferInsertModel<typeof suscripciones>;

export type PlantillaWhatsapp = InferSelectModel<typeof plantillasWhatsapp>;
export type TareaPendiente = InferSelectModel<typeof tareasPendientes>;
export type WorkflowError = InferSelectModel<typeof workflowErrors>;
export type Tenant = InferSelectModel<typeof tenants>;

export const mensajesRelations = relations(mensajes, ({ one }) => ({
  conversacion: one(conversaciones, {
    fields: [mensajes.conversacionId],
    references: [conversaciones.id],
  }),
}));

export const suscripcionesRelations = relations(suscripciones, ({ one }) => ({
  tenant: one(tenants, {
    fields: [suscripciones.organizacionId],
    references: [tenants.id],
  }),
}));

export const tenantsRelations = relations(tenants, ({ many }) => ({
  suscripciones: many(suscripciones),
  usuarios: many(usuarios),
  sucursales: many(sucursales),
}));

export const sucursalesRelations = relations(sucursales, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [sucursales.tenantId],
    references: [tenants.id],
  }),
  medicos: many(medicos),
  pacientes: many(pacientes),
  turnos: many(turnos),
  horariosAtencion: many(horariosAtencion),
}));

// ============================================================
// HORARIOS DE ATENCIÓN
// ============================================================
export const horariosAtencion = pgTable('horarios_atencion', {
  id: uuid('id').defaultRandom().primaryKey(),
  dia: varchar('dia', { length: 20 }).notNull().unique(),
  activo: boolean('activo').notNull().default(true),
  sucursalId: uuid('sucursal_id').references(() => sucursales.id),
  inicio: varchar('inicio', { length: 5 }).notNull().default('09:00'),
  fin: varchar('fin', { length: 5 }).notNull().default('18:00'),
  tenantId: uuid('tenant_id').default('00000000-0000-0000-0000-000000000000'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type HorarioAtencion = InferSelectModel<typeof horariosAtencion>;

export const horariosAtencionRelations = relations(horariosAtencion, ({ one }) => ({
  sucursal: one(sucursales, {
    fields: [horariosAtencion.sucursalId],
    references: [sucursales.id],
  }),
}));

// ============================================================
// PREFERENCIAS DE NOTIFICACIONES
// ============================================================
export const preferenciasNotificaciones = pgTable('preferencias_notificaciones', {
  id: uuid('id').defaultRandom().primaryKey(),
  usuarioId: uuid('usuario_id').notNull(),
  urgenciasWhatsapp: boolean('urgencias_whatsapp').notNull().default(true),
  resumenDiarioEmail: boolean('resumen_diario_email').notNull().default(true),
  alertasAusentismo: boolean('alertas_ausentismo').notNull().default(true),
  nuevosPacientes: boolean('nuevos_pacientes').notNull().default(false),
  whatsappPersonal: varchar('whatsapp_personal', { length: 20 }).default(''),
  tenantId: uuid('tenant_id').default('00000000-0000-0000-0000-000000000000'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type PreferenciasNotificacion = InferSelectModel<typeof preferenciasNotificaciones>;
export type NewPreferenciasNotificacion = InferInsertModel<typeof preferenciasNotificaciones>;

// ============================================================
// PLANTILLAS DE MENSAJES (internas)
// ============================================================
export const plantillasMensajes = pgTable('plantillas_mensajes', {
  id: uuid('id').defaultRandom().primaryKey(),
  nombre: varchar('nombre', { length: 255 }).notNull(),
  contenido: text('contenido').notNull(),
  categoria: varchar('categoria', { length: 50 }).notNull().default('recordatorios'),
  variables: text('variables').array().default(sql`'{}'`),
  activa: boolean('activa').notNull().default(true),
  tenantId: uuid('tenant_id').default('00000000-0000-0000-0000-000000000000'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export type PlantillaMensajeDB = InferSelectModel<typeof plantillasMensajes>;
export type NewPlantillaMensaje = InferInsertModel<typeof plantillasMensajes>;

// ============================================================
// API KEYS (públicas)
// ============================================================
export const apiKeys = pgTable('api_keys', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').default('00000000-0000-0000-0000-000000000000').notNull(),
  nombre: varchar('nombre', { length: 255 }).notNull(),
  keyHash: varchar('key_hash', { length: 255 }).notNull(),
  keyPrefix: varchar('key_prefix', { length: 8 }).notNull(),
  scopes: text('scopes').array().default(sql`'{}'`),
  activa: boolean('activa').notNull().default(true),
  ultimoUso: timestamp('ultimo_uso', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  createdBy: uuid('created_by').references(() => usuarios.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type ApiKey = InferSelectModel<typeof apiKeys>;
export type NewApiKey = InferInsertModel<typeof apiKeys>;
