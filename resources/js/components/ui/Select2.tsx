import * as React from "react"
import ReactSelect, { Props as ReactSelectProps, StylesConfig } from "react-select"
import { cn } from "@/lib/utils"

export interface SelectOption {
  value: string | number
  label: string
  isDisabled?: boolean
}

interface Select2Props extends Omit<ReactSelectProps<SelectOption>, 'onChange' | 'value'> {
  label?: string
  error?: string
  helperText?: string
  required?: boolean
  value?: string | number | null
  onChange?: (value: string | number | null) => void
  options: SelectOption[]
  icon?: React.ReactNode
}

export const Select2: React.FC<Select2Props> = ({ 
    label, 
    error, 
    helperText, 
    required,
    value,
    onChange,
    options,
    icon,
    placeholder = "Seleccionar...",
    isDisabled,
    isClearable = true,
    isSearchable = true,
    className = '',
    ...props
  }) => {
    const [isFocused, setIsFocused] = React.useState(false)
    const selectedOption = options.find(opt => opt.value === value) || null
    const isLabelFloating = isFocused || !!selectedOption

    const customStyles: StylesConfig<SelectOption> = {
      control: (base, state) => ({
        ...base,
        minHeight: '56px',
        paddingTop: '16px',
        paddingBottom: '4px',
        paddingLeft: icon ? '40px' : '12px',
        paddingRight: '12px',
        backgroundColor: 'transparent',
        borderWidth: state.isFocused ? '2px' : '1px',
        borderColor: error 
          ? '#dc2626'
          : state.isFocused 
            ? '#073372' 
            : state.isDisabled
              ? '#e5e7eb'
              : '#d1d5db',
        borderRadius: '6px',
        boxShadow: 'none',
        transition: 'all 0.2s',
        cursor: 'pointer',
        '&:hover': {
          borderColor: error ? '#b91c1c' : state.isFocused ? '#073372' : '#111827',
        },
      }),
      valueContainer: (base) => ({
        ...base,
        padding: 0,
      }),
      input: (base) => ({
        ...base,
        margin: 0,
        padding: 0,
        fontSize: '16px',
        color: '#111827',
      }),
      placeholder: (base) => ({
        ...base,
        margin: 0,
        color: 'transparent',
        fontSize: '16px',
      }),
      singleValue: (base) => ({
        ...base,
        margin: 0,
        fontSize: '16px',
        color: '#111827',
      }),
      menu: (base) => ({
        ...base,
        borderRadius: '8px',
        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        border: '1px solid #e5e7eb',
        overflow: 'hidden',
        zIndex: 9999,
      }),
      menuList: (base) => ({
        ...base,
        padding: '4px',
        maxHeight: '300px',
      }),
      option: (base, state) => ({
        ...base,
        backgroundColor: state.isSelected 
          ? '#073372' 
          : state.isFocused 
            ? '#17BC91' 
            : 'transparent',
        color: state.isSelected || state.isFocused ? 'white' : '#111827',
        cursor: 'pointer',
        padding: '12px 16px',
        borderRadius: '6px',
        margin: '2px 0',
        fontSize: '15px',
        fontWeight: state.isSelected ? '500' : '400',
        transition: 'all 0.15s',
        '&:active': {
          backgroundColor: '#073372',
          color: 'white',
        },
      }),
      indicatorSeparator: () => ({
        display: 'none',
      }),
      dropdownIndicator: (base, state) => ({
        ...base,
        color: error 
          ? '#dc2626'
          : state.isFocused 
            ? '#073372' 
            : '#9ca3af',
        transition: 'all 0.2s',
        '&:hover': {
          color: error ? '#b91c1c' : '#073372',
        },
      }),
      clearIndicator: (base) => ({
        ...base,
        color: '#9ca3af',
        transition: 'all 0.2s',
        '&:hover': {
          color: '#dc2626',
        },
      }),
    }

    const handleChange = (newValue: SelectOption | null) => {
      onChange?.(newValue?.value ?? null)
    }

    return (
      <div className={cn("w-full", className)}>
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
                isFocused && !error && "text-[#073372]",
                error && "text-red-600",
                isDisabled && "text-gray-400",
                icon && !isLabelFloating && "left-10"
              )}
            >
              {label}
              {required && <span className="text-red-500 ml-0.5">*</span>}
            </label>
          )}

          {/* Leading Icon */}
          {icon && (
            <div className={cn(
              "absolute left-3 top-1/2 -translate-y-1/2 z-10 transition-colors duration-200 pointer-events-none",
              isFocused ? "text-[#073372]" : "text-gray-400",
              error && "text-red-600",
              isDisabled && "text-gray-300"
            )}>
              {icon}
            </div>
          )}

          {/* React Select */}
          <ReactSelect
            value={selectedOption}
            onChange={handleChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            options={options}
            isDisabled={isDisabled}
            isClearable={isClearable}
            isSearchable={isSearchable}
            placeholder={placeholder}
            styles={customStyles}
            noOptionsMessage={() => "No hay opciones disponibles"}
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
    )
  }

Select2.displayName = "Select2"
