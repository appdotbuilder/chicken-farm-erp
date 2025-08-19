import { db } from '../db';
import { feedCompositionsTable, finishedFeedsTable, rawFeedMaterialsTable } from '../db/schema';
import { type CreateFeedCompositionInput, type UpdateFeedCompositionInput, type FeedComposition } from '../schema';
import { eq, and, sum } from 'drizzle-orm';

// Helper function to calculate and update finished feed cost per kg
async function updateFinishedFeedCost(finishedFeedId: number): Promise<void> {
  try {
    // Get all compositions for this finished feed with their raw material prices
    const compositions = await db
      .select({
        percentage: feedCompositionsTable.percentage,
        price_per_kg: rawFeedMaterialsTable.price_per_kg
      })
      .from(feedCompositionsTable)
      .innerJoin(rawFeedMaterialsTable, eq(feedCompositionsTable.raw_material_id, rawFeedMaterialsTable.id))
      .where(eq(feedCompositionsTable.finished_feed_id, finishedFeedId))
      .execute();

    // Calculate weighted cost per kg based on compositions
    let totalCost = 0;
    for (const composition of compositions) {
      const percentage = parseFloat(composition.percentage);
      const pricePerKg = parseFloat(composition.price_per_kg);
      totalCost += (percentage / 100) * pricePerKg;
    }

    // Update the finished feed's cost per kg
    await db
      .update(finishedFeedsTable)
      .set({ 
        cost_per_kg: totalCost.toString(),
        updated_at: new Date()
      })
      .where(eq(finishedFeedsTable.id, finishedFeedId))
      .execute();
  } catch (error) {
    console.error('Failed to update finished feed cost:', error);
    throw error;
  }
}

export async function createFeedComposition(input: CreateFeedCompositionInput): Promise<FeedComposition> {
  try {
    // Verify the finished feed exists
    const finishedFeed = await db
      .select()
      .from(finishedFeedsTable)
      .where(eq(finishedFeedsTable.id, input.finished_feed_id))
      .execute();

    if (finishedFeed.length === 0) {
      throw new Error(`Finished feed with id ${input.finished_feed_id} not found`);
    }

    // Verify the raw material exists
    const rawMaterial = await db
      .select()
      .from(rawFeedMaterialsTable)
      .where(eq(rawFeedMaterialsTable.id, input.raw_material_id))
      .execute();

    if (rawMaterial.length === 0) {
      throw new Error(`Raw material with id ${input.raw_material_id} not found`);
    }

    // Check if this combination already exists
    const existingComposition = await db
      .select()
      .from(feedCompositionsTable)
      .where(
        and(
          eq(feedCompositionsTable.finished_feed_id, input.finished_feed_id),
          eq(feedCompositionsTable.raw_material_id, input.raw_material_id)
        )
      )
      .execute();

    if (existingComposition.length > 0) {
      throw new Error(`Composition already exists for finished feed ${input.finished_feed_id} and raw material ${input.raw_material_id}`);
    }

    // Insert the feed composition
    const result = await db
      .insert(feedCompositionsTable)
      .values({
        finished_feed_id: input.finished_feed_id,
        raw_material_id: input.raw_material_id,
        percentage: input.percentage.toString()
      })
      .returning()
      .execute();

    const composition = result[0];

    // Update the finished feed's cost per kg
    await updateFinishedFeedCost(input.finished_feed_id);

    return {
      ...composition,
      percentage: parseFloat(composition.percentage)
    };
  } catch (error) {
    console.error('Feed composition creation failed:', error);
    throw error;
  }
}

export async function getFeedCompositions(): Promise<FeedComposition[]> {
  try {
    const results = await db
      .select()
      .from(feedCompositionsTable)
      .execute();

    return results.map(composition => ({
      ...composition,
      percentage: parseFloat(composition.percentage)
    }));
  } catch (error) {
    console.error('Failed to fetch feed compositions:', error);
    throw error;
  }
}

export async function getFeedCompositionsByFinishedFeedId(finishedFeedId: number): Promise<FeedComposition[]> {
  try {
    const results = await db
      .select()
      .from(feedCompositionsTable)
      .where(eq(feedCompositionsTable.finished_feed_id, finishedFeedId))
      .execute();

    return results.map(composition => ({
      ...composition,
      percentage: parseFloat(composition.percentage)
    }));
  } catch (error) {
    console.error('Failed to fetch feed compositions by finished feed id:', error);
    throw error;
  }
}

export async function getFeedCompositionById(id: number): Promise<FeedComposition | null> {
  try {
    const results = await db
      .select()
      .from(feedCompositionsTable)
      .where(eq(feedCompositionsTable.id, id))
      .execute();

    if (results.length === 0) {
      return null;
    }

    const composition = results[0];
    return {
      ...composition,
      percentage: parseFloat(composition.percentage)
    };
  } catch (error) {
    console.error('Failed to fetch feed composition by id:', error);
    throw error;
  }
}

export async function updateFeedComposition(input: UpdateFeedCompositionInput): Promise<FeedComposition> {
  try {
    // Verify the composition exists
    const existing = await getFeedCompositionById(input.id);
    if (!existing) {
      throw new Error(`Feed composition with id ${input.id} not found`);
    }

    // Update the composition
    const result = await db
      .update(feedCompositionsTable)
      .set({
        percentage: input.percentage?.toString()
      })
      .where(eq(feedCompositionsTable.id, input.id))
      .returning()
      .execute();

    const composition = result[0];

    // Update the finished feed's cost per kg
    await updateFinishedFeedCost(composition.finished_feed_id);

    return {
      ...composition,
      percentage: parseFloat(composition.percentage)
    };
  } catch (error) {
    console.error('Feed composition update failed:', error);
    throw error;
  }
}

export async function deleteFeedComposition(id: number): Promise<void> {
  try {
    // Get the composition to know which finished feed to update
    const composition = await getFeedCompositionById(id);
    if (!composition) {
      throw new Error(`Feed composition with id ${id} not found`);
    }

    // Delete the composition
    await db
      .delete(feedCompositionsTable)
      .where(eq(feedCompositionsTable.id, id))
      .execute();

    // Update the finished feed's cost per kg
    await updateFinishedFeedCost(composition.finished_feed_id);
  } catch (error) {
    console.error('Feed composition deletion failed:', error);
    throw error;
  }
}