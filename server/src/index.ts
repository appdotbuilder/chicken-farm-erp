import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import {
  createRawFeedMaterialInputSchema,
  updateRawFeedMaterialInputSchema,
  createFinishedFeedInputSchema,
  updateFinishedFeedInputSchema,
  createFeedCompositionInputSchema,
  updateFeedCompositionInputSchema,
  createChickenFlockInputSchema,
  updateChickenFlockInputSchema,
  createFeedConsumptionInputSchema,
  updateFeedConsumptionInputSchema,
  createEggProductionInputSchema,
  updateEggProductionInputSchema,
  createEggSalesInputSchema,
  updateEggSalesInputSchema,
  createOtherExpensesInputSchema,
  updateOtherExpensesInputSchema,
  profitReportInputSchema,
  exportRequestSchema
} from './schema';

// Import handlers
import {
  createRawFeedMaterial,
  getRawFeedMaterials,
  getRawFeedMaterialById,
  updateRawFeedMaterial,
  deleteRawFeedMaterial
} from './handlers/raw_feed_materials';

import {
  createFinishedFeed,
  getFinishedFeeds,
  getFinishedFeedById,
  updateFinishedFeed,
  deleteFinishedFeed,
  calculateFeedCost
} from './handlers/finished_feeds';

import {
  createFeedComposition,
  getFeedCompositions,
  getFeedCompositionsByFinishedFeedId,
  getFeedCompositionById,
  updateFeedComposition,
  deleteFeedComposition
} from './handlers/feed_compositions';

import {
  createChickenFlock,
  getChickenFlocks,
  getChickenFlockById,
  updateChickenFlock,
  deleteChickenFlock
} from './handlers/chicken_flocks';

import {
  createFeedConsumption,
  getFeedConsumptions,
  getFeedConsumptionsByFlockId,
  getFeedConsumptionById,
  updateFeedConsumption,
  deleteFeedConsumption,
  getTotalFeedCostByDateRange
} from './handlers/feed_consumptions';

import {
  createEggProduction,
  getEggProductions,
  getEggProductionsByFlockId,
  getEggProductionById,
  updateEggProduction,
  deleteEggProduction,
  getEggProductionsByDateRange
} from './handlers/egg_productions';

import {
  createEggSales,
  getEggSales,
  getEggSalesById,
  updateEggSales,
  deleteEggSales,
  getTotalRevenueByDateRange,
  getEggSalesByDateRange
} from './handlers/egg_sales';

import {
  createOtherExpenses,
  getOtherExpenses,
  getOtherExpensesById,
  updateOtherExpenses,
  deleteOtherExpenses,
  getTotalExpensesByDateRange,
  getOtherExpensesByDateRange
} from './handlers/other_expenses';

import {
  generateProfitReport
} from './handlers/profit_reports';

import {
  exportData,
  exportProfitReport
} from './handlers/export';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Raw Feed Materials routes
  rawFeedMaterials: router({
    create: publicProcedure
      .input(createRawFeedMaterialInputSchema)
      .mutation(({ input }) => createRawFeedMaterial(input)),
    
    getAll: publicProcedure
      .query(() => getRawFeedMaterials()),
    
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => getRawFeedMaterialById(input.id)),
    
    update: publicProcedure
      .input(updateRawFeedMaterialInputSchema)
      .mutation(({ input }) => updateRawFeedMaterial(input)),
    
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteRawFeedMaterial(input.id))
  }),

  // Finished Feeds routes
  finishedFeeds: router({
    create: publicProcedure
      .input(createFinishedFeedInputSchema)
      .mutation(({ input }) => createFinishedFeed(input)),
    
    getAll: publicProcedure
      .query(() => getFinishedFeeds()),
    
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => getFinishedFeedById(input.id)),
    
    update: publicProcedure
      .input(updateFinishedFeedInputSchema)
      .mutation(({ input }) => updateFinishedFeed(input)),
    
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteFinishedFeed(input.id)),
    
    calculateCost: publicProcedure
      .input(z.object({ finishedFeedId: z.number() }))
      .query(({ input }) => calculateFeedCost(input.finishedFeedId))
  }),

  // Feed Compositions routes
  feedCompositions: router({
    create: publicProcedure
      .input(createFeedCompositionInputSchema)
      .mutation(({ input }) => createFeedComposition(input)),
    
    getAll: publicProcedure
      .query(() => getFeedCompositions()),
    
    getByFinishedFeedId: publicProcedure
      .input(z.object({ finishedFeedId: z.number() }))
      .query(({ input }) => getFeedCompositionsByFinishedFeedId(input.finishedFeedId)),
    
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => getFeedCompositionById(input.id)),
    
    update: publicProcedure
      .input(updateFeedCompositionInputSchema)
      .mutation(({ input }) => updateFeedComposition(input)),
    
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteFeedComposition(input.id))
  }),

  // Chicken Flocks routes
  chickenFlocks: router({
    create: publicProcedure
      .input(createChickenFlockInputSchema)
      .mutation(({ input }) => createChickenFlock(input)),
    
    getAll: publicProcedure
      .query(() => getChickenFlocks()),
    
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => getChickenFlockById(input.id)),
    
    update: publicProcedure
      .input(updateChickenFlockInputSchema)
      .mutation(({ input }) => updateChickenFlock(input)),
    
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteChickenFlock(input.id))
  }),

  // Feed Consumptions routes
  feedConsumptions: router({
    create: publicProcedure
      .input(createFeedConsumptionInputSchema)
      .mutation(({ input }) => createFeedConsumption(input)),
    
    getAll: publicProcedure
      .query(() => getFeedConsumptions()),
    
    getByFlockId: publicProcedure
      .input(z.object({ flockId: z.number() }))
      .query(({ input }) => getFeedConsumptionsByFlockId(input.flockId)),
    
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => getFeedConsumptionById(input.id)),
    
    update: publicProcedure
      .input(updateFeedConsumptionInputSchema)
      .mutation(({ input }) => updateFeedConsumption(input)),
    
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteFeedConsumption(input.id)),
    
    getTotalCostByDateRange: publicProcedure
      .input(z.object({ startDate: z.coerce.date(), endDate: z.coerce.date() }))
      .query(({ input }) => getTotalFeedCostByDateRange(input.startDate, input.endDate))
  }),

  // Egg Productions routes
  eggProductions: router({
    create: publicProcedure
      .input(createEggProductionInputSchema)
      .mutation(({ input }) => createEggProduction(input)),
    
    getAll: publicProcedure
      .query(() => getEggProductions()),
    
    getByFlockId: publicProcedure
      .input(z.object({ flockId: z.number() }))
      .query(({ input }) => getEggProductionsByFlockId(input.flockId)),
    
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => getEggProductionById(input.id)),
    
    update: publicProcedure
      .input(updateEggProductionInputSchema)
      .mutation(({ input }) => updateEggProduction(input)),
    
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteEggProduction(input.id)),
    
    getByDateRange: publicProcedure
      .input(z.object({ startDate: z.coerce.date(), endDate: z.coerce.date() }))
      .query(({ input }) => getEggProductionsByDateRange(input.startDate, input.endDate))
  }),

  // Egg Sales routes
  eggSales: router({
    create: publicProcedure
      .input(createEggSalesInputSchema)
      .mutation(({ input }) => createEggSales(input)),
    
    getAll: publicProcedure
      .query(() => getEggSales()),
    
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => getEggSalesById(input.id)),
    
    update: publicProcedure
      .input(updateEggSalesInputSchema)
      .mutation(({ input }) => updateEggSales(input)),
    
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteEggSales(input.id)),
    
    getTotalRevenueByDateRange: publicProcedure
      .input(z.object({ startDate: z.coerce.date(), endDate: z.coerce.date() }))
      .query(({ input }) => getTotalRevenueByDateRange(input.startDate, input.endDate)),
    
    getByDateRange: publicProcedure
      .input(z.object({ startDate: z.coerce.date(), endDate: z.coerce.date() }))
      .query(({ input }) => getEggSalesByDateRange(input.startDate, input.endDate))
  }),

  // Other Expenses routes
  otherExpenses: router({
    create: publicProcedure
      .input(createOtherExpensesInputSchema)
      .mutation(({ input }) => createOtherExpenses(input)),
    
    getAll: publicProcedure
      .query(() => getOtherExpenses()),
    
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => getOtherExpensesById(input.id)),
    
    update: publicProcedure
      .input(updateOtherExpensesInputSchema)
      .mutation(({ input }) => updateOtherExpenses(input)),
    
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteOtherExpenses(input.id)),
    
    getTotalByDateRange: publicProcedure
      .input(z.object({ startDate: z.coerce.date(), endDate: z.coerce.date() }))
      .query(({ input }) => getTotalExpensesByDateRange(input.startDate, input.endDate)),
    
    getByDateRange: publicProcedure
      .input(z.object({ startDate: z.coerce.date(), endDate: z.coerce.date() }))
      .query(({ input }) => getOtherExpensesByDateRange(input.startDate, input.endDate))
  }),

  // Profit Reports routes
  profitReports: router({
    generate: publicProcedure
      .input(profitReportInputSchema)
      .query(({ input }) => generateProfitReport(input))
  }),

  // Export routes
  export: router({
    data: publicProcedure
      .input(exportRequestSchema)
      .mutation(({ input }) => exportData(input)),
    
    profitReport: publicProcedure
      .input(z.object({
        format: z.enum(['pdf', 'excel']),
        startDate: z.coerce.date(),
        endDate: z.coerce.date()
      }))
      .mutation(({ input }) => exportProfitReport(input))
  })
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();