import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  EggProduction, 
  CreateEggProductionInput, 
  UpdateEggProductionInput,
  ChickenFlock,
  EggQuality
} from '../../../server/src/schema';

function EggProduction() {
  const [productions, setProductions] = useState<EggProduction[]>([]);
  const [flocks, setFlocks] = useState<ChickenFlock[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduction, setEditingProduction] = useState<EggProduction | null>(null);
  const [productionDatePickerOpen, setProductionDatePickerOpen] = useState(false);
  
  const [formData, setFormData] = useState<CreateEggProductionInput>({
    flock_id: 0,
    production_date: new Date(),
    quality: 'A' as EggQuality,
    quantity: 0
  });

  const loadData = useCallback(async () => {
    try {
      const [productionsResult, flocksResult] = await Promise.all([
        trpc.eggProductions.getAll.query(),
        trpc.chickenFlocks.getAll.query()
      ]);
      setProductions(productionsResult);
      setFlocks(flocksResult);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      if (editingProduction) {
        const updateData: UpdateEggProductionInput = {
          id: editingProduction.id,
          flock_id: formData.flock_id || undefined,
          production_date: formData.production_date || undefined,
          quality: formData.quality || undefined,
          quantity: formData.quantity || undefined
        };
        const updated = await trpc.eggProductions.update.mutate(updateData);
        setProductions((prev: EggProduction[]) => 
          prev.map(p => p.id === updated.id ? updated : p)
        );
      } else {
        const created = await trpc.eggProductions.create.mutate(formData);
        setProductions((prev: EggProduction[]) => [...prev, created]);
      }
      
      resetForm();
    } catch (error) {
      console.error('Failed to save egg production:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (production: EggProduction) => {
    setEditingProduction(production);
    setFormData({
      flock_id: production.flock_id,
      production_date: new Date(production.production_date),
      quality: production.quality,
      quantity: production.quantity
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await trpc.eggProductions.delete.mutate({ id });
      setProductions((prev: EggProduction[]) => prev.filter(p => p.id !== id));
    } catch (error) {
      console.error('Failed to delete egg production:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      flock_id: 0,
      production_date: new Date(),
      quality: 'A' as EggQuality,
      quantity: 0
    });
    setEditingProduction(null);
    setIsDialogOpen(false);
  };

  const getFlockName = (flockId: number) => {
    const flock = flocks.find(f => f.id === flockId);
    return flock ? flock.strain : 'Unknown Flock';
  };

  const getQualityBadge = (quality: EggQuality) => {
    const variants = {
      'A': { variant: 'default' as const, color: 'bg-green-100 text-green-800', label: '🥇 Grade A' },
      'B': { variant: 'secondary' as const, color: 'bg-yellow-100 text-yellow-800', label: '🥈 Grade B' },
      'cracked': { variant: 'destructive' as const, color: 'bg-red-100 text-red-800', label: '💔 Cracked' }
    };
    
    return variants[quality] || variants['A'];
  };

  const calculateDailyProductionStats = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todaysProduction = productions.filter(p => {
      const productionDate = new Date(p.production_date);
      productionDate.setHours(0, 0, 0, 0);
      return productionDate.getTime() === today.getTime();
    });

    const totalBirds = flocks.reduce((sum, f) => sum + f.current_count, 0);

    const stats = {
      todayTotal: todaysProduction.reduce((sum, p) => sum + p.quantity, 0),
      todayA: todaysProduction.filter(p => p.quality === 'A').reduce((sum, p) => sum + p.quantity, 0),
      todayB: todaysProduction.filter(p => p.quality === 'B').reduce((sum, p) => sum + p.quantity, 0),
      todayCracked: todaysProduction.filter(p => p.quality === 'cracked').reduce((sum, p) => sum + p.quantity, 0),
      layingRate: 0
    };

    stats.layingRate = totalBirds > 0 ? (stats.todayTotal / totalBirds) * 100 : 0;

    return stats;
  };

  const dailyStats = calculateDailyProductionStats();

  const calculateProductionRate = (flock: ChickenFlock, production: EggProduction) => {
    return flock.current_count > 0 ? (production.quantity / flock.current_count * 100).toFixed(1) : '0.0';
  };

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Egg Production</h3>
          <p className="text-gray-600">Track daily egg production by quality and flock</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <span className="mr-2">➕</span>
              Record Production
            </Button>
          </DialogTrigger>
          
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingProduction ? 'Edit Egg Production' : 'Record Egg Production'}
              </DialogTitle>
              <DialogDescription>
                {editingProduction 
                  ? 'Update the egg production details below.'
                  : 'Enter the egg production details for a flock.'
                }
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Flock</label>
                <Select
                  value={formData.flock_id.toString()}
                  onValueChange={(value) =>
                    setFormData((prev: CreateEggProductionInput) => ({
                      ...prev,
                      flock_id: parseInt(value)
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select flock" />
                  </SelectTrigger>
                  <SelectContent>
                    {flocks.map((flock: ChickenFlock) => (
                      <SelectItem key={flock.id} value={flock.id.toString()}>
                        {flock.strain} ({flock.current_count} chickens)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium">Production Date</label>
                <Popover open={productionDatePickerOpen} onOpenChange={setProductionDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.production_date ? format(formData.production_date, 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.production_date}
                      onSelect={(date) => {
                        if (date) {
                          setFormData((prev: CreateEggProductionInput) => ({ 
                            ...prev, 
                            production_date: date 
                          }));
                          setProductionDatePickerOpen(false);
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Quality</label>
                  <Select
                    value={formData.quality}
                    onValueChange={(value: EggQuality) =>
                      setFormData((prev: CreateEggProductionInput) => ({
                        ...prev,
                        quality: value
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select quality" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A">🥇 Grade A (Premium)</SelectItem>
                      <SelectItem value="B">🥈 Grade B (Standard)</SelectItem>
                      <SelectItem value="cracked">💔 Cracked</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Quantity</label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={formData.quantity}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateEggProductionInput) => ({ 
                        ...prev, 
                        quantity: parseInt(e.target.value) || 0 
                      }))
                    }
                    min="0"
                    required
                  />
                </div>
              </div>

              {formData.flock_id > 0 && formData.quantity > 0 && (
                <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                  <div className="text-sm text-blue-800">
                    <div className="flex justify-between">
                      <span>Production Rate:</span>
                      <span className="font-semibold">
                        {(() => {
                          const flock = flocks.find(f => f.id === formData.flock_id);
                          return flock && flock.current_count > 0 
                            ? `${(formData.quantity / flock.current_count * 100).toFixed(1)}%`
                            : '0.0%';
                        })()}
                      </span>
                    </div>
                  </div>
                </div>
              )}
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading || formData.flock_id === 0}>
                  {isLoading ? 'Saving...' : (editingProduction ? 'Update' : 'Record')} Production
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Daily Summary */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-600 flex items-center space-x-2">
              <span>🥚</span>
              <span>Today's Total</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dailyStats.todayTotal}</div>
            <div className="text-xs text-gray-500">
              Laying Rate: {dailyStats.layingRate.toFixed(1)}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-600 flex items-center space-x-2">
              <span>🥇</span>
              <span>Grade A</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{dailyStats.todayA}</div>
            <div className="text-xs text-gray-500">
              {dailyStats.todayTotal > 0 ? ((dailyStats.todayA / dailyStats.todayTotal) * 100).toFixed(1) : 0}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-600 flex items-center space-x-2">
              <span>🥈</span>
              <span>Grade B</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{dailyStats.todayB}</div>
            <div className="text-xs text-gray-500">
              {dailyStats.todayTotal > 0 ? ((dailyStats.todayB / dailyStats.todayTotal) * 100).toFixed(1) : 0}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-600 flex items-center space-x-2">
              <span>💔</span>
              <span>Cracked</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{dailyStats.todayCracked}</div>
            <div className="text-xs text-gray-500">
              {dailyStats.todayTotal > 0 ? ((dailyStats.todayCracked / dailyStats.todayTotal) * 100).toFixed(1) : 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Production Records Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span>🥚</span>
            <span>Production Records</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {productions.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">🥚</div>
              <p className="text-gray-500 mb-4">No production records yet</p>
              <p className="text-sm text-gray-400">Record your first egg production to get started</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Flock</TableHead>
                  <TableHead>Quality</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Production Rate</TableHead>
                  <TableHead>Per Bird</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productions
                  .sort((a, b) => new Date(b.production_date).getTime() - new Date(a.production_date).getTime())
                  .map((production: EggProduction) => {
                    const flock = flocks.find(f => f.id === production.flock_id);
                    const qualityBadge = getQualityBadge(production.quality);
                    const productionRate = flock ? calculateProductionRate(flock, production) : '0.0';
                    
                    return (
                      <TableRow key={production.id}>
                        <TableCell>
                          {format(new Date(production.production_date), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center space-x-2">
                            <span>{getFlockName(production.flock_id)}</span>
                            <Badge variant="outline" className="text-xs">
                              {flock?.current_count || 0} birds
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={qualityBadge.variant} className={qualityBadge.color}>
                            {qualityBadge.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold text-2xl">{production.quantity}</span>
                          <span className="text-sm text-gray-500 ml-1">eggs</span>
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold text-blue-600">{productionRate}%</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-600">
                            {flock && flock.current_count > 0 
                              ? (production.quantity / flock.current_count).toFixed(2) 
                              : '0.00'} eggs/bird
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleEdit(production)}
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
                                  <AlertDialogTitle>Delete Production Record</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete this production record? 
                                    This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => handleDelete(production.id)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Delete Record
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
      {productions.length > 0 && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-600">Total Records</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{productions.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-600">Total Eggs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {productions.reduce((sum, p) => sum + p.quantity, 0).toLocaleString()}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-600">Grade A Percentage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {(() => {
                  const totalEggs = productions.reduce((sum, p) => sum + p.quantity, 0);
                  const gradeAEggs = productions.filter(p => p.quality === 'A').reduce((sum, p) => sum + p.quantity, 0);
                  return totalEggs > 0 ? ((gradeAEggs / totalEggs) * 100).toFixed(1) : '0.0';
                })()}%
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-600">Avg Daily Production</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {productions.length > 0 ? 
                  (productions.reduce((sum, p) => sum + p.quantity, 0) / productions.length).toFixed(0) 
                  : '0'}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default EggProduction;