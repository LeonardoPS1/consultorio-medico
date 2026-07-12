import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  decimal,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { relations, type InferSelectModel, type InferInsertModel } from 'drizzle-orm';
import { pacientes, turnos } from './core';
import { servicios } from './operations';
import { tenants } from './tenant';

// ============================================================
// FACTURACIÓN
// ============================================================
export const facturacion = pgTable('facturacion', {
  id: uuid('id').defaultRandom().primaryKey(),
  pacienteId: uuid('paciente_id')
    .notNull()
    .references(() => pacientes.id),
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
// SUSCRIPCIONES (MercadoPago)
// ============================================================
export const suscripciones = pgTable('suscripciones', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizacionId: uuid('organizacion_id')
    .notNull()
    .default('00000000-0000-0000-0000-000000000000')
    .references(() => tenants.id),
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

// ============================================================
// PORTAL PAGOS (pagos desde el portal del paciente)
// ============================================================
export const portalPagos = pgTable(
  'portal_pagos',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    turnoId: uuid('turno_id')
      .notNull()
      .references(() => turnos.id),
    pacienteId: uuid('paciente_id')
      .notNull()
      .references(() => pacientes.id),
    monto: decimal('monto', { precision: 10, scale: 2 }).notNull(),
    moneda: varchar('moneda', { length: 10 }).notNull().default('CLP'),
    metodoPago: varchar('metodo_pago', { length: 30 }).notNull().default('mercadopago'),
    estado: varchar('estado', { length: 20 }).notNull().default('pendiente'),
    mercadopagoPreferenceId: varchar('mercadopago_preference_id', { length: 255 }),
    mercadopagoPaymentId: varchar('mercadopago_payment_id', { length: 255 }),
    metadata: jsonb('metadata').default({}),
    pagadoAt: timestamp('pagado_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    idxPortalPagosTurno: index('idx_portal_pagos_turno').on(table.turnoId),
    idxPortalPagosPaciente: index('idx_portal_pagos_paciente').on(table.pacienteId),
    idxPortalPagosEstado: index('idx_portal_pagos_estado').on(table.estado),
  }),
);

export type PortalPago = InferSelectModel<typeof portalPagos>;
export type NewPortalPago = InferInsertModel<typeof portalPagos>;

// ============================================================
// PAQUETES PORTAL (paquetes de turnos disponibles)
// ============================================================
export const paquetesPortal = pgTable(
  'paquetes_portal',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .default('00000000-0000-0000-0000-000000000000')
      .references(() => tenants.id),
    nombre: varchar('nombre', { length: 100 }).notNull(),
    descripcion: text('descripcion'),
    cantidadTurnos: integer('cantidad_turnos').notNull(),
    precio: integer('precio').notNull(),
    activo: boolean('activo').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    idxActivo: index('idx_paquetes_portal_activo').on(table.activo),
  }),
);

export type PaquetePortal = InferSelectModel<typeof paquetesPortal>;
export type NewPaquetePortal = InferInsertModel<typeof paquetesPortal>;

// ============================================================
// SUSCRIPCIONES PACIENTE (paquetes comprados)
// ============================================================
export const suscripcionesPaciente = pgTable(
  'suscripciones_paciente',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    pacienteId: uuid('paciente_id')
      .notNull()
      .references(() => pacientes.id),
    paqueteId: uuid('paquete_id')
      .notNull()
      .references(() => paquetesPortal.id),
    turnosRestantes: integer('turnos_restantes').notNull(),
    turnosTotales: integer('turnos_totales').notNull(),
    activa: boolean('activa').notNull().default(true),
    vencimiento: timestamp('vencimiento', { withTimezone: true }),
    pagado: boolean('pagado').notNull().default(false),
    mercadopagoPaymentId: varchar('mercadopago_payment_id', { length: 255 }),
    metadata: jsonb('metadata').default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    idxPacienteActiva: index('idx_susc_paciente_activa').on(table.pacienteId, table.activa),
  }),
);

export type SuscripcionPaciente = InferSelectModel<typeof suscripcionesPaciente>;
export type NewSuscripcionPaciente = InferInsertModel<typeof suscripcionesPaciente>;

// ============================================================
// RELACIONES
// ============================================================
export const suscripcionesRelations = relations(suscripciones, ({ one }) => ({
  tenant: one(tenants, {
    fields: [suscripciones.organizacionId],
    references: [tenants.id],
  }),
}));

export const portalPagosRelations = relations(portalPagos, ({ one }) => ({
  turno: one(turnos, {
    fields: [portalPagos.turnoId],
    references: [turnos.id],
  }),
  paciente: one(pacientes, {
    fields: [portalPagos.pacienteId],
    references: [pacientes.id],
  }),
}));

export const suscripcionesPacienteRelations = relations(suscripcionesPaciente, ({ one }) => ({
  paciente: one(pacientes, {
    fields: [suscripcionesPaciente.pacienteId],
    references: [pacientes.id],
  }),
  paquete: one(paquetesPortal, {
    fields: [suscripcionesPaciente.paqueteId],
    references: [paquetesPortal.id],
  }),
}));
