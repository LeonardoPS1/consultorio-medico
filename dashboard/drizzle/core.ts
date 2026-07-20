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
} from 'drizzle-orm/pg-core';
import { relations, sql, type InferSelectModel, type InferInsertModel } from 'drizzle-orm';
import {
  rolEnum,
  turnoTipoEnum,
  turnoEstadoEnum,
} from './enums';
import { tenants, sucursales } from './tenant';
import { regiones, comunas } from './location';
import { conversaciones } from './communication';
import {
  historialMedico,
  notasSoap,
  recetas,
  pacienteEventos,
} from './medical';
import { tareasPendientes, servicios } from './operations';
import { listaEspera } from './waitlist';
import { blacklist, consentimientos } from './access';

// ============================================================
// USUARIOS
// ============================================================
export const usuarios = pgTable('usuarios', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  nombre: varchar('nombre', { length: 255 }).notNull(),
  rol: rolEnum('rol').notNull().default('medico'),
  activo: boolean('activo').notNull().default(true),
  ultimoAcceso: timestamp('ultimo_acceso', { withTimezone: true }),
  secreto2fa: varchar('secreto_2fa', { length: 255 }),
  activo2fa: boolean('activo_2fa').notNull().default(false),
  backupCodes: text('backup_codes'),
  tenantId: uuid('tenant_id')
    .default('00000000-0000-0000-0000-000000000000')
    .references(() => tenants.id),
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
export const medicos = pgTable(
  'medicos',
  {
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
  },
  (table) => ({
    idxMedicosUsuarioId: index('idx_medicos_usuario_id').on(table.usuarioId),
    idxMedicosSucursalId: index('idx_medicos_sucursal_id').on(table.sucursalId),
  }),
);

// ============================================================
// PACIENTES
// ============================================================
export const pacientes = pgTable(
  'pacientes',
  {
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
    isapreNombre: varchar('isapre_nombre', { length: 100 }),
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
    ultimoAccesoPortal: timestamp('ultimo_acceso_portal', { withTimezone: true }),
    maxCancelacionesMes: integer('max_cancelaciones_mes').notNull().default(3),
    bajaSolicitadaAt: timestamp('baja_solicitada_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    idxPacientesSucursalId: index('idx_pacientes_sucursal_id').on(table.sucursalId),
    idxPacientesCreatedAt: index('idx_pacientes_created_at').on(table.createdAt),
    idxPacientesRut: index('idx_pacientes_rut').on(table.rut),
  }),
);

// ============================================================
// TURNOS
// ============================================================
export const turnos = pgTable(
  'turnos',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    pacienteId: uuid('paciente_id')
      .notNull()
      .references(() => pacientes.id),
    medicoId: uuid('medico_id')
      .notNull()
      .references(() => medicos.id),
    fechaHora: timestamp('fecha_hora', { withTimezone: true }).notNull(),
    duracionMinutos: integer('duracion_minutos').notNull().default(30),
    motivo: text('motivo'),
    estado: turnoEstadoEnum('estado').notNull().default('pendiente'),
    tipoConsulta: turnoTipoEnum('tipo_consulta').notNull().default('consulta'),
    linkVideollamada: text('link_videollamada'),
    notasPaciente: text('notas_paciente'),
    notasMedico: text('notas_medico'),
    recordatorio24hEnviado: boolean('recordatorio_24h_enviado').notNull().default(false),
    recordatorio1hEnviado: boolean('recordatorio_1h_enviado').notNull().default(false),
    recordatorio48hEnviado: boolean('recordatorio_48h_enviado').notNull().default(false),
    recordatorio24hLeido: boolean('recordatorio_24h_leido').default(false),
    recordatorio1hLeido: boolean('recordatorio_1h_leido').default(false),
    confirmoAsistencia: boolean('confirmo_asistencia').default(false),
    riskScore: decimal('risk_score', { precision: 4, scale: 1 }),
    riskNivel: varchar('risk_nivel', { length: 10 }),
    riskCalculatedAt: timestamp('risk_calculated_at', { withTimezone: true }),
    fuente: varchar('fuente', { length: 20 }).default('whatsapp'),
    sucursalId: uuid('sucursal_id').references(() => sucursales.id),
    creadoPor: uuid('creado_por').references(() => usuarios.id),
    canceladoPor: varchar('cancelado_por', { length: 20 }),
    motivoCancelacion: text('motivo_cancelacion'),
    googleCalendarEventId: varchar('google_calendar_event_id', { length: 500 }),
    n8nWorkflowExecutionId: varchar('n8n_workflow_execution_id', { length: 255 }),
    inicioAtencionAt: timestamp('inicio_atencion_at', { withTimezone: true }),
    pagado: boolean('pagado').notNull().default(false),
    precio: decimal('precio', { precision: 10, scale: 2 }),
    metodoPago: varchar('metodo_pago', { length: 30 }),
    pagadoAt: timestamp('pagado_at', { withTimezone: true }),
    metadata: jsonb('metadata').default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    idxTurnosFechaHora: index('idx_turnos_fecha_hora').on(table.fechaHora),
    idxTurnosMedicoFecha: index('idx_turnos_medico_fecha').on(table.medicoId, table.fechaHora),
    idxTurnosEstado: index('idx_turnos_estado').on(table.estado),
    idxTurnosPacienteId: index('idx_turnos_paciente_id').on(table.pacienteId),
    idxTurnosSucursalId: index('idx_turnos_sucursal_id').on(table.sucursalId),
  }),
);

// ============================================================
// CREDENCIALES (Centralizadas)
// ============================================================
export const credenciales = pgTable(
  'credenciales',
  {
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
  },
  (table) => ({
    uniqueServicioClave: uniqueIndex('idx_credenciales_unique').on(table.servicio, table.clave),
    idxServicio: index('idx_credenciales_servicio').on(table.servicio),
  }),
);

// ============================================================
// INTERFACES DE CONFIGURACIÓN
// ============================================================
export interface ConfigPrivacidad {
  periodoRetencionBajaDias: number;
}

export interface ConfigIa {
  prompt: string;
  maxTokens: number;
  temperatura: number;
  asistenteHabilitado?: boolean;
  modoDefault?: 'silencioso' | 'sugerente' | 'activo';
  sugerenciasHabilitadas?: {
    conversaciones?: boolean;
    pacientes?: boolean;
    turnos?: boolean;
    recetas?: boolean;
  };
  promptAsistente?: string;
  maxTokensAsistente?: number;
  temperaturaAsistente?: number;
}

// ============================================================
// RELACIONES
// ============================================================
export const usuariosRelations = relations(usuarios, ({ one }) => ({
  tenant: one(tenants, {
    fields: [usuarios.tenantId],
    references: [tenants.id],
  }),
}));

export const pacientesRelations = relations(pacientes, ({ many, one }) => ({
  turnos: many(turnos),
  conversaciones: many(conversaciones),
  historialMedico: many(historialMedico),
  notasSoap: many(notasSoap),
  recetas: many(recetas),
  pacienteEventos: many(pacienteEventos),
  tareasPendientes: many(tareasPendientes),
  listaEspera: many(listaEspera),
  blacklist: many(blacklist),
  consentimientos: many(consentimientos),
  sucursal: one(sucursales, {
    fields: [pacientes.sucursalId],
    references: [sucursales.id],
  }),
}));

export const medicosRelations = relations(medicos, ({ many, one }) => ({
  turnos: many(turnos),
  recetas: many(recetas),
  notasSoap: many(notasSoap),
  servicios: many(servicios),
  listaEspera: many(listaEspera),
  sucursal: one(sucursales, {
    fields: [medicos.sucursalId],
    references: [sucursales.id],
  }),
}));

export const turnosRelations = relations(turnos, ({ one, many }) => ({
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
  notasSoap: many(notasSoap),
}));
