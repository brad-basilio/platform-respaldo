import React, { useState, useEffect, useRef } from 'react';
import { X, CreditCard, Lock, Shield, Loader2, CheckCircle, AlertCircle, ChevronRight, Plus } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

interface PaymentMethod {
  id: number;
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
  canCharge: boolean; // Si tiene culqi_card_id, puede ser cobrada
}

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

// Declarar el tipo global de Culqi y Culqi3DS
declare global {
  interface Window {
    CulqiCheckout: any;
    Culqi: any;
    culqi: () => void;
    Culqi3DS: any;
  }
}

interface ThreeDSData {
  tokenId: string;
  amount: number;
  email: string;
  chargeData?: any;
}

const CulqiPaymentModal: React.FC<CulqiPaymentModalProps> = ({
  isOpen,
  onClose,
  installment,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [processing3DS, setProcessing3DS] = useState(false);
  const [publicKey, setPublicKey] = useState('');
  const [culqiLoaded, setCulqiLoaded] = useState(false);
  const [culqi3DSLoaded, setCulqi3DSLoaded] = useState(false);
  const [culqiOpen, setCulqiOpen] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [threeDSData, setThreeDSData] = useState<ThreeDSData | null>(null);
  
  // Estados para tarjetas guardadas
  const [savedCards, setSavedCards] = useState<PaymentMethod[]>([]);
  const [selectedCard, setSelectedCard] = useState<PaymentMethod | null>(null);
  const [paymentMode, setPaymentMode] = useState<'select' | 'saved' | 'new'>('select');
  
  const culqiInstanceRef = useRef<any>(null);
  const parameters3DSReceivedRef = useRef(false);

  // Cargar clave pública y tarjetas guardadas
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Cargar clave pública y tarjetas en paralelo
        const [keyResponse, cardsResponse] = await Promise.all([
          axios.get('/api/student/culqi/public-key'),
          axios.get('/api/student/payment-methods'),
        ]);
        
        if (keyResponse.data.public_key) {
          setPublicKey(keyResponse.data.public_key);
        } else {
          setError('No se pudo obtener la configuración de Culqi');
        }
        
        // Filtrar solo tarjetas tipo card
        const cards = cardsResponse.data.payment_methods || [];
        setSavedCards(cards.filter((c: PaymentMethod) => c.type === 'card'));
        
        // Solo seleccionar tarjeta predeterminada si puede cobrar (tiene culqi_card_id)
        const defaultChargeableCard = cards.find((c: PaymentMethod) => c.isDefault && c.type === 'card' && c.canCharge);
        if (defaultChargeableCard) {
          setSelectedCard(defaultChargeableCard);
        }
        
        // Si hay tarjetas que pueden cobrar, mostrar selección; si no, ir directo a nueva tarjeta
        const hasChargeableCards = cards.some((c: PaymentMethod) => c.type === 'card' && c.canCharge);
        if (hasChargeableCards) {
          setPaymentMode('select');
        } else {
          setPaymentMode('new');
        }
        
      } catch (error) {
        console.error('Error loading initial data:', error);
        setError('Error al cargar configuración de pagos');
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      fetchInitialData();
      setCulqiOpen(false);
      setPaymentSuccess(false);
      setError(null);
      setThreeDSData(null);
      setProcessing3DS(false);
      parameters3DSReceivedRef.current = false;
    }
  }, [isOpen]);

  // Cargar script de Culqi Checkout v4
  useEffect(() => {
    if (!publicKey || !isOpen) return;

    // Cargar script de Checkout
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
        setError('Error al cargar el sistema de pagos');
      };
      document.head.appendChild(script);
    }

    // Cargar script de 3DS
    const existing3DSScript = document.querySelector('script[src="https://3ds.culqi.com"]');

    if (existing3DSScript && window.Culqi3DS) {
      setCulqi3DSLoaded(true);
    } else if (!existing3DSScript) {
      const script3DS = document.createElement('script');
      script3DS.src = 'https://3ds.culqi.com';
      script3DS.async = true;
      script3DS.onload = () => {
        console.log('Culqi 3DS script loaded');
        setCulqi3DSLoaded(true);
      };
      script3DS.onerror = () => {
        console.error('Error loading Culqi 3DS script');
      };
      document.head.appendChild(script3DS);
    }
  }, [publicKey, isOpen]);

  // Listener para recibir parameters3DS del iframe de Culqi
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      console.log('Message received:', event.data);
      
      if (!processing3DS || !threeDSData) return;
      if (parameters3DSReceivedRef.current) return;

      let params3DS = null;
      
      if (event.data && event.data.parameters3DS) {
        params3DS = event.data.parameters3DS;
      } else if (event.data && (event.data.eci || event.data.xid || event.data.cavv)) {
        params3DS = event.data;
      }
      
      if (params3DS) {
        console.log('3DS parameters received:', params3DS);
        parameters3DSReceivedRef.current = true;
        processPaymentWith3DS(params3DS);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [processing3DS, threeDSData]);

  const initializeCulqi = () => {
    if (!window.Culqi || !publicKey) return;

    window.Culqi.publicKey = publicKey;

    window.Culqi.settings({
      title: 'UNCED - Pago de Cuota',
      currency: 'PEN',
      amount: Math.round(installment.amount * 100),
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
        buttonText: 'Pagar',
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

      if (window.Culqi.token) {
        console.log('Token recibido:', window.Culqi.token.id);
        setCulqiOpen(false);
        processPayment(window.Culqi.token.id);
      } else if (window.Culqi.error) {
        console.error('Culqi error:', window.Culqi.error);
        setCulqiOpen(false);
        setError(window.Culqi.error.user_message || 'Error al procesar la tarjeta');
      }
    };
  };

  const handlePayWithNewCard = () => {
    if (!window.Culqi) {
      toast.error('Culqi no está listo. Por favor intenta de nuevo.');
      return;
    }

    setError(null);
    setPaymentMode('new');

    window.Culqi.settings({
      title: 'UNCED - Pago de Cuota',
      currency: 'PEN',
      amount: Math.round(installment.amount * 100),
    });

    setCulqiOpen(true);
    window.Culqi.open();
  };

  const handlePayWithSavedCard = async () => {
    if (!selectedCard) {
      toast.error('Selecciona una tarjeta válida');
      return;
    }

    try {
      setProcessingPayment(true);
      setError(null);

      const response = await axios.post('/api/student/culqi/process-payment-saved-card', {
        payment_method_id: selectedCard.id,
        installment_id: installment.id,
        amount: installment.amount,
      });

      // Si requiere 3DS, debemos usar el checkout de Culqi para obtener un nuevo token
      // Esto es una limitación de Culqi: 3DS solo funciona con tokens, no con card_id
      if (response.data.requires_3ds) {
        setProcessingPayment(false);
        setError(null);
        
        // Mostrar mensaje explicativo y abrir checkout automáticamente
        toast.info('Tu banco requiere verificación adicional', {
          description: 'Por seguridad, ingresa nuevamente los datos de tu tarjeta para completar el pago.',
          duration: 6000,
        });
        
        // Pequeño delay para que el usuario vea el mensaje
        setTimeout(() => {
          handlePayWithNewCard();
        }, 1000);
        return;
      }

      if (response.data.success) {
        setPaymentSuccess(true);
        toast.success('¡Pago procesado exitosamente!', {
          description: `La cuota #${installment.installment_number} ha sido pagada con tu tarjeta guardada`,
          duration: 5000,
        });

        setTimeout(() => {
          onSuccess();
          onClose();
        }, 2000);
      } else {
        setError(response.data.error || 'Error al procesar el pago');
      }
    } catch (error: any) {
      console.error('Error processing payment with saved card:', error);
      
      // Si el error contiene requires_3ds, manejar el flujo 3DS
      if (error.response?.data?.requires_3ds) {
        setProcessingPayment(false);
        
        toast.info('Tu banco requiere verificación adicional', {
          description: 'Por seguridad, ingresa nuevamente los datos de tu tarjeta.',
          duration: 6000,
        });
        
        setTimeout(() => {
          handlePayWithNewCard();
        }, 1000);
        return;
      }
      
      const errorMessage = error.response?.data?.error || 'Error al procesar el pago con tarjeta guardada';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setProcessingPayment(false);
    }
  };

  const processPayment = async (tokenId: string) => {
    try {
      setProcessingPayment(true);
      setError(null);

      const response = await axios.post('/api/student/culqi/process-payment', {
        token_id: tokenId,
        installment_id: installment.id,
        amount: installment.amount,
        save_card: false,
        auto_payment: false,
      });

      if (response.data.requires_3ds) {
        console.log('3DS required, initializing 3DS flow');
        setProcessingPayment(false);
        
        setThreeDSData({
          tokenId: tokenId,
          amount: installment.amount,
          email: response.data.email || '',
          chargeData: response.data.charge_data,
        });
        
        initiate3DS(tokenId, response.data.email, response.data.charge_data);
        return;
      }

      if (response.data.success) {
        setPaymentSuccess(true);
        toast.success('¡Pago procesado exitosamente!', {
          description: `La cuota #${installment.installment_number} ha sido pagada`,
          duration: 5000,
        });

        setTimeout(() => {
          onSuccess();
          onClose();
        }, 2000);
      } else {
        setError(response.data.error || 'Error al procesar el pago');
      }
    } catch (error: any) {
      console.error('Error processing payment:', error);
      
      if (error.response?.data?.requires_3ds) {
        console.log('3DS required from error response');
        setProcessingPayment(false);
        
        setThreeDSData({
          tokenId: error.response.data.token_id,
          amount: installment.amount,
          email: error.response.data.email || '',
          chargeData: error.response.data.charge_data,
        });
        
        initiate3DS(
          error.response.data.token_id, 
          error.response.data.email, 
          error.response.data.charge_data
        );
        return;
      }

      const errorMessage = error.response?.data?.error || 'Error al procesar el pago';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      if (!threeDSData) {
        setProcessingPayment(false);
      }
    }
  };

  const initiate3DS = (tokenId: string, email: string, chargeData?: any) => {
    if (!window.Culqi3DS) {
      console.error('Culqi3DS not loaded');
      setError('Error: El módulo de seguridad 3D Secure no está disponible. Por favor recarga la página e intenta de nuevo.');
      return;
    }

    try {
      setProcessing3DS(true);
      parameters3DSReceivedRef.current = false;
      
      console.log('Initializing Culqi3DS...');
      
      window.Culqi3DS.publicKey = publicKey;
      
      window.Culqi3DS.settings = {
        charge: {
          totalAmount: Math.round(installment.amount * 100),
          returnUrl: window.location.href,
          currency: 'PEN',
        },
        card: {
          email: email,
        },
      };
      
      window.Culqi3DS.options = {
        showModal: true,
        showLoading: true,
        showIcon: true,
        closeModalAction: () => {
          console.log('Modal 3DS cerrado por usuario');
          setProcessing3DS(false);
          setError('Verificación 3DS cancelada');
          setThreeDSData(null);
        },
        style: {
          btnColor: '#17BC91',
          btnTextColor: '#FFFFFF',
        },
      };
      
      console.log('Culqi3DS configured, calling initAuthentication with token:', tokenId);
      window.Culqi3DS.initAuthentication(tokenId);
      
      toast.info('Completa la verificación de seguridad', {
        description: 'Se abrirá una ventana de tu banco para verificar',
        duration: 10000,
      });
      
      setTimeout(() => {
        if (processing3DS && !parameters3DSReceivedRef.current) {
          setProcessing3DS(false);
          setError('La verificación 3D Secure expiró. Por favor intenta de nuevo.');
          setThreeDSData(null);
        }
      }, 300000);
      
    } catch (e: any) {
      console.error('Error initializing 3DS:', e);
      setProcessing3DS(false);
      setError('Error al iniciar la verificación 3D Secure: ' + (e.message || 'Error desconocido'));
    }
  };

  const processPaymentWith3DS = async (parameters3DS: any) => {
    if (!threeDSData) {
      setError('Error: No hay datos de pago para procesar');
      setProcessing3DS(false);
      return;
    }

    try {
      setProcessingPayment(true);
      setProcessing3DS(false);
      setError(null);

      console.log('Processing payment with 3DS parameters:', parameters3DS);
      console.log('threeDSData:', threeDSData);
      
      // Usar el endpoint normal de 3DS (siempre usamos token)
      const response = await axios.post('/api/student/culqi/process-payment-3ds', {
        token_id: threeDSData.tokenId,
        installment_id: installment.id,
        amount: installment.amount,
        parameters_3ds: parameters3DS,
        save_card: false,
        auto_payment: false,
      });

      if (response.data.success) {
        setPaymentSuccess(true);
        toast.success('¡Pago procesado exitosamente!', {
          description: `La cuota #${installment.installment_number} ha sido pagada con verificación 3D Secure`,
          duration: 5000,
        });

        setTimeout(() => {
          onSuccess();
          onClose();
        }, 2000);
      } else {
        setError(response.data.error || 'Error al procesar el pago con 3DS');
      }
    } catch (error: any) {
      console.error('Error processing 3DS payment:', error);
      const errorMessage = error.response?.data?.error || 'Error al procesar el pago con 3D Secure';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setProcessingPayment(false);
      setThreeDSData(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN'
    }).format(amount);
  };

  const getCardBrandIcon = (brand: string) => {
    const brandLower = brand?.toLowerCase() || '';
    if (brandLower.includes('visa')) return '💳 Visa';
    if (brandLower.includes('master')) return '💳 Mastercard';
    if (brandLower.includes('amex')) return '💳 Amex';
    return '💳 Tarjeta';
  };

  const handleClose = () => {
    if (culqiOpen && window.Culqi) {
      try {
        window.Culqi.close();
      } catch (e) {
        // Ignorar errores al cerrar
      }
    }
    setCulqiOpen(false);
    setProcessing3DS(false);
    setThreeDSData(null);
    setPaymentMode('select');
    if (!processingPayment) {
      onClose();
    }
  };

  if (!isOpen) return null;
  if (culqiOpen) return null;

  // Filtrar solo tarjetas tipo card que pueden cobrar (tienen culqi_card_id)
  const chargeableCards = savedCards.filter(c => c.type === 'card' && c.canCharge);
  const nonChargeableCards = savedCards.filter(c => c.type === 'card' && !c.canCharge);

  return (
    <div className="fixed inset-0 z-[9998] overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-lg transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all">
          {/* Header */}
          <div className="relative bg-gradient-to-r from-[#073372] to-[#17BC91] px-6 py-5">
            <button
              onClick={handleClose}
              disabled={processingPayment || processing3DS}
              className="absolute right-4 top-4 rounded-full bg-white/20 p-2 text-white hover:bg-white/30 transition-colors disabled:opacity-50"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="rounded-full bg-white/20 p-3">
                <CreditCard className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Pagar con Tarjeta</h2>
                <p className="text-sm text-white/90">Cuota #{installment.installment_number} - {formatCurrency(installment.amount)}</p>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-5">

            {/* Estado de éxito */}
            {paymentSuccess && (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-10 w-10 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">¡Pago Exitoso!</h3>
                <p className="text-gray-600">Tu pago ha sido procesado correctamente.</p>
              </div>
            )}

            {/* Estado de carga inicial */}
            {loading && !paymentSuccess && (
              <div className="text-center py-8">
                <Loader2 className="h-10 w-10 text-[#073372] animate-spin mx-auto mb-4" />
                <p className="text-gray-600">Cargando sistema de pagos...</p>
              </div>
            )}

            {/* Estado de procesando 3DS */}
            {processing3DS && !paymentSuccess && (
              <div className="text-center py-8">
                <div className="relative mx-auto mb-4 w-16 h-16">
                  <Shield className="h-16 w-16 text-[#073372] absolute" />
                  <Loader2 className="h-8 w-8 text-[#17BC91] animate-spin absolute top-4 left-4" />
                </div>
                <p className="text-gray-600 font-medium">Verificación 3D Secure en progreso...</p>
                <p className="text-sm text-gray-500 mt-2">Completa la verificación en la ventana de tu banco</p>
                <p className="text-xs text-gray-400 mt-4">No cierres esta ventana</p>
              </div>
            )}

            {/* Estado de procesando pago */}
            {processingPayment && !paymentSuccess && !processing3DS && (
              <div className="text-center py-8">
                <Loader2 className="h-10 w-10 text-[#17BC91] animate-spin mx-auto mb-4" />
                <p className="text-gray-600 font-medium">Procesando tu pago...</p>
                <p className="text-sm text-gray-500 mt-2">Por favor no cierres esta ventana</p>
              </div>
            )}

            {/* Estado de error */}
            {error && !paymentSuccess && !processingPayment && !processing3DS && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-900">Error</p>
                    <p className="text-sm text-red-700 mt-1">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Contenido principal - Selección de método de pago */}
            {!loading && !paymentSuccess && !processingPayment && !processing3DS && (
              <>
                {/* Security Badge */}
                <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <Shield className="h-5 w-5 text-green-600" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-green-900">Pago 100% Seguro</p>
                    <p className="text-xs text-green-700">Tu información está protegida con encriptación SSL</p>
                  </div>
                  <Lock className="h-5 w-5 text-green-600" />
                </div>

                {/* Tarjetas guardadas que pueden cobrar */}
                {chargeableCards.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-gray-700">Tarjetas guardadas</p>
                    
                    {chargeableCards.map((card) => (
                      <button
                        key={card.id}
                        onClick={() => setSelectedCard(card)}
                        className={`w-full p-4 rounded-xl border-2 transition-all text-left flex items-center gap-4 ${
                          selectedCard?.id === card.id
                            ? 'border-[#17BC91] bg-green-50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex-shrink-0 w-12 h-8 bg-gradient-to-br from-gray-700 to-gray-900 rounded flex items-center justify-center text-white text-xs font-bold">
                          {card.cardBrand?.slice(0, 4).toUpperCase() || 'CARD'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900">
                            •••• •••• •••• {card.cardLast4}
                          </p>
                          <p className="text-xs text-gray-500">
                            {card.cardholderName || 'Titular'} • Vence {card.cardExpMonth}/{card.cardExpYear}
                          </p>
                        </div>
                        {card.isDefault && (
                          <span className="flex-shrink-0 px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                            Predeterminada
                          </span>
                        )}
                        <ChevronRight className={`h-5 w-5 flex-shrink-0 transition-colors ${
                          selectedCard?.id === card.id ? 'text-[#17BC91]' : 'text-gray-400'
                        }`} />
                      </button>
                    ))}
                  </div>
                )}

                {/* Opción de nueva tarjeta */}
                <button
                  onClick={handlePayWithNewCard}
                  disabled={!culqiLoaded}
                  className="w-full p-4 rounded-xl border-2 border-dashed border-gray-300 hover:border-[#073372] hover:bg-blue-50 transition-all text-left flex items-center gap-4 group"
                >
                  <div className="flex-shrink-0 w-12 h-8 bg-gray-100 group-hover:bg-[#073372] rounded flex items-center justify-center transition-colors">
                    <Plus className="h-5 w-5 text-gray-400 group-hover:text-white transition-colors" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 group-hover:text-[#073372]">
                      Pagar con nueva tarjeta
                    </p>
                    <p className="text-xs text-gray-500">
                      Ingresa los datos de otra tarjeta
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-[#073372] transition-colors" />
                </button>

                {/* Payment Summary */}
                <div className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200">
                  <div className="flex justify-between items-center text-sm mb-2">
                    <span className="text-gray-600">Cuota #{installment.installment_number}</span>
                    <span className="font-medium text-gray-900">{formatCurrency(installment.amount)}</span>
                  </div>
                  <div className="border-t border-gray-300 pt-2 mt-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-gray-900">Total a Pagar</span>
                      <span className="text-2xl font-bold text-[#073372]">{formatCurrency(installment.amount)}</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          {!paymentSuccess && !loading && !processingPayment && !processing3DS && (
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-100 transition-colors"
              >
                Cancelar
              </button>
              
              {selectedCard && (
                <button
                  type="button"
                  onClick={handlePayWithSavedCard}
                  disabled={processingPayment}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-[#073372] to-[#17BC91] text-white font-bold rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <CreditCard className="h-5 w-5" />
                  <span>Pagar con •••• {selectedCard.cardLast4}</span>
                </button>
              )}
            </div>
          )}

          {/* Powered by Culqi */}
          <div className="px-6 py-3 bg-gray-100 border-t border-gray-200">
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
