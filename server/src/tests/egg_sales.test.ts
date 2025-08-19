import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { eggSalesTable } from '../db/schema';
import { type CreateEggSalesInput, type UpdateEggSalesInput } from '../schema';
import { 
  createEggSales, 
  getEggSales, 
  getEggSalesById, 
  updateEggSales, 
  deleteEggSales,
  getTotalRevenueByDateRange,
  getEggSalesByDateRange 
} from '../handlers/egg_sales';
import { eq } from 'drizzle-orm';

// Test input data
const testEggSale: CreateEggSalesInput = {
  sale_date: new Date('2024-01-15'),
  quality: 'A',
  quantity: 500,
  price_per_egg: 0.25
};

const testEggSaleB: CreateEggSalesInput = {
  sale_date: new Date('2024-01-20'),
  quality: 'B',
  quantity: 300,
  price_per_egg: 0.20
};

const testEggSaleCracked: CreateEggSalesInput = {
  sale_date: new Date('2024-01-10'),
  quality: 'cracked',
  quantity: 100,
  price_per_egg: 0.10
};

describe('createEggSales', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create an egg sale record', async () => {
    const result = await createEggSales(testEggSale);

    expect(result.sale_date).toEqual(testEggSale.sale_date);
    expect(result.quality).toEqual('A');
    expect(result.quantity).toEqual(500);
    expect(result.price_per_egg).toEqual(0.25);
    expect(result.total_price).toEqual(125.00); // 500 * 0.25
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(typeof result.price_per_egg).toBe('number');
    expect(typeof result.total_price).toBe('number');
  });

  it('should calculate total price correctly', async () => {
    const highPriceInput: CreateEggSalesInput = {
      sale_date: new Date('2024-01-15'),
      quality: 'A',
      quantity: 1000,
      price_per_egg: 0.30
    };

    const result = await createEggSales(highPriceInput);
    expect(result.total_price).toEqual(300.00); // 1000 * 0.30
  });

  it('should save egg sale to database', async () => {
    const result = await createEggSales(testEggSale);

    const eggSales = await db.select()
      .from(eggSalesTable)
      .where(eq(eggSalesTable.id, result.id))
      .execute();

    expect(eggSales).toHaveLength(1);
    expect(eggSales[0].quality).toEqual('A');
    expect(eggSales[0].quantity).toEqual(500);
    expect(parseFloat(eggSales[0].price_per_egg)).toEqual(0.25);
    expect(parseFloat(eggSales[0].total_price)).toEqual(125.00);
    expect(eggSales[0].created_at).toBeInstanceOf(Date);
    // Date is stored as string in DB, so compare string representation
    expect(eggSales[0].sale_date).toEqual('2024-01-15');
  });

  it('should handle different egg qualities', async () => {
    const crackedResult = await createEggSales(testEggSaleCracked);
    expect(crackedResult.quality).toEqual('cracked');
    expect(crackedResult.total_price).toEqual(10.00); // 100 * 0.10
  });
});

describe('getEggSales', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no egg sales exist', async () => {
    const result = await getEggSales();
    expect(result).toEqual([]);
  });

  it('should return all egg sales', async () => {
    await createEggSales(testEggSale);
    await createEggSales(testEggSaleB);

    const result = await getEggSales();

    expect(result).toHaveLength(2);
    expect(result[0].quality).toEqual('A');
    expect(result[1].quality).toEqual('B');
    expect(typeof result[0].price_per_egg).toBe('number');
    expect(typeof result[0].total_price).toBe('number');
    expect(result[0].sale_date).toBeInstanceOf(Date);
    expect(result[1].sale_date).toBeInstanceOf(Date);
  });
});

describe('getEggSalesById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return null when egg sale does not exist', async () => {
    const result = await getEggSalesById(999);
    expect(result).toBeNull();
  });

  it('should return egg sale by ID', async () => {
    const created = await createEggSales(testEggSale);
    const result = await getEggSalesById(created.id);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(created.id);
    expect(result!.quality).toEqual('A');
    expect(result!.quantity).toEqual(500);
    expect(result!.price_per_egg).toEqual(0.25);
    expect(result!.total_price).toEqual(125.00);
    expect(typeof result!.price_per_egg).toBe('number');
    expect(typeof result!.total_price).toBe('number');
    expect(result!.sale_date).toBeInstanceOf(Date);
  });
});

describe('updateEggSales', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update egg sale fields', async () => {
    const created = await createEggSales(testEggSale);
    
    const updateInput: UpdateEggSalesInput = {
      id: created.id,
      quality: 'B',
      quantity: 600
    };

    const result = await updateEggSales(updateInput);

    expect(result.id).toEqual(created.id);
    expect(result.quality).toEqual('B');
    expect(result.quantity).toEqual(600);
    expect(result.price_per_egg).toEqual(0.25); // unchanged
    expect(result.total_price).toEqual(150.00); // recalculated: 600 * 0.25
  });

  it('should recalculate total price when quantity changes', async () => {
    const created = await createEggSales(testEggSale);
    
    const updateInput: UpdateEggSalesInput = {
      id: created.id,
      quantity: 800
    };

    const result = await updateEggSales(updateInput);
    expect(result.total_price).toEqual(200.00); // 800 * 0.25
  });

  it('should recalculate total price when price per egg changes', async () => {
    const created = await createEggSales(testEggSale);
    
    const updateInput: UpdateEggSalesInput = {
      id: created.id,
      price_per_egg: 0.30
    };

    const result = await updateEggSales(updateInput);
    expect(result.total_price).toEqual(150.00); // 500 * 0.30
  });

  it('should recalculate total price when both quantity and price change', async () => {
    const created = await createEggSales(testEggSale);
    
    const updateInput: UpdateEggSalesInput = {
      id: created.id,
      quantity: 1000,
      price_per_egg: 0.35
    };

    const result = await updateEggSales(updateInput);
    expect(result.total_price).toEqual(350.00); // 1000 * 0.35
  });

  it('should throw error when egg sale does not exist', async () => {
    const updateInput: UpdateEggSalesInput = {
      id: 999,
      quantity: 600
    };

    expect(updateEggSales(updateInput)).rejects.toThrow(/not found/i);
  });

  it('should update sale date', async () => {
    const created = await createEggSales(testEggSale);
    const newDate = new Date('2024-02-01');
    
    const updateInput: UpdateEggSalesInput = {
      id: created.id,
      sale_date: newDate
    };

    const result = await updateEggSales(updateInput);
    expect(result.sale_date).toEqual(newDate);
  });
});

describe('deleteEggSales', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete egg sale record', async () => {
    const created = await createEggSales(testEggSale);
    
    await deleteEggSales(created.id);

    const result = await getEggSalesById(created.id);
    expect(result).toBeNull();
  });

  it('should throw error when trying to delete non-existent egg sale', async () => {
    expect(deleteEggSales(999)).rejects.toThrow(/not found/i);
  });
});

describe('getTotalRevenueByDateRange', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return 0 when no sales in date range', async () => {
    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-01-31');

    const result = await getTotalRevenueByDateRange(startDate, endDate);
    expect(result).toEqual(0);
  });

  it('should calculate total revenue for date range', async () => {
    // Create sales in different dates
    await createEggSales(testEggSale); // 2024-01-15, revenue: 125
    await createEggSales(testEggSaleB); // 2024-01-20, revenue: 60
    await createEggSales(testEggSaleCracked); // 2024-01-10, revenue: 10

    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-01-31');

    const result = await getTotalRevenueByDateRange(startDate, endDate);
    expect(result).toEqual(195.00); // 125 + 60 + 10
  });

  it('should exclude sales outside date range', async () => {
    await createEggSales(testEggSale); // 2024-01-15, revenue: 125
    await createEggSales({
      ...testEggSaleB,
      sale_date: new Date('2024-02-01') // Outside range
    });

    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-01-31');

    const result = await getTotalRevenueByDateRange(startDate, endDate);
    expect(result).toEqual(125.00); // Only the first sale
  });

  it('should include sales on boundary dates', async () => {
    const startDate = new Date('2024-01-15');
    const endDate = new Date('2024-01-15');
    
    await createEggSales(testEggSale); // Exact date match

    const result = await getTotalRevenueByDateRange(startDate, endDate);
    expect(result).toEqual(125.00);
  });
});

describe('getEggSalesByDateRange', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no sales in date range', async () => {
    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-01-31');

    const result = await getEggSalesByDateRange(startDate, endDate);
    expect(result).toEqual([]);
  });

  it('should return sales within date range', async () => {
    await createEggSales(testEggSale); // 2024-01-15
    await createEggSales(testEggSaleB); // 2024-01-20
    await createEggSales(testEggSaleCracked); // 2024-01-10

    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-01-31');

    const result = await getEggSalesByDateRange(startDate, endDate);

    expect(result).toHaveLength(3);
    expect(result.every(sale => sale.sale_date >= startDate && sale.sale_date <= endDate)).toBe(true);
    expect(result.every(sale => typeof sale.price_per_egg === 'number')).toBe(true);
    expect(result.every(sale => typeof sale.total_price === 'number')).toBe(true);
    expect(result.every(sale => sale.sale_date instanceof Date)).toBe(true);
  });

  it('should exclude sales outside date range', async () => {
    await createEggSales(testEggSale); // 2024-01-15
    await createEggSales({
      ...testEggSaleB,
      sale_date: new Date('2024-02-01') // Outside range
    });

    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-01-31');

    const result = await getEggSalesByDateRange(startDate, endDate);

    expect(result).toHaveLength(1);
    expect(result[0].sale_date).toEqual(testEggSale.sale_date);
  });

  it('should handle partial date range correctly', async () => {
    await createEggSales(testEggSaleCracked); // 2024-01-10
    await createEggSales(testEggSale); // 2024-01-15
    await createEggSales(testEggSaleB); // 2024-01-20

    // Only include middle date
    const startDate = new Date('2024-01-12');
    const endDate = new Date('2024-01-18');

    const result = await getEggSalesByDateRange(startDate, endDate);

    expect(result).toHaveLength(1);
    expect(result[0].sale_date).toEqual(testEggSale.sale_date);
  });

  it('should return correct data types for all fields', async () => {
    await createEggSales(testEggSale);

    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-01-31');

    const result = await getEggSalesByDateRange(startDate, endDate);

    expect(result).toHaveLength(1);
    const sale = result[0];
    expect(typeof sale.id).toBe('number');
    expect(sale.sale_date).toBeInstanceOf(Date);
    expect(typeof sale.quality).toBe('string');
    expect(typeof sale.quantity).toBe('number');
    expect(typeof sale.price_per_egg).toBe('number');
    expect(typeof sale.total_price).toBe('number');
    expect(sale.created_at).toBeInstanceOf(Date);
  });
});