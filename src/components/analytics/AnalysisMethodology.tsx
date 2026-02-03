import { Database, TrendingUp, Target } from 'lucide-react';

export function AnalysisMethodology() {
  const methodologies = [
    {
      step: '1. Data Collection',
      icon: Database,
      description: 'Monthly ticket counts collected across service categories throughout the year (January to December).',
      color: 'blue',
    },
    {
      step: '2. Trend Analysis',
      icon: TrendingUp,
      description: 'Month-over-month comparisons identify increases/decreases. Percentage changes highlight significant shifts.',
      color: 'green',
    },
    {
      step: '3. Root Cause Identification',
      icon: Target,
      description: 'Spikes/drops analyzed for causes: knowledge gaps, system issues, or process changes. Recommendations provided.',
      color: 'amber',
    },
  ];

  const colorMap = {
    blue: {
      bg: 'bg-blue-50',
      icon: 'text-blue-600',
      border: 'border-blue-200',
    },
    green: {
      bg: 'bg-green-50',
      icon: 'text-green-600',
      border: 'border-green-200',
    },
    amber: {
      bg: 'bg-amber-50',
      icon: 'text-amber-600',
      border: 'border-amber-200',
    },
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Analysis Methodology</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {methodologies.map((methodology, index) => {
          const Icon = methodology.icon;
          const colors = colorMap[methodology.color as keyof typeof colorMap];
          
          return (
            <div
              key={index}
              className={`${colors.bg} ${colors.border} border rounded-lg p-4 transition-all hover:shadow-md`}
            >
              <div className="flex items-start gap-3">
                <div className={`flex-shrink-0 p-2 bg-white rounded-lg ${colors.border} border`}>
                  <Icon className={`w-5 h-5 ${colors.icon}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">
                    {methodology.step}
                  </h4>
                  <p className="text-xs text-gray-700 leading-relaxed">
                    {methodology.description}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
