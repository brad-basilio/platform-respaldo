import * as React from "react"
import { cn } from "@/lib/utils"

interface RadioGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string;
  onValueChange?: (value: string) => void;
  defaultValue?: string;
  disabled?: boolean;
  name?: string;
}

interface RadioGroupContextValue {
  value?: string;
  onValueChange?: (value: string) => void;
  name?: string;
  disabled?: boolean;
}

const RadioGroupContext = React.createContext<RadioGroupContextValue>({});

const RadioGroup = React.forwardRef<HTMLDivElement, RadioGroupProps>(
  ({ className, value, onValueChange, defaultValue, disabled, name, children, ...props }, ref) => {
    const [internalValue, setInternalValue] = React.useState(defaultValue);
    const currentValue = value !== undefined ? value : internalValue;

    const handleValueChange = React.useCallback((newValue: string) => {
      if (value === undefined) {
        setInternalValue(newValue);
      }
      onValueChange?.(newValue);
    }, [value, onValueChange]);

    return (
      <RadioGroupContext.Provider value={{ value: currentValue, onValueChange: handleValueChange, name, disabled }}>
        <div
          ref={ref}
          role="radiogroup"
          className={cn("grid gap-2", className)}
          {...props}
        >
          {children}
        </div>
      </RadioGroupContext.Provider>
    );
  }
);
RadioGroup.displayName = "RadioGroup";

interface RadioGroupItemProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  value: string;
}

const RadioGroupItem = React.forwardRef<HTMLInputElement, RadioGroupItemProps>(
  ({ className, value, id, disabled: itemDisabled, ...props }, ref) => {
    const context = React.useContext(RadioGroupContext);
    const isChecked = context.value === value;
    const isDisabled = itemDisabled || context.disabled;
    const inputId = id || `radio-${value}`;

    return (
      <div className="relative flex items-center">
        <input
          ref={ref}
          type="radio"
          id={inputId}
          name={context.name}
          value={value}
          checked={isChecked}
          disabled={isDisabled}
          onChange={() => context.onValueChange?.(value)}
          className="sr-only peer"
          {...props}
        />
        <label
          htmlFor={inputId}
          className={cn(
            "aspect-square h-4 w-4 rounded-full border border-gray-300 cursor-pointer",
            "flex items-center justify-center",
            "ring-offset-white transition-all duration-200",
            "focus-within:ring-2 focus-within:ring-[#073372] focus-within:ring-offset-2",
            "peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
            isChecked && "border-[#073372]",
            className
          )}
        >
          {isChecked && (
            <span className="h-2.5 w-2.5 rounded-full bg-[#073372] animate-in zoom-in-50 duration-200" />
          )}
        </label>
      </div>
    );
  }
);
RadioGroupItem.displayName = "RadioGroupItem";

export { RadioGroup, RadioGroupItem };
