import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { eggProductionsTable, chickenFlocksTable } from '../db/schema';
import { type CreateEggProductionInput, type UpdateEggProductionInput } from '../schema';
import { 
  createEggProduction, 
  getEggProductions, 
  getEggProductionsByFlockId, 
  getEggProductionById, 
  updateEggProduction, 
  deleteEggProduction,
  getEggProductionsByDateRange 
} from '../handlers/egg_productions';
import { eq } from 'drizzle-orm';

// Test data
const testFlockData = {
  strain: 'Rhode Island Red',
  entry_date: '2024-01-01', // Use string format for date column
  initial_count: 100,
  age_upon_entry_days: 30,
  current_count: 100
};

const testEggProductionInput: CreateEggProductionInput = {
  flock_id: 1, // Will be set dynamically after creating flock
  production_date: new Date('2024-01-15'),
  quality: 'A' as const,
  quantity: 85
};

const testEggProductionInput2: CreateEggProductionInput = {
  flock_id: 1, // Will be set dynamically after creating flock
  production_date: new Date('2024-01-16'),
  quality: 'B' as const,
  quantity: 75
};

describe('Egg Productions Handlers', () => {
  let testFlockId: number;

  beforeEach(async () => {
    await createDB();
    
    // Create a test flock first
    const flockResult = await db.insert(chickenFlocksTable)
      .values(testFlockData)
      .returning()
      .execute();
    
    testFlockId = flockResult[0].id;
    
    // Update test inputs with actual flock ID
    testEggProductionInput.flock_id = testFlockId;
    testEggProductionInput2.flock_id = testFlockId;
  });

  afterEach(resetDB);

  describe('createEggProduction', () => {
    it('should create an egg production record', async () => {
      const result = await createEggProduction(testEggProductionInput);

      expect(result.flock_id).toEqual(testFlockId);
      expect(result.production_date).toEqual(testEggProductionInput.production_date);
      expect(result.quality).toEqual('A');
      expect(result.quantity).toEqual(85);
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should save egg production to database', async () => {
      const result = await createEggProduction(testEggProductionInput);

      const eggProductions = await db.select()
        .from(eggProductionsTable)
        .where(eq(eggProductionsTable.id, result.id))
        .execute();

      expect(eggProductions).toHaveLength(1);
      expect(eggProductions[0].flock_id).toEqual(testFlockId);
      expect(new Date(eggProductions[0].production_date)).toEqual(testEggProductionInput.production_date);
      expect(eggProductions[0].quality).toEqual('A');
      expect(eggProductions[0].quantity).toEqual(85);
      expect(eggProductions[0].created_at).toBeInstanceOf(Date);
    });

    it('should handle different egg qualities', async () => {
      const crackedEggInput = {
        ...testEggProductionInput,
        quality: 'cracked' as const,
        quantity: 10
      };

      const result = await createEggProduction(crackedEggInput);

      expect(result.quality).toEqual('cracked');
      expect(result.quantity).toEqual(10);
    });

    it('should throw error for non-existent flock', async () => {
      const invalidInput = {
        ...testEggProductionInput,
        flock_id: 999
      };

      expect(createEggProduction(invalidInput)).rejects.toThrow(/flock.*does not exist/i);
    });
  });

  describe('getEggProductions', () => {
    it('should return empty array when no egg productions exist', async () => {
      const result = await getEggProductions();
      expect(result).toEqual([]);
    });

    it('should return all egg productions', async () => {
      await createEggProduction(testEggProductionInput);
      await createEggProduction(testEggProductionInput2);

      const result = await getEggProductions();

      expect(result).toHaveLength(2);
      expect(result[0].quality).toEqual('B'); // Most recent first (desc order)
      expect(result[1].quality).toEqual('A');
    });

    it('should return egg productions in descending date order', async () => {
      const olderProduction = {
        ...testEggProductionInput,
        production_date: new Date('2024-01-10')
      };
      const newerProduction = {
        ...testEggProductionInput,
        production_date: new Date('2024-01-20')
      };

      await createEggProduction(olderProduction);
      await createEggProduction(newerProduction);

      const result = await getEggProductions();

      expect(result).toHaveLength(2);
      expect(result[0].production_date >= result[1].production_date).toBe(true);
    });
  });

  describe('getEggProductionsByFlockId', () => {
    it('should return empty array for non-existent flock', async () => {
      const result = await getEggProductionsByFlockId(999);
      expect(result).toEqual([]);
    });

    it('should return egg productions for specific flock', async () => {
      // Create second flock
      const secondFlockResult = await db.insert(chickenFlocksTable)
        .values({
          ...testFlockData,
          strain: 'White Leghorn'
        })
        .returning()
        .execute();

      const secondFlockId = secondFlockResult[0].id;

      // Create productions for both flocks
      await createEggProduction(testEggProductionInput);
      await createEggProduction({
        ...testEggProductionInput2,
        flock_id: secondFlockId
      });

      const firstFlockProductions = await getEggProductionsByFlockId(testFlockId);
      const secondFlockProductions = await getEggProductionsByFlockId(secondFlockId);

      expect(firstFlockProductions).toHaveLength(1);
      expect(firstFlockProductions[0].flock_id).toEqual(testFlockId);

      expect(secondFlockProductions).toHaveLength(1);
      expect(secondFlockProductions[0].flock_id).toEqual(secondFlockId);
    });
  });

  describe('getEggProductionById', () => {
    it('should return null for non-existent ID', async () => {
      const result = await getEggProductionById(999);
      expect(result).toBeNull();
    });

    it('should return egg production by ID', async () => {
      const created = await createEggProduction(testEggProductionInput);
      const result = await getEggProductionById(created.id);

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(created.id);
      expect(result!.flock_id).toEqual(testFlockId);
      expect(result!.quality).toEqual('A');
      expect(result!.quantity).toEqual(85);
    });
  });

  describe('updateEggProduction', () => {
    it('should update egg production record', async () => {
      const created = await createEggProduction(testEggProductionInput);
      
      const updateInput: UpdateEggProductionInput = {
        id: created.id,
        quality: 'B',
        quantity: 80
      };

      const result = await updateEggProduction(updateInput);

      expect(result.id).toEqual(created.id);
      expect(result.quality).toEqual('B');
      expect(result.quantity).toEqual(80);
      expect(result.flock_id).toEqual(testFlockId); // Should remain unchanged
    });

    it('should update only provided fields', async () => {
      const created = await createEggProduction(testEggProductionInput);
      
      const updateInput: UpdateEggProductionInput = {
        id: created.id,
        quantity: 90
      };

      const result = await updateEggProduction(updateInput);

      expect(result.quantity).toEqual(90);
      expect(result.quality).toEqual('A'); // Should remain unchanged
      expect(result.production_date).toEqual(testEggProductionInput.production_date); // Should remain unchanged
    });

    it('should update flock_id when provided', async () => {
      // Create second flock
      const secondFlockResult = await db.insert(chickenFlocksTable)
        .values({
          ...testFlockData,
          strain: 'White Leghorn'
        })
        .returning()
        .execute();

      const secondFlockId = secondFlockResult[0].id;

      const created = await createEggProduction(testEggProductionInput);
      
      const updateInput: UpdateEggProductionInput = {
        id: created.id,
        flock_id: secondFlockId
      };

      const result = await updateEggProduction(updateInput);

      expect(result.flock_id).toEqual(secondFlockId);
    });

    it('should throw error for non-existent egg production', async () => {
      const updateInput: UpdateEggProductionInput = {
        id: 999,
        quantity: 100
      };

      expect(updateEggProduction(updateInput)).rejects.toThrow(/egg production.*does not exist/i);
    });

    it('should throw error when updating to non-existent flock', async () => {
      const created = await createEggProduction(testEggProductionInput);
      
      const updateInput: UpdateEggProductionInput = {
        id: created.id,
        flock_id: 999
      };

      expect(updateEggProduction(updateInput)).rejects.toThrow(/flock.*does not exist/i);
    });
  });

  describe('deleteEggProduction', () => {
    it('should delete egg production record', async () => {
      const created = await createEggProduction(testEggProductionInput);
      
      await deleteEggProduction(created.id);

      const result = await getEggProductionById(created.id);
      expect(result).toBeNull();
    });

    it('should throw error for non-existent egg production', async () => {
      expect(deleteEggProduction(999)).rejects.toThrow(/egg production.*does not exist/i);
    });

    it('should verify deletion from database', async () => {
      const created = await createEggProduction(testEggProductionInput);
      
      // Verify it exists
      let eggProductions = await db.select()
        .from(eggProductionsTable)
        .where(eq(eggProductionsTable.id, created.id))
        .execute();
      expect(eggProductions).toHaveLength(1);

      // Delete it
      await deleteEggProduction(created.id);

      // Verify it's gone
      eggProductions = await db.select()
        .from(eggProductionsTable)
        .where(eq(eggProductionsTable.id, created.id))
        .execute();
      expect(eggProductions).toHaveLength(0);
    });
  });

  describe('getEggProductionsByDateRange', () => {
    it('should return empty array for date range with no productions', async () => {
      const startDate = new Date('2024-02-01');
      const endDate = new Date('2024-02-28');

      const result = await getEggProductionsByDateRange(startDate, endDate);
      expect(result).toEqual([]);
    });

    it('should return egg productions within date range', async () => {
      // Create productions with different dates
      const earlyProduction = {
        ...testEggProductionInput,
        production_date: new Date('2024-01-10')
      };
      const midProduction = {
        ...testEggProductionInput,
        production_date: new Date('2024-01-15')
      };
      const lateProduction = {
        ...testEggProductionInput,
        production_date: new Date('2024-01-20')
      };

      await createEggProduction(earlyProduction);
      await createEggProduction(midProduction);
      await createEggProduction(lateProduction);

      // Query for middle range
      const startDate = new Date('2024-01-12');
      const endDate = new Date('2024-01-18');

      const result = await getEggProductionsByDateRange(startDate, endDate);

      expect(result).toHaveLength(1);
      expect(result[0].production_date).toEqual(midProduction.production_date);
    });

    it('should include productions on boundary dates', async () => {
      const startDate = new Date('2024-01-15');
      const endDate = new Date('2024-01-16');

      await createEggProduction(testEggProductionInput); // 2024-01-15
      await createEggProduction(testEggProductionInput2); // 2024-01-16

      const result = await getEggProductionsByDateRange(startDate, endDate);

      expect(result).toHaveLength(2);
      expect(result.every(p => 
        p.production_date >= startDate && p.production_date <= endDate
      )).toBe(true);
    });

    it('should return results in descending date order', async () => {
      const olderProduction = {
        ...testEggProductionInput,
        production_date: new Date('2024-01-10')
      };
      const newerProduction = {
        ...testEggProductionInput,
        production_date: new Date('2024-01-20')
      };

      await createEggProduction(olderProduction);
      await createEggProduction(newerProduction);

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const result = await getEggProductionsByDateRange(startDate, endDate);

      expect(result).toHaveLength(2);
      expect(result[0].production_date.getTime() >= result[1].production_date.getTime()).toBe(true);
    });
  });
});