import { db } from '../db';
import { eggSalesTable, feedConsumptionsTable, otherExpensesTable } from '../db/schema';
import { type ProfitReportInput, type ProfitReport } from '../schema';
import { gte, lte, and } from 'drizzle-orm';
import { sum, sql } from 'drizzle-orm';

export async function generateProfitReport(input: ProfitReportInput): Promise<ProfitReport> {
  try {
    const [totalRevenue, totalFeedCost, totalOtherExpenses] = await Promise.all([
      calculateTotalRevenue(input.period_start, input.period_end),
      calculateTotalFeedCost(input.period_start, input.period_end),
      calculateTotalOtherExpenses(input.period_start, input.period_end)
    ]);

    const totalProfit = totalRevenue - totalFeedCost - totalOtherExpenses;

    return {
      total_revenue: totalRevenue,
      total_feed_cost: totalFeedCost,
      total_other_expenses: totalOtherExpenses,
      total_profit: totalProfit,
      period_start: input.period_start,
      period_end: input.period_end
    };
  } catch (error) {
    console.error('Profit report generation failed:', error);
    throw error;
  }
}

export async function calculateTotalRevenue(startDate: Date, endDate: Date): Promise<number> {
  try {
    const result = await db
      .select({
        total: sum(eggSalesTable.total_price)
      })
      .from(eggSalesTable)
      .where(
        and(
          gte(eggSalesTable.sale_date, startDate.toISOString().split('T')[0]),
          lte(eggSalesTable.sale_date, endDate.toISOString().split('T')[0])
        )
      )
      .execute();

    // Convert numeric result to number, handle null case
    const total = result[0]?.total;
    return total ? parseFloat(total) : 0;
  } catch (error) {
    console.error('Revenue calculation failed:', error);
    throw error;
  }
}

export async function calculateTotalFeedCost(startDate: Date, endDate: Date): Promise<number> {
  try {
    const result = await db
      .select({
        total: sum(feedConsumptionsTable.cost)
      })
      .from(feedConsumptionsTable)
      .where(
        and(
          gte(feedConsumptionsTable.consumption_date, startDate.toISOString().split('T')[0]),
          lte(feedConsumptionsTable.consumption_date, endDate.toISOString().split('T')[0])
        )
      )
      .execute();

    // Convert numeric result to number, handle null case
    const total = result[0]?.total;
    return total ? parseFloat(total) : 0;
  } catch (error) {
    console.error('Feed cost calculation failed:', error);
    throw error;
  }
}

export async function calculateTotalOtherExpenses(startDate: Date, endDate: Date): Promise<number> {
  try {
    const result = await db
      .select({
        total: sum(otherExpensesTable.amount)
      })
      .from(otherExpensesTable)
      .where(
        and(
          gte(otherExpensesTable.expense_date, startDate.toISOString().split('T')[0]),
          lte(otherExpensesTable.expense_date, endDate.toISOString().split('T')[0])
        )
      )
      .execute();

    // Convert numeric result to number, handle null case
    const total = result[0]?.total;
    return total ? parseFloat(total) : 0;
  } catch (error) {
    console.error('Other expenses calculation failed:', error);
    throw error;
  }
}