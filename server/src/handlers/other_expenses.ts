import { db } from '../db';
import { otherExpensesTable } from '../db/schema';
import { eq, sum, gte, lte, and, desc } from 'drizzle-orm';
import { type CreateOtherExpensesInput, type UpdateOtherExpensesInput, type OtherExpenses } from '../schema';

export async function createOtherExpenses(input: CreateOtherExpensesInput): Promise<OtherExpenses> {
  try {
    const result = await db.insert(otherExpensesTable)
      .values({
        expense_date: input.expense_date.toISOString().split('T')[0], // Convert Date to string (YYYY-MM-DD)
        expense_type: input.expense_type,
        description: input.description,
        amount: input.amount.toString() // Convert number to string for numeric column
      })
      .returning()
      .execute();

    const expense = result[0];
    return {
      ...expense,
      expense_date: new Date(expense.expense_date), // Convert string back to Date
      amount: parseFloat(expense.amount) // Convert string back to number
    };
  } catch (error) {
    console.error('Other expense creation failed:', error);
    throw error;
  }
}

export async function getOtherExpenses(): Promise<OtherExpenses[]> {
  try {
    const result = await db.select()
      .from(otherExpensesTable)
      .orderBy(desc(otherExpensesTable.expense_date))
      .execute();

    return result.map(expense => ({
      ...expense,
      expense_date: new Date(expense.expense_date), // Convert string to Date
      amount: parseFloat(expense.amount) // Convert string to number
    }));
  } catch (error) {
    console.error('Failed to fetch other expenses:', error);
    throw error;
  }
}

export async function getOtherExpensesById(id: number): Promise<OtherExpenses | null> {
  try {
    const result = await db.select()
      .from(otherExpensesTable)
      .where(eq(otherExpensesTable.id, id))
      .execute();

    if (result.length === 0) {
      return null;
    }

    const expense = result[0];
    return {
      ...expense,
      expense_date: new Date(expense.expense_date), // Convert string to Date
      amount: parseFloat(expense.amount) // Convert string to number
    };
  } catch (error) {
    console.error('Failed to fetch other expense by ID:', error);
    throw error;
  }
}

export async function updateOtherExpenses(input: UpdateOtherExpensesInput): Promise<OtherExpenses> {
  try {
    // Build update object with only provided fields
    const updateData: any = {};
    
    if (input.expense_date !== undefined) {
      updateData.expense_date = input.expense_date.toISOString().split('T')[0]; // Convert Date to string
    }
    if (input.expense_type !== undefined) {
      updateData.expense_type = input.expense_type;
    }
    if (input.description !== undefined) {
      updateData.description = input.description;
    }
    if (input.amount !== undefined) {
      updateData.amount = input.amount.toString(); // Convert number to string for numeric column
    }

    const result = await db.update(otherExpensesTable)
      .set(updateData)
      .where(eq(otherExpensesTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error('Other expense not found');
    }

    const expense = result[0];
    return {
      ...expense,
      expense_date: new Date(expense.expense_date), // Convert string to Date
      amount: parseFloat(expense.amount) // Convert string to number
    };
  } catch (error) {
    console.error('Other expense update failed:', error);
    throw error;
  }
}

export async function deleteOtherExpenses(id: number): Promise<void> {
  try {
    const result = await db.delete(otherExpensesTable)
      .where(eq(otherExpensesTable.id, id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error('Other expense not found');
    }
  } catch (error) {
    console.error('Other expense deletion failed:', error);
    throw error;
  }
}

export async function getTotalExpensesByDateRange(startDate: Date, endDate: Date): Promise<number> {
  try {
    const startDateStr = startDate.toISOString().split('T')[0]; // Convert Date to string
    const endDateStr = endDate.toISOString().split('T')[0]; // Convert Date to string
    
    const result = await db.select({
      total: sum(otherExpensesTable.amount)
    })
      .from(otherExpensesTable)
      .where(and(
        gte(otherExpensesTable.expense_date, startDateStr),
        lte(otherExpensesTable.expense_date, endDateStr)
      ))
      .execute();

    const total = result[0]?.total;
    return total ? parseFloat(total) : 0; // Convert string to number, handle null case
  } catch (error) {
    console.error('Failed to calculate total expenses by date range:', error);
    throw error;
  }
}

export async function getOtherExpensesByDateRange(startDate: Date, endDate: Date): Promise<OtherExpenses[]> {
  try {
    const startDateStr = startDate.toISOString().split('T')[0]; // Convert Date to string
    const endDateStr = endDate.toISOString().split('T')[0]; // Convert Date to string
    
    const result = await db.select()
      .from(otherExpensesTable)
      .where(and(
        gte(otherExpensesTable.expense_date, startDateStr),
        lte(otherExpensesTable.expense_date, endDateStr)
      ))
      .orderBy(desc(otherExpensesTable.expense_date))
      .execute();

    return result.map(expense => ({
      ...expense,
      expense_date: new Date(expense.expense_date), // Convert string to Date
      amount: parseFloat(expense.amount) // Convert string to number
    }));
  } catch (error) {
    console.error('Failed to fetch other expenses by date range:', error);
    throw error;
  }
}