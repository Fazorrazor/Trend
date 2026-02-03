import { useState } from 'react';
import { User, Activity } from 'lucide-react';
import { UserProfile } from './UserProfile';
import { ActivityLog } from './ActivityLog';

type ProfileView = 'profile' | 'activity';

export function ProfileDashboard() {
  const [currentView, setCurrentView] = useState<ProfileView>('profile');

  const tabs = [
    { id: 'profile' as ProfileView, label: 'Profile', icon: User },
    { id: 'activity' as ProfileView, label: 'Activity Log', icon: Activity },
  ];
  return (
    <div className="space-y-4 xs:space-y-5 sm:space-y-6">
      {/* Tabs */}
      <nav className="bg-white rounded-lg shadow-sm overflow-hidden" aria-label="Profile navigation">
        <div className="border-b border-gray-200">
          <div className="flex items-center px-6 gap-8">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setCurrentView(tab.id)}
                  title={tab.label}
                  aria-label={tab.label}
                  aria-current={currentView === tab.id ? 'page' : undefined}
                  className={`
                    relative inline-flex items-center gap-2.5 px-1 py-4
                    text-sm font-medium transition-colors duration-150
                    whitespace-nowrap border-b-2 -mb-[2px]
                    ${currentView === tab.id
                      ? 'text-blue-600 border-blue-600'
                      : 'text-gray-600 hover:text-gray-900 hover:border-gray-300 border-transparent'
                    }
                  `}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" strokeWidth={2} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Content */}
      <div>
        {currentView === 'profile' && <UserProfile />}
        {currentView === 'activity' && <ActivityLog />}
      </div>
    </div>
  );
}
