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
  EggSales, 
  CreateEggSalesInput, 
  UpdateEggSalesInput,
  EggQuality
} from '../../../server/src/schema';

function EggSales() {
  const [sales, setSales] = useState<EggSales[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<EggSales | null>(null);
  const [saleDatePickerOpen, setSaleDatePickerOpen] = useState(false);
  
  const [formData, setFormData] = useState<CreateEggSalesInput>({
    sale_date: new Date(),
    quality: 'A' as EggQuality,
    quantity: 0,
    price_per_egg: 0
  });

  const loadSales = useCallback(async () => {
    try {
      const result = await trpc.eggSales.getAll.query();
      setSales(result);
    } catch (error) {
      console.error('Failed to load egg sales:', error);
    }
  }, []);

  useEffect(() => {
    loadSales();
  }, [loadSales]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      if (editingSale) {
        const updateData: UpdateEggSalesInput = {
          id: editingSale.id,
          sale_date: formData.sale_date || undefined,
          quality: formData.quality || undefined,
          quantity: formData.quantity || undefined,
          price_per_egg: formData.price_per_egg || undefined
        };
        const updated = await trpc.eggSales.update.mutate(updateData);
        setSales((prev: EggSales[]) => 
          prev.map(s => s.id === updated.id ? updated : s)
        );
      } else {
        const created = await trpc.eggSales.create.mutate(formData);
        setSales((prev: EggSales[]) => [...prev, created]);
      }
      
      resetForm();
    } catch (error) {
      console.error('Failed to save egg sale:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (sale: EggSales) => {
    setEditingSale(sale);
    setFormData({
      sale_date: new Date(sale.sale_date),
      quality: sale.quality,
      quantity: sale.quantity,
      price_per_egg: sale.price_per_egg
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await trpc.eggSales.delete.mutate({ id });
      setSales((prev: EggSales[]) => prev.filter(s => s.id !== id));
    } catch (error) {
      console.error('Failed to delete egg sale:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      sale_date: new Date(),
      quality: 'A' as EggQuality,
      quantity: 0,
      price_per_egg: 0
    });
    setEditingSale(null);
    setIsDialogOpen(false);
  };

  const getQualityBadge = (quality: EggQuality) => {
    const variants = {
      'A': { variant: 'default' as const, color: 'bg-green-100 text-green-800', label: '🥇 Grade A', icon: '🥇' },
      'B': { variant: 'secondary' as const, color: 'bg-yellow-100 text-yellow-800', label: '🥈 Grade B', icon: '🥈' },
      'cracked': { variant: 'destructive' as const, color: 'bg-red-100 text-red-800', label: '💔 Cracked', icon: '💔' }
    };
    
    return variants[quality] || variants['A'];
  };

  const calculateDailySalesStats = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todaysSales = sales.filter(s => {
      const saleDate = new Date(s.sale_date);
      saleDate.setHours(0, 0, 0, 0);
      return saleDate.getTime() === today.getTime();
    });

    return {
      todayQuantity: todaysSales.reduce((sum, s) => sum + s.quantity, 0),
      todayRevenue: todaysSales.reduce((sum, s) => sum + s.total_price, 0),
      todayAvgPrice: todaysSales.length > 0 
        ? todaysSales.reduce((sum, s) => sum + s.price_per_egg, 0) / todaysSales.length 
        : 0
    };
  };

  const calculateTotalPrice = (quantity: number, pricePerEgg: number) => {
    return quantity * pricePerEgg;
  };

  const dailyStats = calculateDailySalesStats();

  // Predefined common prices for quick selection
  const commonPrices = {
    'A': [0.25, 0.30, 0.35, 0.40],
    'B': [0.20, 0.25, 0.30, 0.35],
    'cracked': [0.10, 0.15, 0.20, 0.25]
  };

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Egg Sales</h3>
          <p className="text-gray-600">Track and manage egg sales transactions</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <span className="mr-2">➕</span>
              Record Sale
            </Button>
          </DialogTrigger>
          
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingSale ? 'Edit Egg Sale' : 'Record Egg Sale'}
              </DialogTitle>
              <DialogDescription>
                {editingSale 
                  ? 'Update the egg sale details below.'
                  : 'Enter the details for a new egg sale transaction.'
                }
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Sale Date</label>
                <Popover open={saleDatePickerOpen} onOpenChange={setSaleDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.sale_date ? format(formData.sale_date, 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.sale_date}
                      onSelect={(date) => {
                        if (date) {
                          setFormData((prev: CreateEggSalesInput) => ({ 
                            ...prev, 
                            sale_date: date 
                          }));
                          setSaleDatePickerOpen(false);
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
                      setFormData((prev: CreateEggSalesInput) => ({
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
                      <SelectItem value="cracked">💔 Cracked (Discounted)</SelectItem>
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
                      setFormData((prev: CreateEggSalesInput) => ({ 
                        ...prev, 
                        quantity: parseInt(e.target.value) || 0 
                      }))
                    }
                    min="1"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Price per Egg ($)</label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={formData.price_per_egg}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateEggSalesInput) => ({ 
                      ...prev, 
                      price_per_egg: parseFloat(e.target.value) || 0 
                    }))
                  }
                  step="0.01"
                  min="0"
                  required
                />
                
                {/* Quick Price Selection */}
                <div className="mt-2">
                  <span className="text-xs text-gray-600">Quick prices: </span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {commonPrices[formData.quality].map((price) => (
                      <Button
                        key={price}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-xs h-6 px-2"
                        onClick={() =>
                          setFormData((prev: CreateEggSalesInput) => ({
                            ...prev,
                            price_per_egg: price
                          }))
                        }
                      >
                        ${price.toFixed(2)}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Total Price Preview */}
              {formData.quantity > 0 && formData.price_per_egg > 0 && (
                <div className="mt-4 p-3 bg-green-50 rounded-lg">
                  <div className="text-sm text-green-800">
                    <div className="flex justify-between items-center">
                      <span>Total Sale Value:</span>
                      <span className="font-bold text-lg">
                        ${calculateTotalPrice(formData.quantity, formData.price_per_egg).toFixed(2)}
                      </span>
                    </div>
                    <div className="text-xs text-green-600 mt-1">
                      {formData.quantity} × ${formData.price_per_egg.toFixed(2)}
                    </div>
                  </div>
                </div>
              )}
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading || formData.quantity === 0 || formData.price_per_egg === 0}>
                  {isLoading ? 'Saving...' : (editingSale ? 'Update' : 'Record')} Sale
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Daily Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-600 flex items-center space-x-2">
              <span>🥚</span>
              <span>Today's Quantity</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dailyStats.todayQuantity}</div>
            <div className="text-xs text-gray-500">eggs sold</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-600 flex items-center space-x-2">
              <span>💰</span>
              <span>Today's Revenue</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${dailyStats.todayRevenue.toFixed(2)}</div>
            <div className="text-xs text-gray-500">total sales</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-600 flex items-center space-x-2">
              <span>📊</span>
              <span>Average Price</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">${dailyStats.todayAvgPrice.toFixed(2)}</div>
            <div className="text-xs text-gray-500">per egg</div>
          </CardContent>
        </Card>
      </div>

      {/* Sales Records Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span>💰</span>
            <span>Sales Records</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sales.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">💰</div>
              <p className="text-gray-500 mb-4">No sales recorded yet</p>
              <p className="text-sm text-gray-400">Record your first egg sale to get started</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Quality</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Price/Egg</TableHead>
                  <TableHead>Total Price</TableHead>
                  <TableHead>Profit Margin</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales
                  .sort((a, b) => new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime())
                  .map((sale: EggSales) => {
                    const qualityBadge = getQualityBadge(sale.quality);
                    
                    return (
                      <TableRow key={sale.id}>
                        <TableCell>
                          {format(new Date(sale.sale_date), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell>
                          <Badge variant={qualityBadge.variant} className={qualityBadge.color}>
                            {qualityBadge.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold text-lg">{sale.quantity.toLocaleString()}</span>
                          <span className="text-sm text-gray-500 ml-1">eggs</span>
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold">${sale.price_per_egg.toFixed(2)}</span>
                        </TableCell>
                        <TableCell>
                          <span className="font-bold text-green-600 text-lg">
                            ${sale.total_price.toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                            {/* Assuming average production cost of $0.15 per egg */}
                            {((sale.price_per_egg - 0.15) / sale.price_per_egg * 100).toFixed(0)}%
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleEdit(sale)}
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
                                  <AlertDialogTitle>Delete Sale Record</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete this sales record for {sale.quantity} {getQualityBadge(sale.quality).label} eggs worth ${sale.total_price.toFixed(2)}? 
                                    This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => handleDelete(sale.id)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Delete Sale
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
      {sales.length > 0 && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-600">Total Sales</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{sales.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-600">Total Eggs Sold</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {sales.reduce((sum, s) => sum + s.quantity, 0).toLocaleString()}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-600">Total Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                ${sales.reduce((sum, s) => sum + s.total_price, 0).toFixed(2)}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-600">Average Price/Egg</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${sales.length > 0 ? 
                  (sales.reduce((sum, s) => sum + s.price_per_egg, 0) / sales.length).toFixed(2) 
                  : '0.00'}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quality Breakdown */}
      {sales.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span>📈</span>
              <span>Sales by Quality</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {(['A', 'B', 'cracked'] as EggQuality[]).map((quality) => {
                const qualitySales = sales.filter(s => s.quality === quality);
                const qualityQuantity = qualitySales.reduce((sum, s) => sum + s.quantity, 0);
                const qualityRevenue = qualitySales.reduce((sum, s) => sum + s.total_price, 0);
                const qualityBadge = getQualityBadge(quality);
                
                return (
                  <div key={quality} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant={qualityBadge.variant} className={qualityBadge.color}>
                        {qualityBadge.label}
                      </Badge>
                      <span className="text-sm text-gray-500">{qualitySales.length} sales</span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-sm">Quantity:</span>
                        <span className="font-semibold">{qualityQuantity.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Revenue:</span>
                        <span className="font-semibold text-green-600">${qualityRevenue.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Avg Price:</span>
                        <span className="font-semibold">
                          ${qualitySales.length > 0 ? 
                            (qualitySales.reduce((sum, s) => sum + s.price_per_egg, 0) / qualitySales.length).toFixed(2) 
                            : '0.00'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default EggSales;