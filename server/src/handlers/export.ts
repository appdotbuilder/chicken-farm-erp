import { db } from '../db';
import { 
  rawFeedMaterialsTable,
  finishedFeedsTable,
  chickenFlocksTable,
  feedConsumptionsTable,
  eggProductionsTable,
  eggSalesTable,
  otherExpensesTable,
  feedCompositionsTable
} from '../db/schema';
import { type ExportRequest } from '../schema';
import { eq, gte, lte, and, desc, SQL } from 'drizzle-orm';

export async function exportData(request: ExportRequest): Promise<Buffer> {
  try {
    // Fetch data based on entity type
    const data = await fetchDataByEntityType(request.entity_type, request.filters || {});
    
    // Generate file based on format
    if (request.format === 'pdf') {
      return await generatePDF(data, request.entity_type);
    } else {
      return await generateExcel(data, request.entity_type);
    }
  } catch (error) {
    console.error('Export data failed:', error);
    throw error;
  }
}

export async function exportProfitReport(request: { format: 'pdf' | 'excel', startDate: Date, endDate: Date }): Promise<Buffer> {
  try {
    // Calculate profit report data
    const profitData = await calculateProfitReport(request.startDate, request.endDate);
    
    if (request.format === 'pdf') {
      return await generateProfitReportPDF(profitData);
    } else {
      return await generateProfitReportExcel(profitData);
    }
  } catch (error) {
    console.error('Export profit report failed:', error);
    throw error;
  }
}

async function fetchDataByEntityType(entityType: string, filters: Record<string, any>): Promise<any[]> {
  switch (entityType) {
    case 'raw_materials':
      const rawConditions: SQL<unknown>[] = [];
      
      if (filters['name']) {
        rawConditions.push(eq(rawFeedMaterialsTable['name'], filters['name']));
      }
      if (filters['min_price']) {
        rawConditions.push(gte(rawFeedMaterialsTable['price_per_kg'], filters['min_price'].toString()));
      }
      
      const rawResults = await db.select()
        .from(rawFeedMaterialsTable)
        .where(rawConditions.length > 0 ? and(...rawConditions) : undefined)
        .orderBy(desc(rawFeedMaterialsTable['created_at']))
        .execute();
        
      return rawResults.map(item => ({
        ...item,
        price_per_kg: parseFloat(item['price_per_kg'])
      }));

    case 'finished_feeds':
      const feedConditions: SQL<unknown>[] = [];
      if (filters['name']) {
        feedConditions.push(eq(finishedFeedsTable['name'], filters['name']));
      }
      
      const feedResults = await db.select()
        .from(finishedFeedsTable)
        .where(feedConditions.length > 0 ? and(...feedConditions) : undefined)
        .orderBy(desc(finishedFeedsTable['created_at']))
        .execute();
        
      return feedResults.map(item => ({
        ...item,
        cost_per_kg: parseFloat(item['cost_per_kg'])
      }));

    case 'flocks':
      const flockConditions: SQL<unknown>[] = [];
      if (filters['strain']) {
        flockConditions.push(eq(chickenFlocksTable['strain'], filters['strain']));
      }
      if (filters['entry_date_from']) {
        flockConditions.push(gte(chickenFlocksTable['entry_date'], filters['entry_date_from']));
      }
      if (filters['entry_date_to']) {
        flockConditions.push(lte(chickenFlocksTable['entry_date'], filters['entry_date_to']));
      }
      
      return await db.select()
        .from(chickenFlocksTable)
        .where(flockConditions.length > 0 ? and(...flockConditions) : undefined)
        .orderBy(desc(chickenFlocksTable['created_at']))
        .execute();

    case 'feed_consumption':
      const consumptionConditions: SQL<unknown>[] = [];
      if (filters['flock_id']) {
        consumptionConditions.push(eq(feedConsumptionsTable['flock_id'], parseInt(filters['flock_id'])));
      }
      if (filters['date_from']) {
        consumptionConditions.push(gte(feedConsumptionsTable['consumption_date'], filters['date_from']));
      }
      if (filters['date_to']) {
        consumptionConditions.push(lte(feedConsumptionsTable['consumption_date'], filters['date_to']));
      }
      
      const consumptionResults = await db.select()
        .from(feedConsumptionsTable)
        .where(consumptionConditions.length > 0 ? and(...consumptionConditions) : undefined)
        .orderBy(desc(feedConsumptionsTable['consumption_date']))
        .execute();
        
      return consumptionResults.map(item => ({
        ...item,
        quantity_kg: parseFloat(item['quantity_kg']),
        cost: parseFloat(item['cost'])
      }));

    case 'egg_production':
      const productionConditions: SQL<unknown>[] = [];
      if (filters['flock_id']) {
        productionConditions.push(eq(eggProductionsTable['flock_id'], parseInt(filters['flock_id'])));
      }
      if (filters['quality']) {
        productionConditions.push(eq(eggProductionsTable['quality'], filters['quality']));
      }
      if (filters['date_from']) {
        productionConditions.push(gte(eggProductionsTable['production_date'], filters['date_from']));
      }
      if (filters['date_to']) {
        productionConditions.push(lte(eggProductionsTable['production_date'], filters['date_to']));
      }
      
      return await db.select()
        .from(eggProductionsTable)
        .where(productionConditions.length > 0 ? and(...productionConditions) : undefined)
        .orderBy(desc(eggProductionsTable['production_date']))
        .execute();

    case 'egg_sales':
      const salesConditions: SQL<unknown>[] = [];
      if (filters['quality']) {
        salesConditions.push(eq(eggSalesTable['quality'], filters['quality']));
      }
      if (filters['date_from']) {
        salesConditions.push(gte(eggSalesTable['sale_date'], filters['date_from']));
      }
      if (filters['date_to']) {
        salesConditions.push(lte(eggSalesTable['sale_date'], filters['date_to']));
      }
      
      const salesResults = await db.select()
        .from(eggSalesTable)
        .where(salesConditions.length > 0 ? and(...salesConditions) : undefined)
        .orderBy(desc(eggSalesTable['sale_date']))
        .execute();
        
      return salesResults.map(item => ({
        ...item,
        price_per_egg: parseFloat(item['price_per_egg']),
        total_price: parseFloat(item['total_price'])
      }));

    case 'other_expenses':
      const expenseConditions: SQL<unknown>[] = [];
      if (filters['expense_type']) {
        expenseConditions.push(eq(otherExpensesTable['expense_type'], filters['expense_type']));
      }
      if (filters['date_from']) {
        expenseConditions.push(gte(otherExpensesTable['expense_date'], filters['date_from']));
      }
      if (filters['date_to']) {
        expenseConditions.push(lte(otherExpensesTable['expense_date'], filters['date_to']));
      }
      
      const expenseResults = await db.select()
        .from(otherExpensesTable)
        .where(expenseConditions.length > 0 ? and(...expenseConditions) : undefined)
        .orderBy(desc(otherExpensesTable['expense_date']))
        .execute();
        
      return expenseResults.map(item => ({
        ...item,
        amount: parseFloat(item['amount'])
      }));

    default:
      throw new Error(`Unsupported entity type: ${entityType}`);
  }
}

async function calculateProfitReport(startDate: Date, endDate: Date) {
  // Convert dates to strings for database comparison
  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];

  // Get egg sales revenue
  const salesQuery = db.select().from(eggSalesTable)
    .where(and(
      gte(eggSalesTable['sale_date'], startDateStr),
      lte(eggSalesTable['sale_date'], endDateStr)
    ));
  
  const sales = await salesQuery.execute();
  const totalRevenue = sales.reduce((sum, sale) => sum + parseFloat(sale['total_price']), 0);

  // Get feed costs
  const feedConsumptionQuery = db.select().from(feedConsumptionsTable)
    .where(and(
      gte(feedConsumptionsTable['consumption_date'], startDateStr),
      lte(feedConsumptionsTable['consumption_date'], endDateStr)
    ));
  
  const feedConsumptions = await feedConsumptionQuery.execute();
  const totalFeedCost = feedConsumptions.reduce((sum, consumption) => sum + parseFloat(consumption['cost']), 0);

  // Get other expenses
  const otherExpensesQuery = db.select().from(otherExpensesTable)
    .where(and(
      gte(otherExpensesTable['expense_date'], startDateStr),
      lte(otherExpensesTable['expense_date'], endDateStr)
    ));
  
  const otherExpenses = await otherExpensesQuery.execute();
  const totalOtherExpenses = otherExpenses.reduce((sum, expense) => sum + parseFloat(expense['amount']), 0);

  const totalProfit = totalRevenue - totalFeedCost - totalOtherExpenses;

  return {
    total_revenue: totalRevenue,
    total_feed_cost: totalFeedCost,
    total_other_expenses: totalOtherExpenses,
    total_profit: totalProfit,
    period_start: startDate,
    period_end: endDate,
    sales_details: sales,
    feed_consumption_details: feedConsumptions,
    other_expenses_details: otherExpenses
  };
}

export async function generatePDF(data: any[], entityType: string): Promise<Buffer> {
  try {
    // Generate simple text-based PDF content
    const headers = getTableHeaders(entityType);
    const rows = data.map(row => getRowValues(row, entityType));
    
    let content = `${entityType.toUpperCase().replace('_', ' ')} Report\n`;
    content += `Generated on: ${new Date().toLocaleDateString()}\n\n`;
    content += headers.join(' | ') + '\n';
    content += '-'.repeat(headers.join(' | ').length) + '\n';
    
    rows.forEach(row => {
      content += row.join(' | ') + '\n';
    });
    
    return Buffer.from(content, 'utf-8');
  } catch (error) {
    console.error('PDF generation failed:', error);
    throw error;
  }
}

export async function generateExcel(data: any[], sheetName: string): Promise<Buffer> {
  try {
    // Generate CSV format (Excel-compatible)
    const headers = getTableHeaders(sheetName);
    const rows = data.map(row => getRowValues(row, sheetName));
    
    let csvContent = headers.join(',') + '\n';
    rows.forEach(row => {
      csvContent += row.map(field => `"${field}"`).join(',') + '\n';
    });
    
    return Buffer.from(csvContent, 'utf-8');
  } catch (error) {
    console.error('Excel generation failed:', error);
    throw error;
  }
}

async function generateProfitReportPDF(data: any): Promise<Buffer> {
  try {
    let content = 'Profit Report\n';
    content += `Period: ${data['period_start'].toDateString()} - ${data['period_end'].toDateString()}\n`;
    content += `Generated on: ${new Date().toLocaleDateString()}\n\n`;
    content += 'Summary\n';
    content += '-'.repeat(20) + '\n';
    content += `Total Revenue: $${data['total_revenue'].toFixed(2)}\n`;
    content += `Total Feed Cost: $${data['total_feed_cost'].toFixed(2)}\n`;
    content += `Total Other Expenses: $${data['total_other_expenses'].toFixed(2)}\n`;
    content += `Net Profit: $${data['total_profit'].toFixed(2)}\n`;
    
    return Buffer.from(content, 'utf-8');
  } catch (error) {
    console.error('Profit report PDF generation failed:', error);
    throw error;
  }
}

async function generateProfitReportExcel(data: any): Promise<Buffer> {
  try {
    let csvContent = 'Profit Report Summary\n';
    csvContent += `Period,"${data['period_start'].toDateString()} - ${data['period_end'].toDateString()}"\n`;
    csvContent += '\n';
    csvContent += 'Total Revenue,' + data['total_revenue'] + '\n';
    csvContent += 'Total Feed Cost,' + data['total_feed_cost'] + '\n';
    csvContent += 'Total Other Expenses,' + data['total_other_expenses'] + '\n';
    csvContent += 'Net Profit,' + data['total_profit'] + '\n';
    
    return Buffer.from(csvContent, 'utf-8');
  } catch (error) {
    console.error('Profit report Excel generation failed:', error);
    throw error;
  }
}

function getTableHeaders(entityType: string): string[] {
  switch (entityType) {
    case 'raw_materials':
      return ['ID', 'Name', 'Price per KG', 'Created At'];
    case 'finished_feeds':
      return ['ID', 'Name', 'Cost per KG', 'Created At'];
    case 'flocks':
      return ['ID', 'Strain', 'Entry Date', 'Initial Count', 'Current Count'];
    case 'feed_consumption':
      return ['ID', 'Flock ID', 'Feed ID', 'Date', 'Quantity (KG)', 'Cost'];
    case 'egg_production':
      return ['ID', 'Flock ID', 'Date', 'Quality', 'Quantity'];
    case 'egg_sales':
      return ['ID', 'Sale Date', 'Quality', 'Quantity', 'Price per Egg', 'Total Price'];
    case 'other_expenses':
      return ['ID', 'Date', 'Type', 'Description', 'Amount'];
    default:
      return ['Data'];
  }
}

function getRowValues(row: any, entityType: string): string[] {
  switch (entityType) {
    case 'raw_materials':
      return [
        row['id']?.toString() || '',
        row['name'] || '',
        row['price_per_kg']?.toFixed(2) || '0.00',
        row['created_at']?.toDateString() || ''
      ];
    case 'finished_feeds':
      return [
        row['id']?.toString() || '',
        row['name'] || '',
        row['cost_per_kg']?.toFixed(2) || '0.00',
        row['created_at']?.toDateString() || ''
      ];
    case 'flocks':
      return [
        row['id']?.toString() || '',
        row['strain'] || '',
        row['entry_date'] || '',
        row['initial_count']?.toString() || '0',
        row['current_count']?.toString() || '0'
      ];
    case 'feed_consumption':
      return [
        row['id']?.toString() || '',
        row['flock_id']?.toString() || '',
        row['finished_feed_id']?.toString() || '',
        row['consumption_date'] || '',
        row['quantity_kg']?.toFixed(2) || '0.00',
        row['cost']?.toFixed(2) || '0.00'
      ];
    case 'egg_production':
      return [
        row['id']?.toString() || '',
        row['flock_id']?.toString() || '',
        row['production_date'] || '',
        row['quality'] || '',
        row['quantity']?.toString() || '0'
      ];
    case 'egg_sales':
      return [
        row['id']?.toString() || '',
        row['sale_date'] || '',
        row['quality'] || '',
        row['quantity']?.toString() || '0',
        row['price_per_egg']?.toFixed(4) || '0.0000',
        row['total_price']?.toFixed(2) || '0.00'
      ];
    case 'other_expenses':
      return [
        row['id']?.toString() || '',
        row['expense_date'] || '',
        row['expense_type'] || '',
        row['description'] || '',
        row['amount']?.toFixed(2) || '0.00'
      ];
    default:
      return [JSON.stringify(row)];
  }
}