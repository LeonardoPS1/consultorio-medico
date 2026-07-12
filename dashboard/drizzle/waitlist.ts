import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  index,
} from 'drizzle-orm/pg-core';
import { relations, type InferSelectModel, type InferInsertModel } from 'drizzle-orm';
import { pacientes, medicos, turnos } from './core';
import { sucursales } from './tenant';

// ============================================================
// LISTA DE ESPERA (para reasignación de turnos cancelados)
// ============================================================
export const listaEspera = pgTable(
  'lista_espera',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    pacienteId: uuid('paciente_id')
      .notNull()
      .references(() => pacientes.id),
    medicoId: uuid('medico_id')
      .notNull()
      .references(() => medicos.id),
    fechaInscripcion: timestamp('fecha_inscripcion', { withTimezone: true }).defaultNow().notNull(),
    estado: varchar('estado', { length: 20 }).notNull().default('activa'),
    sucursalId: uuid('sucursal_id').references(() => sucursales.id),
    notas: text('notas'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    idxListaEsperaPaciente: index('idx_lista_espera_paciente').on(table.pacienteId),
    idxListaEsperaMedico: index('idx_lista_espera_medico').on(table.medicoId),
    idxListaEsperaEstado: index('idx_lista_espera_estado').on(table.estado),
  }),
);

export type ListaEspera = InferSelectModel<typeof listaEspera>;
export type NewListaEspera = InferInsertModel<typeof listaEspera>;

// ============================================================
// OFERTAS DE TURNO (para lista de espera)
// ============================================================
export const ofertasTurno = pgTable(
  'ofertas_turno',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    listaEsperaId: uuid('lista_espera_id')
      .notNull()
      .references(() => listaEspera.id),
    turnoId: uuid('turno_id')
      .notNull()
      .references(() => turnos.id),
    fechaOferta: timestamp('fecha_oferta', { withTimezone: true }).defaultNow().notNull(),
    expiracion: timestamp('expiracion', { withTimezone: true }).notNull(),
    estado: varchar('estado', { length: 20 }).notNull().default('pendiente'),
    notificada: boolean('notificada').notNull().default(false),
    notificadaAt: timestamp('notificada_at', { withTimezone: true }),
    respondedAt: timestamp('responded_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    idxOfertasListaEspera: index('idx_ofertas_lista_espera').on(table.listaEsperaId),
    idxOfertasTurno: index('idx_ofertas_turno').on(table.turnoId),
    idxOfertasEstado: index('idx_ofertas_estado').on(table.estado),
    idxOfertasExpiracion: index('idx_ofertas_expiracion').on(table.expiracion),
  }),
);

export type OfertaTurno = InferSelectModel<typeof ofertasTurno>;
export type NewOfertaTurno = InferInsertModel<typeof ofertasTurno>;

// ============================================================
// RELACIONES
// ============================================================
export const listaEsperaRelations = relations(listaEspera, ({ one, many }) => ({
  paciente: one(pacientes, {
    fields: [listaEspera.pacienteId],
    references: [pacientes.id],
  }),
  medico: one(medicos, {
    fields: [listaEspera.medicoId],
    references: [medicos.id],
  }),
  sucursal: one(sucursales, {
    fields: [listaEspera.sucursalId],
    references: [sucursales.id],
  }),
  ofertas: many(ofertasTurno),
}));

export const ofertasTurnoRelations = relations(ofertasTurno, ({ one }) => ({
  listaEspera: one(listaEspera, {
    fields: [ofertasTurno.listaEsperaId],
    references: [listaEspera.id],
  }),
  turno: one(turnos, {
    fields: [ofertasTurno.turnoId],
    references: [turnos.id],
  }),
}));
