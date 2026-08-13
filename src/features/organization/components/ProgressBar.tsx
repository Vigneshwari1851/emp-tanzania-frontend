import React from "react";

interface ProgressBarProps {
  percentage: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ percentage }) => {
  const isComplete = percentage === 100;
  // Circumference for r=15 is approx 94.25
  const dashArray = 94.25;
  const dashOffset = dashArray - (dashArray * Math.min(percentage, 100)) / 100;

  return (
    <div className="flex items-center gap-3 px-2 h-10">
      <div className="relative flex items-center justify-center w-12 h-12 p-[2px]">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 40 40">
          {/* Background Track */}
          <circle
            cx="20"
            cy="20"
            r="16"
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="3.5"
          />
          {/* Progress Ring */}
          <circle
            cx="20"
            cy="20"
            r="16"
            fill="none"
            stroke={isComplete ? "#10b981" : "#6366f1"}
            className="transition-all duration-1000 ease-out"
            strokeWidth="3.5"
            strokeDasharray={dashArray}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center mt-px">
          <span className={`text-[10px] font-black ${isComplete ? 'text-emerald-600' : 'text-primary'}`}>
            {percentage}%
          </span>
        </div>
      </div>
      <div className="flex flex-col justify-center leading-[1.2]">
        <span className={`text-[13px] font-semibold ${isComplete ? 'text-emerald-600' : 'text-foreground'}`}>
          {percentage}% Complete
        </span>
        <span className="text-[10px] font-medium text-muted-foreground">
          Configuration Progress
        </span>
      </div>
    </div>
  );
};
