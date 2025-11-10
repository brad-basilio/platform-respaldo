import React, { useState, useMemo } from 'react';
import { 
  Users, Eye, CheckCircle, AlertCircle, XCircle, 
  Calendar, DollarSign, FileText, Search, Download, Clock
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

// Modal de Cronograma de Pagos (Solo Lectura)
const PaymentScheduleModal: React.FC<{ 
  student: Student; 
  enrollment: Enrollment;
  onClose: () => void;
}> = ({ student, enrollment, onClose }) => {

  const getStatusBadge = (installment: Installment) => {
    switch (installment.status) {
      case 'verified':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#17BC91]/10 text-[#17BC91] border border-[#17BC91]/30">
            <CheckCircle className="w-3 h-3 mr-1" />
            Verificado
          </span>
        );
      case 'paid':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#073372]/10 text-[#073372] border border-[#073372]/30">
            <Clock className="w-3 h-3 mr-1" />
            Pendiente Verificación
          </span>
        );
      case 'overdue':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-300">
            <XCircle className="w-3 h-3 mr-1" />
            Vencido
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#F98613]/10 text-[#F98613] border border-[#F98613]/30">
            <AlertCircle className="w-3 h-3 mr-1" />
            Pendiente
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl max-w-6xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        <div className="bg-gradient-to-r from-[#073372] to-[#17BC91] px-8 py-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Cronograma de Pagos</h2>
            <p className="text-blue-100 text-sm">{student.name} - {student.enrollmentCode}</p>
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
                      Pagado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Vouchers
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {enrollment.installments && enrollment.installments.length > 0 ? (
                    enrollment.installments.map((installment) => {
                      // Normalizar campos
                      const installmentNumber = (installment as any).installment_number || (installment as any).installmentNumber || 0;
                      const dueDate = (installment as any).due_date || (installment as any).dueDate || '';
                      const paidAmount = (installment as any).paid_amount || (installment as any).paidAmount || 0;
                      const verifiedBy = (installment as any).verifiedBy || (installment as any).verified_by;
                      const vouchers = installment.vouchers || [];
                      
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
                            {new Date(dueDate).toLocaleDateString('es-PE', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-semibold text-gray-900">
                            S/ {installment.amount.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-semibold text-green-600">
                            S/ {paidAmount.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="space-y-1">
                            {getStatusBadge(installment)}
                            {installment.status === 'verified' && verifiedBy && (
                              <div className="text-xs text-gray-500">
                                <div>Por: {verifiedBy.name}</div>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {vouchers && vouchers.length > 0 ? (
                            <div className="space-y-1">
                              {vouchers.map((voucher: any) => {
                                const voucherStatus = voucher.status || 'pending';
                                return (
                                  <div key={voucher.id} className="flex items-center space-x-2">
                                    <a
                                      href={voucher.voucher_url || '#'}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
                                    >
                                      <Download className="w-4 h-4 mr-1" />
                                      Ver
                                    </a>
                                    {voucherStatus === 'approved' && (
                                      <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">
                                        Aprobado
                                      </span>
                                    )}
                                    {voucherStatus === 'pending' && (
                                      <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full">
                                        Pendiente
                                      </span>
                                    )}
                                    {voucherStatus === 'rejected' && (
                                      <span className="text-xs px-2 py-1 bg-red-100 text-red-800 rounded-full">
                                        Rechazado
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">Sin voucher</span>
                          )}
                        </td>
                      </tr>
                    )})
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
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

const AdminPaymentControl: React.FC<Props> = ({ students: initialStudents = [] }) => {
  const [students] = useState<Student[]>(initialStudents ?? []);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [quickFilterText, setQuickFilterText] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'completed'>('all');

  const handleViewSchedule = async (student: Student) => {
    try {
      const response = await axios.get(`/admin/students/${student.id}/enrollment`);
      
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
      await Swal.fire({
        title: 'Error',
        text: error.response?.data?.message || 'No se pudo cargar el cronograma de pagos',
        icon: 'error',
        confirmButtonColor: '#ef4444'
      });
    }
  };

  // Filtrar estudiantes según el tab activo
  const filteredStudents = useMemo(() => {
    let filtered = students.filter(s => s.enrollmentVerified);
    
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
              toVerifyCount === 0 ? 'bg-gray-100 text-gray-600' : 'bg-[#073372]/10 text-[#073372] border border-[#073372]/30'
            }`}>
              <Clock className="w-3 h-3 mr-1" />
              {toVerifyCount}
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
              title="Ver cronograma"
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
            <h1 className="text-2xl font-bold text-gray-900">Gestión de Pagos</h1>
            <p className="text-gray-600">Visualiza el estado de pagos de todos los estudiantes matriculados</p>
          </div>
        
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 hidden">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Total Estudiantes</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{verifiedStudents.length}</p>
              </div>
              <Users className="h-10 w-10 text-blue-600" />
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Pagos Pendientes</p>
                <p className="text-3xl font-bold text-yellow-600 mt-1">{pendingPayments.length}</p>
              </div>
              <AlertCircle className="h-10 w-10 text-yellow-600" />
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Pagos Completos</p>
                <p className="text-3xl font-bold text-green-600 mt-1">{completedPayments.length}</p>
              </div>
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Por Verificar</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">
                  {students.reduce((acc, s) => 
                    acc + (s.enrollment?.installments?.filter(i => i.status === 'paid').length || 0), 0
                  )}
                </p>
              </div>
              <Clock className="h-10 w-10 text-blue-600" />
            </div>
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
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md'
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
                  ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-md'
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
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-md'
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
        />
      )}
    </AuthenticatedLayout>
  );
};

export default AdminPaymentControl;
