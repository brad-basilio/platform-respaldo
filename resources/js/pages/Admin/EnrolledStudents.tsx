import React, { useState, useMemo, useCallback } from 'react';
import { Users, Eye, UserCheck, UserX, Phone, BookOpen, GraduationCap, Calendar, XCircle, CheckCircle, AlertCircle, Search } from 'lucide-react';
import { Student, Group } from '../../types/models';
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
  groups: Group[];
  userRole: string;
}

// Modal extracted outside component to avoid creating a component during render.
const ViewStudentModal: React.FC<{ student: Student; onClose: () => void; groups: Group[] }> = ({ student, onClose, groups }) => {
  const getGroupName = (groupId?: string) => {
    if (!groupId) return 'Sin asignar';
    const group = groups.find(g => g.id === groupId);
    return group ? group.name : 'Grupo desconocido';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Detalles del Alumno</h2>
            <p className="text-blue-100 text-sm">Información completa del estudiante matriculado</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
          >
            <XCircle className="h-6 w-6" />
          </button>
        </div>

        <div className="p-8 overflow-y-auto max-h-[calc(90vh-200px)]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Users className="h-5 w-5 mr-2 text-blue-600" />
                Información Personal
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Nombre Completo</label>
                  <p className="text-gray-900 mt-1">{student.name}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Documento</label>
                    <p className="text-gray-900 mt-1">{student.documentType}: {student.documentNumber}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">F. Nacimiento</label>
                    <p className="text-gray-900 mt-1">{student.birthDate}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Género</label>
                    <p className="text-gray-900 mt-1">{student.gender}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Nivel Educativo</label>
                    <p className="text-gray-900 mt-1">{student.educationLevel}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Phone className="h-5 w-5 mr-2 text-green-600" />
                Información de Contacto
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Email</label>
                  <p className="text-gray-900 mt-1">{student.email}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Teléfono</label>
                  <p className="text-gray-900 mt-1">{student.phoneNumber}</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <BookOpen className="h-5 w-5 mr-2 text-purple-600" />
                Información Académica
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Código</label>
                    <p className="text-gray-900 mt-1 font-mono">{student.enrollmentCode}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Grupo</label>
                    <p className="text-gray-900 mt-1">{getGroupName(student.assignedGroupId)}</p>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Plan</label>
                  <p className="text-gray-900 mt-1">{student.contractedPlan}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Nivel</label>
                    <p className="text-gray-900 mt-1">
                      {student.level === 'basic' ? 'Básico' : student.level === 'intermediate' ? 'Intermedio' : 'Avanzado'}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Tipo</label>
                    <p className="text-gray-900 mt-1">
                      {student.classType === 'theoretical' ? 'Teórico' : 'Práctico'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <GraduationCap className="h-5 w-5 mr-2 text-orange-600" />
                Examen de Categorización
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">¿Realizó examen?</label>
                  <p className="text-gray-900 mt-1">{student.hasPlacementTest ? 'Sí' : 'No'}</p>
                </div>
                {student.hasPlacementTest && (
                  <>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Fecha</label>
                      <p className="text-gray-900 mt-1">{student.testDate}</p>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Puntaje</label>
                      <p className="text-gray-900 mt-1 font-semibold">{student.testScore}</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 md:col-span-2">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Calendar className="h-5 w-5 mr-2 text-indigo-600" />
                Fechas Importantes
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Registro</label>
                  <p className="text-gray-900 mt-1">{student.registrationDate}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Pago</label>
                  <p className="text-gray-900 mt-1">{student.paymentDate}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Matrícula</label>
                  <p className="text-gray-900 mt-1">{student.enrollmentDate}</p>
                </div>
              </div>
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

// Provide safe defaults for destructured props so runtime code never receives undefined.
const EnrolledStudents: React.FC<Props> = ({ students: initialStudents = [], groups = [], userRole: _userRole = '' }: Props) => {
  // Students already come filtered from backend (only matriculated students)
  const [students, setStudents] = useState<Student[]>(initialStudents ?? []);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [quickFilterText, setQuickFilterText] = useState<string>('');

  const handleVerifyEnrollment = async (studentId: string) => {
    const result = await Swal.fire({
      title: '¿Verificar Matrícula?',
      html: `
        <div class="text-left">
          <p class="text-gray-700 mb-3">¿Estás seguro de que quieres aprobar esta matrícula?</p>
          <div class="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
            <p class="text-sm text-blue-800">
              <strong>Importante:</strong> Al verificar esta matrícula:
            </p>
            <ul class="text-sm text-blue-700 mt-2 space-y-1 list-disc list-inside">
              <li>Contará para la comisión del asesor de ventas</li>
              <li>Se registrará como matrícula válida</li>
              <li>Se guardará tu nombre como verificador</li>
            </ul>
          </div>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#6b7280',
      confirmButtonText: '<i class="fas fa-check-circle"></i> Sí, Verificar',
      cancelButtonText: '<i class="fas fa-times"></i> Cancelar',
      reverseButtons: true,
      customClass: {
        confirmButton: 'px-6 py-2.5 rounded-xl font-medium',
        cancelButton: 'px-6 py-2.5 rounded-xl font-medium'
      }
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      const response = await axios.post(`/admin/students/${studentId}/verify-enrollment`);
      
      if (response.data.success) {
        // Actualizar el estudiante en el estado
        setStudents(prevStudents => 
          prevStudents.map(s => 
            s.id === studentId 
              ? { 
                  ...s, 
                  enrollmentVerified: true,
                  enrollmentVerifiedAt: response.data.student.enrollmentVerifiedAt,
                  verifiedEnrollmentBy: response.data.student.verifiedEnrollmentBy
                } 
              : s
          )
        );
        
        await Swal.fire({
          title: '¡Verificado!',
          text: 'La matrícula ha sido verificada exitosamente',
          icon: 'success',
          confirmButtonColor: '#10b981',
          confirmButtonText: 'Entendido',
          timer: 3000,
          timerProgressBar: true,
          customClass: {
            confirmButton: 'px-6 py-2.5 rounded-xl font-medium'
          }
        });
      }
    } catch (error: unknown) {
      console.error('Error al verificar matrícula:', error);
      const errorMessage = axios.isAxiosError(error) 
        ? error.response?.data?.message || 'Error al verificar la matrícula'
        : 'Error al verificar la matrícula';
      
      await Swal.fire({
        title: 'Error',
        text: errorMessage,
        icon: 'error',
        confirmButtonColor: '#ef4444',
        confirmButtonText: 'Cerrar',
        customClass: {
          confirmButton: 'px-6 py-2.5 rounded-xl font-medium'
        }
      });
    }
  };

  const handleUnverifyEnrollment = async (studentId: string) => {
    const result = await Swal.fire({
      title: '¿Remover Verificación?',
      html: `
        <div class="text-left">
          <p class="text-gray-700 mb-3">¿Estás seguro de que quieres remover la verificación de esta matrícula?</p>
          <div class="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
            <p class="text-sm text-yellow-800">
              <strong>Advertencia:</strong> Al remover la verificación:
            </p>
            <ul class="text-sm text-yellow-700 mt-2 space-y-1 list-disc list-inside">
              <li>NO contará para la comisión del asesor</li>
              <li>Se marcará como pendiente de verificación</li>
              <li>Se eliminará el registro de verificación</li>
            </ul>
          </div>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: '<i class="fas fa-times-circle"></i> Sí, Remover',
      cancelButtonText: '<i class="fas fa-ban"></i> Cancelar',
      reverseButtons: true,
      customClass: {
        confirmButton: 'px-6 py-2.5 rounded-xl font-medium',
        cancelButton: 'px-6 py-2.5 rounded-xl font-medium'
      }
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      const response = await axios.post(`/admin/students/${studentId}/unverify-enrollment`);
      
      if (response.data.success) {
        // Actualizar el estudiante en el estado
        setStudents(prevStudents => 
          prevStudents.map(s => 
            s.id === studentId 
              ? { 
                  ...s, 
                  enrollmentVerified: false,
                  enrollmentVerifiedAt: undefined,
                  verifiedEnrollmentBy: undefined
                } 
              : s
          )
        );
        
        await Swal.fire({
          title: 'Verificación Removida',
          text: 'La verificación ha sido removida exitosamente',
          icon: 'success',
          confirmButtonColor: '#10b981',
          confirmButtonText: 'Entendido',
          timer: 3000,
          timerProgressBar: true,
          customClass: {
            confirmButton: 'px-6 py-2.5 rounded-xl font-medium'
          }
        });
      }
    } catch (error: unknown) {
      console.error('Error al remover verificación:', error);
      const errorMessage = axios.isAxiosError(error)
        ? error.response?.data?.message || 'Error al remover la verificación'
        : 'Error al remover la verificación';
      
      await Swal.fire({
        title: 'Error',
        text: errorMessage,
        icon: 'error',
        confirmButtonColor: '#ef4444',
        confirmButtonText: 'Cerrar',
        customClass: {
          confirmButton: 'px-6 py-2.5 rounded-xl font-medium'
        }
      });
    }
  };

  const getGroupName = useCallback((groupId?: string) => {
    if (!groupId) return 'Sin asignar';
    const group = groups.find(g => g.id === groupId);
    return group ? group.name : 'Grupo desconocido';
  }, [groups]);

  const handleViewStudent = (student: Student) => {
    setSelectedStudent(student);
    setShowViewModal(true);
  };

  const columnDefs = useMemo<ColDef<Student>[]>(() => [
    {
      headerName: 'Alumno',
      field: 'name',
      minWidth: 300,
      filter: 'agTextColumnFilter',
      cellRenderer: (params: ICellRendererParams<Student>) => {
        const student = params.data!;
        return (
          <div className="flex items-center py-2 w-full h-full">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm font-semibold">
                {student.name.split(' ').map((n: string) => n[0]).join('')}
              </span>
            </div>
            <div className="ml-3">
              <div className="text-sm font-medium text-gray-900">{student.name}</div>
              <div className="text-xs text-gray-500">{student.email}</div>
              <div className="text-xs text-gray-400">{student.phoneNumber}</div>
            </div>
          </div>
        );
      }
    },
    {
      headerName: 'Código',
      field: 'enrollmentCode',
      width: 180,
      filter: 'agTextColumnFilter',
      cellRenderer: (params: ICellRendererParams<Student>) => {
        const row = params.data!;
        return (
          <div className="w-full h-full flex items-center">
            <div className="text-sm font-mono text-gray-900">{params.value}</div>
            <div className="text-xs text-gray-500">{row.enrollmentDate}</div>
          </div>
        );
      }
    },
    {
      headerName: 'Estado',
      field: 'status',
      width: 120,
      filter: 'agTextColumnFilter',
  cellRenderer: (params: ICellRendererParams<Student>) => {
        const status = params.value;
        return (
        <div className='flex items-center space-x-2 w-full h-full'>
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
            status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {status === 'active' ? <UserCheck className="w-3 h-3 mr-1" /> : <UserX className="w-3 h-3 mr-1" />}
            {status === 'active' ? 'Activo' : 'Inactivo'}
          </span>
        </div>
        );
      }
    },
    {
      headerName: 'Nivel',
      field: 'level',
      width: 120,
      filter: 'agTextColumnFilter',
  cellRenderer: (params: ICellRendererParams<Student>) => {
        const level = params.value;
        const colorClass = level === 'basic' ? 'bg-green-100 text-green-800' :
                         level === 'intermediate' ? 'bg-yellow-100 text-yellow-800' :
                         'bg-red-100 text-red-800';
        return (
        <div className='flex items-center space-x-2 w-full h-full'>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
            {level === 'basic' ? 'Básico' : level === 'intermediate' ? 'Intermedio' : 'Avanzado'}
          </span>
        </div>
        );
      }
    },
    {
      headerName: 'Verificación',
      field: 'enrollmentVerified',
      width: 150,
      filter: 'agTextColumnFilter',
      cellRenderer: (params: ICellRendererParams<Student>) => {
        const student = params.data!;
        const isVerified = student.enrollmentVerified;
        return (
          <div className="flex items-center justify-between h-full gap-2">
            {isVerified ? (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <CheckCircle className="w-3 h-3 mr-1" />
                Verificada
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                <AlertCircle className="w-3 h-3 mr-1" />
                Pendiente
              </span>
            )}
          </div>
        );
      }
    },
    {
      headerName: 'Plan',
      field: 'contractedPlan',
      minWidth: 200,
      filter: 'agTextColumnFilter',
      cellRenderer: (params: ICellRendererParams<Student>) => {
        const row = params.data!;
        return (
          <div className="w-full h-full flex flex-col items-start justify-center">
            <div className="text-sm text-gray-900">{params.value}</div>
            <div className="text-xs text-gray-500">Grupo: {getGroupName(row.assignedGroupId)}</div>
          </div>
        );
      }
    },
    {
      headerName: 'Acciones',
      width: 100,
      sortable: false,
      filter: false,
      cellRenderer: (params: ICellRendererParams<Student>) => {
        const student = params.data!;
        return (
          <div className="flex items-center space-x-2 w-full h-full">
            <button
              onClick={() => handleViewStudent(student)}
              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Ver detalles"
            >
              <Eye className="h-4 w-4" />
            </button>
            {student.enrollmentVerified ? (
              <button
                onClick={() => handleUnverifyEnrollment(student.id)}
                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Remover verificación"
              >
                <XCircle className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={() => handleVerifyEnrollment(student.id)}
                className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                title="Verificar matrícula"
              >
                <CheckCircle className="h-4 w-4" />
              </button>
            )}
          </div>
        );
      }
    }
  ], [getGroupName]);

  // (inner duplicate modal removed)

  return (
    <AuthenticatedLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Alumnos Matriculados</h1>
            <p className="text-gray-600">Gestiona los estudiantes que ya han completado su matrícula</p>
          </div>
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-xl shadow-lg">
            <div className="text-center">
              <div className="text-3xl font-bold">{students.length}</div>
              <div className="text-sm opacity-90">Matriculados</div>
            </div>
          </div>
        </div>

          {/* Barra de búsqueda global */}
    
              <Input
                type="text"
                label="Buscar por nombre, email, código, teléfono, nivel, plan..."
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
          
        

          <div className="ag-theme-quartz" style={{ height: '600px', width: '100%' }}>
            <AgGridReact<Student>
              theme={themeQuartz}
              rowData={students}
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
              paginationPageSizeSelector={[5, 10, 20, 50]}
              rowSelection={{ mode: 'singleRow' }}
              animateRows={true}
              domLayout="normal"
              rowHeight={70}
              headerHeight={48}
              suppressCellFocus={true}
              rowClass="hover:bg-gray-50"
            />
          </div>
       

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Total Matriculados</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{students.length}</p>
              </div>
              <Users className="h-10 w-10 text-blue-600" />
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Verificadas</p>
                <p className="text-3xl font-bold text-green-600 mt-1">
                  {students.filter((s: Student) => s.enrollmentVerified).length}
                </p>
              </div>
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Pendientes</p>
                <p className="text-3xl font-bold text-yellow-600 mt-1">
                  {students.filter((s: Student) => !s.enrollmentVerified).length}
                </p>
              </div>
              <AlertCircle className="h-10 w-10 text-yellow-600" />
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Activos</p>
                <p className="text-3xl font-bold text-purple-600 mt-1">
                  {students.filter((s: Student) => s.status === 'active').length}
                </p>
              </div>
              <UserCheck className="h-10 w-10 text-purple-600" />
            </div>
          </div>
        </div>
   
      </div>

      {showViewModal && selectedStudent && (
        <ViewStudentModal student={selectedStudent} onClose={() => setShowViewModal(false)} groups={groups} />
      )}
    </AuthenticatedLayout>
  );
};

export default EnrolledStudents;
