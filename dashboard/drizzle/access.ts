import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations, sql, type InferSelectModel, type InferInsertModel } from 'drizzle-orm';
import {
  consentimientoTipoEnum,
  consentimientoEstadoEnum,
} from './enums';
import { usuarios, pacientes, medicos } from './core';
import { tenants, sucursales } from './tenant';

// ============================================================
// AUDITORIA DE ACCESOS A DATOS MÉDICOS
// ============================================================
export const auditoriaAccesos = pgTable(
  'auditoria_accesos',
  {
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
  },
  (table) => ({
    idxAccion: index('idx_auditoria_accion').on(table.accion),
    idxEntidad: index('idx_auditoria_entidad').on(table.entidad),
    idxCreatedAt: index('idx_auditoria_created_at').on(table.createdAt),
    idxUsuario: index('idx_auditoria_usuario').on(table.usuarioId),
    idxTenant: index('idx_auditoria_tenant').on(table.tenantId),
  }),
);

// ============================================================
// RATE LIMITS (persistente en PostgreSQL)
// ============================================================
export const rateLimits = pgTable(
  'rate_limits',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    key: varchar('key', { length: 255 }).notNull(),
    maxRequests: integer('max_requests').notNull(),
    count: integer('count').notNull().default(0),
    windowMs: integer('window_ms').notNull(),
    resetAt: timestamp('reset_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    rateLimitsUniqueKey: uniqueIndex('idx_rate_limits_key').on(table.key),
  }),
);

// ============================================================
// ACCOUNT LOCKOUTS (persistente en PostgreSQL)
// ============================================================
export const accountLockouts = pgTable(
  'account_lockouts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    email: varchar('email', { length: 255 }).notNull(),
    attempts: integer('attempts').notNull().default(1),
    lockedUntil: timestamp('locked_until', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    accountLockoutsIndex: index('idx_account_lockouts_email').on(table.email),
  }),
);

// ============================================================
// API KEYS (públicas)
// ============================================================
export const apiKeys = pgTable('api_keys', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').default('00000000-0000-0000-0000-000000000000').notNull(),
  nombre: varchar('nombre', { length: 255 }).notNull(),
  keyHash: varchar('key_hash', { length: 255 }).notNull(),
  keyPrefix: varchar('key_prefix', { length: 8 }).notNull(),
  scopes: text('scopes')
    .array()
    .default(sql`'{}'`),
  activa: boolean('activa').notNull().default(true),
  ultimoUso: timestamp('ultimo_uso', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  createdBy: uuid('created_by').references(() => usuarios.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type ApiKey = InferSelectModel<typeof apiKeys>;
export type NewApiKey = InferInsertModel<typeof apiKeys>;

// ============================================================
// CONSENTIMIENTO LOG (historial de cambios de consentimiento)
// ============================================================
export const consentimientoLog = pgTable(
  'consentimiento_log',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    pacienteId: uuid('paciente_id')
      .notNull()
      .references(() => pacientes.id),
    tipo: varchar('tipo', { length: 30 }).notNull(),
    accion: varchar('accion', { length: 20 }).notNull(),
    aceptado: boolean('aceptado').notNull(),
    ip: varchar('ip', { length: 45 }),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    idxConsentimientoPaciente: index('idx_consentimiento_paciente').on(table.pacienteId),
    idxConsentimientoTipo: index('idx_consentimiento_tipo').on(table.tipo),
    idxConsentimientoCreatedAt: index('idx_consentimiento_created_at').on(table.createdAt),
  }),
);

export type ConsentimientoLog = InferSelectModel<typeof consentimientoLog>;
export type NewConsentimientoLog = InferInsertModel<typeof consentimientoLog>;

// ============================================================
// LISTA NEGRA (blacklist de pacientes)
// ============================================================
export const blacklist = pgTable(
  'blacklist',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    pacienteId: uuid('paciente_id')
      .notNull()
      .references(() => pacientes.id),
    motivo: text('motivo').notNull(),
    activo: boolean('activo').default(true).notNull(),
    bloqueadoHasta: timestamp('bloqueado_hasta', { withTimezone: true }),
    creadoPor: uuid('creado_por').references(() => medicos.id),
    sucursalId: uuid('sucursal_id').references(() => sucursales.id),
    tenantId: uuid('tenant_id').default('00000000-0000-0000-0000-000000000000'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    idxBlacklistPaciente: index('idx_blacklist_paciente').on(table.pacienteId),
    idxBlacklistActivo: index('idx_blacklist_activo').on(table.activo),
    idxBlacklistCreatedAt: index('idx_blacklist_created_at').on(table.createdAt),
  }),
);

export type BlacklistEntry = InferSelectModel<typeof blacklist>;
export type NewBlacklistEntry = InferInsertModel<typeof blacklist>;

// ============================================================
// CONSENTIMIENTOS INFORMADOS
// ============================================================
export const consentimientos = pgTable(
  'consentimientos',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    pacienteId: uuid('paciente_id')
      .notNull()
      .references(() => pacientes.id),
    tipo: consentimientoTipoEnum('tipo').notNull().default('tratamiento'),
    estado: consentimientoEstadoEnum('estado').notNull().default('pendiente'),
    titulo: varchar('titulo', { length: 255 }).notNull(),
    descripcion: text('descripcion'),
    fechaFirma: timestamp('fecha_firma', { withTimezone: true }),
    ipFirma: varchar('ip_firma', { length: 50 }),
    nombrePaciente: varchar('nombre_paciente', { length: 255 }).notNull(),
    rutPaciente: varchar('rut_paciente', { length: 20 }),
    documentoPdf: text('documento_pdf'),
    metadata: jsonb('metadata').default({}),
    medicoId: uuid('medico_id').references(() => medicos.id),
    sucursalId: uuid('sucursal_id').references(() => sucursales.id),
    tenantId: uuid('tenant_id').default('00000000-0000-0000-0000-000000000000'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    idxConsentimientosPaciente: index('idx_consentimientos_paciente').on(table.pacienteId),
    idxConsentimientosTipo: index('idx_consentimientos_tipo').on(table.tipo),
    idxConsentimientosCreatedAt: index('idx_consentimientos_created_at').on(table.createdAt),
  }),
);

export type Consentimiento = InferSelectModel<typeof consentimientos>;
export type NewConsentimiento = InferInsertModel<typeof consentimientos>;

// ============================================================
// RELACIONES
// ============================================================
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

export const consentimientoLogRelations = relations(consentimientoLog, ({ one }) => ({
  paciente: one(pacientes, {
    fields: [consentimientoLog.pacienteId],
    references: [pacientes.id],
  }),
}));
