import React, { useState } from 'react';
import { Users, Search, Eye, CreditCard as Edit, ToggleLeft, ToggleRight, GraduationCap, Calendar, Phone, Mail, BookOpen, CheckCircle, XCircle, Filter } from 'lucide-react';
import { Student } from '../../types';

const EnrolledStudents: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([
    {
      id: '1',
      name: 'Juan Pérez García',
      email: 'juan.perez@email.com',
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
      createdAt: new Date('2024-01-15'),
      prospectStatus: 'matriculado',
      firstName: 'Juan',
      paternalLastName: 'Pérez',
      maternalLastName: 'García',
      phoneNumber: '+51 987654321',
      gender: 'Masculino',
      birthDate: '1995-03-15',
      documentType: 'DNI',
      documentNumber: '12345678',
      educationLevel: 'Universitario',
      paymentDate: '2024-01-10',
      enrollmentDate: '2024-01-15',
      registrationDate: '2024-01-05',
      enrollmentCode: 'ENG2024001',
      contractedPlan: 'Plan Básico - 3 meses',
      hasPlacementTest: true,
      testDate: '2024-01-12',
      testScore: '75/100',
    },
    {
      id: '2',
      name: 'María García López',
      email: 'maria.garcia@email.com',
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
      createdAt: new Date('2024-01-20'),
      prospectStatus: 'matriculado',
      firstName: 'María',
      paternalLastName: 'García',
      maternalLastName: 'López',
      phoneNumber: '+51 987654322',
      gender: 'Femenino',
      birthDate: '1992-07-22',
      documentType: 'DNI',
      documentNumber: '87654321',
      educationLevel: 'Técnico',
      paymentDate: '2024-01-18',
      enrollmentDate: '2024-01-20',
      registrationDate: '2024-01-10',
      enrollmentCode: 'ENG2024002',
      contractedPlan: 'Plan Intermedio - 6 meses',
      hasPlacementTest: true,
      testDate: '2024-01-17',
      testScore: '82/100',
    },
    {
      id: '3',
      name: 'Ahmed Hassan Ali',
      email: 'ahmed.hassan@email.com',
      role: 'student',
      status: 'inactive',
      classType: 'theoretical',
      attendanceHistory: [],
      enrolledGroups: [],
      level: 'advanced',
      points: 2100,
      badges: [],
      certificates: [],
      createdAt: new Date('2024-01-25'),
      prospectStatus: 'matriculado',
      firstName: 'Ahmed',
      paternalLastName: 'Hassan',
      maternalLastName: 'Ali',
      phoneNumber: '+51 987654323',
      gender: 'Masculino',
      birthDate: '1988-11-10',
      documentType: 'CE',
      documentNumber: '001234567',
      educationLevel: 'Universitario',
      paymentDate: '2024-01-22',
      enrollmentDate: '2024-01-25',
      registrationDate: '2024-01-15',
      enrollmentCode: 'ENG2024003',
      contractedPlan: 'Plan Avanzado - 12 meses',
      hasPlacementTest: true,
      testDate: '2024-01-23',
      testScore: '95/100',
    },
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [levelFilter, setLevelFilter] = useState<'all' | 'basic' | 'intermediate' | 'advanced'>('all');
  const [classTypeFilter, setClassTypeFilter] = useState<'all' | 'theoretical' | 'practical'>('all');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Filtrar solo estudiantes con estado matriculado
  const enrolledStudents = students.filter(student => 
    student.prospectStatus === 'matriculado'
  );

  const filteredStudents = enrolledStudents.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.enrollmentCode?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || student.status === statusFilter;
    const matchesLevel = levelFilter === 'all' || student.level === levelFilter;
    const matchesClassType = classTypeFilter === 'all' || student.classType === classTypeFilter;
    
    return matchesSearch && matchesStatus && matchesLevel && matchesClassType;
  });

  const handleToggleStatus = (studentId: string) => {
    setStudents(students.map(student => 
      student.id === studentId 
        ? { ...student, status: student.status === 'active' ? 'inactive' : 'active' }
        : student
    ));
  };

  const handleViewStudent = (student: Student) => {
    setSelectedStudent(student);
    setShowViewModal(true);
  };

  const handleEditStudent = (student: Student) => {
    setSelectedStudent(student);
    setShowEditModal(true);
  };

  const ViewStudentModal = () => {
    if (!selectedStudent) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Detalles del Alumno</h2>
            <button
              onClick={() => setShowViewModal(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <XCircle className="h-6 w-6" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Información Personal */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Información Personal
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-600">Nombre Completo</label>
                  <p className="text-gray-900">{selectedStudent.name}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Documento</label>
                    <p className="text-gray-900">{selectedStudent.documentType}: {selectedStudent.documentNumber}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Fecha de Nacimiento</label>
                    <p className="text-gray-900">{selectedStudent.birthDate}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Género</label>
                    <p className="text-gray-900">{selectedStudent.gender}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Nivel Educativo</label>
                    <p className="text-gray-900">{selectedStudent.educationLevel}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Información de Contacto */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Phone className="h-5 w-5 mr-2" />
                Información de Contacto
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-600">Email</label>
                  <p className="text-gray-900">{selectedStudent.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Teléfono</label>
                  <p className="text-gray-900">{selectedStudent.phoneNumber}</p>
                </div>
              </div>
            </div>

            {/* Información Académica */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <BookOpen className="h-5 w-5 mr-2" />
                Información Académica
              </h3>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Código de Matrícula</label>
                    <p className="text-gray-900 font-mono">{selectedStudent.enrollmentCode}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Plan Contratado</label>
                    <p className="text-gray-900">{selectedStudent.contractedPlan}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Nivel</label>
                    <p className="text-gray-900 capitalize">
                      {selectedStudent.level === 'basic' ? 'Básico' : 
                       selectedStudent.level === 'intermediate' ? 'Intermedio' : 'Avanzado'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Tipo de Clase</label>
                    <p className="text-gray-900">
                      {selectedStudent.classType === 'theoretical' ? 'Teórico' : 'Práctico'}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Puntos Acumulados</label>
                    <p className="text-gray-900 font-semibold">{selectedStudent.points.toLocaleString()}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Estado</label>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      selectedStudent.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {selectedStudent.status === 'active' ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Examen de Categorización */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <GraduationCap className="h-5 w-5 mr-2" />
                Examen de Categorización
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-600">¿Realizó examen?</label>
                  <p className="text-gray-900">
                    {selectedStudent.hasPlacementTest ? 'Sí' : 'No'}
                  </p>
                </div>
                {selectedStudent.hasPlacementTest && (
                  <>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Fecha del Examen</label>
                      <p className="text-gray-900">{selectedStudent.testDate}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Puntaje Obtenido</label>
                      <p className="text-gray-900 font-semibold">{selectedStudent.testScore}</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Fechas Importantes */}
            <div className="bg-gray-50 rounded-lg p-4 md:col-span-2">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                Fechas Importantes
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Fecha de Registro</label>
                  <p className="text-gray-900">{selectedStudent.registrationDate}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Fecha de Pago</label>
                  <p className="text-gray-900">{selectedStudent.paymentDate}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Fecha de Matrícula</label>
                  <p className="text-gray-900">{selectedStudent.enrollmentDate}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <button
              onClick={() => setShowViewModal(false)}
              className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    );
  };

  const EditStudentModal = () => {
    if (!selectedStudent) return null;

    const [formData, setFormData] = useState({
      name: selectedStudent.name,
      email: selectedStudent.email,
      phoneNumber: selectedStudent.phoneNumber || '',
      level: selectedStudent.level,
      classType: selectedStudent.classType,
      contractedPlan: selectedStudent.contractedPlan || '',
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      setStudents(students.map(student => 
        student.id === selectedStudent.id 
          ? { ...student, ...formData }
          : student
      ));
      setShowEditModal(false);
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Editar Alumno</h2>
            <button
              onClick={() => setShowEditModal(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <XCircle className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre Completo
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
                  Email
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Teléfono
                </label>
                <input
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Plan Contratado
                </label>
                <input
                  type="text"
                  value={formData.contractedPlan}
                  onChange={(e) => setFormData({...formData, contractedPlan: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nivel
                </label>
                <select
                  value={formData.level}
                  onChange={(e) => setFormData({...formData, level: e.target.value as any})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="basic">Básico</option>
                  <option value="intermediate">Intermedio</option>
                  <option value="advanced">Avanzado</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Clase
                </label>
                <select
                  value={formData.classType}
                  onChange={(e) => setFormData({...formData, classType: e.target.value as any})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="theoretical">Teórico</option>
                  <option value="practical">Práctico</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                Guardar Cambios
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Alumnos Matriculados</h1>
          <p className="text-gray-600">Gestiona los estudiantes que ya han completado su matrícula</p>
        </div>
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-lg">
          <div className="text-center">
            <div className="text-2xl font-bold">{enrolledStudents.length}</div>
            <div className="text-sm opacity-90">Matriculados</div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nombre, email o código..."
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
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
          </select>
          
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todos los Niveles</option>
            <option value="basic">Básico</option>
            <option value="intermediate">Intermedio</option>
            <option value="advanced">Avanzado</option>
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

      {/* Lista de Estudiantes */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Alumno
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Código de Matrícula
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nivel y Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Plan Contratado
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
                        <div className="text-xs text-gray-400">{student.phoneNumber}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-mono text-gray-900">{student.enrollmentCode}</div>
                    <div className="text-xs text-gray-500">
                      Matrícula: {student.enrollmentDate}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        student.level === 'basic' ? 'bg-green-100 text-green-800' :
                        student.level === 'intermediate' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {student.level === 'basic' ? 'Básico' : 
                         student.level === 'intermediate' ? 'Intermedio' : 'Avanzado'}
                      </span>
                      <div className="text-xs text-gray-600">
                        {student.classType === 'theoretical' ? 'Teórico' : 'Práctico'}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{student.contractedPlan}</div>
                    <div className="text-xs text-gray-500">
                      {student.points.toLocaleString()} puntos
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleToggleStatus(student.id)}
                      className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                        student.status === 'active'
                          ? 'bg-green-100 text-green-800 hover:bg-green-200'
                          : 'bg-red-100 text-red-800 hover:bg-red-200'
                      }`}
                    >
                      {student.status === 'active' ? (
                        <>
                          <ToggleRight className="h-4 w-4" />
                          <span>Activo</span>
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="h-4 w-4" />
                          <span>Inactivo</span>
                        </>
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleViewStudent(student)}
                        className="text-blue-600 hover:text-blue-900 p-2 hover:bg-blue-50 rounded-full transition-colors"
                        title="Ver detalles"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleEditStudent(student)}
                        className="text-green-600 hover:text-green-900 p-2 hover:bg-green-50 rounded-full transition-colors"
                        title="Editar"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
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
            <p className="text-gray-500">No se encontraron alumnos matriculados</p>
          </div>
        )}
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Matriculados</p>
              <p className="text-2xl font-semibold text-gray-900">{enrolledStudents.length}</p>
            </div>
            <Users className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Activos</p>
              <p className="text-2xl font-semibold text-green-600">
                {enrolledStudents.filter(s => s.status === 'active').length}
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Inactivos</p>
              <p className="text-2xl font-semibold text-red-600">
                {enrolledStudents.filter(s => s.status === 'inactive').length}
              </p>
            </div>
            <XCircle className="h-8 w-8 text-red-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Nivel Avanzado</p>
              <p className="text-2xl font-semibold text-purple-600">
                {enrolledStudents.filter(s => s.level === 'advanced').length}
              </p>
            </div>
            <GraduationCap className="h-8 w-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Modales */}
      {showViewModal && <ViewStudentModal />}
      {showEditModal && <EditStudentModal />}
    </div>
  );
};

export default EnrolledStudents;