import {
  pgSchema, pgTable, uuid, varchar, boolean, timestamp,
  text, bigint, jsonb, inet, integer,
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

// ─── Tipos exportados ──────────────────────────────────────────────────────
export type PlatformOperator = typeof platformOperators.$inferSelect
export type NewPlatformOperator = typeof platformOperators.$inferInsert
export type PlatformPasskey = typeof platformPasskeys.$inferSelect
export type NewPlatformPasskey = typeof platformPasskeys.$inferInsert
export type PlatformSession = typeof platformSessions.$inferSelect
export type NewPlatformSession = typeof platformSessions.$inferInsert
export type PlatformAuditLog = typeof platformAuditLog.$inferSelect
export type NewPlatformAuditLog = typeof platformAuditLog.$inferInsert
