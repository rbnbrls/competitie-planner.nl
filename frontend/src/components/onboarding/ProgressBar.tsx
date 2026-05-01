/*
 * File: frontend/src/components/onboarding/ProgressBar.tsx
 * Last updated: 2026-05-01
 * API version: 0.1.0
 * Author: Ruben Barels <ruben@rabar.nl>
 * Changelog:
 *   - 2026-05-01: Initial metadata header added
 */

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
  stepLabels: string[];
  onStepClick?: (step: number) => void;
}

export default function ProgressBar({ currentStep, totalSteps, stepLabels, onStepClick }: ProgressBarProps) {
  return (
    <div className="w-full mb-8">
      <div className="flex items-center justify-between">
        {stepLabels.map((label, index) => {
          const stepNumber = index + 1;
          const isActive = stepNumber === currentStep;
          const isCompleted = stepNumber < currentStep;
          const isClickable = onStepClick && stepNumber < currentStep;

          return (
            <div key={stepNumber} className="flex flex-col items-center flex-1">
              <div className="flex items-center w-full">
                <div className="flex flex-col items-center flex-1">
                  <button
                    type="button"
                    onClick={() => isClickable && onStepClick(stepNumber)}
                    disabled={!isClickable}
                    className={`
                      w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold
                      transition-all duration-200
                      ${isCompleted || isActive ? 'ring-4' : 'bg-gray-200'}
                      ${isCompleted ? 'bg-green-600 text-white ring-green-100' : ''}
                      ${isActive ? 'bg-blue-600 text-white ring-blue-100' : ''}
                      ${!isCompleted && !isActive ? 'bg-gray-200 text-gray-500 ring-gray-100' : ''}
                      ${isClickable ? 'cursor-pointer hover:scale-110' : 'cursor-default'}
                    `}
                  >
                    {isCompleted ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      stepNumber
                    )}
                  </button>
                  <span className={`
                    mt-2 text-sm font-medium text-center
                    ${isActive ? 'text-blue-700' : isCompleted ? 'text-green-700' : 'text-gray-500'}
                  `}>
                    {label}
                  </span>
                </div>
                {index < totalSteps - 1 && (
                  <div className={`
                    h-1 flex-1 mx-2 rounded transition-all duration-300
                    ${isCompleted ? 'bg-green-500' : 'bg-gray-200'}
                  `} />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}