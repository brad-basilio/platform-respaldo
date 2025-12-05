import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Upload, Check, AlertCircle, Building2, Copy } from 'lucide-react';
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
}

const TransferPaymentModal: React.FC<TransferPaymentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  installmentId,
  amount,
}) => {
  const [transferMethods, setTransferMethods] = useState<TransferMethod[]>([]);
  const [selectedTransfer, setSelectedTransfer] = useState<TransferMethod | null>(null);
  const [voucherFile, setVoucherFile] = useState<File | null>(null);
  const [voucherPreview, setVoucherPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchTransferMethods();
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
    toast.success(`${label} copiado`, {
      duration: 2000,
    });
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
      formData.append('installment_id', installmentId);
      formData.append('declared_amount', amount.toString());
      formData.append('payment_date', new Date().toISOString().split('T')[0]);
      formData.append('payment_method', 'transfer');

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
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <Building2 className="w-6 h-6" />
            <div>
              <h3 className="text-xl font-bold">Transferencia Bancaria</h3>
              <p className="text-sm text-white/90">Transfiere y sube tu comprobante</p>
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
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : transferMethods.length === 0 ? (
          <div className="p-12 text-center">
            <AlertCircle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
            <p className="text-lg font-semibold text-slate-900 mb-2">
              No hay cuentas bancarias disponibles
            </p>
            <p className="text-slate-600">
              Por favor, contacta con administración
            </p>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Monto a pagar */}
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-xl p-4">
              <p className="text-sm font-medium text-blue-900 mb-1">Monto a transferir:</p>
              <p className="text-3xl font-bold text-blue-700">
                {new Intl.NumberFormat('es-PE', {
                  style: 'currency',
                  currency: 'PEN'
                }).format(amount)}
              </p>
            </div>

            {/* Selección de cuenta (si hay más de una) */}
            {transferMethods.length > 1 && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  Selecciona la cuenta bancaria:
                </label>
                <div className="grid grid-cols-1 gap-3">
                  {transferMethods.map((transfer) => (
                    <button
                      key={transfer.id}
                      onClick={() => setSelectedTransfer(transfer)}
                      className={`p-4 rounded-xl border-2 transition-all text-left ${
                        selectedTransfer?.id === transfer.id
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {transfer.bank_logo_url && (
                            <img
                              src={transfer.bank_logo_url}
                              alt={transfer.bank_name}
                              className="h-8 object-contain"
                            />
                          )}
                          <div>
                            <p className="font-semibold text-slate-900">{transfer.name}</p>
                            {transfer.description && (
                              <p className="text-sm text-slate-600 mt-1">{transfer.description}</p>
                            )}
                            <p className="text-sm text-slate-700 mt-1">
                              {transfer.bank_name} - {transfer.account_holder}
                            </p>
                          </div>
                        </div>
                        {selectedTransfer?.id === transfer.id && (
                          <Check className="w-6 h-6 text-blue-600" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Información de la cuenta seleccionada */}
            {selectedTransfer && (
              <div className="bg-white border-2 border-blue-200 rounded-xl p-6">
                <div className="flex items-center gap-4 mb-6">
                  {selectedTransfer.bank_logo_url && (
                    <img
                      src={selectedTransfer.bank_logo_url}
                      alt={selectedTransfer.bank_name}
                      className="h-12 object-contain"
                    />
                  )}
                  <div>
                    <h4 className="font-bold text-slate-900 text-lg">
                      {selectedTransfer.name}
                    </h4>
                    {selectedTransfer.description && (
                      <p className="text-sm text-slate-600">{selectedTransfer.description}</p>
                    )}
                  </div>
                </div>

                {/* Datos de la cuenta */}
                <div className="space-y-4 mb-6">
                  <div className="bg-slate-50 rounded-lg p-4">
                    <p className="text-xs font-medium text-slate-600 mb-1">Banco:</p>
                    <p className="text-lg font-semibold text-slate-900">{selectedTransfer.bank_name}</p>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-4">
                    <p className="text-xs font-medium text-slate-600 mb-1">Titular de la Cuenta:</p>
                    <p className="text-lg font-semibold text-slate-900">{selectedTransfer.account_holder}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-medium text-blue-900">Número de Cuenta:</p>
                        <button
                          onClick={() => handleCopy(selectedTransfer.account_number, 'Número de cuenta')}
                          className="p-1 hover:bg-blue-100 rounded transition-colors"
                          title="Copiar"
                        >
                          <Copy className="w-4 h-4 text-blue-600" />
                        </button>
                      </div>
                      <p className="text-lg font-bold text-blue-700">{selectedTransfer.account_number}</p>
                      <p className="text-xs text-blue-600 mt-1 capitalize">Cuenta {selectedTransfer.account_type}</p>
                    </div>

                    <div className="bg-cyan-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-medium text-cyan-900">CCI:</p>
                        <button
                          onClick={() => handleCopy(selectedTransfer.cci, 'CCI')}
                          className="p-1 hover:bg-cyan-100 rounded transition-colors"
                          title="Copiar"
                        >
                          <Copy className="w-4 h-4 text-cyan-600" />
                        </button>
                      </div>
                      <p className="text-lg font-bold text-cyan-700">{selectedTransfer.cci}</p>
                      <p className="text-xs text-cyan-600 mt-1">Para transferencias interbancarias</p>
                    </div>
                  </div>
                </div>

                {/* Instrucciones */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                  <h5 className="font-semibold text-amber-900 mb-2">📝 Instrucciones:</h5>
                  <ol className="text-sm text-amber-800 space-y-1 list-decimal list-inside">
                    <li>Ingresa a tu banca por internet o app móvil</li>
                    <li>Selecciona "Transferir a otro banco" o "Transferir a otra cuenta"</li>
                    <li>Ingresa el <strong>número de cuenta</strong> o <strong>CCI</strong> (usa los botones para copiar)</li>
                    <li>Ingresa el monto exacto: <strong>{new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(amount)}</strong></li>
                    <li>Completa la transferencia</li>
                    <li>Guarda o toma captura del comprobante</li>
                    <li>Sube el comprobante aquí abajo</li>
                  </ol>
                </div>

                {/* Upload voucher */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Comprobante de transferencia <span className="text-red-500">*</span>
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
                    className="block w-full px-4 py-8 border-2 border-dashed border-slate-300 rounded-xl text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors"
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
                        <p className="text-xs text-blue-600 font-medium">
                          Click para cambiar
                        </p>
                      </div>
                    ) : voucherFile ? (
                      <div className="space-y-2">
                        <Upload className="w-12 h-12 text-blue-600 mx-auto" />
                        <p className="text-sm text-slate-900 font-medium">
                          {voucherFile.name}
                        </p>
                        <p className="text-xs text-blue-600 font-medium">
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
                className="flex-1 inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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

export default TransferPaymentModal;
