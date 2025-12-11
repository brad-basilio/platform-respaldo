import * as React from "react"
import { cn } from "@/lib/utils"

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, max = 100, showLabel = false, size = 'md', variant = 'default', ...props }, ref) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

    const sizeClasses = {
      sm: 'h-1.5',
      md: 'h-2.5',
      lg: 'h-4',
    };

    const variantClasses = {
      default: 'bg-[#073372]',
      success: 'bg-[#17BC91]',
      warning: 'bg-[#F98613]',
      danger: 'bg-red-500',
    };

    // Auto variant based on percentage
    const getAutoVariant = () => {
      if (variant !== 'default') return variantClasses[variant];
      if (percentage >= 100) return variantClasses.success;
      if (percentage >= 70) return variantClasses.default;
      if (percentage >= 40) return variantClasses.warning;
      return variantClasses.danger;
    };

    return (
      <div className={cn("w-full", className)} ref={ref} {...props}>
        <div
          className={cn(
            "w-full bg-gray-200 rounded-full overflow-hidden",
            sizeClasses[size]
          )}
        >
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500 ease-out",
              getAutoVariant()
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
        {showLabel && (
          <div className="mt-1 flex justify-between text-xs text-gray-600">
            <span>{Math.round(percentage)}%</span>
            <span>{value}/{max}</span>
          </div>
        )}
      </div>
    );
  }
);

Progress.displayName = "Progress";

export { Progress };
