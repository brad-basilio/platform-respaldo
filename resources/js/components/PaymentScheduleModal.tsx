import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, XCircle, Clock, AlertTriangle, Calendar, FileText, X } from 'lucide-react';
import { Enrollment, Installment } from '@/types/models';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import UploadVoucherModal from '@/components/UploadVoucherModal';
import { toast } from 'sonner';
import axios from 'axios';

interface PaymentScheduleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  studentName: string;
  userRole?: string;
}

export default function PaymentScheduleModal({
  open,
  onOpenChange,
  studentId,
  studentName,
  userRole = 'student',
}: PaymentScheduleModalProps) {
  const [loading, setLoading] = useState(false);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedInstallment, setSelectedInstallment] = useState<Installment | null>(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [verifyingInstallment, setVerifyingInstallment] = useState<string | null>(null);

  const loadEnrollment = useCallback(async () => {
    if (!studentId) return;
    
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/students/${studentId}/enrollment`);
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('Este estudiante no tiene una matrícula activa.');
        } else {
          throw new Error('Error al cargar el cronograma de pagos');
        }
        setEnrollment(null);
        return;
      }

      const data = await response.json();
      console.log('Enrollment data received:', data);
      setEnrollment(data.enrollment);
    } catch (err) {
      console.error('Error loading enrollment:', err);
      setError('Error al cargar el cronograma de pagos');
      setEnrollment(null);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    if (open && studentId) {
      loadEnrollment();
    } else if (!open) {
      setEnrollment(null);
      setError(null);
    }
  }, [open, studentId, loadEnrollment]);

  const handleUploadVoucher = (installment: Installment) => {
    setSelectedInstallment(installment);
    setUploadModalOpen(true);
  };

  const handleVoucherUploaded = () => {
    setUploadModalOpen(false);
    setSelectedInstallment(null);
    loadEnrollment();
  };

  const handleVerifyPayment = async (installment: Installment, verified: boolean) => {
    setVerifyingInstallment(installment.id.toString());
    
    try {
      await axios.post(`/api/installments/${installment.id}/verify`, {
        verified
      });
      
      toast.success(verified ? 'Pago verificado' : 'Verificación cancelada', {
        description: `Cuota #${installment.installment_number} ${verified ? 'aprobada' : 'rechazada'}`,
      });
      
      await loadEnrollment();
    } catch (error) {
      console.error('Error verifying payment:', error);
      toast.error('Error al verificar el pago');
    } finally {
      setVerifyingInstallment(null);
    }
  };

  const getStatusBadge = (installment: Installment) => {
    const status = installment.status;
    
    if (status === 'verified') {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" />
          Verificado
        </span>
      );
    }
    
    if (status === 'paid') {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Pendiente Verificación
        </span>
      );
    }
    
    if (status === 'overdue' || installment.isOverdue) {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          Vencido
        </span>
      );
    }
    
    if (status === 'cancelled') {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 flex items-center gap-1">
          <XCircle className="w-3 h-3" />
          Cancelado
        </span>
      );
    }
    
    return (
      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 flex items-center gap-1">
        <Clock className="w-3 h-3" />
        Pendiente
      </span>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), "d 'de' MMMM, yyyy", { locale: es });
    } catch {
      return dateString;
    }
  };

  const canUploadVoucher = (installment: Installment) => {
    return installment.status === 'pending' || installment.status === 'overdue';
  };

  // Construir URL pública para el voucher de forma robusta
  const getVoucherUrl = (voucher: any) => {
    if (!voucher) return null;

    // Posibles keys devueltas por el backend
    const candidate = voucher.voucher_url || voucher.voucherUrl || voucher.voucher_path || voucher.voucherPath || voucher.voucherPath;
    if (!candidate) return null;

    // Si ya es una URL pública o comienza con /storage o http, retornarla tal cual
    if (candidate.startsWith('/storage') || candidate.startsWith('http')) {
      return candidate;
    }

    // Si viene solo el nombre de archivo o la ruta relativa dentro de storage, asegurar prefijo
    // Si ya incluye "payment_vouchers/" no añadimos doble prefijo
    if (candidate.startsWith('payment_vouchers/')) {
      return `/storage/${candidate}`;
    }

    // Por defecto asumimos que es solo filename y está en payment_vouchers
    return `/storage/payment_vouchers/${candidate}`;
  };

  const isCashier = userRole === 'cashier' || userRole === 'admin';

  if (!open) return null;

  return (
    <>
      {/* Modal Overlay */}
      <div
        className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-sm animate-fade-in flex items-center justify-center p-4"
        onClick={() => onOpenChange(false)}
        style={{ height: '100vh', width: '100vw' }}
      >
        {/* Modal Container */}
        <div
          className="relative bg-white rounded-3xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col animate-scale-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="relative bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6 rounded-t-3xl flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-1">
                    Cronograma de Pagos
                  </h3>
                  <p className="text-blue-100">
                    {studentName}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="text-white/80 hover:text-white hover:bg-white/10 rounded-full p-2 transition-all duration-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-8 space-y-6 overflow-y-auto flex-1">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="w-12 h-12 animate-spin text-blue-600 mb-4" />
                <p className="text-gray-600">Cargando cronograma...</p>
              </div>
            ) : error ? (
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 text-center">
                <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-3" />
                <p className="text-red-800 font-semibold">{error}</p>
              </div>
            ) : enrollment ? (
              <>
                {/* Enrollment Summary */}
                <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-2xl p-6 border-2 border-blue-200 shadow-sm">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-xl p-4 border border-blue-100 shadow-sm">
                      <p className="text-xs font-medium text-gray-600 mb-1">Plan de Pago</p>
                      <p className="text-lg font-bold text-gray-900">{enrollment.paymentPlan?.name}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {enrollment.paymentPlan?.installments_count} cuotas
                      </p>
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-blue-100 shadow-sm">
                      <p className="text-xs font-medium text-gray-600 mb-1">Matrícula</p>
                      <p className="text-lg font-bold text-gray-900">{formatCurrency(enrollment.enrollment_fee || 0)}</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-green-100 shadow-sm">
                      <p className="text-xs font-medium text-gray-600 mb-1">Total Pagado</p>
                      <p className="text-lg font-bold text-green-600">
                        {formatCurrency(enrollment.totalPaid || 0)}
                      </p>
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-orange-100 shadow-sm">
                      <p className="text-xs font-medium text-gray-600 mb-1">Total Pendiente</p>
                      <p className="text-lg font-bold text-orange-600">
                        {formatCurrency(enrollment.totalPending || 0)}
                      </p>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  {enrollment.paymentProgress !== undefined && (
                    <div className="mt-6 bg-white rounded-xl p-4 border border-blue-100">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-600 font-medium">Progreso de Pagos</span>
                        <span className="text-blue-600 font-bold">{enrollment.paymentProgress.toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-500 shadow-sm"
                          style={{ width: `${enrollment.paymentProgress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Installments Table */}
                <div className="bg-white rounded-2xl border-2 border-gray-200 overflow-hidden shadow-sm">
                  <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b-2 border-gray-200">
                    <h4 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-gray-600" />
                      Detalle de Cuotas
                    </h4>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b-2 border-gray-200">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                            Cuota
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                            Fecha Vencimiento
                          </th>
                          <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                            Monto
                          </th>
                          <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                            Mora
                          </th>
                          <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                            Estado
                          </th>
                          <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                            Acción
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {enrollment.installments?.map((installment) => (
                          <tr 
                            key={installment.id}
                            className="hover:bg-blue-50 transition-colors"
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                                  <span className="text-sm font-bold text-blue-600">
                                    {installment.installment_number}
                                  </span>
                                </div>
                                <span className="text-sm font-medium text-gray-900">
                                  Cuota #{installment.installment_number}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm text-gray-900">
                                {formatDate(installment.due_date)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <span className="text-sm font-semibold text-gray-900">
                                {formatCurrency(installment.amount)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              {installment.late_fee > 0 ? (
                                <span className="text-sm font-semibold text-red-600">
                                  +{formatCurrency(installment.late_fee)}
                                </span>
                              ) : (
                                <span className="text-sm text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              {getStatusBadge(installment)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex flex-col items-center justify-center gap-2">
                                {/* Estado: VERIFIED - Cuota completada */}
                                {installment.status === 'verified' && (
                                  <>
                                    <span className="text-xs font-semibold text-green-600 flex items-center gap-1">
                                      <CheckCircle2 className="w-4 h-4" />
                                      Pago Verificado
                                    </span>
                                    {installment.vouchers && installment.vouchers.length > 0 && (() => {
                                      const url = getVoucherUrl(installment.vouchers[0]);
                                      return url ? (
                                        <a
                                          href={url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-blue-600 hover:text-blue-800 text-xs font-medium flex items-center gap-1"
                                        >
                                          <FileText className="w-3 h-3" />
                                          Ver Voucher
                                        </a>
                                      ) : null;
                                    })()}
                                  </>
                                )}

                                {/* Estado: PAID - Voucher subido, pendiente verificación del cajero */}
                                {installment.status === 'paid' && (
                                  <>
                                    {isCashier ? (
                                      /* Cajero ve botón para verificar */
                                      <>
                                        <button
                                          onClick={() => handleVerifyPayment(installment, true)}
                                          disabled={verifyingInstallment === installment.id.toString()}
                                          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-all disabled:opacity-50 flex items-center gap-2"
                                        >
                                          {verifyingInstallment === installment.id.toString() ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                          ) : (
                                            <CheckCircle2 className="w-4 h-4" />
                                          )}
                                          Verificar Pago
                                        </button>
                                        {installment.vouchers && installment.vouchers.length > 0 && (() => {
                                          const url = getVoucherUrl(installment.vouchers[0]);
                                          return url ? (
                                            <a
                                              href={url}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-blue-600 hover:text-blue-800 text-xs font-medium flex items-center gap-1"
                                            >
                                              <FileText className="w-3 h-3" />
                                              Ver Voucher
                                            </a>
                                          ) : null;
                                        })()}
                                      </>
                                    ) : (
                                      /* Asesor/Estudiante ve que está en revisión */
                                      <>
                                        <span className="text-xs text-blue-600 font-medium">
                                          En revisión por cajero
                                        </span>
                                        {installment.vouchers && installment.vouchers.length > 0 && (() => {
                                          const url = getVoucherUrl(installment.vouchers[0]);
                                          return url ? (
                                            <a
                                              href={url}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-blue-600 hover:text-blue-800 text-xs font-medium flex items-center gap-1"
                                            >
                                              <FileText className="w-3 h-3" />
                                              Ver Voucher
                                            </a>
                                          ) : null;
                                        })()}
                                      </>
                                    )}
                                  </>
                                )}

                                {/* Estado: PENDING u OVERDUE - Aún no se ha subido voucher */}
                                {(installment.status === 'pending' || installment.status === 'overdue') && (
                                  <>
                                    {!isCashier && canUploadVoucher(installment) && (
                                      <Button
                                        onClick={() => handleUploadVoucher(installment)}
                                        size="sm"
                                        className="bg-blue-600 hover:bg-blue-700"
                                      >
                                        Subir Voucher
                                      </Button>
                                    )}
                                    {isCashier && (
                                      <span className="text-xs text-gray-500">
                                        Esperando voucher
                                      </span>
                                    )}
                                  </>
                                )}

                                {/* Estado: CANCELLED */}
                                {installment.status === 'cancelled' && (
                                  <span className="text-xs text-gray-500">
                                    Cuota cancelada
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : null}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-8 py-6 rounded-b-3xl border-t-2 border-gray-200 flex-shrink-0">
            <div className="flex justify-end">
              <Button
                onClick={() => onOpenChange(false)}
                className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-xl"
              >
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Voucher Modal */}
      {selectedInstallment && (
        <UploadVoucherModal
          open={uploadModalOpen}
          onOpenChange={setUploadModalOpen}
          installment={selectedInstallment}
          onVoucherUploaded={handleVoucherUploaded}
        />
      )}
    </>
  );
}
