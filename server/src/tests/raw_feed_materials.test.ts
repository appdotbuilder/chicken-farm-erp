import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { rawFeedMaterialsTable } from '../db/schema';
import { type CreateRawFeedMaterialInput, type UpdateRawFeedMaterialInput } from '../schema';
import {
  createRawFeedMaterial,
  getRawFeedMaterials,
  getRawFeedMaterialById,
  updateRawFeedMaterial,
  deleteRawFeedMaterial
} from '../handlers/raw_feed_materials';
import { eq } from 'drizzle-orm';

// Test input data
const testMaterialInput: CreateRawFeedMaterialInput = {
  name: 'Corn Meal',
  price_per_kg: 2.50
};

const secondMaterialInput: CreateRawFeedMaterialInput = {
  name: 'Soybean Meal',
  price_per_kg: 3.75
};

describe('Raw Feed Materials Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('createRawFeedMaterial', () => {
    it('should create a raw feed material', async () => {
      const result = await createRawFeedMaterial(testMaterialInput);

      // Basic field validation
      expect(result.name).toEqual('Corn Meal');
      expect(result.price_per_kg).toEqual(2.50);
      expect(typeof result.price_per_kg).toEqual('number');
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should save raw feed material to database', async () => {
      const result = await createRawFeedMaterial(testMaterialInput);

      // Verify data was saved to database
      const materials = await db.select()
        .from(rawFeedMaterialsTable)
        .where(eq(rawFeedMaterialsTable.id, result.id))
        .execute();

      expect(materials).toHaveLength(1);
      expect(materials[0].name).toEqual('Corn Meal');
      expect(parseFloat(materials[0].price_per_kg)).toEqual(2.50);
      expect(materials[0].created_at).toBeInstanceOf(Date);
      expect(materials[0].updated_at).toBeInstanceOf(Date);
    });

    it('should handle decimal prices correctly', async () => {
      const preciseInput: CreateRawFeedMaterialInput = {
        name: 'Premium Feed',
        price_per_kg: 5.99
      };

      const result = await createRawFeedMaterial(preciseInput);
      expect(result.price_per_kg).toEqual(5.99);
      expect(typeof result.price_per_kg).toEqual('number');
    });
  });

  describe('getRawFeedMaterials', () => {
    it('should return empty array when no materials exist', async () => {
      const result = await getRawFeedMaterials();
      expect(result).toEqual([]);
    });

    it('should return all raw feed materials', async () => {
      // Create test materials
      await createRawFeedMaterial(testMaterialInput);
      await createRawFeedMaterial(secondMaterialInput);

      const result = await getRawFeedMaterials();

      expect(result).toHaveLength(2);
      expect(result[0].name).toEqual('Corn Meal');
      expect(result[0].price_per_kg).toEqual(2.50);
      expect(typeof result[0].price_per_kg).toEqual('number');
      expect(result[1].name).toEqual('Soybean Meal');
      expect(result[1].price_per_kg).toEqual(3.75);
      expect(typeof result[1].price_per_kg).toEqual('number');
    });

    it('should return materials with correct data types', async () => {
      await createRawFeedMaterial(testMaterialInput);
      const result = await getRawFeedMaterials();

      expect(result).toHaveLength(1);
      const material = result[0];
      expect(typeof material.id).toEqual('number');
      expect(typeof material.name).toEqual('string');
      expect(typeof material.price_per_kg).toEqual('number');
      expect(material.created_at).toBeInstanceOf(Date);
      expect(material.updated_at).toBeInstanceOf(Date);
    });
  });

  describe('getRawFeedMaterialById', () => {
    it('should return null for non-existent material', async () => {
      const result = await getRawFeedMaterialById(999);
      expect(result).toBeNull();
    });

    it('should return material by ID', async () => {
      const created = await createRawFeedMaterial(testMaterialInput);
      const result = await getRawFeedMaterialById(created.id);

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(created.id);
      expect(result!.name).toEqual('Corn Meal');
      expect(result!.price_per_kg).toEqual(2.50);
      expect(typeof result!.price_per_kg).toEqual('number');
    });

    it('should return material with correct data types', async () => {
      const created = await createRawFeedMaterial(testMaterialInput);
      const result = await getRawFeedMaterialById(created.id);

      expect(result).not.toBeNull();
      expect(typeof result!.id).toEqual('number');
      expect(typeof result!.name).toEqual('string');
      expect(typeof result!.price_per_kg).toEqual('number');
      expect(result!.created_at).toBeInstanceOf(Date);
      expect(result!.updated_at).toBeInstanceOf(Date);
    });
  });

  describe('updateRawFeedMaterial', () => {
    it('should update material name only', async () => {
      const created = await createRawFeedMaterial(testMaterialInput);
      
      const updateInput: UpdateRawFeedMaterialInput = {
        id: created.id,
        name: 'Updated Corn Meal'
      };

      const result = await updateRawFeedMaterial(updateInput);

      expect(result.id).toEqual(created.id);
      expect(result.name).toEqual('Updated Corn Meal');
      expect(result.price_per_kg).toEqual(2.50); // Should remain unchanged
      expect(typeof result.price_per_kg).toEqual('number');
      expect(result.updated_at > created.updated_at).toBe(true);
    });

    it('should update material price only', async () => {
      const created = await createRawFeedMaterial(testMaterialInput);
      
      const updateInput: UpdateRawFeedMaterialInput = {
        id: created.id,
        price_per_kg: 3.25
      };

      const result = await updateRawFeedMaterial(updateInput);

      expect(result.id).toEqual(created.id);
      expect(result.name).toEqual('Corn Meal'); // Should remain unchanged
      expect(result.price_per_kg).toEqual(3.25);
      expect(typeof result.price_per_kg).toEqual('number');
    });

    it('should update both name and price', async () => {
      const created = await createRawFeedMaterial(testMaterialInput);
      
      const updateInput: UpdateRawFeedMaterialInput = {
        id: created.id,
        name: 'Premium Corn Meal',
        price_per_kg: 4.50
      };

      const result = await updateRawFeedMaterial(updateInput);

      expect(result.id).toEqual(created.id);
      expect(result.name).toEqual('Premium Corn Meal');
      expect(result.price_per_kg).toEqual(4.50);
      expect(typeof result.price_per_kg).toEqual('number');
    });

    it('should persist updates to database', async () => {
      const created = await createRawFeedMaterial(testMaterialInput);
      
      const updateInput: UpdateRawFeedMaterialInput = {
        id: created.id,
        name: 'Database Updated Material',
        price_per_kg: 5.75
      };

      await updateRawFeedMaterial(updateInput);

      // Verify changes persisted
      const materials = await db.select()
        .from(rawFeedMaterialsTable)
        .where(eq(rawFeedMaterialsTable.id, created.id))
        .execute();

      expect(materials).toHaveLength(1);
      expect(materials[0].name).toEqual('Database Updated Material');
      expect(parseFloat(materials[0].price_per_kg)).toEqual(5.75);
    });

    it('should throw error for non-existent material', async () => {
      const updateInput: UpdateRawFeedMaterialInput = {
        id: 999,
        name: 'Non-existent Material'
      };

      await expect(updateRawFeedMaterial(updateInput)).rejects.toThrow(/not found/i);
    });
  });

  describe('deleteRawFeedMaterial', () => {
    it('should delete existing material', async () => {
      const created = await createRawFeedMaterial(testMaterialInput);
      
      await deleteRawFeedMaterial(created.id);

      // Verify material was deleted
      const result = await getRawFeedMaterialById(created.id);
      expect(result).toBeNull();
    });

    it('should remove material from database', async () => {
      const created = await createRawFeedMaterial(testMaterialInput);
      
      await deleteRawFeedMaterial(created.id);

      // Verify deletion in database
      const materials = await db.select()
        .from(rawFeedMaterialsTable)
        .where(eq(rawFeedMaterialsTable.id, created.id))
        .execute();

      expect(materials).toHaveLength(0);
    });

    it('should throw error for non-existent material', async () => {
      await expect(deleteRawFeedMaterial(999)).rejects.toThrow(/not found/i);
    });

    it('should not affect other materials', async () => {
      const material1 = await createRawFeedMaterial(testMaterialInput);
      const material2 = await createRawFeedMaterial(secondMaterialInput);

      await deleteRawFeedMaterial(material1.id);

      // Verify other material still exists
      const remaining = await getRawFeedMaterialById(material2.id);
      expect(remaining).not.toBeNull();
      expect(remaining!.name).toEqual('Soybean Meal');

      // Verify only one material remains in total
      const allMaterials = await getRawFeedMaterials();
      expect(allMaterials).toHaveLength(1);
    });
  });
});