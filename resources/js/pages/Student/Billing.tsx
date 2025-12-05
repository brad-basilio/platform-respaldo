import React, { useState, useEffect } from 'react';
import { FileText, Download, Calendar, DollarSign, CheckCircle, Clock } from 'lucide-react';
import axios from 'axios';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';

interface Invoice {
  id: string;
  voucherId: string;
  installmentNumber: number;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  status: string;
  receiptUrl: string | null;
}

const Billing: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/student/enrollment');
      
      const enrollment = response.data.enrollment;
      if (enrollment && enrollment.installments) {
        // Extraer vouchers aprobados de todas las cuotas
        const approvedVouchers: Invoice[] = [];
        
        enrollment.installments.forEach((inst: any) => {
          if (inst.vouchers && inst.vouchers.length > 0) {
            inst.vouchers.forEach((voucher: any) => {
              if (voucher.status === 'approved') {
                approvedVouchers.push({
                  id: voucher.id,
                  voucherId: voucher.id,
                  installmentNumber: inst.installmentNumber,
                  amount: voucher.declaredAmount,
                  paymentDate: voucher.paymentDate,
                  paymentMethod: voucher.paymentMethod,
                  status: voucher.status,
                  receiptUrl: voucher.receiptUrl || null,
                });
              }
            });
          }
        });
        
        setInvoices(approvedVouchers);
      }
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
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

  const getPaymentMethodLabel = (method: string) => {
    const methods: Record<string, string> = {
      'card': 'Tarjeta de Crédito',
      'transfer': 'Transferencia Bancaria',
      'cash': 'Efectivo',
      'yape': 'Yape',
      'deposit': 'Depósito',
    };
    return methods[method] || method;
  };

  if (loading) {
    return (
      <AuthenticatedLayout>
        <Head title="Mi Facturación" />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-600">Cargando historial de pagos...</p>
          </div>
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout>
      <Head title="Mi Facturación" />
      
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Mi Facturación</h1>
          <p className="text-slate-600 mt-1">Historial de pagos y comprobantes</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <FileText className="w-8 h-8 text-[#073372]" />
            </div>
            <p className="text-sm text-slate-600 mb-1">Total de Pagos</p>
            <p className="text-2xl font-bold text-slate-900">{invoices.length}</p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-8 h-8 text-[#17BC91]" />
            </div>
            <p className="text-sm text-slate-600 mb-1">Total Pagado</p>
            <p className="text-2xl font-bold text-slate-900">
              {formatCurrency(invoices.reduce((sum, inv) => sum + inv.amount, 0))}
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <p className="text-sm text-slate-600 mb-1">Último Pago</p>
            <p className="text-lg font-bold text-slate-900">
              {invoices.length > 0 
                ? formatDate(invoices[invoices.length - 1].paymentDate)
                : '-'}
            </p>
          </div>
        </div>

        {/* Invoices List */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-xl font-bold text-slate-900">Historial de Comprobantes</h2>
            <p className="text-sm text-slate-600 mt-1">Todos tus pagos verificados y aprobados</p>
          </div>

          {invoices.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600">No tienes pagos registrados aún</p>
              <p className="text-sm text-slate-500 mt-2">Tus pagos aprobados aparecerán aquí</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {invoices.map((invoice) => (
                <div key={invoice.id} className="p-6 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      {/* Icon */}
                      <div className="p-3 rounded-xl bg-gradient-to-br from-[#073372] to-[#17BC91] flex-shrink-0">
                        <FileText className="w-6 h-6 text-white" />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-slate-900">
                            Cuota #{invoice.installmentNumber}
                          </h3>
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Pagado
                          </span>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-slate-500 mb-1">Monto</p>
                            <p className="font-bold text-slate-900">{formatCurrency(invoice.amount)}</p>
                          </div>

                          <div>
                            <p className="text-slate-500 mb-1">Fecha de Pago</p>
                            <p className="font-medium text-slate-900 flex items-center">
                              <Calendar className="w-4 h-4 mr-1 text-blue-600" />
                              {formatDate(invoice.paymentDate)}
                            </p>
                          </div>

                          <div>
                            <p className="text-slate-500 mb-1">Método de Pago</p>
                            <p className="font-medium text-slate-900">
                              {getPaymentMethodLabel(invoice.paymentMethod)}
                            </p>
                          </div>

                          <div>
                            <p className="text-slate-500 mb-1">Estado</p>
                            <p className="font-medium text-green-600">Verificado</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2 ml-4">
                      {invoice.receiptUrl && (
                        <a
                          href={invoice.receiptUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-3 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors"
                          title="Descargar comprobante"
                        >
                          <Download className="w-5 h-5" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AuthenticatedLayout>
  );
};

export default Billing;
