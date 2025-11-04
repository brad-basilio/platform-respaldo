import React, { useState, useMemo } from 'react';
import { Users, Plus, CreditCard as Edit, Trash2, UserCheck, UserX, Eye, List, Columns2 as Columns, Search, XCircle, Calendar } from 'lucide-react';
import { Student, Group, AcademicLevel, PaymentPlan } from '../../types/models';
import AuthenticatedLayout from '../../layouts/AuthenticatedLayout';
import axios from 'axios';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/DatePicker';
import { Select2 } from '@/components/ui/Select2';
import { toast } from 'sonner';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule, themeQuartz } from 'ag-grid-community';
import type { ColDef } from 'ag-grid-community';
import { motion, AnimatePresence } from 'framer-motion';
import PaymentScheduleModal from '@/components/PaymentScheduleModal';
import '../../../css/ag-grid-custom.css';

// Registrar módulos de AG Grid Community
ModuleRegistry.registerModules([AllCommunityModule]);

interface Props {
  students: Student[];
  groups: Group[];
  academicLevels: AcademicLevel[];  // ✅ Nuevo
  paymentPlans: PaymentPlan[];      // ✅ Nuevo
  userRole: string;
}

const StudentManagement: React.FC<Props> = ({ 
  students: initialStudents, 
  groups, 
  academicLevels,  // ✅ Nuevo
  paymentPlans,    // ✅ Nuevo
  userRole 
}) => {
  const [students, setStudents] = useState<Student[]>(initialStudents);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('kanban');
  const [draggedStudent, setDraggedStudent] = useState<Student | null>(null);
  const [quickFilterText, setQuickFilterText] = useState<string>('');
  
  // ✅ Nuevo: Estado para Payment Schedule Modal
  const [paymentScheduleModalOpen, setPaymentScheduleModalOpen] = useState(false);
  const [selectedStudentForSchedule, setSelectedStudentForSchedule] = useState<Student | null>(null);

  // Función para obtener la lista de estudiantes desde el backend y mantener el estado canónico
  const fetchStudents = async () => {
    try {
      const response = await axios.get('/api/admin/students');
      const students = response.data;
      
      if (Array.isArray(students)) {
        setStudents(students);
        console.log('✅ Lista actualizada desde el servidor:', students.length, 'prospectos');
      } else {
        console.error('❌ Formato de respuesta inesperado:', students);
      }
    } catch (error) {
      console.error('❌ Error fetching students:', error);
      toast.error('Error al obtener la lista de prospectos', {
        description: 'No se pudo sincronizar la lista con el servidor. Intenta recargar la página.',
        duration: 5000,
      });
    }
  };

  // Obtener lista canónica al montar el componente para asegurar datos actualizados
  React.useEffect(() => {
    fetchStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filtrar estudiantes basado en filtros para Kanban
  const filteredStudents = students;

  const getProspectStatusColor = (status: string) => {
    switch (status) {
      case 'registrado': return 'bg-blue-100 text-blue-800';
      case 'propuesta_enviada': return 'bg-yellow-100 text-yellow-800';
      case 'pago_por_verificar': return 'bg-orange-100 text-orange-800';
      case 'matriculado': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getProspectStatusLabel = (status: string) => {
    switch (status) {
      case 'registrado': return 'Registrado';
      case 'propuesta_enviada': return 'Reunión Realizada';
      case 'pago_por_verificar': return 'Pago Por Verificar';
      case 'matriculado': return 'Matriculado';
      default: return 'Sin Estado';
    }
  };

  const handleProspectStatusChange = (studentId: string, newStatus: string) => {
    // Validaciones del lado del cliente
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    // Validar que tenga datos académicos completos antes de pasar a pago_por_verificar
    if (newStatus === 'pago_por_verificar') {
      if (!student.paymentDate || !student.academicLevelId || !student.paymentPlanId) {  // ✅ Actualizado
        toast.error('Datos incompletos', {
          description: 'Debes completar fecha de pago, nivel académico y plan de pago antes de marcar como "Pago Por Verificar"',
          duration: 5000,
        });
        return;
      }
    }

    // Validar transiciones permitidas según rol
    if (userRole === 'sales_advisor') {
      const allowedTransitions = [
        student.prospectStatus === 'registrado' && newStatus === 'propuesta_enviada',
        student.prospectStatus === 'propuesta_enviada' && newStatus === 'pago_por_verificar',
        student.prospectStatus === 'propuesta_enviada' && newStatus === 'registrado', // Permitir retroceso
      ];
      if (!allowedTransitions.some(t => t)) {
        toast.error('Transición no permitida', {
          description: 'Como asesor de ventas solo puedes: Registrado ↔ Propuesta Enviada → Pago Por Verificar',
          duration: 5000,
        });
        return;
      }
    } else if (userRole === 'cashier') {
      const allowedTransitions = [
        student.prospectStatus === 'pago_por_verificar' && newStatus === 'matriculado'
      ];
      if (!allowedTransitions.some(t => t)) {
        toast.error('Transición no permitida', {
          description: 'Como cajero solo puedes verificar pagos en estado "Pago Por Verificar"',
          duration: 5000,
        });
        return;
      }
    }

    // Enviar actualización al servidor usando axios (sin actualización optimista para evitar parpadeo)
    axios.put(`/admin/students/${studentId}/prospect-status`, {
      prospect_status: newStatus
    })
      .then(async () => {
        // Pequeño delay para permitir que la animación de salida se complete
        await new Promise(resolve => setTimeout(resolve, 250));
        
        // Refrescar lista desde el servidor para garantizar consistencia en Kanban y lista
        await fetchStudents();

        toast.success('Estado actualizado', {
          description: `El prospecto ahora está en estado: ${getProspectStatusLabel(newStatus)}`,
          duration: 4000,
        });
      })
      .catch((error) => {
        console.error('Error:', error);

        // Manejar errores específicos del backend
        if (error.response?.data?.error) {
          toast.error(error.response.data.message || 'Error al actualizar estado', {
            description: error.response.data.error,
            duration: 5000,
          });
        } else {
          toast.error('Error al actualizar estado', {
            description: 'No se pudo cambiar el estado. Intenta nuevamente.',
            duration: 5000,
          });
        }
      });
  };

  const handleDragStart = (e: React.DragEvent, student: Student) => {
    const currentDate = new Date().toISOString().split('T')[0];
    const enrollmentCode = `ENG${new Date().getFullYear()}${String(Date.now()).slice(-3)}`;

    if (student.prospectStatus === 'matriculado') {
      const updatedStudent = {
        ...student,
        paymentDate: currentDate,
        enrollmentCode: enrollmentCode,
      };
      setStudents(students.map(s => s.id === student.id ? updatedStudent : s));
    }

    setDraggedStudent(student);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, newStatus: 'registrado' | 'propuesta_enviada' | 'pago_por_verificar' | 'matriculado') => {
    e.preventDefault();
    if (draggedStudent) {
      // Validar que tenga los datos necesarios antes de pasar a pago_por_verificar (para todos los roles)
      if (newStatus === 'pago_por_verificar') {
        if (!draggedStudent.paymentDate || !draggedStudent.academicLevelId || !draggedStudent.paymentPlanId) {  // ✅ Actualizado
          toast.error('Datos incompletos', {
            description: 'Debes completar fecha de pago, nivel académico y plan de pago antes de marcar como "Pago Por Verificar"',
            duration: 5000,
          });
          setDraggedStudent(null);
          return;
        }
      }

      // Validar transiciones según el rol
      if (userRole === 'sales_advisor') {
        const allowedTransitions = [
          draggedStudent.prospectStatus === 'registrado' && newStatus === 'propuesta_enviada',
          draggedStudent.prospectStatus === 'propuesta_enviada' && newStatus === 'pago_por_verificar',
          draggedStudent.prospectStatus === 'propuesta_enviada' && newStatus === 'registrado', // Permitir retroceso
        ];
        if (!allowedTransitions.some(t => t)) {
          toast.error('Transición no permitida', {
            description: 'Como asesor de ventas solo puedes: Registrado ↔ Propuesta Enviada → Pago Por Verificar',
            duration: 5000,
          });
          setDraggedStudent(null);
          return;
        }
      } else if (userRole === 'cashier') {
        const allowedTransitions = [
          draggedStudent.prospectStatus === 'pago_por_verificar' && newStatus === 'matriculado'
        ];
        if (!allowedTransitions.some(t => t)) {
          toast.error('Transición no permitida', {
            description: 'Como cajero solo puedes verificar pagos en estado "Pago Por Verificar"',
            duration: 5000,
          });
          setDraggedStudent(null);
          return;
        }
      }

      // Validar si se intenta mover a "matriculado" sin los requisitos
      if (newStatus === 'matriculado') {
        // Verificar si el prospecto tiene fecha de pago
        const hasPaymentDate = draggedStudent.paymentDate;

        if (!hasPaymentDate) {
          // Mostrar alerta elegante
          showEnrollmentAlert();
          setDraggedStudent(null);
          return;
        }
      }

      handleProspectStatusChange(draggedStudent.id, newStatus);
      setDraggedStudent(null);
    }
  };

  const [showAlert, setShowAlert] = useState(false);

  const showEnrollmentAlert = () => {
    setShowAlert(true);
    setTimeout(() => setShowAlert(false), 4000); // Auto-hide después de 4 segundos
  };

  const handleCreateStudent = async (formData: any) => {
    try {
      const response = await axios.post('/admin/students', {
        first_name: formData.firstName,
        paternal_last_name: formData.paternalLastName,
        maternal_last_name: formData.maternalLastName,
        email: formData.email,
        phone_number: formData.phoneNumber,
        gender: formData.gender,
        birth_date: formData.birthDate,
        document_type: formData.documentType,
        document_number: formData.documentNumber,
        education_level: formData.educationLevel,
        academic_level_id: formData.academicLevelId,  // ✅ Cambiado de 'level'
        class_type: 'theoretical', // Por defecto
      });

  // Agregar el nuevo estudiante al estado canónico refrescando desde el servidor
  await fetchStudents();

  // Éxito: cerrar modal y mostrar toast
  setShowCreateForm(false);
      toast.success('Prospecto registrado exitosamente', {
        description: 'El nuevo prospecto ha sido agregado al sistema.',
        duration: 4000,
      });

    } catch (error: any) {
      console.error('❌ Errores de validación:', error);

      // Manejar errores de validación (422)
      if (error.response && error.response.status === 422) {
        const errors = error.response.data.errors;

        // Mostrar cada error como un toast
        Object.entries(errors).forEach(([, message]) => {
          toast.error('Error de validación', {
            description: Array.isArray(message) ? message[0] : message,
            duration: 5000,
          });
        });
      } else {
        // Error genérico
        toast.error('Error al registrar prospecto', {
          description: 'Ocurrió un error inesperado. Por favor, intenta nuevamente.',
          duration: 5000,
        });
      }
    }
  };

  const handleUpdateStudent = async (formData: any) => {
    if (!editingStudent) return;

    // Crear FormData para enviar archivo
    const data = new FormData();

    // Determinar qué campos enviar según el rol
    if (userRole === 'cashier') {
      // Cajero: solo datos de matrícula
      if (formData.paymentDate) data.append('payment_date', formData.paymentDate);
      if (formData.enrollmentDate) data.append('enrollment_date', formData.enrollmentDate);
      if (formData.enrollmentCode) data.append('enrollment_code', formData.enrollmentCode);
      if (formData.academicLevelId) data.append('academic_level_id', formData.academicLevelId.toString());  // ✅ Actualizado
      if (formData.paymentPlanId) data.append('payment_plan_id', formData.paymentPlanId.toString());        // ✅ Actualizado
      data.append('payment_verified', formData.paymentVerified ? '1' : '0');
    } else {
      // Admin y Sales Advisor: todos los campos
      data.append('first_name', formData.firstName);
      data.append('paternal_last_name', formData.paternalLastName);
      data.append('maternal_last_name', formData.maternalLastName);
      data.append('phone_number', formData.phoneNumber);
      data.append('gender', formData.gender);
      data.append('birth_date', formData.birthDate);
      data.append('document_type', formData.documentType);
      data.append('document_number', formData.documentNumber);
      data.append('education_level', formData.educationLevel);
      data.append('email', formData.email);
      if (formData.paymentDate) data.append('payment_date', formData.paymentDate);
      if (formData.enrollmentDate) data.append('enrollment_date', formData.enrollmentDate);
      if (formData.enrollmentCode) data.append('enrollment_code', formData.enrollmentCode);
      if (formData.academicLevelId) data.append('academic_level_id', formData.academicLevelId.toString());  // ✅ Actualizado
      if (formData.paymentPlanId) data.append('payment_plan_id', formData.paymentPlanId.toString());        // ✅ Actualizado

      // Solo admin puede verificar pagos desde el formulario de edición
      if (userRole === 'admin') {
        data.append('payment_verified', formData.paymentVerified ? '1' : '0');
      }

      data.append('has_placement_test', formData.hasPlacementTest ? '1' : '0');
      if (formData.testDate) data.append('test_date', formData.testDate);
      if (formData.testScore) data.append('test_score', formData.testScore);
      if (formData.guardianName) data.append('guardian_name', formData.guardianName);
      if (formData.guardianDocumentNumber) data.append('guardian_document_number', formData.guardianDocumentNumber);
      if (formData.guardianEmail) data.append('guardian_email', formData.guardianEmail);
      if (formData.guardianBirthDate) data.append('guardian_birth_date', formData.guardianBirthDate);
      if (formData.guardianPhone) data.append('guardian_phone', formData.guardianPhone);
      if (formData.guardianAddress) data.append('guardian_address', formData.guardianAddress);
      data.append('status', formData.status);
    }

    // Agregar archivos si existen
    if (formData.contractFile) {
      data.append('contract_file', formData.contractFile);
    }
    
    // ✅ NUEVO: Agregar voucher de pago si existe
    if (formData.paymentVoucherFile) {
      data.append('payment_voucher_file', formData.paymentVoucherFile);
    }

    // Laravel requiere _method para simular PUT en FormData
    data.append('_method', 'PUT');

    console.log('Datos que se enviarán al backend (con archivo)');

    try {
      const response = await axios.post(`/admin/students/${editingStudent.id}`, data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

  // Actualizar el estudiante en el estado canónico refrescando desde el servidor
  await fetchStudents();

      // Cerrar modal ANTES del toast para que el usuario vea el cambio inmediatamente
      setEditingStudent(null);

      // Éxito: mostrar toast
      toast.success('Prospecto actualizado exitosamente', {
        description: 'Los datos del prospecto han sido actualizados.',
        duration: 4000,
      });

    } catch (error: any) {
      console.error('❌ Errores de validación:', error);

      // Manejar errores de validación (422)
      if (error.response && error.response.status === 422) {
        const errors = error.response.data.errors;

        // Mostrar cada error como un toast
        Object.entries(errors).forEach(([, message]) => {
          toast.error('Error de validación', {
            description: Array.isArray(message) ? message[0] : message,
            duration: 5000,
          });
        });
      } else {
        // Error genérico
        toast.error('Error al actualizar prospecto', {
          description: 'Ocurrió un error inesperado. Por favor, intenta nuevamente.',
          duration: 5000,
        });
      }
    }
  };

  const handleDeleteStudent = (studentId: string) => {
    if (confirm('¿Estás seguro de que quieres eliminar este prospecto?')) {
      axios.delete(`/admin/students/${studentId}`)
        .then(() => {
          // Eliminar del estado local inmediatamente
          setStudents(prevStudents => prevStudents.filter(s => s.id !== studentId));

          toast.success('Prospecto eliminado', {
            description: 'El prospecto ha sido eliminado exitosamente.',
            duration: 4000,
          });
        })
        .catch((error) => {
          toast.error('Error al eliminar', {
            description: 'No se pudo eliminar el prospecto. Intenta nuevamente.',
            duration: 5000,
          });
          console.error('Error al eliminar:', error);
        });
    }
  };

  const getGroupName = (groupId?: string) => {
    if (!groupId) return 'Sin asignar';
    const group = groups.find(g => g.id === groupId);
    return group ? group.name : 'Grupo desconocido';
  };

  // Definición de columnas para AG Grid
  const columnDefs = useMemo<ColDef<Student>[]>(() => {
    const columns: ColDef<Student>[] = [
      {
        headerName: 'Prospecto',
        field: 'name',
        minWidth: 250,
        filter: 'agTextColumnFilter',
        cellRenderer: (params: any) => {
          const student = params.data;
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
              </div>
            </div>
          );
        }
      },
      {
        headerName: 'Estado',
        field: 'status',
        width: 120,
        filter: 'agTextColumnFilter',
        cellRenderer: (params: any) => {
          const status = params.value;
          return (
            <div className='flex items-center  w-full h-full'>
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                {status === 'active' ? <UserCheck className="w-3 h-3 mr-1" /> : <UserX className="w-3 h-3 mr-1" />}
                {status === 'active' ? 'Activo' : 'Inactivo'}
              </span>
            </div>
          );
        }
      },
      {
        headerName: 'Estado Prospecto',
        field: 'prospectStatus',
        width: 180,
        filter: 'agTextColumnFilter',
        cellRenderer: (params: any) => {
          const student = params.data;
          return (
            <div className='flex items-center  w-full h-full'>
                 <select
              value={student.prospectStatus || 'registrado'}
              onChange={(e) => {
                handleProspectStatusChange(student.id, e.target.value);
              }}
              className={`text-xs font-medium px-2.5 py-1 rounded-full border-0 focus:ring-2 focus:ring-blue-500 cursor-pointer w-full ${getProspectStatusColor(student.prospectStatus || 'registrado')}`}
              disabled={
                (userRole === 'sales_advisor' && (student.prospectStatus !== 'registrado' && student.prospectStatus !== 'propuesta_enviada')) ||
                (userRole === 'cashier' && student.prospectStatus !== 'pago_por_verificar')
              }
            >
              {userRole === 'admin' && (
                <>
                  <option value="registrado">Registrado</option>
                  <option value="propuesta_enviada">Propuesta Enviada</option>
                  <option value="pago_por_verificar">Pago Por Verificar</option>
                  <option value="matriculado">Matriculado</option>
                </>
              )}
              {userRole === 'sales_advisor' && (
                <>
                  {(student.prospectStatus === 'registrado' || student.prospectStatus === 'propuesta_enviada') ? (
                    <>
                      <option value="registrado">Registrado</option>
                      <option value="propuesta_enviada">Propuesta Enviada</option>
                      <option value="pago_por_verificar">Pago Por Verificar</option>
                    </>
                  ) : (
                    <option value={student.prospectStatus}>{getProspectStatusLabel(student.prospectStatus || 'registrado')}</option>
                  )}
                </>
              )}
              {userRole === 'cashier' && (
                <>
                  {student.prospectStatus === 'pago_por_verificar' ? (
                    <>
                      <option value="pago_por_verificar">Pago Por Verificar</option>
                      <option value="matriculado">Matriculado</option>
                    </>
                  ) : (
                    <option value={student.prospectStatus}>{getProspectStatusLabel(student.prospectStatus || 'registrado')}</option>
                  )}
                </>
              )}
            </select>
            </div>
          );
        }
      },
      {
        headerName: 'Nivel Académico',
        field: 'academicLevel',
        width: 150,
        filter: 'agTextColumnFilter',
        cellRenderer: (params: any) => {
          const student = params.data;
          const academicLevel = student.academicLevel;
          
          if (!academicLevel) {
            return (
              <div className='flex items-center w-full h-full'>
                <span className="text-xs text-gray-400">Sin nivel</span>
              </div>
            );
          }
          
          return (
            <div className='flex items-center w-full h-full'>
              <span 
                className="px-3 py-1 rounded-full text-xs font-semibold text-white"
                style={{ backgroundColor: academicLevel.color }}
              >
                {academicLevel.name}
              </span>
            </div>
          );
        }
      },
      {
        headerName: 'Plan de Pago',
        field: 'paymentPlan',
        width: 180,
        filter: 'agTextColumnFilter',
        cellRenderer: (params: any) => {
          const student = params.data;
          const paymentPlan = student.paymentPlan;
          
          if (!paymentPlan) {
            return (
              <div className='flex items-center w-full h-full'>
                <span className="text-xs text-gray-400">Sin plan</span>
              </div>
            );
          }
          
          return (
            <div className='flex items-center w-full h-full'>
              <div>
                <div className="text-sm font-medium text-gray-900">{paymentPlan.name}</div>
                <div className="text-xs text-gray-500">
                  S/ {paymentPlan.total_amount.toFixed(2)} • {paymentPlan.installments_count} cuotas
                </div>
              </div>
            </div>
          );
        }
      },
      {
        headerName: 'Grupo',
        field: 'assignedGroupId',
        width: 150,
        filter: 'agTextColumnFilter',
        cellRenderer: (params: any) => {
          return (
            <div className='flex items-center space-x-2 w-full h-full'>
              <span className="text-sm text-gray-900">{getGroupName(params.value)}</span>
            </div>
          );
        }
      },
      {
        headerName: 'Puntos',
        field: 'points',
        width: 100,
        filter: 'agNumberColumnFilter',
        cellRenderer: (params: any) => {
          return (
            <div className="flex items-center justify-end h-full">
              <span className="text-sm font-medium text-gray-900">{params.value.toLocaleString()}</span>
            </div>
          );
        },
        type: 'rightAligned'
      },
      {
        headerName: 'Acciones',
        width: 120,
        sortable: false,
        filter: false,
        cellRenderer: (params: any) => {
          const student = params.data;
          return (
            <div className="flex items-center space-x-2 w-full h-full">
              {(userRole === 'admin' || userRole === 'sales_advisor') && (
                <>
                  <button
                    onClick={() => setEditingStudent(student)}
                    className="text-blue-600 hover:text-blue-900 p-1 hover:bg-blue-50 rounded transition-colors"
                    title="Editar prospecto"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteStudent(student.id)}
                    className="text-red-600 hover:text-red-900 p-1 hover:bg-red-50 rounded transition-colors"
                    title="Eliminar prospecto"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </>
              )}
              {userRole === 'cashier' && (
                <button
                  onClick={() => setEditingStudent(student)}
                  className="text-blue-600 hover:text-blue-900 p-1 hover:bg-blue-50 rounded transition-colors"
                  title="Ver detalles"
                >
                  <Eye className="h-4 w-4" />
                </button>
              )}
            </div>
          );
        }
      }
    ];

    // Agregar columna "Registrado Por" solo para admin
    if (userRole === 'admin') {
      columns.splice(3, 0, {
        headerName: 'Registrado Por',
        field: 'registeredBy.name',
        width: 220,
        filter: 'agTextColumnFilter',
        cellRenderer: (params: any) => {
          const student = params.data;
          if (student.registeredBy) {
            return (
              <div className="flex items-center w-full h-full">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center mr-2 flex-shrink-0">
                  <span className="text-white text-xs font-semibold">
                    {student.registeredBy.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                  </span>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">{student.registeredBy.name}</div>
                  <div className="text-xs text-gray-500">{student.registeredBy.email}</div>
                </div>
              </div>
            );
          }
          return <span className="text-sm text-gray-400">Sin asignar</span>;
        }
      });
    }

    return columns;
  }, [userRole]);

  const kanbanColumns = [
    { id: 'registrado', title: 'Registrado', color: 'border-blue-500 bg-blue-50' },
    { id: 'propuesta_enviada', title: 'Propuesta Enviada', color: 'border-yellow-500 bg-yellow-50' },
    { id: 'pago_por_verificar', title: 'Pago Por Verificar', color: 'border-orange-500 bg-orange-50' },
    { id: 'matriculado', title: 'Matriculado', color: 'border-green-500 bg-green-50' },
  ];

  // Filtrar columnas según el rol
  const getVisibleKanbanColumns = () => {
    if (userRole === 'cashier') {
      // Cajero solo ve: Pago Por Verificar, Matriculado
      return kanbanColumns.filter(col =>
        ['pago_por_verificar', 'matriculado'].includes(col.id)
      );
    } else if (userRole === 'sales_advisor') {
      // Asesor de ventas ve todas excepto puede que no necesite ver matriculado
      return kanbanColumns.filter(col =>
        ['registrado', 'propuesta_enviada', 'pago_por_verificar', 'matriculado'].includes(col.id)
      );
    }
    // Admin ve todas las columnas
    return kanbanColumns;
  };

  const getStudentsByStatus = (status: string) => {
    return filteredStudents.filter(student => student && student.prospectStatus === status);
  };

  const StudentForm = ({ student, onSubmit, onCancel }: {
    student?: Student;
    onSubmit: (data: any) => void;
    onCancel: () => void;
  }) => {
    const [formData, setFormData] = useState({
      // Datos Personales
      firstName: student?.firstName || '',
      paternalLastName: student?.paternalLastName || '',
      maternalLastName: student?.maternalLastName || '',
      phoneNumber: student?.phoneNumber || '',
      gender: student?.gender || '',
      birthDate: student?.birthDate || '',
      documentType: student?.documentType || 'dni',
      documentNumber: student?.documentNumber || '',
      educationLevel: student?.educationLevel || '',
      email: student?.email || '',

      // Datos Académicos - ✅ Actualizados
      paymentDate: student?.paymentDate || '',
      enrollmentDate: student?.enrollmentDate || '',
      registrationDate: student?.registrationDate || new Date().toISOString().split('T')[0],
      enrollmentCode: student?.enrollmentCode || '',
      academicLevelId: student?.academicLevelId || undefined,  // ✅ Cambiado de academicLevel
      paymentPlanId: student?.paymentPlanId || undefined,      // ✅ Cambiado de contractedPlan
      contractFile: null as File | null,
      contractFileName: student?.contractFileName || '',
      paymentVoucherFile: null as File | null,                 // ✅ Nuevo: archivo del voucher
      paymentVoucherFileName: student?.paymentVoucherFileName || '', // ✅ Nuevo: nombre del voucher
      paymentVerified: student?.paymentVerified || false,

      // Examen de Categorización
      hasPlacementTest: student?.hasPlacementTest || false,
      testDate: student?.testDate || '',
      testScore: student?.testScore || '',

      // Datos del Apoderado/Titular
      guardianName: student?.guardianName || '',
      guardianDocumentNumber: student?.guardianDocumentNumber || '',
      guardianEmail: student?.guardianEmail || '',
      guardianBirthDate: student?.guardianBirthDate || '',
      guardianPhone: student?.guardianPhone || '',
      guardianAddress: student?.guardianAddress || '',

      status: student?.status || 'active',
    });

    // Debug: Mostrar valores iniciales cuando es cajero
    React.useEffect(() => {
      if (isCashierEditing) {
        console.log('Estudiante recibido:', student);
        console.log('FormData inicial:', formData);
      }
    }, []);

    // Determinar si el cajero está editando
    const isCashierEditing = userRole === 'cashier' && student;

    // Función para generar código de matrícula
    const generateEnrollmentCode = () => {
      const year = new Date().getFullYear();
      const month = String(new Date().getMonth() + 1).padStart(2, '0');
      const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      return `MAT-${year}${month}-${random}`;
    };

    // Efecto para manejar el cambio de fecha de pago
    const handlePaymentDateChange = (paymentDate: string) => {
      if (paymentDate) {
        // Automáticamente llenar la fecha de matrícula con la misma fecha de pago
        const enrollmentDate = paymentDate;
        // Generar código de matrícula automáticamente
        const enrollmentCode = generateEnrollmentCode();

        setFormData(prev => ({
          ...prev,
          paymentDate,
          enrollmentDate,
          enrollmentCode
        }));
      } else {
        // Si se borra la fecha de pago, limpiar matrícula y código
        setFormData(prev => ({
          ...prev,
          paymentDate: '',
          enrollmentDate: '',
          enrollmentCode: ''
        }));
      }
    };

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      console.log('📝 Formulario enviado:', formData);
      console.log('📝 Función onSubmit:', onSubmit);
      onSubmit(formData);
    };

    // Bloquear scroll del body cuando el modal está abierto
    React.useEffect(() => {
      // Guardar el scroll actual
      const scrollY = window.scrollY;

      // Bloquear scroll completamente
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';

      return () => {
        // Restaurar scroll
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        window.scrollTo(0, scrollY);
      };
    }, []);

    return (
      <div
        className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-sm animate-fade-in flex items-center justify-center p-4"
        onClick={onCancel}
        style={{ height: '100vh', width: '100vw' }}
      >
        {/* Modal Container */}
        <div
          className="relative bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col animate-scale-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header del Modal */}
          <div className="relative bg-blue-600 px-8 py-6 rounded-t-3xl flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-white mb-1">
                  {isCashierEditing
                    ? 'Verificación de Pago'
                    : student
                      ? 'Editar Prospecto'
                      : 'Nuevo Prospecto'
                  }
                </h3>
                <p className="text-blue-100">
                  {isCashierEditing
                    ? 'Verifica el pago y matricula al estudiante'
                    : student
                      ? 'Actualiza la información del prospecto'
                      : 'Completa la información para registrar un nuevo prospecto'}
                </p>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={onCancel}
                className="flex-shrink-0 w-10 h-10 flex items-center justify-center text-white hover:bg-white/10 rounded-lg transition-all duration-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Contenido del Modal - Con scroll */}
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="p-8 space-y-6 overflow-y-auto flex-1">
              {isCashierEditing ? (
                // VISTA SIMPLIFICADA PARA CAJERO - SOLO VERIFICACIÓN
                <>
                  {/* Información del Prospecto (Solo lectura) */}
                  <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 shadow-sm">
                    <h4 className="text-lg font-bold text-blue-900 mb-5 flex items-center gap-2">
                      <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                      </svg>
                      Información del Prospecto
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="bg-white rounded-xl p-4 border border-blue-100 shadow-sm hover:shadow-md transition-all">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Nombre Completo</p>
                        <p className="text-base font-bold text-gray-900">{student?.name}</p>
                      </div>
                      <div className="bg-white rounded-xl p-4 border border-blue-100 shadow-sm hover:shadow-md transition-all">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Correo Electrónico</p>
                        <p className="text-sm font-bold text-gray-900 break-all">{student?.email}</p>
                      </div>
                      <div className="bg-white rounded-xl p-4 border border-blue-100 shadow-sm hover:shadow-md transition-all">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Documento</p>
                        <p className="text-base font-bold text-gray-900">
                          {student?.documentType?.toUpperCase()}: {student?.documentNumber}
                        </p>
                      </div>
                      <div className="bg-white rounded-xl p-4 border border-blue-100 shadow-sm hover:shadow-md transition-all">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Teléfono</p>
                        <p className="text-base font-bold text-gray-900">{student?.phoneNumber}</p>
                      </div>
                      <div className="bg-white rounded-xl p-4 border border-blue-100 shadow-sm hover:shadow-md transition-all">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Nivel Académico</p>
                        <p className="text-base font-bold text-gray-900">
                          {student?.academicLevel?.name || 'Sin nivel asignado'}
                        </p>
                      </div>
                      <div className="bg-white rounded-xl p-4 border border-blue-100 shadow-sm hover:shadow-md transition-all">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Plan Contratado</p>
                        <p className="text-base font-bold text-gray-900">
                          {student?.paymentPlan?.name || 'Sin plan asignado'}
                        </p>
                        {student?.paymentPlan && (
                          <p className="text-xs text-gray-600 mt-1">
                            {student.paymentPlan.installments_count} cuotas • S/ {student.paymentPlan.total_amount.toFixed(2)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Datos de Pago (Solo lectura) */}
                  <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6 shadow-sm">
                    <h4 className="text-lg font-bold text-green-900 mb-5 flex items-center gap-2">
                      <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                        <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
                      </svg>
                      Datos de Pago Reportados
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="bg-white rounded-xl p-4 border border-green-100 shadow-sm hover:shadow-md transition-all">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Fecha de Pago</p>
                        <p className="text-base font-bold text-gray-900">
                          {student?.paymentDate ? new Date(student.paymentDate).toLocaleDateString('es-PE', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          }) : '-'}
                        </p>
                      </div>
                      <div className="bg-white rounded-xl p-4 border border-green-100 shadow-sm hover:shadow-md transition-all">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Registrado por</p>
                        <p className="text-base font-bold text-gray-900">{student?.registeredBy?.name || '-'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Contrato PDF - Visible para Cajero */}
                  {student?.contractFileName && (
                    <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-6 shadow-sm">
                      <h4 className="text-lg font-bold text-purple-900 mb-5 flex items-center gap-2">
                        <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                        </svg>
                        Contrato Subido
                      </h4>
                      <div className="bg-white rounded-xl p-4 border border-purple-100 shadow-sm">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                              <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <div>
                              <p className="font-bold text-gray-900">{student.contractFileName}</p>
                              <p className="text-sm text-gray-500">Documento PDF del contrato</p>
                            </div>
                          </div>
                          <a
                            href={`/admin/students/${student.id}/contract`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            Ver PDF
                          </a>
                        </div>
                      </div>
                    </div>
                  )}

                  {!student?.contractFileName && (
                    <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-6 shadow-sm">
                      <div className="flex items-start gap-3">
                        <svg className="w-6 h-6 text-yellow-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <div>
                          <p className="text-sm font-bold text-yellow-900">⚠️ Sin contrato</p>
                          <p className="text-sm text-yellow-700 mt-1">
                            El asesor de ventas aún no ha subido el contrato PDF.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ✅ NUEVO: Voucher de Pago - Visible para Cajero */}
                  {student?.paymentVoucherFileName && (
                    <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6 shadow-sm">
                      <h4 className="text-lg font-bold text-green-900 mb-5 flex items-center gap-2">
                        <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                        </svg>
                        Voucher de Pago Subido
                      </h4>
                      <div className="bg-white rounded-xl p-4 border border-green-100 shadow-sm">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-14 h-14 bg-green-100 rounded-lg flex items-center justify-center">
                              <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <div>
                              <p className="font-bold text-gray-900 text-lg">{student.paymentVoucherFileName}</p>
                              <p className="text-sm text-gray-500">Comprobante de pago del estudiante</p>
                            </div>
                          </div>
                          <a
                            href={`/admin/students/${student.id}/payment-voucher`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-5 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl font-bold transition-all shadow-md hover:shadow-lg flex items-center gap-2"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            Ver Voucher
                          </a>
                        </div>
                      </div>
                    </div>
                  )}

                  {!student?.paymentVoucherFileName && (
                    <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-6 shadow-sm">
                      <div className="flex items-start gap-3">
                        <svg className="w-6 h-6 text-yellow-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <div>
                          <h5 className="font-bold text-yellow-900 mb-1">⚠️ Sin voucher de pago</h5>
                          <p className="text-sm text-yellow-800">
                            El asesor de ventas debe subir el comprobante de pago antes de que puedas verificarlo.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Verificación de Pago - ACCIÓN PRINCIPAL DEL CAJERO */}
                  <div className="p-6 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 rounded-2xl border-2 border-green-400 shadow-lg">
                    <label className="flex items-start gap-4 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={formData.paymentVerified}
                        onChange={(e) => setFormData({ ...formData, paymentVerified: e.target.checked })}
                        className="w-7 h-7 text-green-600 focus:ring-4 focus:ring-green-300 rounded-lg border-2 border-gray-400 transition-all mt-1 cursor-pointer"
                      />
                      <div className="flex-1">
                        <span className="text-xl font-bold text-gray-900 block mb-2 group-hover:text-green-700 transition-colors">
                          ✓ Confirmar Verificación de Pago
                        </span>
                        <span className="text-sm text-gray-700 leading-relaxed">
                          He verificado que el pago ha sido recibido correctamente.
                          <span className="block mt-3 text-green-900 font-semibold bg-green-100 p-3 rounded-lg border-l-4 border-green-600">
                            💡 Al confirmar, el estudiante será <strong>matriculado automáticamente</strong> en el sistema.
                          </span>
                        </span>
                      </div>
                      {formData.paymentVerified && (
                        <div className="flex-shrink-0 animate-bounce">
                          <svg className="w-12 h-12 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </label>
                  </div>

                  {/* Mensaje informativo sobre matrícula */}
                  {formData.paymentVerified && (
                    <div className="p-5 bg-green-50 rounded-2xl border-l-4 border-green-500 shadow-sm animate-fade-in">
                      <div className="flex items-start gap-3">
                        <svg className="w-6 h-6 text-green-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <div>
                          <p className="text-sm font-bold text-green-900">✅ Pago verificado - Listo para matricular</p>
                          <p className="text-sm text-green-700 mt-1">
                            Al guardar, el estudiante será matriculado automáticamente y pasará al estado "Matriculado".
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Información de verificación de pago */}
                  {student?.verifiedPaymentBy && (
                    <div className="p-5 bg-green-50 rounded-xl border border-green-200 shadow-sm">
                      <h5 className="text-sm font-bold text-green-900 mb-3 flex items-center gap-2">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Pago Verificado
                      </h5>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="bg-white p-3 rounded-lg">
                          <p className="text-gray-600 mb-1">Verificado por:</p>
                          <p className="font-bold text-gray-900">{student.verifiedPaymentBy.name}</p>
                        </div>
                        <div className="bg-white p-3 rounded-lg">
                          <p className="text-gray-600 mb-1">Fecha de verificación:</p>
                          <p className="font-bold text-gray-900">
                            {student.paymentVerifiedAt ? new Date(student.paymentVerifiedAt).toLocaleString('es-PE') : '-'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                // VISTA COMPLETA PARA ADMIN Y ASESOR DE VENTAS
                <>
                  {/* Sección: Datos Personales */}
                  <div>
                    <div className="flex items-center mb-4 pb-2 border-b-2 border-blue-600">
                      <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold mr-3">
                        1
                      </div>
                      <h4 className="text-lg font-semibold text-gray-900">Datos Personales del Prospecto</h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Input
                        label="Nombres"
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        required
                      />

                      <Input
                        label="Apellido Paterno"
                        value={formData.paternalLastName}
                        onChange={(e) => setFormData({ ...formData, paternalLastName: e.target.value })}
                        required
                      />

                      <Input
                        label="Apellido Materno"
                        value={formData.maternalLastName}
                        onChange={(e) => setFormData({ ...formData, maternalLastName: e.target.value })}
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                      <Select2
                        label="Tipo de Documento"
                        value={formData.documentType}
                        onChange={(value) => setFormData({ ...formData, documentType: value as string })}
                        options={[
                          { value: 'dni', label: 'DNI' },
                          { value: 'ce', label: 'Carnet de Extranjería' }
                        ]}
                        isSearchable={false}
                        isClearable={false}
                      />

                      <Input
                        label="Número de Documento"
                        value={formData.documentNumber}
                        onChange={(e) => setFormData({ ...formData, documentNumber: e.target.value })}
                        required
                      />

                      <DatePicker
                        label="Fecha de Nacimiento"
                        selected={formData.birthDate ? new Date(formData.birthDate) : null}
                        onChange={(date) => setFormData({ ...formData, birthDate: date ? date.toISOString().split('T')[0] : '' })}
                        maxDate={new Date()}
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                      <Select2
                        label="Sexo"
                        value={formData.gender}
                        onChange={(value) => setFormData({ ...formData, gender: value as string })}
                        options={[
                          { value: 'M', label: 'Masculino' },
                          { value: 'F', label: 'Femenino' }
                        ]}
                        isSearchable={false}
                      />

                      <Input
                        label="Número de Celular"
                        type="tel"
                        value={formData.phoneNumber}
                        onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                        required
                      />

                      <Select2
                        label="Grado de Instrucción"
                        value={formData.educationLevel}
                        onChange={(value) => setFormData({ ...formData, educationLevel: value as string })}
                        options={[
                          { value: 'primaria', label: 'Primaria' },
                          { value: 'secundaria', label: 'Secundaria' },
                          { value: 'tecnico', label: 'Técnico' },
                          { value: 'universitario', label: 'Universitario' },
                          { value: 'postgrado', label: 'Postgrado' }
                        ]}
                      />
                    </div>

                    <div className="mt-4">
                      <Input
                        label="Correo Electrónico"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  {/* Sección: Datos Académicos */}
                  <div>
                    <div className="flex items-center mb-4 pb-2 border-b-2 border-green-600">
                      <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold mr-3">
                        2
                      </div>
                      <h4 className="text-lg font-semibold text-gray-900">Datos Académicos y de Matrícula</h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                      <DatePicker
                        label="Fecha de Registro"
                        selected={formData.registrationDate ? new Date(formData.registrationDate) : null}
                        onChange={() => { }} // No hace nada, es solo lectura
                        disabled
                        required
                        helperText="Se establece automáticamente con la fecha actual"
                      />

                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <DatePicker
                        label="Fecha de Pago"
                        selected={formData.paymentDate ? new Date(formData.paymentDate) : null}
                        onChange={(date) => handlePaymentDateChange(date ? date.toISOString().split('T')[0] : '')}
                        maxDate={new Date()}
                      />

                      <Select2
                        label="Nivel Académico"
                        value={formData.academicLevelId}
                        onChange={(value) => {
                          setFormData({ ...formData, academicLevelId: value as number });
                        }}
                        options={academicLevels.map(level => ({
                          value: level.id,
                          label: level.name
                        }))}
                        isSearchable={false}
                        isClearable={true}
                      />
                    </div>

                    <div className="mt-4">
                      <Select2
                        label="Plan de Pago"
                        value={formData.paymentPlanId}
                        onChange={(value) => setFormData({ ...formData, paymentPlanId: value as number })}
                        options={paymentPlans
                          .filter(plan => plan.is_active)
                          .map(plan => ({
                            value: plan.id,
                            label: `${plan.name} - ${plan.installments_count} cuotas (S/ ${plan.total_amount.toFixed(2)})`
                          }))
                        }
                        isSearchable={false}
                        isClearable={true}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        El plan de pago es independiente del nivel académico
                      </p>
                    </div>

                    {/* ✅ NUEVO: Campo para subir voucher de pago */}
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Voucher/Comprobante de Pago
                      </label>
                      
                      {/* Mostrar voucher existente si ya hay uno */}
                      {student?.paymentVoucherFileName && !formData.paymentVoucherFile && (
                        <div className="bg-white rounded-xl p-4 border-2 border-green-200 mb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                                <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                                </svg>
                              </div>
                              <div>
                                <p className="font-bold text-gray-900">{student.paymentVoucherFileName}</p>
                                <p className="text-sm text-gray-500">Comprobante de pago subido</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <a
                                href={`/admin/students/${student.id}/payment-voucher`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-2 text-sm"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                Ver
                              </a>
                              <button
                                type="button"
                                onClick={() => setFormData({ ...formData, paymentVoucherFileName: '', paymentVoucherFile: null })}
                                className="px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold transition-colors text-sm"
                              >
                                Cambiar
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Input para subir nuevo voucher */}
                      {(!student?.paymentVoucherFileName || formData.paymentVoucherFile || formData.paymentVoucherFileName === '') && (
                        <div>
                          <div className="flex items-center space-x-2">
                            <label className="flex-1 cursor-pointer">
                              <div className="flex items-center justify-center px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all">
                                <svg className="w-5 h-5 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span className="text-sm text-gray-600">
                                  {formData.paymentVoucherFile?.name || 'Seleccionar imagen o PDF del voucher'}
                                </span>
                              </div>
                              <input
                                type="file"
                                accept="image/*,.pdf"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    // Validar tamaño (máx 5MB)
                                    if (file.size > 5 * 1024 * 1024) {
                                      toast.error('Archivo muy grande', {
                                        description: 'El voucher no debe superar 5MB',
                                        duration: 4000,
                                      });
                                      return;
                                    }
                                    setFormData({
                                      ...formData,
                                      paymentVoucherFile: file,
                                      paymentVoucherFileName: file.name
                                    });
                                  }
                                }}
                              />
                            </label>
                            {formData.paymentVoucherFile && (
                              <button
                                type="button"
                                onClick={() => setFormData({ ...formData, paymentVoucherFile: null, paymentVoucherFileName: student?.paymentVoucherFileName || '' })}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Eliminar archivo"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            📸 Adjunta la captura o foto del voucher de pago (JPG, PNG o PDF, máx. 5MB)
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <DatePicker
                        label="Fecha de Matrícula"
                        selected={formData.enrollmentDate ? new Date(formData.enrollmentDate) : null}
                        onChange={() => { }} // No hace nada, es solo lectura
                        disabled
                        helperText="Se llena automáticamente al seleccionar la fecha de pago"
                      />

                      <Input
                        label="Código de Matrícula"
                        value={formData.enrollmentCode}
                        onChange={() => { }} // No hace nada, es solo lectura
                        disabled
                        helperText="Se genera automáticamente al confirmar el pago"
                      />
                    </div>

                    {/* Subir Contrato y Verificación de Pago */}
                    <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="grid grid-cols-1 gap-4">

                        {/* Mostrar contrato existente si ya hay uno */}
                        {student?.contractFileName && !formData.contractFile && (
                          <div className="bg-white rounded-xl p-4 border-2 border-purple-200">
                            <label className="block text-sm font-medium text-gray-700 mb-3">
                              Contrato Actual
                            </label>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                                  <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                                  </svg>
                                </div>
                                <div>
                                  <p className="font-bold text-gray-900">{student.contractFileName}</p>
                                  <p className="text-sm text-gray-500">PDF del contrato subido</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <a
                                  href={`/admin/students/${student.id}/contract`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-2 text-sm"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                  Ver
                                </a>
                                <button
                                  type="button"
                                  onClick={() => setFormData({ ...formData, contractFileName: '', contractFile: null })}
                                  className="px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold transition-colors text-sm"
                                >
                                  Cambiar
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Mostrar input para subir nuevo contrato */}
                        {(!student?.contractFileName || formData.contractFile || formData.contractFileName === '') && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              {student?.contractFileName ? 'Nuevo Contrato (PDF)' : 'Contrato (PDF)'}
                            </label>
                            <div className="flex items-center space-x-2">
                              <label className="flex-1 cursor-pointer">
                                <div className="flex items-center justify-center px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all">
                                  <svg className="w-5 h-5 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                  </svg>
                                  <span className="text-sm text-gray-600">
                                    {formData.contractFile?.name || 'Seleccionar archivo PDF'}
                                  </span>
                                </div>
                                <input
                                  type="file"
                                  accept=".pdf"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      setFormData({
                                        ...formData,
                                        contractFile: file,
                                        contractFileName: file.name
                                      });
                                    }
                                  }}
                                />
                              </label>
                              {formData.contractFile && (
                                <button
                                  type="button"
                                  onClick={() => setFormData({ ...formData, contractFile: null, contractFileName: student?.contractFileName || '' })}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Eliminar archivo"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              Adjunta el contrato firmado en formato PDF (máx. 10MB)
                            </p>
                          </div>
                        )}

                        {/* Verificación de pago - solo para admin */}
                        {userRole === 'admin' && (
                          <div className="flex items-center">
                            <label className="flex items-center space-x-3 cursor-pointer bg-white p-4 rounded-xl border border-slate-200 hover:border-blue-300 transition-all w-full">
                              <input
                                type="checkbox"
                                checked={formData.paymentVerified}
                                onChange={(e) => setFormData({ ...formData, paymentVerified: e.target.checked })}
                                className="w-5 h-5 text-blue-600 focus:ring-blue-500 rounded"
                              />
                              <div className="flex-1">
                                <span className="text-sm font-bold text-gray-900 block">Pago Verificado</span>
                                <span className="text-xs text-gray-500">Marca si el pago ha sido confirmado</span>
                              </div>
                            </label>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Sección: Examen de Categorización */}
                  <div>
                    <div className="flex items-center mb-4 pb-2 border-b-2 border-purple-600">
                      <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold mr-3">
                        3
                      </div>
                      <h4 className="text-lg font-semibold text-gray-900">Examen de Categorización</h4>
                    </div>

                    <div className="mb-4">
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.hasPlacementTest}
                          onChange={(e) => setFormData({ ...formData, hasPlacementTest: e.target.checked })}
                          className="w-5 h-5 text-purple-600 focus:ring-purple-500 rounded"
                        />
                        <span className="text-sm font-medium text-gray-700">El prospecto realizó examen de categorización</span>
                      </label>
                    </div>

                    {formData.hasPlacementTest && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-8">
                        <DatePicker
                          label="Fecha del Examen"
                          selected={formData.testDate ? new Date(formData.testDate) : null}
                          onChange={(date) => setFormData({ ...formData, testDate: date ? date.toISOString().split('T')[0] : '' })}
                          maxDate={new Date()}
                          required={formData.hasPlacementTest}
                        />

                        <Input
                          label="Nota del Examen (0-20)"
                          type="number"
                          value={formData.testScore}
                          onChange={(e) => setFormData({ ...formData, testScore: e.target.value })}
                          required={formData.hasPlacementTest}
                          min="0"
                          max="20"
                          step="0.1"
                        />
                      </div>
                    )}
                  </div>

                  {/* Sección: Datos del Apoderado/Titular */}
                  <div>
                    <div className="flex items-center mb-4 pb-2 border-b-2 border-orange-600">
                      <div className="w-8 h-8 bg-orange-600 text-white rounded-full flex items-center justify-center font-bold mr-3">
                        4
                      </div>
                      <h4 className="text-lg font-semibold text-gray-900">Datos del Apoderado o Titular de la Cuenta</h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        label="Nombre Completo del Titular"
                        value={formData.guardianName}
                        onChange={(e) => setFormData({ ...formData, guardianName: e.target.value })}
                      />

                      <Input
                        label="DNI del Titular"
                        value={formData.guardianDocumentNumber}
                        onChange={(e) => setFormData({ ...formData, guardianDocumentNumber: e.target.value })}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <Input
                        label="Correo Electrónico del Titular"
                        type="email"
                        value={formData.guardianEmail}
                        onChange={(e) => setFormData({ ...formData, guardianEmail: e.target.value })}
                      />

                      <DatePicker
                        label="Fecha de Nacimiento del Titular"
                        selected={formData.guardianBirthDate ? new Date(formData.guardianBirthDate) : null}
                        onChange={(date) => setFormData({ ...formData, guardianBirthDate: date ? date.toISOString().split('T')[0] : '' })}
                        maxDate={new Date()}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <Input
                        label="Número de Celular del Apoderado"
                        type="tel"
                        value={formData.guardianPhone}
                        onChange={(e) => setFormData({ ...formData, guardianPhone: e.target.value })}
                      />

                      <Input
                        label="Dirección del Titular"
                        value={formData.guardianAddress}
                        onChange={(e) => setFormData({ ...formData, guardianAddress: e.target.value })}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer con Botones */}
            <div className="bg-gray-50 px-8 py-6 rounded-b-3xl border-t-2 border-gray-200 flex-shrink-0">
              <div className="flex justify-between items-center gap-4">
                {/* Botones de Cronograma */}
                {student && (
                  <>
                    {/* Ver Cronograma - Solo para estudiantes matriculados */}
                    {student.prospectStatus === 'matriculado' && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedStudentForSchedule(student);
                          setPaymentScheduleModalOpen(true);
                        }}
                        className="px-6 py-3 text-blue-700 bg-blue-50 hover:bg-blue-100 border-2 border-blue-300 rounded-xl font-semibold transition-all duration-200 flex items-center gap-2"
                      >
                        <Calendar className="w-4 h-4" />
                        Ver Cronograma de Pagos
                      </button>
                    )}
                    
                    {/* Crear/Ver Cronograma - Para cajeros en pago_por_verificar */}
                    {student.prospectStatus === 'pago_por_verificar' && userRole === 'cashier' && (
                      <button
                        type="button"
                        onClick={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          
                          console.log('Botón cronograma clickeado');
                          
                          if (!student.paymentPlanId) {
                            toast.error('El estudiante no tiene un plan de pago asignado');
                            return;
                          }
                          
                          // Cerrar el modal de edición primero
                          onCancel();
                          
                          // Esperar un poco para que se cierre el modal
                          setTimeout(async () => {
                            // Primero intentar obtener el enrollment existente
                            try {
                              const checkResponse = await axios.get(`/api/students/${student.id}/enrollment`);
                              
                              console.log('Enrollment response:', checkResponse.data);
                              
                              // Si existe enrollment, abrir modal
                              if (checkResponse.status === 200) {
                                setSelectedStudentForSchedule(student);
                                setPaymentScheduleModalOpen(true);
                                return;
                              }
                            } catch (checkError) {
                              console.log('No enrollment found, will try to create:', checkError);
                              
                              // Si no existe (404), intentar crear uno nuevo
                              if (!student.enrollmentDate) {
                                toast.error('El estudiante no tiene fecha de matrícula');
                                return;
                              }
                              
                              try {
                                const createResponse = await axios.post('/api/enrollments', {
                                  student_id: student.id,
                                  payment_plan_id: student.paymentPlanId,
                                  enrollment_date: student.enrollmentDate,
                                  enrollment_fee: 0,
                                  notes: 'Matrícula creada desde gestión de prospectos'
                                });
                                
                                console.log('Enrollment created:', createResponse.data);
                                
                                toast.success('Cronograma de pagos creado exitosamente');
                                
                                // Abrir el modal después de crear
                                setTimeout(() => {
                                  setSelectedStudentForSchedule(student);
                                  setPaymentScheduleModalOpen(true);
                                }, 300);
                              } catch (createError) {
                                console.error('Error creating enrollment:', createError);
                                toast.error('Error al crear el cronograma de pagos');
                              }
                            }
                          }, 200);
                        }}
                        className="px-6 py-3 text-green-700 bg-green-50 hover:bg-green-100 border-2 border-green-300 rounded-xl font-semibold transition-all duration-200 flex items-center gap-2"
                      >
                        <Calendar className="w-4 h-4" />
                        Ver/Crear Cronograma de Pagos
                      </button>
                    )}
                  </>
                )}
                
                <div className="flex justify-end gap-4 ml-auto">
                  <button
                    type="button"
                    onClick={onCancel}
                    className="px-6 py-3 text-gray-700 bg-white hover:bg-gray-100 border-2 border-gray-300 rounded-xl font-semibold transition-all duration-200"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isCashierEditing && !formData.paymentVerified}
                    className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 shadow-sm flex items-center gap-2 ${isCashierEditing && !formData.paymentVerified
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                  >
                    {isCashierEditing
                      ? (formData.paymentVerified ? 'Verificar y Matricular' : 'Marcar la verificación')
                      : student
                        ? 'Actualizar'
                        : 'Registrar'}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    );
  };

  return (
    <AuthenticatedLayout>
      <div className="p-6 space-y-6">
        {/* Alerta Elegante */}
        {showAlert && (
          <div className="fixed top-4 right-4 z-50 animate-slide-in">
            <div className="bg-white border-l-4 border-red-500 rounded-lg shadow-lg p-4 max-w-md">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-gray-900">
                    No se puede matricular
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    El prospecto debe tener fecha de pago y fecha de matrícula para poder ser movido al estado "Matriculado".
                  </p>
                </div>
                <div className="ml-auto pl-3">
                  <button
                    onClick={() => setShowAlert(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestión de Prospectos</h1>
            <p className="text-gray-600">
              {userRole === 'sales_advisor'
                ? 'Gestiona tus prospectos y envía propuestas comerciales'
                : userRole === 'cashier'
                  ? 'Verifica pagos y matricula estudiantes'
                  : 'Gestiona la inscripción de prospectos y seguimiento del proceso comercial'}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${viewMode === 'list'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                  }`}
              >
                <List className="h-4 w-4" />
                <span>Lista</span>
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${viewMode === 'kanban'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                  }`}
              >
                <Columns className="h-4 w-4" />
                <span>Kanban</span>
              </button>
            </div>

            {(userRole === 'admin' || userRole === 'sales_advisor') && (
              <button
                onClick={() => setShowCreateForm(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
              >
                <Plus className="h-5 w-5" />
                <span>Agregar Prospecto</span>
              </button>
            )}
          </div>
        </div>

        {/* Create/Edit Form */}
        {showCreateForm && (
          <StudentForm
            onSubmit={handleCreateStudent}
            onCancel={() => setShowCreateForm(false)}
          />
        )}

        {editingStudent && (
          <StudentForm
            student={editingStudent}
            onSubmit={handleUpdateStudent}
            onCancel={() => setEditingStudent(null)}
          />
        )}

        {/* Kanban Pipeline - Estilo Profesional (Jira/Linear) */}
        {viewMode === 'kanban' && (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="overflow-x-auto">
              <div className="flex gap-4 pb-4" style={{ minWidth: 'max-content' }}>
                {getVisibleKanbanColumns().map((column) => {
                  const studentsInColumn = getStudentsByStatus(column.id);

                  return (
                    <div
                      key={column.id}
                      className="flex-shrink-0 w-[300px]"
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, column.id as any)}
                    >
                      {/* Column Header - Con color de estado */}
                      <div className={`rounded-lg p-3 mb-3 ${column.id === 'registrado' ? 'bg-blue-500' :
                          column.id === 'propuesta_enviada' ? 'bg-yellow-500' :
                            column.id === 'pago_por_verificar' ? 'bg-orange-500' :
                              'bg-green-500'
                        }`}>
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-semibold text-white uppercase tracking-wide">
                            {column.title}
                          </h3>
                          <span className="px-2 py-0.5 bg-white/20 backdrop-blur-sm rounded-full text-xs font-bold text-white">
                            {studentsInColumn.length}
                          </span>
                        </div>
                      </div>

                      {/* Cards Container */}
                      <div className="bg-gray-100/50 rounded-lg p-2 min-h-[500px] max-h-[calc(100vh-250px)] overflow-y-auto space-y-2">
                        <AnimatePresence mode="popLayout">
                          {studentsInColumn.map((student) => {
                            // El cajero NO puede arrastrar - solo puede verificar desde el modal
                            const isDraggable =
                              userRole === 'admin' ||
                              (userRole === 'sales_advisor' && (student.prospectStatus === 'registrado' || student.prospectStatus === 'propuesta_enviada'));

                            return (
                              <motion.div
                                key={student.id}
                                layout
                                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, x: -20, scale: 0.9, transition: { duration: 0.2 } }}
                                transition={{ 
                                  type: "spring",
                                  stiffness: 500,
                                  damping: 35,
                                  mass: 0.5
                                }}
                                draggable={isDraggable}
                                onDragStart={(e) => {
                                  if (isDraggable) {
                                    handleDragStart(e as any, student);
                                  }
                                }}
                                className={`bg-white rounded-lg border border-gray-200 p-3 ${isDraggable
                                    ? 'cursor-grab active:cursor-grabbing hover:shadow-md hover:border-gray-300'
                                    : userRole === 'cashier'
                                      ? 'cursor-pointer hover:shadow-md hover:border-blue-300'
                                      : 'cursor-default opacity-50'
                                  } transition-all duration-200`}
                                whileHover={isDraggable ? { scale: 1.02, y: -2 } : userRole === 'cashier' ? { scale: 1.02, y: -2 } : {}}
                                whileTap={isDraggable ? { scale: 0.98 } : {}}
                                onClick={() => {
                                  // Si es cajero, al hacer clic abre el modal de verificación
                                  if (userRole === 'cashier' && student.prospectStatus === 'pago_por_verificar') {
                                    setEditingStudent(student);
                                  }
                                }}
                              >
                                {/* Card Content */}
                                <div className="flex items-start gap-3">
                                  {/* Avatar */}
                                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                                    <span className="text-white text-xs font-semibold">
                                      {student.name.split(' ').slice(0, 2).map(n => n[0]).join('')}
                                    </span>
                                  </div>

                                  {/* Info */}
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-medium text-sm text-gray-900 truncate">
                                      {student.name}
                                    </h4>
                                    <p className="text-xs text-gray-500 truncate mt-0.5">
                                      {student.email}
                                    </p>

                                    {/* Tags */}
                                    <div className="flex flex-wrap gap-1 mt-2">
                                      {student.level && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                                          {student.level === 'basic' ? 'Básico' : student.level === 'intermediate' ? 'Intermedio' : 'Avanzado'}
                                        </span>
                                      )}
                                      {student.contractedPlan && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-700 border border-purple-100">
                                          {student.contractedPlan}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Footer Actions */}
                                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                                  <div className="flex items-center gap-1">
                                    {(userRole === 'admin' || userRole === 'sales_advisor') && (
                                      <>
                                        <button
                                          onClick={() => setEditingStudent(student)}
                                          className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                          title="Editar"
                                        >
                                          <Edit className="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                          onClick={() => handleDeleteStudent(student.id)}
                                          className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                          title="Eliminar"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                      </>
                                    )}
                                    {userRole === 'cashier' && (
                                      <button
                                        onClick={() => setEditingStudent(student)}
                                        className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                        title="Ver detalles"
                                      >
                                        <Eye className="h-3.5 w-3.5" />
                                      </button>
                                    )}
                                  </div>

                                  {student.paymentDate && (
                                    <span className="text-xs text-gray-400">
                                      {new Date(student.paymentDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                                    </span>
                                  )}
                                </div>
                              </motion.div>
                            );
                          })}
                        </AnimatePresence>

                        {/* Empty State */}
                        {studentsInColumn.length === 0 && (
                          <div className="text-center py-12">
                            <Users className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                            <p className="text-xs text-gray-400">Sin prospectos</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* List View con AG Grid */}
        {viewMode === 'list' && (
          <>
            {/* Barra de búsqueda */}
              <div className="relative">
                <Input
                  type="text"
                  label="Buscar por nombre, email, código, teléfono, estado, nivel, plan..."
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
                    <XCircle className="w-5 h-5" />
                  </button>
                )}
              </div>
             
           

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
                paginationPageSizeSelector={[5, 10, 20, 50, 100]}
                rowSelection={{ mode: 'singleRow' }}
                animateRows={true}
                domLayout="normal"
                rowHeight={60}
                headerHeight={48}
                suppressCellFocus={true}
                rowClass="hover:bg-gray-50"
              />
            </div>
          </>
        )}

      </div>
      
      {/* Payment Schedule Modal */}
      {selectedStudentForSchedule && (
        <PaymentScheduleModal
          open={paymentScheduleModalOpen}
          onOpenChange={setPaymentScheduleModalOpen}
          studentId={selectedStudentForSchedule.id}
          studentName={selectedStudentForSchedule.name}
          userRole={userRole}
        />
      )}
    </AuthenticatedLayout>
  );
};

export default StudentManagement;