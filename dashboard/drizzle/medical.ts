import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  date,
  jsonb,
  index,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { relations, sql, type InferSelectModel, type InferInsertModel } from 'drizzle-orm';
import {
  historialTipoEnum,
  recetaEstadoEnum,
  recetaTipoEnum,
  ordenEstudioTipoEnum,
  ordenEstudioEstadoEnum,
} from './enums';
import { pacientes, medicos, turnos } from './core';

// ============================================================
// PACIENTE EVENTOS (historial de contacto)
// ============================================================
export const pacienteEventos = pgTable('paciente_eventos', {
  id: uuid('id').defaultRandom().primaryKey(),
  pacienteId: uuid('paciente_id')
    .notNull()
    .references(() => pacientes.id),
  tipo: varchar('tipo', { length: 30 }).notNull(),
  descripcion: text('descripcion'),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ============================================================
// HISTORIAL MÉDICO
// ============================================================
export const historialMedico = pgTable(
  'historial_medico',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    pacienteId: uuid('paciente_id')
      .notNull()
      .references(() => pacientes.id),
    medicoId: uuid('medico_id').references(() => medicos.id),
    turnoId: uuid('turno_id').references(() => turnos.id),
    tipo: historialTipoEnum('tipo').notNull(),
    titulo: varchar('titulo', { length: 255 }).notNull(),
    descripcion: text('descripcion'),
    diagnosticoCodigo: varchar('diagnostico_codigo', { length: 10 }),
    diagnosticoDescripcion: text('diagnostico_descripcion'),
    archivos: jsonb('archivos').default([]),
    visibleParaPaciente: boolean('visible_para_paciente').default(true),
    hashVerificacion: varchar('hash_verificacion', { length: 64 }),
    pdfGenerado: boolean('pdf_generado').default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    idxHistorialPacienteId: index('idx_historial_paciente_id').on(table.pacienteId),
    idxHistorialMedicoId: index('idx_historial_medico_id').on(table.medicoId),
  }),
);

// ============================================================
// NOTAS SOAP (Evolución Clínica Estructurada)
// ============================================================
export const notasSoap = pgTable(
  'notas_soap',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    pacienteId: uuid('paciente_id')
      .notNull()
      .references(() => pacientes.id),
    medicoId: uuid('medico_id')
      .notNull()
      .references(() => medicos.id),
    turnoId: uuid('turno_id').references(() => turnos.id),
    subjetivo: text('subjetivo'),
    objetivo: text('objetivo'),
    assessment: text('assessment'),
    plan: text('plan'),
    cie10Codigo: varchar('cie10_codigo', { length: 10 }),
    cie10Descripcion: text('cie10_descripcion'),
    derivarA: varchar('derivar_a', { length: 255 }),
    requiereControl: boolean('requiere_control').default(false),
    controlEnDias: integer('control_en_dias'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    idxNotasSoapPacienteId: index('idx_notas_soap_paciente_id').on(table.pacienteId),
    idxNotasSoapMedicoId: index('idx_notas_soap_medico_id').on(table.medicoId),
    idxNotasSoapTurnoId: index('idx_notas_soap_turno_id').on(table.turnoId),
  }),
);

// ============================================================
// RECETAS
// ============================================================
export const recetas = pgTable(
  'recetas',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    pacienteId: uuid('paciente_id')
      .notNull()
      .references(() => pacientes.id),
    medicoId: uuid('medico_id')
      .notNull()
      .references(() => medicos.id),
    turnoId: uuid('turno_id').references(() => turnos.id),
    estado: recetaEstadoEnum('estado').notNull().default('emitida'),
    tipo: recetaTipoEnum('tipo').notNull().default('simple'),
    medicamento: varchar('medicamento', { length: 255 }).notNull(),
    presentacion: varchar('presentacion', { length: 255 }),
    dosis: varchar('dosis', { length: 255 }).notNull(),
    frecuencia: varchar('frecuencia', { length: 255 }).notNull(),
    duracion: varchar('duracion', { length: 255 }),
    cantidadTotal: varchar('cantidad_total', { length: 100 }),
    indicaciones: text('indicaciones'),
    fechaInicio: date('fecha_inicio')
      .notNull()
      .default(sql`CURRENT_DATE`),
    fechaFin: date('fecha_fin'),
    requiereAutorizacion: boolean('requiere_autorizacion').default(false),
    autorizacionObraSocial: boolean('autorizacion_obra_social').default(false),
    hashVerificacion: varchar('hash_verificacion', { length: 64 }),
    recetaAnteriorId: uuid('receta_anterior_id').references((): any => recetas.id),
    pdfGenerado: boolean('pdf_generado').default(false),
    pdfUrl: text('pdf_url'),
    whatsappEnviado: boolean('whatsapp_enviado').default(false),
    whatsappEnviadoAt: timestamp('whatsapp_enviado_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    idxRecetasPacienteId: index('idx_recetas_paciente_id').on(table.pacienteId),
    idxRecetasMedicoId: index('idx_recetas_medico_id').on(table.medicoId),
  }),
);

// ============================================================
// ÓRDENES DE ESTUDIO
// ============================================================
export const ordenesEstudio = pgTable(
  'ordenes_estudio',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    pacienteId: uuid('paciente_id')
      .notNull()
      .references(() => pacientes.id),
    medicoId: uuid('medico_id').references(() => medicos.id),
    turnoId: uuid('turno_id').references(() => turnos.id),
    titulo: varchar('titulo', { length: 255 }).notNull(),
    descripcion: text('descripcion'),
    tipo: ordenEstudioTipoEnum('tipo').notNull().default('laboratorio'),
    estado: ordenEstudioEstadoEnum('estado').notNull().default('pendiente'),
    resultadoUrl: text('resultado_url'),
    observaciones: text('observaciones'),
    tenantId: uuid('tenant_id').default('00000000-0000-0000-0000-000000000000'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    idxOrdenesPaciente: index('idx_ordenes_estudio_paciente').on(table.pacienteId),
    idxOrdenesMedico: index('idx_ordenes_estudio_medico').on(table.medicoId),
    idxOrdenesEstado: index('idx_ordenes_estudio_estado').on(table.estado),
    idxOrdenesCreatedAt: index('idx_ordenes_estudio_created_at').on(table.createdAt),
  }),
);

export type OrdenEstudio = InferSelectModel<typeof ordenesEstudio>;
export type NewOrdenEstudio = InferInsertModel<typeof ordenesEstudio>;

// ============================================================
// RELACIONES
// ============================================================
export const notasSoapRelations = relations(notasSoap, ({ one }) => ({
  paciente: one(pacientes, {
    fields: [notasSoap.pacienteId],
    references: [pacientes.id],
  }),
  medico: one(medicos, {
    fields: [notasSoap.medicoId],
    references: [medicos.id],
  }),
  turno: one(turnos, {
    fields: [notasSoap.turnoId],
    references: [turnos.id],
  }),
}));

export const pacienteEventosRelations = relations(pacienteEventos, ({ one }) => ({
  paciente: one(pacientes, {
    fields: [pacienteEventos.pacienteId],
    references: [pacientes.id],
  }),
}));
