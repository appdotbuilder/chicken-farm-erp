import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { feedCompositionsTable, finishedFeedsTable, rawFeedMaterialsTable } from '../db/schema';
import { type CreateFeedCompositionInput, type UpdateFeedCompositionInput } from '../schema';
import {
  createFeedComposition,
  getFeedCompositions,
  getFeedCompositionsByFinishedFeedId,
  getFeedCompositionById,
  updateFeedComposition,
  deleteFeedComposition
} from '../handlers/feed_compositions';
import { eq } from 'drizzle-orm';

// Test data
const testRawMaterial1 = {
  name: 'Corn',
  price_per_kg: '2.50'
};

const testRawMaterial2 = {
  name: 'Soybean Meal',
  price_per_kg: '3.20'
};

const testFinishedFeed = {
  name: 'Layer Feed',
  cost_per_kg: '0.00'
};

const testCompositionInput1: CreateFeedCompositionInput = {
  finished_feed_id: 1,
  raw_material_id: 1,
  percentage: 60
};

const testCompositionInput2: CreateFeedCompositionInput = {
  finished_feed_id: 1,
  raw_material_id: 2,
  percentage: 40
};

describe('Feed Compositions Handler', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create prerequisite data
  async function createPrerequisites() {
    // Create raw materials
    const rawMaterial1 = await db
      .insert(rawFeedMaterialsTable)
      .values(testRawMaterial1)
      .returning()
      .execute();

    const rawMaterial2 = await db
      .insert(rawFeedMaterialsTable)
      .values(testRawMaterial2)
      .returning()
      .execute();

    // Create finished feed
    const finishedFeed = await db
      .insert(finishedFeedsTable)
      .values(testFinishedFeed)
      .returning()
      .execute();

    return {
      rawMaterial1: rawMaterial1[0],
      rawMaterial2: rawMaterial2[0],
      finishedFeed: finishedFeed[0]
    };
  }

  describe('createFeedComposition', () => {
    it('should create a feed composition and update finished feed cost', async () => {
      await createPrerequisites();

      const result = await createFeedComposition(testCompositionInput1);

      // Verify composition fields
      expect(result.id).toBeDefined();
      expect(result.finished_feed_id).toEqual(1);
      expect(result.raw_material_id).toEqual(1);
      expect(result.percentage).toEqual(60);
      expect(result.created_at).toBeInstanceOf(Date);

      // Verify it's saved in database
      const compositions = await db
        .select()
        .from(feedCompositionsTable)
        .where(eq(feedCompositionsTable.id, result.id))
        .execute();

      expect(compositions).toHaveLength(1);
      expect(compositions[0].finished_feed_id).toEqual(1);
      expect(parseFloat(compositions[0].percentage)).toEqual(60);

      // Verify finished feed cost was updated (60% of 2.50 = 1.50)
      const finishedFeeds = await db
        .select()
        .from(finishedFeedsTable)
        .where(eq(finishedFeedsTable.id, 1))
        .execute();

      expect(parseFloat(finishedFeeds[0].cost_per_kg)).toEqual(1.50);
    });

    it('should calculate complex finished feed cost with multiple compositions', async () => {
      await createPrerequisites();

      // Create first composition (60% corn at 2.50/kg)
      await createFeedComposition(testCompositionInput1);
      
      // Create second composition (40% soybean meal at 3.20/kg)
      await createFeedComposition(testCompositionInput2);

      // Verify finished feed cost: (60% * 2.50) + (40% * 3.20) = 1.50 + 1.28 = 2.78
      const finishedFeeds = await db
        .select()
        .from(finishedFeedsTable)
        .where(eq(finishedFeedsTable.id, 1))
        .execute();

      expect(parseFloat(finishedFeeds[0].cost_per_kg)).toEqual(2.78);
    });

    it('should throw error when finished feed does not exist', async () => {
      await createPrerequisites();

      const invalidInput = {
        ...testCompositionInput1,
        finished_feed_id: 999
      };

      await expect(createFeedComposition(invalidInput))
        .rejects.toThrow(/Finished feed with id 999 not found/i);
    });

    it('should throw error when raw material does not exist', async () => {
      await createPrerequisites();

      const invalidInput = {
        ...testCompositionInput1,
        raw_material_id: 999
      };

      await expect(createFeedComposition(invalidInput))
        .rejects.toThrow(/Raw material with id 999 not found/i);
    });

    it('should throw error when composition already exists', async () => {
      await createPrerequisites();

      await createFeedComposition(testCompositionInput1);

      await expect(createFeedComposition(testCompositionInput1))
        .rejects.toThrow(/Composition already exists/i);
    });
  });

  describe('getFeedCompositions', () => {
    it('should return empty array when no compositions exist', async () => {
      const result = await getFeedCompositions();
      expect(result).toEqual([]);
    });

    it('should return all feed compositions', async () => {
      await createPrerequisites();
      await createFeedComposition(testCompositionInput1);
      await createFeedComposition(testCompositionInput2);

      const result = await getFeedCompositions();

      expect(result).toHaveLength(2);
      expect(result[0].percentage).toEqual(60);
      expect(result[1].percentage).toEqual(40);
      expect(typeof result[0].percentage).toBe('number');
      expect(typeof result[1].percentage).toBe('number');
    });
  });

  describe('getFeedCompositionsByFinishedFeedId', () => {
    it('should return empty array when no compositions exist for finished feed', async () => {
      const result = await getFeedCompositionsByFinishedFeedId(1);
      expect(result).toEqual([]);
    });

    it('should return compositions for specific finished feed', async () => {
      await createPrerequisites();
      
      // Create second finished feed
      const finishedFeed2 = await db
        .insert(finishedFeedsTable)
        .values({ name: 'Broiler Feed', cost_per_kg: '0.00' })
        .returning()
        .execute();

      await createFeedComposition(testCompositionInput1);
      await createFeedComposition(testCompositionInput2);
      
      // Create composition for second finished feed
      await createFeedComposition({
        finished_feed_id: finishedFeed2[0].id,
        raw_material_id: 1,
        percentage: 80
      });

      const result = await getFeedCompositionsByFinishedFeedId(1);

      expect(result).toHaveLength(2);
      expect(result.every(comp => comp.finished_feed_id === 1)).toBe(true);
    });
  });

  describe('getFeedCompositionById', () => {
    it('should return null when composition does not exist', async () => {
      const result = await getFeedCompositionById(999);
      expect(result).toBeNull();
    });

    it('should return composition by id', async () => {
      await createPrerequisites();
      const created = await createFeedComposition(testCompositionInput1);

      const result = await getFeedCompositionById(created.id);

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(created.id);
      expect(result!.percentage).toEqual(60);
      expect(typeof result!.percentage).toBe('number');
    });
  });

  describe('updateFeedComposition', () => {
    it('should update composition percentage and recalculate cost', async () => {
      await createPrerequisites();
      const created = await createFeedComposition(testCompositionInput1);

      const updateInput: UpdateFeedCompositionInput = {
        id: created.id,
        percentage: 80
      };

      const result = await updateFeedComposition(updateInput);

      expect(result.id).toEqual(created.id);
      expect(result.percentage).toEqual(80);
      expect(typeof result.percentage).toBe('number');

      // Verify finished feed cost was recalculated (80% of 2.50 = 2.00)
      const finishedFeeds = await db
        .select()
        .from(finishedFeedsTable)
        .where(eq(finishedFeedsTable.id, 1))
        .execute();

      expect(parseFloat(finishedFeeds[0].cost_per_kg)).toEqual(2.00);
    });

    it('should throw error when composition does not exist', async () => {
      const updateInput: UpdateFeedCompositionInput = {
        id: 999,
        percentage: 50
      };

      await expect(updateFeedComposition(updateInput))
        .rejects.toThrow(/Feed composition with id 999 not found/i);
    });
  });

  describe('deleteFeedComposition', () => {
    it('should delete composition and recalculate finished feed cost', async () => {
      await createPrerequisites();
      
      // Create two compositions
      const composition1 = await createFeedComposition(testCompositionInput1);
      await createFeedComposition(testCompositionInput2);

      // Verify initial cost: (60% * 2.50) + (40% * 3.20) = 2.78
      let finishedFeeds = await db
        .select()
        .from(finishedFeedsTable)
        .where(eq(finishedFeedsTable.id, 1))
        .execute();
      expect(parseFloat(finishedFeeds[0].cost_per_kg)).toEqual(2.78);

      // Delete first composition
      await deleteFeedComposition(composition1.id);

      // Verify composition was deleted
      const deletedComposition = await getFeedCompositionById(composition1.id);
      expect(deletedComposition).toBeNull();

      // Verify cost was recalculated (only 40% * 3.20 = 1.28)
      finishedFeeds = await db
        .select()
        .from(finishedFeedsTable)
        .where(eq(finishedFeedsTable.id, 1))
        .execute();
      expect(parseFloat(finishedFeeds[0].cost_per_kg)).toEqual(1.28);
    });

    it('should throw error when composition does not exist', async () => {
      await expect(deleteFeedComposition(999))
        .rejects.toThrow(/Feed composition with id 999 not found/i);
    });

    it('should set finished feed cost to zero when all compositions are deleted', async () => {
      await createPrerequisites();
      
      const composition1 = await createFeedComposition(testCompositionInput1);
      const composition2 = await createFeedComposition(testCompositionInput2);

      // Delete both compositions
      await deleteFeedComposition(composition1.id);
      await deleteFeedComposition(composition2.id);

      // Verify cost is zero
      const finishedFeeds = await db
        .select()
        .from(finishedFeedsTable)
        .where(eq(finishedFeedsTable.id, 1))
        .execute();
      expect(parseFloat(finishedFeeds[0].cost_per_kg)).toEqual(0);
    });
  });
});