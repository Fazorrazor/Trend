import { useState, useEffect } from 'react';
import { Trash2, Eye, Calendar, FileText, History as HistoryIcon, Edit2, X, Check } from 'lucide-react';
import { api } from '../../lib/api';
import { ticketService } from '../../services/ticketService';
import { DataImport } from '../../types/ticket';
import { useToast } from '../../contexts/ToastContext';

interface DataHistoryViewProps {
  onSelectImport: (importId: string) => void;
}

export function DataHistoryView({ onSelectImport }: DataHistoryViewProps) {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [imports, setImports] = useState<DataImport[]>([]);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editMonth, setEditMonth] = useState<number>(1);
  const [editYear, setEditYear] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    loadImports();

    // Realtime subscriptions removed during migration
  }, []);

  const loadImports = async () => {
    setLoading(true);
    try {
      const response = await api.get<{ data: DataImport[] }>('/imports');
      setImports(response.data || []);
    } catch (err) {
      console.error('Error loading imports:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditStart = (imp: DataImport) => {
    setEditing(imp.id);
    setEditMonth(imp.import_month || new Date().getMonth() + 1);
    setEditYear(imp.import_year || new Date().getFullYear());
  };

  const handleEditCancel = () => {
    setEditing(null);
  };

  const validateMonthYear = async (importId: string, month: number, year: number): Promise<{ valid: boolean; warning?: string }> => {
    try {
      // Get tickets for this import
      // Get tickets for this import
      const tickets = await ticketService.getTickets({ import_id: importId });

      if (!tickets || tickets.length === 0) {
        return { valid: true }; // No data to validate against
      }

      // Get unique months from actual ticket data
      const dataMonths = new Set(
        tickets.map(t => {
          const date = new Date(t.request_time);
          return `${date.getFullYear()}-${date.getMonth() + 1}`;
        })
      );

      const assignedMonth = `${year}-${month}`;

      // Check if assigned month exists in data
      if (!dataMonths.has(assignedMonth)) {
        const actualMonths = Array.from(dataMonths).map(m => {
          const [y, mo] = m.split('-');
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          return `${monthNames[parseInt(mo) - 1]} ${y}`;
        });

        return {
          valid: false,
          warning: `⚠️ The assigned period (${new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}) does not match the data. Actual data contains: ${actualMonths.join(', ')}`
        };
      }

      return { valid: true };
    } catch (err) {
      console.error('Validation error:', err);
      return { valid: true }; // Allow edit if validation fails
    }
  };

  const handleEditSave = async (importId: string) => {
    try {
      // Validate first
      const validation = await validateMonthYear(importId, editMonth, editYear);

      if (!validation.valid) {
        const proceed = await toast.confirm({
          title: 'Data Mismatch Warning',
          message: validation.warning || 'The assigned period does not match the actual data. Do you want to proceed anyway?',
          confirmText: 'Proceed Anyway',
          cancelText: 'Cancel',
          type: 'warning',
        });

        if (!proceed) return;
      }

      // Update the import record
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
      const monthLabel = `${monthNames[editMonth - 1]} ${editYear}`;

      await api.put(`/imports/${importId}`, {
        import_month: editMonth,
        import_year: editYear,
        month_label: monthLabel,
      });

      toast.success('Date period updated successfully');
      setEditing(null);
      loadImports(); // Reload to show updated data
    } catch (err) {
      console.error('Error updating import:', err);
      toast.error(`Failed to update: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleDelete = async (importId: string, importName: string) => {
    const confirmed = await toast.confirm({
      title: 'Delete Import',
      message: `Are you sure you want to delete "${importName}"? This will also delete all associated ticket data.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger',
    });

    if (!confirmed) return;

    setDeleting(importId);
    try {
      // Delete the import record (tickets will be auto-deleted via cascade)
      await api.delete(`/imports/${importId}`);

      // Update local state immediately
      setImports(prev => prev.filter(imp => imp.id !== importId));

      toast.success('Import deleted successfully');

      // Prompt user to refresh the page for changes to fully apply
      const shouldRefresh = await toast.confirm({
        title: 'Refresh Required',
        message: 'Please refresh the page for all changes to take effect. Would you like to refresh now?',
        confirmText: 'Refresh Now',
        cancelText: 'Later',
        type: 'warning',
      });

      if (shouldRefresh) {
        window.location.reload();
      }
    } catch (err) {
      console.error('Error deleting import:', err);
      toast.error(`Failed to delete: ${err instanceof Error ? err.message : 'Unknown error'}`);
      // Reload to ensure consistency
      loadImports();
    } finally {
      setDeleting(null);
    }
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
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-lg">
            <HistoryIcon className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Import History</h2>
            <p className="text-sm text-gray-600 mt-0.5">
              View and manage your data imports
            </p>
          </div>
        </div>
      </div>

      {/* Imports List */}
      {imports.length > 0 ? (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Import Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Data Period
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Imported On
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Records
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {imports.map(imp => (
                  <tr key={imp.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-gray-400" />
                        <span className="text-sm font-medium text-gray-900">
                          {imp.import_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {editing === imp.id ? (
                        <div className="flex items-center gap-2">
                          <select
                            value={editMonth}
                            onChange={(e) => setEditMonth(parseInt(e.target.value))}
                            className="px-2 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                              <option key={m} value={m}>
                                {new Date(2000, m - 1).toLocaleDateString('en-US', { month: 'long' })}
                              </option>
                            ))}
                          </select>
                          <select
                            value={editYear}
                            onChange={(e) => setEditYear(parseInt(e.target.value))}
                            className="px-2 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map(y => (
                              <option key={y} value={y}>{y}</option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="text-sm font-medium text-gray-900">
                            {imp.month_label || `${imp.import_month ? new Date(2000, imp.import_month - 1).toLocaleDateString('en-US', { month: 'long' }) : ''} ${imp.import_year || ''}`}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600">
                        {new Date(imp.imported_at).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-semibold text-gray-900">
                        {imp.total_records.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`
                        inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                        ${imp.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                        }
                      `}>
                        {imp.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        {editing === imp.id ? (
                          <>
                            <button
                              onClick={() => handleEditSave(imp.id)}
                              className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-1.5 text-sm font-medium"
                            >
                              <Check className="w-4 h-4" />
                              Save
                            </button>
                            <button
                              onClick={handleEditCancel}
                              className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-1.5 text-sm font-medium"
                            >
                              <X className="w-4 h-4" />
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleEditStart(imp)}
                              className="text-gray-600 hover:text-gray-900 transition-colors"
                              title="Edit Period"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => onSelectImport(imp.id)}
                              className="text-blue-600 hover:text-blue-700 transition-colors"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(imp.id, imp.import_name)}
                              disabled={deleting === imp.id}
                              className="text-red-600 hover:text-red-700 transition-colors disabled:opacity-50"
                              title="Delete Import"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center border border-gray-200">
          <div className="p-4 bg-gray-50 rounded-lg inline-block mb-4">
            <HistoryIcon className="w-12 h-12 text-gray-400" />
          </div>
          <p className="text-gray-900 text-lg font-medium">No import history</p>
          <p className="text-gray-500 text-sm mt-2">
            Import your first dataset to get started
          </p>
        </div>
      )}
    </div>
  );
}
