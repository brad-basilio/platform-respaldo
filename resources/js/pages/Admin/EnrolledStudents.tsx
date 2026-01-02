import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Users, Eye, UserCheck, UserX, BookOpen, GraduationCap, Calendar, XCircle, CheckCircle, AlertCircle, Search, Clock, Phone, MapPin, Mail, FileText, CreditCard, User, ChevronDown, Trash2 } from 'lucide-react';
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

// Componente Dropdown para tipo de estudiante (usando Portal para sobresalir de AG Grid)
const StudentTypeDropdown: React.FC<{
  studentType: 'regular' | 'daily' | 'weekly';
  isVerified: boolean;
  onSelect: (type: 'regular' | 'daily' | 'weekly') => void;
}> = ({ studentType, isVerified, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const typeConfig = {
    regular: { 
      label: 'Regular', 
      description: 'Solicita con 1 hora de anticipación',
      bgClass: 'bg-gray-100', 
      textClass: 'text-gray-700', 
      borderClass: 'border-gray-300',
      hoverClass: 'hover:bg-gray-50',
      iconBg: 'bg-gray-200'
    },
    daily: { 
      label: 'Diario', 
      description: 'Elige cualquier hora del día actual',
      bgClass: 'bg-emerald-50', 
      textClass: 'text-emerald-700', 
      borderClass: 'border-emerald-200',
      hoverClass: 'hover:bg-emerald-50',
      iconBg: 'bg-emerald-100'
    },
    weekly: { 
      label: 'Semanal', 
      description: 'Elige cualquier hora en los próximos 7 días',
      bgClass: 'bg-purple-50', 
      textClass: 'text-purple-700', 
      borderClass: 'border-purple-200',
      hoverClass: 'hover:bg-purple-50',
      iconBg: 'bg-purple-100'
    }
  };

  // Calcular posición del dropdown cuando se abre
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX
      });
    }
  }, [isOpen]);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cerrar al hacer scroll
  useEffect(() => {
    const handleScroll = () => {
      if (isOpen) setIsOpen(false);
    };
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [isOpen]);

  const config = typeConfig[studentType];

  if (!isVerified) {
    return (
      <div className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed">
        {config.label}
      </div>
    );
  }

  // Dropdown menu renderizado como Portal
  const dropdownMenu = isOpen ? ReactDOM.createPortal(
    <div 
      ref={dropdownRef}
      className="fixed w-64 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden"
      style={{ 
        top: dropdownPosition.top, 
        left: dropdownPosition.left,
        zIndex: 99999
      }}
    >
      <div className="p-2">
        <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold px-2 py-1">Tipo de estudiante</p>
        {(Object.keys(typeConfig) as Array<'regular' | 'daily' | 'weekly'>).map((type) => {
          const opt = typeConfig[type];
          const isSelected = type === studentType;
          return (
            <button
              key={type}
              onClick={() => {
                if (type !== studentType) {
                  onSelect(type);
                }
                setIsOpen(false);
              }}
              className={`w-full text-left px-3 py-2.5 rounded-lg transition-all ${
                isSelected 
                  ? `${opt.bgClass} ${opt.borderClass} border` 
                  : `${opt.hoverClass} border border-transparent`
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg ${opt.iconBg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                  {isSelected && <CheckCircle className={`w-4 h-4 ${opt.textClass}`} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${isSelected ? opt.textClass : 'text-gray-900'}`}>
                    {opt.label}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-tight">
                    {opt.description}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${config.bgClass} ${config.textClass} ${config.borderClass} hover:shadow-md`}
      >
        <span>{config.label}</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {dropdownMenu}
    </>
  );
};

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

            {/* SECCIÓN 6.5: ESTADO DEL CONTRATO */}
            <div className="border border-gray-200 p-6 rounded-xl bg-white shadow-sm">
              <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center border-b border-gray-200 pb-3">
                <FileText className="h-5 w-5 mr-2 text-purple-600" />
                Estado del Contrato
              </h3>
              
              {student.contract ? (
                <div className="space-y-4">
                  {/* Estado de Firma */}
                  <div className={`p-4 rounded-xl border-2 ${
                    student.contract.accepted 
                      ? 'bg-green-50 border-green-300' 
                      : 'bg-orange-50 border-orange-300'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {student.contract.accepted ? (
                          <CheckCircle className="h-6 w-6 text-green-600" />
                        ) : (
                          <AlertCircle className="h-6 w-6 text-orange-600" />
                        )}
                        <div>
                          <p className={`font-bold text-sm ${
                            student.contract.accepted ? 'text-green-900' : 'text-orange-900'
                          }`}>
                            {student.contract.accepted ? '✅ Contrato Firmado' : '⚠️ Contrato Pendiente de Firma'}
                          </p>
                          {student.contract.accepted && student.contract.accepted_at && (
                            <p className="text-xs text-green-700 mt-1">
                              Firmado el {new Date(student.contract.accepted_at).toLocaleString('es-ES', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          )}
                          {!student.contract.accepted && (
                            <p className="text-xs text-orange-700 mt-1">
                              El estudiante debe firmar el contrato para completar su matrícula
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {/* Botón para ver PDF */}
                      {student.contract.pdf_url && (
                        <a
                          href={student.contract.pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium rounded-lg transition-colors"
                        >
                          <FileText className="h-4 w-4" />
                          Ver PDF
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Información adicional */}
                  {!student.contract.accepted && (
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded">
                      <p className="text-sm text-blue-900">
                        <strong>💡 Recordatorio:</strong> El estudiante recibió un correo con el enlace para firmar el contrato.
                        También puede acceder desde su dashboard cuando inicie sesión.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                  <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">No se ha generado contrato para este estudiante</p>
                </div>
              )}
            </div>

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

                  {/* Comprobantes de Pago Generados */}
                  {enrollmentDocuments.some((doc: any) => doc.is_payment_receipt) && (
                    <div className="mb-6">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                        <CreditCard className="h-4 w-4 mr-2 text-green-600" />
                        Comprobantes de Pago
                      </h4>
                      <div className="space-y-3">
                        {enrollmentDocuments.filter((doc: any) => doc.is_payment_receipt).map((doc: any, index: number) => (
                          <div key={`receipt-${index}`} className="border border-green-200 bg-green-50 rounded-lg p-4 hover:bg-green-100 transition-colors">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <div className="p-2 bg-green-100 rounded-lg">
                                    <CreditCard className="h-5 w-5 text-green-600" />
                                  </div>
                                  <div className="flex-1">
                                    <h4 className="font-medium text-gray-900">{doc.document_name}</h4>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                      Comprobante generado automáticamente • Cuota #{doc.installment_number}
                                    </p>
                                  </div>
                                </div>

                                {doc.description && (
                                  <p className="text-sm text-gray-600 mb-2 ml-14">{doc.description}</p>
                                )}

                                <div className="flex items-center gap-4 ml-14 text-xs text-gray-500">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    Generado: {new Date(doc.uploaded_at).toLocaleDateString('es-ES')}
                                  </span>
                                  <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700 font-medium">
                                    S/ {doc.amount?.toFixed(2)}
                                  </span>
                                </div>
                              </div>

                              <a
                                href={`/storage/${doc.file_path}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors"
                              >
                                <Eye className="h-4 w-4" />
                                Ver PDF
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Documentos enviados por verificadores */}
                  {enrollmentDocuments.some((doc: any) => !doc.is_student_upload && !doc.is_payment_receipt) && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                        <FileText className="h-4 w-4 mr-2 text-purple-600" />
                        Documentos Enviados al Estudiante
                      </h4>
                      <div className="space-y-3">
                        {enrollmentDocuments.filter((doc: any) => !doc.is_student_upload && !doc.is_payment_receipt).map((doc: any, index: number) => (
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
                                    <span className={`flex items-center gap-1 px-2 py-1 rounded-full ${doc.student_confirmed
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
  const [isSendingDocuments, setIsSendingDocuments] = useState(false);
  
  // Estados para eliminar estudiante
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [documentTypes, setDocumentTypes] = useState<Array<{
    id: number;
    name: string;
    code: string;
    description?: string;
  }>>([]);
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

  // Cargar tipos de documentos disponibles
  React.useEffect(() => {
    const fetchDocumentTypes = async () => {
      try {
        const response = await axios.get('/admin/document-types/active');
        setDocumentTypes(response.data);
      } catch (error) {
        console.error('Error loading document types:', error);
        // Fallback a tipos básicos si falla
        setDocumentTypes([
          { id: 1, name: 'Contrato', code: 'contract' },
          { id: 2, name: 'Reglamento', code: 'regulation' },
          { id: 3, name: 'Términos y Condiciones', code: 'terms' },
          { id: 4, name: 'Otro', code: 'other' },
        ]);
      }
    };

    fetchDocumentTypes();
  }, []);

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
    // 🆕 VALIDAR SI EL CONTRATO ESTÁ FIRMADO
    if (student.contract && !student.contract.accepted) {
      // Modal especial cuando el contrato no está firmado
      await Swal.fire({
        title: '⚠️ Contrato No Firmado',
        html: `
          <div class="text-left space-y-4">
            <div class="bg-orange-50 border-l-4 border-orange-500 p-4 rounded">
              <p class="text-sm text-orange-900 font-semibold mb-2">
                El estudiante aún no ha firmado su contrato de matrícula
              </p>
              <p class="text-xs text-orange-700">
                No se puede verificar la matrícula hasta que el estudiante firme el contrato.
              </p>
            </div>

            <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 class="text-sm font-semibold text-blue-900 mb-3">📋 Datos de Contacto</h4>
              <div class="space-y-2 text-sm">
                <div class="flex items-center gap-2">
                
                  <span class="text-gray-700"><strong>Email:</strong> ${student.email}</span>
                </div>
                <div class="flex items-center gap-2">
                 
                  <span class="text-gray-700"><strong>Teléfono:</strong> ${student.phoneNumber || 'No registrado'}</span>
                </div>
              </div>
            </div>

            <div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p class="text-xs text-gray-600">
                💡 <strong>Sugerencia:</strong> Puedes reenviar el correo con el enlace para firmar el contrato usando el botón de abajo.
              </p>
            </div>
          </div>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#10b981',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Reenviar Correo de Matrícula',
        cancelButtonText: 'Cancelar',
        reverseButtons: true,
        customClass: {
          confirmButton: 'px-6 py-2.5 rounded-xl font-medium',
          cancelButton: 'px-6 py-2.5 rounded-xl font-medium',
          popup: 'max-w-2xl'
        }
      }).then(async (result) => {
        if (result.isConfirmed) {
          // Reenviar correo de matrícula
          try {
            const response = await axios.post(`/admin/students/${student.id}/resend-contract-email`);
            
            if (response.data.success) {
              await Swal.fire({
                title: '✅ Correo Reenviado',
                html: `
                  <p class="text-gray-700">El correo con el enlace para firmar el contrato ha sido reenviado a:</p>
                  <p class="text-blue-600 font-semibold mt-2">${student.email}</p>
                  <p class="text-sm text-gray-500 mt-3">El estudiante recibirá el enlace en su bandeja de entrada.</p>
                `,
                icon: 'success',
                confirmButtonColor: '#10b981',
                confirmButtonText: 'Entendido',
                timer: 4000,
                timerProgressBar: true,
                customClass: {
                  confirmButton: 'px-6 py-2.5 rounded-xl font-medium'
                }
              });
            }
          } catch (error) {
            console.error('Error al reenviar correo:', error);
            await Swal.fire({
              title: 'Error',
              text: 'No se pudo reenviar el correo. Por favor, intenta nuevamente.',
              icon: 'error',
              confirmButtonColor: '#ef4444',
              confirmButtonText: 'Cerrar',
              customClass: {
                confirmButton: 'px-6 py-2.5 rounded-xl font-medium'
              }
            });
          }
        }
      });
      return;
    }

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

    // Prevenir múltiples envíos
    if (isSendingDocuments) return;

    try {
      setIsSendingDocuments(true);

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
        const wasAutoVerified = response.data.auto_verified || false;

        if (wasAutoVerified) {
          // ✅ Verificado automáticamente (sin documentos que requieran firma)
          // Actualizar el estudiante en la lista
          setStudents(prevStudents =>
            prevStudents.map(s =>
              s.id === verifyingStudent.id
                ? {
                  ...s,
                  enrollmentVerified: true,
                  enrollmentVerifiedAt: new Date().toISOString(),
                  verifiedEnrollmentBy: response.data.student.verifiedEnrollmentBy
                }
                : s
            )
          );

          // NO agregar a pendientes
          setStudentsPendingDocs(prev => {
            const newSet = new Set(prev);
            newSet.delete(verifyingStudent.id);
            return newSet;
          });
        } else {
          // ⏳ Pendiente de confirmación (tiene documentos que requieren firma)
          // Agregar estudiante a la lista de pendientes
          setStudentsPendingDocs(prev => new Set(prev).add(verifyingStudent.id));
        }

        // Cerrar modal
        setShowVerifyModal(false);
        setVerifyingStudent(null);
        setDocuments([]);

        await Swal.fire({
          title: wasAutoVerified ? '¡Matrícula Verificada!' : '¡Documentos Enviados!',
          html: `
            <p>${wasAutoVerified
              ? 'La matrícula ha sido verificada exitosamente (sin documentos que requieran firma)'
              : 'Los documentos han sido enviados al estudiante exitosamente'}</p>
            ${response.data.documents_uploaded > 0
              ? `<p class="text-sm text-gray-600 mt-2">Se enviaron ${response.data.documents_uploaded} documento(s)</p>`
              : ''}
            ${!wasAutoVerified
              ? '<p class="text-sm text-orange-600 mt-3">La matrícula se verificará cuando el estudiante confirme todos los documentos</p>'
              : '<p class="text-sm text-green-600 mt-3">El estudiante ya puede acceder a todas las funcionalidades</p>'}
          `,
          icon: 'success',
          confirmButtonColor: '#10b981',
          confirmButtonText: 'Entendido',
          timer: wasAutoVerified ? 4000 : 3000,
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
    } finally {
      setIsSendingDocuments(false);
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

  const handleChangeStudentType = async (student: Student, newType: 'regular' | 'daily' | 'weekly') => {
    const currentType = student.studentType ?? 'regular';
    if (currentType === newType) return;

    const typeLabels = {
      regular: 'Regular',
      daily: 'Diario',
      weekly: 'Semanal'
    };

    const typeDescriptions = {
      regular: 'debe solicitar clases con anticipación mínima (1 hora) y solo puede inscribirse en el próximo slot disponible.',
      daily: 'puede elegir cualquier hora del día actual para su clase.',
      weekly: 'puede elegir cualquier hora de cualquier día dentro de los próximos 7 días.'
    };

    const typeColors = {
      regular: { bg: 'bg-gray-50', border: 'border-gray-300', text: 'text-gray-700' },
      daily: { bg: 'bg-[#17BC91]/10', border: 'border-[#17BC91]', text: 'text-[#17BC91]' },
      weekly: { bg: 'bg-purple-50', border: 'border-purple-300', text: 'text-purple-700' }
    };

    const colors = typeColors[newType];
    
    const result = await Swal.fire({
      title: `¿Cambiar a ${typeLabels[newType]}?`,
      html: `
        <div class="text-left">
          <p class="text-gray-700 mb-3">
            El estudiante <strong>${typeLabels[newType]}</strong> ${typeDescriptions[newType]}
          </p>
          <div class="${colors.bg} ${colors.border} border-l-4 p-4 rounded">
            <p class="text-sm ${colors.text}">
              <strong>${student.name}</strong> será marcado como <strong>${typeLabels[newType]}</strong>
            </p>
          </div>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: newType === 'regular' ? '#6b7280' : newType === 'daily' ? '#17BC91' : '#8b5cf6',
      cancelButtonColor: '#9ca3af',
      confirmButtonText: `Sí, marcar como ${typeLabels[newType]}`,
      cancelButtonText: 'Cancelar',
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
      const response = await axios.patch(`/admin/students/${student.id}/student-type`, {
        student_type: newType
      });

      if (response.data.success) {
        // Actualizar el estudiante en el estado
        setStudents(prevStudents =>
          prevStudents.map(s =>
            s.id === student.id
              ? {
                ...s,
                studentType: response.data.student.studentType
              }
              : s
          )
        );

        await Swal.fire({
          title: '¡Actualizado!',
          text: response.data.message,
          icon: 'success',
          confirmButtonColor: '#10b981',
          confirmButtonText: 'Entendido',
          timer: 2000,
          timerProgressBar: true,
          customClass: {
            confirmButton: 'px-6 py-2.5 rounded-xl font-medium'
          }
        });
      }
    } catch (error: unknown) {
      console.error('Error al cambiar tipo de estudiante:', error);
      const errorMessage = axios.isAxiosError(error)
        ? error.response?.data?.message || 'Error al cambiar el tipo de estudiante'
        : 'Error al cambiar el tipo de estudiante';

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

  // Funciones para eliminar estudiante
  const handleOpenDeleteModal = (student: Student) => {
    setDeletingStudent(student);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingStudent || isDeleting) return;

    setIsDeleting(true);

    try {
      await axios.delete(`/admin/students/${deletingStudent.id}`);

      // Eliminar el estudiante del estado local
      setStudents(prevStudents => prevStudents.filter(s => s.id !== deletingStudent.id));

      // Cerrar modal
      setShowDeleteModal(false);
      setDeletingStudent(null);

      await Swal.fire({
        title: '¡Estudiante Eliminado!',
        html: `
          <p class="text-gray-700">El estudiante <strong>${deletingStudent.name}</strong> ha sido eliminado exitosamente.</p>
          <p class="text-sm text-gray-500 mt-2">Todos los datos asociados han sido removidos del sistema.</p>
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
    } catch (error: unknown) {
      console.error('Error al eliminar estudiante:', error);
      const errorMessage = axios.isAxiosError(error)
        ? error.response?.data?.message || 'Error al eliminar el estudiante'
        : 'Error al eliminar el estudiante';

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
    } finally {
      setIsDeleting(false);
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
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${status === 'active' ? 'bg-[#17BC91]/10 text-[#17BC91] border border-[#17BC91]/30' : 'bg-red-100 text-red-800'
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
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${isVerified
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
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${isVerified ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
              />
            </button>
          </div>
        );
      }
    },
    {
      headerName: 'Tipo',
      field: 'studentType',
      width: 150,
      filter: 'agTextColumnFilter',
      cellRenderer: (params: ICellRendererParams<Student>) => {
        const student = params.data!;
        const studentType = student.studentType ?? 'regular';
        const isVerified = student.enrollmentVerified;

        return (
          <div className="flex items-center h-full">
            <StudentTypeDropdown
              studentType={studentType}
              isVerified={isVerified ?? false}
              onSelect={(type) => handleChangeStudentType(student, type)}
            />
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
      width: 140,
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
            <button
              onClick={() => handleOpenDeleteModal(student)}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Eliminar estudiante"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        );
      }
    }
  ], [getGroupName, studentsPendingDocs, handleVerifyEnrollment, handleUnverifyEnrollment, handleChangeStudentType, handleViewStudent]);

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
              className={`px-6 py-3 rounded-lg font-medium transition-all ${activeTab === 'verified'
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
              className={`px-6 py-3 rounded-lg font-medium transition-all ${activeTab === 'pending'
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
              className={`px-6 py-3 rounded-lg font-medium transition-all ${activeTab === 'all'
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
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-fade-in"
          onClick={() => {
            if (!isSendingDocuments) {
              setShowVerifyModal(false);
              setVerifyingStudent(null);
              setDocuments([]);
            }
          }}
        >
          <div
            className="bg-white rounded-3xl max-w-5xl w-full max-h-[90vh] overflow-hidden shadow-2xl animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header con gradiente mejorado */}
            <div className="bg-gradient-to-r from-[#073372] via-[#0d4a8f] to-[#17BC91] px-8 py-6 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                      <FileText className="h-6 w-6" />
                      Enviar Documentos para Verificación
                    </h2>
                    <p className="text-white/90 text-sm mt-1 flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {verifyingStudent.name} • {verifyingStudent.enrollmentCode}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      if (!isSendingDocuments) {
                        setShowVerifyModal(false);
                        setVerifyingStudent(null);
                        setDocuments([]);
                      }
                    }}
                    disabled={isSendingDocuments}
                    className={`rounded-full p-2 transition-colors ${isSendingDocuments
                      ? 'text-white/50 cursor-not-allowed'
                      : 'text-white hover:bg-white/20'
                      }`}
                  >
                    <XCircle className="h-6 w-6" />
                  </button>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-8 overflow-y-auto max-h-[calc(90vh-200px)]">
              {/* Info Banner mejorado */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 rounded-xl p-5 mb-6 shadow-sm">
                <div className="flex gap-3">
                  <div className="flex-shrink-0">
                    <AlertCircle className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-blue-900 mb-2">
                      ℹ️ Información Importante
                    </p>
                    <ul className="text-sm text-blue-800 space-y-1.5">
                      <li className="flex items-start gap-2">
                        <span className="text-blue-500 mt-0.5">•</span>
                        <span>Al verificar se enviará automáticamente: <strong>Comprobante de Pago</strong> y <strong>Cronograma de Pagos</strong></span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-500 mt-0.5">•</span>
                        <span>Puedes agregar documentos adicionales (contratos, reglamentos, etc.) de forma opcional</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-500 mt-0.5">•</span>
                        <span>Los documentos adicionales requieren confirmación/firma del estudiante dependiendo de lo que se haya configurado</span>
                      </li>
                      {documents.length > 0 && (
                        <li className="flex items-start gap-2">
                          <span className="text-green-500 mt-0.5">✓</span>
                          <span className="font-medium text-green-700">
                            Se enviarán {documents.length} documento(s) adicional(es) que requieren confirmación
                          </span>
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Sección de Documentos */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-indigo-600" />
                    Documentos para el Estudiante
                  </h3>
                  <button
                    onClick={handleAddDocument}
                    disabled={isSendingDocuments}
                    className={`group relative inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all duration-200 shadow-md ${isSendingDocuments
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-[#17BC91] to-[#14a87d] hover:from-[#14a87d] hover:to-[#17BC91] text-white hover:shadow-lg transform hover:-translate-y-0.5'
                      }`}
                  >
                    <svg className="w-5 h-5 transition-transform group-hover:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Agregar Documentos
                  </button>
                </div>

                {documents.length === 0 ? (
                  <div className="border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center bg-gradient-to-br from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-50 transition-all">
                    <div className="flex justify-center mb-4">
                      <div className="p-4 bg-white rounded-full shadow-md">
                        <FileText className="h-12 w-12 text-gray-400" />
                      </div>
                    </div>
                    <p className="text-base font-medium text-gray-700 mb-2">
                      No hay documentos adicionales
                    </p>
                    <p className="text-sm text-gray-500 max-w-md mx-auto">
                      Los documentos adicionales son opcionales. Puedes agregar contratos, reglamentos, etc.
                    </p>
                    <p className="text-xs text-gray-400 mt-3">
                      ℹ️ Se enviarán automáticamente: Comprobante de Pago y Cronograma de Pagos
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {documents.map((doc, index) => (
                      <div key={index} className="border-2 border-gray-200 rounded-2xl p-6 bg-gradient-to-br from-white to-gray-50 hover:shadow-lg transition-all duration-200">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-4">
                            {/* File Info */}
                            <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
                              <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-md">
                                <FileText className="w-5 h-5 text-white" />
                              </div>
                              <div className="flex-1">
                                <p className="font-semibold text-gray-900">{doc.file.name}</p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  Tamaño: {(doc.file.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                              </div>
                            </div>

                            {/* Inputs con Material Design */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <Input
                                label="Nombre del Documento"
                                type="text"
                                value={doc.document_name}
                                onChange={(e) => {
                                  const newDocs = [...documents];
                                  newDocs[index].document_name = e.target.value;
                                  setDocuments(newDocs);
                                }}
                                variant="outlined"
                                required
                                disabled={isSendingDocuments}
                              />

                              <Select
                                label="Tipo de Documento"
                                value={doc.document_type}
                                onChange={(e) => {
                                  const newDocs = [...documents];
                                  newDocs[index].document_type = e.target.value;
                                  setDocuments(newDocs);
                                }}
                                variant="outlined"
                                required
                                disabled={isSendingDocuments}
                              >
                                {documentTypes.length > 0 ? (
                                  documentTypes.map((dt) => (
                                    <option key={dt.id} value={dt.code}>
                                      {dt.name}
                                    </option>
                                  ))
                                ) : (
                                  <>
                                    <option value="contract">Contrato</option>
                                    <option value="regulation">Reglamento</option>
                                    <option value="terms">Términos y Condiciones</option>
                                    <option value="other">Otro</option>
                                  </>
                                )}
                              </Select>
                            </div>

                            <Input
                              label="Descripción o Instrucciones (Opcional)"
                              type="text"
                              value={doc.description}
                              onChange={(e) => {
                                const newDocs = [...documents];
                                newDocs[index].description = e.target.value;
                                setDocuments(newDocs);
                              }}
                              variant="filled"
                              helperText="Agrega notas o instrucciones para el estudiante"
                              disabled={isSendingDocuments}
                            />

                            <label className={`flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 transition-colors ${isSendingDocuments ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-gray-50'
                              }`}>
                              <input
                                type="checkbox"
                                checked={doc.requires_signature}
                                onChange={(e) => {
                                  const newDocs = [...documents];
                                  newDocs[index].requires_signature = e.target.checked;
                                  setDocuments(newDocs);
                                }}
                                disabled={isSendingDocuments}
                                className="w-5 h-5 text-[#17BC91] border-gray-300 rounded focus:ring-[#17BC91] focus:ring-2 disabled:cursor-not-allowed"
                              />
                              <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-[#17BC91]" />
                                Requiere firma/confirmación del estudiante
                              </span>
                            </label>
                          </div>

                          {/* Delete Button */}
                          <button
                            onClick={() => handleRemoveDocument(index)}
                            disabled={isSendingDocuments}
                            className={`flex-shrink-0 group p-3 rounded-xl transition-all duration-200 ${isSendingDocuments
                              ? 'text-gray-400 cursor-not-allowed'
                              : 'text-red-600 hover:bg-red-50 hover:shadow-md'
                              }`}
                            title={isSendingDocuments ? 'Enviando documentos...' : 'Eliminar documento'}
                          >
                            <XCircle className={`w-6 h-6 ${!isSendingDocuments && 'group-hover:scale-110'} transition-transform`} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer con botones mejorados */}
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-8 py-5 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {documents.length > 0 ? (
                  <span className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-indigo-600" />
                    <strong className="text-gray-900">{documents.length}</strong> documento(s) listo(s) para enviar
                  </span>
                ) : (
                  <span className="text-gray-500">Agrega al menos un documento</span>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowVerifyModal(false);
                    setVerifyingStudent(null);
                    setDocuments([]);
                  }}
                  disabled={isSendingDocuments}
                  className={`px-6 py-2.5 rounded-xl font-medium transition-all duration-200 border-2 ${isSendingDocuments
                    ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                    : 'text-gray-700 bg-white hover:bg-gray-100 border-gray-300 hover:shadow-md'
                    }`}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmVerification}
                  disabled={isSendingDocuments}
                  className={`group relative inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium transition-all duration-200 ${isSendingDocuments
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-[#073372] via-[#0d4a8f] to-[#17BC91] hover:from-[#0d4a8f] hover:via-[#073372] hover:to-[#14a87d] text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
                    }`}
                >
                  {isSendingDocuments ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Verificando matrícula...
                    </>
                  ) : (
                    <>
                      <Mail className="h-5 w-5" />
                      {documents.length > 0 ? 'Verificar y Enviar Documentos' : 'Verificar Matrícula'}
                      {documents.length > 0 && (
                        <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs font-bold">
                          {documents.length}
                        </span>
                      )}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Eliminación */}
      {showDeleteModal && deletingStudent && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-fade-in"
          onClick={() => {
            if (!isDeleting) {
              setShowDeleteModal(false);
              setDeletingStudent(null);
            }
          }}
        >
          <div
            className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-red-500 to-red-600 px-8 py-6 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent"></div>
              <div className="relative z-10 flex items-center gap-4">
                <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center">
                  <Trash2 className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Eliminar Estudiante</h2>
                  <p className="text-white/90 text-sm mt-1">Esta acción no se puede deshacer</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-8">
              {/* Info del estudiante */}
              <div className="bg-gray-50 rounded-2xl p-5 mb-6 border border-gray-200">
                <div className="flex items-center gap-4">
                  {deletingStudent.avatar ? (
                    <img
                      src={`/storage/${deletingStudent.avatar}`}
                      alt={deletingStudent.name}
                      className="w-16 h-16 rounded-full object-cover border-4 border-white shadow-lg"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-gradient-to-r from-[#073372] to-[#17BC91] rounded-full flex items-center justify-center shadow-lg">
                      <span className="text-white text-xl font-bold">
                        {deletingStudent.name.split(' ').map((n: string) => n[0]).join('')}
                      </span>
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900">{deletingStudent.name}</h3>
                    <p className="text-sm text-gray-600">{deletingStudent.email}</p>
                    {deletingStudent.enrollmentCode && (
                      <p className="text-xs text-gray-500 mt-1 font-mono">
                        Código: {deletingStudent.enrollmentCode}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Advertencia */}
              <div className="bg-red-50 border-l-4 border-red-500 rounded-xl p-5 mb-6">
                <div className="flex gap-3">
                  <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-red-900 mb-2">
                      ⚠️ Advertencia: Eliminación Permanente
                    </p>
                    <ul className="text-sm text-red-800 space-y-1.5 list-disc list-inside">
                      <li>Se eliminará la cuenta del usuario</li>
                      <li>Se eliminarán todos los documentos de matrícula</li>
                      <li>Se eliminarán las solicitudes de clases</li>
                      <li>Se eliminarán los registros de clases y asistencia</li>
                      <li>Se eliminará el contrato si existe</li>
                      <li><strong>Esta acción NO se puede deshacer</strong></li>
                    </ul>
                  </div>
                </div>
              </div>

              <p className="text-center text-gray-700 mb-2">
                ¿Estás seguro de que deseas eliminar a este estudiante?
              </p>
              <p className="text-center text-sm text-gray-500">
                Escribe el nombre del estudiante para confirmar:
              </p>
              
              {/* Input de confirmación */}
              <div className="mt-4">
                <input
                  type="text"
                  id="deleteConfirmationInput"
                  placeholder={deletingStudent.name}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-all text-center font-medium"
                  autoComplete="off"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-8 py-5 border-t border-gray-200 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletingStudent(null);
                }}
                disabled={isDeleting}
                className={`px-6 py-2.5 rounded-xl font-medium transition-all duration-200 border-2 ${
                  isDeleting
                    ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                    : 'text-gray-700 bg-white hover:bg-gray-100 border-gray-300 hover:shadow-md'
                }`}
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  const input = document.getElementById('deleteConfirmationInput') as HTMLInputElement;
                  if (input && input.value.trim().toLowerCase() === deletingStudent.name.toLowerCase()) {
                    handleConfirmDelete();
                  } else {
                    Swal.fire({
                      title: 'Nombre incorrecto',
                      text: 'Por favor, escribe el nombre exacto del estudiante para confirmar la eliminación.',
                      icon: 'warning',
                      confirmButtonColor: '#f59e0b',
                      confirmButtonText: 'Entendido',
                      customClass: {
                        confirmButton: 'px-6 py-2.5 rounded-xl font-medium'
                      }
                    });
                  }
                }}
                disabled={isDeleting}
                className={`group relative inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium transition-all duration-200 ${
                  isDeleting
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
                }`}
              >
                {isDeleting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Eliminando...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-5 w-5" />
                    Eliminar Estudiante
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthenticatedLayout>
  );
};

export default EnrolledStudents;