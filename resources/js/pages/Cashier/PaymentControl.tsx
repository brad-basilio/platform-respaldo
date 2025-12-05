import React, { useState, useMemo } from 'react';
import { 
  Users, Eye, CheckCircle, AlertCircle, XCircle, 
  Calendar, DollarSign, FileText, Search, Download, Clock, CreditCard, Building2, Smartphone
} from 'lucide-react';
import { Student, Enrollment, Installment } from '../../types/models';
import AuthenticatedLayout from '../../layouts/AuthenticatedLayout';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule, themeQuartz } from 'ag-grid-community';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import axios from 'axios';
import Swal from 'sweetalert2';
import { Input } from '@/components/ui/input';
import '../../../css/ag-grid-custom.css';

ModuleRegistry.registerModules([AllCommunityModule]);

interface Props {
  students: Student[];
}

// Modal de Detalle de Voucher
const VoucherDetailModal: React.FC<{
  installment: Installment;
  student: Student;
  onClose: () => void;
  onVerifyVoucher: (voucherId: number, action: 'approve' | 'reject', rejectionReason?: string) => Promise<void>;
}> = ({ installment, student, onClose, onVerifyVoucher }) => {
  const [verifying, setVerifying] = useState(false);
  const [expandedVoucherId, setExpandedVoucherId] = useState<number | null>(null);

  const vouchers = installment.vouchers || [];
  const pendingVoucher = vouchers.find(v => v.status === 'pending');
  const lateFee = (installment as any).late_fee || (installment as any).lateFee || 0;
  const totalDue = (installment as any).total_due || (installment as any).totalDue || installment.amount + lateFee;
  const paidAmount = (installment as any).paid_amount || (installment as any).paidAmount || 0;

  const handleApprove = async () => {
    if (!pendingVoucher) return;

    const result = await Swal.fire({
      title: '¿Aprobar este voucher?',
      html: `
        <div class="text-left">
          <p class="text-gray-700 mb-3">¿Confirmas que el voucher de pago es válido?</p>
          <div class="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
            <p class="text-sm text-blue-800">
              <strong>Importante:</strong> Al aprobar este voucher:
            </p>
            <ul class="text-sm text-blue-700 mt-2 space-y-1 list-disc list-inside">
              <li>Se marcará el voucher como aprobado</li>
              <li>Se actualizará la cuota correspondiente</li>
              <li>Se registrará tu nombre como revisor</li>
            </ul>
          </div>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, Aprobar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true
    });

    if (!result.isConfirmed) return;

    setVerifying(true);
    try {
      await onVerifyVoucher(pendingVoucher.id, 'approve');
      onClose();
    } finally {
      setVerifying(false);
    }
  };

  const handleReject = async () => {
    if (!pendingVoucher) return;

    const result = await Swal.fire({
      title: 'Rechazar Voucher',
      input: 'textarea',
      inputLabel: 'Motivo del rechazo',
      inputPlaceholder: 'Explica por qué se rechaza este voucher...',
      inputAttributes: {
        'aria-label': 'Motivo del rechazo'
      },
      showCancelButton: true,
      confirmButtonText: 'Rechazar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      inputValidator: (value) => {
        if (!value) {
          return 'Debes especificar un motivo';
        }
      }
    });

    if (result.isConfirmed && result.value) {
      setVerifying(true);
      try {
        await onVerifyVoucher(pendingVoucher.id, 'reject', result.value);
        onClose();
      } finally {
        setVerifying(false);
      }
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method?.toLowerCase()) {
      case 'yape':
        return <Smartphone className="w-5 h-5" />;
      case 'transfer':
      case 'transferencia':
        return <Building2 className="w-5 h-5" />;
      case 'card':
      case 'tarjeta':
        return <CreditCard className="w-5 h-5" />;
      default:
        return <DollarSign className="w-5 h-5" />;
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method?.toLowerCase()) {
      case 'yape':
        return 'Yape';
      case 'transfer':
      case 'transferencia':
        return 'Transferencia Bancaria';
      case 'card':
      case 'tarjeta':
        return 'Tarjeta de Crédito/Débito';
      case 'cash':
      case 'efectivo':
        return 'Efectivo';
      default:
        return method || 'No especificado';
    }
  };

  const installmentNumber = (installment as any).installment_number || (installment as any).installmentNumber || 0;
  const dueDateStr = (installment as any).due_date || (installment as any).dueDate || '';
  let dueDateParsed: Date;
  try {
    if (typeof dueDateStr === 'string' && dueDateStr.includes('-')) {
      const [y, m, d] = dueDateStr.split('-').map(Number);
      dueDateParsed = new Date(y, (m || 1) - 1, d || 1);
    } else {
      dueDateParsed = new Date(dueDateStr);
    }
    // Validar si la fecha es válida
    if (isNaN(dueDateParsed.getTime())) {
      dueDateParsed = new Date();
    }
  } catch (e) {
    dueDateParsed = new Date();
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#073372] to-[#17BC91] text-white px-6 py-5 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-2xl font-bold">Detalle de Pago - Cuota {installmentNumber}</h2>
            <p className="text-white/90 text-sm mt-1">{student.name} • {student.enrollmentCode}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Información de la Cuota */}
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-6 border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center">
              <FileText className="w-5 h-5 mr-2 text-[#073372]" />
              Información de la Cuota
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-slate-600 font-medium mb-1">Número de Cuota</p>
                <p className="text-lg font-bold text-slate-900">Cuota {installmentNumber}</p>
              </div>
              <div>
                <p className="text-xs text-slate-600 font-medium mb-1">Fecha de Vencimiento</p>
                <p className="text-lg font-bold text-slate-900">
                  {dueDateParsed.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-600 font-medium mb-1">Monto Base</p>
                <p className="text-lg font-bold text-slate-900">S/ {installment.amount.toFixed(2)}</p>
              </div>
              {lateFee > 0 && (
                <div>
                  <p className="text-xs text-red-600 font-medium mb-1">Mora</p>
                  <p className="text-lg font-bold text-red-600">+ S/ {lateFee.toFixed(2)}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-slate-600 font-medium mb-1">Total a Pagar</p>
                <p className={`text-lg font-bold ${lateFee > 0 ? 'text-red-600' : 'text-slate-900'}`}>
                  S/ {totalDue.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-xs text-green-600 font-medium mb-1">Pagado</p>
                <p className="text-lg font-bold text-green-600">S/ {paidAmount.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Todos los Vouchers de esta cuota */}
          <div className="bg-white rounded-xl p-6 border-2 border-[#073372]/20">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-900 flex items-center">
                <Download className="w-5 h-5 mr-2 text-[#073372]" />
                Vouchers de Pago ({vouchers.length})
              </h3>
              {pendingVoucher && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-[#073372]/10 text-[#073372] border-2 border-[#073372]/30 animate-pulse">
                  <Clock className="w-3 h-3 mr-1" />
                  Pendiente de Verificación
                </span>
              )}
            </div>

            {vouchers.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <p className="text-slate-600">No hay vouchers subidos para esta cuota</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Ordenar: pendientes primero, luego por fecha (más recientes primero) */}
                {vouchers
                  .sort((a, b) => {
                    if (a.status === 'pending' && b.status !== 'pending') return -1;
                    if (a.status !== 'pending' && b.status === 'pending') return 1;
                    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                  })
                  .map((voucher, index) => {
                    const isPending = voucher.status === 'pending';
                    const isApproved = voucher.status === 'approved';
                    const isRejected = voucher.status === 'rejected';

                    return (
                      <div
                        key={voucher.id}
                        className={`rounded-xl border-2 p-5 transition-all ${
                          isPending
                            ? 'bg-gradient-to-br from-blue-50 to-blue-100 border-[#073372] shadow-lg'
                            : isApproved
                            ? 'bg-green-50 border-green-300'
                            : 'bg-red-50 border-red-300'
                        }`}
                      >
                        {/* Header del voucher */}
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            <div className={`p-2.5 rounded-lg ${
                              isPending
                                ? 'bg-[#073372] animate-pulse'
                                : isApproved
                                ? 'bg-green-500'
                                : 'bg-red-500'
                            }`}>
                              {isPending ? (
                                <Clock className="w-5 h-5 text-white" />
                              ) : isApproved ? (
                                <CheckCircle className="w-5 h-5 text-white" />
                              ) : (
                                <XCircle className="w-5 h-5 text-white" />
                              )}
                            </div>
                            <div>
                              <p className={`text-sm font-bold ${
                                isPending ? 'text-[#073372]' : isApproved ? 'text-green-700' : 'text-red-700'
                              }`}>
                                {isPending ? '🔍 Pendiente de Verificación' : isApproved ? '✅ Aprobado' : '❌ Rechazado'}
                              </p>
                              <p className="text-xs text-slate-600 mt-0.5">
                                Fecha de pago: {(() => {
                                  try {
                                    const date = new Date(voucher.payment_date);
                                    if (isNaN(date.getTime())) {
                                      return 'Fecha no especificada';
                                    }
                                    return date.toLocaleDateString('es-PE', {
                                      day: '2-digit',
                                      month: 'long',
                                      year: 'numeric'
                                    });
                                  } catch {
                                    return 'Fecha no especificada';
                                  }
                                })()}
                              </p>
                            </div>
                          </div>
                          
                          {/* Badge de número */}
                          <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${
                            isPending
                              ? 'bg-[#073372] text-white'
                              : isApproved
                              ? 'bg-green-600 text-white'
                              : 'bg-red-600 text-white'
                          }`}>
                            #{vouchers.length - index}
                          </span>
                        </div>

                        {/* Información del pago */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div className="space-y-1">
                            <p className="text-xs text-slate-600 font-medium">Método de Pago</p>
                            <div className="flex items-center space-x-2">
                              <div className={`p-1.5 rounded-lg ${
                                isPending ? 'bg-[#073372]/20 text-[#073372]' : 'bg-white/50'
                              }`}>
                                {getPaymentMethodIcon(voucher.payment_method)}
                              </div>
                              <span className="text-sm font-semibold text-slate-900">
                                {getPaymentMethodLabel(voucher.payment_method)}
                              </span>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-slate-600 font-medium">Monto Declarado</p>
                            <p className={`text-lg font-bold ${
                              isPending ? 'text-[#073372]' : 'text-slate-900'
                            }`}>
                              S/ {parseFloat(String(voucher.declared_amount || '0')).toFixed(2)}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-slate-600 font-medium">Fecha de Pago</p>
                            <p className="text-sm font-semibold text-slate-900">
                              {(() => {
                                try {
                                  const date = new Date(voucher.payment_date);
                                  if (isNaN(date.getTime())) {
                                    return 'Fecha no disponible';
                                  }
                                  return date.toLocaleDateString('es-PE', {
                                    day: '2-digit',
                                    month: 'long',
                                    year: 'numeric'
                                  });
                                } catch {
                                  return 'Fecha no disponible';
                                }
                              })()}
                            </p>
                          </div>
                        </div>

                        {/* Comprobante */}
                        <div className="bg-white/60 rounded-lg border border-slate-200 overflow-hidden">
                          <button
                            onClick={() => setExpandedVoucherId(expandedVoucherId === voucher.id ? null : voucher.id)}
                            className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                          >
                            <div className="flex items-center space-x-3">
                              <FileText className={`w-5 h-5 ${
                                isPending ? 'text-[#073372]' : 'text-slate-600'
                              }`} />
                              <div className="text-left">
                                <p className="text-xs text-slate-600 font-medium">Comprobante</p>
                                <p className="text-sm text-slate-900 font-semibold">
                                  {voucher.voucher_url ? 'Archivo disponible' : 'Sin archivo'}
                                </p>
                              </div>
                            </div>
                            {voucher.voucher_url && (
                              <div className="flex items-center space-x-2">
                                <span className={`text-xs font-medium ${
                                  isPending ? 'text-[#073372]' : 'text-slate-600'
                                }`}>
                                  {expandedVoucherId === voucher.id ? 'Ocultar' : 'Ver'}
                                </span>
                                <Eye className={`w-4 h-4 transition-transform ${
                                  expandedVoucherId === voucher.id ? 'rotate-180' : ''
                                } ${
                                  isPending ? 'text-[#073372]' : 'text-slate-600'
                                }`} />
                              </div>
                            )}
                          </button>
                          
                          {/* Vista expandida del comprobante */}
                          {expandedVoucherId === voucher.id && voucher.voucher_url && (
                            <div className="border-t border-slate-200 p-4 bg-slate-50">
                              <div className="bg-white rounded-lg p-3 border border-slate-200">
                                {voucher.voucher_url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                  <img
                                    src={voucher.voucher_url}
                                    alt="Comprobante de pago"
                                    className="w-full h-auto max-h-96 object-contain rounded"
                                  />
                                ) : voucher.voucher_url.match(/\.pdf$/i) ? (
                                  <div className="text-center py-8">
                                    <FileText className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                                    <p className="text-sm text-slate-600 mb-3">Archivo PDF</p>
                                    <a
                                      href={voucher.voucher_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center px-4 py-2 bg-[#073372] hover:bg-[#17BC91] text-white font-medium rounded-lg transition-colors"
                                    >
                                      <Download className="w-4 h-4 mr-2" />
                                      Abrir PDF
                                    </a>
                                  </div>
                                ) : (
                                  <div className="text-center py-8">
                                    <FileText className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                                    <p className="text-sm text-slate-600 mb-3">Archivo adjunto</p>
                                    <a
                                      href={voucher.voucher_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center px-4 py-2 bg-[#073372] hover:bg-[#17BC91] text-white font-medium rounded-lg transition-colors"
                                    >
                                      <Download className="w-4 h-4 mr-2" />
                                      Descargar Archivo
                                    </a>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Motivo de rechazo si existe */}
                        {isRejected && voucher.rejection_reason && (
                          <div className="mt-4 p-4 bg-red-100 rounded-lg border-2 border-red-300">
                            <p className="text-xs font-bold text-red-800 mb-2 flex items-center">
                              <XCircle className="w-4 h-4 mr-1" />
                              Motivo del Rechazo:
                            </p>
                            <p className="text-sm text-red-700 font-medium">{voucher.rejection_reason}</p>
                          </div>
                        )}

                        {/* Información del verificador si existe */}
                        {(isApproved || isRejected) && voucher.verified_by && (
                          <div className="mt-3 flex items-center text-xs text-slate-600">
                            <span className="font-medium">
                              Verificado por: {voucher.verified_by}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>

        {/* Footer con acciones */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-between items-center flex-shrink-0">
          <button
            onClick={onClose}
            disabled={verifying}
            className="px-6 py-2.5 border-2 border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50"
          >
            Cerrar
          </button>
          
          {pendingVoucher && (
            <div className="flex items-center space-x-3">
              <button
                onClick={handleReject}
                disabled={verifying}
                className="inline-flex items-center px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {verifying ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 mr-2" />
                    Rechazar
                  </>
                )}
              </button>
              <button
                onClick={handleApprove}
                disabled={verifying}
                className="inline-flex items-center px-6 py-2.5 bg-gradient-to-r from-[#17BC91] to-emerald-600 hover:shadow-lg text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {verifying ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Aprobar Pago
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Modal de Cronograma de Pagos
const PaymentScheduleModal: React.FC<{ 
  student: Student; 
  enrollment: Enrollment;
  onClose: () => void;
  onVerifyVoucher: (voucherId: number, action: 'approve' | 'reject', rejectionReason?: string) => Promise<void>;
  onViewInstallmentDetail: (installment: Installment) => void;
}> = ({ student, enrollment, onClose, onViewInstallmentDetail }) => {

  const getStatusBadge = (installment: Installment) => {
    // Si ya está verificado
    if (installment.status === 'verified') {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#17BC91]/10 text-[#17BC91] border border-[#17BC91]/30">
          <CheckCircle className="w-3 h-3 mr-1" />
          Verificado
        </span>
      );
    }
    
    // Si está en verificación (voucher subido)
    if (installment.status === 'paid') {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#073372]/10 text-[#073372] border border-[#073372]/30 animate-pulse">
          <Clock className="w-3 h-3 mr-1" />
          Pendiente Verificación
        </span>
      );
    }
    
    // Para pendientes, verificar días de gracia y mora
    if (installment.status === 'pending' || installment.status === 'overdue') {
      // Parse due date safely to avoid UTC shift when JS parses YYYY-MM-DD as UTC
      const dueDateStr = (installment as any).due_date || (installment as any).dueDate || '';
      let dueDate: Date;
      if (typeof dueDateStr === 'string' && dueDateStr.includes('-')) {
        const [y, m, d] = dueDateStr.split('-').map(Number);
        dueDate = new Date(y, (m || 1) - 1, d || 1);
      } else {
        dueDate = new Date(dueDateStr);
      }

      const today = new Date();
      const localToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

      // Prefer server-provided values when available (authoritative, avoids TZ issues)
      const serverDaysUntilDue = (installment as any).daysUntilDue;
      const serverDaysUntilGraceLimit = (installment as any).daysUntilGraceLimit;

      let daysUntilDue = typeof serverDaysUntilDue === 'number' ? serverDaysUntilDue : Math.round((dueDate.getTime() - localToday.getTime()) / (1000 * 60 * 60 * 24));

      // Obtener días de gracia del plan (server uses snake_case or camelCase)
      const gracePeriodDays = enrollment.paymentPlan?.gracePeriodDays || (enrollment.paymentPlan as any)?.grace_period_days || 0;

      let daysUntilGraceLimit = typeof serverDaysUntilGraceLimit === 'number' ? serverDaysUntilGraceLimit : (function(){
        const graceLimitDate = new Date(dueDate);
        graceLimitDate.setDate(graceLimitDate.getDate() + gracePeriodDays);
        return Math.round((graceLimitDate.getTime() - localToday.getTime()) / (1000 * 60 * 60 * 24));
      })();
      
      // 🔍 Debug logs para verificar (server or local) cálculos
      console.log('🔍 Cashier Debug - Cuota:', {
        dueDateStr,
        dueDate: dueDate.toISOString().split('T')[0],
        today: localToday.toISOString().split('T')[0],
        gracePeriodDays,
        daysUntilDue,
        daysUntilGraceLimit,
        moraEnDias: Math.abs(daysUntilGraceLimit),
        usingServer: typeof serverDaysUntilGraceLimit === 'number'
      });
      
      // Si ya pasó la fecha pero está en período de gracia
      if (daysUntilDue < 0 && daysUntilGraceLimit >= 0 && gracePeriodDays > 0) {
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 border border-orange-300">
            <AlertCircle className="w-3 h-3 mr-1" />
            Período de Gracia ({daysUntilGraceLimit}d)
          </span>
        );
      }
      
      // Si ya pasó el período de gracia - VENCIDO CON MORA
      if (daysUntilGraceLimit < 0) {
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-300">
            <XCircle className="w-3 h-3 mr-1" />
            Vencido con Mora ({Math.abs(daysUntilGraceLimit)}d)
          </span>
        );
      }
      
      // Pendiente normal (aún no vence)
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#F98613]/10 text-[#F98613] border border-[#F98613]/30">
          <AlertCircle className="w-3 h-3 mr-1" />
          Pendiente ({daysUntilDue > 0 ? `${daysUntilDue}d` : 'Vence hoy'})
        </span>
      );
    }
    
    // Fallback
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
        <AlertCircle className="w-3 h-3 mr-1" />
        Desconocido
      </span>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl max-w-6xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        <div className="bg-gradient-to-r from-[#073372] to-[#17BC91] px-8 py-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Cronograma de Pagos</h2>
            <p className="text-white/90 text-sm">{student.name} - {student.enrollmentCode}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
          >
            <XCircle className="h-6 w-6" />
          </button>
        </div>

        <div className="p-8 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Resumen de Matrícula */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-600 font-semibold uppercase">Total Plan</p>
                  <p className="text-2xl font-bold text-blue-900 mt-1">
                    S/ {((enrollment.enrollment_fee || 0) + (enrollment.totalPending || 0) + (enrollment.totalPaid || 0)).toFixed(2)}
                  </p>
                </div>
                <FileText className="h-8 w-8 text-blue-600 opacity-50" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-green-600 font-semibold uppercase">Pagado</p>
                  <p className="text-2xl font-bold text-green-900 mt-1">
                    S/ {((enrollment.enrollment_fee || 0) + (enrollment.totalPaid || 0)).toFixed(2)}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600 opacity-50" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-4 border border-yellow-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-yellow-600 font-semibold uppercase">Pendiente</p>
                  <p className="text-2xl font-bold text-yellow-900 mt-1">
                    S/ {(enrollment.totalPending || 0).toFixed(2)}
                  </p>
                </div>
                <AlertCircle className="h-8 w-8 text-yellow-600 opacity-50" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-purple-600 font-semibold uppercase">Progreso</p>
                  <p className="text-2xl font-bold text-purple-900 mt-1">
                    {(enrollment.paymentProgress || 0).toFixed(2)}%
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-purple-600 opacity-50" />
              </div>
            </div>
          </div>

          {/* Tabla de Cuotas */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Cuotas del Plan</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Cuota
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Fecha Vencimiento
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Monto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {enrollment.installments && enrollment.installments.length > 0 ? (
                    enrollment.installments.map((installment) => {
                      // Normalizar campos (soportar tanto camelCase como snake_case)
                      const installmentNumber = (installment as any).installment_number || (installment as any).installmentNumber || 0;
                      const dueDateStr = (installment as any).due_date || (installment as any).dueDate || '';
                      // Parse due date safely to avoid timezone shift (YYYY-MM-DD -> local date)
                      let dueDateParsed = new Date(dueDateStr);
                      if (typeof dueDateStr === 'string' && dueDateStr.includes('-')) {
                        const [y, m, d] = dueDateStr.split('-').map(Number);
                        dueDateParsed = new Date(y, (m || 1) - 1, d || 1);
                      }
                      const lateFee = (installment as any).late_fee || (installment as any).lateFee || 0;
                      const totalDue = (installment as any).total_due || (installment as any).totalDue || installment.amount + lateFee;
                      const vouchers = installment.vouchers || [];
                      const hasPendingVoucher = vouchers.some(v => v.status === 'pending');
                      
                      return (
                      <tr key={installment.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-blue-600 font-semibold text-sm">
                                {installmentNumber}
                              </span>
                            </div>
                            <span className="ml-3 text-sm font-medium text-gray-900">
                              Cuota {installmentNumber}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm text-gray-900">
                            <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                            {dueDateParsed.toLocaleDateString('es-PE', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className={`text-sm font-bold ${lateFee > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                              S/ {totalDue.toFixed(2)}
                            </span>
                            {lateFee > 0 && (
                              <span className="text-xs text-red-500 italic">
                                (incluye mora S/ {lateFee.toFixed(2)})
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(installment)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <button
                            onClick={() => onViewInstallmentDetail(installment)}
                            className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                              hasPendingVoucher
                                ? 'bg-[#073372] hover:bg-[#17BC91] text-white shadow-md animate-pulse'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            }`}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Ver Detalle
                          </button>
                        </td>
                      </tr>
                    )})
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                        No hay cuotas registradas
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 px-8 py-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2.5 rounded-xl font-medium transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

const CashierPaymentControl: React.FC<Props> = ({ students: initialStudents = [] }) => {
  const [students] = useState<Student[]>(initialStudents ?? []);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showVoucherDetailModal, setShowVoucherDetailModal] = useState(false);
  const [selectedInstallment, setSelectedInstallment] = useState<Installment | null>(null);
  const [quickFilterText, setQuickFilterText] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'completed'>('all');

  const handleViewInstallmentDetail = (installment: Installment) => {
    setSelectedInstallment(installment);
    setShowVoucherDetailModal(true);
  };

  const handleViewSchedule = async (student: Student) => {
    try {
      console.log('📋 Abriendo cronograma para estudiante:', student.id, student.name);
      
      // Obtener el enrollment completo con las cuotas
      const response = await axios.get(`/cashier/students/${student.id}/enrollment`);
      
      console.log('✅ Respuesta del servidor:', response.data);
      
      if (response.data.success) {
        setSelectedStudent({
          ...student,
          enrollment: response.data.enrollment
        });
        setShowScheduleModal(true);
      } else {
        throw new Error(response.data.message || 'No se pudo cargar el cronograma');
      }
    } catch (error: any) {
      console.error('❌ Error al cargar cronograma:', error);
      console.error('Error response:', error.response?.data);
      await Swal.fire({
        title: 'Error',
        text: error.response?.data?.message || 'No se pudo cargar el cronograma de pagos',
        icon: 'error',
        confirmButtonColor: '#ef4444'
      });
    }
  };

  const handleVerifyVoucher = async (voucherId: number, action: 'approve' | 'reject', rejectionReason?: string) => {
    const confirmTitle = action === 'approve' ? '¿Aprobar Voucher?' : '¿Rechazar Voucher?';
    const confirmText = action === 'approve' 
      ? '¿Confirmas que el voucher de pago es válido?' 
      : 'El voucher será rechazado y el estudiante deberá subir uno nuevo.';
    
    // Si ya se llamó con reject, no necesitamos confirmar de nuevo (ya se confirmó con el textarea)
    if (action === 'reject' && rejectionReason) {
      // Proceder directamente sin confirmación adicional
    } else if (action === 'approve') {
      const result = await Swal.fire({
        title: confirmTitle,
        html: `
          <div class="text-left">
            <p class="text-gray-700 mb-3">${confirmText}</p>
            <div class="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
              <p class="text-sm text-blue-800">
                <strong>Importante:</strong> Al aprobar este voucher:
              </p>
              <ul class="text-sm text-blue-700 mt-2 space-y-1 list-disc list-inside">
                <li>Se marcará el voucher como aprobado</li>
                <li>Se actualizará la cuota correspondiente</li>
                <li>Se registrará tu nombre como revisor</li>
              </ul>
            </div>
          </div>
        `,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#10b981',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Sí, Aprobar',
        cancelButtonText: 'Cancelar',
        reverseButtons: true
      });

      if (!result.isConfirmed) return;
    }

    try {
      const response = await axios.post(`/cashier/vouchers/${voucherId}/verify`, {
        action,
        rejection_reason: rejectionReason
      });
      
      if (response.data.success) {
        // Actualizar el estado local
        if (selectedStudent?.enrollment) {
          // Recargar el enrollment completo
          const enrollmentResponse = await axios.get(`/cashier/students/${selectedStudent.id}/enrollment`);
          
          if (enrollmentResponse.data.success) {
            setSelectedStudent({
              ...selectedStudent,
              enrollment: enrollmentResponse.data.enrollment
            });
          }
        }

        await Swal.fire({
          title: action === 'approve' ? '¡Aprobado!' : 'Rechazado',
          text: response.data.message,
          icon: 'success',
          confirmButtonColor: '#10b981',
          timer: 2000,
          timerProgressBar: true
        });
      }
    } catch (error) {
      console.error('Error al verificar voucher:', error);
      await Swal.fire({
        title: 'Error',
        text: 'No se pudo procesar la verificación del voucher',
        icon: 'error',
        confirmButtonColor: '#ef4444'
      });
    }
  };

  // Filtrar estudiantes según el tab activo
  const filteredStudents = useMemo(() => {
    let filtered = students.filter(s => s.enrollmentVerified); // Solo verificados
    
    if (activeTab === 'pending') {
      filtered = filtered.filter(s => s.enrollment && (s.enrollment.paymentProgress || 0) < 100);
    } else if (activeTab === 'completed') {
      filtered = filtered.filter(s => s.enrollment && s.enrollment.paymentProgress === 100);
    }
    
    return filtered;
  }, [students, activeTab]);

  const columnDefs = useMemo<ColDef<Student>[]>(() => [
    {
      headerName: 'Estudiante',
      field: 'name',
      minWidth: 300,
      filter: 'agTextColumnFilter',
      cellRenderer: (params: ICellRendererParams<Student>) => {
        const student = params.data!;
        return (
          <div className="flex items-center py-2 w-full h-full">
            <div className="w-10 h-10 bg-gradient-to-r from-[#073372] to-[#17BC91] rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm font-semibold">
                {student.name.split(' ').map((n: string) => n[0]).join('')}
              </span>
            </div>
            <div className="ml-3">
              <div className="text-sm font-medium text-gray-900">{student.name}</div>
              <div className="text-xs text-gray-500">{student.email}</div>
            </div>
          </div>
        );
      }
    },
    {
      headerName: 'Código',
      field: 'enrollmentCode',
      width: 150,
      filter: 'agTextColumnFilter',
      cellRenderer: (params: ICellRendererParams<Student>) => (
        <div className="flex items-center h-full">
          <span className="text-sm font-mono text-gray-900">{params.value}</span>
        </div>
      )
    },
    {
      headerName: 'Plan',
      width: 200,
      filter: 'agTextColumnFilter',
      cellRenderer: (params: ICellRendererParams<Student>) => {
        const student = params.data!;
        return (
          <div className="flex items-center h-full">
            <span className="text-sm text-gray-900">
              {student.paymentPlan?.name || student.enrollment?.paymentPlan?.name || 'Sin plan'}
            </span>
          </div>
        );
      }
    },
    {
      headerName: 'Progreso de Pagos',
      width: 250,
      cellRenderer: (params: ICellRendererParams<Student>) => {
        const student = params.data!;
        const progress = student.enrollment?.paymentProgress || 0;
        return (
          <div className="flex flex-col justify-center h-full space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-600">
                {progress.toFixed(0)}% completado
              </span>
              <span className="text-xs text-gray-500">
                S/ {((student.enrollment?.totalPaid || 0) + (student.enrollment?.enrollment_fee || 0)).toFixed(2)}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  progress === 100 ? 'bg-[#17BC91]' : progress >= 50 ? 'bg-[#073372]' : 'bg-[#F98613]'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        );
      }
    },
    {
      headerName: 'Pendientes Pago',
      width: 140,
      cellRenderer: (params: ICellRendererParams<Student>) => {
        const student = params.data!;
        const pendingCount = student.enrollment?.installments?.filter(
          i => i.status === 'pending' || i.status === 'overdue'
        ).length || 0;
        return (
          <div className="flex items-center justify-center h-full">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
              pendingCount === 0 ? 'bg-[#17BC91]/10 text-[#17BC91] border border-[#17BC91]/30' : 'bg-[#F98613]/10 text-[#F98613] border border-[#F98613]/30'
            }`}>
              {pendingCount} {pendingCount === 1 ? 'cuota' : 'cuotas'}
            </span>
          </div>
        );
      }
    },
    {
      headerName: 'Por Verificar',
      width: 140,
      cellRenderer: (params: ICellRendererParams<Student>) => {
        const student = params.data!;
        const toVerifyCount = student.enrollment?.installments?.filter(
          i => i.status === 'paid'
        ).length || 0;
        return (
          <div className="flex items-center justify-center h-full">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
              toVerifyCount === 0 ? 'bg-gray-100 text-gray-600' : 'bg-[#073372]/10 text-[#073372] border border-[#073372]/30 animate-pulse'
            }`}>
              <Clock className="w-3 h-3 mr-1" />
              {toVerifyCount} {toVerifyCount === 1 ? 'voucher' : 'vouchers'}
            </span>
          </div>
        );
      }
    },
    {
      headerName: 'Acciones',
      width: 120,
      sortable: false,
      filter: false,
      cellRenderer: (params: ICellRendererParams<Student>) => {
        const student = params.data!;
        return (
          <div className="flex items-center justify-center space-x-2 h-full">
            <button
              onClick={() => handleViewSchedule(student)}
              className="inline-flex items-center px-3 py-1.5 bg-[#073372] hover:bg-[#17BC91] text-white text-sm font-medium rounded-lg transition-colors"
              title="Ver y verificar cronograma"
            >
              <Eye className="h-4 w-4 mr-1" />
              Ver
            </button>
          </div>
        );
      }
    }
  ], []);

  const verifiedStudents = students.filter(s => s.enrollmentVerified);
  const pendingPayments = verifiedStudents.filter(s => s.enrollment && (s.enrollment.paymentProgress || 0) < 100);
  const completedPayments = verifiedStudents.filter(s => s.enrollment && s.enrollment.paymentProgress === 100);

  return (
    <AuthenticatedLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Control de Pagos</h1>
            <p className="text-gray-600">Gestiona y verifica los pagos de estudiantes matriculados</p>
          </div>
        </div>

        {/* Barra de búsqueda */}
        <div className="relative">
          <Input
            type="text"
            label="Buscar por nombre, email, código, plan..."
            value={quickFilterText}
            onChange={(e) => setQuickFilterText(e.target.value)}
            icon={<Search className="w-4 h-4" />}
            className="pr-10"
          />
          {quickFilterText && (
            <button
              onClick={() => setQuickFilterText('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors z-20"
            >
              <XCircle className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Tabs de filtrado */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1 inline-flex">
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                activeTab === 'all'
                  ? 'bg-gradient-to-r from-[#073372] to-[#17BC91] text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <Users className="h-4 w-4" />
                <span>Todos</span>
                <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                  {verifiedStudents.length}
                </span>
              </div>
            </button>
            
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                activeTab === 'pending'
                  ? 'bg-gradient-to-r from-[#F98613] to-orange-500 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <AlertCircle className="h-4 w-4" />
                <span>Con Pagos Pendientes</span>
                <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                  {pendingPayments.length}
                </span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('completed')}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                activeTab === 'completed'
                  ? 'bg-gradient-to-r from-[#17BC91] to-teal-500 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <CheckCircle className="h-4 w-4" />
                <span>Pagos Completos</span>
                <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                  {completedPayments.length}
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Tabla AG Grid */}
        <div className="ag-theme-quartz" style={{ height: '600px', width: '100%' }}>
          <AgGridReact<Student>
            theme={themeQuartz}
            rowData={filteredStudents}
            columnDefs={columnDefs}
            quickFilterText={quickFilterText}
            defaultColDef={{
              sortable: true,
              filter: true,
              resizable: true,
              flex: 1,
              minWidth: 100,
            }}
            pagination={true}
            paginationPageSize={10}
            paginationPageSizeSelector={[10, 20, 50, 100]}
            rowSelection={{ mode: 'singleRow' }}
            animateRows={true}
            domLayout="normal"
            rowHeight={70}
            headerHeight={48}
            suppressCellFocus={true}
            rowClass="hover:bg-gray-50"
          />
        </div>
      </div>

      {showScheduleModal && selectedStudent && selectedStudent.enrollment && (
        <PaymentScheduleModal 
          student={selectedStudent} 
          enrollment={selectedStudent.enrollment}
          onClose={() => setShowScheduleModal(false)}
          onVerifyVoucher={handleVerifyVoucher}
          onViewInstallmentDetail={handleViewInstallmentDetail}
        />
      )}

      {showVoucherDetailModal && selectedInstallment && selectedStudent && (
        <VoucherDetailModal
          installment={selectedInstallment}
          student={selectedStudent}
          onClose={() => {
            setShowVoucherDetailModal(false);
            setSelectedInstallment(null);
          }}
          onVerifyVoucher={async (voucherId, action, rejectionReason) => {
            await handleVerifyVoucher(voucherId, action, rejectionReason);
            // Recargar el enrollment después de verificar
            const response = await axios.get(`/cashier/students/${selectedStudent.id}/enrollment`);
            if (response.data.success) {
              setSelectedStudent({
                ...selectedStudent,
                enrollment: response.data.enrollment
              });
              // Actualizar también el installment seleccionado
              const updatedInstallment = response.data.enrollment.installments?.find(
                (i: Installment) => i.id === selectedInstallment.id
              );
              if (updatedInstallment) {
                setSelectedInstallment(updatedInstallment);
              }
            }
          }}
        />
      )}
    </AuthenticatedLayout>
  );
};

export default CashierPaymentControl;
