import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  rawFeedMaterialsTable,
  finishedFeedsTable,
  chickenFlocksTable,
  eggSalesTable,
  feedConsumptionsTable,
  otherExpensesTable
} from '../db/schema';
import { type ExportRequest } from '../schema';
import { exportData, exportProfitReport, generatePDF, generateExcel } from '../handlers/export';

// Test data
const testRawMaterial = {
  name: 'Test Corn',
  price_per_kg: '25.50'
};

const testFinishedFeed = {
  name: 'Broiler Starter',
  cost_per_kg: '30.00'
};

const testFlock = {
  strain: 'Rhode Island Red',
  entry_date: '2024-01-15',
  initial_count: 100,
  age_upon_entry_days: 30,
  current_count: 95
};

const testEggSale = {
  sale_date: '2024-01-20',
  quality: 'A' as const,
  quantity: 50,
  price_per_egg: '0.2500',
  total_price: '12.50'
};

describe('exportData', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should export raw materials as PDF', async () => {
    // Create test data
    await db.insert(rawFeedMaterialsTable).values(testRawMaterial).execute();

    const request: ExportRequest = {
      format: 'pdf',
      entity_type: 'raw_materials'
    };

    const result = await exportData(request);

    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBeGreaterThan(0);
    
    // Validate content includes expected data
    const content = result.toString('utf-8');
    expect(content).toContain('RAW MATERIALS Report');
    expect(content).toContain('Test Corn');
    expect(content).toContain('25.50');
  });

  it('should export raw materials as Excel (CSV format)', async () => {
    // Create test data
    await db.insert(rawFeedMaterialsTable).values(testRawMaterial).execute();

    const request: ExportRequest = {
      format: 'excel',
      entity_type: 'raw_materials'
    };

    const result = await exportData(request);

    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBeGreaterThan(0);
    
    // Validate CSV content
    const content = result.toString('utf-8');
    expect(content).toContain('ID,Name,Price per KG,Created At');
    expect(content).toContain('Test Corn');
    expect(content).toContain('25.50');
  });

  it('should export finished feeds with filters', async () => {
    // Create test data
    await db.insert(finishedFeedsTable).values(testFinishedFeed).execute();
    await db.insert(finishedFeedsTable).values({
      name: 'Layer Feed',
      cost_per_kg: '28.00'
    }).execute();

    const request: ExportRequest = {
      format: 'excel',
      entity_type: 'finished_feeds',
      filters: {
        name: 'Broiler Starter'
      }
    };

    const result = await exportData(request);
    
    // Validate filtered content
    const content = result.toString('utf-8');
    expect(content).toContain('Broiler Starter');
    expect(content).not.toContain('Layer Feed');
  });

  it('should export flocks with date filters', async () => {
    // Create test data
    await db.insert(chickenFlocksTable).values(testFlock).execute();
    await db.insert(chickenFlocksTable).values({
      strain: 'Leghorn',
      entry_date: '2024-02-01',
      initial_count: 80,
      age_upon_entry_days: 25,
      current_count: 78
    }).execute();

    const request: ExportRequest = {
      format: 'excel',
      entity_type: 'flocks',
      filters: {
        entry_date_from: '2024-01-01',
        entry_date_to: '2024-01-31'
      }
    };

    const result = await exportData(request);
    
    // Validate filtered content - should only include January flock
    const content = result.toString('utf-8');
    expect(content).toContain('Rhode Island Red');
    expect(content).not.toContain('Leghorn');
  });

  it('should handle unsupported entity type', async () => {
    const request: ExportRequest = {
      format: 'pdf',
      entity_type: 'invalid_type' as any
    };

    await expect(exportData(request)).rejects.toThrow(/Unsupported entity type/i);
  });

  it('should export egg sales data correctly', async () => {
    // Create test data
    await db.insert(eggSalesTable).values(testEggSale).execute();

    const request: ExportRequest = {
      format: 'pdf',
      entity_type: 'egg_sales'
    };

    const result = await exportData(request);
    
    const content = result.toString('utf-8');
    expect(content).toContain('EGG SALES Report');
    expect(content).toContain('0.2500');
    expect(content).toContain('12.50');
  });
});

describe('exportProfitReport', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should generate profit report as PDF', async () => {
    // Create prerequisite data
    const [flock] = await db.insert(chickenFlocksTable).values(testFlock).returning().execute();
    const [feed] = await db.insert(finishedFeedsTable).values(testFinishedFeed).returning().execute();
    
    // Create test data for profit calculation
    await db.insert(eggSalesTable).values(testEggSale).execute();
    await db.insert(feedConsumptionsTable).values({
      flock_id: flock.id,
      finished_feed_id: feed.id,
      consumption_date: '2024-01-18',
      quantity_kg: '5.00',
      cost: '150.00'
    }).execute();
    await db.insert(otherExpensesTable).values({
      expense_date: '2024-01-19',
      expense_type: 'medication',
      description: 'Vitamins',
      amount: '25.00'
    }).execute();

    const request = {
      format: 'pdf' as const,
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-31')
    };

    const result = await exportProfitReport(request);

    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBeGreaterThan(0);
    
    // Validate profit report content
    const content = result.toString('utf-8');
    expect(content).toContain('Profit Report');
    expect(content).toContain('Total Revenue');
    expect(content).toContain('Net Profit');
  });

  it('should generate profit report as Excel', async () => {
    // Create prerequisite data
    const [flock] = await db.insert(chickenFlocksTable).values(testFlock).returning().execute();
    const [feed] = await db.insert(finishedFeedsTable).values(testFinishedFeed).returning().execute();
    
    // Create test data for profit calculation
    await db.insert(eggSalesTable).values(testEggSale).execute();
    await db.insert(feedConsumptionsTable).values({
      flock_id: flock.id,
      finished_feed_id: feed.id,
      consumption_date: '2024-01-18',
      quantity_kg: '5.00',
      cost: '150.00'
    }).execute();

    const request = {
      format: 'excel' as const,
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-31')
    };

    const result = await exportProfitReport(request);

    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBeGreaterThan(0);
    
    // Validate Excel/CSV content
    const content = result.toString('utf-8');
    expect(content).toContain('Profit Report Summary');
    expect(content).toContain('Total Revenue');
    expect(content).toContain('Net Profit');
  });

  it('should calculate profit correctly with multiple transactions', async () => {
    // Create prerequisite data
    const [flock] = await db.insert(chickenFlocksTable).values(testFlock).returning().execute();
    const [feed] = await db.insert(finishedFeedsTable).values(testFinishedFeed).returning().execute();
    
    // Create multiple egg sales
    await db.insert(eggSalesTable).values([
      testEggSale,
      {
        sale_date: '2024-01-25',
        quality: 'B' as const,
        quantity: 30,
        price_per_egg: '0.2000',
        total_price: '6.00'
      }
    ]).execute();
    
    // Create feed consumption
    await db.insert(feedConsumptionsTable).values({
      flock_id: flock.id,
      finished_feed_id: feed.id,
      consumption_date: '2024-01-18',
      quantity_kg: '5.00',
      cost: '150.00'
    }).execute();

    const request = {
      format: 'pdf' as const,
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-31')
    };

    const result = await exportProfitReport(request);
    const content = result.toString('utf-8');
    
    // Should show combined revenue (12.50 + 6.00 = 18.50)
    expect(content).toContain('Total Revenue: $18.50');
    expect(content).toContain('Total Feed Cost: $150.00');
  });
});

describe('generatePDF', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should generate PDF for raw materials data', async () => {
    const testData = [
      {
        id: 1,
        name: 'Corn',
        price_per_kg: 25.50,
        created_at: new Date('2024-01-15')
      },
      {
        id: 2,
        name: 'Soybean',
        price_per_kg: 35.00,
        created_at: new Date('2024-01-16')
      }
    ];

    const result = await generatePDF(testData, 'raw_materials');

    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBeGreaterThan(0);
    
    const content = result.toString('utf-8');
    expect(content).toContain('RAW MATERIALS Report');
    expect(content).toContain('Corn');
    expect(content).toContain('Soybean');
    expect(content).toContain('25.50');
    expect(content).toContain('35.00');
  });

  it('should generate PDF for egg sales data', async () => {
    const testData = [
      {
        id: 1,
        sale_date: new Date('2024-01-20'),
        quality: 'A',
        quantity: 50,
        price_per_egg: 0.25,
        total_price: 12.50
      }
    ];

    const result = await generatePDF(testData, 'egg_sales');

    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBeGreaterThan(0);
    
    const content = result.toString('utf-8');
    expect(content).toContain('EGG SALES Report');
    expect(content).toContain('0.2500');
    expect(content).toContain('12.50');
  });

  it('should handle empty data gracefully', async () => {
    const result = await generatePDF([], 'raw_materials');

    expect(result).toBeInstanceOf(Buffer);
    
    const content = result.toString('utf-8');
    expect(content).toContain('RAW MATERIALS Report');
    expect(content).toContain('ID | Name | Price per KG | Created At');
  });
});

describe('generateExcel', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should generate Excel for flocks data', async () => {
    const testData = [
      {
        id: 1,
        strain: 'Rhode Island Red',
        entry_date: new Date('2024-01-15'),
        initial_count: 100,
        current_count: 95
      }
    ];

    const result = await generateExcel(testData, 'flocks');

    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBeGreaterThan(0);
    
    const content = result.toString('utf-8');
    expect(content).toContain('ID,Strain,Entry Date,Initial Count,Current Count');
    expect(content).toContain('Rhode Island Red');
    expect(content).toContain('100');
    expect(content).toContain('95');
  });

  it('should generate Excel for other expenses data', async () => {
    const testData = [
      {
        id: 1,
        expense_date: new Date('2024-01-19'),
        expense_type: 'medication',
        description: 'Vitamins and supplements',
        amount: 25.00
      }
    ];

    const result = await generateExcel(testData, 'other_expenses');

    expect(result).toBeInstanceOf(Buffer);
    
    const content = result.toString('utf-8');
    expect(content).toContain('ID,Date,Type,Description,Amount');
    expect(content).toContain('medication');
    expect(content).toContain('Vitamins and supplements');
    expect(content).toContain('25.00');
  });

  it('should handle empty data gracefully', async () => {
    const result = await generateExcel([], 'raw_materials');

    expect(result).toBeInstanceOf(Buffer);
    
    const content = result.toString('utf-8');
    expect(content).toContain('ID,Name,Price per KG,Created At');
  });

  it('should properly escape CSV data with commas', async () => {
    const testData = [
      {
        id: 1,
        description: 'Medicine, vitamins, and supplements',
        expense_type: 'medication',
        expense_date: new Date('2024-01-19'),
        amount: 25.00
      }
    ];

    const result = await generateExcel(testData, 'other_expenses');
    const content = result.toString('utf-8');
    
    // Should wrap fields with commas in quotes
    expect(content).toContain('"Medicine, vitamins, and supplements"');
  });
});