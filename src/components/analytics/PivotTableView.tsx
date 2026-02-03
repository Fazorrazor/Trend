import { useState, useEffect } from 'react';
import { Download, ChevronDown, ChevronRight, Table, ArrowUpDown, Filter } from 'lucide-react';
import { ticketService } from '../../services/ticketService';
import { PivotTableData } from '../../types/ticket';
import { exportToCSV } from '../../utils/excelParser';
import { normalizeCategory, ServiceKey } from '../../utils/categoryNormalizer';
import { isHighlightedCategory } from '../../config/highlightedCategories';

interface PivotTableViewProps {
  importId?: string;
  selectedService?: ServiceKey;
  onChangeSelectedService?: (s: ServiceKey) => void;
}

type PivotDimension = 'category' | 'cluster-hierarchy';
// ServiceKey imported from normalizer
type FlexcubeMode = 'trend' | 'cluster' | 'account-maintenance-cluster';

export function PivotTableView({ importId, selectedService: controlledService, onChangeSelectedService }: PivotTableViewProps) {
  const [loading, setLoading] = useState(true);
  const [pivotData, setPivotData] = useState<any[]>([]);
  const [weeks, setWeeks] = useState<string[]>([]);
  const [expandedClusters, setExpandedClusters] = useState<Set<string>>(new Set());
  const [uncontrolledService, setUncontrolledService] = useState<ServiceKey>(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem('pivot:selectedService') : null;
    return (saved as ServiceKey) || 'flexcube';
  });
  const [flexcubeMode, setFlexcubeMode] = useState<FlexcubeMode>(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem('pivot:flexcubeMode') : null;
    return (saved as FlexcubeMode) || 'trend';
  });
  const [showOnlyHighlighted, setShowOnlyHighlighted] = useState(false);
  const [sortOrder, setSortOrder] = useState<'default' | 'highest' | 'lowest'>('default');
  const selectedService = controlledService ?? uncontrolledService;

  useEffect(() => {
    loadPivotData();

    // Realtime subscriptions removed during migration
  }, [importId, selectedService, flexcubeMode]);

  // Persist to localStorage when uncontrolled
  useEffect(() => {
    if (!controlledService) {
      try { window.localStorage.setItem('pivot:selectedService', selectedService); } catch { }
    }
  }, [selectedService, controlledService]);
  useEffect(() => {
    try { window.localStorage.setItem('pivot:flexcubeMode', flexcubeMode); } catch { }
  }, [flexcubeMode]);

  const loadPivotData = async () => {
    setLoading(true);
    try {
      // Fetch all tickets for the import
      const data = await ticketService.getTickets({ import_id: importId });


      // For Account Maintenance cluster mode, use ALL tickets (filter by third_lvl_category only)
      // For other modes, filter by service first
      const allTickets = data || [];

      let tickets;
      let pivot;

      if (selectedService === 'flexcube' && flexcubeMode === 'account-maintenance-cluster') {
        // For Account Maintenance: filter by third_lvl_category across ALL services
        pivot = buildAccountMaintenanceClusterPivot(allTickets);
      } else {
        // For other modes: filter by service
        tickets = allTickets.filter((t: any) => {
          switch (selectedService) {
            case 'flexcube':
              return ((t.sub_category || '').trim().toLowerCase()).includes('flexcube');
            case 'cards':
              return ((t.category || '').trim().toLowerCase()).includes('cards services');
            case 'ibps':
              return ((t.sub_category || '').trim().toLowerCase()).includes('ibps');
            case 'mfs':
              return ((t.category || '').trim().toLowerCase()).includes('mobile financial services');
            case 'smart_teller':
              return ((t.sub_category || '').trim().toLowerCase()).includes('smart teller');
            default:
              return false;
          }
        });

        // Per-service pivot behavior
        if (selectedService === 'flexcube') {
          if (flexcubeMode === 'cluster') {
            pivot = buildClusterTotalsPivot(tickets);
          } else {
            pivot = buildPivotTable(tickets, 'category');
          }
        } else {
          // Other services: standard Third Level Category pivot only
          pivot = buildPivotTable(tickets, 'category');
        }
      }

      setPivotData(pivot.data);
      setWeeks(pivot.weeks);
    } catch (err) {
      console.error('Error loading pivot data:', err);
    } finally {
      setLoading(false);
    }
  };

  const buildPivotTable = (tickets: any[], dimension: PivotDimension): { data: PivotTableData[]; weeks: string[] } => {
    // Get all unique weeks and sort them
    const uniqueWeeks = [...new Set(tickets.map(t => t.week_label).filter(Boolean))];
    const sortedWeeks = uniqueWeeks.sort((a, b) => {
      const numA = parseInt(a.replace('Week ', ''));
      const numB = parseInt(b.replace('Week ', ''));
      return numA - numB;
    });

    // Get dimension field name
    const dimensionField = dimension === 'category' ? 'third_lvl_category' : dimension;

    // Normalize values for case-insensitive grouping
    // Also apply Smart Teller-specific normalization for third level categories
    const valueMap = new Map<string, string>(); // lower -> display label
    const normalizedTickets = tickets.map(t => {
      let val = (t[dimensionField] || 'Unassigned') as string;
      if (dimensionField === 'third_lvl_category' && selectedService === 'smart_teller') {
        val = normalizeCategory('smart_teller', val) || 'Unassigned';
      }
      const lower = String(val).trim().toLowerCase() || 'unassigned';
      if (!valueMap.has(lower)) valueMap.set(lower, String(val));
      return { ...t, [dimensionField]: valueMap.get(lower)! };
    });

    const uniqueValues = [...valueMap.values()];

    // Build the pivot structure
    const pivotMap = new Map<string, PivotTableData>();

    uniqueValues.forEach(value => {
      const row: PivotTableData = {
        third_lvl_category: value, // Using this field name for compatibility
      };

      sortedWeeks.forEach(week => {
        const count = normalizedTickets.filter(
          t => String(t[dimensionField] || 'Unassigned').toLowerCase() === String(value).toLowerCase() && t.week_label === week
        ).length;
        row[week] = count;
      });

      pivotMap.set(value, row);
    });

    // Sort data: highlighted categories first, then alphabetically
    const sortedData = Array.from(pivotMap.values()).sort((a, b) => {
      const aIsHighlighted = isHighlightedCategory(selectedService, a.third_lvl_category);
      const bIsHighlighted = isHighlightedCategory(selectedService, b.third_lvl_category);

      // If one is highlighted and the other isn't, highlighted comes first
      if (aIsHighlighted && !bIsHighlighted) return -1;
      if (!aIsHighlighted && bIsHighlighted) return 1;

      // Otherwise, sort alphabetically
      return a.third_lvl_category.localeCompare(b.third_lvl_category);
    });

    return {
      data: sortedData,
      weeks: sortedWeeks,
    };
  };


  // Flexcube-specific: Cluster totals pivot (rows: cluster, single column: Tickets)
  const buildClusterTotalsPivot = (tickets: any[]): { data: any[]; weeks: string[] } => {
    const counts = new Map<string, number>();
    tickets.forEach(t => {
      const cluster = t.cluster && t.cluster.trim() !== '' ? t.cluster : 'Blank';
      counts.set(cluster, (counts.get(cluster) || 0) + 1);
    });
    const rows = Array.from(counts.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([cluster, count]) => ({ third_lvl_category: cluster, Tickets: count }));
    return { data: rows, weeks: ['Tickets'] };
  };

  // Flexcube-specific: Account Maintenance cluster pivot (no weekly axis)
  // Uses EXACT same filter as the drill-down modal to ensure consistency
  const buildAccountMaintenanceClusterPivot = (tickets: any[]): { data: any[]; weeks: string[] } => {
    const filtered = tickets.filter(t =>
      (t.third_lvl_category || 'Unknown') === 'Account Maintenance'
    );
    const counts = new Map<string, number>();
    filtered.forEach(t => {
      const cluster = t.cluster && t.cluster.trim() !== '' ? t.cluster : 'Blank';
      counts.set(cluster, (counts.get(cluster) || 0) + 1);
    });
    const rows = Array.from(counts.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([cluster, count]) => ({ third_lvl_category: cluster, 'Account Maintenance': count }));
    return { data: rows, weeks: ['Account Maintenance'] };
  };

  const handleExport = () => {
    if (pivotData.length === 0) return;

    const exportData = pivotData.map(row => {
      const obj: any = { 'Third Level Category': row.third_lvl_category };
      weeks.forEach(week => {
        obj[week] = row[week] || 0;
      });
      // Add total
      obj['Total'] = weeks.reduce((sum, week) => sum + (Number(row[week]) || 0), 0);
      return obj;
    });

    // Add totals row
    const totalsRow: any = { 'Third Level Category': 'TOTAL' };
    weeks.forEach(week => {
      totalsRow[week] = pivotData.reduce((sum, row) => sum + (Number(row[week]) || 0), 0);
    });
    totalsRow['Total'] = weeks.reduce((sum, week) => sum + totalsRow[week], 0);
    exportData.push(totalsRow);

    exportToCSV(exportData, `pivot-table-${new Date().toISOString().split('T')[0]}.csv`);
  };

  const calculateRowTotal = (row: PivotTableData): number => {
    return weeks.reduce((sum, week) => sum + (Number(row[week]) || 0), 0);
  };

  const calculateColumnTotal = (week: string, data?: any[]): number => {
    const dataToUse = data || pivotData;
    return dataToUse.reduce((sum, row) => sum + (Number(row[week]) || 0), 0);
  };

  const calculateGrandTotal = (data?: any[]): number => {
    const dataToUse = data || pivotData;
    return dataToUse.reduce((sum, row) => sum + calculateRowTotal(row), 0);
  };

  // Apply filters and sorting to pivot data
  const getFilteredAndSortedData = (): any[] => {
    let data = [...pivotData];

    // Filter: Show only highlighted categories (for category view, not cluster views)
    const isInCategoryMode = selectedService !== 'flexcube' || flexcubeMode === 'trend';
    if (showOnlyHighlighted && isInCategoryMode) {
      data = data.filter(row => isHighlightedCategory(selectedService, row.third_lvl_category));
    }

    // Sort by total
    if (sortOrder === 'highest') {
      data.sort((a, b) => calculateRowTotal(b) - calculateRowTotal(a));
    } else if (sortOrder === 'lowest') {
      data.sort((a, b) => calculateRowTotal(a) - calculateRowTotal(b));
    }
    // 'default' keeps the original sorting (highlighted first, then alphabetical)

    return data;
  };

  const toggleCluster = (clusterName: string) => {
    setExpandedClusters(prev => {
      const newSet = new Set(prev);
      if (newSet.has(clusterName)) {
        newSet.delete(clusterName);
      } else {
        newSet.add(clusterName);
      }
      return newSet;
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
    <div className="space-y-3 sm:space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 lg:p-6 border border-gray-200 animate-fadeIn">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3 lg:gap-4">
          <div className="flex items-center gap-2 lg:gap-3">
            <div className="p-1.5 lg:p-2 bg-blue-50 rounded-lg">
              <Table className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-blue-600" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900">Pivot Table</h2>
              <p className="text-xs sm:text-sm text-gray-600 mt-0.5 hidden sm:block">
                {selectedService === 'flexcube' && flexcubeMode === 'cluster'
                  ? 'Cluster totals'
                  : selectedService === 'flexcube' && flexcubeMode === 'account-maintenance-cluster'
                    ? 'Account Maintenance by Cluster'
                    : 'Tickets by category across weeks'}
              </p>
            </div>
          </div>
          <button
            onClick={handleExport}
            disabled={pivotData.length === 0}
            className="w-full sm:w-auto px-3 py-1.5 lg:px-4 lg:py-2 text-xs sm:text-sm lg:text-base bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 lg:gap-2 shadow-sm transition-all duration-200 hover:scale-105 hover:shadow-md"
          >
            <Download className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Service Selector and Flexcube Modes */}
      <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 lg:p-6 border border-gray-200 animate-fadeIn" style={{ animationDelay: '100ms' }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
          {/* Service Selector */}
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 lg:mb-2">Service</label>
            <select
              value={selectedService}
              onChange={(e) => {
                const v = e.target.value as ServiceKey;
                if (onChangeSelectedService) onChangeSelectedService(v);
                else setUncontrolledService(v);
              }}
              className="w-full px-3 py-2 lg:px-4 lg:py-2.5 text-sm lg:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all duration-200"
            >
              <option value="flexcube">Flexcube</option>
              <option value="cards">Cards Services</option>
              <option value="ibps">IBPS</option>
              <option value="mfs">Mobile Financial Services</option>
              <option value="smart_teller">Smart Teller</option>
            </select>
          </div>

          {/* Flexcube-only pivot type selector */}
          {selectedService === 'flexcube' && (
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 lg:mb-2">Flexcube Pivot Type</label>
              <select
                value={flexcubeMode}
                onChange={(e) => setFlexcubeMode(e.target.value as FlexcubeMode)}
                className="w-full px-3 py-2 lg:px-4 lg:py-2.5 text-sm lg:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all duration-200"
              >
                <option value="trend">3rd Level Category</option>
                <option value="cluster">F12 Cluster</option>
                <option value="account-maintenance-cluster">Account Maintenance (Cluster)</option>
              </select>
            </div>
          )}
          {/* For other services, no extra selector (fixed to 3rd Level Category) */}
        </div>
      </div>

      {/* Filter and Sort Controls - Show for category view only (not cluster views) */}
      {(selectedService !== 'flexcube' || flexcubeMode === 'trend') && (
        <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 lg:p-6 border border-gray-200 transition-all duration-300 ease-in-out">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
            {/* Filter Toggle */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-600" />
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showOnlyHighlighted}
                  onChange={(e) => setShowOnlyHighlighted(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">Show only trend categories</span>
                <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-xs font-semibold rounded">
                  Highlighted
                </span>
              </label>
            </div>

            {/* Sort Selector */}
            <div className="flex items-center gap-2 ml-0 sm:ml-auto">
              <ArrowUpDown className="w-4 h-4 text-gray-600" />
              <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Sort by:</label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as 'default' | 'highest' | 'lowest')}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all duration-200"
              >
                <option value="default">Default (Trend First)</option>
                <option value="highest">Highest Total</option>
                <option value="lowest">Lowest Total</option>
              </select>
            </div>
          </div>

          {/* Active Filters Info */}
          {(showOnlyHighlighted || sortOrder !== 'default') && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs animate-fadeIn">
              <span className="text-gray-600 font-medium">Active filters:</span>
              {showOnlyHighlighted && (
                <span className="px-2 py-1 bg-amber-100 text-amber-800 rounded-full font-medium transition-all duration-200 hover:bg-amber-200 hover:scale-105">
                  Trend categories only
                </span>
              )}
              {sortOrder !== 'default' && (
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full font-medium transition-all duration-200 hover:bg-blue-200 hover:scale-105">
                  Sorted by: {sortOrder === 'highest' ? 'Highest total' : 'Lowest total'}
                </span>
              )}
              <button
                onClick={() => {
                  setShowOnlyHighlighted(false);
                  setSortOrder('default');
                }}
                className="px-2 py-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full font-medium transition-all duration-200 hover:scale-105"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      )}

      {/* Pivot Table */}
      {pivotData.length > 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 -mx-3 sm:mx-0 lg:mx-0 animate-fadeIn" style={{ animationDelay: '200ms' }}>
          {/* Results Count */}
          {(showOnlyHighlighted || sortOrder !== 'default') && (
            <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 text-sm text-gray-600">
              Showing <span className="font-semibold text-gray-900">{getFilteredAndSortedData().length}</span> of {pivotData.length} categories
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0 z-50 shadow-lg border-b-2 border-gray-300">
                <tr>
                  <th className="sticky left-0 z-50 bg-gray-50 px-2 sm:px-3 lg:px-6 py-2 lg:py-3 text-left text-xs lg:text-sm font-semibold text-gray-700 uppercase tracking-wide border-r border-gray-200 w-[120px] sm:w-[160px] lg:w-[240px] shadow-sm">
                    {selectedService === 'flexcube' && (flexcubeMode === 'cluster' || flexcubeMode === 'account-maintenance-cluster') ? 'Cluster' : 'Category'}
                  </th>
                  {weeks.map(week => (
                    <th
                      key={week}
                      className="px-1.5 sm:px-2 lg:px-4 py-2 lg:py-3 text-center text-xs lg:text-sm font-semibold text-gray-700 uppercase tracking-wide whitespace-nowrap w-[45px] sm:w-[55px] lg:w-[85px] bg-gray-50"
                    >
                      {week}
                    </th>
                  ))}
                  <th className="px-1.5 sm:px-2 lg:px-4 py-2 lg:py-3 text-center text-xs lg:text-sm font-semibold text-gray-700 uppercase tracking-wide bg-blue-50 border-l border-gray-200 w-[45px] sm:w-[55px] lg:w-[85px] shadow-sm">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {getFilteredAndSortedData().map((row, idx) => {
                  const isCluster = row.isCluster === true;
                  const isAffiliate = row.isAffiliate === true;
                  const indentLevel = row.indentLevel || 0;
                  const clusterName = isAffiliate ? row.cluster : row.third_lvl_category;
                  const isExpanded = expandedClusters.has(clusterName);
                  const isHighlighted = !isCluster && !isAffiliate && isHighlightedCategory(selectedService, row.third_lvl_category);

                  // Hide affiliate rows if their parent cluster is collapsed
                  if (isAffiliate && !isExpanded) {
                    return null;
                  }

                  return (
                    <tr
                      key={idx}
                      className={`
                          ${isCluster ? 'bg-blue-50 hover:bg-blue-100 font-bold border-t-2 border-blue-200 cursor-pointer' : 'hover:bg-gray-50'}
                          ${isAffiliate ? 'bg-gray-50' : ''}
                          ${isHighlighted ? 'bg-amber-50 border-l-4 border-l-amber-400' : ''}
                          transition-all duration-200 ease-in-out animate-fadeIn
                        `}
                      style={{ animationDelay: `${idx * 20}ms` }}
                      onClick={() => isCluster && toggleCluster(row.third_lvl_category)}
                    >
                      <td
                        className={`
                            sticky left-0 z-10 px-2 sm:px-3 lg:px-6 py-2 lg:py-3 text-xs lg:text-sm border-r border-gray-200 w-[120px] sm:w-[160px] lg:w-[240px]
                            ${isCluster ? 'bg-blue-50 font-bold text-blue-900' : isAffiliate ? 'bg-gray-50 text-gray-700' : isHighlighted ? 'bg-amber-50 font-bold text-amber-900' : 'bg-white font-medium text-gray-900'}
                          `}
                        style={{ paddingLeft: `${(indentLevel * (window.innerWidth >= 1024 ? 20 : 12)) + (window.innerWidth >= 1024 ? 12 : 8)}px` }}
                      >
                        <div className="flex items-center gap-1 lg:gap-2 overflow-hidden">
                          {isCluster && (
                            isExpanded ? (
                              <ChevronDown className="w-3 h-3 lg:w-4 lg:h-4 text-blue-600 flex-shrink-0" />
                            ) : (
                              <ChevronRight className="w-3 h-3 lg:w-4 lg:h-4 text-blue-600 flex-shrink-0" />
                            )
                          )}
                          {isAffiliate && <span className="text-gray-400 text-[10px] lg:text-xs flex-shrink-0">└</span>}
                          <span className="overflow-hidden text-ellipsis whitespace-nowrap leading-tight lg:leading-normal" title={row.third_lvl_category}>
                            {row.third_lvl_category}
                          </span>
                          {isHighlighted && (
                            <span className="ml-auto flex-shrink-0 px-1.5 py-0.5 bg-amber-200 text-amber-900 text-[10px] font-bold rounded uppercase tracking-wide">
                              Trend
                            </span>
                          )}
                        </div>
                      </td>
                      {weeks.map(week => {
                        const value = Number(row[week]) || 0;
                        return (
                          <td
                            key={week}
                            className={`
                                px-1 sm:px-1.5 lg:px-4 py-2 lg:py-3 whitespace-nowrap text-xs lg:text-sm text-center w-[45px] sm:w-[55px] lg:w-[85px]
                                ${isCluster ? 'font-bold text-blue-900' : 'text-gray-700'}
                              `}
                          >
                            {value > 0 ? (
                              <span className={`
                                  inline-flex items-center justify-center min-w-[24px] lg:min-w-[32px] h-5 lg:h-7 px-1.5 lg:px-2.5 rounded font-semibold text-[10px] sm:text-xs lg:text-sm
                                  ${isCluster ? 'bg-blue-200 text-blue-900' : 'bg-blue-100 text-blue-800'}
                                `}>
                                {value}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                        );
                      })}
                      <td className={`
                          px-1 sm:px-1.5 lg:px-4 py-2 lg:py-3 whitespace-nowrap text-xs lg:text-sm text-center font-bold border-l border-gray-200 w-[45px] sm:w-[55px] lg:w-[85px]
                          ${isCluster ? 'bg-blue-100 text-blue-900' : 'bg-blue-50 text-gray-900'}
                        `}>
                        {calculateRowTotal(row)}
                      </td>
                    </tr>
                  );
                })}
                {/* Totals Row - Calculate from filtered/visible data */}
                <tr className="bg-gray-100 font-bold border-t-2 border-gray-300">
                  <td className="sticky left-0 z-10 bg-gray-100 px-2 sm:px-3 lg:px-6 py-2 lg:py-3 whitespace-nowrap text-xs lg:text-sm text-gray-900 border-r border-gray-200 w-[120px] sm:w-[160px] lg:w-[240px]">
                    TOTAL
                  </td>
                  {weeks.map(week => (
                    <td
                      key={week}
                      className="px-1 sm:px-1.5 lg:px-4 py-2 lg:py-3 whitespace-nowrap text-xs lg:text-sm text-center text-gray-900 w-[45px] sm:w-[55px] lg:w-[85px]"
                    >
                      {calculateColumnTotal(week, getFilteredAndSortedData())}
                    </td>
                  ))}
                  <td className="px-1 sm:px-1.5 lg:px-4 py-2 lg:py-3 whitespace-nowrap text-xs lg:text-sm text-center text-gray-900 bg-blue-100 border-l border-gray-200 w-[45px] sm:w-[55px] lg:w-[85px]">
                    {calculateGrandTotal(getFilteredAndSortedData())}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm p-8 sm:p-12 text-center">
          <Table className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-3 sm:mb-4" />
          <p className="text-base sm:text-lg text-gray-600">No data available</p>
          <p className="text-xs sm:text-sm text-gray-500 mt-2">Import ticket data to see the pivot table</p>
        </div>
      )}
    </div>
  );
}
