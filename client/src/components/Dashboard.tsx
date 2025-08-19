import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { trpc } from '@/utils/trpc';
import type { ChickenFlock, EggProduction, FeedConsumption, EggSales, OtherExpenses, RawFeedMaterial, FinishedFeed } from '../../../server/src/schema';

function Dashboard() {
  const [dashboardData, setDashboardData] = useState({
    totalFlocks: 0,
    totalChickens: 0,
    todaysEggProduction: 0,
    monthlyRevenue: 0,
    monthlyExpenses: 0,
    monthlyProfit: 0,
    recentActivity: [] as any[]
  });
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Load basic data
      const [flocks, rawMaterials, finishedFeeds] = await Promise.all([
        trpc.chickenFlocks.getAll.query(),
        trpc.rawFeedMaterials.getAll.query(),
        trpc.finishedFeeds.getAll.query()
      ]);

      // Calculate current month date range
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      // Load monthly data
      const [monthlyRevenue, monthlyFeedCost, monthlyOtherExpenses, todaysProduction] = await Promise.all([
        trpc.eggSales.getTotalRevenueByDateRange.query({ 
          startDate: startOfMonth, 
          endDate: endOfMonth 
        }),
        trpc.feedConsumptions.getTotalCostByDateRange.query({ 
          startDate: startOfMonth, 
          endDate: endOfMonth 
        }),
        trpc.otherExpenses.getTotalByDateRange.query({ 
          startDate: startOfMonth, 
          endDate: endOfMonth 
        }),
        trpc.eggProductions.getByDateRange.query({
          startDate: new Date(now.setHours(0, 0, 0, 0)),
          endDate: new Date(now.setHours(23, 59, 59, 999))
        })
      ]);

      const totalChickens = flocks.reduce((sum: number, flock: ChickenFlock) => sum + flock.current_count, 0);
      const todaysEggs = todaysProduction.reduce((sum: number, production: EggProduction) => sum + production.quantity, 0);
      const totalExpenses = monthlyFeedCost + monthlyOtherExpenses;
      const profit = monthlyRevenue - totalExpenses;

      setDashboardData({
        totalFlocks: flocks.length,
        totalChickens,
        todaysEggProduction: todaysEggs,
        monthlyRevenue,
        monthlyExpenses: totalExpenses,
        monthlyProfit: profit,
        recentActivity: [
          { type: 'info', message: `${flocks.length} active flocks with ${totalChickens} chickens total` },
          { type: 'success', message: `${todaysEggs} eggs produced today` },
          { type: 'info', message: `${rawMaterials.length} raw materials in inventory` },
          { type: 'info', message: `${finishedFeeds.length} finished feed formulations` }
        ]
      });
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const stats = [
    {
      title: 'Total Flocks',
      value: dashboardData.totalFlocks,
      icon: '🐔',
      color: 'bg-blue-500'
    },
    {
      title: 'Total Chickens',
      value: dashboardData.totalChickens,
      icon: '🥚',
      color: 'bg-green-500'
    },
    {
      title: 'Today\'s Egg Production',
      value: dashboardData.todaysEggProduction,
      icon: '📊',
      color: 'bg-yellow-500'
    },
    {
      title: 'Monthly Revenue',
      value: `$${dashboardData.monthlyRevenue.toFixed(2)}`,
      icon: '💰',
      color: 'bg-emerald-500'
    },
    {
      title: 'Monthly Expenses',
      value: `$${dashboardData.monthlyExpenses.toFixed(2)}`,
      icon: '💸',
      color: 'bg-red-500'
    },
    {
      title: 'Monthly Profit',
      value: `$${dashboardData.monthlyProfit.toFixed(2)}`,
      icon: '📈',
      color: dashboardData.monthlyProfit >= 0 ? 'bg-green-500' : 'bg-red-500'
    }
  ];

  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-3/4"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {stat.title}
              </CardTitle>
              <div className={`w-8 h-8 ${stat.color} rounded-lg flex items-center justify-center text-white text-sm`}>
                {stat.icon}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity & Quick Actions */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span>📋</span>
              <span>Recent Activity</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {dashboardData.recentActivity.map((activity, index) => (
              <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <Badge variant={activity.type === 'success' ? 'default' : 'secondary'}>
                  {activity.type === 'success' ? '✅' : 'ℹ️'}
                </Badge>
                <span className="text-sm text-gray-700">{activity.message}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span>⚡</span>
              <span>Quick Actions</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3">
              <Button className="w-full justify-start" variant="outline">
                <span className="mr-2">🥚</span>
                Record Egg Production
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <span className="mr-2">🍽️</span>
                Log Feed Consumption
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <span className="mr-2">💰</span>
                Record Egg Sale
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <span className="mr-2">💸</span>
                Add Expense
              </Button>
            </div>
            <Separator />
            <Button className="w-full" variant="default">
              <span className="mr-2">📊</span>
              Generate Profit Report
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Performance Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span>📈</span>
            <span>Monthly Performance</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Revenue:</span>
              <span className="font-semibold text-green-600">${dashboardData.monthlyRevenue.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Feed Costs:</span>
              <span className="font-semibold text-red-600">-${(dashboardData.monthlyExpenses).toFixed(2)}</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center text-lg">
              <span className="font-semibold">Net Profit:</span>
              <span className={`font-bold ${dashboardData.monthlyProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${dashboardData.monthlyProfit.toFixed(2)}
              </span>
            </div>
            <div className="mt-4">
              <div className="text-sm text-gray-600 mb-2">
                Profit Margin: {dashboardData.monthlyRevenue > 0 ? ((dashboardData.monthlyProfit / dashboardData.monthlyRevenue) * 100).toFixed(1) : 0}%
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${dashboardData.monthlyProfit >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
                  style={{ width: `${Math.min(Math.abs((dashboardData.monthlyProfit / dashboardData.monthlyRevenue) * 100), 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default Dashboard;