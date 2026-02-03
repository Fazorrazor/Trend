import React, { useState, useEffect } from 'react';
import { TrendingUp, Download, X, Info, ChevronDown, ChevronRight, AlertTriangle, CheckCircle, ArrowUpRight, ArrowDownRight, Minus, Lightbulb, AlertCircle } from 'lucide-react';
import { ticketService } from '../../services/ticketService';
import { TicketData, TrendData, CategoryBreakdown } from '../../types/ticket';
import { generateWeeklyInsights, generateMonthlyInsights } from '../../utils/insightsGenerator';
import {
  BarChart,
  Bar,
  PieChart as RechartsPie,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { exportToCSV } from '../../utils/excelParser';
import { AnalysisMethodology } from './AnalysisMethodology';

interface TrendAnalyticsDashboardProps {
  importId?: string;
}

const COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#84CC16',
];

interface DrillDownData {
  type: 'priority' | 'category' | 'status';
  item: string;
  tickets: TicketData[];
}

export function TrendAnalyticsDashboard({ importId }: TrendAnalyticsDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [weeklyTrend, setWeeklyTrend] = useState<TrendData[]>([]);
  const [monthlyTrend, setMonthlyTrend] = useState<TrendData[]>([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState<CategoryBreakdown[]>([]);
  const [priorityBreakdown, setPriorityBreakdown] = useState<CategoryBreakdown[]>([]);
  const [statusBreakdown, setStatusBreakdown] = useState<CategoryBreakdown[]>([]);
  const [clusterBreakdown, setClusterBreakdown] = useState<CategoryBreakdown[]>([]);
  const [affiliateBreakdown, setAffiliateBreakdown] = useState<CategoryBreakdown[]>([]);
  const [recordTypeBreakdown, setRecordTypeBreakdown] = useState<CategoryBreakdown[]>([]);
  const [supportGroupBreakdown, setSupportGroupBreakdown] = useState<CategoryBreakdown[]>([]);
  const [initiatorBreakdown, setInitiatorBreakdown] = useState<CategoryBreakdown[]>([]);
  const [drillDownModal, setDrillDownModal] = useState<DrillDownData | null>(null);
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null);
  const [spansMultipleMonths, setSpansMultipleMonths] = useState(false);

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (drillDownModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [drillDownModal]);

  useEffect(() => {
    loadAnalyticsData();

    // Set up real-time subscription for ticket data changes
    // Real-time updates removed for custom backend migration
    // TODO: Implement polling or WebSocket if realtime is needed
  }, [importId, dateRange]);

  const loadAnalyticsData = async () => {
    setLoading(true);
    try {
      // Fetch tickets from custom backend
      let ticketData = await ticketService.getTickets({ import_id: importId });

      // Apply date range filter client-side since backend currently does exact match
      if (dateRange) {
        const start = new Date(dateRange.start).getTime();
        const end = new Date(dateRange.end).getTime();

        ticketData = ticketData.filter(t => {
          const tTime = new Date(t.request_time).getTime();
          return tTime >= start && tTime <= end;
        });
      }


      setTickets(ticketData);

      // Detect if data spans multiple months
      // Check both: 1) actual data span, 2) date range filter span
      let shouldShowMonthly = false;

      if (dateRange) {
        // If date range filter is set, check the filter span
        const startDate = new Date(dateRange.start);
        const endDate = new Date(dateRange.end);
        const monthsDiff = (endDate.getFullYear() - startDate.getFullYear()) * 12
          + (endDate.getMonth() - startDate.getMonth());

        // If filter spans 2+ months, show monthly view
        shouldShowMonthly = monthsDiff >= 1;
      } else if (ticketData.length > 0) {
        // If no filter, check actual data span
        const months = new Set(
          ticketData.map(t => {
            const date = new Date(t.request_time);
            return `${date.getFullYear()}-${date.getMonth()}`;
          })
        );
        shouldShowMonthly = months.size > 1;
      }

      setSpansMultipleMonths(shouldShowMonthly);

      // Calculate trends and breakdowns
      calculateWeeklyTrend(ticketData);
      calculateMonthlyTrend(ticketData);
      calculateCategoryBreakdown(ticketData);
      calculatePriorityBreakdown(ticketData);
      calculateStatusBreakdown(ticketData);
      calculateClusterBreakdown(ticketData);
      calculateAffiliateBreakdown(ticketData);
      calculateRecordTypeBreakdown(ticketData);
      calculateSupportGroupBreakdown(ticketData);
      calculateInitiatorBreakdown(ticketData);
    } catch (err) {
      console.error('Error loading analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateWeeklyTrend = (data: TicketData[]) => {
    const weekMap = new Map<string, number>();

    data.forEach(ticket => {
      if (ticket.week_label) {
        weekMap.set(ticket.week_label, (weekMap.get(ticket.week_label) || 0) + 1);
      }
    });

    const trend = Array.from(weekMap.entries())
      .map(([period, count]) => ({ period, count }))
      .sort((a, b) => {
        const numA = parseInt(a.period.replace('Week ', ''));
        const numB = parseInt(b.period.replace('Week ', ''));
        return numA - numB;
      });

    setWeeklyTrend(trend);
  };

  const calculateMonthlyTrend = (data: TicketData[]) => {
    // Group tickets by their import's month/year instead of request_time
    const monthMap = new Map<string, { count: number; label: string }>();

    data.forEach(ticket => {
      if (ticket.request_time) {
        const date = new Date(ticket.request_time);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

        if (!monthMap.has(monthKey)) {
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const label = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
          monthMap.set(monthKey, { count: 0, label });
        }

        const entry = monthMap.get(monthKey)!;
        entry.count++;
      }
    });

    const trend = Array.from(monthMap.entries())
      .map(([period, data]) => ({
        period: data.label, // Use formatted label instead of YYYY-MM
        count: data.count,
        sortKey: period // Keep original for sorting
      }))
      .sort((a, b) => a.sortKey!.localeCompare(b.sortKey!))
      .map(({ period, count }) => ({ period, count }));

    setMonthlyTrend(trend);
  };

  const calculateCategoryBreakdown = (data: TicketData[]) => {
    const categoryMap = new Map<string, number>();
    const total = data.length;

    data.forEach(ticket => {
      const cat = ticket.third_lvl_category || 'Uncategorized';
      categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);
    });

    const breakdown = Array.from(categoryMap.entries())
      .map(([category, count]) => ({
        category,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count);

    setCategoryBreakdown(breakdown);
  };

  const calculatePriorityBreakdown = (data: TicketData[]) => {
    const priorityMap = new Map<string, number>();
    const total = data.length;

    data.forEach(ticket => {
      const pri = ticket.priority || 'Unassigned';
      priorityMap.set(pri, (priorityMap.get(pri) || 0) + 1);
    });

    const breakdown = Array.from(priorityMap.entries())
      .map(([category, count]) => ({
        category,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0,
      }))
      .sort((a, b) => {
        const order = ['P1', 'P2', 'P3', 'P4', 'Unassigned'];
        return order.indexOf(a.category) - order.indexOf(b.category);
      });

    setPriorityBreakdown(breakdown);
  };

  const calculateStatusBreakdown = (data: TicketData[]) => {
    const statusMap = new Map<string, number>();
    const total = data.length;

    data.forEach(ticket => {
      const status = ticket.status || 'Unknown';
      statusMap.set(status, (statusMap.get(status) || 0) + 1);
    });

    const breakdown = Array.from(statusMap.entries())
      .map(([category, count]) => ({
        category,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count);

    setStatusBreakdown(breakdown);
  };

  const calculateClusterBreakdown = (data: TicketData[]) => {
    const clusterMap = new Map<string, number>();
    const total = data.length;

    data.forEach(ticket => {
      const cluster = ticket.cluster || 'Unassigned';
      clusterMap.set(cluster, (clusterMap.get(cluster) || 0) + 1);
    });

    const breakdown = Array.from(clusterMap.entries())
      .map(([category, count]) => ({
        category,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count);

    setClusterBreakdown(breakdown);
  };

  const calculateAffiliateBreakdown = (data: TicketData[]) => {
    const affiliateMap = new Map<string, number>();
    const total = data.length;

    data.forEach(ticket => {
      const affiliate = ticket.affiliate || 'Unassigned';
      affiliateMap.set(affiliate, (affiliateMap.get(affiliate) || 0) + 1);
    });

    const breakdown = Array.from(affiliateMap.entries())
      .map(([category, count]) => ({
        category,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15); // Top 15 affiliates

    setAffiliateBreakdown(breakdown);
  };

  const calculateRecordTypeBreakdown = (data: TicketData[]) => {
    const recordTypeMap = new Map<string, number>();
    const total = data.length;

    data.forEach(ticket => {
      const recordType = ticket.service_record_type || 'Unknown';
      recordTypeMap.set(recordType, (recordTypeMap.get(recordType) || 0) + 1);
    });

    const breakdown = Array.from(recordTypeMap.entries())
      .map(([category, count]) => ({
        category,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    setRecordTypeBreakdown(breakdown);
  };

  const calculateSupportGroupBreakdown = (data: TicketData[]) => {
    const supportGroupMap = new Map<string, number>();
    const total = data.length;

    data.forEach(ticket => {
      const supportGroup = ticket.support_group || 'Unassigned';
      supportGroupMap.set(supportGroup, (supportGroupMap.get(supportGroup) || 0) + 1);
    });

    const breakdown = Array.from(supportGroupMap.entries())
      .map(([category, count]) => ({
        category,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    setSupportGroupBreakdown(breakdown);
  };

  const calculateInitiatorBreakdown = (data: TicketData[]) => {
    const initiatorMap = new Map<string, number>();
    const total = data.length;

    data.forEach(ticket => {
      const initiator = ticket.initiator || 'Unknown';
      initiatorMap.set(initiator, (initiatorMap.get(initiator) || 0) + 1);
    });

    const breakdown = Array.from(initiatorMap.entries())
      .map(([category, count]) => ({
        category,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    setInitiatorBreakdown(breakdown);
  };

  const handleExportTrends = () => {
    const exportData = weeklyTrend.map(item => ({
      Week: item.period,
      'Ticket Count': item.count,
    }));
    exportToCSV(exportData, `weekly-trends-${new Date().toISOString().split('T')[0]}.csv`);
  };

  const openDrillDown = (type: 'priority' | 'category' | 'status', item: string) => {
    const filteredTickets = tickets.filter(ticket => {
      switch (type) {
        case 'priority':
          return (ticket.priority || 'Unassigned') === item;
        case 'category':
          return (ticket.third_lvl_category || 'Unknown') === item;
        case 'status':
          return (ticket.status || 'Unknown') === item;
        default:
          return false;
      }
    });

    setDrillDownModal({ type, item, tickets: filteredTickets });
  };

  const handleChartClick = (data: any) => {
    if (!data || !data.activePayload || !data.activePayload[0]) return;

    const period = data.activePayload[0].payload.period;
    const filteredTickets = tickets.filter(ticket => ticket.week_label === period);

    setDrillDownModal({
      type: 'category',
      item: `${period} Tickets`,
      tickets: filteredTickets
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border border-gray-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 truncate">Ticket Trend Analysis</h2>
              <p className="text-xs sm:text-sm text-gray-600 mt-0.5">Track ticket patterns and insights</p>
            </div>
          </div>
          <button
            onClick={handleExportTrends}
            className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 text-sm transition-colors shadow-sm flex-shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Analysis Methodology */}
      <AnalysisMethodology />

      {/* Date Range Filter */}
      <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border border-gray-200">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 sm:gap-4">
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={dateRange?.start?.split('T')[0] || ''}
                onChange={(e) => {
                  if (e.target.value) {
                    setDateRange(prev => ({
                      start: new Date(e.target.value).toISOString(),
                      end: prev?.end || new Date().toISOString()
                    }));
                  }
                }}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={dateRange?.end?.split('T')[0] || ''}
                onChange={(e) => {
                  if (e.target.value) {
                    setDateRange(prev => ({
                      start: prev?.start || new Date(0).toISOString(),
                      end: new Date(e.target.value).toISOString()
                    }));
                  }
                }}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          {dateRange && (
            <button
              onClick={() => setDateRange(null)}
              className="w-full sm:w-auto px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 flex items-center justify-center gap-2 text-sm flex-shrink-0"
            >
              <X className="w-4 h-4" />
              <span className="whitespace-nowrap">Clear</span>
            </button>
          )}
        </div>
        {dateRange && (
          <div className="mt-3 text-xs sm:text-sm text-blue-700 bg-blue-50 px-3 py-2 rounded-lg">
            Showing data from {new Date(dateRange.start).toLocaleDateString()} to {new Date(dateRange.end).toLocaleDateString()}
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 md:p-5 border border-gray-200">
          <div className="text-xs sm:text-sm font-medium text-gray-600 mb-1 sm:mb-2">Total Tickets</div>
          <div className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">{tickets.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 md:p-5 border border-gray-200">
          <div className="text-xs sm:text-sm font-medium text-gray-600 mb-1 sm:mb-2">Categories</div>
          <div className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">{categoryBreakdown.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 md:p-5 border border-gray-200">
          <div className="text-xs sm:text-sm font-medium text-gray-600 mb-1 sm:mb-2">Weeks Tracked</div>
          <div className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">{weeklyTrend.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 md:p-5 border border-gray-200">
          <div className="text-xs sm:text-sm font-medium text-gray-600 mb-1 sm:mb-2">Avg per Week</div>
          <div className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
            {weeklyTrend.length > 0
              ? Math.round(tickets.length / weeklyTrend.length)
              : 0}
          </div>
        </div>
      </div>

      {/* Trend Chart - Weekly or Monthly based on data span */}
      <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border border-gray-200 overflow-hidden">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {spansMultipleMonths ? 'Monthly Ticket Volume' : 'Weekly Ticket Volume'}
            </h3>
            <span className="text-xs text-gray-500">
              {spansMultipleMonths
                ? '(Data spans multiple months - showing monthly view)'
                : '(Click bars for details)'}
            </span>
          </div>
          {(() => {
            const trendData = spansMultipleMonths ? monthlyTrend : weeklyTrend;
            if (trendData.length < 2) return null;

            const latest = trendData[trendData.length - 1];
            const previous = trendData[trendData.length - 2];
            const change = latest.count - previous.count;
            const percentChange = previous.count > 0 ? ((change / previous.count) * 100) : 0;
            const isIncrease = change > 0;
            const isDecrease = change < 0;

            return (
              <div className="flex items-center gap-2">
                {isIncrease && (
                  <div className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-700 rounded-lg">
                    <ArrowUpRight className="w-4 h-4" />
                    <span className="text-sm font-semibold">+{Math.abs(percentChange).toFixed(1)}%</span>
                  </div>
                )}
                {isDecrease && (
                  <div className="flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg">
                    <ArrowDownRight className="w-4 h-4" />
                    <span className="text-sm font-semibold">-{Math.abs(percentChange).toFixed(1)}%</span>
                  </div>
                )}
                {!isIncrease && !isDecrease && (
                  <div className="flex items-center gap-1 px-3 py-1.5 bg-gray-50 text-gray-700 rounded-lg">
                    <Minus className="w-4 h-4" />
                    <span className="text-sm font-semibold">0%</span>
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        <ResponsiveContainer width="100%" height={250} className="sm:h-[300px]">
          <BarChart
            data={spansMultipleMonths ? monthlyTrend : weeklyTrend}
            onClick={handleChartClick}
            style={{ cursor: 'pointer' }}
            barSize={40}
            barGap={4}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="period"
              tick={{ fill: '#6b7280', fontSize: 11 }}
              axisLine={{ stroke: '#d1d5db' }}
            />
            <YAxis
              tick={{ fill: '#6b7280', fontSize: 11 }}
              axisLine={{ stroke: '#d1d5db' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                fontSize: '12px'
              }}
            />
            <Legend
              wrapperStyle={{ paddingTop: '8px', fontSize: '12px' }}
              iconType="square"
              iconSize={10}
            />
            <Bar
              dataKey="count"
              fill="#3B82F6"
              name="Tickets"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>

        {/* AI-Powered Insights - Below Chart */}
        {(spansMultipleMonths ? monthlyTrend : weeklyTrend).length >= 2 && (() => {
          const insights = spansMultipleMonths
            ? generateMonthlyInsights(monthlyTrend)
            : generateWeeklyInsights(weeklyTrend);

          return (
            <div className="mt-6 space-y-3">
              {insights.map((insight, idx) => {
                const bgColors = {
                  critical: 'from-red-50 to-orange-50 border-red-200',
                  warning: 'from-amber-50 to-yellow-50 border-amber-200',
                  positive: 'from-green-50 to-emerald-50 border-green-200',
                  neutral: 'from-blue-50 to-indigo-50 border-blue-200'
                };

                const iconComponents = {
                  alert: <AlertCircle className="w-5 h-5 text-red-600" />,
                  warning: <AlertTriangle className="w-5 h-5 text-amber-600" />,
                  success: <CheckCircle className="w-5 h-5 text-green-600" />,
                  info: <Lightbulb className="w-5 h-5 text-blue-600" />
                };

                return (
                  <div
                    key={idx}
                    className={`p-4 bg-gradient-to-r ${bgColors[insight.severity]} rounded-lg border`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {iconComponents[insight.icon]}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 mb-1.5">{insight.title}</h4>
                        <p className="text-sm text-gray-700 mb-2">{insight.message}</p>
                        {insight.recommendation && (
                          <div className="mt-2 pt-2 border-t border-gray-200">
                            <p className="text-xs text-gray-600">
                              <span className="font-semibold">💡 Recommendation:</span> {insight.recommendation}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* Monthly Trend Chart */}
      {monthlyTrend.length > 1 && (
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border border-gray-200 overflow-hidden">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Monthly Ticket Volume
              </h3>
              <span className="text-xs text-gray-500">(Click bars for details)</span>
            </div>
            {monthlyTrend.length >= 2 && (() => {
              const latest = monthlyTrend[monthlyTrend.length - 1];
              const previous = monthlyTrend[monthlyTrend.length - 2];
              const change = latest.count - previous.count;
              const percentChange = previous.count > 0 ? ((change / previous.count) * 100) : 0;
              const isIncrease = change > 0;
              const isDecrease = change < 0;

              return (
                <div className="flex items-center gap-2">
                  {isIncrease && (
                    <div className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-700 rounded-lg">
                      <ArrowUpRight className="w-4 h-4" />
                      <span className="text-sm font-semibold">+{Math.abs(percentChange).toFixed(1)}%</span>
                    </div>
                  )}
                  {isDecrease && (
                    <div className="flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg">
                      <ArrowDownRight className="w-4 h-4" />
                      <span className="text-sm font-semibold">-{Math.abs(percentChange).toFixed(1)}%</span>
                    </div>
                  )}
                  {!isIncrease && !isDecrease && (
                    <div className="flex items-center gap-1 px-3 py-1.5 bg-gray-50 text-gray-700 rounded-lg">
                      <Minus className="w-4 h-4" />
                      <span className="text-sm font-semibold">0%</span>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* AI-Powered Monthly Insights */}
          {monthlyTrend.length >= 2 && (() => {
            const insights = generateMonthlyInsights(monthlyTrend);

            return (
              <div className="mb-4 space-y-3">
                {insights.map((insight, idx) => {
                  const bgColors = {
                    critical: 'from-red-50 to-orange-50 border-red-200',
                    warning: 'from-amber-50 to-yellow-50 border-amber-200',
                    positive: 'from-green-50 to-emerald-50 border-green-200',
                    neutral: 'from-blue-50 to-indigo-50 border-blue-200'
                  };

                  const iconComponents = {
                    alert: <AlertCircle className="w-5 h-5 text-red-600" />,
                    warning: <AlertTriangle className="w-5 h-5 text-amber-600" />,
                    success: <CheckCircle className="w-5 h-5 text-green-600" />,
                    info: <Lightbulb className="w-5 h-5 text-blue-600" />
                  };

                  return (
                    <div
                      key={idx}
                      className={`p-4 bg-gradient-to-r ${bgColors[insight.severity]} rounded-lg border`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {iconComponents[insight.icon]}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 mb-1.5">{insight.title}</h4>
                          <p className="text-sm text-gray-700 mb-2">{insight.message}</p>
                          {insight.recommendation && (
                            <div className="mt-2 pt-2 border-t border-gray-200">
                              <p className="text-xs text-gray-600">
                                <span className="font-semibold">💡 Recommendation:</span> {insight.recommendation}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          <ResponsiveContainer width="100%" height={250} className="sm:h-[300px]">
            <BarChart data={monthlyTrend} onClick={handleChartClick} style={{ cursor: 'pointer' }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="period"
                tick={{ fill: '#6b7280', fontSize: 12 }}
                axisLine={{ stroke: '#d1d5db' }}
              />
              <YAxis
                tick={{ fill: '#6b7280', fontSize: 12 }}
                axisLine={{ stroke: '#d1d5db' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Legend
                wrapperStyle={{ paddingTop: '10px' }}
                iconType="square"
              />
              <Bar
                dataKey="count"
                fill="#10B981"
                name="Tickets"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Category Breakdown
            <span className="text-xs text-gray-500 ml-2">(Click for details)</span>
          </h3>
          <div className="space-y-2 sm:space-y-3">
            {categoryBreakdown.slice(0, 8).map((item, idx) => (
              <div
                key={idx}
                onClick={() => openDrillDown('category', item.category)}
                className="cursor-pointer hover:bg-blue-50 p-2 rounded-lg transition-colors"
              >
                <div className="flex justify-between text-xs sm:text-sm mb-1">
                  <span className="font-medium text-gray-700 truncate pr-2">{item.category}</span>
                  <span className="text-gray-600 whitespace-nowrap">
                    {item.count} ({item.percentage.toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Priority Breakdown */}
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Priority Distribution
            <span className="text-xs text-gray-500 ml-2">(Click segments for details)</span>
          </h3>
          <ResponsiveContainer width="100%" height={200} className="sm:h-[250px]">
            <RechartsPie>
              <Pie
                data={priorityBreakdown}
                dataKey="count"
                nameKey="category"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={(entry: any) => `${entry.category}: ${entry.percentage.toFixed(1)}%`}
                onClick={(data: any) => openDrillDown('priority', data.category)}
                style={{ cursor: 'pointer' }}
              >
                {priorityBreakdown.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </RechartsPie>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Status Breakdown */}
      <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Status Distribution
          <span className="text-xs text-gray-500 ml-2">(Click for details)</span>
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statusBreakdown.map((item, idx) => (
            <div
              key={idx}
              onClick={() => openDrillDown('status', item.category)}
              className="bg-gray-50 rounded-lg p-4 cursor-pointer hover:bg-blue-50 transition-colors"
            >
              <div className="text-2xl font-bold text-gray-900">{item.count}</div>
              <div className="text-sm text-gray-600 mt-1">{item.category}</div>
              <div className="text-xs text-gray-500 mt-1">{item.percentage.toFixed(1)}%</div>
            </div>
          ))}
        </div>
      </div>

      {/* Cluster & Affiliate Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 overflow-hidden">
        {/* Cluster Breakdown */}
        {clusterBreakdown.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Cluster Distribution
            </h3>
            <div className="space-y-2 sm:space-y-3">
              {clusterBreakdown.map((item, idx) => (
                <div key={idx}>
                  <div className="flex justify-between text-xs sm:text-sm mb-1">
                    <span className="font-medium text-gray-700 truncate pr-2">{item.category}</span>
                    <span className="text-gray-600 whitespace-nowrap">
                      {item.count} ({item.percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-indigo-600 h-2 rounded-full transition-all"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Affiliate Breakdown */}
        {affiliateBreakdown.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Top 15 Affiliates
            </h3>
            <div className="space-y-2 sm:space-y-3 max-h-[400px] overflow-y-auto">
              {affiliateBreakdown.map((item, idx) => (
                <div key={idx}>
                  <div className="flex justify-between text-xs sm:text-sm mb-1">
                    <span className="font-medium text-gray-700 truncate pr-2">{item.category}</span>
                    <span className="text-gray-600 whitespace-nowrap">
                      {item.count} ({item.percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-teal-600 h-2 rounded-full transition-all"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Additional Breakdowns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Service Record Type Breakdown */}
        {recordTypeBreakdown.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Service Record Types
            </h3>
            <div className="space-y-2 sm:space-y-3">
              {recordTypeBreakdown.map((item, idx) => (
                <div key={idx}>
                  <div className="flex justify-between text-xs sm:text-sm mb-1">
                    <span className="font-medium text-gray-700 truncate pr-2">{item.category}</span>
                    <span className="text-gray-600 whitespace-nowrap">
                      {item.count} ({item.percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-indigo-600 h-2 rounded-full transition-all"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Support Group Breakdown */}
        {supportGroupBreakdown.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Top Support Groups
            </h3>
            <div className="space-y-2 sm:space-y-3">
              {supportGroupBreakdown.map((item, idx) => (
                <div key={idx}>
                  <div className="flex justify-between text-xs sm:text-sm mb-1">
                    <span className="font-medium text-gray-700 truncate pr-2">{item.category}</span>
                    <span className="text-gray-600 whitespace-nowrap">
                      {item.count} ({item.percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-pink-600 h-2 rounded-full transition-all"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Initiator Breakdown */}
        {initiatorBreakdown.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Top Initiators
            </h3>
            <div className="space-y-2 sm:space-y-3">
              {initiatorBreakdown.map((item, idx) => (
                <div key={idx}>
                  <div className="flex justify-between text-xs sm:text-sm mb-1">
                    <span className="font-medium text-gray-700 truncate pr-2">{item.category}</span>
                    <span className="text-gray-600 whitespace-nowrap">
                      {item.count} ({item.percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-cyan-600 h-2 rounded-full transition-all"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Drill-Down Modal */}
      {drillDownModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={() => { setDrillDownModal(null); setExpandedTicket(null); }}>
          <div className="bg-white rounded-xl shadow-2xl max-w-7xl w-full h-[95vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="bg-blue-600 text-white p-6 flex items-center justify-between flex-shrink-0">
              <div>
                <h3 className="text-2xl font-bold">{drillDownModal.item}</h3>
                <p className="text-base text-blue-100 mt-1">
                  {drillDownModal.tickets.length} tickets • Detailed breakdown
                </p>
              </div>
              <button
                onClick={() => { setDrillDownModal(null); setExpandedTicket(null); }}
                className="p-2 hover:bg-blue-800 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {/* Cluster Breakdown */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Info className="w-4 h-4 text-blue-600" />
                    By Cluster
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {(() => {
                      const clusterCounts = new Map<string, number>();
                      drillDownModal.tickets.forEach(t => {
                        const cluster = t.cluster || 'Unassigned';
                        clusterCounts.set(cluster, (clusterCounts.get(cluster) || 0) + 1);
                      });
                      return Array.from(clusterCounts.entries())
                        .sort((a, b) => b[1] - a[1])
                        .map(([cluster, count]) => (
                          <div key={cluster} className="flex justify-between text-sm">
                            <span className="text-gray-700 truncate pr-2">{cluster}</span>
                            <span className="font-semibold text-blue-600">{count}</span>
                          </div>
                        ));
                    })()}
                  </div>
                </div>

                {/* Affiliate Breakdown */}
                <div className="bg-green-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Info className="w-4 h-4 text-green-600" />
                    By Affiliate
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {(() => {
                      const affiliateCounts = new Map<string, number>();
                      drillDownModal.tickets.forEach(t => {
                        const affiliate = t.affiliate || 'Unassigned';
                        affiliateCounts.set(affiliate, (affiliateCounts.get(affiliate) || 0) + 1);
                      });
                      return Array.from(affiliateCounts.entries())
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 10)
                        .map(([affiliate, count]) => (
                          <div key={affiliate} className="flex justify-between text-sm">
                            <span className="text-gray-700 truncate pr-2">{affiliate}</span>
                            <span className="font-semibold text-green-600">{count}</span>
                          </div>
                        ));
                    })()}
                  </div>
                </div>

                {/* Record Type Breakdown */}
                <div className="bg-purple-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Info className="w-4 h-4 text-purple-600" />
                    By Record Type
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {(() => {
                      const recordTypeCounts = new Map<string, number>();
                      drillDownModal.tickets.forEach(t => {
                        const recordType = t.service_record_type || 'Unknown';
                        recordTypeCounts.set(recordType, (recordTypeCounts.get(recordType) || 0) + 1);
                      });
                      return Array.from(recordTypeCounts.entries())
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 10)
                        .map(([recordType, count]) => (
                          <div key={recordType} className="flex justify-between text-sm">
                            <span className="text-gray-700 truncate pr-2">{recordType}</span>
                            <span className="font-semibold text-purple-600">{count}</span>
                          </div>
                        ));
                    })()}
                  </div>
                </div>
              </div>

              {/* Summary Stats */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h4 className="font-semibold text-gray-900 mb-3">Quick Stats</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-gray-600">Total Tickets</p>
                    <p className="text-2xl font-bold text-gray-900">{drillDownModal.tickets.length}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Unique Clusters</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {new Set(drillDownModal.tickets.map(t => t.cluster || 'Unassigned')).size}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Unique Affiliates</p>
                    <p className="text-2xl font-bold text-green-600">
                      {new Set(drillDownModal.tickets.map(t => t.affiliate || 'Unassigned')).size}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Record Types</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {new Set(drillDownModal.tickets.map(t => t.service_record_type || 'Unknown')).size}
                    </p>
                  </div>
                </div>
              </div>

              {/* Ticket List */}
              <div className="bg-white border border-gray-200 rounded-lg">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                  <h4 className="font-semibold text-gray-900">Ticket Details ({drillDownModal.tickets.length})</h4>
                  <button
                    onClick={() => {
                      const exportData = drillDownModal.tickets.map(t => ({
                        'Ticket ID': t.ticket_id,
                        'Request Time': new Date(t.request_time).toLocaleString(),
                        'Week': t.week_label || 'N/A',
                        'Initiator': t.initiator || 'N/A',
                        'Cluster': t.cluster || 'Unassigned',
                        'Affiliate': t.affiliate || 'Unassigned',
                        'Service Record Type': t.service_record_type || 'N/A',
                        'Category': t.category || 'N/A',
                        'Sub-Category': t.sub_category || 'N/A',
                        '3rd Level Category': t.third_lvl_category || 'Unknown',
                        'Support Group': t.support_group || 'N/A',
                        'Process Manager': t.process_manager || 'N/A',
                        'Priority': t.priority || 'Unassigned',
                        'Status': t.status || 'Unknown',
                        'Title': t.title || 'N/A',
                        'Description': t.description || 'N/A',
                      }));
                      exportToCSV(exportData, `${drillDownModal.item.replace(/\s+/g, '-')}-tickets-${new Date().toISOString().split('T')[0]}.csv`);
                    }}
                    className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Export List
                  </button>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ticket ID</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Initiator</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">3rd Lvl Category</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service Record Type</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Support Group</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {drillDownModal.tickets.slice(0, 100).map((ticket, idx) => (
                        <React.Fragment key={ticket.ticket_id || idx}>
                          <tr
                            className="hover:bg-blue-50 cursor-pointer transition-colors"
                            onClick={() => setExpandedTicket(expandedTicket === ticket.ticket_id ? null : ticket.ticket_id)}
                          >
                            <td className="px-4 py-3 text-sm font-medium text-blue-600 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                {expandedTicket === ticket.ticket_id ? (
                                  <ChevronDown className="w-4 h-4" />
                                ) : (
                                  <ChevronRight className="w-4 h-4" />
                                )}
                                {ticket.ticket_id}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700 max-w-xs truncate" title={ticket.title || 'N/A'}>
                              {ticket.title || 'N/A'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                              {new Date(ticket.request_time).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700">{ticket.initiator || 'N/A'}</td>
                            <td className="px-4 py-3 text-sm text-gray-700">{ticket.third_lvl_category || 'N/A'}</td>
                            <td className="px-4 py-3 text-sm text-gray-700">{ticket.service_record_type || 'N/A'}</td>
                            <td className="px-4 py-3 text-sm text-gray-700">{ticket.support_group || 'N/A'}</td>
                            <td className="px-4 py-3 text-sm whitespace-nowrap">
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${ticket.priority === 'P1' ? 'bg-red-100 text-red-800' :
                                ticket.priority === 'P2' ? 'bg-orange-100 text-orange-800' :
                                  ticket.priority === 'P3' ? 'bg-yellow-100 text-yellow-800' :
                                    ticket.priority === 'P4' ? 'bg-green-100 text-green-800' :
                                      'bg-gray-100 text-gray-800'
                                }`}>
                                {ticket.priority || 'N/A'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700">{ticket.status || 'N/A'}</td>
                          </tr>
                          {expandedTicket === ticket.ticket_id && (
                            <tr className="bg-gray-50">
                              <td colSpan={9} className="px-4 py-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                  <div className="space-y-2">
                                    <div className="flex gap-2">
                                      <span className="font-semibold text-gray-700 min-w-[120px]">Cluster:</span>
                                      <span className="text-gray-900">{ticket.cluster || 'N/A'}</span>
                                    </div>
                                    <div className="flex gap-2">
                                      <span className="font-semibold text-gray-700 min-w-[120px]">Affiliate:</span>
                                      <span className="text-gray-900">{ticket.affiliate || 'N/A'}</span>
                                    </div>
                                    <div className="flex gap-2">
                                      <span className="font-semibold text-gray-700 min-w-[120px]">Process Manager:</span>
                                      <span className="text-gray-900">{ticket.process_manager || 'N/A'}</span>
                                    </div>
                                    <div className="flex gap-2">
                                      <span className="font-semibold text-gray-700 min-w-[120px]">Week:</span>
                                      <span className="text-gray-900">{ticket.week_label || 'N/A'}</span>
                                    </div>
                                  </div>
                                  <div className="space-y-2">
                                    <div className="flex gap-2">
                                      <span className="font-semibold text-gray-700 min-w-[120px]">3rd Lvl Category:</span>
                                      <span className="text-gray-900">{ticket.third_lvl_category || 'N/A'}</span>
                                    </div>
                                    <div className="flex gap-2">
                                      <span className="font-semibold text-gray-700 min-w-[120px]">Request Time:</span>
                                      <span className="text-gray-900">{new Date(ticket.request_time).toLocaleString()}</span>
                                    </div>
                                    {ticket.close_time && (
                                      <div className="flex gap-2">
                                        <span className="font-semibold text-gray-700 min-w-[120px]">Close Time:</span>
                                        <span className="text-gray-900">{new Date(ticket.close_time).toLocaleString()}</span>
                                      </div>
                                    )}
                                  </div>
                                  {ticket.description && (
                                    <div className="md:col-span-2 mt-2">
                                      <span className="font-semibold text-gray-700">Description:</span>
                                      <p className="text-gray-900 mt-1 p-3 bg-white rounded border border-gray-200">
                                        {ticket.description}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                  {drillDownModal.tickets.length > 100 && (
                    <div className="bg-gray-50 px-4 py-3 text-sm text-gray-600 text-center border-t">
                      Showing first 100 of {drillDownModal.tickets.length} tickets. Export to see all.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
