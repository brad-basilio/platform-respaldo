import React, { useState } from 'react';
import { X, CreditCard, Smartphone, Building2, ArrowRight } from 'lucide-react';

interface PaymentMethodSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMethod: (method: 'yape' | 'transfer' | 'card') => void;
  installmentAmount: number;
}

const PaymentMethodSelectionModal: React.FC<PaymentMethodSelectionModalProps> = ({
  isOpen,
  onClose,
  onSelectMethod,
  installmentAmount,
}) => {
  const [selectedMethod, setSelectedMethod] = useState<'yape' | 'transfer' | 'card' | null>(null);

  if (!isOpen) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN'
    }).format(amount);
  };

  const paymentMethods = [
    {
      id: 'yape' as const,
      name: 'Yape',
      description: 'Pago rápido mediante aplicación Yape',
      icon: Smartphone,
      color: 'from-[#073372] to-[#17BC91]',
      bgColor: 'bg-gradient-to-br from-[#073372]/5 to-[#17BC91]/5',
      borderColor: 'border-[#17BC91]',
      hoverColor: 'hover:border-[#073372]',
      enabled: true,
    },
    {
      id: 'transfer' as const,
      name: 'Transferencia Bancaria',
      description: 'Transferencia o depósito bancario interbancario',
      icon: Building2,
      color: 'from-[#073372] to-[#17BC91]',
      bgColor: 'bg-gradient-to-br from-[#073372]/5 to-[#17BC91]/5',
      borderColor: 'border-[#17BC91]',
      hoverColor: 'hover:border-[#073372]',
      enabled: true,
    },
    {
      id: 'card' as const,
      name: 'Tarjeta de Crédito/Débito',
      description: 'Pago con tarjeta Visa, Mastercard, American Express',
      icon: CreditCard,
      color: 'from-[#073372] to-[#17BC91]',
      bgColor: 'bg-gradient-to-br from-[#073372]/5 to-[#17BC91]/5',
      borderColor: 'border-[#17BC91]',
      hoverColor: 'hover:border-[#073372]',
      enabled: false,
    },
  ];

  const handleContinue = () => {
    if (selectedMethod) {
      onSelectMethod(selectedMethod);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col">
        {/* Header - Fixed */}
        <div className="bg-gradient-to-r from-[#073372] to-[#17BC91] text-white px-8 py-6 rounded-t-2xl flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-2xl font-bold">Selecciona tu método de pago</h2>
            <p className="text-white/90 text-sm mt-1">
              Monto a pagar: <span className="font-bold text-lg">{formatCurrency(installmentAmount)}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-8 space-y-4">
          {paymentMethods.map((method) => {
            const Icon = method.icon;
            const isSelected = selectedMethod === method.id;
            const isDisabled = !method.enabled;

            return (
              <button
                key={method.id}
                onClick={() => method.enabled && setSelectedMethod(method.id)}
                disabled={isDisabled}
                className={`w-full text-left p-6 rounded-2xl border-2 transition-all ${
                  isDisabled
                    ? 'border-slate-200 hover:border-slate-300 '
                    : isSelected
                    ? `${method.borderColor} ${method.bgColor} shadow-lg scale-[1.02]`
                    : `border-slate-200 ${method.hoverColor} hover:shadow-md`
                }`}
              >
                <div className="flex items-start space-x-4">
                  {/* Icon */}
                  <div className={`p-4 rounded-xl bg-gradient-to-br ${method.color} flex-shrink-0`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-bold text-slate-900">{method.name}</h3>
                      {isSelected && !isDisabled && (
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-[#17BC91] to-[#073372] flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}

                    </div>
                    <p className="text-sm text-slate-600">{method.description}</p>

                    {/* Additional info */}
                    {method.enabled && (
                      <div className="mt-3 flex items-center space-x-4 text-xs">
                        {method.id === 'card' && (
                          <>
                            <span className="inline-flex items-center px-2 py-1 rounded-full bg-green-100 text-green-700 font-medium">
                              ✓ Aprobación Instantánea
                            </span>
                            <span className="inline-flex items-center px-2 py-1 rounded-full bg-blue-100 text-blue-700 font-medium">
                              💳 Guardar Tarjeta
                            </span>
                          </>
                        )}
                        {(method.id === 'yape' || method.id === 'transfer') && (
                          <>
                            <span className="inline-flex items-center px-2 py-1 rounded-full bg-[#F98613]/20 text-[#F98613] font-medium">
                              ⏳ Requiere Verificación
                            </span>
                            <span className="inline-flex items-center px-2 py-1 rounded-full bg-[#17BC91]/20 text-[#17BC91] font-medium">
                              📱 Subir Comprobante
                            </span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}

          {/* Info box */}
          <div className="mt-6 p-5 bg-gradient-to-br from-[#073372]/10 to-[#17BC91]/10 border-2 border-[#17BC91]/30 rounded-xl">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-[#073372] to-[#17BC91] flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-[#073372] mb-1">📌 Información Importante</p>
                <p className="text-sm text-slate-700 leading-relaxed">
                  Para pagos con <strong className="text-[#073372]">Yape</strong> o <strong className="text-[#073372]">Transferencia Bancaria</strong>, 
                  deberás subir el comprobante después de realizar la operación. Nuestro equipo verificará tu pago en un plazo de <strong className="text-[#17BC91]">24-48 horas</strong>.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer - Fixed */}
        <div className="bg-slate-50 px-8 py-6 rounded-b-2xl border-t border-slate-200 flex justify-end space-x-4 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-3 border-2 border-slate-300 text-slate-700 font-semibold rounded-xl hover:bg-slate-100 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleContinue}
            disabled={!selectedMethod}
            className={`px-8 py-3 rounded-xl font-semibold transition-all flex items-center space-x-2 ${
              selectedMethod
                ? 'bg-gradient-to-r from-[#073372] to-[#17BC91] text-white hover:shadow-lg hover:scale-105'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <span>Continuar</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentMethodSelectionModal;
