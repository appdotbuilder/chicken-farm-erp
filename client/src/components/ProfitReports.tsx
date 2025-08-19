import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { CalendarIcon, Download, TrendingUp, TrendingDown } from 'lucide-react';
import { format, subDays, subMonths, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { trpc } from '@/utils/trpc';
import type { ProfitReport, ExportFormat } from '../../../server/src/schema';

function ProfitReports() {
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [report, setReport] = useState<ProfitReport | null>(null);
  const [startDatePickerOpen, setStartDatePickerOpen] = useState(false);
  const [endDatePickerOpen, setEndDatePickerOpen] = useState(false);
  
  const [dateRange, setDateRange] = useState({
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date())
  });

  const generateReport = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await trpc.profitReports.generate.query({
        period_start: dateRange.start,
        period_end: dateRange.end
      });
      setReport(result);
    } catch (error) {
      console.error('Failed to generate profit report:', error);
    } finally {
      setIsLoading(false);
    }
  }, [dateRange]);

  const exportReport = async (format: ExportFormat) => {
    setIsExporting(true);
    try {
      await trpc.export.profitReport.mutate({
        format,
        startDate: dateRange.start,
        endDate: dateRange.end
      });
      // In a real implementation, this would trigger a download
      console.log(`Exported report in ${format} format`);
    } catch (error) {
      console.error('Failed to export report:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const setQuickDateRange = (range: string) => {
    const today = new Date();
    
    switch (range) {
      case 'today':
        setDateRange({
          start: new Date(today.setHours(0, 0, 0, 0)),
          end: new Date(today.setHours(23, 59, 59, 999))
        });
        break;
      case 'week':
        setDateRange({
          start: subDays(today, 7),
          end: today
        });
        break;
      case 'month':
        setDateRange({
          start: startOfMonth(today),
          end: endOfMonth(today)
        });
        break;
      case 'last-month':
        const lastMonth = subMonths(today, 1);
        setDateRange({
          start: startOfMonth(lastMonth),
          end: endOfMonth(lastMonth)
        });
        break;
      case 'year':
        setDateRange({
          start: startOfYear(today),
          end: endOfYear(today)
        });
        break;
      default:
        break;
    }
  };

  const calculateProfitMargin = () => {
    if (!report || report.total_revenue === 0) return 0;
    return (report.total_profit / report.total_revenue) * 100;
  };

  const getPerformanceIndicator = () => {
    if (!report) return null;
    
    const margin = calculateProfitMargin();
    
    if (report.total_profit > 0) {
      return {
        trend: 'up' as const,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        icon: TrendingUp,
        status: margin > 20 ? 'Excellent' : margin > 10 ? 'Good' : 'Fair'
      };
    } else {
      return {
        trend: 'down' as const,
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        icon: TrendingDown,
        status: 'Loss'
      };
    }
  };

  const performance = getPerformanceIndicator();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Profit & Loss Reports</h3>
          <p className="text-gray-600">Analyze your farm's financial performance</p>
        </div>
      </div>

      {/* Date Range Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span>📅</span>
            <span>Report Period</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Quick Date Range Buttons */}
          <div className="flex flex-wrap gap-2">
            {[
              { value: 'today', label: 'Today' },
              { value: 'week', label: 'Last 7 Days' },
              { value: 'month', label: 'This Month' },
              { value: 'last-month', label: 'Last Month' },
              { value: 'year', label: 'This Year' }
            ].map((range) => (
              <Button
                key={range.value}
                variant="outline"
                size="sm"
                onClick={() => setQuickDateRange(range.value)}
              >
                {range.label}
              </Button>
            ))}
          </div>

          <Separator />

          {/* Custom Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Start Date</label>
              <Popover open={startDatePickerOpen} onOpenChange={setStartDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(dateRange.start, 'PPP')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateRange.start}
                    onSelect={(date) => {
                      if (date) {
                        setDateRange(prev => ({ ...prev, start: date }));
                        setStartDatePickerOpen(false);
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <label className="text-sm font-medium">End Date</label>
              <Popover open={endDatePickerOpen} onOpenChange={setEndDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(dateRange.end, 'PPP')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateRange.end}
                    onSelect={(date) => {
                      if (date) {
                        setDateRange(prev => ({ ...prev, end: date }));
                        setEndDatePickerOpen(false);
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="flex space-x-3">
            <Button onClick={generateReport} disabled={isLoading} className="flex-1">
              {isLoading ? 'Generating...' : 'Generate Report'}
              <span className="ml-2">📊</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Report Results */}
      {report && (
        <>
          {/* Performance Overview */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-600 flex items-center space-x-2">
                  <span>💰</span>
                  <span>Total Revenue</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  ${report.total_revenue.toFixed(2)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-600 flex items-center space-x-2">
                  <span>🍽️</span>
                  <span>Feed Costs</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  ${report.total_feed_cost.toFixed(2)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-600 flex items-center space-x-2">
                  <span>💸</span>
                  <span>Other Expenses</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  ${report.total_other_expenses.toFixed(2)}
                </div>
              </CardContent>
            </Card>

            <Card className={performance?.bgColor}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-600 flex items-center space-x-2">
                  {performance && <performance.icon className="h-4 w-4" />}
                  <span>Net Profit</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${performance?.color}`}>
                  ${report.total_profit.toFixed(2)}
                </div>
                {performance && (
                  <Badge variant="secondary" className={`mt-1 ${performance.color}`}>
                    {performance.status}
                  </Badge>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Detailed Analysis */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <span>📊</span>
                  <span>Financial Breakdown</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <span className="font-medium text-green-800">Revenue from Egg Sales</span>
                    <span className="font-bold text-green-600">${report.total_revenue.toFixed(2)}</span>
                  </div>
                  
                  <div className="text-center text-gray-400">Less:</div>
                  
                  <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                    <span className="font-medium text-red-800">Feed Costs</span>
                    <span className="font-bold text-red-600">-${report.total_feed_cost.toFixed(2)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                    <span className="font-medium text-red-800">Other Expenses</span>
                    <span className="font-bold text-red-600">-${report.total_other_expenses.toFixed(2)}</span>
                  </div>
                  
                  <Separator />
                  
                  <div className={`flex justify-between items-center p-4 rounded-lg border-2 ${
                    report.total_profit >= 0 ? 'bg-green-100 border-green-300' : 'bg-red-100 border-red-300'
                  }`}>
                    <span className="font-bold text-lg">Net Profit</span>
                    <span className={`font-bold text-xl ${
                      report.total_profit >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      ${report.total_profit.toFixed(2)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <span>📈</span>
                  <span>Key Metrics</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  <div className="p-3 border rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Profit Margin</span>
                      <span className={`font-bold ${report.total_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {calculateProfitMargin().toFixed(1)}%
                      </span>
                    </div>
                    <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          report.total_profit >= 0 ? 'bg-green-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.min(Math.abs(calculateProfitMargin()), 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="p-3 border rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Feed Cost Ratio</span>
                      <span className="font-bold text-blue-600">
                        {report.total_revenue > 0 ? ((report.total_feed_cost / report.total_revenue) * 100).toFixed(1) : 0}%
                      </span>
                    </div>
                  </div>

                  <div className="p-3 border rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Other Expenses Ratio</span>
                      <span className="font-bold text-orange-600">
                        {report.total_revenue > 0 ? ((report.total_other_expenses / report.total_revenue) * 100).toFixed(1) : 0}%
                      </span>
                    </div>
                  </div>

                  <div className="p-3 border rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Total Expenses</span>
                      <span className="font-bold text-red-600">
                        ${(report.total_feed_cost + report.total_other_expenses).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Export Options */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Download className="h-5 w-5" />
                <span>Export Report</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex space-x-4">
                <Button 
                  variant="outline" 
                  onClick={() => exportReport('pdf')}
                  disabled={isExporting}
                  className="flex-1"
                >
                  {isExporting ? 'Exporting...' : 'Export as PDF'}
                  <span className="ml-2">📄</span>
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => exportReport('excel')}
                  disabled={isExporting}
                  className="flex-1"
                >
                  {isExporting ? 'Exporting...' : 'Export as Excel'}
                  <span className="ml-2">📊</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Performance Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <span>💡</span>
                <span>Insights & Recommendations</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {calculateProfitMargin() < 10 && report.total_profit > 0 && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <span className="text-yellow-600">⚠️</span>
                      <div>
                        <h4 className="font-medium text-yellow-800">Low Profit Margin</h4>
                        <p className="text-sm text-yellow-700">
                          Your profit margin is below 10%. Consider optimizing feed costs or increasing egg prices.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {report.total_profit < 0 && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <span className="text-red-600">🚨</span>
                      <div>
                        <h4 className="font-medium text-red-800">Operating at a Loss</h4>
                        <p className="text-sm text-red-700">
                          Your farm is currently operating at a loss. Review your expenses and consider cost reduction strategies.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {report.total_feed_cost / report.total_revenue > 0.6 && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <span className="text-blue-600">ℹ️</span>
                      <div>
                        <h4 className="font-medium text-blue-800">High Feed Costs</h4>
                        <p className="text-sm text-blue-700">
                          Feed costs represent over 60% of revenue. Consider optimizing feed formulations or sourcing cheaper materials.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {calculateProfitMargin() > 20 && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <span className="text-green-600">✅</span>
                      <div>
                        <h4 className="font-medium text-green-800">Excellent Performance</h4>
                        <p className="text-sm text-green-700">
                          Great job! Your profit margin is healthy. Consider expanding operations or investing in improvements.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Empty State */}
      {!report && !isLoading && (
        <Card>
          <CardContent className="text-center py-12">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-lg font-semibold mb-2">Generate Your First Report</h3>
            <p className="text-gray-600 mb-4">
              Select a date range above and click "Generate Report" to analyze your farm's financial performance.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default ProfitReports;