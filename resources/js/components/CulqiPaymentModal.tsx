import React, { useState, useEffect } from 'react';
import { X, CreditCard, Lock, Shield } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

interface CulqiPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  installment: {
    id: number;
    amount: number;
    installment_number: number;
  };
  onSuccess: () => void;
}

// Declarar el tipo global de Culqi
declare global {
  interface Window {
    CulqiCheckout: any;
    Culqi: any;
  }
}

const CulqiPaymentModal: React.FC<CulqiPaymentModalProps> = ({
  isOpen,
  onClose,
  installment,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [saveCard, setSaveCard] = useState(false);
  const [autoPayment, setAutoPayment] = useState(false);
  const [publicKey, setPublicKey] = useState('');
  const [culqiLoaded, setCulqiLoaded] = useState(false);

  // Cargar clave pública de Culqi
  useEffect(() => {
    const fetchPublicKey = async () => {
      try {
        const response = await axios.get('/api/student/culqi/public-key');
        setPublicKey(response.data.public_key);
      } catch (error) {
        console.error('Error loading Culqi public key:', error);
        toast.error('Error al cargar configuración de pagos');
      }
    };

    if (isOpen) {
      fetchPublicKey();
    }
  }, [isOpen]);

  // Cargar script de Culqi Checkout
  useEffect(() => {
    if (!publicKey) return;

    const script = document.createElement('script');
    script.src = 'https://js.culqi.com/checkout-js';
    script.async = true;
    script.onload = () => {
      setCulqiLoaded(true);
      initializeCulqi();
    };
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, [publicKey]);

  const initializeCulqi = () => {
    if (!window.CulqiCheckout || !publicKey) return;

    // Configuración de Culqi Checkout
    const settings = {
      title: 'ANCED - Pago de Cuota',
      currency: 'PEN',
      amount: Math.round(installment.amount * 100), // Convertir a centavos
    };

    const client = {
      email: '', // Se llenará automáticamente
    };

    const options = {
      lang: 'es',
      installments: false, // Deshabilitar cuotas por ahora
      modal: true,
      container: '#culqi-container',
      paymentMethods: {
        tarjeta: true,
        yape: false, // Solo tarjetas en este checkout
        billetera: false,
        bancaMovil: false,
        agente: false,
        cuotealo: false,
      },
    };

    const appearance = {
      theme: 'default',
      hiddenCulqiLogo: false,
      menuType: 'sidebar',
      buttonCardPayText: `Pagar S/. ${installment.amount.toFixed(2)}`,
      logo: null,
      defaultStyle: {
        bannerColor: '#073372',
        buttonBackground: '#17BC91',
        menuColor: '#073372',
        linksColor: '#17BC91',
        buttonTextColor: '#ffffff',
        priceColor: '#073372',
      },
    };

    const config = {
      settings,
      client,
      options,
      appearance,
    };

    // Inicializar Culqi
    const Culqi = new window.CulqiCheckout(publicKey, config);

    // Handler para cuando Culqi devuelve el token
    const handleCulqiAction = () => {
      if (window.Culqi.token) {
        const token = window.Culqi.token;
        console.log('Token creado:', token.id);
        Culqi.close();
        processPayment(token.id);
      } else if (window.Culqi.order) {
        // Para otros métodos de pago (no aplicable aquí)
        Culqi.close();
        console.log('Order created:', window.Culqi.order);
      } else {
        // Error
        console.error('Culqi error:', window.Culqi.error);
        toast.error(window.Culqi.error.user_message || 'Error al procesar el pago');
        setLoading(false);
      }
    };

    Culqi.culqi = handleCulqiAction;

    // Guardar instancia global
    window.Culqi = Culqi;
  };

  const handlePayClick = () => {
    if (!window.Culqi) {
      toast.error('Culqi no está listo. Por favor intenta de nuevo.');
      return;
    }

    setLoading(true);
    window.Culqi.open();
  };

  const processPayment = async (tokenId: string) => {
    try {
      setLoading(true);

      const response = await axios.post('/api/student/culqi/process-payment', {
        token_id: tokenId,
        installment_id: installment.id,
        amount: installment.amount,
        save_card: saveCard,
        auto_payment: autoPayment,
      });

      if (response.data.success) {
        toast.success('¡Pago procesado exitosamente!', {
          description: `La cuota #${installment.installment_number} ha sido pagada`,
          duration: 5000,
        });
        onSuccess();
        onClose();
      } else {
        toast.error('Error al procesar el pago', {
          description: response.data.error || 'Intenta nuevamente',
        });
      }
    } catch (error: any) {
      console.error('Error processing payment:', error);
      const errorMessage = error.response?.data?.error || 'Error al procesar el pago';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all">
          {/* Header */}
          <div className="relative bg-gradient-to-r from-[#073372] to-[#17BC91] px-8 py-6">
            <button
              onClick={onClose}
              className="absolute right-4 top-4 rounded-full bg-white/20 p-2 text-white hover:bg-white/30 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="rounded-full bg-white/20 p-3">
                <CreditCard className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Pagar con Tarjeta</h2>
                <p className="text-sm text-white/90">Cuota #{installment.installment_number} - S/. {installment.amount.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="px-8 py-6 space-y-6">
            {/* Security Badge */}
            <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg">
              <Shield className="h-5 w-5 text-green-600" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-green-900">Pago 100% Seguro</p>
                <p className="text-xs text-green-700">Tu información está protegida con encriptación SSL</p>
              </div>
              <Lock className="h-5 w-5 text-green-600" />
            </div>

            {/* Info */}
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Al hacer clic en "Pagar con Tarjeta", se abrirá el formulario seguro de Culqi donde podrás ingresar los datos de tu tarjeta.
              </p>

              {/* Checkbox Options */}
              <div className="space-y-3">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={saveCard}
                    onChange={(e) => setSaveCard(e.target.checked)}
                    className="mt-1 w-4 h-4 text-[#17BC91] border-gray-300 rounded focus:ring-[#17BC91]"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-gray-900 group-hover:text-[#17BC91] transition-colors">
                      Guardar tarjeta para futuros pagos
                    </span>
                    <p className="text-xs text-gray-500 mt-1">
                      Podrás pagar más rápido en tu próxima cuota
                    </p>
                  </div>
                </label>

                {saveCard && (
                  <label className="flex items-start gap-3 cursor-pointer group ml-7 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <input
                      type="checkbox"
                      checked={autoPayment}
                      onChange={(e) => setAutoPayment(e.target.checked)}
                      className="mt-1 w-4 h-4 text-blue-600 border-blue-300 rounded focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <span className="text-sm font-medium text-blue-900 group-hover:text-blue-700 transition-colors">
                        Habilitar pagos automáticos
                      </span>
                      <p className="text-xs text-blue-700 mt-1">
                        Tus cuotas futuras se pagarán automáticamente en la fecha de vencimiento
                      </p>
                    </div>
                  </label>
                )}
              </div>
            </div>

            {/* Payment Summary */}
            <div className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border border-gray-200">
              <div className="flex justify-between items-center text-sm mb-2">
                <span className="text-gray-600">Cuota</span>
                <span className="font-medium text-gray-900">S/. {installment.amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-sm mb-2">
                <span className="text-gray-600">Comisión</span>
                <span className="font-medium text-gray-900">S/. 0.00</span>
              </div>
              <div className="border-t border-gray-300 pt-2 mt-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-gray-900">Total a Pagar</span>
                  <span className="text-2xl font-bold text-[#073372]">S/. {installment.amount.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Container for Culqi Checkout (if embedded) */}
            <div id="culqi-container"></div>
          </div>

          {/* Footer */}
          <div className="px-8 py-6 bg-gray-50 border-t border-gray-200 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handlePayClick}
              disabled={loading || !culqiLoaded || !publicKey}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-[#073372] to-[#17BC91] text-white font-medium rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Procesando...' : 'Pagar con Tarjeta'}
            </button>
          </div>

          {/* Powered by Culqi */}
          <div className="px-8 py-3 bg-gray-100 border-t border-gray-200">
            <p className="text-xs text-center text-gray-500">
              Procesado de forma segura por <span className="font-semibold">Culqi</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CulqiPaymentModal;
