import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  index,
} from 'drizzle-orm/pg-core';
import { relations, type InferSelectModel, type InferInsertModel } from 'drizzle-orm';
import { usuarios, pacientes, turnos } from './core';
import { tenants } from './tenant';

// ============================================================
// MENSAJERÍA INTERNA (staff del mismo tenant)
//
// Comunicación médico↔secretaria y médico↔médico. No usa el canal de
// pacientes; cada conversación es estrictamente entre 2 usuarios del staff.
// ============================================================

// Enviar a nuevos usuarios serializa automáticamente (MÚLTIPLES==UNO).
export const conversacionesInternas = pgTable(
  'conversaciones_internas',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    participanteAId: uuid('participante_a_id')
      .notNull()
      .references(() => usuarios.id),
    participanteBId: uuid('participante_b_id')
      .notNull()
      .references(() => usuarios.id),
    contextoPacienteId: uuid('contexto_paciente_id').references(() => pacientes.id),
    contextoTurnoId: uuid('contexto_turno_id').references(() => turnos.id),
    ultimoMensaje: text('ultimo_mensaje'),
    ultimoAutorId: uuid('ultimo_autor_id').references(() => usuarios.id),
    ultimaInteraccion: timestamp('ultima_interaccion', { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    idxConvInternasParticipanteA: index('idx_conv_internas_participante_a').on(
      table.participanteAId,
    ),
    idxConvInternasParticipanteB: index('idx_conv_internas_participante_b').on(
      table.participanteBId,
    ),
    idxConvInternasUltima: index('idx_conv_internas_ultima').on(table.ultimaInteraccion),
  }),
);

export type ConversacionInterna = InferSelectModel<typeof conversacionesInternas>;
export type NewConversacionInterna = InferInsertModel<typeof conversacionesInternas>;

// ============================================================
// MENSAJES INTERNOS
// ============================================================
export const mensajesInternos = pgTable(
  'mensajes_internos',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    conversacionId: uuid('conversacion_id')
      .notNull()
      .references(() => conversacionesInternas.id),
    autorId: uuid('autor_id')
      .notNull()
      .references(() => usuarios.id),
    contenido: text('contenido').notNull(),
    urgente: boolean('urgente').notNull().default(false),
    leidoAt: timestamp('leido_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    idxMsgsInternosConversacion: index('idx_msgs_internos_conversacion').on(
      table.conversacionId,
      table.createdAt,
    ),
  }),
);

export type MensajeInterno = InferSelectModel<typeof mensajesInternos>;
export type NewMensajeInterno = InferInsertModel<typeof mensajesInternos>;

// ============================================================
// RELACIONES
// ============================================================
export const conversacionesInternasRelations = relations(
  conversacionesInternas,
  ({ one, many }) => ({
    participanteA: one(usuarios, {
      fields: [conversacionesInternas.participanteAId],
      references: [usuarios.id],
    }),
    participanteB: one(usuarios, {
      fields: [conversacionesInternas.participanteBId],
      references: [usuarios.id],
    }),
    contextoPaciente: one(pacientes, {
      fields: [conversacionesInternas.contextoPacienteId],
      references: [pacientes.id],
    }),
    contextoTurno: one(turnos, {
      fields: [conversacionesInternas.contextoTurnoId],
      references: [turnos.id],
    }),
    mensajes: many(mensajesInternos),
  }),
);

export const mensajesInternosRelations = relations(mensajesInternos, ({ one }) => ({
  conversacion: one(conversacionesInternas, {
    fields: [mensajesInternos.conversacionId],
    references: [conversacionesInternas.id],
  }),
  autor: one(usuarios, {
    fields: [mensajesInternos.autorId],
    references: [usuarios.id],
  }),
}));