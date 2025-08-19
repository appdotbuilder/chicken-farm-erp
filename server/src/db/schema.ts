import { serial, text, pgTable, timestamp, numeric, integer, pgEnum, date } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const eggQualityEnum = pgEnum('egg_quality', ['A', 'B', 'cracked']);
export const expenseTypeEnum = pgEnum('expense_type', ['medication', 'electricity', 'labor', 'other']);

// Raw Feed Materials Table
export const rawFeedMaterialsTable = pgTable('raw_feed_materials', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  price_per_kg: numeric('price_per_kg', { precision: 10, scale: 2 }).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Finished Feed Products Table
export const finishedFeedsTable = pgTable('finished_feeds', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  cost_per_kg: numeric('cost_per_kg', { precision: 10, scale: 2 }).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Feed Composition Table (junction table for finished feeds and raw materials)
export const feedCompositionsTable = pgTable('feed_compositions', {
  id: serial('id').primaryKey(),
  finished_feed_id: integer('finished_feed_id').notNull().references(() => finishedFeedsTable.id),
  raw_material_id: integer('raw_material_id').notNull().references(() => rawFeedMaterialsTable.id),
  percentage: numeric('percentage', { precision: 5, scale: 2 }).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Chicken Flocks Table
export const chickenFlocksTable = pgTable('chicken_flocks', {
  id: serial('id').primaryKey(),
  strain: text('strain').notNull(),
  entry_date: date('entry_date').notNull(),
  initial_count: integer('initial_count').notNull(),
  age_upon_entry_days: integer('age_upon_entry_days').notNull(),
  current_count: integer('current_count').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Feed Consumption Table
export const feedConsumptionsTable = pgTable('feed_consumptions', {
  id: serial('id').primaryKey(),
  flock_id: integer('flock_id').notNull().references(() => chickenFlocksTable.id),
  finished_feed_id: integer('finished_feed_id').notNull().references(() => finishedFeedsTable.id),
  consumption_date: date('consumption_date').notNull(),
  quantity_kg: numeric('quantity_kg', { precision: 10, scale: 2 }).notNull(),
  cost: numeric('cost', { precision: 10, scale: 2 }).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Egg Production Table
export const eggProductionsTable = pgTable('egg_productions', {
  id: serial('id').primaryKey(),
  flock_id: integer('flock_id').notNull().references(() => chickenFlocksTable.id),
  production_date: date('production_date').notNull(),
  quality: eggQualityEnum('quality').notNull(),
  quantity: integer('quantity').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Egg Sales Table
export const eggSalesTable = pgTable('egg_sales', {
  id: serial('id').primaryKey(),
  sale_date: date('sale_date').notNull(),
  quality: eggQualityEnum('quality').notNull(),
  quantity: integer('quantity').notNull(),
  price_per_egg: numeric('price_per_egg', { precision: 6, scale: 4 }).notNull(),
  total_price: numeric('total_price', { precision: 10, scale: 2 }).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Other Expenses Table
export const otherExpensesTable = pgTable('other_expenses', {
  id: serial('id').primaryKey(),
  expense_date: date('expense_date').notNull(),
  expense_type: expenseTypeEnum('expense_type').notNull(),
  description: text('description').notNull(),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const rawFeedMaterialsRelations = relations(rawFeedMaterialsTable, ({ many }) => ({
  compositions: many(feedCompositionsTable),
}));

export const finishedFeedsRelations = relations(finishedFeedsTable, ({ many }) => ({
  compositions: many(feedCompositionsTable),
  consumptions: many(feedConsumptionsTable),
}));

export const feedCompositionsRelations = relations(feedCompositionsTable, ({ one }) => ({
  finishedFeed: one(finishedFeedsTable, {
    fields: [feedCompositionsTable.finished_feed_id],
    references: [finishedFeedsTable.id],
  }),
  rawMaterial: one(rawFeedMaterialsTable, {
    fields: [feedCompositionsTable.raw_material_id],
    references: [rawFeedMaterialsTable.id],
  }),
}));

export const chickenFlocksRelations = relations(chickenFlocksTable, ({ many }) => ({
  feedConsumptions: many(feedConsumptionsTable),
  eggProductions: many(eggProductionsTable),
}));

export const feedConsumptionsRelations = relations(feedConsumptionsTable, ({ one }) => ({
  flock: one(chickenFlocksTable, {
    fields: [feedConsumptionsTable.flock_id],
    references: [chickenFlocksTable.id],
  }),
  finishedFeed: one(finishedFeedsTable, {
    fields: [feedConsumptionsTable.finished_feed_id],
    references: [finishedFeedsTable.id],
  }),
}));

export const eggProductionsRelations = relations(eggProductionsTable, ({ one }) => ({
  flock: one(chickenFlocksTable, {
    fields: [eggProductionsTable.flock_id],
    references: [chickenFlocksTable.id],
  }),
}));

// TypeScript types for the table schemas
export type RawFeedMaterial = typeof rawFeedMaterialsTable.$inferSelect;
export type NewRawFeedMaterial = typeof rawFeedMaterialsTable.$inferInsert;

export type FinishedFeed = typeof finishedFeedsTable.$inferSelect;
export type NewFinishedFeed = typeof finishedFeedsTable.$inferInsert;

export type FeedComposition = typeof feedCompositionsTable.$inferSelect;
export type NewFeedComposition = typeof feedCompositionsTable.$inferInsert;

export type ChickenFlock = typeof chickenFlocksTable.$inferSelect;
export type NewChickenFlock = typeof chickenFlocksTable.$inferInsert;

export type FeedConsumption = typeof feedConsumptionsTable.$inferSelect;
export type NewFeedConsumption = typeof feedConsumptionsTable.$inferInsert;

export type EggProduction = typeof eggProductionsTable.$inferSelect;
export type NewEggProduction = typeof eggProductionsTable.$inferInsert;

export type EggSales = typeof eggSalesTable.$inferSelect;
export type NewEggSales = typeof eggSalesTable.$inferInsert;

export type OtherExpenses = typeof otherExpensesTable.$inferSelect;
export type NewOtherExpenses = typeof otherExpensesTable.$inferInsert;

// Export all tables for proper query building
export const tables = {
  rawFeedMaterials: rawFeedMaterialsTable,
  finishedFeeds: finishedFeedsTable,
  feedCompositions: feedCompositionsTable,
  chickenFlocks: chickenFlocksTable,
  feedConsumptions: feedConsumptionsTable,
  eggProductions: eggProductionsTable,
  eggSales: eggSalesTable,
  otherExpenses: otherExpensesTable,
};