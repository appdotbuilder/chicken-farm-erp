import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { otherExpensesTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type CreateOtherExpensesInput, type UpdateOtherExpensesInput } from '../schema';
import {
  createOtherExpenses,
  getOtherExpenses,
  getOtherExpensesById,
  updateOtherExpenses,
  deleteOtherExpenses,
  getTotalExpensesByDateRange,
  getOtherExpensesByDateRange
} from '../handlers/other_expenses';

// Test inputs
const testInput: CreateOtherExpensesInput = {
  expense_date: new Date('2024-01-15'),
  expense_type: 'medication',
  description: 'Vitamins for chickens',
  amount: 150.75
};

const testInput2: CreateOtherExpensesInput = {
  expense_date: new Date('2024-01-20'),
  expense_type: 'electricity',
  description: 'Monthly electricity bill',
  amount: 250.50
};

describe('createOtherExpenses', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create an other expense', async () => {
    const result = await createOtherExpenses(testInput);

    // Basic field validation
    expect(result.expense_date).toEqual(testInput.expense_date);
    expect(result.expense_type).toEqual('medication');
    expect(result.description).toEqual('Vitamins for chickens');
    expect(result.amount).toEqual(150.75);
    expect(typeof result.amount).toBe('number');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save other expense to database', async () => {
    const result = await createOtherExpenses(testInput);

    const expenses = await db.select()
      .from(otherExpensesTable)
      .where(eq(otherExpensesTable.id, result.id))
      .execute();

    expect(expenses).toHaveLength(1);
    expect(expenses[0].expense_type).toEqual('medication');
    expect(expenses[0].description).toEqual('Vitamins for chickens');
    expect(parseFloat(expenses[0].amount)).toEqual(150.75);
    expect(expenses[0].expense_date).toEqual(testInput.expense_date.toISOString().split('T')[0]);
    expect(expenses[0].created_at).toBeInstanceOf(Date);
  });

  it('should handle different expense types', async () => {
    const laborExpense: CreateOtherExpensesInput = {
      expense_date: new Date('2024-01-10'),
      expense_type: 'labor',
      description: 'Worker salary',
      amount: 500.00
    };

    const result = await createOtherExpenses(laborExpense);

    expect(result.expense_type).toEqual('labor');
    expect(result.description).toEqual('Worker salary');
    expect(result.amount).toEqual(500.00);
  });
});

describe('getOtherExpenses', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no expenses exist', async () => {
    const result = await getOtherExpenses();
    expect(result).toEqual([]);
  });

  it('should return all other expenses', async () => {
    const expense1 = await createOtherExpenses(testInput);
    const expense2 = await createOtherExpenses(testInput2);

    const result = await getOtherExpenses();

    expect(result).toHaveLength(2);
    expect(result.map(e => e.id).sort()).toEqual([expense1.id, expense2.id].sort());
    
    // Verify numeric conversion
    result.forEach(expense => {
      expect(typeof expense.amount).toBe('number');
    });
  });

  it('should return expenses ordered by date descending', async () => {
    const olderExpense = await createOtherExpenses({
      ...testInput,
      expense_date: new Date('2024-01-10')
    });
    const newerExpense = await createOtherExpenses({
      ...testInput2,
      expense_date: new Date('2024-01-25')
    });

    const result = await getOtherExpenses();

    expect(result).toHaveLength(2);
    expect(result[0].id).toEqual(newerExpense.id); // Newer should be first
    expect(result[1].id).toEqual(olderExpense.id);
  });
});

describe('getOtherExpensesById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return null for non-existent ID', async () => {
    const result = await getOtherExpensesById(999);
    expect(result).toBeNull();
  });

  it('should return other expense by ID', async () => {
    const created = await createOtherExpenses(testInput);

    const result = await getOtherExpensesById(created.id);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(created.id);
    expect(result!.expense_type).toEqual('medication');
    expect(result!.description).toEqual('Vitamins for chickens');
    expect(result!.amount).toEqual(150.75);
    expect(typeof result!.amount).toBe('number');
  });
});

describe('updateOtherExpenses', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update other expense', async () => {
    const created = await createOtherExpenses(testInput);

    const updateInput: UpdateOtherExpensesInput = {
      id: created.id,
      description: 'Updated description',
      amount: 200.25
    };

    const result = await updateOtherExpenses(updateInput);

    expect(result.id).toEqual(created.id);
    expect(result.description).toEqual('Updated description');
    expect(result.amount).toEqual(200.25);
    expect(typeof result.amount).toBe('number');
    expect(result.expense_type).toEqual('medication'); // Should remain unchanged
  });

  it('should update only provided fields', async () => {
    const created = await createOtherExpenses(testInput);

    const updateInput: UpdateOtherExpensesInput = {
      id: created.id,
      expense_type: 'electricity'
    };

    const result = await updateOtherExpenses(updateInput);

    expect(result.expense_type).toEqual('electricity');
    expect(result.description).toEqual('Vitamins for chickens'); // Should remain unchanged
    expect(result.amount).toEqual(150.75); // Should remain unchanged
  });

  it('should throw error for non-existent ID', async () => {
    const updateInput: UpdateOtherExpensesInput = {
      id: 999,
      description: 'Updated description'
    };

    await expect(updateOtherExpenses(updateInput)).rejects.toThrow(/not found/i);
  });

  it('should update expense in database', async () => {
    const created = await createOtherExpenses(testInput);

    const updateInput: UpdateOtherExpensesInput = {
      id: created.id,
      amount: 175.50,
      expense_type: 'other'
    };

    await updateOtherExpenses(updateInput);

    const expenses = await db.select()
      .from(otherExpensesTable)
      .where(eq(otherExpensesTable.id, created.id))
      .execute();

    expect(expenses).toHaveLength(1);
    expect(parseFloat(expenses[0].amount)).toEqual(175.50);
    expect(expenses[0].expense_type).toEqual('other');
  });
});

describe('deleteOtherExpenses', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete other expense', async () => {
    const created = await createOtherExpenses(testInput);

    await deleteOtherExpenses(created.id);

    const expenses = await db.select()
      .from(otherExpensesTable)
      .where(eq(otherExpensesTable.id, created.id))
      .execute();

    expect(expenses).toHaveLength(0);
  });

  it('should throw error for non-existent ID', async () => {
    await expect(deleteOtherExpenses(999)).rejects.toThrow(/not found/i);
  });

  it('should not affect other records', async () => {
    const expense1 = await createOtherExpenses(testInput);
    const expense2 = await createOtherExpenses(testInput2);

    await deleteOtherExpenses(expense1.id);

    const remaining = await getOtherExpenses();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toEqual(expense2.id);
  });
});

describe('getTotalExpensesByDateRange', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return 0 for empty date range', async () => {
    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-01-31');

    const total = await getTotalExpensesByDateRange(startDate, endDate);
    expect(total).toEqual(0);
  });

  it('should calculate total expenses in date range', async () => {
    // Create expenses in range
    await createOtherExpenses({
      ...testInput,
      expense_date: new Date('2024-01-15'),
      amount: 100.00
    });
    
    await createOtherExpenses({
      ...testInput2,
      expense_date: new Date('2024-01-20'),
      amount: 200.00
    });

    // Create expense outside range
    await createOtherExpenses({
      ...testInput,
      expense_date: new Date('2024-02-15'),
      amount: 300.00
    });

    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-01-31');

    const total = await getTotalExpensesByDateRange(startDate, endDate);
    expect(total).toEqual(300.00); // Only January expenses
    expect(typeof total).toBe('number');
  });

  it('should include boundary dates', async () => {
    const startDate = new Date('2024-01-15');
    const endDate = new Date('2024-01-15');

    await createOtherExpenses({
      ...testInput,
      expense_date: startDate,
      amount: 150.00
    });

    const total = await getTotalExpensesByDateRange(startDate, endDate);
    expect(total).toEqual(150.00);
  });
});

describe('getOtherExpensesByDateRange', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array for date range with no expenses', async () => {
    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-01-31');

    const result = await getOtherExpensesByDateRange(startDate, endDate);
    expect(result).toEqual([]);
  });

  it('should return expenses in date range', async () => {
    // Create expenses in range
    const expense1 = await createOtherExpenses({
      ...testInput,
      expense_date: new Date('2024-01-15'),
      amount: 100.00
    });
    
    const expense2 = await createOtherExpenses({
      ...testInput2,
      expense_date: new Date('2024-01-20'),
      amount: 200.00
    });

    // Create expense outside range
    await createOtherExpenses({
      ...testInput,
      expense_date: new Date('2024-02-15'),
      amount: 300.00
    });

    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-01-31');

    const result = await getOtherExpensesByDateRange(startDate, endDate);

    expect(result).toHaveLength(2);
    expect(result.map(e => e.id).sort()).toEqual([expense1.id, expense2.id].sort());
    
    // Verify numeric conversion
    result.forEach(expense => {
      expect(typeof expense.amount).toBe('number');
    });
  });

  it('should return expenses ordered by date descending', async () => {
    const olderExpense = await createOtherExpenses({
      ...testInput,
      expense_date: new Date('2024-01-10'),
      amount: 100.00
    });
    
    const newerExpense = await createOtherExpenses({
      ...testInput2,
      expense_date: new Date('2024-01-25'),
      amount: 200.00
    });

    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-01-31');

    const result = await getOtherExpensesByDateRange(startDate, endDate);

    expect(result).toHaveLength(2);
    expect(result[0].id).toEqual(newerExpense.id); // Newer should be first
    expect(result[1].id).toEqual(olderExpense.id);
  });

  it('should include boundary dates', async () => {
    const boundaryDate = new Date('2024-01-15');

    const expense = await createOtherExpenses({
      ...testInput,
      expense_date: boundaryDate,
      amount: 150.00
    });

    const result = await getOtherExpensesByDateRange(boundaryDate, boundaryDate);

    expect(result).toHaveLength(1);
    expect(result[0].id).toEqual(expense.id);
  });
});