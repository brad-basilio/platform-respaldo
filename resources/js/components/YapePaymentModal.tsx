import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Upload, Check, AlertCircle, Smartphone, Copy, CheckCircle2, QrCode } from 'lucide-react';
import { toast } from 'sonner';

interface YapeMethod {
  id: number;
  name: string;
  description: string | null;
  phone_number: string;
  qr_image_url: string | null;
}

interface YapePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  installmentId: string;
  amount: number;
}

const YapePaymentModal: React.FC<YapePaymentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  installmentId,
  amount,
}) => {
  const [yapeMethods, setYapeMethods] = useState<YapeMethod[]>([]);
  const [selectedYape, setSelectedYape] = useState<YapeMethod | null>(null);
  const [voucherFile, setVoucherFile] = useState<File | null>(null);
  const [voucherPreview, setVoucherPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  useEffect(() => {
    if (isOpen) {
      fetchYapeMethods();
      setCurrentStep(1);
      setVoucherFile(null);
      setVoucherPreview(null);
    }
  }, [isOpen]);

  const fetchYapeMethods = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/student/active-payment-methods');
      const yapes = response.data.yapes || [];
      setYapeMethods(yapes);
      
      if (yapes.length > 0) {
        setSelectedYape(yapes[0]);
      }
    } catch (error) {
      console.error('Error fetching yape methods:', error);
      toast.error('Error al cargar métodos Yape');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPhone(true);
    toast.success('Número copiado');
    setTimeout(() => setCopiedPhone(false), 2000);
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
    if (!selectedYape) {
      toast.error('Selecciona un método Yape');
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
      formData.append('installment_id', installmentId);
      formData.append('declared_amount', amount.toString());
      formData.append('payment_date', new Date().toISOString().split('T')[0]);
      formData.append('payment_method', 'yape');

      await axios.post('/api/student/upload-voucher', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.success('¡Pago registrado exitosamente!', {
        description: 'Tu comprobante está siendo verificado'
      });

      onSuccess();
      onClose();
    } catch (error: unknown) {
      console.error('Error uploading voucher:', error);
      const axiosError = error as { response?: { data?: { message?: string } } };
      const errorMessage = axiosError.response?.data?.message || 'No se pudo procesar el pago';
      toast.error('Error al subir comprobante', {
        description: errorMessage
      });
    } finally {
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header - Fixed */}
        <div className="bg-gradient-to-r from-[#073372] to-[#17BC91] text-white px-6 py-5 rounded-t-2xl flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Pagar con Yape</h3>
              <p className="text-sm text-white/90">
                Monto: <span className="font-bold">{new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(amount)}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 overflow-y-auto p-12 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#17BC91]"></div>
          </div>
        ) : yapeMethods.length === 0 ? (
          <div className="flex-1 overflow-y-auto p-12 text-center">
            <AlertCircle className="w-16 h-16 text-[#F98613] mx-auto mb-4" />
            <p className="text-lg font-semibold text-slate-900 mb-2">
              No hay métodos Yape disponibles
            </p>
            <p className="text-slate-600">Por favor, contacta con administración</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6">
            {/* Progress Steps */}
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
                        {currentStep > step ? <CheckCircle2 className="w-6 h-6" /> : step}
                      </div>
                      <span className={`text-xs font-semibold ${
                        currentStep === step ? 'text-[#073372]' : currentStep > step ? 'text-[#17BC91]' : 'text-slate-400'
                      }`}>
                        {step === 1 ? 'Instrucciones' : step === 2 ? 'Pagar' : 'Comprobante'}
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

            {/* Selección de cuenta Yape (si hay más de una) */}
            {yapeMethods.length > 1 && (
              <div className="mb-4 space-y-2">
                <label className="block text-sm font-semibold text-slate-700">
                  Selecciona la cuenta Yape:
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {yapeMethods.map((yape) => (
                    <button
                      key={yape.id}
                      onClick={() => setSelectedYape(yape)}
                      className={`p-3 rounded-lg border-2 transition-all text-left ${
                        selectedYape?.id === yape.id
                          ? 'border-[#17BC91] bg-[#17BC91]/5 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-900">{yape.name}</p>
                          {yape.description && (
                            <p className="text-xs text-slate-600 mt-0.5">{yape.description}</p>
                          )}
                          <p className="text-sm text-slate-700 mt-1 flex items-center gap-1">
                            <Smartphone className="w-3.5 h-3.5" />
                            {yape.phone_number}
                          </p>
                        </div>
                        {selectedYape?.id === yape.id && (
                          <Check className="w-5 h-5 text-[#17BC91] flex-shrink-0" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 1: Instrucciones */}
            {selectedYape && currentStep === 1 && (
              <div className="bg-white border-2 border-[#17BC91]/20 rounded-xl p-5 space-y-4 animate-fadeIn">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
                  <div className="p-2.5 bg-gradient-to-br from-[#073372] to-[#17BC91] rounded-lg">
                    <Smartphone className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">Cómo pagar con Yape</h4>
                    <p className="text-xs text-slate-600">Sigue estos pasos desde tu celular</p>
                  </div>
                </div>

                <div className="bg-[#F98613]/5 border border-[#F98613]/30 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-[#F98613] flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-[#F98613] mb-1">
                        ¿Qué es Yape?
                      </p>
                      <p className="text-xs text-slate-700 leading-relaxed">
                        Yape es una app del BCP para hacer pagos desde tu celular de forma rápida y segura.
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
                      Asegúrate de tener la <span className="font-semibold text-[#073372]">app de Yape</span> instalada en tu celular
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="flex items-center justify-center w-6 h-6 bg-[#073372] text-white rounded-full text-xs font-bold flex-shrink-0 mt-0.5">
                      2
                    </span>
                    <p className="text-sm text-slate-700 flex-1">
                      Ten saldo disponible de <span className="font-bold text-[#F98613]">
                        {new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(amount)}
                      </span> en tu cuenta Yape
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="flex items-center justify-center w-6 h-6 bg-[#073372] text-white rounded-full text-xs font-bold flex-shrink-0 mt-0.5">
                      3
                    </span>
                    <p className="text-sm text-slate-700 flex-1">
                      Abre la app de Yape en tu celular
                    </p>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-slate-700 leading-relaxed">
                    <span className="font-semibold">Siguiente paso:</span> Te mostraremos el código QR que debes escanear con Yape para realizar el pago.
                  </p>
                </div>

                <button
                  onClick={() => setCurrentStep(2)}
                  className="w-full py-2.5 bg-gradient-to-r from-[#073372] to-[#17BC91] text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  Ver código QR
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            )}

            {/* Step 2: Ver QR y Pagar */}
            {selectedYape && currentStep === 2 && (
              <div className="bg-white border-2 border-[#17BC91]/20 rounded-xl p-5 space-y-4 animate-fadeIn">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
                  <div className="p-2.5 bg-gradient-to-br from-[#073372] to-[#17BC91] rounded-lg">
                    <QrCode className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">Escanea y paga</h4>
                    <p className="text-xs text-slate-600">Usa tu app de Yape para escanear</p>
                  </div>
                </div>

                <div className="flex flex-col items-center py-2">
                  {selectedYape.qr_image_url ? (
                    <>
                      <div className="bg-white p-3 rounded-lg border-2 border-[#17BC91]/30 shadow-md mb-3">
                        <img
                          src={selectedYape.qr_image_url}
                          alt="QR Yape"
                          className="w-56 h-56 object-contain"
                        />
                      </div>
                      <p className="text-xs text-slate-600 text-center mb-2">
                        Escanea este código con tu app de Yape
                      </p>
                    </>
                  ) : (
                    <div className="w-full bg-[#17BC91]/5 border-2 border-[#17BC91]/30 rounded-lg p-4">
                      <p className="text-xs font-medium text-slate-600 mb-2 text-center">
                        Número de Yape:
                      </p>
                      <div className="flex items-center justify-center gap-2">
                        <p className="text-2xl font-bold text-[#073372]">
                          {selectedYape.phone_number}
                        </p>
                        <button
                          onClick={() => copyToClipboard(selectedYape.phone_number)}
                          className="p-1.5 hover:bg-[#073372]/10 rounded-md transition-colors"
                          title="Copiar número"
                        >
                          <Copy className={`w-4 h-4 ${copiedPhone ? 'text-[#17BC91]' : 'text-[#073372]'}`} />
                        </button>
                      </div>
                      <p className="text-xs text-slate-600 text-center mt-2">
                        Ingresa este número manualmente en Yape
                      </p>
                    </div>
                  )}
                </div>

                <div className="bg-[#17BC91]/5 border border-[#17BC91]/30 rounded-lg p-4 space-y-3">
                  <p className="text-sm font-semibold text-[#073372] mb-2">📱 Pasos en Yape:</p>
                  <div className="flex items-start gap-3">
                    <span className="flex items-center justify-center w-6 h-6 bg-[#073372] text-white rounded-full text-xs font-bold flex-shrink-0 mt-0.5">
                      1
                    </span>
                    <p className="text-sm text-slate-700 flex-1">
                      {selectedYape.qr_image_url 
                        ? 'Escanea el código QR desde la app de Yape'
                        : `Ingresa el número: ${selectedYape.phone_number}`
                      }
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="flex items-center justify-center w-6 h-6 bg-[#073372] text-white rounded-full text-xs font-bold flex-shrink-0 mt-0.5">
                      2
                    </span>
                    <p className="text-sm text-slate-700 flex-1">
                      Verifica que el monto sea <span className="font-bold text-[#F98613]">
                        {new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(amount)}
                      </span>
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="flex items-center justify-center w-6 h-6 bg-[#073372] text-white rounded-full text-xs font-bold flex-shrink-0 mt-0.5">
                      3
                    </span>
                    <p className="text-sm text-slate-700 flex-1">
                      Confirma y completa el pago
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="flex items-center justify-center w-6 h-6 bg-[#17BC91] text-white rounded-full text-xs font-bold flex-shrink-0 mt-0.5">
                      4
                    </span>
                    <p className="text-sm text-slate-700 flex-1">
                      <span className="font-semibold text-[#17BC91]">¡Importante!</span> Toma captura de pantalla del comprobante
                    </p>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-slate-700">
                      <span className="font-semibold">No cierres Yape</span> hasta tomar la captura de pantalla del comprobante. La necesitarás en el siguiente paso.
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
                    Ya pagué
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Upload Voucher */}
            {selectedYape && currentStep === 3 && (
              <div className="bg-white border-2 border-[#17BC91]/20 rounded-xl p-5 space-y-4 animate-fadeIn">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
                  <div className="p-2.5 bg-gradient-to-br from-[#073372] to-[#17BC91] rounded-lg">
                    <Upload className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">Sube tu comprobante</h4>
                    <p className="text-xs text-slate-600">Carga la captura de pantalla del pago</p>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-slate-700 leading-relaxed">
                    Sube la captura de pantalla del comprobante de Yape. 
                    Será revisado por nuestro equipo en <span className="font-semibold text-[#073372]">24-48 horas</span>.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Comprobante de pago <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="yape-voucher-upload"
                  />
                  <label
                    htmlFor="yape-voucher-upload"
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
                        <CheckCircle2 className="w-4 h-4 mr-2" />
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
  );
};

export default YapePaymentModal;
