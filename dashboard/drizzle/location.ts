import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { relations, type InferSelectModel, type InferInsertModel } from 'drizzle-orm';

// ============================================================
// REGIONES DE CHILE
// ============================================================
export const regiones = pgTable('regiones', {
  id: uuid('id').defaultRandom().primaryKey(),
  nombre: varchar('nombre', { length: 100 }).notNull().unique(),
  numeroRomano: varchar('numero_romano', { length: 10 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ============================================================
// COMUNAS DE CHILE
// ============================================================
export const comunas = pgTable('comunas', {
  id: uuid('id').defaultRandom().primaryKey(),
  nombre: varchar('nombre', { length: 100 }).notNull(),
  regionId: uuid('region_id')
    .notNull()
    .references(() => regiones.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const regionesRelations = relations(regiones, ({ many }) => ({
  comunas: many(comunas),
}));

export const comunasRelations = relations(comunas, ({ one }) => ({
  region: one(regiones, {
    fields: [comunas.regionId],
    references: [regiones.id],
  }),
}));
