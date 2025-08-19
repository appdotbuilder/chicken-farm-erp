import { db } from '../db';
import { chickenFlocksTable } from '../db/schema';
import { type CreateChickenFlockInput, type UpdateChickenFlockInput, type ChickenFlock } from '../schema';
import { eq } from 'drizzle-orm';

export async function createChickenFlock(input: CreateChickenFlockInput): Promise<ChickenFlock> {
  try {
    // Insert chicken flock record with current_count set to initial_count
    const result = await db.insert(chickenFlocksTable)
      .values({
        strain: input.strain,
        entry_date: input.entry_date.toISOString().split('T')[0], // Convert Date to YYYY-MM-DD string
        initial_count: input.initial_count,
        age_upon_entry_days: input.age_upon_entry_days,
        current_count: input.initial_count // Initially same as initial_count
      })
      .returning()
      .execute();

    const flock = result[0];
    return {
      ...flock,
      entry_date: new Date(flock.entry_date), // Ensure Date object
      created_at: new Date(flock.created_at), // Ensure Date object
      updated_at: new Date(flock.updated_at)  // Ensure Date object
    };
  } catch (error) {
    console.error('Chicken flock creation failed:', error);
    throw error;
  }
}

export async function getChickenFlocks(): Promise<ChickenFlock[]> {
  try {
    const results = await db.select()
      .from(chickenFlocksTable)
      .execute();

    return results.map(flock => ({
      ...flock,
      entry_date: new Date(flock.entry_date),
      created_at: new Date(flock.created_at),
      updated_at: new Date(flock.updated_at)
    }));
  } catch (error) {
    console.error('Fetching chicken flocks failed:', error);
    throw error;
  }
}

export async function getChickenFlockById(id: number): Promise<ChickenFlock | null> {
  try {
    const results = await db.select()
      .from(chickenFlocksTable)
      .where(eq(chickenFlocksTable.id, id))
      .execute();

    if (results.length === 0) {
      return null;
    }

    const flock = results[0];
    return {
      ...flock,
      entry_date: new Date(flock.entry_date),
      created_at: new Date(flock.created_at),
      updated_at: new Date(flock.updated_at)
    };
  } catch (error) {
    console.error('Fetching chicken flock by ID failed:', error);
    throw error;
  }
}

export async function updateChickenFlock(input: UpdateChickenFlockInput): Promise<ChickenFlock> {
  try {
    const updateData: any = {};
    
    if (input.strain !== undefined) {
      updateData.strain = input.strain;
    }
    if (input.entry_date !== undefined) {
      updateData.entry_date = input.entry_date.toISOString().split('T')[0]; // Convert Date to YYYY-MM-DD string
    }
    if (input.initial_count !== undefined) {
      updateData.initial_count = input.initial_count;
    }
    if (input.age_upon_entry_days !== undefined) {
      updateData.age_upon_entry_days = input.age_upon_entry_days;
    }
    if (input.current_count !== undefined) {
      updateData.current_count = input.current_count;
    }

    // Always update the updated_at timestamp (no need to convert, timestamp columns accept Date objects)
    updateData.updated_at = new Date();

    const result = await db.update(chickenFlocksTable)
      .set(updateData)
      .where(eq(chickenFlocksTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Chicken flock with ID ${input.id} not found`);
    }

    const flock = result[0];
    return {
      ...flock,
      entry_date: new Date(flock.entry_date),
      created_at: new Date(flock.created_at),
      updated_at: new Date(flock.updated_at)
    };
  } catch (error) {
    console.error('Chicken flock update failed:', error);
    throw error;
  }
}

export async function deleteChickenFlock(id: number): Promise<void> {
  try {
    const result = await db.delete(chickenFlocksTable)
      .where(eq(chickenFlocksTable.id, id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Chicken flock with ID ${id} not found`);
    }
  } catch (error) {
    console.error('Chicken flock deletion failed:', error);
    throw error;
  }
}