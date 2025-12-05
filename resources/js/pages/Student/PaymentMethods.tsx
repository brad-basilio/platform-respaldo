import React, { useState, useEffect } from 'react';
import { CreditCard, Plus, Trash2, Check, AlertCircle, Lock, X } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';

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
}

const PaymentMethods: React.FC = () => {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Estados del formulario de nueva tarjeta
  const [cardNumber, setCardNumber] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [expirationMonth, setExpirationMonth] = useState('');
  const [expirationYear, setExpirationYear] = useState('');
  const [cvv, setCvv] = useState('');
  const [saveAsDefault, setSaveAsDefault] = useState(false);
  const [enableAutoPayment, setEnableAutoPayment] = useState(false);

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

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

  const handleAddCard = async () => {
    // Validar campos
    if (!cardNumber || !cardholderName || !expirationMonth || !expirationYear || !cvv) {
      toast.error('Por favor, completa todos los campos');
      return;
    }

    setProcessing(true);

    try {
      // Aquí deberías tokenizar la tarjeta con Culqi primero
      // Por simplicidad, simularemos el token
      const mockToken = `tok_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const response = await axios.post('/api/student/payment-methods', {
        culqi_card_id: mockToken,
        culqi_customer_id: `cus_${Date.now()}`,
        card_brand: detectCardBrand(cardNumber),
        card_last4: cardNumber.slice(-4),
        card_exp_month: expirationMonth.padStart(2, '0'),
        card_exp_year: expirationYear,
        cardholder_name: cardholderName,
        is_default: saveAsDefault,
        auto_payment_enabled: enableAutoPayment,
      });

      toast.success('Tarjeta guardada exitosamente');
      setShowAddCardModal(false);
      resetForm();
      fetchPaymentMethods();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al guardar la tarjeta');
    } finally {
      setProcessing(false);
    }
  };

  const detectCardBrand = (number: string): string => {
    const cleaned = number.replace(/\s/g, '');
    if (/^4/.test(cleaned)) return 'visa';
    if (/^5[1-5]/.test(cleaned)) return 'mastercard';
    if (/^3[47]/.test(cleaned)) return 'amex';
    return 'unknown';
  };

  const resetForm = () => {
    setCardNumber('');
    setCardholderName('');
    setExpirationMonth('');
    setExpirationYear('');
    setCvv('');
    setSaveAsDefault(false);
    setEnableAutoPayment(false);
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
            onClick={() => setShowAddCardModal(true)}
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-[#073372] to-[#17BC91] text-white font-semibold rounded-xl hover:shadow-lg transition-all"
          >
            <Plus className="w-5 h-5 mr-2" />
            Agregar Tarjeta
          </button>
        </div>

        {/* Payment Methods List */}
        {paymentMethods.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-12 text-center">
            <CreditCard className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No tienes tarjetas guardadas</h3>
            <p className="text-slate-600 mb-6">Agrega una tarjeta para realizar pagos más rápidos</p>
            <button
              onClick={() => setShowAddCardModal(true)}
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-[#073372] to-[#17BC91] text-white font-semibold rounded-xl hover:shadow-lg transition-all"
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

        {/* Add Card Modal */}
        {showAddCardModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="sticky top-0 bg-gradient-to-r from-[#073372] to-[#17BC91] text-white px-8 py-6 rounded-t-3xl flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Agregar Nueva Tarjeta</h2>
                  <p className="text-white/90 text-sm mt-1">Guarda tu tarjeta para pagos futuros</p>
                </div>
                <button
                  onClick={() => {
                    setShowAddCardModal(false);
                    resetForm();
                  }}
                  className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Content */}
              <div className="p-8 space-y-6">
                {/* Security Info */}
                <div className="flex items-center space-x-2 text-sm text-slate-600 bg-slate-50 py-3 px-4 rounded-lg">
                  <Lock className="w-4 h-4 text-green-600" />
                  <span>Conexión segura - Tus datos están protegidos</span>
                </div>

                {/* Form */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Número de Tarjeta
                    </label>
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value.replace(/\s/g, ''))}
                      placeholder="4111 1111 1111 1111"
                      maxLength={16}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#17BC91] focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Nombre del Titular (como aparece en la tarjeta)
                    </label>
                    <input
                      type="text"
                      value={cardholderName}
                      onChange={(e) => setCardholderName(e.target.value.toUpperCase())}
                      placeholder="JUAN PEREZ GARCIA"
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#17BC91] focus:border-transparent"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Mes
                      </label>
                      <input
                        type="text"
                        value={expirationMonth}
                        onChange={(e) => setExpirationMonth(e.target.value)}
                        placeholder="MM"
                        maxLength={2}
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#17BC91] focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Año
                      </label>
                      <input
                        type="text"
                        value={expirationYear}
                        onChange={(e) => setExpirationYear(e.target.value)}
                        placeholder="YYYY"
                        maxLength={4}
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#17BC91] focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        CVV
                      </label>
                      <input
                        type="text"
                        value={cvv}
                        onChange={(e) => setCvv(e.target.value)}
                        placeholder="123"
                        maxLength={4}
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#17BC91] focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Options */}
                  <div className="space-y-3 pt-2">
                    {paymentMethods.length > 0 && (
                      <label className="flex items-start space-x-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={saveAsDefault}
                          onChange={(e) => setSaveAsDefault(e.target.checked)}
                          className="mt-1 w-5 h-5 text-[#17BC91] border-slate-300 rounded focus:ring-[#17BC91]"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-slate-900">Marcar como predeterminada</p>
                          <p className="text-xs text-slate-600">Esta será tu tarjeta principal para pagos</p>
                        </div>
                      </label>
                    )}

                    <label className="flex items-start space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={enableAutoPayment}
                        onChange={(e) => setEnableAutoPayment(e.target.checked)}
                        className="mt-1 w-5 h-5 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">Habilitar Pagos Automáticos</p>
                        <p className="text-xs text-slate-600">
                          Tus cuotas se cobrarán automáticamente en la fecha de vencimiento
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Warning */}
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <p className="text-sm text-amber-900 flex items-start space-x-2">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <span>
                      Al guardar tu tarjeta, aceptas que ANCED procese tus datos de forma segura 
                      para facilitar futuros pagos. Puedes eliminar esta tarjeta en cualquier momento.
                    </span>
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="sticky bottom-0 bg-slate-50 px-8 py-6 rounded-b-3xl border-t border-slate-200 flex justify-end space-x-4">
                <button
                  onClick={() => {
                    setShowAddCardModal(false);
                    resetForm();
                  }}
                  disabled={processing}
                  className="px-6 py-3 border-2 border-slate-300 text-slate-700 font-semibold rounded-xl hover:bg-slate-100 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAddCard}
                  disabled={processing}
                  className={`px-8 py-3 rounded-xl font-semibold transition-all flex items-center space-x-2 ${
                    processing
                      ? 'bg-slate-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-[#073372] to-[#17BC91] hover:shadow-lg hover:scale-105'
                  } text-white`}
                >
                  {processing ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-5 h-5" />
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
