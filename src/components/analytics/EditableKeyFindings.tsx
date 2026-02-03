import { useState, useEffect, useRef } from 'react';
import { Edit2, Save, X, Plus, Trash2 } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';

interface Finding {
  id?: string;
  text: string;
  isCustom: boolean;
}

interface EditableKeyFindingsProps {
  serviceKey: string;
  automatedInsights: Array<{
    category: string;
    percentChange: number;
    trend: 'increase' | 'decrease' | 'stable';
  }>;
  importId?: string;
}

export function EditableKeyFindings({
  serviceKey,
  automatedInsights,
  importId
}: EditableKeyFindingsProps) {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadFindings();
  }, [serviceKey, importId]);

  const loadFindings = async () => {
    setLoading(true);
    try {
      // Load custom findings from database
      const response = await api.get<{ data: any[] }>('/analytics/key-findings', {
        params: {
          service_key: serviceKey,
          import_id: importId || 'all'
        }
      });
      const data = response.data;

      if (data && data.length > 0) {
        // Use custom findings if they exist
        setFindings(data.map(f => ({
          id: f.id,
          text: f.finding_text,
          isCustom: true
        })));
      } else {
        // Use automated insights as default
        const autoFindings = automatedInsights.slice(0, 3).map(insight => ({
          text: `${insight.category}: Tickets ${insight.trend === 'increase' ? 'increased' : 'decreased'} by ${Math.abs(insight.percentChange).toFixed(1)}%`,
          isCustom: false
        }));

        if (autoFindings.length === 0) {
          setFindings([
            { text: 'No significant changes detected in this period', isCustom: false },
            { text: 'Service performance remains stable', isCustom: false }
          ]);
        } else {
          setFindings(autoFindings);
        }
      }
    } catch (err) {
      console.error('Error loading findings:', err);
      // Fallback to automated insights
      const autoFindings = automatedInsights.slice(0, 3).map(insight => ({
        text: `${insight.category}: Tickets ${insight.trend === 'increase' ? 'increased' : 'decreased'} by ${Math.abs(insight.percentChange).toFixed(1)}%`,
        isCustom: false
      }));
      setFindings(autoFindings.length > 0 ? autoFindings : [
        { text: 'No significant changes detected in this period', isCustom: false },
        { text: 'Service performance remains stable', isCustom: false }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      // Get current user

      // Use batch update endpoint
      const customFindings = findings.filter(f => f.text.trim() !== '').map(f => ({
        text: f.text
      }));

      await api.post('/analytics/key-findings/batch', {
        service_key: serviceKey,
        import_id: importId || 'all',
        findings: customFindings
      });

      setIsEditing(false);
      loadFindings(); // Reload to get IDs
    } catch (err) {
      console.error('Error saving findings:', err);
      alert('Failed to save findings. Please try again.');
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    loadFindings(); // Reset to saved state
  };

  const handleAddFinding = () => {
    setFindings([...findings, { text: '', isCustom: true }]);
    // Scroll to bottom after adding
    setTimeout(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
      }
    }, 100);
  };

  const handleUpdateFinding = (index: number, text: string) => {
    const updated = [...findings];
    updated[index] = { ...updated[index], text, isCustom: true };
    setFindings(updated);
  };

  const handleDeleteFinding = (index: number) => {
    setFindings(findings.filter((_, i) => i !== index));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="lg:col-span-1 bg-gray-50 p-5 transition-all duration-300 ease-in-out">
      <div className="flex items-center justify-between mb-3 animate-fadeIn">
        <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
          Key Findings
        </h4>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="p-1.5 hover:bg-gray-200 rounded transition-all duration-200 hover:scale-110"
            title="Edit findings"
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
              className="p-1.5 hover:bg-red-100 rounded transition-colors"
              title="Cancel"
            >
              <X className="w-3.5 h-3.5 text-red-600" />
            </button>
          </div>
        )}
      </div>

      {/* Scrollable findings container */}
      <div
        ref={scrollContainerRef}
        className="max-h-[280px] overflow-y-auto pr-1 custom-scrollbar scroll-smooth"
      >
        <div className="space-y-4 text-xs">
          {findings.map((finding, idx) => (
            <div key={idx} className="space-y-1">
              {isEditing ? (
                <div className="flex items-start gap-2">
                  <span className="text-gray-700 font-semibold mt-2">•</span>
                  <div className="flex-1">
                    <textarea
                      value={finding.text}
                      onChange={(e) => handleUpdateFinding(idx, e.target.value)}
                      className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                      rows={2}
                      placeholder="Enter finding..."
                    />
                  </div>
                  <button
                    onClick={() => handleDeleteFinding(idx)}
                    className="mt-1 p-1 hover:bg-red-100 rounded transition-colors flex-shrink-0"
                    title="Delete finding"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-600" />
                  </button>
                </div>
              ) : (
                <div className="flex items-start gap-2">
                  <span className="text-gray-700 font-semibold">•</span>
                  <p className="text-gray-700 leading-relaxed">{finding.text}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Add button outside scrollable area */}
      {isEditing && (
        <button
          onClick={handleAddFinding}
          className="w-full mt-3 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2 text-xs font-medium text-gray-700 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Finding
        </button>
      )}

      {!isEditing && findings.some(f => f.isCustom) && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500">Custom findings saved</p>
        </div>
      )}

      {!isEditing && !findings.some(f => f.isCustom) && findings.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500">View detailed analysis below</p>
        </div>
      )}
    </div>
  );
}
