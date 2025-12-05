import React, { useState, useEffect } from 'react';
import { FileText, Calendar, DollarSign, TrendingUp, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import axios from 'axios';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';

interface PaymentPlan {
  id: string;
  name: string;
  totalAmount: number;
  installmentsCount: number;
  monthlyAmount: number;
  gracePeriodDays: number;
}

interface Enrollment {
  id: string;
  enrollmentDate: string;
  status: string;
  paymentProgress: number;
  totalPaid: number;
  totalPending: number;
  paymentPlan: PaymentPlan;
  installments: any[];
}

const MyPlan: React.FC = () => {
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEnrollment();
  }, []);

  const fetchEnrollment = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/student/enrollment');
      setEnrollment(response.data.enrollment);
    } catch (error) {
      console.error('Error fetching enrollment:', error);
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

  if (loading) {
    return (
      <AuthenticatedLayout>
        <Head title="Mi Plan" />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-600">Cargando información del plan...</p>
          </div>
        </div>
      </AuthenticatedLayout>
    );
  }

  if (!enrollment) {
    return (
      <AuthenticatedLayout>
        <Head title="Mi Plan" />
        <div className="p-8 max-w-7xl mx-auto">
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6 text-center">
            <AlertCircle className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No tienes un plan activo</h3>
            <p className="text-slate-600">Contacta con el área de admisiones para más información.</p>
          </div>
        </div>
      </AuthenticatedLayout>
    );
  }

  const paidInstallments = enrollment.installments.filter(inst => inst.status === 'paid' || inst.status === 'verified').length;
  const pendingInstallments = enrollment.installments.filter(inst => inst.status === 'pending' || inst.status === 'late').length;

  return (
    <AuthenticatedLayout>
      <Head title="Mi Plan" />
      
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Mi Plan de Pago</h1>
          <p className="text-slate-600 mt-1">Detalles de tu suscripción y plan escogido</p>
        </div>

        {/* Plan Details Card */}
        <div className="bg-gradient-to-br from-[#073372] to-[#17BC91] text-white rounded-3xl shadow-2xl p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-white/80 text-sm mb-2">Plan Actual</p>
              <h2 className="text-3xl font-bold">{enrollment.paymentPlan.name}</h2>
            </div>
            <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-sm">
              <FileText className="w-10 h-10" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
              <p className="text-white/80 text-sm mb-1">Inversión Total</p>
              <p className="text-2xl font-bold">{formatCurrency(enrollment.paymentPlan.totalAmount)}</p>
            </div>

            <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
              <p className="text-white/80 text-sm mb-1">Número de Cuotas</p>
              <p className="text-2xl font-bold">{enrollment.paymentPlan.installmentsCount} mensuales</p>
            </div>

            <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
              <p className="text-white/80 text-sm mb-1">Monto por Cuota</p>
              <p className="text-2xl font-bold">{formatCurrency(enrollment.paymentPlan.monthlyAmount)}</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-white/90">Progreso de Pagos</span>
              <span className="text-sm font-bold">{enrollment.paymentProgress.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
              <div 
                className="bg-white h-3 rounded-full transition-all duration-500 shadow-lg"
                style={{ width: `${enrollment.paymentProgress}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-8 h-8 text-[#17BC91]" />
            </div>
            <p className="text-sm text-slate-600 mb-1">Total Pagado</p>
            <p className="text-2xl font-bold text-slate-900">{formatCurrency(enrollment.totalPaid)}</p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-8 h-8 text-[#F98613]" />
            </div>
            <p className="text-sm text-slate-600 mb-1">Saldo Pendiente</p>
            <p className="text-2xl font-bold text-slate-900">{formatCurrency(enrollment.totalPending)}</p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <p className="text-sm text-slate-600 mb-1">Cuotas Pagadas</p>
            <p className="text-2xl font-bold text-slate-900">{paidInstallments} / {enrollment.paymentPlan.installmentsCount}</p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-8 h-8 text-blue-600" />
            </div>
            <p className="text-sm text-slate-600 mb-1">Cuotas Pendientes</p>
            <p className="text-2xl font-bold text-slate-900">{pendingInstallments}</p>
          </div>
        </div>

        {/* Additional Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-[#073372]" />
              Información de Matrícula
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-600">Fecha de Matrícula</span>
                <span className="font-semibold text-slate-900">{formatDate(enrollment.enrollmentDate)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-600">Estado de Matrícula</span>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  {enrollment.status === 'active' ? 'Activo' : enrollment.status}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-600">ID de Matrícula</span>
                <span className="font-mono text-sm font-semibold text-slate-900">{enrollment.id}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center">
              <FileText className="w-5 h-5 mr-2 text-[#073372]" />
              Beneficios del Plan
            </h3>
            <ul className="space-y-3">
              <li className="flex items-start">
                <CheckCircle className="w-5 h-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                <span className="text-slate-700">
                  Periodo de gracia de {enrollment.paymentPlan.gracePeriodDays} días para cada cuota
                </span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="w-5 h-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                <span className="text-slate-700">
                  Pagos flexibles mediante Yape, transferencia o tarjeta
                </span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="w-5 h-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                <span className="text-slate-700">
                  Posibilidad de pagos parciales aplicados al total
                </span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="w-5 h-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                <span className="text-slate-700">
                  Comprobantes digitales de cada pago realizado
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-blue-100 rounded-xl">
              <AlertCircle className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-blue-900 mb-2">¿Necesitas cambiar tu plan?</h3>
              <p className="text-sm text-blue-800">
                Si necesitas modificar tu plan de pago actual, dirígete a la sección de "Control de Pagos" 
                donde encontrarás la opción para solicitar un cambio de plan si cumples con los requisitos.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
};

export default MyPlan;
