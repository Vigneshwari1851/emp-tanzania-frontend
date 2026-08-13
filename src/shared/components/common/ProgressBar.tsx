import * as React from "react";

interface ProgressBarProps {
  progress: number;
  label?: string;
  size?: "sm" | "md" | "lg";
  color?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ 
  progress, 
  label = "Completion", 
  size = "md",
  color = "bg-primary"
}) => {
  const heightClass = size === "sm" ? "h-1.5" : size === "lg" ? "h-3" : "h-2";

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className="text-sm font-semibold text-primary">{Math.round(progress)}%</span>
      </div>
      <div className={`w-full bg-gray-200 rounded-full ${heightClass}`}>
        <div
          className={`${color} ${heightClass} rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};
