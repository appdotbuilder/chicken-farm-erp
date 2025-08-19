import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { chickenFlocksTable } from '../db/schema';
import { type CreateChickenFlockInput, type UpdateChickenFlockInput } from '../schema';
import { 
  createChickenFlock, 
  getChickenFlocks, 
  getChickenFlockById, 
  updateChickenFlock, 
  deleteChickenFlock 
} from '../handlers/chicken_flocks';
import { eq } from 'drizzle-orm';

// Test input data
const testInput: CreateChickenFlockInput = {
  strain: 'Rhode Island Red',
  entry_date: new Date('2024-01-15'),
  initial_count: 500,
  age_upon_entry_days: 30
};

const testInput2: CreateChickenFlockInput = {
  strain: 'Leghorn White',
  entry_date: new Date('2024-02-01'),
  initial_count: 750,
  age_upon_entry_days: 45
};

describe('Chicken Flock Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('createChickenFlock', () => {
    it('should create a chicken flock', async () => {
      const result = await createChickenFlock(testInput);

      // Basic field validation
      expect(result.strain).toEqual('Rhode Island Red');
      expect(result.entry_date).toEqual(new Date('2024-01-15'));
      expect(result.initial_count).toEqual(500);
      expect(result.age_upon_entry_days).toEqual(30);
      expect(result.current_count).toEqual(500); // Should equal initial_count
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should save chicken flock to database', async () => {
      const result = await createChickenFlock(testInput);

      // Query database directly
      const flocks = await db.select()
        .from(chickenFlocksTable)
        .where(eq(chickenFlocksTable.id, result.id))
        .execute();

      expect(flocks).toHaveLength(1);
      expect(flocks[0].strain).toEqual('Rhode Island Red');
      expect(new Date(flocks[0].entry_date)).toEqual(new Date('2024-01-15'));
      expect(flocks[0].initial_count).toEqual(500);
      expect(flocks[0].age_upon_entry_days).toEqual(30);
      expect(flocks[0].current_count).toEqual(500);
      expect(flocks[0].created_at).toBeInstanceOf(Date);
      expect(flocks[0].updated_at).toBeInstanceOf(Date);
    });

    it('should set current_count equal to initial_count', async () => {
      const result = await createChickenFlock(testInput);
      expect(result.current_count).toEqual(result.initial_count);
    });

    it('should handle different strain types', async () => {
      const leghorn = await createChickenFlock({
        strain: 'White Leghorn',
        entry_date: new Date('2024-03-01'),
        initial_count: 300,
        age_upon_entry_days: 60
      });

      expect(leghorn.strain).toEqual('White Leghorn');
      expect(leghorn.initial_count).toEqual(300);
      expect(leghorn.current_count).toEqual(300);
    });
  });

  describe('getChickenFlocks', () => {
    it('should return empty array when no flocks exist', async () => {
      const result = await getChickenFlocks();
      expect(result).toEqual([]);
    });

    it('should return all chicken flocks', async () => {
      // Create test flocks
      await createChickenFlock(testInput);
      await createChickenFlock(testInput2);

      const results = await getChickenFlocks();

      expect(results).toHaveLength(2);
      
      // Check first flock
      const firstFlock = results.find(f => f.strain === 'Rhode Island Red');
      expect(firstFlock).toBeDefined();
      expect(firstFlock!.initial_count).toEqual(500);
      expect(firstFlock!.entry_date).toEqual(new Date('2024-01-15'));
      expect(firstFlock!.age_upon_entry_days).toEqual(30);

      // Check second flock
      const secondFlock = results.find(f => f.strain === 'Leghorn White');
      expect(secondFlock).toBeDefined();
      expect(secondFlock!.initial_count).toEqual(750);
      expect(secondFlock!.entry_date).toEqual(new Date('2024-02-01'));
      expect(secondFlock!.age_upon_entry_days).toEqual(45);

      // Ensure all date fields are proper Date objects
      results.forEach(flock => {
        expect(flock.entry_date).toBeInstanceOf(Date);
        expect(flock.created_at).toBeInstanceOf(Date);
        expect(flock.updated_at).toBeInstanceOf(Date);
      });
    });
  });

  describe('getChickenFlockById', () => {
    it('should return null for non-existent flock', async () => {
      const result = await getChickenFlockById(999);
      expect(result).toBeNull();
    });

    it('should return specific chicken flock by ID', async () => {
      const created = await createChickenFlock(testInput);
      const result = await getChickenFlockById(created.id);

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(created.id);
      expect(result!.strain).toEqual('Rhode Island Red');
      expect(result!.entry_date).toEqual(new Date('2024-01-15'));
      expect(result!.initial_count).toEqual(500);
      expect(result!.age_upon_entry_days).toEqual(30);
      expect(result!.current_count).toEqual(500);
      expect(result!.entry_date).toBeInstanceOf(Date);
      expect(result!.created_at).toBeInstanceOf(Date);
      expect(result!.updated_at).toBeInstanceOf(Date);
    });

    it('should return correct flock when multiple exist', async () => {
      const flock1 = await createChickenFlock(testInput);
      const flock2 = await createChickenFlock(testInput2);

      const result = await getChickenFlockById(flock2.id);

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(flock2.id);
      expect(result!.strain).toEqual('Leghorn White');
      expect(result!.initial_count).toEqual(750);
    });
  });

  describe('updateChickenFlock', () => {
    it('should update strain only', async () => {
      const created = await createChickenFlock(testInput);
      
      const updateInput: UpdateChickenFlockInput = {
        id: created.id,
        strain: 'Updated Rhode Island Red'
      };

      const result = await updateChickenFlock(updateInput);

      expect(result.id).toEqual(created.id);
      expect(result.strain).toEqual('Updated Rhode Island Red');
      expect(result.entry_date).toEqual(created.entry_date);
      expect(result.initial_count).toEqual(created.initial_count);
      expect(result.age_upon_entry_days).toEqual(created.age_upon_entry_days);
      expect(result.current_count).toEqual(created.current_count);
      expect(result.updated_at.getTime()).toBeGreaterThan(created.updated_at.getTime());
    });

    it('should update current_count', async () => {
      const created = await createChickenFlock(testInput);
      
      const updateInput: UpdateChickenFlockInput = {
        id: created.id,
        current_count: 480 // Some chickens died/were sold
      };

      const result = await updateChickenFlock(updateInput);

      expect(result.current_count).toEqual(480);
      expect(result.initial_count).toEqual(500); // Should remain unchanged
    });

    it('should update multiple fields', async () => {
      const created = await createChickenFlock(testInput);
      
      const updateInput: UpdateChickenFlockInput = {
        id: created.id,
        strain: 'Mixed Breed',
        current_count: 450,
        age_upon_entry_days: 35
      };

      const result = await updateChickenFlock(updateInput);

      expect(result.strain).toEqual('Mixed Breed');
      expect(result.current_count).toEqual(450);
      expect(result.age_upon_entry_days).toEqual(35);
      expect(result.entry_date).toEqual(created.entry_date); // Should remain unchanged
      expect(result.initial_count).toEqual(created.initial_count); // Should remain unchanged
    });

    it('should update entry_date', async () => {
      const created = await createChickenFlock(testInput);
      const newDate = new Date('2024-01-20');
      
      const updateInput: UpdateChickenFlockInput = {
        id: created.id,
        entry_date: newDate
      };

      const result = await updateChickenFlock(updateInput);

      expect(result.entry_date).toEqual(newDate);
      expect(result.entry_date).toBeInstanceOf(Date);
    });

    it('should persist changes to database', async () => {
      const created = await createChickenFlock(testInput);
      
      const updateInput: UpdateChickenFlockInput = {
        id: created.id,
        strain: 'Database Test Strain',
        current_count: 400
      };

      await updateChickenFlock(updateInput);

      // Query database directly
      const flocks = await db.select()
        .from(chickenFlocksTable)
        .where(eq(chickenFlocksTable.id, created.id))
        .execute();

      expect(flocks).toHaveLength(1);
      expect(flocks[0].strain).toEqual('Database Test Strain');
      expect(flocks[0].current_count).toEqual(400);
    });

    it('should throw error for non-existent flock', async () => {
      const updateInput: UpdateChickenFlockInput = {
        id: 999,
        strain: 'Non-existent'
      };

      expect(updateChickenFlock(updateInput)).rejects.toThrow(/not found/i);
    });
  });

  describe('deleteChickenFlock', () => {
    it('should delete existing chicken flock', async () => {
      const created = await createChickenFlock(testInput);

      await deleteChickenFlock(created.id);

      // Verify deletion
      const result = await getChickenFlockById(created.id);
      expect(result).toBeNull();
    });

    it('should remove flock from database', async () => {
      const created = await createChickenFlock(testInput);

      await deleteChickenFlock(created.id);

      // Query database directly
      const flocks = await db.select()
        .from(chickenFlocksTable)
        .where(eq(chickenFlocksTable.id, created.id))
        .execute();

      expect(flocks).toHaveLength(0);
    });

    it('should throw error for non-existent flock', async () => {
      expect(deleteChickenFlock(999)).rejects.toThrow(/not found/i);
    });

    it('should not affect other flocks', async () => {
      const flock1 = await createChickenFlock(testInput);
      const flock2 = await createChickenFlock(testInput2);

      await deleteChickenFlock(flock1.id);

      // Verify flock2 still exists
      const remaining = await getChickenFlockById(flock2.id);
      expect(remaining).not.toBeNull();
      expect(remaining!.strain).toEqual('Leghorn White');
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero age upon entry', async () => {
      const input: CreateChickenFlockInput = {
        strain: 'Day-old Chicks',
        entry_date: new Date('2024-01-01'),
        initial_count: 1000,
        age_upon_entry_days: 0
      };

      const result = await createChickenFlock(input);
      expect(result.age_upon_entry_days).toEqual(0);
    });

    it('should handle large flock sizes', async () => {
      const input: CreateChickenFlockInput = {
        strain: 'Large Commercial',
        entry_date: new Date('2024-01-01'),
        initial_count: 50000,
        age_upon_entry_days: 1
      };

      const result = await createChickenFlock(input);
      expect(result.initial_count).toEqual(50000);
      expect(result.current_count).toEqual(50000);
    });

    it('should handle current_count being zero (all chickens gone)', async () => {
      const created = await createChickenFlock(testInput);
      
      const updateInput: UpdateChickenFlockInput = {
        id: created.id,
        current_count: 0
      };

      const result = await updateChickenFlock(updateInput);
      expect(result.current_count).toEqual(0);
    });
  });
});