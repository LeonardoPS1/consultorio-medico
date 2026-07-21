import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  decimal,
  numeric,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations, type InferSelectModel, type InferInsertModel } from 'drizzle-orm';
import {
  notificacionTipoEnum,
  novedadTipoEnum,
} from './enums';
import {
  ConfigPrivacidad,
  ConfigIa,
  usuarios,
  pacientes,
  medicos,
  turnos,
} from './core';
import { suscripciones } from './finance';
import { horariosAtencion } from './operations';
import { listaEspera } from './waitlist';

// ============================================================
// Types for JSONB columns
// ============================================================

export interface ConfigRegional {
  pais: string;
  moneda: {
    codigo: string;
    simbolo: string;
    decimales: number;
    formato: string;
  };
  documentoId: {
    tipo: string;
    label: string;
    formato: string;
  };
  sistemaSalud: string[];
  regiones: string;
}

// ============================================================
// TENANTS (multi-tenant)
// ============================================================
export const tenants = pgTable('tenants', {
  id: uuid('id').defaultRandom().primaryKey(),
  nombre: varchar('nombre', { length: 255 }).notNull(),
  subdomain: varchar('subdomain', { length: 100 }).unique().notNull(),
  logoUrl: text('logo_url').default('/aicoremed_dark_1200.svg'),
  dominioCustom: varchar('dominio_custom', { length: 255 }),
  colores: jsonb('colores').default({ primary: '#2563eb', secondary: '#059669' }),
  activo: boolean('activo').notNull().default(true),
  featuresEnabled: jsonb('features_enabled').default({} as Record<string, boolean>),
  configRegional: jsonb('config_regional').default({
    pais: 'CL',
    moneda: { codigo: 'CLP', simbolo: '$', decimales: 0, formato: 'CLP' },
    documentoId: { tipo: 'RUT', label: 'RUT', formato: 'XX.XXX.XXX-X' },
    sistemaSalud: ['Fonasa', 'Isapre'],
    regiones: 'cl',
  } satisfies ConfigRegional),
  configPrivacidad: jsonb('config_privacidad').default({
    periodoRetencionBajaDias: 90,
  } satisfies ConfigPrivacidad),
  configIa: jsonb('config_ia').default({
    prompt:
      'Sos el asistente virtual del consultorio médico. Respondés mensajes de WhatsApp de forma amable y profesional en español neutro chileno. Si detectás una urgencia, priorizala y notificá al médico.',
    maxTokens: 300,
    temperatura: 0.3,
    asistenteHabilitado: true,
    modoDefault: 'silencioso',
    sugerenciasHabilitadas: {
      conversaciones: true,
      pacientes: true,
      turnos: true,
      recetas: true,
    },
    promptAsistente:
      'Sos el asistente IA del consultorio médico. Ayudás al médico con información rápida, sugerencias de respuestas para pacientes, resúmenes de historiales y recordatorios de turnos. Respondés en español neutro chileno, de forma concisa y profesional. Si no sabés algo, decilo honestamente. Nunca inventes datos médicos.',
    maxTokensAsistente: 400,
    temperaturaAsistente: 0.3,
    transcripcionHabilitada: false,
    retencionAudioHoras: 0,
  } satisfies ConfigIa),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type Tenant = InferSelectModel<typeof tenants>;

// ============================================================
// SUCURSALES (multi-sucursal)
// ============================================================
export const sucursales = pgTable('sucursales', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .notNull()
    .default('00000000-0000-0000-0000-000000000000')
    .references(() => tenants.id),
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
// PORTAL CONFIG (configuración por tenant)
// ============================================================
export const portalConfig = pgTable('portal_config', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .notNull()
    .unique()
    .references(() => tenants.id),
  allowBooking: boolean('allow_booking').notNull().default(true),
  allowPayments: boolean('allow_payments').notNull().default(false),
  maxCancelacionesMes: integer('max_cancelaciones_mes').notNull().default(3),
  bookingLeadTimeHours: integer('booking_lead_time_hours').notNull().default(24),
  bookingWindowDays: integer('booking_window_days').notNull().default(30),
  depositRequired: boolean('deposit_required').notNull().default(false),
  depositAmount: decimal('deposit_amount', { precision: 10, scale: 2 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type PortalConfig = InferSelectModel<typeof portalConfig>;
export type NewPortalConfig = InferInsertModel<typeof portalConfig>;

// ============================================================
// ONBOARDING PROGRESS
// ============================================================
export const onboardingProgress = pgTable(
  'onboarding_progress',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    usuarioId: uuid('usuario_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    stepId: varchar('step_id', { length: 50 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    uniqueUsuarioStep: uniqueIndex('idx_onboarding_progress_unique').on(
      table.usuarioId,
      table.stepId,
    ),
    idxUsuario: index('idx_onboarding_progress_usuario').on(table.usuarioId),
  }),
);

// ============================================================
// USER FEATURE OVERRIDES
// ============================================================
export const userFeatureOverrides = pgTable(
  'user_feature_overrides',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    usuarioId: uuid('usuario_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    featureId: varchar('feature_id', { length: 50 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    uniqueUsuarioFeature: uniqueIndex('idx_user_feature_overrides_unique').on(
      table.usuarioId,
      table.featureId,
    ),
    idxUsuario: index('idx_user_feature_overrides_usuario').on(table.usuarioId),
  }),
);

// ============================================================
// NOTIFICACIONES (in-app)
// ============================================================
export const notificaciones = pgTable(
  'notificaciones',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    usuarioId: uuid('usuario_id').notNull(),
    titulo: varchar('titulo', { length: 255 }).notNull(),
    descripcion: text('descripcion'),
    tipo: notificacionTipoEnum('tipo').notNull().default('sistema'),
    prioridad: integer('prioridad').notNull().default(4),
    leido: boolean('leido').notNull().default(false),
    href: varchar('href', { length: 500 }),
    pacienteId: uuid('paciente_id'),
    metadata: jsonb('metadata').default({}),
    tenantId: uuid('tenant_id').default('00000000-0000-0000-0000-000000000000'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    idxNotificacionesUsuario: index('idx_notificaciones_usuario').on(table.usuarioId),
    idxNotificacionesLeido: index('idx_notificaciones_leido').on(table.usuarioId, table.leido),
    idxNotificacionesCreatedAt: index('idx_notificaciones_created_at').on(table.createdAt),
    idxNotificacionesPaciente: index('idx_notificaciones_paciente').on(table.pacienteId),
    idxNotificacionesPrioridad: index('idx_notificaciones_prioridad').on(table.usuarioId, table.prioridad),
  }),
);

export type Notificacion = InferSelectModel<typeof notificaciones>;
export type NewNotificacion = InferInsertModel<typeof notificaciones>;

// ============================================================
// PUSH SUBSCRIPTIONS (Web Push API)
// ============================================================
export const pushSubscriptions = pgTable(
  'push_subscriptions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    usuarioId: uuid('usuario_id').references(() => usuarios.id),
    pacienteId: uuid('paciente_id').references(() => pacientes.id),
    endpoint: text('endpoint').notNull(),
    auth: varchar('auth', { length: 255 }).notNull(),
    p256dh: varchar('p256dh', { length: 255 }).notNull(),
    userAgent: text('user_agent'),
    activa: boolean('activa').notNull().default(true),
    tenantId: uuid('tenant_id').default('00000000-0000-0000-0000-000000000000'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    idxPushUsuario: index('idx_push_usuario').on(table.usuarioId),
    idxPushPaciente: index('idx_push_paciente').on(table.pacienteId),
    idxPushEndpoint: uniqueIndex('idx_push_endpoint').on(table.endpoint),
  }),
);

export type PushSubscriptionDB = InferSelectModel<typeof pushSubscriptions>;
export type NewPushSubscription = InferInsertModel<typeof pushSubscriptions>;

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
  silenciarPorTipo: jsonb('silenciar_por_tipo').default({ turno: false, mensaje: false, receta: false, urgencia: false, sistema: false }),
  tenantId: uuid('tenant_id').default('00000000-0000-0000-0000-000000000000'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type PreferenciasNotificacion = InferSelectModel<typeof preferenciasNotificaciones>;
export type NewPreferenciasNotificacion = InferInsertModel<typeof preferenciasNotificaciones>;

// ============================================================
// LEAD CAPTURES (Contact Form)
// ============================================================
export const leadCaptures = pgTable(
  'lead_captures',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    phone: varchar('phone', { length: 50 }),
    specialty: varchar('specialty', { length: 100 }),
    size: varchar('size', { length: 50 }),
    interests: text('interests').array(),
    status: varchar('status', { length: 20 }).notNull().default('new'),
    source: varchar('source', { length: 100 }).notNull().default('landing-contact'),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    idxLeadCapturesEmail: index('idx_lead_captures_email').on(table.email),
    idxLeadCapturesStatus: index('idx_lead_captures_status').on(table.status),
    idxLeadCapturesCreatedAt: index('idx_lead_captures_created_at').on(table.createdAt),
  }),
);

export type LeadCapture = InferSelectModel<typeof leadCaptures>;
export type NewLeadCapture = InferInsertModel<typeof leadCaptures>;

// ============================================================
// WEB VITALS METRICS
// ============================================================
export const webVitalsMetrics = pgTable(
  'web_vitals_metrics',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 20 }).notNull(),
    value: numeric('value').notNull(),
    rating: varchar('rating', { length: 20 }).notNull(),
    url: text('url'),
    userAgent: text('user_agent'),
    medicoId: uuid('medico_id'),
    tenantId: uuid('tenant_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    idxWebVitalsName: index('idx_web_vitals_name').on(table.name),
    idxWebVitalsCreatedAt: index('idx_web_vitals_created_at').on(table.createdAt),
    idxWebVitalsUrl: index('idx_web_vitals_url').on(table.url),
    idxWebVitalsTenant: index('idx_web_vitals_tenant').on(table.tenantId),
  }),
);

export type WebVitalsMetric = InferSelectModel<typeof webVitalsMetrics>;
export type NewWebVitalsMetric = InferInsertModel<typeof webVitalsMetrics>;

// ============================================================
// NOVEDADES / CHANGELOG
// ============================================================
export const novedades = pgTable(
  'novedades',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    version: varchar('version', { length: 20 }).notNull(),
    titulo: varchar('titulo', { length: 255 }).notNull(),
    items: jsonb('items').notNull().default('[]'),
    fecha: timestamp('fecha', { withTimezone: true }).notNull().defaultNow(),
    tipo: varchar('tipo', { length: 20 }).notNull().default('feature'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    idxNovedadesFecha: index('idx_novedades_fecha').on(table.fecha),
    idxNovedadesVersion: index('idx_novedades_version').on(table.version),
  }),
);

export type Novedad = InferSelectModel<typeof novedades>;
export type NewNovedad = InferInsertModel<typeof novedades>;

// ============================================================
// DERIVACIONES (interconsultas entre médicos/especialistas)
// ============================================================
export const derivaciones = pgTable(
  'derivaciones',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    pacienteId: uuid('paciente_id')
      .notNull()
      .references(() => pacientes.id),
    medicoOrigenId: uuid('medico_origen_id')
      .notNull()
      .references(() => medicos.id),
    medicoDestinoId: uuid('medico_destino_id').references(() => medicos.id),
    especialidad: varchar('especialidad', { length: 100 }).notNull(),
    motivo: text('motivo').notNull(),
    diagnostico: text('diagnostico'),
    cie10Codigo: varchar('cie10_codigo', { length: 10 }),
    gravedad: varchar('gravedad', { length: 20 }).notNull().default('normal'),
    estado: varchar('estado', { length: 20 }).notNull().default('pendiente'),
    notasOrigen: text('notas_origen'),
    notasDestino: text('notas_destino'),
    fechaRespuesta: timestamp('fecha_respuesta', { withTimezone: true }),
    sucursalId: uuid('sucursal_id').references(() => sucursales.id),
    tenantId: uuid('tenant_id').default('00000000-0000-0000-0000-000000000000'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    idxDerivacionesPaciente: index('idx_derivaciones_paciente').on(table.pacienteId),
    idxDerivacionesEstado: index('idx_derivaciones_estado').on(table.estado),
    idxDerivacionesMedicoOrigen: index('idx_derivaciones_medico_origen').on(table.medicoOrigenId),
    idxDerivacionesMedicoDestino: index('idx_derivaciones_medico_destino').on(
      table.medicoDestinoId,
    ),
    idxDerivacionesCreatedAt: index('idx_derivaciones_created_at').on(table.createdAt),
  }),
);

export type Derivation = InferSelectModel<typeof derivaciones>;
export type NewDerivation = InferInsertModel<typeof derivaciones>;

// ============================================================
// RELACIONES
// ============================================================
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
  listaEspera: many(listaEspera),
}));
