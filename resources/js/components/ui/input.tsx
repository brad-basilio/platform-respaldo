import * as React from "react"

import { cn } from "@/lib/utils"

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
  variant?: 'outlined' | 'filled';
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, helperText, icon, required, variant = 'outlined', ...props }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false);
    // Fix: Verificar si el valor no es vacío, incluyendo 0 como valor válido
    const [hasValue, setHasValue] = React.useState(
      props.value !== undefined && props.value !== '' || 
      props.defaultValue !== undefined && props.defaultValue !== ''
    );

    // Fix: Actualizar hasValue cuando props.value cambie desde el padre
    React.useEffect(() => {
      setHasValue(props.value !== undefined && props.value !== '');
    }, [props.value]);

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      props.onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      // Fix: Considerar 0 como valor válido
      setHasValue(e.target.value !== '');
      props.onBlur?.(e);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      // Fix: Considerar 0 como valor válido
      setHasValue(e.target.value !== '');
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
                "text-gray-600 origin-left",
                isLabelFloating
                  ? "top-0 -translate-y-1/2 text-xs px-1 bg-white font-medium"
                  : "top-1/2 -translate-y-1/2 text-base",
                isFocused && !error && "text-blue-600",
                error && "text-red-600",
                icon && !isLabelFloating && "left-10",
                variant === 'filled' && isLabelFloating && "bg-transparent"
              )}
            >
              {label}
              {required && <span className="text-red-500 ml-0.5">*</span>}
            </label>
          )}

          {/* Leading Icon */}
          {icon && (
            <div className={cn(
              "absolute left-3 top-1/2 -translate-y-1/2 transition-colors duration-200",
              isFocused ? "text-blue-600" : "text-gray-400",
              error && "text-red-600"
            )}>
              {icon}
            </div>
          )}

          {/* Input Field */}
          <input
            type={type}
            ref={ref}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onChange={handleChange}
            className={cn(
              "peer w-full text-base text-gray-900 transition-all duration-200",
              "placeholder:text-transparent",
              "focus:outline-none",
              "disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400",
              "file:border-0 file:bg-transparent file:text-sm file:font-medium",
              // Remove autocomplete background
              "[&:-webkit-autofill]:bg-transparent",
              "[&:-webkit-autofill]:[-webkit-box-shadow:0_0_0_30px_white_inset]",
              "[&:-webkit-autofill:hover]:[-webkit-box-shadow:0_0_0_30px_white_inset]",
              "[&:-webkit-autofill:focus]:[-webkit-box-shadow:0_0_0_30px_white_inset]",
              
              // Variant: Outlined
              variant === 'outlined' && [
                "h-14 px-3 pt-4 pb-1 bg-transparent",
                "border border-gray-300 rounded-md",
                "hover:border-gray-900",
                "focus:border-2 focus:border-blue-600 focus:px-[11px]",
                error && "border-red-600 hover:border-red-700 focus:border-red-600",
              ],
              
              // Variant: Filled
              variant === 'filled' && [
                "h-14 px-3 pt-6 pb-2 bg-gray-50",
                "border-b-2 border-gray-400 rounded-t-md",
                "hover:bg-gray-100 hover:border-gray-900",
                "focus:bg-gray-100 focus:border-blue-600",
                error && "border-red-600 hover:border-red-700 focus:border-red-600",
                // Autocomplete background for filled variant
                "[&:-webkit-autofill]:[-webkit-box-shadow:0_0_0_30px_rgb(249_250_251)_inset]",
                "[&:-webkit-autofill:hover]:[-webkit-box-shadow:0_0_0_30px_rgb(243_244_246)_inset]",
                "[&:-webkit-autofill:focus]:[-webkit-box-shadow:0_0_0_30px_rgb(243_244_246)_inset]",
              ],
              
              icon && "pl-10",
              icon && variant === 'outlined' && "focus:pl-[39px]",
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
);

Input.displayName = "Input";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
  variant?: 'outlined' | 'filled';
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, helperText, icon, required, variant = 'outlined', children, ...props }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false);
    // Fix: Verificar si el valor no es vacío, incluyendo 0 como valor válido
    const [hasValue, setHasValue] = React.useState(
      props.value !== undefined && props.value !== '' || 
      props.defaultValue !== undefined && props.defaultValue !== ''
    );

    // Fix: Actualizar hasValue cuando props.value cambie desde el padre
    React.useEffect(() => {
      setHasValue(props.value !== undefined && props.value !== '');
    }, [props.value]);

    const handleFocus = (e: React.FocusEvent<HTMLSelectElement>) => {
      setIsFocused(true);
      props.onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLSelectElement>) => {
      setIsFocused(false);
      // Fix: Considerar 0 como valor válido
      setHasValue(e.target.value !== '');
      props.onBlur?.(e);
    };

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      // Fix: Considerar 0 como valor válido
      setHasValue(e.target.value !== '');
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
                "absolute left-3 transition-all duration-200 pointer-events-none z-10",
                "text-gray-600 origin-left",
                isLabelFloating
                  ? "top-0 -translate-y-1/2 text-xs px-1 bg-white font-medium"
                  : "top-1/2 -translate-y-1/2 text-base",
                isFocused && !error && "text-blue-600",
                error && "text-red-600",
                icon && !isLabelFloating && "left-10",
                variant === 'filled' && isLabelFloating && "bg-transparent"
              )}
            >
              {label}
              {required && <span className="text-red-500 ml-0.5">*</span>}
            </label>
          )}

          {/* Leading Icon */}
          {icon && (
            <div className={cn(
              "absolute left-3 top-1/2 -translate-y-1/2 z-10 transition-colors duration-200",
              isFocused ? "text-blue-600" : "text-gray-400",
              error && "text-red-600"
            )}>
              {icon}
            </div>
          )}

          {/* Select Field */}
          <select
            ref={ref}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onChange={handleChange}
            className={cn(
              "peer w-full text-base text-gray-900 transition-all duration-200 appearance-none cursor-pointer",
              "focus:outline-none",
              "disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400",
              // Remove autocomplete background
              "[&:-webkit-autofill]:bg-transparent",
              "[&:-webkit-autofill]:[-webkit-box-shadow:0_0_0_30px_white_inset]",
              "[&:-webkit-autofill:hover]:[-webkit-box-shadow:0_0_0_30px_white_inset]",
              "[&:-webkit-autofill:focus]:[-webkit-box-shadow:0_0_0_30px_white_inset]",
              
              // Variant: Outlined
              variant === 'outlined' && [
                "h-14 px-3 pt-4 pb-1 bg-transparent",
                "border border-gray-300 rounded-md",
                "hover:border-gray-900",
                "focus:border-2 focus:border-blue-600 focus:px-[11px]",
                error && "border-red-600 hover:border-red-700 focus:border-red-600",
              ],
              
              // Variant: Filled
              variant === 'filled' && [
                "h-14 px-3 pt-6 pb-2 bg-gray-50",
                "border-b-2 border-gray-400 rounded-t-md",
                "hover:bg-gray-100 hover:border-gray-900",
                "focus:bg-gray-100 focus:border-blue-600",
                error && "border-red-600 hover:border-red-700 focus:border-red-600",
                // Autocomplete background for filled variant
                "[&:-webkit-autofill]:[-webkit-box-shadow:0_0_0_30px_rgb(249_250_251)_inset]",
                "[&:-webkit-autofill:hover]:[-webkit-box-shadow:0_0_0_30px_rgb(243_244_246)_inset]",
                "[&:-webkit-autofill:focus]:[-webkit-box-shadow:0_0_0_30px_rgb(243_244_246)_inset]",
              ],
              
              icon && "pl-10",
              icon && variant === 'outlined' && "focus:pl-[39px]",
              "pr-10",
              className
            )}
            {...props}
          >
            {children}
          </select>

          {/* Dropdown Icon */}
          <div className={cn(
            "absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none transition-colors duration-200",
            isFocused ? "text-blue-600" : "text-gray-400",
            error && "text-red-600"
          )}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
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
);

Select.displayName = "Select";

export { Input, Select }

