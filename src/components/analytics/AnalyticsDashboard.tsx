import { useState, useEffect } from 'react';
import { Upload, Table, TrendingUp, History, Settings, HelpCircle, LogOut, User, BarChart3 } from 'lucide-react';
import { DataImportView } from './DataImportView';
import { PivotTableView } from './PivotTableView';
import { TrendAnalyticsDashboard } from './TrendAnalyticsDashboard';
import { CategoryTrendAnalysis } from './CategoryTrendAnalysis';
import { DataHistoryView } from './DataHistoryView';
import { ClusterMappingView } from './ClusterMappingView';
import { ProfileDashboard } from '../profile/ProfileDashboard';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { DataImport } from '../../types/ticket';

type ViewType = 'import' | 'pivot' | 'trends' | 'category-trends' | 'history' | 'settings' | 'profile';

interface AnalyticsDashboardProps {
  onShowTutorial?: () => void;
}

export function AnalyticsDashboard({ onShowTutorial }: AnalyticsDashboardProps) {
  const { signOut } = useAuth();
  const [currentView, setCurrentView] = useState<ViewType>('import');
  const [selectedImport, setSelectedImport] = useState<string | undefined>(undefined);
  // Persisted pivot filters so they survive tab switches
  const [pivotSelectedService, setPivotSelectedService] = useState<'flexcube' | 'cards' | 'ibps' | 'mfs' | 'smart_teller'>('flexcube');
  const [imports, setImports] = useState<DataImport[]>([]);
  const [hasData, setHasData] = useState(false);

  useEffect(() => {
    checkForData();
    loadImports();

    // Realtime subscriptions removed during migration
  }, []);

  const checkForData = async () => {
    try {
      const response = await api.get<{ pagination: { total: number } }>('/tickets', {
        params: { limit: 1 }
      });
      const count = response.pagination.total;

      setHasData((count || 0) > 0);

      // If we have data but no view selected, default to trends
      if ((count || 0) > 0 && currentView === 'import') {
        setCurrentView('trends');
      }
    } catch (err) {
      console.error('Error checking data:', err);
    }
  };

  const loadImports = async () => {
    try {
      const response = await api.get<{ data: DataImport[] }>('/imports');
      setImports(response.data || []);


    } catch (err) {
      console.error('Error loading imports:', err);
    }
  };

  const handleImportComplete = () => {
    checkForData();
    loadImports();
    setCurrentView('trends');
  };

  const handleLogout = async () => {
    await signOut();
  };

  const tabs = [
    { id: 'import' as ViewType, label: 'Import Data', icon: Upload, tourId: 'nav-import' },
    { id: 'trends' as ViewType, label: 'Trend Analysis', icon: TrendingUp, disabled: !hasData, tourId: 'nav-trends' },
    { id: 'category-trends' as ViewType, label: 'Category Trends', icon: BarChart3, disabled: !hasData, tourId: 'nav-category' },
    { id: 'pivot' as ViewType, label: 'Pivot Table', icon: Table, disabled: !hasData, tourId: 'nav-pivot' },
    { id: 'history' as ViewType, label: 'History', icon: History, disabled: !hasData, tourId: 'nav-history' },
    { id: 'settings' as ViewType, label: 'Settings', icon: Settings, tourId: 'nav-settings' },
    { id: 'profile' as ViewType, label: 'Profile', icon: User, tourId: 'nav-profile' },
  ];

  return (
    <div className="min-h-screen w-full overflow-x-hidden">
      <div className="w-full max-w-[100vw] mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6">
        {/* Header */}
        <header className="mb-6 sm:mb-8">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 truncate">
                Ticket Analytics
              </h1>
              <p className="text-sm text-gray-600">
                Analyze and visualize your ticket data
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {onShowTutorial && (
                <button
                  data-tour="help-button"
                  onClick={onShowTutorial}
                  className="px-3 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2 font-medium transition-all text-sm shadow-sm"
                  title="Show Tutorial"
                >
                  <HelpCircle className="w-4 h-4" />
                  <span className="hidden sm:inline">Help</span>
                </button>
              )}
              <button
                onClick={handleLogout}
                className="px-3 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2 font-medium transition-all text-sm shadow-sm"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </header>
        {/* Import Filter */}
        {hasData && imports.length > 0 && currentView !== 'import' && currentView !== 'settings' && currentView !== 'profile' && (
          <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 mb-4 sm:mb-6 border border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <label className="text-sm font-medium text-gray-700 whitespace-nowrap flex-shrink-0">
                Filter by Import:
              </label>
              <select
                value={selectedImport || ''}
                onChange={(e) => setSelectedImport(e.target.value || undefined)}
                className="flex-1 sm:max-w-md px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all"
              >
                <option value="">All Data</option>
                {imports.map(imp => (
                  <option key={imp.id} value={imp.id}>
                    {imp.import_name} - {new Date(imp.imported_at).toLocaleDateString()} ({imp.total_records.toLocaleString()} records)
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
        {/* Tabs Navigation */}
        <nav className="bg-white rounded-lg shadow-sm mb-4 sm:mb-6 overflow-hidden border border-gray-200">
          <div className="grid grid-cols-7 w-full">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  data-tour={tab.tourId}
                  onClick={() => !tab.disabled && setCurrentView(tab.id)}
                  disabled={tab.disabled}
                  title={tab.label}
                  className={`
                    w-full h-full min-w-0 flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-3 md:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-medium transition-all border-b-[3px]
                    ${currentView === tab.id
                      ? 'text-blue-600 border-blue-600 bg-blue-50 font-semibold'
                      : tab.disabled
                        ? 'text-gray-400 cursor-not-allowed opacity-50 border-transparent'
                        : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50 border-transparent'
                    }
                  `}
                >
                  <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="hidden md:inline truncate text-xs sm:text-sm" title={tab.label}>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
        {/* Content Area */}
        <main className="min-h-[400px] sm:min-h-[600px] w-full">
          {currentView === 'import' && <DataImportView onImportComplete={handleImportComplete} />}
          {currentView === 'trends' && <TrendAnalyticsDashboard importId={selectedImport} />}
          {currentView === 'category-trends' && <CategoryTrendAnalysis importId={selectedImport} />}
          {currentView === 'pivot' && (
            <PivotTableView
              importId={selectedImport}
              selectedService={pivotSelectedService}
              onChangeSelectedService={setPivotSelectedService}
            />
          )}
          {currentView === 'history' && (
            <DataHistoryView
              onSelectImport={(id: string) => {
                setSelectedImport(id);
                setCurrentView('trends');
              }}
            />
          )}
          {currentView === 'settings' && <ClusterMappingView />}
          {currentView === 'profile' && <ProfileDashboard />}
        </main>
      </div>
    </div>
  );
}
