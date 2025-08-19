import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { trpc } from '@/utils/trpc';
import type { 
  OtherExpenses, 
  CreateOtherExpensesInput, 
  UpdateOtherExpensesInput,
  ExpenseType
} from '../../../server/src/schema';

function OtherExpenses() {
  const [expenses, setExpenses] = useState<OtherExpenses[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<OtherExpenses | null>(null);
  const [expenseDatePickerOpen, setExpenseDatePickerOpen] = useState(false);
  
  const [formData, setFormData] = useState<CreateOtherExpensesInput>({
    expense_date: new Date(),
    expense_type: 'other' as ExpenseType,
    description: '',
    amount: 0
  });

  const loadExpenses = useCallback(async () => {
    try {
      const result = await trpc.otherExpenses.getAll.query();
      setExpenses(result);
    } catch (error) {
      console.error('Failed to load other expenses:', error);
    }
  }, []);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      if (editingExpense) {
        const updateData: UpdateOtherExpensesInput = {
          id: editingExpense.id,
          expense_date: formData.expense_date || undefined,
          expense_type: formData.expense_type || undefined,
          description: formData.description || undefined,
          amount: formData.amount || undefined
        };
        const updated = await trpc.otherExpenses.update.mutate(updateData);
        setExpenses((prev: OtherExpenses[]) => 
          prev.map(e => e.id === updated.id ? updated : e)
        );
      } else {
        const created = await trpc.otherExpenses.create.mutate(formData);
        setExpenses((prev: OtherExpenses[]) => [...prev, created]);
      }
      
      resetForm();
    } catch (error) {
      console.error('Failed to save other expense:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (expense: OtherExpenses) => {
    setEditingExpense(expense);
    setFormData({
      expense_date: new Date(expense.expense_date),
      expense_type: expense.expense_type,
      description: expense.description,
      amount: expense.amount
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await trpc.otherExpenses.delete.mutate({ id });
      setExpenses((prev: OtherExpenses[]) => prev.filter(e => e.id !== id));
    } catch (error) {
      console.error('Failed to delete other expense:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      expense_date: new Date(),
      expense_type: 'other' as ExpenseType,
      description: '',
      amount: 0
    });
    setEditingExpense(null);
    setIsDialogOpen(false);
  };

  const getExpenseTypeBadge = (type: ExpenseType) => {
    const variants = {
      'medication': { variant: 'default' as const, color: 'bg-red-100 text-red-800', label: '💊 Medication', icon: '💊' },
      'electricity': { variant: 'secondary' as const, color: 'bg-yellow-100 text-yellow-800', label: '⚡ Electricity', icon: '⚡' },
      'labor': { variant: 'default' as const, color: 'bg-blue-100 text-blue-800', label: '👨‍💼 Labor', icon: '👨‍💼' },
      'other': { variant: 'secondary' as const, color: 'bg-gray-100 text-gray-800', label: '📦 Other', icon: '📦' }
    };
    
    return variants[type] || variants['other'];
  };

  const calculateDailyExpenseStats = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todaysExpenses = expenses.filter(e => {
      const expenseDate = new Date(e.expense_date);
      expenseDate.setHours(0, 0, 0, 0);
      return expenseDate.getTime() === today.getTime();
    });

    return {
      todayAmount: todaysExpenses.reduce((sum, e) => sum + e.amount, 0),
      todayCount: todaysExpenses.length
    };
  };

  const dailyStats = calculateDailyExpenseStats();

  // Common expense descriptions for quick selection
  const commonDescriptions: Record<ExpenseType, string[]> = {
    'medication': [
      'Vaccination program',
      'Antibiotics treatment',
      'Vitamin supplements',
      'Deworming medication',
      'Health supplements'
    ],
    'electricity': [
      'Monthly electricity bill',
      'Lighting systems',
      'Ventilation fans',
      'Water heaters',
      'Equipment power'
    ],
    'labor': [
      'Farm worker wages',
      'Veterinarian consultation',
      'Cleaning staff',
      'Maintenance work',
      'Overtime pay'
    ],
    'other': [
      'Equipment maintenance',
      'Cleaning supplies',
      'Transportation costs',
      'Insurance premiums',
      'Miscellaneous expenses'
    ]
  };

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Other Expenses</h3>
          <p className="text-gray-600">Track operational expenses beyond feed costs</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <span className="mr-2">➕</span>
              Add Expense
            </Button>
          </DialogTrigger>
          
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingExpense ? 'Edit Expense' : 'Add New Expense'}
              </DialogTitle>
              <DialogDescription>
                {editingExpense 
                  ? 'Update the expense details below.'
                  : 'Enter the details for a new operational expense.'
                }
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Expense Date</label>
                <Popover open={expenseDatePickerOpen} onOpenChange={setExpenseDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.expense_date ? format(formData.expense_date, 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.expense_date}
                      onSelect={(date) => {
                        if (date) {
                          setFormData((prev: CreateOtherExpensesInput) => ({ 
                            ...prev, 
                            expense_date: date 
                          }));
                          setExpenseDatePickerOpen(false);
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Expense Type</label>
                  <Select
                    value={formData.expense_type}
                    onValueChange={(value: ExpenseType) =>
                      setFormData((prev: CreateOtherExpensesInput) => ({
                        ...prev,
                        expense_type: value
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="medication">💊 Medication</SelectItem>
                      <SelectItem value="electricity">⚡ Electricity</SelectItem>
                      <SelectItem value="labor">👨‍💼 Labor</SelectItem>
                      <SelectItem value="other">📦 Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Amount ($)</label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateOtherExpensesInput) => ({ 
                        ...prev, 
                        amount: parseFloat(e.target.value) || 0 
                      }))
                    }
                    step="0.01"
                    min="0"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  placeholder="Enter expense description..."
                  value={formData.description}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setFormData((prev: CreateOtherExpensesInput) => ({ 
                      ...prev, 
                      description: e.target.value 
                    }))
                  }
                  rows={3}
                  required
                />
                
                {/* Quick Description Selection */}
                <div className="mt-2">
                  <span className="text-xs text-gray-600">Common descriptions: </span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {commonDescriptions[formData.expense_type].map((desc, index) => (
                      <Button
                        key={index}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-xs h-6 px-2"
                        onClick={() =>
                          setFormData((prev: CreateOtherExpensesInput) => ({
                            ...prev,
                            description: desc
                          }))
                        }
                      >
                        {desc}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading || formData.amount === 0}>
                  {isLoading ? 'Saving...' : (editingExpense ? 'Update' : 'Add')} Expense
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Daily Summary */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-600 flex items-center space-x-2">
              <span>📊</span>
              <span>Today's Expenses</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Count:</span>
                <span className="font-semibold">{dailyStats.todayCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Amount:</span>
                <span className="font-semibold text-red-600">${dailyStats.todayAmount.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-600 flex items-center space-x-2">
              <span>📈</span>
              <span>Monthly Average</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Daily Avg:</span>
                <span className="font-semibold">
                  {expenses.length > 0 ? 
                    (expenses.reduce((sum, e) => sum + e.amount, 0) / expenses.length).toFixed(2) 
                    : '0.00'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Total:</span>
                <span className="font-semibold text-red-600">
                  ${expenses.reduce((sum, e) => sum + e.amount, 0).toFixed(2)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Expenses by Type */}
      {expenses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span>🏷️</span>
              <span>Expenses by Type</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              {(['medication', 'electricity', 'labor', 'other'] as ExpenseType[]).map((type) => {
                const typeExpenses = expenses.filter(e => e.expense_type === type);
                const typeAmount = typeExpenses.reduce((sum, e) => sum + e.amount, 0);
                const typeBadge = getExpenseTypeBadge(type);
                const percentage = expenses.length > 0 ? (typeAmount / expenses.reduce((sum, e) => sum + e.amount, 0) * 100) : 0;
                
                return (
                  <div key={type} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant={typeBadge.variant} className={typeBadge.color}>
                        {typeBadge.label}
                      </Badge>
                      <span className="text-sm text-gray-500">{typeExpenses.length}</span>
                    </div>
                    <div className="space-y-1">
                      <div className="text-2xl font-bold text-red-600">
                        ${typeAmount.toFixed(2)}
                      </div>
                      <div className="text-sm text-gray-600">
                        {percentage.toFixed(1)}% of total
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Expenses Records Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span>💸</span>
            <span>Expense Records</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {expenses.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">💸</div>
              <p className="text-gray-500 mb-4">No expenses recorded yet</p>
              <p className="text-sm text-gray-400">Add your first operational expense to get started</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses
                  .sort((a, b) => new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime())
                  .map((expense: OtherExpenses) => {
                    const typeBadge = getExpenseTypeBadge(expense.expense_type);
                    
                    return (
                      <TableRow key={expense.id}>
                        <TableCell>
                          {format(new Date(expense.expense_date), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell>
                          <Badge variant={typeBadge.variant} className={typeBadge.color}>
                            {typeBadge.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <div className="truncate font-medium">
                            {expense.description}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-bold text-red-600 text-lg">
                            ${expense.amount.toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleEdit(expense)}
                            >
                              Edit
                            </Button>
                            
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="destructive">
                                  Delete
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Expense Record</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete this expense record for "${expense.description}" 
                                    amounting to ${expense.amount.toFixed(2)}? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => handleDelete(expense.id)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Delete Expense
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Summary Stats */}
      {expenses.length > 0 && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-600">Total Records</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{expenses.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-600">Total Amount</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                ${expenses.reduce((sum, e) => sum + e.amount, 0).toFixed(2)}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-600">Average Expense</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${(expenses.reduce((sum, e) => sum + e.amount, 0) / expenses.length).toFixed(2)}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-600">Highest Expense</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                ${Math.max(...expenses.map(e => e.amount)).toFixed(2)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default OtherExpenses;