import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { trpc } from '@/utils/trpc';
import type { ChickenFlock, CreateChickenFlockInput, UpdateChickenFlockInput } from '../../../server/src/schema';

function ChickenFlocks() {
  const [flocks, setFlocks] = useState<ChickenFlock[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFlock, setEditingFlock] = useState<ChickenFlock | null>(null);
  const [entryDatePickerOpen, setEntryDatePickerOpen] = useState(false);
  
  const [formData, setFormData] = useState<CreateChickenFlockInput>({
    strain: '',
    entry_date: new Date(),
    initial_count: 0,
    age_upon_entry_days: 0
  });

  const loadFlocks = useCallback(async () => {
    try {
      const result = await trpc.chickenFlocks.getAll.query();
      setFlocks(result);
    } catch (error) {
      console.error('Failed to load chicken flocks:', error);
    }
  }, []);

  useEffect(() => {
    loadFlocks();
  }, [loadFlocks]);

  const calculateCurrentAge = (entryDate: Date, ageUponEntry: number) => {
    const today = new Date();
    const entryTime = new Date(entryDate);
    const daysSinceEntry = Math.floor((today.getTime() - entryTime.getTime()) / (1000 * 60 * 60 * 24));
    return ageUponEntry + daysSinceEntry;
  };

  const getFlockStatus = (flock: ChickenFlock) => {
    const currentAge = calculateCurrentAge(flock.entry_date, flock.age_upon_entry_days);
    if (currentAge < 140) return { status: 'Growing', color: 'bg-blue-100 text-blue-800' };
    if (currentAge < 450) return { status: 'Laying', color: 'bg-green-100 text-green-800' };
    return { status: 'Mature', color: 'bg-yellow-100 text-yellow-800' };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      if (editingFlock) {
        const updateData: UpdateChickenFlockInput = {
          id: editingFlock.id,
          strain: formData.strain || undefined,
          entry_date: formData.entry_date || undefined,
          initial_count: formData.initial_count || undefined,
          age_upon_entry_days: formData.age_upon_entry_days || undefined
        };
        const updated = await trpc.chickenFlocks.update.mutate(updateData);
        setFlocks((prev: ChickenFlock[]) => 
          prev.map(f => f.id === updated.id ? updated : f)
        );
      } else {
        const created = await trpc.chickenFlocks.create.mutate(formData);
        setFlocks((prev: ChickenFlock[]) => [...prev, created]);
      }
      
      resetForm();
    } catch (error) {
      console.error('Failed to save chicken flock:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (flock: ChickenFlock) => {
    setEditingFlock(flock);
    setFormData({
      strain: flock.strain,
      entry_date: new Date(flock.entry_date),
      initial_count: flock.initial_count,
      age_upon_entry_days: flock.age_upon_entry_days
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await trpc.chickenFlocks.delete.mutate({ id });
      setFlocks((prev: ChickenFlock[]) => prev.filter(f => f.id !== id));
    } catch (error) {
      console.error('Failed to delete chicken flock:', error);
    }
  };

  const handleUpdateCurrentCount = async (flock: ChickenFlock, newCount: number) => {
    try {
      const updateData: UpdateChickenFlockInput = {
        id: flock.id,
        current_count: newCount
      };
      const updated = await trpc.chickenFlocks.update.mutate(updateData);
      setFlocks((prev: ChickenFlock[]) => 
        prev.map(f => f.id === updated.id ? updated : f)
      );
    } catch (error) {
      console.error('Failed to update current count:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      strain: '',
      entry_date: new Date(),
      initial_count: 0,
      age_upon_entry_days: 0
    });
    setEditingFlock(null);
    setIsDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Chicken Flocks</h3>
          <p className="text-gray-600">Manage your chicken flocks and track their status</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <span className="mr-2">➕</span>
              Add Flock
            </Button>
          </DialogTrigger>
          
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingFlock ? 'Edit Chicken Flock' : 'Add Chicken Flock'}
              </DialogTitle>
              <DialogDescription>
                {editingFlock 
                  ? 'Update the flock details below.'
                  : 'Enter the details for a new chicken flock.'
                }
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Strain</label>
                <Input
                  placeholder="e.g., Rhode Island Red, Leghorn, Sussex"
                  value={formData.strain}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateChickenFlockInput) => ({ 
                      ...prev, 
                      strain: e.target.value 
                    }))
                  }
                  required
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Entry Date</label>
                <Popover open={entryDatePickerOpen} onOpenChange={setEntryDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.entry_date ? format(formData.entry_date, 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.entry_date}
                      onSelect={(date) => {
                        if (date) {
                          setFormData((prev: CreateChickenFlockInput) => ({ 
                            ...prev, 
                            entry_date: date 
                          }));
                          setEntryDatePickerOpen(false);
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Initial Count</label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={formData.initial_count}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateChickenFlockInput) => ({ 
                        ...prev, 
                        initial_count: parseInt(e.target.value) || 0 
                      }))
                    }
                    min="1"
                    required
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium">Age Upon Entry (days)</label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={formData.age_upon_entry_days}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateChickenFlockInput) => ({ 
                        ...prev, 
                        age_upon_entry_days: parseInt(e.target.value) || 0 
                      }))
                    }
                    min="0"
                    required
                  />
                </div>
              </div>
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Saving...' : (editingFlock ? 'Update' : 'Add')} Flock
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Flocks Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span>🐔</span>
            <span>Active Flocks</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {flocks.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">🐔</div>
              <p className="text-gray-500 mb-4">No flocks registered yet</p>
              <p className="text-sm text-gray-400">Add your first flock to get started</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Strain</TableHead>
                  <TableHead>Entry Date</TableHead>
                  <TableHead>Initial Count</TableHead>
                  <TableHead>Current Count</TableHead>
                  <TableHead>Current Age (days)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {flocks.map((flock: ChickenFlock) => {
                  const currentAge = calculateCurrentAge(flock.entry_date, flock.age_upon_entry_days);
                  const flockStatus = getFlockStatus(flock);
                  
                  return (
                    <TableRow key={flock.id}>
                      <TableCell className="font-medium">
                        {flock.strain}
                      </TableCell>
                      <TableCell>
                        {format(new Date(flock.entry_date), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold">{flock.initial_count}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Input
                            type="number"
                            value={flock.current_count}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              handleUpdateCurrentCount(flock, parseInt(e.target.value) || 0)
                            }
                            className="w-20 h-8"
                            min="0"
                          />
                          {flock.current_count < flock.initial_count && (
                            <Badge variant="destructive" className="text-xs">
                              -{flock.initial_count - flock.current_count}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold">{currentAge}</span>
                        <span className="text-sm text-gray-500 ml-1">
                          ({Math.floor(currentAge / 7)}w {currentAge % 7}d)
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={flockStatus.color}>
                          {flockStatus.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleEdit(flock)}
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
                                <AlertDialogTitle>Delete Chicken Flock</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete the "{flock.strain}" flock? 
                                  This action cannot be undone and will affect related records.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleDelete(flock.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Delete Flock
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
      {flocks.length > 0 && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-600">Total Flocks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{flocks.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-600">Total Chickens</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {flocks.reduce((sum, f) => sum + f.current_count, 0)}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-600">Laying Flocks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {flocks.filter(f => {
                  const age = calculateCurrentAge(f.entry_date, f.age_upon_entry_days);
                  return age >= 140 && age < 450;
                }).length}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-600">Mortality Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {flocks.length > 0 ? 
                  ((flocks.reduce((sum, f) => sum + (f.initial_count - f.current_count), 0) / 
                    flocks.reduce((sum, f) => sum + f.initial_count, 0)) * 100).toFixed(1)
                  : '0.0'}%
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default ChickenFlocks;