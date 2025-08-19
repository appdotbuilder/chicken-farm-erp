import { db } from '../db';
import { feedConsumptionsTable, finishedFeedsTable, chickenFlocksTable } from '../db/schema';
import { type CreateFeedConsumptionInput, type UpdateFeedConsumptionInput, type FeedConsumption } from '../schema';
import { eq, gte, lte, and, sum, SQL } from 'drizzle-orm';

export async function createFeedConsumption(input: CreateFeedConsumptionInput): Promise<FeedConsumption> {
  try {
    // Verify that the flock exists
    const flock = await db.select()
      .from(chickenFlocksTable)
      .where(eq(chickenFlocksTable.id, input.flock_id))
      .execute();

    if (flock.length === 0) {
      throw new Error(`Flock with ID ${input.flock_id} not found`);
    }

    // Get the finished feed to calculate cost
    const finishedFeed = await db.select()
      .from(finishedFeedsTable)
      .where(eq(finishedFeedsTable.id, input.finished_feed_id))
      .execute();

    if (finishedFeed.length === 0) {
      throw new Error(`Finished feed with ID ${input.finished_feed_id} not found`);
    }

    // Calculate cost based on quantity and feed cost per kg
    const cost = input.quantity_kg * parseFloat(finishedFeed[0].cost_per_kg);

    // Insert feed consumption record
    const result = await db.insert(feedConsumptionsTable)
      .values({
        flock_id: input.flock_id,
        finished_feed_id: input.finished_feed_id,
        consumption_date: input.consumption_date.toISOString().split('T')[0], // Convert Date to YYYY-MM-DD string
        quantity_kg: input.quantity_kg.toString(),
        cost: cost.toString()
      })
      .returning()
      .execute();

    // Convert fields to proper types before returning
    const feedConsumption = result[0];
    return {
      ...feedConsumption,
      consumption_date: new Date(feedConsumption.consumption_date + 'T00:00:00.000Z'), // Ensure proper Date conversion
      quantity_kg: parseFloat(feedConsumption.quantity_kg),
      cost: parseFloat(feedConsumption.cost)
    };
  } catch (error) {
    console.error('Feed consumption creation failed:', error);
    throw error;
  }
}

export async function getFeedConsumptions(): Promise<FeedConsumption[]> {
  try {
    const results = await db.select()
      .from(feedConsumptionsTable)
      .execute();

    return results.map(consumption => ({
      ...consumption,
      consumption_date: new Date(consumption.consumption_date + 'T00:00:00.000Z'),
      quantity_kg: parseFloat(consumption.quantity_kg),
      cost: parseFloat(consumption.cost)
    }));
  } catch (error) {
    console.error('Failed to fetch feed consumptions:', error);
    throw error;
  }
}

export async function getFeedConsumptionsByFlockId(flockId: number): Promise<FeedConsumption[]> {
  try {
    const results = await db.select()
      .from(feedConsumptionsTable)
      .where(eq(feedConsumptionsTable.flock_id, flockId))
      .execute();

    return results.map(consumption => ({
      ...consumption,
      consumption_date: new Date(consumption.consumption_date + 'T00:00:00.000Z'),
      quantity_kg: parseFloat(consumption.quantity_kg),
      cost: parseFloat(consumption.cost)
    }));
  } catch (error) {
    console.error('Failed to fetch feed consumptions by flock ID:', error);
    throw error;
  }
}

export async function getFeedConsumptionById(id: number): Promise<FeedConsumption | null> {
  try {
    const results = await db.select()
      .from(feedConsumptionsTable)
      .where(eq(feedConsumptionsTable.id, id))
      .execute();

    if (results.length === 0) {
      return null;
    }

    const consumption = results[0];
    return {
      ...consumption,
      consumption_date: new Date(consumption.consumption_date + 'T00:00:00.000Z'),
      quantity_kg: parseFloat(consumption.quantity_kg),
      cost: parseFloat(consumption.cost)
    };
  } catch (error) {
    console.error('Failed to fetch feed consumption by ID:', error);
    throw error;
  }
}

export async function updateFeedConsumption(input: UpdateFeedConsumptionInput): Promise<FeedConsumption> {
  try {
    // Check if the feed consumption exists
    const existing = await getFeedConsumptionById(input.id);
    if (!existing) {
      throw new Error(`Feed consumption with ID ${input.id} not found`);
    }

    // Build update values
    const updateValues: any = {};

    if (input.flock_id !== undefined) {
      // Verify that the flock exists
      const flock = await db.select()
        .from(chickenFlocksTable)
        .where(eq(chickenFlocksTable.id, input.flock_id))
        .execute();

      if (flock.length === 0) {
        throw new Error(`Flock with ID ${input.flock_id} not found`);
      }
      updateValues.flock_id = input.flock_id;
    }

    if (input.finished_feed_id !== undefined) {
      // Verify that the finished feed exists
      const finishedFeed = await db.select()
        .from(finishedFeedsTable)
        .where(eq(finishedFeedsTable.id, input.finished_feed_id))
        .execute();

      if (finishedFeed.length === 0) {
        throw new Error(`Finished feed with ID ${input.finished_feed_id} not found`);
      }
      updateValues.finished_feed_id = input.finished_feed_id;
    }

    if (input.consumption_date !== undefined) {
      updateValues.consumption_date = input.consumption_date.toISOString().split('T')[0];
    }

    if (input.quantity_kg !== undefined) {
      updateValues.quantity_kg = input.quantity_kg.toString();
    }

    // Recalculate cost if quantity or feed type changes
    if (input.quantity_kg !== undefined || input.finished_feed_id !== undefined) {
      const feedId = input.finished_feed_id ?? existing.finished_feed_id;
      const quantity = input.quantity_kg ?? existing.quantity_kg;

      const finishedFeed = await db.select()
        .from(finishedFeedsTable)
        .where(eq(finishedFeedsTable.id, feedId))
        .execute();

      const cost = quantity * parseFloat(finishedFeed[0].cost_per_kg);
      updateValues.cost = cost.toString();
    }

    // Update the record
    const result = await db.update(feedConsumptionsTable)
      .set(updateValues)
      .where(eq(feedConsumptionsTable.id, input.id))
      .returning()
      .execute();

    // Convert fields to proper types before returning
    const feedConsumption = result[0];
    return {
      ...feedConsumption,
      consumption_date: new Date(feedConsumption.consumption_date + 'T00:00:00.000Z'),
      quantity_kg: parseFloat(feedConsumption.quantity_kg),
      cost: parseFloat(feedConsumption.cost)
    };
  } catch (error) {
    console.error('Feed consumption update failed:', error);
    throw error;
  }
}

export async function deleteFeedConsumption(id: number): Promise<void> {
  try {
    // Check if the feed consumption exists
    const existing = await getFeedConsumptionById(id);
    if (!existing) {
      throw new Error(`Feed consumption with ID ${id} not found`);
    }

    await db.delete(feedConsumptionsTable)
      .where(eq(feedConsumptionsTable.id, id))
      .execute();
  } catch (error) {
    console.error('Feed consumption deletion failed:', error);
    throw error;
  }
}

export async function getTotalFeedCostByDateRange(startDate: Date, endDate: Date): Promise<number> {
  try {
    const conditions: SQL<unknown>[] = [
      gte(feedConsumptionsTable.consumption_date, startDate.toISOString().split('T')[0]),
      lte(feedConsumptionsTable.consumption_date, endDate.toISOString().split('T')[0])
    ];

    const result = await db.select({
      total: sum(feedConsumptionsTable.cost)
    })
      .from(feedConsumptionsTable)
      .where(and(...conditions))
      .execute();

    // sum() returns a string, convert to number
    const totalCost = result[0]?.total ? parseFloat(result[0].total) : 0;
    return totalCost;
  } catch (error) {
    console.error('Failed to calculate total feed cost by date range:', error);
    throw error;
  }
}