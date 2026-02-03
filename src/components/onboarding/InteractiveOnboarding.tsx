import { useState } from 'react';
import Joyride, { CallBackProps, STATUS, Step, Styles } from 'react-joyride';

interface InteractiveOnboardingProps {
  run: boolean;
  onFinish: () => void;
}

export function InteractiveOnboarding({ run, onFinish }: InteractiveOnboardingProps) {
  const [stepIndex, setStepIndex] = useState(0);

  const steps: Step[] = [
    {
      target: 'body',
      content: (
        <div>
          <h2 className="text-2xl font-bold mb-3 text-gray-900">Welcome to Ticket Analytics! 🎉</h2>
          <p className="text-gray-700 mb-3">
            Let's take a quick interactive tour to help you get started with the platform.
          </p>
          <p className="text-sm text-gray-600">
            This will only take 2 minutes. You can skip anytime by pressing ESC.
          </p>
        </div>
      ),
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: '[data-tour="nav-import"]',
      content: (
        <div>
          <h3 className="text-lg font-bold mb-2 text-gray-900">📥 Import Data</h3>
          <p className="text-gray-700">
            Start here to upload your ticket data. You can drag & drop Excel files or paste data directly from your spreadsheet.
          </p>
        </div>
      ),
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '[data-tour="nav-trends"]',
      content: (
        <div>
          <h3 className="text-lg font-bold mb-2 text-gray-900">📈 Trend Analysis</h3>
          <p className="text-gray-700">
            View beautiful visualizations of your ticket trends, including weekly volumes, category breakdowns, and priority distributions.
          </p>
        </div>
      ),
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '[data-tour="nav-category"]',
      content: (
        <div>
          <h3 className="text-lg font-bold mb-2 text-gray-900">📊 Category Trends</h3>
          <p className="text-gray-700">
            Deep dive into specific service categories with detailed analysis, AI-powered insights, and customizable findings.
          </p>
        </div>
      ),
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '[data-tour="nav-pivot"]',
      content: (
        <div>
          <h3 className="text-lg font-bold mb-2 text-gray-900">🔄 Pivot Tables</h3>
          <p className="text-gray-700">
            Create dynamic pivot tables to cross-tabulate your data. View tickets by category and time period with automatic calculations.
          </p>
        </div>
      ),
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '[data-tour="nav-history"]',
      content: (
        <div>
          <h3 className="text-lg font-bold mb-2 text-gray-900">📜 Import History</h3>
          <p className="text-gray-700">
            Manage all your past data imports. View details, edit periods, or delete old imports. Changes sync in real-time.
          </p>
        </div>
      ),
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '[data-tour="nav-settings"]',
      content: (
        <div>
          <h3 className="text-lg font-bold mb-2 text-gray-900">⚙️ Settings</h3>
          <p className="text-gray-700">
            Configure cluster and affiliate mappings to organize your data according to your organizational structure.
          </p>
        </div>
      ),
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '[data-tour="nav-profile"]',
      content: (
        <div>
          <h3 className="text-lg font-bold mb-2 text-gray-900">👤 User Profile</h3>
          <p className="text-gray-700">
            Access your profile settings, customize preferences, upload an avatar, and track your activity log.
          </p>
        </div>
      ),
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '[data-tour="help-button"]',
      content: (
        <div>
          <h3 className="text-lg font-bold mb-2 text-gray-900">❓ Help & Tutorial</h3>
          <p className="text-gray-700 mb-3">
            Need help? Click here anytime to replay this tour or access the quick start guide.
          </p>
          <p className="text-sm text-gray-600 italic">
            Pro tip: You can always press ESC to close any dialog!
          </p>
        </div>
      ),
      placement: 'left',
      disableBeacon: true,
    },
    {
      target: 'body',
      content: (
        <div>
          <h2 className="text-2xl font-bold mb-3 text-gray-900">You're All Set! 🚀</h2>
          <p className="text-gray-700 mb-3">
            You now know your way around the Ticket Analytics Dashboard!
          </p>
          <ul className="space-y-2 mb-3">
            <li className="flex items-start gap-2">
              <span className="text-green-600">✓</span>
              <span className="text-gray-700">Start by importing your first dataset</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600">✓</span>
              <span className="text-gray-700">Explore trends and create pivot tables</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600">✓</span>
              <span className="text-gray-700">Export your analysis to CSV anytime</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600">✓</span>
              <span className="text-gray-700">Replay this tour from the Help menu</span>
            </li>
          </ul>
          <p className="text-sm text-gray-600">
            Ready to dive in? Let's get started! 🎯
          </p>
        </div>
      ),
      placement: 'center',
      disableBeacon: true,
    },
  ];

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, index, action, type } = data;

    if (([STATUS.FINISHED, STATUS.SKIPPED] as string[]).includes(status)) {
      onFinish();
      return;
    }

    // Update step index based on action
    if (type === 'step:after') {
      if (action === 'next') {
        setStepIndex(index + 1);
      } else if (action === 'prev') {
        setStepIndex(index - 1);
      }
    }
  };

  const joyrideStyles: Partial<Styles> = {
    options: {
      arrowColor: '#ffffff',
      backgroundColor: '#ffffff',
      overlayColor: 'rgba(0, 0, 0, 0.5)',
      primaryColor: '#2563eb',
      textColor: '#1f2937',
      width: 400,
      zIndex: 10000,
    },
    tooltip: {
      borderRadius: 12,
      padding: 20,
    },
    tooltipContainer: {
      textAlign: 'left',
    },
    tooltipTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 8,
    },
    tooltipContent: {
      fontSize: 14,
      lineHeight: 1.6,
      padding: '8px 0',
    },
    buttonNext: {
      backgroundColor: '#2563eb',
      borderRadius: 8,
      fontSize: 14,
      fontWeight: 600,
      padding: '10px 20px',
    },
    buttonBack: {
      color: '#6b7280',
      fontSize: 14,
      marginRight: 10,
    },
    buttonSkip: {
      color: '#9ca3af',
      fontSize: 13,
    },
    spotlight: {
      borderRadius: 8,
    },
  };

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      showProgress
      showSkipButton
      stepIndex={stepIndex}
      callback={handleJoyrideCallback}
      styles={joyrideStyles}
      locale={{
        back: 'Back',
        close: 'Close',
        last: 'Finish',
        next: 'Next',
        skip: 'Skip Tour',
      }}
      floaterProps={{
        disableAnimation: false,
      }}
      scrollToFirstStep
      disableScrolling={false}
      spotlightPadding={8}
    />
  );
}
