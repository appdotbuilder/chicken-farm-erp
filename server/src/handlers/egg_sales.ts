import { db } from '../db';
import { eggSalesTable } from '../db/schema';
import { type CreateEggSalesInput, type UpdateEggSalesInput, type EggSales } from '../schema';
import { eq, gte, lte, and, sum } from 'drizzle-orm';

// Helper function to format date for database (YYYY-MM-DD)
const formatDateForDB = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

// Helper function to convert database result to schema format
const convertEggSaleResult = (dbResult: any): EggSales => ({
  ...dbResult,
  sale_date: new Date(dbResult.sale_date), // Convert string back to Date
  price_per_egg: parseFloat(dbResult.price_per_egg),
  total_price: parseFloat(dbResult.total_price)
});

export async function createEggSales(input: CreateEggSalesInput): Promise<EggSales> {
  try {
    // Calculate total price
    const total_price = input.quantity * input.price_per_egg;

    // Insert egg sales record
    const result = await db.insert(eggSalesTable)
      .values({
        sale_date: formatDateForDB(input.sale_date),
        quality: input.quality,
        quantity: input.quantity,
        price_per_egg: input.price_per_egg.toString(),
        total_price: total_price.toString()
      })
      .returning()
      .execute();

    return convertEggSaleResult(result[0]);
  } catch (error) {
    console.error('Egg sales creation failed:', error);
    throw error;
  }
}

export async function getEggSales(): Promise<EggSales[]> {
  try {
    const results = await db.select()
      .from(eggSalesTable)
      .execute();

    return results.map(convertEggSaleResult);
  } catch (error) {
    console.error('Failed to fetch egg sales:', error);
    throw error;
  }
}

export async function getEggSalesById(id: number): Promise<EggSales | null> {
  try {
    const results = await db.select()
      .from(eggSalesTable)
      .where(eq(eggSalesTable.id, id))
      .execute();

    if (results.length === 0) {
      return null;
    }

    return convertEggSaleResult(results[0]);
  } catch (error) {
    console.error('Failed to fetch egg sale by ID:', error);
    throw error;
  }
}

export async function updateEggSales(input: UpdateEggSalesInput): Promise<EggSales> {
  try {
    // Build update object with optional fields
    const updateData: any = {};
    
    if (input.sale_date !== undefined) {
      updateData.sale_date = formatDateForDB(input.sale_date);
    }
    if (input.quality !== undefined) {
      updateData.quality = input.quality;
    }
    if (input.quantity !== undefined) {
      updateData.quantity = input.quantity;
    }
    if (input.price_per_egg !== undefined) {
      updateData.price_per_egg = input.price_per_egg.toString();
    }

    // If quantity or price_per_egg changed, recalculate total_price
    if (input.quantity !== undefined || input.price_per_egg !== undefined) {
      // Get current values for calculation
      const current = await getEggSalesById(input.id);
      if (!current) {
        throw new Error('Egg sale record not found');
      }

      const newQuantity = input.quantity !== undefined ? input.quantity : current.quantity;
      const newPricePerEgg = input.price_per_egg !== undefined ? input.price_per_egg : current.price_per_egg;
      
      updateData.total_price = (newQuantity * newPricePerEgg).toString();
    }

    // Update egg sales record
    const result = await db.update(eggSalesTable)
      .set(updateData)
      .where(eq(eggSalesTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error('Egg sale record not found');
    }

    return convertEggSaleResult(result[0]);
  } catch (error) {
    console.error('Egg sales update failed:', error);
    throw error;
  }
}

export async function deleteEggSales(id: number): Promise<void> {
  try {
    const result = await db.delete(eggSalesTable)
      .where(eq(eggSalesTable.id, id))
      .execute();

    if (result.rowCount === 0) {
      throw new Error('Egg sale record not found');
    }
  } catch (error) {
    console.error('Egg sales deletion failed:', error);
    throw error;
  }
}

export async function getTotalRevenueByDateRange(startDate: Date, endDate: Date): Promise<number> {
  try {
    const result = await db.select({
      total: sum(eggSalesTable.total_price)
    })
      .from(eggSalesTable)
      .where(and(
        gte(eggSalesTable.sale_date, formatDateForDB(startDate)),
        lte(eggSalesTable.sale_date, formatDateForDB(endDate))
      ))
      .execute();

    const totalRevenue = result[0]?.total;
    return totalRevenue ? parseFloat(totalRevenue) : 0;
  } catch (error) {
    console.error('Failed to calculate total revenue:', error);
    throw error;
  }
}

export async function getEggSalesByDateRange(startDate: Date, endDate: Date): Promise<EggSales[]> {
  try {
    const results = await db.select()
      .from(eggSalesTable)
      .where(and(
        gte(eggSalesTable.sale_date, formatDateForDB(startDate)),
        lte(eggSalesTable.sale_date, formatDateForDB(endDate))
      ))
      .execute();

    return results.map(convertEggSaleResult);
  } catch (error) {
    console.error('Failed to fetch egg sales by date range:', error);
    throw error;
  }
}