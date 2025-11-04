import React, { useState, useEffect } from 'react';

import { 
  CreditCard, Calendar, CheckCircle, Clock, 
  AlertCircle, Download, Upload, FileText,
  DollarSign, TrendingUp, Award, ChevronRight
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';

interface Installment {
  id: string;
  installmentNumber: number;
  dueDate: string;
  amount: number;
  lateFee: number;
  totalDue: number;
  paidAmount: number;
  paidDate: string | null;
  status: 'pending' | 'paid' | 'late' | 'verified';
  isOverdue: boolean;
  daysLate: number;
  daysUntilDue?: number;
  notes: string | null;
  vouchers: Array<{
    id: string;
    voucherPath: string;
    voucherUrl: string;
    declaredAmount: number;
    paymentDate: string;
    paymentMethod: string;
    status: 'pending' | 'approved' | 'rejected';
    rejectionReason: string | null;
    uploadedBy: { id: string; name: string } | null;
    reviewedBy: { id: string; name: string } | null;
    reviewedAt: string | null;
  }>;
}

interface Enrollment {
  id: string;
  studentId: string;
  enrollmentFee: number;
  enrollmentDate: string;
  status: string;
  paymentProgress: number;
  totalPaid: number;
  totalPending: number;
  paymentPlan: {
    id: string;
    name: string;
    totalAmount: number;
    installmentsCount: number;
    monthlyAmount: number;
  };
  installments: Installment[];
}

const PaymentControl: React.FC = () => {
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingVoucher, setUploadingVoucher] = useState<string | null>(null);

  useEffect(() => {
    fetchEnrollment();
  }, []);

  const fetchEnrollment = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/student/enrollment');
      
      // Calcular días hasta vencimiento para cada cuota
      const enrollmentData = response.data.enrollment;
      enrollmentData.installments = enrollmentData.installments.map((inst: Installment) => {
        const today = new Date();
        const dueDate = new Date(inst.dueDate);
        const diffTime = dueDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return {
          ...inst,
          daysUntilDue: diffDays
        };
      });
      
      setEnrollment(enrollmentData);
    } catch (error: any) {
      console.error('Error fetching enrollment:', error);
      toast.error('Error al cargar información de pagos', {
        description: error.response?.data?.message || 'No se pudo obtener tu cronograma de pagos'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUploadVoucher = async (installmentId: string, file: File) => {
    try {
      setUploadingVoucher(installmentId);
      
      const formData = new FormData();
      formData.append('voucher_file', file);
      formData.append('installment_id', installmentId);
      formData.append('declared_amount', String(enrollment?.installments.find(i => i.id === installmentId)?.amount || 0));
      formData.append('payment_date', new Date().toISOString().split('T')[0]);
      formData.append('payment_method', 'transfer');
      
      await axios.post('/api/student/upload-voucher', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      toast.success('Voucher subido exitosamente', {
        description: 'Tu comprobante está siendo verificado por el cajero'
      });
      
      // Recargar datos
      await fetchEnrollment();
    } catch (error: any) {
      console.error('Error uploading voucher:', error);
      toast.error('Error al subir voucher', {
        description: error.response?.data?.message || 'No se pudo subir el comprobante'
      });
    } finally {
      setUploadingVoucher(null);
    }
  };

  const handleReplaceVoucher = async (voucherId: string, installmentId: string, file: File) => {
    try {
      setUploadingVoucher(installmentId);
      
      const formData = new FormData();
      formData.append('voucher_file', file);
      formData.append('declared_amount', String(enrollment?.installments.find(i => i.id === installmentId)?.amount || 0));
      formData.append('payment_date', new Date().toISOString().split('T')[0]);
      formData.append('payment_method', 'transfer');
      
      await axios.post(`/api/student/vouchers/${voucherId}/replace`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      toast.success('Voucher reemplazado exitosamente', {
        description: 'El nuevo comprobante está siendo verificado'
      });
      
      // Recargar datos
      await fetchEnrollment();
    } catch (error: any) {
      console.error('Error replacing voucher:', error);
      toast.error('Error al reemplazar voucher', {
        description: error.response?.data?.message || 'No se pudo reemplazar el comprobante'
      });
    } finally {
      setUploadingVoucher(null);
    }
  };

  const getStatusBadge = (installment: Installment) => {
    if (installment.status === 'verified') {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle className="w-3 h-3 mr-1" />
          Verificado
        </span>
      );
    }
    
    if (installment.status === 'paid') {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          <Clock className="w-3 h-3 mr-1" />
          En Verificación
        </span>
      );
    }
    
    if (installment.isOverdue) {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <AlertCircle className="w-3 h-3 mr-1" />
          Vencido ({installment.daysLate} días)
        </span>
      );
    }
    
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
        <Clock className="w-3 h-3 mr-1" />
        Pendiente ({installment.daysUntilDue! > 0 ? `${installment.daysUntilDue} días` : 'Hoy'})
      </span>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-PE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <AuthenticatedLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-600">Cargando información de pagos...</p>
          </div>
        </div>
      </AuthenticatedLayout>
    );
  }

  if (!enrollment) {
    return (
      <AuthenticatedLayout>
        <div className="p-8 max-w-7xl mx-auto">
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6 text-center">
            <AlertCircle className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No tienes matrícula activa</h3>
            <p className="text-slate-600">Contacta con el área de admisiones para más información.</p>
          </div>
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Control de Pagos</h1>
            <p className="text-slate-600 mt-1">Gestiona tus cuotas y comprobantes de pago</p>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-8 h-8 opacity-80" />
              <TrendingUp className="w-5 h-5 opacity-60" />
            </div>
            <p className="text-sm opacity-90 mb-1">Total a Pagar</p>
            <p className="text-2xl font-bold">{formatCurrency(enrollment.paymentPlan.totalAmount)}</p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <p className="text-sm text-slate-600 mb-1">Pagado</p>
            <p className="text-2xl font-bold text-slate-900">{formatCurrency(enrollment.totalPaid)}</p>
            <p className="text-xs text-green-600 mt-1">{enrollment.paymentProgress.toFixed(0)}% completado</p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-8 h-8 text-orange-600" />
            </div>
            <p className="text-sm text-slate-600 mb-1">Pendiente</p>
            <p className="text-2xl font-bold text-slate-900">{formatCurrency(enrollment.totalPending)}</p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <FileText className="w-8 h-8 text-violet-600" />
            </div>
            <p className="text-sm text-slate-600 mb-1">Plan de Pago</p>
            <p className="text-xl font-bold text-slate-900">{enrollment.paymentPlan.installmentsCount} cuotas</p>
            <p className="text-xs text-slate-500 mt-1">{enrollment.paymentPlan.name}</p>
          </div>
        </div>

        {/* Barra de Progreso */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-slate-900">Progreso de Pagos</h3>
            <span className="text-sm font-medium text-blue-600">{enrollment.paymentProgress.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-3">
            <div 
              className="bg-gradient-to-r from-blue-600 to-blue-700 h-3 rounded-full transition-all duration-500"
              style={{ width: `${enrollment.paymentProgress}%` }}
            ></div>
          </div>
        </div>

        {/* Cronograma de Cuotas */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-xl font-bold text-slate-900">Cronograma de Cuotas</h2>
            <p className="text-sm text-slate-600 mt-1">Administra tus pagos mensuales y sube tus comprobantes</p>
          </div>

          <div className="divide-y divide-slate-200">
            {enrollment.installments.map((installment) => (
              <div key={installment.id} className="p-6 hover:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-slate-900">
                        Cuota #{installment.installmentNumber}
                      </h3>
                      {getStatusBadge(installment)}
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-slate-500 mb-1">Fecha de Vencimiento</p>
                        <p className="font-medium text-slate-900 flex items-center">
                          <Calendar className="w-4 h-4 mr-1 text-blue-600" />
                          {formatDate(installment.dueDate)}
                        </p>
                        {installment.daysUntilDue !== undefined && installment.status === 'pending' && (
                          <p className={`text-xs mt-1 ${installment.daysUntilDue < 7 ? 'text-red-600' : 'text-slate-500'}`}>
                            {installment.daysUntilDue > 0 
                              ? `Faltan ${installment.daysUntilDue} días` 
                              : installment.daysUntilDue === 0 
                              ? '¡Vence hoy!' 
                              : `Vencido hace ${Math.abs(installment.daysUntilDue)} días`}
                          </p>
                        )}
                      </div>

                      <div>
                        <p className="text-slate-500 mb-1">Monto</p>
                        <p className="font-bold text-slate-900">{formatCurrency(installment.amount)}</p>
                        {installment.lateFee > 0 && (
                          <p className="text-xs text-red-600 mt-1">
                            + {formatCurrency(installment.lateFee)} mora
                          </p>
                        )}
                      </div>

                      <div>
                        <p className="text-slate-500 mb-1">Total a Pagar</p>
                        <p className="font-bold text-blue-600">{formatCurrency(installment.totalDue)}</p>
                      </div>

                      {installment.paidDate && (
                        <div>
                          <p className="text-slate-500 mb-1">Fecha de Pago</p>
                          <p className="font-medium text-green-600">{formatDate(installment.paidDate)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Vouchers */}
                {installment.vouchers.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-sm font-medium text-slate-700">Comprobantes Subidos:</p>
                    {installment.vouchers.map((voucher) => (
                      <div key={voucher.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="flex items-center space-x-3">
                          <FileText className="w-5 h-5 text-slate-400" />
                          <div>
                            <p className="text-sm font-medium text-slate-900">
                              {formatCurrency(voucher.declaredAmount)}
                            </p>
                            <p className="text-xs text-slate-500">
                              {formatDate(voucher.paymentDate)} · {voucher.paymentMethod}
                            </p>
                            {voucher.status === 'rejected' && voucher.rejectionReason && (
                              <p className="text-xs text-red-600 mt-1 italic">
                                Motivo: {voucher.rejectionReason}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {voucher.status === 'approved' && (
                            <span className="text-xs px-3 py-1 bg-green-100 text-green-800 rounded-full font-medium">
                              ✓ Aprobado
                            </span>
                          )}
                          {voucher.status === 'pending' && (
                            <>
                              <span className="text-xs px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full font-medium animate-pulse">
                                ⏳ En revisión
                              </span>
                              {/* Botón para reemplazar voucher pendiente */}
                              <label className="cursor-pointer">
                                <input
                                  type="file"
                                  accept="image/*,.pdf"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      handleReplaceVoucher(voucher.id, installment.id, file);
                                    }
                                  }}
                                  disabled={uploadingVoucher === installment.id}
                                  className="hidden"
                                />
                                <div className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors flex items-center space-x-1">
                                  <Upload className="w-3 h-3" />
                                  <span>Reemplazar</span>
                                </div>
                              </label>
                            </>
                          )}
                          {voucher.status === 'rejected' && (
                            <span className="text-xs px-3 py-1 bg-red-100 text-red-800 rounded-full font-medium">
                              ✗ Rechazado
                            </span>
                          )}
                          <a
                            href={voucher.voucherUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 hover:bg-white rounded-lg transition-colors"
                            title="Descargar voucher"
                          >
                            <Download className="w-4 h-4 text-blue-600" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload Voucher - Solo si no hay vouchers o todos están rechazados */}
                {installment.status === 'pending' && (!installment.vouchers.length || installment.vouchers.every(v => v.status === 'rejected')) && (
                  <div className="mt-4">
                    {installment.vouchers.some(v => v.status === 'rejected') && (
                      <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-800 font-medium flex items-center">
                          <AlertCircle className="w-4 h-4 mr-2" />
                          Tu voucher anterior fue rechazado. Por favor, sube un nuevo comprobante válido.
                        </p>
                      </div>
                    )}
                    <label className="block">
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleUploadVoucher(installment.id, file);
                          }
                        }}
                        disabled={uploadingVoucher === installment.id}
                        className="hidden"
                      />
                      <div className="flex items-center justify-center px-4 py-3 border-2 border-dashed border-slate-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-all">
                        {uploadingVoucher === installment.id ? (
                          <div className="flex items-center space-x-2 text-blue-600">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                            <span className="text-sm font-medium">Subiendo...</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2 text-slate-600">
                            <Upload className="w-5 h-5" />
                            <span className="text-sm font-medium">
                              {installment.vouchers.some(v => v.status === 'rejected') 
                                ? 'Subir Nuevo Comprobante' 
                                : 'Subir Comprobante de Pago'}
                            </span>
                          </div>
                        )}
                      </div>
                    </label>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
};

export default PaymentControl;
