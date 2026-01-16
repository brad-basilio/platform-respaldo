import React, { useState, useEffect } from 'react';
import { FileText, CheckCircle2, XCircle, Loader2, Eye, Calendar, CreditCard, User, AlertCircle } from 'lucide-react';
import AuthenticatedLayout from '../../layouts/AuthenticatedLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { InstallmentVoucher } from '@/types/models';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

export default function VoucherVerification() {
  const [vouchers, setVouchers] = useState<InstallmentVoucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVoucher, setSelectedVoucher] = useState<InstallmentVoucher | null>(null);
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadPendingVouchers();
  }, []);

  const loadPendingVouchers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/vouchers/pending');
      if (!response.ok) {
        throw new Error('Error al cargar vouchers pendientes');
      }
      const data = await response.json();
      setVouchers(data.data || []);
    } catch (error) {
      console.error('Error loading vouchers:', error);
      toast.error('Error al cargar vouchers pendientes');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedVoucher) return;

    setProcessing(true);
    try {
      const response = await fetch(`/api/vouchers/${selectedVoucher.id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al aprobar voucher');
      }

      toast.success('Voucher aprobado exitosamente');
      setActionModalOpen(false);
      setSelectedVoucher(null);
      loadPendingVouchers();
    } catch (error) {
      console.error('Error approving voucher:', error);
      toast.error(error instanceof Error ? error.message : 'Error al aprobar voucher');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedVoucher || !rejectionReason.trim()) {
      toast.error('Debes proporcionar un motivo de rechazo');
      return;
    }

    setProcessing(true);
    try {
      const response = await fetch(`/api/vouchers/${selectedVoucher.id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
        },
        body: JSON.stringify({ rejection_reason: rejectionReason }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al rechazar voucher');
      }

      toast.success('Voucher rechazado');
      setActionModalOpen(false);
      setSelectedVoucher(null);
      setRejectionReason('');
      loadPendingVouchers();
    } catch (error) {
      console.error('Error rejecting voucher:', error);
      toast.error(error instanceof Error ? error.message : 'Error al rechazar voucher');
    } finally {
      setProcessing(false);
    }
  };

  const openActionModal = (voucher: InstallmentVoucher, action: 'approve' | 'reject') => {
    setSelectedVoucher(voucher);
    setActionType(action);
    setActionModalOpen(true);
  };

  const closeActionModal = () => {
    setActionModalOpen(false);
    setSelectedVoucher(null);
    setRejectionReason('');
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

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      cash: 'Efectivo',
      transfer: 'Transferencia',
      deposit: 'Depósito',
      card: 'Tarjeta',
    };
    return labels[method] || method;
  };

  return (
    <AuthenticatedLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Verificación de Vouchers</h1>
            <p className="text-gray-600">Revisa y aprueba los vouchers de pago de cuotas</p>
          </div>
          <Button onClick={loadPendingVouchers} variant="outline">
            <Loader2 className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Vouchers Pendientes</p>
                <p className="text-2xl font-bold text-blue-700">{vouchers.length}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-500" />
            </div>
          </div>
        </div>

        {/* Vouchers List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : vouchers.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              ¡Todo al día!
            </h3>
            <p className="text-gray-600">
              No hay vouchers pendientes de verificación en este momento.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Aprendiz</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Cuota</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Fecha de Pago</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Monto Declarado</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Método</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Subido Por</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {vouchers.map((voucher) => (
                    <tr key={voucher.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <span className="text-sm font-medium">
                            {voucher.installment?.enrollment?.student?.name || 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm">
                          <p className="font-medium">Cuota {voucher.installment?.installment_number}</p>
                          <p className="text-xs text-gray-500">
                            Vence: {voucher.installment?.due_date ? formatDate(voucher.installment.due_date) : 'N/A'}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-gray-400" />
                          {formatDate(voucher.payment_date)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <p className="text-sm font-semibold">{formatCurrency(voucher.declared_amount)}</p>
                        {voucher.installment?.totalDue && voucher.declared_amount !== voucher.installment.totalDue && (
                          <p className="text-xs text-orange-600">
                            Esperado: {formatCurrency(voucher.installment.totalDue)}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-xs">
                          <CreditCard className="w-3 h-3 mr-1" />
                          {getPaymentMethodLabel(voucher.payment_method)}
                        </Badge>
                        {voucher.transaction_reference && (
                          <p className="text-xs text-gray-500 mt-1">
                            Op: {voucher.transaction_reference}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {voucher.uploadedBy?.name || 'N/A'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(`/api/vouchers/${voucher.id}`, '_blank')}
                          >
                            <Eye className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => openActionModal(voucher, 'approve')}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Aprobar
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => openActionModal(voucher, 'reject')}
                            variant="destructive"
                          >
                            <XCircle className="w-3 h-3 mr-1" />
                            Rechazar
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Action Modal */}
      {selectedVoucher && (
        <Dialog open={actionModalOpen} onOpenChange={closeActionModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {actionType === 'approve' ? 'Aprobar Voucher' : 'Rechazar Voucher'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/* Voucher Details */}
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Aprendiz:</p>
                    <p className="font-semibold">
                      {selectedVoucher.installment?.enrollment?.student?.name || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Cuota:</p>
                    <p className="font-semibold">Cuota {selectedVoucher.installment?.installment_number}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Monto Declarado:</p>
                    <p className="font-semibold text-lg text-blue-600">
                      {formatCurrency(selectedVoucher.declared_amount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Monto a Pagar:</p>
                    <p className="font-semibold text-lg">
                      {selectedVoucher.installment?.totalDue
                        ? formatCurrency(selectedVoucher.installment.totalDue)
                        : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Método de Pago:</p>
                    <p className="font-semibold">{getPaymentMethodLabel(selectedVoucher.payment_method)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Fecha de Pago:</p>
                    <p className="font-semibold">{formatDate(selectedVoucher.payment_date)}</p>
                  </div>
                </div>
                {selectedVoucher.transaction_reference && (
                  <div className="pt-2 border-t border-gray-200">
                    <p className="text-gray-600 text-sm">N° de Operación:</p>
                    <p className="font-semibold">{selectedVoucher.transaction_reference}</p>
                  </div>
                )}
              </div>

              {/* Amount Mismatch Warning */}
              {selectedVoucher.installment?.totalDue &&
                selectedVoucher.declared_amount !== selectedVoucher.installment.totalDue && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      El monto declarado ({formatCurrency(selectedVoucher.declared_amount)}) no coincide con el
                      monto esperado ({formatCurrency(selectedVoucher.installment.totalDue)}).
                    </AlertDescription>
                  </Alert>
                )}

              {/* Rejection Reason */}
              {actionType === 'reject' && (
                <div className="space-y-2">
                  <label htmlFor="rejection_reason" className="text-sm font-semibold text-gray-700">
                    Motivo del Rechazo *
                  </label>
                  <Textarea
                    id="rejection_reason"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Explica por qué se rechaza este voucher..."
                    rows={4}
                    required
                  />
                </div>
              )}

              {/* Voucher Preview Button */}
              <Button
                variant="outline"
                className="w-full"
                onClick={() => window.open(`/api/vouchers/${selectedVoucher.id}`, '_blank')}
              >
                <Eye className="w-4 h-4 mr-2" />
                Ver Voucher en Nueva Pestaña
              </Button>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={closeActionModal} disabled={processing}>
                Cancelar
              </Button>
              {actionType === 'approve' ? (
                <Button
                  onClick={handleApprove}
                  disabled={processing}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {processing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Aprobando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Confirmar Aprobación
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={handleReject}
                  disabled={processing || !rejectionReason.trim()}
                  variant="destructive"
                >
                  {processing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Rechazando...
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 mr-2" />
                      Confirmar Rechazo
                    </>
                  )}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </AuthenticatedLayout>
  );
}
