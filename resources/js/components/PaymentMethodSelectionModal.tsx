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
      description: 'Pago mediante Yape - Requiere subir comprobante',
      icon: Smartphone,
      color: 'from-purple-500 to-pink-500',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      hoverColor: 'hover:border-purple-400',
    },
    {
      id: 'transfer' as const,
      name: 'Transferencia Bancaria',
      description: 'Transferencia o depósito bancario - Requiere subir comprobante',
      icon: Building2,
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      hoverColor: 'hover:border-blue-400',
    },
    {
      id: 'card' as const,
      name: 'Tarjeta de Crédito',
      description: 'Pago inmediato con tarjeta - Aprobación automática',
      icon: CreditCard,
      color: 'from-green-500 to-emerald-500',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      hoverColor: 'hover:border-green-400',
    },
  ];

  const handleContinue = () => {
    if (selectedMethod) {
      onSelectMethod(selectedMethod);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-[#073372] to-[#17BC91] text-white px-8 py-6 rounded-t-3xl flex items-center justify-between">
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

        {/* Content */}
        <div className="p-8 space-y-4">
          {paymentMethods.map((method) => {
            const Icon = method.icon;
            const isSelected = selectedMethod === method.id;

            return (
              <button
                key={method.id}
                onClick={() => setSelectedMethod(method.id)}
                className={`w-full text-left p-6 rounded-2xl border-2 transition-all ${
                  isSelected
                    ? `${method.borderColor} ${method.bgColor} shadow-lg scale-[1.02]`
                    : 'border-slate-200 hover:border-slate-300 hover:shadow-md'
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
                      {isSelected && (
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-[#17BC91] to-[#073372] flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-slate-600">{method.description}</p>

                    {/* Additional info */}
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
                        <span className="inline-flex items-center px-2 py-1 rounded-full bg-orange-100 text-orange-700 font-medium">
                          ⏳ Requiere Verificación
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}

          {/* Info box */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <p className="text-sm text-blue-900">
              <strong className="font-semibold">💡 Nota:</strong> Para pagos con Yape o Transferencia, deberás subir el comprobante después de realizar la operación. El cajero verificará tu pago en un plazo de 24-48 horas.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-slate-50 px-8 py-6 rounded-b-3xl border-t border-slate-200 flex justify-end space-x-4">
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
