import React, { useState } from 'react';
import { UserCheck, Plus, CreditCard as Edit, Trash2, Search, Clock, BookOpen, Calendar, Users, AlertCircle, CheckCircle } from 'lucide-react';
import { Teacher, TimeSlot, AssignedGroup, Group } from '../../types';

const TeacherManagement: React.FC = () => {
  const [teachers, setTeachers] = useState<Teacher[]>([
    {
      id: 'teacher1',
      name: 'Sarah Johnson',
      email: 'sarah@example.com',
      role: 'teacher',
      status: 'active',
      specialization: 'theoretical',
      availableSchedule: [
        { dayOfWeek: 'Lunes', startTime: '09:00', endTime: '12:00', duration: 180 },
        { dayOfWeek: 'Miércoles', startTime: '14:00', endTime: '17:00', duration: 180 },
        { dayOfWeek: 'Viernes', startTime: '10:00', endTime: '13:00', duration: 180 },
      ],
      assignedGroups: [
        {
          groupId: 'group1',
          groupName: 'Teórico Básico A',
          type: 'theoretical',
          schedule: { dayOfWeek: 'Lunes', startTime: '09:00', endTime: '10:30', duration: 90 }
        }
      ],
      assignedGroupIds: ['group1'],
      createdAt: new Date(),
    },
    {
      id: 'teacher2',
      name: 'Mike Wilson',
      email: 'mike@example.com',
      role: 'teacher',
      status: 'active',
      specialization: 'practical',
      availableSchedule: [
        { dayOfWeek: 'Martes', startTime: '08:00', endTime: '12:00', duration: 240 },
        { dayOfWeek: 'Jueves', startTime: '13:00', endTime: '18:00', duration: 300 },
      ],
      assignedGroups: [
        {
          groupId: 'group2',
          groupName: 'Práctico Intermedio B',
          type: 'practical',
          schedule: { dayOfWeek: 'Martes', startTime: '08:00', endTime: '09:30', duration: 90 }
        }
      ],
      assignedGroupIds: ['group2'],
      createdAt: new Date(),
    },
    {
      id: 'teacher3',
      name: 'Emma Davis',
      email: 'emma@example.com',
      role: 'teacher',
      status: 'inactive',
      specialization: 'both',
      availableSchedule: [
        { dayOfWeek: 'Lunes', startTime: '14:00', endTime: '18:00', duration: 240 },
        { dayOfWeek: 'Miércoles', startTime: '09:00', endTime: '13:00', duration: 240 },
      ],
      assignedGroups: [],
      assignedGroupIds: [],
      createdAt: new Date(),
    },
  ]);

  const [groups] = useState<Group[]>([
    {
      id: 'group1',
      name: 'Teórico Básico A',
      type: 'theoretical',
      teacherId: 'teacher1',
      teacherName: 'Sarah Johnson',
      studentIds: ['1'],
      maxCapacity: 4,
      schedule: { dayOfWeek: 'Lunes', startTime: '09:00', endTime: '10:30', duration: 90 },
      status: 'active',
      level: 'basic',
      startDate: new Date(),
      endDate: new Date(),
    },
    {
      id: 'group2',
      name: 'Práctico Intermedio B',
      type: 'practical',
      teacherId: 'teacher2',
      teacherName: 'Mike Wilson',
      studentIds: ['2'],
      maxCapacity: 6,
      schedule: { dayOfWeek: 'Martes', startTime: '08:00', endTime: '09:30', duration: 90 },
      status: 'active',
      level: 'intermediate',
      startDate: new Date(),
      endDate: new Date(),
    },
  ]);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [specializationFilter, setSpecializationFilter] = useState<'all' | 'theoretical' | 'practical' | 'both'>('all');

  const filteredTeachers = teachers.filter(teacher => {
    const matchesSearch = teacher.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         teacher.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || teacher.status === statusFilter;
    const matchesSpecialization = specializationFilter === 'all' || teacher.specialization === specializationFilter;
    
    return matchesSearch && matchesStatus && matchesSpecialization;
  });

  const checkScheduleConflict = (teacherId: string, newSchedule: TimeSlot, excludeGroupId?: string): boolean => {
    const teacher = teachers.find(t => t.id === teacherId);
    if (!teacher) return false;

    return teacher.assignedGroups.some(group => {
      if (excludeGroupId && group.groupId === excludeGroupId) return false;
      
      if (group.schedule.dayOfWeek !== newSchedule.dayOfWeek) return false;
      
      const existingStart = parseInt(group.schedule.startTime.replace(':', ''));
      const existingEnd = parseInt(group.schedule.endTime.replace(':', ''));
      const newStart = parseInt(newSchedule.startTime.replace(':', ''));
      const newEnd = parseInt(newSchedule.endTime.replace(':', ''));
      
      return (newStart < existingEnd && newEnd > existingStart);
    });
  };

  const isTimeSlotAvailable = (teacherId: string, schedule: TimeSlot): boolean => {
    const teacher = teachers.find(t => t.id === teacherId);
    if (!teacher) return false;

    return teacher.availableSchedule.some(slot => {
      if (slot.dayOfWeek !== schedule.dayOfWeek) return false;
      
      const slotStart = parseInt(slot.startTime.replace(':', ''));
      const slotEnd = parseInt(slot.endTime.replace(':', ''));
      const scheduleStart = parseInt(schedule.startTime.replace(':', ''));
      const scheduleEnd = parseInt(schedule.endTime.replace(':', ''));
      
      return scheduleStart >= slotStart && scheduleEnd <= slotEnd;
    });
  };

  const handleCreateTeacher = (formData: any) => {
    const newTeacher: Teacher = {
      id: Date.now().toString(),
      name: formData.name,
      email: formData.email,
      role: 'teacher',
      status: 'active',
      specialization: formData.specialization,
      availableSchedule: formData.availableSchedule,
      assignedGroups: [],
      assignedGroupIds: [],
      createdAt: new Date(),
    };

    setTeachers([...teachers, newTeacher]);
    setShowCreateForm(false);
  };

  const handleUpdateTeacher = (formData: any) => {
    if (!editingTeacher) return;

    const updatedTeacher: Teacher = {
      ...editingTeacher,
      name: formData.name,
      email: formData.email,
      status: formData.status,
      specialization: formData.specialization,
      availableSchedule: formData.availableSchedule,
    };

    setTeachers(teachers.map(t => t.id === editingTeacher.id ? updatedTeacher : t));
    setEditingTeacher(null);
  };

  const handleDeleteTeacher = (teacherId: string) => {
    const teacher = teachers.find(t => t.id === teacherId);
    if (teacher && teacher.assignedGroups.length > 0) {
      alert('No se puede eliminar un profesor con grupos asignados. Por favor reasigna los grupos primero.');
      return;
    }

    if (confirm('¿Estás seguro de que quieres eliminar este profesor?')) {
      setTeachers(teachers.filter(t => t.id !== teacherId));
    }
  };

  const TeacherForm = ({ teacher, onSubmit, onCancel }: {
    teacher?: Teacher;
    onSubmit: (data: any) => void;
    onCancel: () => void;
  }) => {
    const [formData, setFormData] = useState({
      // Datos Personales
      firstName: teacher?.firstName || '',
      paternalLastName: teacher?.paternalLastName || '',
      maternalLastName: teacher?.maternalLastName || '',
      email: teacher?.email || '',
      phoneNumber: teacher?.phoneNumber || '',
      gender: teacher?.gender || '',
      age: teacher?.age || '',
      birthDate: teacher?.birthDate || '',
      documentType: teacher?.documentType || 'DNI',
      documentNumber: teacher?.documentNumber || '',
      educationLevel: teacher?.educationLevel || '',
      
      // Datos Laborales
      status: teacher?.status || 'active',
      specialization: teacher?.specialization || 'theoretical',
      startDate: teacher?.startDate || '',
      bankAccount: teacher?.bankAccount || '',
      bank: teacher?.bank || '',
      workModality: teacher?.workModality || '',
      languageLevel: teacher?.languageLevel || '',
      contractStatus: teacher?.contractStatus || 'contratado',
      contractPeriod: teacher?.contractPeriod || '',
      contractModality: teacher?.contractModality || '',
      
      // Datos de Contacto
      currentAddress: teacher?.currentAddress || '',
      emergencyContactNumber: teacher?.emergencyContactNumber || '',
      emergencyContactRelationship: teacher?.emergencyContactRelationship || '',
      emergencyContactName: teacher?.emergencyContactName || '',
      
      // Horarios
      availableSchedule: teacher?.availableSchedule || [
        { dayOfWeek: 'Lunes', startTime: '09:00', endTime: '12:00', duration: 180 }
      ],
    });

    const addScheduleSlot = () => {
      setFormData({
        ...formData,
        availableSchedule: [
          ...formData.availableSchedule,
          { dayOfWeek: 'Lunes', startTime: '09:00', endTime: '12:00', duration: 180 }
        ]
      });
    };

    const removeScheduleSlot = (index: number) => {
      setFormData({
        ...formData,
        availableSchedule: formData.availableSchedule.filter((_, i) => i !== index)
      });
    };

    const updateScheduleSlot = (index: number, field: keyof TimeSlot, value: string) => {
      const updatedSchedule = [...formData.availableSchedule];
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
        updatedSchedule[index].duration = (end - start) * 60 / 100; // Convert to minutes
      }
      
      setFormData({ ...formData, availableSchedule: updatedSchedule });
    };

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      
      // Construir el nombre completo
      const fullName = `${formData.firstName} ${formData.paternalLastName} ${formData.maternalLastName}`.trim();
      
      const submitData = {
        ...formData,
        name: fullName,
      };
      
      onSubmit(submitData);
    };

    return (
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {teacher ? 'Editar Profesor' : 'Crear Nuevo Profesor'}
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Datos Personales */}
          <div className="border-b border-gray-200 pb-6">
            <h4 className="text-md font-semibold text-gray-800 mb-4">Datos Personales</h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombres *
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({...formData, firstName: e.target.value})}
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
                  value={formData.paternalLastName}
                  onChange={(e) => setFormData({...formData, paternalLastName: e.target.value})}
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
                  value={formData.maternalLastName}
                  onChange={(e) => setFormData({...formData, maternalLastName: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Número de Celular *
                </label>
                <input
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="+51 987654321"
                  required
                />
              </div>
              
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
                  <option value="Masculino">Masculino</option>
                  <option value="Femenino">Femenino</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Edad
                </label>
                <input
                  type="number"
                  min="18"
                  max="70"
                  value={formData.age}
                  onChange={(e) => setFormData({...formData, age: parseInt(e.target.value) || ''})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha de Nacimiento *
                </label>
                <input
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) => setFormData({...formData, birthDate: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Documento *
                </label>
                <select
                  value={formData.documentType}
                  onChange={(e) => setFormData({...formData, documentType: e.target.value})}
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
                  value={formData.documentNumber}
                  onChange={(e) => setFormData({...formData, documentNumber: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={formData.documentType === 'DNI' ? '12345678' : '001234567'}
                  required
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Grado de Instrucción *
                </label>
                <select
                  value={formData.educationLevel}
                  onChange={(e) => setFormData({...formData, educationLevel: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Seleccionar</option>
                  <option value="Técnico">Técnico</option>
                  <option value="Universitario">Universitario</option>
                  <option value="Maestría">Maestría</option>
                  <option value="Doctorado">Doctorado</option>
                </select>
              </div>
              
              <div>
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
          </div>
          
          {/* Datos Laborales */}
          <div className="border-b border-gray-200 pb-6">
            <h4 className="text-md font-semibold text-gray-800 mb-4">Datos Laborales</h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha de Ingreso de Labores *
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Modalidad de Servicio Laboral *
                </label>
                <select
                  value={formData.workModality}
                  onChange={(e) => setFormData({...formData, workModality: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Seleccionar</option>
                  <option value="Presencial">Presencial</option>
                  <option value="Virtual">Virtual</option>
                  <option value="Híbrido">Híbrido</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nivel de Idioma *
                </label>
                <select
                  value={formData.languageLevel}
                  onChange={(e) => setFormData({...formData, languageLevel: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Seleccionar</option>
                  <option value="Nativo">Nativo</option>
                  <option value="C2">C2 - Proficiency</option>
                  <option value="C1">C1 - Advanced</option>
                  <option value="B2">B2 - Upper Intermediate</option>
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Número de Cuenta Bancaria / CCI
                </label>
                <input
                  type="text"
                  value={formData.bankAccount}
                  onChange={(e) => setFormData({...formData, bankAccount: e.target.value})}
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
            
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estado de Contratación *
                </label>
                <select
                  value={formData.contractStatus}
                  onChange={(e) => setFormData({...formData, contractStatus: e.target.value})}
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
                  value={formData.contractPeriod}
                  onChange={(e) => setFormData({...formData, contractPeriod: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: 6 meses, 1 año"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Modalidad de Contrato
                </label>
                <select
                  value={formData.contractModality}
                  onChange={(e) => setFormData({...formData, contractModality: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seleccionar</option>
                  <option value="Tiempo Completo">Tiempo Completo</option>
                  <option value="Medio Tiempo">Medio Tiempo</option>
                  <option value="Por Horas">Por Horas</option>
                  <option value="Freelance">Freelance</option>
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-4">
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
          
          {/* Datos de Contacto y Emergencia */}
          <div className="border-b border-gray-200 pb-6">
            <h4 className="text-md font-semibold text-gray-800 mb-4">Datos de Contacto y Emergencia</h4>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dirección Actual
              </label>
              <textarea
                rows={2}
                value={formData.currentAddress}
                onChange={(e) => setFormData({...formData, currentAddress: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Dirección completa"
              />
            </div>
            
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Número de Emergencia
                </label>
                <input
                  type="tel"
                  value={formData.emergencyContactNumber}
                  onChange={(e) => setFormData({...formData, emergencyContactNumber: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="+51 987654321"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Parentesco
                </label>
                <select
                  value={formData.emergencyContactRelationship}
                  onChange={(e) => setFormData({...formData, emergencyContactRelationship: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seleccionar</option>
                  <option value="Padre">Padre</option>
                  <option value="Madre">Madre</option>
                  <option value="Esposo/a">Esposo/a</option>
                  <option value="Hermano/a">Hermano/a</option>
                  <option value="Hijo/a">Hijo/a</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombres y Apellidos del Contacto
                </label>
                <input
                  type="text"
                  value={formData.emergencyContactName}
                  onChange={(e) => setFormData({...formData, emergencyContactName: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nombre completo del contacto"
                />
              </div>
            </div>
          </div>
          
          {/* Horarios Disponibles */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-md font-semibold text-gray-800">Horarios Disponibles</h4>
              <button
                type="text"
                onClick={addScheduleSlot}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                + Agregar Horario
              </button>
            </div>
            
            <div className="space-y-3">
              {formData.availableSchedule.map((slot, index) => (
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
                  
                  {formData.availableSchedule.length > 1 && (
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

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              {teacher ? 'Actualizar' : 'Crear'} Profesor
            </button>
          </div>
        </form>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Profesores</h1>
          <p className="text-gray-600">Gestiona perfiles de profesores y asignaciones de horarios</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
        >
          <Plus className="h-5 w-5" />
          <span>Agregar Profesor</span>
        </button>
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

      {/* Filters */}
      <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar profesores..."
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
            value={specializationFilter}
            onChange={(e) => setSpecializationFilter(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todas las Especializaciones</option>
            <option value="theoretical">Teórico</option>
            <option value="practical">Práctico</option>
            <option value="both">Ambos</option>
          </select>
        </div>
      </div>

      {/* Teachers Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Profesor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Especialización
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Grupos Asignados
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Horarios
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTeachers.map((teacher) => (
                <tr key={teacher.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-blue-600 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-semibold">
                          {teacher.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{teacher.name}</div>
                        <div className="text-sm text-gray-500">{teacher.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      teacher.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {teacher.status === 'active' ? <CheckCircle className="w-3 h-3 mr-1" /> : <AlertCircle className="w-3 h-3 mr-1" />}
                      {teacher.status === 'active' ? 'activo' : 'inactivo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      teacher.specialization === 'theoretical' ? 'bg-blue-100 text-blue-800' :
                      teacher.specialization === 'practical' ? 'bg-purple-100 text-purple-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      <BookOpen className="w-3 h-3 mr-1" />
                      {teacher.specialization === 'theoretical' ? 'teórico' : teacher.specialization === 'practical' ? 'práctico' : 'ambos'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {teacher.assignedGroups.length > 0 ? (
                        <div className="space-y-1">
                          {teacher.assignedGroups.map(group => (
                            <div key={group.groupId} className="text-xs bg-gray-100 px-2 py-1 rounded">
                              {group.groupName}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-500">Sin grupos asignados</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {teacher.availableSchedule.length} horarios
                      <div className="text-xs text-gray-500">
                        {teacher.availableSchedule.slice(0, 2).map((slot, index) => (
                          <div key={index}>
                            {slot.dayOfWeek} {slot.startTime}-{slot.endTime}
                          </div>
                        ))}
                        {teacher.availableSchedule.length > 2 && (
                          <div>+{teacher.availableSchedule.length - 2} más</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setEditingTeacher(teacher)}
                        className="text-blue-600 hover:text-blue-900 p-1 hover:bg-blue-50 rounded transition-colors"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteTeacher(teacher.id)}
                        className="text-red-600 hover:text-red-900 p-1 hover:bg-red-50 rounded transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredTeachers.length === 0 && (
          <div className="text-center py-8">
            <UserCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No se encontraron profesores</p>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total de Profesores</p>
              <p className="text-2xl font-semibold text-gray-900">{teachers.length}</p>
            </div>
            <UserCheck className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Profesores Activos</p>
              <p className="text-2xl font-semibold text-green-600">
                {teachers.filter(t => t.status === 'active').length}
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Con Asignaciones</p>
              <p className="text-2xl font-semibold text-blue-600">
                {teachers.filter(t => t.assignedGroups.length > 0).length}
              </p>
            </div>
            <Users className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Disponibles</p>
              <p className="text-2xl font-semibold text-purple-600">
                {teachers.filter(t => t.status === 'active' && t.assignedGroups.length === 0).length}
              </p>
            </div>
            <Clock className="h-8 w-8 text-purple-600" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherManagement;