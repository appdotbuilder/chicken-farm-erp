import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/utils/trpc';
import type { RawFeedMaterial, CreateRawFeedMaterialInput, UpdateRawFeedMaterialInput } from '../../../server/src/schema';

function RawFeedMaterials() {
  const [materials, setMaterials] = useState<RawFeedMaterial[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<RawFeedMaterial | null>(null);
  
  const [formData, setFormData] = useState<CreateRawFeedMaterialInput>({
    name: '',
    price_per_kg: 0
  });

  const loadMaterials = useCallback(async () => {
    try {
      const result = await trpc.rawFeedMaterials.getAll.query();
      setMaterials(result);
    } catch (error) {
      console.error('Failed to load raw feed materials:', error);
    }
  }, []);

  useEffect(() => {
    loadMaterials();
  }, [loadMaterials]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      if (editingMaterial) {
        const updateData: UpdateRawFeedMaterialInput = {
          id: editingMaterial.id,
          name: formData.name || undefined,
          price_per_kg: formData.price_per_kg || undefined
        };
        const updated = await trpc.rawFeedMaterials.update.mutate(updateData);
        setMaterials((prev: RawFeedMaterial[]) => 
          prev.map(m => m.id === updated.id ? updated : m)
        );
      } else {
        const created = await trpc.rawFeedMaterials.create.mutate(formData);
        setMaterials((prev: RawFeedMaterial[]) => [...prev, created]);
      }
      
      setFormData({ name: '', price_per_kg: 0 });
      setIsDialogOpen(false);
      setEditingMaterial(null);
    } catch (error) {
      console.error('Failed to save raw feed material:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (material: RawFeedMaterial) => {
    setEditingMaterial(material);
    setFormData({
      name: material.name,
      price_per_kg: material.price_per_kg
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await trpc.rawFeedMaterials.delete.mutate({ id });
      setMaterials((prev: RawFeedMaterial[]) => prev.filter(m => m.id !== id));
    } catch (error) {
      console.error('Failed to delete raw feed material:', error);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', price_per_kg: 0 });
    setEditingMaterial(null);
    setIsDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Raw Feed Materials</h3>
          <p className="text-gray-600">Manage your raw materials inventory and pricing</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <span className="mr-2">➕</span>
              Add Material
            </Button>
          </DialogTrigger>
          
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingMaterial ? 'Edit Raw Material' : 'Add Raw Material'}
              </DialogTitle>
              <DialogDescription>
                {editingMaterial 
                  ? 'Update the raw material details below.'
                  : 'Enter the details for a new raw feed material.'
                }
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Material Name</label>
                <Input
                  placeholder="e.g., Corn, Soy meal, Wheat bran"
                  value={formData.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateRawFeedMaterialInput) => ({ 
                      ...prev, 
                      name: e.target.value 
                    }))
                  }
                  required
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Price per KG ($)</label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={formData.price_per_kg}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateRawFeedMaterialInput) => ({ 
                      ...prev, 
                      price_per_kg: parseFloat(e.target.value) || 0 
                    }))
                  }
                  step="0.01"
                  min="0"
                  required
                />
              </div>
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Saving...' : (editingMaterial ? 'Update' : 'Add')} Material
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Materials Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span>🌾</span>
            <span>Materials Inventory</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {materials.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">📦</div>
              <p className="text-gray-500 mb-4">No raw materials added yet</p>
              <p className="text-sm text-gray-400">Add your first raw material to get started</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Material Name</TableHead>
                  <TableHead>Price per KG</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Added Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {materials.map((material: RawFeedMaterial) => (
                  <TableRow key={material.id}>
                    <TableCell className="font-medium">
                      {material.name}
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold text-green-600">
                        ${material.price_per_kg.toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        Active
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-500">
                      {material.created_at.toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleEdit(material)}
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
                              <AlertDialogTitle>Delete Raw Material</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{material.name}"? 
                                This action cannot be undone and may affect existing feed formulations.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleDelete(material.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Delete Material
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Summary Stats */}
      {materials.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-600">Total Materials</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{materials.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-600">Average Price</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${(materials.reduce((sum, m) => sum + m.price_per_kg, 0) / materials.length).toFixed(2)}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-600">Highest Price</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${Math.max(...materials.map(m => m.price_per_kg)).toFixed(2)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default RawFeedMaterials;