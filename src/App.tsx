import { useState, useEffect } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { LoginForm } from './components/auth/LoginForm';
import { AnalyticsDashboard } from './components/analytics/AnalyticsDashboard';
import { InteractiveOnboarding } from './components/onboarding/InteractiveOnboarding';
import { useAuth } from './contexts/AuthContext';

function AppContent() {
  const { user, loading } = useAuth();
  const [showInteractiveTour, setShowInteractiveTour] = useState(false);

  useEffect(() => {
    if (user) {
      // Check if user has completed onboarding before
      const hasCompletedOnboarding = localStorage.getItem(`onboarding_completed_${user.id}`);
      if (!hasCompletedOnboarding) {
        // Start tour after a short delay to let the page load
        setTimeout(() => {
          setShowInteractiveTour(true);
        }, 800);
      }
    }
  }, [user]);

  const handleInteractiveTourFinish = () => {
    if (user) {
      localStorage.setItem(`onboarding_completed_${user.id}`, 'true');
    }
    setShowInteractiveTour(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-gray-50 flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginForm />;
  }

  const handleShowTutorial = () => {
    // Allow replaying the interactive tour
    setShowInteractiveTour(true);
  };

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col">
      <InteractiveOnboarding
        run={showInteractiveTour}
        onFinish={handleInteractiveTourFinish}
      />
      <div className="flex-1 flex flex-col w-full max-w-full">
        <AnalyticsDashboard onShowTutorial={handleShowTutorial} />
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
