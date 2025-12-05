import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  X, 
  Save,
  CreditCard,
  Building2
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select2 } from '@/components/ui/Select2';
import { FileUpload } from '@/components/ui/FileUpload';
import { Textarea } from './ui/textarea';

interface YapeMethod {
  id: number;
  name: string;
  description: string | null;
  phone_number: string;
  qr_image_url: string | null;
  is_active: boolean;
  display_order: number;
}

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
  is_active: boolean;
  display_order: number;
}

const PaymentMethodsConfig: React.FC = () => {
  const [yapes, setYapes] = useState<YapeMethod[]>([]);
  const [transfers, setTransfers] = useState<TransferMethod[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estados para modales
  const [showYapeModal, setShowYapeModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [editingYape, setEditingYape] = useState<YapeMethod | null>(null);
  const [editingTransfer, setEditingTransfer] = useState<TransferMethod | null>(null);

  // Estados para formulario Yape
  const [yapeName, setYapeName] = useState('');
  const [yapeDescription, setYapeDescription] = useState('');
  const [yapePhone, setYapePhone] = useState('');
  const [yapeQrImage, setYapeQrImage] = useState<File | null>(null);
  const [yapeQrPreview, setYapeQrPreview] = useState<string | null>(null);
  const [yapeActive, setYapeActive] = useState(true);
  const [yapeOrder, setYapeOrder] = useState(0);

  // Estados para formulario Transferencia
  const [transferName, setTransferName] = useState('');
  const [transferDescription, setTransferDescription] = useState('');
  const [transferBankName, setTransferBankName] = useState('');
  const [transferBankLogo, setTransferBankLogo] = useState<File | null>(null);
  const [transferBankLogoPreview, setTransferBankLogoPreview] = useState<string | null>(null);
  const [transferAccountHolder, setTransferAccountHolder] = useState('');
  const [transferAccountNumber, setTransferAccountNumber] = useState('');
  const [transferCci, setTransferCci] = useState('');
  const [transferAccountType, setTransferAccountType] = useState<'ahorros' | 'corriente'>('ahorros');
  const [transferActive, setTransferActive] = useState(true);
  const [transferOrder, setTransferOrder] = useState(0);

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  const fetchPaymentMethods = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/admin/payment-methods');
      setYapes(response.data.yapes || []);
      setTransfers(response.data.transfers || []);
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      toast.error('Error al cargar métodos de pago');
    } finally {
      setLoading(false);
    }
  };

  const resetYapeForm = () => {
    setYapeName('');
    setYapeDescription('');
    setYapePhone('');
    setYapeQrImage(null);
    setYapeQrPreview(null);
    setYapeActive(true);
    setYapeOrder(0);
    setEditingYape(null);
  };

  const resetTransferForm = () => {
    setTransferName('');
    setTransferDescription('');
    setTransferBankName('');
    setTransferBankLogo(null);
    setTransferBankLogoPreview(null);
    setTransferAccountHolder('');
    setTransferAccountNumber('');
    setTransferCci('');
    setTransferAccountType('ahorros');
    setTransferActive(true);
    setTransferOrder(0);
    setEditingTransfer(null);
  };

  const openYapeModal = (yape?: YapeMethod) => {
    if (yape) {
      setEditingYape(yape);
      setYapeName(yape.name);
      setYapeDescription(yape.description || '');
      setYapePhone(yape.phone_number);
      setYapeQrPreview(yape.qr_image_url);
      setYapeActive(yape.is_active);
      setYapeOrder(yape.display_order);
    } else {
      resetYapeForm();
    }
    setShowYapeModal(true);
  };

  const openTransferModal = (transfer?: TransferMethod) => {
    if (transfer) {
      setEditingTransfer(transfer);
      setTransferName(transfer.name);
      setTransferDescription(transfer.description || '');
      setTransferBankName(transfer.bank_name);
      setTransferBankLogoPreview(transfer.bank_logo_url);
      setTransferAccountHolder(transfer.account_holder);
      setTransferAccountNumber(transfer.account_number);
      setTransferCci(transfer.cci);
      setTransferAccountType(transfer.account_type);
      setTransferActive(transfer.is_active);
      setTransferOrder(transfer.display_order);
    } else {
      resetTransferForm();
    }
    setShowTransferModal(true);
  };

  const handleYapeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!yapeName || !yapePhone) {
      toast.error('Por favor completa los campos requeridos');
      return;
    }

    if (!editingYape && !yapeQrImage) {
      toast.error('Por favor sube una imagen del QR de Yape');
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append('name', yapeName);
      formData.append('description', yapeDescription);
      formData.append('phone_number', yapePhone);
      if (yapeQrImage) {
        formData.append('qr_image', yapeQrImage);
      }
      formData.append('is_active', yapeActive ? '1' : '0');
      formData.append('display_order', yapeOrder.toString());

      if (editingYape) {
        await axios.post(`/api/admin/payment-methods/yape/${editingYape.id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success('Método Yape actualizado exitosamente');
      } else {
        await axios.post('/api/admin/payment-methods/yape', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success('Método Yape creado exitosamente');
      }

      setShowYapeModal(false);
      resetYapeForm();
      await fetchPaymentMethods();
    } catch (error: unknown) {
      console.error('Error submitting yape:', error);
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Error al guardar método Yape');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!transferName || !transferBankName || !transferAccountHolder || !transferAccountNumber || !transferCci) {
      toast.error('Por favor completa los campos requeridos');
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append('name', transferName);
      formData.append('description', transferDescription);
      formData.append('bank_name', transferBankName);
      if (transferBankLogo) {
        formData.append('bank_logo', transferBankLogo);
      }
      formData.append('account_holder', transferAccountHolder);
      formData.append('account_number', transferAccountNumber);
      formData.append('cci', transferCci);
      formData.append('account_type', transferAccountType);
      formData.append('is_active', transferActive ? '1' : '0');
      formData.append('display_order', transferOrder.toString());

      if (editingTransfer) {
        await axios.post(`/api/admin/payment-methods/transfer/${editingTransfer.id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success('Método de Transferencia actualizado exitosamente');
      } else {
        await axios.post('/api/admin/payment-methods/transfer', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success('Método de Transferencia creado exitosamente');
      }

      setShowTransferModal(false);
      resetTransferForm();
      await fetchPaymentMethods();
    } catch (error: unknown) {
      console.error('Error submitting transfer:', error);
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Error al guardar método de Transferencia');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number, _type: 'yape' | 'transfer') => {
    if (!confirm('¿Estás seguro de eliminar este método de pago?')) {
      return;
    }

    try {
      await axios.delete(`/api/admin/payment-methods/${id}`);
      toast.success('Método de pago eliminado');
      await fetchPaymentMethods();
    } catch (error) {
      console.error('Error deleting payment method:', error);
      toast.error('Error al eliminar método de pago');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#17BC91]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Sección Yape */}
      <div className="space-y-6">
        {/* Header Yape con gradiente */}
        <div className="bg-gradient-to-r from-purple-600 via-pink-500 to-purple-600 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-white/20 backdrop-blur-sm p-4 rounded-xl">
                <CreditCard className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white mb-1">Yape</h3>
                <p className="text-purple-100">Configura las cuentas Yape para pagos móviles</p>
              </div>
            </div>
            <button
              onClick={() => openYapeModal()}
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-purple-600 font-bold rounded-xl hover:bg-purple-50 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <Plus className="w-5 h-5" />
              Agregar Yape
            </button>
          </div>
        </div>

        {/* Cards Yape */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {yapes.length === 0 ? (
            <div className="col-span-full">
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-dashed border-purple-200 rounded-2xl p-12 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
                  <CreditCard className="w-8 h-8 text-purple-600" />
                </div>
                <p className="text-lg font-medium text-purple-900 mb-2">No hay métodos Yape configurados</p>
                <p className="text-sm text-purple-600">Agrega tu primera cuenta Yape para comenzar</p>
              </div>
            </div>
          ) : (
            yapes.map((yape) => (
              <div 
                key={yape.id} 
                className={`group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden transform hover:-translate-y-1 ${
                  yape.is_active ? 'ring-2 ring-purple-400 ring-offset-2' : 'opacity-60'
                }`}
              >
                {/* Gradiente de fondo decorativo */}
                <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-pink-50 to-white opacity-50"></div>
                
                {/* Contenido */}
                <div className="relative p-6 space-y-4">
                  {/* Header del card */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="inline-flex items-center gap-2 mb-2">
                        <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
                          <CreditCard className="w-5 h-5 text-white" />
                        </div>
                        <h4 className="text-xl font-bold text-slate-900">{yape.name}</h4>
                      </div>
                      {yape.description && (
                        <p className="text-sm text-slate-600 leading-relaxed">{yape.description}</p>
                      )}
                    </div>
                    <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                      yape.is_active 
                        ? 'bg-gradient-to-r from-green-400 to-emerald-500 text-white shadow-md' 
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                      {yape.is_active ? '● Activo' : '○ Inactivo'}
                    </span>
                  </div>

                  {/* QR Code destacado */}
                  {yape.qr_image_url && (
                    <div className="flex justify-center py-4">
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-400 rounded-2xl blur-xl opacity-30"></div>
                        <img 
                          src={yape.qr_image_url} 
                          alt="QR Code" 
                          className="relative w-40 h-40 object-contain bg-white p-3 rounded-2xl shadow-xl border-4 border-white"
                        />
                      </div>
                    </div>
                  )}

                  {/* Info del teléfono */}
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-100">
                    <p className="text-xs font-semibold text-purple-600 mb-1">NÚMERO DE TELÉFONO</p>
                    <p className="text-lg font-bold text-purple-900">{yape.phone_number}</p>
                  </div>

                  {/* Botones de acción */}
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => openYapeModal(yape)}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all shadow-md hover:shadow-lg"
                    >
                      <Edit2 className="w-4 h-4" />
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(yape.id, 'yape')}
                      className="px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-xl hover:from-red-600 hover:to-red-700 transition-all shadow-md hover:shadow-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Separador visual */}
      <div className="relative py-8">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t-2 border-gray-200"></div>
        </div>
        <div className="relative flex justify-center">
          <span className="bg-white px-6 py-2 text-sm font-semibold text-gray-500 rounded-full border-2 border-gray-200">
            Métodos de Pago Bancarios
          </span>
        </div>
      </div>

      {/* Sección Transferencias */}
      <div className="space-y-6">
        {/* Header Transferencias con gradiente */}
        <div className="bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-white/20 backdrop-blur-sm p-4 rounded-xl">
                <Building2 className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white mb-1">Transferencias Bancarias</h3>
                <p className="text-blue-100">Configura cuentas bancarias para recibir transferencias</p>
              </div>
            </div>
            <button
              onClick={() => openTransferModal()}
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-blue-600 font-bold rounded-xl hover:bg-blue-50 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <Plus className="w-5 h-5" />
              Agregar Cuenta
            </button>
          </div>
        </div>

        {/* Cards Transferencias */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {transfers.length === 0 ? (
            <div className="col-span-full">
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-dashed border-blue-200 rounded-2xl p-12 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                  <Building2 className="w-8 h-8 text-blue-600" />
                </div>
                <p className="text-lg font-medium text-blue-900 mb-2">No hay cuentas bancarias configuradas</p>
                <p className="text-sm text-blue-600">Agrega tu primera cuenta para recibir transferencias</p>
              </div>
            </div>
          ) : (
            transfers.map((transfer) => (
              <div 
                key={transfer.id} 
                className={`group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden transform hover:-translate-y-1 ${
                  transfer.is_active ? 'ring-2 ring-blue-400 ring-offset-2' : 'opacity-60'
                }`}
              >
                {/* Gradiente de fondo decorativo */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-cyan-50 to-white opacity-50"></div>
                
                {/* Contenido */}
                <div className="relative p-6 space-y-4">
                  {/* Header del card con logo */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      {transfer.bank_logo_url ? (
                        <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 mb-3 inline-block">
                          <img 
                            src={transfer.bank_logo_url} 
                            alt={transfer.bank_name}
                            className="h-10 object-contain"
                          />
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-2 mb-3">
                          <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg">
                            <Building2 className="w-5 h-5 text-white" />
                          </div>
                        </div>
                      )}
                      <h4 className="text-xl font-bold text-slate-900">{transfer.name}</h4>
                      {transfer.description && (
                        <p className="text-sm text-slate-600 mt-1 leading-relaxed">{transfer.description}</p>
                      )}
                    </div>
                    <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                      transfer.is_active 
                        ? 'bg-gradient-to-r from-green-400 to-emerald-500 text-white shadow-md' 
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                      {transfer.is_active ? '● Activo' : '○ Inactivo'}
                    </span>
                  </div>

                  {/* Información bancaria */}
                  <div className="space-y-3">
                    <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-3 border border-blue-100">
                      <p className="text-xs font-semibold text-blue-600 mb-1">BANCO</p>
                      <p className="text-base font-bold text-blue-900">{transfer.bank_name}</p>
                    </div>
                    
                    <div className="bg-gradient-to-r from-slate-50 to-gray-50 rounded-xl p-3 border border-gray-100">
                      <p className="text-xs font-semibold text-slate-600 mb-1">TITULAR</p>
                      <p className="text-base font-bold text-slate-900">{transfer.account_holder}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white rounded-xl p-3 border-2 border-blue-100">
                        <p className="text-xs font-semibold text-blue-600 mb-1">CUENTA</p>
                        <p className="text-sm font-mono font-bold text-slate-900">{transfer.account_number}</p>
                      </div>
                      <div className="bg-white rounded-xl p-3 border-2 border-cyan-100">
                        <p className="text-xs font-semibold text-cyan-600 mb-1">TIPO</p>
                        <p className="text-sm font-bold text-slate-900 capitalize">{transfer.account_type}</p>
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl p-3 border border-indigo-100">
                      <p className="text-xs font-semibold text-indigo-600 mb-1">CCI (INTERBANCARIO)</p>
                      <p className="text-sm font-mono font-bold text-indigo-900">{transfer.cci}</p>
                    </div>
                  </div>

                  {/* Botones de acción */}
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => openTransferModal(transfer)}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all shadow-md hover:shadow-lg"
                    >
                      <Edit2 className="w-4 h-4" />
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(transfer.id, 'transfer')}
                      className="px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-xl hover:from-red-600 hover:to-red-700 transition-all shadow-md hover:shadow-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal Yape */}
      {showYapeModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 via-pink-500 to-purple-600 text-white px-8 py-6 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold">{editingYape ? 'Editar' : 'Agregar'} Método Yape</h3>
                <p className="text-purple-100 text-sm mt-1">Configura los detalles del método de pago Yape</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowYapeModal(false);
                  resetYapeForm();
                }}
                className="text-white/80 hover:text-white hover:bg-white/10 rounded-lg p-2 transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Form Content */}
            <form onSubmit={handleYapeSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-8 space-y-6 overflow-y-auto flex-1">
                {/* Información básica */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 pb-3 border-b-2 border-purple-200">
                    <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold">
                      1
                    </div>
                    <h4 className="text-lg font-semibold text-gray-900">Información Básica</h4>
                  </div>

                  <Input
                    label="Nombre del Método"
                    value={yapeName}
                    onChange={(e) => setYapeName(e.target.value)}
                    placeholder="Ej: Yape Principal, Yape Secundario"
                    required
                    helperText="Nombre identificativo para este método de pago"
                  />

                  <div>
                   
                    <Textarea
                      value={yapeDescription}
                      onChange={(e) => setYapeDescription(e.target.value)}
                      label="Descripción adicional (opcional)..."
                      rows={3}
                   
                   
                   
                    
                   
                   />
                  </div>

                  <Input
                    label="Número de Teléfono"
                    value={yapePhone}
                    onChange={(e) => setYapePhone(e.target.value)}
                    placeholder="987654321"
                    required
                    helperText="Número de celular asociado a la cuenta Yape"
                  />
                </div>

                {/* Código QR */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 pb-3 border-b-2 border-pink-200">
                    <div className="w-8 h-8 bg-pink-500 text-white rounded-full flex items-center justify-center font-bold">
                      2
                    </div>
                    <h4 className="text-lg font-semibold text-gray-900">Código QR</h4>
                  </div>

                  <FileUpload
                    label="Imagen del Código QR"
                    accept="image/*"
                    maxSize={2}
                    value={yapeQrImage}
                    preview={yapeQrPreview}
                    onChange={(file) => setYapeQrImage(file)}
                    onPreviewChange={(preview) => setYapeQrPreview(preview)}
                    required={!editingYape}
                    helperText="Sube la imagen del código QR de Yape. Los estudiantes escanearán este código para realizar el pago."
                  />
                </div>

                {/* Configuración */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 pb-3 border-b-2 border-purple-200">
                    <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold">
                      3
                    </div>
                    <h4 className="text-lg font-semibold text-gray-900">Configuración</h4>
                  </div>

                  <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-xl border border-purple-200">
                    <input
                      type="checkbox"
                      id="yape-active"
                      checked={yapeActive}
                      onChange={(e) => setYapeActive(e.target.checked)}
                      className="w-5 h-5 mt-0.5 text-purple-600 focus:ring-purple-500 border-gray-300 rounded cursor-pointer"
                    />
                    <label htmlFor="yape-active" className="flex-1 cursor-pointer">
                      <span className="block text-sm font-semibold text-gray-900">Método activo</span>
                      <span className="block text-sm text-gray-600 mt-1">
                        Si está activado, los estudiantes podrán ver y usar este método de pago
                      </span>
                    </label>
                  </div>

                  <Input
                    label="Orden de Visualización"
                    type="number"
                    value={yapeOrder.toString()}
                    onChange={(e) => setYapeOrder(parseInt(e.target.value) || 0)}
                    min="0"
                    helperText="Los métodos se mostrarán ordenados de menor a mayor"
                  />
                </div>
              </div>

              {/* Footer con botones */}
              <div className="px-8 py-6 bg-gray-50 border-t border-gray-200 flex gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowYapeModal(false);
                    resetYapeForm();
                  }}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-500 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-pink-600 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      {editingYape ? 'Actualizar' : 'Guardar'} Método
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Transferencia */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 text-white px-8 py-6 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold">{editingTransfer ? 'Editar' : 'Agregar'} Cuenta Bancaria</h3>
                <p className="text-blue-100 text-sm mt-1">Configura los detalles para transferencias bancarias</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowTransferModal(false);
                  resetTransferForm();
                }}
                className="text-white/80 hover:text-white hover:bg-white/10 rounded-lg p-2 transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Form Content */}
            <form onSubmit={handleTransferSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-8 space-y-6 overflow-y-auto flex-1">
                {/* Información básica */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 pb-3 border-b-2 border-blue-200">
                    <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                      1
                    </div>
                    <h4 className="text-lg font-semibold text-gray-900">Información Básica</h4>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input
                      label="Nombre del Método"
                      value={transferName}
                      onChange={(e) => setTransferName(e.target.value)}
                      placeholder="Ej: BCP - Juan Pérez"
                      required
                      helperText="Nombre identificativo para esta cuenta"
                    />

                    <Input
                      label="Nombre del Banco"
                      value={transferBankName}
                      onChange={(e) => setTransferBankName(e.target.value)}
                      placeholder="Ej: BCP, Interbank, BBVA"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Descripción
                    </label>
                    <textarea
                      value={transferDescription}
                      onChange={(e) => setTransferDescription(e.target.value)}
                      placeholder="Descripción adicional (opcional)..."
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                    />
                  </div>

                  <FileUpload
                    label="Logo del Banco"
                    accept="image/*,.svg"
                    maxSize={1}
                    value={transferBankLogo}
                    preview={transferBankLogoPreview}
                    onChange={(file) => setTransferBankLogo(file)}
                    onPreviewChange={(preview) => setTransferBankLogoPreview(preview)}
                    helperText="Logo o imagen representativa del banco (opcional)"
                  />
                </div>

                {/* Datos de la cuenta */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 pb-3 border-b-2 border-cyan-200">
                    <div className="w-8 h-8 bg-cyan-500 text-white rounded-full flex items-center justify-center font-bold">
                      2
                    </div>
                    <h4 className="text-lg font-semibold text-gray-900">Datos de la Cuenta</h4>
                  </div>

                  <Input
                    label="Titular de la Cuenta"
                    value={transferAccountHolder}
                    onChange={(e) => setTransferAccountHolder(e.target.value)}
                    placeholder="Nombre completo del titular"
                    required
                    helperText="Nombre exacto como aparece en el banco"
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Select2
                      label="Tipo de Cuenta"
                      value={transferAccountType}
                      onChange={(value) => setTransferAccountType(value as 'ahorros' | 'corriente')}
                      options={[
                        { value: 'ahorros', label: 'Ahorros' },
                        { value: 'corriente', label: 'Corriente' }
                      ]}
                      isSearchable={false}
                      isClearable={false}
                      required
                    />

                    <Input
                      label="Número de Cuenta"
                      value={transferAccountNumber}
                      onChange={(e) => setTransferAccountNumber(e.target.value)}
                      placeholder="0000-0000-0000000000"
                      required
                    />
                  </div>

                  <Input
                    label="CCI (Código de Cuenta Interbancario)"
                    value={transferCci}
                    onChange={(e) => setTransferCci(e.target.value)}
                    placeholder="00200000000000000000"
                    required
                    helperText="Código de 20 dígitos para transferencias interbancarias"
                  />
                </div>

                {/* Configuración */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 pb-3 border-b-2 border-blue-200">
                    <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                      3
                    </div>
                    <h4 className="text-lg font-semibold text-gray-900">Configuración</h4>
                  </div>

                  <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-xl border border-blue-200">
                    <input
                      type="checkbox"
                      id="transfer-active"
                      checked={transferActive}
                      onChange={(e) => setTransferActive(e.target.checked)}
                      className="w-5 h-5 mt-0.5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                    />
                    <label htmlFor="transfer-active" className="flex-1 cursor-pointer">
                      <span className="block text-sm font-semibold text-gray-900">Método activo</span>
                      <span className="block text-sm text-gray-600 mt-1">
                        Si está activado, los estudiantes podrán ver y usar esta cuenta bancaria
                      </span>
                    </label>
                  </div>

                  <Input
                    label="Orden de Visualización"
                    type="number"
                    value={transferOrder.toString()}
                    onChange={(e) => setTransferOrder(parseInt(e.target.value) || 0)}
                    min="0"
                    helperText="Las cuentas se mostrarán ordenadas de menor a mayor"
                  />
                </div>
              </div>

              {/* Footer con botones */}
              <div className="px-8 py-6 bg-gray-50 border-t border-gray-200 flex gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowTransferModal(false);
                    resetTransferForm();
                  }}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-cyan-600 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      {editingTransfer ? 'Actualizar' : 'Guardar'} Cuenta
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentMethodsConfig;
