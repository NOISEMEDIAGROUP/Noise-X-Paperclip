type StepProgressProps = {
  currentStep: number;
  labels: string[];
};

export function StepProgress({ currentStep, labels }: StepProgressProps) {
  return (
    <div>
      {/* Progress bar */}
      <div className="mb-4 flex items-center gap-2">
        {labels.map((_, i) => {
          const stepNum = i + 1;
          const isActive = stepNum === currentStep;
          const isComplete = stepNum < currentStep;
          return (
            <div
              key={i}
              className={`h-2 flex-1 rounded-full transition-colors ${
                isComplete
                  ? "bg-violet-600"
                  : isActive
                    ? "bg-violet-400"
                    : "bg-gray-200"
              }`}
            />
          );
        })}
      </div>

      {/* Step label */}
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-gray-900">
          Step {currentStep}: {labels[currentStep - 1]}
        </span>
        <span className="text-gray-400">
          {currentStep} of {labels.length}
        </span>
      </div>
    </div>
  );
}
