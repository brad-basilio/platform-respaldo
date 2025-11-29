import React, { useState, useEffect } from 'react';

import { 
  Calendar, CheckCircle, Clock, 
  AlertCircle, Download, Upload, FileText,
  DollarSign, TrendingUp,
  RefreshCcw, X, ArrowRight
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { Input } from '@/components/ui/input';

interface Installment {
  id: string;
  installmentNumber: number;
  dueDate: string;
  amount: number;
  lateFee: number;
  totalDue: number;
  paidAmount: number;
  remainingAmount?: number;
  paymentType?: 'full' | 'partial' | 'combined';
  paidDate: string | null;
  status: 'pending' | 'paid' | 'late' | 'verified';
  isOverdue: boolean;
  daysLate: number;
  daysUntilDue?: number;
  daysUntilGraceLimit?: number; // ✅ Días hasta que venza el período de gracia
  gracePeriodDays?: number; // ✅ Días de gracia del plan
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
    gracePeriodDays: number; // ✅ Días de gracia antes de aplicar mora
  };
  installments: Installment[];
}

interface PaymentPlan {
  id: string;
  name: string;
  totalAmount: number;
  installmentsCount: number;
  monthlyAmount: number;
}

const PaymentControl: React.FC = () => {
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingVoucher, setUploadingVoucher] = useState<string | null>(null);
  
  // Estados para cambio de plan
  const [showPlanChangeModal, setShowPlanChangeModal] = useState(false);
  const [availablePlans, setAvailablePlans] = useState<PaymentPlan[]>([]);
  const [canChangePlan, setCanChangePlan] = useState(false);
  const [planChangeReason, setPlanChangeReason] = useState('');
  const [selectedNewPlan, setSelectedNewPlan] = useState<string | null>(null);
  const [changingPlan, setChangingPlan] = useState(false);
  
  // Estados para pago parcial
  const [showPartialPaymentModal, setShowPartialPaymentModal] = useState(false);
  const [partialAmount, setPartialAmount] = useState('');
  const [uploadingPartialPayment, setUploadingPartialPayment] = useState(false);

  useEffect(() => {
    fetchEnrollment();
    checkCanChangePlan();
  }, []);

  const fetchEnrollment = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/student/enrollment');
      
      // Calcular días hasta vencimiento para cada cuota
      const enrollmentData = response.data.enrollment;
      const gracePeriodDays = enrollmentData.paymentPlan.gracePeriodDays || 0;
      
      enrollmentData.installments = enrollmentData.installments.map((inst: Installment) => {
        // ✅ FIX: Crear fecha actual en zona horaria local (Perú)
        const today = new Date();
        const localToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        
        console.log('🕐 Fecha del sistema:', today.toString());
        console.log('🕐 Fecha local procesada:', localToday.toString());
        console.log('🕐 Fecha ISO:', today.toISOString());
        
        // ✅ Parsear fecha de vencimiento correctamente (viene como YYYY-MM-DD)
        const [year, month, day] = inst.dueDate.split('-').map(Number);
        const dueDate = new Date(year, month - 1, day); // mes es 0-indexed
        
        // Calcular días hasta vencimiento (positivo = faltan días, negativo = ya pasó)
        const diffTime = dueDate.getTime() - localToday.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
        
        // Calcular fecha límite con días de gracia
        const graceLimitDate = new Date(dueDate);
        graceLimitDate.setDate(graceLimitDate.getDate() + gracePeriodDays);
        
        const daysUntilGraceLimit = Math.round((graceLimitDate.getTime() - localToday.getTime()) / (1000 * 60 * 60 * 24));
        
        console.log('📅 Cuota #' + inst.installmentNumber + ':', {
          hoyLocal: localToday.toISOString().split('T')[0],
          fechaVencimiento: inst.dueDate,
          diffDays,
          gracePeriodDays,
          daysUntilGraceLimit
        });
        
        return {
          ...inst,
          daysUntilDue: diffDays,
          daysUntilGraceLimit: daysUntilGraceLimit,
          gracePeriodDays: gracePeriodDays
        };
      });
      
      setEnrollment(enrollmentData);
    } catch (error: unknown) {
      console.error('Error fetching enrollment:', error);
      const err = error as { response?: { data?: { message?: string } } };
      toast.error('Error al cargar información de pagos', {
        description: err.response?.data?.message || 'No se pudo obtener tu cronograma de pagos'
      });
    } finally {
      setLoading(false);
    }
  };

  const checkCanChangePlan = async () => {
    try {
      const response = await axios.get('/api/student/can-change-plan');
      setCanChangePlan(response.data.can_change);
      
      if (response.data.can_change) {
        // Obtener planes disponibles
        const plansResponse = await axios.get('/api/student/available-plans');
        setAvailablePlans(plansResponse.data.plans);
      }
    } catch (error) {
      console.error('Error checking plan change eligibility:', error);
    }
  };

  const handleChangePlan = async () => {
    if (!selectedNewPlan) {
      toast.error('Debes seleccionar un plan');
      return;
    }

    try {
      setChangingPlan(true);
      await axios.post('/api/student/change-plan', {
        new_plan_id: selectedNewPlan,
        reason: planChangeReason || 'Cambio solicitado por el estudiante',
      });

      toast.success('Plan de pago cambiado exitosamente', {
        description: 'Tu cronograma de pagos ha sido actualizado'
      });

      setShowPlanChangeModal(false);
      await fetchEnrollment();
      await checkCanChangePlan();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error('Error al cambiar plan de pago', {
        description: err.response?.data?.message || 'No se pudo cambiar el plan'
      });
    } finally {
      setChangingPlan(false);
    }
  };

  const handleUploadPartialPayment = async (file: File) => {
    if (!partialAmount || parseFloat(partialAmount) <= 0) {
      toast.error('Ingresa un monto válido');
      return;
    }

    // Validar que el monto no sea mayor al pendiente
    const amount = parseFloat(partialAmount);
    if (amount > (enrollment?.totalPending || 0)) {
      toast.error('Monto inválido', {
        description: `El monto no puede ser mayor a tu deuda pendiente (${formatCurrency(enrollment?.totalPending || 0)})`
      });
      return;
    }

    try {
      setUploadingPartialPayment(true);
      
      const formData = new FormData();
      formData.append('voucher_file', file);
      formData.append('declared_amount', partialAmount);
      formData.append('payment_date', new Date().toISOString().split('T')[0]);
      formData.append('payment_method', 'transfer');
      // Enviar bandera como '1' para que Laravel la considere boolean
      formData.append('is_partial_payment', '1');

      // Debug: log keys (no mostrar contenido binario)
      for (const key of Array.from(formData.keys())) {
        console.log('formData key:', key, formData.get(key));
      }

      const response = await axios.post('/api/student/upload-voucher', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      toast.success('Pago parcial procesado exitosamente', {
        description: `S/ ${response.data.amount_distributed} distribuido a ${response.data.affected_installments} cuota(s)`
      });
      
      setShowPartialPaymentModal(false);
      setPartialAmount('');
      await fetchEnrollment();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error('Error al procesar pago parcial', {
        description: err.response?.data?.message || 'No se pudo procesar el pago'
      });
    } finally {
      setUploadingPartialPayment(false);
    }
  };

  const handleUploadVoucher = async (installmentId: string, file: File) => {
    try {
      setUploadingVoucher(installmentId);
      
      const formData = new FormData();
      formData.append('voucher_file', file);
      formData.append('installment_id', installmentId);
      // Enviar el monto total a pagar (incluye mora) para la cuota
      formData.append('declared_amount', String(enrollment?.installments.find(i => i.id === installmentId)?.totalDue || enrollment?.installments.find(i => i.id === installmentId)?.amount || 0));
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
    } catch (error: unknown) {
        console.error('Error uploading voucher:', error);
        const err = error as { response?: { data?: unknown } };
        console.error('Server response:', err.response?.data);
        type ServerResponse = { message?: string } | string | null | undefined;
        const dataObj = err.response?.data as ServerResponse;
        const serverMsg = dataObj && typeof dataObj === 'object' && 'message' in dataObj
          ? (dataObj as { message?: string }).message
          : String(dataObj ?? '');
        toast.error('Error al subir voucher', {
          description: serverMsg || 'No se pudo subir el comprobante'
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
      // Al reemplazar, enviar también el monto total a pagar (incluye mora cuando corresponda)
      formData.append('declared_amount', String(enrollment?.installments.find(i => i.id === installmentId)?.totalDue || enrollment?.installments.find(i => i.id === installmentId)?.amount || 0));
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
    } catch (error: unknown) {
        console.error('Error replacing voucher:', error);
        const err = error as { response?: { data?: unknown } };
        console.error('Server response:', err.response?.data);
        type ServerResponse2 = { message?: string } | string | null | undefined;
        const dataObj2 = err.response?.data as ServerResponse2;
        const serverMsg2 = dataObj2 && typeof dataObj2 === 'object' && 'message' in dataObj2
          ? (dataObj2 as { message?: string }).message
          : String(dataObj2 ?? '');
        toast.error('Error al reemplazar voucher', {
          description: serverMsg2 || 'No se pudo reemplazar el comprobante'
        });
    } finally {
      setUploadingVoucher(null);
    }
  };

  const getStatusBadge = (installment: Installment) => {
    if (installment.status === 'verified') {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#17BC91]/10 text-[#17BC91] border border-[#17BC91]/30">
          <CheckCircle className="w-3 h-3 mr-1" />
          Verificado
        </span>
      );
    }
    
    if (installment.status === 'paid') {
      // Verificar si es pago parcial
      if (installment.paymentType === 'partial' || installment.paymentType === 'combined') {
        const paid = installment.paidAmount || 0;
        
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-300">
            <Clock className="w-3 h-3 mr-1" />
            Pago Parcial: {formatCurrency(paid)} de {formatCurrency(installment.totalDue)}
          </span>
        );
      }
      
      // Pago completo en verificación
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#073372]/10 text-[#073372] border border-[#073372]/30">
          <Clock className="w-3 h-3 mr-1" />
          En Verificación
        </span>
      );
    }
    
    // ✅ Verificar si está en período de gracia (vencido pero aún dentro del período de gracia)
    const daysUntilDue = installment.daysUntilDue || 0;
    const daysUntilGraceLimit = installment.daysUntilGraceLimit || 0;
    const gracePeriodDays = installment.gracePeriodDays || 0;
    
    // Si ya pasó la fecha de vencimiento pero aún está dentro del período de gracia
    if (daysUntilDue < 0 && daysUntilGraceLimit >= 0 && gracePeriodDays > 0) {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 border border-orange-300">
          <AlertCircle className="w-3 h-3 mr-1" />
          Período de Gracia ({daysUntilGraceLimit} días restantes)
        </span>
      );
    }
    
    // Si ya pasó el período de gracia, mostrar como vencido con mora
    if (installment.isOverdue || (daysUntilGraceLimit < 0 && installment.status === 'pending')) {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-300">
          <AlertCircle className="w-3 h-3 mr-1" />
          Vencido con Mora ({Math.abs(daysUntilGraceLimit)} días)
        </span>
      );
    }
    
    // Pendiente normal
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#F98613]/10 text-[#F98613] border border-[#F98613]/30">
        <Clock className="w-3 h-3 mr-1" />
        Pendiente ({daysUntilDue > 0 ? `${daysUntilDue} días` : 'Vence hoy'})
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
          
          {/* Botones de acción */}
          <div className="flex gap-3">
            {canChangePlan && (
              <button
                onClick={() => setShowPlanChangeModal(true)}
                className="inline-flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-all shadow-md hover:shadow-lg"
              >
                <RefreshCcw className="w-4 h-4 mr-2" />
                Cambiar Plan
              </button>
            )}
            <button
              onClick={() => setShowPartialPaymentModal(true)}
              className="inline-flex items-center px-4 py-2 bg-[#17BC91] hover:bg-[#17BC91]/90 text-white font-medium rounded-lg transition-all shadow-md hover:shadow-lg"
            >
              <DollarSign className="w-4 h-4 mr-2" />
              Pago Parcial
            </button>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-[#073372] to-[#17BC91] text-white rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-8 h-8 opacity-80" />
              <TrendingUp className="w-5 h-5 opacity-60" />
            </div>
            <p className="text-sm opacity-90 mb-1">Total a Pagar</p>
            <p className="text-2xl font-bold">{formatCurrency(enrollment.paymentPlan.totalAmount)}</p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="w-8 h-8 text-[#17BC91]" />
            </div>
            <p className="text-sm text-slate-600 mb-1">Pagado</p>
            <p className="text-2xl font-bold text-slate-900">{formatCurrency(enrollment.totalPaid)}</p>
            <p className="text-xs text-[#17BC91] mt-1">{enrollment.paymentProgress.toFixed(0)}% completado</p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-8 h-8 text-[#F98613]" />
            </div>
            <p className="text-sm text-slate-600 mb-1">Pendiente</p>
            <p className="text-2xl font-bold text-slate-900">{formatCurrency(enrollment.totalPending)}</p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <FileText className="w-8 h-8 text-[#073372]" />
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
                          <>
                            <p className={`text-xs mt-1 ${installment.daysUntilDue < 7 && installment.daysUntilDue >= 0 ? 'text-orange-600 font-semibold' : installment.daysUntilDue < 0 ? 'text-red-600' : 'text-slate-500'}`}>
                              {installment.daysUntilDue > 0 
                                ? `Faltan ${installment.daysUntilDue} días` 
                                : installment.daysUntilDue === 0 
                                ? '¡Vence hoy!' 
                                : `Vencido hace ${Math.abs(installment.daysUntilDue)} días`}
                            </p>
                            {/* Mostrar días de gracia si está vencido pero aún en período de gracia */}
                            {installment.daysUntilDue < 0 && installment.daysUntilGraceLimit !== undefined && installment.daysUntilGraceLimit >= 0 && installment.gracePeriodDays && installment.gracePeriodDays > 0 && (
                              <p className="text-xs mt-1 text-orange-600 font-semibold bg-orange-50 px-2 py-1 rounded inline-block">
                                ⚠️ Período de gracia: {installment.daysUntilGraceLimit} días restantes
                              </p>
                            )}
                            {/* Mostrar alerta de mora si ya pasó el período de gracia */}
                            {installment.daysUntilGraceLimit !== undefined && installment.daysUntilGraceLimit < 0 && (
                              <div className="mt-1 space-y-1">
                                <p className="text-xs text-red-600 font-bold bg-red-50 px-2 py-1 rounded inline-block">
                                  🚨 Mora aplicada ({Math.abs(installment.daysUntilGraceLimit)} días)
                                </p>
                                {installment.lateFee > 0 && (
                                  <p className="text-xs text-red-700 font-bold bg-red-100 px-2 py-1 rounded inline-block">
                                    💰 Recargo por mora: {formatCurrency(installment.lateFee)}
                                  </p>
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      <div>
                        <p className="text-slate-500 mb-1">Monto</p>
                        <p className="font-bold text-slate-900">{formatCurrency(installment.amount)}</p>
                        {installment.lateFee > 0 && (
                          <p className="text-xs text-red-600 mt-1 font-semibold">
                            + {formatCurrency(installment.lateFee)} mora
                          </p>
                        )}
                      </div>

                      <div>
                        <p className="text-slate-500 mb-1">Total a Pagar</p>
                        <p className="font-bold text-blue-600">{formatCurrency(installment.totalDue)}</p>
                        {installment.lateFee > 0 && (
                          <p className="text-xs text-slate-500 mt-1">
                            (Incluye mora)
                          </p>
                        )}
                        
                        {/* Mostrar progreso de pago parcial */}
                        {(installment.paymentType === 'partial' || installment.paymentType === 'combined') && installment.remainingAmount && installment.remainingAmount > 0 && (
                          <div className="mt-2 space-y-1">
                            <p className="text-xs text-blue-600 font-semibold">
                              Pagado: {formatCurrency(installment.paidAmount)} 
                            </p>
                            <p className="text-xs text-orange-600 font-semibold">
                              Restante: {formatCurrency(installment.remainingAmount)}
                            </p>
                            <div className="w-full bg-slate-200 rounded-full h-1.5 mt-1">
                              <div 
                                className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                                style={{ width: `${(installment.paidAmount / installment.totalDue) * 100}%` }}
                              ></div>
                            </div>
                          </div>
                        )}
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
                            <>
                              <span className="text-xs px-3 py-1 bg-red-100 text-red-800 rounded-full font-medium">
                                ✗ Rechazado
                              </span>
                              {/* Botón para subir nuevo voucher cuando está rechazado */}
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
                                <div className="px-3 py-1.5 bg-[#17BC91] hover:bg-[#17BC91]/90 text-white text-xs font-medium rounded-lg transition-colors flex items-center space-x-1">
                                  <Upload className="w-3 h-3" />
                                  <span>Subir Nuevo</span>
                                </div>
                              </label>
                            </>
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

                {/* Upload Voucher - Permitir subir si está pendiente, vencida con mora, o voucher rechazado */}
                {(installment.status === 'pending' || installment.status === 'late' || installment.isOverdue) && 
                 (!installment.vouchers.length || installment.vouchers.every(v => v.status === 'rejected')) && (
                  <div className="mt-4">
                    {installment.vouchers.some(v => v.status === 'rejected') && (
                      <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-800 font-medium flex items-center">
                          <AlertCircle className="w-4 h-4 mr-2" />
                          Tu voucher anterior fue rechazado. Por favor, sube un nuevo comprobante válido.
                        </p>
                      </div>
                    )}
                    {/* Alerta cuando la cuota tiene mora */}
                    {installment.lateFee > 0 && (
                      <div className="mb-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                        <p className="text-sm text-orange-800 font-bold flex items-center">
                          <AlertCircle className="w-4 h-4 mr-2" />
                          Esta cuota tiene mora. Debes pagar el total: {formatCurrency(installment.totalDue)}
                        </p>
                        <p className="text-xs text-orange-700 mt-1">
                          Monto original: {formatCurrency(installment.amount)} + Mora: {formatCurrency(installment.lateFee)}
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

        {/* Modal: Cambiar Plan de Pago */}
        {showPlanChangeModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-900">Cambiar Plan de Pago</h2>
                <button
                  onClick={() => setShowPlanChangeModal(false)}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Plan actual */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-blue-900 mb-2">Plan Actual:</p>
                  <p className="text-lg font-bold text-blue-700">{enrollment.paymentPlan.name}</p>
                  <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                    <div>
                      <p className="text-blue-600">Total:</p>
                      <p className="font-bold text-blue-900">{formatCurrency(enrollment.paymentPlan.totalAmount)}</p>
                    </div>
                    <div>
                      <p className="text-blue-600">Cuotas:</p>
                      <p className="font-bold text-blue-900">{enrollment.paymentPlan.installmentsCount} mensuales</p>
                    </div>
                  </div>
                </div>

                {/* Seleccionar nuevo plan */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-3">
                    Selecciona tu nuevo plan:
                  </label>
                  <div className="space-y-3">
                    {availablePlans.map((plan) => (
                      <label
                        key={plan.id}
                        className={`block p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          selectedNewPlan === plan.id
                            ? 'border-[#17BC91] bg-[#17BC91]/5'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="new_plan"
                          value={plan.id}
                          checked={selectedNewPlan === plan.id}
                          onChange={() => setSelectedNewPlan(plan.id)}
                          className="hidden"
                        />
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-bold text-slate-900">{plan.name}</p>
                            <p className="text-sm text-slate-600 mt-1">
                              {plan.installmentsCount} cuotas de {formatCurrency(plan.monthlyAmount)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-slate-600">Total</p>
                            <p className="text-lg font-bold text-[#073372]">{formatCurrency(plan.totalAmount)}</p>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Razón del cambio (opcional) */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Razón del cambio (opcional):
                  </label>
                  <textarea
                    value={planChangeReason}
                    onChange={(e) => setPlanChangeReason(e.target.value)}
                    placeholder="Ej: Cambio por disponibilidad económica"
                    rows={3}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#17BC91] focus:border-transparent"
                  />
                </div>

                {/* Advertencia */}
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <p className="text-sm text-orange-900">
                    <strong>⚠️ Importante:</strong> Al cambiar de plan, tus cuotas pendientes serán canceladas y se generarán nuevas según el plan seleccionado.
                  </p>
                </div>

                {/* Botones */}
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setShowPlanChangeModal(false)}
                    className="px-6 py-2 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleChangePlan}
                    disabled={!selectedNewPlan || changingPlan}
                    className="px-6 py-2 bg-[#17BC91] hover:bg-[#17BC91]/90 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {changingPlan ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Cambiando...
                      </>
                    ) : (
                      <>
                        <ArrowRight className="w-4 h-4 mr-2" />
                        Confirmar Cambio
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Pago Parcial */}
        {showPartialPaymentModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
              <div className="bg-gradient-to-r from-[#073372] to-[#17BC91] text-white px-6 py-4 rounded-t-2xl flex items-center justify-between">
                <h2 className="text-xl font-bold">Pago Parcial</h2>
                <button
                  onClick={() => {
                    setShowPartialPaymentModal(false);
                    setPartialAmount('');
                  }}
                  className="text-white/80 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Información del plan */}
                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-slate-600">Total del plan:</p>
                      <p className="text-lg font-bold text-slate-900">{formatCurrency(enrollment.paymentPlan.totalAmount)}</p>
                    </div>
                    <div>
                      <p className="text-slate-600">Pendiente:</p>
                      <p className="text-lg font-bold text-orange-600">{formatCurrency(enrollment.totalPending)}</p>
                    </div>
                  </div>
                </div>

                {/* Input de monto */}
                <div>
                 
                  <div className="relative">
                    <Input
                      label="Monto a pagar"
                      type="number"
                      value={partialAmount}
                      onChange={(e) => setPartialAmount(e.target.value)}
                      placeholder="0.00"
                      min={0.01}
                      max={enrollment.totalPending}
                      step={0.01}
                      icon={<span className="text-slate-500 font-medium">S/</span>}
                      helperText={`Monto máximo: ${formatCurrency(enrollment.totalPending)}`}
                      variant="outlined"
                    />
                  </div>
                  
                  {/* Alerta si el monto excede el pendiente */}
                  {partialAmount && parseFloat(partialAmount) > enrollment.totalPending && (
                    <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-800 font-medium flex items-center">
                        <AlertCircle className="w-4 h-4 mr-2" />
                        El monto ingresado ({formatCurrency(parseFloat(partialAmount))}) excede tu deuda pendiente ({formatCurrency(enrollment.totalPending)})
                      </p>
                    </div>
                  )}
                </div>

                {/* Distribución estimada */}
                {partialAmount && parseFloat(partialAmount) > 0 && parseFloat(partialAmount) <= enrollment.totalPending && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm font-medium text-green-900 mb-2">
                      ✅ Distribución automática:
                    </p>
                    <p className="text-xs text-green-700">
                      El monto de {formatCurrency(parseFloat(partialAmount))} se aplicará a tus cuotas más antiguas primero, cubriendo mora si existe.
                    </p>
                  </div>
                )}

                {/* Subir comprobante */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Comprobante de pago:
                  </label>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleUploadPartialPayment(file);
                      }
                    }}
                    disabled={uploadingPartialPayment || !partialAmount || parseFloat(partialAmount) <= 0 || parseFloat(partialAmount) > enrollment.totalPending}
                    className="hidden"
                    id="partial-payment-file"
                  />
                  <label
                    htmlFor="partial-payment-file"
                    className={`block w-full px-4 py-3 border-2 border-dashed rounded-lg text-center cursor-pointer transition-all ${
                      uploadingPartialPayment || !partialAmount || parseFloat(partialAmount) <= 0 || parseFloat(partialAmount) > enrollment.totalPending
                        ? 'border-slate-200 bg-slate-50 cursor-not-allowed'
                        : 'border-[#17BC91] hover:bg-[#17BC91]/5'
                    }`}
                  >
                    {uploadingPartialPayment ? (
                      <div className="flex items-center justify-center space-x-2 text-[#17BC91]">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#17BC91]"></div>
                        <span className="font-medium">Procesando...</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center space-x-2 text-slate-700">
                        <Upload className="w-5 h-5" />
                        <span className="font-medium">Seleccionar comprobante</span>
                      </div>
                    )}
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  );
};

export default PaymentControl;
