import React, { useState, useEffect } from 'react';
import {
  BookOpen, FileText,
  Award, Clock, Trophy, AlertTriangle, CheckCircle2,
  CreditCard, TrendingUp, Calendar, AlertCircle, FileCheck, X, AlertOctagon, Video
} from 'lucide-react';
import { RiUserStarLine, RiVideoLine } from 'react-icons/ri';
import { Student } from '@/types/models';

// Colores institucionales UNCED
const COLORS = {
  catalina: '#073372',    // Catalina Blue
  pradera: '#17BC91',     // Pradera de montaña
  beer: '#F98613',        // Beer Orange
};

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  points: number;
}

interface PaymentStats {
  totalInstallments: number;
  paidInstallments: number;
  verifiedInstallments?: number;
  inVerificationInstallments?: number;
  pendingInstallments: number;
  overdueInstallments: number;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  nextPayment: {
    amount: number;
    due_date: string;
    installment_number: number;
    has_late_fee?: boolean;
    late_fee?: number;
    days_until_due?: number;
    days_until_grace_limit?: number;
    grace_period_days?: number;
    is_in_grace_period?: boolean;
    is_overdue?: boolean;
  } | null;
  paymentProgress: number;
}

interface StudentDashboardProps {
  student: Student & {
    paymentStats?: PaymentStats;
    hasPendingDocuments?: boolean;
    nextSession?: {
      id: number;
      title: string;
      session_number: string;
      type: 'regular' | 'practice';
      scheduled_at: string;
      meet_url?: string;
      teacher_name?: string;
      status: string;
      is_today: boolean;
    } | null;
  };
}

const StudentDashboard: React.FC<StudentDashboardProps> = ({ student }) => {
  // Estado para controlar si el banner de verificación ya fue visto
  const [showVerifiedBanner, setShowVerifiedBanner] = useState(false);

  useEffect(() => {
    // Solo mostrar el banner si está verificado Y no lo ha cerrado antes
    if (student.enrollmentVerified && student.prospectStatus === 'matriculado') {
      const bannerKey = `verified_banner_seen_${student.id || student.name}`;
      const hasSeenBanner = localStorage.getItem(bannerKey);
      if (!hasSeenBanner) {
        setShowVerifiedBanner(true);
      }
    }
  }, [student.enrollmentVerified, student.prospectStatus, student.id, student.name]);

  const handleDismissVerifiedBanner = () => {
    const bannerKey = `verified_banner_seen_${student.id || student.name}`;
    localStorage.setItem(bannerKey, 'true');
    setShowVerifiedBanner(false);
  };

  // Verificar si hay cuotas vencidas
  const hasOverdueInstallments = student.paymentStats && student.paymentStats.overdueInstallments > 0;

  // KPI Cards para el dashboard
  const paymentKPIs = student.paymentStats ? [
    {
      label: 'Cuotas Pagadas',
      value: `${student.paymentStats.paidInstallments}/${student.paymentStats.totalInstallments}`,
      icon: CheckCircle2,
      color: COLORS.pradera,
      description: 'Cuotas completadas'
    },
    {
      label: 'Cuotas Pendientes',
      value: student.paymentStats.pendingInstallments,
      icon: Clock,
      color: COLORS.beer,
      description: 'Por pagar',
      percentage: student.paymentStats.overdueInstallments > 0 ? student.paymentStats.overdueInstallments : undefined
    },
    {
      label: 'Progreso de Pago',
      value: `${student.paymentStats.paymentProgress.toFixed(2)}%`,
      icon: TrendingUp,
      color: COLORS.catalina,
      description: 'Del total'
    },
    {
      label: 'Próximo Pago',
      value: student.paymentStats.nextPayment
        ? `S/ ${(student.paymentStats.nextPayment.amount || 0).toFixed(2)}`
        : 'Ninguno',
      icon: Calendar,
      color: student.paymentStats.nextPayment ? COLORS.beer : '#6b7280',
      description: student.paymentStats.nextPayment
        ? new Date(student.paymentStats.nextPayment.due_date).toLocaleDateString('es-PE')
        : 'Sin pagos pendientes'
    },
  ] : [];

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-[1600px] mx-auto bg-gray-50">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">
              Panel de Aprendiz
            </h1>
            <p className="text-gray-500">
              Bienvenido, <span className="font-semibold text-gray-700">{student.name}</span>
            </p>
            <p className="text-sm text-gray-400 mt-1">
              Nivel: {student.academicLevel?.name || 'No asignado'}
            </p>
          </div>
        </div>
      </div>

      {/* Banner de Documentos Pendientes */}
      {student.hasPendingDocuments && (
        <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border-2 border-blue-400 rounded-2xl p-6 shadow-lg animate-pulse">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <FileCheck className="h-8 w-8 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                📄 Tienes Documentos Pendientes de Confirmar
              </h3>
              <p className="text-slate-700 mb-3">
                El equipo administrativo te ha enviado documentos que requieren tu confirmación.
                Por favor revísalos y confírmalos para completar tu proceso de matrícula.
              </p>
              <a
                href="/student/payment-control"
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                <FileCheck className="h-4 w-4" />
                Ver Documentos Pendientes
              </a>
            </div>
          </div>
        </div>
      )}

      {/* 🚨 Banner URGENTE de Cuotas Vencidas */}
      {hasOverdueInstallments && student.paymentStats && (
        <div className="bg-gradient-to-r from-red-50 via-red-100 to-orange-50 border-2 border-red-500 rounded-2xl p-6 shadow-lg relative overflow-hidden">
          {/* Efecto de urgencia */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full -mr-16 -mt-16" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-orange-500/10 rounded-full -ml-12 -mb-12" />
          
          <div className="flex items-start space-x-4 relative z-10">
            <div className="flex-shrink-0">
              <div className="relative">
                <AlertOctagon className="h-10 w-10 text-red-600" />
                <span className="absolute -top-1 -right-1 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-white text-[10px] font-bold items-center justify-center">
                    {student.paymentStats.overdueInstallments}
                  </span>
                </span>
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-red-900 mb-2">
                🚨 Tienes {student.paymentStats.overdueInstallments} Cuota{student.paymentStats.overdueInstallments > 1 ? 's' : ''} Vencida{student.paymentStats.overdueInstallments > 1 ? 's' : ''}
              </h3>
              <p className="text-red-800 mb-3">
                {student.paymentStats.nextPayment?.is_in_grace_period 
                  ? '¡Aún estás a tiempo! Tu cuota está en período de gracia. Paga ahora para evitar recargos por mora.'
                  : 'Tu cuota ha superado el período de gracia y se han aplicado recargos por mora. Te recomendamos regularizar tu situación lo antes posible.'
                }
              </p>
              
              {student.paymentStats.nextPayment && (
                <div className="bg-white/80 rounded-lg p-4 border border-red-200 mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-red-700 font-medium">Cuota #{student.paymentStats.nextPayment.installment_number}</p>
                      <p className="text-2xl font-black text-red-900">
                        S/ {(student.paymentStats.nextPayment.amount || 0).toFixed(2)}
                        {student.paymentStats.nextPayment.has_late_fee && student.paymentStats.nextPayment.late_fee && (
                          <span className="text-sm font-normal text-red-600 ml-2">
                            (incluye S/ {student.paymentStats.nextPayment.late_fee.toFixed(2)} de mora)
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-red-600">Venció el</p>
                      <p className="text-lg font-bold text-red-800">
                        {new Date(student.paymentStats.nextPayment.due_date).toLocaleDateString('es-PE', {
                          day: '2-digit',
                          month: 'short'
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <a
                href="/student/payment-control"
                className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <CreditCard className="h-5 w-5" />
                Pagar Ahora
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Banner de Matrícula Pendiente de Verificación */}
      {!student.enrollmentVerified && student.prospectStatus === 'matriculado' && (
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-400 rounded-2xl p-6 shadow-lg">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                ⏳ Tu Matrícula está en Proceso de Verificación
              </h3>
              <p className="text-slate-700 mb-3">
                Tu matrícula ha sido registrada exitosamente. Nuestro equipo de verificación está revisando tu información
                y <strong>pronto recibirás una llamada</strong> para corroborar tus datos y completar el proceso.
              </p>
              <div className="bg-white/60 rounded-lg p-4 border border-yellow-300">
                <p className="text-sm text-slate-700 mb-2">
                  <strong>📞 ¿Qué sigue?</strong>
                </p>
                <ul className="text-sm text-slate-600 space-y-1 ml-4 list-disc">
                  <li>Recibirás una llamada de nuestro equipo de verificación</li>
                  <li>Se te enviarán documentos para tu firma digital</li>
                  <li>Una vez confirmados, tendrás acceso completo a la plataforma</li>
                </ul>
              </div>
              <div className="flex items-center space-x-2 text-sm text-slate-600 mt-3">
                <Clock className="h-4 w-4" />
                <span>Estado: <strong className="text-yellow-700">Pendiente de verificación</strong></span>
              </div>
              {student.enrollmentDate && (
                <div className="text-xs text-slate-500 mt-2">
                  Fecha de matrícula: {new Date(student.enrollmentDate).toLocaleDateString('es-PE', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Banner de Matrícula Verificada - Solo se muestra una vez */}
      {showVerifiedBanner && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-400 rounded-2xl p-6 shadow-lg relative">
          {/* Botón para cerrar */}
          <button
            onClick={handleDismissVerifiedBanner}
            className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-green-200/50 transition-colors text-green-600 hover:text-green-800"
            title="Cerrar y no mostrar de nuevo"
          >
            <X className="h-5 w-5" />
          </button>
          
          <div className="flex items-start space-x-4 pr-8">
            <div className="flex-shrink-0">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                ✅ ¡Felicitaciones! Tu Matrícula ha sido Verificada
              </h3>
              <p className="text-slate-700">
                Ya puedes acceder a todas las funciones de la plataforma. ¡Bienvenido al programa!
              </p>
              {student.verifiedEnrollmentBy && (
                <div className="mt-2 text-sm text-slate-600">
                  Verificado por: <strong>{student.verifiedEnrollmentBy.name}</strong>
                  {student.enrollmentVerifiedAt && (
                    <span className="ml-2 text-xs text-slate-500">
                      el {new Date(student.enrollmentVerifiedAt).toLocaleDateString('es-PE', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 🚀 PRÓXIMA CLASE / PRÁCTICA - ACCESO RÁPIDO */}
      {student.nextSession && (
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border-2 border-[#17BC91]/20 group hover:border-[#17BC91]/40 transition-all duration-300">
          <div className="flex flex-col md:flex-row">
            {/* Indicador de Fecha/Hora */}
            <div className="bg-gradient-to-br from-[#073372] to-[#17BC91] p-6 text-white flex flex-col items-center justify-center min-w-[180px]">
              <Calendar className="w-8 h-8 mb-2 opacity-80" />
              <span className="text-sm font-bold uppercase tracking-widest opacity-80">
                {student.nextSession.is_today ? 'Hoy' : new Date(student.nextSession.scheduled_at).toLocaleDateString('es-PE', { weekday: 'long' })}
              </span>
              <span className="text-2xl font-black mt-1">
                {new Date(student.nextSession.scheduled_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            {/* Contenido de la Clase */}
            <div className="flex-1 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter ${
                    student.nextSession.type === 'practice' 
                    ? 'bg-cyan-100 text-cyan-700 border border-cyan-200' 
                    : 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                  }`}>
                    {student.nextSession.type === 'practice' ? 'Sesión Práctica' : 'Clase Teórica'}
                  </span>
                  {student.nextSession.status === 'in_progress' && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 animate-pulse bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
                      <span className="w-1.5 h-1.5 bg-red-600 rounded-full" />
                      EN CURSO
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-black text-gray-900 leading-tight">
                  Sesión {student.nextSession.session_number}: {student.nextSession.title}
                </h2>
                {student.nextSession.teacher_name && (
                  <p className="text-gray-500 text-sm flex items-center gap-1.5">
                    <RiUserStarLine className="w-4 h-4 text-[#17BC91]" />
                    Instructor: <span className="font-semibold text-gray-700">{student.nextSession.teacher_name}</span>
                  </p>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                <a 
                  href="/student/my-classes"
                  className="flex items-center justify-center gap-2 text-sm font-bold text-[#073372] hover:text-[#052555] px-4 py-2 rounded-xl transition-colors bg-gray-50 border border-gray-200"
                >
                  Ver mis clases
                </a>
                {student.nextSession.meet_url ? (
                  <button 
                    onClick={() => window.open(student.nextSession?.meet_url, '_blank')}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-[#17BC91] hover:bg-[#14a77f] text-white font-black px-8 py-4 rounded-xl shadow-lg shadow-[#17BC91]/20 transition-all hover:-translate-y-1 active:scale-95"
                  >
                    <RiVideoLine className="w-5 h-5 animate-pulse" />
                    ENTRAR AHORA
                  </button>
                ) : (
                  <div className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-gray-100 text-gray-400 px-8 py-4 rounded-xl border border-gray-200 cursor-not-allowed italic text-sm">
                    Link pronto...
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards de Pagos */}
      {student.paymentStats && student.paymentStats.totalInstallments > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {paymentKPIs.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 relative overflow-hidden"
                style={{ backgroundColor: `${card.color}03` }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div
                    className="p-3 rounded-lg"
                    style={{ backgroundColor: `${card.color}15` }}
                  >
                    <Icon className="h-6 w-6" style={{ color: card.color }} />
                  </div>
                  {card.percentage && (
                    <div
                      className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-white"
                      style={{ backgroundColor: card.color }}
                    >
                      {card.percentage} Vencidas
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <p className="text-4xl font-black text-gray-900">{card.value}</p>
                  <p className="text-sm font-bold text-gray-700 mt-2">{card.label}</p>
                  <p className="text-xs text-gray-500">{card.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Resumen de Pagos */}
      {student.paymentStats && student.paymentStats.totalInstallments > 0 && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Estado de Pagos
                </h2>
                <p className="text-sm text-gray-500 mt-1">Resumen de tu plan de pagos</p>
              </div>
              <CreditCard className="h-6 w-6" style={{ color: COLORS.catalina }} />
            </div>
          </div>

          {/* Barra de Progreso */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-700">Progreso de Pago</span>
              <span className="text-lg font-bold" style={{ color: COLORS.pradera }}>
                {student.paymentStats.paymentProgress.toFixed(2)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${student.paymentStats.paymentProgress}%`,
                  backgroundColor: COLORS.pradera
                }}
              />
            </div>
          </div>

          {/* Totales */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-xl p-5 shadow-md" style={{ backgroundColor: `${COLORS.pradera}08` }}>
              <p className="text-xs font-bold text-gray-600 mb-2">TOTAL PAGADO</p>
              <p className="text-3xl font-black" style={{ color: COLORS.pradera }}>
                S/ {(student.paymentStats.paidAmount || 0).toFixed(2)}
              </p>
            </div>
            <div className="rounded-xl p-5 shadow-md" style={{ backgroundColor: `${COLORS.beer}08` }}>
              <p className="text-xs font-bold text-gray-600 mb-2">TOTAL PENDIENTE</p>
              <p className="text-3xl font-black" style={{ color: COLORS.beer }}>
                S/ {(student.paymentStats.pendingAmount || 0).toFixed(2)}
              </p>
            </div>
            <div className="rounded-xl p-5 shadow-md" style={{ backgroundColor: `${COLORS.catalina}08` }}>
              <p className="text-xs font-bold text-gray-600 mb-2">TOTAL A PAGAR</p>
              <p className="text-3xl font-black" style={{ color: COLORS.catalina }}>
                S/ {(student.paymentStats.totalAmount || 0).toFixed(2)}
              </p>
            </div>
          </div>

          {/* Próximo Pago */}
          {student.paymentStats.nextPayment && (
            <div className={`mt-6 p-5 rounded-xl border-2 ${student.paymentStats.nextPayment.is_overdue && !student.paymentStats.nextPayment.is_in_grace_period
              ? 'bg-gradient-to-r from-red-50 to-red-100 border-red-300'
              : student.paymentStats.nextPayment.is_in_grace_period
                ? 'bg-gradient-to-r from-orange-50 to-yellow-50 border-orange-300'
                : 'bg-gradient-to-r from-orange-50 to-yellow-50 border-orange-200'
              }`}>
              {/* Alerta de período de gracia */}
              {student.paymentStats.nextPayment.is_in_grace_period && student.paymentStats.nextPayment.days_until_grace_limit !== undefined && (
                <div className="mb-3 p-3 bg-orange-100 border border-orange-300 rounded-lg">
                  <p className="text-sm text-orange-900 font-bold flex items-center">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    ⚠️ Cuota vencida - Período de Gracia
                  </p>
                  <p className="text-xs text-orange-800 mt-1">
                    Esta cuota venció el {new Date(student.paymentStats.nextPayment.due_date).toLocaleDateString('es-PE')},
                    pero aún tienes <strong>{student.paymentStats.nextPayment.days_until_grace_limit} días de gracia</strong>
                    {student.paymentStats.nextPayment.grace_period_days && ` (de ${student.paymentStats.nextPayment.grace_period_days} días totales)`}
                    para pagar sin mora adicional.
                  </p>
                </div>
              )}

              {/* Alerta de mora aplicada */}
              {student.paymentStats.nextPayment.has_late_fee && student.paymentStats.nextPayment.late_fee && student.paymentStats.nextPayment.late_fee > 0 && (
                <div className="mb-3 p-3 bg-red-50 border border-red-300 rounded-lg">
                  <p className="text-sm text-red-900 font-bold flex items-center">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    🚨 Mora Aplicada
                  </p>
                  <p className="text-xs text-red-800 mt-1">
                    Esta cuota tiene un recargo por mora de <strong>S/ {student.paymentStats.nextPayment.late_fee.toFixed(2)}</strong>
                    {student.paymentStats.nextPayment.days_until_grace_limit !== undefined && student.paymentStats.nextPayment.days_until_grace_limit < 0 &&
                      ` (${Math.abs(student.paymentStats.nextPayment.days_until_grace_limit)} días después del período de gracia)`
                    }
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-gray-700 mb-1">
                    {student.paymentStats.nextPayment.is_in_grace_period ? 'Pago Vencido (En Gracia)' : 'Próximo Pago'}
                  </p>
                  <p className="text-2xl font-black text-gray-900">
                    S/ {(student.paymentStats.nextPayment.amount || 0).toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Cuota #{student.paymentStats.nextPayment.installment_number}
                    {student.paymentStats.nextPayment.has_late_fee && ' (incluye mora)'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-700">
                    {student.paymentStats.nextPayment.days_until_due !== undefined && student.paymentStats.nextPayment.days_until_due < 0 ? 'Venció el:' : 'Vence el:'}
                  </p>
                  <p className="text-lg font-bold" style={{ color: COLORS.beer }}>
                    {new Date(student.paymentStats.nextPayment.due_date).toLocaleDateString('es-PE', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </p>
                  {student.paymentStats.nextPayment.days_until_due !== undefined && (
                    <p className={`text-xs mt-1 font-semibold ${student.paymentStats.nextPayment.days_until_due < 0
                      ? 'text-red-600'
                      : student.paymentStats.nextPayment.days_until_due < 7
                        ? 'text-orange-600'
                        : 'text-gray-600'
                      }`}>
                      {student.paymentStats.nextPayment.days_until_due > 0
                        ? `Faltan ${student.paymentStats.nextPayment.days_until_due} días`
                        : student.paymentStats.nextPayment.days_until_due === 0
                          ? '¡Vence hoy!'
                          : `Vencido hace ${Math.abs(student.paymentStats.nextPayment.days_until_due)} días`}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Botón para ir a Control de Pagos */}
          <div className="mt-6 text-center">
            <a
              href="/student/payment-control"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-200 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              style={{
                background: `linear-gradient(135deg, ${COLORS.catalina} 0%, ${COLORS.pradera} 100%)`
              }}
            >
              <CreditCard className="h-5 w-5" />
              Ver Control de Pagos Completo
            </a>
          </div>
        </div>
      )}

      {/* Mensaje si no hay datos de pago */}
      {(!student.paymentStats || student.paymentStats.totalInstallments === 0) && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
          <div className="text-center py-8">
            <AlertCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              No hay información de pagos disponible
            </h3>
            <p className="text-gray-500">
              Tu plan de pagos se generará una vez que tu matrícula sea verificada por el equipo administrativo.
            </p>
          </div>
        </div>
      )}

      {/* Logros (si tiene badges) */}
      {student.badges && student.badges.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-900">Logros Recientes</h2>
            <Trophy className="h-5 w-5 text-slate-400" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {student.badges.map((badge: Badge) => (
              <div key={badge.id} className="flex items-center space-x-3 p-3 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
                <div className="text-2xl">{badge.icon}</div>
                <div>
                  <p className="font-medium text-gray-900">{badge.name}</p>
                  <p className="text-sm text-gray-600">{badge.description}</p>
                  <p className="text-xs text-orange-600 font-medium">+{badge.points} puntos</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    
    </div>
  );
};

export default StudentDashboard;