import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { trpc } from '@/utils/trpc';
import type { 
  FinishedFeed, 
  CreateFinishedFeedInput, 
  UpdateFinishedFeedInput,
  RawFeedMaterial,
  FeedComposition,
  CreateFeedCompositionInput
} from '../../../server/src/schema';

function FinishedFeeds() {
  const [feeds, setFeeds] = useState<FinishedFeed[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawFeedMaterial[]>([]);
  const [compositions, setCompositions] = useState<FeedComposition[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCompositionDialogOpen, setIsCompositionDialogOpen] = useState(false);
  const [editingFeed, setEditingFeed] = useState<FinishedFeed | null>(null);
  const [selectedFeedId, setSelectedFeedId] = useState<number | null>(null);
  
  const [formData, setFormData] = useState<CreateFinishedFeedInput>({
    name: ''
  });

  const [compositionData, setCompositionData] = useState<CreateFeedCompositionInput>({
    finished_feed_id: 0,
    raw_material_id: 0,
    percentage: 0
  });

  const loadData = useCallback(async () => {
    try {
      const [feedsResult, materialsResult, compositionsResult] = await Promise.all([
        trpc.finishedFeeds.getAll.query(),
        trpc.rawFeedMaterials.getAll.query(),
        trpc.feedCompositions.getAll.query()
      ]);
      setFeeds(feedsResult);
      setRawMaterials(materialsResult);
      setCompositions(compositionsResult);
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
      if (editingFeed) {
        const updateData: UpdateFinishedFeedInput = {
          id: editingFeed.id,
          name: formData.name || undefined
        };
        const updated = await trpc.finishedFeeds.update.mutate(updateData);
        setFeeds((prev: FinishedFeed[]) => 
          prev.map(f => f.id === updated.id ? updated : f)
        );
      } else {
        const created = await trpc.finishedFeeds.create.mutate(formData);
        setFeeds((prev: FinishedFeed[]) => [...prev, created]);
      }
      
      setFormData({ name: '' });
      setIsDialogOpen(false);
      setEditingFeed(null);
    } catch (error) {
      console.error('Failed to save finished feed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompositionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const created = await trpc.feedCompositions.create.mutate(compositionData);
      setCompositions((prev: FeedComposition[]) => [...prev, created]);
      
      // Recalculate feed cost
      if (selectedFeedId) {
        await trpc.finishedFeeds.calculateCost.query({ finishedFeedId: selectedFeedId });
        loadData(); // Reload to get updated costs
      }
      
      setCompositionData({
        finished_feed_id: selectedFeedId || 0,
        raw_material_id: 0,
        percentage: 0
      });
    } catch (error) {
      console.error('Failed to add composition:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (feed: FinishedFeed) => {
    setEditingFeed(feed);
    setFormData({ name: feed.name });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await trpc.finishedFeeds.delete.mutate({ id });
      setFeeds((prev: FinishedFeed[]) => prev.filter(f => f.id !== id));
    } catch (error) {
      console.error('Failed to delete finished feed:', error);
    }
  };

  const handleManageComposition = (feed: FinishedFeed) => {
    setSelectedFeedId(feed.id);
    setCompositionData({
      finished_feed_id: feed.id,
      raw_material_id: 0,
      percentage: 0
    });
    setIsCompositionDialogOpen(true);
  };

  const handleDeleteComposition = async (compositionId: number) => {
    try {
      await trpc.feedCompositions.delete.mutate({ id: compositionId });
      setCompositions((prev: FeedComposition[]) => prev.filter(c => c.id !== compositionId));
      
      // Recalculate feed cost
      if (selectedFeedId) {
        await trpc.finishedFeeds.calculateCost.query({ finishedFeedId: selectedFeedId });
        loadData();
      }
    } catch (error) {
      console.error('Failed to delete composition:', error);
    }
  };

  const resetForm = () => {
    setFormData({ name: '' });
    setEditingFeed(null);
    setIsDialogOpen(false);
  };

  const resetCompositionForm = () => {
    setCompositionData({
      finished_feed_id: 0,
      raw_material_id: 0,
      percentage: 0
    });
    setSelectedFeedId(null);
    setIsCompositionDialogOpen(false);
  };

  const getFeedCompositions = (feedId: number) => {
    return compositions.filter(c => c.finished_feed_id === feedId);
  };

  const getTotalPercentage = (feedId: number) => {
    return getFeedCompositions(feedId).reduce((sum, comp) => sum + comp.percentage, 0);
  };

  const getRemainingPercentage = (feedId: number) => {
    return Math.max(0, 100 - getTotalPercentage(feedId));
  };

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Finished Feed Products</h3>
          <p className="text-gray-600">Create and manage feed formulations with composition</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <span className="mr-2">➕</span>
              Add Feed Product
            </Button>
          </DialogTrigger>
          
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingFeed ? 'Edit Feed Product' : 'Add Feed Product'}
              </DialogTitle>
              <DialogDescription>
                {editingFeed 
                  ? 'Update the feed product details below.'
                  : 'Enter the details for a new finished feed product.'
                }
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Feed Name</label>
                <Input
                  placeholder="e.g., Laying Hen Feed, Broiler Starter"
                  value={formData.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateFinishedFeedInput) => ({ 
                      ...prev, 
                      name: e.target.value 
                    }))
                  }
                  required
                />
              </div>
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Saving...' : (editingFeed ? 'Update' : 'Add')} Feed
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Feed Composition Dialog */}
      <Dialog open={isCompositionDialogOpen} onOpenChange={setIsCompositionDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              Manage Feed Composition
            </DialogTitle>
            <DialogDescription>
              Define the raw material composition for this feed product.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Current Compositions */}
            {selectedFeedId && (
              <div>
                <h4 className="font-semibold mb-3">Current Composition</h4>
                <div className="space-y-2">
                  {getFeedCompositions(selectedFeedId).map((comp: FeedComposition) => {
                    const material = rawMaterials.find(m => m.id === comp.raw_material_id);
                    return (
                      <div key={comp.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <span className="font-medium">{material?.name || 'Unknown'}</span>
                          <Badge>{comp.percentage}%</Badge>
                        </div>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteComposition(comp.id)}
                        >
                          Remove
                        </Button>
                      </div>
                    );
                  })}
                  
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span>Total Percentage:</span>
                      <span className="font-semibold">
                        {getTotalPercentage(selectedFeedId)}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Remaining:</span>
                      <span className="font-semibold text-blue-600">
                        {getRemainingPercentage(selectedFeedId)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <Separator />
            
            {/* Add New Composition */}
            <form onSubmit={handleCompositionSubmit} className="space-y-4">
              <h4 className="font-semibold">Add Raw Material</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Raw Material</label>
                  <Select
                    value={compositionData.raw_material_id.toString()}
                    onValueChange={(value) =>
                      setCompositionData((prev: CreateFeedCompositionInput) => ({
                        ...prev,
                        raw_material_id: parseInt(value)
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select material" />
                    </SelectTrigger>
                    <SelectContent>
                      {rawMaterials.map((material: RawFeedMaterial) => (
                        <SelectItem key={material.id} value={material.id.toString()}>
                          {material.name} (${material.price_per_kg.toFixed(2)}/kg)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Percentage (%)</label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={compositionData.percentage}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setCompositionData((prev: CreateFeedCompositionInput) => ({
                        ...prev,
                        percentage: parseFloat(e.target.value) || 0
                      }))
                    }
                    step="0.1"
                    min="0"
                    max={selectedFeedId ? getRemainingPercentage(selectedFeedId) : 100}
                    required
                  />
                </div>
              </div>
              
              <div className="flex justify-between">
                <Button type="button" variant="outline" onClick={resetCompositionForm}>
                  Close
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading || compositionData.raw_material_id === 0}
                >
                  {isLoading ? 'Adding...' : 'Add Material'}
                </Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Feeds Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span>🥫</span>
            <span>Feed Products</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {feeds.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">🥫</div>
              <p className="text-gray-500 mb-4">No feed products created yet</p>
              <p className="text-sm text-gray-400">Create your first feed formulation to get started</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Feed Name</TableHead>
                  <TableHead>Cost per KG</TableHead>
                  <TableHead>Composition</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {feeds.map((feed: FinishedFeed) => {
                  const totalPercentage = getTotalPercentage(feed.id);
                  const isComplete = totalPercentage === 100;
                  
                  return (
                    <TableRow key={feed.id}>
                      <TableCell className="font-medium">
                        {feed.name}
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold text-green-600">
                          ${feed.cost_per_kg.toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm">
                            {totalPercentage}%
                          </span>
                          <Badge 
                            variant={isComplete ? "default" : "secondary"}
                            className={isComplete ? "bg-green-100 text-green-800" : ""}
                          >
                            {isComplete ? "Complete" : "Incomplete"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                          Active
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-500">
                        {feed.created_at.toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleManageComposition(feed)}
                          >
                            Composition
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleEdit(feed)}
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
                                <AlertDialogTitle>Delete Feed Product</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{feed.name}"? 
                                  This action cannot be undone and may affect feed consumption records.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleDelete(feed.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Delete Feed
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
      {feeds.length > 0 && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-600">Total Feeds</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{feeds.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-600">Complete Formulations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {feeds.filter(f => getTotalPercentage(f.id) === 100).length}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-600">Average Cost/KG</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${feeds.length > 0 ? (feeds.reduce((sum, f) => sum + f.cost_per_kg, 0) / feeds.length).toFixed(2) : '0.00'}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-600">Total Compositions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{compositions.length}</div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default FinishedFeeds;