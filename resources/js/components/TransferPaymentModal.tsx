import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Upload, Check, AlertCircle, Building2, Copy, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface TransferMethod {
  id: number;
  name: string;
  description: string | null;
  bank_name: string;
  bank_logo_url: string | null;
  account_holder: string;
  account_number: string;
  cci: string;
  account_type: 'ahorros' | 'corriente';
}

interface TransferPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  installmentId: string;
  amount: number;
  isPartialPayment?: boolean;
}

const TransferPaymentModal: React.FC<TransferPaymentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  installmentId,
  amount,
  isPartialPayment = false,
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [transferMethods, setTransferMethods] = useState<TransferMethod[]>([]);
  const [selectedTransfer, setSelectedTransfer] = useState<TransferMethod | null>(null);
  const [voucherFile, setVoucherFile] = useState<File | null>(null);
  const [voucherPreview, setVoucherPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchTransferMethods();
      setCurrentStep(1);
      setVoucherFile(null);
      setVoucherPreview(null);
    }
  }, [isOpen]);

  const fetchTransferMethods = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/student/active-payment-methods');
      const transfers = response.data.transfers || [];
      setTransferMethods(transfers);
      
      // Seleccionar el primero por defecto
      if (transfers.length > 0) {
        setSelectedTransfer(transfers[0]);
      }
    } catch (error) {
      console.error('Error fetching transfer methods:', error);
      toast.error('Error al cargar cuentas bancarias');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado al portapapeles`, {
      duration: 2000,
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
        toast.error('Solo se permiten imágenes o archivos PDF');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast.error('El archivo no debe superar 5MB');
        return;
      }

      setVoucherFile(file);

      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setVoucherPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setVoucherPreview(null);
      }
    }
  };

  const handleSubmit = async () => {
    if (!selectedTransfer) {
      toast.error('Selecciona una cuenta bancaria');
      return;
    }

    if (!voucherFile) {
      toast.error('Debes subir el comprobante de pago');
      return;
    }

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append('voucher_file', voucherFile);
      if (!isPartialPayment) {
        formData.append('installment_id', installmentId);
      }
      formData.append('declared_amount', amount.toString());
      formData.append('payment_date', new Date().toISOString().split('T')[0]);
      formData.append('payment_method', 'transfer');
      if (isPartialPayment) {
        formData.append('is_partial_payment', '1');
      }

      await axios.post('/api/student/upload-voucher', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.success('¡Pago registrado exitosamente!', {
        description: 'Tu comprobante está siendo verificado. Recibirás una notificación pronto.'
      });

      onSuccess();
      onClose();
    } catch (error: unknown) {
      console.error('Error uploading voucher:', error);
      const err = error as { response?: { data?: { message?: string } } };
      toast.error('Error al subir comprobante', {
        description: err.response?.data?.message || 'No se pudo procesar el pago'
      });
    } finally {
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN'
    }).format(value);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh]">
        {/* Header - Fixed */}
        <div className="bg-gradient-to-r from-[#073372] to-[#17BC91] text-white px-6 py-5 rounded-t-2xl flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Transferencia Bancaria</h3>
              <p className="text-sm text-white/90">
                Monto: <span className="font-bold">{formatCurrency(amount)}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
            disabled={uploading}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-12 flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#17BC91]"></div>
            </div>
          ) : transferMethods.length === 0 ? (
            <div className="p-12 text-center">
              <AlertCircle className="w-16 h-16 text-[#F98613] mx-auto mb-4" />
              <p className="text-lg font-semibold text-slate-900 mb-2">
                No hay cuentas bancarias disponibles
              </p>
              <p className="text-slate-600 text-sm">
                Por favor, contacta con administración
              </p>
            </div>
          ) : (
            <div className="p-6">
              {/* Progress Indicator */}
              <div className="mb-6 bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  {[1, 2, 3].map((step) => (
                    <React.Fragment key={step}>
                      <div className="flex flex-col items-center gap-2">
                        <div
                          className={`flex items-center justify-center w-12 h-12 rounded-full font-bold transition-all ${
                            currentStep === step
                              ? 'bg-gradient-to-br from-[#073372] to-[#17BC91] text-white shadow-lg ring-4 ring-[#17BC91]/20'
                              : currentStep > step
                              ? 'bg-[#17BC91] text-white'
                              : 'bg-white border-2 border-slate-300 text-slate-400'
                          }`}
                        >
                          {currentStep > step ? <Check className="w-6 h-6" /> : step}
                        </div>
                        <span className={`text-xs font-semibold ${
                          currentStep === step ? 'text-[#073372]' : currentStep > step ? 'text-[#17BC91]' : 'text-slate-400'
                        }`}>
                          {step === 1 ? 'Instrucciones' : step === 2 ? 'Datos Bancarios' : 'Comprobante'}
                        </span>
                      </div>
                      {step < 3 && (
                        <div className="flex-1 h-1 mx-3 rounded-full transition-all" style={{
                          background: currentStep > step ? '#17BC91' : '#e2e8f0'
                        }} />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* Step 1: Instructions */}
              {currentStep === 1 && (
                <div className="bg-white border-2 border-[#17BC91]/20 rounded-xl p-5 space-y-4 animate-fadeIn">
                  <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
                    <div className="p-2.5 bg-gradient-to-br from-[#073372] to-[#17BC91] rounded-lg">
                      <Building2 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900">Cómo pagar con Transferencia</h4>
                      <p className="text-xs text-slate-600">Sigue estos pasos desde tu banco</p>
                    </div>
                  </div>

                  <div className="bg-[#F98613]/5 border border-[#F98613]/30 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-[#F98613] flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold text-[#F98613] mb-1">
                          ¿Qué es una transferencia bancaria?
                        </p>
                        <p className="text-xs text-slate-700 leading-relaxed">
                          Es el envío de dinero desde tu cuenta bancaria a nuestra cuenta. Puedes hacerlo desde tu app móvil o banca por internet de forma segura.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#17BC91]/5 border border-[#17BC91]/30 rounded-lg p-4 space-y-3">
                    <p className="text-sm font-semibold text-[#073372] mb-2">📱 Preparación:</p>
                    <div className="flex items-start gap-3">
                      <span className="flex items-center justify-center w-6 h-6 bg-[#073372] text-white rounded-full text-xs font-bold flex-shrink-0 mt-0.5">
                        1
                      </span>
                      <p className="text-sm text-slate-700 flex-1">
                        Ten acceso a tu <span className="font-semibold text-[#073372]">app bancaria o banca por internet</span>
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="flex items-center justify-center w-6 h-6 bg-[#073372] text-white rounded-full text-xs font-bold flex-shrink-0 mt-0.5">
                        2
                      </span>
                      <p className="text-sm text-slate-700 flex-1">
                        Verifica tener saldo disponible de <span className="font-bold text-[#F98613]">{formatCurrency(amount)}</span>
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="flex items-center justify-center w-6 h-6 bg-[#073372] text-white rounded-full text-xs font-bold flex-shrink-0 mt-0.5">
                        3
                      </span>
                      <p className="text-sm text-slate-700 flex-1">
                        Prepárate para capturar el comprobante de confirmación
                      </p>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-xs text-slate-700 leading-relaxed">
                      <span className="font-semibold">Siguiente paso:</span> Te mostraremos los datos de nuestra cuenta bancaria para que puedas realizar la transferencia.
                    </p>
                  </div>

                  <button
                    onClick={() => setCurrentStep(2)}
                    className="w-full py-2.5 bg-gradient-to-r from-[#073372] to-[#17BC91] text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                  >
                    Ver Datos Bancarios
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              )}

              {/* Step 2: Bank Account Details */}
              {currentStep === 2 && selectedTransfer && (
                <div className="bg-white border-2 border-[#17BC91]/20 rounded-xl p-5 space-y-4 animate-fadeIn">
                  <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
                    <div className="p-2.5 bg-gradient-to-br from-[#073372] to-[#17BC91] rounded-lg">
                      <Building2 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900">Datos de nuestra cuenta</h4>
                      <p className="text-xs text-slate-600">Usa estos datos para transferir</p>
                    </div>
                  </div>

                  {/* Amount to transfer */}
                  <div className="bg-gradient-to-r from-[#F98613]/10 to-[#F98613]/5 border border-[#F98613]/30 rounded-lg p-4">
                    <p className="text-xs font-medium text-slate-700 mb-1">Monto exacto a transferir:</p>
                    <p className="text-2xl font-bold text-[#F98613]">{formatCurrency(amount)}</p>
                  </div>

                  {/* Bank account info */}
                  <div className="bg-white border-2 border-[#17BC91]/30 rounded-xl p-4 space-y-3">
                    {/* Bank header with logo */}
                    <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
                      {selectedTransfer.bank_logo_url && (
                        <img
                          src={selectedTransfer.bank_logo_url}
                          alt={selectedTransfer.bank_name}
                          className="h-10 object-contain"
                        />
                      )}
                      <div className="flex-1">
                        <h4 className="font-bold text-slate-900 text-sm">
                          {selectedTransfer.bank_name}
                        </h4>
                        {selectedTransfer.description && (
                          <p className="text-xs text-slate-600">{selectedTransfer.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      {/* Titular */}
                      <div className="bg-slate-50 rounded-lg p-3">
                        <p className="text-xs font-medium text-slate-600 mb-1">Titular de la cuenta:</p>
                        <p className="text-sm font-bold text-slate-900">{selectedTransfer.account_holder}</p>
                      </div>

                      {/* Account Number */}
                      <div className="bg-blue-50 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-medium text-blue-900">Número de Cuenta:</p>
                          <button
                            onClick={() => handleCopy(selectedTransfer.account_number, 'Número de cuenta')}
                            className="p-1.5 hover:bg-blue-100 rounded transition-colors"
                            title="Copiar"
                          >
                            <Copy className="w-4 h-4 text-blue-600" />
                          </button>
                        </div>
                        <p className="text-base font-bold text-blue-700 tracking-wider">{selectedTransfer.account_number}</p>
                        <p className="text-xs text-blue-600 mt-1 capitalize">Cuenta {selectedTransfer.account_type}</p>
                      </div>

                      {/* CCI */}
                      <div className="bg-[#17BC91]/10 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-medium text-[#073372]">CCI (Interbancario):</p>
                          <button
                            onClick={() => handleCopy(selectedTransfer.cci, 'CCI')}
                            className="p-1.5 hover:bg-[#17BC91]/20 rounded transition-colors"
                            title="Copiar"
                          >
                            <Copy className="w-4 h-4 text-[#17BC91]" />
                          </button>
                        </div>
                        <p className="text-base font-bold text-[#073372] tracking-wider">{selectedTransfer.cci}</p>
                      </div>
                    </div>
                  </div>

                  {/* Instructions */}
                  <div className="bg-[#17BC91]/5 border border-[#17BC91]/30 rounded-lg p-4 space-y-3">
                    <p className="text-sm font-semibold text-[#073372] mb-2">📱 Pasos para transferir:</p>
                    <div className="flex items-start gap-3">
                      <span className="flex items-center justify-center w-6 h-6 bg-[#073372] text-white rounded-full text-xs font-bold flex-shrink-0 mt-0.5">
                        1
                      </span>
                      <p className="text-sm text-slate-700 flex-1">
                        Abre tu app bancaria o banca por internet
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="flex items-center justify-center w-6 h-6 bg-[#073372] text-white rounded-full text-xs font-bold flex-shrink-0 mt-0.5">
                        2
                      </span>
                      <p className="text-sm text-slate-700 flex-1">
                        Selecciona "Transferir" y elige el banco destino
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="flex items-center justify-center w-6 h-6 bg-[#073372] text-white rounded-full text-xs font-bold flex-shrink-0 mt-0.5">
                        3
                      </span>
                      <p className="text-sm text-slate-700 flex-1">
                        Usa los botones <Copy className="w-3 h-3 inline" /> para copiar el número de cuenta o CCI
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="flex items-center justify-center w-6 h-6 bg-[#073372] text-white rounded-full text-xs font-bold flex-shrink-0 mt-0.5">
                        4
                      </span>
                      <p className="text-sm text-slate-700 flex-1">
                        Ingresa el monto exacto: <span className="font-bold text-[#F98613]">{formatCurrency(amount)}</span>
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="flex items-center justify-center w-6 h-6 bg-[#17BC91] text-white rounded-full text-xs font-bold flex-shrink-0 mt-0.5">
                        5
                      </span>
                      <p className="text-sm text-slate-700 flex-1">
                        <span className="font-semibold text-[#17BC91]">¡Importante!</span> Guarda o captura el comprobante de confirmación
                      </p>
                    </div>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-slate-700">
                        <span className="font-semibold">No cierres tu app bancaria</span> hasta guardar el comprobante. Lo necesitarás en el siguiente paso.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => setCurrentStep(1)}
                      className="flex-1 py-2.5 border-2 border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      Volver
                    </button>
                    <button
                      onClick={() => setCurrentStep(3)}
                      className="flex-1 py-2.5 bg-gradient-to-r from-[#073372] to-[#17BC91] text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all"
                    >
                      Ya transferí
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Upload Voucher */}
              {currentStep === 3 && (
                <div className="bg-white border-2 border-[#17BC91]/20 rounded-xl p-5 space-y-4 animate-fadeIn">
                  <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
                    <div className="p-2.5 bg-gradient-to-br from-[#073372] to-[#17BC91] rounded-lg">
                      <Upload className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900">Sube tu comprobante</h4>
                      <p className="text-xs text-slate-600">Carga la captura del comprobante</p>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-xs text-slate-700 leading-relaxed">
                      Sube la captura de pantalla del comprobante de transferencia. 
                      Será revisado por nuestro equipo en <span className="font-semibold text-[#073372]">24-48 horas</span>.
                    </p>
                  </div>

                  {/* File Upload */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Comprobante de pago <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="transfer-voucher-upload"
                    />
                    <label
                      htmlFor="transfer-voucher-upload"
                      className={`block w-full px-4 py-6 border-2 border-dashed rounded-lg text-center cursor-pointer transition-all ${
                        voucherFile 
                          ? 'border-[#17BC91] bg-[#17BC91]/5' 
                          : 'border-slate-300 hover:border-[#073372] hover:bg-slate-50'
                      }`}
                    >
                      {voucherPreview ? (
                        <div className="space-y-2">
                          <div className="relative inline-block">
                            <img
                              src={voucherPreview}
                              alt="Preview"
                              className="max-h-40 mx-auto rounded-md shadow-md border-2 border-[#17BC91]"
                            />
                            <div className="absolute -top-1 -right-1 p-0.5 bg-[#17BC91] rounded-full">
                              <CheckCircle2 className="w-4 h-4 text-white" />
                            </div>
                          </div>
                          <p className="text-xs text-slate-700 font-medium">
                            {voucherFile?.name}
                          </p>
                          <p className="text-xs text-[#073372]">
                            ✓ Listo | Click para cambiar
                          </p>
                        </div>
                      ) : voucherFile ? (
                        <div className="space-y-2">
                          <div className="p-2 bg-[#17BC91]/10 rounded-full inline-block">
                            <Upload className="w-6 h-6 text-[#17BC91]" />
                          </div>
                          <p className="text-xs text-slate-900 font-medium">
                            {voucherFile.name}
                          </p>
                          <p className="text-xs text-[#073372]">
                            ✓ Listo | Click para cambiar
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="p-2 bg-slate-100 rounded-full inline-block">
                            <Upload className="w-6 h-6 text-slate-400" />
                          </div>
                          <p className="text-sm text-slate-700 font-medium">
                            Click para subir el comprobante
                          </p>
                          <p className="text-xs text-slate-500">
                            PNG, JPG o PDF • Máx. 5MB
                          </p>
                        </div>
                      )}
                    </label>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => setCurrentStep(2)}
                      disabled={uploading}
                      className="flex-1 py-2.5 border-2 border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
                    >
                      Volver
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={uploading || !voucherFile}
                      className="flex-1 inline-flex items-center justify-center py-2.5 bg-gradient-to-r from-[#073372] to-[#17BC91] text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {uploading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Enviando...
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          Confirmar Pago
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TransferPaymentModal;
