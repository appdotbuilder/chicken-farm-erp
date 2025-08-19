import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

// Import module components
import RawFeedMaterials from './components/RawFeedMaterials';
import FinishedFeeds from './components/FinishedFeeds';
import ChickenFlocks from './components/ChickenFlocks';
import FeedConsumption from './components/FeedConsumption';
import EggProduction from './components/EggProduction';
import EggSales from './components/EggSales';
import OtherExpenses from './components/OtherExpenses';
import ProfitReports from './components/ProfitReports';
import Dashboard from './components/Dashboard';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const modules = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊', component: Dashboard },
    { id: 'raw-materials', label: 'Raw Materials', icon: '🌾', component: RawFeedMaterials },
    { id: 'finished-feeds', label: 'Finished Feeds', icon: '🥫', component: FinishedFeeds },
    { id: 'flocks', label: 'Chicken Flocks', icon: '🐔', component: ChickenFlocks },
    { id: 'feed-consumption', label: 'Feed Consumption', icon: '🍽️', component: FeedConsumption },
    { id: 'egg-production', label: 'Egg Production', icon: '🥚', component: EggProduction },
    { id: 'egg-sales', label: 'Egg Sales', icon: '💰', component: EggSales },
    { id: 'other-expenses', label: 'Other Expenses', icon: '💸', component: OtherExpenses },
    { id: 'profit-reports', label: 'Profit Reports', icon: '📈', component: ProfitReports }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-yellow-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
                🐔
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">ChickenFarm ERP</h1>
                <p className="text-sm text-gray-600">Complete Farm Management System</p>
              </div>
            </div>
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              Farm Management
            </Badge>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          {/* Navigation */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Farm Operations</CardTitle>
            </CardHeader>
            <CardContent>
              <TabsList className="grid w-full grid-cols-3 lg:grid-cols-9 gap-2">
                {modules.map((module) => (
                  <TabsTrigger
                    key={module.id}
                    value={module.id}
                    className="flex flex-col items-center space-y-1 h-auto py-3 text-xs"
                  >
                    <span className="text-lg">{module.icon}</span>
                    <span className="hidden sm:block">{module.label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </CardContent>
          </Card>

          <Separator />

          {/* Module Content */}
          {modules.map((module) => (
            <TabsContent key={module.id} value={module.id} className="space-y-6">
              <div className="flex items-center space-x-3 mb-6">
                <span className="text-3xl">{module.icon}</span>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{module.label}</h2>
                  <p className="text-gray-600">Manage your farm's {module.label.toLowerCase()}</p>
                </div>
              </div>
              <module.component />
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}

export default App;