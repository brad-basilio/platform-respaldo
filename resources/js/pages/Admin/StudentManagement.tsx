import React, { useState } from 'react';
import { Users, Plus, CreditCard as Edit, Trash2, Search, UserCheck, UserX, BookOpen, Eye, List, Columns2 as Columns } from 'lucide-react';
import { Student, Group } from '../../types/models';
import AuthenticatedLayout from '../../layouts/AuthenticatedLayout';
import { router } from '@inertiajs/react';
import axios from 'axios';
import { Input } from '@/components/ui/Input';
import { DatePicker } from '@/components/ui/DatePicker';
import { Select2, SelectOption } from '@/components/ui/Select2';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { useToast } from '@/components/ui/Toast';
import { toast } from 'sonner';

interface Props {
  students: Student[];
  groups: Group[];
  userRole: string;
}

const StudentManagement: React.FC<Props> = ({ students: initialStudents, groups, userRole }) => {
  const [students, setStudents] = useState<Student[]>(initialStudents);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [classTypeFilter, setClassTypeFilter] = useState<'all' | 'theoretical' | 'practical'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [draggedStudent, setDraggedStudent] = useState<Student | null>(null);

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || student.status === statusFilter;
    const matchesClassType = classTypeFilter === 'all' || student.classType === classTypeFilter;

    return matchesSearch && matchesStatus && matchesClassType;
  });

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
      case 'propuesta_enviada': return 'Propuesta Enviada';
      case 'pago_por_verificar': return 'Pago Por Verificar';
      case 'matriculado': return 'Matriculado';
      default: return 'Sin Estado';
    }
  };

  const handleProspectStatusChange = (studentId: string, newStatus: string) => {
    // Validaciones del lado del cliente
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    // Validar transiciones permitidas según rol
    if (userRole === 'sales_advisor') {
      const allowedTransitions = [
        student.prospectStatus === 'registrado' && newStatus === 'propuesta_enviada',
        student.prospectStatus === 'propuesta_enviada' && newStatus === 'pago_por_verificar'
      ];
      if (!allowedTransitions.some(t => t)) {
        alert('Como asesor de ventas solo puedes: Registrado → Propuesta Enviada → Pago Por Verificar');
        return;
      }
    } else if (userRole === 'cashier') {
      const allowedTransitions = [
        student.prospectStatus === 'pago_por_verificar' && newStatus === 'matriculado'
      ];
      if (!allowedTransitions.some(t => t)) {
        alert('Como cajero solo puedes verificar pagos en estado "Pago Por Verificar"');
        return;
      }
    }

    // Enviar actualización al servidor
    router.put(`/admin/students/${studentId}/prospect-status`, {
      prospect_status: newStatus
    }, {
      preserveScroll: true,
      onSuccess: () => {
        // Actualizar estado local
        setStudents(students.map(student =>
          student.id === studentId
            ? { ...student, prospectStatus: newStatus as 'registrado' | 'propuesta_enviada' | 'pago_por_verificar' | 'matriculado' }
            : student
        ));
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
      // Validar transiciones según el rol
      if (userRole === 'sales_advisor') {
        const allowedTransitions = [
          draggedStudent.prospectStatus === 'registrado' && newStatus === 'propuesta_enviada',
          draggedStudent.prospectStatus === 'propuesta_enviada' && newStatus === 'pago_por_verificar'
        ];
        if (!allowedTransitions.some(t => t)) {
          alert('Como asesor de ventas solo puedes: Registrado → Propuesta Enviada → Pago Por Verificar');
          setDraggedStudent(null);
          return;
        }
        
        // Validar que tenga los datos necesarios para pasar a pago_por_verificar
        if (newStatus === 'pago_por_verificar') {
          if (!draggedStudent.paymentDate || !draggedStudent.level || !draggedStudent.contractedPlan) {
            alert('Debes completar fecha de pago, nivel académico y plan contratado antes de marcar como "Pago Por Verificar"');
            setDraggedStudent(null);
            return;
          }
        }
      } else if (userRole === 'cashier') {
        const allowedTransitions = [
          draggedStudent.prospectStatus === 'pago_por_verificar' && newStatus === 'matriculado'
        ];
        if (!allowedTransitions.some(t => t)) {
          alert('Como cajero solo puedes verificar pagos en estado "Pago Por Verificar"');
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
        level: formData.academicLevel,
        class_type: 'theoretical', // Por defecto
      });

      // Éxito: cerrar modal y mostrar toast
      setShowCreateForm(false);
      toast.success('Prospecto registrado exitosamente', {
        description: 'El nuevo prospecto ha sido agregado al sistema.',
        duration: 4000,
      });
      
      // Recargar solo la lista de estudiantes usando Inertia
      router.reload({ only: ['students'] });
      
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

    // Determinar qué campos enviar según el rol
    const updateData = userRole === 'cashier' 
      ? {
          // Cajero: solo datos de matrícula
          payment_date: formData.paymentDate,
          enrollment_date: formData.enrollmentDate,
          enrollment_code: formData.enrollmentCode,
          level: formData.academicLevel,
          contracted_plan: formData.contractedPlan,
          payment_verified: formData.paymentVerified,
        }
      : {
          // Admin y Sales Advisor: todos los campos
          first_name: formData.firstName,
          paternal_last_name: formData.paternalLastName,
          maternal_last_name: formData.maternalLastName,
          phone_number: formData.phoneNumber,
          gender: formData.gender,
          birth_date: formData.birthDate,
          document_type: formData.documentType,
          document_number: formData.documentNumber,
          education_level: formData.educationLevel,
          email: formData.email,
          payment_date: formData.paymentDate,
          enrollment_date: formData.enrollmentDate,
          enrollment_code: formData.enrollmentCode,
          level: formData.academicLevel,
          contracted_plan: formData.contractedPlan,
          payment_verified: formData.paymentVerified,
          has_placement_test: formData.hasPlacementTest,
          test_date: formData.testDate,
          test_score: formData.testScore,
          guardian_name: formData.guardianName,
          guardian_document_number: formData.guardianDocumentNumber,
          guardian_email: formData.guardianEmail,
          guardian_birth_date: formData.guardianBirthDate,
          guardian_phone: formData.guardianPhone,
          guardian_address: formData.guardianAddress,
          status: formData.status,
        };

    console.log('Datos que se enviarán al backend:', updateData);

    try {
      await axios.put(`/admin/students/${editingStudent.id}`, updateData);

      // Éxito: cerrar modal y mostrar toast
      setEditingStudent(null);
      toast.success('Prospecto actualizado exitosamente', {
        description: 'Los datos del prospecto han sido actualizados.',
        duration: 4000,
      });
      
      // Recargar solo la lista de estudiantes
      router.reload({ only: ['students'] });
      
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
      router.delete(`/admin/students/${studentId}`, {
        preserveScroll: true
      });
    }
  };

  const getGroupName = (groupId?: string) => {
    if (!groupId) return 'Sin asignar';
    const group = groups.find(g => g.id === groupId);
    return group ? group.name : 'Grupo desconocido';
  };

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
    return filteredStudents.filter(student => student.prospectStatus === status);
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

      // Datos Académicos
      paymentDate: student?.paymentDate || '',
      enrollmentDate: student?.enrollmentDate || '',
      registrationDate: student?.registrationDate || new Date().toISOString().split('T')[0],
      enrollmentCode: student?.enrollmentCode || '',
      academicLevel: student?.level || 'basic',
      contractedPlan: student?.contractedPlan || '',
      contractFile: null as File | null,
      contractFileName: student?.contractFileName || '',
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
                    <p className="text-base font-bold text-gray-900 capitalize">{student?.level || '-'}</p>
                  </div>
                  <div className="bg-white rounded-xl p-4 border border-blue-100 shadow-sm hover:shadow-md transition-all">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Plan Contratado</p>
                    <p className="text-base font-bold text-gray-900 capitalize">{student?.contractedPlan || '-'}</p>
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

              {/* Verificación de Pago - ACCIÓN PRINCIPAL DEL CAJERO */}
              <div className="p-6 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 rounded-2xl border-2 border-green-400 shadow-lg">
                <label className="flex items-start gap-4 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={formData.paymentVerified}
                    onChange={(e) => setFormData({...formData, paymentVerified: e.target.checked})}
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
                onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                required
              />

              <Input
                label="Apellido Paterno"
                value={formData.paternalLastName}
                onChange={(e) => setFormData({...formData, paternalLastName: e.target.value})}
                required
              />

              <Input
                label="Apellido Materno"
                value={formData.maternalLastName}
                onChange={(e) => setFormData({...formData, maternalLastName: e.target.value})}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <Select2
                label="Tipo de Documento"
                value={formData.documentType}
                onChange={(value) => setFormData({...formData, documentType: value as string})}
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
                onChange={(e) => setFormData({...formData, documentNumber: e.target.value})}
                required
              />

              <DatePicker
                label="Fecha de Nacimiento"
                selected={formData.birthDate ? new Date(formData.birthDate) : null}
                onChange={(date) => setFormData({...formData, birthDate: date ? date.toISOString().split('T')[0] : ''})}
                maxDate={new Date()}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <Select2
                label="Sexo"
                value={formData.gender}
                onChange={(value) => setFormData({...formData, gender: value as string})}
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
                onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                required
              />

              <Select2
                label="Grado de Instrucción"
                value={formData.educationLevel}
                onChange={(value) => setFormData({...formData, educationLevel: value as string})}
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
                onChange={(e) => setFormData({...formData, email: e.target.value})}
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
                onChange={() => {}} // No hace nada, es solo lectura
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
                value={formData.academicLevel}
                onChange={(value) => setFormData({...formData, academicLevel: value as 'basic' | 'intermediate' | 'advanced'})}
                options={[
                  { value: 'basic', label: 'Básico' },
                  { value: 'intermediate', label: 'Intermedio' },
                  { value: 'advanced', label: 'Avanzado' }
                ]}
                isSearchable={false}
                isClearable={false}
              />
            </div>

            <div className="mt-4">
              <Select2
                label="Plan Contratado"
                value={formData.contractedPlan}
                onChange={(value) => setFormData({...formData, contractedPlan: value as string})}
                options={[
                  { value: 'basico', label: 'Plan Básico' },
                  { value: 'estandar', label: 'Plan Estándar' },
                  { value: 'premium', label: 'Plan Premium' },
                  { value: 'intensivo', label: 'Plan Intensivo' }
                ]}
                isDisabled={!formData.paymentDate}
                helperText={!formData.paymentDate ? 'Selecciona primero una fecha de pago para activar este campo' : undefined}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <DatePicker
                label="Fecha de Matrícula"
                selected={formData.enrollmentDate ? new Date(formData.enrollmentDate) : null}
                onChange={() => {}} // No hace nada, es solo lectura
                disabled
                helperText="Se llena automáticamente al seleccionar la fecha de pago"
              />

              <Input
                label="Código de Matrícula"
                value={formData.enrollmentCode}
                onChange={() => {}} // No hace nada, es solo lectura
                disabled
                helperText="Se genera automáticamente al confirmar el pago"
              />
            </div>

            {/* Subir Contrato y Verificación de Pago */}
            <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contrato (PDF)
                  </label>
                  <div className="flex items-center space-x-2">
                    <label className="flex-1 cursor-pointer">
                      <div className="flex items-center justify-center px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all">
                        <svg className="w-5 h-5 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <span className="text-sm text-gray-600">
                          {formData.contractFileName || 'Seleccionar archivo PDF'}
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
                    {formData.contractFileName && (
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, contractFile: null, contractFileName: ''})}
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
                    Adjunta el contrato firmado en formato PDF
                  </p>
                </div>

                <div className="flex items-center">
                  <label className="flex items-center space-x-3 cursor-pointer p-4 bg-white rounded-lg border border-slate-200 hover:border-blue-500 transition-all w-full">
                    <input
                      type="checkbox"
                      checked={formData.paymentVerified}
                      onChange={(e) => setFormData({...formData, paymentVerified: e.target.checked})}
                      className="w-5 h-5 text-blue-600 focus:ring-blue-500 rounded border-gray-300"
                    />
                    <div className="flex-1">
                      <span className="text-sm font-semibold text-gray-900 block">Pago Verificado</span>
                      <span className="text-xs text-gray-500">Marca si el pago ha sido confirmado</span>
                    </div>
                    {formData.paymentVerified && (
                      <div className="flex-shrink-0">
                        <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </label>
                </div>
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
                  onChange={(e) => setFormData({...formData, hasPlacementTest: e.target.checked})}
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
                  onChange={(date) => setFormData({...formData, testDate: date ? date.toISOString().split('T')[0] : ''})}
                  maxDate={new Date()}
                  required={formData.hasPlacementTest}
                />

                <Input
                  label="Nota del Examen (0-20)"
                  type="number"
                  value={formData.testScore}
                  onChange={(e) => setFormData({...formData, testScore: e.target.value})}
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
                onChange={(e) => setFormData({...formData, guardianName: e.target.value})}
              />

              <Input
                label="DNI del Titular"
                value={formData.guardianDocumentNumber}
                onChange={(e) => setFormData({...formData, guardianDocumentNumber: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <Input
                label="Correo Electrónico del Titular"
                type="email"
                value={formData.guardianEmail}
                onChange={(e) => setFormData({...formData, guardianEmail: e.target.value})}
              />

              <DatePicker
                label="Fecha de Nacimiento del Titular"
                selected={formData.guardianBirthDate ? new Date(formData.guardianBirthDate) : null}
                onChange={(date) => setFormData({...formData, guardianBirthDate: date ? date.toISOString().split('T')[0] : ''})}
                maxDate={new Date()}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <Input
                label="Número de Celular del Apoderado"
                type="tel"
                value={formData.guardianPhone}
                onChange={(e) => setFormData({...formData, guardianPhone: e.target.value})}
              />

              <Input
                label="Dirección del Titular"
                value={formData.guardianAddress}
                onChange={(e) => setFormData({...formData, guardianAddress: e.target.value})}
              />
            </div>
          </div>
          </>
          )}
            </div>

          {/* Footer con Botones */}
          <div className="bg-gray-50 px-8 py-6 rounded-b-3xl border-t-2 border-gray-200 flex-shrink-0">
            <div className="flex justify-end gap-4">
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
                className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 shadow-sm flex items-center gap-2 ${
                  isCashierEditing && !formData.paymentVerified
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
              className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <List className="h-4 w-4" />
              <span>Lista</span>
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'kanban'
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

      {/* Filters */}
      <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar prospectos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todos los Estados</option>
            <option value="active">Activo</option>
            <option value="inactive">Inactivo</option>
          </select>
          
          <select
            value={classTypeFilter}
            onChange={(e) => setClassTypeFilter(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todos los Tipos</option>
            <option value="theoretical">Teórico</option>
            <option value="practical">Práctico</option>
          </select>
        </div>
      </div>

      {/* Kanban View */}
      {viewMode === 'kanban' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="overflow-x-auto overflow-y-hidden">
            <div className="flex gap-4 p-4" style={{ minWidth: 'max-content' }}>
              {getVisibleKanbanColumns().map((column) => (
                <div
                  key={column.id}
                  className={`bg-gray-50 rounded-lg shadow-sm border-t-4 ${column.color} min-h-96 w-80 flex-shrink-0`}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, column.id as any)}
                >
                  <div className="p-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900">{column.title}</h3>
                      <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-sm font-medium">
                        {getStudentsByStatus(column.id).length}
                      </span>
                    </div>
                  </div>
              
              <div className="p-4 space-y-3">
                {getStudentsByStatus(column.id).map((student) => {
                  // Determinar si el prospecto puede ser arrastrado según el rol
                  const isDraggable = 
                    userRole === 'admin' || 
                    (userRole === 'sales_advisor' && (student.prospectStatus === 'registrado' || student.prospectStatus === 'propuesta_enviada')) ||
                    (userRole === 'cashier' && student.prospectStatus === 'pago_por_verificar');

                  return (
                  <div
                    key={student.id}
                    draggable={isDraggable}
                    onDragStart={(e) => handleDragStart(e, student)}
                    className={`bg-gray-50 rounded-lg p-4 border border-gray-200 hover:shadow-md transition-all ${
                      isDraggable ? 'cursor-move' : 'cursor-default opacity-75'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                          <span className="text-white text-sm font-semibold">
                            {student.name.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{student.name}</p>
                          <p className="text-sm text-gray-600">{student.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
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
                    </div>
                    
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Registro:</span>
                        <span className="text-gray-900">{new Date(student.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  );
                })}
                
                {getStudentsByStatus(column.id).length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No hay prospectos en esta etapa</p>
                  </div>
                )}
              </div>
            </div>
          ))}
            </div>
          </div>
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Prospecto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado Prospecto
                  </th>
                  {userRole === 'admin' && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Registrado Por
                    </th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo de Clase
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nivel
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Grupo Asignado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Puntos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                          <span className="text-white text-sm font-semibold">
                            {student.name.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{student.name}</div>
                          <div className="text-sm text-gray-500">{student.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        student.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {student.status === 'active' ? <UserCheck className="w-3 h-3 mr-1" /> : <UserX className="w-3 h-3 mr-1" />}
                        {student.status === 'active' ? 'activo' : 'inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={student.prospectStatus || 'registrado'}
                        onChange={(e) => handleProspectStatusChange(student.id, e.target.value)}
                        className={`text-xs font-medium px-2.5 py-0.5 rounded-full border-0 focus:ring-2 focus:ring-blue-500 ${getProspectStatusColor(student.prospectStatus || 'registrado')}`}
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
                              <>
                                <option value={student.prospectStatus}>{getProspectStatusLabel(student.prospectStatus || 'registrado')}</option>
                              </>
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
                              <>
                                <option value={student.prospectStatus}>{getProspectStatusLabel(student.prospectStatus || 'registrado')}</option>
                              </>
                            )}
                          </>
                        )}
                      </select>
                    </td>
                    {userRole === 'admin' && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        {student.registeredBy ? (
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center mr-2">
                              <span className="text-white text-xs font-semibold">
                                {student.registeredBy.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                              </span>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">{student.registeredBy.name}</div>
                              <div className="text-xs text-gray-500">{student.registeredBy.email}</div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">Sin asignar</span>
                        )}
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        student.classType === 'theoretical' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        <BookOpen className="w-3 h-3 mr-1" />
                        {student.classType === 'theoretical' ? 'teórico' : 'práctico'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                      {student.level === 'basic' ? 'básico' : student.level === 'intermediate' ? 'intermedio' : 'avanzado'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getGroupName(student.assignedGroupId)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {student.points.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredStudents.length === 0 && (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No se encontraron prospectos</p>
            </div>
          )}
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total de Prospectos</p>
              <p className="text-2xl font-semibold text-gray-900">{filteredStudents.length}</p>
            </div>
            <Users className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        {/* Registrados - Solo Admin y Sales Advisor */}
        {(userRole === 'admin' || userRole === 'sales_advisor') && (
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Registrados</p>
                <p className="text-2xl font-semibold text-blue-600">
                  {students.filter(s => s.prospectStatus === 'registrado').length}
                </p>
              </div>
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
              </div>
            </div>
          </div>
        )}

        {/* Propuesta Enviada - Solo Admin y Sales Advisor */}
        {(userRole === 'admin' || userRole === 'sales_advisor') && (
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Propuesta Enviada</p>
                <p className="text-2xl font-semibold text-yellow-600">
                  {students.filter(s => s.prospectStatus === 'propuesta_enviada').length}
                </p>
              </div>
              <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                <div className="w-3 h-3 bg-yellow-600 rounded-full"></div>
              </div>
            </div>
          </div>
        )}

        {/* Pago Por Verificar - Todos */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pago Por Verificar</p>
              <p className="text-2xl font-semibold text-orange-600">
                {students.filter(s => s.prospectStatus === 'pago_por_verificar').length}
              </p>
            </div>
            <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
              <div className="w-3 h-3 bg-orange-600 rounded-full"></div>
            </div>
          </div>
        </div>

        {/* Matriculados - Todos */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Matriculados</p>
              <p className="text-2xl font-semibold text-green-600">
                {students.filter(s => s.prospectStatus === 'matriculado').length}
              </p>
            </div>
            <UserCheck className="h-8 w-8 text-green-600" />
          </div>
        </div>
      </div>
      </div>
    </AuthenticatedLayout>
  );
};

export default StudentManagement;