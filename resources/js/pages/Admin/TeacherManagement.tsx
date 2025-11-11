import React, { useState, useMemo } from 'react';
import { UserCheck, Plus, Trash2, Search, Clock, BookOpen, Users, AlertCircle, CheckCircle, Edit, XCircle } from 'lucide-react';
import { router, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { AgGridReact } from 'ag-grid-react';
import { ColDef } from 'ag-grid-community';
import { ModuleRegistry } from 'ag-grid-community';
import { AllCommunityModule } from 'ag-grid-community';
import { themeQuartz } from 'ag-grid-community';

// Registrar módulos de AG Grid Community
ModuleRegistry.registerModules([AllCommunityModule]);

interface TimeSlot {
  id?: number;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  duration: number;
}

interface AssignedGroup {
  groupId: number;
  groupName: string;
  type: string;
  schedule: TimeSlot;
}

interface Teacher {
  id: number;
  user_id: number;
  name?: string;
  email?: string;
  first_name: string;
  paternal_last_name: string;
  maternal_last_name?: string;
  phone_number?: string;
  gender?: string;
  age?: number;
  birth_date?: string;
  document_type: string;
  document_number?: string;
  education_level?: string;
  status: 'active' | 'inactive';
  specialization: 'theoretical' | 'practical' | 'both';
  start_date?: string;
  bank_account?: string;
  bank?: string;
  work_modality?: string;
  language_level?: string;
  contract_status?: string;
  contract_period?: string;
  contract_modality?: string;
  current_address?: string;
  emergency_contact_number?: string;
  emergency_contact_relationship?: string;
  emergency_contact_name?: string;
  assignedGroups?: AssignedGroup[];
  assignedGroupIds?: number[];
  availableSchedule?: TimeSlot[];
  available_schedule?: TimeSlot[];
}

interface Group {
  id: number;
  name: string;
  type: 'theoretical' | 'practical';
}

interface Props {
  teachers: Teacher[];
  groups: Group[];
}

const TeacherManagement: React.FC<Props> = ({ teachers: initialTeachers, groups }) => {
  const { flash } = usePage().props as any;

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [quickFilterText, setQuickFilterText] = useState<string>('');

  // Normalize teachers data
  const teachers = initialTeachers.map(teacher => ({
    ...teacher,
    name: teacher.name || `${teacher.first_name} ${teacher.paternal_last_name} ${teacher.maternal_last_name || ''}`.trim(),
    availableSchedule: teacher.availableSchedule || teacher.available_schedule || [],
    assignedGroups: teacher.assignedGroups || [],
    assignedGroupIds: teacher.assignedGroupIds || [],
  }));

  const handleCreateTeacher = (formData: any) => {
    router.post('/admin/teachers', formData, {
      onSuccess: () => {
        setShowCreateForm(false);
      },
    });
  };

  const handleUpdateTeacher = (formData: any) => {
    if (!editingTeacher) return;
    
    router.put(`/admin/teachers/${editingTeacher.id}`, formData, {
      onSuccess: () => {
        setEditingTeacher(null);
      },
    });
  };

  const handleDeleteTeacher = (teacherId: number) => {
    const teacher = teachers.find(t => t.id === teacherId);
    if (teacher && teacher.assignedGroups && teacher.assignedGroups.length > 0) {
      alert('No se puede eliminar un profesor con grupos asignados. Por favor reasigna los grupos primero.');
      return;
    }

    if (confirm('¿Estás seguro de que quieres eliminar este profesor?')) {
      router.delete(`/admin/teachers/${teacherId}`);
    }
  };

  const TeacherForm = ({ teacher, onSubmit, onCancel }: {
    teacher?: Teacher;
    onSubmit: (data: any) => void;
    onCancel: () => void;
  }) => {
    const [formData, setFormData] = useState({
      // Datos Personales
      first_name: teacher?.first_name || '',
      paternal_last_name: teacher?.paternal_last_name || '',
      maternal_last_name: teacher?.maternal_last_name || '',
      email: teacher?.email || '',
      phone_number: teacher?.phone_number || '',
      gender: teacher?.gender || '',
      age: teacher?.age?.toString() || '',
      birth_date: teacher?.birth_date || '',
      document_type: teacher?.document_type || 'DNI',
      document_number: teacher?.document_number || '',
      education_level: teacher?.education_level || '',
      
      // Datos Laborales
      status: teacher?.status || 'active',
      specialization: teacher?.specialization || 'theoretical',
      start_date: teacher?.start_date || '',
      bank_account: teacher?.bank_account || '',
      bank: teacher?.bank || '',
      work_modality: teacher?.work_modality || '',
      language_level: teacher?.language_level || '',
      contract_status: teacher?.contract_status || 'contratado',
      contract_period: teacher?.contract_period || '',
      contract_modality: teacher?.contract_modality || '',
      
      // Datos de Contacto
      current_address: teacher?.current_address || '',
      emergency_contact_number: teacher?.emergency_contact_number || '',
      emergency_contact_relationship: teacher?.emergency_contact_relationship || '',
      emergency_contact_name: teacher?.emergency_contact_name || '',
      
      // Horarios
      available_schedule: teacher?.availableSchedule || teacher?.available_schedule || [
        { dayOfWeek: 'Lunes', startTime: '09:00', endTime: '12:00', duration: 180 }
      ],
    });

    const addScheduleSlot = () => {
      setFormData({
        ...formData,
        available_schedule: [
          ...formData.available_schedule,
          { dayOfWeek: 'Lunes', startTime: '09:00', endTime: '12:00', duration: 180 }
        ]
      });
    };

    const removeScheduleSlot = (index: number) => {
      setFormData({
        ...formData,
        available_schedule: formData.available_schedule.filter((_: any, i: number) => i !== index)
      });
    };

    const updateScheduleSlot = (index: number, field: keyof TimeSlot, value: string) => {
      const updatedSchedule = [...formData.available_schedule];
      if (field === 'duration') {
        updatedSchedule[index] = { ...updatedSchedule[index], [field]: parseInt(value) };
      } else {
        updatedSchedule[index] = { ...updatedSchedule[index], [field]: value };
      }
      
      // Calculate duration if start/end time changed
      if (field === 'startTime' || field === 'endTime') {
        const slot = updatedSchedule[index];
        const start = parseInt(slot.startTime.replace(':', ''));
        const end = parseInt(slot.endTime.replace(':', ''));
        updatedSchedule[index].duration = Math.round((end - start) * 60 / 100); // Convert to minutes
      }
      
      setFormData({ ...formData, available_schedule: updatedSchedule });
    };

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      onSubmit(formData);
    };

    // Bloquear scroll del body cuando el modal está abierto
    React.useEffect(() => {
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';

      return () => {
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
          <div className="relative bg-gradient-to-r from-green-600 to-blue-600 px-8 py-6 rounded-t-3xl flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-white mb-1">
                  {teacher ? 'Editar Profesor' : 'Nuevo Profesor'}
                </h3>
                <p className="text-green-100">
                  {teacher
                    ? 'Actualiza la información del profesor'
                    : 'Completa la información para registrar un nuevo profesor'}
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
              {/* Sección 1: Datos Personales */}
              <div>
                <div className="flex items-center mb-4 pb-2 border-b-2 border-blue-600">
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold mr-3">
                    1
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900">Datos Personales del Profesor</h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombres *
                    </label>
                    <input
                      type="text"
                      value={formData.first_name}
                      onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Apellido Paterno *
                    </label>
                    <input
                      type="text"
                      value={formData.paternal_last_name}
                      onChange={(e) => setFormData({...formData, paternal_last_name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Apellido Materno
                    </label>
                    <input
                      type="text"
                      value={formData.maternal_last_name}
                      onChange={(e) => setFormData({...formData, maternal_last_name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tipo de Documento *
                    </label>
                    <select
                      value={formData.document_type}
                      onChange={(e) => setFormData({...formData, document_type: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="DNI">DNI</option>
                      <option value="CE">Carnet de Extranjería</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Número de Documento *
                    </label>
                    <input
                      type="text"
                      value={formData.document_number}
                      onChange={(e) => setFormData({...formData, document_number: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={formData.document_type === 'DNI' ? '12345678' : '001234567'}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fecha de Nacimiento *
                    </label>
                    <input
                      type="date"
                      value={formData.birth_date}
                      onChange={(e) => setFormData({...formData, birth_date: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sexo *
                    </label>
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData({...formData, gender: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Seleccionar</option>
                      <option value="M">Masculino</option>
                      <option value="F">Femenino</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Número de Celular *
                    </label>
                    <input
                      type="tel"
                      value={formData.phone_number}
                      onChange={(e) => setFormData({...formData, phone_number: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="+51 987654321"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Grado de Instrucción *
                    </label>
                    <select
                      value={formData.education_level}
                      onChange={(e) => setFormData({...formData, education_level: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Seleccionar</option>
                      <option value="tecnico">Técnico</option>
                      <option value="universitario">Universitario</option>
                      <option value="maestria">Maestría</option>
                      <option value="doctorado">Doctorado</option>
                    </select>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Correo Electrónico *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
              {/* Sección 2: Datos Laborales */}
              <div>
                <div className="flex items-center mb-4 pb-2 border-b-2 border-green-600">
                  <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold mr-3">
                    2
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900">Datos Laborales</h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fecha de Ingreso *
                    </label>
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Modalidad de Trabajo *
                    </label>
                    <select
                      value={formData.work_modality}
                      onChange={(e) => setFormData({...formData, work_modality: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Seleccionar</option>
                      <option value="presencial">Presencial</option>
                      <option value="virtual">Virtual</option>
                      <option value="hibrido">Híbrido</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nivel de Idioma *
                    </label>
                    <select
                      value={formData.language_level}
                      onChange={(e) => setFormData({...formData, language_level: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Seleccionar</option>
                      <option value="nativo">Nativo</option>
                      <option value="C2">C2 - Proficiency</option>
                      <option value="C1">C1 - Advanced</option>
                      <option value="B2">B2 - Upper Intermediate</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cuenta Bancaria / CCI
                    </label>
                    <input
                      type="text"
                      value={formData.bank_account}
                      onChange={(e) => setFormData({...formData, bank_account: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Número de cuenta o CCI"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Banco
                    </label>
                    <select
                      value={formData.bank}
                      onChange={(e) => setFormData({...formData, bank: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Seleccionar banco</option>
                      <option value="BCP">Banco de Crédito del Perú</option>
                      <option value="BBVA">BBVA</option>
                      <option value="Scotiabank">Scotiabank</option>
                      <option value="Interbank">Interbank</option>
                      <option value="BanBif">BanBif</option>
                      <option value="Banco Pichincha">Banco Pichincha</option>
                      <option value="Otro">Otro</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Estado de Contrato *
                    </label>
                    <select
                      value={formData.contract_status}
                      onChange={(e) => setFormData({...formData, contract_status: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="contratado">Contratado</option>
                      <option value="en_proceso">En Proceso</option>
                      <option value="finalizado">Finalizado</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Periodo de Contrato
                    </label>
                    <input
                      type="text"
                      value={formData.contract_period}
                      onChange={(e) => setFormData({...formData, contract_period: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Ej: 6 meses, 1 año"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Modalidad de Contrato
                    </label>
                    <select
                      value={formData.contract_modality}
                      onChange={(e) => setFormData({...formData, contract_modality: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Seleccionar</option>
                      <option value="tiempo_completo">Tiempo Completo</option>
                      <option value="medio_tiempo">Medio Tiempo</option>
                      <option value="por_horas">Por Horas</option>
                      <option value="freelance">Freelance</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Especialización *
                    </label>
                    <select
                      value={formData.specialization}
                      onChange={(e) => setFormData({...formData, specialization: e.target.value as 'theoretical' | 'practical' | 'both'})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="theoretical">Solo Teórico</option>
                      <option value="practical">Solo Práctico</option>
                      <option value="both">Ambos</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Estado *
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value as 'active' | 'inactive'})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="active">Activo</option>
                      <option value="inactive">Inactivo</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Sección 3: Datos de Contacto y Emergencia */}
              <div>
                <div className="flex items-center mb-4 pb-2 border-b-2 border-purple-600">
                  <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold mr-3">
                    3
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900">Datos de Contacto y Emergencia</h4>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dirección Actual
                  </label>
                  <textarea
                    rows={2}
                    value={formData.current_address}
                    onChange={(e) => setFormData({...formData, current_address: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Dirección completa"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contacto de Emergencia
                    </label>
                    <input
                      type="text"
                      value={formData.emergency_contact_name}
                      onChange={(e) => setFormData({...formData, emergency_contact_name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Nombre completo"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Teléfono de Emergencia
                    </label>
                    <input
                      type="tel"
                      value={formData.emergency_contact_number}
                      onChange={(e) => setFormData({...formData, emergency_contact_number: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="+51 987654321"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Parentesco
                    </label>
                    <select
                      value={formData.emergency_contact_relationship}
                      onChange={(e) => setFormData({...formData, emergency_contact_relationship: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Seleccionar</option>
                      <option value="padre">Padre</option>
                      <option value="madre">Madre</option>
                      <option value="esposo">Esposo/a</option>
                      <option value="hermano">Hermano/a</option>
                      <option value="hijo">Hijo/a</option>
                      <option value="otro">Otro</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Sección 4: Horarios Disponibles */}
              <div>
                <div className="flex items-center justify-between mb-4 pb-2 border-b-2 border-orange-600">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-orange-600 text-white rounded-full flex items-center justify-center font-bold mr-3">
                      4
                    </div>
                    <h4 className="text-lg font-semibold text-gray-900">Horarios Disponibles</h4>
                  </div>
                  <button
                    type="button"
                    onClick={addScheduleSlot}
                    className="text-orange-600 hover:text-orange-700 text-sm font-medium flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Agregar Horario
                  </button>
                </div>

                <div className="space-y-3">
                  {formData.available_schedule.map((slot, index) => (
                    <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <select
                        value={slot.dayOfWeek}
                        onChange={(e) => updateScheduleSlot(index, 'dayOfWeek', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="Lunes">Lunes</option>
                        <option value="Martes">Martes</option>
                        <option value="Miércoles">Miércoles</option>
                        <option value="Jueves">Jueves</option>
                        <option value="Viernes">Viernes</option>
                        <option value="Sábado">Sábado</option>
                        <option value="Domingo">Domingo</option>
                      </select>

                      <input
                        type="time"
                        value={slot.startTime}
                        onChange={(e) => updateScheduleSlot(index, 'startTime', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />

                      <span className="text-gray-500">a</span>

                      <input
                        type="time"
                        value={slot.endTime}
                        onChange={(e) => updateScheduleSlot(index, 'endTime', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />

                      <span className="text-sm text-gray-500">
                        ({slot.duration} min)
                      </span>

                      {formData.available_schedule.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeScheduleSlot(index)}
                          className="text-red-600 hover:text-red-700 p-1"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
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
                  className="px-6 py-3 rounded-xl font-semibold transition-all duration-200 shadow-sm flex items-center gap-2 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white"
                >
                  {teacher ? 'Actualizar' : 'Crear'} Profesor
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // Función para forzar recarga
  const forceReload = () => {
    router.reload({ 
      only: ['teachers'],
      preserveState: false,
      preserveScroll: false,
    });
  };

  // Definición de columnas para AG Grid
  const columnDefs = useMemo<ColDef<Teacher>[]>(() => [
    {
      headerName: 'Profesor',
      field: 'name',
      minWidth: 250,
      filter: 'agTextColumnFilter',
      cellRenderer: (params: any) => {
        const teacher = params.data;
        return (
          <div className="flex items-center py-2 w-full h-full">
            <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm font-semibold">
                {teacher.name?.split(' ').map((n: string) => n[0]).join('') || '?'}
              </span>
            </div>
            <div className="ml-3">
              <div className="text-sm font-medium text-gray-900">{teacher.name}</div>
              <div className="text-sm text-gray-500">{teacher.email}</div>
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
          <div className='flex items-center w-full h-full'>
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
              status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {status === 'active' ? <CheckCircle className="w-3 h-3 mr-1" /> : <AlertCircle className="w-3 h-3 mr-1" />}
              {status === 'active' ? 'Activo' : 'Inactivo'}
            </span>
          </div>
        );
      }
    },
    {
      headerName: 'Especialización',
      field: 'specialization',
      width: 150,
      filter: 'agTextColumnFilter',
      cellRenderer: (params: any) => {
        const spec = params.value;
        return (
          <div className='flex items-center w-full h-full'>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              spec === 'theoretical' ? 'bg-blue-100 text-blue-800' :
              spec === 'practical' ? 'bg-purple-100 text-purple-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              <BookOpen className="w-3 h-3 mr-1" />
              {spec === 'theoretical' ? 'Teórico' : spec === 'practical' ? 'Práctico' : 'Ambos'}
            </span>
          </div>
        );
      }
    },
    {
      headerName: 'Nivel de Idioma',
      field: 'language_level',
      width: 140,
      filter: 'agTextColumnFilter',
      cellRenderer: (params: any) => {
        return (
          <div className='flex items-center w-full h-full'>
            <span className="text-sm text-gray-900">{params.value || 'No especificado'}</span>
          </div>
        );
      }
    },
    {
      headerName: 'Modalidad',
      field: 'work_modality',
      width: 130,
      filter: 'agTextColumnFilter',
      cellRenderer: (params: any) => {
        return (
          <div className='flex items-center w-full h-full'>
            <span className="text-sm text-gray-900">{params.value || 'No especificado'}</span>
          </div>
        );
      }
    },
    {
      headerName: 'Grupos Asignados',
      field: 'assignedGroups',
      width: 150,
      filter: false,
      cellRenderer: (params: any) => {
        const groups = params.value || [];
        return (
          <div className="flex items-center w-full h-full">
            {groups.length > 0 ? (
              <div className="space-y-1">
                {groups.slice(0, 2).map((group: any) => (
                  <div key={group.groupId} className="text-xs bg-gray-100 px-2 py-1 rounded">
                    {group.groupName}
                  </div>
                ))}
                {groups.length > 2 && (
                  <div className="text-xs text-gray-500">+{groups.length - 2} más</div>
                )}
              </div>
            ) : (
              <span className="text-sm text-gray-400">Sin grupos</span>
            )}
          </div>
        );
      }
    },
    {
      headerName: 'Horarios',
      field: 'availableSchedule',
      width: 180,
      filter: false,
      cellRenderer: (params: any) => {
        const schedule = params.value || [];
        return (
          <div className="flex items-center w-full h-full">
            <div className="text-sm text-gray-900">
              <div className="font-medium">{schedule.length} horarios</div>
              {schedule.slice(0, 2).map((slot: any, index: number) => (
                <div key={index} className="text-xs text-gray-500">
                  {slot.dayOfWeek} {slot.startTime}-{slot.endTime}
                </div>
              ))}
              {schedule.length > 2 && (
                <div className="text-xs text-gray-500">+{schedule.length - 2} más</div>
              )}
            </div>
          </div>
        );
      }
    },
    {
      headerName: 'Acciones',
      width: 120,
      sortable: false,
      filter: false,
      cellRenderer: (params: any) => {
        const teacher = params.data;
        return (
          <div className="flex items-center space-x-2 w-full h-full">
            <button
              onClick={() => setEditingTeacher(teacher)}
              className="text-blue-600 hover:text-blue-900 p-1 hover:bg-blue-50 rounded transition-colors"
              title="Editar profesor"
            >
              <Edit className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleDeleteTeacher(teacher.id)}
              className="text-red-600 hover:text-red-900 p-1 hover:bg-red-50 rounded transition-colors"
              title="Eliminar profesor"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        );
      }
    }
  ], []);

  return (
    <AuthenticatedLayout>
      <div className="p-6 space-y-6">
        {flash?.success && (
          <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-4">
            <p className="text-green-700">{flash.success}</p>
          </div>
        )}
        
        {flash?.error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
            <p className="text-red-700">{flash.error}</p>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestión de Profesores</h1>
            <p className="text-gray-600">Gestiona perfiles de profesores y asignaciones de horarios</p>
          </div>
          <div className="flex items-center space-x-4">
            {/* Botón de Forzar Recarga */}
            <button
              onClick={forceReload}
              className="flex items-center space-x-2 px-4 py-2 text-gray-700 bg-white border-2 border-gray-300 hover:border-gray-400 rounded-lg font-medium transition-colors"
              title="Recargar datos desde el servidor"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
              </svg>
              <span>Recargar</span>
            </button>

            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
            >
              <Plus className="h-5 w-5" />
              <span>Agregar Profesor</span>
            </button>
          </div>
        </div>

      {/* Create/Edit Form */}
      {showCreateForm && (
        <TeacherForm
          onSubmit={handleCreateTeacher}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      {editingTeacher && (
        <TeacherForm
          teacher={editingTeacher}
          onSubmit={handleUpdateTeacher}
          onCancel={() => setEditingTeacher(null)}
        />
      )}

      {/* Barra de búsqueda */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, email, especialización, nivel, modalidad..."
            value={quickFilterText}
            onChange={(e) => setQuickFilterText(e.target.value)}
            className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {quickFilterText && (
            <button
              onClick={() => setQuickFilterText('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XCircle className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* AG Grid Table */}
      <div className="ag-theme-quartz" style={{ height: '600px', width: '100%' }}>
        <AgGridReact<Teacher>
          theme={themeQuartz}
          rowData={teachers}
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


      </div>
    </AuthenticatedLayout>
  );
};

export default TeacherManagement;