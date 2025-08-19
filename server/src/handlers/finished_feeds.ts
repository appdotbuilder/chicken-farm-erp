import { db } from '../db';
import { finishedFeedsTable, feedCompositionsTable, rawFeedMaterialsTable } from '../db/schema';
import { type CreateFinishedFeedInput, type UpdateFinishedFeedInput, type FinishedFeed } from '../schema';
import { eq, sum, sql } from 'drizzle-orm';

export async function createFinishedFeed(input: CreateFinishedFeedInput): Promise<FinishedFeed> {
  try {
    // Insert finished feed with initial cost of 0
    const result = await db.insert(finishedFeedsTable)
      .values({
        name: input.name,
        cost_per_kg: '0.00' // Initialize with 0, will be calculated when compositions are added
      })
      .returning()
      .execute();

    const finishedFeed = result[0];
    return {
      ...finishedFeed,
      cost_per_kg: parseFloat(finishedFeed.cost_per_kg)
    };
  } catch (error) {
    console.error('Finished feed creation failed:', error);
    throw error;
  }
}

export async function getFinishedFeeds(): Promise<FinishedFeed[]> {
  try {
    const results = await db.select()
      .from(finishedFeedsTable)
      .execute();

    return results.map(feed => ({
      ...feed,
      cost_per_kg: parseFloat(feed.cost_per_kg)
    }));
  } catch (error) {
    console.error('Failed to fetch finished feeds:', error);
    throw error;
  }
}

export async function getFinishedFeedById(id: number): Promise<FinishedFeed | null> {
  try {
    const results = await db.select()
      .from(finishedFeedsTable)
      .where(eq(finishedFeedsTable.id, id))
      .execute();

    if (results.length === 0) {
      return null;
    }

    const feed = results[0];
    return {
      ...feed,
      cost_per_kg: parseFloat(feed.cost_per_kg)
    };
  } catch (error) {
    console.error('Failed to fetch finished feed by ID:', error);
    throw error;
  }
}

export async function updateFinishedFeed(input: UpdateFinishedFeedInput): Promise<FinishedFeed> {
  try {
    // Check if the finished feed exists
    const existingFeed = await getFinishedFeedById(input.id);
    if (!existingFeed) {
      throw new Error(`Finished feed with ID ${input.id} not found`);
    }

    // Prepare update values
    const updateValues: any = {
      updated_at: sql`now()`
    };

    if (input.name !== undefined) {
      updateValues.name = input.name;
    }

    const result = await db.update(finishedFeedsTable)
      .set(updateValues)
      .where(eq(finishedFeedsTable.id, input.id))
      .returning()
      .execute();

    const updatedFeed = result[0];
    return {
      ...updatedFeed,
      cost_per_kg: parseFloat(updatedFeed.cost_per_kg)
    };
  } catch (error) {
    console.error('Finished feed update failed:', error);
    throw error;
  }
}

export async function deleteFinishedFeed(id: number): Promise<void> {
  try {
    // Check if the finished feed exists
    const existingFeed = await getFinishedFeedById(id);
    if (!existingFeed) {
      throw new Error(`Finished feed with ID ${id} not found`);
    }

    await db.delete(finishedFeedsTable)
      .where(eq(finishedFeedsTable.id, id))
      .execute();
  } catch (error) {
    console.error('Finished feed deletion failed:', error);
    throw error;
  }
}

export async function calculateFeedCost(finishedFeedId: number): Promise<number> {
  try {
    // Calculate cost by joining compositions with raw materials
    const results = await db.select({
      totalCost: sql<string>`COALESCE(SUM(${rawFeedMaterialsTable.price_per_kg}::numeric * ${feedCompositionsTable.percentage}::numeric / 100), 0)::numeric`
    })
      .from(feedCompositionsTable)
      .innerJoin(rawFeedMaterialsTable, eq(feedCompositionsTable.raw_material_id, rawFeedMaterialsTable.id))
      .where(eq(feedCompositionsTable.finished_feed_id, finishedFeedId))
      .execute();

    const totalCost = results.length > 0 ? parseFloat(results[0].totalCost) : 0;

    // Update the finished feed with calculated cost
    await db.update(finishedFeedsTable)
      .set({
        cost_per_kg: totalCost.toString(),
        updated_at: sql`now()`
      })
      .where(eq(finishedFeedsTable.id, finishedFeedId))
      .execute();

    return totalCost;
  } catch (error) {
    console.error('Feed cost calculation failed:', error);
    throw error;
  }
}