import {
  pgSchema, pgTable, uuid, varchar, boolean, timestamp,
  text, bigint, jsonb, inet, integer, json,
} from 'drizzle-orm/pg-core'

// ─── Schema `platform` aislado del schema `public` de los tenants ──────────
export const platform = pgSchema('platform')

// ─── 1. Operadores de Plataforma ───────────────────────────────────────────
export const platformOperators = platform.table('platform_operators', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  nombre: varchar('nombre', { length: 255 }).notNull(),
  activo: boolean('activo').notNull().default(true),
  totpSecret: varchar('totp_secret', { length: 255 }),
  totpVerified: boolean('totp_verified').notNull().default(false),
  setupToken: varchar('setup_token', { length: 255 }),
  setupTokenExpires: timestamp('setup_token_expires', { withTimezone: true }),
  ultimoAcceso: timestamp('ultimo_acceso', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// ─── 2. Passkeys (WebAuthn Credentials) ────────────────────────────────────
export const platformPasskeys = platform.table('platform_passkeys', {
  id: uuid('id').defaultRandom().primaryKey(),
  operatorId: uuid('operator_id').notNull().references(() => platformOperators.id, { onDelete: 'cascade' }),
  credentialId: text('credential_id').unique().notNull(),
  publicKey: text('public_key').notNull(),
  counter: bigint('counter', { mode: 'bigint' }).notNull().default(0n),
  transports: text('transports').array().default([]),
  deviceName: varchar('device_name', { length: 255 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
})

// ─── 3. Sesiones JWT (tracking para revocación) ────────────────────────────
export const platformSessions = platform.table('platform_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  operatorId: uuid('operator_id').notNull().references(() => platformOperators.id, { onDelete: 'cascade' }),
  jti: varchar('jti', { length: 255 }).unique().notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  revoked: boolean('revoked').notNull().default(false),
  ipAddress: inet('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// ─── 4. Auditoría (APPEND-ONLY — trigger en DB bloquea UPDATE/DELETE) ──────
export const platformAuditLog = platform.table('platform_audit_log', {
  id: uuid('id').defaultRandom().primaryKey(),
  operatorId: uuid('operator_id'),
  operatorEmail: varchar('operator_email', { length: 255 }).notNull(),
  accion: varchar('accion', { length: 100 }).notNull(),
  tenantAfectado: varchar('tenant_afectado', { length: 255 }),
  recurso: varchar('recurso', { length: 255 }),
  motivo: text('motivo'),
  ipAddress: inet('ip_address'),
  detalles: jsonb('detalles').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// ─── 5. Configuración de Alertas ─────────────────────────────────────────────
export const alertsConfig = platform.table('alerts_config', {
  id: uuid('id').defaultRandom().primaryKey(),
  alertName: varchar('alert_name', { length: 50 }).notNull().unique(),
  displayName: varchar('display_name', { length: 100 }).notNull(),
  description: text('description'),
  thresholdValue: integer('threshold_value').notNull(),
  thresholdWindowMinutes: integer('threshold_window_minutes').notNull().default(60),
  notificationChannels: json('notification_channels').$type<string[]>().default([]).notNull(),
  channelConfig: jsonb('channel_config').default({}).notNull(),
  isActive: boolean('is_active').notNull().default(true),
  lastTriggeredAt: timestamp('last_triggered_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// ─── 6. Historial de Alertas Disparadas ──────────────────────────────────────
export const alertsHistory = platform.table('alerts_history', {
  id: uuid('id').defaultRandom().primaryKey(),
  alertConfigId: uuid('alert_config_id').notNull().references(() => alertsConfig.id, { onDelete: 'cascade' }),
  tenantId: uuid('tenant_id'),
  tenantNombre: varchar('tenant_nombre', { length: 255 }),
  triggerValue: integer('trigger_value').notNull(),
  thresholdValue: integer('threshold_value').notNull(),
  message: text('message'),
  notificationsSent: json('notifications_sent').$type<{ channel: string; success: boolean; response?: string }[]>().default([]).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// ─── 7. Intentos de Login (rate limiting) ───────────────────────────────────
export const loginAttempts = platform.table('login_attempts', {
  id: uuid('id').defaultRandom().primaryKey(),
  identifier: varchar('identifier', { length: 255 }).notNull(),
  exitoso: boolean('exitoso').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// ─── 8. Benchmark Anónimo entre Clínicas ─────────────────────────────────────
export const benchmarkSnapshot = platform.table('benchmark_snapshot', {
  id: uuid('id').defaultRandom().primaryKey(),
  bucketLabel: varchar('bucket_label', { length: 50 }).notNull(),
  bucketRange: varchar('bucket_range', { length: 50 }).notNull(),
  tenantCount: integer('tenant_count').notNull(),
  avgNoShow: integer('avg_no_show'),
  avgOcupacion: integer('avg_ocupacion'),
  avgNps: integer('avg_nps'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// ─── Tipos exportados ──────────────────────────────────────────────────────
export type BenchmarkSnapshot = typeof benchmarkSnapshot.$inferSelect
export type NewBenchmarkSnapshot = typeof benchmarkSnapshot.$inferInsert
export type PlatformOperator = typeof platformOperators.$inferSelect
export type NewPlatformOperator = typeof platformOperators.$inferInsert
export type PlatformPasskey = typeof platformPasskeys.$inferSelect
export type NewPlatformPasskey = typeof platformPasskeys.$inferInsert
export type PlatformSession = typeof platformSessions.$inferSelect
export type NewPlatformSession = typeof platformSessions.$inferInsert
export type PlatformAuditLog = typeof platformAuditLog.$inferSelect
export type NewPlatformAuditLog = typeof platformAuditLog.$inferInsert
export type AlertConfig = typeof alertsConfig.$inferSelect
export type NewAlertConfig = typeof alertsConfig.$inferInsert
export type AlertHistory = typeof alertsHistory.$inferSelect
export type NewAlertHistory = typeof alertsHistory.$inferInsert
export type LoginAttempt = typeof loginAttempts.$inferSelect
export type NewLoginAttempt = typeof loginAttempts.$inferInsert
