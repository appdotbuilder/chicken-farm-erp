import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { finishedFeedsTable, rawFeedMaterialsTable, feedCompositionsTable } from '../db/schema';
import { type CreateFinishedFeedInput, type UpdateFinishedFeedInput } from '../schema';
import {
  createFinishedFeed,
  getFinishedFeeds,
  getFinishedFeedById,
  updateFinishedFeed,
  deleteFinishedFeed,
  calculateFeedCost
} from '../handlers/finished_feeds';
import { eq } from 'drizzle-orm';

const testInput: CreateFinishedFeedInput = {
  name: 'Premium Chicken Feed'
};

describe('createFinishedFeed', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a finished feed', async () => {
    const result = await createFinishedFeed(testInput);

    expect(result.name).toEqual('Premium Chicken Feed');
    expect(result.cost_per_kg).toEqual(0);
    expect(typeof result.cost_per_kg).toBe('number');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save finished feed to database', async () => {
    const result = await createFinishedFeed(testInput);

    const feeds = await db.select()
      .from(finishedFeedsTable)
      .where(eq(finishedFeedsTable.id, result.id))
      .execute();

    expect(feeds).toHaveLength(1);
    expect(feeds[0].name).toEqual('Premium Chicken Feed');
    expect(parseFloat(feeds[0].cost_per_kg)).toEqual(0);
    expect(feeds[0].created_at).toBeInstanceOf(Date);
  });
});

describe('getFinishedFeeds', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no feeds exist', async () => {
    const result = await getFinishedFeeds();
    expect(result).toHaveLength(0);
  });

  it('should return all finished feeds', async () => {
    await createFinishedFeed({ name: 'Feed 1' });
    await createFinishedFeed({ name: 'Feed 2' });

    const result = await getFinishedFeeds();

    expect(result).toHaveLength(2);
    expect(result[0].name).toEqual('Feed 1');
    expect(result[1].name).toEqual('Feed 2');
    expect(typeof result[0].cost_per_kg).toBe('number');
    expect(typeof result[1].cost_per_kg).toBe('number');
  });
});

describe('getFinishedFeedById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return null for non-existent feed', async () => {
    const result = await getFinishedFeedById(999);
    expect(result).toBeNull();
  });

  it('should return finished feed by ID', async () => {
    const created = await createFinishedFeed(testInput);

    const result = await getFinishedFeedById(created.id);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(created.id);
    expect(result!.name).toEqual('Premium Chicken Feed');
    expect(typeof result!.cost_per_kg).toBe('number');
  });
});

describe('updateFinishedFeed', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should throw error for non-existent feed', async () => {
    const updateInput: UpdateFinishedFeedInput = {
      id: 999,
      name: 'Updated Feed'
    };

    await expect(updateFinishedFeed(updateInput)).rejects.toThrow(/not found/i);
  });

  it('should update finished feed name', async () => {
    const created = await createFinishedFeed(testInput);

    const updateInput: UpdateFinishedFeedInput = {
      id: created.id,
      name: 'Updated Premium Feed'
    };

    const result = await updateFinishedFeed(updateInput);

    expect(result.id).toEqual(created.id);
    expect(result.name).toEqual('Updated Premium Feed');
    expect(result.cost_per_kg).toEqual(created.cost_per_kg);
    expect(result.updated_at > created.updated_at).toBe(true);
  });

  it('should update only provided fields', async () => {
    const created = await createFinishedFeed(testInput);

    const updateInput: UpdateFinishedFeedInput = {
      id: created.id
    };

    const result = await updateFinishedFeed(updateInput);

    expect(result.name).toEqual(created.name); // Should remain unchanged
    expect(result.updated_at > created.updated_at).toBe(true);
  });

  it('should save updated feed to database', async () => {
    const created = await createFinishedFeed(testInput);

    const updateInput: UpdateFinishedFeedInput = {
      id: created.id,
      name: 'Database Updated Feed'
    };

    await updateFinishedFeed(updateInput);

    const feeds = await db.select()
      .from(finishedFeedsTable)
      .where(eq(finishedFeedsTable.id, created.id))
      .execute();

    expect(feeds).toHaveLength(1);
    expect(feeds[0].name).toEqual('Database Updated Feed');
  });
});

describe('deleteFinishedFeed', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should throw error for non-existent feed', async () => {
    await expect(deleteFinishedFeed(999)).rejects.toThrow(/not found/i);
  });

  it('should delete finished feed from database', async () => {
    const created = await createFinishedFeed(testInput);

    await deleteFinishedFeed(created.id);

    const feeds = await db.select()
      .from(finishedFeedsTable)
      .where(eq(finishedFeedsTable.id, created.id))
      .execute();

    expect(feeds).toHaveLength(0);
  });

  it('should not affect other feeds', async () => {
    const feed1 = await createFinishedFeed({ name: 'Feed 1' });
    const feed2 = await createFinishedFeed({ name: 'Feed 2' });

    await deleteFinishedFeed(feed1.id);

    const remainingFeeds = await getFinishedFeeds();
    expect(remainingFeeds).toHaveLength(1);
    expect(remainingFeeds[0].id).toEqual(feed2.id);
    expect(remainingFeeds[0].name).toEqual('Feed 2');
  });
});

describe('calculateFeedCost', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return 0 for feed with no compositions', async () => {
    const feed = await createFinishedFeed(testInput);

    const result = await calculateFeedCost(feed.id);

    expect(result).toEqual(0);
  });

  it('should calculate cost based on compositions', async () => {
    // Create raw materials
    const rawMaterial1 = await db.insert(rawFeedMaterialsTable)
      .values({
        name: 'Corn',
        price_per_kg: '2.50'
      })
      .returning()
      .execute();

    const rawMaterial2 = await db.insert(rawFeedMaterialsTable)
      .values({
        name: 'Soybeans',
        price_per_kg: '3.00'
      })
      .returning()
      .execute();

    // Create finished feed
    const feed = await createFinishedFeed(testInput);

    // Create compositions: 60% corn ($2.50) + 40% soybeans ($3.00)
    // Expected cost: (2.50 * 0.6) + (3.00 * 0.4) = 1.50 + 1.20 = 2.70
    await db.insert(feedCompositionsTable)
      .values({
        finished_feed_id: feed.id,
        raw_material_id: rawMaterial1[0].id,
        percentage: '60.00'
      })
      .execute();

    await db.insert(feedCompositionsTable)
      .values({
        finished_feed_id: feed.id,
        raw_material_id: rawMaterial2[0].id,
        percentage: '40.00'
      })
      .execute();

    const result = await calculateFeedCost(feed.id);

    expect(result).toBeCloseTo(2.70, 2);
    expect(typeof result).toBe('number');
  });

  it('should update feed cost_per_kg in database', async () => {
    // Create raw material
    const rawMaterial = await db.insert(rawFeedMaterialsTable)
      .values({
        name: 'Wheat',
        price_per_kg: '2.00'
      })
      .returning()
      .execute();

    // Create finished feed
    const feed = await createFinishedFeed(testInput);

    // Create composition: 100% wheat ($2.00)
    await db.insert(feedCompositionsTable)
      .values({
        finished_feed_id: feed.id,
        raw_material_id: rawMaterial[0].id,
        percentage: '100.00'
      })
      .execute();

    await calculateFeedCost(feed.id);

    // Check database was updated
    const updatedFeed = await getFinishedFeedById(feed.id);
    expect(updatedFeed!.cost_per_kg).toEqual(2.00);
  });

  it('should handle complex compositions with multiple materials', async () => {
    // Create multiple raw materials with different prices
    const materials = await Promise.all([
      db.insert(rawFeedMaterialsTable).values({ name: 'Material 1', price_per_kg: '1.50' }).returning().execute(),
      db.insert(rawFeedMaterialsTable).values({ name: 'Material 2', price_per_kg: '2.75' }).returning().execute(),
      db.insert(rawFeedMaterialsTable).values({ name: 'Material 3', price_per_kg: '3.25' }).returning().execute()
    ]);

    const feed = await createFinishedFeed(testInput);

    // Create compositions: 30% + 45% + 25% = 100%
    // Expected: (1.50 * 0.30) + (2.75 * 0.45) + (3.25 * 0.25)
    // = 0.45 + 1.2375 + 0.8125 = 2.50
    const compositions = [
      { material: materials[0][0], percentage: '30.00' },
      { material: materials[1][0], percentage: '45.00' },
      { material: materials[2][0], percentage: '25.00' }
    ];

    for (const comp of compositions) {
      await db.insert(feedCompositionsTable)
        .values({
          finished_feed_id: feed.id,
          raw_material_id: comp.material.id,
          percentage: comp.percentage
        })
        .execute();
    }

    const result = await calculateFeedCost(feed.id);

    expect(result).toBeCloseTo(2.50, 2);
  });
});