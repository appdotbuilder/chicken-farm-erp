import { db } from '../db';
import { rawFeedMaterialsTable } from '../db/schema';
import { type CreateRawFeedMaterialInput, type UpdateRawFeedMaterialInput, type RawFeedMaterial } from '../schema';
import { eq } from 'drizzle-orm';

export async function createRawFeedMaterial(input: CreateRawFeedMaterialInput): Promise<RawFeedMaterial> {
  try {
    // Insert raw feed material record
    const result = await db.insert(rawFeedMaterialsTable)
      .values({
        name: input.name,
        price_per_kg: input.price_per_kg.toString(), // Convert number to string for numeric column
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const material = result[0];
    return {
      ...material,
      price_per_kg: parseFloat(material.price_per_kg) // Convert string back to number
    };
  } catch (error) {
    console.error('Raw feed material creation failed:', error);
    throw error;
  }
}

export async function getRawFeedMaterials(): Promise<RawFeedMaterial[]> {
  try {
    const results = await db.select()
      .from(rawFeedMaterialsTable)
      .execute();

    // Convert numeric fields back to numbers
    return results.map(material => ({
      ...material,
      price_per_kg: parseFloat(material.price_per_kg)
    }));
  } catch (error) {
    console.error('Failed to fetch raw feed materials:', error);
    throw error;
  }
}

export async function getRawFeedMaterialById(id: number): Promise<RawFeedMaterial | null> {
  try {
    const results = await db.select()
      .from(rawFeedMaterialsTable)
      .where(eq(rawFeedMaterialsTable.id, id))
      .execute();

    if (results.length === 0) {
      return null;
    }

    // Convert numeric fields back to numbers
    const material = results[0];
    return {
      ...material,
      price_per_kg: parseFloat(material.price_per_kg)
    };
  } catch (error) {
    console.error('Failed to fetch raw feed material by ID:', error);
    throw error;
  }
}

export async function updateRawFeedMaterial(input: UpdateRawFeedMaterialInput): Promise<RawFeedMaterial> {
  try {
    // Build update values, converting numeric fields to strings
    const updateValues: any = {};
    if (input.name !== undefined) {
      updateValues.name = input.name;
    }
    if (input.price_per_kg !== undefined) {
      updateValues.price_per_kg = input.price_per_kg.toString();
    }
    
    // Add updated_at timestamp
    updateValues.updated_at = new Date();

    const result = await db.update(rawFeedMaterialsTable)
      .set(updateValues)
      .where(eq(rawFeedMaterialsTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Raw feed material with id ${input.id} not found`);
    }

    // Convert numeric fields back to numbers before returning
    const material = result[0];
    return {
      ...material,
      price_per_kg: parseFloat(material.price_per_kg)
    };
  } catch (error) {
    console.error('Raw feed material update failed:', error);
    throw error;
  }
}

export async function deleteRawFeedMaterial(id: number): Promise<void> {
  try {
    const result = await db.delete(rawFeedMaterialsTable)
      .where(eq(rawFeedMaterialsTable.id, id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Raw feed material with id ${id} not found`);
    }
  } catch (error) {
    console.error('Raw feed material deletion failed:', error);
    throw error;
  }
}