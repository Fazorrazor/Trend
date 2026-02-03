import { useState, useEffect } from 'react';
import { TrendingUp } from 'lucide-react';
import { ticketService } from '../../services/ticketService';
import { normalizeCategory } from '../../utils/categoryNormalizer';
import { TicketData } from '../../types/ticket';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { AnalysisMethodology } from './AnalysisMethodology';
import { EditableKeyFindings } from './EditableKeyFindings';
import { EditableDetailedAnalysis } from './EditableDetailedAnalysis';
import { getHighlightedCategories, ServiceKey as ConfigServiceKey } from '../../config/highlightedCategories';

interface CategoryTrendAnalysisProps {
  importId?: string;
}

interface CategoryTrendData {
  period: string;
  [key: string]: string | number;
}

interface TrendInsight {
  category: string;
  change: number;
  percentChange: number;
  trend: 'increase' | 'decrease' | 'stable';
  severity: 'critical' | 'warning' | 'positive' | 'neutral';
  rootCause?: string;
  recommendation?: string;
}

const COLORS = ['#60A5FA', '#34D399', '#FBBF24', '#F87171', '#A78BFA', '#F472B6'];

interface ServiceGroup {
  key: string;
  name: string;
  title: string;
  categories: string[];
  data: CategoryTrendData[];
  insights: TrendInsight[];
  colors: string[];
}

type TabType = 'critical-services' | 'flexcube-vs-acc';

export function CategoryTrendAnalysis({ importId }: CategoryTrendAnalysisProps) {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('critical-services');
  const [serviceGroups, setServiceGroups] = useState<ServiceGroup[]>([]);
  const [flexcubeVsAccMaintenance, setFlexcubeVsAccMaintenance] = useState<{
    clusters: Array<{
      clusterName: string;
      data: CategoryTrendData[];
      insights: TrendInsight[];
    }>;
  } | null>(null);

  useEffect(() => {
    loadData();
  }, [importId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Fetch all tickets for the import
      const data = await ticketService.getTickets({ import_id: importId });

      const ticketData = data || [];
      calculateCategoryTrends(ticketData);
      calculateFlexcubeVsAccMaintenance(ticketData);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateCategoryTrends = (data: TicketData[]) => {
    // Explicit service config: where to find service label and which highlights to show
    const SERVICES: Array<{
      key: ConfigServiceKey;
      title: string; // Display title (Flexcube => F12)
      matchField: 'category' | 'sub_category';
      matchValue: string; // exact match against data
      highlights: string[];
    }> = [
        { key: 'flexcube', title: 'F12', matchField: 'sub_category', matchValue: 'Flexcube', highlights: getHighlightedCategories('flexcube') },
        { key: 'cards', title: 'Cards Services', matchField: 'category', matchValue: 'Cards Services', highlights: getHighlightedCategories('cards') },
        { key: 'ibps', title: 'IBPS', matchField: 'sub_category', matchValue: 'IBPS', highlights: getHighlightedCategories('ibps') },
        { key: 'mfs', title: 'Mobile Financial Services', matchField: 'category', matchValue: 'Mobile Financial Services', highlights: getHighlightedCategories('mfs') },
        { key: 'smart_teller', title: 'Smart Teller', matchField: 'sub_category', matchValue: 'Smart Teller', highlights: getHighlightedCategories('smart_teller') },
      ];

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const groups: ServiceGroup[] = SERVICES.map(service => {
      // Filter tickets for this service
      const serviceTickets = data.filter(t => {
        const fieldVal = (t[service.matchField] as string) || '';
        return fieldVal.toLowerCase() === service.matchValue.toLowerCase();
      });

      // Build month -> category counts (only for highlighted categories)
      const monthMap = new Map<string, Map<string, number>>();
      const monthLabels = new Map<string, string>();

      serviceTickets.forEach(ticket => {
        if (!ticket.request_time || !ticket.third_lvl_category) return;
        const date = new Date(ticket.request_time);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const canonical = normalizeCategory(service.key as any, ticket.third_lvl_category as string);
        const isHighlight = service.highlights.some(h => h.toLowerCase() === canonical.toLowerCase());
        if (!isHighlight) return; // only highlight categories

        if (!monthMap.has(monthKey)) monthMap.set(monthKey, new Map());
        const m = monthMap.get(monthKey)!;
        m.set(service.highlights.find(h => h.toLowerCase() === canonical.toLowerCase())!, (m.get(service.highlights.find(h => h.toLowerCase() === canonical.toLowerCase())!) || 0) + 1);
        monthLabels.set(monthKey, monthNames[date.getMonth()]);
      });

      const sortedMonths = Array.from(monthMap.keys()).sort();
      const chartData: CategoryTrendData[] = sortedMonths.map(monthKey => {
        const monthData = monthMap.get(monthKey)!;
        const dp: CategoryTrendData = { period: monthLabels.get(monthKey) || monthKey };
        service.highlights.forEach(h => { dp[h] = monthData.get(h) || 0; });
        return dp;
      });

      const colors = service.highlights.map((_, idx) => COLORS[idx % COLORS.length]);
      const insights = generateInsightsForCategories(chartData, service.highlights);

      return {
        key: service.key,
        name: service.key,
        title: service.title,
        categories: service.highlights,
        data: chartData,
        insights,
        colors,
      } as ServiceGroup;
    });

    // Sort groups: services with any non-zero data appear first
    const hasData = (g: ServiceGroup) =>
      g.data.some(dp => g.categories.some(cat => (Number((dp as any)[cat]) || 0) > 0));

    const sorted = [...groups].sort((a, b) => {
      const aHas = hasData(a) ? 1 : 0;
      const bHas = hasData(b) ? 1 : 0;
      return bHas - aHas; // b first if it has data
    });

    setServiceGroups(sorted);
  };

  // Note: Case-insensitive matching is applied for service matching and category highlights.

  // Normalization moved to shared util in utils/categoryNormalizer.ts

  const calculateFlexcubeVsAccMaintenance = (data: TicketData[]) => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // Filter by third_lvl_category FIRST (primary filter)
    // This gets ALL Account Maintenance tickets across all services (Flexcube, IBPS, etc.)
    const accMaintenanceTickets = data.filter(t =>
      (t.third_lvl_category || 'Unknown') === 'Account Maintenance'
    );

    // Group by cluster
    const clusterMap = new Map<string, TicketData[]>();
    accMaintenanceTickets.forEach(ticket => {
      const cluster = (ticket.cluster || 'Unknown').trim();
      if (!clusterMap.has(cluster)) {
        clusterMap.set(cluster, []);
      }
      clusterMap.get(cluster)!.push(ticket);
    });

    const clusters = Array.from(clusterMap.entries()).map(([clusterName, clusterTickets]) => {
      // Build month -> counts for this cluster
      const monthMap = new Map<string, { flexcube: number; accMaintenance: number }>();
      const monthLabels = new Map<string, string>();

      clusterTickets.forEach(ticket => {
        if (!ticket.request_time) return;
        const date = new Date(ticket.request_time);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

        if (!monthMap.has(monthKey)) {
          monthMap.set(monthKey, { flexcube: 0, accMaintenance: 0 });
        }
        const counts = monthMap.get(monthKey)!;
        counts.accMaintenance += 1;
        monthLabels.set(monthKey, monthNames[date.getMonth()]);
      });

      const sortedMonths = Array.from(monthMap.keys()).sort();
      const chartData: CategoryTrendData[] = sortedMonths.map(monthKey => {
        const counts = monthMap.get(monthKey)!;
        return {
          period: monthLabels.get(monthKey) || monthKey,
          'Account Maintenance': counts.accMaintenance,
        };
      });

      // Generate insights comparing the two
      const insights: TrendInsight[] = [];
      if (chartData.length >= 2) {
        const latest = chartData[chartData.length - 1];
        const previous = chartData[chartData.length - 2];

        // Account Maintenance insight
        const accLatest = (latest['Account Maintenance'] as number) || 0;
        const accPrev = (previous['Account Maintenance'] as number) || 0;
        const accChange = accLatest - accPrev;
        const accPercentChange = accPrev > 0 ? ((accChange / accPrev) * 100) : 0;

        if (Math.abs(accPercentChange) > 5) {
          insights.push({
            category: `${clusterName} - Account Maintenance`,
            change: accChange,
            percentChange: accPercentChange,
            trend: accChange > 0 ? 'increase' : 'decrease',
            severity: Math.abs(accPercentChange) > 30 ? 'critical' : Math.abs(accPercentChange) > 15 ? 'warning' : accChange > 0 ? 'warning' : 'positive',
            rootCause: accChange > 0 ? `Spike in Account Maintenance issues for ${clusterName}.` : `Reduction in Account Maintenance tickets for ${clusterName}.`,
            recommendation: accChange > 0 ? 'Focus training on Account Maintenance procedures.' : 'Document improvement.',
          });
        }
      }

      return {
        clusterName,
        data: chartData,
        insights,
      };
    });

    // Sort clusters by total ticket count (descending)
    clusters.sort((a, b) => {
      const aTotal = a.data.reduce((sum, d) => sum + ((d['Account Maintenance'] as number) || 0), 0);
      const bTotal = b.data.reduce((sum, d) => sum + ((d['Account Maintenance'] as number) || 0), 0);
      return bTotal - aTotal;
    });

    setFlexcubeVsAccMaintenance({ clusters });
  };

  const generateInsightsForCategories = (data: CategoryTrendData[], categories: string[]): TrendInsight[] => {
    if (data.length < 2) return [];

    const insightsList: TrendInsight[] = [];
    const latest = data[data.length - 1];
    const previous = data[data.length - 2];

    categories.forEach(category => {
      const latestCount = (latest[category] as number) || 0;
      const previousCount = (previous[category] as number) || 0;
      const change = latestCount - previousCount;
      const percentChange = previousCount > 0 ? ((change / previousCount) * 100) : 0;

      if (Math.abs(percentChange) > 5) {
        let trend: 'increase' | 'decrease' | 'stable' = 'stable';
        let severity: 'critical' | 'warning' | 'positive' | 'neutral' = 'neutral';
        let rootCause = '';
        let recommendation = '';

        if (change > 0) {
          trend = 'increase';
          if (percentChange > 30) {
            severity = 'critical';
            rootCause = 'Significant spike detected. Possible causes: system issues, knowledge gaps, or process changes.';
            recommendation = 'Immediate investigation required. Review recent changes and provide targeted training.';
          } else if (percentChange > 15) {
            severity = 'warning';
            rootCause = 'Moderate increase observed. May indicate emerging issues or seasonal patterns.';
            recommendation = 'Monitor closely. Consider proactive communication to users.';
          }
        } else {
          trend = 'decrease';
          severity = 'positive';
          rootCause = 'Improvement detected. Possible causes: training effectiveness, system fixes, or better documentation.';
          recommendation = 'Document success factors. Share best practices with other teams.';
        }

        insightsList.push({
          category,
          change,
          percentChange,
          trend,
          severity,
          rootCause,
          recommendation,
        });
      }
    });

    return insightsList.sort((a, b) => Math.abs(b.percentChange) - Math.abs(a.percentChange));
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
      {/* Header with Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">Category Trend Analysis</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Compare trends and identify improvement areas
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-2 bg-gray-50">
          <button
            onClick={() => setActiveTab('critical-services')}
            className={`relative px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium transition-all duration-200 flex items-center justify-center ${activeTab === 'critical-services'
                ? 'text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
              }`}
          >
            Critical Services
            {activeTab === 'critical-services' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>
            )}
          </button>
          <button
            onClick={() => setActiveTab('flexcube-vs-acc')}
            className={`relative px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium transition-all duration-200 flex items-center justify-center ${activeTab === 'flexcube-vs-acc'
                ? 'text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
              }`}
          >
            Account Maintenance by Cluster
            {activeTab === 'flexcube-vs-acc' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>
            )}
          </button>
        </div>
      </div>

      {/* Analysis Methodology */}
      <AnalysisMethodology />

      {/* TAB CONTENT: Critical Services Analysis */}
      {activeTab === 'critical-services' && (
        <div className="space-y-4 sm:space-y-6">
          {/* Multiple Service Group Charts */}
          {serviceGroups.map((group) => (
            <div key={group.name} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              {/* Chart Header */}
              <div className="bg-gray-50 border-b border-gray-200 px-6 py-3">
                <h3 className="text-sm font-semibold text-gray-900">
                  {group.title}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Jan - Sep 2025
                </p>
              </div>

              {/* Chart and Insights Container */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 overflow-hidden">
                {/* Chart Section */}
                <div className="lg:col-span-2 p-4 sm:p-6 border-r border-gray-200">
                  <ResponsiveContainer width="100%" height={380}>
                    <BarChart
                      data={group.data}
                      barSize={32}
                      barGap={3}
                      barCategoryGap="15%"
                      margin={{ top: 25, right: 20, left: 10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                      <XAxis
                        dataKey="period"
                        tick={{ fill: '#4b5563', fontSize: 11 }}
                        axisLine={{ stroke: '#d1d5db' }}
                        tickLine={false}
                        height={40}
                      />
                      <YAxis
                        tick={{ fill: '#4b5563', fontSize: 11 }}
                        axisLine={{ stroke: '#d1d5db' }}
                        tickLine={false}
                        width={45}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          fontSize: '12px',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                        }}
                        cursor={{ fill: 'rgba(229, 231, 235, 0.3)' }}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: '11px', paddingTop: '15px' }}
                        iconType="square"
                        iconSize={9}
                      />
                      {group.categories.map((category, idx) => (
                        <Bar
                          key={category}
                          dataKey={category}
                          fill={group.colors[idx]}
                          name={category}
                          radius={[0, 0, 0, 0]}
                          label={{
                            position: 'top',
                            fill: '#1f2937',
                            fontSize: 10,
                            fontWeight: 700
                          }}
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Key Findings Section - Editable */}
                <EditableKeyFindings
                  serviceKey={group.name}
                  automatedInsights={group.insights}
                  importId={importId}
                />
              </div>
            </div>
          ))}

          {/* Detailed Insights & Recommendations for Each Service */}
          {serviceGroups.map((group) => (
            group.insights.length > 0 && (
              <div key={`insights-${group.name}`} className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">
                  {group.title} - Detailed Analysis
                </h3>

                <div className="space-y-4">
                  {group.insights.map((insight, idx) => (
                    <EditableDetailedAnalysis
                      key={idx}
                      serviceKey={group.key}
                      category={insight.category}
                      trend={insight.trend}
                      percentChange={insight.percentChange}
                      defaultRootCause={insight.rootCause || ''}
                      defaultRecommendation={insight.recommendation || ''}
                      importId={importId}
                    />
                  ))}
                </div>
              </div>
            )
          ))}
        </div>
      )}

      {/* TAB CONTENT: Flexcube vs Account Maintenance */}
      {activeTab === 'flexcube-vs-acc' && flexcubeVsAccMaintenance && flexcubeVsAccMaintenance.clusters.length > 0 && (
        <div className="space-y-6">
          {/* Header */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h3 className="text-lg font-bold text-gray-900 text-center">
              ACCOUNT MAINTENANCE TICKET TREND BY CLUSTER
            </h3>
          </div>

          {/* Cluster Charts in Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {flexcubeVsAccMaintenance.clusters.map((cluster) => (
              <div key={cluster.clusterName} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                <div className="bg-gray-100 border-b border-gray-300 px-6 py-4">
                  <h3 className="text-base font-bold text-gray-900 text-center">
                    {cluster.clusterName}
                  </h3>
                </div>

                {/* Chart Section */}
                <div className="p-6">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={cluster.data}
                      barSize={32}
                      barGap={4}
                      barCategoryGap="15%"
                      margin={{ top: 25, right: 20, left: 10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                      <XAxis
                        dataKey="period"
                        tick={{ fill: '#4b5563', fontSize: 10 }}
                        axisLine={{ stroke: '#d1d5db' }}
                        tickLine={false}
                        height={35}
                      />
                      <YAxis
                        tick={{ fill: '#4b5563', fontSize: 10 }}
                        axisLine={{ stroke: '#d1d5db' }}
                        tickLine={false}
                        width={40}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          fontSize: '11px',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                        }}
                        cursor={{ fill: 'rgba(229, 231, 235, 0.3)' }}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: '10px', paddingTop: '12px' }}
                        iconType="square"
                        iconSize={8}
                      />
                      <Bar
                        dataKey="Account Maintenance"
                        fill="#5DB3C1"
                        name="Account Maintenance"
                        radius={[0, 0, 0, 0]}
                        label={{
                          position: 'top',
                          fill: '#1f2937',
                          fontSize: 9,
                          fontWeight: 700
                        }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ))}
          </div>

          {/* All Detailed Insights Combined */}
          {flexcubeVsAccMaintenance.clusters.some(c => c.insights.length > 0) && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">
                Cluster-Based Detailed Analysis
              </h3>

              <div className="space-y-6">
                {flexcubeVsAccMaintenance.clusters.map((cluster) => (
                  cluster.insights.length > 0 && (
                    <div key={`insights-${cluster.clusterName}`}>
                      <h4 className="text-xs font-semibold text-gray-700 mb-3">
                        {cluster.clusterName}
                      </h4>
                      <div className="space-y-4">
                        {cluster.insights.map((insight, idx) => (
                          <EditableDetailedAnalysis
                            key={idx}
                            serviceKey={`flexcube_cluster_${cluster.clusterName.toLowerCase().replace(/\s+/g, '_')}`}
                            category={insight.category}
                            trend={insight.trend}
                            percentChange={insight.percentChange}
                            defaultRootCause={insight.rootCause || ''}
                            defaultRecommendation={insight.recommendation || ''}
                            importId={importId}
                          />
                        ))}
                      </div>
                    </div>
                  )
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Methodology */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          Analysis Methodology
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">1. Data Collection</h4>
            <p className="text-sm text-gray-600">
              Monthly ticket counts collected across service categories. Data spans from January to September 2025.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-2">2. Trend Analysis</h4>
            <p className="text-sm text-gray-600">
              Month-over-month comparisons identify increases/decreases. Percentage changes highlight significant shifts.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-2">3. Root Cause Identification</h4>
            <p className="text-sm text-gray-600">
              Spikes/drops analyzed for causes: knowledge gaps, system issues, or process changes. Recommendations provided.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
