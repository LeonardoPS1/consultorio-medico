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
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations, type InferSelectModel, type InferInsertModel } from 'drizzle-orm';
import {
  tareaEstadoEnum,
  tareaPrioridadEnum,
} from './enums';
import { pacientes, medicos, usuarios } from './core';
import { sucursales } from './tenant';

// ============================================================
// SERVICIOS / PRESTACIONES
// ============================================================
export const servicios = pgTable('servicios', {
  id: uuid('id').defaultRandom().primaryKey(),
  medicoId: uuid('medico_id')
    .notNull()
    .references(() => medicos.id),
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
export const bloqueosAgenda = pgTable(
  'bloqueos_agenda',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    medicoId: uuid('medico_id')
      .notNull()
      .references(() => medicos.id),
    titulo: varchar('titulo', { length: 255 }).notNull(),
    fechaInicio: timestamp('fecha_inicio', { withTimezone: true }).notNull(),
    fechaFin: timestamp('fecha_fin', { withTimezone: true }).notNull(),
    tipo: varchar('tipo', { length: 20 }).notNull().default('bloqueo'),
    motivo: text('motivo'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    idxBloqueosMedicoFecha: index('idx_bloqueos_medico_fecha').on(
      table.medicoId,
      table.fechaInicio,
      table.fechaFin,
    ),
  }),
);

// ============================================================
// TAREAS PENDIENTES (seguimiento)
// ============================================================
export const tareasPendientes = pgTable('tareas_pendientes', {
  id: uuid('id').defaultRandom().primaryKey(),
  pacienteId: uuid('paciente_id')
    .notNull()
    .references(() => pacientes.id),
  medicoId: uuid('medico_id').references(() => medicos.id),
  tipo: varchar('tipo', { length: 30 }).notNull(),
  descripcion: text('descripcion').notNull(),
  estado: tareaEstadoEnum('estado').notNull().default('pendiente'),
  prioridad: tareaPrioridadEnum('prioridad').notNull().default('normal'),
  asignadoA: uuid('asignado_a').references(() => usuarios.id),
  fechaLimite: timestamp('fecha_limite', { withTimezone: true }),
  completadaAt: timestamp('completada_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type TareaPendiente = InferSelectModel<typeof tareasPendientes>;

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

export type WorkflowError = InferSelectModel<typeof workflowErrors>;

// ============================================================
// HORARIOS DE ATENCIÓN
// ============================================================
export const horariosAtencion = pgTable(
  'horarios_atencion',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    dia: varchar('dia', { length: 20 }).notNull(),
    activo: boolean('activo').notNull().default(true),
    sucursalId: uuid('sucursal_id').references(() => sucursales.id),
    tipo: varchar('tipo', { length: 10 }).notNull().default('corrido'),
    inicio: varchar('inicio', { length: 5 }).notNull().default('09:00'),
    fin: varchar('fin', { length: 5 }).notNull().default('18:00'),
    inicio2: varchar('inicio2', { length: 5 }),
    fin2: varchar('fin2', { length: 5 }),
    tenantId: uuid('tenant_id').default('00000000-0000-0000-0000-000000000000'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    uniqueDiaSucursal: uniqueIndex('uq_horarios_dia_sucursal').on(table.dia, table.sucursalId),
  }),
);

export type HorarioAtencion = InferSelectModel<typeof horariosAtencion>;

// ============================================================
// RELACIONES
// ============================================================
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

export const horariosAtencionRelations = relations(horariosAtencion, ({ one }) => ({
  sucursal: one(sucursales, {
    fields: [horariosAtencion.sucursalId],
    references: [sucursales.id],
  }),
}));
