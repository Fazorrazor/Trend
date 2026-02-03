import { useState, useEffect } from 'react';
import { Plus, Trash2, Building2, FolderTree, X, ChevronDown, ChevronRight, Settings } from 'lucide-react';
import { api } from '../../lib/api';
import { ClusterAffiliateMapping } from '../../types/ticket';
import { useToast } from '../../contexts/ToastContext';

export function ClusterMappingView() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [mappings, setMappings] = useState<ClusterAffiliateMapping[]>([]);
  const [newCluster, setNewCluster] = useState('');
  const [newAffiliates, setNewAffiliates] = useState<string[]>(['']);
  const [adding, setAdding] = useState(false);
  const [expandedClusters, setExpandedClusters] = useState<Set<string>>(new Set());
  useEffect(() => {
    loadMappings();

    // Realtime subscriptions removed during migration
  }, []);

  const loadMappings = async () => {
    setLoading(true);
    try {
      const response = await api.get<{ data: ClusterAffiliateMapping[] }>('/settings/cluster-mappings');
      setMappings(response.data || []);
    } catch (err) {
      console.error('Error loading mappings:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleCluster = (cluster: string) => {
    setExpandedClusters(prev => {
      const next = new Set(prev);
      if (next.has(cluster)) {
        next.delete(cluster);
      } else {
        next.add(cluster);
      }
      return next;
    });
  };

  const addAffiliateField = () => {
    setNewAffiliates([...newAffiliates, '']);
  };

  const removeAffiliateField = (index: number) => {
    if (newAffiliates.length > 1) {
      setNewAffiliates(newAffiliates.filter((_, i) => i !== index));
    }
  };

  const updateAffiliate = (index: number, value: string) => {
    const updated = [...newAffiliates];
    updated[index] = value;
    setNewAffiliates(updated);
  };

  const handleAdd = async () => {
    // Filter out empty affiliates
    const validAffiliates = newAffiliates
      .map(a => a.trim())
      .filter(a => a.length > 0);

    if (!newCluster.trim()) {
      toast.warning('Please enter a cluster name');
      return;
    }

    if (validAffiliates.length === 0) {
      toast.warning('Please enter at least one affiliate');
      return;
    }

    setAdding(true);
    try {
      // Create array of mappings to insert
      const mappingsToInsert = validAffiliates.map(affiliate => ({
        cluster: newCluster.trim(),
        affiliate: affiliate,
      }));

      await api.post('/settings/cluster-mappings', mappingsToInsert);

      // Reset form
      setNewCluster('');
      setNewAffiliates(['']);
      loadMappings();

      toast.success(`Successfully added ${validAffiliates.length} affiliate${validAffiliates.length !== 1 ? 's' : ''} to ${newCluster.trim()}`);
    } catch (err) {
      console.error('Error adding mappings:', err);
      toast.error(`Failed to add: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await toast.confirm({
      title: 'Delete Mapping',
      message: 'Are you sure you want to delete this mapping?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger',
    });

    if (!confirmed) return;

    try {
      await api.delete(`/settings/cluster-mappings/${id}`);
      loadMappings();
    } catch (err) {
      console.error('Error deleting mapping:', err);
      toast.error(`Failed to delete: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // Group mappings by cluster
  const groupedMappings = mappings.reduce((acc, mapping) => {
    if (!acc[mapping.cluster]) {
      acc[mapping.cluster] = [];
    }
    acc[mapping.cluster].push(mapping);
    return acc;
  }, {} as Record<string, ClusterAffiliateMapping[]>);

  // Get unique clusters for dropdown
  const existingClusters = Array.from(new Set(mappings.map(m => m.cluster))).sort();
  const clusterStats = Object.entries(groupedMappings).map(([cluster, affiliates]) => ({
    cluster,
    count: affiliates.length
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <FolderTree className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Organizational Structure</h2>
              <p className="text-sm text-gray-600 mt-0.5">
                Manage cluster-affiliate relationships
              </p>
            </div>
          </div>
          <div className="flex gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{existingClusters.length}</div>
              <div className="text-xs text-gray-600">Clusters</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{mappings.length}</div>
              <div className="text-xs text-gray-600">Affiliates</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel - Add New Mapping */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 sticky top-6">
            <div className="flex items-center gap-2 mb-4">
              <Plus className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">Add Mapping</h3>
            </div>

            <div className="space-y-4">
              {/* Cluster Input with Dropdown */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cluster Name
                </label>
                <input
                  type="text"
                  list="existing-clusters"
                  value={newCluster}
                  onChange={(e) => setNewCluster(e.target.value)}
                  placeholder="Type or select cluster"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <datalist id="existing-clusters">
                  {existingClusters.map(cluster => (
                    <option key={cluster} value={cluster} />
                  ))}
                </datalist>
                <p className="text-xs text-gray-500 mt-1">
                  Type new or select existing
                </p>
              </div>

              {/* Affiliates Input - Multiple */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Affiliate Names
                  </label>
                  <button
                    type="button"
                    onClick={addAffiliateField}
                    className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    Add Another
                  </button>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {newAffiliates.map((affiliate, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={affiliate}
                        onChange={(e) => updateAffiliate(index, e.target.value)}
                        placeholder={`Affiliate ${index + 1}`}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      {newAffiliates.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeAffiliateField(index)}
                          className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Remove this affiliate"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Add multiple affiliates to the same cluster at once
                </p>
              </div>

              {/* Add Button */}
              <button
                onClick={handleAdd}
                disabled={adding || !newCluster.trim() || newAffiliates.every(a => !a.trim())}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium transition-colors"
              >
                <Plus className="w-5 h-5" />
                {adding ? 'Adding...' : `Add ${newAffiliates.filter(a => a.trim()).length || ''} Affiliate${newAffiliates.filter(a => a.trim()).length !== 1 ? 's' : ''} to Cluster`}
              </button>
            </div>

            {/* Quick Stats */}
            {clusterStats.length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Quick Stats</h4>
                <div className="space-y-2">
                  {clusterStats.slice(0, 5).map(stat => (
                    <div key={stat.cluster} className="flex justify-between text-sm">
                      <span className="text-gray-600 truncate">{stat.cluster}</span>
                      <span className="text-blue-600 font-medium">{stat.count} affiliate{stat.count !== 1 ? 's' : ''}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Mappings Tree View */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Cluster Hierarchy</h3>
              <div className="text-sm text-gray-500">
                {Object.keys(groupedMappings).length} cluster{Object.keys(groupedMappings).length !== 1 ? 's' : ''}
              </div>
            </div>

            {Object.keys(groupedMappings).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(groupedMappings).map(([cluster, affiliates]) => {
                  const isExpanded = expandedClusters.has(cluster);
                  return (
                    <div key={cluster} className="border border-gray-200 rounded-lg overflow-hidden">
                      {/* Cluster Header */}
                      <button
                        onClick={() => toggleCluster(cluster)}
                        className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          {isExpanded ? (
                            <ChevronDown className="w-5 h-5 text-gray-600" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-gray-600" />
                          )}
                          <FolderTree className="w-5 h-5 text-blue-600" />
                          <span className="font-semibold text-gray-900">{cluster}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full">
                            {affiliates.length} affiliate{affiliates.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </button>

                      {/* Affiliates List */}
                      {isExpanded && (
                        <div className="p-4 bg-white">
                          <div className="space-y-2">
                            {affiliates.map((mapping) => (
                              <div
                                key={mapping.id}
                                className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors group"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-8 flex justify-center">
                                    <div className="w-px h-6 bg-gray-300"></div>
                                  </div>
                                  <Building2 className="w-4 h-4 text-gray-400" />
                                  <span className="text-gray-700">{mapping.affiliate}</span>
                                </div>
                                <button
                                  onClick={() => handleDelete(mapping.id)}
                                  className="opacity-0 group-hover:opacity-100 text-red-600 hover:text-red-800 hover:bg-red-50 p-2 rounded transition-all"
                                  title="Remove affiliate"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="p-4 bg-gray-50 rounded-lg inline-block mb-4">
                  <FolderTree className="w-12 h-12 text-gray-400" />
                </div>
                <p className="text-gray-900 font-medium">No organizational structure defined</p>
                <p className="text-gray-500 text-sm mt-2">Start by adding your first cluster and affiliate</p>
              </div>
            )}
          </div>

          {/* Info Box */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
              <Settings className="w-4 h-4" />
              How It Works
            </h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• <strong>Clusters</strong> are high-level organizational groups (e.g., regions, divisions)</li>
              <li>• <strong>Affiliates</strong> are individual entities within each cluster (e.g., offices, teams)</li>
              <li>• One cluster can contain multiple affiliates</li>
              <li>• Use these mappings to filter and analyze ticket data by organizational structure</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
