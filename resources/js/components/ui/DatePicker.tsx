import * as React from "react"
import ReactDatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"
import { cn } from "@/lib/utils"
import { Calendar } from "lucide-react"

// Estilos personalizados para react-datepicker
const datePickerStyles = `
  .react-datepicker-wrapper {
    width: 100% !important;
    display: block !important;
  }
  
  .react-datepicker__input-container {
    width: 100% !important;
    display: block !important;
  }
  
  .react-datepicker-popper {
    z-index: 9999 !important;
  }
  
  .react-datepicker {
    background-color: #ffffff !important;
    border: 1px solid #e5e7eb !important;
    border-radius: 0.75rem !important;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05) !important;
    font-family: inherit !important;
  }
  
  .react-datepicker__header {
    background-color: #bebebeff !important;
    border-bottom: none !important;
    border-radius: 0.75rem 0.75rem 0 0 !important;
    padding: 1rem !important;
  }
  
  .react-datepicker__current-month,
  .react-datepicker__day-name {
    color: #ffffff !important;
    font-weight: 600 !important;
  }
  
  .react-datepicker__month-dropdown,
  .react-datepicker__year-dropdown {
    background-color: #ffffff !important;
    border: 1px solid #e5e7eb !important;
    border-radius: 0.5rem !important;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1) !important;
  }
  
  .react-datepicker__month-option,
  .react-datepicker__year-option {
    background-color: #ffffff !important;
    color: #1f2937 !important;
    padding: 0.5rem !important;
  }
  
  .react-datepicker__month-option:hover,
  .react-datepicker__year-option:hover {
    background-color: #dbeafe !important;
  }
  
  .react-datepicker__month-option--selected,
  .react-datepicker__year-option--selected {
    background-color: #2563eb !important;
    color: #ffffff !important;
  }
  
  .react-datepicker__day {
    color: #1f2937 !important;
    border-radius: 0.5rem !important;
    margin: 0.25rem !important;
  }
  
  .react-datepicker__day:hover {
    background-color: #dbeafe !important;
  }
  
  .react-datepicker__day--selected,
  .react-datepicker__day--keyboard-selected {
    background-color: #2563eb !important;
    color: #ffffff !important;
    font-weight: 600 !important;
  }
  
  .react-datepicker__day--disabled {
    color: #9ca3af !important;
    cursor: not-allowed !important;
  }
  
  .react-datepicker__day--outside-month {
    color: #d1d5db !important;
  }
  
  .react-datepicker__triangle {
    display: none !important;
  }
  
  .react-datepicker__navigation {
    top: 1rem !important;
  }
  
  .react-datepicker__navigation-icon::before {
    border-color: #ffffff !important;
  }
`;

// Inyectar estilos en el DOM
if (typeof document !== 'undefined') {
  const styleId = 'react-datepicker-custom-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.innerHTML = datePickerStyles;
    document.head.appendChild(style);
  }
}

interface DatePickerProps {
  label?: string
  error?: string
  helperText?: string
  required?: boolean
  selected: Date | null
  onChange: (date: Date | null) => void
  disabled?: boolean
  className?: string
  minDate?: Date
  maxDate?: Date
  dateFormat?: string
  showYearDropdown?: boolean
  showMonthDropdown?: boolean
  isClearable?: boolean
}

export const DatePicker = React.forwardRef<HTMLDivElement, DatePickerProps>(
  ({ 
    label, 
    error, 
    helperText, 
    required, 
    selected, 
    onChange, 
    disabled,
    className = '',
    minDate,
    maxDate,
    dateFormat = "dd/MM/yyyy",
    showYearDropdown = true,
    showMonthDropdown = true,
    isClearable = false,
  }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false)
    const isLabelFloating = isFocused || !!selected

    return (
      <div className="!w-full" ref={ref}>
        <div className="relative">
          {/* Floating Label */}
          {label && (
            <label
              className={cn(
                "absolute left-3 transition-all duration-200 pointer-events-none z-10",
                "text-gray-600 origin-left",
                isLabelFloating
                  ? "top-0 -translate-y-1/2 text-xs px-1 bg-white font-medium"
                  : "top-1/2 -translate-y-1/2 text-base left-10",
                isFocused && !error && "text-blue-600",
                error && "text-red-600",
                disabled && "text-gray-400"
              )}
            >
              {label}
              {required && <span className="text-red-500 ml-0.5">*</span>}
            </label>
          )}

          {/* Calendar Icon */}
          <div className={cn(
            "absolute left-3 top-1/2 -translate-y-1/2 z-10 transition-colors duration-200 pointer-events-none",
            isFocused ? "text-blue-600" : "text-gray-400",
            error && "text-red-600",
            disabled && "text-gray-300"
          )}>
            <Calendar className="w-5 h-5" />
          </div>

          {/* DatePicker Input */}
          <ReactDatePicker
            selected={selected}
            onChange={onChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            disabled={disabled}
            minDate={minDate}
            maxDate={maxDate}
            dateFormat={dateFormat}
            placeholderText=""
            showYearDropdown={showYearDropdown}
            showMonthDropdown={showMonthDropdown}
            dropdownMode="select"
            isClearable={isClearable}
            autoComplete="off"
            wrapperClassName="!w-full !block"
            className={cn(
              "!w-full !block text-base text-gray-900 transition-all duration-200",
              "h-14 px-3 pt-4 pb-1 pl-10 bg-white",
              "border border-gray-300 rounded-md",
              "hover:border-gray-900",
              "focus:outline-none focus:border-2 focus:border-blue-600 focus:px-[11px] focus:pl-[39px]",
              "disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400 disabled:border-gray-200",
              // Remove autocomplete background
              "[&:-webkit-autofill]:bg-transparent",
              "[&:-webkit-autofill]:[-webkit-box-shadow:0_0_0_30px_white_inset]",
              "[&:-webkit-autofill:hover]:[-webkit-box-shadow:0_0_0_30px_white_inset]",
              "[&:-webkit-autofill:focus]:[-webkit-box-shadow:0_0_0_30px_white_inset]",
              error && "border-red-600 hover:border-red-700 focus:border-red-600",
              className
            )}
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
    )
  }
)

DatePicker.displayName = "DatePicker"
