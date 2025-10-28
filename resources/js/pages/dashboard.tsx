import React from 'react';
import AuthenticatedLayout from '../layouts/AuthenticatedLayout';
import { Users, DollarSign, BookOpen, Award } from 'lucide-react';
import { usePage } from '@inertiajs/react';

interface Props {
  auth?: {
    user: {
      name: string;
      email: string;
      role: string;
    };
  };
  stats?: {
    // Stats para Sales Advisor
    totalProspects?: number;
    registrados?: number;
    propuestasEnviadas?: number;
    pagosPorVerificar?: number;
    matriculados?: number;
    // Stats para Cashier
    pagosPendientes?: number;
    verificadosHoy?: number;
    matriculasDelMes?: number;
  };
}

const Dashboard: React.FC<Props> = () => {
  const { auth, stats } = usePage().props as Props;
  const user = auth?.user;

  // Determinar el título según el rol
  const getRoleTitle = (role: string) => {
    switch (role) {
      case 'sales_advisor':
        return 'Panel de Asesor de Ventas';
      case 'cashier':
        return 'Panel de Cajero';
      case 'admin':
        return 'Panel de Administrador';
      case 'teacher':
        return 'Panel de Profesor';
      case 'student':
        return 'Panel de Estudiante';
      default:
        return 'Panel Principal';
    }
  };

  // Obtener mensaje de bienvenida personalizado
  const getWelcomeMessage = (role: string) => {
    switch (role) {
      case 'sales_advisor':
        return 'Gestiona los prospectos y el proceso de ventas';
      case 'cashier':
        return 'Verifica pagos y procesa matrículas';
      case 'admin':
        return 'Gestiona todo el sistema de la plataforma';
      default:
        return 'Bienvenido a tu panel de control';
    }
  };

  return (
    <AuthenticatedLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-8 text-white">
          <h1 className="text-3xl font-bold mb-2">
            ¡Bienvenido, {user?.name || 'Usuario'}!
          </h1>
          <p className="text-blue-100 text-lg">
            {user?.role ? getWelcomeMessage(user.role) : 'Bienvenido a la plataforma'}
          </p>
        </div>

        {/* Stats Cards - Específicos por rol */}
        {user?.role === 'sales_advisor' && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total de Prospectos</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats?.totalProspects || 0}</p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Registrados</p>
                  <p className="text-2xl font-semibold text-blue-600">{stats?.registrados || 0}</p>
                </div>
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Propuesta Enviada</p>
                  <p className="text-2xl font-semibold text-yellow-600">{stats?.propuestasEnviadas || 0}</p>
                </div>
                <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                  <div className="w-3 h-3 bg-yellow-600 rounded-full"></div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pago Por Verificar</p>
                  <p className="text-2xl font-semibold text-orange-600">{stats?.pagosPorVerificar || 0}</p>
                </div>
                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                  <div className="w-3 h-3 bg-orange-600 rounded-full"></div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Matriculados</p>
                  <p className="text-2xl font-semibold text-green-600">{stats?.matriculados || 0}</p>
                </div>
                <Award className="h-8 w-8 text-green-600" />
              </div>
            </div>
          </div>
        )}

        {user?.role === 'cashier' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pagos Pendientes</p>
                  <p className="text-2xl font-bold text-orange-600 mt-1">{stats?.pagosPendientes || 0}</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Verificados Hoy</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">{stats?.verificadosHoy || 0}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <Award className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Matrículas del Mes</p>
                  <p className="text-2xl font-bold text-purple-600 mt-1">{stats?.matriculasDelMes || 0}</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Acciones Rápidas</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {user?.role === 'sales_advisor' && (
              <>
                <a
                  href="/admin/students"
                  className="flex items-center p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                >
                  <Users className="h-8 w-8 text-blue-600 mr-3" />
                  <div>
                    <p className="font-medium text-gray-900">Gestionar Prospectos</p>
                    <p className="text-sm text-gray-600">Ver y administrar prospectos</p>
                  </div>
                </a>
                <a
                  href="/admin/students"
                  className="flex items-center p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                >
                  <BookOpen className="h-8 w-8 text-green-600 mr-3" />
                  <div>
                    <p className="font-medium text-gray-900">Nuevo Prospecto</p>
                    <p className="text-sm text-gray-600">Registrar nuevo prospecto</p>
                  </div>
                </a>
              </>
            )}

            {user?.role === 'cashier' && (
              <>
                <a
                  href="/admin/students"
                  className="flex items-center p-4 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors"
                >
                  <DollarSign className="h-8 w-8 text-orange-600 mr-3" />
                  <div>
                    <p className="font-medium text-gray-900">Verificar Pagos</p>
                    <p className="text-sm text-gray-600">Gestionar verificación de pagos</p>
                  </div>
                </a>
                <a
                  href="/admin/students"
                  className="flex items-center p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                >
                  <Award className="h-8 w-8 text-green-600 mr-3" />
                  <div>
                    <p className="font-medium text-gray-900">Matricular</p>
                    <p className="text-sm text-gray-600">Procesar matrículas</p>
                  </div>
                </a>
              </>
            )}
          </div>
        </div>

        {/* Welcome Message */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {user?.role ? getRoleTitle(user.role) : 'Información'}
          </h2>
          <p className="text-gray-600 leading-relaxed">
            {user?.role === 'sales_advisor' && (
              <>
                Como <strong>Asesor de Ventas</strong>, tu función principal es gestionar el proceso comercial:
                registrar nuevos prospectos, enviar propuestas y hacer seguimiento hasta la verificación de pago.
                Puedes mover prospectos de "Registrado" a "Propuesta Enviada" en el tablero Kanban.
              </>
            )}
            {user?.role === 'cashier' && (
              <>
                Como <strong>Cajero</strong>, eres responsable de verificar los pagos y procesar las matrículas.
                Puedes mover prospectos de "Verificación de Pago" a "Matriculado" una vez confirmado el pago.
                Asegúrate de verificar todos los datos antes de matricular.
              </>
            )}
            {!user?.role && 'Bienvenido a la plataforma de gestión de la institución.'}
          </p>
        </div>
      </div>
    </AuthenticatedLayout>
  );
};

export default Dashboard;
