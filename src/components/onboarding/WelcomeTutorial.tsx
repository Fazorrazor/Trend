import { useState } from 'react';
import type { ComponentType } from 'react';
import { 
  X, 
  ArrowRight, 
  Upload, 
  TrendingUp, 
  Table, 
  Download,
  CheckCircle,
  Sparkles
} from 'lucide-react';

interface WelcomeTutorialProps {
  userName?: string;
  onComplete: () => void;
  onSkip: () => void;
}

interface TutorialStep {
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  tips?: string[];
  image?: string;
}

const tutorialSteps: TutorialStep[] = [
  {
    title: 'Welcome to Ticket Analytics',
    description: 'Your powerful dashboard for analyzing ticket data with beautiful visualizations and insights.',
    icon: Sparkles,
    tips: [
      'Import Excel data in seconds',
      'Get instant trend analysis',
      'Create dynamic pivot tables',
      'Export results to CSV'
    ]
  },
  {
    title: 'Step 1: Import Your Data',
    description: 'Start by importing your ticket data. You can either upload an Excel file or paste data directly from Excel.',
    icon: Upload,
    tips: [
      'Click "Import Data" tab',
      'Drag & drop your Excel file OR paste data (Ctrl+V)',
      'Give your import a name (e.g., "Q4 2025 Tickets")',
      'Click "Parse Data" to validate',
      'Click "Import" to save'
    ]
  },
  {
    title: 'Step 2: Analyze Trends',
    description: 'View powerful analytics including weekly trends, category breakdowns, and priority distributions.',
    icon: TrendingUp,
    tips: [
      'Navigate to "Trend Analysis" tab',
      'See KPI cards with key metrics',
      'Explore interactive charts',
      'Filter by specific imports',
      'Export trends to CSV'
    ]
  },
  {
    title: 'Step 3: Create Pivot Tables',
    description: 'Cross-tabulate your data with dynamic pivot tables showing categories across weeks.',
    icon: Table,
    tips: [
      'Go to "Pivot Table" tab',
      'View tickets by category and week',
      'Filter by specific categories',
      'See totals automatically calculated',
      'Export pivot table to CSV'
    ]
  },
  {
    title: 'Step 4: Export & Share',
    description: 'Download your analytics and pivot tables as CSV files for reporting and sharing.',
    icon: Download,
    tips: [
      'Click "Export" button on any view',
      'CSV files download instantly',
      'Open in Excel for further analysis',
      'Share with your team'
    ]
  },
  {
    title: 'You\'re All Set!',
    description: 'You now know everything you need to master the Ticket Analytics Dashboard. Let\'s get started!',
    icon: CheckCircle,
    tips: [
      'Start by importing your first dataset',
      'Explore all the features at your own pace',
      'Check "History" to manage past imports',
      'Use "Settings" to configure cluster mappings'
    ]
  }
];

export function WelcomeTutorial({ userName = 'User', onComplete, onSkip }: WelcomeTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const currentTutorial = tutorialSteps[currentStep];
  const Icon = currentTutorial.icon;
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === tutorialSteps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    setIsVisible(false);
    setTimeout(() => {
      onComplete();
    }, 300);
  };

  const handleSkip = () => {
    setIsVisible(false);
    setTimeout(() => {
      onSkip();
    }, 300);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm animate-fadeIn p-2 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl xl:max-w-3xl mx-auto overflow-hidden animate-slideUp">
        {/* Header */}
        <div className="bg-blue-600 p-6 text-white relative">
          <button
            onClick={handleSkip}
            className="absolute top-4 right-4 text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
          
          {isFirstStep && (
            <div className="mb-4">
              <h1 className="text-3xl font-bold mb-2">
                Welcome, {userName}
              </h1>
              <p className="text-blue-100 text-base">
                Let's take a quick tour to get you started
              </p>
            </div>
          )}

          <div className="flex items-center justify-center mb-4">
            <div className="bg-white bg-opacity-20 rounded-lg p-3">
              <Icon className="w-10 h-10" />
            </div>
          </div>

          <h2 className="text-2xl font-bold text-center">
            {currentTutorial.title}
          </h2>
        </div>

        {/* Progress Bar */}
        <div className="bg-gray-200 h-1.5">
          <div
            className="bg-blue-600 h-1.5 transition-all duration-300 ease-out"
            style={{ width: `${((currentStep + 1) / tutorialSteps.length) * 100}%` }}
          />
        </div>

        {/* Content */}
        <div className="p-8">
          <p className="text-gray-700 text-base mb-6 text-center">
            {currentTutorial.description}
          </p>

          {currentTutorial.tips && currentTutorial.tips.length > 0 && (
            <div className="bg-blue-50 rounded-lg p-5 mb-6">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-600" />
                {isFirstStep ? 'Key Features:' : 'How to do it:'}
              </h3>
              <ul className="space-y-2">
                {currentTutorial.tips.map((tip, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700 text-base">{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Step Indicator */}
          <div className="flex justify-center gap-2 mb-6">
            {tutorialSteps.map((_, idx) => (
              <div
                key={idx}
                className={`h-2 rounded-full transition-all duration-300 ${
                  idx === currentStep
                    ? 'w-8 bg-blue-600'
                    : idx < currentStep
                    ? 'w-2 bg-blue-400'
                    : 'w-2 bg-gray-300'
                }`}
              />
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={handleSkip}
              className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium transition-colors"
            >
              Skip Tutorial
            </button>

            <div className="flex gap-3">
              {!isFirstStep && (
                <button
                  onClick={handlePrevious}
                  className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-all"
                >
                  Previous
                </button>
              )}
              <button
                onClick={handleNext}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2 transition-all shadow-sm"
              >
                {isLastStep ? (
                  <>
                    Get Started
                    <CheckCircle className="w-5 h-5" />
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }

        .animate-slideUp {
          animation: slideUp 0.4s ease-out;
        }
      `}</style>
    </div>
  );
}
