import { db } from '../db';
import { eggProductionsTable, chickenFlocksTable } from '../db/schema';
import { type CreateEggProductionInput, type UpdateEggProductionInput, type EggProduction } from '../schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';

export async function createEggProduction(input: CreateEggProductionInput): Promise<EggProduction> {
  try {
    // Verify that the flock exists
    const flock = await db.select()
      .from(chickenFlocksTable)
      .where(eq(chickenFlocksTable.id, input.flock_id))
      .execute();

    if (flock.length === 0) {
      throw new Error(`Flock with id ${input.flock_id} does not exist`);
    }

    // Insert egg production record
    const result = await db.insert(eggProductionsTable)
      .values({
        flock_id: input.flock_id,
        production_date: input.production_date.toISOString().split('T')[0], // Convert Date to YYYY-MM-DD string
        quality: input.quality,
        quantity: input.quantity
      })
      .returning()
      .execute();

    // Convert date strings back to Date objects
    return {
      ...result[0],
      production_date: new Date(result[0].production_date)
    };
  } catch (error) {
    console.error('Egg production creation failed:', error);
    throw error;
  }
}

export async function getEggProductions(): Promise<EggProduction[]> {
  try {
    const results = await db.select()
      .from(eggProductionsTable)
      .orderBy(desc(eggProductionsTable.production_date))
      .execute();

    // Convert date strings back to Date objects
    return results.map(result => ({
      ...result,
      production_date: new Date(result.production_date)
    }));
  } catch (error) {
    console.error('Failed to fetch egg productions:', error);
    throw error;
  }
}

export async function getEggProductionsByFlockId(flockId: number): Promise<EggProduction[]> {
  try {
    const results = await db.select()
      .from(eggProductionsTable)
      .where(eq(eggProductionsTable.flock_id, flockId))
      .orderBy(desc(eggProductionsTable.production_date))
      .execute();

    // Convert date strings back to Date objects
    return results.map(result => ({
      ...result,
      production_date: new Date(result.production_date)
    }));
  } catch (error) {
    console.error('Failed to fetch egg productions by flock ID:', error);
    throw error;
  }
}

export async function getEggProductionById(id: number): Promise<EggProduction | null> {
  try {
    const results = await db.select()
      .from(eggProductionsTable)
      .where(eq(eggProductionsTable.id, id))
      .execute();

    if (results.length === 0) {
      return null;
    }

    // Convert date string back to Date object
    return {
      ...results[0],
      production_date: new Date(results[0].production_date)
    };
  } catch (error) {
    console.error('Failed to fetch egg production by ID:', error);
    throw error;
  }
}

export async function updateEggProduction(input: UpdateEggProductionInput): Promise<EggProduction> {
  try {
    // Verify that the egg production record exists
    const existing = await db.select()
      .from(eggProductionsTable)
      .where(eq(eggProductionsTable.id, input.id))
      .execute();

    if (existing.length === 0) {
      throw new Error(`Egg production record with id ${input.id} does not exist`);
    }

    // If flock_id is being updated, verify the new flock exists
    if (input.flock_id !== undefined) {
      const flock = await db.select()
        .from(chickenFlocksTable)
        .where(eq(chickenFlocksTable.id, input.flock_id))
        .execute();

      if (flock.length === 0) {
        throw new Error(`Flock with id ${input.flock_id} does not exist`);
      }
    }

    // Build update values object
    const updateValues: any = {};
    
    if (input.flock_id !== undefined) {
      updateValues.flock_id = input.flock_id;
    }
    if (input.production_date !== undefined) {
      updateValues.production_date = input.production_date.toISOString().split('T')[0]; // Convert Date to YYYY-MM-DD string
    }
    if (input.quality !== undefined) {
      updateValues.quality = input.quality;
    }
    if (input.quantity !== undefined) {
      updateValues.quantity = input.quantity;
    }

    // Update the record
    const result = await db.update(eggProductionsTable)
      .set(updateValues)
      .where(eq(eggProductionsTable.id, input.id))
      .returning()
      .execute();

    // Convert date string back to Date object
    return {
      ...result[0],
      production_date: new Date(result[0].production_date)
    };
  } catch (error) {
    console.error('Egg production update failed:', error);
    throw error;
  }
}

export async function deleteEggProduction(id: number): Promise<void> {
  try {
    // Verify that the egg production record exists
    const existing = await db.select()
      .from(eggProductionsTable)
      .where(eq(eggProductionsTable.id, id))
      .execute();

    if (existing.length === 0) {
      throw new Error(`Egg production record with id ${id} does not exist`);
    }

    // Delete the record
    await db.delete(eggProductionsTable)
      .where(eq(eggProductionsTable.id, id))
      .execute();
  } catch (error) {
    console.error('Egg production deletion failed:', error);
    throw error;
  }
}

export async function getEggProductionsByDateRange(startDate: Date, endDate: Date): Promise<EggProduction[]> {
  try {
    // Convert Date objects to YYYY-MM-DD strings for database comparison
    const startDateString = startDate.toISOString().split('T')[0];
    const endDateString = endDate.toISOString().split('T')[0];

    const results = await db.select()
      .from(eggProductionsTable)
      .where(
        and(
          gte(eggProductionsTable.production_date, startDateString),
          lte(eggProductionsTable.production_date, endDateString)
        )
      )
      .orderBy(desc(eggProductionsTable.production_date))
      .execute();

    // Convert date strings back to Date objects
    return results.map(result => ({
      ...result,
      production_date: new Date(result.production_date)
    }));
  } catch (error) {
    console.error('Failed to fetch egg productions by date range:', error);
    throw error;
  }
}