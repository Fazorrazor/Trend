import { useState, useEffect } from 'react';
import { Activity, Clock, Filter } from 'lucide-react';
import { api } from '../../lib/api';
import { UserActivity } from '../../types/profile';
import { useAuth } from '../../contexts/AuthContext';

export function ActivityLog() {
  const { user } = useAuth();
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    if (user) {
      loadActivities();
    }
  }, [user, filter]);

  const loadActivities = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const response = await api.get<{ data: UserActivity[] }>('/users/activity', {
        params: {
          limit: 50,
          filter: filter !== 'all' ? filter : undefined
        }
      });

      setActivities(response.data || []);
    } catch (err) {
      console.error('Error loading activities:', err);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'login':
        return '🔐';
      case 'logout':
        return '👋';
      case 'profile_updated':
        return '✏️';
      case 'preferences_updated':
        return '⚙️';
      case 'data_imported':
        return '📥';
      case 'data_exported':
        return '📤';
      case 'data_deleted':
        return '🗑️';
      default:
        return '📝';
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'login':
        return 'bg-green-100 text-green-800';
      case 'logout':
        return 'bg-gray-100 text-gray-800';
      case 'profile_updated':
      case 'preferences_updated':
        return 'bg-blue-100 text-blue-800';
      case 'data_imported':
        return 'bg-purple-100 text-purple-800';
      case 'data_exported':
        return 'bg-indigo-100 text-indigo-800';
      case 'data_deleted':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatActivityType = (type: string) => {
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-lg shadow-lg p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <Activity className="w-8 h-8" />
          <h2 className="text-3xl font-bold">Activity Log</h2>
        </div>
        <p className="text-green-100">
          Track your recent activities and actions
        </p>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex items-center gap-4">
          <Filter className="w-5 h-5 text-gray-600" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="flex-1 max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="all">All Activities</option>
            <option value="login">Logins</option>
            <option value="profile_updated">Profile Updates</option>
            <option value="preferences_updated">Preference Changes</option>
            <option value="data_imported">Data Imports</option>
            <option value="data_exported">Data Exports</option>
            <option value="data_deleted">Data Deletions</option>
          </select>
        </div>
      </div>

      {/* Activity List */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {activities.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {activities.map((activity) => (
              <div key={activity.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="flex-shrink-0">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${getActivityColor(activity.activity_type)}`}>
                      {getActivityIcon(activity.activity_type)}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {formatActivityType(activity.activity_type)}
                        </h3>
                        {activity.activity_description && (
                          <p className="text-gray-600 mt-1">
                            {activity.activity_description}
                          </p>
                        )}
                        {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                          <div className="mt-2 text-sm text-gray-500">
                            <details className="cursor-pointer">
                              <summary className="hover:text-gray-700">View details</summary>
                              <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-x-auto">
                                {JSON.stringify(activity.metadata, null, 2)}
                              </pre>
                            </details>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500 whitespace-nowrap">
                        <Clock className="w-4 h-4" />
                        {new Date(activity.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <Activity className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">No activities found</p>
            <p className="text-gray-500 text-sm mt-2">
              {filter !== 'all'
                ? 'Try changing the filter to see more activities'
                : 'Your activities will appear here as you use the app'}
            </p>
          </div>
        )}
      </div>

      {/* Info */}
      {activities.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> Activity logs are kept for security and audit purposes.
            Showing the last 50 activities.
          </p>
        </div>
      )}
    </div>
  );
}
