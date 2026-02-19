import React, { useState, useMemo } from 'react';
import { UserCheck, Plus, Trash2, Search, Clock, BookOpen, Users, AlertCircle, CheckCircle, Edit, XCircle } from 'lucide-react';
import Swal from 'sweetalert2';
import { toast } from 'sonner';
import { router, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { AgGridReact } from 'ag-grid-react';
import { ColDef } from 'ag-grid-community';
import { ModuleRegistry } from 'ag-grid-community';
import { AllCommunityModule } from 'ag-grid-community';
import { themeQuartz } from 'ag-grid-community';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/DatePicker';
import { Select2 } from '@/components/ui/Select2';

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
  meet_url?: string;
  not_available_today?: boolean;
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
    availableSchedule: (teacher.availableSchedule || teacher.available_schedule || []).map((slot: any) => ({
      id: slot.id,
      dayOfWeek: slot.dayOfWeek || slot.day_of_week,
      startTime: (slot.startTime || slot.start_time || '').substring(0, 5),
      endTime: (slot.endTime || slot.end_time || '').substring(0, 5),
      duration: slot.duration
    })),
    assignedGroups: teacher.assignedGroups || [],
    assignedGroupIds: teacher.assignedGroupIds || [],
  }));

  const handleCreateTeacher = (formData: any) => {
    const toastId = toast.loading('Registrando instructor...');
    
    router.post('/admin/teachers', formData, {
      onSuccess: () => {
        toast.dismiss(toastId);
        toast.success('Instructor registrado', {
          description: 'El instructor ha sido creado exitosamente.'
        });
        setShowCreateForm(false);
      },
      onError: (errors) => {
        toast.dismiss(toastId);
        console.error(errors);
        toast.error('Error al registrar', {
          description: 'Por favor verifica los datos e inténtalo de nuevo.'
        });
      }
    });
  };

  const handleUpdateTeacher = (formData: any) => {
    if (!editingTeacher) return;
    
    const toastId = toast.loading('Actualizando información...');
    
    router.put(`/admin/teachers/${editingTeacher.id}`, formData, {
      onSuccess: () => {
        toast.dismiss(toastId);
        toast.success('Instructor actualizado', {
          description: 'La información ha sido guardada correctamente.'
        });
        setEditingTeacher(null);
      },
      onError: (errors) => {
        toast.dismiss(toastId);
        console.error(errors);
        toast.error('Error al actualizar', {
          description: 'Ocurrió un problema al guardar los cambios.'
        });
      }
    });
  };

  const handleDeleteTeacher = (teacherId: number) => {
    const teacher = teachers.find(t => t.id === teacherId);
    if (teacher && teacher.assignedGroups && teacher.assignedGroups.length > 0) {
      Swal.fire({
        icon: 'warning',
        title: 'No se puede eliminar',
        text: 'Este instructor tiene grupos asignados. Reasigna los grupos antes de eliminarlo.',
        confirmButtonColor: '#f59e0b'
      });
      return;
    }

    Swal.fire({
      title: '¿Estás seguro?',
      text: "Esta acción no se puede deshacer.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        const toastId = toast.loading('Eliminando instructor...');
        router.delete(`/admin/teachers/${teacherId}`, {
          onSuccess: () => {
             toast.dismiss(toastId);
             toast.success('Eliminado', {
               description: 'El instructor ha sido eliminado correctamente.'
             });
          },
          onError: () => {
             toast.dismiss(toastId);
             toast.error('Error', {
               description: 'No se pudo eliminar el instructor.'
             });
          }
        });
      }
    });
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
      
      // Link de Meet
      meet_url: teacher?.meet_url || '',

      // Horarios Disponibles
      available_schedule: teacher?.availableSchedule || teacher?.available_schedule || [],
    });

    // Estado para nuevo horario
    const [scheduleForm, setScheduleForm] = useState({
      dayOfWeek: 'Lunes',
      startTime: '09:00',
      endTime: '12:00'
    });

    const addSchedule = () => {
      // Validar hora fin > inicio
      const [startH, startM] = scheduleForm.startTime.split(':').map(Number);
      const [endH, endM] = scheduleForm.endTime.split(':').map(Number);
      
      if ((endH * 60 + endM) <= (startH * 60 + startM)) {
         Swal.fire({
           icon: 'error',
           title: 'Horario Inválido',
           text: 'La hora de fin debe ser mayor a la hora de inicio',
           confirmButtonColor: '#ef4444'
         });
         return;
      }

      const newSlot: TimeSlot = {
         dayOfWeek: scheduleForm.dayOfWeek,
         startTime: scheduleForm.startTime,
         endTime: scheduleForm.endTime,
         duration: (endH * 60 + endM) - (startH * 60 + startM)
      };

      setFormData(prev => ({
        ...prev,
        available_schedule: [...(prev.available_schedule || []), newSlot]
      }));
    };

    const removeSchedule = (index: number) => {
      const newSchedule = [...(formData.available_schedule || [])];
      newSchedule.splice(index, 1);
      setFormData({...formData, available_schedule: newSchedule});
    };

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();

      // ✅ Validar campos requeridos
      const requiredFields = [
        { field: 'first_name', label: 'Nombres' },
        { field: 'paternal_last_name', label: 'Apellido Paterno' },
        { field: 'document_number', label: 'Número de Documento' },
        { field: 'birth_date', label: 'Fecha de Nacimiento' },
        { field: 'phone_number', label: 'Celular' },
        { field: 'email', label: 'Correo Electrónico' },
        { field: 'start_date', label: 'Fecha de Ingreso' },
      ];

      const missingFields = requiredFields
        .filter(item => !formData[item.field as keyof typeof formData])
        .map(item => item.label);

      if (missingFields.length > 0) {
        Swal.fire({
          icon: 'warning',
          title: 'Campos Incompletos',
          html: `<p>Por favor completa los siguientes campos obligatorios:</p>
                 <ul class="text-left mt-2 list-disc pl-5 text-sm text-gray-600">
                   ${missingFields.map(field => `<li>${field}</li>`).join('')}
                 </ul>`,
          confirmButtonColor: '#f59e0b'
        });
        return;
      }

      // ✅ Validar horarios
      if (!formData.available_schedule || formData.available_schedule.length === 0) {
        Swal.fire({
          icon: 'warning',
          title: 'Sin Horarios',
          text: 'Debes agregar al menos un horario de disponibilidad para el instructor.',
          confirmButtonColor: '#f59e0b'
        });
        return;
      }

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
        className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm animate-fade-in flex items-center justify-center p-4"
        onClick={onCancel}
        style={{ height: '100vh', width: '100vw' }}
      >
        {/* Modal Container */}
        <div
          className="relative bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col animate-scale-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header del Modal */}
          <div className="relative bg-gradient-to-r from-[#073372] to-[#17BC91] px-8 py-6 rounded-t-3xl flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-white mb-1">
                  {teacher ? 'Editar Instructor' : 'Nuevo Instructor'}
                </h3>
                <p className="text-blue-100">
                  {teacher
                    ? 'Actualiza la información del instructor'
                    : 'Completa la información para registrar un nuevo instructor'}
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
                <div className="flex items-center mb-4 pb-2 border-b-2 border-[#073372]">
                  <div className="w-8 h-8 bg-[#073372] text-white rounded-full flex items-center justify-center font-bold mr-3">
                    1
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900">Datos Personales del Instructor</h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input
                    label="Nombres"
                    value={formData.first_name}
                    onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                    required
                  />

                  <Input
                    label="Apellido Paterno"
                    value={formData.paternal_last_name}
                    onChange={(e) => setFormData({...formData, paternal_last_name: e.target.value})}
                    required
                  />

                  <Input
                    label="Apellido Materno"
                    value={formData.maternal_last_name}
                    onChange={(e) => setFormData({...formData, maternal_last_name: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <Select2
                    label="Tipo de Documento"
                    value={formData.document_type}
                    onChange={(value) => setFormData({...formData, document_type: value as string})}
                    options={[
                      { value: 'DNI', label: 'DNI' },
                      { value: 'CE', label: 'Carnet de Extranjería' }
                    ]}
                    isSearchable={false}
                    isClearable={false}
                  />

                  <Input
                    label="Número de Documento"
                    value={formData.document_number}
                    onChange={(e) => setFormData({...formData, document_number: e.target.value})}
                    required
                  />

                  <DatePicker
                    label="Fecha de Nacimiento"
                    selected={formData.birth_date ? new Date(formData.birth_date) : null}
                    onChange={(date) => setFormData({...formData, birth_date: date ? date.toISOString().split('T')[0] : ''})}
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
                    value={formData.phone_number}
                    onChange={(e) => setFormData({...formData, phone_number: e.target.value})}
                    required
                  />

                  <Select2
                    label="Grado de Instrucción"
                    value={formData.education_level}
                    onChange={(value) => setFormData({...formData, education_level: value as string})}
                    options={[
                      { value: 'tecnico', label: 'Técnico' },
                      { value: 'universitario', label: 'Universitario' },
                      { value: 'maestria', label: 'Maestría' },
                      { value: 'doctorado', label: 'Doctorado' }
                    ]}
                    isSearchable={false}
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
              {/* Sección 2: Datos Laborales */}
              <div>
                <div className="flex items-center mb-4 pb-2 border-b-2 border-[#17BC91]">
                  <div className="w-8 h-8 bg-[#17BC91] text-white rounded-full flex items-center justify-center font-bold mr-3">
                    2
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900">Datos Laborales</h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <DatePicker
                    label="Fecha de Ingreso"
                    selected={formData.start_date ? new Date(formData.start_date) : null}
                    onChange={(date) => setFormData({...formData, start_date: date ? date.toISOString().split('T')[0] : ''})}
                    maxDate={new Date()}
                    required
                  />

                  <Select2
                    label="Modalidad de Trabajo"
                    value={formData.work_modality}
                    onChange={(value) => setFormData({...formData, work_modality: value as string})}
                    options={[
                      { value: 'presencial', label: 'Presencial' },
                      { value: 'virtual', label: 'Virtual' },
                      { value: 'hibrido', label: 'Híbrido' }
                    ]}
                    isSearchable={false}
                  />

                  <Select2
                    label="Nivel de Idioma"
                    value={formData.language_level}
                    onChange={(value) => setFormData({...formData, language_level: value as string})}
                    options={[
                      { value: 'nativo', label: 'Nativo' },
                      { value: 'C2', label: 'C2 - Proficiency' },
                      { value: 'C1', label: 'C1 - Advanced' },
                      { value: 'B2', label: 'B2 - Upper Intermediate' }
                    ]}
                    isSearchable={false}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <Input
                    label="Cuenta Bancaria / CCI"
                    value={formData.bank_account}
                    onChange={(e) => setFormData({...formData, bank_account: e.target.value})}
                  />

                  <Select2
                    label="Banco"
                    value={formData.bank}
                    onChange={(value) => setFormData({...formData, bank: value as string})}
                    options={[
                      { value: 'BCP', label: 'Banco de Crédito del Perú' },
                      { value: 'BBVA', label: 'BBVA' },
                      { value: 'Scotiabank', label: 'Scotiabank' },
                      { value: 'Interbank', label: 'Interbank' },
                      { value: 'BanBif', label: 'BanBif' },
                      { value: 'Banco Pichincha', label: 'Banco Pichincha' },
                      { value: 'Otro', label: 'Otro' }
                    ]}
                    isSearchable={false}
                    isClearable={true}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <Select2
                    label="Estado de Contrato"
                    value={formData.contract_status}
                    onChange={(value) => setFormData({...formData, contract_status: value as string})}
                    options={[
                      { value: 'contratado', label: 'Contratado' },
                      { value: 'en_proceso', label: 'En Proceso' },
                      { value: 'finalizado', label: 'Finalizado' }
                    ]}
                    isSearchable={false}
                  />

                  <Input
                    label="Periodo de Contrato"
                    value={formData.contract_period}
                    onChange={(e) => setFormData({...formData, contract_period: e.target.value})}
                  />

                  <Select2
                    label="Modalidad de Contrato"
                    value={formData.contract_modality}
                    onChange={(value) => setFormData({...formData, contract_modality: value as string})}
                    options={[
                      { value: 'tiempo_completo', label: 'Tiempo Completo' },
                      { value: 'medio_tiempo', label: 'Medio Tiempo' },
                      { value: 'por_horas', label: 'Por Horas' },
                      { value: 'freelance', label: 'Freelance' }
                    ]}
                    isSearchable={false}
                    isClearable={true}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <Select2
                    label="Especialización"
                    value={formData.specialization}
                    onChange={(value) => setFormData({...formData, specialization: value as 'theoretical' | 'practical' | 'both'})}
                    options={[
                      { value: 'theoretical', label: 'Solo Teórico' },
                      { value: 'practical', label: 'Solo Práctico' },
                      { value: 'both', label: 'Ambos' }
                    ]}
                    isSearchable={false}
                  />

                  <Select2
                    label="Estado"
                    value={formData.status}
                    onChange={(value) => setFormData({...formData, status: value as 'active' | 'inactive'})}
                    options={[
                      { value: 'active', label: 'Activo' },
                      { value: 'inactive', label: 'Inactivo' }
                    ]}
                    isSearchable={false}
                  />
                </div>

                {/* Link de Google Meet */}
                <div className="mt-4">
                  <Input
                    label="🔗 Link de Google Meet Personal"
                    type="url"
                    value={formData.meet_url}
                    onChange={(e) => setFormData({...formData, meet_url: e.target.value})}
                    helperText="Este link se usará automáticamente al asignar clases a este instructor."
                  />
                </div>
              </div>

              {/* Sección 3: Datos de Contacto y Emergencia */}
              <div>
                <div className="flex items-center mb-4 pb-2 border-b-2 border-[#F98613]">
                  <div className="w-8 h-8 bg-[#F98613] text-white rounded-full flex items-center justify-center font-bold mr-3">
                    3
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900">Datos de Contacto y Emergencia</h4>
                </div>

                <div>
                  <Input
                    label="Dirección Actual"
                    value={formData.current_address}
                    onChange={(e) => setFormData({...formData, current_address: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <Input
                    label="Contacto de Emergencia"
                    value={formData.emergency_contact_name}
                    onChange={(e) => setFormData({...formData, emergency_contact_name: e.target.value})}
                  />

                  <Input
                    label="Teléfono de Emergencia"
                    type="tel"
                    value={formData.emergency_contact_number}
                    onChange={(e) => setFormData({...formData, emergency_contact_number: e.target.value})}
                  />

                  <Select2
                    label="Parentesco"
                    value={formData.emergency_contact_relationship}
                    onChange={(value) => setFormData({...formData, emergency_contact_relationship: value as string})}
                    options={[
                      { value: 'padre', label: 'Padre' },
                      { value: 'madre', label: 'Madre' },
                      { value: 'esposo', label: 'Esposo/a' },
                      { value: 'hermano', label: 'Hermano/a' },
                      { value: 'hijo', label: 'Hijo/a' },
                      { value: 'otro', label: 'Otro' }
                    ]}
                    isSearchable={false}
                    isClearable={true}
                  />
                </div>
              </div>

              {/* Sección 4: Horarios Disponibles */}
              <div className="mt-6">
                <div className="flex items-center mb-4 pb-2 border-b-2 border-purple-500">
                  <div className="w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center font-bold mr-3">
                    4
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900">Horarios Disponibles</h4>
                </div>

                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <div className="flex flex-wrap gap-4 items-end">
                    <div className="flex-1 min-w-[150px]">
                      <Select2
                        label="Día"
                        value={scheduleForm.dayOfWeek}
                        onChange={(val) => setScheduleForm({...scheduleForm, dayOfWeek: val as string})}
                        options={[
                          { value: 'Lunes', label: 'Lunes' },
                          { value: 'Martes', label: 'Martes' },
                          { value: 'Miércoles', label: 'Miércoles' },
                          { value: 'Jueves', label: 'Jueves' },
                          { value: 'Viernes', label: 'Viernes' },
                          { value: 'Sábado', label: 'Sábado' },
                          { value: 'Domingo', label: 'Domingo' }
                        ]}
                        isSearchable={false}
                      />
                    </div>
                    <div className="flex-1 min-w-[150px]">
                      <Input
                        label="Hora Inicio"
                        type="time"
                        value={scheduleForm.startTime}
                        onChange={(e) => setScheduleForm({...scheduleForm, startTime: e.target.value})}
                      />
                    </div>
                    <div className="flex-1 min-w-[150px]">
                      <Input
                        label="Hora Fin"
                        type="time"
                        value={scheduleForm.endTime}
                        onChange={(e) => setScheduleForm({...scheduleForm, endTime: e.target.value})}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={addSchedule}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors h-[42px] mb-[2px]"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Lista de Horarios */}
                <div className="mt-4 space-y-2">
                  {formData.available_schedule && formData.available_schedule.length > 0 ? (
                    formData.available_schedule.map((slot: any, index: number) => (
                      <div key={index} className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center">
                            <Clock className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-semibold text-gray-800">{slot.dayOfWeek}</span>
                            <span className="mx-2 text-gray-400">|</span>
                            <span className="text-gray-600">{slot.startTime} - {slot.endTime}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeSchedule(index)}
                          className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                      No hay horarios agregados. Añade al menos uno.
                    </div>
                  )}
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
                  className="px-6 py-3 rounded-xl font-semibold transition-all duration-200 shadow-sm flex items-center gap-2 bg-gradient-to-r from-[#073372] to-[#17BC91] hover:from-[#052a5e] hover:to-[#14a77f] text-white"
                >
                  {teacher ? 'Actualizar' : 'Crear'} Instructor
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
    });
  };

  // Definición de columnas para AG Grid
  const columnDefs = useMemo<ColDef<Teacher>[]>(() => [
    {
      headerName: 'Instructor',
      field: 'name',
      minWidth: 250,
      filter: 'agTextColumnFilter',
      cellRenderer: (params: any) => {
        const teacher = params.data;
        return (
          <div className="flex items-center py-2 w-full h-full">
            <div className="w-10 h-10 bg-gradient-to-r from-[#073372] to-[#17BC91] rounded-full flex items-center justify-center flex-shrink-0">
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
              className="text-[#073372] hover:text-[#17BC91] p-1 hover:bg-[#17BC91]/10 rounded transition-colors"
              title="Editar instructor"
            >
              <Edit className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleDeleteTeacher(teacher.id)}
              className="text-red-600 hover:text-red-900 p-1 hover:bg-red-50 rounded transition-colors"
              title="Eliminar instructor"
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
            <h1 className="text-2xl font-bold text-gray-900">Gestión de Instructores</h1>
            <p className="text-gray-600">Gestiona perfiles de instructores y asignaciones de horarios</p>
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
              className="bg-gradient-to-r from-[#073372] to-[#17BC91] hover:from-[#052a5e] hover:to-[#14a77f] text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
            >
              <Plus className="h-5 w-5" />
              <span>Agregar Instructor</span>
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
            className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#073372]"
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
