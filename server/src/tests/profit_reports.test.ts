import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  eggSalesTable, 
  feedConsumptionsTable, 
  otherExpensesTable,
  chickenFlocksTable,
  finishedFeedsTable
} from '../db/schema';
import { type ProfitReportInput } from '../schema';
import { 
  generateProfitReport, 
  calculateTotalRevenue, 
  calculateTotalFeedCost, 
  calculateTotalOtherExpenses 
} from '../handlers/profit_reports';

// Helper function to convert Date to string format for database
const toDateString = (date: Date): string => date.toISOString().split('T')[0];

// Test date range
const startDate = new Date('2024-01-01');
const endDate = new Date('2024-01-31');
const beforeStart = new Date('2023-12-31');
const afterEnd = new Date('2024-02-01');

const testInput: ProfitReportInput = {
  period_start: startDate,
  period_end: endDate
};

describe('profit reports', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('calculateTotalRevenue', () => {
    it('should calculate total revenue from egg sales in date range', async () => {
      // Create test egg sales data
      await db.insert(eggSalesTable)
        .values([
          {
            sale_date: toDateString(new Date('2024-01-15')),
            quality: 'A',
            quantity: 100,
            price_per_egg: '0.50',
            total_price: '50.00'
          },
          {
            sale_date: toDateString(new Date('2024-01-20')),
            quality: 'B',
            quantity: 50,
            price_per_egg: '0.40',
            total_price: '20.00'
          }
        ])
        .execute();

      const result = await calculateTotalRevenue(startDate, endDate);

      expect(result).toEqual(70.00);
      expect(typeof result).toBe('number');
    });

    it('should exclude sales outside date range', async () => {
      // Create test egg sales data - some inside, some outside range
      await db.insert(eggSalesTable)
        .values([
          {
            sale_date: toDateString(beforeStart),
            quality: 'A',
            quantity: 100,
            price_per_egg: '0.50',
            total_price: '50.00'
          },
          {
            sale_date: toDateString(new Date('2024-01-15')),
            quality: 'A',
            quantity: 60,
            price_per_egg: '0.50',
            total_price: '30.00'
          },
          {
            sale_date: toDateString(afterEnd),
            quality: 'B',
            quantity: 40,
            price_per_egg: '0.40',
            total_price: '16.00'
          }
        ])
        .execute();

      const result = await calculateTotalRevenue(startDate, endDate);

      expect(result).toEqual(30.00);
    });

    it('should return 0 when no sales exist in date range', async () => {
      // Create sales outside the range
      await db.insert(eggSalesTable)
        .values([
          {
            sale_date: toDateString(beforeStart),
            quality: 'A',
            quantity: 100,
            price_per_egg: '0.50',
            total_price: '50.00'
          }
        ])
        .execute();

      const result = await calculateTotalRevenue(startDate, endDate);

      expect(result).toEqual(0);
    });

    it('should return 0 when no sales exist at all', async () => {
      const result = await calculateTotalRevenue(startDate, endDate);

      expect(result).toEqual(0);
    });
  });

  describe('calculateTotalFeedCost', () => {
    it('should calculate total feed cost in date range', async () => {
      // Create prerequisite data
      const flock = await db.insert(chickenFlocksTable)
        .values({
          strain: 'Rhode Island Red',
          entry_date: toDateString(new Date('2024-01-01')),
          initial_count: 100,
          age_upon_entry_days: 30,
          current_count: 100
        })
        .returning()
        .execute();

      const feed = await db.insert(finishedFeedsTable)
        .values({
          name: 'Layer Feed',
          cost_per_kg: '2.50'
        })
        .returning()
        .execute();

      // Create test feed consumption data
      await db.insert(feedConsumptionsTable)
        .values([
          {
            flock_id: flock[0].id,
            finished_feed_id: feed[0].id,
            consumption_date: toDateString(new Date('2024-01-10')),
            quantity_kg: '25.00',
            cost: '62.50'
          },
          {
            flock_id: flock[0].id,
            finished_feed_id: feed[0].id,
            consumption_date: toDateString(new Date('2024-01-25')),
            quantity_kg: '30.00',
            cost: '75.00'
          }
        ])
        .execute();

      const result = await calculateTotalFeedCost(startDate, endDate);

      expect(result).toEqual(137.50);
      expect(typeof result).toBe('number');
    });

    it('should exclude feed costs outside date range', async () => {
      // Create prerequisite data
      const flock = await db.insert(chickenFlocksTable)
        .values({
          strain: 'Rhode Island Red',
          entry_date: toDateString(new Date('2024-01-01')),
          initial_count: 100,
          age_upon_entry_days: 30,
          current_count: 100
        })
        .returning()
        .execute();

      const feed = await db.insert(finishedFeedsTable)
        .values({
          name: 'Layer Feed',
          cost_per_kg: '2.50'
        })
        .returning()
        .execute();

      // Create feed consumption data - some inside, some outside range
      await db.insert(feedConsumptionsTable)
        .values([
          {
            flock_id: flock[0].id,
            finished_feed_id: feed[0].id,
            consumption_date: toDateString(beforeStart),
            quantity_kg: '20.00',
            cost: '50.00'
          },
          {
            flock_id: flock[0].id,
            finished_feed_id: feed[0].id,
            consumption_date: toDateString(new Date('2024-01-15')),
            quantity_kg: '25.00',
            cost: '62.50'
          },
          {
            flock_id: flock[0].id,
            finished_feed_id: feed[0].id,
            consumption_date: toDateString(afterEnd),
            quantity_kg: '30.00',
            cost: '75.00'
          }
        ])
        .execute();

      const result = await calculateTotalFeedCost(startDate, endDate);

      expect(result).toEqual(62.50);
    });

    it('should return 0 when no feed consumption exists in date range', async () => {
      const result = await calculateTotalFeedCost(startDate, endDate);

      expect(result).toEqual(0);
    });
  });

  describe('calculateTotalOtherExpenses', () => {
    it('should calculate total other expenses in date range', async () => {
      // Create test other expenses data
      await db.insert(otherExpensesTable)
        .values([
          {
            expense_date: toDateString(new Date('2024-01-05')),
            expense_type: 'medication',
            description: 'Antibiotics for flock',
            amount: '150.00'
          },
          {
            expense_date: toDateString(new Date('2024-01-15')),
            expense_type: 'electricity',
            description: 'Monthly electricity bill',
            amount: '300.00'
          },
          {
            expense_date: toDateString(new Date('2024-01-25')),
            expense_type: 'labor',
            description: 'Worker wages',
            amount: '500.00'
          }
        ])
        .execute();

      const result = await calculateTotalOtherExpenses(startDate, endDate);

      expect(result).toEqual(950.00);
      expect(typeof result).toBe('number');
    });

    it('should exclude expenses outside date range', async () => {
      // Create expenses data - some inside, some outside range
      await db.insert(otherExpensesTable)
        .values([
          {
            expense_date: toDateString(beforeStart),
            expense_type: 'medication',
            description: 'December medication',
            amount: '100.00'
          },
          {
            expense_date: toDateString(new Date('2024-01-15')),
            expense_type: 'electricity',
            description: 'January electricity',
            amount: '300.00'
          },
          {
            expense_date: toDateString(afterEnd),
            expense_type: 'labor',
            description: 'February wages',
            amount: '500.00'
          }
        ])
        .execute();

      const result = await calculateTotalOtherExpenses(startDate, endDate);

      expect(result).toEqual(300.00);
    });

    it('should return 0 when no expenses exist in date range', async () => {
      const result = await calculateTotalOtherExpenses(startDate, endDate);

      expect(result).toEqual(0);
    });
  });

  describe('generateProfitReport', () => {
    it('should generate complete profit report', async () => {
      // Create prerequisite data for feed consumption
      const flock = await db.insert(chickenFlocksTable)
        .values({
          strain: 'Rhode Island Red',
          entry_date: toDateString(new Date('2024-01-01')),
          initial_count: 100,
          age_upon_entry_days: 30,
          current_count: 100
        })
        .returning()
        .execute();

      const feed = await db.insert(finishedFeedsTable)
        .values({
          name: 'Layer Feed',
          cost_per_kg: '2.50'
        })
        .returning()
        .execute();

      // Create test data
      await db.insert(eggSalesTable)
        .values([
          {
            sale_date: toDateString(new Date('2024-01-15')),
            quality: 'A',
            quantity: 200,
            price_per_egg: '0.50',
            total_price: '100.00'
          }
        ])
        .execute();

      await db.insert(feedConsumptionsTable)
        .values([
          {
            flock_id: flock[0].id,
            finished_feed_id: feed[0].id,
            consumption_date: toDateString(new Date('2024-01-10')),
            quantity_kg: '20.00',
            cost: '50.00'
          }
        ])
        .execute();

      await db.insert(otherExpensesTable)
        .values([
          {
            expense_date: toDateString(new Date('2024-01-05')),
            expense_type: 'electricity',
            description: 'Monthly electricity',
            amount: '25.00'
          }
        ])
        .execute();

      const result = await generateProfitReport(testInput);

      expect(result.total_revenue).toEqual(100.00);
      expect(result.total_feed_cost).toEqual(50.00);
      expect(result.total_other_expenses).toEqual(25.00);
      expect(result.total_profit).toEqual(25.00); // 100 - 50 - 25
      expect(result.period_start).toEqual(startDate);
      expect(result.period_end).toEqual(endDate);

      // Verify all fields are numbers
      expect(typeof result.total_revenue).toBe('number');
      expect(typeof result.total_feed_cost).toBe('number');
      expect(typeof result.total_other_expenses).toBe('number');
      expect(typeof result.total_profit).toBe('number');
    });

    it('should handle negative profit correctly', async () => {
      // Create prerequisite data
      const flock = await db.insert(chickenFlocksTable)
        .values({
          strain: 'Rhode Island Red',
          entry_date: toDateString(new Date('2024-01-01')),
          initial_count: 100,
          age_upon_entry_days: 30,
          current_count: 100
        })
        .returning()
        .execute();

      const feed = await db.insert(finishedFeedsTable)
        .values({
          name: 'Layer Feed',
          cost_per_kg: '2.50'
        })
        .returning()
        .execute();

      // Create data where costs exceed revenue
      await db.insert(eggSalesTable)
        .values([
          {
            sale_date: toDateString(new Date('2024-01-15')),
            quality: 'A',
            quantity: 50,
            price_per_egg: '0.50',
            total_price: '25.00'
          }
        ])
        .execute();

      await db.insert(feedConsumptionsTable)
        .values([
          {
            flock_id: flock[0].id,
            finished_feed_id: feed[0].id,
            consumption_date: toDateString(new Date('2024-01-10')),
            quantity_kg: '20.00',
            cost: '50.00'
          }
        ])
        .execute();

      await db.insert(otherExpensesTable)
        .values([
          {
            expense_date: toDateString(new Date('2024-01-05')),
            expense_type: 'electricity',
            description: 'Monthly electricity',
            amount: '30.00'
          }
        ])
        .execute();

      const result = await generateProfitReport(testInput);

      expect(result.total_revenue).toEqual(25.00);
      expect(result.total_feed_cost).toEqual(50.00);
      expect(result.total_other_expenses).toEqual(30.00);
      expect(result.total_profit).toEqual(-55.00); // 25 - 50 - 30
    });

    it('should handle zero values correctly', async () => {
      const result = await generateProfitReport(testInput);

      expect(result.total_revenue).toEqual(0);
      expect(result.total_feed_cost).toEqual(0);
      expect(result.total_other_expenses).toEqual(0);
      expect(result.total_profit).toEqual(0);
      expect(result.period_start).toEqual(startDate);
      expect(result.period_end).toEqual(endDate);
    });

    it('should handle single day date range', async () => {
      const singleDate = new Date('2024-01-15');
      const singleDayInput: ProfitReportInput = {
        period_start: singleDate,
        period_end: singleDate
      };

      // Create prerequisite data
      const flock = await db.insert(chickenFlocksTable)
        .values({
          strain: 'Rhode Island Red',
          entry_date: toDateString(new Date('2024-01-01')),
          initial_count: 100,
          age_upon_entry_days: 30,
          current_count: 100
        })
        .returning()
        .execute();

      const feed = await db.insert(finishedFeedsTable)
        .values({
          name: 'Layer Feed',
          cost_per_kg: '2.50'
        })
        .returning()
        .execute();

      // Create data for the specific date
      await db.insert(eggSalesTable)
        .values([
          {
            sale_date: toDateString(singleDate),
            quality: 'A',
            quantity: 100,
            price_per_egg: '0.50',
            total_price: '50.00'
          }
        ])
        .execute();

      await db.insert(feedConsumptionsTable)
        .values([
          {
            flock_id: flock[0].id,
            finished_feed_id: feed[0].id,
            consumption_date: toDateString(singleDate),
            quantity_kg: '10.00',
            cost: '25.00'
          }
        ])
        .execute();

      await db.insert(otherExpensesTable)
        .values([
          {
            expense_date: toDateString(singleDate),
            expense_type: 'labor',
            description: 'Daily wages',
            amount: '15.00'
          }
        ])
        .execute();

      const result = await generateProfitReport(singleDayInput);

      expect(result.total_revenue).toEqual(50.00);
      expect(result.total_feed_cost).toEqual(25.00);
      expect(result.total_other_expenses).toEqual(15.00);
      expect(result.total_profit).toEqual(10.00);
      expect(result.period_start).toEqual(singleDate);
      expect(result.period_end).toEqual(singleDate);
    });
  });
});