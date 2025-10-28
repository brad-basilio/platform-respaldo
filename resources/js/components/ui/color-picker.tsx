import * as React from "react"
import { HexColorPicker } from "react-colorful"
import { cn } from "@/lib/utils"

interface ColorPickerProps {
  label?: string;
  value?: string;
  onChange?: (color: string) => void;
  error?: string;
  helperText?: string;
  required?: boolean;
  className?: string;
}

const ColorPicker = React.forwardRef<HTMLInputElement, ColorPickerProps>(
  ({ label, value = '#3B82F6', onChange, error, helperText, required, className }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false);
    const [isPickerOpen, setIsPickerOpen] = React.useState(false);
    const [color, setColor] = React.useState(value);
    const pickerRef = React.useRef<HTMLDivElement>(null);

    const handleChange = (newColor: string) => {
      setColor(newColor);
      onChange?.(newColor);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newColor = e.target.value;
      // Validar formato hexadecimal
      if (/^#[0-9A-F]{0,6}$/i.test(newColor) || newColor === '') {
        setColor(newColor);
        if (/^#[0-9A-F]{6}$/i.test(newColor)) {
          onChange?.(newColor);
        }
      }
    };

    const handleFocus = () => {
      setIsFocused(true);
      setIsPickerOpen(true);
    };
    
    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      // Solo cerrar si no se está haciendo clic en el picker
      if (!pickerRef.current?.contains(e.relatedTarget as Node)) {
        setIsFocused(false);
        setIsPickerOpen(false);
      }
    };

    // Cerrar el picker al hacer clic fuera
    React.useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
          setIsPickerOpen(false);
          setIsFocused(false);
        }
      };

      if (isPickerOpen) {
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
      }
    }, [isPickerOpen]);

    const isLabelFloating = isFocused || color;

    return (
      <div className={cn("w-full", className)} ref={pickerRef}>
        <div className="relative">
          {/* Floating Label */}
          {label && (
            <label
              className={cn(
                "absolute left-3 transition-all duration-200 pointer-events-none z-20",
                "origin-left",
                isLabelFloating
                  ? "top-0 -translate-y-1/2 text-xs px-1 bg-white font-medium"
                  : "top-1/2 -translate-y-1/2 text-base",
                isFocused && !error && "text-blue-600",
                error ? "text-red-600" : !isFocused ? "text-gray-600" : ""
              )}
            >
              {label}
              {required && <span className="text-red-500 ml-0.5">*</span>}
            </label>
          )}

          {/* Input Container con Color Preview */}
          <div className="flex items-center gap-0 relative">
            {/* Color Preview (integrado en el input) */}
            <button
              type="button"
              onClick={() => {
                setIsPickerOpen(!isPickerOpen);
                setIsFocused(true);
              }}
              className={cn(
                "absolute left-1 top-1/2 -translate-y-1/2 z-10",
                "h-10 w-10 rounded-md border-2 transition-all duration-200",
                "hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-1",
                error ? "border-red-300 focus:ring-red-200" : "border-gray-300 focus:ring-blue-200"
              )}
              style={{ backgroundColor: color || '#3B82F6' }}
              aria-label="Abrir selector de color"
            />

            {/* Hex Input con estilo consistente */}
            <input
              ref={ref}
              type="text"
              value={color.toUpperCase()}
              onChange={handleInputChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              placeholder=""
              maxLength={7}
              className={cn(
                "peer w-full h-14 pl-14 pr-4 text-base font-mono text-gray-900 transition-all duration-200",
                "border-2 rounded-lg bg-white",
                "placeholder:text-transparent",
                "focus:outline-none focus:ring-4",
                "disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400",
                error 
                  ? "border-red-600 focus:border-red-600 focus:ring-red-200" 
                  : "border-gray-300 hover:border-gray-900 focus:border-blue-600 focus:ring-blue-200"
              )}
            />
          </div>

          {/* Color Picker Popup */}
          {isPickerOpen && (
            <div className="absolute z-50 mt-2 p-4 bg-white rounded-xl shadow-2xl border-2 border-gray-200 animate-scale-in">
              <HexColorPicker color={color} onChange={handleChange} />
              
              {/* Preset Colors */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-xs font-semibold text-gray-700 mb-3">Colores sugeridos</p>
                <div className="grid grid-cols-8 gap-2">
                  {[
                    '#EF4444', '#F59E0B', '#10B981', '#3B82F6', 
                    '#8B5CF6', '#EC4899', '#6366F1', '#14B8A6',
                    '#F97316', '#84CC16', '#06B6D4', '#A78BFA',
                    '#F472B6', '#FB923C', '#78716C', '#1F2937'
                  ].map((presetColor) => (
                    <button
                      key={presetColor}
                      type="button"
                      onClick={() => handleChange(presetColor)}
                      className={cn(
                        "w-9 h-9 rounded-lg border-2 transition-all hover:scale-110",
                        color.toUpperCase() === presetColor.toUpperCase()
                          ? "border-gray-900 ring-2 ring-gray-400"
                          : "border-gray-300 hover:border-gray-500"
                      )}
                      style={{ backgroundColor: presetColor }}
                      aria-label={`Color ${presetColor}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
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

ColorPicker.displayName = "ColorPicker";

export { ColorPicker }
