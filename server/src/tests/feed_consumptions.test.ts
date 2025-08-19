import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { feedConsumptionsTable, finishedFeedsTable, chickenFlocksTable } from '../db/schema';
import { type CreateFeedConsumptionInput, type UpdateFeedConsumptionInput } from '../schema';
import {
  createFeedConsumption,
  getFeedConsumptions,
  getFeedConsumptionsByFlockId,
  getFeedConsumptionById,
  updateFeedConsumption,
  deleteFeedConsumption,
  getTotalFeedCostByDateRange
} from '../handlers/feed_consumptions';
import { eq } from 'drizzle-orm';

// Test data
const testFlock = {
  strain: 'Test Strain',
  entry_date: '2024-01-01', // Store as string for database
  initial_count: 100,
  age_upon_entry_days: 30,
  current_count: 100
};

const testFinishedFeed = {
  name: 'Test Feed',
  cost_per_kg: '5.50'
};

const testInput: CreateFeedConsumptionInput = {
  flock_id: 1,
  finished_feed_id: 1,
  consumption_date: new Date('2024-01-15'),
  quantity_kg: 25.5
};

describe('Feed Consumption Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('createFeedConsumption', () => {
    it('should create a feed consumption record', async () => {
      // Create prerequisite data
      const flockResult = await db.insert(chickenFlocksTable)
        .values(testFlock)
        .returning()
        .execute();

      const feedResult = await db.insert(finishedFeedsTable)
        .values(testFinishedFeed)
        .returning()
        .execute();

      const input = {
        ...testInput,
        flock_id: flockResult[0].id,
        finished_feed_id: feedResult[0].id
      };

      const result = await createFeedConsumption(input);

      expect(result.flock_id).toEqual(flockResult[0].id);
      expect(result.finished_feed_id).toEqual(feedResult[0].id);
      expect(result.consumption_date).toEqual(input.consumption_date);
      expect(result.quantity_kg).toEqual(25.5);
      expect(typeof result.quantity_kg).toBe('number');
      expect(result.cost).toEqual(140.25); // 25.5 * 5.50
      expect(typeof result.cost).toBe('number');
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should save feed consumption to database', async () => {
      // Create prerequisite data
      const flockResult = await db.insert(chickenFlocksTable)
        .values(testFlock)
        .returning()
        .execute();

      const feedResult = await db.insert(finishedFeedsTable)
        .values(testFinishedFeed)
        .returning()
        .execute();

      const input = {
        ...testInput,
        flock_id: flockResult[0].id,
        finished_feed_id: feedResult[0].id
      };

      const result = await createFeedConsumption(input);

      const consumptions = await db.select()
        .from(feedConsumptionsTable)
        .where(eq(feedConsumptionsTable.id, result.id))
        .execute();

      expect(consumptions).toHaveLength(1);
      expect(consumptions[0].flock_id).toEqual(flockResult[0].id);
      expect(consumptions[0].finished_feed_id).toEqual(feedResult[0].id);
      expect(parseFloat(consumptions[0].quantity_kg)).toEqual(25.5);
      expect(parseFloat(consumptions[0].cost)).toEqual(140.25);
    });

    it('should throw error for non-existent flock', async () => {
      const feedResult = await db.insert(finishedFeedsTable)
        .values(testFinishedFeed)
        .returning()
        .execute();

      const input = {
        ...testInput,
        flock_id: 999, // Non-existent flock
        finished_feed_id: feedResult[0].id
      };

      await expect(createFeedConsumption(input)).rejects.toThrow(/Flock with ID 999 not found/i);
    });

    it('should throw error for non-existent finished feed', async () => {
      const flockResult = await db.insert(chickenFlocksTable)
        .values(testFlock)
        .returning()
        .execute();

      const input = {
        ...testInput,
        flock_id: flockResult[0].id,
        finished_feed_id: 999 // Non-existent feed
      };

      await expect(createFeedConsumption(input)).rejects.toThrow(/Finished feed with ID 999 not found/i);
    });
  });

  describe('getFeedConsumptions', () => {
    it('should return all feed consumption records', async () => {
      // Create prerequisite data
      const flockResult = await db.insert(chickenFlocksTable)
        .values(testFlock)
        .returning()
        .execute();

      const feedResult = await db.insert(finishedFeedsTable)
        .values(testFinishedFeed)
        .returning()
        .execute();

      // Create multiple feed consumption records
      await createFeedConsumption({
        flock_id: flockResult[0].id,
        finished_feed_id: feedResult[0].id,
        consumption_date: new Date('2024-01-15'),
        quantity_kg: 25.5
      });

      await createFeedConsumption({
        flock_id: flockResult[0].id,
        finished_feed_id: feedResult[0].id,
        consumption_date: new Date('2024-01-16'),
        quantity_kg: 30.0
      });

      const results = await getFeedConsumptions();

      expect(results).toHaveLength(2);
      expect(results[0].quantity_kg).toEqual(25.5);
      expect(results[1].quantity_kg).toEqual(30.0);
      expect(typeof results[0].quantity_kg).toBe('number');
      expect(typeof results[0].cost).toBe('number');
    });

    it('should return empty array when no records exist', async () => {
      const results = await getFeedConsumptions();
      expect(results).toHaveLength(0);
    });
  });

  describe('getFeedConsumptionsByFlockId', () => {
    it('should return feed consumption records for specific flock', async () => {
      // Create prerequisite data - two flocks
      const flock1Result = await db.insert(chickenFlocksTable)
        .values({ ...testFlock, strain: 'Flock 1' })
        .returning()
        .execute();

      const flock2Result = await db.insert(chickenFlocksTable)
        .values({ ...testFlock, strain: 'Flock 2' })
        .returning()
        .execute();

      const feedResult = await db.insert(finishedFeedsTable)
        .values(testFinishedFeed)
        .returning()
        .execute();

      // Create consumption records for both flocks
      await createFeedConsumption({
        flock_id: flock1Result[0].id,
        finished_feed_id: feedResult[0].id,
        consumption_date: new Date('2024-01-15'),
        quantity_kg: 25.5
      });

      await createFeedConsumption({
        flock_id: flock2Result[0].id,
        finished_feed_id: feedResult[0].id,
        consumption_date: new Date('2024-01-16'),
        quantity_kg: 30.0
      });

      const results = await getFeedConsumptionsByFlockId(flock1Result[0].id);

      expect(results).toHaveLength(1);
      expect(results[0].flock_id).toEqual(flock1Result[0].id);
      expect(results[0].quantity_kg).toEqual(25.5);
    });

    it('should return empty array for flock with no consumptions', async () => {
      const results = await getFeedConsumptionsByFlockId(999);
      expect(results).toHaveLength(0);
    });
  });

  describe('getFeedConsumptionById', () => {
    it('should return feed consumption record by ID', async () => {
      // Create prerequisite data
      const flockResult = await db.insert(chickenFlocksTable)
        .values(testFlock)
        .returning()
        .execute();

      const feedResult = await db.insert(finishedFeedsTable)
        .values(testFinishedFeed)
        .returning()
        .execute();

      const created = await createFeedConsumption({
        flock_id: flockResult[0].id,
        finished_feed_id: feedResult[0].id,
        consumption_date: new Date('2024-01-15'),
        quantity_kg: 25.5
      });

      const result = await getFeedConsumptionById(created.id);

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(created.id);
      expect(result!.quantity_kg).toEqual(25.5);
      expect(typeof result!.quantity_kg).toBe('number');
      expect(typeof result!.cost).toBe('number');
    });

    it('should return null for non-existent ID', async () => {
      const result = await getFeedConsumptionById(999);
      expect(result).toBeNull();
    });
  });

  describe('updateFeedConsumption', () => {
    it('should update feed consumption record', async () => {
      // Create prerequisite data
      const flockResult = await db.insert(chickenFlocksTable)
        .values(testFlock)
        .returning()
        .execute();

      const feedResult = await db.insert(finishedFeedsTable)
        .values(testFinishedFeed)
        .returning()
        .execute();

      const created = await createFeedConsumption({
        flock_id: flockResult[0].id,
        finished_feed_id: feedResult[0].id,
        consumption_date: new Date('2024-01-15'),
        quantity_kg: 25.5
      });

      const updateInput: UpdateFeedConsumptionInput = {
        id: created.id,
        quantity_kg: 35.0,
        consumption_date: new Date('2024-01-20')
      };

      const result = await updateFeedConsumption(updateInput);

      expect(result.id).toEqual(created.id);
      expect(result.quantity_kg).toEqual(35.0);
      expect(result.consumption_date).toEqual(new Date('2024-01-20'));
      expect(result.cost).toEqual(192.5); // 35.0 * 5.50 (recalculated)
      expect(typeof result.quantity_kg).toBe('number');
      expect(typeof result.cost).toBe('number');
    });

    it('should recalculate cost when finished feed changes', async () => {
      // Create prerequisite data
      const flockResult = await db.insert(chickenFlocksTable)
        .values(testFlock)
        .returning()
        .execute();

      const feed1Result = await db.insert(finishedFeedsTable)
        .values({ name: 'Feed 1', cost_per_kg: '5.00' })
        .returning()
        .execute();

      const feed2Result = await db.insert(finishedFeedsTable)
        .values({ name: 'Feed 2', cost_per_kg: '7.00' })
        .returning()
        .execute();

      const created = await createFeedConsumption({
        flock_id: flockResult[0].id,
        finished_feed_id: feed1Result[0].id,
        consumption_date: new Date('2024-01-15'),
        quantity_kg: 10.0
      });

      const updateInput: UpdateFeedConsumptionInput = {
        id: created.id,
        finished_feed_id: feed2Result[0].id
      };

      const result = await updateFeedConsumption(updateInput);

      expect(result.finished_feed_id).toEqual(feed2Result[0].id);
      expect(result.cost).toEqual(70.0); // 10.0 * 7.00 (recalculated)
    });

    it('should throw error for non-existent feed consumption', async () => {
      const updateInput: UpdateFeedConsumptionInput = {
        id: 999,
        quantity_kg: 35.0
      };

      await expect(updateFeedConsumption(updateInput)).rejects.toThrow(/Feed consumption with ID 999 not found/i);
    });

    it('should throw error for non-existent flock when updating flock_id', async () => {
      // Create prerequisite data
      const flockResult = await db.insert(chickenFlocksTable)
        .values(testFlock)
        .returning()
        .execute();

      const feedResult = await db.insert(finishedFeedsTable)
        .values(testFinishedFeed)
        .returning()
        .execute();

      const created = await createFeedConsumption({
        flock_id: flockResult[0].id,
        finished_feed_id: feedResult[0].id,
        consumption_date: new Date('2024-01-15'),
        quantity_kg: 25.5
      });

      const updateInput: UpdateFeedConsumptionInput = {
        id: created.id,
        flock_id: 999 // Non-existent flock
      };

      await expect(updateFeedConsumption(updateInput)).rejects.toThrow(/Flock with ID 999 not found/i);
    });
  });

  describe('deleteFeedConsumption', () => {
    it('should delete feed consumption record', async () => {
      // Create prerequisite data
      const flockResult = await db.insert(chickenFlocksTable)
        .values(testFlock)
        .returning()
        .execute();

      const feedResult = await db.insert(finishedFeedsTable)
        .values(testFinishedFeed)
        .returning()
        .execute();

      const created = await createFeedConsumption({
        flock_id: flockResult[0].id,
        finished_feed_id: feedResult[0].id,
        consumption_date: new Date('2024-01-15'),
        quantity_kg: 25.5
      });

      await deleteFeedConsumption(created.id);

      const result = await getFeedConsumptionById(created.id);
      expect(result).toBeNull();
    });

    it('should throw error for non-existent feed consumption', async () => {
      await expect(deleteFeedConsumption(999)).rejects.toThrow(/Feed consumption with ID 999 not found/i);
    });
  });

  describe('getTotalFeedCostByDateRange', () => {
    it('should calculate total feed cost within date range', async () => {
      // Create prerequisite data
      const flockResult = await db.insert(chickenFlocksTable)
        .values(testFlock)
        .returning()
        .execute();

      const feedResult = await db.insert(finishedFeedsTable)
        .values(testFinishedFeed)
        .returning()
        .execute();

      // Create consumption records with different dates
      await createFeedConsumption({
        flock_id: flockResult[0].id,
        finished_feed_id: feedResult[0].id,
        consumption_date: new Date('2024-01-15'),
        quantity_kg: 10.0 // Cost: 55.00
      });

      await createFeedConsumption({
        flock_id: flockResult[0].id,
        finished_feed_id: feedResult[0].id,
        consumption_date: new Date('2024-01-20'),
        quantity_kg: 15.0 // Cost: 82.50
      });

      await createFeedConsumption({
        flock_id: flockResult[0].id,
        finished_feed_id: feedResult[0].id,
        consumption_date: new Date('2024-02-05'),
        quantity_kg: 20.0 // Cost: 110.00 (outside range)
      });

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const totalCost = await getTotalFeedCostByDateRange(startDate, endDate);

      expect(totalCost).toEqual(137.5); // 55.00 + 82.50
      expect(typeof totalCost).toBe('number');
    });

    it('should return 0 when no records exist in date range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const totalCost = await getTotalFeedCostByDateRange(startDate, endDate);

      expect(totalCost).toEqual(0);
    });

    it('should handle single day range correctly', async () => {
      // Create prerequisite data
      const flockResult = await db.insert(chickenFlocksTable)
        .values(testFlock)
        .returning()
        .execute();

      const feedResult = await db.insert(finishedFeedsTable)
        .values(testFinishedFeed)
        .returning()
        .execute();

      await createFeedConsumption({
        flock_id: flockResult[0].id,
        finished_feed_id: feedResult[0].id,
        consumption_date: new Date('2024-01-15'),
        quantity_kg: 10.0 // Cost: 55.00
      });

      const targetDate = new Date('2024-01-15');

      const totalCost = await getTotalFeedCostByDateRange(targetDate, targetDate);

      expect(totalCost).toEqual(55.0);
    });
  });
});