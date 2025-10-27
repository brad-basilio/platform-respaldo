import React, { useState } from 'react';
import { Users, Plus, CreditCard as Edit, Trash2, Search, Clock, BookOpen, Calendar, UserCheck, AlertTriangle, CheckCircle } from 'lucide-react';
import { Group, Teacher, Student, TimeSlot } from '../../types';

const GroupManagement: React.FC = () => {
  const [groups, setGroups] = useState<Group[]>([
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
      startDate: new Date('2024-01-15'),
      endDate: new Date('2024-04-15'),
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
      startDate: new Date('2024-01-16'),
      endDate: new Date('2024-04-16'),
    },
    {
      id: 'group3',
      name: 'Teórico Avanzado C',
      type: 'theoretical',
      teacherId: '',
      studentIds: [],
      maxCapacity: 4,
      schedule: { dayOfWeek: 'Miércoles', startTime: '14:00', endTime: '15:30', duration: 90 },
      status: 'closed',
      level: 'advanced',
      startDate: new Date('2024-02-01'),
      endDate: new Date('2024-05-01'),
    },
  ]);

  const [teachers] = useState<Teacher[]>([
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
      ],
      assignedGroups: [],
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
      assignedGroups: [],
      assignedGroupIds: ['group2'],
      createdAt: new Date(),
    },
    {
      id: 'teacher3',
      name: 'Emma Davis',
      email: 'emma@example.com',
      role: 'teacher',
      status: 'active',
      specialization: 'both',
      availableSchedule: [
        { dayOfWeek: 'Lunes', startTime: '14:00', endTime: '18:00', duration: 240 },
        { dayOfWeek: 'Miércoles', startTime: '09:00', endTime: '13:00', duration: 240 },
        { dayOfWeek: 'Viernes', startTime: '10:00', endTime: '16:00', duration: 360 },
      ],
      assignedGroups: [],
      assignedGroupIds: [],
      createdAt: new Date(),
    },
  ]);

  const [students] = useState<Student[]>([
    {
      id: '1',
      name: 'Juan Pérez',
      email: 'john@example.com',
      role: 'student',
      status: 'active',
      classType: 'theoretical',
      assignedGroupId: 'group1',
      attendanceHistory: [],
      enrolledGroups: ['group1'],
      level: 'basic',
      points: 1250,
      badges: [],
      certificates: [],
      createdAt: new Date(),
    },
    {
      id: '2',
      name: 'María García',
      email: 'maria@example.com',
      role: 'student',
      status: 'active',
      classType: 'practical',
      assignedGroupId: 'group2',
      attendanceHistory: [],
      enrolledGroups: ['group2'],
      level: 'intermediate',
      points: 850,
      badges: [],
      certificates: [],
      createdAt: new Date(),
    },
    {
      id: '3',
      name: 'Ahmed Hassan',
      email: 'ahmed@example.com',
      role: 'student',
      status: 'active',
      classType: 'theoretical',
      level: 'advanced',
      attendanceHistory: [],
      enrolledGroups: [],
      points: 2100,
      badges: [],
      certificates: [],
      createdAt: new Date(),
    },
  ]);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'theoretical' | 'practical'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'closed'>('all');

  const filteredGroups = groups.filter(group => {
    const matchesSearch = group.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || group.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || group.status === statusFilter;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const checkTeacherAvailability = (teacherId: string, schedule: TimeSlot, excludeGroupId?: string): boolean => {
    const teacher = teachers.find(t => t.id === teacherId);
    if (!teacher || teacher.status !== 'active') return false;

    // Check if teacher specialization matches group type
    const groupType = editingGroup?.type || 'theoretical';
    if (teacher.specialization !== 'both' && teacher.specialization !== groupType) return false;

    // Check if teacher is available at this time slot
    const isAvailable = teacher.availableSchedule.some(slot => {
      if (slot.dayOfWeek !== schedule.dayOfWeek) return false;
      
      const slotStart = parseInt(slot.startTime.replace(':', ''));
      const slotEnd = parseInt(slot.endTime.replace(':', ''));
      const scheduleStart = parseInt(schedule.startTime.replace(':', ''));
      const scheduleEnd = parseInt(schedule.endTime.replace(':', ''));
      
      return scheduleStart >= slotStart && scheduleEnd <= slotEnd;
    });

    if (!isAvailable) return false;

    // Check for schedule conflicts with other groups
    const hasConflict = groups.some(group => {
      if (excludeGroupId && group.id === excludeGroupId) return false;
      if (group.teacherId !== teacherId) return false;
      if (group.schedule.dayOfWeek !== schedule.dayOfWeek) return false;
      
      const existingStart = parseInt(group.schedule.startTime.replace(':', ''));
      const existingEnd = parseInt(group.schedule.endTime.replace(':', ''));
      const newStart = parseInt(schedule.startTime.replace(':', ''));
      const newEnd = parseInt(schedule.endTime.replace(':', ''));
      
      return (newStart < existingEnd && newEnd > existingStart);
    });

    return !hasConflict;
  };

  const getAvailableStudents = (groupType: 'theoretical' | 'practical', level: string, excludeGroupId?: string) => {
    return students.filter(student => {
      if (student.status !== 'active') return false;
      if (student.classType !== groupType) return false;
      if (student.level !== level) return false;
      
      // If editing, include students already in this group
      if (excludeGroupId && student.assignedGroupId === excludeGroupId) return true;
      
      // Otherwise, only include unassigned students
      return !student.assignedGroupId;
    });
  };

  const handleCreateGroup = (formData: any) => {
    const newGroup: Group = {
      id: Date.now().toString(),
      name: formData.name,
      type: formData.type,
      teacherId: formData.teacherId,
      teacherName: teachers.find(t => t.id === formData.teacherId)?.name,
      studentIds: formData.studentIds || [],
      maxCapacity: formData.type === 'theoretical' ? 4 : 6,
      schedule: formData.schedule,
      status: 'active',
      level: formData.level,
      startDate: new Date(formData.startDate),
      endDate: new Date(formData.endDate),
    };

    setGroups([...groups, newGroup]);
    setShowCreateForm(false);
  };

  const handleUpdateGroup = (formData: any) => {
    if (!editingGroup) return;

    const updatedGroup: Group = {
      ...editingGroup,
      name: formData.name,
      type: formData.type,
      teacherId: formData.teacherId,
      teacherName: teachers.find(t => t.id === formData.teacherId)?.name,
      studentIds: formData.studentIds || [],
      maxCapacity: formData.type === 'theoretical' ? 4 : 6,
      schedule: formData.schedule,
      status: formData.status,
      level: formData.level,
      startDate: new Date(formData.startDate),
      endDate: new Date(formData.endDate),
    };

    setGroups(groups.map(g => g.id === editingGroup.id ? updatedGroup : g));
    setEditingGroup(null);
  };

  const handleDeleteGroup = (groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    if (group && group.studentIds.length > 0) {
      alert('No se puede eliminar un grupo con estudiantes inscritos. Por favor remueve los estudiantes primero.');
      return;
    }

    if (confirm('¿Estás seguro de que quieres eliminar este grupo?')) {
      setGroups(groups.filter(g => g.id !== groupId));
    }
  };

  const GroupForm = ({ group, onSubmit, onCancel }: {
    group?: Group;
    onSubmit: (data: any) => void;
    onCancel: () => void;
  }) => {
    const [formData, setFormData] = useState({
      name: group?.name || '',
      type: group?.type || 'theoretical',
      level: group?.level || 'basic',
      teacherId: group?.teacherId || '',
      studentIds: group?.studentIds || [],
      schedule: group?.schedule || { dayOfWeek: 'Lunes', startTime: '09:00', endTime: '10:30', duration: 90 },
      status: group?.status || 'active',
      startDate: group?.startDate ? group.startDate.toISOString().split('T')[0] : '',
      endDate: group?.endDate ? group.endDate.toISOString().split('T')[0] : '',
    });

    const availableTeachers = teachers.filter(teacher => {
      if (teacher.status !== 'active') return false;
      if (teacher.specialization !== 'both' && teacher.specialization !== formData.type) return false;
      return checkTeacherAvailability(teacher.id, formData.schedule, group?.id);
    });

    const availableStudents = getAvailableStudents(formData.type, formData.level, group?.id);
    const maxCapacity = formData.type === 'theoretical' ? 4 : 6;

    const updateSchedule = (field: keyof TimeSlot, value: string) => {
      const updatedSchedule = { ...formData.schedule, [field]: value };
      
      if (field === 'startTime' || field === 'endTime') {
        const start = parseInt(updatedSchedule.startTime.replace(':', ''));
        const end = parseInt(updatedSchedule.endTime.replace(':', ''));
        updatedSchedule.duration = (end - start) * 60 / 100;
      }
      
      setFormData({ ...formData, schedule: updatedSchedule, teacherId: '' });
    };

    const handleStudentToggle = (studentId: string) => {
      const currentStudents = formData.studentIds;
      const isSelected = currentStudents.includes(studentId);
      
      if (isSelected) {
        setFormData({
          ...formData,
          studentIds: currentStudents.filter(id => id !== studentId)
        });
      } else {
        if (currentStudents.length < maxCapacity) {
          setFormData({
            ...formData,
            studentIds: [...currentStudents, studentId]
          });
        } else {
          alert(`Capacidad máxima alcanzada (${maxCapacity} estudiantes para clases ${formData.type === 'theoretical' ? 'teóricas' : 'prácticas'})`);
        }
      }
    };

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      
      if (formData.studentIds.length > maxCapacity) {
        alert(`No se puede exceder la capacidad máxima de ${maxCapacity} estudiantes`);
        return;
      }
      
      if (formData.teacherId && !checkTeacherAvailability(formData.teacherId, formData.schedule, group?.id)) {
        alert('El profesor seleccionado no está disponible en este horario');
        return;
      }
      
      onSubmit(formData);
    };

    return (
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {group ? 'Editar Grupo' : 'Crear Nuevo Grupo'}
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre del Grupo
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Clase
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({...formData, type: e.target.value as 'theoretical' | 'practical', teacherId: '', studentIds: []})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="theoretical">Teórico (Máx 4 estudiantes)</option>
                <option value="practical">Práctico (Máx 6 estudiantes)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nivel
              </label>
              <select
                value={formData.level}
                onChange={(e) => setFormData({...formData, level: e.target.value, studentIds: []})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="basic">Básico</option>
                <option value="intermediate">Intermedio</option>
                <option value="advanced">Avanzado</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estado
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({...formData, status: e.target.value as 'active' | 'closed'})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="active">Activo</option>
                <option value="closed">Cerrado</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Horario
            </label>
            <div className="grid grid-cols-4 gap-3">
              <select
                value={formData.schedule.dayOfWeek}
                onChange={(e) => updateSchedule('dayOfWeek', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                value={formData.schedule.startTime}
                onChange={(e) => updateSchedule('startTime', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              
              <input
                type="time"
                value={formData.schedule.endTime}
                onChange={(e) => updateSchedule('endTime', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              
              <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-600">
                {formData.schedule.duration} min
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha de Inicio
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
                Fecha de Fin
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Asignar Profesor
            </label>
            <select
              value={formData.teacherId}
              onChange={(e) => setFormData({...formData, teacherId: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Sin profesor asignado</option>
              {availableTeachers.map(teacher => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.name} ({teacher.specialization === 'theoretical' ? 'teórico' : teacher.specialization === 'practical' ? 'práctico' : 'ambos'})
                </option>
              ))}
            </select>
            {availableTeachers.length === 0 && (
              <p className="text-sm text-orange-600 mt-1">
                No hay profesores disponibles para clases {formData.type === 'theoretical' ? 'teóricas' : 'prácticas'} en este horario
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Agregar Estudiantes ({formData.studentIds.length}/{maxCapacity})
            </label>
            <select
              multiple
              value={formData.studentIds}
              onChange={(e) => {
                const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
                if (selectedOptions.length <= maxCapacity) {
                  setFormData({...formData, studentIds: selectedOptions});
                } else {
                  alert(`Capacidad máxima alcanzada (${maxCapacity} estudiantes para clases ${formData.type === 'theoretical' ? 'teóricas' : 'prácticas'})`);
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[120px]"
            >
              {availableStudents.length === 0 ? (
                <option disabled>No hay estudiantes disponibles para {formData.type === 'theoretical' ? 'teórico' : 'práctico'} nivel {formData.level === 'basic' ? 'básico' : formData.level === 'intermediate' ? 'intermedio' : 'avanzado'}</option>
              ) : (
                availableStudents.map(student => (
                  <option key={student.id} value={student.id}>
                    {student.name} - {student.email}
                  </option>
                ))
              )}
            </select>
            <p className="text-xs text-gray-500 mt-1">Mantén presionado Ctrl (Windows) o Cmd (Mac) para seleccionar múltiples estudiantes</p>
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
              {group ? 'Actualizar' : 'Crear'} Grupo
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
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Grupos</h1>
          <p className="text-gray-600">Gestiona grupos de clases e inscripción de estudiantes</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
        >
          <Plus className="h-5 w-5" />
          <span>Crear Grupo</span>
        </button>
      </div>

      {/* Create/Edit Form */}
      {showCreateForm && (
        <GroupForm
          onSubmit={handleCreateGroup}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      {editingGroup && (
        <GroupForm
          group={editingGroup}
          onSubmit={handleUpdateGroup}
          onCancel={() => setEditingGroup(null)}
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
                placeholder="Buscar grupos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todos los Tipos</option>
            <option value="theoretical">Teórico</option>
            <option value="practical">Práctico</option>
          </select>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todos los Estados</option>
            <option value="active">Activo</option>
            <option value="closed">Cerrado</option>
          </select>
        </div>
      </div>

      {/* Groups Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Grupo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo y Nivel
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Profesor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estudiantes
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Horario
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredGroups.map((group) => (
                <tr key={group.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{group.name}</div>
                      <div className="text-sm text-gray-500">
                        {group.startDate.toLocaleDateString()} - {group.endDate.toLocaleDateString()}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        group.type === 'theoretical' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        <BookOpen className="w-3 h-3 mr-1" />
                        {group.type === 'theoretical' ? 'teórico' : 'práctico'}
                      </span>
                      <div className="text-xs text-gray-600 capitalize">{group.level === 'basic' ? 'básico' : group.level === 'intermediate' ? 'intermedio' : 'avanzado'}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {group.teacherName ? (
                      <div className="text-sm text-gray-900">{group.teacherName}</div>
                    ) : (
                      <span className="text-sm text-red-600 flex items-center">
                        <AlertTriangle className="w-4 h-4 mr-1" />
                        Sin profesor asignado
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-900">
                        {group.studentIds.length}/{group.maxCapacity}
                      </span>
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            group.studentIds.length === group.maxCapacity 
                              ? 'bg-green-600' 
                              : group.studentIds.length > group.maxCapacity * 0.7
                              ? 'bg-yellow-600'
                              : 'bg-blue-600'
                          }`}
                          style={{width: `${(group.studentIds.length / group.maxCapacity) * 100}%`}}
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1 text-gray-400" />
                        {group.schedule.dayOfWeek}
                      </div>
                      <div className="flex items-center text-xs text-gray-600">
                        <Clock className="w-3 h-3 mr-1" />
                        {group.schedule.startTime} - {group.schedule.endTime}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      group.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {group.status === 'active' ? <CheckCircle className="w-3 h-3 mr-1" /> : <AlertTriangle className="w-3 h-3 mr-1" />}
                      {group.status === 'active' ? 'activo' : 'cerrado'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setEditingGroup(group)}
                        className="text-blue-600 hover:text-blue-900 p-1 hover:bg-blue-50 rounded transition-colors"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteGroup(group.id)}
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

        {filteredGroups.length === 0 && (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No se encontraron grupos</p>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total de Grupos</p>
              <p className="text-2xl font-semibold text-gray-900">{groups.length}</p>
            </div>
            <Users className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Grupos Activos</p>
              <p className="text-2xl font-semibold text-green-600">
                {groups.filter(g => g.status === 'active').length}
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Teórico</p>
              <p className="text-2xl font-semibold text-blue-600">
                {groups.filter(g => g.type === 'theoretical').length}
              </p>
            </div>
            <BookOpen className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Ocupación Promedio</p>
              <p className="text-2xl font-semibold text-purple-600">
                {groups.length > 0 
                  ? Math.round((groups.reduce((acc, g) => acc + (g.studentIds.length / g.maxCapacity), 0) / groups.length) * 100)
                  : 0}%
              </p>
            </div>
            <Calendar className="h-8 w-8 text-purple-600" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupManagement;