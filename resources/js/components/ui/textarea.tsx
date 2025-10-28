import * as React from "react"
import { cn } from "@/lib/utils"

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  variant?: 'outlined' | 'filled';
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, helperText, required, variant = 'outlined', ...props }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false);
    const [hasValue, setHasValue] = React.useState(!!props.value || !!props.defaultValue);

    const handleFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
      setIsFocused(true);
      props.onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
      setIsFocused(false);
      setHasValue(!!e.target.value);
      props.onBlur?.(e);
    };

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setHasValue(!!e.target.value);
      props.onChange?.(e);
    };

    const isLabelFloating = isFocused || hasValue;

    return (
      <div className="w-full">
        <div className="relative">
          {/* Floating Label */}
          {label && (
            <label
              className={cn(
                "absolute left-3 transition-all duration-200 pointer-events-none",
                "text-gray-600 origin-left z-10",
                isLabelFloating
                  ? "top-0 -translate-y-1/2 text-xs px-1 bg-white font-medium"
                  : "top-5 text-base",
                isFocused && !error && "text-blue-600",
                error && "text-red-600",
                variant === 'filled' && isLabelFloating && "bg-transparent"
              )}
            >
              {label}
              {required && <span className="text-red-500 ml-0.5">*</span>}
            </label>
          )}

          {/* Textarea Field */}
          <textarea
            ref={ref}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onChange={handleChange}
            className={cn(
              "peer w-full text-base text-gray-900 transition-all duration-200 resize-none",
              "placeholder:text-transparent",
              "focus:outline-none",
              "disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400",
              
              // Variant: Outlined
              variant === 'outlined' && [
                "min-h-[100px] px-3 pt-6 pb-2 bg-transparent",
                "border border-gray-300 rounded-md",
                "hover:border-gray-900",
                "focus:border-2 focus:border-blue-600 focus:px-[11px] focus:pt-[23px]",
                error && "border-red-600 hover:border-red-700 focus:border-red-600",
              ],
              
              // Variant: Filled
              variant === 'filled' && [
                "min-h-[100px] px-3 pt-8 pb-2 bg-gray-50",
                "border-b-2 border-gray-400 rounded-t-md",
                "hover:bg-gray-100 hover:border-gray-900",
                "focus:bg-gray-100 focus:border-blue-600",
                error && "border-red-600 hover:border-red-700 focus:border-red-600",
              ],
              
              className
            )}
            {...props}
          />
        </div>

        {/* Helper Text / Error Message */}
        {(helperText || error) && (
          <div className={cn(
            "mt-1 px-3 text-xs flex items-start gap-1 transition-colors duration-200",
            error ? "text-red-600" : "text-gray-600"
          )}>
            {error && (
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            )}
            <span className="leading-relaxed">{error || helperText}</span>
          </div>
        )}
      </div>
    );
  }
)

Textarea.displayName = "Textarea"

export { Textarea }
