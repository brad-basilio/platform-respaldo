import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Upload, Check, AlertCircle, Smartphone } from 'lucide-react';
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

  useEffect(() => {
    if (isOpen) {
      fetchYapeMethods();
    }
  }, [isOpen]);

  const fetchYapeMethods = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/student/active-payment-methods');
      const yapes = response.data.yapes || [];
      setYapeMethods(yapes);
      
      // Seleccionar el primero por defecto
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validar tipo de archivo
      if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
        toast.error('Solo se permiten imágenes o archivos PDF');
        return;
      }

      // Validar tamaño (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('El archivo no debe superar 5MB');
        return;
      }

      setVoucherFile(file);

      // Generar preview si es imagen
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
        description: 'Tu comprobante está siendo verificado por el cajero'
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error uploading voucher:', error);
      toast.error('Error al subir comprobante', {
        description: error.response?.data?.message || 'No se pudo procesar el pago'
      });
    } finally {
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <Smartphone className="w-6 h-6" />
            <div>
              <h3 className="text-xl font-bold">Pagar con Yape</h3>
              <p className="text-sm text-white/90">Escanea el QR y sube tu comprobante</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {loading ? (
          <div className="p-12 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          </div>
        ) : yapeMethods.length === 0 ? (
          <div className="p-12 text-center">
            <AlertCircle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
            <p className="text-lg font-semibold text-slate-900 mb-2">
              No hay métodos Yape disponibles
            </p>
            <p className="text-slate-600">
              Por favor, contacta con administración
            </p>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Monto a pagar */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl p-4">
              <p className="text-sm font-medium text-purple-900 mb-1">Monto a pagar:</p>
              <p className="text-3xl font-bold text-purple-700">
                {new Intl.NumberFormat('es-PE', {
                  style: 'currency',
                  currency: 'PEN'
                }).format(amount)}
              </p>
            </div>

            {/* Selección de método Yape (si hay más de uno) */}
            {yapeMethods.length > 1 && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  Selecciona la cuenta Yape:
                </label>
                <div className="grid grid-cols-1 gap-3">
                  {yapeMethods.map((yape) => (
                    <button
                      key={yape.id}
                      onClick={() => setSelectedYape(yape)}
                      className={`p-4 rounded-xl border-2 transition-all text-left ${
                        selectedYape?.id === yape.id
                          ? 'border-purple-600 bg-purple-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-slate-900">{yape.name}</p>
                          {yape.description && (
                            <p className="text-sm text-slate-600 mt-1">{yape.description}</p>
                          )}
                          <p className="text-sm text-slate-700 mt-1">
                            📱 {yape.phone_number}
                          </p>
                        </div>
                        {selectedYape?.id === yape.id && (
                          <Check className="w-6 h-6 text-purple-600" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Información del Yape seleccionado */}
            {selectedYape && (
              <div className="bg-white border-2 border-purple-200 rounded-xl p-6">
                <h4 className="font-bold text-slate-900 mb-4 text-center">
                  {selectedYape.name}
                </h4>

                {selectedYape.description && (
                  <p className="text-sm text-slate-600 text-center mb-4">
                    {selectedYape.description}
                  </p>
                )}

                {/* QR Code */}
                {selectedYape.qr_image_url ? (
                  <div className="flex flex-col items-center mb-4">
                    <p className="text-sm font-medium text-slate-700 mb-3">
                      Escanea este código QR con tu app de Yape:
                    </p>
                    <img
                      src={selectedYape.qr_image_url}
                      alt="QR Yape"
                      className="w-64 h-64 object-contain border-4 border-purple-200 rounded-xl shadow-lg"
                    />
                  </div>
                ) : (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-purple-900 font-medium mb-2">
                      Número de Yape:
                    </p>
                    <p className="text-2xl font-bold text-purple-700">
                      {selectedYape.phone_number}
                    </p>
                  </div>
                )}

                {/* Instrucciones */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <h5 className="font-semibold text-blue-900 mb-2">📝 Instrucciones:</h5>
                  <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                    <li>Abre tu app de Yape</li>
                    <li>Escanea el código QR o ingresa el número manualmente</li>
                    <li>Ingresa el monto exacto: <strong>{new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(amount)}</strong></li>
                    <li>Completa la transferencia</li>
                    <li>Toma una captura de pantalla del comprobante</li>
                    <li>Sube la imagen aquí abajo</li>
                  </ol>
                </div>

                {/* Upload voucher */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
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
                    className="block w-full px-4 py-8 border-2 border-dashed border-slate-300 rounded-xl text-center cursor-pointer hover:border-purple-500 hover:bg-purple-50 transition-colors"
                  >
                    {voucherPreview ? (
                      <div className="space-y-3">
                        <img
                          src={voucherPreview}
                          alt="Preview"
                          className="max-h-48 mx-auto rounded-lg"
                        />
                        <p className="text-sm text-slate-600">
                          {voucherFile?.name}
                        </p>
                        <p className="text-xs text-purple-600 font-medium">
                          Click para cambiar
                        </p>
                      </div>
                    ) : voucherFile ? (
                      <div className="space-y-2">
                        <Upload className="w-12 h-12 text-purple-600 mx-auto" />
                        <p className="text-sm text-slate-900 font-medium">
                          {voucherFile.name}
                        </p>
                        <p className="text-xs text-purple-600 font-medium">
                          Click para cambiar
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Upload className="w-12 h-12 text-slate-400 mx-auto" />
                        <p className="text-sm text-slate-600">
                          Click para subir tu comprobante
                        </p>
                        <p className="text-xs text-slate-500">
                          PNG, JPG o PDF (máx. 5MB)
                        </p>
                      </div>
                    )}
                  </label>
                </div>
              </div>
            )}

            {/* Botones */}
            <div className="flex gap-3 pt-4">
              <button
                onClick={onClose}
                disabled={uploading}
                className="flex-1 px-6 py-3 border-2 border-slate-300 text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={uploading || !voucherFile}
                className="flex-1 inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Subiendo...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5 mr-2" />
                    Confirmar Pago
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default YapePaymentModal;
