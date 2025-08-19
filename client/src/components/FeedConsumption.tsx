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
  FeedConsumption, 
  CreateFeedConsumptionInput, 
  UpdateFeedConsumptionInput,
  ChickenFlock,
  FinishedFeed 
} from '../../../server/src/schema';

function FeedConsumption() {
  const [consumptions, setConsumptions] = useState<FeedConsumption[]>([]);
  const [flocks, setFlocks] = useState<ChickenFlock[]>([]);
  const [finishedFeeds, setFinishedFeeds] = useState<FinishedFeed[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingConsumption, setEditingConsumption] = useState<FeedConsumption | null>(null);
  const [consumptionDatePickerOpen, setConsumptionDatePickerOpen] = useState(false);
  
  const [formData, setFormData] = useState<CreateFeedConsumptionInput>({
    flock_id: 0,
    finished_feed_id: 0,
    consumption_date: new Date(),
    quantity_kg: 0
  });

  const loadData = useCallback(async () => {
    try {
      const [consumptionsResult, flocksResult, feedsResult] = await Promise.all([
        trpc.feedConsumptions.getAll.query(),
        trpc.chickenFlocks.getAll.query(),
        trpc.finishedFeeds.getAll.query()
      ]);
      setConsumptions(consumptionsResult);
      setFlocks(flocksResult);
      setFinishedFeeds(feedsResult);
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
      if (editingConsumption) {
        const updateData: UpdateFeedConsumptionInput = {
          id: editingConsumption.id,
          flock_id: formData.flock_id || undefined,
          finished_feed_id: formData.finished_feed_id || undefined,
          consumption_date: formData.consumption_date || undefined,
          quantity_kg: formData.quantity_kg || undefined
        };
        const updated = await trpc.feedConsumptions.update.mutate(updateData);
        setConsumptions((prev: FeedConsumption[]) => 
          prev.map(c => c.id === updated.id ? updated : c)
        );
      } else {
        const created = await trpc.feedConsumptions.create.mutate(formData);
        setConsumptions((prev: FeedConsumption[]) => [...prev, created]);
      }
      
      resetForm();
    } catch (error) {
      console.error('Failed to save feed consumption:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (consumption: FeedConsumption) => {
    setEditingConsumption(consumption);
    setFormData({
      flock_id: consumption.flock_id,
      finished_feed_id: consumption.finished_feed_id,
      consumption_date: new Date(consumption.consumption_date),
      quantity_kg: consumption.quantity_kg
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await trpc.feedConsumptions.delete.mutate({ id });
      setConsumptions((prev: FeedConsumption[]) => prev.filter(c => c.id !== id));
    } catch (error) {
      console.error('Failed to delete feed consumption:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      flock_id: 0,
      finished_feed_id: 0,
      consumption_date: new Date(),
      quantity_kg: 0
    });
    setEditingConsumption(null);
    setIsDialogOpen(false);
  };

  const getFlockName = (flockId: number) => {
    const flock = flocks.find(f => f.id === flockId);
    return flock ? flock.strain : 'Unknown Flock';
  };

  const getFeedName = (feedId: number) => {
    const feed = finishedFeeds.find(f => f.id === feedId);
    return feed ? feed.name : 'Unknown Feed';
  };

  const calculateDailyConsumptionStats = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todaysConsumption = consumptions.filter(c => {
      const consumptionDate = new Date(c.consumption_date);
      consumptionDate.setHours(0, 0, 0, 0);
      return consumptionDate.getTime() === today.getTime();
    });

    return {
      todayQuantity: todaysConsumption.reduce((sum, c) => sum + c.quantity_kg, 0),
      todayCost: todaysConsumption.reduce((sum, c) => sum + c.cost, 0)
    };
  };

  const dailyStats = calculateDailyConsumptionStats();

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Feed Consumption</h3>
          <p className="text-gray-600">Track daily feed consumption by flock</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <span className="mr-2">➕</span>
              Record Consumption
            </Button>
          </DialogTrigger>
          
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingConsumption ? 'Edit Feed Consumption' : 'Record Feed Consumption'}
              </DialogTitle>
              <DialogDescription>
                {editingConsumption 
                  ? 'Update the feed consumption details below.'
                  : 'Enter the feed consumption details for a flock.'
                }
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Flock</label>
                <Select
                  value={formData.flock_id.toString()}
                  onValueChange={(value) =>
                    setFormData((prev: CreateFeedConsumptionInput) => ({
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
                <label className="text-sm font-medium">Feed Type</label>
                <Select
                  value={formData.finished_feed_id.toString()}
                  onValueChange={(value) =>
                    setFormData((prev: CreateFeedConsumptionInput) => ({
                      ...prev,
                      finished_feed_id: parseInt(value)
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select feed" />
                  </SelectTrigger>
                  <SelectContent>
                    {finishedFeeds.map((feed: FinishedFeed) => (
                      <SelectItem key={feed.id} value={feed.id.toString()}>
                        {feed.name} (${feed.cost_per_kg.toFixed(2)}/kg)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium">Consumption Date</label>
                <Popover open={consumptionDatePickerOpen} onOpenChange={setConsumptionDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.consumption_date ? format(formData.consumption_date, 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.consumption_date}
                      onSelect={(date) => {
                        if (date) {
                          setFormData((prev: CreateFeedConsumptionInput) => ({ 
                            ...prev, 
                            consumption_date: date 
                          }));
                          setConsumptionDatePickerOpen(false);
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div>
                <label className="text-sm font-medium">Quantity (KG)</label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={formData.quantity_kg}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateFeedConsumptionInput) => ({ 
                      ...prev, 
                      quantity_kg: parseFloat(e.target.value) || 0 
                    }))
                  }
                  step="0.1"
                  min="0"
                  required
                />
                {formData.finished_feed_id > 0 && formData.quantity_kg > 0 && (
                  <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
                    <span className="text-blue-800">
                      Estimated cost: ${(formData.quantity_kg * 
                        (finishedFeeds.find(f => f.id === formData.finished_feed_id)?.cost_per_kg || 0)
                      ).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading || formData.flock_id === 0 || formData.finished_feed_id === 0}>
                  {isLoading ? 'Saving...' : (editingConsumption ? 'Update' : 'Record')} Consumption
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
              <span>Today's Consumption</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Quantity:</span>
                <span className="font-semibold">{dailyStats.todayQuantity.toFixed(1)} KG</span>
              </div>
              <div className="flex justify-between">
                <span>Cost:</span>
                <span className="font-semibold text-red-600">${dailyStats.todayCost.toFixed(2)}</span>
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
                  {consumptions.length > 0 ? 
                    (consumptions.reduce((sum, c) => sum + c.quantity_kg, 0) / consumptions.length).toFixed(1) 
                    : '0.0'} KG
                </span>
              </div>
              <div className="flex justify-between">
                <span>Cost Avg:</span>
                <span className="font-semibold text-red-600">
                  ${consumptions.length > 0 ? 
                    (consumptions.reduce((sum, c) => sum + c.cost, 0) / consumptions.length).toFixed(2) 
                    : '0.00'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Consumption Records Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span>🍽️</span>
            <span>Consumption Records</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {consumptions.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">🍽️</div>
              <p className="text-gray-500 mb-4">No consumption records yet</p>
              <p className="text-sm text-gray-400">Record your first feed consumption to get started</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Flock</TableHead>
                  <TableHead>Feed Type</TableHead>
                  <TableHead>Quantity (KG)</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Per Bird</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {consumptions
                  .sort((a, b) => new Date(b.consumption_date).getTime() - new Date(a.consumption_date).getTime())
                  .map((consumption: FeedConsumption) => {
                    const flock = flocks.find(f => f.id === consumption.flock_id);
                    const perBirdQuantity = flock && flock.current_count > 0 
                      ? (consumption.quantity_kg / flock.current_count * 1000).toFixed(0) 
                      : '0';
                    
                    return (
                      <TableRow key={consumption.id}>
                        <TableCell>
                          {format(new Date(consumption.consumption_date), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center space-x-2">
                            <span>{getFlockName(consumption.flock_id)}</span>
                            <Badge variant="outline" className="text-xs">
                              {flock?.current_count || 0} birds
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getFeedName(consumption.finished_feed_id)}
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold">{consumption.quantity_kg.toFixed(1)} KG</span>
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold text-red-600">
                            ${consumption.cost.toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-600">
                            {perBirdQuantity}g/bird
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleEdit(consumption)}
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
                                  <AlertDialogTitle>Delete Consumption Record</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete this consumption record? 
                                    This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => handleDelete(consumption.id)}
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
      {consumptions.length > 0 && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-600">Total Records</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{consumptions.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-600">Total Quantity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {consumptions.reduce((sum, c) => sum + c.quantity_kg, 0).toFixed(0)} KG
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-600">Total Cost</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                ${consumptions.reduce((sum, c) => sum + c.cost, 0).toFixed(2)}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-600">Avg Cost/KG</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${consumptions.length > 0 ? 
                  (consumptions.reduce((sum, c) => sum + c.cost, 0) / 
                   consumptions.reduce((sum, c) => sum + c.quantity_kg, 0)).toFixed(2) 
                  : '0.00'}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default FeedConsumption;