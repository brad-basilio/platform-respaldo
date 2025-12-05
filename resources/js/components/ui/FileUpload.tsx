import React, { useCallback, useState } from 'react';
import { Upload, X, FileImage, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  label: string;
  accept?: string;
  maxSize?: number; // in MB
  value?: File | null;
  preview?: string | null;
  onChange: (file: File | null) => void;
  onPreviewChange?: (preview: string | null) => void;
  required?: boolean;
  helperText?: string;
  error?: string;
  disabled?: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  label,
  accept = 'image/*',
  maxSize = 5,
  value,
  preview,
  onChange,
  onPreviewChange,
  required,
  helperText,
  error,
  disabled = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFile = useCallback((file: File) => {
    setUploadError(null);

    // Validar tipo de archivo
    const acceptedTypes = accept.split(',').map(t => t.trim());
    const fileType = file.type;
    const fileExtension = `.${file.name.split('.').pop()}`;
    
    const isValidType = acceptedTypes.some(type => {
      if (type === 'image/*') return fileType.startsWith('image/');
      if (type.startsWith('.')) return fileExtension === type;
      return fileType === type;
    });

    if (!isValidType) {
      setUploadError(`Tipo de archivo no permitido. Solo se acepta: ${accept}`);
      return;
    }

    // Validar tamaño
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxSize) {
      setUploadError(`El archivo es muy grande. Tamaño máximo: ${maxSize}MB`);
      return;
    }

    // Crear preview si es imagen
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onPreviewChange?.(reader.result as string);
      };
      reader.readAsDataURL(file);
    }

    onChange(file);
  }, [accept, maxSize, onChange, onPreviewChange]);

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  }, [disabled, handleFile]);

  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const onDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  const handleRemove = useCallback(() => {
    onChange(null);
    onPreviewChange?.(null);
    setUploadError(null);
  }, [onChange, onPreviewChange]);

  const displayError = error || uploadError;

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        className={cn(
          "relative border-2 border-dashed rounded-xl transition-all duration-200",
          "min-h-[200px] flex flex-col items-center justify-center p-6",
          isDragging && !disabled && "border-[#073372] bg-blue-50 scale-[1.02]",
          !isDragging && !disabled && "border-gray-300 hover:border-gray-400",
          displayError && "border-red-300 bg-red-50",
          disabled && "border-gray-200 bg-gray-50 cursor-not-allowed opacity-60",
          !disabled && "cursor-pointer"
        )}
      >
        {/* Preview o Upload Zone */}
        {preview || value ? (
          <div className="relative w-full h-full flex flex-col items-center justify-center space-y-4">
            {/* Preview de imagen */}
            {preview && (
              <div className="relative">
                <img
                  src={preview}
                  alt="Preview"
                  className="max-w-full max-h-48 rounded-lg shadow-lg border-4 border-white object-contain"
                />
                <div className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full p-1.5 shadow-lg">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>
            )}

            {/* Nombre del archivo */}
            <div className="flex items-center gap-3 bg-white rounded-lg px-4 py-3 shadow-sm border border-gray-200">
              <FileImage className="w-5 h-5 text-[#073372]" />
              <span className="text-sm font-medium text-gray-700 max-w-xs truncate">
                {value?.name || 'Archivo seleccionado'}
              </span>
              <span className="text-xs text-gray-500">
                ({((value?.size || 0) / 1024).toFixed(1)} KB)
              </span>
            </div>

            {/* Botón eliminar */}
            {!disabled && (
              <button
                type="button"
                onClick={handleRemove}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
              >
                <X className="w-4 h-4" />
                Eliminar archivo
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Zona de carga */}
            <div className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-all duration-200",
              isDragging ? "bg-[#073372] scale-110" : "bg-gray-100",
              displayError && "bg-red-100"
            )}>
              <Upload className={cn(
                "w-8 h-8 transition-colors duration-200",
                isDragging ? "text-white" : "text-gray-400",
                displayError && "text-red-500"
              )} />
            </div>

            <div className="text-center space-y-2">
              <p className="text-base font-semibold text-gray-700">
                {isDragging ? '¡Suelta el archivo aquí!' : 'Arrastra y suelta tu archivo aquí'}
              </p>
              <p className="text-sm text-gray-500">o</p>
              <label className={cn(
                "inline-block px-6 py-2.5 bg-[#073372] hover:bg-[#17BC91] text-white font-medium rounded-lg transition-colors cursor-pointer shadow-sm",
                disabled && "cursor-not-allowed opacity-50"
              )}>
                Seleccionar archivo
                <input
                  type="file"
                  className="hidden"
                  accept={accept}
                  onChange={onFileSelect}
                  disabled={disabled}
                />
              </label>
            </div>

            {helperText && !displayError && (
              <p className="text-xs text-gray-500 text-center mt-3">
                {helperText}
              </p>
            )}
          </>
        )}
      </div>

      {/* Error o Helper Text */}
      {displayError && (
        <div className="mt-2 px-3 text-xs flex items-start gap-1.5 text-red-600">
          <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span>{displayError}</span>
        </div>
      )}

      {/* Formato y tamaño aceptado */}
      {!displayError && !helperText && (
        <p className="mt-2 px-3 text-xs text-gray-500">
          Formatos aceptados: {accept} • Tamaño máximo: {maxSize}MB
        </p>
      )}
    </div>
  );
};
