import { z } from 'zod';

// Raw Feed Material schemas
export const rawFeedMaterialSchema = z.object({
  id: z.number(),
  name: z.string(),
  price_per_kg: z.number(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type RawFeedMaterial = z.infer<typeof rawFeedMaterialSchema>;

export const createRawFeedMaterialInputSchema = z.object({
  name: z.string().min(1),
  price_per_kg: z.number().positive()
});

export type CreateRawFeedMaterialInput = z.infer<typeof createRawFeedMaterialInputSchema>;

export const updateRawFeedMaterialInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  price_per_kg: z.number().positive().optional()
});

export type UpdateRawFeedMaterialInput = z.infer<typeof updateRawFeedMaterialInputSchema>;

// Finished Feed Product schemas
export const finishedFeedSchema = z.object({
  id: z.number(),
  name: z.string(),
  cost_per_kg: z.number(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type FinishedFeed = z.infer<typeof finishedFeedSchema>;

export const createFinishedFeedInputSchema = z.object({
  name: z.string().min(1)
});

export type CreateFinishedFeedInput = z.infer<typeof createFinishedFeedInputSchema>;

export const updateFinishedFeedInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional()
});

export type UpdateFinishedFeedInput = z.infer<typeof updateFinishedFeedInputSchema>;

// Feed Composition schemas
export const feedCompositionSchema = z.object({
  id: z.number(),
  finished_feed_id: z.number(),
  raw_material_id: z.number(),
  percentage: z.number(),
  created_at: z.coerce.date()
});

export type FeedComposition = z.infer<typeof feedCompositionSchema>;

export const createFeedCompositionInputSchema = z.object({
  finished_feed_id: z.number(),
  raw_material_id: z.number(),
  percentage: z.number().min(0).max(100)
});

export type CreateFeedCompositionInput = z.infer<typeof createFeedCompositionInputSchema>;

export const updateFeedCompositionInputSchema = z.object({
  id: z.number(),
  percentage: z.number().min(0).max(100).optional()
});

export type UpdateFeedCompositionInput = z.infer<typeof updateFeedCompositionInputSchema>;

// Chicken Flock schemas
export const chickenFlockSchema = z.object({
  id: z.number(),
  strain: z.string(),
  entry_date: z.coerce.date(),
  initial_count: z.number().int(),
  age_upon_entry_days: z.number().int(),
  current_count: z.number().int(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type ChickenFlock = z.infer<typeof chickenFlockSchema>;

export const createChickenFlockInputSchema = z.object({
  strain: z.string().min(1),
  entry_date: z.coerce.date(),
  initial_count: z.number().int().positive(),
  age_upon_entry_days: z.number().int().nonnegative()
});

export type CreateChickenFlockInput = z.infer<typeof createChickenFlockInputSchema>;

export const updateChickenFlockInputSchema = z.object({
  id: z.number(),
  strain: z.string().min(1).optional(),
  entry_date: z.coerce.date().optional(),
  initial_count: z.number().int().positive().optional(),
  age_upon_entry_days: z.number().int().nonnegative().optional(),
  current_count: z.number().int().nonnegative().optional()
});

export type UpdateChickenFlockInput = z.infer<typeof updateChickenFlockInputSchema>;

// Feed Consumption schemas
export const feedConsumptionSchema = z.object({
  id: z.number(),
  flock_id: z.number(),
  finished_feed_id: z.number(),
  consumption_date: z.coerce.date(),
  quantity_kg: z.number(),
  cost: z.number(),
  created_at: z.coerce.date()
});

export type FeedConsumption = z.infer<typeof feedConsumptionSchema>;

export const createFeedConsumptionInputSchema = z.object({
  flock_id: z.number(),
  finished_feed_id: z.number(),
  consumption_date: z.coerce.date(),
  quantity_kg: z.number().positive()
});

export type CreateFeedConsumptionInput = z.infer<typeof createFeedConsumptionInputSchema>;

export const updateFeedConsumptionInputSchema = z.object({
  id: z.number(),
  flock_id: z.number().optional(),
  finished_feed_id: z.number().optional(),
  consumption_date: z.coerce.date().optional(),
  quantity_kg: z.number().positive().optional()
});

export type UpdateFeedConsumptionInput = z.infer<typeof updateFeedConsumptionInputSchema>;

// Egg Production schemas
export const eggQualityEnum = z.enum(['A', 'B', 'cracked']);
export type EggQuality = z.infer<typeof eggQualityEnum>;

export const eggProductionSchema = z.object({
  id: z.number(),
  flock_id: z.number(),
  production_date: z.coerce.date(),
  quality: eggQualityEnum,
  quantity: z.number().int(),
  created_at: z.coerce.date()
});

export type EggProduction = z.infer<typeof eggProductionSchema>;

export const createEggProductionInputSchema = z.object({
  flock_id: z.number(),
  production_date: z.coerce.date(),
  quality: eggQualityEnum,
  quantity: z.number().int().nonnegative()
});

export type CreateEggProductionInput = z.infer<typeof createEggProductionInputSchema>;

export const updateEggProductionInputSchema = z.object({
  id: z.number(),
  flock_id: z.number().optional(),
  production_date: z.coerce.date().optional(),
  quality: eggQualityEnum.optional(),
  quantity: z.number().int().nonnegative().optional()
});

export type UpdateEggProductionInput = z.infer<typeof updateEggProductionInputSchema>;

// Egg Sales schemas
export const eggSalesSchema = z.object({
  id: z.number(),
  sale_date: z.coerce.date(),
  quality: eggQualityEnum,
  quantity: z.number().int(),
  price_per_egg: z.number(),
  total_price: z.number(),
  created_at: z.coerce.date()
});

export type EggSales = z.infer<typeof eggSalesSchema>;

export const createEggSalesInputSchema = z.object({
  sale_date: z.coerce.date(),
  quality: eggQualityEnum,
  quantity: z.number().int().positive(),
  price_per_egg: z.number().positive()
});

export type CreateEggSalesInput = z.infer<typeof createEggSalesInputSchema>;

export const updateEggSalesInputSchema = z.object({
  id: z.number(),
  sale_date: z.coerce.date().optional(),
  quality: eggQualityEnum.optional(),
  quantity: z.number().int().positive().optional(),
  price_per_egg: z.number().positive().optional()
});

export type UpdateEggSalesInput = z.infer<typeof updateEggSalesInputSchema>;

// Other Expenses schemas
export const expenseTypeEnum = z.enum(['medication', 'electricity', 'labor', 'other']);
export type ExpenseType = z.infer<typeof expenseTypeEnum>;

export const otherExpensesSchema = z.object({
  id: z.number(),
  expense_date: z.coerce.date(),
  expense_type: expenseTypeEnum,
  description: z.string(),
  amount: z.number(),
  created_at: z.coerce.date()
});

export type OtherExpenses = z.infer<typeof otherExpensesSchema>;

export const createOtherExpensesInputSchema = z.object({
  expense_date: z.coerce.date(),
  expense_type: expenseTypeEnum,
  description: z.string().min(1),
  amount: z.number().positive()
});

export type CreateOtherExpensesInput = z.infer<typeof createOtherExpensesInputSchema>;

export const updateOtherExpensesInputSchema = z.object({
  id: z.number(),
  expense_date: z.coerce.date().optional(),
  expense_type: expenseTypeEnum.optional(),
  description: z.string().min(1).optional(),
  amount: z.number().positive().optional()
});

export type UpdateOtherExpensesInput = z.infer<typeof updateOtherExpensesInputSchema>;

// Profit Calculation schemas
export const profitReportSchema = z.object({
  total_revenue: z.number(),
  total_feed_cost: z.number(),
  total_other_expenses: z.number(),
  total_profit: z.number(),
  period_start: z.coerce.date(),
  period_end: z.coerce.date()
});

export type ProfitReport = z.infer<typeof profitReportSchema>;

export const profitReportInputSchema = z.object({
  period_start: z.coerce.date(),
  period_end: z.coerce.date()
});

export type ProfitReportInput = z.infer<typeof profitReportInputSchema>;

// Export format schemas
export const exportFormatEnum = z.enum(['pdf', 'excel']);
export type ExportFormat = z.infer<typeof exportFormatEnum>;

export const exportRequestSchema = z.object({
  format: exportFormatEnum,
  entity_type: z.enum(['raw_materials', 'finished_feeds', 'flocks', 'feed_consumption', 'egg_production', 'egg_sales', 'other_expenses', 'profit_report']),
  filters: z.record(z.any()).optional()
});

export type ExportRequest = z.infer<typeof exportRequestSchema>;