import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  jsonb,
  decimal,
  index,
} from 'drizzle-orm/pg-core';
import { relations, sql, type InferSelectModel, type InferInsertModel } from 'drizzle-orm';
import {
  plantillaTipoEnum,
  plantillaEstadoEnum,
} from './enums';
import { pacientes, medicos } from './core';

// ============================================================
// CONVERSACIONES
// ============================================================
export const conversaciones = pgTable(
  'conversaciones',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    pacienteId: uuid('paciente_id')
      .notNull()
      .references(() => pacientes.id),
    medicoId: uuid('medico_id').references(() => medicos.id),
    canal: varchar('canal', { length: 20 }).notNull().default('whatsapp'),
    estado: varchar('estado', { length: 20 }).notNull().default('activa'),
    optOut: boolean('opt_out').notNull().default(false),
    optOutAt: timestamp('opt_out_at', { withTimezone: true }),
    ultimoMensaje: text('ultimo_mensaje'),
    ultimoMensajeRol: varchar('ultimo_mensaje_rol', { length: 20 }),
    ultimaIntencion: varchar('ultima_intencion', { length: 30 }),
    ultimaInteraccion: timestamp('ultima_interaccion', { withTimezone: true })
      .defaultNow()
      .notNull(),
    proximoRecordatorio: timestamp('proximo_recordatorio', { withTimezone: true }),
    contextoIa: jsonb('contexto_ia').default({}),
    metadata: jsonb('metadata').default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    idxEstado: index('idx_conversaciones_estado').on(table.estado),
    idxConversacionesPacienteId: index('idx_conversaciones_paciente_id').on(table.pacienteId),
    idxConversacionesMedicoId: index('idx_conversaciones_medico_id').on(table.medicoId),
  }),
);

// ============================================================
// PLANTILLAS WHATSAPP (templates aprobados por Twilio)
// ============================================================
export const plantillasWhatsapp = pgTable('plantillas_whatsapp', {
  id: uuid('id').defaultRandom().primaryKey(),
  nombre: varchar('nombre', { length: 255 }).notNull(),
  idioma: varchar('idioma', { length: 10 }).notNull().default('es'),
  categoria: varchar('categoria', { length: 30 }).notNull(),
  contenido: text('contenido').notNull(),
  variables: text('variables')
    .array()
    .default(sql`'{}'`),
  estado: varchar('estado', { length: 20 }).notNull().default('pendiente'),
  twilioTemplateSid: varchar('twilio_template_sid', { length: 255 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type PlantillaWhatsapp = InferSelectModel<typeof plantillasWhatsapp>;

// ============================================================
// MENSAJES
// ============================================================
export const mensajes = pgTable(
  'mensajes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    conversacionId: uuid('conversacion_id')
      .notNull()
      .references(() => conversaciones.id),
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
  },
  (table) => ({
    idxMensajesConversacionId: index('idx_mensajes_conversacion_id').on(table.conversacionId),
    idxMensajesRolCreated: index('idx_mensajes_rol_created').on(table.rol, table.createdAt),
    idxMensajesTwilioSid: index('idx_mensajes_twilio_sid').on(table.twilioSid),
  }),
);

// ============================================================
// PLANTILLAS DE MENSAJES (internas)
// ============================================================
export const plantillasMensajes = pgTable('plantillas_mensajes', {
  id: uuid('id').defaultRandom().primaryKey(),
  nombre: varchar('nombre', { length: 255 }).notNull(),
  contenido: text('contenido').notNull(),
  tipo: plantillaTipoEnum('tipo').notNull().default('recordatorio'),
  estado: plantillaEstadoEnum('estado').notNull().default('activa'),
  variables: text('variables')
    .array()
    .default(sql`'{}'`),
  tenantId: uuid('tenant_id').default('00000000-0000-0000-0000-000000000000'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export type PlantillaMensajeDB = InferSelectModel<typeof plantillasMensajes>;
export type NewPlantillaMensaje = InferInsertModel<typeof plantillasMensajes>;

// ============================================================
// RELACIONES
// ============================================================
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
