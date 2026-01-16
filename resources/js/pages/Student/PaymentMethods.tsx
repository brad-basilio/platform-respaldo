import React, { useState, useEffect, useRef } from 'react';
import { CreditCard, Plus, Trash2, Check, AlertCircle, Lock, X, Loader2 } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';

// Declarar el tipo global de Culqi
declare global {
  interface Window {
    Culqi: any;
    culqi: () => void;
  }
}

interface PaymentMethod {
  id: string;
  type: string;
  provider: string;
  cardBrand: string;
  cardLast4: string;
  cardExpMonth: string;
  cardExpYear: string;
  cardholderName: string;
  isDefault: boolean;
  autoPaymentEnabled: boolean;
  isExpired: boolean;
  formattedCardName: string;
  createdAt: string;
  canCharge: boolean;
}

const PaymentMethods: React.FC = () => {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  
  // Estados para Culqi
  const [publicKey, setPublicKey] = useState('');
  const [culqiLoaded, setCulqiLoaded] = useState(false);
  const [culqiOpen, setCulqiOpen] = useState(false);
  const [saveAsDefault, setSaveAsDefault] = useState(false);
  const [enableAutoPayment, setEnableAutoPayment] = useState(false);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  
  const pendingTokenRef = useRef<any>(null);

  useEffect(() => {
    fetchPaymentMethods();
    fetchPublicKey();
  }, []);

  const fetchPublicKey = async () => {
    try {
      const response = await axios.get('/api/student/culqi/public-key');
      if (response.data.public_key) {
        setPublicKey(response.data.public_key);
      }
    } catch (error) {
      console.error('Error fetching Culqi public key:', error);
    }
  };

  // Cargar script de Culqi Checkout
  useEffect(() => {
    if (!publicKey) return;

    const existingScript = document.querySelector('script[src="https://checkout.culqi.com/js/v4"]');

    if (existingScript && window.Culqi) {
      setCulqiLoaded(true);
      initializeCulqi();
    } else if (!existingScript) {
      const script = document.createElement('script');
      script.src = 'https://checkout.culqi.com/js/v4';
      script.async = true;
      script.onload = () => {
        setCulqiLoaded(true);
        initializeCulqi();
      };
      script.onerror = () => {
        toast.error('Error al cargar el sistema de pagos');
      };
      document.head.appendChild(script);
    }
  }, [publicKey]);

  const initializeCulqi = () => {
    if (!window.Culqi || !publicKey) return;

    window.Culqi.publicKey = publicKey;

    window.Culqi.settings({
      title: 'UNCED - Guardar Tarjeta',
      currency: 'PEN',
      amount: 0, // 0 porque solo guardamos la tarjeta
    });

    window.Culqi.options({
      lang: 'es',
      installments: false,
      paymentMethods: {
        tarjeta: true,
        yape: false,
        billetera: false,
        bancaMovil: false,
        agente: false,
        cuotealo: false,
      },
      style: {
        bannerColor: '#073372',
        buttonBackground: '#17BC91',
        menuColor: '#073372',
        linksColor: '#17BC91',
        buttonText: 'Guardar Tarjeta',
        buttonTextColor: '#ffffff',
        priceColor: '#073372',
      },
    });

    window.culqi = () => {
      try {
        window.Culqi.close();
      } catch (e) {
        console.log('Error cerrando Culqi:', e);
      }

      setCulqiOpen(false);

      if (window.Culqi.token) {
        console.log('Token recibido:', window.Culqi.token);
        pendingTokenRef.current = window.Culqi.token;
        // Mostrar modal de opciones (default, autopago)
        setShowOptionsModal(true);
      } else if (window.Culqi.error) {
        console.error('Culqi error:', window.Culqi.error);
        toast.error(window.Culqi.error.user_message || 'Error al procesar la tarjeta');
      }
    };
  };

  const handleOpenCulqi = () => {
    if (!window.Culqi || !culqiLoaded) {
      toast.error('El sistema de pagos aún no está listo. Intenta de nuevo.');
      return;
    }

    // Reset options
    setSaveAsDefault(false);
    setEnableAutoPayment(false);
    pendingTokenRef.current = null;

    setCulqiOpen(true);
    window.Culqi.open();
  };

  const handleSaveCard = async () => {
    const token = pendingTokenRef.current;
    if (!token) {
      toast.error('No se recibió información de la tarjeta');
      setShowOptionsModal(false);
      return;
    }

    setProcessing(true);

    try {
      // El token de Culqi Checkout v4 puede no tener todos los campos
      // El backend obtendrá la información completa de la API de Culqi
      const expMonth = token.expiration_month ? String(token.expiration_month).padStart(2, '0') : null;
      const expYear = token.expiration_year ? String(token.expiration_year) : null;
      
      await axios.post('/api/student/payment-methods', {
        token_id: token.id,
        card_brand: token.iin?.card_brand || null,
        card_last4: token.last_four || token.card_number?.slice(-4) || null,
        card_exp_month: expMonth,
        card_exp_year: expYear,
        cardholder_name: token.email || null, // Usar email como referencia
        is_default: saveAsDefault,
        auto_payment_enabled: enableAutoPayment,
      });

      toast.success('Tarjeta guardada exitosamente', {
        description: 'Ya puedes usarla para pagar tus cuotas',
      });
      setShowOptionsModal(false);
      pendingTokenRef.current = null;
      fetchPaymentMethods();
    } catch (error: any) {
      console.error('Error saving card:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Error al guardar la tarjeta';
      toast.error(errorMessage);
    } finally {
      setProcessing(false);
    }
  };

  const fetchPaymentMethods = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/student/payment-methods');
      setPaymentMethods(response.data.payment_methods || []);
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      toast.error('Error al cargar los métodos de pago');
    } finally {
      setLoading(false);
    }
  };

  const handleSetDefault = async (methodId: string) => {
    try {
      await axios.put(`/api/student/payment-methods/${methodId}`, {
        is_default: true,
      });

      toast.success('Tarjeta marcada como predeterminada');
      fetchPaymentMethods();
    } catch (error) {
      toast.error('Error al actualizar la tarjeta');
    }
  };

  const handleToggleAutoPayment = async (methodId: string, currentState: boolean) => {
    try {
      await axios.put(`/api/student/payment-methods/${methodId}`, {
        auto_payment_enabled: !currentState,
      });

      toast.success(
        !currentState 
          ? 'Pagos automáticos habilitados' 
          : 'Pagos automáticos deshabilitados'
      );
      fetchPaymentMethods();
    } catch (error) {
      toast.error('Error al actualizar configuración');
    }
  };

  const handleDeleteCard = async (methodId: string) => {
    if (!confirm('¿Estás seguro de eliminar esta tarjeta?')) {
      return;
    }

    try {
      await axios.delete(`/api/student/payment-methods/${methodId}`);
      toast.success('Tarjeta eliminada exitosamente');
      fetchPaymentMethods();
    } catch (error) {
      toast.error('Error al eliminar la tarjeta');
    }
  };

  const getCardBrandLogo = (brand: string) => {
    const logos: Record<string, string> = {
      visa: '💳',
      mastercard: '💳',
      amex: '💳',
    };
    return logos[brand.toLowerCase()] || '💳';
  };

  if (loading) {
    return (
      <AuthenticatedLayout>
        <Head title="Métodos de Pago" />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-600">Cargando métodos de pago...</p>
          </div>
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout>
      <Head title="Métodos de Pago" />
      
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Métodos de Pago</h1>
            <p className="text-slate-600 mt-1">Gestiona tus tarjetas y configuración de pagos</p>
          </div>
          
          <button
            onClick={handleOpenCulqi}
            disabled={!culqiLoaded || culqiOpen}
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-[#073372] to-[#17BC91] text-white font-semibold rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {!culqiLoaded ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Cargando...
              </>
            ) : (
              <>
                <Plus className="w-5 h-5 mr-2" />
                Agregar Tarjeta
              </>
            )}
          </button>
        </div>

        {/* Payment Methods List */}
        {paymentMethods.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-12 text-center">
            <CreditCard className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No tienes tarjetas guardadas</h3>
            <p className="text-slate-600 mb-6">Agrega una tarjeta para realizar pagos más rápidos</p>
            <button
              onClick={handleOpenCulqi}
              disabled={!culqiLoaded}
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-[#073372] to-[#17BC91] text-white font-semibold rounded-xl hover:shadow-lg transition-all disabled:opacity-50"
            >
              <Plus className="w-5 h-5 mr-2" />
              Agregar Primera Tarjeta
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paymentMethods.map((method) => (
              <div
                key={method.id}
                className={`bg-gradient-to-br rounded-2xl p-6 shadow-lg text-white relative overflow-hidden ${
                  method.cardBrand === 'visa'
                    ? 'from-blue-600 to-blue-800'
                    : method.cardBrand === 'mastercard'
                    ? 'from-orange-500 to-red-600'
                    : 'from-slate-700 to-slate-900'
                }`}
              >
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -mr-32 -mt-32"></div>
                  <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full -ml-24 -mb-24"></div>
                </div>

                {/* Content */}
                <div className="relative z-10">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-6">
                    <div className="text-4xl">
                      {getCardBrandLogo(method.cardBrand)}
                    </div>
                    <div className="text-right">
                      {method.isDefault && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white/20 backdrop-blur-sm">
                          <Check className="w-3 h-3 mr-1" />
                          Predeterminada
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Number */}
                  <div className="mb-6">
                    <p className="text-sm text-white/70 mb-1">Número de Tarjeta</p>
                    <p className="text-xl font-mono tracking-wider">
                      •••• •••• •••• {method.cardLast4}
                    </p>
                  </div>

                  {/* Cardholder & Expiry */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-white/70 mb-1">Titular</p>
                      <p className="text-sm font-medium truncate">{method.cardholderName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-white/70 mb-1">Vence</p>
                      <p className="text-sm font-medium">
                        {method.cardExpMonth}/{method.cardExpYear}
                      </p>
                    </div>
                  </div>

                  {/* Auto Payment Badge */}
                  {method.autoPaymentEnabled && (
                    <div className="mb-4">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 backdrop-blur-sm text-white">
                        <Check className="w-3 h-3 mr-1" />
                        Pagos Automáticos Activos
                      </span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center space-x-2 pt-4 border-t border-white/20">
                    {!method.isDefault && (
                      <button
                        onClick={() => handleSetDefault(method.id)}
                        className="flex-1 px-3 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg text-xs font-medium transition-colors"
                      >
                        Marcar como Principal
                      </button>
                    )}
                    <button
                      onClick={() => handleToggleAutoPayment(method.id, method.autoPaymentEnabled)}
                      className="flex-1 px-3 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg text-xs font-medium transition-colors"
                      title={method.autoPaymentEnabled ? 'Desactivar autopago' : 'Activar autopago'}
                    >
                      {method.autoPaymentEnabled ? 'Desactivar Autopago' : 'Activar Autopago'}
                    </button>
                    <button
                      onClick={() => handleDeleteCard(method.id)}
                      className="p-2 bg-red-500/20 hover:bg-red-500/30 backdrop-blur-sm rounded-lg transition-colors"
                      title="Eliminar tarjeta"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-blue-100 rounded-xl">
              <Lock className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-blue-900 mb-2">Seguridad de tus Datos</h3>
              <p className="text-sm text-blue-800 mb-2">
                Tus datos de tarjeta están protegidos con encriptación de nivel bancario. 
                Nunca almacenamos el número completo de tu tarjeta ni el CVV.
              </p>
              <ul className="text-sm text-blue-700 space-y-1">
                <li className="flex items-center">
                  <Check className="w-4 h-4 mr-2 text-green-600" />
                  Los pagos son procesados de forma segura por Culqi
                </li>
                <li className="flex items-center">
                  <Check className="w-4 h-4 mr-2 text-green-600" />
                  Puedes habilitar/deshabilitar pagos automáticos en cualquier momento
                </li>
                <li className="flex items-center">
                  <Check className="w-4 h-4 mr-2 text-green-600" />
                  Elimina tus tarjetas guardadas cuando lo desees
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Modal de opciones después de tokenizar la tarjeta */}
        {showOptionsModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-[#073372] to-[#17BC91] text-white px-6 py-5 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">Confirmar Tarjeta</h2>
                  <p className="text-white/90 text-sm mt-1">
                    {pendingTokenRef.current?.iin?.card_brand?.toUpperCase() || 'Tarjeta'} •••• {pendingTokenRef.current?.card_number?.slice(-4) || '****'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowOptionsModal(false);
                    pendingTokenRef.current = null;
                  }}
                  disabled={processing}
                  className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg disabled:opacity-50"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4">
                {/* Security Badge */}
                <div className="flex items-center space-x-2 text-sm text-green-700 bg-green-50 py-3 px-4 rounded-lg">
                  <Lock className="w-4 h-4 text-green-600" />
                  <span>Tu tarjeta ha sido verificada de forma segura</span>
                </div>

                {/* Options */}
                <div className="space-y-3">
                  {paymentMethods.length > 0 && (
                    <label className="flex items-start space-x-3 cursor-pointer group p-3 rounded-lg hover:bg-slate-50 transition-colors">
                      <input
                        type="checkbox"
                        checked={saveAsDefault}
                        onChange={(e) => setSaveAsDefault(e.target.checked)}
                        disabled={processing}
                        className="mt-1 w-5 h-5 text-[#17BC91] border-slate-300 rounded focus:ring-[#17BC91] transition-all"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-slate-900 group-hover:text-[#073372] transition-colors">
                          Marcar como predeterminada
                        </p>
                        <p className="text-xs text-slate-600">
                          Esta será tu tarjeta principal para pagos
                        </p>
                      </div>
                    </label>
                  )}

                  <label className="flex items-start space-x-3 cursor-pointer group p-3 rounded-lg hover:bg-slate-50 transition-colors">
                    <input
                      type="checkbox"
                      checked={enableAutoPayment}
                      onChange={(e) => setEnableAutoPayment(e.target.checked)}
                      disabled={processing}
                      className="mt-1 w-5 h-5 text-blue-600 border-slate-300 rounded focus:ring-blue-500 transition-all"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-slate-900 group-hover:text-[#073372] transition-colors">
                        Habilitar Pagos Automáticos
                      </p>
                      <p className="text-xs text-slate-600">
                        Tus cuotas se cobrarán automáticamente en la fecha de vencimiento
                      </p>
                    </div>
                  </label>
                </div>

                {/* Warning */}
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-900">
                      Al guardar tu tarjeta, aceptas que UNCED procese tus datos de forma segura 
                      para facilitar futuros pagos.
                    </p>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowOptionsModal(false);
                    pendingTokenRef.current = null;
                  }}
                  disabled={processing}
                  className="px-6 py-2.5 border-2 border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveCard}
                  disabled={processing}
                  className="px-8 py-2.5 rounded-lg font-semibold transition-all flex items-center space-x-2 bg-gradient-to-r from-[#073372] to-[#17BC91] hover:shadow-lg text-white disabled:opacity-50"
                >
                  {processing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5" />
                      <span>Guardar Tarjeta</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  );
};

export default PaymentMethods;
