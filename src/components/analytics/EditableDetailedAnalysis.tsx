import { useState, useEffect } from 'react';
import { Edit2, Save, X, CheckCircle, AlertTriangle } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';

interface EditableDetailedAnalysisProps {
  serviceKey: string;
  category: string;
  trend: 'increase' | 'decrease' | 'stable';
  percentChange: number;
  defaultRootCause?: string;
  defaultRecommendation?: string;
  importId?: string;
}

interface AnalysisData {
  rootCause: string;
  recommendation: string;
}

export function EditableDetailedAnalysis({
  serviceKey,
  category,
  trend,
  percentChange,
  defaultRootCause = '',
  defaultRecommendation = '',
  importId
}: EditableDetailedAnalysisProps) {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState<AnalysisData>({
    rootCause: defaultRootCause,
    recommendation: defaultRecommendation
  });
  const [editedAnalysis, setEditedAnalysis] = useState<AnalysisData>({
    rootCause: defaultRootCause,
    recommendation: defaultRecommendation
  });

  useEffect(() => {
    loadAnalysis();
  }, [serviceKey, category, importId]);

  const loadAnalysis = async () => {
    setLoading(true);
    try {
      if (!user) {
        // Not logged in, use defaults
        setAnalysis({ rootCause: defaultRootCause, recommendation: defaultRecommendation });
        setEditedAnalysis({ rootCause: defaultRootCause, recommendation: defaultRecommendation });
        setLoading(false);
        return;
      }

      // Load custom analysis from database
      const response = await api.get<{ data: any[] }>('/analytics/detailed-analysis', {
        params: {
          service_key: serviceKey,
          category: category,
          import_id: importId || 'all'
        }
      });

      const data = response.data.length > 0 ? response.data[0] : null;



      if (data) {
        // Use custom analysis if exists
        const customAnalysis = {
          rootCause: data.root_cause || defaultRootCause,
          recommendation: data.recommendation || defaultRecommendation
        };
        setAnalysis(customAnalysis);
        setEditedAnalysis(customAnalysis);
      } else {
        // Use defaults
        setAnalysis({ rootCause: defaultRootCause, recommendation: defaultRecommendation });
        setEditedAnalysis({ rootCause: defaultRootCause, recommendation: defaultRecommendation });
      }
    } catch (err) {
      console.error('Error loading analysis:', err);
      setAnalysis({ rootCause: defaultRootCause, recommendation: defaultRecommendation });
      setEditedAnalysis({ rootCause: defaultRootCause, recommendation: defaultRecommendation });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (!user) {
        alert('You must be logged in to save analysis.');
        return;
      }

      // Upsert (insert or update)
      await api.post('/analytics/detailed-analysis', {
        service_key: serviceKey,
        category: category,
        import_id: importId || 'all',
        root_cause: editedAnalysis.rootCause.trim() || null,
        recommendation: editedAnalysis.recommendation.trim() || null
      });

      setAnalysis(editedAnalysis);
      setIsEditing(false);
    } catch (err) {
      console.error('Error saving analysis:', err);
      alert('Failed to save analysis. Please try again.');
    }
  };

  const handleCancel = () => {
    setEditedAnalysis(analysis);
    setIsEditing(false);
  };

  const handleReset = async () => {
    if (!confirm('Reset to default analysis? This will delete your custom analysis.')) {
      return;
    }

    try {
      if (!user) return;

      // Delete custom analysis
      await api.delete('/analytics/detailed-analysis', {
        params: {
          service_key: serviceKey,
          category: category,
          import_id: importId || 'all'
        }
      });

      // Reset to defaults
      const defaults = { rootCause: defaultRootCause, recommendation: defaultRecommendation };
      setAnalysis(defaults);
      setEditedAnalysis(defaults);
      setIsEditing(false);
    } catch (err) {
      console.error('Error resetting analysis:', err);
      alert('Failed to reset analysis. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const isCustom = analysis.rootCause !== defaultRootCause || analysis.recommendation !== defaultRecommendation;
  const trendIcon = trend === 'increase' ? AlertTriangle : CheckCircle;
  const trendColor = trend === 'increase' ? 'red' : 'green';
  const TrendIcon = trendIcon;

  return (
    <div className={`
      p-4 rounded-lg border-l-4 transition-all duration-300 animate-fadeIn
      ${trend === 'increase' ? 'bg-red-50 border-l-red-500' : 'bg-green-50 border-l-green-500'}
    `}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <TrendIcon className={`w-5 h-5 flex-shrink-0 text-${trendColor}-600`} />
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-gray-900 text-sm truncate">{category}</h4>
            <p className="text-xs text-gray-600 mt-0.5">
              Tickets {trend === 'increase' ? 'increased' : 'decreased'} by {Math.abs(percentChange).toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1 ml-2 flex-shrink-0">
          {isCustom && !isEditing && (
            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-semibold rounded mr-1">
              Custom
            </span>
          )}
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="p-1.5 hover:bg-gray-200 rounded transition-all duration-200 hover:scale-110"
              title="Edit analysis"
            >
              <Edit2 className="w-3.5 h-3.5 text-gray-600" />
            </button>
          ) : (
            <div className="flex items-center gap-1 animate-fadeIn">
              <button
                onClick={handleSave}
                className="p-1.5 hover:bg-green-100 rounded transition-all duration-200 hover:scale-110"
                title="Save changes"
              >
                <Save className="w-3.5 h-3.5 text-green-600" />
              </button>
              <button
                onClick={handleCancel}
                className="p-1.5 hover:bg-red-100 rounded transition-all duration-200 hover:scale-110"
                title="Cancel"
              >
                <X className="w-3.5 h-3.5 text-red-600" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="space-y-3">
        {/* Root Cause */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Root Cause:
          </label>
          {isEditing ? (
            <textarea
              value={editedAnalysis.rootCause}
              onChange={(e) => setEditedAnalysis({ ...editedAnalysis, rootCause: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition-all duration-200"
              rows={2}
              placeholder="Enter root cause analysis..."
            />
          ) : (
            <p className="text-xs text-gray-700 leading-relaxed">
              {analysis.rootCause || 'No root cause specified'}
            </p>
          )}
        </div>

        {/* Recommendation */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Recommendation:
          </label>
          {isEditing ? (
            <textarea
              value={editedAnalysis.recommendation}
              onChange={(e) => setEditedAnalysis({ ...editedAnalysis, recommendation: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition-all duration-200"
              rows={2}
              placeholder="Enter recommendation..."
            />
          ) : (
            <p className="text-xs text-gray-700 leading-relaxed">
              {analysis.recommendation || 'No recommendation specified'}
            </p>
          )}
        </div>

        {/* Reset Button */}
        {isCustom && isEditing && (
          <button
            onClick={handleReset}
            className="text-xs text-gray-600 hover:text-gray-900 underline transition-colors"
          >
            Reset to default
          </button>
        )}
      </div>
    </div>
  );
}
