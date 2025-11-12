import React, { useState, useMemo, useCallback } from 'react';
import { Users, Eye, UserCheck, UserX, BookOpen, GraduationCap, Calendar, XCircle, CheckCircle, AlertCircle, Search, Clock, Phone, MapPin, Mail, FileText, CreditCard } from 'lucide-react';
import { Student, Group } from '../../types/models';
import AuthenticatedLayout from '../../layouts/AuthenticatedLayout';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule, themeQuartz } from 'ag-grid-community';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import axios from 'axios';
import Swal from 'sweetalert2';
import { Input, Select } from '@/components/ui/input';
import '../../../css/ag-grid-custom.css';

ModuleRegistry.registerModules([AllCommunityModule]);

interface Props {
  students: Student[];
  groups: Group[];
  userRole: string;
}

// Modal extracted outside component to avoid creating a component during render.
const ViewStudentModal: React.FC<{ student: Student; onClose: () => void; groups: Group[] }> = ({ student, onClose, groups }) => {
  const [enrollmentDocuments, setEnrollmentDocuments] = React.useState<any[]>([]);
  const [loadingDocuments, setLoadingDocuments] = React.useState(true);
  const [hasPendingDocuments, setHasPendingDocuments] = React.useState(false);

  const getGroupName = (groupId?: string) => {
    if (!groupId) return 'Sin asignar';
    const group = groups.find(g => g.id === groupId);
    return group ? group.name : 'Grupo desconocido';
  };

  // Cargar documentos de matrícula
  React.useEffect(() => {
    const fetchDocuments = async () => {
      try {
        setLoadingDocuments(true);
        const response = await axios.get(`/admin/students/${student.id}/enrollment-documents`);
        setEnrollmentDocuments(response.data.documents || []);
        setHasPendingDocuments(response.data.has_pending_documents || false);
      } catch (error) {
        console.error('Error al cargar documentos:', error);
        setEnrollmentDocuments([]);
        setHasPendingDocuments(false);
      } finally {
        setLoadingDocuments(false);
      }
    };

    fetchDocuments();
  }, [student.id]);

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
      onClick={onClose}
      style={{ height: '100vh', width: '100vw' }}
    >
      {/* Modal Container */}
      <div
        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#073372] to-[#17BC91] px-8 py-6 flex items-center justify-between rounded-t-3xl">
          <div>
            <h2 className="text-2xl font-bold text-white">Información del Estudiante</h2>
            <p className="text-blue-100 text-sm">Todos los datos del estudiante matriculado (Solo lectura)</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
          >
            <XCircle className="h-6 w-6" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <form className="space-y-6">
            {/* SECCIÓN 1: DATOS PERSONALES */}
            <div className="border border-gray-200 p-6 rounded-xl bg-white shadow-sm">
              <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center border-b border-gray-200 pb-3">
                <Users className="h-5 w-5 mr-2 text-blue-600" />
                Datos Personales
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Input
                  label="Nombres"
                  type="text"
                  value={student.firstName || ''}
                  disabled
                  variant="filled"
                />
                <Input
                  label="Apellido Paterno"
                  type="text"
                  value={student.paternalLastName || ''}
                  disabled
                  variant="filled"
                />
                <Input
                  label="Apellido Materno"
                  type="text"
                  value={student.maternalLastName || ''}
                  disabled
                  variant="filled"
                />
                <Input
                  label="Email"
                  type="email"
                  value={student.email || ''}
                  disabled
                  variant="filled"
                  icon={<Mail className="w-4 h-4" />}
                />
                <Input
                  label="Teléfono"
                  type="text"
                  value={student.phoneNumber || ''}
                  disabled
                  variant="filled"
                  icon={<Phone className="w-4 h-4" />}
                />
                <Input
                  label="Género"
                  type="text"
                  value={student.gender === 'male' ? 'Masculino' : student.gender === 'female' ? 'Femenino' : 'Otro'}
                  disabled
                  variant="filled"
                />
                <Input
                  label="Fecha de Nacimiento"
                  type="date"
                  value={student.birthDate || ''}
                  disabled
                  variant="filled"
                  icon={<Calendar className="w-4 h-4" />}
                />
                <Input
                  label="Tipo de Documento"
                  type="text"
                  value={student.documentType?.toUpperCase() || ''}
                  disabled
                  variant="filled"
                  icon={<FileText className="w-4 h-4" />}
                />
                <Input
                  label="Número de Documento"
                  type="text"
                  value={student.documentNumber || ''}
                  disabled
                  variant="filled"
                  icon={<CreditCard className="w-4 h-4" />}
                />
                <div className="md:col-span-3">
                  <Input
                    label="Nivel Educativo"
                    type="text"
                    value={student.educationLevel || ''}
                    disabled
                    variant="filled"
                    icon={<GraduationCap className="w-4 h-4" />}
                  />
                </div>
              </div>
            </div>

            {/* SECCIÓN 2: DATOS ACADÉMICOS */}
            <div className="border border-gray-200 p-6 rounded-xl bg-white shadow-sm">
              <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center border-b border-gray-200 pb-3">
                <BookOpen className="h-5 w-5 mr-2 text-purple-600" />
                Datos Académicos
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Input
                  label="Código de Matrícula"
                  type="text"
                  value={student.enrollmentCode || ''}
                  disabled
                  variant="filled"
                  icon={<FileText className="w-4 h-4" />}
                />
                <Input
                  label="Fecha de Pago"
                  type="date"
                  value={student.paymentDate || ''}
                  disabled
                  variant="filled"
                  icon={<Calendar className="w-4 h-4" />}
                />
                <Input
                  label="Fecha de Matrícula"
                  type="date"
                  value={student.enrollmentDate || ''}
                  disabled
                  variant="filled"
                  icon={<Calendar className="w-4 h-4" />}
                />
                <Input
                  label="Nivel Académico"
                  type="text"
                  value={student.level === 'basic' ? 'Básico' : student.level === 'intermediate' ? 'Intermedio' : student.level === 'advanced' ? 'Avanzado' : 'No asignado'}
                  disabled
                  variant="filled"
                  icon={<GraduationCap className="w-4 h-4" />}
                />
                <Input
                  label="Plan Contratado"
                  type="text"
                  value={student.contractedPlan || 'Sin plan'}
                  disabled
                  variant="filled"
                  icon={<CreditCard className="w-4 h-4" />}
                />
                <Input
                  label="Grupo Asignado"
                  type="text"
                  value={getGroupName(student.assignedGroupId)}
                  disabled
                  variant="filled"
                  icon={<Users className="w-4 h-4" />}
                />
                <Input
                  label="Tipo de Clase"
                  type="text"
                  value={student.classType === 'theoretical' ? 'Teórico' : 'Práctico'}
                  disabled
                  variant="filled"
                />
                <Input
                  label="Pago Verificado"
                  type="text"
                  value={student.paymentVerified ? '✅ Sí' : '❌ No'}
                  disabled
                  variant="filled"
                />
                <Input
                  label="Estado"
                  type="text"
                  value={student.status === 'active' ? '✅ Activo' : '❌ Inactivo'}
                  disabled
                  variant="filled"
                />
              </div>
            </div>

            {/* SECCIÓN 3: EXAMEN DE CATEGORIZACIÓN */}
            <div className="border border-gray-200 p-6 rounded-xl bg-white shadow-sm">
              <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center border-b border-gray-200 pb-3">
                <GraduationCap className="h-5 w-5 mr-2 text-orange-600" />
                Examen de Categorización
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Input
                  label="¿Realizó examen?"
                  type="text"
                  value={student.hasPlacementTest ? 'Sí' : 'No'}
                  disabled
                  variant="filled"
                />
                {student.hasPlacementTest && (
                  <>
                    <Input
                      label="Fecha del Examen"
                      type="date"
                      value={student.testDate || ''}
                      disabled
                      variant="filled"
                      icon={<Calendar className="w-4 h-4" />}
                    />
                    <Input
                      label="Puntaje"
                      type="text"
                      value={student.testScore || ''}
                      disabled
                      variant="filled"
                      icon={<FileText className="w-4 h-4" />}
                    />
                  </>
                )}
              </div>
            </div>

            {/* SECCIÓN 4: DATOS DEL APODERADO/TITULAR */}
            <div className="border border-gray-200 p-6 rounded-xl bg-white shadow-sm">
              <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center border-b border-gray-200 pb-3">
                <Users className="h-5 w-5 mr-2 text-green-600" />
                Datos del Apoderado / Titular
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Nombre Completo"
                  type="text"
                  value={student.guardianName || 'No registrado'}
                  disabled
                  variant="filled"
                />
                <Input
                  label="Número de Documento"
                  type="text"
                  value={student.guardianDocumentNumber || 'No registrado'}
                  disabled
                  variant="filled"
                  icon={<CreditCard className="w-4 h-4" />}
                />
                <Input
                  label="Email"
                  type="email"
                  value={student.guardianEmail || 'No registrado'}
                  disabled
                  variant="filled"
                  icon={<Mail className="w-4 h-4" />}
                />
                <Input
                  label="Teléfono"
                  type="text"
                  value={student.guardianPhone || 'No registrado'}
                  disabled
                  variant="filled"
                  icon={<Phone className="w-4 h-4" />}
                />
                <Input
                  label="Fecha de Nacimiento"
                  type="date"
                  value={student.guardianBirthDate || ''}
                  disabled
                  variant="filled"
                  icon={<Calendar className="w-4 h-4" />}
                />
                <Input
                  label="Dirección"
                  type="text"
                  value={student.guardianAddress || 'No registrado'}
                  disabled
                  variant="filled"
                  icon={<MapPin className="w-4 h-4" />}
                />
              </div>
            </div>

            {/* SECCIÓN 5: FECHAS IMPORTANTES */}
            <div className="border border-gray-200 p-6 rounded-xl bg-white shadow-sm">
              <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center border-b border-gray-200 pb-3">
                <Calendar className="h-5 w-5 mr-2 text-indigo-600" />
                Fechas Importantes
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Input
                  label="Fecha de Registro"
                  type="date"
                  value={student.registrationDate || ''}
                  disabled
                  variant="filled"
                  icon={<Calendar className="w-4 h-4" />}
                />
                <Input
                  label="Fecha de Pago"
                  type="date"
                  value={student.paymentDate || ''}
                  disabled
                  variant="filled"
                  icon={<Calendar className="w-4 h-4" />}
                />
                <Input
                  label="Fecha de Matrícula"
                  type="date"
                  value={student.enrollmentDate || ''}
                  disabled
                  variant="filled"
                  icon={<Calendar className="w-4 h-4" />}
                />
              </div>
            </div>

            {/* SECCIÓN 6: INFORMACIÓN DE VERIFICACIÓN */}
            {student.enrollmentVerified && (
              <div className="border border-gray-200 p-6 rounded-xl bg-white shadow-sm">
                <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center border-b border-gray-200 pb-3">
                  <CheckCircle className="h-5 w-5 mr-2 text-emerald-600" />
                  Información de Verificación
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input
                    label="Verificado por"
                    type="text"
                    value={student.verifiedEnrollmentBy?.name || 'No disponible'}
                    disabled
                    variant="filled"
                    icon={<Users className="w-4 h-4" />}
                  />
                  <Input
                    label="Fecha de Verificación"
                    type="text"
                    value={student.enrollmentVerifiedAt ? new Date(student.enrollmentVerifiedAt).toLocaleString('es-ES') : 'No disponible'}
                    disabled
                    variant="filled"
                    icon={<Calendar className="w-4 h-4" />}
                  />
                </div>
              </div>
            )}

            {/* SECCIÓN 7: DOCUMENTOS DE MATRÍCULA */}
            <div className="border border-gray-200 p-6 rounded-xl bg-white shadow-sm">
              <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center border-b border-gray-200 pb-3">
                <FileText className="h-5 w-5 mr-2 text-indigo-600" />
                Documentos de Matrícula
                {enrollmentDocuments.length > 0 && (
                  <span className="ml-auto text-xs bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full font-medium">
                    {enrollmentDocuments.length} documento(s)
                  </span>
                )}
              </h3>

              {hasPendingDocuments && (
                <div className="mb-4 bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
                  <div className="flex items-center">
                    <AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
                    <p className="text-sm text-yellow-800">
                      <strong>Atención:</strong> Hay documentos enviados al estudiante pendientes de confirmación. 
                      No se puede enviar más documentos hasta que confirme los actuales.
                    </p>
                  </div>
                </div>
              )}

              {loadingDocuments ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                  <span className="ml-3 text-gray-600">Cargando documentos...</span>
                </div>
              ) : enrollmentDocuments.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No hay documentos de matrícula</p>
                  <p className="text-xs text-gray-400 mt-1">
                    El estudiante debe subir su contrato y voucher de pago, o puedes enviarle documentos adicionales
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Agrupar documentos por tipo */}
                  {enrollmentDocuments.some((doc: any) => doc.is_student_upload) && (
                    <div className="mb-6">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                        <Users className="h-4 w-4 mr-2 text-blue-600" />
                        Documentos del Estudiante
                      </h4>
                      <div className="space-y-3">
                        {enrollmentDocuments.filter((doc: any) => doc.is_student_upload).map((doc: any, index: number) => (
                          <div key={`student-${index}`} className="border border-blue-200 bg-blue-50 rounded-lg p-4 hover:bg-blue-100 transition-colors">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <div className="p-2 bg-blue-100 rounded-lg">
                                    <FileText className="h-5 w-5 text-blue-600" />
                                  </div>
                                  <div className="flex-1">
                                    <h4 className="font-medium text-gray-900">{doc.document_name}</h4>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                      Subido por el estudiante • {doc.document_type === 'contract' ? 'Contrato' : 
                                                                   doc.document_type === 'payment' ? 'Voucher de Pago' : 'Documento'}
                                    </p>
                                  </div>
                                </div>
                                
                                {doc.description && (
                                  <p className="text-sm text-gray-600 mb-2 ml-14">{doc.description}</p>
                                )}

                                <div className="flex items-center gap-4 ml-14 text-xs text-gray-500">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    Subido: {new Date(doc.uploaded_at).toLocaleDateString('es-ES')}
                                  </span>
                                  <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700">
                                    <CheckCircle className="h-3 w-3" />
                                    Confirmado
                                  </span>
                                </div>
                              </div>

                              <a
                                href={doc.document_type === 'contract' 
                                  ? `/admin/students/${student.id}/contract`
                                  : `/storage/${doc.file_path}`
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                              >
                                <Eye className="h-4 w-4" />
                                Ver
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Documentos enviados por verificadores */}
                  {enrollmentDocuments.some((doc: any) => !doc.is_student_upload) && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                        <FileText className="h-4 w-4 mr-2 text-purple-600" />
                        Documentos Enviados al Estudiante
                      </h4>
                      <div className="space-y-3">
                        {enrollmentDocuments.filter((doc: any) => !doc.is_student_upload).map((doc: any, index: number) => (
                          <div key={`verifier-${index}`} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <div className="p-2 bg-purple-50 rounded-lg">
                                    <FileText className="h-5 w-5 text-purple-600" />
                                  </div>
                                  <div className="flex-1">
                                    <h4 className="font-medium text-gray-900">{doc.document_name}</h4>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                      Tipo: {doc.document_type === 'contract' ? 'Contrato' : 
                                             doc.document_type === 'regulation' ? 'Reglamento' : 
                                             doc.document_type === 'terms' ? 'Términos y Condiciones' : 'Otro'}
                                      {doc.uploaded_by_name && ` • Enviado por: ${doc.uploaded_by_name}`}
                                    </p>
                                  </div>
                                </div>
                                
                                {doc.description && (
                                  <p className="text-sm text-gray-600 mb-2 ml-14">{doc.description}</p>
                                )}

                                <div className="flex items-center gap-4 ml-14 text-xs text-gray-500">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    Enviado: {new Date(doc.uploaded_at).toLocaleDateString('es-ES')}
                                  </span>
                                  {doc.requires_signature && (
                                    <span className={`flex items-center gap-1 px-2 py-1 rounded-full ${
                                      doc.student_confirmed 
                                        ? 'bg-green-100 text-green-700' 
                                        : 'bg-yellow-100 text-yellow-700'
                                    }`}>
                                      {doc.student_confirmed ? (
                                        <>
                                          <CheckCircle className="h-3 w-3" />
                                          Confirmado por estudiante
                                        </>
                                      ) : (
                                        <>
                                          <Clock className="h-3 w-3" />
                                          Pendiente de confirmación
                                        </>
                                      )}
                                    </span>
                                  )}
                                  {doc.confirmed_at && (
                                    <span className="flex items-center gap-1">
                                      Confirmado: {new Date(doc.confirmed_at).toLocaleDateString('es-ES')}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <a
                                href={`/storage/${doc.file_path}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors"
                              >
                                <Eye className="h-4 w-4" />
                                Ver
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-8 py-4 border-t border-gray-200 flex justify-end rounded-b-3xl">
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
  const [activeTab, setActiveTab] = useState<'pending' | 'verified' | 'all'>('verified');
  const [studentsPendingDocs, setStudentsPendingDocs] = useState<Set<string>>(new Set());
  
  // Estados para verificación con documentos
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyingStudent, setVerifyingStudent] = useState<Student | null>(null);
  const [documents, setDocuments] = useState<Array<{
    file: File;
    document_type: string;
    document_name: string;
    description: string;
    requires_signature: boolean;
  }>>([]);

  // Cargar estado de documentos pendientes para cada estudiante
  React.useEffect(() => {
    const checkPendingDocuments = async () => {
      const pendingSet = new Set<string>();
      
      for (const student of students) {
        try {
          const response = await axios.get(`/admin/students/${student.id}/enrollment-documents`);
          if (response.data.has_pending_documents) {
            pendingSet.add(student.id);
          }
        } catch (error) {
          console.error(`Error checking documents for student ${student.id}:`, error);
        }
      }
      
      setStudentsPendingDocs(pendingSet);
    };

    if (students.length > 0) {
      checkPendingDocuments();
    }
  }, [students]);

  const handleOpenVerifyModal = (student: Student) => {
    setVerifyingStudent(student);
    setDocuments([]);
    setShowVerifyModal(true);
  };

  const handleAddDocument = () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.pdf,.doc,.docx,.png,.jpg,.jpeg';
    fileInput.multiple = true;
    
    fileInput.onchange = async (e: Event) => {
      const target = e.target as HTMLInputElement;
      const files = target.files;
      
      if (files) {
        const newDocs = Array.from(files).map(file => ({
          file,
          document_type: 'contract',
          document_name: file.name.replace(/\.[^/.]+$/, ''),
          description: '',
          requires_signature: true
        }));
        
        setDocuments([...documents, ...newDocs]);
      }
    };
    
    fileInput.click();
  };

  const handleRemoveDocument = (index: number) => {
    setDocuments(documents.filter((_, i) => i !== index));
  };

  const handleVerifyEnrollment = async (student: Student) => {
    // Verificar si tiene documentos pendientes
    if (studentsPendingDocs.has(student.id)) {
      await Swal.fire({
        title: 'Documentos Pendientes',
        html: `
          <p class="text-gray-700">Este estudiante tiene documentos pendientes de confirmación.</p>
          <p class="text-sm text-yellow-600 mt-2">⏳ Debe confirmar los documentos actuales antes de poder enviar más.</p>
        `,
        icon: 'warning',
        confirmButtonColor: '#f59e0b',
        confirmButtonText: 'Entendido',
        customClass: {
          confirmButton: 'px-6 py-2.5 rounded-xl font-medium'
        }
      });
      return;
    }

    // Abrir modal para subir documentos
    setVerifyingStudent(student);
    setDocuments([]);
    setShowVerifyModal(true);
  };

  const handleConfirmVerification = async () => {
    if (!verifyingStudent) return;

    try {
      // Crear FormData para enviar archivos
      const formData = new FormData();
      
      // Agregar cada documento con su metadata
      documents.forEach((doc, index) => {
        formData.append(`documents[${index}][file]`, doc.file);
        formData.append(`documents[${index}][document_type]`, doc.document_type);
        formData.append(`documents[${index}][document_name]`, doc.document_name);
        formData.append(`documents[${index}][description]`, doc.description);
        formData.append(`documents[${index}][requires_signature]`, doc.requires_signature ? '1' : '0');
      });

      const response = await axios.post(
        `/admin/students/${verifyingStudent.id}/verify-enrollment`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      
      if (response.data.success) {
        // ❌ NO actualizar como verificado todavía
        // El estudiante permanece sin cambios hasta que confirme los documentos
        
        // Agregar estudiante a la lista de pendientes
        setStudentsPendingDocs(prev => new Set(prev).add(verifyingStudent.id));
        
        // Cerrar modal
        setShowVerifyModal(false);
        setVerifyingStudent(null);
        setDocuments([]);
        
        await Swal.fire({
          title: '¡Documentos Enviados!',
          html: `
            <p>Los documentos han sido enviados al estudiante exitosamente</p>
            ${response.data.documents_uploaded > 0 
              ? `<p class="text-sm text-gray-600 mt-2">Se enviaron ${response.data.documents_uploaded} documento(s)</p>` 
              : ''}
            <p class="text-sm text-orange-600 mt-3">⏳ La matrícula se verificará cuando el estudiante confirme todos los documentos</p>
          `,
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
        
        const documentsDeleted = response.data.documents_deleted || 0;
        
        await Swal.fire({
          title: 'Verificación Removida',
          html: `
            <p>La verificación ha sido removida exitosamente</p>
            ${documentsDeleted > 0 
              ? `<p class="text-sm text-gray-600 mt-2">✅ Se eliminaron ${documentsDeleted} documento(s) anterior(es)</p>` 
              : ''}
          `,
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

  // Filtrar estudiantes según el tab activo
  const filteredStudents = useMemo(() => {
    let filtered = students;
    
    if (activeTab === 'pending') {
      filtered = students.filter(s => !s.enrollmentVerified);
    } else if (activeTab === 'verified') {
      filtered = students.filter(s => s.enrollmentVerified);
    }
    
    return filtered;
  }, [students, activeTab]);

  const handleViewStudent = (student: Student) => {
    setSelectedStudent(student);
    setShowViewModal(true);
  };

  const columnDefs = useMemo<ColDef<Student>[]>(() => [
    {
      headerName: 'Alumno',
      field: 'name',
      width: 280,
      filter: 'agTextColumnFilter',
      cellRenderer: (params: ICellRendererParams<Student>) => {
        const student = params.data!;
        const hasAvatar = student.avatar;
        
        return (
          <div className="flex items-center justify-between py-2 w-full h-full group">
            <div className="flex items-center">
              {hasAvatar ? (
                <img
                  src={`/storage/${student.avatar}`}
                  alt={student.name}
                  className="w-10 h-10 rounded-full object-cover flex-shrink-0 border-2 border-white shadow-md"
                />
              ) : (
                <div className="w-10 h-10 bg-gradient-to-r from-[#073372] to-[#17BC91] rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm font-semibold">
                    {student.name.split(' ').map((n: string) => n[0]).join('')}
                  </span>
                </div>
              )}
              <div className="ml-3">
                <div className="text-sm font-medium text-gray-900">{student.name}</div>
                <div className="text-xs text-gray-500">{student.email}</div>
                <div className="text-xs text-gray-400">{student.phoneNumber}</div>
              </div>
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
      cellRenderer: (params: ICellRendererParams<Student>) => {
        const row = params.data!;
        return (
          <div className="w-full h-full flex flex-col justify-center">
            <div className="text-sm font-mono text-gray-900">{params.value}</div>
            <div className="text-xs text-gray-500">{row.enrollmentDate}</div>
          </div>
        );
      }
    },
    {
      headerName: 'Estado',
      field: 'status',
      width: 110,
      filter: 'agTextColumnFilter',
      cellRenderer: (params: ICellRendererParams<Student>) => {
        const status = params.value;
        return (
          <div className='flex items-center justify-center w-full h-full'>
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
              status === 'active' ? 'bg-[#17BC91]/10 text-[#17BC91] border border-[#17BC91]/30' : 'bg-red-100 text-red-800'
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
      width: 130,
      filter: 'agTextColumnFilter',
      cellRenderer: (params: ICellRendererParams<Student>) => {
        const level = params.value;
        if (!level) return <div className="flex items-center justify-center w-full h-full"><span className="text-xs text-gray-400">N/A</span></div>;
        
        const colorClass = level === 'basic' ? 'bg-[#17BC91]/10 text-[#17BC91] border border-[#17BC91]/30' :
                         level === 'intermediate' ? 'bg-[#F98613]/10 text-[#F98613] border border-[#F98613]/30' :
                         'bg-[#073372]/10 text-[#073372] border border-[#073372]/30';
        return (
          <div className='flex items-center justify-center w-full h-full'>
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
      width: 180,
      filter: 'agTextColumnFilter',
      cellRenderer: (params: ICellRendererParams<Student>) => {
        const student = params.data!;
        const isVerified = student.enrollmentVerified;
        const hasPending = studentsPendingDocs.has(student.id);
        
        return (
          <div className="flex items-center gap-2 h-full">
            {isVerified ? (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[#17BC91]/10 text-[#17BC91] border border-[#17BC91]/30">
                <CheckCircle className="w-3 h-3 mr-1" />
                Verificado
              </span>
            ) : hasPending ? (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700 border border-orange-300">
                <AlertCircle className="w-3 h-3 mr-1" />
                En proceso
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[#F98613]/10 text-[#F98613] border border-[#F98613]/30">
                <Clock className="w-3 h-3 mr-1" />
                Pendiente
              </span>
            )}
            
            {/* Switch para verificar/desverificar - deshabilitado si hay documentos pendientes */}
            <button
              onClick={() => isVerified ? handleUnverifyEnrollment(student.id) : handleVerifyEnrollment(student)}
              disabled={!isVerified && hasPending}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                isVerified 
                  ? 'bg-[#17BC91] focus:ring-[#17BC91]' 
                  : hasPending
                  ? 'bg-gray-200 cursor-not-allowed opacity-50'
                  : 'bg-gray-300 focus:ring-gray-400'
              }`}
              title={
                isVerified 
                  ? 'Clic para desverificar' 
                  : hasPending 
                  ? 'Hay documentos pendientes de confirmación' 
                  : 'Clic para verificar'
              }
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                  isVerified ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        );
      }
    },
    {
      headerName: 'Plan',
      field: 'contractedPlan',
      width: 200,
      filter: 'agTextColumnFilter',
      cellRenderer: (params: ICellRendererParams<Student>) => {
        const row = params.data!;
        const plan = params.value || 'Sin plan';
        return (
          <div className="w-full h-full flex flex-col items-start justify-center">
            <div className="text-sm text-gray-900">{plan}</div>
          </div>
        );
      }
    },
    {
      headerName: 'Acciones',
      width: 100,
      cellRenderer: (params: ICellRendererParams<Student>) => {
        const student = params.data!;
        return (
          <div className="flex items-center justify-center h-full gap-2">
            <button
              onClick={() => handleViewStudent(student)}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Ver detalles"
            >
              <Eye className="h-4 w-4" />
            </button>
          </div>
        );
      }
    }
  ], [getGroupName, studentsPendingDocs, handleVerifyEnrollment, handleUnverifyEnrollment, handleViewStudent]);

  // (inner duplicate modal removed)

  return (
    <AuthenticatedLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Alumnos Matriculados</h1>
            <p className="text-gray-600">Gestiona los estudiantes que ya han completado su matrícula</p>
          </div>
      
        </div>

          {/* Barra de búsqueda global */}
          <div className="relative">
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
          </div>

          {/* Tabs de filtrado */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1 inline-flex">
            <div className="flex space-x-2">
           
              
              <button
                onClick={() => setActiveTab('verified')}
                className={`px-6 py-3 rounded-lg font-medium transition-all ${
                  activeTab === 'verified'
                    ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <CheckCircle className="h-4 w-4" />
                  <span>Verificados</span>
                  <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                    {students.filter(s => s.enrollmentVerified).length}
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
                  <span>No Verificados</span>
                  <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                    {students.filter(s => !s.enrollmentVerified).length}
                  </span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('all')}
                className={`px-6 py-3 rounded-lg font-medium transition-all ${
                  activeTab === 'all'
                    ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <Users className="h-4 w-4" />
                  <span>Todos</span>
                  <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                    {students.length}
                  </span>
                </div>
              </button>
            </div>
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
       

   
      </div>

      {showViewModal && selectedStudent && (
        <ViewStudentModal student={selectedStudent} onClose={() => setShowViewModal(false)} groups={groups} />
      )}

      {/* Modal de Verificación con Documentos */}
      {showVerifyModal && verifyingStudent && (
        <div className="fixed inset-0 bg-black/50  flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
            <div className="bg-gradient-to-r from-[#073372] to-[#17BC91] px-8 py-6">
              <h2 className="text-2xl font-bold text-white">Enviar Documentos para Verificación</h2>
              <p className="text-white/90 text-sm mt-1">
                {verifyingStudent.name} - {verifyingStudent.enrollmentCode}
              </p>
            </div>

            <div className="p-8 overflow-y-auto max-h-[calc(90vh-200px)]">
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded mb-6">
                <p className="text-sm text-blue-800">
                  <strong>Importante:</strong> Al enviar documentos al estudiante:
                </p>
                <ul className="text-sm text-blue-700 mt-2 space-y-1 list-disc list-inside">
                  <li>Los documentos se enviarán por email al estudiante</li>
                  <li>El estudiante debe confirmar/firmar cada documento</li>
                  <li>La matrícula se verificará automáticamente cuando confirme todos</li>
                  {documents.length > 0 && (
                    <li>Se enviarán {documents.length} documento(s) que requieren confirmación</li>
                  )}
                </ul>
              </div>

              {/* Sección de Documentos */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Documentos para el Estudiante
                  </h3>
                  <button
                    onClick={handleAddDocument}
                    className="flex items-center gap-2 bg-[#17BC91] hover:bg-[#17BC91]/90 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Agregar Documentos
                  </button>
                </div>

                {documents.length === 0 ? (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="mt-2 text-sm text-gray-500">
                      No hay documentos agregados. Haz clic en "Agregar Documentos" para subir contratos, reglamentos, etc.
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      Los documentos se enviarán al estudiante por email y deberá confirmarlos/firmarlos.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {documents.map((doc, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <span className="font-medium text-gray-900">{doc.file.name}</span>
                              <span className="text-xs text-gray-500">
                                ({(doc.file.size / 1024 / 1024).toFixed(2)} MB)
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-3 mt-3">
                              <input
                                type="text"
                                value={doc.document_name}
                                onChange={(e) => {
                                  const newDocs = [...documents];
                                  newDocs[index].document_name = e.target.value;
                                  setDocuments(newDocs);
                                }}
                                placeholder="Nombre del documento"
                                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              />
                              <select
                                value={doc.document_type}
                                onChange={(e) => {
                                  const newDocs = [...documents];
                                  newDocs[index].document_type = e.target.value;
                                  setDocuments(newDocs);
                                }}
                                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              >
                                <option value="contract">Contrato</option>
                                <option value="regulation">Reglamento</option>
                                <option value="terms">Términos y Condiciones</option>
                                <option value="other">Otro</option>
                              </select>
                            </div>
                            <textarea
                              value={doc.description}
                              onChange={(e) => {
                                const newDocs = [...documents];
                                newDocs[index].description = e.target.value;
                                setDocuments(newDocs);
                              }}
                              placeholder="Descripción o instrucciones para el estudiante (opcional)"
                              className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none"
                              rows={2}
                            />
                            <label className="flex items-center gap-2 mt-2">
                              <input
                                type="checkbox"
                                checked={doc.requires_signature}
                                onChange={(e) => {
                                  const newDocs = [...documents];
                                  newDocs[index].requires_signature = e.target.checked;
                                  setDocuments(newDocs);
                                }}
                                className="rounded"
                              />
                              <span className="text-sm text-gray-700">Requiere firma del estudiante</span>
                            </label>
                          </div>
                          <button
                            onClick={() => handleRemoveDocument(index)}
                            className="text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors"
                            title="Eliminar documento"
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gray-50 px-8 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowVerifyModal(false);
                  setVerifyingStudent(null);
                  setDocuments([]);
                }}
                className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2.5 rounded-xl font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmVerification}
                className="bg-gradient-to-r from-[#073372] to-[#17BC91] hover:opacity-90 text-white px-6 py-2.5 rounded-xl font-medium transition-opacity"
              >
                ✉️ Enviar Documentos al Estudiante
                {documents.length > 0 && ` (${documents.length})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthenticatedLayout>
  );
};

export default EnrolledStudents;